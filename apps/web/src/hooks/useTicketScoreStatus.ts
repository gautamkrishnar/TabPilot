import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api';

interface TicketScoreStatus {
  configured: boolean;
}

async function fetchTicketScoreStatus(): Promise<TicketScoreStatus> {
  const res = await apiClient.get<TicketScoreStatus>('/ticket-score/status');
  return res.data;
}

export function useTicketScoreStatus() {
  return useQuery({
    queryKey: ['ticket-score', 'status'],
    queryFn: fetchTicketScoreStatus,
    staleTime: 60 * 60 * 1000,
    retry: false,
    throwOnError: false,
  });
}
