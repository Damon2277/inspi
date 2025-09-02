/**
 * Web Vitals 性能监控
 */
import { logger } from '@/lib/logging/logger';

/**
 * Web Vitals 指标类型
 */
export interface WebVitalsMetric {
  name: 'CLS' | 'FID' | 'FCP' | 'LCP' | 'TTFB' | 'INP';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: 'navigate' | 'reload' | 'back-forward' | 'back-forward-cache';
  entries: PerformanceEntry[];
}

/**
 * Web Vitals 配置
 */
export interface WebVitalsConfig {
  // 是否启用监控
  enabled?: boolean;
  // 采样率 (0-1)
  sampleRate?: number;
  // 上报端点
  reportEndpoint?: string;
  // 是否在控制台输出
  debug?: boolean;
  // 自定义阈值
  thresholds?: {
    CLS?: { good: number; poor: number };
    FID?: { good: number; poor: number };
    FCP?: { good: number; poor: number };
    LCP?: { good: number; poor: number };
    TTFB?: { good: number; poor: number };
    INP?: { good: number; poor: number };
  };
  // 回调函数
  onMetric?: (metric: WebVitalsMetric) => void;
}

/**
 * Web Vitals 监控器
 */
export class WebVitalsMonitor {
  private config: Required<WebVitalsConfig>;
  private metrics: Map<string, WebVitalsMetric> = new Map();
  private observers: PerformanceObserver[] = [];
  private isSupported = false;

  constructor(config: WebVitalsConfig = {}) {
    this.config = {
      enabled: true,
      sampleRate: 1.0,
      reportEndpoint: '/api/analytics/web-vitals',
      debug: process.env.NODE_ENV === 'development',
      thresholds: {
        CLS: { good: 0.1, poor: 0.25 },
        FID: { good: 100, poor: 300 },
        FCP: { good: 1800, poor: 3000 },
        LCP: { good: 2500, poor: 4000 },
        TTFB: { good: 800, poor: 1800 },
        INP: { good: 200, poor: 500 }
      },
      onMetric: () => {},
      ...config
    };

    this.isSupported = this.checkSupport();
  }

  /**
   * 检查浏览器支持
   */
  private checkSupport(): boolean {
    return (
      typeof window !== 'undefined' &&
      'PerformanceObserver' in window &&
      'PerformanceEntry' in window
    );
  }

  /**
   * 开始监控
   */
  start(): void {
    if (!this.config.enabled || !this.isSupported) {
      return;
    }

    // 检查采样率
    if (Math.random() > this.config.sampleRate) {
      return;
    }

    this.observeCLS();
    this.observeFID();
    this.observeFCP();
    this.observeLCP();
    this.observeTTFB();
    this.observeINP();

    logger.info('Web Vitals monitoring started', {
      sampleRate: this.config.sampleRate,
      debug: this.config.debug
    });
  }

  /**
   * 停止监控
   */
  stop(): void {
    this.observers.forEach(observer => {
      try {
        observer.disconnect();
      } catch (error) {
        logger.warn('Failed to disconnect performance observer', { error });
      }
    });
    this.observers = [];
    logger.info('Web Vitals monitoring stopped');
  }

  /**
   * 监控 Cumulative Layout Shift (CLS)
   */
  private observeCLS(): void {
    try {
      let clsValue = 0;
      let clsEntries: PerformanceEntry[] = [];

      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
            clsEntries.push(entry);
          }
        }

