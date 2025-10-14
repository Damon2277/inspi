/**
 * 监控系统统一入口
 * 整合性能监控、用户分析、日志管理和错误追踪
 */

import type { MonitoringMetadata } from './performance-monitor';

export { performanceMonitor, alertManager } from './performance-monitor';
export { userAnalytics } from './user-analytics';
export { logger } from './logger';
export { errorTracker } from './error-tracker';

export type {
  PerformanceMetric,
  UserAction,
  BusinessMetric,
  PerformanceAlert,
  Alert,
  MonitoringMetadata,
  MonitoringMetadataValue,
  PerformanceReport,
  PerformanceSummary,
} from './performance-monitor';

export type {
  UserEvent,
  UserSession,
  Funnel,
  FunnelStep,
} from './user-analytics';

export type {
  LogLevel,
  LogEntry,
  LoggerConfig,
  LogSearchQuery,
  LogStats,
} from './logger';

export type {
  ErrorEvent,
  ErrorPattern,
  ErrorAlert,
  Breadcrumb,
  ErrorSeverity,
  ErrorStatus,
  ErrorCategory,
} from './error-tracker';

/**
 * 监控系统管理器
 * 提供统一的监控接口和配置管理
 */
export class MonitoringManager {
  private static instance: MonitoringManager;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): MonitoringManager {
    if (!MonitoringManager.instance) {
      MonitoringManager.instance = new MonitoringManager();
    }
    return MonitoringManager.instance;
  }

  /**
   * 初始化监控系统
   */
  async initialize(config?: {
    performance?: boolean;
    analytics?: boolean;
    logging?: boolean;
    errorTracking?: boolean;
    userId?: string;
  }) {
    if (this.isInitialized) return;

    const {
      performance = true,
      analytics = true,
      logging = true,
      errorTracking = true,
      userId,
    } = config || {};

    try {
      // 设置用户ID
      if (userId) {
        this.setUserId(userId);
      }

      // 初始化各个监控模块
      if (performance) {
        const { performanceMonitor } = await import('./performance-monitor');
        performanceMonitor.setEnabled(true);
      }

      if (analytics) {
        const { userAnalytics } = await import('./user-analytics');
        userAnalytics.setEnabled(true);
      }

      if (logging) {
        const { logger } = await import('./logger');
        logger.info('Monitoring system initialized');
      }

      if (errorTracking) {
        const { errorTracker } = await import('./error-tracker');
        errorTracker.setEnabled(true);
      }

      this.isInitialized = true;
      console.log('Monitoring system initialized successfully');

    } catch (error) {
      console.error('Failed to initialize monitoring system:', error);
    }
  }

  /**
   * 设置用户ID
   */
  setUserId(userId: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('user_id', userId);
      sessionStorage.setItem('session_id', `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
    }

    // 通知各个监控模块
    import('./user-analytics').then(({ userAnalytics }) => {
      userAnalytics.setUserId(userId);
    });
  }

  /**
   * 记录业务事件
   */
  trackEvent(eventName: string, properties?: MonitoringMetadata) {
    import('./user-analytics').then(({ userAnalytics }) => {
      userAnalytics.trackBusinessEvent(eventName, properties);
    });

    import('./logger').then(({ logger }) => {
      logger.info(`Business Event: ${eventName}`, properties, ['business']);
    });
  }

  /**
   * 记录性能指标
   */
  recordMetric(name: string, value: number, tags?: Record<string, string>) {
    import('./performance-monitor').then(({ performanceMonitor }) => {
      performanceMonitor.recordMetric(name, value, tags);
    });
  }

  /**
   * 记录错误
   */
  captureError(error: Error | string, context?: MonitoringMetadata) {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const stack = typeof error === 'object' ? error.stack : undefined;

    import('./error-tracker').then(({ errorTracker }) => {
      errorTracker.captureError({
        message: errorMessage,
        stack,
        category: 'javascript',
        context,
      });
    });

    import('./logger').then(({ logger }) => {
      logger.error(errorMessage, { ...(context ?? {}), stack }, ['error']);
    });
  }

  /**
   * 记录用户行为
   */
  trackUserAction(action: string, metadata?: MonitoringMetadata) {
    import('./performance-monitor').then(({ performanceMonitor }) => {
      performanceMonitor.recordUserAction(action, metadata);
    });

    import('./user-analytics').then(({ userAnalytics }) => {
      userAnalytics.track('user_action', { action, ...(metadata ?? {}) });
    });
  }

  /**
   * 获取综合监控报告
   */
  async getMonitoringReport() {
    const [
      { performanceMonitor },
      { userAnalytics },
      { logger },
      { errorTracker },
    ] = await Promise.all([
      import('./performance-monitor'),
      import('./user-analytics'),
      import('./logger'),
      import('./error-tracker'),
    ]);

    return {
      performance: performanceMonitor.getPerformanceReport(),
      analytics: userAnalytics.getAnalyticsReport(),
      logs: logger.getLogStats(),
      errors: errorTracker.getErrorReport(),
      timestamp: Date.now(),
    };
  }

  /**
   * 启用/禁用监控
   */
  async setEnabled(enabled: boolean) {
    const [
      { performanceMonitor },
      { userAnalytics },
      { errorTracker },
    ] = await Promise.all([
      import('./performance-monitor'),
      import('./user-analytics'),
      import('./error-tracker'),
    ]);

    performanceMonitor.setEnabled(enabled);
    userAnalytics.setEnabled(enabled);
    errorTracker.setEnabled(enabled);
  }

  /**
   * 清理监控系统
   */
  async destroy() {
    if (!this.isInitialized) return;

    try {
      const [
        { performanceMonitor },
        { userAnalytics },
        { logger },
        { errorTracker },
      ] = await Promise.all([
        import('./performance-monitor'),
        import('./user-analytics'),
        import('./logger'),
        import('./error-tracker'),
      ]);

      performanceMonitor.destroy();
      userAnalytics.destroy();
      logger.destroy();
      errorTracker.destroy();

      this.isInitialized = false;
      console.log('Monitoring system destroyed');

    } catch (error) {
      console.error('Failed to destroy monitoring system:', error);
    }
  }
}

// 导出单例实例
export const monitoring = MonitoringManager.getInstance();

// 自动初始化（在浏览器环境中）
if (typeof window !== 'undefined') {
  // 等待DOM加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      monitoring.initialize();
    });
  } else {
    monitoring.initialize();
  }
}
