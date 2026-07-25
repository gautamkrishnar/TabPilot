import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('axios', () => {
  const mockAxios = {
    create: vi.fn(() => mockInstance),
  };
  const mockInstance = {
    post: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      response: { use: vi.fn() },
    },
  };
  return { default: mockAxios };
});

// Re-import after mock so we get the mocked version
vi.mock('@/lib/api', async () => {
  const axiosMod = await import('axios');
  const mockInstance = {
    post: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
    interceptors: { response: { use: vi.fn() } },
  };
  (axiosMod.default.create as ReturnType<typeof vi.fn>).mockReturnValue(mockInstance);

  const mod = await import('./api');
  return { ...mod, default: mockInstance };
});

import apiClient, {
  createSession,
  deleteSession,
  getSession,
  getSessionByCode,
  joinAsCoHost,
  joinSession,
} from '@/lib/api';

const mockPost = apiClient.post as ReturnType<typeof vi.fn>;
const mockGet = apiClient.get as ReturnType<typeof vi.fn>;
const mockDelete = apiClient.delete as ReturnType<typeof vi.fn>;

describe('api client functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createSession posts to /sessions and returns data', async () => {
    const response = { id: 'sess-1', joinCode: 'ABC123' };
    mockPost.mockResolvedValue({ data: response });
    const result = await createSession({
      name: 'Test',
      hostName: 'Host',
      urls: [],
      expiryDays: 7,
      votingEnabled: false,
    });
    expect(mockPost).toHaveBeenCalledWith('/sessions', expect.any(Object));
    expect(result).toEqual(response);
  });

  it('getSession gets from /sessions/:id and returns data', async () => {
    const session = { id: 'sess-1' };
    mockGet.mockResolvedValue({ data: session });
    const result = await getSession('sess-1');
    expect(mockGet).toHaveBeenCalledWith('/sessions/sess-1');
    expect(result).toEqual(session);
  });

  it('getSessionByCode gets from /sessions/code/:code', async () => {
    const session = { id: 'sess-1', joinCode: 'ABC123' };
    mockGet.mockResolvedValue({ data: session });
    const result = await getSessionByCode('ABC123');
    expect(mockGet).toHaveBeenCalledWith('/sessions/code/ABC123');
    expect(result).toEqual(session);
  });

  it('joinSession posts to /sessions/:id/join', async () => {
    const response = { participant: { id: 'p-1', name: 'Alice' } };
    mockPost.mockResolvedValue({ data: response });
    const result = await joinSession('sess-1', 'Alice', 'alice@example.com');
    expect(mockPost).toHaveBeenCalledWith('/sessions/sess-1/join', {
      name: 'Alice',
      email: 'alice@example.com',
    });
    expect(result).toEqual(response);
  });

  it('deleteSession sends DELETE with hostKey', async () => {
    mockDelete.mockResolvedValue({ data: undefined });
    await deleteSession('sess-1', 'host-key-123');
    expect(mockDelete).toHaveBeenCalledWith('/sessions/sess-1', {
      data: { hostKey: 'host-key-123' },
    });
  });

  it('joinAsCoHost posts to /sessions/:id/hosts/join', async () => {
    const response = { coHostKey: 'co-key', session: {} };
    mockPost.mockResolvedValue({ data: response });
    const result = await joinAsCoHost('sess-1', 'invite-key', 'Co Host', 'co@example.com');
    expect(mockPost).toHaveBeenCalledWith('/sessions/sess-1/hosts/join', {
      inviteKey: 'invite-key',
      name: 'Co Host',
      email: 'co@example.com',
    });
    expect(result).toEqual(response);
  });
});
