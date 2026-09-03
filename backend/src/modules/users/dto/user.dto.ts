import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @IsString() @IsNotEmpty() nombre!: string;
  @IsString() @IsNotEmpty() apellido!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(6) password!: string;
  @IsOptional() @IsEnum(Role) rol?: Role;
  @IsOptional() @IsString() imagenPerfil?: string;
}

export class UpdateUserDto {
  @IsOptional() @IsString() nombre?: string;
  @IsOptional() @IsString() apellido?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MinLength(6) password?: string;
  @IsOptional() @IsEnum(Role) rol?: Role;
  @IsOptional() @IsBoolean() estado?: boolean;
  @IsOptional() @IsString() imagenPerfil?: string;
}
