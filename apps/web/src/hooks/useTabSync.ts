import { useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { useSessionStore } from '@/store/sessionStore';

export function useTabSync() {
  const syncedWindowRef = useRef<Window | null>(null);
  const { tabSyncEnabled, setTabSyncEnabled, setSyncedWindow } = useSessionStore();

  const enableSync = useCallback(() => {
    const win = window.open('about:blank', 'tabpilot_sync');
    if (!win) {
      toast.error('Pop-up blocked! Please allow pop-ups for this site and try again.', {
        duration: 6000,
      });
      return false;
    }
    syncedWindowRef.current = win;
    setSyncedWindow(win);
    setTabSyncEnabled(true);
    toast.success('Tab sync enabled! A synchronized tab is ready.', {
      icon: '🔗',
      duration: 3000,
    });
    return true;
  }, [setTabSyncEnabled, setSyncedWindow]);

  const navigateTo = useCallback(
    (url: string) => {
      if (!tabSyncEnabled) return;

      if (!syncedWindowRef.current || syncedWindowRef.current.closed) {
        const win = window.open(url, 'tabpilot_sync');
        if (!win) {
          toast.error('Pop-up blocked. Please allow pop-ups to use tab sync.', {
            duration: 5000,
          });
          setTabSyncEnabled(false);
          setSyncedWindow(null);
          return;
        }
        syncedWindowRef.current = win;
        setSyncedWindow(win);
      } else {
        try {
          syncedWindowRef.current.location.href = url;
        } catch {
          const win = window.open(url, 'tabpilot_sync');
          syncedWindowRef.current = win;
          setSyncedWindow(win);
        }
      }
    },
    [tabSyncEnabled, setTabSyncEnabled, setSyncedWindow],
  );

  return {
    enableSync,
    navigateTo,
    isEnabled: tabSyncEnabled,
    syncedWindow: syncedWindowRef.current,
  };
}
