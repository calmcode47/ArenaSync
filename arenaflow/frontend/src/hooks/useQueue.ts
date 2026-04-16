import { useQuery } from '@tanstack/react-query';
import { getVenueQueueSummary } from '../api/queue';

export function useQueue(venueId: string | null) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["queue", "summary", venueId],
    queryFn: () => getVenueQueueSummary(venueId!),
    enabled: !!venueId,
    staleTime: 20_000,
    refetchInterval: 30_000,
    retry: 2,
    retryDelay: 5000,
  });

  const summary = data ?? null;
  return { queueSummary: summary, summary, isLoading, isError, error, refetch };
}
