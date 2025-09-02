/**
 * 自定义性能指标收集系统
 */
import { logger } from '@/lib/logging/logger';

/**
 * 自定义指标类型
 */
export interface CustomMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percentage' | 'score';
  category: 'performance' | 'user-experience' | 'business' | 'technical';
  timestamp: number;
  tags?: Record<string, string | number>;
  metadata?: Record<string, any>;
}

/**
 * 性能计时器
 */
export interface PerformanceTimer {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  tags?: Record<string, string | number>;
}

/**
 * 指标收集器配置
 */
export interface MetricsCollectorConfig {
  // 是否启用
  enabled?: boolean;
  // 缓冲区大小
  bufferSize?: number;
  // 自动上报间隔（毫秒）
  reportInterval?: number;
  // 上报端点
  reportEndpoint?: string;
  // 是否在控制台输出
  debug?: boolean;
  // 指标过滤器
  filter?: (metric: CustomMetric) => boolean;
  // 指标转换器
  transform?: (metric: CustomMetric) => CustomMetric;
}

/**
 * 自定义指标收集器
 */
export class CustomMetricsCollector {
  private config: Required<MetricsCollectorConfig>;
  private metrics: CustomMetric[] = [];
  private timers: Map<string, PerformanceTimer> = new Map();
  private reportTimer?: NodeJS.Timeout;
  private isReporting = false;

  constructor(config: MetricsCollectorConfig = {}) {
    this.config = {
      enabled: true,
      bufferSize: 100,
      reportInterval: 30000, // 30秒
      reportEndpoint: '/api/analytics/custom-metrics',
      debug: process.env.NODE_ENV === 'development',
      filter: () => true,
      transform: (metric) => metric,
      ...config
    };
  }

  /**
   * 开始收集
   */
  start(): void {
    if (!this.config.enabled) {
      return;
    }

    this.startAutoReporting();
    logger.info('Custom metrics collector started', {
      bufferSize: this.config.bufferSize,
      reportInterval: this.config.reportInterval
    });
  }

  /**
   * 停止收集
   */
  stop(): void {
    this.stopAutoReporting();
    this.reportMetrics(); // 最后一次上报
    logger.info('Custom metrics collector stopped');
  }

  /**
   * 记录指标
   */
  recordMetric(metric: Omit<CustomMetric, 'timestamp'>): void {
    if (!this.config.enabled) {
      return;
    }

    const fullMetric: CustomMetric = {
      ...metric,
      timestamp: Date.now()
    };

    // 应用过滤器
    if (!this.config.filter(fullMetric)) {
      return;
    }

    // 应用转换器
    const transformedMetric = this.config.transform(fullMetric);

    this.metrics.push(transformedMetric);

    if (this.config.debug) {
      console.log(`[Custom Metrics] ${transformedMetric.name}:`, {
        value: transformedMetric.value,
        unit: transformedMetric.unit,
        category: transformedMetric.category
      });
    }

    // 检查缓冲区大小
    if (this.metrics.length >= this.config.bufferSize) {
      this.reportMetrics();
    }

    logger.debug('Custom metric recorded', {
      name: transformedMetric.name,
      value: transformedMetric.value,
      category: transformedMetric.category
    });
  }

  /**
   * 开始计时
   */
  startTimer(name: string, tags?: Record<string, string | number>): void {
    if (!this.config.enabled) {
      return;
    }

    const timer: PerformanceTimer = {
      name,
      startTime: performance.now(),
      tags
    };

    this.timers.set(name, timer);
  }

  /**
   * 结束计时并记录指标
   */
  endTimer(name: string, additionalTags?: Record<string, string | number>): number | null {
    if (!this.config.enabled) {
      return null;
    }

    const timer = this.timers.get(name);
    if (!timer) {
      logger.warn('Timer not found', { name });
      return null;
    }

    timer.endTime = performance.now();
    timer.duration = timer.endTime - timer.startTime;

    // 记录计时指标
    this.recordMetric({
      name: `timer.${name}`,
      value: timer.duration,
      unit: 'ms',
      category: 'performance',
      tags: {
        ...timer.tags,
        ...additionalTags
      }
    });

    this.timers.delete(name);
    return timer.duration;
  }

  /**
   * 记录计数指标
   */
  recordCount(name: string, value: number = 1, tags?: Record<string, string | number>): void {
    this.recordMetric({
      name,
      value,
      unit: 'count',
      category: 'business',
      tags
    });
  }

