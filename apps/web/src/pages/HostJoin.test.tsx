import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSessionStore } from '@/store/sessionStore';
import { HostJoin } from './HostJoin';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockNavigate = vi.fn();
const mockMutate = vi.fn();
let mockMutationState = { isPending: false, isError: false, error: null as Error | null };

vi.mock('react-router-dom', () => ({
  useParams: () => ({ sessionId: 'session-1' }),
  useNavigate: () => mockNavigate,
  useSearchParams: () => [new URLSearchParams({ key: 'invite-key-123' })],
}));

vi.mock('@tanstack/react-query', () => ({
  useMutation: ({
    onSuccess,
    onError,
  }: {
    onSuccess?: (r: unknown) => void;
    onError?: (e: Error) => void;
  }) => ({
    mutate: () => mockMutate({ onSuccess, onError }),
    ...mockMutationState,
  }),
}));

vi.mock('@/lib/api', () => ({ joinAsCoHost: vi.fn() }));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('HostJoin', () => {
  beforeEach(() => {
    useSessionStore.getState().reset();
    mockNavigate.mockClear();
    mockMutate.mockClear();
    mockMutationState = { isPending: false, isError: false, error: null };
  });

  it('renders the Join as Co-Host heading', () => {
    render(<HostJoin />);
    expect(screen.getByRole('heading', { name: /join as co-host/i })).toBeInTheDocument();
  });

  it('shows name and email fields', () => {
    render(<HostJoin />);
    expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('shows an error when submitting without a name', async () => {
    render(<HostJoin />);
    await userEvent.click(screen.getByRole('button', { name: /join as co-host/i }));
    expect(screen.getByText('Your name is required')).toBeInTheDocument();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('shows error for name exceeding 50 characters', async () => {
    render(<HostJoin />);
    await userEvent.type(screen.getByLabelText(/your name/i), 'a'.repeat(51));
    await userEvent.click(screen.getByRole('button', { name: /join as co-host/i }));
    expect(screen.getByText(/50 characters or fewer/i)).toBeInTheDocument();
  });

  it('calls mutate when name is valid', async () => {
    render(<HostJoin />);
    await userEvent.type(screen.getByLabelText(/your name/i), 'Alice');
    await userEvent.click(screen.getByRole('button', { name: /join as co-host/i }));
    expect(mockMutate).toHaveBeenCalled();
  });

  it('renders the join form when key is present in the URL', () => {
    render(<HostJoin />);
    // Key present → form is shown, not the invalid-link screen
    expect(screen.getByRole('heading', { name: /join as co-host/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /join as co-host/i })).toBeInTheDocument();
  });

  it('shows disabled join button while mutation is pending', () => {
    mockMutationState = { isPending: true, isError: false, error: null };
    render(<HostJoin />);
    const btn = screen.getByRole('button', { name: /joining/i });
    expect(btn).toBeDisabled();
  });
});

describe('HostJoin — mutation callbacks', () => {
  beforeEach(() => {
    useSessionStore.getState().reset();
    mockNavigate.mockClear();
    mockMutate.mockClear();
    mockMutationState = { isPending: false, isError: false, error: null };
  });

  it('navigates to host dashboard on successful join', async () => {
    const fakeRes = {
      session: {
        id: 'sess-abc',
        name: 'S',
        joinCode: 'XYZ',
        hostName: 'H',
        coHosts: [],
        urls: [],
        currentIndex: 0,
        state: 'waiting',
        votingEnabled: false,
        isLocked: false,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      },
      hostKey: 'hk-abc',
    };
    mockMutate.mockImplementation(({ onSuccess }: { onSuccess?: (r: typeof fakeRes) => void }) => {
      onSuccess?.(fakeRes);
    });

    render(<HostJoin />);
    await userEvent.type(screen.getByLabelText(/your name/i), 'Alice');
    await userEvent.click(screen.getByRole('button', { name: /join as co-host/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/host/sess-abc');
  });

  it('shows a toast on join error', async () => {
    mockMutate.mockImplementation(({ onError }: { onError?: (e: Error) => void }) => {
      onError?.(new Error('Invalid invite key'));
    });
    const toast = (await import('react-hot-toast')).default;

    render(<HostJoin />);
    await userEvent.type(screen.getByLabelText(/your name/i), 'Bob');
    await userEvent.click(screen.getByRole('button', { name: /join as co-host/i }));

    expect(toast.error).toHaveBeenCalledWith('Invalid invite key');
  });
});
