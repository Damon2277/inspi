/**
 * 内存使用监控和优化
 */
import { logger } from '@/lib/logging/logger';

/**
 * 内存使用信息
 */
export interface MemoryInfo {
  // JavaScript堆内存使用量（字节）
  usedJSHeapSize: number;
  // JavaScript堆内存总量（字节）
  totalJSHeapSize: number;
  // JavaScript堆内存限制（字节）
  jsHeapSizeLimit: number;
  // 使用率（百分比）
  usagePercentage: number;
  // 时间戳
  timestamp: Date;
}

/**
 * 内存监控配置
 */
export interface MemoryMonitorConfig {
  // 监控间隔（毫秒）
  interval?: number;
  // 内存使用警告阈值（百分比）
  warningThreshold?: number;
  // 内存使用危险阈值（百分比）
  dangerThreshold?: number;
  // 是否启用自动垃圾回收建议
  enableGCHints?: boolean;
  // 历史记录保留数量
  historyLimit?: number;
  // 是否启用内存泄漏检测
  enableLeakDetection?: boolean;
  // 内存泄漏检测阈值（连续增长次数）
  leakDetectionThreshold?: number;
}

/**
 * 内存监控事件
 */
export interface MemoryMonitorEvents {
  onWarning?: (info: MemoryInfo) => void;
  onDanger?: (info: MemoryInfo) => void;
  onLeakDetected?: (trend: MemoryTrend) => void;
  onUpdate?: (info: MemoryInfo) => void;
}

/**
 * 内存趋势分析
 */
export interface MemoryTrend {
  direction: 'increasing' | 'decreasing' | 'stable';
  rate: number; // 变化率（字节/秒）
  duration: number; // 趋势持续时间（毫秒）
  confidence: number; // 置信度（0-1）
  samples: MemoryInfo[];
}

/**
 * 内存优化建议
 */
export interface MemoryOptimizationSuggestion {
  type: 'gc' | 'cleanup' | 'reduce' | 'defer';
  priority: 'high' | 'medium' | 'low';
  description: string;
  action: string;
  estimatedSaving: number; // 预估节省的内存（字节）
}

/**
 * 内存监控器
 */
export class MemoryMonitor {
  private config: Required<MemoryMonitorConfig>;
  private events: MemoryMonitorEvents;
  private history: MemoryInfo[] = [];
  private intervalId: NodeJS.Timeout | null = null;
  private isMonitoring = false;
  private lastGCTime = 0;
  private leakDetectionCounter = 0;

  constructor(config: MemoryMonitorConfig = {}, events: MemoryMonitorEvents = {}) {
    this.config = {
      interval: 5000, // 5秒
      warningThreshold: 70, // 70%
      dangerThreshold: 85, // 85%
      enableGCHints: true,
      historyLimit: 100,
      enableLeakDetection: true,
      leakDetectionThreshold: 5,
      ...config
    };
    this.events = events;
  }

  /**
   * 开始监控
   */
  start(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.intervalId = setInterval(() => {
      this.collectMemoryInfo();
    }, this.config.interval);

    // 立即收集一次数据
    this.collectMemoryInfo();

    logger.info('Memory monitoring started', {
      interval: this.config.interval,
      warningThreshold: this.config.warningThreshold,
      dangerThreshold: this.config.dangerThreshold
    });
  }

  /**
   * 停止监控
   */
  stop(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    logger.info('Memory monitoring stopped');
  }

