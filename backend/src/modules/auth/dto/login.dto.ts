/**
 * DTO = "Data Transfer Object". Define y valida la forma de los datos
 * que llegan en la petición. Si algo no cumple, NestJS rechaza automáticamente.
 */
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'El correo no es válido' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @MinLength(4, { message: 'La contraseña es muy corta' })
  password!: string;
}

export class RefreshDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
