import type { Session } from '@tabpilot/shared';
import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSessionStore } from '@/store/sessionStore';
import { ParticipantView } from './ParticipantView';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Capture the onGroomingComplete callback passed to useSocket so tests can
// invoke it to simulate the server event arriving.
// The `mock` prefix is required for Vitest to hoist the variable correctly.
let mockOnGroomingComplete: (() => void) | undefined;

vi.mock('@/hooks/useSocket', () => ({
  useSocket: (opts: { onGroomingComplete?: () => void }) => {
    mockOnGroomingComplete = opts?.onGroomingComplete;
    return { isConnected: true };
  },
}));

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ sessionId: 'session-1' }),
  useNavigate: () => vi.fn(),
}));

vi.mock('@/hooks/useTabSync', () => ({
  useTabSync: () => ({ navigateTo: vi.fn(), isEnabled: false }),
}));

vi.mock('@/hooks/useCurrentTitle', () => ({
  useCurrentTitle: () => 'Test Ticket Title',
}));

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, className }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className}>{children}</div>
    ),
    aside: ({ children, className }: React.HTMLAttributes<HTMLElement>) => (
      <aside className={className}>{children}</aside>
    ),
    span: ({ children }: React.HTMLAttributes<HTMLSpanElement>) => <span>{children}</span>,
  },
}));

vi.mock('@/components/UserAvatarMenu', () => ({
  UserAvatarMenu: () => <div data-testid="user-avatar-menu" />,
}));

vi.mock('@/components/TabSyncToggle', () => ({
  TabSyncToggle: () => <div data-testid="tab-sync-toggle" />,
}));

vi.mock('@/components/ParticipantList', () => ({
  ParticipantList: () => <div data-testid="participant-list" />,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeSession = (overrides: Partial<Session> = {}): Session => ({
  id: 'session-1',
  name: 'Sprint Grooming',
  joinCode: 'ABC123',
  hostName: 'Host',
  coHosts: [],
  urls: ['https://example.com/issue/1'],
  currentIndex: 0,
  state: 'active',
  votingEnabled: false,
  isLocked: false,
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
  ...overrides,
});

function seedParticipantState() {
  const store = useSessionStore.getState();
  store.setSession(makeSession());
  store.setParticipantId('p-1');
  localStorage.setItem('tabpilot_participant_session-1', 'p-1');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ParticipantView — grooming complete', () => {
  beforeEach(() => {
    useSessionStore.getState().reset();
    mockOnGroomingComplete = undefined;
    localStorage.clear();
    seedParticipantState();
  });

  it('does not show the grooming complete banner initially', () => {
    render(<ParticipantView />);

    expect(screen.queryByText('All tickets groomed!')).not.toBeInTheDocument();
  });

  it('shows the grooming complete banner after onGroomingComplete fires', async () => {
    render(<ParticipantView />);

    act(() => {
      mockOnGroomingComplete?.();
    });

    expect(screen.getByText('All tickets groomed!')).toBeInTheDocument();
    expect(screen.getByText('The host has completed grooming.')).toBeInTheDocument();
  });

  it('fires confetti when onGroomingComplete is called', async () => {
    const confettiMock = vi.mocked((await import('canvas-confetti')).default);
    confettiMock.mockClear();

    render(<ParticipantView />);

    act(() => {
      mockOnGroomingComplete?.();
    });

    expect(confettiMock).toHaveBeenCalledWith(expect.objectContaining({ particleCount: 160 }));
  });

  it('shows a success toast when onGroomingComplete is called', async () => {
    const toast = (await import('react-hot-toast')).default;
    render(<ParticipantView />);

    act(() => {
      mockOnGroomingComplete?.();
    });

    expect(toast.success).toHaveBeenCalledWith(
      'All tickets groomed!',
      expect.objectContaining({ icon: '🎉' }),
    );
  });

  it('passes onGroomingComplete callback to useSocket', () => {
    render(<ParticipantView />);

    expect(mockOnGroomingComplete).toBeTypeOf('function');
  });
});
