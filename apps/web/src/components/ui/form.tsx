/**
 * Formik-compatible Form primitives that follow shadcn/ui conventions.
 *
 * Key design decision: <FormMessage> always renders (even when empty) so
 * that the reserved vertical space prevents layout shift when an error appears.
 */
import { type HTMLAttributes, type LabelHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

// ─── FormItem ─────────────────────────────────────────────────────────────────
// Wrapper that groups label + control + message with consistent spacing.

export const FormItem = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('space-y-1.5', className)} {...props} />
  ),
);
FormItem.displayName = 'FormItem';

// ─── FormLabel ────────────────────────────────────────────────────────────────

export const FormLabel = forwardRef<HTMLLabelElement, LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn('text-sm font-medium leading-none text-zinc-700 dark:text-zinc-300', className)}
      {...props}
    />
  ),
);
FormLabel.displayName = 'FormLabel';

// ─── FormMessage ──────────────────────────────────────────────────────────────
// Always rendered — uses min-h so layout never shifts when an error appears.

interface FormMessageProps extends HTMLAttributes<HTMLParagraphElement> {
  /** Pass undefined / empty string to show no error but keep the reserved space. */
  message?: string;
}

export function FormMessage({ message, className, ...props }: FormMessageProps) {
  return (
    <p
      className={cn(
        'min-h-[1.125rem] text-xs font-medium text-red-400 transition-opacity duration-150',
        !message && 'opacity-0 select-none',
        className,
      )}
      aria-live="polite"
      {...props}
    >
      {/* Non-breaking space ensures the line-box doesn't collapse to zero height */}
      {message || '\u00A0'}
    </p>
  );
}

// ─── FormDescription ──────────────────────────────────────────────────────────
// Optional helper text shown below the control (replaces the error slot).

export function FormDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-xs text-zinc-500', className)} {...props} />
  );
}
