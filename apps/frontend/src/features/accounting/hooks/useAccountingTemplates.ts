import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, getErrorMessage } from '@/lib/api';
import type {
  ExpenseTemplateCreate,
  ExpenseTemplateDto,
  ExpenseTemplateFilters,
  ExpenseTemplateUpdate,
} from '@academiaplaton/shared';

interface State {
  templates: ExpenseTemplateDto[];
  loading: boolean;
  error: string | null;
}

const initialState: State = { templates: [], loading: true, error: null };

export function useAccountingTemplates(filters?: ExpenseTemplateFilters) {
  const [state, setState] = useState<State>(initialState);

  const filtersKey = useMemo(() => JSON.stringify(filters ?? {}), [filters]);

  const refetch = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await api.get<ExpenseTemplateDto[]>('/api/accounting/templates', {
        params: filters,
      });
      setState({ templates: res.data, loading: false, error: null });
    } catch (err) {
      setState({ templates: [], loading: false, error: getErrorMessage(err) });
    }
    // Ver useAccountingCategories: usamos filtersKey como dep estable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey]);

  useEffect(() => {
    // Ver useAccountingSummary para el razonamiento del silenciamiento.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refetch();
  }, [refetch]);

  const create = useCallback(async (input: ExpenseTemplateCreate) => {
    const res = await api.post<ExpenseTemplateDto>('/api/accounting/templates', input);
    await refetch();
    return res.data;
  }, [refetch]);

  const update = useCallback(async (id: string, input: ExpenseTemplateUpdate) => {
    const res = await api.patch<ExpenseTemplateDto>(`/api/accounting/templates/${id}`, input);
    await refetch();
    return res.data;
  }, [refetch]);

  const remove = useCallback(async (id: string) => {
    await api.delete(`/api/accounting/templates/${id}`);
    await refetch();
  }, [refetch]);

  return { ...state, refetch, create, update, remove };
}
