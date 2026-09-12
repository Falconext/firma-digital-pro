import {
  IsBoolean,
  IsEmail,
  isEnum,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { TipoDocumento } from '@prisma/client';

export class CreateClientDto {
  @IsEmail() correo!: string;
@IsBoolean() estado!: boolean;
@IsString() @IsNotEmpty() telefono!: string;
@IsEnum(TipoDocumento) tipoDocumento!: TipoDocumento;
@IsString() @IsNotEmpty() numeroDocumento!: string;
  @IsOptional() @IsString() imagenPerfil?: string;
}

export class UpdateClientDto {

  @IsOptional() @IsEmail() correo?: string;
  @IsOptional() @IsBoolean() estado?: boolean;
  @IsOptional() @IsString() @IsNotEmpty() numeroDocumento?: string;
  @IsOptional() @IsEnum(TipoDocumento) tipoDocumento?: TipoDocumento;
  @IsOptional() @IsString() imagenPerfil?: string;
}
