/**
 * Servicio de bajo nivel para Amazon S3.
 * Encapsula el SDK de AWS (subir, leer, borrar) para que el resto del código
 * (StorageService) no dependa directamente de S3.
 *
 * Configuración por variables de entorno:
 *   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_S3_BUCKET_NAME
 *
 * Si faltan credenciales, el servicio queda deshabilitado (isEnabled() = false)
 * y StorageService cae automáticamente al disco local.
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client?: S3Client;
  private readonly bucketName: string;
  private readonly region: string;

  constructor(config: ConfigService) {
    const accessKeyId = config.get<string>('AWS_ACCESS_KEY_ID')?.trim();
    const secretAccessKey = config.get<string>('AWS_SECRET_ACCESS_KEY')?.trim();
    this.region = (config.get<string>('AWS_REGION') || 'us-east-1').trim();
    this.bucketName = (config.get<string>('AWS_S3_BUCKET_NAME') || '').trim();

    if (!accessKeyId || !secretAccessKey || !this.bucketName) {
      this.logger.warn(
        '⚠️  Credenciales de AWS S3 no configuradas. Se usará el disco local.',
      );
    } else {
      this.s3Client = new S3Client({
        region: this.region,
        credentials: { accessKeyId, secretAccessKey },
      });
      this.logger.log(
        `✅ AWS S3 inicializado (bucket: ${this.bucketName}, región: ${this.region})`,
      );
    }
  }

  /** ¿Está S3 configurado y disponible? */
  isEnabled(): boolean {
    return !!this.s3Client;
  }

  /** URL pública del objeto (el bucket es de lectura pública). */
  publicUrl(key: string): string {
    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
  }

  /** Sube un archivo y devuelve su URL pública. */
  async upload(
    buffer: Buffer,
    key: string,
    contentType = 'application/pdf',
  ): Promise<string> {
    if (!this.s3Client) throw new Error('S3 no está configurado');
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );
    const url = this.publicUrl(key);
    this.logger.log(`✅ Subido a S3: ${url}`);
    return url;
  }

  /** Descarga un objeto como Buffer. */
  async download(key: string): Promise<Buffer> {
    if (!this.s3Client) throw new Error('S3 no está configurado');
    const res = await this.s3Client.send(
      new GetObjectCommand({ Bucket: this.bucketName, Key: key }),
    );
    // El Body es un stream en Node: lo juntamos en un Buffer.
    const chunks: Buffer[] = [];
    for await (const chunk of res.Body as AsyncIterable<Uint8Array>) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  /** Elimina un objeto (silencioso si no existe). */
  async remove(key: string): Promise<void> {
    if (!this.s3Client) throw new Error('S3 no está configurado');
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({ Bucket: this.bucketName, Key: key }),
      );
      this.logger.log(`🗑️  Eliminado de S3: ${key}`);
    } catch (err) {
      this.logger.warn(`No se pudo eliminar ${key}: ${(err as Error).message}`);
    }
  }
}
