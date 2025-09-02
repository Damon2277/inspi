/**
 * 性能监控工具
 */

// 性能指标类型
export interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  apiResponseTime: number;
  memoryUsage?: number;
}

// 性能监控类
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private timers: Map<string, number> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // 开始计时
  startTimer(key: string): void {
    this.timers.set(key, performance.now());
  }

  // 结束计时并记录
  endTimer(key: string): number {
    const startTime = this.timers.get(key);
    if (!startTime) {
      console.warn(`Timer ${key} not found`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.timers.delete(key);
    return duration;
  }

  // 记录页面加载时间
  recordPageLoad(pageName: string): void {
    if (typeof window !== 'undefined' && window.performance) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const loadTime = navigation.loadEventEnd - navigation.fetchStart;
      
      this.metrics.set(pageName, {
        loadTime,
        renderTime: 0,
        apiResponseTime: 0,
        memoryUsage: this.getMemoryUsage()
      });
    }
  }

  // 记录API响应时间
  recordApiResponse(apiName: string, responseTime: number): void {
    const existing = this.metrics.get(apiName) || {
      loadTime: 0,
      renderTime: 0,
      apiResponseTime: 0
    };

    this.metrics.set(apiName, {
      ...existing,
      apiResponseTime: responseTime
    });
  }

  // 记录渲染时间
  recordRenderTime(componentName: string, renderTime: number): void {
    const existing = this.metrics.get(componentName) || {
      loadTime: 0,
      renderTime: 0,
      apiResponseTime: 0
    };

    this.metrics.set(componentName, {
      ...existing,
      renderTime
    });
  }

  // 获取内存使用情况
  private getMemoryUsage(): number | undefined {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return undefined;
  }

  // 获取所有指标
  getMetrics(): Map<string, PerformanceMetrics> {
    return new Map(this.metrics);
  }

  // 获取特定指标
  getMetric(key: string): PerformanceMetrics | undefined {
    return this.metrics.get(key);
  }

  // 清除指标
  clearMetrics(): void {
    this.metrics.clear();
    this.timers.clear();
  }

  // 导出指标为JSON
  exportMetrics(): string {
    const metricsObj: Record<string, PerformanceMetrics> = {};
    this.metrics.forEach((value, key) => {
      metricsObj[key] = value;
    });
    return JSON.stringify(metricsObj, null, 2);
  }

  // 检查性能阈值
  checkThresholds(thresholds: Record<string, number>): Record<string, boolean> {
    const results: Record<string, boolean> = {};
    
    this.metrics.forEach((metrics, key) => {
      const threshold = thresholds[key];
      if (threshold) {
        results[key] = metrics.loadTime <= threshold;
      }
    });

    return results;
  }
}

// React Hook for performance monitoring
export function usePerformanceMonitor() {
  const monitor = PerformanceMonitor.getInstance();

  const startTimer = (key: string) => monitor.startTimer(key);
  const endTimer = (key: string) => monitor.endTimer(key);
  const recordPageLoad = (pageName: string) => monitor.recordPageLoad(pageName);
  const recordApiResponse = (apiName: string, responseTime: number) => 
    monitor.recordApiResponse(apiName, responseTime);
  const recordRenderTime = (componentName: string, renderTime: number) =>
    monitor.recordRenderTime(componentName, renderTime);

  return {
    startTimer,
    endTimer,
    recordPageLoad,
    recordApiResponse,
    recordRenderTime,
    getMetrics: () => monitor.getMetrics(),
    getMetric: (key: string) => monitor.getMetric(key),
    exportMetrics: () => monitor.exportMetrics()
  };
}

// 性能装饰器
export function measurePerformance(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const method = descriptor.value;
  
  descriptor.value = function (...args: any[]) {
    const monitor = PerformanceMonitor.getInstance();
    const key = `${target.constructor.name}.${propertyName}`;
    
    monitor.startTimer(key);
    const result = method.apply(this, args);
    
    if (result instanceof Promise) {
      return result.finally(() => {
        const duration = monitor.endTimer(key);
        console.log(`${key} took ${duration.toFixed(2)}ms`);
      });
    } else {
      const duration = monitor.endTimer(key);
      console.log(`${key} took ${duration.toFixed(2)}ms`);
      return result;
    }
  };

  return descriptor;
}

// Web Vitals 监控
export function measureWebVitals() {
  if (typeof window === 'undefined') return;

  // 测量 FCP (First Contentful Paint)
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.name === 'first-contentful-paint') {
        console.log('FCP:', entry.startTime);
      }
    }
  });

  observer.observe({ entryTypes: ['paint'] });

  // 测量 LCP (Largest Contentful Paint)
  const lcpObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];
    console.log('LCP:', lastEntry.startTime);
  });

  lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

  // 测量 CLS (Cumulative Layout Shift)
  let clsValue = 0;
  const clsObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!(entry as any).hadRecentInput) {
        clsValue += (entry as any).value;
      }
    }
    console.log('CLS:', clsValue);
  });

  clsObserver.observe({ entryTypes: ['layout-shift'] });
}