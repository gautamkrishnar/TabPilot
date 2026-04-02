import { useMutation, useQuery } from '@tanstack/react-query';
import { useFormik } from 'formik';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronLeft, Loader2, Lock, Mail, User } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import * as Yup from 'yup';
import { JoinCodeInput } from '@/components/JoinCodeInput';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { getSessionByCode, joinSession } from '@/lib/api';
import { cn, getDiceBearUrl } from '@/lib/utils';
import { useSessionStore } from '@/store/sessionStore';

// ─── Validation schema ─────────────────────────────────────────────────────────

const validationSchema = Yup.object({
  joinCode: Yup.string()
    .trim()
    .length(6, 'Code must be exactly 6 characters')
    .required('Join code is required'),
  name: Yup.string().trim().required('Your name is required'),
  email: Yup.string().trim().email('Enter a valid email address').optional(),
});

type FormValues = Yup.InferType<typeof validationSchema>;

const LAST_NAME_KEY = 'tabpilot_last_name';

// ─── Component ─────────────────────────────────────────────────────────────────

export function JoinSession() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { saveParticipantId, setParticipantId, saveParticipantSession, getSavedSessions } =
    useSessionStore();

  const initialCode = searchParams.get('code')?.toUpperCase() ?? '';

  // Saved name from a previous session join — pre-fill so the user doesn't re-type it
  const savedName = localStorage.getItem(LAST_NAME_KEY) ?? '';

  // Check if the user has already joined a session with this exact code
  const existingSession = useMemo(
    () =>
      getSavedSessions().find((s) => s.joinCode === initialCode && s.role === 'participant') ??
      null,
    [initialCode, getSavedSessions],
  );

  // ── Session lookup ───────────────────────────────────────────────────────────

  const formik = useFormik<FormValues>({
    initialValues: {
      joinCode: initialCode,
      name: savedName, // pre-fill from last join
      email: '',
    },
    validationSchema,
    validateOnChange: true,
    validateOnBlur: true,
    onSubmit: (values) => {
      if (!lookedUpSession) return;
      // Persist name so next join is also pre-filled
      localStorage.setItem(LAST_NAME_KEY, values.name.trim());
      joinMutation.mutate({
        sessionId: lookedUpSession.id,
        name: values.name.trim(),
        email: values.email?.trim() || undefined,
      });
    },
  });

  const {
    data: lookedUpSession,
    isLoading: lookupLoading,
    isError: lookupError,
  } = useQuery({
    queryKey: ['session', 'code', formik.values.joinCode],
    queryFn: () => getSessionByCode(formik.values.joinCode),
    enabled: formik.values.joinCode.length === 6,
    retry: false,
    staleTime: 30_000,
  });

  // ── Join mutation ────────────────────────────────────────────────────────────

  const joinMutation = useMutation({
    mutationFn: ({ sessionId, name, email }: { sessionId: string; name: string; email?: string }) =>
      joinSession(sessionId, name, email),
    onSuccess: (res) => {
      saveParticipantId(res.session.id, res.participant.id);
      saveParticipantSession(res.session, res.participant.id);
      setParticipantId(res.participant.id);
      toast.success(`Welcome, ${res.participant.name}!`, { icon: '🎉' });
      navigate(`/session/${res.session.id}`);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to join session');
    },
  });

  // ── Case 1: Already a member of this exact session ───────────────────────────
  // Session was looked up, we have a saved participantId for it → go straight in.
  const redirectedRef = useRef(false);
  useEffect(() => {
    if (existingSession && lookedUpSession && !redirectedRef.current) {
      redirectedRef.current = true;
      navigate(`/session/${lookedUpSession.id}`, { replace: true });
    }
  }, [existingSession, lookedUpSession, navigate]);

  // ── Case 2: New session + saved name → auto-submit ───────────────────────────
  // The user has joined sessions before (name is saved). Don't make them click.
  const autoSubmittedRef = useRef(false);
  useEffect(() => {
    if (
      lookedUpSession &&
      !lookedUpSession.isLocked && // never auto-submit into a locked session
      savedName && // only auto-submit if we had a saved name
      formik.values.name.trim() &&
      !existingSession && // don't auto-submit if already a member
      !joinMutation.isPending &&
      !autoSubmittedRef.current
    ) {
      autoSubmittedRef.current = true;
      formik.submitForm();
    }
    // Run only when session resolves — deps intentionally minimal to fire once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    lookedUpSession?.id,
    savedName,
    joinMutation.isPending,
    existingSession,
    lookedUpSession,
    formik.values.name.trim,
    formik.submitForm,
  ]);

  // ─── Render ──────────────────────────────────────────────────────────────────

  const fieldError = (name: keyof FormValues) =>
    formik.touched[name] ? (formik.errors[name] as string | undefined) : undefined;

  const avatarUrl = formik.values.name.trim()
    ? getDiceBearUrl(formik.values.name.trim(), 80)
    : null;

  const isSubmitting = joinMutation.isPending || formik.isSubmitting;

  // Show a minimal loading screen while we silently redirect (cases 1 & 2)
  const isAutoJoining =
    (existingSession && !!lookedUpSession) ||
    (!!savedName && !!lookedUpSession && !existingSession && !joinMutation.isError);

  if (isAutoJoining) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mx-auto" />
            <p className="text-sm text-zinc-500">
              {existingSession ? 'Reconnecting to session…' : `Joining as ${savedName}…`}
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-[calc(100vh-4rem)] flex items-start justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="mb-8">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors mb-6"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Link>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
              Join a session
            </h1>
            <p className="text-zinc-400">Enter the 6-character code shared by your host.</p>
          </div>

          <form onSubmit={formik.handleSubmit} noValidate className="space-y-6">
            {/* Code section */}
            <section className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 text-center">
                Join Code
              </h2>

              <JoinCodeInput
                value={formik.values.joinCode}
                onChange={(code) => {
                  formik.setFieldValue('joinCode', code);
                  formik.setFieldTouched('joinCode', true, false);
                }}
                onComplete={(code) => {
                  formik.setFieldValue('joinCode', code);
                  formik.setFieldTouched('joinCode', true, false);
                }}
                disabled={isSubmitting}
              />

              {lookupLoading && (
                <p className="text-xs text-zinc-500 text-center flex items-center justify-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Looking up session...
                </p>
              )}

              {lookupError && formik.values.joinCode.length === 6 && (
                <p className="text-xs text-red-400 text-center">Session not found for this code</p>
              )}

              {lookedUpSession && !lookupLoading && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={cn(
                    'text-xs text-center flex items-center justify-center gap-1.5',
                    lookedUpSession.isLocked ? 'text-amber-400' : 'text-green-400',
                  )}
                >
                  {lookedUpSession.isLocked ? (
                    <>
                      <Lock className="h-3 w-3" />
                      Session is locked — the host is not accepting new participants
                    </>
                  ) : (
                    '✓ Session found — enter your details below'
                  )}
                </motion.p>
              )}
            </section>

            {/* Your info */}
            <section className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-4 mb-2">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2 flex-1">
                  <User className="h-4 w-4" />
                  Your info
                </h2>
                {avatarUrl && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                    className="flex-shrink-0"
                  >
                    <img
                      src={avatarUrl}
                      alt="Your avatar preview"
                      className="w-10 h-10 rounded-full ring-2 ring-indigo-500/50"
                    />
                  </motion.div>
                )}
              </div>

              <FormItem>
                <FormLabel htmlFor="name">
                  Your name <span className="text-red-400">*</span>
                </FormLabel>
                <Input
                  id="name"
                  placeholder="e.g. Alex Johnson"
                  aria-invalid={!!fieldError('name')}
                  {...formik.getFieldProps('name')}
                />
                <FormMessage message={fieldError('name')} />
              </FormItem>

              <FormItem>
                <FormLabel htmlFor="email" className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  Email
                  <span className="text-zinc-600 font-normal">(optional)</span>
                </FormLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  aria-invalid={!!fieldError('email')}
                  {...formik.getFieldProps('email')}
                />
                <FormMessage message={fieldError('email')} />
              </FormItem>

              {formik.values.name.trim() && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
                >
                  <img
                    src={getDiceBearUrl(formik.values.name.trim(), 32)}
                    alt=""
                    aria-hidden="true"
                    className="w-8 h-8 rounded-full"
                  />
                  <div>
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      {formik.values.name}
                    </p>
                    <p className="text-xs text-zinc-500">This is how you'll appear to others</p>
                  </div>
                </motion.div>
              )}
            </section>

            <Button
              type="submit"
              variant="glow"
              size="lg"
              className="w-full"
              disabled={
                isSubmitting || !lookedUpSession || lookupLoading || !!lookedUpSession?.isLocked
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Joining...
                </>
              ) : (
                <>
                  Join Session
                  <ArrowRight className="h-5 w-5 ml-1" />
                </>
              )}
            </Button>
          </form>
        </motion.div>
      </div>
    </Layout>
  );
}
