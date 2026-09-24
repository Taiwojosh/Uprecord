import React from 'react';
import { cn } from '../../lib/utils';

const base =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer select-none';

const variantClasses: Record<string, string> = {
  default:
    'bg-[var(--app-primary)] text-[var(--app-on-primary)] hover:bg-[var(--app-primary-hover)]',
  secondary:
    'bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700',
  outline:
    'border border-[var(--app-border-strong)] bg-transparent text-slate-900 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800',
  ghost:
    'bg-transparent text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
  destructive:
    'bg-[var(--app-danger)] text-white hover:bg-[var(--app-danger-hover)]',
  school: 'text-[var(--brand-on-primary)] hover:brightness-95',
  link: 'text-[var(--app-info)] underline-offset-4 hover:underline h-auto px-0 py-0',
};

const sizeClasses: Record<string, string> = {
  sm: 'h-9 px-3 text-xs',
  default: 'h-11 px-5',
  lg: 'h-12 px-6 text-base',
  icon: 'h-10 w-10',
};

export type ButtonVariant = keyof typeof variantClasses;
export type ButtonSize = keyof typeof sizeClasses;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'default',
      size = 'default',
      loading = false,
      disabled,
      type = 'button',
      children,
      style,
      ...props
    },
    ref,
  ) => {
    const schoolStyle: React.CSSProperties | undefined =
      variant === 'school' ? { backgroundColor: 'var(--brand-primary)', ...style } : style;
    return (
      <button
        ref={ref}
        type={type}
        className={cn(base, variantClasses[variant], sizeClasses[size], className)}
        style={schoolStyle}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && (
          <span
            aria-hidden="true"
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        )}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';
