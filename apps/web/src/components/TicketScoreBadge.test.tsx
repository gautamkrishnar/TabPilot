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

  it.each([
    { score: 75, expectedColor: 'emerald', label: '>= 70' },
    { score: 55, expectedColor: 'amber', label: '40–69' },
    { score: 25, expectedColor: 'red', label: '< 40' },
  ])('applies $expectedColor color for scores $label (score=$score)', ({
    score,
    expectedColor,
  }) => {
    mockUseTicketScore.mockReturnValue({
      data: { overall: score, dimensions: {} },
      isLoading: false,
    });
    render(<TicketScoreBadge url="https://example.atlassian.net/browse/PROJ-1" />);
    const badge = screen.getByText(String(score));
    expect(badge.className).toContain(expectedColor);
  });
});
