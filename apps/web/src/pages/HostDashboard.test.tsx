import type { Session } from '@tabpilot/shared';
import { WS_EVENTS } from '@tabpilot/shared';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSessionStore } from '@/store/sessionStore';
import { HostDashboard } from './HostDashboard';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockEmit = vi.fn();
const mockNavigate = vi.fn();

vi.mock('@/lib/socket', () => ({
  getSocket: () => ({ emit: mockEmit }),
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ sessionId: 'session-1' }),
  useNavigate: () => mockNavigate,
}));

vi.mock('@/hooks/useSocket', () => ({
  useSocket: () => ({ isConnected: true }),
}));

vi.mock('@/hooks/useJiraIssue', () => ({
  useJiraIssue: () => ({ data: null }),
}));

vi.mock('@/hooks/useUrlTitle', () => ({
  useUrlTitle: () => ({ data: null }),
}));

vi.mock('@/hooks/useTabSync', () => ({
  useTabSync: () => ({ navigateTo: vi.fn(), isEnabled: false }),
}));

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, className }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className}>{children}</div>
    ),
  },
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

function seedHostState() {
  const store = useSessionStore.getState();
  store.setSession(makeSession());
  store.setIsHost(true);
  store.setHostKey('host-key-123');
  store.saveHostKey('session-1', 'host-key-123');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('HostDashboard — end session modal', () => {
  beforeEach(() => {
    useSessionStore.setState(useSessionStore.getInitialState?.() ?? {});
    mockEmit.mockClear();
    mockNavigate.mockClear();
    seedHostState();
  });

  it('opens the confirm modal when "End" is clicked', async () => {
    render(<HostDashboard />);

    await userEvent.click(screen.getAllByRole('button', { name: /end/i })[0]);

    expect(screen.getByText('End session?')).toBeInTheDocument();
    expect(screen.getByText(/this will disconnect all participants/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /end session/i })).toBeInTheDocument();
  });

  it('closes the modal without ending when Cancel is clicked', async () => {
    render(<HostDashboard />);

    await userEvent.click(screen.getAllByRole('button', { name: /end/i })[0]);
    expect(screen.getByText('End session?')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(screen.queryByText('End session?')).not.toBeInTheDocument();
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('emits HOST_END_SESSION and navigates home when confirmed', async () => {
    render(<HostDashboard />);

    await userEvent.click(screen.getAllByRole('button', { name: /end/i })[0]);
    await userEvent.click(screen.getByRole('button', { name: /end session/i }));

    await waitFor(() => {
      expect(mockEmit).toHaveBeenCalledWith(WS_EVENTS.HOST_END_SESSION, {
        sessionId: 'session-1',
        hostKey: 'host-key-123',
      });
    });
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('closes the modal by clicking the X button', async () => {
    render(<HostDashboard />);

    await userEvent.click(screen.getAllByRole('button', { name: /end/i })[0]);
    expect(screen.getByText('End session?')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /close/i }));

    expect(screen.queryByText('End session?')).not.toBeInTheDocument();
  });
});
