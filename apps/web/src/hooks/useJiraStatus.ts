import { useQuery } from '@tanstack/react-query';
import { fetchJiraStatus } from '@/lib/jira';

/**
 * Fetches Jira integration status including which project keys have
 * a story-points field configured (JIRA_STORY_POINTS_FIELDS env var).
 */
export function useJiraStatus() {
  return useQuery({
    queryKey: ['jira', 'status'],
    queryFn: fetchJiraStatus,
    staleTime: 5 * 60 * 1000, // 5 min — config rarely changes at runtime
    retry: false,
    throwOnError: false,
  });
}
