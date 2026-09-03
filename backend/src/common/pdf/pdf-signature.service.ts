/**
 * ==========================================================================
 *  Validador de firmas digitales embebidas (PAdES / PKCS#7)
 * ==========================================================================
 *  Este servicio reproduce, del lado del servidor, lo que hace el validador
 *  oficial de firmaperu.gob.pe: abre un PDF, busca la firma criptográfica
 *  embebida (objeto /Type /Sig con su /ByteRange) y comprueba:
 *
 *    1. Que EXISTA una firma digital real (no una simple imagen + QR).
 *    2. Validez criptográfica: la firma corresponde a la clave privada del
 *       certificado del firmante (se verifica sobre los "signed attributes").
 *    3. Integridad del contenido: el resumen (messageDigest) firmado coincide
 *       con el hash del contenido cubierto por el /ByteRange.
 *    4. Que la firma cubra TODO el documento (no alterado después de firmar).
 *    5. Datos del firmante y del emisor (RENIEC/ECEP) y vigencia del certificado.
 *
 *  IMPORTANTE — alcance: esto valida la MATEMÁTICA de la firma y la integridad
 *  del documento (que es lo que distingue una firma real de un sello visual).
 *  NO valida la cadena de confianza completa contra las CA raíz del Estado ni
 *  el estado de revocación (OCSP/CRL); eso es lo único adicional que hace el
 *  validador oficial y requiere los certificados raíz de la IOFE.
 * ==========================================================================
 */
import { Injectable, Logger } from '@nestjs/common';
import { createHash, createVerify } from 'crypto';
import * as forge from 'node-forge';

/** OIDs de algoritmos de resumen → nombre para Node crypto / hash. */
const DIGEST_OID_TO_NODE: Record<string, string> = {
  '2.16.840.1.101.3.4.2.1': 'RSA-SHA256',
  '2.16.840.1.101.3.4.2.2': 'RSA-SHA384',
  '2.16.840.1.101.3.4.2.3': 'RSA-SHA512',
  '1.3.14.3.2.26': 'RSA-SHA1',
};
const DIGEST_OID_TO_HASH: Record<string, string> = {
  '2.16.840.1.101.3.4.2.1': 'sha256',
  '2.16.840.1.101.3.4.2.2': 'sha384',
  '2.16.840.1.101.3.4.2.3': 'sha512',
  '1.3.14.3.2.26': 'sha1',
};
const OID_MESSAGE_DIGEST = '1.2.840.113549.1.9.4';
const OID_SIGNING_TIME = '1.2.840.113549.1.9.5';
const OID_CN = '2.5.4.3';
const OID_SERIAL = '2.5.4.5';
const OID_ORG = '2.5.4.10';
const OID_COUNTRY = '2.5.4.6';

/** Resultado de validar una firma individual dentro del PDF. */
export interface SignatureInfo {
  /** Nombre común del firmante (CN del certificado). */
  signerName: string | null;
  /** Identificador del firmante (serialNumber del certificado; suele traer el DNI). */
  signerId: string | null;
  /** Documento de identidad extraído del identificador (solo dígitos), si aplica. */
  signerDni: string | null;
  /** Entidad emisora del certificado (CA — p.ej. RENIEC / ECEP). */
  issuer: string | null;
  /** País del firmante (C del certificado). */
  country: string | null;
  /** Momento declarado de la firma (atributo signingTime), ISO 8601. */
  signingTime: string | null;
  /** Vigencia del certificado del firmante. */
  certValidFrom: string;
  certValidTo: string;
  /** true si el certificado ya no está vigente (a la fecha de validación). */
  certExpired: boolean;
  /** Tipo de firma declarada en el PDF (p.ej. ETSI.CAdES.detached = PAdES). */
  subFilter: string | null;
  /** La firma corresponde matemáticamente al certificado del firmante. */
  cryptoValid: boolean;
  /** El contenido firmado no fue alterado (messageDigest coincide). */
  contentIntact: boolean;
  /** La firma cubre todo el archivo (no se añadió nada después de firmar). */
  coversWholeDoc: boolean;
  /** Veredicto de esta firma: válida solo si cripto + integridad. */
  valid: boolean;
  /** Mensaje de error si esta firma no pudo procesarse. */
  error?: string;
}

/** Resultado global de la validación de un documento. */
export interface ValidationResult {
  /** true si el PDF contiene al menos una firma digital embebida real. */
  hasSignature: boolean;
  /** true si TODAS las firmas son válidas. */
  valid: boolean;
  /** true si alguna firma válida no cubre todo el documento (posible manipulación). */
  modifiedAfterSigning: boolean;
  /** Detalle por cada firma encontrada. */
  signatures: SignatureInfo[];
  /** Resumen legible del veredicto. */
  summary: string;
}

