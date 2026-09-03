/**
 * ==========================================================================
 *  Servicio de integración con ReFirma (RENIEC)
 * ==========================================================================
 *  ReFirma es el software oficial del Estado Peruano (RENIEC) para firmar
 *  digitalmente PDFs con validez legal (formato PAdES, marco de la IOFE).
 *
 *  ¿Cómo funciona la integración web?  (Componente "ReFirma Invoker")
 *  ------------------------------------------------------------------
 *  1. El navegador NO firma el PDF. Quien firma es el aplicativo ReFirma
 *     instalado en la PC del usuario, usando su certificado (DNIe o token).
 *  2. Nuestra web arma un JSON con los "argumentos de firma" (qué documento
 *     firmar, cómo se ve la firma, a dónde devolver el resultado).
 *  3. Ese JSON se codifica en Base64 y se entrega al componente ReFirma
 *     Invoker (vía su librería JS / WebSocket local ws://127.0.0.1).
 *  4. ReFirma abre, el usuario elige su certificado y firma.
 *  5. ReFirma sube el PDF firmado a nuestra URL de retorno (callback) y
 *     avisa al navegador con el evento "invokerOk".
 *
 *  Este servicio se encarga de los pasos 2 (armar argumentos) y 5 (recibir
 *  el PDF firmado y guardarlo). El paso 3-4 ocurre en el frontend + la PC.
 *
 *  IMPORTANTE: los nombres exactos de los campos del JSON dependen de la
 *  versión del ReFirma Invoker con la que la entidad tiene licencia. Ajusta
 *  buildInvokerArguments() según el "Manual de Integración ReFirma Invoker"
 *  que RENIEC entrega a cada entidad. Aquí dejamos la estructura estándar
 *  documentada y en un solo lugar para que sea fácil de adaptar.
 * ==========================================================================
 */
import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentStatus, Signatory } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StorageService } from '../../common/storage/storage.service';
import { SealService } from '../../common/pdf/seal.service';

/** Cómo debe verse la firma visible sobre el PDF. */
export interface SignatureAppearance {
  pagina: number; // Página donde va la firma (0 = todas / última según config)
  x: number; // Posición horizontal (puntos PDF)
  y: number; // Posición vertical (puntos PDF)
  ancho: number;
  alto: number;
  motivo: string; // Ej: "Aprobación de Documento"
  firmante: string; // Nombre visible del firmante
}

