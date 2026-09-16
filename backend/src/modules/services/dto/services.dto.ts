/**
 * DTOs del catálogo de servicios / productos.
 */
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';
import { CategoriaServicio, TipoItem } from '@prisma/client';

const MONEDAS = ['PEN', 'USD'];

export class CreateServiceDto {
  /** Código interno único. Ej: FQ-001 */
  @IsString() @Length(2, 20) codigo!: string;

  @IsString() @IsNotEmpty() nombre!: string;

  @IsOptional() @IsString() descripcion?: string;

  @IsOptional() @IsEnum(TipoItem) tipo?: TipoItem;

  @IsOptional() @IsEnum(CategoriaServicio) categoria?: CategoriaServicio;

  /** Norma o método de referencia (AOAC, ISO, NTP…). */
  @IsOptional() @IsString() metodo?: string;

  @IsOptional() @IsBoolean() acreditado?: boolean;

  /** true = lo ejecuta un tercero (SUB en la cotización). */
  @IsOptional() @IsBoolean() subcontratado?: boolean;

  /** Unidad de cobro: muestra, ensayo, visita, hora, día, unidad. */
  @IsOptional() @IsString() @IsNotEmpty() unidad?: string;

  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) precio!: number;

  @IsOptional() @IsIn(MONEDAS) moneda?: string;

  @IsOptional() @IsInt() @Min(0) tiempoEntregaDias?: number | null;

  @IsOptional() @IsBoolean() estado?: boolean;
}

export class UpdateServiceDto {
  @IsOptional() @IsString() @Length(2, 20) codigo?: string;
  @IsOptional() @IsString() @IsNotEmpty() nombre?: string;
  @IsOptional() @IsString() descripcion?: string | null;
  @IsOptional() @IsEnum(TipoItem) tipo?: TipoItem;
  @IsOptional() @IsEnum(CategoriaServicio) categoria?: CategoriaServicio;
  @IsOptional() @IsString() metodo?: string | null;
  @IsOptional() @IsBoolean() acreditado?: boolean;
  @IsOptional() @IsBoolean() subcontratado?: boolean;
  @IsOptional() @IsString() @IsNotEmpty() unidad?: string;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) precio?: number;
  @IsOptional() @IsIn(MONEDAS) moneda?: string;
  @IsOptional() @IsInt() @Min(0) tiempoEntregaDias?: number | null;
  @IsOptional() @IsBoolean() estado?: boolean;
}
