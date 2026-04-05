import { WS_EVENTS } from '@tabpilot/shared';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Pencil, User, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { getSocketInstance } from '@/lib/socket';
import { getDiceBearUrl } from '@/lib/utils';
import { useSessionStore } from '@/store/sessionStore';

export function UserAvatarMenu() {
  const { session, participants, participantId, isHost, hostKey } = useSessionStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [emailValue, setEmailValue] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click — must be before any early return
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setEditing(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const currentParticipant = participantId
    ? (participants.find((p) => p.id === participantId) ?? null)
    : null;

  const currentName = isHost ? (session?.hostName ?? '') : (currentParticipant?.name ?? '');
  const currentEmail = isHost ? (session?.hostEmail ?? '') : (currentParticipant?.email ?? '');
  const avatarUrl = isHost ? getDiceBearUrl(currentName) : (currentParticipant?.avatarUrl ?? '');
  const initials = currentName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const startEditing = useCallback(() => {
    setNameValue(currentName);
    setEmailValue(currentEmail);
    setEditing(true);
    // Focus the name input after the edit form mounts
    setTimeout(() => nameInputRef.current?.focus(), 0);
  }, [currentName, currentEmail]);

  // Only render when inside a session
  if (!session || (!participantId && !isHost)) return null;

  function cancelEditing() {
    setEditing(false);
    setNameValue('');
    setEmailValue('');
  }

  function handleSave() {
    const trimmedName = nameValue.trim();
    if (!trimmedName || trimmedName.length > 50) return;

    const socket = getSocketInstance();
    if (!socket) return;

    if (isHost && hostKey && session) {
      socket.emit(WS_EVENTS.UPDATE_HOST_PROFILE, {
        sessionId: session.id,
        hostKey,
        name: trimmedName,
        email: emailValue.trim(),
      });
    } else if (participantId && session) {
      socket.emit(WS_EVENTS.UPDATE_PARTICIPANT_PROFILE, {
        sessionId: session.id,
        participantId,
        name: trimmedName,
        email: emailValue.trim(),
      });
    }

    setEditing(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-950"
        aria-label="Your profile"
      >
        <Avatar className="h-8 w-8 ring-2 ring-zinc-200 dark:ring-zinc-700 hover:ring-indigo-400 dark:hover:ring-indigo-500 transition-all duration-200">
          <AvatarImage src={avatarUrl} alt={currentName} className="object-cover" />
          <AvatarFallback className="text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
            {initials || <User className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-10 z-50 w-72 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl shadow-zinc-200/60 dark:shadow-zinc-950/80 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-zinc-100 dark:border-zinc-800">
              <Avatar className="h-10 w-10 ring-2 ring-indigo-200 dark:ring-indigo-800">
                <AvatarImage src={avatarUrl} alt={currentName} className="object-cover" />
                <AvatarFallback className="text-sm bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                  {initials || <User className="h-5 w-5" />}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {currentName || '—'}
                </p>
                {currentEmail && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                    {currentEmail}
                  </p>
                )}
                <span className="inline-block mt-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400">
                  {isHost ? 'Host' : 'Participant'}
                </span>
              </div>
            </div>

            {/* Body */}
            <div className="p-4">
              {editing ? (
                <div className="space-y-3">
                  <div>
                    <label
                      htmlFor="profile-name"
                      className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1"
                    >
                      Name
                    </label>
                    <input
                      id="profile-name"
                      ref={nameInputRef}
                      type="text"
                      value={nameValue}
                      onChange={(e) => setNameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSave();
                        if (e.key === 'Escape') cancelEditing();
                      }}
                      maxLength={50}
                      placeholder="Your name"
                      className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="profile-email"
                      className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1"
                    >
                      Email <span className="text-zinc-400 font-normal">(optional)</span>
                    </label>
                    <input
                      id="profile-email"
                      type="email"
                      value={emailValue}
                      onChange={(e) => setEmailValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSave();
                        if (e.key === 'Escape') cancelEditing();
                      }}
                      placeholder="you@example.com"
                      className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="glow"
                      className="flex-1 gap-1.5"
                      onClick={handleSave}
                      disabled={!nameValue.trim()}
                    >
                      <Check className="h-3.5 w-3.5" />
                      Save
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={cancelEditing}>
                      <X className="h-3.5 w-3.5" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={startEditing}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit profile
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
