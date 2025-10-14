export type MonitoringMetadataValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Date
  | MonitoringMetadataValue[]
  | { [key: string]: MonitoringMetadataValue };

export type MonitoringMetadata = Record<string, MonitoringMetadataValue>;

export interface PerformanceMetric {
  name: string;
  value: number;
  unit?: string;
  timestamp: Date;
  tags?: Record<string, string>;
}

export interface UserAction {
  action: string;
  type?: string;
  target?: string;
  timestamp: Date;
  metadata?: MonitoringMetadata;
  userId?: string;
  sessionId?: string;
  duration?: number;
}

export interface BusinessMetric {
  name: string;
  value: number;
  period?: string;
  comparison?: {
    previous: number;
    change: number;
  };
  metric?: string;
  category?: string;
  tags?: Record<string, string>;
  timestamp: Date;
}

export interface PerformanceAlert {
  id: string;
  type: 'error' | 'warning' | 'info' | 'high' | 'low';
  message: string;
  timestamp: Date;
  resolved?: boolean;
  metric?: string;
  value?: number;
  threshold?: { min?: number; max?: number };
  severity?: 'low' | 'medium' | 'high' | 'critical';
  tags?: Record<string, string>;
}


export type Alert = PerformanceAlert;


/**
 * 应用性能监控系统
 * 实现APM功能，监控应用性能指标
 */

type InternalPerformanceMetric = PerformanceMetric;
type InternalUserAction = UserAction;
type InternalBusinessMetric = BusinessMetric;

interface MetricSummary {
  count: number;
  avg: number;
  min: number;
  max: number;
  latest: number;
}

export type PerformanceSummary = Record<string, MetricSummary>;

export interface PerformanceReport {
  metrics: PerformanceMetric[];
  userActions: UserAction[];
  businessMetrics: BusinessMetric[];
  summary: PerformanceSummary;
}