  /**
   * 记录内存使用指标
   */
  recordMemoryUsage(name: string = 'memory.usage'): void {
    if (typeof window === 'undefined' || !('memory' in performance)) {
      return;
    }

    const memory = (performance as any).memory;
    
    this.recordMetric({
      name: `${name}.used`,
      value: memory.usedJSHeapSize,
      unit: 'bytes',
      category: 'technical'
    });

    this.recordMetric({
      name: `${name}.total`,
      value: memory.totalJSHeapSize,
      unit: 'bytes',
      category: 'technical'
    });

    this.recordMetric({
      name: `${name}.limit`,
      value: memory.jsHeapSizeLimit,
      unit: 'bytes',
      category: 'technical'
    });

    this.recordMetric({
      name: `${name}.usage_percentage`,
      value: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
      unit: 'percentage',
      category: 'technical'
    });
  }

  /**
   * 记录网络指标
   */
  recordNetworkMetrics(): void {
    if (typeof navigator === 'undefined' || !('connection' in navigator)) {
      return;
    }

    const connection = (navigator as any).connection;
    
    if (connection.effectiveType) {
      this.recordMetric({
        name: 'network.effective_type',
        value: this.getConnectionTypeScore(connection.effectiveType),
        unit: 'score',
        category: 'technical',
        tags: { type: connection.effectiveType }
      });
    }

    if (connection.downlink) {
      this.recordMetric({
        name: 'network.downlink',
        value: connection.downlink,
        unit: 'count',
        category: 'technical'
      });
    }

    if (connection.rtt) {
      this.recordMetric({
        name: 'network.rtt',
        value: connection.rtt,
        unit: 'ms',
        category: 'technical'
      });
    }
  }

  /**
   * 记录用户交互指标
   */
  recordUserInteraction(action: string, element?: string, duration?: number): void {
    this.recordMetric({
      name: 'user.interaction',
      value: duration || 1,
      unit: duration ? 'ms' : 'count',
      category: 'user-experience',
      tags: {
        action,
        element: element || 'unknown'
      }
    });
  }

  /**
   * 记录页面加载指标
   */
  recordPageLoadMetrics(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (!navigation) {
      return;
    }

    // DNS 查询时间
    this.recordMetric({
      name: 'page.dns_lookup',
      value: navigation.domainLookupEnd - navigation.domainLookupStart,
      unit: 'ms',
      category: 'performance'
    });

    // TCP 连接时间
    this.recordMetric({
      name: 'page.tcp_connect',
      value: navigation.connectEnd - navigation.connectStart,
      unit: 'ms',
      category: 'performance'
    });

    // 请求响应时间
    this.recordMetric({
      name: 'page.request_response',
      value: navigation.responseEnd - navigation.requestStart,
      unit: 'ms',
      category: 'performance'
    });

    // DOM 解析时间
    this.recordMetric({
      name: 'page.dom_parse',
      value: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      unit: 'ms',
      category: 'performance'
    });

    // 页面完全加载时间
    this.recordMetric({
      name: 'page.load_complete',
      value: navigation.loadEventEnd - navigation.loadEventStart,
      unit: 'ms',
      category: 'performance'
    });
  }

  /**
   * 记录资源加载指标
   */
  recordResourceMetrics(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const resourceStats = this.analyzeResources(resources);

    Object.entries(resourceStats).forEach(([type, stats]) => {
      this.recordMetric({
        name: `resource.${type}.count`,
        value: stats.count,
        unit: 'count',
        category: 'performance'
      });

      this.recordMetric({
        name: `resource.${type}.total_size`,
        value: stats.totalSize,
        unit: 'bytes',
        category: 'performance'
      });

      this.recordMetric({
        name: `resource.${type}.avg_duration`,
        value: stats.avgDuration,
        unit: 'ms',
        category: 'performance'
      });
    });
  }

  /**
   * 分析资源统计
   */
  private analyzeResources(resources: PerformanceResourceTiming[]): Record<string, any> {
    const stats: Record<string, { count: number; totalSize: number; totalDuration: number; avgDuration: number }> = {};

    resources.forEach(resource => {
      const type = this.getResourceType(resource.name);
      
      if (!stats[type]) {
        stats[type] = { count: 0, totalSize: 0, totalDuration: 0, avgDuration: 0 };
      }

      stats[type].count++;
      stats[type].totalSize += resource.transferSize || 0;
      stats[type].totalDuration += resource.duration;
    });

    // 计算平均值
    Object.values(stats).forEach(stat => {
      stat.avgDuration = stat.count > 0 ? stat.totalDuration / stat.count : 0;
    });

    return stats;
  }

