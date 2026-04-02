import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { Check, ExternalLink, GripVertical, Loader2, Lock, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useJiraIssue } from '@/hooks/useJiraIssue';
import { useUrlTitle } from '@/hooks/useUrlTitle';
import { formatJiraTitle, parseJiraUrl } from '@/lib/jira';
import { cn, formatUrl, getFaviconUrl, truncateUrl } from '@/lib/utils';

// ─── Title enrichment ─────────────────────────────────────────────────────────

interface UrlTitleProps {
  url: string;
  isCurrent: boolean;
  isPast: boolean;
}

function UrlTitle({ url, isCurrent, isPast }: UrlTitleProps) {
  const { data: jiraIssue, isLoading: jiraLoading } = useJiraIssue(url);
  const { data: pageTitle, isLoading: titleLoading } = useUrlTitle(url);

  const isLoading = jiraLoading || titleLoading;
  const title = jiraIssue
    ? formatJiraTitle(jiraIssue)
    : (pageTitle ?? parseJiraUrl(url)?.key ?? formatUrl(url));

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1.5">
        {isLoading && <Loader2 className="h-3 w-3 animate-spin text-zinc-500 flex-shrink-0" />}
        <p
          className={cn(
            'text-xs font-semibold truncate',
            isCurrent && 'text-indigo-300',
            isPast && 'text-zinc-600 line-through',
            !isCurrent && !isPast && 'text-zinc-500 dark:text-zinc-400',
          )}
        >
          {title}
        </p>
      </div>
      <p
        className={cn(
          'text-xs truncate mt-0.5',
          isCurrent && 'text-zinc-400',
          isPast && 'text-zinc-400 dark:text-zinc-700 line-through',
          !isCurrent && !isPast && 'text-zinc-500 dark:text-zinc-600',
        )}
      >
        {truncateUrl(url, 50)}
      </p>
    </div>
  );
}

// ─── Sortable row ─────────────────────────────────────────────────────────────

interface RowProps {
  id: string;
  url: string;
  index: number;
  currentIndex: number;
  isHost: boolean;
  onJumpTo?: (index: number) => void;
  onDelete?: (index: number) => void;
  isDragOverlay?: boolean;
  savedVote?: string;
}

