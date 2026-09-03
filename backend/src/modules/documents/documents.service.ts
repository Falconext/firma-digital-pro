/**
 * Servicio de documentos.
 * Maneja el ciclo de vida del PDF: subir, listar, ver, actualizar y eliminar.
 * Los archivos se guardan en disco (StorageService) y los metadatos en la BD.
 */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DocumentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StorageService } from '../../common/storage/storage.service';
import { MailService } from '../../common/mail/mail.service';
import {
  PdfSignatureService,
  ValidationResult,
} from '../../common/pdf/pdf-signature.service';
import {
  CreateDocumentDto,
  SendSignedEmailDto,
  UpdateDocumentDto,
} from './dto/document.dto';

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private mail: MailService,
    private pdfSignature: PdfSignatureService,
  ) {}

  /**
   * FLUJO (1) — Validación de firma sin almacenar.
   * Reproduce el validador oficial: recibe un PDF (base64) y responde si tiene
   * una firma digital embebida válida, con los datos del firmante. No toca la BD.
   */
  validateSignature(base64File: string): ValidationResult {
    const clean = base64File.replace(/^data:application\/pdf;base64,/, '');
    const buffer = Buffer.from(clean, 'base64');
    if (!buffer.length) {
      throw new BadRequestException('El archivo enviado está vacío o no es válido.');
    }
    return this.pdfSignature.validate(buffer);
  }

  /**
   * FLUJO (1) — Re-subida del PDF ya firmado con ReFirma.
   * El operador firmó el PDF sellado (QR + firma) fuera de la plataforma con su
   * certificado (DNIe/token) y aquí sube la versión final. Se VALIDA la firma
   * embebida antes de aceptarla: si no tiene firma real, o fue alterado, se
   * rechaza. Si es válida, el documento pasa a FIRMADO con los datos del firmante.
   */
  async uploadSignedVersion(
    id: number,
    signedBase64: string,
    userId?: number,
    ip?: string,
  ) {
    const doc = await this.findOne(id);

    const clean = signedBase64.replace(/^data:application\/pdf;base64,/, '');
    const buffer = Buffer.from(clean, 'base64');
    if (!buffer.length) {
      throw new BadRequestException('El archivo enviado está vacío o no es un PDF válido.');
    }

    // Validación de la firma embebida (PAdES/PKCS#7).
    const result = this.pdfSignature.validate(buffer);

    if (!result.hasSignature) {
      throw new BadRequestException(
        'El PDF que subiste NO tiene una firma digital embebida. Debes subir la versión firmada con tu certificado (DNIe/token) en ReFirma, no el documento sellado.',
      );
    }
    if (!result.valid) {
      throw new BadRequestException(result.summary);
    }

    // Guardar el PDF firmado y calcular su huella.
    const signedKey = await this.storage.saveBuffer(buffer, this.storage.buildKey('firmado'));
    const hash = await this.storage.sha256(signedKey);

    const first = result.signatures[0];
    const updated = await this.prisma.document.update({
      where: { id },
      data: {
        signedKey,
        hash,
        status: DocumentStatus.FIRMADO,
        signedAt: first?.signingTime ? new Date(first.signingTime) : new Date(),
        signerName: first?.signerName ?? null,
        signerDni: first?.signerDni ?? null,
        signerIssuer: first?.issuer ?? null,
        signatureValid: true,
        signatureInfo: JSON.stringify(result),
      },
      include: { signatory: true },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'DOCUMENTO_FIRMADO_VALIDADO',
        entity: 'Document',
        entityId: id,
        detail: `Versión firmada re-subida y validada. Firmante: ${first?.signerName ?? '—'} (DNI ${first?.signerDni ?? '—'}). SHA-256: ${hash}`,
        userId,
        ip,
      },
    });

    return { document: updated, validation: result };
  }

  /** Sube un nuevo documento PDF (opcionalmente dentro de una carpeta). */
  async create(userId: number, dto: CreateDocumentDto) {
    const storageKey = await this.storage.savePdfFromBase64(dto.base64File);
    return this.prisma.document.create({
      data: {
        fileName: dto.fileName,
        storageKey,
        signatoryId: dto.signatoryId,
        folderId: dto.folderId ?? null,
        createdById: userId,
      },
      include: { signatory: true },
    });
  }

  /**
   * Lista documentos, con búsqueda opcional por nombre.
   * `folder` filtra por carpeta: un id numérico limita a esa carpeta,
   * 'raiz' limita a la raíz (sin carpeta), y undefined trae todos.
   */
  findAll(search?: string, folder?: string) {
    const where: Prisma.DocumentWhereInput = {};
    if (search) where.fileName = { contains: search };
    if (folder === 'raiz') where.folderId = null;
    else if (folder != null && folder !== '') where.folderId = Number(folder);
    return this.prisma.document.findMany({
      where,
      include: { signatory: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      include: { signatory: true },
    });
    if (!doc) throw new NotFoundException('Documento no encontrado');
    return doc;
  }

  /** Devuelve el PDF (firmado > sellado con QR > original) en base64. */
  async getFileBase64(id: number) {
    const doc = await this.findOne(id);
    const key = doc.signedKey ?? doc.sealedKey ?? doc.storageKey;
    const base64 = await this.storage.readAsBase64(key);
    return {
      id: doc.id,
      fileName: doc.fileName,
      status: doc.status,
      base64File: `data:application/pdf;base64,${base64}`,
    };
  }

  /** Devuelve el PDF como Buffer (para descargar). */
  async getFileBuffer(id: number) {
    const doc = await this.findOne(id);
    const key = doc.signedKey ?? doc.sealedKey ?? doc.storageKey;
    return { doc, buffer: await this.storage.read(key) };
  }

  /**
   * PASO 6.7 del procedimiento: remite el documento ya firmado al cliente
   * por correo electrónico (con el PDF adjunto).
   */
  async sendSignedEmail(
    id: number,
    dto: SendSignedEmailDto,
    verifyBaseUrl: string,
    userId?: number,
    ip?: string,
  ) {
    const doc = await this.findOne(id);
    if (doc.status !== DocumentStatus.FIRMADO) {
      throw new BadRequestException(
        'El documento debe estar firmado antes de enviarlo al cliente.',
      );
    }

    const key = doc.signedKey ?? doc.sealedKey;
    if (!key) throw new BadRequestException('El documento no tiene un archivo firmado disponible.');
    const buffer = await this.storage.read(key);

    await this.mail.sendSignedDocument({
      to: dto.email,
      clienteNombre: dto.clienteNombre,
      fileName: doc.fileName,
      pdfBuffer: buffer,
      verifyUrl: `${verifyBaseUrl}/${doc.id}`,
    });

    const updated = await this.prisma.document.update({
      where: { id },
      data: {
        clienteEmail: dto.email,
        clienteNombre: dto.clienteNombre,
        emailEnviadoAt: new Date(),
      },
      include: { signatory: true },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'DOCUMENTO_ENVIADO_EMAIL',
        entity: 'Document',
        entityId: id,
        detail: `Documento firmado enviado a ${dto.email}`,
        userId,
        ip,
      },
    });

    return updated;
  }

  async update(id: number, dto: UpdateDocumentDto) {
    await this.findOne(id);
    return this.prisma.document.update({
      where: { id },
      data: dto,
      include: { signatory: true },
    });
  }

  async remove(id: number) {
    const doc = await this.findOne(id);
    // Borramos los archivos físicos y el registro
    await this.storage.remove(doc.storageKey);
    if (doc.sealedKey) await this.storage.remove(doc.sealedKey);
    if (doc.signedKey) await this.storage.remove(doc.signedKey);
    await this.prisma.document.delete({ where: { id } });
    return { id, deleted: true };
  }
}
