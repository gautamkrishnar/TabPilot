import type {
  NavigateToPayload,
  ParticipantJoinedPayload,
  ParticipantLeftPayload,
  ParticipantOnlinePayload,
  ParticipantUpdatedPayload,
  SessionStatePayload,
  VotesRevealedPayload,
  VoteUpdatePayload,
  WsErrorPayload,
} from '@tabpilot/shared';
import { WS_EVENTS } from '@tabpilot/shared';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import type { Socket } from 'socket.io-client';
import { disconnectSocket, getSocket } from '@/lib/socket';
import { useSessionStore } from '@/store/sessionStore';

interface UseSocketOptions {
  sessionId: string | undefined;
  participantId?: string | null;
  hostKey?: string | null;
  onNavigate?: (url: string, index: number) => void;
}

export function useSocket({ sessionId, participantId, hostKey, onNavigate }: UseSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  // Keyed by sessionId so navigating between sessions re-joins correctly,
  // but StrictMode's intermediate cleanup doesn't cause a double join.
  const joinedSessionRef = useRef<string | null>(null);
  // Keep onNavigate in a ref so it never triggers effect re-runs
  const onNavigateRef = useRef(onNavigate);
  useEffect(() => {
    onNavigateRef.current = onNavigate;
  }, [onNavigate]);

  const navigate = useNavigate();

  const {
    setSession,
    setParticipants,
    addParticipant,
    removeParticipant,
    updateParticipant,
    setCurrentNavigateUrl,
    setVotedParticipantIds,
    setRevealedVotes,
    setSavedVotesMap,
    clearVotingRound,
    reset,
  } = useSessionStore();

  useEffect(() => {
    if (!sessionId) return;

    const socket = getSocket();
    socketRef.current = socket;

    const handleConnect = () => {
      setIsConnected(true);

      // Only emit join_session once per sessionId — the ref persists across
      // StrictMode's double-mount so we never send duplicate joins.
      if (joinedSessionRef.current !== sessionId) {
        joinedSessionRef.current = sessionId;
        socket.emit(WS_EVENTS.JOIN_SESSION, {
          sessionId,
          ...(hostKey ? { hostKey } : {}),
          ...(participantId ? { participantId } : {}),
        });
      }
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      joinedSessionRef.current = null;
    };

    const handleSessionState = (payload: SessionStatePayload) => {
      setSession(payload.session);
      setParticipants(payload.participants);
      if (payload.hasVoted) setVotedParticipantIds(payload.hasVoted);
      if (payload.savedVotes) setSavedVotesMap(payload.savedVotes);
    };

    const handleParticipantJoined = (payload: ParticipantJoinedPayload) => {
      addParticipant(payload.participant);
      toast.success(`${payload.participant.name} joined`, {
        icon: '👋',
        duration: 3000,
      });
    };

    const handleParticipantLeft = (payload: ParticipantLeftPayload) => {
      removeParticipant(payload.participantId);
    };

    const handleParticipantOnline = (payload: ParticipantOnlinePayload) => {
      updateParticipant(payload.participantId, { isOnline: payload.isOnline });
    };

    const handleParticipantUpdated = (payload: ParticipantUpdatedPayload) => {
      updateParticipant(payload.participant.id, payload.participant);
    };

    const handleSessionStarted = () => {
      setSession(
        useSessionStore.getState().session
          ? // biome-ignore lint/style/noNonNullAssertion: guarded by the ternary condition above
            { ...useSessionStore.getState().session!, state: 'active' }
          : null,
      );
      toast.success('Session started! Navigation is now live.', {
        icon: '🚀',
        duration: 4000,
      });
    };

    const handleVoteUpdate = (payload: VoteUpdatePayload) => {
      setVotedParticipantIds(payload.hasVoted);
    };

    const handleVotesRevealed = (payload: VotesRevealedPayload) => {
      setRevealedVotes(payload.votes);
    };

    const handleNavigateTo = (payload: NavigateToPayload) => {
      setCurrentNavigateUrl(payload.url);
      const currentSession = useSessionStore.getState().session;
      if (currentSession) {
        setSession({ ...currentSession, currentIndex: payload.index });
      }
      // Clear voting state for the new ticket
      clearVotingRound();
      if (payload.savedVotes) setSavedVotesMap(payload.savedVotes);
      if (onNavigateRef.current) {
        onNavigateRef.current(payload.url, payload.index);
      }
    };

    const handleSessionEnded = () => {
      const currentSession = useSessionStore.getState().session;
      if (currentSession) {
        setSession({ ...currentSession, state: 'ended' });
      }
      toast('Session has ended.', { icon: '🏁', duration: 5000 });
    };

    const handleKicked = () => {
      toast.error('You have been removed from this session.', { duration: 5000, icon: '🚫' });
      reset();
      disconnectSocket();
      navigate('/', { replace: true });
    };

    const handleError = (payload: WsErrorPayload) => {
      toast.error(payload.message || 'Something went wrong', {
        duration: 5000,
      });
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on(WS_EVENTS.KICKED, handleKicked);
    socket.on(WS_EVENTS.SESSION_STATE, handleSessionState);
    socket.on(WS_EVENTS.PARTICIPANT_JOINED, handleParticipantJoined);
    socket.on(WS_EVENTS.PARTICIPANT_LEFT, handleParticipantLeft);
    socket.on(WS_EVENTS.PARTICIPANT_ONLINE, handleParticipantOnline);
    socket.on(WS_EVENTS.PARTICIPANT_UPDATED, handleParticipantUpdated);
    socket.on(WS_EVENTS.SESSION_STARTED, handleSessionStarted);
    socket.on(WS_EVENTS.NAVIGATE_TO, handleNavigateTo);
    socket.on(WS_EVENTS.VOTE_UPDATE, handleVoteUpdate);
    socket.on(WS_EVENTS.VOTES_REVEALED, handleVotesRevealed);
    socket.on(WS_EVENTS.SESSION_ENDED, handleSessionEnded);
    socket.on(WS_EVENTS.ERROR, handleError);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off(WS_EVENTS.SESSION_STATE, handleSessionState);
      socket.off(WS_EVENTS.PARTICIPANT_JOINED, handleParticipantJoined);
      socket.off(WS_EVENTS.PARTICIPANT_LEFT, handleParticipantLeft);
      socket.off(WS_EVENTS.PARTICIPANT_ONLINE, handleParticipantOnline);
      socket.off(WS_EVENTS.PARTICIPANT_UPDATED, handleParticipantUpdated);
      socket.off(WS_EVENTS.SESSION_STARTED, handleSessionStarted);
      socket.off(WS_EVENTS.NAVIGATE_TO, handleNavigateTo);
      socket.off(WS_EVENTS.VOTE_UPDATE, handleVoteUpdate);
      socket.off(WS_EVENTS.VOTES_REVEALED, handleVotesRevealed);
      socket.off(WS_EVENTS.SESSION_ENDED, handleSessionEnded);
      socket.off(WS_EVENTS.KICKED, handleKicked);
      socket.off(WS_EVENTS.ERROR, handleError);
      // Do NOT reset joinedSessionRef here — StrictMode's intermediate cleanup
      // would cause a double join_session on the second mount.
    };
  }, [
    sessionId,
    participantId,
    hostKey,
    setSession,
    setParticipants,
    addParticipant,
    removeParticipant,
    updateParticipant,
    setCurrentNavigateUrl,
    setVotedParticipantIds,
    setRevealedVotes,
    setSavedVotesMap,
    clearVotingRound,
    reset,
    navigate,
  ]);

  // Note: we intentionally do NOT call disconnectSocket() on unmount.
  // The socket singleton should stay alive across the session lifetime.
  // disconnectSocket() is called only on explicit session end or page navigation away.

  return {
    socket: socketRef.current,
    isConnected,
  };
}
