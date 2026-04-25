import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => {
  if (!r.ok) throw new Error(`API error: ${r.status}`);
  return r.json();
});

/**
 * Hook: Dashboard Summary (national totals + breakdown)
 * Refreshes every 60s for near-real-time updates.
 */
export function useDashboardSummary(params: URLSearchParams | null) {
  return useSWR(
    params ? `/api/reports/summary?${params.toString()}` : null,
    fetcher,
    { refreshInterval: 60_000, dedupingInterval: 10_000, revalidateOnFocus: true }
  );
}

/**
 * Hook: Dashboard Cumulative Summary (outbreak-wide totals)
 */
export function useCumulativeSummary(params: URLSearchParams | null) {
  return useSWR(
    params ? `/api/reports/summary?${params.toString()}` : null,
    fetcher,
    { refreshInterval: 60_000, dedupingInterval: 10_000 }
  );
}

/**
 * Hook: Dashboard Config (outbreak metadata, KPI fields, indicators)
 * Rarely changes — long dedup interval.
 */
export function useDashboardConfig(outbreakId: string | null) {
  return useSWR(
    outbreakId ? `/api/public/config?outbreakId=${outbreakId}` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300_000 }
  );
}

/**
 * Hook: Settings
 */
export function useDashboardSettings() {
  return useSWR(
    '/api/admin/settings',
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300_000 }
  );
}

/**
 * Hook: Indicators
 */  
export function useDashboardIndicators() {
  return useSWR(
    '/api/admin/indicators',
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300_000 }
  );
}
