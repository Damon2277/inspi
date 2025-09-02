/**
 * 代码分割和动态导入管理
 */
import { logger } from '@/lib/logging/logger';

/**
 * 代码分割策略
 */
export enum SplittingStrategy {
  ROUTE = 'route',           // 路由级分割
  COMPONENT = 'component',   // 组件级分割
  FEATURE = 'feature',       // 功能模块分割
  VENDOR = 'vendor',         // 第三方库分割
  ASYNC = 'async'           // 异步分割
}

/**
 * 分割配置
 */
export interface SplittingConfig {
  strategy: SplittingStrategy;
  chunkName?: string;
  priority?: number;
  preload?: boolean;
  prefetch?: boolean;
  webpackChunkName?: string;
  retries?: number;
  timeout?: number;
}

/**
 * 分割统计
 */
export interface SplittingStats {
  totalChunks: number;
  loadedChunks: number;
  failedChunks: number;
  totalSize: number;
  loadedSize: number;
  averageLoadTime: number;
  cacheHitRate: number;
  chunkDetails: Array<{
    name: string;
    size: number;
    loadTime: number;
    status: 'pending' | 'loaded' | 'failed';
    strategy: SplittingStrategy;
  }>;
}

/**
 * 动态导入结果
 */
export interface ImportResult<T> {
  module: T;
  loadTime: number;
  fromCache: boolean;
  chunkName?: string;
}

/**
 * 代码分割管理器
 */
export class CodeSplittingManager {
  private loadedChunks = new Map<string, any>();
  private loadingPromises = new Map<string, Promise<any>>();
  private loadTimes = new Map<string, number>();
  private failedChunks = new Set<string>();
  private chunkSizes = new Map<string, number>();

  /**
   * 动态导入模块
   */
  async importModule<T = any>(
    importFn: () => Promise<T>,
    config: SplittingConfig = {}
  ): Promise<ImportResult<T>> {
    const {
      chunkName = 'dynamic-chunk',
      retries = 3,
      timeout = 10000,
      preload = false,
      prefetch = false
    } = config;

    const startTime = Date.now();
    
    // 检查是否已加载
    if (this.loadedChunks.has(chunkName)) {
      return {
        module: this.loadedChunks.get(chunkName),
        loadTime: 0,
        fromCache: true,
        chunkName
      };
    }

    // 检查是否正在加载
    if (this.loadingPromises.has(chunkName)) {
      const module = await this.loadingPromises.get(chunkName);
      return {
        module,
        loadTime: Date.now() - startTime,
        fromCache: false,
        chunkName
      };
    }

    // 创建加载Promise
    const loadPromise = this.loadWithRetry(importFn, retries, timeout);
    this.loadingPromises.set(chunkName, loadPromise);

    try {
      const module = await loadPromise;
      const loadTime = Date.now() - startTime;

      // 缓存模块
      this.loadedChunks.set(chunkName, module);
      this.loadTimes.set(chunkName, loadTime);
      this.loadingPromises.delete(chunkName);

      // 预加载相关模块
      if (preload) {
        this.preloadRelatedModules(chunkName);
      }

      // 预获取相关模块
      if (prefetch) {
        this.prefetchRelatedModules(chunkName);
      }

      logger.debug('Module imported successfully', {
        chunkName,
        loadTime,
        strategy: config.strategy
      });

      return {
        module,
        loadTime,
        fromCache: false,
        chunkName
      };

    } catch (error) {
      this.failedChunks.add(chunkName);
      this.loadingPromises.delete(chunkName);
      
      logger.error('Module import failed', error instanceof Error ? error : new Error(String(error)), {
        chunkName,
        retries
      });
      
      throw error;
    }
  }

  /**
   * 批量导入模块
   */
  async importModules<T = any>(
    imports: Array<{
      importFn: () => Promise<T>;
      config: SplittingConfig;
    }>
  ): Promise<Array<ImportResult<T>>> {
    const results: Array<ImportResult<T>> = [];
    const batchSize = 3; // 并发限制

    for (let i = 0; i < imports.length; i += batchSize) {
      const batch = imports.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async ({ importFn, config }) => {
        try {
          return await this.importModule(importFn, config);
        } catch (error) {
          logger.error('Batch import failed', error instanceof Error ? error : new Error(String(error)), {
            chunkName: config.chunkName
          });
          return null;
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          results.push(result.value);
        }
      });
    }