  /**
   * 获取当前内存信息
   */
  getCurrentMemoryInfo(): MemoryInfo | null {
    if (!this.isMemoryAPIAvailable()) {
      return null;
    }

    const memory = (performance as any).memory;
    const usagePercentage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;

    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usagePercentage,
      timestamp: new Date()
    };
  }

  /**
   * 获取内存历史记录
   */
  getHistory(): MemoryInfo[] {
    return [...this.history];
  }

  /**
   * 分析内存趋势
   */
  analyzeTrend(samples?: MemoryInfo[]): MemoryTrend | null {
    const data = samples || this.history;
    if (data.length < 3) {
      return null;
    }

    const recentSamples = data.slice(-10); // 最近10个样本
    const firstSample = recentSamples[0];
    const lastSample = recentSamples[recentSamples.length - 1];
    
    const timeDiff = lastSample.timestamp.getTime() - firstSample.timestamp.getTime();
    const memoryDiff = lastSample.usedJSHeapSize - firstSample.usedJSHeapSize;
    
    const rate = timeDiff > 0 ? (memoryDiff / timeDiff) * 1000 : 0; // 字节/秒
    
    let direction: 'increasing' | 'decreasing' | 'stable';
    if (Math.abs(rate) < 1000) { // 小于1KB/s认为是稳定
      direction = 'stable';
    } else if (rate > 0) {
      direction = 'increasing';
    } else {
      direction = 'decreasing';
    }

    // 计算置信度（基于样本数量和趋势一致性）
    const confidence = Math.min(recentSamples.length / 10, 1);

    return {
      direction,
      rate,
      duration: timeDiff,
      confidence,
      samples: recentSamples
    };
  }

  /**
   * 获取优化建议
   */
  getOptimizationSuggestions(): MemoryOptimizationSuggestion[] {
    const currentInfo = this.getCurrentMemoryInfo();
    if (!currentInfo) {
      return [];
    }

    const suggestions: MemoryOptimizationSuggestion[] = [];
    const trend = this.analyzeTrend();

    // 基于当前使用率的建议
    if (currentInfo.usagePercentage > this.config.dangerThreshold) {
      suggestions.push({
        type: 'gc',
        priority: 'high',
        description: '内存使用率过高，建议立即进行垃圾回收',
        action: '调用 window.gc() 或减少内存使用',
        estimatedSaving: currentInfo.usedJSHeapSize * 0.2
      });

      suggestions.push({
        type: 'cleanup',
        priority: 'high',
        description: '清理不必要的对象引用和事件监听器',
        action: '检查并清理DOM引用、定时器、事件监听器',
        estimatedSaving: currentInfo.usedJSHeapSize * 0.15
      });
    } else if (currentInfo.usagePercentage > this.config.warningThreshold) {
      suggestions.push({
        type: 'reduce',
        priority: 'medium',
        description: '内存使用率较高，建议优化数据结构',
        action: '使用更高效的数据结构，减少不必要的数据缓存',
        estimatedSaving: currentInfo.usedJSHeapSize * 0.1
      });
    }

    // 基于趋势的建议
    if (trend && trend.direction === 'increasing' && trend.rate > 10000) { // 10KB/s
      suggestions.push({
        type: 'defer',
        priority: 'medium',
        description: '内存持续增长，建议延迟非关键操作',
        action: '延迟加载非关键资源，使用懒加载策略',
        estimatedSaving: trend.rate * 10 // 10秒的增长量
      });
    }

    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * 强制垃圾回收（如果可用）
   */
  forceGarbageCollection(): boolean {
    if (typeof window !== 'undefined' && 'gc' in window) {
      try {
        (window as any).gc();
        this.lastGCTime = Date.now();
        logger.info('Forced garbage collection executed');
        return true;
      } catch (error) {
        logger.warn('Failed to force garbage collection', { error: error instanceof Error ? error.message : String(error) });
      }
    }
    return false;
  }

  /**
   * 获取内存使用统计
   */
  getMemoryStats(): {
    current: MemoryInfo | null;
    peak: MemoryInfo | null;
    average: number;
    trend: MemoryTrend | null;
    suggestions: MemoryOptimizationSuggestion[];
  } {
    const current = this.getCurrentMemoryInfo();
    const peak = this.history.reduce((max, info) => 
      !max || info.usedJSHeapSize > max.usedJSHeapSize ? info : max
    , null as MemoryInfo | null);
    
    const average = this.history.length > 0
      ? this.history.reduce((sum, info) => sum + info.usedJSHeapSize, 0) / this.history.length
      : 0;

    const trend = this.analyzeTrend();
    const suggestions = this.getOptimizationSuggestions();

    return {
      current,
      peak,
      average,
      trend,
      suggestions
    };
  }

  /**
   * 收集内存信息
   */
  private collectMemoryInfo(): void {
    const info = this.getCurrentMemoryInfo();
    if (!info) {
      return;
    }

    // 添加到历史记录
    this.history.push(info);
    
    // 限制历史记录数量
    if (this.history.length > this.config.historyLimit) {
      this.history = this.history.slice(-this.config.historyLimit);
    }

    // 触发更新事件
    this.events.onUpdate?.(info);

    // 检查阈值
    this.checkThresholds(info);

    // 检查内存泄漏
    if (this.config.enableLeakDetection) {
      this.checkMemoryLeak();
    }

    // 自动垃圾回收建议
    if (this.config.enableGCHints) {
      this.checkGCHints(info);
    }
  }

  /**
   * 检查阈值
   */
  private checkThresholds(info: MemoryInfo): void {
    if (info.usagePercentage >= this.config.dangerThreshold) {
      this.events.onDanger?.(info);
      logger.warn('Memory usage in danger zone', {
        usage: info.usagePercentage,
        threshold: this.config.dangerThreshold,
        usedMB: Math.round(info.usedJSHeapSize / 1024 / 1024),
        limitMB: Math.round(info.jsHeapSizeLimit / 1024 / 1024)
      });
    } else if (info.usagePercentage >= this.config.warningThreshold) {
      this.events.onWarning?.(info);
      logger.info('Memory usage warning', {
        usage: info.usagePercentage,
        threshold: this.config.warningThreshold,
        usedMB: Math.round(info.usedJSHeapSize / 1024 / 1024)
      });
    }
  }

  /**
   * 检查内存泄漏
   */
  private checkMemoryLeak(): void {
    const trend = this.analyzeTrend();
    if (!trend) {
      return;
    }

    if (trend.direction === 'increasing' && trend.rate > 5000) { // 5KB/s
      this.leakDetectionCounter++;
      
      if (this.leakDetectionCounter >= this.config.leakDetectionThreshold) {
        this.events.onLeakDetected?.(trend);
        logger.error('Potential memory leak detected', {
          rate: trend.rate,
          duration: trend.duration,
          confidence: trend.confidence
        });
        this.leakDetectionCounter = 0; // 重置计数器
      }
    } else {
      this.leakDetectionCounter = 0;
    }
  }

  /**
   * 检查垃圾回收建议
   */
  private checkGCHints(info: MemoryInfo): void {
    const timeSinceLastGC = Date.now() - this.lastGCTime;
    const shouldSuggestGC = 
      info.usagePercentage > this.config.warningThreshold &&
      timeSinceLastGC > 30000; // 30秒

    if (shouldSuggestGC) {
      logger.info('Garbage collection recommended', {
        usage: info.usagePercentage,
        timeSinceLastGC
      });
    }
  }

  /**
   * 检查内存API是否可用
   */
  private isMemoryAPIAvailable(): boolean {
    return typeof performance !== 'undefined' && 
           'memory' in performance &&
           typeof (performance as any).memory === 'object';
  }
}

