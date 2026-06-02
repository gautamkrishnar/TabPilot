import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mockUseTicketScore = vi.fn();

vi.mock('@/hooks/useTicketScore', () => ({
  useTicketScore: (...args: unknown[]) => mockUseTicketScore(...args),
}));

import { TicketScoreBadge } from './TicketScoreBadge';

describe('TicketScoreBadge', () => {
  it('renders nothing when score is not available', () => {
    mockUseTicketScore.mockReturnValue({ data: null, isLoading: false });
    const { container } = render(<TicketScoreBadge url="https://example.com" />);
    expect(container.firstChild).toBeNull();
  });

  it('shows loading spinner while fetching', () => {
    mockUseTicketScore.mockReturnValue({ data: null, isLoading: true });
    render(<TicketScoreBadge url="https://example.com" />);
    expect(document.querySelector('.animate-spin')).toBeTruthy();
  });

  it('displays the overall score when available', () => {
    mockUseTicketScore.mockReturnValue({
      data: { overall: 82, dimensions: {} },
      isLoading: false,
    });
    render(<TicketScoreBadge url="https://example.atlassian.net/browse/PROJ-1" />);
    expect(screen.getByText('82')).toBeTruthy();
  });

  it('applies green color for scores >= 70', () => {
    mockUseTicketScore.mockReturnValue({
      data: { overall: 75, dimensions: {} },
      isLoading: false,
    });
    render(<TicketScoreBadge url="https://example.atlassian.net/browse/PROJ-1" />);
    const badge = screen.getByText('75');
    expect(badge.className).toContain('emerald');
  });

  it('applies amber color for scores 40-69', () => {
    mockUseTicketScore.mockReturnValue({
      data: { overall: 55, dimensions: {} },
      isLoading: false,
    });
    render(<TicketScoreBadge url="https://example.atlassian.net/browse/PROJ-1" />);
    const badge = screen.getByText('55');
    expect(badge.className).toContain('amber');
  });

  it('applies red color for scores < 40', () => {
    mockUseTicketScore.mockReturnValue({
      data: { overall: 25, dimensions: {} },
      isLoading: false,
    });
    render(<TicketScoreBadge url="https://example.atlassian.net/browse/PROJ-1" />);
    const badge = screen.getByText('25');
    expect(badge.className).toContain('red');
  });
});
