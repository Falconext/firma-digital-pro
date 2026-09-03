import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateFolderDto {
  /** Nombre visible de la carpeta (ej: "Reportes 2025"). */
  @IsString() @IsNotEmpty() nombre!: string;

  /** Carpeta padre. Omitir o null = crear en la raíz. */
  @IsOptional() @IsInt() parentId?: number | null;
}

export class UpdateFolderDto {
  /** Nuevo nombre (renombrar). */
  @IsOptional() @IsString() @IsNotEmpty() nombre?: string;

  /** Nueva carpeta padre (mover). null = mover a la raíz. */
  @IsOptional() @IsInt() parentId?: number | null;
}
