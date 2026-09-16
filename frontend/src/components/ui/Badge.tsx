/** Etiqueta de estado (ej: Firmado / Pendiente). Comunica con color + texto. */
import { cn } from '@/lib/utils';
import type { DocumentStatus } from '@/types';

const styles: Record<DocumentStatus, string> = {
  FIRMADO: 'bg-success-soft text-success',
  SELLADO: 'bg-info-soft text-info',
  PENDIENTE: 'bg-warning-soft text-warning',
  ANULADO: 'bg-muted text-muted-foreground',
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