interface PerformanceWithMemory extends Performance {
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

interface NavigatorConnection {
  downlink?: number;
  effectiveType?: string;
}

type NavigatorWithConnection = Navigator & {
  connection?: NavigatorConnection;
};

/**
 * 性能监控管理器
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: InternalPerformanceMetric[] = [];
  private userActions: InternalUserAction[] = [];
  private businessMetrics: InternalBusinessMetric[] = [];
  private observers: PerformanceObserver[] = [];
  private isEnabled = true;

  private constructor() {
    this.initializeObservers();
    this.startMetricsCollection();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * 初始化性能观察器
   */
  private initializeObservers() {
    if (typeof window === 'undefined') return;

    try {
      // 监控导航性能
      const navObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            const navigationStart = (navEntry as PerformanceNavigationTiming & { navigationStart?: number }).navigationStart ?? navEntry.startTime ?? 0;
            const loadEventEnd = navEntry.loadEventEnd ?? navEntry.responseEnd ?? navigationStart;
            const domContentLoadedEnd = navEntry.domContentLoadedEventEnd ?? loadEventEnd;
            const responseStart = navEntry.responseStart ?? navigationStart;

            this.recordMetric('page_load_time', loadEventEnd - navigationStart, undefined, 'ms');
            this.recordMetric('dom_content_loaded', domContentLoadedEnd - navigationStart, undefined, 'ms');
            this.recordMetric('first_paint', responseStart - navigationStart, undefined, 'ms');
          }
        }
      });
      navObserver.observe({ entryTypes: ['navigation'] });
      this.observers.push(navObserver);

      // 监控资源加载性能
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming;
            this.recordMetric('resource_load_time', resourceEntry.responseEnd - resourceEntry.startTime, {
              resource_name: resourceEntry.name,
              resource_type: resourceEntry.initiatorType,
            });
          }
        }
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);

      // 监控用户交互性能
      const measureObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'measure') {
            this.recordMetric('custom_measure', entry.duration, {
              measure_name: entry.name,
            });
          }
        }
      });
      measureObserver.observe({ entryTypes: ['measure'] });
      this.observers.push(measureObserver);

    } catch (error) {
      console.warn('Performance Observer not supported:', error);
    }
  }

  /**
   * 开始指标收集
   */
  private startMetricsCollection() {
    if (typeof window === 'undefined') return;

    // 收集内存使用情况
    setInterval(() => {
      const memoryInfo = (performance as PerformanceWithMemory).memory;
      if (memoryInfo) {
        this.recordMetric('memory_used', memoryInfo.usedJSHeapSize);
        this.recordMetric('memory_total', memoryInfo.totalJSHeapSize);
        this.recordMetric('memory_limit', memoryInfo.jsHeapSizeLimit);
      }
    }, 30000); // 每30秒收集一次

    // 收集网络连接信息
    if ('connection' in navigator) {
      const connection = (navigator as NavigatorWithConnection).connection;
      if (connection) {
        this.recordMetric('network_downlink', connection.downlink ?? 0, {
          connection_type: connection.effectiveType ?? 'unknown',
        });
      }
    }
  }

  /**
   * 记录性能指标
   */
  recordMetric(name: string, value: number, tags?: Record<string, string>, unit?: string) {
    if (!this.isEnabled) return;

    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: new Date(),
      tags,
      unit,
    };

    this.metrics.push(metric);
    this.sendMetricToBackend(metric);

    // 保持内存中的指标数量在合理范围内
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-500);
    }
  }

  /**
   * 记录用户行为
   */
  recordUserAction(action: string, metadata?: MonitoringMetadata, userId?: string) {
    if (!this.isEnabled) return;

    const userAction: UserAction = {
      action,
      type: action,
      userId,
      sessionId: this.getSessionId(),
      timestamp: new Date(),
      metadata,
    };

    this.userActions.push(userAction);
    this.sendUserActionToBackend(userAction);

    // 保持内存中的用户行为数量在合理范围内
    if (this.userActions.length > 500) {
      this.userActions = this.userActions.slice(-250);
    }
  }

  /**
   * 记录业务指标
   */
  recordBusinessMetric(metric: string, value: number, category: string, tags?: Record<string, string>) {
    if (!this.isEnabled) return;

    const businessMetric: BusinessMetric = {
      name: metric,
      metric,
      value,
      timestamp: new Date(),
      category,
      tags,
    };

    this.businessMetrics.push(businessMetric);
    this.sendBusinessMetricToBackend(businessMetric);

    // 保持内存中的业务指标数量在合理范围内
    if (this.businessMetrics.length > 500) {
      this.businessMetrics = this.businessMetrics.slice(-250);
    }
  }

  /**
   * 测量函数执行时间
   */
  async measureFunction<T>(name: string, fn: () => Promise<T> | T): Promise<T> {
    const startTime = performance.now();

    try {
      const result = await fn();
      const duration = performance.now() - startTime;
      this.recordMetric('function_execution_time', duration, { function_name: name }, 'ms');
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordMetric('function_execution_time', duration, {
        function_name: name,
        error: 'true',
      }, 'ms');
      throw error;
    }
  }

  /**
   * 测量API调用性能
   */
  async measureApiCall<T>(url: string, fn: () => Promise<T>): Promise<T> {
    const startTime = performance.now();

    try {
      const result = await fn();
      const duration = performance.now() - startTime;
      this.recordMetric('api_call_duration', duration, {
        url: this.sanitizeUrl(url),
        status: 'success',
      }, 'ms');
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordMetric('api_call_duration', duration, {
        url: this.sanitizeUrl(url),
        status: 'error',
      }, 'ms');
      throw error;
    }
  }

  /**
   * 获取性能报告
   */
  getPerformanceReport(): PerformanceReport {
    return {
      metrics: this.metrics.slice(-100), // 最近100个指标
      userActions: this.userActions.slice(-50), // 最近50个用户行为
      businessMetrics: this.businessMetrics.slice(-50), // 最近50个业务指标
      summary: this.generateSummary(),
    };
  }

  /**
   * 生成性能摘要
   */
  private generateSummary(): PerformanceSummary {
    const recentMetrics = this.metrics.slice(-100);
    const summary: PerformanceSummary = {};

    // 按指标名称分组并计算统计信息
    const metricGroups = recentMetrics.reduce((groups, metric) => {
      if (!groups[metric.name]) {
        groups[metric.name] = [];
      }
      groups[metric.name].push(metric.value);
      return groups;
    }, {} as Record<string, number[]>);

    Object.entries(metricGroups).forEach(([name, values]) => {
      const safeValues = values.length > 0 ? values : [0];
      summary[name] = {
        count: values.length,
        avg: safeValues.reduce((sum, val) => sum + val, 0) / safeValues.length,
        min: Math.min(...safeValues),
        max: Math.max(...safeValues),
        latest: safeValues[safeValues.length - 1],
      };
    });

    return summary;
  }

  /**
   * 发送指标到后端
   */
  private async sendMetricToBackend(metric: PerformanceMetric) {
    try {
      // 批量发送以减少网络请求
      if (this.metrics.length % 10 === 0) {
        await fetch('/api/monitoring/metrics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metrics: this.metrics.slice(-10),
          }),
        });
      }
    } catch (error) {
      console.warn('Failed to send metrics to backend:', error);
    }
  }

  /**
   * 发送用户行为到后端
   */
  private async sendUserActionToBackend(userAction: UserAction) {
    try {
      await fetch('/api/monitoring/user-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userAction),
      });
    } catch (error) {
      console.warn('Failed to send user action to backend:', error);
    }
  }

  /**
   * 发送业务指标到后端
   */
  private async sendBusinessMetricToBackend(businessMetric: BusinessMetric) {
    try {
      await fetch('/api/monitoring/business-metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(businessMetric),
      });
    } catch (error) {
      console.warn('Failed to send business metric to backend:', error);
    }
  }

  /**
   * 获取会话ID
   */
  private getSessionId(): string {
    if (typeof window === 'undefined') return 'server-session';

    let sessionId = sessionStorage.getItem('monitoring_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('monitoring_session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * 清理URL中的敏感信息
   */
  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url, window.location.origin);
      // 移除查询参数中的敏感信息
      urlObj.searchParams.delete('token');
      urlObj.searchParams.delete('key');
      urlObj.searchParams.delete('password');
      return urlObj.pathname;
    } catch {
      return url.split('?')[0]; // 简单处理，只保留路径部分
    }
  }

  /**
   * 启用/禁用监控
   */
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  /**
   * 清理资源
   */
  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics = [];
    this.userActions = [];
    this.businessMetrics = [];
  }
}

