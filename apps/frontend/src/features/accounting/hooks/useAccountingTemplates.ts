import { useCallback, useMemo, useSyncExternalStore } from 'react';
import type {
  ExpenseTemplateCreate,
  ExpenseTemplateDto,
  ExpenseTemplateFilters,
  ExpenseTemplateUpdate,
} from '@academiaplaton/shared';
import {
  createTemplate,
  deleteTemplate,
  getAccountingSnapshot,
  listTemplates,
  subscribeAccounting,
  updateTemplate,
} from '../data/mock-store';

export function useAccountingTemplates(filters?: ExpenseTemplateFilters) {
  useSyncExternalStore(subscribeAccounting, getAccountingSnapshot, getAccountingSnapshot);

  const filtersKey = useMemo(() => JSON.stringify(filters ?? {}), [filters]);
  const templates = useMemo(
    () => listTemplates(filters),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtersKey, getAccountingSnapshot()],
  );

  const refetch = useCallback(async () => {
    /* no-op: store reactivo. */
  }, []);

  const create = useCallback(async (input: ExpenseTemplateCreate): Promise<ExpenseTemplateDto> => {
    return createTemplate(input);
  }, []);

  const update = useCallback(async (id: string, input: ExpenseTemplateUpdate): Promise<ExpenseTemplateDto> => {
    return updateTemplate(id, input);
  }, []);

  const remove = useCallback(async (id: string): Promise<void> => {
    deleteTemplate(id);
  }, []);

  return {
    templates,
    loading: false,
    error: null as string | null,
    refetch,
    create,
    update,
    remove,
  };
}
