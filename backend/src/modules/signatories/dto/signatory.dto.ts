import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class CreateSignatoryDto {
  @IsString() @IsNotEmpty() nombre!: string;
  @IsString() @Length(8, 12, { message: 'El DNI/RUC no es válido' }) dni!: string;
  @IsOptional() @IsString() cip?: string;
  @IsString() @IsNotEmpty() cargo!: string;
  @IsString() @IsNotEmpty() empresa!: string;
  @IsOptional() @IsString() motivo?: string;
  /** Imagen PNG de la firma manuscrita en base64 (opcional). */
  @IsOptional() @IsString() firmaImagen?: string;
}

export class UpdateSignatoryDto {
  @IsOptional() @IsString() nombre?: string;
  @IsOptional() @IsString() dni?: string;
  @IsOptional() @IsString() cip?: string;
  @IsOptional() @IsString() cargo?: string;
  @IsOptional() @IsString() empresa?: string;
  @IsOptional() @IsString() motivo?: string;
  @IsOptional() @IsBoolean() estado?: boolean;
  @IsOptional() @IsString() firmaImagen?: string;
}
