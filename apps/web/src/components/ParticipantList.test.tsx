import type { Participant } from '@tabpilot/shared';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ParticipantList } from './ParticipantList';

const makeParticipant = (overrides: Partial<Participant> = {}): Participant => ({
  id: 'p1',
  name: 'Alice',
  isOnline: true,
  sessionId: 's1',
  joinedAt: new Date().toISOString(),
  avatarUrl: '',
  ...overrides,
});

describe('ParticipantList', () => {
  it('renders participant name', () => {
    render(<ParticipantList participants={[makeParticipant()]} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('shows empty state when no participants', () => {
    render(<ParticipantList participants={[]} />);
    expect(screen.getByText(/no participants yet/i)).toBeInTheDocument();
  });

  it('shows online indicator for online participant without vote', () => {
    const { container } = render(
      <ParticipantList participants={[makeParticipant({ isOnline: true })]} />,
    );
    // Online ping animation span
    expect(container.querySelector('.animate-ping')).toBeInTheDocument();
  });

  it('shows offline indicator for offline participant', () => {
    const { container } = render(
      <ParticipantList participants={[makeParticipant({ isOnline: false })]} />,
    );
    expect(container.querySelector('.animate-ping')).not.toBeInTheDocument();
  });

  it('shows voted indicator when participant has voted', () => {
    render(<ParticipantList participants={[makeParticipant()]} votedParticipantIds={['p1']} />);
    expect(screen.getByTitle('Voted')).toBeInTheDocument();
  });

  it('shows revealed vote value when revealedVotes provided', () => {
    render(
      <ParticipantList
        participants={[makeParticipant()]}
        votedParticipantIds={['p1']}
        revealedVotes={{ p1: '5' }}
      />,
    );
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('shows participant count in header', () => {
    render(
      <ParticipantList
        participants={[makeParticipant(), makeParticipant({ id: 'p2', name: 'Bob' })]}
      />,
    );
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('separates online and offline participants', () => {
    render(
      <ParticipantList
        participants={[
          makeParticipant({ id: 'p1', name: 'Alice', isOnline: true }),
          makeParticipant({ id: 'p2', name: 'Bob', isOnline: false }),
        ]}
      />,
    );
    expect(screen.getByText(/online/i)).toBeInTheDocument();
    expect(screen.getByText(/offline/i)).toBeInTheDocument();
  });
});
