/**
 * 性能监控系统
 */

import { sentry } from './sentry';
import { monitoringContext } from './context';
import { performanceFilter } from './filters';
import { getMonitoringConfig } from './config';

/**
 * 性能指标接口
 */
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  url?: string;
  component?: string;
  tags?: Record<string, string>;
}

/**
 * Web Vitals指标
 */
export interface WebVitalsMetric {
  name: 'FCP' | 'LCP' | 'FID' | 'CLS' | 'TTFB' | 'INP';
  value: number;
  delta: number;
  id: string;
  navigationType: string;
}

/**
 * 资源性能指标
 */
export interface ResourceMetric {
  name: string;
  type: string;
  size: number;
  duration: number;
  startTime: number;
  endTime: number;
  url: string;
}

/**
 * 内存使用指标
 */
export interface MemoryMetric {
  used: number;
  total: number;
  limit: number;
  percentage: number;
}

/**
 * 性能监控管理器
 */
class PerformanceMonitor {
  private config = getMonitoringConfig();
  private metrics: PerformanceMetric[] = [];
  private observer: PerformanceObserver | null = null;
  private memoryInterval: NodeJS.Timeout | null = null;

  /**
   * 初始化性能监控
   */
  init() {
    if (!this.config.performance.enabled) {
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    this.initWebVitals();
    this.initResourceMonitoring();
    this.initMemoryMonitoring();
    this.initNavigationMonitoring();
    this.initLongTaskMonitoring();
  }

  /**
   * 初始化Web Vitals监控
   */
  private initWebVitals() {
    // 模拟web-vitals库的功能
    // 实际使用时需要安装: npm install web-vitals
    
    // import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';
    
    const reportWebVital = (metric: WebVitalsMetric) => {
      const performanceMetric: PerformanceMetric = {
        name: metric.name,
        value: metric.value,
        unit: metric.name === 'CLS' ? 'score' : 'ms',
        timestamp: Date.now(),
        url: window.location.href,
        tags: {
          navigationType: metric.navigationType,
          metricId: metric.id
        }
      };

      this.recordMetric(performanceMetric);
    };

    // 模拟Web Vitals收集
    this.collectWebVitals(reportWebVital);
  }

  /**
   * 模拟Web Vitals收集
   */
  private collectWebVitals(callback: (metric: WebVitalsMetric) => void) {
    // FCP (First Contentful Paint)
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name === 'first-contentful-paint') {
            callback({
              name: 'FCP',
              value: entry.startTime,
              delta: entry.startTime,
              id: 'fcp-' + Date.now(),
              navigationType: 'navigate'
            });
          }
        });
      });
      observer.observe({ entryTypes: ['paint'] });
    }

    // LCP (Largest Contentful Paint)
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          callback({
            name: 'LCP',
            value: lastEntry.startTime,
            delta: lastEntry.startTime,
            id: 'lcp-' + Date.now(),
            navigationType: 'navigate'
          });
        }
      });
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    }

    // CLS (Cumulative Layout Shift)
    let clsValue = 0;
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        
        callback({
          name: 'CLS',
          value: clsValue,
          delta: clsValue,
          id: 'cls-' + Date.now(),
          navigationType: 'navigate'
        });
      });
      observer.observe({ entryTypes: ['layout-shift'] });
    }
  }

  /**
   * 初始化资源监控
   */
  private initResourceMonitoring() {
    if (!('PerformanceObserver' in window)) {
      return;
    }

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.entryType === 'resource') {
          const resourceEntry = entry as PerformanceResourceTiming;
          this.recordResourceMetric(resourceEntry);
        }
      });
    });

    observer.observe({ entryTypes: ['resource'] });
    this.observer = observer;
  }

  /**
   * 记录资源性能指标
   */
  private recordResourceMetric(entry: PerformanceResourceTiming) {
    const metric: ResourceMetric = {
      name: this.getResourceName(entry.name),
      type: this.getResourceType(entry.name),
      size: entry.transferSize || 0,
      duration: entry.duration,
      startTime: entry.startTime,
      endTime: entry.responseEnd,
      url: entry.name
    };

    // 只记录慢资源或大资源
    if (metric.duration > 1000 || metric.size > 100000) {
      const performanceMetric: PerformanceMetric = {
        name: 'resource_load',
        value: metric.duration,
        unit: 'ms',
        timestamp: Date.now(),
        url: window.location.href,
        tags: {
          resource_name: metric.name,
          resource_type: metric.type,
          resource_size: metric.size.toString()
        }
      };

      this.recordMetric(performanceMetric);
    }
  }

  /**
   * 初始化内存监控
   */
  private initMemoryMonitoring() {
    if (!('memory' in performance)) {
      return;
    }

    const collectMemoryMetrics = () => {
      const memory = (performance as any).memory;
      const memoryMetric: MemoryMetric = {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
        percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
      };

      // 只在内存使用率较高时记录
      if (memoryMetric.percentage > 70) {
        const performanceMetric: PerformanceMetric = {
          name: 'memory_usage',
          value: memoryMetric.percentage,
          unit: 'percent',
          timestamp: Date.now(),
          url: window.location.href,
          tags: {
            used_mb: Math.round(memoryMetric.used / 1024 / 1024).toString(),
            total_mb: Math.round(memoryMetric.total / 1024 / 1024).toString()
          }
        };

        this.recordMetric(performanceMetric);
      }
    };

    // 每30秒检查一次内存使用情况
    this.memoryInterval = setInterval(collectMemoryMetrics, 30000);
  }

  /**
   * 初始化导航监控
   */
  private initNavigationMonitoring() {
    if (!('PerformanceObserver' in window)) {
      return;
    }

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.entryType === 'navigation') {
          const navEntry = entry as PerformanceNavigationTiming;
          this.recordNavigationMetrics(navEntry);
        }
      });
    });

    observer.observe({ entryTypes: ['navigation'] });
  }

  /**
   * 记录导航性能指标
   */
  private recordNavigationMetrics(entry: PerformanceNavigationTiming) {
    const metrics = [
      {
        name: 'dns_lookup',
        value: entry.domainLookupEnd - entry.domainLookupStart,
        unit: 'ms'
      },
      {
        name: 'tcp_connect',
        value: entry.connectEnd - entry.connectStart,
        unit: 'ms'
      },
      {
        name: 'request_response',
        value: entry.responseEnd - entry.requestStart,
        unit: 'ms'
      },
      {
        name: 'dom_processing',
        value: entry.domComplete - entry.domLoading,
        unit: 'ms'
      },
      {
        name: 'page_load',
        value: entry.loadEventEnd - entry.navigationStart,
        unit: 'ms'
      }
    ];

    metrics.forEach(metric => {
      if (metric.value > 0) {
        const performanceMetric: PerformanceMetric = {
          name: metric.name,
          value: metric.value,
          unit: metric.unit,
          timestamp: Date.now(),
          url: window.location.href,
          tags: {
            navigation_type: entry.type.toString()
          }
        };

        this.recordMetric(performanceMetric);
      }
    });
  }

  /**
   * 初始化长任务监控
   */
  private initLongTaskMonitoring() {
    if (!('PerformanceObserver' in window)) {
      return;
    }

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.entryType === 'longtask') {
          const performanceMetric: PerformanceMetric = {
            name: 'long_task',
            value: entry.duration,
            unit: 'ms',
            timestamp: Date.now(),
            url: window.location.href,
            tags: {
              task_name: entry.name
            }
          };

          this.recordMetric(performanceMetric);
        }
      });
    });

    observer.observe({ entryTypes: ['longtask'] });
  }

  /**
   * 记录性能指标
   */
  recordMetric(metric: PerformanceMetric) {
    // 应用过滤器
    const filterResult = performanceFilter.filterPerformance(metric);
    if (!filterResult.shouldReport) {
      return;
    }

    // 添加过滤器标签
    metric.tags = { ...metric.tags, ...filterResult.tags };

    // 存储指标
    this.metrics.push(metric);

    // 发送到Sentry
    sentry.addBreadcrumb({
      message: `Performance metric: ${metric.name}`,
      category: 'performance',
      level: 'info',
      data: {
        value: metric.value,
        unit: metric.unit,
        tags: metric.tags
      }
    });

    // 如果是关键性能问题，发送事件
    if (this.isCriticalPerformanceIssue(metric)) {
      sentry.captureMessage(
        `Critical performance issue: ${metric.name} = ${metric.value}${metric.unit}`,
        'warning'
      );
    }

    // 限制内存中的指标数量
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-500);
    }
  }

  /**
   * 判断是否为关键性能问题
   */
  private isCriticalPerformanceIssue(metric: PerformanceMetric): boolean {
    switch (metric.name) {
      case 'LCP':
        return metric.value > 4000; // LCP > 4s
      case 'FID':
        return metric.value > 300; // FID > 300ms
      case 'CLS':
        return metric.value > 0.25; // CLS > 0.25
      case 'long_task':
        return metric.value > 500; // 长任务 > 500ms
      case 'memory_usage':
        return metric.value > 90; // 内存使用率 > 90%
      default:
        return false;
    }
  }

  /**
   * 获取资源名称
   */
  private getResourceName(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const segments = pathname.split('/');
      return segments[segments.length - 1] || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * 获取资源类型
   */
  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'script';
    if (url.includes('.css')) return 'stylesheet';
    if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) return 'image';
    if (url.match(/\.(woff|woff2|ttf|eot)$/)) return 'font';
    if (url.includes('/api/')) return 'api';
    return 'other';
  }

  /**
   * 获取性能指标
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * 清除指标
   */
  clearMetrics() {
    this.metrics = [];
  }

  /**
   * 销毁监控器
   */
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    if (this.memoryInterval) {
      clearInterval(this.memoryInterval);
      this.memoryInterval = null;
    }

    this.clearMetrics();
  }
}

