import type { Participant, Session } from './types';

// ─── Client → Server ──────────────────────────────────────────────────────────

export interface JoinSessionPayload {
  sessionId: string;
  participantId?: string;
  hostKey?: string;
}

export interface HostStartSessionPayload {
  sessionId: string;
  hostKey: string;
}

export interface HostNavigatePayload {
  sessionId: string;
  hostKey: string;
  direction?: 'next' | 'prev';
  index?: number;
}

export interface HostOpenUrlPayload {
  sessionId: string;
  hostKey: string;
  url: string;
}

export interface HostEndSessionPayload {
  sessionId: string;
  hostKey: string;
}

export interface HostAddUrlPayload {
  sessionId: string;
  hostKey: string;
  url: string;
}

export interface HostToggleLockPayload {
  sessionId: string;
  hostKey: string;
  locked: boolean;
}

export interface HostKickParticipantPayload {
  sessionId: string;
  hostKey: string;
  participantId: string;
}

export interface HostRemoveUrlPayload {
  sessionId: string;
  hostKey: string;
  /** Index of the URL to remove */
  index: number;
}

export interface HostReorderUrlsPayload {
  sessionId: string;
  hostKey: string;
  fromIndex: number;
  toIndex: number;
}

export interface SubmitVotePayload {
  sessionId: string;
  participantId: string;
  value: string;
}

export interface HostRevealVotesPayload {
  sessionId: string;
  hostKey: string;
}

// ─── Server → Client ──────────────────────────────────────────────────────────

export interface SessionStatePayload {
  session: Session;
  participants: Participant[];
  /** Participant IDs who have voted in the current round (values hidden until revealed) */
  hasVoted?: string[];
  /** Average vote per URL index for past tickets */
  savedVotes?: Record<number, string>;
}

export interface ParticipantJoinedPayload {
  participant: Participant;
}

export interface ParticipantLeftPayload {
  participantId: string;
}

export interface ParticipantOnlinePayload {
  participantId: string;
  isOnline: boolean;
}

export interface SessionStartedPayload {
  currentUrl: string;
  currentIndex: number;
  total: number;
}

export interface NavigateToPayload {
  url: string;
  index: number;
  total: number;
  /** Average vote per URL index — updated after each navigation */
  savedVotes?: Record<number, string>;
}

export interface OpenTabPayload {
  url: string;
}

/**
 * Broadcast when any participant votes. Only reveals WHO has voted,
 * not the actual values — values are hidden until the host reveals them.
 */
export interface VoteUpdatePayload {
  hasVoted: string[]; // participant IDs who have voted this round
}

/**
 * Broadcast by the host to reveal all votes at once.
 */
export interface VotesRevealedPayload {
  votes: Record<string, string>; // participantId → value
  average: string; // computed average (numeric mean or mode of non-numeric values)
}

export interface WsErrorPayload {
  message: string;
  code: string;
}

// ─── Event name constants ─────────────────────────────────────────────────────

export const WS_EVENTS = {
  // Client → Server
  JOIN_SESSION: 'join_session',
  HOST_START_SESSION: 'host_start_session',
  HOST_NAVIGATE: 'host_navigate',
  HOST_OPEN_URL: 'host_open_url',
  HOST_END_SESSION: 'host_end_session',
  HOST_ADD_URL: 'host_add_url',
  HOST_TOGGLE_LOCK: 'host_toggle_lock',
  HOST_KICK_PARTICIPANT: 'host_kick_participant',
  HOST_REMOVE_URL: 'host_remove_url',
  HOST_REORDER_URLS: 'host_reorder_urls',
  SUBMIT_VOTE: 'submit_vote',
  HOST_REVEAL_VOTES: 'host_reveal_votes',
  LEAVE_SESSION: 'leave_session',

  // Server → Client
  SESSION_STATE: 'session_state',
  PARTICIPANT_JOINED: 'participant_joined',
  PARTICIPANT_LEFT: 'participant_left',
  PARTICIPANT_ONLINE: 'participant_online',
  SESSION_STARTED: 'session_started',
  NAVIGATE_TO: 'navigate_to',
  OPEN_TAB: 'open_tab',
  SESSION_ENDED: 'session_ended',
  KICKED: 'kicked',
  VOTE_UPDATE: 'vote_update',
  VOTES_REVEALED: 'votes_revealed',
  ERROR: 'error',
} as const;