  /**
   * 获取资源类型
   */
  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'javascript';
    if (url.includes('.css')) return 'stylesheet';
    if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) return 'image';
    if (url.match(/\.(woff|woff2|ttf|eot)$/i)) return 'font';
    if (url.includes('/api/')) return 'api';
    return 'other';
  }

  /**
   * 获取连接类型评分
   */
  private getConnectionTypeScore(type: string): number {
    const scores: Record<string, number> = {
      'slow-2g': 1,
      '2g': 2,
      '3g': 3,
      '4g': 4,
      '5g': 5
    };
    return scores[type] || 0;
  }

  /**
   * 开始自动上报
   */
  private startAutoReporting(): void {
    if (this.config.reportInterval > 0) {
      this.reportTimer = setInterval(() => {
        this.reportMetrics();
      }, this.config.reportInterval);
    }
  }

  /**
   * 停止自动上报
   */
  private stopAutoReporting(): void {
    if (this.reportTimer) {
      clearInterval(this.reportTimer);
      this.reportTimer = undefined;
    }
  }

  /**
   * 上报指标
   */
  private async reportMetrics(): Promise<void> {
    if (this.isReporting || this.metrics.length === 0) {
      return;
    }

    this.isReporting = true;
    const metricsToReport = [...this.metrics];
    this.metrics = [];

    try {
      await this.sendMetrics(metricsToReport);
      logger.debug('Custom metrics reported', { count: metricsToReport.length });
    } catch (error) {
      logger.error('Failed to report custom metrics', error instanceof Error ? error : new Error(String(error)));
      // 将指标放回缓冲区
      this.metrics.unshift(...metricsToReport);
    } finally {
      this.isReporting = false;
    }
  }

  /**
   * 发送指标到服务器
   */
  private async sendMetrics(metrics: CustomMetric[]): Promise<void> {
    if (!this.config.reportEndpoint) {
      return;
    }

    const body = JSON.stringify({
      metrics,
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : ''
    });

    const response = await fetch(this.config.reportEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  /**
   * 获取当前指标
   */
  getMetrics(): CustomMetric[] {
    return [...this.metrics];
  }

  /**
   * 获取活动计时器
   */
  getActiveTimers(): PerformanceTimer[] {
    return Array.from(this.timers.values());
  }

  /**
   * 清除所有指标
   */
  clearMetrics(): void {
    this.metrics = [];
    this.timers.clear();
  }

  /**
   * 获取指标统计
   */
  getMetricsStats(): {
    total: number;
    byCategory: Record<string, number>;
    byUnit: Record<string, number>;
  } {
    const stats = {
      total: this.metrics.length,
      byCategory: {} as Record<string, number>,
      byUnit: {} as Record<string, number>
    };

    this.metrics.forEach(metric => {
      stats.byCategory[metric.category] = (stats.byCategory[metric.category] || 0) + 1;
      stats.byUnit[metric.unit] = (stats.byUnit[metric.unit] || 0) + 1;
    });

    return stats;
  }
}

/**
 * 全局自定义指标收集器实例
 */
export const globalCustomMetricsCollector = new CustomMetricsCollector();

/**
 * 便捷函数
 */
export const metrics = {
  record: (metric: Omit<CustomMetric, 'timestamp'>) => globalCustomMetricsCollector.recordMetric(metric),
  startTimer: (name: string, tags?: Record<string, string | number>) => globalCustomMetricsCollector.startTimer(name, tags),
  endTimer: (name: string, tags?: Record<string, string | number>) => globalCustomMetricsCollector.endTimer(name, tags),
  count: (name: string, value?: number, tags?: Record<string, string | number>) => globalCustomMetricsCollector.recordCount(name, value, tags),
  memory: () => globalCustomMetricsCollector.recordMemoryUsage(),
  network: () => globalCustomMetricsCollector.recordNetworkMetrics(),
  interaction: (action: string, element?: string, duration?: number) => globalCustomMetricsCollector.recordUserInteraction(action, element, duration),
  pageLoad: () => globalCustomMetricsCollector.recordPageLoadMetrics(),
  resources: () => globalCustomMetricsCollector.recordResourceMetrics()
};

export default CustomMetricsCollector;