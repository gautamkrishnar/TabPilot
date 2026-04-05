import { formatJiraTitle, parseJiraUrl } from '@/lib/jira';
import { formatUrl } from '@/lib/utils';
import { useJiraIssue } from './useJiraIssue';
import { useUrlTitle } from './useUrlTitle';

/**
 * Resolves a display title for the given URL:
 * Jira issue summary → generic page title → Jira key → domain.
 */
export function useCurrentTitle(currentUrl: string | undefined): string {
  const { data: currentJiraIssue } = useJiraIssue(currentUrl ?? '');
  const { data: currentPageTitle } = useUrlTitle(currentUrl ?? '');

  if (!currentUrl) return '';
  return currentJiraIssue
    ? formatJiraTitle(currentJiraIssue)
    : (currentPageTitle ?? parseJiraUrl(currentUrl)?.key ?? formatUrl(currentUrl));
}
