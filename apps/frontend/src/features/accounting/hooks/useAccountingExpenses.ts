import { useCallback } from 'react';
import { api } from '@/lib/api';
import type {
  ExpenseCreate,
  ExpenseDto,
  ExpenseUpdate,
} from '@academiaplaton/shared';

// El listado completo de Expenses ya lo expone el summary mensual, así que
// este hook solo cubre las mutaciones (create/update/delete) que las sheets
// consumen. Devolvemos los datos + un callback `onMutated` opcional que la
// página invocará para refrescar el summary tras la operación.

interface Options {
  onMutated?: () => void;
}

export function useAccountingExpenses({ onMutated }: Options = {}) {
  const create = useCallback(async (input: ExpenseCreate): Promise<ExpenseDto> => {
    const res = await api.post<ExpenseDto>('/api/accounting/expenses', input);
    onMutated?.();
    return res.data;
  }, [onMutated]);

  const update = useCallback(async (id: string, input: ExpenseUpdate): Promise<ExpenseDto> => {
    const res = await api.patch<ExpenseDto>(`/api/accounting/expenses/${id}`, input);
    onMutated?.();
    return res.data;
  }, [onMutated]);

  const remove = useCallback(async (id: string): Promise<void> => {
    await api.delete(`/api/accounting/expenses/${id}`);
    onMutated?.();
  }, [onMutated]);

  return { create, update, remove };
}
