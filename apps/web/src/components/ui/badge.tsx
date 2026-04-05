import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'indigo';
}

function Badge({ className, variant = 'default', ...props }: Readonly<BadgeProps>) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        'transition-colors duration-150',

        variant === 'default' &&
          'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700',

        variant === 'secondary' &&
          'bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200',

        variant === 'destructive' &&
          'bg-red-500/20 text-red-400 border border-red-500/30',

        variant === 'outline' &&
          'border border-zinc-300 dark:border-zinc-600 text-zinc-500 dark:text-zinc-400 bg-transparent',

        variant === 'success' &&
          'bg-green-500/20 text-green-400 border border-green-500/30',

        variant === 'warning' &&
          'bg-amber-500/20 text-amber-400 border border-amber-500/30',

        variant === 'indigo' &&
          'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30',

        className
      )}
      {...props}
    />
  );
}

export { Badge };
