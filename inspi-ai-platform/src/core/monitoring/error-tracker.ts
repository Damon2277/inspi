/**
 * 错误追踪系统
 * 监控、分类和分析应用错误
 */

type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
type ErrorStatus = 'new' | 'acknowledged' | 'in_progress' | 'resolved' | 'ignored';
type ErrorCategory = 'javascript' | 'network' | 'api' | 'validation' | 'business' | 'security' | 'performance';

interface ErrorEvent {
  id: string;
  timestamp: number;
  message: string;
  stack?: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  status: ErrorStatus;
  fingerprint: string; // 用于错误去重
  context: {
    url: string;
    userAgent: string;
    userId?: string;
    sessionId?: string;
    requestId?: string;
    component?: string;
    action?: string;
    metadata?: Record<string, any>;
  };
  environment: {
    browser?: string;
    version?: string;
    os?: string;
    device?: string;
    viewport?: { width: number; height: number };
  };
  breadcrumbs: Breadcrumb[];
  tags: string[];
  occurrenceCount: number;
  firstSeen: number;
  lastSeen: number;
}

interface Breadcrumb {
  timestamp: number;
  category: string;
  message: string;
  level: 'debug' | 'info' | 'warning' | 'error';
  data?: Record<string, any>;
}

interface ErrorPattern {
  id: string;
  fingerprint: string;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  occurrences: number;
  affectedUsers: Set<string>;
  firstSeen: number;
  lastSeen: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  resolution?: {
    status: ErrorStatus;
    assignee?: string;
    notes?: string;
    resolvedAt?: number;
  };
}

interface ErrorAlert {
  id: string;
  errorId: string;
  type: 'threshold' | 'spike' | 'new_error' | 'regression';
  message: string;
  severity: ErrorSeverity;
  timestamp: number;
  metadata: Record<string, any>;
}

/**
 * 错误追踪管理器
 */
export class ErrorTracker {
  private static instance: ErrorTracker;
  private errors: Map<string, ErrorEvent> = new Map();
  private patterns: Map<string, ErrorPattern> = new Map();
  private breadcrumbs: Breadcrumb[] = [];
  private alerts: ErrorAlert[] = [];
  private isEnabled = true;
  private maxBreadcrumbs = 50;
  private alertThresholds = {
    errorRate: 0.05, // 5%错误率
    spikeMultiplier: 3, // 错误数量激增3倍
    criticalErrorCount: 10, // 严重错误数量
  };

  private constructor() {
    this.setupErrorHandlers();
    this.startPeriodicAnalysis();
  }

