/**
 * 性能优化模块入口
 * 导出所有性能优化相关的工具和组件
 */

import React, { useEffect, useState } from 'react';

import { initializeCodeSplitting as createCodeSplittingManager } from './code-splitting';
import { PerformanceMonitor } from './performance-monitor';

// 懒加载相关
export {
  createLazyComponent,
  LazyWrapper,
  useImageLazyLoading,
  useContentLazyLoading,
  lazyRoutes,
  PreloadManager,
} from './lazy-loading';

// 代码分割相关
export {
  CodeSplittingManager,
  LoadPriority,
  initializeCodeSplitting,
  preloadByRoute,
  withPerformanceMonitoring,
  routeModuleConfigs,
} from './code-splitting';

// 虚拟滚动相关
export {
  VirtualScroll,
  VirtualGrid,
  useVirtualScroll,
  useInfiniteScroll,
} from './virtual-scroll';

// 图片优化相关
export {
  OptimizedImage,
  ResponsiveImage,
  ImageGallery,
  useImagePreloader,
  useImagePerformanceMonitoring,
  ImageCompressor,
  detectImageFormat,
} from './image-optimization';

// 性能监控相关
export {
  PerformanceMonitor,
  usePerformanceMonitoring,
} from './performance-monitor';

/**
 * 性能优化配置
 */
export interface PerformanceConfig {
  // 懒加载配置
  lazyLoading: {
    enabled: boolean;
    threshold: number;
    rootMargin: string;
  };

  // 代码分割配置
  codeSplitting: {
    enabled: boolean;
    preloadCritical: boolean;
    prefetchRoutes: boolean;
  };

  // 图片优化配置
  imageOptimization: {
    enabled: boolean;
    quality: number;
    format: 'webp' | 'avif' | 'auto';
    lazyLoading: boolean;
  };

  // 虚拟滚动配置
  virtualScrolling: {
    enabled: boolean;
    itemHeight: number;
    overscan: number;
  };

  // 性能监控配置
  monitoring: {
    enabled: boolean;
    reportInterval: number;
    thresholds: {
      fcp: number;
      lcp: number;
      cls: number;
      fid: number;
    };
  };
}

/**
 * 默认性能配置
 */
export const defaultPerformanceConfig: PerformanceConfig = {
  lazyLoading: {
    enabled: true,
    threshold: 0.1,
    rootMargin: '50px 0px',
  },
  codeSplitting: {
    enabled: true,
    preloadCritical: true,
    prefetchRoutes: true,
  },
  imageOptimization: {
    enabled: true,
    quality: 75,
    format: 'auto',
    lazyLoading: true,
  },
  virtualScrolling: {
    enabled: true,
    itemHeight: 100,
    overscan: 5,
  },
  monitoring: {
    enabled: process.env.NODE_ENV === 'production',
    reportInterval: 30000,
    thresholds: {
      fcp: 1800,
      lcp: 2500,
      cls: 0.1,
      fid: 100,
    },
  },
};

/**
 * 性能优化管理器
 */
