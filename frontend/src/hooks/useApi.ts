import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../services/api';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiOptions {
  immediate?: boolean;
}

export function useApi<T>(
  fetcher: () => Promise<T>,
  options: UseApiOptions = {}
): UseApiState<T> & { refetch: () => void } {
  const { immediate = true } = options;
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: immediate,
    error: null,
  });

  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: s.data === null, error: null }));
    fetcherRef.current()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled) {
          const message =
            err instanceof ApiError ? err.message :
            err instanceof Error ? err.message : 'Error desconocido';
          setState({ data: null, loading: false, error: message });
        }
      });
    return () => { cancelled = true; };
  }, [tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  return { ...state, refetch };
}
