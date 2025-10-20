/**
 * 懒加载工具类
 * 实现组件和资源的懒加载功能
 */

import React, { lazy, ComponentType, LazyExoticComponent, Suspense, ReactNode } from 'react';

/**
 * 懒加载组件配置
 */
interface LazyComponentConfig {
  fallback?: ReactNode;
  retryCount?: number;
  retryDelay?: number;
}

/**
 * 创建懒加载组件
 */
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  config: LazyComponentConfig = {},
): LazyExoticComponent<T> {
  const { retryCount = 3, retryDelay = 1000 } = config;

  const retryImport = async (attempt = 1): Promise<{ default: T }> => {
    try {
      return await importFn();
    } catch (error) {
      if (attempt < retryCount) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        return retryImport(attempt + 1);
      }
      throw error;
    }
  };

  return lazy(() => retryImport());
}

/**
 * 懒加载包装器组件
 */
interface LazyWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  errorBoundary?: ComponentType<{ children: ReactNode }>;
}

export function LazyWrapper({
  children,
  fallback = <div className="loading-spinner">加载中...</div>,
  errorBoundary: ErrorBoundary }: LazyWrapperProps) {
  if (ErrorBoundary) {
    return (
      <ErrorBoundary>
        <Suspense fallback={fallback}>
          {children}
        </Suspense>
      </ErrorBoundary>
    );
  }

  return (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  );
}

/**
 * 图片懒加载Hook
 */
export function useImageLazyLoading() {
  const observerRef = React.useRef<IntersectionObserver | null>(null);

  React.useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            const src = img.dataset.src;
            if (src) {
              img.src = src;
              img.classList.remove('lazy');
              observerRef.current?.unobserve(img);
            }
          }
        });
      },
      {
        rootMargin: '50px 0px',
        threshold: 0.01 },
    );

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  const observeImage = React.useCallback((img: HTMLImageElement | null) => {
    if (img && observerRef.current) {
      observerRef.current.observe(img);
    }
  }, []);

  return { observeImage };
}

/**
 * 内容懒加载Hook
 */
export function useContentLazyLoading<T>(
  loadFn: () => Promise<T>,
  deps: React.DependencyList = [],
) {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await loadFn();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('加载失败'));
    } finally {
      setLoading(false);
    }
  }, [loadFn]);

  React.useEffect(() => {
    load();
  }, [load, deps]);

  return { data, loading, error, reload: load };
}

/**
 * 路由懒加载配置
 */
export const lazyRoutes = {
  // 认证相关页面
  Login: createLazyComponent(async () => {
    const moduleExports = await import('@/components/auth/LoginForm');
    return { default: moduleExports.LoginForm };
  }),
  Register: createLazyComponent(async () => {
    const moduleExports = await import('@/components/auth/RegisterForm');
    return { default: moduleExports.RegisterForm };
  }),

  // 社区相关页面
  WorkList: createLazyComponent(async () => {
    const moduleExports = await import('@/components/community/WorkList');
    return { default: moduleExports.WorkList };
  }),
  WorkEditor: createLazyComponent(async () => {
    const moduleExports = await import('@/components/community/WorkEditor');
    return { default: moduleExports.WorkEditor };
  }),

  // 知识图谱相关页面
  KnowledgeGraph: createLazyComponent(async () => {
    const moduleExports = await import('@/components/knowledge-graph/KnowledgeGraphEditor');
    return { default: moduleExports.KnowledgeGraphEditor };
  }),

  // 订阅相关页面
  SubscriptionPlans: createLazyComponent(async () => {
    const moduleExports = await import('@/components/subscription/SubscriptionPlans');
    return { default: moduleExports.SubscriptionPlans };
  }),

  // 管理相关页面
  AdminDashboard: createLazyComponent(async () => {
    const moduleExports = await import('@/components/admin/AdminDashboard');
    return { default: moduleExports.AdminDashboard };
  }) };

/**
 * 预加载工具
 */
export class PreloadManager {
  private static preloadedComponents = new Set<string>();
  private static preloadPromises = new Map<string, Promise<any>>();

  /**
   * 预加载组件
   */
  static async preloadComponent(
    name: keyof typeof lazyRoutes,
    priority: 'high' | 'low' = 'low',
  ) {
    if (this.preloadedComponents.has(name)) {
      return null;
    }

    const component = lazyRoutes[name];
    if (!component) {
      return null;
    }

    // 根据优先级决定预加载时机
    const delay = priority === 'high' ? 0 : 2000;

    if (!this.preloadPromises.has(name)) {
      const preloadPromise = new Promise(resolve => {
        setTimeout(async () => {
          try {
            // 触发组件加载
            await (component as any)._payload?._result;
            this.preloadedComponents.add(name);
            resolve(true);
          } catch (error) {
            console.warn(`预加载组件 ${name} 失败:`, error);
            resolve(false);
          }
        }, delay);
      });

      this.preloadPromises.set(name, preloadPromise);
    }

    return this.preloadPromises.get(name);
  }

  /**
   * 批量预加载
   */
  static async preloadComponents(
    components: Array<{ name: keyof typeof lazyRoutes; priority?: 'high' | 'low' }>,
  ) {
    const promises = components.map(({ name, priority }) =>
      this.preloadComponent(name, priority),
    );

    return Promise.allSettled(promises);
  }

  /**
   * 根据路由预加载相关组件
   */
  static preloadByRoute(currentRoute: string) {
    const routePreloadMap: Record<string, Array<keyof typeof lazyRoutes>> = {
      '/': ['WorkList', 'KnowledgeGraph'],
      '/auth': ['Login', 'Register'],
      '/community': ['WorkList', 'WorkEditor'],
      '/subscription': ['SubscriptionPlans'],
      '/admin': ['AdminDashboard'] };

    const componentsToPreload = routePreloadMap[currentRoute] || [];

    componentsToPreload.forEach(name => {
      this.preloadComponent(name, 'high');
    });
  }
}
