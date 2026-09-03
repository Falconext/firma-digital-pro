import { IsNotEmpty, IsString } from 'class-validator';

/** Datos que devuelve ReFirma con el PDF ya firmado. */
export class SignedDocumentDto {
  @IsString()
  @IsNotEmpty()
  signedBase64!: string;
}
