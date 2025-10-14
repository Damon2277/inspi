/**
 * 结构化日志管理系统
 * 提供统一的日志记录、聚合和分析功能
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  tags?: string[];
  source: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  stack?: string;
}

interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  batchSize: number;
  flushInterval: number;
  maxRetries: number;
  retryDelay: number;
}

/**
 * 日志管理器
 */
export class Logger {
  private static instance: Logger;
  private config: LoggerConfig;
  private logs: LogEntry[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private retryQueue: LogEntry[] = [];

  private readonly levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    fatal: 4,
  };

  private constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: 'info',
      enableConsole: true,
      enableRemote: true,
      batchSize: 20,
      flushInterval: 10000, // 10秒
      maxRetries: 3,
      retryDelay: 1000,
      ...config,
    };

    this.startPeriodicFlush();
    this.setupErrorHandlers();
  }

  static getInstance(config?: Partial<LoggerConfig>): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(config);
    }
    return Logger.instance;
  }

  /**
   * 设置错误处理器
   */
  private setupErrorHandlers() {
    if (typeof window !== 'undefined') {
      // 捕获未处理的错误
      window.addEventListener('error', (event) => {
        this.error('Unhandled JavaScript Error', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack,
        });
      });

      // 捕获未处理的Promise拒绝
      window.addEventListener('unhandledrejection', (event) => {
        this.error('Unhandled Promise Rejection', {
          reason: event.reason?.toString(),
          stack: event.reason?.stack,
        });
      });
    }

    // Node.js环境的错误处理
    if (typeof process !== 'undefined') {
      process.on('uncaughtException', (error) => {
        this.fatal('Uncaught Exception', {
          message: error.message,
          stack: error.stack,
        });
      });

      process.on('unhandledRejection', (reason, promise) => {
        this.error('Unhandled Promise Rejection', {
          reason: reason?.toString(),
          promise: promise.toString(),
        });
      });
    }
  }

  /**
   * 记录调试日志
   */
  debug(message: string, context?: Record<string, any>, tags?: string[]) {
    this.log('debug', message, context, tags);
  }

  /**
   * 记录信息日志
   */
  info(message: string, context?: Record<string, any>, tags?: string[]) {
    this.log('info', message, context, tags);
  }

  /**
   * 记录警告日志
   */
  warn(message: string, context?: Record<string, any>, tags?: string[]) {
    this.log('warn', message, context, tags);
  }

  /**
   * 记录错误日志
   */
  error(message: string, context?: Record<string, any>, tags?: string[]) {
    this.log('error', message, context, tags);
  }

  /**
   * 记录致命错误日志
   */
  fatal(message: string, context?: Record<string, any>, tags?: string[]) {
    this.log('fatal', message, context, tags);
  }

  /**
   * 核心日志记录方法
   */
  private log(level: LogLevel, message: string, context?: Record<string, any>, tags?: string[]) {
    // 检查日志级别
    if (this.levelPriority[level] < this.levelPriority[this.config.level]) {
      return;
    }

    const logEntry: LogEntry = {
      id: this.generateLogId(),
      timestamp: Date.now(),
      level,
      message,
      context: this.sanitizeContext(context),
      tags,
      source: this.getSource(),
      userId: this.getUserId(),
      sessionId: this.getSessionId(),
      requestId: this.getRequestId(),
      stack: level === 'error' || level === 'fatal' ? this.getStackTrace() : undefined,
    };

    // 控制台输出
    if (this.config.enableConsole) {
      this.logToConsole(logEntry);
    }

    // 添加到日志队列
    this.logs.push(logEntry);

    // 立即发送高优先级日志
    if (level === 'error' || level === 'fatal') {
      this.flushLogs();
    } else if (this.logs.length >= this.config.batchSize) {
      this.flushLogs();
    }
  }

  /**
   * 控制台输出
   */
  private logToConsole(entry: LogEntry) {
    const timestamp = new Date(entry.timestamp).toISOString();
    const prefix = `[${timestamp}] [${entry.level.toUpperCase()}] [${entry.source}]`;
    const message = `${prefix} ${entry.message}`;

    switch (entry.level) {
      case 'debug':
        console.debug(message, entry.context);
        break;
      case 'info':
        console.info(message, entry.context);
        break;
      case 'warn':
        console.warn(message, entry.context);
        break;
      case 'error':
      case 'fatal':
        console.error(message, entry.context);
        if (entry.stack) {
          console.error(entry.stack);
        }
        break;
    }
  }

  /**
   * 刷新日志到远程服务器
   */
  private async flushLogs() {
    if (!this.config.enableRemote || this.logs.length === 0) {
      return;
    }

    const logsToSend = [...this.logs];
    this.logs = [];

    try {
      await this.sendLogsToServer(logsToSend);
    } catch (error) {
      console.warn('Failed to send logs to server:', error);
      // 将失败的日志加入重试队列
      this.retryQueue.push(...logsToSend);
      this.retryFailedLogs();
    }
  }

  /**
   * 发送日志到服务器
   */
  private async sendLogsToServer(logs: LogEntry[], retryCount = 0): Promise<void> {
    const response = await fetch('/api/logging/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        logs,
        metadata: {
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
          url: typeof window !== 'undefined' ? window.location.href : '',
          timestamp: Date.now(),
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  /**
   * 重试失败的日志
   */
  private async retryFailedLogs() {
    if (this.retryQueue.length === 0) return;

    const logsToRetry = [...this.retryQueue];
    this.retryQueue = [];

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * attempt));
        await this.sendLogsToServer(logsToRetry, attempt);
        return; // 成功发送，退出重试循环
      } catch (error) {
        if (attempt === this.config.maxRetries) {
          console.error('Failed to send logs after maximum retries:', error);
          // 可以选择将日志保存到本地存储
          this.saveLogsToLocalStorage(logsToRetry);
        }
      }
    }
  }

  /**
   * 保存日志到本地存储
   */
  private saveLogsToLocalStorage(logs: LogEntry[]) {
    if (typeof localStorage === 'undefined') return;

    try {
      const existingLogs = localStorage.getItem('failed_logs');
      const allLogs = existingLogs ? JSON.parse(existingLogs) : [];
      allLogs.push(...logs);

      // 限制本地存储的日志数量
      const maxLocalLogs = 1000;
      if (allLogs.length > maxLocalLogs) {
        allLogs.splice(0, allLogs.length - maxLocalLogs);
      }

      localStorage.setItem('failed_logs', JSON.stringify(allLogs));
    } catch (error) {
      console.warn('Failed to save logs to localStorage:', error);
    }
  }

  /**
   * 从本地存储恢复日志
   */
  private recoverLogsFromLocalStorage() {
    if (typeof localStorage === 'undefined') return;

    try {
      const savedLogs = localStorage.getItem('failed_logs');
      if (savedLogs) {
        const logs: LogEntry[] = JSON.parse(savedLogs);
        this.retryQueue.push(...logs);
        localStorage.removeItem('failed_logs');

        // 尝试重新发送
        this.retryFailedLogs();
      }
    } catch (error) {
      console.warn('Failed to recover logs from localStorage:', error);
    }
  }

  /**
   * 开始定期刷新
   */
  private startPeriodicFlush() {
    this.flushTimer = setInterval(() => {
      this.flushLogs();
    }, this.config.flushInterval);

    // 恢复本地存储的日志
    this.recoverLogsFromLocalStorage();
  }

  /**
   * 生成日志ID
   */
  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取调用源
   */
  private getSource(): string {
    const stack = new Error().stack;
    if (!stack) return 'unknown';

    const lines = stack.split('\n');
    // 跳过Logger内部的调用栈
    for (let i = 3; i < lines.length; i++) {
      const line = lines[i];
      if (line && !line.includes('Logger') && !line.includes('logger.ts')) {
        const match = line.match(/at\s+(.+?)\s+\(/);
        if (match) {
          return match[1];
        }
      }
    }
    return 'unknown';
  }

  /**
   * 获取堆栈跟踪
   */
  private getStackTrace(): string {
    const stack = new Error().stack;
    if (!stack) return '';

    const lines = stack.split('\n');
    // 移除Logger内部的调用栈
    return lines.slice(4).join('\n');
  }

  /**
   * 清理上下文数据
   */
  private sanitizeContext(context?: Record<string, any>): Record<string, any> | undefined {
    if (!context) return undefined;

    const sanitized: Record<string, any> = {};

    Object.entries(context).forEach(([key, value]) => {
      // 移除敏感信息
      if (this.isSensitiveKey(key)) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        // 递归处理嵌套对象
        sanitized[key] = this.sanitizeContext(value);
      } else {
        sanitized[key] = value;
      }
    });

    return sanitized;
  }

  /**
   * 检查是否为敏感字段
   */
  private isSensitiveKey(key: string): boolean {
    const sensitiveKeys = [
      'password', 'token', 'secret', 'key', 'auth', 'credential',
      'ssn', 'social', 'credit', 'card', 'cvv', 'pin',
    ];

    return sensitiveKeys.some(sensitive =>
      key.toLowerCase().includes(sensitive),
    );
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
   * 获取请求ID
   */
  private getRequestId(): string | undefined {
    // 在实际应用中，这可能来自HTTP头部或上下文
    return undefined;
  }

  /**
   * 创建子日志器
   */
  child(context: Record<string, any>, tags?: string[]): ChildLogger {
    return new ChildLogger(this, context, tags);
  }

  /**
   * 搜索日志
   */
  searchLogs(query: LogSearchQuery): LogEntry[] {
    return this.logs.filter(log => this.matchesQuery(log, query));
  }

  /**
   * 检查日志是否匹配查询
   */
  private matchesQuery(log: LogEntry, query: LogSearchQuery): boolean {
    // 级别过滤
    if (query.level && log.level !== query.level) {
      return false;
    }

    // 时间范围过滤
    if (query.startTime && log.timestamp < query.startTime) {
      return false;
    }
    if (query.endTime && log.timestamp > query.endTime) {
      return false;
    }

    // 消息搜索
    if (query.message && !log.message.toLowerCase().includes(query.message.toLowerCase())) {
      return false;
    }

    // 标签过滤
    if (query.tags && query.tags.length > 0) {
      if (!log.tags || !query.tags.every(tag => log.tags!.includes(tag))) {
        return false;
      }
    }

    // 用户ID过滤
    if (query.userId && log.userId !== query.userId) {
      return false;
    }

    return true;
  }

  /**
   * 获取日志统计
   */
  getLogStats(): LogStats {
    const stats: LogStats = {
      total: this.logs.length,
      byLevel: {
        debug: 0,
        info: 0,
        warn: 0,
        error: 0,
        fatal: 0,
      },
      recentErrors: [],
      topSources: {},
    };

    this.logs.forEach(log => {
      stats.byLevel[log.level]++;

      if (log.level === 'error' || log.level === 'fatal') {
        stats.recentErrors.push(log);
      }

      stats.topSources[log.source] = (stats.topSources[log.source] || 0) + 1;
    });

    // 只保留最近的错误
    stats.recentErrors = stats.recentErrors.slice(-20);

    return stats;
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<LoggerConfig>) {
    this.config = { ...this.config, ...config };
  }

  /**
   * 清理资源
   */
  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flushLogs();
  }
}