    return results;
  }

  /**
   * 预加载模块
   */
  async preloadModule(
    importFn: () => Promise<any>,
    chunkName: string
  ): Promise<void> {
    if (this.loadedChunks.has(chunkName) || this.loadingPromises.has(chunkName)) {
      return;
    }

    try {
      await this.importModule(importFn, {
        chunkName,
        strategy: SplittingStrategy.ASYNC,
        preload: false,
        prefetch: false
      });
      
      logger.debug('Module preloaded', { chunkName });
    } catch (error) {
      logger.warn('Module preload failed', {
        chunkName,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * 预获取模块
   */
  prefetchModule(
    importFn: () => Promise<any>,
    chunkName: string
  ): void {
    // 在空闲时间预获取
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => {
        this.preloadModule(importFn, chunkName);
      });
    } else {
      setTimeout(() => {
        this.preloadModule(importFn, chunkName);
      }, 100);
    }
  }

  /**
   * 获取分割统计
   */
  getStats(): SplittingStats {
    const totalChunks = this.loadedChunks.size + this.failedChunks.size;
    const loadedChunks = this.loadedChunks.size;
    const failedChunks = this.failedChunks.size;

    const loadTimes = Array.from(this.loadTimes.values());
    const averageLoadTime = loadTimes.length > 0
      ? loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length
      : 0;

    const totalSize = Array.from(this.chunkSizes.values()).reduce((sum, size) => sum + size, 0);
    const loadedSize = Array.from(this.loadedChunks.keys())
      .reduce((sum, chunkName) => sum + (this.chunkSizes.get(chunkName) || 0), 0);

    const cacheHitRate = totalChunks > 0 ? (loadedChunks / totalChunks) * 100 : 0;

    const chunkDetails = Array.from(this.loadedChunks.keys()).map(chunkName => ({
      name: chunkName,
      size: this.chunkSizes.get(chunkName) || 0,
      loadTime: this.loadTimes.get(chunkName) || 0,
      status: 'loaded' as const,
      strategy: SplittingStrategy.ASYNC // 默认策略
    }));

    return {
      totalChunks,
      loadedChunks,
      failedChunks,
      totalSize,
      loadedSize,
      averageLoadTime,
      cacheHitRate,
      chunkDetails
    };
  }

  /**
   * 清理未使用的模块
   */
  cleanup(maxAge: number = 10 * 60 * 1000): void {
    const cutoffTime = Date.now() - maxAge;
    let cleanedCount = 0;

    for (const [chunkName, loadTime] of this.loadTimes.entries()) {
      if (loadTime < cutoffTime) {
        this.loadedChunks.delete(chunkName);
        this.loadTimes.delete(chunkName);
        this.chunkSizes.delete(chunkName);
        cleanedCount++;
      }
    }

    logger.info('Code splitting cache cleaned', { cleanedCount });
  }

  /**
   * 带重试的加载
   */
  private async loadWithRetry<T>(
    importFn: () => Promise<T>,
    retries: number,
    timeout: number
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // 设置超时
        const importPromise = importFn();
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Import timeout')), timeout);
        });

        return await Promise.race([importPromise, timeoutPromise]);

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < retries) {
          // 指数退避
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  /**
   * 预加载相关模块
   */
  private preloadRelatedModules(chunkName: string): void {
    // 这里可以根据依赖关系预加载相关模块
    logger.debug('Preloading related modules', { chunkName });
  }

  /**
   * 预获取相关模块
   */
  private prefetchRelatedModules(chunkName: string): void {
    // 这里可以根据使用模式预获取相关模块
    logger.debug('Prefetching related modules', { chunkName });
  }
}

/**
 * 路由级代码分割
 */
export class RouteSplitting {
  private codeSplittingManager: CodeSplittingManager;
  private routeChunks = new Map<string, string>();

  constructor(codeSplittingManager: CodeSplittingManager) {
    this.codeSplittingManager = codeSplittingManager;
  }

  /**
   * 注册路由分割
   */
  registerRoute(
    path: string,
    importFn: () => Promise<any>,
    config: Omit<SplittingConfig, 'strategy'> = {}
  ): void {
    const chunkName = config.chunkName || `route-${path.replace(/[^a-zA-Z0-9]/g, '-')}`;
    this.routeChunks.set(path, chunkName);

    // 预获取关键路由
    if (config.priority && config.priority > 5) {
      this.codeSplittingManager.prefetchModule(importFn, chunkName);
    }
  }

