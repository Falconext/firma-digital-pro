/**
 * Campo de texto con etiqueta, ícono opcional y mensaje de error.
 * Buenas prácticas de formularios: etiqueta SIEMPRE visible y error junto al campo.
 */
import { InputHTMLAttributes, forwardRef, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className, id, ...props }, ref) => {
    const inputId = id || props.name;
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {icon}
            </span>
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              'h-11 w-full rounded-xl border bg-surface px-3 text-sm text-foreground',
              'placeholder:text-muted-foreground',
              'transition-colors focus:border-primary',
              icon && 'pl-10',
              error ? 'border-destructive' : 'border-border',
              className,
            )}
            aria-invalid={!!error}
            {...props}
          />
        </div>
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>
    );
  },
);
Input.displayName = 'Input';
