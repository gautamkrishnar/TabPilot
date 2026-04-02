import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NavigationControlsProps {
  currentIndex: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
  disabled?: boolean;
  className?: string;
}

export function NavigationControls({
  currentIndex,
  total,
  onPrevious,
  onNext,
  disabled = false,
  className,
}: NavigationControlsProps) {
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === total - 1;
  const progress = total > 0 ? ((currentIndex + 1) / total) * 100 : 0;

  return (
    <div
      className={cn(
        'flex flex-col gap-3 px-4 py-4',
        'border-t border-zinc-200 dark:border-zinc-800',
        'bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm',
        className,
      )}
    >
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-zinc-500 font-medium w-12 flex-shrink-0">
          {currentIndex + 1} / {total}
        </span>
        <div className="flex-1 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs text-zinc-500 font-medium w-12 text-right flex-shrink-0">
          {Math.round(progress)}%
        </span>
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          className={cn(
            'flex-1 h-11 gap-2 border-zinc-300 dark:border-zinc-700',
            'hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800',
            'disabled:opacity-30',
          )}
          onClick={onPrevious}
          disabled={disabled || isFirst}
        >
          <ChevronLeft className="h-5 w-5" />
          Previous
        </Button>

        <div className="flex-shrink-0 text-center px-4">
          <div className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
            Ticket {currentIndex + 1}
          </div>
          <div className="text-xs text-zinc-500">of {total}</div>
        </div>

        <Button
          variant="glow"
          className={cn('flex-1 h-11 gap-2', 'disabled:opacity-30 disabled:shadow-none')}
          onClick={onNext}
          disabled={disabled || isLast}
        >
          Next
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
