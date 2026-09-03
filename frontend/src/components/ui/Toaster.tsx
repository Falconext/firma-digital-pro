/** Muestra las notificaciones flotantes (toasts) del store de UI. */
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { useUIStore, type ToastType } from '@/stores/ui.store';
import { cn } from '@/lib/utils';

const config: Record<ToastType, { icon: typeof Info; color: string }> = {
  success: { icon: CheckCircle2, color: 'text-accent' },
  error: { icon: XCircle, color: 'text-destructive' },
  info: { icon: Info, color: 'text-primary' },
};

export function Toaster() {
  const { toasts, dismiss } = useUIStore();
  return (
    <div className="fixed bottom-5 right-5 z-[60] flex w-full max-w-sm flex-col gap-2">
      {toasts.map((t) => {
        const { icon: Icon, color } = config[t.type];
        return (
          <div
            key={t.id}
            role="status"
            className="flex animate-fade-in-up items-start gap-3 rounded-xl border border-border bg-surface p-4 shadow-soft-lg"
          >
            <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', color)} />
            <p className="flex-1 text-sm text-foreground">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Cerrar notificación"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
