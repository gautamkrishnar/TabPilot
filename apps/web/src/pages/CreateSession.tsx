import type { CreateSessionResponse } from '@tabpilot/shared';
import { useMutation } from '@tanstack/react-query';
import { useFormik } from 'formik';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Check,
  ChevronLeft,
  Clock,
  FileText,
  List,
  Loader2,
  Mail,
  ToggleLeft,
  ToggleRight,
  User,
} from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import * as Yup from 'yup';
import { JoinCodeDisplay } from '@/components/JoinCodeDisplay';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { FormDescription, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { createSession } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useSessionStore } from '@/store/sessionStore';

// ─── Constants ────────────────────────────────────────────────────────────────

const EXPIRY_OPTIONS = [
  { label: '1 day', value: 1 },
  { label: '3 days', value: 3 },
  { label: '7 days', value: 7 },
  { label: '14 days', value: 14 },
];

const URL_PLACEHOLDER = `https://linear.app/my-team/issue/ENG-101
https://github.com/my-org/my-repo/issues/42
https://notion.so/my-workspace/Sprint-Planning-abc123
https://jira.atlassian.com/browse/PROJ-500`;

// ─── Validation schema ────────────────────────────────────────────────────────

const validationSchema = Yup.object({
  hostName: Yup.string().trim().required('Your name is required'),
  hostEmail: Yup.string().trim().email('Enter a valid email address').optional(),
  sessionName: Yup.string().trim().required('Session name is required'),
  expiryDays: Yup.number().oneOf([1, 3, 7, 14]).required(),
  votingEnabled: Yup.boolean().required(),
  urlsText: Yup.string()
    .trim()
    .required('At least one URL is required')
    .test('valid-urls', '', function (value) {
      const urls = (value ?? '')
        .split('\n')
        .map((u) => u.trim())
        .filter(Boolean);

      if (urls.length === 0) return this.createError({ message: 'At least one URL is required' });
      if (urls.length > 50) return this.createError({ message: 'Maximum 50 URLs allowed' });

      const invalid = urls.filter((u) => {
        try {
          const parsed = new URL(u);
          return !['http:', 'https:'].includes(parsed.protocol);
        } catch {
          return true;
        }
      });
      if (invalid.length > 0) {
        return this.createError({
          message: `Invalid URL(s): ${invalid.slice(0, 2).join(', ')}`,
        });
      }
      return true;
    }),
});

type FormValues = Yup.InferType<typeof validationSchema>;

// ─── Component ────────────────────────────────────────────────────────────────

