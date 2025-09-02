/**
 * 懒加载组件
 */
'use client';

import React, { Suspense, lazy, ComponentType, LazyExoticComponent } from 'react';
import { logger } from '@/lib/logging/logger';
import LoadingBoundary from './LoadingBoundary';

/**
 * 懒加载配置
 */
export interface LazyLoadConfig {
  // 加载延迟（毫秒）
  delay?: number;
  // 重试次数
  retries?: number;
  // 重试延迟（毫秒）
  retryDelay?: number;
  // 超时时间（毫秒）
  timeout?: number;
  // 是否启用预加载
  preload?: boolean;
  // 预加载触发条件
  preloadTrigger?: 'hover' | 'visible' | 'idle';
  // 错误回退组件
  fallback?: ComponentType<any>;
  // 加载组件
  loading?: ComponentType<any>;
  // 错误处理
  onError?: (error: Error) => void;
  // 加载成功回调
  onLoad?: () => void;
}

/**
 * 懒加载状态
 */
interface LazyLoadState {
  isLoading: boolean;
  isLoaded: boolean;
  error: Error | null;
  retryCount: number;
}

/**
 * 创建懒加载组件
 */
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  config: LazyLoadConfig = {}
): LazyExoticComponent<T> {
  const {
    delay = 0,
    retries = 3,
    retryDelay = 1000,
    timeout = 10000,
    onError,
    onLoad
  } = config;

  // 创建带重试机制的导入函数
  const importWithRetry = async (): Promise<{ default: T }> => {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // 添加延迟
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        // 设置超时
        const importPromise = importFn();
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Import timeout')), timeout);
        });

        const result = await Promise.race([importPromise, timeoutPromise]);
        
        // 加载成功回调
        if (onLoad) {
          onLoad();
        }

        logger.debug('Lazy component loaded successfully', {
          attempt: attempt + 1,
          delay
        });

        return result;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        logger.warn('Lazy component load attempt failed', {
          attempt: attempt + 1,
          error: lastError.message,
          willRetry: attempt < retries
        });

        // 如果不是最后一次尝试，等待后重试
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
        }
      }
    }

    // 所有重试都失败了
    if (onError) {
      onError(lastError!);
    }

    logger.error('Lazy component load failed after all retries', lastError!, {
      retries,
      timeout
    });

    throw lastError!;
  };

  return lazy(importWithRetry);
}

/**
 * 懒加载包装器组件
 */
interface LazyWrapperProps {
  children: React.ReactNode;
  config?: LazyLoadConfig;
  fallback?: React.ReactNode;
}

export const LazyWrapper: React.FC<LazyWrapperProps> = ({
  children,
  config = {},
  fallback
}) => {
  const {
    loading: LoadingComponent,
    fallback: FallbackComponent
  } = config;

  const defaultFallback = fallback || (
    LoadingComponent ? <LoadingComponent /> : <div>Loading...</div>
  );

  return (
    <LoadingBoundary fallback={FallbackComponent}>
      <Suspense fallback={defaultFallback}>
        {children}
      </Suspense>
    </LoadingBoundary>
  );
};

/**
 * 高阶组件：懒加载
 */
