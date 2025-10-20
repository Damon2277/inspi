'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * 批量状态更新 Hook
 * 将多次状态更新合并为一次，减少重新渲染
 */
export function useBatchUpdate<T>(
  initialState: T,
  delay: number = 16, // 默认一帧的时间
): [T, (updates: Partial<T> | ((prev: T) => Partial<T>)) => void, () => void] {
  const [state, setState] = useState<T>(initialState);
  const pendingUpdates = useRef<Array<Partial<T>>>([]);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const batchUpdate = useCallback((updates: Partial<T> | ((prev: T) => Partial<T>)) => {
    const actualUpdates = typeof updates === 'function' ? updates(state) : updates;
    pendingUpdates.current.push(actualUpdates);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (pendingUpdates.current.length > 0) {
        setState(prev => {
          const merged = pendingUpdates.current.reduce(
            (acc, update) => ({ ...acc, ...update }),
            {},
          );
          pendingUpdates.current = [];
          return { ...prev, ...merged };
        });
      }
    }, delay);
  }, [delay, state]);

  const forceUpdate = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (pendingUpdates.current.length > 0) {
      setState(prev => {
        const merged = pendingUpdates.current.reduce(
          (acc, update) => ({ ...acc, ...update }),
          {},
        );
        pendingUpdates.current = [];
        return { ...prev, ...merged };
      });
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [state, batchUpdate, forceUpdate];
}

/**
 * 防抖 Hook
 */
export function useDebouncedValue<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * 节流 Hook
 */
export function useThrottle<T>(value: T, interval: number = 500): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastUpdated = useRef<number>(Date.now());

  useEffect(() => {
    const now = Date.now();

    if (now >= lastUpdated.current + interval) {
      lastUpdated.current = now;
      setThrottledValue(value);
    } else {
      const timer = setTimeout(() => {
        lastUpdated.current = Date.now();
        setThrottledValue(value);
      }, interval - (now - lastUpdated.current));

      return () => {
        clearTimeout(timer);
      };
    }
  }, [value, interval]);

  return throttledValue;
}

/**
 * 延迟加载 Hook
 */
export function useLazyLoad<T>(
  loader: () => Promise<T>,
  dependencies: any[] = [],
): {
  data: T | null;
  loading: boolean;
  error: Error | null;
  reload: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await loader();

      if (mountedRef.current) {
        setData(result);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err as Error);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [loader]);

  useEffect(() => {
    mountedRef.current = true;
    load();

    return () => {
      mountedRef.current = false;
    };
  }, [load, dependencies]);

  return { data, loading, error, reload: load };
}
