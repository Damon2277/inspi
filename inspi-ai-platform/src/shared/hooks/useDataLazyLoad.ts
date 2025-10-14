/**
 * 数据懒加载Hook
 */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

import { logger } from '@/lib/logging/logger';

/**
 * 数据懒加载配置
 */
export interface DataLazyLoadConfig {
  // 缓存键
  cacheKey?: string;
  // 缓存时间（毫秒）
  cacheTTL?: number;
  // 是否启用缓存
  enableCache?: boolean;
  // 重试次数
  retries?: number;
  // 重试延迟（毫秒）
  retryDelay?: number;
  // 超时时间（毫秒）
  timeout?: number;
  // 是否在组件挂载时自动加载
  autoLoad?: boolean;
  // 依赖项（当依赖项变化时重新加载）
  dependencies?: any[];
  // 错误处理
  onError?: (error: Error) => void;
  // 成功回调
  onSuccess?: (data: any) => void;
  // 加载开始回调
  onLoadStart?: () => void;
}

/**
 * 数据懒加载状态
 */
export interface DataLazyLoadState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  isLoaded: boolean;
  lastUpdated: Date | null;
  retryCount: number;
}

/**
 * 缓存项
 */
interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * 全局缓存
 */
const globalCache = new Map<string, CacheItem<any>>();

/**
 * 数据懒加载Hook
 */
export function useDataLazyLoad<T>(
  fetchFn: () => Promise<T>,
  config: DataLazyLoadConfig = {},
): [DataLazyLoadState<T>, () => void, () => void] {
  const {
    cacheKey,
    cacheTTL = 5 * 60 * 1000, // 5分钟
    enableCache = true,
    retries = 3,
    retryDelay = 1000,
    timeout = 10000,
    autoLoad = false,
    dependencies = [],
    onError,
    onSuccess,
    onLoadStart,
  } = config;

  const [state, setState] = useState<DataLazyLoadState<T>>({
    data: null,
    isLoading: false,
    error: null,
    isLoaded: false,
    lastUpdated: null,
    retryCount: 0,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  // 从缓存获取数据
  const getFromCache = useCallback((): T | null => {
    if (!enableCache || !cacheKey) {
      return;
    }

    const cached = globalCache.get(cacheKey);
    if (!cached) {
      return;
    }

    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      globalCache.delete(cacheKey);
      return;
    }

    return cached.data;
  }, [enableCache, cacheKey]);

  // 设置缓存
  const setCache = useCallback((data: T) => {
    if (!enableCache || !cacheKey) {
      return;
    }

    globalCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl: cacheTTL,
    });
  }, [enableCache, cacheKey, cacheTTL]);

  // 执行加载
  const load = useCallback(async (retryCount = 0) => {
    if (!mountedRef.current) {
      return;
    }

    // 检查缓存
    const cachedData = getFromCache();
    if (cachedData && retryCount === 0) {
      setState({
        data: cachedData,
        isLoading: false,
        error: null,
        isLoaded: true,
        lastUpdated: new Date(),
        retryCount: 0,
      });
      onSuccess && onSuccess(cachedData);
      return;
    }

    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    setState({ ...state, isLoading: true,
      error: null,
      retryCount,
     });

    onLoadStart && onLoadStart();

    try {
      // 设置超时
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), timeout);
      });

      const fetchPromise = fetchFn();
      const data = await Promise.race([fetchPromise, timeoutPromise]);

      if (!mountedRef.current || signal.aborted) {
        return;
      }

      // 设置缓存
      setCache(data);

      setState({
        data,
        isLoading: false,
        error: null,
        isLoaded: true,
        lastUpdated: new Date(),
        retryCount: 0,
      });

      onSuccess && onSuccess(data);

      logger.debug('Data lazy load completed', {
        cacheKey,
        retryCount,
        dataSize: JSON.stringify(data).length,
      });

    } catch (error) {
      if (!mountedRef.current || signal.aborted) {
        return;
      }

      const err = error instanceof Error ? error : new Error(String(error));

      logger.error('Data lazy load failed', err, {
        cacheKey,
        retryCount,
        maxRetries: retries,
      });

      // 重试逻辑
      if (retryCount < retries) {
        setTimeout(() => {
          load(retryCount + 1);
        }, retryDelay * (retryCount + 1));
        return;
      }

      setState({ ...state, isLoading: false,
        error: err,
        retryCount,
       });

      onError && onError(err);
    }
  }, [fetchFn, getFromCache, setCache, timeout, retries, retryDelay, onLoadStart, onSuccess, onError, cacheKey]);

  // 手动重新加载
  const reload = useCallback(() => {
    // 清除缓存
    if (cacheKey) {
      globalCache.delete(cacheKey);
    }
    load();
  }, [load, cacheKey]);

  // 自动加载
  useEffect(() => {
    if (autoLoad) {
      load();
    }
  }, [autoLoad, load]);

  // 依赖项变化时重新加载
  useEffect(() => {
    if (dependencies.length > 0 && state.isLoaded) {
      reload();
    }
  }, dependencies); // eslint-disable-line react-hooks/exhaustive-deps

  // 清理
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return [state, load, reload];
}

/**
 * 分页数据懒加载Hook
 */
