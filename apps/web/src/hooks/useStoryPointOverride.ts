import { useEffect, useState } from 'react';

function computeVoteAverage(votes: Record<string, string>): number | null {
  const nums = Object.values(votes)
    .map(Number)
    .filter((n) => !Number.isNaN(n));
  return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
}

/**
 * Manages the story-point override input and keeps it in sync with the revealed
 * vote average whenever votes are revealed.
 */
export function useStoryPointOverride(revealedVotes: Record<string, string> | null) {
  const [storyPointOverride, setStoryPointOverride] = useState('');

  useEffect(() => {
    if (!revealedVotes) return;
    const avg = computeVoteAverage(revealedVotes);
    if (avg === null) {
      setStoryPointOverride('');
    } else {
      setStoryPointOverride(avg % 1 === 0 ? String(avg) : avg.toFixed(1));
    }
  }, [revealedVotes]);

  return { storyPointOverride, setStoryPointOverride };
}
