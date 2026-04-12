import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getActiveAlerts, resolveAlert } from '../api/alerts';
import { useAlertStore } from '../store/alertStore';
import { useMemo } from 'react';

export function useAlerts(venueId: string | null) {
  const queryClient = useQueryClient();
  const { addAlert } = useAlertStore();

  const alertsQuery = useQuery({
    queryKey: ["alerts", venueId],
    queryFn: () => getActiveAlerts(venueId!),
    enabled: !!venueId,
    staleTime: 8_000,
    refetchInterval: 10_000,
    retry: 1,
  });

  const resolveMutation = useMutation({
    mutationFn: (alertId: string) => resolveAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts", venueId] });
    }
  });

  const wsAlerts = useAlertStore(state => state.alerts);
  
  const mergedAlerts = useMemo(() => {
    const polled = alertsQuery.data ?? [];
    const allAlerts = [...wsAlerts, ...polled];
    const seen = new Set<string>();
    return allAlerts.filter(a => { 
        if (seen.has(a.id)) return false; 
        seen.add(a.id); 
        return true; 
    });
  }, [alertsQuery.data, wsAlerts]);

  return {
    alerts: mergedAlerts,
    isLoading: alertsQuery.isLoading,
    resolveAlert: resolveMutation.mutate,
    isResolving: resolveMutation.isPending,
  };
}
