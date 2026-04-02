import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowLeft, Loader2, Mail, ShieldCheck, User, UserPlus } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { joinAsCoHost } from '@/lib/api';
import { useSessionStore } from '@/store/sessionStore';

// ─── Stagger variants ────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 320, damping: 28 } },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function HostJoin() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { saveHostKey, saveHostSession } = useSessionStore();

  // The invite key is consumed programmatically — never rendered
  const inviteKey = searchParams.get('key');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [nameError, setNameError] = useState('');

  const mutation = useMutation({
    mutationFn: () => {
      if (!sessionId || !inviteKey) throw new Error('Missing session or invite key');
      return joinAsCoHost(sessionId, inviteKey, name.trim(), email.trim() || undefined);
    },
    onSuccess: (res) => {
      saveHostKey(res.session.id, res.hostKey);
      saveHostSession(res.session, res.hostKey);
      toast.success('You joined as a co-host!', { icon: '🎉' });
      navigate(`/host/${res.session.id}`);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to join as co-host');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('Your name is required');
      return;
    }
    if (trimmed.length > 50) {
      setNameError('Name must be 50 characters or fewer');
      return;
    }
    setNameError('');
    mutation.mutate();
  };

  // ── Invalid link state ────────────────────────────────────────────────────

  if (!inviteKey) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35 }}
            className="w-full max-w-sm text-center"
          >
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 mb-5 mx-auto">
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
              Invalid invite link
            </h1>
            <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
              This co-host invite link is missing required information. Ask the session host to
              share a valid link.
            </p>
            <Button
              variant="outline"
              className="gap-2 border-zinc-300 dark:border-zinc-700"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </motion.div>
        </div>
      </Layout>
    );
  }

  // ── Join form ─────────────────────────────────────────────────────────────

  return (
    <Layout>
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
        <motion.div
          className="w-full max-w-sm"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {/* Icon + heading */}
          <motion.div variants={itemVariants} className="text-center mb-8">
            <div className="relative inline-flex mb-5">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <UserPlus className="h-8 w-8 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-950 flex items-center justify-center">
                <ShieldCheck className="h-3 w-3 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
              Join as Co-Host
            </h1>
            <p className="text-zinc-400 text-sm leading-relaxed">
              You've been invited to co-facilitate this grooming session. Co-hosts have full control
              — navigate tickets, reveal votes, and manage participants.
            </p>
          </motion.div>

          {/* Form card */}
          <motion.div
            variants={itemVariants}
            className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4"
          >
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <FormItem>
                <FormLabel htmlFor="name" className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-zinc-400" />
                  Your name <span className="text-red-400">*</span>
                </FormLabel>
                <Input
                  id="name"
                  placeholder="e.g. Alex Rivera"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (nameError) setNameError('');
                  }}
                  aria-invalid={!!nameError}
                  disabled={mutation.isPending}
                  autoFocus
                />
                <FormMessage message={nameError} />
              </FormItem>

              <FormItem>
                <FormLabel htmlFor="email" className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-zinc-400" />
                  Email
                  <span className="text-zinc-500 font-normal">(optional)</span>
                </FormLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={mutation.isPending}
                />
              </FormItem>

              <Button
                type="submit"
                variant="glow"
                size="lg"
                className="w-full mt-2"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Joining…
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Join as Co-Host
                  </>
                )}
              </Button>
            </form>
          </motion.div>

          {/* Back link */}
          <motion.div variants={itemVariants} className="text-center mt-5">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors inline-flex items-center gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Home
            </button>
          </motion.div>
        </motion.div>
      </div>
    </Layout>
  );
}
