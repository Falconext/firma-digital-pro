import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

export class CreateDocumentDto {
  /** Concepto / nombre visible del documento. */
  @IsString() @IsNotEmpty() fileName!: string;

  /** Contenido del PDF en base64 (con o sin el prefijo data:...). */
  @IsString() @IsNotEmpty() base64File!: string;

  /**
   * Firmante autorizado para este documento (obligatorio, paso 6.3 del
   * procedimiento: se selecciona al momento de subir el documento).
   */
  @IsInt() @IsNotEmpty() signatoryId!: number;

  /** Carpeta donde se guardará el documento. Omitir = raíz. */
  @IsOptional() @IsInt() folderId?: number | null;

  /** Cliente registrado al que pertenece el documento (opcional). */
  @IsOptional() @IsInt() clienteId?: number | null;
}

export class UpdateDocumentDto {
  @IsOptional() @IsString() fileName?: string;
  @IsOptional() @IsInt() signatoryId?: number;
  /** Mover el documento a otra carpeta. null = raíz. */
  @IsOptional() @IsInt() folderId?: number | null;
  /** Asignar / quitar (null) el cliente del documento. */
  @IsOptional() @IsInt() clienteId?: number | null;
}

export class SendSignedEmailDto {
  /**
   * Cliente registrado: se usa su correo y nombre. Si se envía, `email`
   * puede omitirse.
   */
  @IsOptional() @IsInt() clienteId?: number;

  /** Correo destino (obligatorio si no se indica clienteId). */
  @ValidateIf((o) => !o.clienteId)
  @IsEmail({}, { message: 'Debes indicar un correo válido o un cliente registrado' })
  email?: string;

  @IsOptional() @IsString() clienteNombre?: string;
}

/** Re-subida de la versión ya firmada (con firma digital embebida). */
export class UploadSignedDto {
  /** PDF firmado en base64 (con o sin el prefijo data:...). */
  @IsString() @IsNotEmpty() signedBase64!: string;
}

/** Validación de un PDF cualquiera (como el validador oficial). */
export class ValidateSignatureDto {
  /** PDF a validar en base64 (con o sin el prefijo data:...). */
  @IsString() @IsNotEmpty() base64File!: string;
}
