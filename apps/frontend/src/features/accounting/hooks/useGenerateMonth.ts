import { useCallback, useState } from 'react';
import type {
  GenerateMonthInput,
  GenerateMonthResult,
} from '@academiaplaton/shared';
import { generateMonthMock } from '../data/mock-store';

interface State {
  loading: boolean;
  error: string | null;
  result: GenerateMonthResult | null;
}

const initialState: State = { loading: false, error: null, result: null };

export function useGenerateMonth() {
  const [state, setState] = useState<State>(initialState);

  const generate = useCallback(async (input: GenerateMonthInput): Promise<GenerateMonthResult> => {
    setState({ loading: true, error: null, result: null });
    try {
      const result = generateMonthMock(input);
      setState({ loading: false, error: null, result });
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al generar el mes';
      setState({ loading: false, error: msg, result: null });
      throw err;
    }
  }, []);

  const reset = useCallback(() => setState(initialState), []);

  return { ...state, generate, reset };
}