        this.reportMetric({
          name: 'CLS',
          value: clsValue,
          delta: (entry as any).value || 0,
          id: this.generateId(),
          entries: clsEntries,
          navigationType: this.getNavigationType(),
          rating: this.getRating('CLS', clsValue)
        });
      });

      observer.observe({ type: 'layout-shift', buffered: true });
      this.observers.push(observer);
    } catch (error) {
      logger.warn('Failed to observe CLS', { error });
    }
  }

  /**
   * 监控 First Input Delay (FID)
   */
  private observeFID(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const fidValue = entry.processingStart - entry.startTime;
          
          this.reportMetric({
            name: 'FID',
            value: fidValue,
            delta: fidValue,
            id: this.generateId(),
            entries: [entry],
            navigationType: this.getNavigationType(),
            rating: this.getRating('FID', fidValue)
          });
        }
      });

      observer.observe({ type: 'first-input', buffered: true });
      this.observers.push(observer);
    } catch (error) {
      logger.warn('Failed to observe FID', { error });
    }
  }

  /**
   * 监控 First Contentful Paint (FCP)
   */
  private observeFCP(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            this.reportMetric({
              name: 'FCP',
              value: entry.startTime,
              delta: entry.startTime,
              id: this.generateId(),
              entries: [entry],
              navigationType: this.getNavigationType(),
              rating: this.getRating('FCP', entry.startTime)
            });
          }
        }
      });

      observer.observe({ type: 'paint', buffered: true });
      this.observers.push(observer);
    } catch (error) {
      logger.warn('Failed to observe FCP', { error });
    }
  }

  /**
   * 监控 Largest Contentful Paint (LCP)
   */
  private observeLCP(): void {
    try {
      let lcpValue = 0;
      let lcpEntries: PerformanceEntry[] = [];

      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        
        if (lastEntry) {
          lcpValue = lastEntry.startTime;
          lcpEntries = [lastEntry];

          this.reportMetric({
            name: 'LCP',
            value: lcpValue,
            delta: lcpValue,
            id: this.generateId(),
            entries: lcpEntries,
            navigationType: this.getNavigationType(),
            rating: this.getRating('LCP', lcpValue)
          });
        }
      });

      observer.observe({ type: 'largest-contentful-paint', buffered: true });
      this.observers.push(observer);
    } catch (error) {
      logger.warn('Failed to observe LCP', { error });
    }
  }

  /**
   * 监控 Time to First Byte (TTFB)
   */
  private observeTTFB(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            const ttfbValue = navEntry.responseStart - navEntry.requestStart;

            this.reportMetric({
              name: 'TTFB',
              value: ttfbValue,
              delta: ttfbValue,
              id: this.generateId(),
              entries: [entry],
              navigationType: this.getNavigationType(),
              rating: this.getRating('TTFB', ttfbValue)
            });
          }
        }
      });

      observer.observe({ type: 'navigation', buffered: true });
      this.observers.push(observer);
    } catch (error) {
      logger.warn('Failed to observe TTFB', { error });
    }
  }

  /**
   * 监控 Interaction to Next Paint (INP)
   */
  private observeINP(): void {
    try {
      let maxINP = 0;
      let inpEntries: PerformanceEntry[] = [];

      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const inpValue = entry.processingEnd - entry.startTime;
          
          if (inpValue > maxINP) {
            maxINP = inpValue;
            inpEntries = [entry];

            this.reportMetric({
              name: 'INP',
              value: maxINP,
              delta: inpValue,
              id: this.generateId(),
              entries: inpEntries,
              navigationType: this.getNavigationType(),
              rating: this.getRating('INP', maxINP)
            });
          }
        }
      });

      observer.observe({ type: 'event', buffered: true });
      this.observers.push(observer);
    } catch (error) {
      logger.warn('Failed to observe INP', { error });
    }
  }

  /**
   * 上报指标
   */
  private reportMetric(metric: WebVitalsMetric): void {
    this.metrics.set(metric.name, metric);

    if (this.config.debug) {
      console.log(`[Web Vitals] ${metric.name}:`, {
        value: Math.round(metric.value),
        rating: metric.rating,
        delta: Math.round(metric.delta)
      });
    }

    // 调用回调函数
    this.config.onMetric(metric);

    // 上报到服务器
    this.sendToAnalytics(metric);

    logger.debug('Web Vitals metric reported', {
      name: metric.name,
      value: metric.value,
      rating: metric.rating
    });
  }

  /**
   * 发送到分析服务
   */
  private async sendToAnalytics(metric: WebVitalsMetric): Promise<void> {
    if (!this.config.reportEndpoint) {
      return;
    }

    try {
      const body = JSON.stringify({
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
        id: metric.id,
        navigationType: metric.navigationType,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: Date.now()
      });

      // 使用 sendBeacon 或 fetch
      if ('sendBeacon' in navigator) {
        navigator.sendBeacon(this.config.reportEndpoint, body);
      } else {
        fetch(this.config.reportEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          keepalive: true
        }).catch(error => {
          logger.warn('Failed to send Web Vitals metric', { error });
        });
      }
    } catch (error) {
      logger.warn('Failed to send Web Vitals metric', { error });
    }
  }

  /**
   * 获取评级
   */
  private getRating(name: WebVitalsMetric['name'], value: number): 'good' | 'needs-improvement' | 'poor' {
    const thresholds = this.config.thresholds[name];
    if (!thresholds) return 'good';

    if (value <= thresholds.good) return 'good';
    if (value <= thresholds.poor) return 'needs-improvement';
    return 'poor';
  }

  /**
   * 获取导航类型
   */
  private getNavigationType(): WebVitalsMetric['navigationType'] {
    if (typeof window === 'undefined') return 'navigate';
    
    const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (!navEntry) return 'navigate';

    switch (navEntry.type) {
      case 'reload': return 'reload';
      case 'back_forward': return 'back-forward';
      default: return 'navigate';
    }
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取当前指标
   */
  getMetrics(): Map<string, WebVitalsMetric> {
    return new Map(this.metrics);
  }

  /**
   * 获取指标摘要
   */
  getMetricsSummary(): Record<string, { value: number; rating: string }> {
    const summary: Record<string, { value: number; rating: string }> = {};
    
    for (const [name, metric] of this.metrics) {
      summary[name] = {
        value: Math.round(metric.value),
        rating: metric.rating
      };
    }
    
    return summary;
  }

  /**
   * 手动触发指标收集
   */
  collectMetrics(): void {
    // 触发页面可见性变化事件来收集最终指标
    if (typeof document !== 'undefined') {
      const event = new Event('visibilitychange');
      document.dispatchEvent(event);
    }
  }
}

/**
 * 全局 Web Vitals 监控器实例
 */
export const globalWebVitalsMonitor = new WebVitalsMonitor();

/**
 * Web Vitals Hook
 */
export function useWebVitals(config?: WebVitalsConfig) {
  const [metrics, setMetrics] = React.useState<Map<string, WebVitalsMetric>>(new Map());
  const [isSupported, setIsSupported] = React.useState(false);

  React.useEffect(() => {
    const monitor = new WebVitalsMonitor({
      ...config,
      onMetric: (metric) => {
        setMetrics(prev => new Map(prev.set(metric.name, metric)));
        config?.onMetric?.(metric);
      }
    });

    setIsSupported(monitor['isSupported']);
    monitor.start();

    return () => {
      monitor.stop();
    };
  }, [config]);

  return {
    metrics,
    isSupported,
    summary: React.useMemo(() => {
      const summary: Record<string, { value: number; rating: string }> = {};
      for (const [name, metric] of metrics) {
        summary[name] = {
          value: Math.round(metric.value),
          rating: metric.rating
        };
      }
      return summary;
    }, [metrics])
  };
}

// 导入 React（如果在 React 环境中使用）
declare const React: any;

export default WebVitalsMonitor;