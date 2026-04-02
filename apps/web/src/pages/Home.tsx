import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Clock,
  Github,
  Globe,
  MousePointerClick,
  Play,
  Share2,
  Shield,
  Ticket,
  Trash2,
  Users,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { deleteSession, getSessionByCode } from '@/lib/api';
import { cn } from '@/lib/utils';
import { type SavedSession, useSessionStore } from '@/store/sessionStore';

const fadeInUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: 'easeOut' },
};

const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const features = [
  {
    icon: Zap,
    title: 'Real-time sync',
    description:
      'Every navigation event is broadcast to all participants instantly via WebSockets.',
    color: 'from-yellow-500/20 to-amber-500/10',
    iconColor: 'text-amber-400',
    border: 'border-amber-500/20',
  },
  {
    icon: Globe,
    title: 'Tool-agnostic',
    description:
      'Works with any URL — Jira, Linear, GitHub, Notion, Confluence. No integrations needed.',
    color: 'from-blue-500/20 to-cyan-500/10',
    iconColor: 'text-cyan-400',
    border: 'border-cyan-500/20',
  },
  {
    icon: Users,
    title: 'Team presence',
    description: "See who's online, track join/leave events, and know your whole team is in sync.",
    color: 'from-violet-500/20 to-purple-500/10',
    iconColor: 'text-violet-400',
    border: 'border-violet-500/20',
  },
  {
    icon: Shield,
    title: 'No accounts',
    description:
      'Zero friction onboarding. Join with a 6-character code — no signup, no passwords.',
    color: 'from-green-500/20 to-emerald-500/10',
    iconColor: 'text-green-400',
    border: 'border-green-500/20',
  },
];

const steps = [
  {
    number: '01',
    icon: Play,
    title: 'Create',
    description:
      'Host creates a session with ticket URLs and a session name. Get a shareable 6-character join code instantly.',
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/20',
  },
  {
    number: '02',
    icon: Share2,
    title: 'Share',
    description:
      'Team members join using the 6-character code or shareable link. No account needed — just your name.',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
  },
  {
    number: '03',
    icon: MousePointerClick,
    title: 'Groom',
    description:
      "Host navigates tickets one by one. Everyone's synced tab follows in real time. Discuss, estimate, repeat.",
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
  },
];

const faqs = [
  {
    q: 'Why do I need to enable tab sync?',
    a: "Browser security requires a user gesture (like clicking a button) to open new windows. Tab sync uses window.open(), so participants must click 'Enable Tab Sync' once — then navigation is automatic.",
  },
  {
    q: 'Which tools are supported?',
    a: 'Any URL works: Jira, Linear, GitHub Issues, Notion, Confluence, Shortcut, ClickUp, Trello — if it has a URL, Tab Pilot syncs it.',
  },
  {
    q: 'How long does a session last?',
    a: 'Sessions can be configured for 1, 3, 7, or 14 days. After that, the session expires and participants are automatically disconnected.',
  },
];

interface SessionCardProps {
  session: SavedSession;
  onResume: () => void;
  onRemove: () => void;
}

