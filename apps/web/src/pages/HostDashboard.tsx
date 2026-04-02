import { WS_EVENTS } from '@tabpilot/shared';
import confetti from 'canvas-confetti';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Copy,
  ExternalLink,
  Eye,
  Link2,
  Lock,
  LockOpen,
  Play,
  Plus,
  Power,
  Users,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { JoinCodeDisplay } from '@/components/JoinCodeDisplay';
import { NavigationControls } from '@/components/NavigationControls';
import { ParticipantList } from '@/components/ParticipantList';
import { StatusBadge } from '@/components/StatusBadge';
import { UrlQueue } from '@/components/UrlQueue';
import { UserAvatarMenu } from '@/components/UserAvatarMenu';
import { Button } from '@/components/ui/button';
import { useJiraIssue } from '@/hooks/useJiraIssue';
import { useSocket } from '@/hooks/useSocket';
import { useUrlTitle } from '@/hooks/useUrlTitle';
import { formatJiraTitle, parseJiraUrl } from '@/lib/jira';
import { getSocket } from '@/lib/socket';
import { cn, formatUrl, getFaviconUrl, truncateUrl } from '@/lib/utils';
import { useSessionStore } from '@/store/sessionStore';

export function HostDashboard() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [showShareModal, setShowShareModal] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [showMobileParticipants, setShowMobileParticipants] = useState(false);
  const [isGroomingComplete, setIsGroomingComplete] = useState(false);

  const {
    session,
    participants,
    hostKey,
    setIsHost,
    setHostKey,
    loadHostKey,
    reset,
    votedParticipantIds,
    revealedVotes,
    savedVotesMap,
  } = useSessionStore();

  // Ref guard: React StrictMode double-invokes effects in dev, which would
  // show the "Host key not found" toast twice before navigation completes.
  // The ref persists across StrictMode's intermediate unmount, so this runs once.
  const checkedRef = useRef(false);

  useEffect(() => {
    if (!sessionId || checkedRef.current) return;
    checkedRef.current = true;

    const storedHostKey = loadHostKey(sessionId);
    if (storedHostKey) {
      setHostKey(storedHostKey);
      setIsHost(true);
    } else {
      toast.error('Host key not found. Did you create this session?');
      navigate('/');
    }
  }, [sessionId, setIsHost, setHostKey, navigate, loadHostKey]);

  const { isConnected } = useSocket({
    sessionId,
    hostKey: hostKey || undefined,
  });

  // Update page title
  useEffect(() => {
    const prev = document.title;
    document.title = session ? `Tab Pilot — ${session.name}` : 'Tab Pilot';
    return () => {
      document.title = prev;
    };
  }, [session?.name, session]);

  const handleRevealVotes = useCallback(() => {
    if (!sessionId || !hostKey) return;
    const socket = getSocket();
    socket.emit(WS_EVENTS.HOST_REVEAL_VOTES, { sessionId, hostKey });
  }, [sessionId, hostKey]);

  const handleStartSession = useCallback(() => {
    if (!sessionId || !hostKey) return;
    const socket = getSocket();
    socket.emit(WS_EVENTS.HOST_START_SESSION, { sessionId, hostKey });
  }, [sessionId, hostKey]);

  const handleNavigate = useCallback(
    (direction: 'next' | 'prev') => {
      if (!sessionId || !hostKey) return;
      if (direction === 'prev') setIsGroomingComplete(false);
      const socket = getSocket();
      socket.emit(WS_EVENTS.HOST_NAVIGATE, { sessionId, hostKey, direction });
    },
    [sessionId, hostKey],
  );

  const handleComplete = useCallback(() => {
    setIsGroomingComplete(true);
    confetti({
      particleCount: 160,
      spread: 80,
      origin: { y: 0.7 },
      colors: ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'],
    });
  }, []);

  const handleJumpTo = useCallback(
    (index: number) => {
      if (!sessionId || !hostKey) return;
      const socket = getSocket();
      socket.emit(WS_EVENTS.HOST_NAVIGATE, { sessionId, hostKey, index });
    },
    [sessionId, hostKey],
  );

  const handleToggleLock = useCallback(() => {
    if (!sessionId || !hostKey || !session) return;
    const locked = !session.isLocked;
    const socket = getSocket();
    socket.emit(WS_EVENTS.HOST_TOGGLE_LOCK, { sessionId, hostKey, locked });
    toast(locked ? 'Session locked — no new participants can join.' : 'Session unlocked.', {
      icon: locked ? '🔒' : '🔓',
      duration: 3000,
    });
  }, [sessionId, hostKey, session]);

  const handleKickParticipant = useCallback(
    (participantId: string) => {
      if (!sessionId || !hostKey) return;
      const socket = getSocket();
      socket.emit(WS_EVENTS.HOST_KICK_PARTICIPANT, { sessionId, hostKey, participantId });
      toast(`Participant removed.`, { icon: '🚫', duration: 3000 });
    },
    [sessionId, hostKey],
  );

  const handleDeleteUrl = useCallback(
    (index: number) => {
      if (!sessionId || !hostKey) return;
      const socket = getSocket();
      socket.emit(WS_EVENTS.HOST_REMOVE_URL, { sessionId, hostKey, index });
    },
    [sessionId, hostKey],
  );

  const handleReorderUrls = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (!sessionId || !hostKey) return;
      const socket = getSocket();
      socket.emit(WS_EVENTS.HOST_REORDER_URLS, { sessionId, hostKey, fromIndex, toIndex });
    },
    [sessionId, hostKey],
  );

  const handleAddUrl = useCallback(() => {
    const trimmed = newUrl.trim();
    if (!trimmed || !sessionId || !hostKey) return;
    try {
      const parsed = new URL(trimmed);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
    } catch {
      toast.error('Please enter a valid http/https URL');
      return;
    }
    const socket = getSocket();
    socket.emit(WS_EVENTS.HOST_ADD_URL, { sessionId, hostKey, url: trimmed });
    setNewUrl('');
  }, [newUrl, sessionId, hostKey]);

  const handleEndSession = useCallback(() => {
    if (!sessionId || !hostKey) return;
    if (!confirm('Are you sure you want to end this session?')) return;
    const socket = getSocket();
    socket.emit(WS_EVENTS.HOST_END_SESSION, { sessionId, hostKey });
    reset();
    navigate('/');
  }, [sessionId, hostKey, navigate, reset]);

  const currentUrl = session?.urls[session.currentIndex];
  const onlineCount = participants.filter((p) => p.isOnline).length;

  // Enrich current URL — Jira first, then generic page title, then domain
  const { data: currentJiraIssue } = useJiraIssue(currentUrl ?? '');
  const { data: currentPageTitle } = useUrlTitle(currentUrl ?? '');
  const currentTitle = currentUrl
    ? currentJiraIssue
      ? formatJiraTitle(currentJiraIssue)
      : (currentPageTitle ?? parseJiraUrl(currentUrl)?.key ?? formatUrl(currentUrl))
    : '';

  if (!session) {
    return (
      <div className="h-screen flex items-center justify-center bg-white dark:bg-zinc-950">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-zinc-400 text-sm">Loading session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden">
      {/* Top bar */}
      <header className="flex-shrink-0 border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-sm z-10">
        {/* Row 1: logo + session name + status + avatar */}
        <div className="flex items-center gap-2.5 px-4 h-14 sm:h-16">
          <a href="/" aria-label="Tab Pilot home">
            <img
              src="/logo.svg"
              alt="Tab Pilot logo"
              width={28}
              height={28}
              className="rounded-md flex-shrink-0"
            />
          </a>
          <h1 className="font-semibold text-zinc-900 dark:text-zinc-100 truncate text-sm flex-1 min-w-0">
            {session.name}
          </h1>
          <StatusBadge state={session.state} size="sm" />

          {/* Desktop-only controls (inline with title row) */}
          <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors text-sm font-mono"
              onClick={() => setShowShareModal(true)}
              title="Share session"
            >
              <span className="text-zinc-500 text-xs">Code:</span>
              <span className="text-zinc-800 dark:text-zinc-200 font-bold tracking-widest">
                {session.joinCode}
              </span>
              <Copy className="h-3.5 w-3.5 text-zinc-500" />
            </button>

            <button
              type="button"
              onClick={() => setShowMobileParticipants(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
            >
              <Users className="h-4 w-4 text-zinc-400" />
              <span className="text-zinc-700 dark:text-zinc-300 font-medium">{onlineCount}</span>
              <span className="text-zinc-600">/{participants.length}</span>
            </button>

            <div
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium',
                isConnected ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400',
              )}
            >
              {isConnected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
              <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>

            {session.votingEnabled && votedParticipantIds.length > 0 && !revealedVotes && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRevealVotes}
                className="gap-1.5 border-indigo-500/50 text-indigo-400 hover:bg-indigo-500/10"
              >
                <Eye className="h-4 w-4" />
                Reveal ({votedParticipantIds.length})
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleLock}
              className={cn(
                'gap-1.5',
                session.isLocked
                  ? 'border-amber-500/50 text-amber-400 hover:bg-amber-500/10 dark:border-amber-500/50'
                  : 'border-zinc-300 dark:border-zinc-700',
              )}
              title={session.isLocked ? 'Unlock session' : 'Lock session'}
            >
              {session.isLocked ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
              {session.isLocked ? 'Locked' : 'Lock'}
            </Button>

            <Button variant="destructive" size="sm" onClick={handleEndSession} className="gap-1.5">
              <Power className="h-4 w-4" />
              End
            </Button>
          </div>

          <UserAvatarMenu />
        </div>

        {/* Row 2: mobile-only action bar */}
        <div className="sm:hidden flex items-center gap-2 px-4 pb-3">
          <button
            type="button"
            onClick={() => setShowMobileParticipants(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
          >
            <Users className="h-4 w-4 text-zinc-400" />
            <span className="text-zinc-700 dark:text-zinc-300 font-medium">{onlineCount}</span>
            <span className="text-zinc-500">/{participants.length}</span>
          </button>

          <div
            className={cn(
              'flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium',
              isConnected ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400',
            )}
          >
            {isConnected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          </div>

          {session.votingEnabled && votedParticipantIds.length > 0 && !revealedVotes && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRevealVotes}
              className="gap-1.5 border-indigo-500/50 text-indigo-400 hover:bg-indigo-500/10"
            >
              <Eye className="h-4 w-4" />
              Reveal ({votedParticipantIds.length})
            </Button>
          )}

          <div className="flex-1" />

          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleLock}
            className={cn(
              session.isLocked
                ? 'border-amber-500/50 text-amber-400 hover:bg-amber-500/10'
                : 'border-zinc-300 dark:border-zinc-700',
            )}
            title={session.isLocked ? 'Unlock session' : 'Lock session'}
          >
            {session.isLocked ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
          </Button>

          <Button variant="destructive" size="sm" onClick={handleEndSession}>
            <Power className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar — hidden on mobile, always visible on desktop */}
        <aside className="hidden md:flex w-64 xl:w-72 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 overflow-hidden flex-col bg-white dark:bg-zinc-950">
          <ParticipantList
            participants={participants}
            onKick={handleKickParticipant}
            className="flex-1"
            session={session}
            votedParticipantIds={session.votingEnabled ? votedParticipantIds : undefined}
            revealedVotes={session.votingEnabled ? revealedVotes : undefined}
          />
        </aside>

        {/* Center content — full width on mobile */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Current URL display */}
          {currentUrl && session.state === 'active' && (
            <div className="flex-shrink-0 px-6 pt-5 pb-4 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <img
                  src={getFaviconUrl(currentUrl)}
                  alt=""
                  className="w-8 h-8 rounded-lg flex-shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-indigo-400 mb-0.5">
                    Current ticket — {session.currentIndex + 1} of {session.urls.length}
                  </p>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {currentTitle}
                  </p>
                  <p className="text-xs text-zinc-500 truncate mt-0.5">
                    {truncateUrl(currentUrl, 70)}
                  </p>
                </div>
                <a
                  href={currentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 border-zinc-300 dark:border-zinc-700"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open
                  </Button>
                </a>
              </div>

              {/* Revealed votes panel */}
              {session.votingEnabled && revealedVotes && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-3 p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/20"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                      Votes Revealed
                    </p>
                    {Object.keys(revealedVotes).length > 0 &&
                      (() => {
                        const nums = Object.values(revealedVotes)
                          .map(Number)
                          .filter((n) => !Number.isNaN(n));
                        const avg =
                          nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
                        return avg !== null ? (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            avg {avg % 1 === 0 ? avg : avg.toFixed(1)}
                          </span>
                        ) : null;
                      })()}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(revealedVotes).map(([pid, val]) => {
                      const participant = participants.find((p) => p.id === pid);
                      return (
                        <div
                          key={pid}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30"
                        >
                          <span className="text-xs text-zinc-400">
                            {participant?.name || 'Unknown'}:
                          </span>
                          <span className="text-xs font-bold text-indigo-300">{val}</span>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* URL Queue */}
          <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-4">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Ticket Queue
              </h2>
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-500">
                {session.urls.length}
              </span>
            </div>
            <UrlQueue
              urls={session.urls}
              currentIndex={session.currentIndex}
              isHost={true}
              onJumpTo={handleJumpTo}
              onDelete={handleDeleteUrl}
              onReorder={handleReorderUrls}
              savedVotes={session.votingEnabled ? savedVotesMap : undefined}
            />

            {/* Add URL input */}
            <div className="flex items-center gap-2 mt-3 px-1">
              <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus-within:border-indigo-500 transition-colors">
                <Link2 className="h-3.5 w-3.5 text-zinc-400 flex-shrink-0" />
                <input
                  type="url"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddUrl();
                    }
                  }}
                  placeholder="Paste a URL and press Enter to add…"
                  className="flex-1 bg-transparent text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none min-w-0"
                />
                {newUrl.trim() && (
                  <button
                    type="button"
                    onClick={handleAddUrl}
                    className="flex-shrink-0 p-0.5 rounded text-indigo-400 hover:text-indigo-300 transition-colors"
                    aria-label="Add URL"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Navigation controls */}
          {session.state === 'active' && (
            <NavigationControls
              currentIndex={session.currentIndex}
              total={session.urls.length}
              onPrevious={() => handleNavigate('prev')}
              onNext={() => handleNavigate('next')}
              onComplete={handleComplete}
              completed={isGroomingComplete}
              disabled={!isConnected}
            />
          )}
        </main>
      </div>

      {/* "Start Session" overlay when waiting */}
      <AnimatePresence>
        {session.state === 'waiting' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm z-20"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="glass-card rounded-3xl p-10 max-w-sm w-full mx-4 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-6 shadow-glow-indigo">
                <Play className="h-8 w-8 text-white ml-0.5" />
              </div>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                Ready to start?
              </h2>
              <p className="text-zinc-400 text-sm mb-3 leading-relaxed">
                {participants.length > 0
                  ? `${onlineCount} participant${onlineCount !== 1 ? 's' : ''} online and waiting.`
                  : 'Waiting for participants to join...'}
              </p>

              <div className="flex justify-center mb-6">
                <JoinCodeDisplay joinCode={session.joinCode} codeOnly />
              </div>

              <Button
                variant="glow"
                size="lg"
                className="w-full h-12 text-base"
                onClick={handleStartSession}
                disabled={!isConnected}
              >
                <Play className="h-5 w-5 mr-2" />
                Start Session
              </Button>
              {!isConnected && (
                <p className="text-xs text-red-400 mt-2">Not connected — check your connection</p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Session ended overlay */}
      <AnimatePresence>
        {session.state === 'ended' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center bg-white/90 dark:bg-zinc-950/90 backdrop-blur-sm z-20"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass-card rounded-3xl p-10 max-w-sm w-full mx-4 text-center"
            >
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                Session ended
              </h2>
              <p className="text-zinc-400 text-sm mb-6">
                Great work! Your team groomed {session.urls.length} ticket
                {session.urls.length !== 1 ? 's' : ''}.
              </p>
              <Button variant="glow" size="lg" className="w-full" onClick={() => navigate('/')}>
                Back to Home
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile participants overlay */}
      <AnimatePresence>
        {showMobileParticipants && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 z-40 bg-zinc-950/60 backdrop-blur-sm"
            onClick={() => setShowMobileParticipants(false)}
          >
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="absolute inset-y-0 left-0 w-4/5 max-w-xs bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 h-14 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Participants
                </span>
                <button
                  type="button"
                  onClick={() => setShowMobileParticipants(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  aria-label="Close participants"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ParticipantList
                participants={participants}
                onKick={handleKickParticipant}
                className="flex-1"
                session={session}
                votedParticipantIds={session.votingEnabled ? votedParticipantIds : undefined}
                revealedVotes={session.votingEnabled ? revealedVotes : undefined}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share modal */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowShareModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Share Session</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowShareModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <JoinCodeDisplay joinCode={session.joinCode} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
