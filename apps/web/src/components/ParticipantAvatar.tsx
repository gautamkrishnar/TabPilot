import type { Participant } from '@tabpilot/shared';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ParticipantAvatarProps {
  participant: Participant;
  size?: 'sm' | 'md' | 'lg';
  showOnlineIndicator?: boolean;
  showTooltip?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { container: 'h-8 w-8', text: 'text-xs', dot: 'h-2 w-2' },
  md: { container: 'h-10 w-10', text: 'text-sm', dot: 'h-2.5 w-2.5' },
  lg: { container: 'h-14 w-14', text: 'text-base', dot: 'h-3 w-3' },
};

export function ParticipantAvatar({
  participant,
  size = 'md',
  showOnlineIndicator = true,
  showTooltip = true,
  className,
}: ParticipantAvatarProps) {
  const { container, text, dot } = sizeMap[size];
  const initials = participant.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const avatarEl = (
    <div className={cn('relative inline-flex', className)}>
      <Avatar
        className={cn(
          container,
          'ring-2 ring-zinc-200 dark:ring-zinc-800 transition-all duration-200',
          participant.isOnline && 'ring-green-500/30',
        )}
      >
        <AvatarImage src={participant.avatarUrl} alt={participant.name} className="object-cover" />
        <AvatarFallback className={cn(text)}>{initials}</AvatarFallback>
      </Avatar>

      {showOnlineIndicator && (
        <span
          className={cn(
            'absolute bottom-0 right-0 block rounded-full ring-2 ring-white dark:ring-zinc-900',
            dot,
            participant.isOnline ? 'bg-green-500' : 'bg-zinc-600',
          )}
        >
          {participant.isOnline && (
            <span
              className={cn('absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75')}
            />
          )}
        </span>
      )}
    </div>
  );

  if (!showTooltip) return avatarEl;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-default">{avatarEl}</div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{participant.name}</p>
          {participant.email && <p className="text-zinc-400 text-xs">{participant.email}</p>}
          <p
            className={cn(
              'text-xs mt-0.5',
              participant.isOnline ? 'text-green-400' : 'text-zinc-500',
            )}
          >
            {participant.isOnline ? 'Online' : 'Offline'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