function UrlRow({
  id,
  url,
  index,
  currentIndex,
  isHost,
  onJumpTo,
  onDelete,
  isDragOverlay,
  savedVote,
}: RowProps) {
  const isCurrent = index === currentIndex;
  const isPast = index < currentIndex;
  const isFuture = index > currentIndex;

  // Completed AND current items are locked — only future items can be reordered.
  // Locking current prevents dragging the ticket being actively discussed.
  const isLocked = !isFuture;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !isHost || isLocked,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isClickable = isHost && !!onJumpTo && !isCurrent;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: dnd-kit requires a div as the drag ref; keyboard accessibility is provided by dnd-kit's own aria layer
    <div
      ref={setNodeRef}
      style={style}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      className={cn(
        'flex items-center gap-3 px-3 py-3 rounded-lg border transition-all duration-150 group relative overflow-hidden',
        isCurrent && 'bg-indigo-500/10 border-indigo-500/50 border-l-2 border-l-indigo-500',
        isPast && 'bg-transparent border-zinc-200/50 dark:border-zinc-800/50 opacity-50',
        isFuture &&
          'bg-transparent border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-100/30 dark:hover:bg-zinc-800/30',
        isHost && !isCurrent && 'cursor-pointer',
        isDragging && 'opacity-40',
        isDragOverlay && 'shadow-xl opacity-100 cursor-grabbing',
      )}
      onClick={() => {
        if (isClickable) onJumpTo(index);
      }}
      onKeyDown={(e) => {
        if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onJumpTo(index);
        }
      }}
    >
      {isCurrent && (
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent pointer-events-none" />
      )}

      {/* Drag handle or lock indicator — host only */}
      {isHost &&
        (isLocked ? (
          // Completed rows show a lock — not draggable
          <span className="flex-shrink-0 p-0.5 text-zinc-600 dark:text-zinc-700" aria-hidden="true">
            <Lock className="h-3 w-3" />
          </span>
        ) : (
          <button
            type="button"
            className={cn(
              'flex-shrink-0 p-0.5 rounded text-zinc-500 dark:text-zinc-600 cursor-grab active:cursor-grabbing',
              'opacity-0 group-hover:opacity-100 transition-opacity',
              isDragOverlay && 'opacity-100',
            )}
            aria-label="Drag to reorder"
            onClick={(e) => e.stopPropagation()}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        ))}

      {/* Index badge */}
      <span
        className={cn(
          'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
          isCurrent && 'bg-indigo-500 text-white',
          isPast && 'bg-zinc-300 dark:bg-zinc-700 text-zinc-500',
          isFuture && 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500',
        )}
      >
        {isPast ? <Check className="h-3 w-3" /> : index + 1}
      </span>

      {/* Favicon */}
      <img
        src={getFaviconUrl(url)}
        alt=""
        aria-hidden="true"
        className={cn('w-4 h-4 flex-shrink-0 rounded-sm', isPast && 'grayscale opacity-50')}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />

      {/* Title */}
      <UrlTitle url={url} isCurrent={isCurrent} isPast={isPast} />

      {/* Current badge */}
      {isCurrent && (
        <span className="flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
          Current
        </span>
      )}

      {/* Saved average vote badge for past tickets */}
      {isPast && savedVote !== undefined && (
        <span
          className="flex-shrink-0 min-w-[28px] h-6 px-1.5 flex items-center justify-center rounded-md bg-zinc-700/60 text-zinc-300 text-xs font-bold border border-zinc-600/50"
          title={`Average vote: ${savedVote}`}
        >
          {savedVote}
        </span>
      )}

      {/* Action buttons (host only) */}
      {isHost && (
        // biome-ignore lint/a11y/noStaticElementInteractions: stopPropagation wrapper only, not an interactive control
        <div
          role="presentation"
          className="flex items-center gap-1 flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Open link */}
          {isFuture && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 rounded text-zinc-500 dark:text-zinc-600 hover:text-zinc-700 dark:hover:text-zinc-300 opacity-0 group-hover:opacity-100 transition-all"
              aria-label="Open URL"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          {/* Delete */}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(index)}
              className="p-1 rounded text-zinc-500 dark:text-zinc-600 hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all"
              aria-label="Remove URL"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── UrlQueue ─────────────────────────────────────────────────────────────────

export interface UrlQueueProps {
  urls: string[];
  currentIndex: number;
  isHost?: boolean;
  onJumpTo?: (index: number) => void;
  onDelete?: (index: number) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
  className?: string;
  /** Average vote per URL index — shown as a badge on past tickets */
  savedVotes?: Record<number, string>;
}

export function UrlQueue({
  urls,
  currentIndex,
  isHost = false,
  onJumpTo,
  onDelete,
  onReorder,
  className,
  savedVotes,
}: UrlQueueProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  // Optimistic local copy — updated immediately on drop so there's no
  // visual snap-back while we wait for the server round-trip.
  const [localUrls, setLocalUrls] = useState(urls);

  // Keep in sync when the authoritative prop changes (server confirms reorder,
  // URL added/removed, etc.).
  useEffect(() => {
    setLocalUrls(urls);
  }, [urls]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  // Stable IDs for dnd-kit: use URL + index to handle duplicate URLs
  const items = localUrls.map((url, i) => `${i}:${url}`);

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const fromIndex = items.indexOf(active.id as string);
    const toIndex = items.indexOf(over.id as string);

    // Only allow moves strictly within the future zone.
    if (fromIndex === -1 || toIndex === -1) return;
    if (fromIndex <= currentIndex || toIndex <= currentIndex) return;

    // Apply optimistically so the list settles immediately — no snap-back.
    const reordered = [...localUrls];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    setLocalUrls(reordered);

    onReorder?.(fromIndex, toIndex);
  }

  const activeUrl = activeId ? localUrls[items.indexOf(activeId)] : null;
  const activeIndex = activeId ? items.indexOf(activeId) : -1;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div className={cn('flex flex-col gap-1', className)}>
          {items.map((id, index) => (
            // Key by URL (not index-based id) so React reuses the DOM node
            // when items reorder, preventing the entry animation from replaying.
            <motion.div
              key={localUrls[index]}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.18 }}
            >
              <UrlRow
                id={id}
                url={localUrls[index]}
                index={index}
                currentIndex={currentIndex}
                isHost={isHost}
                onJumpTo={onJumpTo}
                onDelete={onDelete}
                savedVote={savedVotes?.[index]}
              />
            </motion.div>
          ))}
        </div>
      </SortableContext>

      {/* Ghost row while dragging */}
      <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
        {activeUrl !== null && activeIndex !== -1 ? (
          <UrlRow
            // biome-ignore lint/style/noNonNullAssertion: guarded by activeUrl !== null && activeIndex !== -1 above
            id={activeId!}
            url={activeUrl}
            index={activeIndex}
            currentIndex={currentIndex}
            isHost={isHost}
            isDragOverlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
