import { useQuery } from '@tanstack/react-query';
import { getCrowdSummary, getCrowdHeatmap } from '../api/crowd';

export function useCrowd(venueId: string | null) {
  const summaryQuery = useQuery({
    queryKey: ["crowd", "summary", venueId],
    queryFn: () => getCrowdSummary(venueId!),
    enabled: !!venueId,
    staleTime: 10_000,
    refetchInterval: 15_000,
    retry: 2,
    retryDelay: 3000,
  });

  const heatmapQuery = useQuery({
    queryKey: ["crowd", "heatmap", venueId],
    queryFn: () => getCrowdHeatmap(venueId!),
    enabled: !!venueId,
    staleTime: 15_000,
    refetchInterval: 20_000,
    retry: 1,
  });

  return {
    summary: summaryQuery.data ?? null,
    heatmap: heatmapQuery.data ?? null,
    isLoading: summaryQuery.isLoading,
    isError: summaryQuery.isError,
    error: summaryQuery.error,
    refetch: summaryQuery.refetch,
  };
}
