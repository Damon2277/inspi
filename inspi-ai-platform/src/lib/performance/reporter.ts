/**
 * 性能数据上报和分析系统
 */
import { logger } from '@/lib/logging/logger';
import { WebVitalsMetric } from './web-vitals';
import { CustomMetric } from './custom-metrics';

/**
 * 性能报告数据
 */
export interface PerformanceReport {
  id: string;
  timestamp: number;
  url: string;
  userAgent: string;
  viewport: { width: number; height: number };
  connection?: {
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
  };
  webVitals: Record<string, WebVitalsMetric>;
  customMetrics: CustomMetric[];
  systemInfo: {
    memory?: {
      used: number;
      total: number;
      limit: number;
    };
    timing: {
      navigationStart: number;
      loadComplete: number;
      domReady: number;
    };
  };
  errors?: Array<{
    message: string;
    stack?: string;
    timestamp: number;
  }>;
}

/**
 * 上报器配置
 */
export interface ReporterConfig {
  // 上报端点
  endpoint: string;
  // 批量上报大小
  batchSize?: number;
  // 上报间隔（毫秒）
  reportInterval?: number;
  // 最大重试次数
  maxRetries?: number;
  // 重试延迟（毫秒）
  retryDelay?: number;
  // 是否启用压缩
  enableCompression?: boolean;
  // 是否启用本地存储
  enableLocalStorage?: boolean;
  // 本地存储键名
  storageKey?: string;
  // 最大存储大小（字节）
  maxStorageSize?: number;
  // 采样率 (0-1)
  sampleRate?: number;
  // 是否在开发环境启用
  enableInDev?: boolean;
  // 自定义头部
  headers?: Record<string, string>;
  // 数据转换器
  transform?: (report: PerformanceReport) => PerformanceReport;
  // 错误处理器
  onError?: (error: Error) => void;
}

/**
 * 上报队列项
 */
interface QueueItem {
  report: PerformanceReport;
  retries: number;
  timestamp: number;
}

/**
 * 性能数据上报器
 */
export class PerformanceReporter {
  private config: Required<ReporterConfig>;
  private queue: QueueItem[] = [];
  private isReporting = false;
  private reportTimer?: NodeJS.Timeout;
  private errorCount = 0;

  constructor(config: ReporterConfig) {
    this.config = {
      batchSize: 10,
      reportInterval: 30000, // 30秒
      maxRetries: 3,
      retryDelay: 1000,
      enableCompression: true,
      enableLocalStorage: true,
      storageKey: 'performance_reports',
      maxStorageSize: 1024 * 1024, // 1MB
      sampleRate: 1.0,
      enableInDev: false,
      headers: {},
      transform: (report) => report,
      onError: () => {},
      ...config
    };

    this.loadFromStorage();
    this.startReporting();
  }

  /**
   * 添加报告到队列
   */
  addReport(report: Omit<PerformanceReport, 'id' | 'timestamp'>): void {
    // 检查采样率
    if (Math.random() > this.config.sampleRate) {
      return;
    }

    // 检查开发环境
    if (process.env.NODE_ENV === 'development' && !this.config.enableInDev) {
      return;
    }

    const fullReport: PerformanceReport = {
      id: this.generateId(),
      timestamp: Date.now(),
      ...report
    };

    // 应用转换器
    const transformedReport = this.config.transform(fullReport);

    const queueItem: QueueItem = {
      report: transformedReport,
      retries: 0,
      timestamp: Date.now()
    };

    this.queue.push(queueItem);
    this.saveToStorage();

    logger.debug('Performance report added to queue', {
      id: transformedReport.id,
      queueSize: this.queue.length
    });

    // 检查是否需要立即上报
    if (this.queue.length >= this.config.batchSize) {
      this.reportBatch();
    }
  }

  /**
   * 创建完整的性能报告
   */
  createReport(
    webVitals: Record<string, WebVitalsMetric>,
    customMetrics: CustomMetric[],
    errors?: Array<{ message: string; stack?: string; timestamp: number }>
  ): Omit<PerformanceReport, 'id' | 'timestamp'> {
    const report: Omit<PerformanceReport, 'id' | 'timestamp'> = {
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      viewport: this.getViewportSize(),
      connection: this.getConnectionInfo(),
      webVitals,
      customMetrics,
      systemInfo: this.getSystemInfo(),
      errors
    };

    return report;
  }

  /**
   * 开始定时上报
   */
  private startReporting(): void {
    this.reportTimer = setInterval(() => {
      if (this.queue.length > 0) {
        this.reportBatch();
      }
    }, this.config.reportInterval);
  }

  /**
   * 停止上报
   */
  stop(): void {
    if (this.reportTimer) {
      clearInterval(this.reportTimer);
      this.reportTimer = undefined;
    }

    // 最后一次上报
    if (this.queue.length > 0) {
      this.reportBatch();
    }
  }

