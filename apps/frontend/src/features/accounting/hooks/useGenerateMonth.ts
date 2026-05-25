import { useCallback, useState } from 'react';
import { api, getErrorMessage } from '@/lib/api';
import type {
  GenerateMonthInput,
  GenerateMonthResult,
} from '@academiaplaton/shared';

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
      const res = await api.post<GenerateMonthResult>(
        '/api/accounting/generate-month',
        input,
      );
      setState({ loading: false, error: null, result: res.data });
      return res.data;
    } catch (err) {
      const msg = getErrorMessage(err);
      setState({ loading: false, error: msg, result: null });
      throw err;
    }
  }, []);

  const reset = useCallback(() => setState(initialState), []);

  return { ...state, generate, reset };
}