/**
 * 内存优化工具
 */
export class MemoryOptimizer {
  private static weakMapCache = new WeakMap();
  private static objectPool = new Map<string, any[]>();

  /**
   * 创建对象池
   */
  static createObjectPool<T>(
    name: string,
    factory: () => T,
    reset: (obj: T) => void,
    maxSize: number = 100
  ): {
    acquire: () => T;
    release: (obj: T) => void;
    size: () => number;
    clear: () => void;
  } {
    if (!this.objectPool.has(name)) {
      this.objectPool.set(name, []);
    }

    const pool = this.objectPool.get(name)!;

    return {
      acquire: (): T => {
        if (pool.length > 0) {
          return pool.pop() as T;
        }
        return factory();
      },

      release: (obj: T): void => {
        if (pool.length < maxSize) {
          reset(obj);
          pool.push(obj);
        }
      },

      size: (): number => pool.length,

      clear: (): void => {
        pool.length = 0;
      }
    };
  }

  /**
   * 使用WeakMap缓存
   */
  static cacheWithWeakMap<K extends object, V>(
    key: K,
    factory: () => V
  ): V {
    if (this.weakMapCache.has(key)) {
      return this.weakMapCache.get(key);
    }

    const value = factory();
    this.weakMapCache.set(key, value);
    return value;
  }

  /**
   * 清理DOM引用
   */
  static cleanupDOMReferences(element: Element): void {
    // 移除事件监听器
    const clone = element.cloneNode(true);
    element.parentNode?.replaceChild(clone, element);

    // 清理自定义属性
    if ('_customData' in element) {
      delete (element as any)._customData;
    }
  }

  /**
   * 延迟执行（减少内存峰值）
   */
  static defer<T>(fn: () => T): Promise<T> {
    return new Promise(resolve => {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => {
          resolve(fn());
        });
      } else {
        setTimeout(() => {
          resolve(fn());
        }, 0);
      }
    });
  }

  /**
   * 分批处理大数据集
   */
  static async processBatch<T, R>(
    items: T[],
    processor: (item: T) => R,
    batchSize: number = 100,
    delay: number = 0
  ): Promise<R[]> {
    const results: R[] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = batch.map(processor);
      results.push(...batchResults);
      
      // 给浏览器时间进行垃圾回收
      if (delay > 0 && i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return results;
  }

  /**
   * 内存使用分析
   */
  static analyzeMemoryUsage(): {
    heapUsed: string;
    heapTotal: string;
    heapLimit: string;
    usage: string;
    recommendations: string[];
  } {
    const recommendations: string[] = [];
    
    if (typeof performance === 'undefined' || !('memory' in performance)) {
      return {
        heapUsed: 'N/A',
        heapTotal: 'N/A',
        heapLimit: 'N/A',
        usage: 'N/A',
        recommendations: ['Memory API not available in this environment']
      };
    }

    const memory = (performance as any).memory;
    const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
    const totalMB = Math.round(memory.totalJSHeapSize / 1024 / 1024);
    const limitMB = Math.round(memory.jsHeapSizeLimit / 1024 / 1024);
    const usage = Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100);

    if (usage > 85) {
      recommendations.push('内存使用率过高，建议立即优化');
      recommendations.push('考虑使用对象池和WeakMap减少内存占用');
    } else if (usage > 70) {
      recommendations.push('内存使用率较高，建议监控和优化');
    }

    if (totalMB - usedMB < 50) {
      recommendations.push('可用内存不足，建议进行垃圾回收');
    }

    return {
      heapUsed: `${usedMB} MB`,
      heapTotal: `${totalMB} MB`,
      heapLimit: `${limitMB} MB`,
      usage: `${usage}%`,
      recommendations
    };
  }
}

/**
 * 全局内存监控实例
 */
export const globalMemoryMonitor = new MemoryMonitor();

export default MemoryMonitor;