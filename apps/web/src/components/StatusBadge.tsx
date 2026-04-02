import type { SessionState } from '@tabpilot/shared';
import { CheckCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  state: SessionState;
  className?: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ state, className, size = 'md' }: StatusBadgeProps) {
  const isSmall = size === 'sm';

  if (state === 'waiting') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 font-semibold rounded-full',
          'bg-amber-500/15 text-amber-400 border border-amber-500/30',
          isSmall ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-xs',
          className,
        )}
      >
        <Clock className={isSmall ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
        Waiting
      </span>
    );
  }

  if (state === 'active') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 font-semibold rounded-full',
          'bg-red-500/15 text-red-400 border border-red-500/30',
          isSmall ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-xs',
          className,
        )}
      >
        {/* Pulsing red dot */}
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
        </span>
        Live
      </span>
    );
  }

  if (state === 'ended') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 font-semibold rounded-full',
          'bg-zinc-200/50 dark:bg-zinc-700/50 text-zinc-500 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-700',
          isSmall ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-xs',
          className,
        )}
      >
        <CheckCircle className={isSmall ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
        Ended
      </span>
    );
  }

  return null;
}
