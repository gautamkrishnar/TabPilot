import { motion } from 'framer-motion';
import { AlertTriangle, Monitor, MonitorCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTabSync } from '@/hooks/useTabSync';
import { cn } from '@/lib/utils';

interface TabSyncToggleProps {
  onNavigate?: (url: string) => void;
  className?: string;
}

export function TabSyncToggle({ className }: TabSyncToggleProps) {
  const { enableSync, isEnabled } = useTabSync();

  if (isEnabled) {
    return (
      <motion.div
        initial={{ scale: 0.97, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2 }}
        className={cn(
          'flex items-center gap-4 px-5 py-4 rounded-xl',
          'bg-green-500/10 border border-green-500/30',
          className,
        )}
      >
        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
          <MonitorCheck className="h-5 w-5 text-green-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-green-300">Tab sync active</p>
          <p className="text-xs text-green-500/80 mt-0.5">
            URLs will automatically open in your synced tab
          </p>
        </div>
        <MonitorCheck className="h-5 w-5 text-green-400 flex-shrink-0" aria-hidden="true" />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0.97, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'flex flex-col gap-4 px-5 py-5 rounded-xl',
        'bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800',
        'hover:border-indigo-500/30 transition-colors duration-300',
        className,
      )}
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
          <Monitor className="h-6 w-6 text-zinc-500 dark:text-zinc-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            Synchronized Tab Navigation
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-1 leading-relaxed">
            Enable tab sync so URLs automatically open in a dedicated browser tab when the host
            navigates.
          </p>
        </div>
      </div>

      <Button variant="glow" className="w-full h-11 text-sm font-semibold" onClick={enableSync}>
        <MonitorCheck className="h-4 w-4 mr-2" />
        Enable Tab Sync
      </Button>

      <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
        <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-300/80 leading-relaxed">
          <span className="font-semibold text-amber-300">Pop-up blocker caveat:</span> Your browser
          must allow pop-ups from this site. If blocked, click the address bar icon to allow, then
          try again.
        </p>
      </div>
    </motion.div>
  );
}
