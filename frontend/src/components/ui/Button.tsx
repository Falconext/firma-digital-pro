/**
 * Botón reutilizable con variantes de estilo.
 * Centralizar el botón asegura que TODOS los botones se vean igual.
 */
import { ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'accent' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-hover shadow-soft',
  // Lima del logo con texto petróleo: la acción "positiva" (firmar, confirmar)
  accent: 'bg-accent text-accent-foreground hover:bg-accent-hover shadow-soft',
  outline: 'border border-border bg-surface text-primary hover:border-primary/40 hover:bg-primary-soft',
  ghost: 'text-foreground hover:bg-muted',
  danger: 'bg-destructive text-white hover:bg-destructive-hover shadow-soft',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, className, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold',
        'transition-all duration-200 cursor-pointer active:scale-[0.98]',
        'disabled:opacity-60 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';