export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  private config: PerformanceConfig;
  private initialized = false;

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = { ...defaultPerformanceConfig, ...config };
  }

  static getInstance(config?: Partial<PerformanceConfig>): PerformanceOptimizer {
    if (!this.instance) {
      this.instance = new PerformanceOptimizer(config);
    }
    return this.instance;
  }

  /**
   * 初始化性能优化
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('🚀 Initializing performance optimizations...');

    try {
      // 初始化代码分割
      if (this.config.codeSplitting.enabled) {
        await this.initializeCodeSplitting();
      }

      // 初始化性能监控
      if (this.config.monitoring.enabled) {
        this.initializePerformanceMonitoring();
      }

      // 初始化图片优化
      if (this.config.imageOptimization.enabled) {
        this.initializeImageOptimization();
      }

      // 初始化懒加载
      if (this.config.lazyLoading.enabled) {
        this.initializeLazyLoading();
      }

      this.initialized = true;
      console.log('✅ Performance optimizations initialized successfully');
    } catch (error: any) {
      console.error('❌ Failed to initialize performance optimizations:', error);
    }
  }

  /**
   * 初始化代码分割
   */
  private async initializeCodeSplitting(): Promise<void> {
    const manager = createCodeSplittingManager();

    if (this.config.codeSplitting.preloadCritical) {
      // 预加载关键模块
      await manager.preloadModule('community');
    }

    console.log('📦 Code splitting initialized');
  }

  /**
   * 初始化性能监控
   */
  private initializePerformanceMonitoring(): void {
    const monitor = PerformanceMonitor.getInstance();

    // 订阅性能指标更新
    monitor.subscribe((metrics) => {
      // 可以在这里处理性能指标
      if (process.env.NODE_ENV === 'development') {
        console.log('📊 Performance metrics updated:', metrics);
      }
    });

    console.log('📈 Performance monitoring initialized');
  }

  /**
   * 初始化图片优化
   */
  private initializeImageOptimization(): void {
    // 设置全局图片优化配置
    if (typeof window !== 'undefined') {
      (window as any).__PERFORMANCE_CONFIG__ = {
        imageOptimization: this.config.imageOptimization,
      };
    }

    console.log('🖼️ Image optimization initialized');
  }

  /**
   * 初始化懒加载
   */
  private initializeLazyLoading(): void {
    // 设置全局懒加载配置
    if (typeof window !== 'undefined') {
      (window as any).__LAZY_LOADING_CONFIG__ = this.config.lazyLoading;
    }

    console.log('⏳ Lazy loading initialized');
  }

  /**
   * 获取性能报告
   */
  getPerformanceReport(): any {
    if (!this.config.monitoring.enabled) {
      return null;
    }

    const monitor = PerformanceMonitor.getInstance();
    return monitor.generateReport();
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // 重新初始化相关模块
    if (this.initialized) {
      this.initialize();
    }
  }

  /**
   * 获取当前配置
   */
  getConfig(): PerformanceConfig {
    return { ...this.config };
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    if (this.config.monitoring.enabled) {
      const monitor = PerformanceMonitor.getInstance();
      monitor.cleanup();
    }

    this.initialized = false;
    console.log('🧹 Performance optimizations cleaned up');
  }
}

/**
 * React Hook for performance optimization
 */
export function usePerformanceOptimization(config?: Partial<PerformanceConfig>) {
  const [optimizer] = useState(() => PerformanceOptimizer.getInstance(config));
  const [initialized, setInitialized] = useState(false);
  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    const initializeOptimizer = async () => {
      await optimizer.initialize();
      setInitialized(true);
    };

    initializeOptimizer();

    return () => {
      optimizer.cleanup();
    };
  }, [optimizer]);

  useEffect(() => {
    if (!initialized) return;

    const updateReport = () => {
      const newReport = optimizer.getPerformanceReport();
      setReport(newReport);
    };

    // 立即获取一次报告
    updateReport();

    // 定期更新报告
    const interval = setInterval(updateReport, optimizer.getConfig().monitoring.reportInterval);

    return () => clearInterval(interval);
  }, [initialized, optimizer]);

  return {
    optimizer,
    initialized,
    report,
    config: optimizer.getConfig(),
  };
}

/**
 * 性能优化工具函数
 */
export const performanceUtils = {
  /**
   * 测量函数执行时间
   */
  measureExecutionTime: <T extends (...args: any[]) => any>(
    fn: T,
    name?: string,
  ): T => {
    return ((...args: Parameters<T>) => {
      const start = performance.now();
      const result = fn(...args);
      const end = performance.now();

      if (name) {
        console.log(`⏱️ ${name} execution time: ${(end - start).toFixed(2)}ms`);
      }

      return result;
    }) as T;
  },

  /**
   * 防抖函数
   */
  debounce: <T extends (...args: any[]) => any>(
    fn: T,
    delay: number,
  ): T => {
    let timeoutId: NodeJS.Timeout;

    return ((...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
    }) as T;
  },

  /**
   * 节流函数
   */
  throttle: <T extends (...args: any[]) => any>(
    fn: T,
    delay: number,
  ): T => {
    let lastCall = 0;

    return ((...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        return fn(...args);
      }
    }) as T;
  },

  /**
   * 空闲时执行
   */
  runWhenIdle: (fn: () => void, timeout = 5000): void => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(fn, { timeout });
    } else {
      setTimeout(fn, 0);
    }
  },

  /**
   * 批量执行
   */
  batchExecute: <T>(
    items: T[],
    processor: (item: T) => void,
    batchSize = 10,
    delay = 0,
  ): Promise<void> => {
    return new Promise((resolve) => {
      let index = 0;

      const processBatch = () => {
        const endIndex = Math.min(index + batchSize, items.length);

        for (let i = index; i < endIndex; i++) {
          processor(items[i]);
        }

        index = endIndex;

        if (index < items.length) {
          setTimeout(processBatch, delay);
        } else {
          resolve();
        }
      };

      processBatch();
    });
  },
};
