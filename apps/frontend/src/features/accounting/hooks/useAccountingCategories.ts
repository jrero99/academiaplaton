import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, getErrorMessage } from '@/lib/api';
import type {
  ExpenseCategoryCreate,
  ExpenseCategoryDto,
  ExpenseCategoryFilters,
  ExpenseCategoryUpdate,
} from '@academiaplaton/shared';

interface State {
  categories: ExpenseCategoryDto[];
  loading: boolean;
  error: string | null;
}

const initialState: State = { categories: [], loading: true, error: null };

export function useAccountingCategories(filters?: ExpenseCategoryFilters) {
  const [state, setState] = useState<State>(initialState);

  // Estabilizamos la clave para que el callback solo cambie cuando lo hace el
  // contenido de los filtros, no la referencia.
  const filtersKey = useMemo(() => JSON.stringify(filters ?? {}), [filters]);

  const refetch = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await api.get<ExpenseCategoryDto[]>('/api/accounting/categories', {
        params: filters,
      });
      setState({ categories: res.data, loading: false, error: null });
    } catch (err) {
      setState({ categories: [], loading: false, error: getErrorMessage(err) });
    }
    // `filters` se referencia dentro del callback pero su identidad varía
    // en cada render del consumidor; usamos `filtersKey` como dependencia
    // estable y opt-out explícito de la regla de exhaustividad.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey]);

  useEffect(() => {
    // Auto-fetch en montaje y cuando cambian los filtros. Ver nota en
    // useAccountingSummary sobre por qué se silencia set-state-in-effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refetch();
  }, [refetch]);

  const create = useCallback(async (input: ExpenseCategoryCreate) => {
    const res = await api.post<ExpenseCategoryDto>('/api/accounting/categories', input);
    await refetch();
    return res.data;
  }, [refetch]);

  const update = useCallback(async (id: string, input: ExpenseCategoryUpdate) => {
    const res = await api.patch<ExpenseCategoryDto>(`/api/accounting/categories/${id}`, input);
    await refetch();
    return res.data;
  }, [refetch]);

  const remove = useCallback(async (id: string) => {
    await api.delete(`/api/accounting/categories/${id}`);
    await refetch();
  }, [refetch]);

  return { ...state, refetch, create, update, remove };
}