function SessionCard({ session, onResume, onRemove }: SessionCardProps) {
  const isHost = session.role === 'host';
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(session.expiresAt).getTime() - Date.now()) / 86_400_000),
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors group"
    >
      {/* Top row: badge + info + delete */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Role badge */}
        <div
          className={cn(
            'flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold',
            isHost
              ? 'bg-gradient-to-br from-indigo-500 to-violet-600'
              : 'bg-gradient-to-br from-emerald-500 to-teal-600',
          )}
        >
          {isHost ? 'H' : 'P'}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
            {session.name}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
            <span className="text-xs text-zinc-500 font-mono">{session.joinCode}</span>
            <span className="text-xs text-zinc-400 flex items-center gap-1">
              <Ticket className="h-3 w-3" />
              {session.urlCount}
            </span>
            <span className="text-xs text-zinc-400 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {daysLeft}d left
            </span>
          </div>
        </div>

        {/* Delete — always visible on mobile, hover-only on desktop */}
        <button
          type="button"
          onClick={onRemove}
          className="flex-shrink-0 p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-400/10 transition-colors sm:opacity-0 sm:group-hover:opacity-100"
          aria-label="Remove session"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Action button — full-width on mobile */}
      <div className="flex-shrink-0">
        <Button
          type="button"
          size="sm"
          variant={isHost ? 'glow' : 'outline'}
          className="text-xs h-8 w-full sm:w-auto"
          onClick={onResume}
        >
          {isHost ? (
            <>
              <Play className="h-3 w-3 mr-1" />
              Dashboard
            </>
          ) : (
            <>
              <ArrowRight className="h-3 w-3 mr-1" />
              Rejoin
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}

export function Home() {
  const navigate = useNavigate();
  const { getSavedSessions, removeSavedSession } = useSessionStore();
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>(() => getSavedSessions());

  // On mount: silently verify participant sessions still exist on the server.
  // Any that return 404 are removed from localStorage and the UI list.
  useEffect(() => {
    const participantSessions = getSavedSessions().filter((s) => s.role === 'participant');
    if (participantSessions.length === 0) return;

    participantSessions.forEach(async (s) => {
      try {
        await getSessionByCode(s.joinCode);
      } catch {
        // Session no longer exists — remove from local history
        removeSavedSession(s.sessionId);
        setSavedSessions((prev) => prev.filter((p) => p.sessionId !== s.sessionId));
      }
    });
  }, [getSavedSessions, removeSavedSession]);

  const handleResume = useCallback(
    (session: SavedSession) => {
      if (session.role === 'host') {
        navigate(`/host/${session.sessionId}`);
      } else {
        navigate(`/session/${session.sessionId}`);
      }
    },
    [navigate],
  );

  const handleRemove = useCallback(
    (sessionId: string) => {
      const session = savedSessions.find((s) => s.sessionId === sessionId);

      // For host sessions, also delete the session from the server
      if (session?.role === 'host' && session.hostKey) {
        deleteSession(sessionId, session.hostKey).catch(() => {
          // Ignore — session may already be expired/deleted on server
        });
      }

      removeSavedSession(sessionId);
      setSavedSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
    },
    [savedSessions, removeSavedSession],
  );

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-x-hidden">
      {/* Fixed nav */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white/80 dark:bg-zinc-950/70 backdrop-blur-xl border-b border-zinc-200/50 dark:border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2.5">
              <img
                src="/logo.svg"
                alt="Tab Pilot logo"
                width={32}
                height={32}
                className="rounded-lg shadow-glow-indigo"
              />
              <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Tab Pilot</span>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="https://github.com/gautamkrishnar/TabPilot"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub repository"
                className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              >
                <Github className="h-5 w-5" />
              </a>
              <ThemeToggle />
              <Button asChild variant="glow" size="sm">
                <Link to="/create">
                  Create Session <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-indigo-500/5 blur-[120px]" />
          <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] rounded-full bg-violet-500/5 blur-[80px]" />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, rgba(99,102,241,0.8) 1px, transparent 0)',
              backgroundSize: '40px 40px',
            }}
          />
        </div>

        <div className="relative max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium mb-8"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
            </span>
            Real-time tab synchronization for engineering teams
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6"
          >
            Real-time grooming,
            <br />
            <span className="gradient-text">zero friction.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Synchronize browser tabs across your entire team during sprint grooming. Works with any
            tool — Jira, Linear, GitHub, Notion. No accounts, no installs.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button
              asChild
              variant="glow"
              size="lg"
              className="text-base px-8 h-14 w-full sm:w-auto"
            >
              <Link to="/create">
                Create Session
                <ArrowRight className="h-5 w-5 ml-1" />
              </Link>
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="text-base px-8 h-14 border-zinc-300 dark:border-zinc-700 w-full sm:w-auto"
              asChild
            >
              <Link to="/join">Join with code</Link>
            </Button>
          </motion.div>

          {/* Social proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-12 flex items-center justify-center gap-6 text-sm text-zinc-500 dark:text-zinc-500"
          >
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              No account required
            </span>
            <span className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
              Free to use
            </span>
            <span className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
              Any tool works
            </span>
          </motion.div>
        </div>
      </section>

      {/* Your sessions */}
      <AnimatePresence>
        {savedSessions.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="px-4 sm:px-6 lg:px-8 pb-16"
          >
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
                  Your sessions
                </h2>
                <span className="text-xs text-zinc-400">
                  {savedSessions.length} session{savedSessions.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {savedSessions.map((s) => (
                    <SessionCard
                      key={s.sessionId}
                      session={s}
                      onResume={() => handleResume(s)}
                      onRemove={() => handleRemove(s.sessionId)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Features */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-zinc-900 dark:text-zinc-100">
              Everything your team needs
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-lg max-w-xl mx-auto">
              Built for engineering teams who value focus and flow.
            </p>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
          >
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={fadeInUp}
                className={cn(
                  'glass-card p-6 rounded-2xl group',
                  'hover:border-opacity-50 hover:-translate-y-1 transition-all duration-300',
                )}
              >
                <div
                  className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center mb-4',
                    `bg-gradient-to-br ${feature.color}`,
                    `border ${feature.border}`,
                  )}
                >
                  <feature.icon className={cn('h-6 w-6', feature.iconColor)} />
                </div>
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-zinc-100/50 dark:bg-zinc-900/50">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-zinc-900 dark:text-zinc-100">
              How it works
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-lg max-w-xl mx-auto">
              Three simple steps from zero to fully synchronized grooming.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connecting lines */}
            <div className="hidden md:block absolute top-10 left-1/3 right-1/3 h-px bg-gradient-to-r from-indigo-500/50 via-violet-500/50 to-cyan-500/50" />

            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="relative flex flex-col items-center text-center"
              >
                <div
                  className={cn(
                    'relative z-10 w-20 h-20 rounded-2xl flex items-center justify-center mb-6',
                    step.bg,
                    `border ${step.border}`,
                  )}
                >
                  <step.icon className={cn('h-9 w-9', step.color)} />
                  <span className="absolute -top-2 -right-2 text-xs font-bold text-zinc-500 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full w-6 h-6 flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
                <h3 className={cn('text-xl font-bold mb-3', step.color)}>{step.title}</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-xs">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-bold mb-4 text-zinc-900 dark:text-zinc-100">
              Common questions
            </h2>
          </motion.div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
              >
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                  {faq.q}
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{faq.a}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto text-center glass-card rounded-3xl p-6 sm:p-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to groom better?</h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-lg mb-8 max-w-xl mx-auto">
            Start a session in 30 seconds. Your team joins instantly.
          </p>
          <Button asChild variant="glow" size="lg" className="text-base px-10 h-14 w-full sm:w-auto">
            <Link to="/create">
              Create your first session
              <ArrowRight className="h-5 w-5 ml-2" />
            </Link>
          </Button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-600">
          <span className="font-semibold text-zinc-500">Tab Pilot</span>
          <span>Real-time grooming, zero friction.</span>
        </div>
      </footer>
    </div>
  );
}
