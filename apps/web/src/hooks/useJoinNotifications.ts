import { useCallback, useState } from 'react';

const JOIN_PREF_KEY = 'tabpilot_join_notifications';
const VOTE_PREF_KEY = 'tabpilot_vote_notifications';

export function joinNotificationsEnabled(): boolean {
  return localStorage.getItem(JOIN_PREF_KEY) !== '0';
}

export function voteNotificationsEnabled(): boolean {
  return localStorage.getItem(VOTE_PREF_KEY) !== '0';
}

export function useNotificationPrefs() {
  const [joinEnabled, setJoinEnabled] = useState<boolean>(() => joinNotificationsEnabled());
  const [voteEnabled, setVoteEnabled] = useState<boolean>(() => voteNotificationsEnabled());

  const toggleJoin = useCallback(() => {
    setJoinEnabled((prev) => {
      const next = !prev;
      if (next) localStorage.removeItem(JOIN_PREF_KEY);
      else localStorage.setItem(JOIN_PREF_KEY, '0');
      return next;
    });
  }, []);

  const toggleVote = useCallback(() => {
    setVoteEnabled((prev) => {
      const next = !prev;
      if (next) localStorage.removeItem(VOTE_PREF_KEY);
      else localStorage.setItem(VOTE_PREF_KEY, '0');
      return next;
    });
  }, []);

  return { joinEnabled, toggleJoin, voteEnabled, toggleVote };
}
