/**
 * 代码分割优化工具
 * 实现智能的代码分割和模块加载策略
 */

import React, { ComponentType } from 'react';

/**
 * 模块加载优先级
 */
export enum LoadPriority {
  CRITICAL = 'critical',    // 关键路径，立即加载
  HIGH = 'high',           // 高优先级，用户可能很快需要
  NORMAL = 'normal',       // 正常优先级，按需加载
  LOW = 'low',            // 低优先级，空闲时加载
  IDLE = 'idle'           // 空闲时加载，不影响主要功能
}

/**
 * 模块分割配置
 */
interface ModuleSplitConfig {
  name: string;
  priority: LoadPriority;
  preload?: boolean;
  prefetch?: boolean;
  dependencies?: string[];
}

/**
 * 代码分割管理器
 */
export class CodeSplittingManager {
  private static instance: CodeSplittingManager;
  private moduleRegistry = new Map<string, ModuleSplitConfig>();
  private loadedModules = new Set<string>();
  private loadingPromises = new Map<string, Promise<any>>();

  static getInstance(): CodeSplittingManager {
    if (!this.instance) {
      this.instance = new CodeSplittingManager();
    }
    return this.instance;
  }

  /**
   * 注册模块
   */
  registerModule(config: ModuleSplitConfig) {
    this.moduleRegistry.set(config.name, config);
  }

  /**
   * 批量注册模块
   */
  registerModules(configs: ModuleSplitConfig[]) {
    configs.forEach(config => this.registerModule(config));
  }

  /**
   * 加载模块
   */
  async loadModule(name: string): Promise<any> {
    if (this.loadedModules.has(name)) {
      return Promise.resolve();
    }

    if (this.loadingPromises.has(name)) {
      return this.loadingPromises.get(name);
    }

    const config = this.moduleRegistry.get(name);
    if (!config) {
      throw new Error(`Module ${name} not registered`);
    }

    // 先加载依赖
    if (config.dependencies?.length) {
      await Promise.all(
        config.dependencies.map(dep => this.loadModule(dep)),
      );
    }

    const loadPromise = this.performModuleLoad(name, config);
    this.loadingPromises.set(name, loadPromise);

    try {
      const result = await loadPromise;
      this.loadedModules.add(name);
      this.loadingPromises.delete(name);
      return result;
    } catch (error) {
      this.loadingPromises.delete(name);
      throw error;
    }
  }

  /**
   * 执行模块加载
   */
  private async performModuleLoad(name: string, config: ModuleSplitConfig): Promise<any> {
    // 根据优先级决定加载策略
    switch (config.priority) {
      case LoadPriority.CRITICAL:
        return this.loadImmediate(name);

      case LoadPriority.HIGH:
        return this.loadWithHighPriority(name);

      case LoadPriority.NORMAL:
        return this.loadNormal(name);

      case LoadPriority.LOW:
        return this.loadWithDelay(name, 1000);

      case LoadPriority.IDLE:
        return this.loadWhenIdle(name);

      default:
        return this.loadNormal(name);
    }
  }

  /**
   * 立即加载
   */
  private async loadImmediate(name: string): Promise<any> {
    return this.dynamicImport(name);
  }

  /**
   * 高优先级加载
   */
  private async loadWithHighPriority(name: string): Promise<any> {
    // 使用 requestIdleCallback 或 setTimeout 确保不阻塞主线程
    return new Promise((resolve, reject) => {
      const load = () => {
        this.dynamicImport(name).then(resolve).catch(reject);
      };

      if ('requestIdleCallback' in window) {
        requestIdleCallback(load, { timeout: 100 });
      } else {
        setTimeout(load, 0);
      }
    });
  }

  /**
   * 正常加载
   */
  private async loadNormal(name: string): Promise<any> {
    return this.dynamicImport(name);
  }

