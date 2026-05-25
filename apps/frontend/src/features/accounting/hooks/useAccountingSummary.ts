import { useCallback, useEffect, useRef, useState } from 'react';
import { api, getErrorMessage } from '@/lib/api';
import type { MonthlySummaryDto, PeriodMonth } from '@academiaplaton/shared';

interface State {
  summary: MonthlySummaryDto | null;
  loading: boolean;
  error: string | null;
}

export function useAccountingSummary(
  centerId: string | 'all',
  month: PeriodMonth | null,
) {
  const [state, setState] = useState<State>({
    summary: null,
    loading: month != null,
    error: null,
  });

  // Permite cancelar respuestas obsoletas si el usuario cambia rápido de mes
  // o centro: solo aceptamos la respuesta del último fetch lanzado.
  const reqIdRef = useRef(0);

  const refetch = useCallback(async () => {
    if (!month) {
      setState({ summary: null, loading: false, error: null });
      return;
    }
    const reqId = ++reqIdRef.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await api.get<MonthlySummaryDto>('/api/accounting/summary', {
        params: { centerId, month },
      });
      if (reqId !== reqIdRef.current) return;
      setState({ summary: res.data, loading: false, error: null });
    } catch (err) {
      if (reqId !== reqIdRef.current) return;
      setState({ summary: null, loading: false, error: getErrorMessage(err) });
    }
  }, [centerId, month]);

  useEffect(() => {
    // El hook está pensado para auto-fetchear cuando cambian centerId/month.
    // La regla react-hooks/set-state-in-effect señala el setState que ocurre
    // tras la resolución de la promesa, pero aquí es deliberado: estamos
    // sincronizando el caché local del componente con un servidor externo.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refetch();
  }, [refetch]);

  return { ...state, refetch };
}