export function CreateSession() {
  const navigate = useNavigate();
  const { saveHostKey, setIsHost, saveHostSession } = useSessionStore();
  const [result, setResult] = useState<CreateSessionResponse | null>(null);

  const createMutation = useMutation({
    mutationFn: createSession,
    onSuccess: (res) => {
      saveHostKey(res.session.id, res.hostKey);
      saveHostSession(res.session, res.hostKey, res.hostInviteKey);
      setIsHost(true);
      setResult(res);
      toast.success('Session created!', { icon: '🎉' });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create session');
    },
  });

  const formik = useFormik<FormValues>({
    initialValues: {
      hostName: '',
      hostEmail: '',
      sessionName: '',
      expiryDays: 7,
      votingEnabled: false,
      urlsText: '',
    },
    validationSchema,
    validateOnChange: true,
    validateOnBlur: true,
    onSubmit: (values) => {
      const urls = values.urlsText
        .split('\n')
        .map((u) => u.trim())
        .filter(Boolean);
      createMutation.mutate({
        name: values.sessionName.trim(),
        hostName: values.hostName.trim(),
        hostEmail: values.hostEmail?.trim() || undefined,
        urls,
        expiryDays: values.expiryDays,
        votingEnabled: values.votingEnabled,
      });
    },
  });

  // Helper: show error only when field has been touched
  const fieldError = (name: keyof FormValues) =>
    formik.touched[name] ? (formik.errors[name] as string | undefined) : undefined;

  // ── Success state ──────────────────────────────────────────────────────────

  if (result) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md"
          >
            <div className="text-center mb-8">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 border border-green-500/30 mb-4">
                <Check className="h-8 w-8 text-green-400" />
              </div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                Session created!
              </h1>
              <p className="text-zinc-400 text-sm">Share the code or link with your team</p>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-6 mb-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                  Session Name
                </p>
                <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  {result.session.name}
                </p>
              </div>

              <JoinCodeDisplay joinCode={result.session.joinCode} />

              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700">
                <span className="text-xs text-zinc-400">
                  {result.session.urls.length} ticket{result.session.urls.length !== 1 ? 's' : ''} ·
                  Expires in {formik.values.expiryDays} day
                  {formik.values.expiryDays !== 1 ? 's' : ''}
                  {formik.values.votingEnabled ? ' · Voting enabled' : ''}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                variant="glow"
                size="lg"
                className="w-full"
                onClick={() => navigate(`/host/${result.session.id}`)}
              >
                Open Host Dashboard
                <ArrowRight className="h-5 w-5 ml-1" />
              </Button>
              <Button
                variant="outline"
                className="w-full border-zinc-300 dark:border-zinc-700"
                onClick={() => setResult(null)}
              >
                Create another session
              </Button>
            </div>
          </motion.div>
        </div>
      </Layout>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────

  return (
    <Layout>
      <div className="min-h-[calc(100vh-4rem)] flex items-start justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-xl"
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
              Create a session
            </h1>
            <p className="text-zinc-400">Set up your grooming session and invite your team.</p>
          </div>

          <form onSubmit={formik.handleSubmit} noValidate className="space-y-6">
            {/* Your info */}
            <section className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                <User className="h-4 w-4" />
                Your info
              </h2>

              <FormItem>
                <FormLabel htmlFor="hostName">
                  Your name <span className="text-red-400">*</span>
                </FormLabel>
                <Input
                  id="hostName"
                  placeholder="e.g. Sarah Chen"
                  aria-invalid={!!fieldError('hostName')}
                  {...formik.getFieldProps('hostName')}
                />
                <FormMessage message={fieldError('hostName')} />
              </FormItem>

              <FormItem>
                <FormLabel htmlFor="hostEmail" className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  Email
                  <span className="text-zinc-600 font-normal">(optional)</span>
                </FormLabel>
                <Input
                  id="hostEmail"
                  type="email"
                  placeholder="you@company.com"
                  aria-invalid={!!fieldError('hostEmail')}
                  {...formik.getFieldProps('hostEmail')}
                />
                <FormMessage message={fieldError('hostEmail')} />
              </FormItem>
            </section>

            {/* Session details */}
            <section className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Session details
              </h2>

              <FormItem>
                <FormLabel htmlFor="sessionName">
                  Session name <span className="text-red-400">*</span>
                </FormLabel>
                <Input
                  id="sessionName"
                  placeholder="e.g. Sprint 47 Grooming"
                  aria-invalid={!!fieldError('sessionName')}
                  {...formik.getFieldProps('sessionName')}
                />
                <FormMessage message={fieldError('sessionName')} />
              </FormItem>

              <div className="space-y-1.5">
                <FormLabel className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Session expiry
                </FormLabel>
                <div className="grid grid-cols-4 gap-2">
                  {EXPIRY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => formik.setFieldValue('expiryDays', opt.value)}
                      className={cn(
                        'py-2 px-3 rounded-lg text-sm font-medium transition-all duration-150',
                        'border focus:outline-none focus:ring-2 focus:ring-indigo-500',
                        formik.values.expiryDays === opt.value
                          ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                          : 'bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-600',
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Enable story point voting
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Participants can vote on story points during grooming
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    formik.setFieldValue('votingEnabled', !formik.values.votingEnabled)
                  }
                  className="flex-shrink-0"
                  aria-label="Toggle voting"
                >
                  {formik.values.votingEnabled ? (
                    <ToggleRight className="h-8 w-8 text-indigo-400" />
                  ) : (
                    <ToggleLeft className="h-8 w-8 text-zinc-600" />
                  )}
                </button>
              </div>
            </section>

            {/* Ticket URLs */}
            <section className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                <List className="h-4 w-4" />
                Ticket URLs
              </h2>

              <FormItem>
                <FormLabel htmlFor="urlsText">
                  One URL per line <span className="text-red-400">*</span>
                </FormLabel>
                <Textarea
                  id="urlsText"
                  placeholder={URL_PLACEHOLDER}
                  className="min-h-[160px] font-mono text-xs leading-relaxed"
                  aria-invalid={!!fieldError('urlsText')}
                  {...formik.getFieldProps('urlsText')}
                />
                {/* Show error OR helper count — FormMessage reserves the space either way */}
                {fieldError('urlsText') ? (
                  <FormMessage message={fieldError('urlsText')} />
                ) : (
                  <FormDescription>
                    {formik.values.urlsText.split('\n').filter((u) => u.trim()).length} URL(s) · Max
                    50
                  </FormDescription>
                )}
              </FormItem>
            </section>

            <Button
              type="submit"
              variant="glow"
              size="lg"
              className="w-full"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  Create Session
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