  /**
   * 批量上报
   */
  private async reportBatch(): Promise<void> {
    if (this.isReporting || this.queue.length === 0) {
      return;
    }

    this.isReporting = true;
    const batchSize = Math.min(this.config.batchSize, this.queue.length);
    const batch = this.queue.splice(0, batchSize);

    try {
      await this.sendBatch(batch.map(item => item.report));
      logger.debug('Performance batch reported successfully', { count: batch.length });
      this.errorCount = 0;
    } catch (error) {
      this.errorCount++;
      logger.error('Failed to report performance batch', error instanceof Error ? error : new Error(String(error)));
      this.config.onError(error instanceof Error ? error : new Error(String(error)));

      // 重试逻辑
      const retriableBatch = batch.filter(item => item.retries < this.config.maxRetries);
      retriableBatch.forEach(item => {
        item.retries++;
        this.queue.unshift(item); // 放回队列前面
      });

      // 如果错误太多，暂停一段时间
      if (this.errorCount >= 3) {
        await this.delay(this.config.retryDelay * this.errorCount);
      }
    } finally {
      this.isReporting = false;
      this.saveToStorage();
    }
  }

  /**
   * 发送批量数据
   */
  private async sendBatch(reports: PerformanceReport[]): Promise<void> {
    let body = JSON.stringify({ reports });

    // 压缩数据
    if (this.config.enableCompression && typeof window !== 'undefined' && 'CompressionStream' in window) {
      try {
        const stream = new CompressionStream('gzip');
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        
        writer.write(new TextEncoder().encode(body));
        writer.close();
        
        const chunks: Uint8Array[] = [];
        let done = false;
        
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) chunks.push(value);
        }
        
        body = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
        let offset = 0;
        for (const chunk of chunks) {
          body.set(chunk, offset);
          offset += chunk.length;
        }
      } catch (error) {
        logger.warn('Failed to compress data, sending uncompressed', { error });
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.config.headers
    };

    if (this.config.enableCompression && body instanceof Uint8Array) {
      headers['Content-Encoding'] = 'gzip';
    }

    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers,
      body,
      keepalive: true
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  /**
   * 获取视口大小
   */
  private getViewportSize(): { width: number; height: number } {
    if (typeof window === 'undefined') {
      return { width: 0, height: 0 };
    }

    return {
      width: window.innerWidth || document.documentElement.clientWidth,
      height: window.innerHeight || document.documentElement.clientHeight
    };
  }

  /**
   * 获取连接信息
   */
  private getConnectionInfo(): PerformanceReport['connection'] {
    if (typeof navigator === 'undefined' || !('connection' in navigator)) {
      return undefined;
    }

    const connection = (navigator as any).connection;
    return {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt
    };
  }

  /**
   * 获取系统信息
   */
  private getSystemInfo(): PerformanceReport['systemInfo'] {
    const systemInfo: PerformanceReport['systemInfo'] = {
      timing: {
        navigationStart: 0,
        loadComplete: 0,
        domReady: 0
      }
    };

    if (typeof window !== 'undefined') {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        systemInfo.timing = {
          navigationStart: navigation.navigationStart,
          loadComplete: navigation.loadEventEnd,
          domReady: navigation.domContentLoadedEventEnd
        };
      }

      // 内存信息
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        systemInfo.memory = {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit
        };
      }
    }

    return systemInfo;
  }

  /**
   * 保存到本地存储
   */
  private saveToStorage(): void {
    if (!this.config.enableLocalStorage || typeof localStorage === 'undefined') {
      return;
    }

    try {
      const data = JSON.stringify(this.queue);
      
      // 检查大小限制
      if (data.length > this.config.maxStorageSize) {
        // 删除最老的数据
        const halfSize = Math.floor(this.queue.length / 2);
        this.queue = this.queue.slice(-halfSize);
        this.saveToStorage();
        return;
      }

      localStorage.setItem(this.config.storageKey, data);
    } catch (error) {
      logger.warn('Failed to save performance reports to storage', { error });
    }
  }

  /**
   * 从本地存储加载
   */
  private loadFromStorage(): void {
    if (!this.config.enableLocalStorage || typeof localStorage === 'undefined') {
      return;
    }

    try {
      const data = localStorage.getItem(this.config.storageKey);
      if (data) {
        const queue = JSON.parse(data) as QueueItem[];
        
        // 过滤过期的数据（超过24小时）
        const now = Date.now();
        const validQueue = queue.filter(item => 
          now - item.timestamp < 24 * 60 * 60 * 1000
        );
        
        this.queue = validQueue;
        logger.debug('Loaded performance reports from storage', { count: validQueue.length });
      }
    } catch (error) {
      logger.warn('Failed to load performance reports from storage', { error });
      // 清除损坏的数据
      localStorage.removeItem(this.config.storageKey);
    }
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取队列状态
   */
  getQueueStatus(): {
    size: number;
    isReporting: boolean;
    errorCount: number;
    oldestTimestamp?: number;
  } {
    return {
      size: this.queue.length,
      isReporting: this.isReporting,
      errorCount: this.errorCount,
      oldestTimestamp: this.queue.length > 0 ? Math.min(...this.queue.map(item => item.timestamp)) : undefined
    };
  }

  /**
   * 清空队列
   */
  clearQueue(): void {
    this.queue = [];
    this.saveToStorage();
    logger.info('Performance report queue cleared');
  }

  /**
   * 手动触发上报
   */
  async flush(): Promise<void> {
    while (this.queue.length > 0 && !this.isReporting) {
      await this.reportBatch();
    }
  }
}