  static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker();
    }
    return ErrorTracker.instance;
  }

  /**
   * 设置错误处理器
   */
  private setupErrorHandlers() {
    if (typeof window !== 'undefined') {
      // JavaScript错误
      window.addEventListener('error', (event) => {
        this.captureError({
          message: event.message,
          stack: event.error?.stack,
          category: 'javascript',
          context: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
          },
        });
      });

      // Promise拒绝
      window.addEventListener('unhandledrejection', (event) => {
        this.captureError({
          message: `Unhandled Promise Rejection: ${event.reason}`,
          stack: event.reason?.stack,
          category: 'javascript',
          context: {
            reason: event.reason?.toString(),
          },
        });
      });

      // 网络错误监控
      this.setupNetworkErrorMonitoring();
    }
  }

  /**
   * 设置网络错误监控
   */
  private setupNetworkErrorMonitoring() {
    // 监控fetch请求
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = Date.now();
      try {
        const response = await originalFetch(...args);

        // 记录API调用面包屑
        this.addBreadcrumb({
          category: 'http',
          message: `${response.status} ${args[0]}`,
          level: response.ok ? 'info' : 'error',
          data: {
            url: args[0],
            status: response.status,
            duration: Date.now() - startTime,
          },
        });

        // 如果响应不成功，记录为错误
        if (!response.ok) {
          this.captureError({
            message: `HTTP ${response.status}: ${response.statusText}`,
            category: 'network',
            severity: response.status >= 500 ? 'high' : 'medium',
            context: {
              url: args[0].toString(),
              status: response.status,
              statusText: response.statusText,
            },
          });
        }

        return response;
      } catch (error: any) {
        // 网络错误
        this.captureError({
          message: `Network Error: ${error.message}`,
          stack: error.stack,
          category: 'network',
          severity: 'high',
          context: {
            url: args[0].toString(),
            error: error.message,
          },
        });
        throw error;
      }
    };

    // 监控XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url, ...args) {
      this._errorTracker = { method, url, startTime: Date.now() };
      return originalXHROpen.call(this, method, url, ...args);
    };

    XMLHttpRequest.prototype.send = function (...args) {
      const tracker = this._errorTracker;

      this.addEventListener('load', () => {
        if (tracker) {
          const duration = Date.now() - tracker.startTime;
          ErrorTracker.getInstance().addBreadcrumb({
            category: 'xhr',
            message: `${this.status} ${tracker.method} ${tracker.url}`,
            level: this.status >= 400 ? 'error' : 'info',
            data: {
              method: tracker.method,
              url: tracker.url,
              status: this.status,
              duration,
            },
          });

          if (this.status >= 400) {
            ErrorTracker.getInstance().captureError({
              message: `XHR ${this.status}: ${this.statusText}`,
              category: 'network',
              severity: this.status >= 500 ? 'high' : 'medium',
              context: {
                method: tracker.method,
                url: tracker.url,
                status: this.status,
                statusText: this.statusText,
              },
            });
          }
        }
      });

      this.addEventListener('error', () => {
        if (tracker) {
          ErrorTracker.getInstance().captureError({
            message: `XHR Network Error: ${tracker.method} ${tracker.url}`,
            category: 'network',
            severity: 'high',
            context: {
              method: tracker.method,
              url: tracker.url,
            },
          });
        }
      });

      return originalXHRSend.call(this, ...args);
    };
  }

  /**
   * 捕获错误
   */
  captureError(errorData: {
    message: string;
    stack?: string;
    category: ErrorCategory;
    severity?: ErrorSeverity;
    context?: Record<string, any>;
    tags?: string[];
  }) {
    if (!this.isEnabled) return;

    const fingerprint = this.generateFingerprint(errorData.message, errorData.stack);
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const errorEvent: ErrorEvent = {
      id: errorId,
      timestamp: Date.now(),
      message: errorData.message,
      stack: errorData.stack,
      category: errorData.category,
      severity: errorData.severity || this.calculateSeverity(errorData),
      status: 'new',
      fingerprint,
      context: {
        url: typeof window !== 'undefined' ? window.location.href : '',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        userId: this.getUserId(),
        sessionId: this.getSessionId(),
        ...errorData.context,
      },
      environment: this.getEnvironmentInfo(),
      breadcrumbs: [...this.breadcrumbs],
      tags: errorData.tags || [],
      occurrenceCount: 1,
      firstSeen: Date.now(),
      lastSeen: Date.now(),
    };

    // 检查是否是已知错误模式
    this.updateErrorPattern(errorEvent);

    // 存储错误事件
    this.errors.set(errorId, errorEvent);

    // 检查是否需要发送告警
    this.checkForAlerts(errorEvent);

    // 发送到后端
    this.sendErrorToBackend(errorEvent);

    // 添加错误面包屑
    this.addBreadcrumb({
      category: 'error',
      message: errorData.message,
      level: 'error',
      data: {
        category: errorData.category,
        severity: errorEvent.severity,
      },
    });

    return errorId;
  }

  /**
   * 更新错误模式
   */
  private updateErrorPattern(errorEvent: ErrorEvent) {
    const existingPattern = this.patterns.get(errorEvent.fingerprint);

    if (existingPattern) {
      // 更新现有模式
      existingPattern.occurrences++;
      existingPattern.lastSeen = errorEvent.timestamp;
      if (errorEvent.context.userId) {
        existingPattern.affectedUsers.add(errorEvent.context.userId);
      }

      // 更新趋势
      existingPattern.trend = this.calculateTrend(existingPattern);
    } else {
      // 创建新模式
      const pattern: ErrorPattern = {
        id: `pattern_${errorEvent.fingerprint}`,
        fingerprint: errorEvent.fingerprint,
        message: errorEvent.message,
        category: errorEvent.category,
        severity: errorEvent.severity,
        occurrences: 1,
        affectedUsers: new Set(errorEvent.context.userId ? [errorEvent.context.userId] : []),
        firstSeen: errorEvent.timestamp,
        lastSeen: errorEvent.timestamp,
        trend: 'stable',
      };

      this.patterns.set(errorEvent.fingerprint, pattern);
    }
  }

  /**
   * 计算错误趋势
   */
  private calculateTrend(pattern: ErrorPattern): 'increasing' | 'decreasing' | 'stable' {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const recentErrors = Array.from(this.errors.values())
      .filter(error =>
        error.fingerprint === pattern.fingerprint &&
        error.timestamp > now - oneHour,
      );

    const previousHourErrors = Array.from(this.errors.values())
      .filter(error =>
        error.fingerprint === pattern.fingerprint &&
        error.timestamp > now - 2 * oneHour &&
        error.timestamp <= now - oneHour,
      );

    if (recentErrors.length > previousHourErrors.length * 1.5) {
      return 'increasing';
    } else if (recentErrors.length < previousHourErrors.length * 0.5) {
      return 'decreasing';
    }
    return 'stable';
  }

  /**
   * 检查告警条件
   */
  private checkForAlerts(errorEvent: ErrorEvent) {
    const pattern = this.patterns.get(errorEvent.fingerprint);
    if (!pattern) return;

    // 新错误告警
    if (pattern.occurrences === 1) {
      this.createAlert({
        errorId: errorEvent.id,
        type: 'new_error',
        message: `New error detected: ${errorEvent.message}`,
        severity: errorEvent.severity,
        metadata: {
          category: errorEvent.category,
          fingerprint: errorEvent.fingerprint,
        },
      });
    }

    // 错误激增告警
    if (pattern.trend === 'increasing' && pattern.occurrences > 10) {
      this.createAlert({
        errorId: errorEvent.id,
        type: 'spike',
        message: `Error spike detected: ${errorEvent.message}`,
        severity: 'high',
        metadata: {
          occurrences: pattern.occurrences,
          affectedUsers: pattern.affectedUsers.size,
        },
      });
    }

    // 严重错误阈值告警
    if (errorEvent.severity === 'critical') {
      const criticalErrors = Array.from(this.patterns.values())
        .filter(p => p.severity === 'critical')
        .reduce((sum, p) => sum + p.occurrences, 0);

      if (criticalErrors >= this.alertThresholds.criticalErrorCount) {
        this.createAlert({
          errorId: errorEvent.id,
          type: 'threshold',
          message: `Critical error threshold exceeded: ${criticalErrors} errors`,
          severity: 'critical',
          metadata: {
            criticalErrorCount: criticalErrors,
            threshold: this.alertThresholds.criticalErrorCount,
          },
        });
      }
    }
  }

  /**
   * 创建告警
   */
  private createAlert(alertData: {
    errorId: string;
    type: 'threshold' | 'spike' | 'new_error' | 'regression';
    message: string;
    severity: ErrorSeverity;
    metadata: Record<string, any>;
  }) {
    const alert: ErrorAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...alertData,
      timestamp: Date.now(),
    };

    this.alerts.push(alert);

    // 发送告警通知
    this.sendAlertNotification(alert);

    // 保持告警数量在合理范围内
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-50);
    }
  }

  /**
   * 添加面包屑
   */
  addBreadcrumb(breadcrumb: Omit<Breadcrumb, 'timestamp'>) {
    const fullBreadcrumb: Breadcrumb = {
      ...breadcrumb,
      timestamp: Date.now(),
    };

    this.breadcrumbs.push(fullBreadcrumb);

    // 保持面包屑数量在限制内
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.maxBreadcrumbs);
    }
  }

  /**
   * 生成错误指纹
   */
  private generateFingerprint(message: string, stack?: string): string {
    // 简化消息，移除动态内容
    const normalizedMessage = message
      .replace(/\d+/g, 'N') // 替换数字
      .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, 'UUID') // 替换UUID
      .replace(/https?:\/\/[^\s]+/g, 'URL'); // 替换URL

    // 使用堆栈的前几行生成指纹
    let stackFingerprint = '';
    if (stack) {
      const stackLines = stack.split('\n').slice(0, 3);
      stackFingerprint = stackLines.join('|');
    }

    const combined = `${normalizedMessage}|${stackFingerprint}`;

    // 简单哈希函数
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }

    return Math.abs(hash).toString(36);
  }

  /**
   * 计算错误严重程度
   */
  private calculateSeverity(errorData: {
    message: string;
    category: ErrorCategory;
    context?: Record<string, any>;
  }): ErrorSeverity {
    // 基于类别的默认严重程度
    const categoryBaseSeverity: Record<ErrorCategory, ErrorSeverity> = {
      security: 'critical',
      business: 'high',
      api: 'medium',
      network: 'medium',
      javascript: 'low',
      validation: 'low',
      performance: 'low',
    };

    let severity = categoryBaseSeverity[errorData.category] || 'low';

    // 基于消息内容调整严重程度
    const criticalKeywords = ['security', 'unauthorized', 'forbidden', 'payment', 'data loss'];
    const highKeywords = ['timeout', 'connection', 'server error', 'database'];

    const message = errorData.message.toLowerCase();

    if (criticalKeywords.some(keyword => message.includes(keyword))) {
      severity = 'critical';
    } else if (highKeywords.some(keyword => message.includes(keyword))) {
      severity = severity === 'low' ? 'medium' : severity;
    }

    return severity;
  }

  /**
   * 获取环境信息
   */
  private getEnvironmentInfo() {
    if (typeof window === 'undefined') {
      return {};
    }

    const userAgent = navigator.userAgent;
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    // 简单的浏览器检测
    let browser = 'unknown';
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';

    // 简单的操作系统检测
    let os = 'unknown';
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS')) os = 'iOS';

    return {
      browser,
      userAgent,
      os,
      viewport,
    };
  }

  /**
   * 获取错误报告
   */
  getErrorReport() {
    return {
      summary: this.generateErrorSummary(),
      recentErrors: Array.from(this.errors.values()).slice(-20),
      topPatterns: this.getTopErrorPatterns(),
      alerts: this.alerts.slice(-10),
      trends: this.generateTrendAnalysis(),
    };
  }

  /**
   * 生成错误摘要
   */
  private generateErrorSummary() {
    const patterns = Array.from(this.patterns.values());

    return {
      totalErrors: Array.from(this.errors.values()).length,
      uniqueErrors: patterns.length,
      criticalErrors: patterns.filter(p => p.severity === 'critical').length,
      affectedUsers: new Set(
        Array.from(this.errors.values())
          .map(e => e.context.userId)
          .filter(Boolean),
      ).size,
      errorRate: this.calculateErrorRate(),
      topCategories: this.getTopCategories(),
    };
  }

  /**
   * 获取顶级错误模式
   */
  private getTopErrorPatterns(limit = 10) {
    return Array.from(this.patterns.values())
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, limit);
  }

  /**
   * 计算错误率
   */
  private calculateErrorRate(): number {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const recentErrors = Array.from(this.errors.values())
      .filter(error => error.timestamp > now - oneHour);

    // 这里需要总请求数来计算真实的错误率
    // 暂时返回错误数量
    return recentErrors.length;
  }

  /**
   * 获取顶级错误类别
   */
  private getTopCategories() {
    const categoryCounts: Record<ErrorCategory, number> = {
      javascript: 0,
      network: 0,
      api: 0,
      validation: 0,
      business: 0,
      security: 0,
      performance: 0,
    };

    Array.from(this.patterns.values()).forEach(pattern => {
      categoryCounts[pattern.category] += pattern.occurrences;
    });

    return Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
  }

  /**
   * 生成趋势分析
   */
  private generateTrendAnalysis() {
    const now = Date.now();
    const intervals = [
      { name: '1h', duration: 60 * 60 * 1000 },
      { name: '6h', duration: 6 * 60 * 60 * 1000 },
      { name: '24h', duration: 24 * 60 * 60 * 1000 },
    ];

    return intervals.map(interval => {
      const errors = Array.from(this.errors.values())
        .filter(error => error.timestamp > now - interval.duration);

      return {
        interval: interval.name,
        errorCount: errors.length,
        uniqueErrors: new Set(errors.map(e => e.fingerprint)).size,
        criticalErrors: errors.filter(e => e.severity === 'critical').length,
      };
    });
  }

  /**
   * 开始定期分析
   */
  private startPeriodicAnalysis() {
    setInterval(() => {
      this.analyzeErrorPatterns();
      this.cleanupOldData();
    }, 5 * 60 * 1000); // 每5分钟分析一次
  }

  /**
   * 分析错误模式
   */
  private analyzeErrorPatterns() {
    // 更新所有模式的趋势
    this.patterns.forEach(pattern => {
      pattern.trend = this.calculateTrend(pattern);
    });

    // 检查是否有回归错误
    this.checkForRegressions();
  }

  /**
   * 检查回归错误
   */
  private checkForRegressions() {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    this.patterns.forEach(pattern => {
      if (pattern.resolution?.status === 'resolved') {
        const recentOccurrences = Array.from(this.errors.values())
          .filter(error =>
            error.fingerprint === pattern.fingerprint &&
            error.timestamp > (pattern.resolution.resolvedAt || 0) &&
            error.timestamp > now - oneDay,
          );

        if (recentOccurrences.length > 0) {
          this.createAlert({
            errorId: recentOccurrences[0].id,
            type: 'regression',
            message: `Regression detected: ${pattern.message}`,
            severity: pattern.severity,
            metadata: {
              patternId: pattern.id,
              resolvedAt: pattern.resolution.resolvedAt,
              newOccurrences: recentOccurrences.length,
            },
          });

          // 重新打开错误
          pattern.resolution = undefined;
        }
      }
    });
  }

  /**
   * 清理旧数据
   */
  private cleanupOldData() {
    const now = Date.now();
    const retentionPeriod = 7 * 24 * 60 * 60 * 1000; // 7天

    // 清理旧错误
    Array.from(this.errors.entries()).forEach(([id, error]) => {
      if (error.timestamp < now - retentionPeriod) {
        this.errors.delete(id);
      }
    });

    // 清理旧面包屑
    this.breadcrumbs = this.breadcrumbs.filter(
      breadcrumb => breadcrumb.timestamp > now - retentionPeriod,
    );

    // 清理旧告警
    this.alerts = this.alerts.filter(
      alert => alert.timestamp > now - retentionPeriod,
    );
  }

  /**
   * 发送错误到后端
   */
  private async sendErrorToBackend(errorEvent: ErrorEvent) {
    try {
      await fetch('/api/monitoring/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorEvent),
      });
    } catch (error: any) {
      console.warn('Failed to send error to backend:', error);
    }
  }

  /**
   * 发送告警通知
   */
  private async sendAlertNotification(alert: ErrorAlert) {
    try {
      await fetch('/api/monitoring/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alert),
      });
    } catch (error: any) {
      console.warn('Failed to send alert notification:', error);
    }
  }

  /**
   * 获取用户ID
   */
  private getUserId(): string | undefined {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('user_id') || undefined;
    }
    return undefined;
  }

  /**
   * 获取会话ID
   */
  private getSessionId(): string | undefined {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('session_id') || undefined;
    }
    return undefined;
  }

  /**
   * 标记错误为已解决
   */
  resolveError(fingerprint: string, assignee?: string, notes?: string) {
    const pattern = this.patterns.get(fingerprint);
    if (pattern) {
      pattern.resolution = {
        status: 'resolved',
        assignee,
        notes,
        resolvedAt: Date.now(),
      };
    }
  }

  /**
   * 忽略错误
   */
  ignoreError(fingerprint: string, reason?: string) {
    const pattern = this.patterns.get(fingerprint);
    if (pattern) {
      pattern.resolution = {
        status: 'ignored',
        notes: reason,
        resolvedAt: Date.now(),
      };
    }
  }

  /**
   * 启用/禁用错误追踪
   */
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  /**
   * 清理资源
   */
  destroy() {
    this.errors.clear();
    this.patterns.clear();
    this.breadcrumbs = [];
    this.alerts = [];
  }
}

// 导出单例实例
export const errorTracker = ErrorTracker.getInstance();

// 导出类型
export type {
  ErrorEvent,
  ErrorPattern,
  ErrorAlert,
  Breadcrumb,
  ErrorSeverity,
  ErrorStatus,
  ErrorCategory,
};