  /**
   * 延迟加载
   */
  private async loadWithDelay(name: string, delay: number): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, delay));
    return this.dynamicImport(name);
  }

  /**
   * 空闲时加载
   */
  private async loadWhenIdle(name: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const load = () => {
        this.dynamicImport(name).then(resolve).catch(reject);
      };

      if ('requestIdleCallback' in window) {
        requestIdleCallback(load, { timeout: 5000 });
      } else {
        setTimeout(load, 2000);
      }
    });
  }

  /**
   * 动态导入模块
   */
  private async dynamicImport(name: string): Promise<any> {
    // 这里需要根据实际的模块路径进行动态导入
    const moduleMap: Record<string, () => Promise<any>> = {
      'auth': () => import('@/components/auth/LoginForm'),
      'community': () => import('@/components/community/WorkList'),
      'knowledge-graph': () => import('@/components/knowledge-graph/KnowledgeGraphEditor'),
      'subscription': () => import('@/components/subscription/SubscriptionPlans'),
      'admin': () => import('@/components/admin/AdminDashboard'),
      'payment': () => import('@/components/payment/PaymentForm'),
      'profile': () => import('@/components/profile/UserProfile'),
    };

    const importFn = moduleMap[name];
    if (!importFn) {
      throw new Error(`No import function defined for module: ${name}`);
    }

    return importFn();
  }

  /**
   * 预加载模块
   */
  async preloadModule(name: string): Promise<void> {
    const config = this.moduleRegistry.get(name);
    if (!config || !config.preload) {
      return;
    }

    try {
      await this.loadModule(name);
    } catch (error) {
      console.warn(`Failed to preload module ${name}:`, error);
    }
  }

  /**
   * 预取模块
   */
  prefetchModule(name: string): void {
    const config = this.moduleRegistry.get(name);
    if (!config || !config.prefetch) {
      return;
    }

    // 使用 link rel="prefetch" 预取资源
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.as = 'script';
    link.href = this.getModuleUrl(name);
    document.head.appendChild(link);
  }

  /**
   * 获取模块URL（简化实现）
   */
  private getModuleUrl(name: string): string {
    // 在实际应用中，这应该从构建工具获取真实的chunk URL
    return `/_next/static/chunks/${name}.js`;
  }

  /**
   * 获取加载统计
   */
  getLoadingStats() {
    return {
      registered: this.moduleRegistry.size,
      loaded: this.loadedModules.size,
      loading: this.loadingPromises.size,
      loadedModules: Array.from(this.loadedModules),
      loadingModules: Array.from(this.loadingPromises.keys()),
    };
  }
}

/**
 * 路由级别的代码分割配置
 */
export const routeModuleConfigs: ModuleSplitConfig[] = [
  {
    name: 'auth',
    priority: LoadPriority.HIGH,
    preload: true,
    prefetch: false,
  },
  {
    name: 'community',
    priority: LoadPriority.CRITICAL,
    preload: true,
    prefetch: true,
  },
  {
    name: 'knowledge-graph',
    priority: LoadPriority.HIGH,
    preload: false,
    prefetch: true,
    dependencies: ['community'],
  },
  {
    name: 'subscription',
    priority: LoadPriority.NORMAL,
    preload: false,
    prefetch: true,
  },
  {
    name: 'admin',
    priority: LoadPriority.LOW,
    preload: false,
    prefetch: false,
  },
  {
    name: 'payment',
    priority: LoadPriority.HIGH,
    preload: false,
    prefetch: false,
    dependencies: ['subscription'],
  },
  {
    name: 'profile',
    priority: LoadPriority.NORMAL,
    preload: false,
    prefetch: true,
  },
];

/**
 * 初始化代码分割
 */
export function initializeCodeSplitting() {
  const manager = CodeSplittingManager.getInstance();
  manager.registerModules(routeModuleConfigs);

  // 预加载关键模块
  routeModuleConfigs
    .filter(config => config.preload)
    .forEach(config => {
      manager.preloadModule(config.name);
    });

  // 预取模块
  routeModuleConfigs
    .filter(config => config.prefetch)
    .forEach(config => {
      manager.prefetchModule(config.name);
    });

  return manager;
}

/**
 * 基于路由的智能预加载
 */
export function preloadByRoute(currentRoute: string, nextRoute?: string) {
  const manager = CodeSplittingManager.getInstance();

  const routeModuleMap: Record<string, string[]> = {
    '/': ['community', 'knowledge-graph'],
    '/auth': ['auth'],
    '/auth/login': ['auth'],
    '/auth/register': ['auth'],
    '/community': ['community', 'knowledge-graph'],
    '/subscription': ['subscription', 'payment'],
    '/admin': ['admin'],
    '/profile': ['profile'],
  };

  // 预加载当前路由相关模块
  const currentModules = routeModuleMap[currentRoute] || [];
  currentModules.forEach(moduleName => {
    manager.preloadModule(moduleName);
  });

  // 如果有下一个路由，预取相关模块
  if (nextRoute) {
    const nextModules = routeModuleMap[nextRoute] || [];
    nextModules.forEach(moduleName => {
      manager.prefetchModule(moduleName);
    });
  }
}

/**
 * 性能监控装饰器
 */
export function withPerformanceMonitoring<T extends ComponentType<any>>(
  Component: T,
  componentName: string,
): T {
  const WrappedComponent = (props: any) => {
    React.useEffect(() => {
      const startTime = performance.now();

      return () => {
        const endTime = performance.now();
        const renderTime = endTime - startTime;

        // 记录性能指标
        if (renderTime > 100) { // 超过100ms认为是慢渲染
          console.warn(`Slow render detected for ${componentName}: ${renderTime.toFixed(2)}ms`);
        }

        // 发送性能数据到监控系统
        if (typeof window !== 'undefined' && 'performance' in window) {
          performance.mark(`${componentName}-render-end`);
          performance.measure(
            `${componentName}-render`,
            `${componentName}-render-start`,
            `${componentName}-render-end`,
          );
        }
      };
    }, []);

    React.useEffect(() => {
      performance.mark(`${componentName}-render-start`);
    });

    return React.createElement(Component, props);
  };

  WrappedComponent.displayName = `withPerformanceMonitoring(${componentName})`;
  return WrappedComponent as T;
}
