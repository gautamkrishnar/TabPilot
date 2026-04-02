import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  // -------------------------------------------------------------------------
  // waiting
  // -------------------------------------------------------------------------
  describe('state="waiting"', () => {
    it('renders the text "Waiting"', () => {
      render(<StatusBadge state="waiting" />);
      expect(screen.getByText('Waiting')).toBeInTheDocument();
    });

    it('applies amber color classes', () => {
      render(<StatusBadge state="waiting" />);
      const badge = screen.getByText('Waiting').closest('span');
      expect(badge?.className).toContain('amber');
    });

    it('does not render "Live" or "Ended" text', () => {
      render(<StatusBadge state="waiting" />);
      expect(screen.queryByText('Live')).not.toBeInTheDocument();
      expect(screen.queryByText('Ended')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // active
  // -------------------------------------------------------------------------
  describe('state="active"', () => {
    it('renders the text "Live"', () => {
      render(<StatusBadge state="active" />);
      expect(screen.getByText('Live')).toBeInTheDocument();
    });

    it('applies red color classes', () => {
      render(<StatusBadge state="active" />);
      const badge = screen.getByText('Live').closest('span');
      expect(badge?.className).toContain('red');
    });

    it('contains a pulsing indicator element', () => {
      const { container } = render(<StatusBadge state="active" />);
      // The outer span of the pulse dot has class "relative flex h-2 w-2"
      const pulseWrapper = container.querySelector('.animate-ping');
      expect(pulseWrapper).not.toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // ended
  // -------------------------------------------------------------------------
  describe('state="ended"', () => {
    it('renders the text "Ended"', () => {
      render(<StatusBadge state="ended" />);
      expect(screen.getByText('Ended')).toBeInTheDocument();
    });

    it('applies zinc color classes', () => {
      render(<StatusBadge state="ended" />);
      const badge = screen.getByText('Ended').closest('span');
      expect(badge?.className).toContain('zinc');
    });

    it('does not render "Waiting" or "Live" text', () => {
      render(<StatusBadge state="ended" />);
      expect(screen.queryByText('Waiting')).not.toBeInTheDocument();
      expect(screen.queryByText('Live')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // size prop
  // -------------------------------------------------------------------------
  describe('size prop', () => {
    it('defaults to "md" size without error', () => {
      render(<StatusBadge state="waiting" />);
      expect(screen.getByText('Waiting')).toBeInTheDocument();
    });

    it('renders correctly with size="sm"', () => {
      render(<StatusBadge state="active" size="sm" />);
      expect(screen.getByText('Live')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // className prop forwarded
  // -------------------------------------------------------------------------
  describe('className prop', () => {
    it('forwards extra className to the root span', () => {
      render(<StatusBadge state="waiting" className="extra-class" />);
      const badge = screen.getByText('Waiting').closest('span');
      expect(badge?.className).toContain('extra-class');
    });
  });
});
