/**
 * ==========================================================================
 *  Integración ReFirma (RENIEC) — lado del navegador
 * ==========================================================================
 *  El flujo de firma tiene 3 actores:
 *    1) Esta web (frontend)      -> pide los argumentos y recibe el resultado
 *    2) El backend (NestJS)      -> arma los argumentos y guarda el PDF firmado
 *    3) ReFirma en la PC del usuario -> firma realmente con su certificado
 *
 *  Pasos que ejecuta signWithRefirma():
 *    a) Pide al backend los "argumentos de firma" (Base64) del documento.
 *    b) Invoca al componente ReFirma Invoker instalado en la PC.
 *    c) ReFirma firma y nos devuelve el PDF firmado (Base64).
 *    d) Subimos ese PDF firmado al backend para guardarlo y validarlo.
 *
 *  MODO DEMO: si el componente ReFirma no está instalado (típico en una PC
 *  de pruebas), activamos un modo simulado para poder mostrar el flujo
 *  completo de la interfaz. En producción se usa el invoker real.
 *
 *  Para el invoker REAL, RENIEC entrega una librería JS (clientclickonce.js
 *  o conexión WebSocket ws://127.0.0.1). Implementa aquí los 4 "listeners"
 *  oficiales: getArguments, sendArguments, invokerOk, invokerCancel.
 * ==========================================================================
 */
import { http } from './api';
import type { DocumentItem } from '@/types';

// Configurable por entorno: VITE_REFIRMA_DEMO_MODE=false en la PC que ya
// tenga el ReFirma Invoker real y el lector de DNIe instalados.
const DEMO_MODE = (import.meta.env.VITE_REFIRMA_DEMO_MODE ?? 'true') !== 'false';

interface PrepareResponse {
  documentId: number;
  argumentsBase64: string;
}

/**
 * Firma un documento con ReFirma. Devuelve el documento ya firmado.
 * @param documentId  id del documento a firmar
 * @param onStatus    callback opcional para mostrar el estado al usuario
 */
export async function signWithRefirma(
  documentId: number,
  onStatus?: (msg: string) => void,
): Promise<DocumentItem> {
  // -------------------------------------------------------------------
  //  MODO DEMO: el sello visual + QR ya se generó automáticamente al subir
  //  el documento (paso 6.4). Aquí solo confirmamos la firma, sin volver a
  //  estampar el PDF. No requiere ReFirma instalado.
  // -------------------------------------------------------------------
  if (DEMO_MODE) {
    onStatus?.('Confirmando firma…');
    const signed = await http.post<DocumentItem>(`/refirma/sello/${documentId}`);
    onStatus?.('¡Documento firmado!');
    return signed;
  }

  // -------------------------------------------------------------------
  //  MODO REAL (producción): firma criptográfica PAdES con ReFirma.
  // -------------------------------------------------------------------
  onStatus?.('Preparando documento para firma…');

  // (a) Pedimos los argumentos de firma al backend
  const prep = await http.post<PrepareResponse>(
    `/refirma/preparar/${documentId}`,
  );

  // (b + c) Invocamos ReFirma y obtenemos el PDF firmado
  const signedBase64 = await invokeRealRefirma(prep.argumentsBase64, onStatus);

  // (d) Subimos el PDF firmado al backend
  onStatus?.('Guardando documento firmado…');
  const signed = await http.post<DocumentItem>(
    `/refirma/firmado/${documentId}`,
    { signedBase64 },
  );

  onStatus?.('¡Documento firmado correctamente!');
  return signed;
}

/**
 * Invoca el ReFirma Invoker REAL de RENIEC.
 * >>> Reemplaza el cuerpo según el manual de integración de tu versión. <<<
 *
 * Esquema típico con WebSocket local:
 *   const ws = new WebSocket('ws://127.0.0.1:48596');
 *   ws.onopen    = () => ws.send(argumentsBase64);       // sendArguments
 *   ws.onmessage = (ev) => { ...invokerOk -> resolve(pdf firmado)... };
 *   ws.onerror   = () => reject(...);                    // invokerCancel
 */
function invokeRealRefirma(
  argumentsBase64: string,
  onStatus?: (msg: string) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    onStatus?.('Abriendo ReFirma… elige tu certificado y firma.');
    try {
      const ws = new WebSocket('ws://127.0.0.1:48596');
      ws.onopen = () => ws.send(argumentsBase64); // sendArguments
      ws.onmessage = (event) => {
        // El invoker responde con el PDF firmado (Base64). invokerOk.
        resolve(String(event.data));
        ws.close();
      };
      ws.onerror = () =>
        reject(
          new Error(
            'No se pudo conectar con ReFirma. Verifica que esté instalado y abierto.',
          ),
        );
    } catch (e) {
      reject(e);
    }
  });
}