@Injectable()
export class RefirmaService {
  private readonly logger = new Logger(RefirmaService.name);

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private config: ConfigService,
    private seal: SealService,
  ) {}

  /**
   * PASO 6.4 del procedimiento: apenas se almacena el documento, se estampa
   * AUTOMÁTICAMENTE el sello visual (QR + bloque de firmante). El documento
   * queda en estado SELLADO (con QR, aún sin firma criptográfica real).
   */
  async autoSealOnUpload(
    documentId: number,
    verifyBaseUrl: string,
    userId?: number,
    ip?: string,
  ) {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: { signatory: true },
    });
    if (!doc) throw new BadRequestException('Documento no encontrado');
    if (!doc.signatory) {
      // No debería ocurrir (el firmante es obligatorio al subir), pero si pasa
      // dejamos el documento en PENDIENTE en vez de romper la subida.
      this.logger.warn(`Documento ${documentId} sin firmante: se omite el sello automático`);
      return doc;
    }

    const { sealedKey, hash } = await this.stampSeal(doc, verifyBaseUrl);

    const updated = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        sealedKey,
        hash,
        status: DocumentStatus.SELLADO,
        sealedAt: new Date(),
      },
      include: { signatory: true },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'DOCUMENTO_SELLADO',
        entity: 'Document',
        entityId: documentId,
        detail: `Sello visual + QR generado automáticamente al almacenar. SHA-256: ${hash}`,
        userId,
        ip,
      },
    });

    this.logger.log(`Sello automático aplicado al documento ${documentId}`);
    return updated;
  }

  /**
   * Promueve un documento ya SELLADO (con QR) a FIRMADO. En MODO DEMO no hay
   * lector de DNIe disponible, así que esto simula la confirmación de la
   * firma real sin volver a estampar el PDF (el QR ya se generó en el paso
   * 6.4, al subir el documento).
   *
   * NOTA: esto sigue sin ser una firma criptográfica PAdES. Para la firma
   * digital con validez legal se usa el flujo ReFirma real (prepareSigning +
   * storeSignedDocument).
   */
  async applyVisualSeal(
    documentId: number,
    /** Base de la URL de verificación; el QR apuntará a `${verifyBaseUrl}/${id}` */
    verifyBaseUrl: string,
    userId?: number,
    ip?: string,
  ) {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: { signatory: true },
    });
    if (!doc) throw new BadRequestException('Documento no encontrado');
    if (!doc.signatory) {
      throw new BadRequestException(
        'El documento no tiene un firmante asignado. Asígnalo antes de firmar.',
      );
    }

    // Si ya tiene el sello (caso normal: se generó automáticamente al subir),
    // reutilizamos ese archivo en vez de volver a estampar el PDF.
    let signedKey = doc.sealedKey;
    let hash = doc.hash;

    if (!signedKey) {
      const stamped = await this.stampSeal(doc, verifyBaseUrl);
      signedKey = stamped.sealedKey;
      hash = stamped.hash;
    }

    const updated = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        signedKey,
        hash,
        status: DocumentStatus.FIRMADO,
        signedAt: new Date(),
      },
      include: { signatory: true },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'DOCUMENTO_FIRMADO',
        entity: 'Document',
        entityId: documentId,
        detail: `Firma confirmada (modo demo). SHA-256: ${hash}`,
        userId,
        ip,
      },
    });

    this.logger.log(`Documento ${documentId} confirmado como firmado (modo demo)`);
    return updated;
  }

  /** Estampa el QR + bloque de firmante sobre el PDF original y lo guarda. */
  private async stampSeal(
    doc: { id: number; storageKey: string; signatory: Signatory | null },
    verifyBaseUrl: string,
  ) {
    const signatory = doc.signatory;
    if (!signatory) {
      throw new BadRequestException('El documento no tiene un firmante asignado.');
    }
    const original = await this.storage.read(doc.storageKey);

    // Generamos la key del PDF sellado ANTES de estampar, para poder codificar
    // en el QR la URL pública (S3) del propio documento firmado. Si S3 no está
    // configurado (dev), el QR cae a la URL de verificación local.
    const sealedKey = this.storage.buildKey('sellado');
    const verifyUrl =
      this.storage.publicUrl(sealedKey) ?? `${verifyBaseUrl}/${doc.id}`;

    const sealedBytes = await this.seal.applyVisualSeal(
      original,
      {
        nombre: signatory.nombre,
        motivo: signatory.motivo,
        cargo: signatory.cargo,
        dni: signatory.dni,
        cip: signatory.cip,
        empresa: signatory.empresa,
        firmaImagen: signatory.firmaImagen,
      },
      verifyUrl,
    );

    await this.storage.saveBuffer(Buffer.from(sealedBytes), sealedKey);
    const hash = await this.storage.sha256(sealedKey);
    return { sealedKey, hash };
  }

  /**
   * PASO 2: Arma los argumentos que el ReFirma Invoker necesita para firmar
   * un documento, y los devuelve ya codificados en Base64 (como espera RENIEC).
   */
  async prepareSigning(documentId: number, apiBaseUrl: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: { signatory: true },
    });
    if (!doc) throw new BadRequestException('Documento no encontrado');
    if (doc.status === DocumentStatus.FIRMADO) {
      throw new BadRequestException('El documento ya está firmado');
    }

    const pdfBase64 = await this.storage.readAsBase64(doc.storageKey);

    const appearance: SignatureAppearance = {
      pagina: 1,
      x: 380,
      y: 60,
      ancho: 180,
      alto: 90,
      motivo: doc.signatory?.motivo ?? 'Aprobación de Documento',
      firmante: doc.signatory?.nombre ?? 'Firmante',
    };

    const args = this.buildInvokerArguments(doc.id, pdfBase64, appearance, apiBaseUrl);

    // RENIEC exige que los argumentos viajen como JSON codificado en Base64
    const argumentsBase64 = Buffer.from(JSON.stringify(args), 'utf-8').toString(
      'base64',
    );

    this.logger.log(`Argumentos ReFirma preparados para documento ${doc.id}`);
    return { documentId: doc.id, argumentsBase64 };
  }

  /**
   * PASO 5: Recibe el PDF ya firmado por ReFirma, lo guarda, calcula su
   * huella (SHA-256) y marca el documento como FIRMADO. Deja rastro en la
   * bitácora de auditoría.
   */
  async storeSignedDocument(
    documentId: number,
    signedBase64: string,
    userId?: number,
    ip?: string,
  ) {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
    });
    if (!doc) throw new BadRequestException('Documento no encontrado');

    const signedKey = await this.storage.savePdfFromBase64(
      signedBase64,
      'firmado',
    );
    const hash = await this.storage.sha256(signedKey);

    const updated = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        signedKey,
        hash,
        status: DocumentStatus.FIRMADO,
        signedAt: new Date(),
      },
      include: { signatory: true },
    });

    // Auditoría: quién firmó, qué documento y con qué huella
    await this.prisma.auditLog.create({
      data: {
        action: 'DOCUMENTO_FIRMADO',
        entity: 'Document',
        entityId: documentId,
        detail: `Documento firmado con ReFirma. SHA-256: ${hash}`,
        userId,
        ip,
      },
    });

    this.logger.log(`Documento ${documentId} firmado y verificado (hash ${hash.slice(0, 12)}…)`);
    return updated;
  }

  /**
   * Construye el objeto de argumentos para el ReFirma Invoker.
   * >>> AJUSTA ESTOS CAMPOS según el manual de tu versión de ReFirma. <<<
   */
  private buildInvokerArguments(
    documentId: number,
    pdfBase64: string,
    appearance: SignatureAppearance,
    apiBaseUrl: string,
  ) {
    return {
      // Operación: "sign" (firmar). Otra opción del Invoker es "validate".
      operacion: 'sign',
      // Documento a firmar, en Base64
      documento: pdfBase64,
      // Nombre lógico del documento
      nombreDocumento: `documento-${documentId}.pdf`,
      // Apariencia de la firma visible sobre el PDF
      firmaVisible: {
        pagina: appearance.pagina,
        posicionX: appearance.x,
        posicionY: appearance.y,
        ancho: appearance.ancho,
        alto: appearance.alto,
        motivo: appearance.motivo,
        texto: appearance.firmante,
      },
      // URL a la que ReFirma devolverá el PDF firmado (callback / paso 5)
      urlRetorno: `${apiBaseUrl}/refirma/firmado/${documentId}`,
      // Vigencia del pedido de firma (horas)
      vigenciaHoras: 24,
    };
  }
}
