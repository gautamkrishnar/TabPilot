import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { NotFound } from './NotFound';

vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get:
        (_t, tag: string) =>
        ({ children, ...rest }: React.HTMLAttributes<HTMLElement>) =>
          React.createElement(tag, rest, children),
    },
  ),
}));

import React from 'react';

describe('NotFound', () => {
  it('renders the 404 heading', () => {
    render(<NotFound />);
    expect(screen.getByText('Page not found')).toBeInTheDocument();
  });

  it('renders Go Home link', () => {
    render(<NotFound />);
    expect(screen.getByRole('link', { name: /go home/i })).toBeInTheDocument();
  });

  it('calls globalThis.history.back when Go Back is clicked', async () => {
    const backSpy = vi.spyOn(globalThis.history, 'back').mockImplementation(() => {});
    render(<NotFound />);
    await userEvent.click(screen.getByRole('button', { name: /go back/i }));
    expect(backSpy).toHaveBeenCalledTimes(1);
    backSpy.mockRestore();
  });
});
