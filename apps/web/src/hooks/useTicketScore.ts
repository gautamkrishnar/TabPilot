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

async function fetchTicketScoreByUrl(url: string): Promise<TicketScore> {
  const res = await apiClient.get<TicketScore>('/ticket-score/url', { params: { url } });
  return res.data;
}

export function usePrefetchTicketScores(urls: string[]) {
  const qc = useQueryClient();
  const prefetchedRef = useRef(new Set<string>());

  useEffect(() => {
    for (const url of urls) {
      const info = parseJiraUrl(url);
      if (info) {
        if (prefetchedRef.current.has(info.key)) continue;
        prefetchedRef.current.add(info.key);
        qc.prefetchQuery({
          queryKey: ['ticket-score', info.key],
          queryFn: () => fetchTicketScore(info.key, info.baseUrl),
          staleTime: Infinity,
        });
      } else {
        if (!url || prefetchedRef.current.has(url)) continue;
        prefetchedRef.current.add(url);
        qc.prefetchQuery({
          queryKey: ['ticket-score', 'url', url],
          queryFn: () => fetchTicketScoreByUrl(url),
          staleTime: Infinity,
        });
      }
    }
  }, [urls, qc]);
}

export function useTicketScore(url: string) {
  const info = parseJiraUrl(url);

  return useQuery({
    queryKey: info ? ['ticket-score', info.key] : ['ticket-score', 'url', url],
    queryFn: info
      ? () => fetchTicketScore(info.key, info.baseUrl)
      : () => fetchTicketScoreByUrl(url),
    enabled: !!url,
    staleTime: Infinity,
    retry: false,
    throwOnError: false,
  });
}