@Injectable()
export class PdfSignatureService {
  private readonly logger = new Logger(PdfSignatureService.name);

  /** Valida todas las firmas embebidas de un PDF. No lanza: siempre devuelve un veredicto. */
  validate(buffer: Buffer): ValidationResult {
    const ranges = this.findByteRanges(buffer);
    if (!ranges.length) {
      return {
        hasSignature: false,
        valid: false,
        modifiedAfterSigning: false,
        signatures: [],
        summary:
          'El PDF no contiene una firma digital embebida. Solo tiene, a lo sumo, un sello visual (imagen + QR), que no tiene validez legal por sí mismo.',
      };
    }

    const signatures = ranges.map((range, i) => this.validateOne(buffer, range, i));
    const processable = signatures.filter((s) => !s.error);
    const allValid =
      processable.length > 0 && processable.every((s) => s.valid);
    const modifiedAfterSigning = signatures.some(
      (s) => !s.error && (!s.contentIntact || !s.coversWholeDoc),
    );

    let summary: string;
    if (allValid && !modifiedAfterSigning) {
      const firmantes = signatures.map((s) => s.signerName).filter(Boolean).join(', ');
      summary = `Firma digital válida. Firmado por: ${firmantes || 'firmante desconocido'}.`;
    } else if (modifiedAfterSigning) {
      summary = 'El documento tiene firma, pero fue MODIFICADO después de firmarse: la firma no es confiable.';
    } else {
      summary = 'El documento tiene firma embebida, pero no pudo validarse (firma inválida o corrupta).';
    }

    return {
      hasSignature: true,
      valid: allValid && !modifiedAfterSigning,
      modifiedAfterSigning,
      signatures,
      summary,
    };
  }

