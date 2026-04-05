import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useCurrentTitle } from './useCurrentTitle';

vi.mock('./useJiraIssue', () => ({
  useJiraIssue: (url: string) => ({
    data: url.includes('atlassian')
      ? { key: 'PROJ-1', summary: 'Fix bug', status: 'Open', issueType: 'Bug' }
      : null,
  }),
}));

vi.mock('./useUrlTitle', () => ({
  useUrlTitle: (url: string) => ({
    data: url.includes('github') ? 'GitHub Issue' : null,
  }),
}));

describe('useCurrentTitle', () => {
  it('returns empty string when url is undefined', () => {
    const { result } = renderHook(() => useCurrentTitle(undefined));
    expect(result.current).toBe('');
  });

  it('returns Jira issue title for Atlassian URLs', () => {
    const { result } = renderHook(() =>
      useCurrentTitle('https://myorg.atlassian.net/browse/PROJ-1'),
    );
    expect(result.current).toBe('Fix bug (PROJ-1)');
  });

  it('returns page title for non-Jira URLs when available', () => {
    const { result } = renderHook(() => useCurrentTitle('https://github.com/org/repo/issues/1'));
    expect(result.current).toBe('GitHub Issue');
  });

  it('returns domain name when no title or Jira data', () => {
    const { result } = renderHook(() => useCurrentTitle('https://example.com/some/path'));
    expect(result.current).toBe('example.com');
  });
});
