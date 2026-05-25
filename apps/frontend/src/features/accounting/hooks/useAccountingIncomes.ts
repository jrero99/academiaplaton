import { useCallback } from 'react';
import type {
  IncomeCreate,
  IncomeDto,
  IncomeUpdate,
} from '@academiaplaton/shared';
import {
  createIncome,
  deleteIncome,
  updateIncome,
} from '../data/mock-store';

interface Options {
  onMutated?: () => void;
}

export function useAccountingIncomes({ onMutated }: Options = {}) {
  const create = useCallback(async (input: IncomeCreate): Promise<IncomeDto> => {
    const created = createIncome(input);
    onMutated?.();
    return created;
  }, [onMutated]);

  const update = useCallback(async (id: string, input: IncomeUpdate): Promise<IncomeDto> => {
    const updated = updateIncome(id, input);
    onMutated?.();
    return updated;
  }, [onMutated]);

  const remove = useCallback(async (id: string): Promise<void> => {
    deleteIncome(id);
    onMutated?.();
  }, [onMutated]);

  return { create, update, remove };
}
