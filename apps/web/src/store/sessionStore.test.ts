import type { Participant, Session } from '@tabpilot/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import { useSessionStore } from './sessionStore';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const makeSession = (overrides: Partial<Session> = {}): Session => ({
  id: 'session-1',
  name: 'Test Session',
  joinCode: 'ABC123',
  hostName: 'Host',
  urls: ['https://example.com', 'https://other.com'],
  currentIndex: 0,
  state: 'waiting',
  votingEnabled: false,
  isLocked: false,
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
  ...overrides,
});

const makeParticipant = (overrides: Partial<Participant> = {}): Participant => ({
  id: 'p-1',
  sessionId: 'session-1',
  name: 'Alice',
  avatarUrl: 'https://api.dicebear.com/...',
  isOnline: true,
  joinedAt: new Date().toISOString(),
  ...overrides,
});

// Reset the store before each test so tests are isolated.
beforeEach(() => {
  useSessionStore.getState().reset();
  // Also clear any localStorage keys we may have written.
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// setSession()
// ---------------------------------------------------------------------------
describe('setSession()', () => {
  it('updates the session state', () => {
    const session = makeSession();
    useSessionStore.getState().setSession(session);
    expect(useSessionStore.getState().session).toEqual(session);
  });

  it('can be set to null', () => {
    useSessionStore.getState().setSession(makeSession());
    useSessionStore.getState().setSession(null);
    expect(useSessionStore.getState().session).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// setParticipants()
// ---------------------------------------------------------------------------
describe('setParticipants()', () => {
  it('replaces the participant list entirely', () => {
    const p1 = makeParticipant({ id: 'p-1' });
    const p2 = makeParticipant({ id: 'p-2', name: 'Bob' });
    useSessionStore.getState().setParticipants([p1]);
    useSessionStore.getState().setParticipants([p2]);
    expect(useSessionStore.getState().participants).toEqual([p2]);
  });

  it('can set an empty list', () => {
    useSessionStore.getState().setParticipants([makeParticipant()]);
    useSessionStore.getState().setParticipants([]);
    expect(useSessionStore.getState().participants).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// addParticipant()
// ---------------------------------------------------------------------------
describe('addParticipant()', () => {
  it('appends a new participant', () => {
    const p1 = makeParticipant({ id: 'p-1' });
    const p2 = makeParticipant({ id: 'p-2', name: 'Bob' });
    useSessionStore.getState().addParticipant(p1);
    useSessionStore.getState().addParticipant(p2);
    expect(useSessionStore.getState().participants).toHaveLength(2);
  });

  it('updates an existing participant instead of duplicating', () => {
    const p = makeParticipant({ id: 'p-1', isOnline: false });
    useSessionStore.getState().addParticipant(p);
    const updated = { ...p, isOnline: true };
    useSessionStore.getState().addParticipant(updated);
    const state = useSessionStore.getState().participants;
    expect(state).toHaveLength(1);
    expect(state[0].isOnline).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// removeParticipant()
// ---------------------------------------------------------------------------
describe('removeParticipant()', () => {
  it('removes a participant by id', () => {
    const p1 = makeParticipant({ id: 'p-1' });
    const p2 = makeParticipant({ id: 'p-2', name: 'Bob' });
    useSessionStore.getState().setParticipants([p1, p2]);
    useSessionStore.getState().removeParticipant('p-1');
    const state = useSessionStore.getState().participants;
    expect(state).toHaveLength(1);
    expect(state[0].id).toBe('p-2');
  });

  it('is a no-op when the participant does not exist', () => {
    const p = makeParticipant({ id: 'p-1' });
    useSessionStore.getState().setParticipants([p]);
    useSessionStore.getState().removeParticipant('nonexistent');
    expect(useSessionStore.getState().participants).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// updateParticipant()
// ---------------------------------------------------------------------------
describe('updateParticipant()', () => {
  it('merges partial updates into the matching participant', () => {
    const p = makeParticipant({ id: 'p-1', isOnline: false });
    useSessionStore.getState().setParticipants([p]);
    useSessionStore.getState().updateParticipant('p-1', { isOnline: true });
    expect(useSessionStore.getState().participants[0].isOnline).toBe(true);
    // Other fields remain intact
    expect(useSessionStore.getState().participants[0].name).toBe('Alice');
  });

  it('leaves other participants untouched', () => {
    const p1 = makeParticipant({ id: 'p-1' });
    const p2 = makeParticipant({ id: 'p-2', name: 'Bob', isOnline: true });
    useSessionStore.getState().setParticipants([p1, p2]);
    useSessionStore.getState().updateParticipant('p-1', { isOnline: false });
    expect(useSessionStore.getState().participants[1].isOnline).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// reset()
// ---------------------------------------------------------------------------
describe('reset()', () => {
  it('clears session to null', () => {
    useSessionStore.getState().setSession(makeSession());
    useSessionStore.getState().reset();
    expect(useSessionStore.getState().session).toBeNull();
  });

  it('clears participants to empty array', () => {
    useSessionStore.getState().setParticipants([makeParticipant()]);
    useSessionStore.getState().reset();
    expect(useSessionStore.getState().participants).toHaveLength(0);
  });

  it('resets isHost to false', () => {
    useSessionStore.getState().setIsHost(true);
    useSessionStore.getState().reset();
    expect(useSessionStore.getState().isHost).toBe(false);
  });

  it('resets hostKey to null', () => {
    useSessionStore.getState().setHostKey('some-key');
    useSessionStore.getState().reset();
    expect(useSessionStore.getState().hostKey).toBeNull();
  });

  it('resets tabSyncEnabled to false', () => {
    useSessionStore.getState().setTabSyncEnabled(true);
    useSessionStore.getState().reset();
    expect(useSessionStore.getState().tabSyncEnabled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// localStorage persistence helpers
// ---------------------------------------------------------------------------
describe('saveHostKey() / loadHostKey()', () => {
  it('persists hostKey under the correct localStorage key', () => {
    useSessionStore.getState().saveHostKey('session-abc', 'my-secret-key');
    expect(localStorage.getItem('tabpilot_host_session-abc')).toBe('my-secret-key');
  });

  it('loadHostKey returns the stored key', () => {
    useSessionStore.getState().saveHostKey('session-abc', 'my-secret-key');
    const loaded = useSessionStore.getState().loadHostKey('session-abc');
    expect(loaded).toBe('my-secret-key');
  });

  it('loadHostKey returns null for unknown session', () => {
    const loaded = useSessionStore.getState().loadHostKey('unknown-session');
    expect(loaded).toBeNull();
  });
});

describe('saveParticipantId() / loadParticipantId()', () => {
  it('persists participantId under the correct localStorage key', () => {
    useSessionStore.getState().saveParticipantId('session-abc', 'p-999');
    expect(localStorage.getItem('tabpilot_participant_session-abc')).toBe('p-999');
  });

  it('loadParticipantId returns the stored id', () => {
    useSessionStore.getState().saveParticipantId('session-abc', 'p-999');
    const loaded = useSessionStore.getState().loadParticipantId('session-abc');
    expect(loaded).toBe('p-999');
  });

  it('loadParticipantId returns null for unknown session', () => {
    const loaded = useSessionStore.getState().loadParticipantId('unknown-session');
    expect(loaded).toBeNull();
  });
});