export function withLazyLoading<P extends object>(
  Component: ComponentType<P>,
  config: LazyLoadConfig = {}
) {
  const LazyComponent = createLazyComponent(
    () => Promise.resolve({ default: Component }),
    config
  );

  const WrappedComponent: React.FC<P> = (props) => (
    <LazyWrapper config={config}>
      <LazyComponent {...props} />
    </LazyWrapper>
  );

  WrappedComponent.displayName = `withLazyLoading(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

/**
 * 懒加载Hook
 */
export function useLazyLoad<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  config: LazyLoadConfig = {}
): {
  Component: LazyExoticComponent<T> | null;
  state: LazyLoadState;
  load: () => void;
  preload: () => void;
} {
  const [state, setState] = React.useState<LazyLoadState>({
    isLoading: false,
    isLoaded: false,
    error: null,
    retryCount: 0
  });

  const [Component, setComponent] = React.useState<LazyExoticComponent<T> | null>(null);

  const load = React.useCallback(async () => {
    if (state.isLoaded || state.isLoading) {
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const LazyComponent = createLazyComponent(importFn, {
        ...config,
        onLoad: () => {
          setState(prev => ({ ...prev, isLoading: false, isLoaded: true }));
          config.onLoad?.();
        },
        onError: (error) => {
          setState(prev => ({ 
            ...prev, 
            isLoading: false, 
            error,
            retryCount: prev.retryCount + 1
          }));
          config.onError?.(error);
        }
      });

      setComponent(LazyComponent);

    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error instanceof Error ? error : new Error(String(error)),
        retryCount: prev.retryCount + 1
      }));
    }
  }, [importFn, config, state.isLoaded, state.isLoading]);

  const preload = React.useCallback(() => {
    // 预加载但不设置组件状态
    importFn().catch(error => {
      logger.warn('Preload failed', { error: error instanceof Error ? error.message : String(error) });
    });
  }, [importFn]);

  return { Component, state, load, preload };
}

/**
 * 路由懒加载组件
 */
interface RouteComponentProps {
  path: string;
  importFn: () => Promise<{ default: ComponentType<any> }>;
  config?: LazyLoadConfig;
  preloadCondition?: () => boolean;
}

export const RouteComponent: React.FC<RouteComponentProps> = ({
  path,
  importFn,
  config = {},
  preloadCondition
}) => {
  const { Component, state, load, preload } = useLazyLoad(importFn, config);
  const [shouldPreload, setShouldPreload] = React.useState(false);

  // 检查预加载条件
  React.useEffect(() => {
    if (preloadCondition && preloadCondition()) {
      setShouldPreload(true);
    }
  }, [preloadCondition]);

  // 执行预加载
  React.useEffect(() => {
    if (shouldPreload && config.preload) {
      preload();
    }
  }, [shouldPreload, config.preload, preload]);

  // 自动加载
  React.useEffect(() => {
    load();
  }, [load]);

  if (state.error) {
    const FallbackComponent = config.fallback;
    if (FallbackComponent) {
      return <FallbackComponent error={state.error} />;
    }
    return <div>Failed to load component for {path}</div>;
  }

  if (!Component) {
    const LoadingComponent = config.loading;
    if (LoadingComponent) {
      return <LoadingComponent />;
    }
    return <div>Loading {path}...</div>;
  }

  return (
    <LazyWrapper config={config}>
      <Component />
    </LazyWrapper>
  );
};

/**
 * 预加载管理器
 */
export class PreloadManager {
  private preloadedComponents = new Set<string>();
  private preloadPromises = new Map<string, Promise<any>>();

  /**
   * 预加载组件
   */
  async preload(
    key: string,
    importFn: () => Promise<{ default: ComponentType<any> }>
  ): Promise<void> {
    if (this.preloadedComponents.has(key)) {
      return;
    }

    if (this.preloadPromises.has(key)) {
      return this.preloadPromises.get(key);
    }

    const promise = importFn()
      .then(() => {
        this.preloadedComponents.add(key);
        this.preloadPromises.delete(key);
        logger.debug('Component preloaded', { key });
      })
      .catch(error => {
        this.preloadPromises.delete(key);
        logger.warn('Component preload failed', { key, error: error instanceof Error ? error.message : String(error) });
        throw error;
      });

    this.preloadPromises.set(key, promise);
    return promise;
  }

  /**
   * 批量预加载
   */
  async preloadBatch(
    components: Array<{
      key: string;
      importFn: () => Promise<{ default: ComponentType<any> }>;
    }>
  ): Promise<void> {
    const promises = components.map(({ key, importFn }) => 
      this.preload(key, importFn).catch(() => {}) // 忽略单个失败
    );

    await Promise.allSettled(promises);
  }

  /**
   * 检查是否已预加载
   */
  isPreloaded(key: string): boolean {
    return this.preloadedComponents.has(key);
  }

  /**
   * 清理预加载缓存
   */
  clear(): void {
    this.preloadedComponents.clear();
    this.preloadPromises.clear();
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    preloadedCount: number;
    pendingCount: number;
    preloadedComponents: string[];
  } {
    return {
      preloadedCount: this.preloadedComponents.size,
      pendingCount: this.preloadPromises.size,
      preloadedComponents: Array.from(this.preloadedComponents)
    };
  }
}

// 全局预加载管理器实例
export const globalPreloadManager = new PreloadManager();

/**
 * 预设懒加载配置
 */
export const lazyLoadPresets = {
  /**
   * 快速加载配置
   */
  fast: {
    delay: 0,
    retries: 2,
    retryDelay: 500,
    timeout: 5000,
    preload: true,
    preloadTrigger: 'hover' as const
  },

  /**
   * 稳定加载配置
   */
  stable: {
    delay: 100,
    retries: 3,
    retryDelay: 1000,
    timeout: 10000,
    preload: false
  },

  /**
   * 移动端优化配置
   */
  mobile: {
    delay: 200,
    retries: 2,
    retryDelay: 1500,
    timeout: 8000,
    preload: false
  },

  /**
   * 关键路由配置
   */
  critical: {
    delay: 0,
    retries: 5,
    retryDelay: 500,
    timeout: 15000,
    preload: true,
    preloadTrigger: 'idle' as const
  }
};

export default LazyWrapper;