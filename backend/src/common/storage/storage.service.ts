/**
 * Servicio de almacenamiento de archivos.
 * Guarda y lee los PDFs. Si AWS S3 está configurado, usa S3 (bucket público);
 * de lo contrario cae automáticamente al disco local (carpeta STORAGE_DIR),
 * útil para desarrollo sin credenciales.
 *
 * El resto del código sigue trabajando con una "key" (identificador del archivo)
 * sin saber si vive en S3 o en disco.
 */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';
import { S3Service } from './s3.service';

@Injectable()
export class StorageService {
  private readonly baseDir: string;
  /** Prefijo (carpeta) de las keys en S3. */
  private readonly s3Prefix = 'documentos';

  constructor(
    config: ConfigService,
    private readonly s3: S3Service,
  ) {
    this.baseDir = config.get<string>('storageDir') ?? './storage';
  }

  /**
   * Genera una key única para un archivo nuevo (sin guardarlo todavía).
   * Útil cuando necesitas conocer la URL pública ANTES de escribir el archivo
   * (ej: estampar en el QR la URL del propio PDF sellado).
   */
  buildKey(prefix = 'doc'): string {
    const fileName = `${prefix}-${this.timestamp()}.pdf`;
    return this.s3.isEnabled() ? `${this.s3Prefix}/${fileName}` : fileName;
  }

  /** Guarda un Buffer bajo una key ya conocida (S3 o disco local). */
  async saveBuffer(buffer: Buffer, key: string): Promise<string> {
    if (this.s3.isEnabled()) {
      await this.s3.upload(buffer, key, 'application/pdf');
      return key;
    }
    await this.ensureDir();
    await fs.writeFile(join(this.baseDir, key), buffer);
    return key;
  }

  /** Guarda un PDF (recibido en base64) y devuelve la key del archivo. */
  async savePdfFromBase64(base64: string, prefix = 'doc'): Promise<string> {
    const clean = base64.replace(/^data:application\/pdf;base64,/, '');
    const buffer = Buffer.from(clean, 'base64');
    return this.saveBuffer(buffer, this.buildKey(prefix));
  }

  /** Lee un archivo y lo devuelve como Buffer. */
  async read(key: string): Promise<Buffer> {
    if (this.s3.isEnabled()) return this.s3.download(key);
    return fs.readFile(join(this.baseDir, key));
  }

  /** Lee un archivo y lo devuelve en base64 (para mostrarlo en el navegador). */
  async readAsBase64(key: string): Promise<string> {
    const buffer = await this.read(key);
    return buffer.toString('base64');
  }

  /** Elimina un archivo si existe. */
  async remove(key: string): Promise<void> {
    if (this.s3.isEnabled()) {
      await this.s3.remove(key);
      return;
    }
    try {
      await fs.unlink(join(this.baseDir, key));
    } catch {
      // Si el archivo ya no existe, no pasa nada.
    }
  }

  /** Calcula la huella SHA-256 de un archivo (para verificar integridad). */
  async sha256(key: string): Promise<string> {
    const buffer = await this.read(key);
    return createHash('sha256').update(buffer).digest('hex');
  }

  /** URL pública del archivo en S3 (o null si se usa disco local). */
  publicUrl(key: string): string | null {
    return this.s3.isEnabled() ? this.s3.publicUrl(key) : null;
  }

  private async ensureDir() {
    await fs.mkdir(this.baseDir, { recursive: true });
  }

  private timestamp() {
    // Nombre único basado en fecha + aleatorio, sin depender de librerías
    return `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
  }
}
