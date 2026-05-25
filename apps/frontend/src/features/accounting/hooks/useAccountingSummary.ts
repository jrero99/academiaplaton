import { useCallback, useSyncExternalStore } from 'react';
import type { MonthlySummaryDto, PeriodMonth } from '@academiaplaton/shared';
import {
  buildSummary,
  getAccountingSnapshot,
  subscribeAccounting,
} from '../data/mock-store';

// Hook mock-only: el summary se recalcula desde el store en memoria cada
// vez que cambia algo (categorías, plantillas, gastos, ingresos) o cuando
// el componente cambia de centro/mes.
export function useAccountingSummary(
  centerId: string | 'all',
  month: PeriodMonth | null,
) {
  // Re-render cuando el store cambia.
  useSyncExternalStore(subscribeAccounting, getAccountingSnapshot, getAccountingSnapshot);

  const summary: MonthlySummaryDto | null = month ? buildSummary(centerId, month) : null;

  // En el modelo mock no hay fetch real. `refetch` queda como no-op para
  // mantener la firma; cualquier mutación al store ya dispara el re-render.
  const refetch = useCallback(async () => {
    /* no-op */
  }, []);

  return {
    summary,
    loading: false,
    error: null as string | null,
    refetch,
  };
}
