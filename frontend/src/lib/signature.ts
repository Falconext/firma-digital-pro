/**
 * Flujo (1): re-subida y validación de la firma digital embebida.
 *
 *  - validateSignature(): sube un PDF y pregunta al backend si tiene una firma
 *    digital válida (como el validador oficial firmaperu.gob.pe). No almacena.
 *  - uploadSignedVersion(): sube la versión ya firmada de un documento; el
 *    backend valida la firma y, si es válida, lo marca como FIRMADO.
 */
import { http } from './api';
import type { DocumentItem, ValidationResult } from '@/types';

/** Valida cualquier PDF (base64) sin guardarlo. */
export function validateSignature(base64File: string): Promise<ValidationResult> {
  return http.post<ValidationResult>('/file/validar', { base64File });
}

/** Sube la versión firmada de un documento y la valida. */
export function uploadSignedVersion(
  documentId: number,
  signedBase64: string,
): Promise<{ document: DocumentItem; validation: ValidationResult }> {
  return http.post(`/file/${documentId}/subir-firmado`, { signedBase64 });
}