  /**
   * 加载路由组件
   */
  async loadRoute(path: string): Promise<any> {
    const chunkName = this.routeChunks.get(path);
    if (!chunkName) {
      throw new Error(`Route not registered: ${path}`);
    }

    // 这里需要实际的导入函数，在实际使用中会从注册时保存
    throw new Error('Route import function not available');
  }

  /**
   * 预加载路由
   */
  async preloadRoute(path: string): Promise<void> {
    const chunkName = this.routeChunks.get(path);
    if (!chunkName) {
      return;
    }

    // 这里需要实际的导入函数
    logger.debug('Route preload requested', { path, chunkName });
  }
}

/**
 * 组件级代码分割
 */
export class ComponentSplitting {
  private codeSplittingManager: CodeSplittingManager;
  private componentRegistry = new Map<string, () => Promise<any>>();

  constructor(codeSplittingManager: CodeSplittingManager) {
    this.codeSplittingManager = codeSplittingManager;
  }

  /**
   * 注册组件
   */
  registerComponent(
    name: string,
    importFn: () => Promise<any>,
    config: Omit<SplittingConfig, 'strategy'> = {}
  ): void {
    this.componentRegistry.set(name, importFn);

    const chunkName = config.chunkName || `component-${name}`;
    
    // 预加载高优先级组件
    if (config.priority && config.priority > 7) {
      this.codeSplittingManager.preloadModule(importFn, chunkName);
    }
  }

  /**
   * 加载组件
   */
  async loadComponent(name: string): Promise<any> {
    const importFn = this.componentRegistry.get(name);
    if (!importFn) {
      throw new Error(`Component not registered: ${name}`);
    }

    return await this.codeSplittingManager.importModule(importFn, {
      chunkName: `component-${name}`,
      strategy: SplittingStrategy.COMPONENT
    });
  }

  /**
   * 批量加载组件
   */
  async loadComponents(names: string[]): Promise<Array<ImportResult<any>>> {
    const imports = names.map(name => {
      const importFn = this.componentRegistry.get(name);
      if (!importFn) {
        throw new Error(`Component not registered: ${name}`);
      }

      return {
        importFn,
        config: {
          chunkName: `component-${name}`,
          strategy: SplittingStrategy.COMPONENT
        }
      };
    });

    return await this.codeSplittingManager.importModules(imports);
  }
}

/**
 * 代码分割工具函数
 */
export class SplittingUtils {
  /**
   * 创建动态导入
   */
  static createDynamicImport<T>(
    importFn: () => Promise<{ default: T }>,
    chunkName?: string
  ): () => Promise<T> {
    return async () => {
      const module = await importFn();
      return module.default;
    };
  }

  /**
   * 创建Webpack魔法注释
   */
  static createWebpackComment(
    chunkName: string,
    mode: 'lazy' | 'eager' | 'weak' = 'lazy',
    preload?: boolean,
    prefetch?: boolean
  ): string {
    const comments = [`webpackChunkName: "${chunkName}"`];
    
    if (mode !== 'lazy') {
      comments.push(`webpackMode: "${mode}"`);
    }
    
    if (preload) {
      comments.push('webpackPreload: true');
    }
    
    if (prefetch) {
      comments.push('webpackPrefetch: true');
    }

    return `/* ${comments.join(', ')} */`;
  }

  /**
   * 分析Bundle大小
   */
  static analyzeBundleSize(): Promise<{
    totalSize: number;
    chunks: Array<{
      name: string;
      size: number;
      modules: number;
    }>;
  }> {
    // 这里应该集成webpack-bundle-analyzer或类似工具
    return Promise.resolve({
      totalSize: 0,
      chunks: []
    });
  }

  /**
   * 检查浏览器支持
   */
  static checkSupport(): {
    dynamicImport: boolean;
    webpackChunks: boolean;
    modulePreload: boolean;
  } {
    return {
      dynamicImport: typeof import === 'function',
      webpackChunks: typeof __webpack_require__ !== 'undefined',
      modulePreload: 'modulepreload' in HTMLLinkElement.prototype
    };
  }
}

// 全局代码分割管理器实例
export const globalCodeSplittingManager = new CodeSplittingManager();
export const globalRouteSplitting = new RouteSplitting(globalCodeSplittingManager);
export const globalComponentSplitting = new ComponentSplitting(globalCodeSplittingManager);

export default CodeSplittingManager;