import type { Session } from '@tabpilot/shared';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

const mockEmit = vi.fn();
vi.mock('@/lib/socket', () => ({ getSocket: () => ({ emit: mockEmit }) }));

describe('ParticipantView — voting UI', () => {
  beforeEach(() => {
    useSessionStore.getState().reset();
    localStorage.clear();
    mockEmit.mockClear();
    const store = useSessionStore.getState();
    store.setSession({
      ...makeSession({ votingEnabled: true }),
    });
    store.setParticipantId('p-1');
    localStorage.setItem('tabpilot_participant_session-1', 'p-1');
  });

  it('shows vote buttons when voting is enabled and votes are not revealed', () => {
    render(<ParticipantView />);
    expect(screen.getByRole('button', { name: '5' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '8' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '?' })).toBeInTheDocument();
  });

  it('does not show vote buttons when voting is disabled', () => {
    useSessionStore.getState().setSession(makeSession({ votingEnabled: false }));
    render(<ParticipantView />);
    expect(screen.queryByRole('button', { name: '5' })).not.toBeInTheDocument();
  });

  it('emits SUBMIT_VOTE with the selected value when a vote button is clicked', async () => {
    render(<ParticipantView />);
    await userEvent.click(screen.getByRole('button', { name: '5' }));
    expect(mockEmit).toHaveBeenCalledWith(
      'submit_vote',
      expect.objectContaining({ sessionId: 'session-1', participantId: 'p-1', value: '5' }),
    );
  });

  it('shows "You voted" badge after voting', async () => {
    render(<ParticipantView />);
    await userEvent.click(screen.getByRole('button', { name: '8' }));
    expect(screen.getByText(/you voted: 8/i)).toBeInTheDocument();
  });

  it('hides vote buttons and shows revealed results when votes are revealed', () => {
    useSessionStore.getState().setRevealedVotes({ 'p-1': '5', 'p-2': '8' });
    render(<ParticipantView />);
    expect(screen.queryByRole('button', { name: '5' })).not.toBeInTheDocument();
    expect(screen.getByText('Results')).toBeInTheDocument();
  });

  it('shows "Already voted" badge when navigating back to a ticket already voted on', () => {
    useSessionStore.getState().setVotedParticipantIds(['p-1']);
    render(<ParticipantView />);
    expect(screen.getByText('Already voted')).toBeInTheDocument();
  });

  it('clears selected vote when host resets votes', async () => {
    render(<ParticipantView />);
    await userEvent.click(screen.getByRole('button', { name: '8' }));
    expect(screen.getByText(/you voted: 8/i)).toBeInTheDocument();

    act(() => {
      useSessionStore.getState().setVotedParticipantIds([]);
      useSessionStore.getState().setRevealedVotes(null);
    });

    expect(screen.queryByText(/you voted/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '8' })).toBeInTheDocument();
  });
});

describe('ParticipantView — revealed votes display', () => {
  beforeEach(() => {
    useSessionStore.getState().reset();
    localStorage.clear();
    const store = useSessionStore.getState();
    store.setSession(makeSession({ votingEnabled: true }));
    store.setParticipantId('p-1');
    localStorage.setItem('tabpilot_participant_session-1', 'p-1');
  });

  it('shows the results section with participant votes', () => {
    useSessionStore.getState().setRevealedVotes({ 'p-1': '5', 'p-2': '8' });
    render(<ParticipantView />);
    expect(screen.getByText('Results')).toBeInTheDocument();
  });

  it('shows the computed average when numeric votes exist', () => {
    useSessionStore.getState().setRevealedVotes({ 'p-1': '4', 'p-2': '8' });
    render(<ParticipantView />);
    // average of 4 and 8 is 6
    expect(screen.getByText(/avg.*6/i)).toBeInTheDocument();
  });

  it('shows the session state header with current URL info', () => {
    render(<ParticipantView />);
    expect(screen.getByText('Test Ticket Title')).toBeInTheDocument();
  });

  it('shows the current ticket position when session is active', () => {
    useSessionStore
      .getState()
      .setSession(makeSession({ urls: ['https://a.com', 'https://b.com'], currentIndex: 0 }));
    render(<ParticipantView />);
    // ParticipantView shows "Current ticket — 1 / 2"
    expect(screen.getByText(/current ticket/i)).toBeInTheDocument();
  });
});

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

  it('hides completion banner when a new URL is added after grooming complete', () => {
    render(<ParticipantView />);

    act(() => {
      mockOnGroomingComplete?.();
    });

    expect(screen.getByText('All tickets groomed!')).toBeInTheDocument();

    // Simulate server pushing SESSION_STATE with an extra URL added
    act(() => {
      useSessionStore.getState().setSession(
        makeSession({
          urls: ['https://example.com/issue/1', 'https://example.com/issue/2'],
          currentIndex: 0,
        }),
      );
    });

    expect(screen.queryByText('All tickets groomed!')).not.toBeInTheDocument();
  });
});