/**
 * 异常检测和告警
 */
export class AlertManager {
  private static instance: AlertManager;
  private thresholds: Record<string, { min?: number; max?: number; }> = {};
  private alertCallbacks: Array<(alert: PerformanceAlert) => void> = [];

  private constructor() {
    this.setupDefaultThresholds();
  }

  static getInstance(): AlertManager {
    if (!AlertManager.instance) {
      AlertManager.instance = new AlertManager();
    }
    return AlertManager.instance;
  }

  /**
   * 设置默认阈值
   */
  private setupDefaultThresholds() {
    this.thresholds = {
      'page_load_time': { max: 3000 }, // 页面加载时间不超过3秒
      'api_call_duration': { max: 5000 }, // API调用不超过5秒
      'memory_used': { max: 100 * 1024 * 1024 }, // 内存使用不超过100MB
      'error_rate': { max: 0.05 }, // 错误率不超过5%
    };
  }

  /**
   * 设置阈值
   */
  setThreshold(metric: string, threshold: { min?: number; max?: number; }) {
    this.thresholds[metric] = threshold;
  }

  /**
   * 检查指标是否超出阈值
   */
  checkMetric(name: string, value: number) {
    const threshold = this.thresholds[name];
    if (!threshold) return;

    let alertTriggered = false;
    let alertType: 'high' | 'low' = 'high';
    let message = '';

    if (threshold.max !== undefined && value > threshold.max) {
      alertTriggered = true;
      alertType = 'high';
      message = `${name} 超出最大阈值: ${value} > ${threshold.max}`;
    } else if (threshold.min !== undefined && value < threshold.min) {
      alertTriggered = true;
      alertType = 'low';
      message = `${name} 低于最小阈值: ${value} < ${threshold.min}`;
    }

    if (alertTriggered) {
      const alert: PerformanceAlert = {
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        metric: name,
        value,
        threshold: threshold,
        type: alertType,
        message,
        timestamp: new Date(),
        severity: this.calculateSeverity(name, value, threshold),
        resolved: false,
      };

      this.triggerAlert(alert);
    }
  }

  /**
   * 计算告警严重程度
   */
  private calculateSeverity(name: string, value: number, threshold: { min?: number; max?: number; }): 'low' | 'medium' | 'high' | 'critical' {
    if (threshold.max !== undefined) {
      const ratio = value / threshold.max;
      if (ratio > 2) return 'critical';
      if (ratio > 1.5) return 'high';
      if (ratio > 1.2) return 'medium';
      return 'low';
    }

    if (threshold.min !== undefined) {
      const ratio = threshold.min / value;
      if (ratio > 2) return 'critical';
      if (ratio > 1.5) return 'high';
      if (ratio > 1.2) return 'medium';
      return 'low';
    }

    return 'low';
  }

  /**
   * 触发告警
   */
  private triggerAlert(alert: PerformanceAlert) {
    console.warn('Performance Alert:', alert);

    // 调用所有注册的告警回调
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('Alert callback error:', error);
      }
    });

    // 发送告警到后端
    this.sendAlertToBackend(alert);
  }

  /**
   * 注册告警回调
   */
  onAlert(callback: (alert: PerformanceAlert) => void) {
    this.alertCallbacks.push(callback);
  }

  /**
   * 发送告警到后端
   */
  private async sendAlertToBackend(alert: PerformanceAlert) {
    try {
      await fetch('/api/monitoring/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alert),
      });
    } catch (error) {
      console.warn('Failed to send alert to backend:', error);
    }
  }
}

// 导出单例实例
export const performanceMonitor = PerformanceMonitor.getInstance();
export const alertManager = AlertManager.getInstance();

// 自动监控常见指标
if (typeof window !== 'undefined') {
  // 监控页面可见性变化
  document.addEventListener('visibilitychange', () => {
    performanceMonitor.recordUserAction('page_visibility_change', {
      hidden: document.hidden,
    });
  });

  // 监控页面卸载
  window.addEventListener('beforeunload', () => {
    performanceMonitor.recordUserAction('page_unload');
  });

  // 监控错误
  window.addEventListener('error', (event) => {
    performanceMonitor.recordUserAction('javascript_error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  // 监控未处理的Promise拒绝
  window.addEventListener('unhandledrejection', (event) => {
    performanceMonitor.recordUserAction('unhandled_promise_rejection', {
      reason: event.reason?.toString(),
    });
  });
}