  /** Localiza todos los /ByteRange [a b c d] del PDF. */
  private findByteRanges(buffer: Buffer): [number, number, number, number][] {
    const str = buffer.toString('latin1');
    const re = /\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/g;
    const ranges: [number, number, number, number][] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(str)) !== null) {
      ranges.push([+m[1], +m[2], +m[3], +m[4]]);
    }
    return ranges;
  }

  private validateOne(
    buffer: Buffer,
    range: [number, number, number, number],
    index: number,
  ): SignatureInfo {
    const [a, b, c, d] = range;
    try {
      // 1) Extraer la firma DER (entre los < > del /Contents) y el contenido firmado.
      const gap = buffer.toString('latin1', a + b, c);
      const hex = gap
        .slice(gap.indexOf('<') + 1, gap.indexOf('>'))
        .replace(/[^0-9a-fA-F]/g, '')
        .replace(/(00)+$/i, '');
      const der = Buffer.from(hex, 'hex');
      const signedContent = Buffer.concat([
        buffer.slice(a, a + b),
        buffer.slice(c, c + d),
      ]);
      const coversWholeDoc = c + d === buffer.length;

      // 2) Parsear el PKCS#7 y ubicar el certificado del firmante (hoja).
      const p7Asn1 = forge.asn1.fromDer(forge.util.createBuffer(der.toString('binary')));
      const message: any = forge.pkcs7.messageFromAsn1(p7Asn1);
      const certs: any[] = message.certificates ?? [];
      const leaf = this.findLeaf(certs);
      const rc = message.rawCapture;

      const digestOid = forge.asn1.derToOid(rc.digestAlgorithm);
      const nodeAlgo = DIGEST_OID_TO_NODE[digestOid] ?? 'RSA-SHA256';
      const hashAlgo = DIGEST_OID_TO_HASH[digestOid] ?? 'sha256';

      // 3) Validez criptográfica + integridad, sobre los "authenticated attributes".
      let cryptoValid = false;
      let contentIntact = false;
      let signingTime: string | null = null;
      const authAttrs = rc.authenticatedAttributes as any[] | undefined;

      if (leaf && authAttrs && authAttrs.length) {
        const set = forge.asn1.create(
          forge.asn1.Class.UNIVERSAL,
          forge.asn1.Type.SET,
          true,
          authAttrs,
        );
        const attrDer = Buffer.from(forge.asn1.toDer(set).getBytes(), 'binary');
        const certPem = forge.pki.certificateToPem(leaf);
        const sigBuf = Buffer.from(rc.signature, 'binary');
        try {
          cryptoValid = createVerify(nodeAlgo).update(attrDer).verify(certPem, sigBuf);
        } catch {
          cryptoValid = false;
        }

        const computed = createHash(hashAlgo).update(signedContent).digest('hex');
        const embedded = this.readMessageDigest(authAttrs);
        contentIntact = embedded !== null && embedded === computed;
        signingTime = this.readSigningTime(authAttrs);
      }

      const now = new Date();
      const notBefore: Date = leaf?.validity?.notBefore ?? now;
      const notAfter: Date = leaf?.validity?.notAfter ?? now;
      const certExpired = !leaf || now > notAfter || now < notBefore;

      return {
        signerName: leaf ? this.attr(leaf.subject, OID_CN) : null,
        signerId: leaf ? this.attr(leaf.subject, OID_SERIAL) : null,
        signerDni: leaf ? this.extractDni(this.attr(leaf.subject, OID_SERIAL)) : null,
        issuer: leaf
          ? this.attr(leaf.issuer, OID_CN) ?? this.attr(leaf.issuer, OID_ORG)
          : null,
        country: leaf ? this.attr(leaf.subject, OID_COUNTRY) : null,
        signingTime,
        certValidFrom: notBefore.toISOString(),
        certValidTo: notAfter.toISOString(),
        certExpired,
        subFilter: this.getSubFilter(buffer, range),
        cryptoValid,
        contentIntact,
        coversWholeDoc,
        valid: cryptoValid && contentIntact,
      };
    } catch (e) {
      this.logger.warn(`No se pudo procesar la firma #${index + 1}: ${(e as Error).message}`);
      return {
        signerName: null,
        signerId: null,
        signerDni: null,
        issuer: null,
        country: null,
        signingTime: null,
        certValidFrom: new Date(0).toISOString(),
        certValidTo: new Date(0).toISOString(),
        certExpired: true,
        subFilter: this.getSubFilter(buffer, range),
        cryptoValid: false,
        contentIntact: false,
        coversWholeDoc: false,
        valid: false,
        error: (e as Error).message,
      };
    }
  }

  /** El certificado firmante (hoja) = el que no es emisor de ningún otro del conjunto. */
  private findLeaf(certs: any[]): any | null {
    if (!certs.length) return null;
    if (certs.length === 1) return certs[0];
    return (
      certs.find(
        (cert) =>
          !certs.some(
            (other) => other !== cert && other.issuer.hash === cert.subject.hash,
          ),
      ) ?? certs[0]
    );
  }

  /** Lee un atributo del sujeto/emisor por su OID y lo decodifica como UTF-8. */
  private attr(entity: any, oid: string): string | null {
    const found = entity.attributes.find((a: any) => a.type === oid);
    if (!found || found.value == null) return null;
    // forge entrega los bytes crudos; los reinterpretamos como UTF-8 (acentos, ñ).
    return Buffer.from(String(found.value), 'binary').toString('utf8');
  }

  /** Del serialNumber del certificado (p.ej. "PNOPE-41685564") extrae el DNI. */
  private extractDni(serial: string | null): string | null {
    if (!serial) return null;
    const m = serial.match(/(\d{8})/);
    return m ? m[1] : null;
  }

  /** Extrae el hash firmado (atributo messageDigest) en hex. */
  private readMessageDigest(authAttrs: any[]): string | null {
    for (const a of authAttrs) {
      if (forge.asn1.derToOid(a.value[0].value) === OID_MESSAGE_DIGEST) {
        return Buffer.from(a.value[1].value[0].value, 'binary').toString('hex');
      }
    }
    return null;
  }

  /** Extrae el momento de firma (atributo signingTime) como ISO 8601. */
  private readSigningTime(authAttrs: any[]): string | null {
    for (const a of authAttrs) {
      if (forge.asn1.derToOid(a.value[0].value) === OID_SIGNING_TIME) {
        try {
          const raw = a.value[1].value[0].value as string;
          // UTCTime (YYMMDDHHMMSSZ) o GeneralizedTime; forge trae utilidades.
          const d = /^\d{12,13}Z?$/.test(raw)
            ? (forge.asn1 as any).utcTimeToDate(raw)
            : new Date(raw);
          return d instanceof Date && !isNaN(d.getTime()) ? d.toISOString() : null;
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  /** Busca el /SubFilter declarado cerca del /ByteRange (tipo de firma). */
  private getSubFilter(buffer: Buffer, range: [number, number, number, number]): string | null {
    const from = Math.max(0, range[0]);
    const to = Math.min(buffer.length, range[0] + range[1] + 4000);
    const around = buffer.toString('latin1', from, to);
    const m = around.match(/\/SubFilter\s*\/([A-Za-z0-9.]+)/);
    return m ? m[1] : null;
  }
}
