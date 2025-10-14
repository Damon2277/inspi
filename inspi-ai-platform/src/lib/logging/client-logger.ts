'use client';

/**
 * 客户端安全日志工具
 * 只在客户端环境中使用，避免Node.js模块冲突
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  data?: any
  timestamp: string
  url?: string
  userAgent?: string
}

class ClientLogger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private logs: LogEntry[] = [];
  private maxLogs = 100;

  private createLogEntry(level: LogLevel, message: string, data?: any): LogEntry {
    return {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
    };
  }

  private addLog(entry: LogEntry) {
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  debug(message: string, data?: any) {
    const entry = this.createLogEntry('debug', message, data);
    this.addLog(entry);

    if (this.isDevelopment) {
      console.debug(`[DEBUG] ${message}`, data);
    }
  }

  info(message: string, data?: any) {
    const entry = this.createLogEntry('info', message, data);
    this.addLog(entry);

    console.info(`[INFO] ${message}`, data);
  }

  warn(message: string, data?: any) {
    const entry = this.createLogEntry('warn', message, data);
    this.addLog(entry);

    console.warn(`[WARN] ${message}`, data);
  }

  error(message: string, error?: Error | any, data?: any) {
    const entry = this.createLogEntry('error', message, { error: error?.message || error, data });
    this.addLog(entry);

    console.error(`[ERROR] ${message}`, error, data);

    // 在生产环境中，可以发送到错误监控服务
    if (!this.isDevelopment && typeof window !== 'undefined') {
      this.reportError(entry);
    }
  }

  private reportError(entry: LogEntry) {
    // 这里可以集成错误监控服务，如 Sentry
    // 目前只是存储到本地
    try {
      const errorReports = JSON.parse(localStorage.getItem('error_reports') || '[]');
      errorReports.push(entry);

      // 只保留最近的50个错误报告
      if (errorReports.length > 50) {
        errorReports.splice(0, errorReports.length - 50);
      }

      localStorage.setItem('error_reports', JSON.stringify(errorReports));
    } catch (e) {
      // 忽略localStorage错误
    }
  }

  getLogs(level?: LogLevel): LogEntry[] {
    if (level) {
      return this.logs.filter(log => log.level === level);
    }
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// 创建全局客户端日志实例
export const clientLogger = new ClientLogger();

// 便捷的导出函数
export const log = {
  debug: clientLogger.debug.bind(clientLogger),
  info: clientLogger.info.bind(clientLogger),
  warn: clientLogger.warn.bind(clientLogger),
  error: clientLogger.error.bind(clientLogger),
  getLogs: clientLogger.getLogs.bind(clientLogger),
  clearLogs: clientLogger.clearLogs.bind(clientLogger),
  exportLogs: clientLogger.exportLogs.bind(clientLogger),
};

export default clientLogger;
