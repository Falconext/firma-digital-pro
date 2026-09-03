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
