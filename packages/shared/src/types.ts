export type SessionState = 'waiting' | 'active' | 'ended';

export interface Session {
  id: string;
  name: string;
  joinCode: string;
  hostName: string;
  hostEmail?: string;
  urls: string[];
  currentIndex: number;
  state: SessionState;
  votingEnabled: boolean;
  isLocked: boolean;
  createdAt: string;
  expiresAt: string;
}

export interface Participant {
  id: string;
  sessionId: string;
  name: string;
  email?: string;
  avatarUrl: string;
  isOnline: boolean;
  joinedAt: string;
}

export interface CreateSessionDto {
  name: string;
  hostName: string;
  hostEmail?: string;
  urls: string[];
  expiryDays: number;
  votingEnabled?: boolean;
}

export interface CreateSessionResponse {
  session: Session;
  hostKey: string;
}

export interface JoinSessionResponse {
  session: Session;
  participant: Participant;
}
