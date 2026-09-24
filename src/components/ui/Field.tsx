import React, { useId } from 'react';
import { cn } from '../../lib/utils';

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  children: (inputProps: { id: string; describedBy: string | undefined; invalid: boolean }) => React.ReactNode;
  className?: string;
}

/** Label + hint + error anatomy shared by every form control. */
export const Field: React.FC<FieldProps> = ({ label, hint, error, children, className }) => {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cn('grid gap-2', className)}>
      <label htmlFor={id} className="text-sm font-bold tracking-tight text-slate-700 dark:text-slate-200">
        {label}
      </label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {error ? (
        <p id={errorId} role="alert" className="text-xs font-semibold text-rose-700 dark:text-rose-300">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
};

const controlBase =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors hover:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600';

const invalidRing = 'border-rose-500 focus:border-rose-600';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, ...props }, ref) => (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(controlBase, invalid && invalidRing, className)}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, invalid, children, ...props }, ref) => (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(controlBase, 'pr-8', invalid && invalidRing, className)}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = 'Select';

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(({ className, invalid, ...props }, ref) => (
  <textarea
    ref={ref}
    aria-invalid={invalid || undefined}
    className={cn(controlBase, 'min-h-24', invalid && invalidRing, className)}
    {...props}
  />
));
Textarea.displayName = 'Textarea';
