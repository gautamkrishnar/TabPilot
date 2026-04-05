import { describe, expect, it } from 'vitest';
import { formatJiraTitle, parseJiraUrl } from './jira';

describe('parseJiraUrl', () => {
  it('returns null for non-Jira URLs', () => {
    expect(parseJiraUrl('https://github.com/org/repo')).toBeNull();
    expect(parseJiraUrl('not-a-url')).toBeNull();
  });

  it('parses /browse/ Jira URLs', () => {
    expect(parseJiraUrl('https://myorg.atlassian.net/browse/PROJ-123')).toEqual({
      key: 'PROJ-123',
    });
  });

  it('parses /issues/ Jira URLs', () => {
    expect(
      parseJiraUrl('https://myorg.atlassian.net/jira/software/projects/PROJ/issues/PROJ-42'),
    ).toEqual({ key: 'PROJ-42' });
  });

  it('uppercases the key', () => {
    expect(parseJiraUrl('https://myorg.atlassian.net/browse/proj-1')?.key).toBe('PROJ-1');
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
