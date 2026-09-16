import axios from 'axios';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** cn() = combina clases de Tailwind sin conflictos. Uso muy común. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formatea una fecha ISO a un formato legible en español. */
export function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Convierte un archivo (File) a texto base64 (sin el prefijo data:). */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.replace(/^data:.*;base64,/, ''));
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Formatea un monto en la moneda indicada (PEN por defecto), estilo peruano. */
export function formatMoney(value: string | number | null | undefined, moneda = 'PEN'): string {
  const n = Number(value);
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: moneda }).format(
    isNaN(n) ? 0 : n,
  );
}

/** Solo la fecha (sin hora) en formato peruano. */
export function formatDateOnly(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** Extrae el mensaje de error del backend ({ message }) o devuelve uno genérico. */
export function errorMessage(e: unknown, fallback: string): string {
  if (axios.isAxiosError(e) && e.response?.data?.message) {
    return String(e.response.data.message);
  }
  return fallback;
}

/**
 * Deja solo dígitos con código de país (formato que espera wa.me).
 * Un celular peruano de 9 dígitos recibe el prefijo 51. Espejo del backend.
 */
export function normalizePhone(raw: string): string {
  let d = (raw ?? '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 9 && d.startsWith('9')) d = `51${d}`;
  return d;
}

/** Enlace "click-to-chat" de WhatsApp con el mensaje ya redactado. */
export function whatsappUrl(telefono: string, mensaje?: string): string {
  const num = normalizePhone(telefono);
  const text = mensaje ? `?text=${encodeURIComponent(mensaje)}` : '';
  return `https://wa.me/${num}${text}`;
}