export function usePaginatedDataLazyLoad<T>(
  fetchFn: (page: number, pageSize: number) => Promise<{ data: T[]; total: number; hasMore: boolean }>,
  pageSize: number = 20,
  config: Omit<DataLazyLoadConfig, 'autoLoad'> = {},
) {
  const [allData, setAllData] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const paginatedFetchFn = useCallback(async () => {
    const result = await fetchFn(page, pageSize);
    return result;
  }, [fetchFn, page, pageSize]);

  const [state, load, reload] = useDataLazyLoad(paginatedFetchFn, {
    ...config,
    cacheKey: config.cacheKey ? `${config.cacheKey}-page-${page}` : undefined,
    onSuccess: (result) => {
      if (page === 1) {
        setAllData(result.data);
      } else {
        setAllData(prev => [...prev, ...result.data]);
      }
      setTotal(result.total);
      setHasMore(result.hasMore);
      config.onSuccess?.(result);
    },
  });

  const loadMore = useCallback(() => {
    if (hasMore && !state.isLoading) {
      setPage(prev => prev + 1);
    }
  }, [hasMore, state.isLoading]);

  const reset = useCallback(() => {
    setAllData([]);
    setPage(1);
    setTotal(0);
    setHasMore(true);
  }, []);

  // 当页码变化时加载数据
  useEffect(() => {
    if (page > 1) {
      load();
    }
  }, [page, load]);

  return {
    data: allData,
    total,
    hasMore,
    page,
    state,
    loadMore,
    reset,
    reload: () => {
      reset();
      reload();
    },
  };
}

/**
 * 搜索数据懒加载Hook
 */
export function useSearchDataLazyLoad<T>(
  searchFn: (query: string) => Promise<T[]>,
  config: DataLazyLoadConfig & {
    debounceDelay?: number;
    minQueryLength?: number;
  } = {},
) {
  const {
    debounceDelay = 300,
    minQueryLength = 1,
    ...lazyLoadConfig
  } = config;

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const searchFetchFn = useCallback(async () => {
    if (debouncedQuery.length < minQueryLength) {
      return [];
    }
    return await searchFn(debouncedQuery);
  }, [searchFn, debouncedQuery, minQueryLength]);

  const [state, load, reload] = useDataLazyLoad(searchFetchFn, {
    ...lazyLoadConfig,
    cacheKey: lazyLoadConfig.cacheKey ? `${lazyLoadConfig.cacheKey}-search-${debouncedQuery}` : undefined,
  });

  // 防抖处理
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceDelay);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [query, debounceDelay]);

  // 当搜索词变化时加载数据
  useEffect(() => {
    if (debouncedQuery.length >= minQueryLength) {
      load();
    }
  }, [debouncedQuery, minQueryLength, load]);

  const search = useCallback((newQuery: string) => {
    setQuery(newQuery);
  }, []);

  const clear = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
  }, []);

  return {
    query,
    debouncedQuery,
    data: state.data || [],
    state,
    search,
    clear,
    reload,
  };
}

/**
 * 条件数据懒加载Hook
 */
export function useConditionalDataLazyLoad<T>(
  fetchFn: () => Promise<T>,
  condition: boolean | (() => boolean),
  config: DataLazyLoadConfig = {},
) {
  const shouldLoad = typeof condition === 'function' ? condition() : condition;

  const conditionalFetchFn = useCallback(async () => {
    if (!shouldLoad) {
      throw new Error('Condition not met');
    }
    return await fetchFn();
  }, [fetchFn, shouldLoad]);

  const [state, load, reload] = useDataLazyLoad(conditionalFetchFn, {
    ...config,
    autoLoad: config.autoLoad && shouldLoad,
  });

  // 当条件变化时重新评估
  useEffect(() => {
    if (shouldLoad && !state.isLoaded && !state.isLoading) {
      load();
    }
  }, [shouldLoad, state.isLoaded, state.isLoading, load]);

  return [state, load, reload] as const;
}

/**
 * 缓存工具函数
 */
export const cacheUtils = {
  /**
   * 清除所有缓存
   */
  clearAll: () => {
    globalCache.clear();
    logger.debug('All data lazy load cache cleared');
  },

  /**
   * 清除指定键的缓存
   */
  clear: (key: string) => {
    globalCache.delete(key);
    logger.debug('Data lazy load cache cleared', { key });
  },

  /**
   * 获取缓存统计
   */
  getStats: () => {
    const now = Date.now();
    let validCount = 0;
    let expiredCount = 0;
    let totalSize = 0;

    for (const [key, item] of globalCache.entries()) {
      const isExpired = now - item.timestamp > item.ttl;
      if (isExpired) {
        expiredCount++;
      } else {
        validCount++;
      }
      totalSize += JSON.stringify(item.data).length;
    }

    return {
      totalItems: globalCache.size,
      validItems: validCount,
      expiredItems: expiredCount,
      totalSize,
    };
  },

  /**
   * 清理过期缓存
   */
  cleanup: () => {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, item] of globalCache.entries()) {
      if (now - item.timestamp > item.ttl) {
        globalCache.delete(key);
        cleanedCount++;
      }
    }

    logger.debug('Expired data lazy load cache cleaned', { cleanedCount });
    return cleanedCount;
  },
};

// 定期清理过期缓存
if (typeof window !== 'undefined') {
  setInterval(() => {
    cacheUtils.cleanup();
  }, 5 * 60 * 1000); // 每5分钟清理一次
}

export default useDataLazyLoad;
