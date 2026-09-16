/**
 * Consulta de identidad (RENIEC para DNI, SUNAT para RUC) vía el backend.
 * Se usa para autocompletar nombre / razón social al registrar clientes y
 * firmantes. Si el backend no tiene RENIEC_TOKEN, responde 503 y el
 * formulario sigue permitiendo el registro manual.
 */
import { http } from './api';
import type { IdentidadResult } from '@/types';

/** ¿El número tiene la longitud correcta para consultarse? */
export function puedeConsultar(tipo: string, numero: string): boolean {
  const n = numero.replace(/\D/g, '');
  return (tipo === 'DNI' && n.length === 8) || (tipo === 'RUC' && n.length === 11);
}

export function consultarIdentidad(tipo: 'DNI' | 'RUC', numero: string): Promise<IdentidadResult> {
  const n = numero.replace(/\D/g, '');
  return http.get<IdentidadResult>(`/clientes/consultar/${tipo}/${n}`);
}
