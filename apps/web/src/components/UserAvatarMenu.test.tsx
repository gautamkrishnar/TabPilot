import type { Participant, Session } from '@tabpilot/shared';
import { WS_EVENTS } from '@tabpilot/shared';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSessionStore } from '@/store/sessionStore';
import { UserAvatarMenu } from './UserAvatarMenu';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockEmit = vi.fn();
vi.mock('@/lib/socket', () => ({
  getSocketInstance: () => ({ emit: mockEmit }),
}));

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const makeSession = (overrides: Partial<Session> = {}): Session => ({
  id: 'session-1',
  name: 'Test Session',
  joinCode: 'ABC123',
  hostName: 'Grace',
  hostEmail: 'grace@example.com',
  urls: [],
  currentIndex: 0,
  state: 'active',
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
  email: 'alice@example.com',
  avatarUrl: 'https://api.dicebear.com/...',
  isOnline: true,
  joinedAt: new Date().toISOString(),
  ...overrides,
});

function setupParticipantState() {
  const store = useSessionStore.getState();
  store.setSession(makeSession());
  store.setParticipants([makeParticipant()]);
  store.setParticipantId('p-1');
  store.setIsHost(false);
}

function setupHostState() {
  const store = useSessionStore.getState();
  store.setSession(makeSession());
  store.setParticipants([]);
  store.setParticipantId(null);
  store.setIsHost(true);
  store.setHostKey('host-key-123');
}

beforeEach(() => {
  useSessionStore.getState().reset();
  mockEmit.mockClear();
});

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
describe('UserAvatarMenu rendering', () => {
  it('renders nothing when there is no session', () => {
    const { container } = render(<UserAvatarMenu />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when session exists but user has no role', () => {
    useSessionStore.getState().setSession(makeSession());
    const { container } = render(<UserAvatarMenu />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the avatar button for a participant', () => {
    setupParticipantState();
    render(<UserAvatarMenu />);
    expect(screen.getByRole('button', { name: /your profile/i })).toBeInTheDocument();
  });

  it('renders the avatar button for a host', () => {
    setupHostState();
    render(<UserAvatarMenu />);
    expect(screen.getByRole('button', { name: /your profile/i })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Dropdown open / close
// ---------------------------------------------------------------------------
describe('dropdown open/close', () => {
  it('opens the dropdown on avatar click', async () => {
    setupParticipantState();
    const user = userEvent.setup();
    render(<UserAvatarMenu />);

    await user.click(screen.getByRole('button', { name: /your profile/i }));

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Participant')).toBeInTheDocument();
  });

  it('shows Host badge when user is the host', async () => {
    setupHostState();
    const user = userEvent.setup();
    render(<UserAvatarMenu />);

    await user.click(screen.getByRole('button', { name: /your profile/i }));

    expect(screen.getByText('Grace')).toBeInTheDocument();
    expect(screen.getByText('Host')).toBeInTheDocument();
  });

  it('shows Edit profile button when dropdown is open', async () => {
    setupParticipantState();
    const user = userEvent.setup();
    render(<UserAvatarMenu />);

    await user.click(screen.getByRole('button', { name: /your profile/i }));

    expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Edit form
// ---------------------------------------------------------------------------
describe('edit form', () => {
  it('pre-fills name and email when Edit profile is clicked', async () => {
    setupParticipantState();
    const user = userEvent.setup();
    render(<UserAvatarMenu />);

    await user.click(screen.getByRole('button', { name: /your profile/i }));
    await user.click(screen.getByRole('button', { name: /edit profile/i }));

    expect(screen.getByLabelText('Name')).toHaveValue('Alice');
    expect(screen.getByLabelText(/email/i)).toHaveValue('alice@example.com');
  });

  it('Cancel restores the view mode without emitting', async () => {
    setupParticipantState();
    const user = userEvent.setup();
    render(<UserAvatarMenu />);

    await user.click(screen.getByRole('button', { name: /your profile/i }));
    await user.click(screen.getByRole('button', { name: /edit profile/i }));
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('Save emits UPDATE_PARTICIPANT_PROFILE for a participant', async () => {
    setupParticipantState();
    const user = userEvent.setup();
    render(<UserAvatarMenu />);

    await user.click(screen.getByRole('button', { name: /your profile/i }));
    await user.click(screen.getByRole('button', { name: /edit profile/i }));

    const nameInput = screen.getByLabelText('Name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Alicia');

    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(mockEmit).toHaveBeenCalledWith(
      WS_EVENTS.UPDATE_PARTICIPANT_PROFILE,
      expect.objectContaining({
        sessionId: 'session-1',
        participantId: 'p-1',
        name: 'Alicia',
      }),
    );
  });

  it('Save emits UPDATE_HOST_PROFILE for the host', async () => {
    setupHostState();
    const user = userEvent.setup();
    render(<UserAvatarMenu />);

    await user.click(screen.getByRole('button', { name: /your profile/i }));
    await user.click(screen.getByRole('button', { name: /edit profile/i }));

    const nameInput = screen.getByLabelText('Name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Grace Updated');

    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(mockEmit).toHaveBeenCalledWith(
      WS_EVENTS.UPDATE_HOST_PROFILE,
      expect.objectContaining({
        sessionId: 'session-1',
        hostKey: 'host-key-123',
        name: 'Grace Updated',
      }),
    );
  });

  it('Save button is disabled when name is empty', async () => {
    setupParticipantState();
    const user = userEvent.setup();
    render(<UserAvatarMenu />);

    await user.click(screen.getByRole('button', { name: /your profile/i }));
    await user.click(screen.getByRole('button', { name: /edit profile/i }));

    const nameInput = screen.getByLabelText('Name');
    await user.clear(nameInput);

    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
  });

  it('Escape key cancels the edit', async () => {
    setupParticipantState();
    const user = userEvent.setup();
    render(<UserAvatarMenu />);

    await user.click(screen.getByRole('button', { name: /your profile/i }));
    await user.click(screen.getByRole('button', { name: /edit profile/i }));
    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
    });
  });

  it('Enter key submits the form', async () => {
    setupParticipantState();
    const user = userEvent.setup();
    render(<UserAvatarMenu />);

    await user.click(screen.getByRole('button', { name: /your profile/i }));
    await user.click(screen.getByRole('button', { name: /edit profile/i }));
    await user.keyboard('{Enter}');

    expect(mockEmit).toHaveBeenCalledWith(
      WS_EVENTS.UPDATE_PARTICIPANT_PROFILE,
      expect.objectContaining({ name: 'Alice' }),
    );
  });
});