/**
 * 性能分析器
 */
export class PerformanceAnalyzer {
  /**
   * 分析Web Vitals趋势
   */
  static analyzeWebVitalsTrends(reports: PerformanceReport[]): {
    trends: Record<string, { current: number; previous: number; change: number; trend: 'improving' | 'degrading' | 'stable' }>;
    summary: { good: number; needsImprovement: number; poor: number };
  } {
    const trends: Record<string, any> = {};
    const summary = { good: 0, needsImprovement: 0, poor: 0 };

    if (reports.length < 2) {
      return { trends, summary };
    }

    const recent = reports.slice(-10); // 最近10个报告
    const previous = reports.slice(-20, -10); // 之前10个报告

    const vitalsNames = ['CLS', 'FID', 'FCP', 'LCP', 'TTFB', 'INP'];

    vitalsNames.forEach(name => {
      const recentValues = recent.map(r => r.webVitals[name]?.value).filter(v => v !== undefined);
      const previousValues = previous.map(r => r.webVitals[name]?.value).filter(v => v !== undefined);

      if (recentValues.length > 0 && previousValues.length > 0) {
        const currentAvg = recentValues.reduce((a, b) => a + b, 0) / recentValues.length;
        const previousAvg = previousValues.reduce((a, b) => a + b, 0) / previousValues.length;
        const change = ((currentAvg - previousAvg) / previousAvg) * 100;

        trends[name] = {
          current: currentAvg,
          previous: previousAvg,
          change,
          trend: Math.abs(change) < 5 ? 'stable' : (change < 0 ? 'improving' : 'degrading')
        };
      }

      // 统计评级分布
      recent.forEach(report => {
        const metric = report.webVitals[name];
        if (metric) {
          summary[metric.rating === 'good' ? 'good' : metric.rating === 'needs-improvement' ? 'needsImprovement' : 'poor']++;
        }
      });
    });

    return { trends, summary };
  }

  /**
   * 分析性能瓶颈
   */
  static analyzeBottlenecks(reports: PerformanceReport[]): {
    slowestPages: Array<{ url: string; avgLoadTime: number; count: number }>;
    commonIssues: Array<{ issue: string; frequency: number; impact: 'high' | 'medium' | 'low' }>;
    recommendations: string[];
  } {
    const pageStats: Record<string, { totalTime: number; count: number }> = {};
    const issues: Record<string, number> = {};
    const recommendations: string[] = [];

    reports.forEach(report => {
      const url = new URL(report.url).pathname;
      const loadTime = report.systemInfo.timing.loadComplete - report.systemInfo.timing.navigationStart;

      if (!pageStats[url]) {
        pageStats[url] = { totalTime: 0, count: 0 };
      }
      pageStats[url].totalTime += loadTime;
      pageStats[url].count++;

      // 检查常见问题
      if (report.webVitals.LCP?.value > 4000) {
        issues['Slow LCP'] = (issues['Slow LCP'] || 0) + 1;
      }
      if (report.webVitals.CLS?.value > 0.25) {
        issues['High CLS'] = (issues['High CLS'] || 0) + 1;
      }
      if (report.webVitals.FID?.value > 300) {
        issues['High FID'] = (issues['High FID'] || 0) + 1;
      }
    });

    // 最慢的页面
    const slowestPages = Object.entries(pageStats)
      .map(([url, stats]) => ({
        url,
        avgLoadTime: stats.totalTime / stats.count,
        count: stats.count
      }))
      .sort((a, b) => b.avgLoadTime - a.avgLoadTime)
      .slice(0, 10);

    // 常见问题
    const commonIssues = Object.entries(issues)
      .map(([issue, frequency]) => ({
        issue,
        frequency,
        impact: frequency > reports.length * 0.5 ? 'high' as const : 
                frequency > reports.length * 0.2 ? 'medium' as const : 'low' as const
      }))
      .sort((a, b) => b.frequency - a.frequency);

    // 生成建议
    if (commonIssues.some(issue => issue.issue === 'Slow LCP')) {
      recommendations.push('Optimize images and implement lazy loading');
      recommendations.push('Use CDN for static assets');
    }
    if (commonIssues.some(issue => issue.issue === 'High CLS')) {
      recommendations.push('Set explicit dimensions for images and ads');
      recommendations.push('Avoid inserting content above existing content');
    }
    if (commonIssues.some(issue => issue.issue === 'High FID')) {
      recommendations.push('Reduce JavaScript execution time');
      recommendations.push('Use code splitting and lazy loading');
    }

    return { slowestPages, commonIssues, recommendations };
  }
}

export default PerformanceReporter;