/**
 * DTOs de clientes: definen qué campos acepta la API y con qué reglas.
 * Todo lo que no esté aquí se descarta (ValidationPipe con whitelist).
 */
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { TipoDocumento } from '@prisma/client';

export class CreateClientDto {
  @IsEnum(TipoDocumento, {
    message: 'tipoDocumento debe ser DNI, RUC, CARNET_EXTRANJERIA o PASAPORTE',
  })
  tipoDocumento!: TipoDocumento;

  @IsString()
  @Length(6, 20, { message: 'El número de documento no es válido' })
  numeroDocumento!: string;

  /** Nombre completo (persona) o razón social (empresa). */
  @IsString() @IsNotEmpty() nombre!: string;

  /** Persona de contacto (se imprime en la cotización). */
  @IsOptional() @IsString() contacto?: string;

  @IsEmail({}, { message: 'El correo no es válido' }) correo!: string;

  @IsString() @IsNotEmpty() telefono!: string;

  @IsOptional() @IsString() direccion?: string;

  /** Imagen/logo en base64 (opcional). */
  @IsOptional() @IsString() imagenPerfil?: string;

  /** Un cliente nuevo nace activo; solo se envía si se quiere crear inactivo. */
  @IsOptional() @IsBoolean() estado?: boolean;
}

/** Actualización: los mismos campos, todos opcionales. */
export class UpdateClientDto {
  @IsOptional() @IsEnum(TipoDocumento) tipoDocumento?: TipoDocumento;
  @IsOptional() @IsString() @Length(6, 20) numeroDocumento?: string;
  @IsOptional() @IsString() @IsNotEmpty() nombre?: string;
  @IsOptional() @IsString() contacto?: string | null;
  @IsOptional() @IsEmail() correo?: string;
  @IsOptional() @IsString() @IsNotEmpty() telefono?: string;
  @IsOptional() @IsString() direccion?: string;
  @IsOptional() @IsString() imagenPerfil?: string;
  @IsOptional() @IsBoolean() estado?: boolean;
}