/**
 * 手动记录性能指标
 */
export function recordPerformanceMetric(
  name: string,
  value: number,
  unit: string = 'ms',
  tags?: Record<string, string>
) {
  const metric: PerformanceMetric = {
    name,
    value,
    unit,
    timestamp: Date.now(),
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    tags
  };

  performanceMonitor.recordMetric(metric);
}

/**
 * 性能计时器
 */
export class PerformanceTimer {
  private startTime: number;
  private name: string;
  private tags: Record<string, string>;

  constructor(name: string, tags: Record<string, string> = {}) {
    this.name = name;
    this.tags = tags;
    this.startTime = performance.now();
  }

  /**
   * 结束计时并记录
   */
  end(): number {
    const duration = performance.now() - this.startTime;
    recordPerformanceMetric(this.name, duration, 'ms', this.tags);
    return duration;
  }
}

/**
 * 性能装饰器
 */
export function withPerformanceMonitoring<T extends (...args: any[]) => any>(
  fn: T,
  name: string,
  tags?: Record<string, string>
): T {
  return ((...args: any[]) => {
    const timer = new PerformanceTimer(name, tags);
    
    try {
      const result = fn(...args);
      
      if (result instanceof Promise) {
        return result
          .then((res) => {
            timer.end();
            return res;
          })
          .catch((error) => {
            timer.end();
            throw error;
          });
      }
      
      timer.end();
      return result;
    } catch (error) {
      timer.end();
      throw error;
    }
  }) as T;
}

// 创建全局性能监控器实例
export const performanceMonitor = new PerformanceMonitor();

// 自动初始化
if (typeof window !== 'undefined') {
  performanceMonitor.init();
}

export default performanceMonitor;