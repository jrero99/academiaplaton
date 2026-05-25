import { useCallback } from 'react';
import type {
  ExpenseCreate,
  ExpenseDto,
  ExpenseUpdate,
} from '@academiaplaton/shared';
import {
  createExpense,
  deleteExpense,
  updateExpense,
} from '../data/mock-store';

// El listado completo de Expenses ya lo expone el summary mensual, así que
// este hook solo cubre las mutaciones (create/update/delete) que las sheets
// consumen. `onMutated` se mantiene por compatibilidad de firma pero ya no
// hace falta — el store reactivo dispara los re-renders por sí solo.

interface Options {
  onMutated?: () => void;
}

export function useAccountingExpenses({ onMutated }: Options = {}) {
  const create = useCallback(async (input: ExpenseCreate): Promise<ExpenseDto> => {
    const created = createExpense(input);
    onMutated?.();
    return created;
  }, [onMutated]);

  const update = useCallback(async (id: string, input: ExpenseUpdate): Promise<ExpenseDto> => {
    const updated = updateExpense(id, input);
    onMutated?.();
    return updated;
  }, [onMutated]);

  const remove = useCallback(async (id: string): Promise<void> => {
    deleteExpense(id);
    onMutated?.();
  }, [onMutated]);

  return { create, update, remove };
}
