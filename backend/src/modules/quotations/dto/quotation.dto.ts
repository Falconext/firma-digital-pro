/**
 * DTOs de cotizaciones.
 * Una cotización = cliente + lista de ítems (servicios del catálogo o líneas
 * libres) + condiciones. Los totales NO se envían: los calcula el servidor.
 */
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { EstadoCotizacion } from '@prisma/client';

const MONEDAS = ['PEN', 'USD'];

export class QuotationItemDto {
  /** Servicio del catálogo (opcional: puede ser una línea libre). */
  @IsOptional() @IsInt() servicioId?: number | null;

  @IsOptional() @IsString() codigo?: string | null;

  /** Columna ACTIVIDAD (nombre del servicio). Si falta, se toma del catálogo. */
  @IsOptional() @IsString() actividad?: string | null;

  /** Columna DESCRIPCIÓN (producto / muestra). */
  @IsOptional() @IsString() descripcion?: string | null;

  /** Columna DOCUMENTO NORMATIVO. Si falta, se toma del método del catálogo. */
  @IsOptional() @IsString() documentoNormativo?: string | null;

  /** PRO (propio) = true / SUB (subcontratado) = false. */
  @IsOptional() @IsBoolean() propio?: boolean;

  /** AC (acreditado) = true / NA = false. */
  @IsOptional() @IsBoolean() acreditado?: boolean;

  @IsOptional() @IsString() @IsNotEmpty() unidad?: string;

  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) cantidad!: number;

  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) precioUnitario!: number;
}

export class CreateQuotationDto {
  @IsInt() clienteId!: number;

  @IsOptional() @IsInt() @Min(1) validezDias?: number;

  @IsOptional() @IsIn(MONEDAS) moneda?: string;

  @IsOptional() @IsBoolean() aplicaIgv?: boolean;

  /** Descuento global en monto (no porcentaje). */
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) descuento?: number;

  @IsOptional() @IsString() observaciones?: string | null;

  @IsOptional() @IsString() condiciones?: string | null;

  /** Sección II: código y nombre del servicio solicitado. */
  @IsOptional() @IsString() codigoServicio?: string | null;
  @IsOptional() @IsString() servicioSolicitado?: string | null;

  /** Sección III (nota). */
  @IsOptional() @IsBoolean() contramuestra?: boolean;
  @IsOptional() @IsString() entregable?: string | null;
  @IsOptional() @IsString() tiempoEntrega?: string | null;

  /** Firmante "Responsable de atención al cliente". */
  @IsOptional() @IsInt() responsableId?: number | null;

  @IsArray()
  @ArrayMinSize(1, { message: 'La cotización debe tener al menos un ítem' })
  @ValidateNested({ each: true })
  @Type(() => QuotationItemDto)
  items!: QuotationItemDto[];
}

/** Edición: solo en BORRADOR. Si se envían ítems, reemplazan a los anteriores. */
export class UpdateQuotationDto {
  @IsOptional() @IsInt() clienteId?: number;
  @IsOptional() @IsInt() @Min(1) validezDias?: number;
  @IsOptional() @IsIn(MONEDAS) moneda?: string;
  @IsOptional() @IsBoolean() aplicaIgv?: boolean;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) descuento?: number;
  @IsOptional() @IsString() observaciones?: string | null;
  @IsOptional() @IsString() condiciones?: string | null;

  /** Sección II: código y nombre del servicio solicitado. */
  @IsOptional() @IsString() codigoServicio?: string | null;
  @IsOptional() @IsString() servicioSolicitado?: string | null;

  /** Sección III (nota). */
  @IsOptional() @IsBoolean() contramuestra?: boolean;
  @IsOptional() @IsString() entregable?: string | null;
  @IsOptional() @IsString() tiempoEntrega?: string | null;

  /** Firmante "Responsable de atención al cliente". */
  @IsOptional() @IsInt() responsableId?: number | null;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'La cotización debe tener al menos un ítem' })
  @ValidateNested({ each: true })
  @Type(() => QuotationItemDto)
  items?: QuotationItemDto[];
}

export class ChangeQuotationStatusDto {
  @IsEnum(EstadoCotizacion) estado!: EstadoCotizacion;
}

export class SendQuotationDto {
  /** Correo destino. Si se omite, se usa el del cliente. */
  @IsOptional() @IsEmail() email?: string;
  /** Texto adicional para el cuerpo del correo. */
  @IsOptional() @IsString() mensaje?: string;
}

/** Registro de envío por WhatsApp (el mensaje sale del WhatsApp del usuario). */
export class SendWhatsappDto {
  /** Número al que se envió, con o sin código de país. */
  @IsString() telefono!: string;
}

/** Convierte la cotización en un Documento (PDF sellado con QR) listo para firmar. */
export class GenerateDocumentDto {
  @IsInt() signatoryId!: number;
  @IsOptional() @IsInt() folderId?: number | null;
}
