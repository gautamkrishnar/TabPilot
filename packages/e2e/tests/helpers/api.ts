// REST API helpers for E2E setup and teardown.

const API_URL = process.env.API_URL ?? 'http://localhost:3000';

export interface SessionFixture {
  sessionId: string;
  joinCode: string;
  name: string;
  urls: string[];
  expiresAt: string;
  createdAt: string;
  hostKey: string;
  hostInviteKey: string;
}

interface RawCreateResponse {
  session: {
    id: string;
    joinCode: string;
    name: string;
    urls: string[];
    state: string;
    currentIndex: number;
    votingEnabled: boolean;
    isLocked: boolean;
    hostName: string;
    expiresAt: string;
    createdAt: string;
    coHosts: unknown[];
  };
  hostKey: string;
  hostInviteKey: string;
}

/**
 * Creates a session via the REST API and returns a flat fixture object
 * ready to use in tests (or to seed browser localStorage).
 */
export async function createSession(opts: {
  name: string;
  hostName: string;
  urls: string[];
  votingEnabled?: boolean;
  expiryDays?: number;
}): Promise<SessionFixture> {
  const res = await fetch(`${API_URL}/api/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: opts.name,
      hostName: opts.hostName,
      urls: opts.urls,
      votingEnabled: opts.votingEnabled ?? false,
      expiryDays: opts.expiryDays ?? 1,
    }),
  });

  if (!res.ok) {
    throw new Error(`createSession: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as RawCreateResponse;
  return {
    sessionId: data.session.id,
    joinCode: data.session.joinCode,
    name: data.session.name,
    urls: data.session.urls,
    expiresAt: data.session.expiresAt,
    createdAt: data.session.createdAt,
    hostKey: data.hostKey,
    hostInviteKey: data.hostInviteKey,
  };
}

/** Deletes a session via the REST API — used in afterEach cleanup. */
export async function deleteSession(sessionId: string, hostKey: string): Promise<void> {
  const url = `${API_URL}/api/sessions/${sessionId}?hostKey=${encodeURIComponent(hostKey)}`;
  const res = await fetch(url, { method: 'DELETE' });
  // 404 is fine — session may have already been deleted by the test
  if (!res.ok && res.status !== 404) {
    throw new Error(`deleteSession: ${res.status}`);
  }
}
