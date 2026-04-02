import type { Participant } from '@tabpilot/shared';
import { AnimatePresence, motion } from 'framer-motion';
import { Users, UserX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ParticipantAvatar } from './ParticipantAvatar';

interface ParticipantItemProps {
  participant: Participant;
  onKick?: (participantId: string) => void;
  hasVoted?: boolean;
  revealedVote?: string;
}

function ParticipantItem({ participant, onKick, hasVoted, revealedVote }: ParticipantItemProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg group',
        'hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60 transition-colors duration-150',
        'cursor-default',
      )}
    >
      <ParticipantAvatar participant={participant} size="sm" showTooltip={false} />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
          {participant.name}
        </p>
        {participant.email && <p className="text-xs text-zinc-500 truncate">{participant.email}</p>}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Revealed vote badge */}
        {revealedVote !== undefined ? (
          <motion.span
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="min-w-[28px] h-7 px-1.5 flex items-center justify-center rounded-lg bg-indigo-500 text-white text-xs font-bold shadow-glow-indigo"
          >
            {revealedVote}
          </motion.span>
        ) : hasVoted ? (
          /* Voted indicator — shows they've voted but hides the value */
          <motion.span
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="h-5 w-5 flex items-center justify-center rounded-full bg-green-500/20 border border-green-500/40"
            title="Voted"
          >
            <span className="h-2 w-2 rounded-full bg-green-500" />
          </motion.span>
        ) : /* Online indicator */
        participant.isOnline ? (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
        ) : (
          <span className="h-2 w-2 rounded-full bg-zinc-600" />
        )}

        {/* Kick button — host only, appears on hover */}
        {onKick && (
          <button
            type="button"
            onClick={() => onKick(participant.id)}
            className={cn(
              'p-1 rounded text-zinc-500 dark:text-zinc-600',
              'hover:text-red-400 hover:bg-red-400/10',
              'opacity-0 group-hover:opacity-100 transition-all duration-150',
            )}
            aria-label={`Remove ${participant.name} from session`}
            title={`Remove ${participant.name}`}
          >
            <UserX className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

interface ParticipantListProps {
  participants: Participant[];
  onKick?: (participantId: string) => void;
  className?: string;
  /** IDs of participants who have voted this round (value hidden until revealed) */
  votedParticipantIds?: string[];
  /** Revealed vote values keyed by participant ID */
  revealedVotes?: Record<string, string> | null;
}

export function ParticipantList({
  participants,
  onKick,
  className,
  votedParticipantIds,
  revealedVotes,
}: ParticipantListProps) {
  const online = participants.filter((p) => p.isOnline);
  const offline = participants.filter((p) => !p.isOnline);

  const votedSet = new Set(votedParticipantIds ?? []);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
        <Users className="h-4 w-4 text-zinc-400" />
        <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Participants</span>
        <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
          {participants.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 py-2 space-y-4">
        {/* Online */}
        {online.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 px-3 mb-1">
              Online — {online.length}
            </p>
            <AnimatePresence mode="popLayout">
              {online.map((p) => (
                <ParticipantItem
                  key={p.id}
                  participant={p}
                  onKick={onKick}
                  hasVoted={votedSet.has(p.id)}
                  revealedVote={revealedVotes?.[p.id]}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Offline */}
        {offline.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-600 px-3 mb-1">
              Offline — {offline.length}
            </p>
            <AnimatePresence mode="popLayout">
              {offline.map((p) => (
                <ParticipantItem
                  key={p.id}
                  participant={p}
                  onKick={onKick}
                  hasVoted={votedSet.has(p.id)}
                  revealedVote={revealedVotes?.[p.id]}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Empty state */}
        {participants.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <div className="h-12 w-12 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
              <Users className="h-6 w-6 text-zinc-500 dark:text-zinc-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500">No participants yet</p>
              <p className="text-xs text-zinc-600 mt-0.5">
                Share the join code to invite your team
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
