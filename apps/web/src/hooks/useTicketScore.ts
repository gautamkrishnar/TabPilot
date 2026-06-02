import type { TicketScore } from '@tabpilot/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import apiClient from '@/lib/api';
import { parseJiraUrl } from '@/lib/jira';

async function fetchTicketScore(key: string, baseUrl?: string): Promise<TicketScore> {
  const params = baseUrl ? { baseUrl } : undefined;
  const res = await apiClient.get<TicketScore>(`/ticket-score/${key}`, { params });
  return res.data;
}

export function usePrefetchTicketScores(urls: string[]) {
  const qc = useQueryClient();
  const prefetchedRef = useRef(new Set<string>());

  useEffect(() => {
    for (const url of urls) {
      const info = parseJiraUrl(url);
      if (!info || prefetchedRef.current.has(info.key)) continue;
      prefetchedRef.current.add(info.key);
      qc.prefetchQuery({
        queryKey: ['ticket-score', info.key],
        queryFn: () => fetchTicketScore(info.key, info.baseUrl),
        staleTime: Infinity,
      });
    }
  }, [urls, qc]);
}

export function useTicketScore(url: string) {
  const info = parseJiraUrl(url);

  return useQuery({
    queryKey: ['ticket-score', info?.key ?? ''],
    queryFn: () => fetchTicketScore(info?.key ?? '', info?.baseUrl),
    enabled: !!info,
    staleTime: Infinity,
    retry: false,
    throwOnError: false,
  });
}
