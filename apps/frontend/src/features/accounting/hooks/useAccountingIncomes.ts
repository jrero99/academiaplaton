import { useCallback } from 'react';
import { api } from '@/lib/api';
import type {
  IncomeCreate,
  IncomeDto,
  IncomeUpdate,
} from '@academiaplaton/shared';

interface Options {
  onMutated?: () => void;
}

export function useAccountingIncomes({ onMutated }: Options = {}) {
  const create = useCallback(async (input: IncomeCreate): Promise<IncomeDto> => {
    const res = await api.post<IncomeDto>('/api/accounting/incomes', input);
    onMutated?.();
    return res.data;
  }, [onMutated]);

  const update = useCallback(async (id: string, input: IncomeUpdate): Promise<IncomeDto> => {
    const res = await api.patch<IncomeDto>(`/api/accounting/incomes/${id}`, input);
    onMutated?.();
    return res.data;
  }, [onMutated]);

  const remove = useCallback(async (id: string): Promise<void> => {
    await api.delete(`/api/accounting/incomes/${id}`);
    onMutated?.();
  }, [onMutated]);

  return { create, update, remove };
}
