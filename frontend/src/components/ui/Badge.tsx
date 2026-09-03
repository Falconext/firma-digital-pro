/** Etiqueta de estado (ej: Firmado / Pendiente). Comunica con color + texto. */
import { cn } from '@/lib/utils';
import type { DocumentStatus } from '@/types';

const styles: Record<DocumentStatus, string> = {
  FIRMADO: 'bg-green-100 text-green-800',
  SELLADO: 'bg-blue-100 text-blue-800',
  PENDIENTE: 'bg-amber-100 text-amber-800',
  ANULADO: 'bg-gray-200 text-gray-700',
};

const labels: Record<DocumentStatus, string> = {
  FIRMADO: 'Firmado',
  SELLADO: 'Sellado (QR)',
  PENDIENTE: 'Pendiente',
  ANULADO: 'Anulado',
};

export function StatusBadge({ status }: { status: DocumentStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        styles[status],
      )}
    >
      {labels[status]}
    </span>
  );
}
