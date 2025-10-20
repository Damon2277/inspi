/**
 * 懒加载Hook
 */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

import { logger } from '@/shared/utils/logger';

/**
 * 懒加载选项
 */
export interface UseLazyLoadOptions {
  // 触发条件
  trigger?: 'manual' | 'intersection' | 'hover' | 'focus' | 'idle';
  // 交叉观察器选项
  intersectionOptions?: IntersectionObserverInit;
  // 空闲回调选项
  idleOptions?: IdleRequestOptions;
  // 延迟时间（毫秒）
  delay?: number;
  // 是否只触发一次
  once?: boolean;
  // 是否启用
  enabled?: boolean;
  // 错误处理
  onError?: (error: Error) => void;
  // 加载成功回调
  onLoad?: () => void;
  // 加载开始回调
  onLoadStart?: () => void;
}

/**
 * 懒加载状态
 */
export interface LazyLoadState {
  isLoading: boolean;
  isLoaded: boolean;
  error: Error | null;
  hasTriggered: boolean;
}

/**
 * 懒加载Hook
 */
export function useLazyLoad<T>(
  loadFn: () => Promise<T>,
  options: UseLazyLoadOptions = {},
): [LazyLoadState, () => void, T | null] {
  const {
    trigger = 'manual',
    intersectionOptions,
    idleOptions,
    delay = 0,
    once = true,
    enabled = true,
    onError,
    onLoad,
    onLoadStart } = options;

  const [state, setState] = useState<LazyLoadState>({
    isLoading: false,
    isLoaded: false,
    error: null,
    hasTriggered: false });

  const [data, setData] = useState<T | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 执行加载
  const executeLoad = useCallback(async () => {
    if (!enabled || (once && state.hasTriggered) || state.isLoading) {
      return;
    }

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      hasTriggered: true,
    }));

    if (onLoadStart) onLoadStart();

    try {
      // 添加延迟
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const result = await loadFn();

      setData(result);
      setState(prev => ({
        ...prev,
        isLoading: false,
        isLoaded: true,
      }));

      if (onLoad) onLoad();

      logger.debug('Lazy load completed successfully');

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err,
      }));

      if (onError) onError(err);

      logger.error('Lazy load failed', err);
    }
  }, [loadFn, enabled, once, delay, onLoadStart, onLoad, onError, state]);

  // 手动触发加载
  const load = useCallback(() => {
    executeLoad();
  }, [executeLoad]);

  // 设置交叉观察器
  useEffect(() => {
    if (trigger === 'intersection' && enabled && !state.hasTriggered) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              executeLoad();
              if (once) {
                observer.disconnect();
              }
            }
          });
        },
        {
          threshold: 0.1,
          rootMargin: '50px',
          ...intersectionOptions },
      );

      observerRef.current = observer;

      return () => {
        observer.disconnect();
      };
    }
  }, [trigger, enabled, state.hasTriggered, executeLoad, once, intersectionOptions]);

  // 设置空闲回调
  useEffect(() => {
    if (trigger === 'idle' && enabled && !state.hasTriggered) {
      if ('requestIdleCallback' in window) {
        const idleId = (window as any).requestIdleCallback(
          () => {
            executeLoad();
          },
          {
            timeout: 5000,
            ...idleOptions },
        );

        return () => {
          (window as any).cancelIdleCallback(idleId);
        };
      } else {
        // 降级到setTimeout
        timeoutRef.current = setTimeout(() => {
          executeLoad();
        }, 100);

        return () => {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
        };
      }
    }
  }, [trigger, enabled, state.hasTriggered, executeLoad, idleOptions]);

  // 清理
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [state, load, data];
}

/**
 * 图片懒加载Hook
 */
export interface UseImageLazyLoadOptions extends Omit<UseLazyLoadOptions, 'trigger'> {
  src: string;
  placeholder?: string;
  fallback?: string;
  crossOrigin?: 'anonymous' | 'use-credentials';
}

export function useImageLazyLoad(options: UseImageLazyLoadOptions) {
  const { src, placeholder, fallback, crossOrigin, ...lazyOptions } = options;

  const loadImage = useCallback(async (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();

      if (crossOrigin) {
        img.crossOrigin = crossOrigin;
      }

      img.onload = () => {
        resolve(src);
      };

      img.onerror = () => {
        if (fallback) {
          resolve(fallback);
        } else {
          reject(new Error(`Failed to load image: ${src}`));
        }
      };

      img.src = src;
    });
  }, [src, fallback, crossOrigin]);

  const [state, load, imageSrc] = useLazyLoad(loadImage, {
    trigger: 'intersection',
    ...lazyOptions });

  const currentSrc = state.isLoaded ? imageSrc : placeholder;

  return {
    ...state,
    src: currentSrc,
    load };
}

/**
 * 组件懒加载Hook
 */
export interface UseComponentLazyLoadOptions extends UseLazyLoadOptions {
  importFn: () => Promise<{ default: React.ComponentType<any> }>;
}

