import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cn,
  formatTimeAgo,
  formatUrl,
  getDiceBearUrl,
  getFaviconUrl,
  getJoinUrl,
  truncateUrl,
} from './utils';

// ---------------------------------------------------------------------------
// cn()
// ---------------------------------------------------------------------------
describe('cn()', () => {
  it('merges multiple class strings', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes with an object', () => {
    expect(cn('base', { active: true, disabled: false })).toBe('base active');
  });

  it('handles falsy values', () => {
    expect(cn('a', undefined, null, false, 'b')).toBe('a b');
  });

  it('deduplicates conflicting Tailwind utilities (last wins)', () => {
    // tailwind-merge resolves p-2 vs p-4 — the last one wins
    const result = cn('p-2', 'p-4');
    expect(result).toBe('p-4');
  });

  it('returns empty string when no args', () => {
    expect(cn()).toBe('');
  });
});

// ---------------------------------------------------------------------------
// formatUrl()
// ---------------------------------------------------------------------------
describe('formatUrl()', () => {
  it('extracts hostname from a full URL', () => {
    expect(formatUrl('https://www.example.com/path?q=1')).toBe('example.com');
  });

  it('removes leading www.', () => {
    expect(formatUrl('https://www.google.com')).toBe('google.com');
  });

  it('handles URLs without www', () => {
    expect(formatUrl('https://github.com/user/repo')).toBe('github.com');
  });

  it('handles http:// URLs', () => {
    expect(formatUrl('http://localhost:3000')).toBe('localhost');
  });

  it('returns the original string for invalid URLs', () => {
    expect(formatUrl('not-a-url')).toBe('not-a-url');
  });
});

// ---------------------------------------------------------------------------
// getFaviconUrl()
// ---------------------------------------------------------------------------
describe('getFaviconUrl()', () => {
  it('returns a Google favicon URL containing the domain', () => {
    const result = getFaviconUrl('https://github.com');
    expect(result).toContain('www.google.com/s2/favicons');
    expect(result).toContain('github.com');
    expect(result).toContain('sz=32');
  });

  it('falls back to example.com for invalid URLs', () => {
    const result = getFaviconUrl('not-a-url');
    expect(result).toContain('example.com');
  });
});

// ---------------------------------------------------------------------------
// truncateUrl()
// ---------------------------------------------------------------------------
describe('truncateUrl()', () => {
  it('returns the URL unchanged when it is short enough', () => {
    const short = 'https://example.com';
    expect(truncateUrl(short)).toBe(short);
  });

  it('truncates a long URL with ellipsis using default maxLen of 60', () => {
    const long = `https://example.com/${'a'.repeat(60)}`;
    const result = truncateUrl(long);
    expect(result).toHaveLength(60);
    expect(result.endsWith('...')).toBe(true);
  });

  it('respects a custom maxLen', () => {
    const url = 'https://example.com/some/long/path';
    const result = truncateUrl(url, 20);
    expect(result).toHaveLength(20);
    expect(result.endsWith('...')).toBe(true);
  });

  it('does not truncate when URL length equals maxLen', () => {
    const url = 'a'.repeat(60);
    expect(truncateUrl(url, 60)).toBe(url);
  });
});

// ---------------------------------------------------------------------------
// getJoinUrl()
// ---------------------------------------------------------------------------
describe('getJoinUrl()', () => {
  it('returns a string containing the join code', () => {
    // happy-dom exposes window.location.origin
    const result = getJoinUrl('ABC123');
    expect(result).toContain('ABC123');
  });

  it('uses window.location.origin as the base', () => {
    const result = getJoinUrl('XYZ789');
    expect(result.startsWith(window.location.origin)).toBe(true);
  });

  it('uses the /join?code= path format', () => {
    const result = getJoinUrl('MYJOIN');
    expect(result).toContain('/join?code=MYJOIN');
  });
});

// ---------------------------------------------------------------------------
// getDiceBearUrl()
// ---------------------------------------------------------------------------
describe('getDiceBearUrl()', () => {
  it('returns a URL containing the seed parameter', () => {
    const url = getDiceBearUrl('test-seed');
    expect(url).toContain('seed=test-seed');
  });

  it('returns a URL pointing to api.dicebear.com', () => {
    const url = getDiceBearUrl('hello');
    expect(url).toContain('api.dicebear.com');
  });

  it('URL-encodes the seed', () => {
    const url = getDiceBearUrl('hello world');
    expect(url).toContain('hello%20world');
  });

  it('uses the provided size', () => {
    const url = getDiceBearUrl('s', 80);
    expect(url).toContain('size=80');
  });

  it('defaults size to 40', () => {
    const url = getDiceBearUrl('s');
    expect(url).toContain('size=40');
  });
});

// ---------------------------------------------------------------------------
// formatTimeAgo()
// ---------------------------------------------------------------------------
describe('formatTimeAgo()', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-01T12:00:00Z'));
  });

  it('returns "just now" for a timestamp less than 60 seconds ago', () => {
    const date = new Date('2026-04-01T11:59:30Z').toISOString();
    expect(formatTimeAgo(date)).toBe('just now');
  });

  it('returns minutes ago', () => {
    const date = new Date('2026-04-01T11:55:00Z').toISOString();
    expect(formatTimeAgo(date)).toBe('5m ago');
  });

  it('returns hours ago', () => {
    const date = new Date('2026-04-01T10:00:00Z').toISOString();
    expect(formatTimeAgo(date)).toBe('2h ago');
  });

  it('returns days ago', () => {
    const date = new Date('2026-03-29T12:00:00Z').toISOString();
    expect(formatTimeAgo(date)).toBe('3d ago');
  });
});
