import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { JoinCodeDisplay } from './JoinCodeDisplay';

vi.mock('@/lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils')>();
  return {
    ...actual,
    getJoinUrl: (code: string) => `http://localhost/join?code=${code}`,
    copyToClipboard: vi.fn(),
  };
});

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn() } }));

describe('JoinCodeDisplay', () => {
  it('renders each character of the join code in its own box', () => {
    render(<JoinCodeDisplay joinCode="ABC123" />);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders 6 character boxes', () => {
    const { container } = render(<JoinCodeDisplay joinCode="XYZ789" />);
    const boxes = container.querySelectorAll('.font-mono.font-bold');
    expect(boxes.length).toBe(6);
  });

  it('renders copy code button', () => {
    render(<JoinCodeDisplay joinCode="ABC123" />);
    expect(screen.getByRole('button', { name: /copy code/i })).toBeInTheDocument();
  });

  it('hides share link section when codeOnly is true', () => {
    render(<JoinCodeDisplay joinCode="ABC123" codeOnly />);
    expect(screen.queryByText('Share Link')).not.toBeInTheDocument();
  });
});
