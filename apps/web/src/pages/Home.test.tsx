import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSessionStore } from '@/store/sessionStore';
import { Home } from './Home';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
  useNavigate: () => mockNavigate,
}));

vi.mock('@/lib/api', () => ({
  getSessionByCode: vi.fn().mockResolvedValue({ id: 'session-1' }),
  deleteSession: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/components/ThemeToggle', () => ({
  ThemeToggle: () => <button type="button">Toggle theme</button>,
}));

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: new Proxy(
    {},
    {
      get:
        (_t, tag: string) =>
        ({ children, className, ...rest }: React.HTMLAttributes<HTMLElement>) =>
          React.createElement(tag, { className, ...rest }, children),
    },
  ),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

import React from 'react';

const FUTURE = new Date(Date.now() + 86_400_000 * 7).toISOString();
const NOW = new Date().toISOString();

function seedParticipantSession(joinCode = 'ABC123') {
  const raw = JSON.stringify([
    {
      sessionId: 'session-p1',
      name: 'Sprint Grooming',
      joinCode,
      urlCount: 3,
      expiresAt: FUTURE,
      createdAt: NOW,
      role: 'participant',
      participantId: 'p1',
    },
  ]);
  localStorage.setItem('tabpilot_saved_sessions', raw);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Home page', () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockClear();
    useSessionStore.setState(useSessionStore.getInitialState?.() ?? {});
  });

  it('renders the hero headline', () => {
    render(<Home />);
    expect(screen.getByRole('heading', { name: /zero friction/i })).toBeInTheDocument();
  });

  it('renders features, how it works, and FAQ sections', () => {
    render(<Home />);
    expect(screen.getByText(/Real-time sync/i)).toBeInTheDocument();
    expect(screen.getByText(/How it works/i)).toBeInTheDocument();
    expect(screen.getByText(/Common questions/i)).toBeInTheDocument();
  });

  it('renders social proof spans in the hero', () => {
    render(<Home />);
    expect(screen.getByText('No account required')).toBeInTheDocument();
    expect(screen.getByText('Free to use')).toBeInTheDocument();
    expect(screen.getByText('Any tool works')).toBeInTheDocument();
  });

  it('shows saved sessions section when sessions exist', () => {
    seedParticipantSession();
    render(<Home />);
    expect(screen.getByText('Sprint Grooming')).toBeInTheDocument();
    expect(screen.getByText(/1 session/)).toBeInTheDocument();
  });

  it('removes a participant session when the server returns 404', async () => {
    const { getSessionByCode } = await import('@/lib/api');
    vi.mocked(getSessionByCode).mockRejectedValueOnce(new Error('Not found'));

    seedParticipantSession('XYZ999');
    render(<Home />);

    // The session card is visible initially
    expect(screen.getByText('Sprint Grooming')).toBeInTheDocument();

    // After verifySession rejects, the card should disappear
    await waitFor(() => {
      expect(screen.queryByText('Sprint Grooming')).not.toBeInTheDocument();
    });
  });

  it('renders testimonial carousel dots', () => {
    render(<Home />);
    const dots = screen.getAllByRole('button', { name: /go to testimonial/i });
    expect(dots.length).toBeGreaterThan(0);
  });

  it('renders FAQ items', () => {
    render(<Home />);
    expect(screen.getByText(/Why do I need to enable tab sync/i)).toBeInTheDocument();
  });
});
