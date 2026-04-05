import apiClient from './api';

// ─── URL parsing ──────────────────────────────────────────────────────────────

export interface JiraUrlInfo {
  key: string; // e.g. "CONNCERT-2771"
}

/**
 * Returns the Jira issue key if the URL is an Atlassian Jira URL, else null.
 * Supports both *.atlassian.net/browse/KEY and *.atlassian.net/jira/software/.../issues/KEY
 */
export function parseJiraUrl(url: string): JiraUrlInfo | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('atlassian.net')) return null;

    // /browse/PROJ-123
    const browseMatch = /\/browse\/([A-Z][A-Z0-9_]*-\d+)/i.exec(parsed.pathname);
    if (browseMatch) return { key: browseMatch[1].toUpperCase() };

    // /jira/.../issues/PROJ-123
    const issuesMatch = /\/issues\/([A-Z][A-Z0-9_]*-\d+)/i.exec(parsed.pathname);
    if (issuesMatch) return { key: issuesMatch[1].toUpperCase() };

    return null;
  } catch {
    return null;
  }
}

// ─── API ──────────────────────────────────────────────────────────────────────

export interface JiraIssue {
  key: string;
  summary: string;
  status: string;
  issueType: string;
}

export async function fetchJiraIssue(key: string): Promise<JiraIssue> {
  const res = await apiClient.get<JiraIssue>(`/jira/issue/${key}`);
  return res.data;
}

export async function fetchJiraStatus(): Promise<{ configured: boolean }> {
  const res = await apiClient.get<{ configured: boolean }>('/jira/status');
  return res.data;
}

// ─── Display formatting ───────────────────────────────────────────────────────

/** Formats a Jira issue for display: "Fix login bug (CONNCERT-2771)" */
export function formatJiraTitle(issue: JiraIssue): string {
  return `${issue.summary} (${issue.key})`;
}
