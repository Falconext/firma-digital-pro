/** Etiqueta de estado de una cotización. */
import { cn } from '@/lib/utils';
import type { EstadoCotizacion } from '@/types';

const styles: Record<EstadoCotizacion, string> = {
  BORRADOR: 'bg-muted text-muted-foreground',
  ENVIADA: 'bg-info-soft text-info',
  ACEPTADA: 'bg-success-soft text-success',
  RECHAZADA: 'bg-destructive-soft text-destructive',
  VENCIDA: 'bg-warning-soft text-warning',
  ANULADA: 'bg-muted text-muted-foreground line-through',
};

export const QUOTATION_LABELS: Record<EstadoCotizacion, string> = {
  BORRADOR: 'Borrador',
  ENVIADA: 'Enviada',
  ACEPTADA: 'Aceptada',
  RECHAZADA: 'Rechazada',
  VENCIDA: 'Vencida',
  ANULADA: 'Anulada',
};

export function QuotationBadge({ estado }: { estado: EstadoCotizacion }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        styles[estado],
      )}
    >
      {QUOTATION_LABELS[estado]}
    </span>
  );
}
