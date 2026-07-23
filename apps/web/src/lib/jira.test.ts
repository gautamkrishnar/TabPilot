import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchJiraIssue,
  fetchJiraStatus,
  formatJiraTitle,
  isStoryPointConfigured,
  parseJiraUrl,
  updateJiraStoryPoints,
} from './jira';

const { mockGet, mockPatch } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPatch: vi.fn(),
}));

vi.mock('./api', () => ({
  default: { get: (...a: unknown[]) => mockGet(...a), patch: (...a: unknown[]) => mockPatch(...a) },
}));

describe('parseJiraUrl', () => {
  it('returns null for non-Jira URLs', () => {
    expect(parseJiraUrl('https://github.com/org/repo')).toBeNull();
    expect(parseJiraUrl('not-a-url')).toBeNull();
  });

  it('parses /browse/ Jira URLs', () => {
    expect(parseJiraUrl('https://myorg.atlassian.net/browse/PROJ-123')).toEqual({
      key: 'PROJ-123',
      baseUrl: 'https://myorg.atlassian.net',
    });
  });

  it('parses /issues/ Jira URLs', () => {
    expect(
      parseJiraUrl('https://myorg.atlassian.net/jira/software/projects/PROJ/issues/PROJ-42'),
    ).toEqual({ key: 'PROJ-42', baseUrl: 'https://myorg.atlassian.net' });
  });

  it('uppercases the key', () => {
    const info = parseJiraUrl('https://myorg.atlassian.net/browse/proj-1');
    expect(info?.key).toBe('PROJ-1');
    expect(info?.baseUrl).toBe('https://myorg.atlassian.net');
  });

  it('returns null for atlassian URL without issue key', () => {
    expect(parseJiraUrl('https://myorg.atlassian.net/wiki/spaces/FOO')).toBeNull();
  });
});

describe('formatJiraTitle', () => {
  it('formats issue as "summary (key)"', () => {
    expect(
      formatJiraTitle({
        key: 'PROJ-1',
        summary: 'Fix login bug',
        status: 'Open',
        issueType: 'Bug',
      }),
    ).toBe('Fix login bug (PROJ-1)');
  });
});

describe('fetchJiraIssue', () => {
  beforeEach(() => mockGet.mockReset());

  it('calls the correct endpoint and returns data', async () => {
    const issue = { key: 'PROJ-1', summary: 'Test', status: 'Open', issueType: 'Bug' };
    mockGet.mockResolvedValue({ data: issue });
    const result = await fetchJiraIssue('PROJ-1');
    expect(mockGet).toHaveBeenCalledWith('/jira/issue/PROJ-1', { params: undefined });
    expect(result).toEqual(issue);
  });

  it('passes baseUrl as query param when provided', async () => {
    const issue = { key: 'PROJ-1', summary: 'Test', status: 'Open', issueType: 'Bug' };
    mockGet.mockResolvedValue({ data: issue });
    await fetchJiraIssue('PROJ-1', 'https://myorg.atlassian.net');
    expect(mockGet).toHaveBeenCalledWith('/jira/issue/PROJ-1', {
      params: { baseUrl: 'https://myorg.atlassian.net' },
    });
  });
});

describe('fetchJiraStatus', () => {
  beforeEach(() => mockGet.mockReset());

  it('calls /jira/status and returns configured status', async () => {
    mockGet.mockResolvedValue({ data: { configured: true, storyPointProjects: ['CONNCERT'] } });
    const result = await fetchJiraStatus();
    expect(mockGet).toHaveBeenCalledWith('/jira/status');
    expect(result.configured).toBe(true);
    expect(result.storyPointProjects).toEqual(['CONNCERT']);
  });

  it('returns unconfigured status when Jira is not set up', async () => {
    mockGet.mockResolvedValue({ data: { configured: false, storyPointProjects: [] } });
    const result = await fetchJiraStatus();
    expect(result.configured).toBe(false);
    expect(result.storyPointProjects).toEqual([]);
  });
});

describe('isStoryPointConfigured', () => {
  it('returns true when the project key is in the list', () => {
    expect(
      isStoryPointConfigured('https://myorg.atlassian.net/browse/CONNCERT-123', [
        'CONNCERT',
        'PAD',
      ]),
    ).toBe(true);
  });

  it('returns false when the project key is not in the list', () => {
    expect(isStoryPointConfigured('https://myorg.atlassian.net/browse/PFS-99', ['CONNCERT'])).toBe(
      false,
    );
  });

  it('returns false for non-Jira URLs', () => {
    expect(isStoryPointConfigured('https://github.com/org/repo', ['CONNCERT'])).toBe(false);
  });

  it('is case-insensitive for the project key', () => {
    expect(
      isStoryPointConfigured('https://myorg.atlassian.net/browse/conncert-1', ['CONNCERT']),
    ).toBe(true);
  });

  it('returns false when storyPointProjects is empty', () => {
    expect(isStoryPointConfigured('https://myorg.atlassian.net/browse/CONNCERT-1', [])).toBe(false);
  });
});

describe('updateJiraStoryPoints', () => {
  beforeEach(() => mockPatch.mockReset());

  it('calls PATCH with the correct endpoint and body', async () => {
    mockPatch.mockResolvedValue({ data: null });
    await updateJiraStoryPoints('CONNCERT-123', 5);
    expect(mockPatch).toHaveBeenCalledWith('/jira/issue/CONNCERT-123/story-points', {
      points: 5,
      baseUrl: undefined,
      skipExtraFields: true,
    });
  });

  it('passes the correct body to the API', async () => {
    mockPatch.mockResolvedValue({ data: null });
    await updateJiraStoryPoints('CONNCERT-1', 3);
    expect(mockPatch).toHaveBeenCalledWith('/jira/issue/CONNCERT-1/story-points', {
      points: 3,
      baseUrl: undefined,
      skipExtraFields: true,
    });
  });

  it('includes baseUrl in body when provided', async () => {
    mockPatch.mockResolvedValue({ data: null });
    await updateJiraStoryPoints('CONNCERT-1', 3, 'https://myorg.atlassian.net');
    expect(mockPatch).toHaveBeenCalledWith('/jira/issue/CONNCERT-1/story-points', {
      points: 3,
      baseUrl: 'https://myorg.atlassian.net',
      skipExtraFields: true,
    });
  });

  it('sends skipExtraFields: false when explicitly passed', async () => {
    mockPatch.mockResolvedValue({ data: null });
    await updateJiraStoryPoints('CONNCERT-1', 3, undefined, false);
    expect(mockPatch).toHaveBeenCalledWith('/jira/issue/CONNCERT-1/story-points', {
      points: 3,
      baseUrl: undefined,
      skipExtraFields: false,
    });
  });
});