/**
 * 子日志器
 */
class ChildLogger {
  constructor(
    private parent: Logger,
    private context: Record<string, any>,
    private tags?: string[],
  ) {}

  debug(message: string, context?: Record<string, any>, tags?: string[]) {
    this.parent.debug(message, { ...this.context, ...context }, [...(this.tags || []), ...(tags || [])]);
  }

  info(message: string, context?: Record<string, any>, tags?: string[]) {
    this.parent.info(message, { ...this.context, ...context }, [...(this.tags || []), ...(tags || [])]);
  }

  warn(message: string, context?: Record<string, any>, tags?: string[]) {
    this.parent.warn(message, { ...this.context, ...context }, [...(this.tags || []), ...(tags || [])]);
  }

  error(message: string, context?: Record<string, any>, tags?: string[]) {
    this.parent.error(message, { ...this.context, ...context }, [...(this.tags || []), ...(tags || [])]);
  }

  fatal(message: string, context?: Record<string, any>, tags?: string[]) {
    this.parent.fatal(message, { ...this.context, ...context }, [...(this.tags || []), ...(tags || [])]);
  }
}

interface LogSearchQuery {
  level?: LogLevel;
  startTime?: number;
  endTime?: number;
  message?: string;
  tags?: string[];
  userId?: string;
}

interface LogStats {
  total: number;
  byLevel: Record<LogLevel, number>;
  recentErrors: LogEntry[];
  topSources: Record<string, number>;
}

// 导出默认日志器实例
export const logger = Logger.getInstance();

// 导出类型
export type { LogLevel, LogEntry, LoggerConfig, LogSearchQuery, LogStats };