export function useComponentLazyLoad(options: UseComponentLazyLoadOptions) {
  const { importFn, ...lazyOptions } = options;

  const loadComponent = useCallback(async () => {
    const moduleExports = await importFn();
    return moduleExports.default;
  }, [importFn]);

  return useLazyLoad(loadComponent, lazyOptions);
}

/**
 * 数据懒加载Hook
 */
export interface UseDataLazyLoadOptions<T> extends UseLazyLoadOptions {
  fetchFn: () => Promise<T>;
  cacheKey?: string;
  cacheTTL?: number;
}

export function useDataLazyLoad<T>(options: UseDataLazyLoadOptions<T>) {
  const { fetchFn, cacheKey, cacheTTL = 5 * 60 * 1000, ...lazyOptions } = options;
  const cacheRef = useRef<Map<string, { data: T; timestamp: number }>>(new Map());

  const loadData = useCallback(async (): Promise<T> => {
    // 检查缓存
    if (cacheKey) {
      const cached = cacheRef.current.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < cacheTTL) {
        logger.debug('Data loaded from cache', { cacheKey });
        return cached.data;
      }
    }

    // 获取新数据
    const data = await fetchFn();

    // 缓存数据
    if (cacheKey) {
      cacheRef.current.set(cacheKey, {
        data,
        timestamp: Date.now() });
    }

    return data;
  }, [fetchFn, cacheKey, cacheTTL]);

  return useLazyLoad(loadData, lazyOptions);
}

/**
 * 懒加载元素Hook - 返回ref用于绑定到DOM元素
 */
export function useLazyLoadElement<T extends HTMLElement = HTMLElement>(
  loadFn: () => Promise<void>,
  options: Omit<UseLazyLoadOptions, 'trigger'> & {
    trigger?: 'intersection' | 'hover' | 'focus';
  } = {},
) {
  const { trigger = 'intersection', ...lazyOptions } = options;
  const elementRef = useRef<T | null>(null);
  const [state, load] = useLazyLoad(loadFn, { trigger: 'manual', ...lazyOptions });

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    let observer: IntersectionObserver | null = null;
    let cleanup: (() => void) | null = null;

    switch (trigger) {
      case 'intersection':
        observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                load();
                if (lazyOptions.once !== false) {
                  if (observer) observer.disconnect();
                }
              }
            });
          },
          {
            threshold: 0.1,
            rootMargin: '50px',
            ...lazyOptions.intersectionOptions },
        );
        observer.observe(element);
        break;

      case 'hover':
        const handleMouseEnter = () => {
          load();
          if (lazyOptions.once !== false) {
            element.removeEventListener('mouseenter', handleMouseEnter);
          }
        };
        element.addEventListener('mouseenter', handleMouseEnter);
        cleanup = () => element.removeEventListener('mouseenter', handleMouseEnter);
        break;

      case 'focus':
        const handleFocus = () => {
          load();
          if (lazyOptions.once !== false) {
            element.removeEventListener('focus', handleFocus);
          }
        };
        element.addEventListener('focus', handleFocus);
        cleanup = () => element.removeEventListener('focus', handleFocus);
        break;
    }

    return () => {
      if (observer) observer.disconnect();
      if (cleanup) cleanup();
    };
  }, [trigger, load, lazyOptions.once, lazyOptions.intersectionOptions]);

  return [elementRef, state, load] as const;
}

/**
 * 批量懒加载Hook
 */
export interface UseBatchLazyLoadOptions extends UseLazyLoadOptions {
  batchSize?: number;
  concurrency?: number;
}

export function useBatchLazyLoad<T>(
  items: Array<() => Promise<T>>,
  options: UseBatchLazyLoadOptions = {},
) {
  const { batchSize = 5, concurrency = 3, ...lazyOptions } = options;
  const [results, setResults] = useState<Array<T | null>>(new Array(items.length).fill(null));
  const [loadedCount, setLoadedCount] = useState(0);

  const loadBatch = useCallback(async () => {
    const batches: Array<Array<() => Promise<T>>> = [];

    // 分批
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }

    // 并发执行批次
    for (const batch of batches) {
      const batchPromises = batch.map(async (loadFn, index) => {
        try {
          const result = await loadFn();
          const globalIndex = batches.indexOf(batch) * batchSize + index;

          setResults(prev => {
            const newResults = [...prev];
            newResults[globalIndex] = result;
            return newResults;
          });

          setLoadedCount(prev => prev + 1);

          return result;
        } catch (error) {
          logger.error('Batch lazy load item failed', error instanceof Error ? error : new Error(String(error)));
          return null;
        }
      });

      // 限制并发数
      const concurrentBatches = [];
      for (let i = 0; i < batchPromises.length; i += concurrency) {
        concurrentBatches.push(batchPromises.slice(i, i + concurrency));
      }

      for (const concurrentBatch of concurrentBatches) {
        await Promise.allSettled(concurrentBatch);
      }
    }
  }, [items, batchSize, concurrency]);

  const [state, load] = useLazyLoad(loadBatch, lazyOptions);

  return {
    ...state,
    results,
    loadedCount,
    totalCount: items.length,
    progress: items.length > 0 ? loadedCount / items.length : 0,
    load };
}

export default useLazyLoad;
