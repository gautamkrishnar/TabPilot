import { motion } from 'framer-motion';
import { ArrowLeft, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function NotFound() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-md"
      >
        {/* Animated 404 */}
        <div className="relative mb-8">
          <motion.div
            animate={{ rotate: [0, -5, 5, -3, 0] }}
            transition={{ duration: 2, delay: 0.5, repeat: Infinity, repeatDelay: 4 }}
            className="text-[120px] font-extrabold leading-none gradient-text select-none"
          >
            404
          </motion.div>
          <div className="absolute inset-0 blur-3xl bg-indigo-500/10 -z-10 rounded-full" />
        </div>

        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-3">Page not found</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed mb-8">
          This page doesn't exist or has been moved. Check the URL or head back home to get your
          bearings.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="glow" size="lg">
            <Link to="/">
              <Home className="h-5 w-5 mr-2" />
              Go Home
            </Link>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="border-zinc-300 dark:border-zinc-700"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Go Back
          </Button>
        </div>

        {/* Navigation suggestion */}
        <p className="mt-10 text-xs text-zinc-600">
          Looking for a session?{' '}
          <Link to="/join" className="text-indigo-400 hover:underline">
            Join with a code
          </Link>{' '}
          or{' '}
          <Link to="/create" className="text-indigo-400 hover:underline">
            create a new one
          </Link>
          .
        </p>
      </motion.div>
    </div>
  );
}
