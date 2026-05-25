import { useCallback, useMemo, useSyncExternalStore } from 'react';
import type {
  ExpenseCategoryCreate,
  ExpenseCategoryDto,
  ExpenseCategoryFilters,
  ExpenseCategoryUpdate,
} from '@academiaplaton/shared';
import {
  createCategory,
  deleteCategory,
  getAccountingSnapshot,
  listCategories,
  subscribeAccounting,
  updateCategory,
} from '../data/mock-store';

// Hook mock-only: lee del store en memoria y filtra al vuelo. Cualquier
// mutación llama al store y la suscripción dispara re-render automático.
export function useAccountingCategories(filters?: ExpenseCategoryFilters) {
  // Suscripción al store — re-renderiza cuando cambian las categorías.
  useSyncExternalStore(subscribeAccounting, getAccountingSnapshot, getAccountingSnapshot);

  // Estabilizamos la clave de filtros para no recalcular en cada render
  // cuando el consumidor pasa un objeto literal nuevo.
  const filtersKey = useMemo(() => JSON.stringify(filters ?? {}), [filters]);
  const categories = useMemo(
    () => listCategories(filters),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtersKey, getAccountingSnapshot()],
  );

  const refetch = useCallback(async () => {
    /* no-op: el store ya es la fuente de verdad y reactiva. */
  }, []);

  const create = useCallback(async (input: ExpenseCategoryCreate): Promise<ExpenseCategoryDto> => {
    return createCategory(input);
  }, []);

  const update = useCallback(async (id: string, input: ExpenseCategoryUpdate): Promise<ExpenseCategoryDto> => {
    return updateCategory(id, input);
  }, []);

  const remove = useCallback(async (id: string): Promise<void> => {
    deleteCategory(id);
  }, []);

  return {
    categories,
    loading: false,
    error: null as string | null,
    refetch,
    create,
    update,
    remove,
  };
}
