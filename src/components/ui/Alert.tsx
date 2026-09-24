import React, { useId } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '../../lib/utils';

const toneClasses: Record<string, string> = {
  info: 'border-[var(--app-info)]/30 bg-[var(--app-info)]/10 text-slate-800 dark:text-slate-200',
  success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100',
  warning: 'border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100',
  danger: 'border-[var(--app-danger)]/30 bg-[var(--app-danger)]/10 text-rose-900 dark:text-rose-100',
};

const icons = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: AlertCircle,
} as const;

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: keyof typeof icons;
  title?: string;
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, tone = 'info', title, children, role, ...props }, ref) => {
    const id = useId();
    const Icon = icons[tone];
    const live = role ?? (tone === 'danger' ? 'alert' : 'status');
    return (
      <div
        ref={ref}
        role={live}
        aria-labelledby={title ? `${id}-title` : undefined}
        className={cn('flex items-start gap-3 rounded-xl border px-4 py-3 text-sm', toneClasses[tone], className)}
        {...props}
      >
        <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          {title && (
            <p id={`${id}-title`} className="font-bold leading-snug">
              {title}
            </p>
          )}
          <div className="leading-relaxed">{children}</div>
        </div>
      </div>
    );
  },
);
Alert.displayName = 'Alert';
