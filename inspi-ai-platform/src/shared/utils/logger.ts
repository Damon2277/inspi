/**
 * 日志工具
 * 提供统一的日志记录功能，优化内存使用
 */

import { env } from '@/shared/config/environment';

export interface LogContext {
  [key: string]: any;
}

// 内存优化：使用对象池减少频繁创建对象
class LogEntryPool {
  private pool: any[] = [];
  private maxSize = 10;

  get(): any {
    return this.pool.pop() || {};
  }

  release(entry: any): void {
    if (this.pool.length < this.maxSize) {
      // 清空对象属性
      Object.keys(entry).forEach(key => delete entry[key]);
      this.pool.push(entry);
    }
  }
}

const logEntryPool = new LogEntryPool();

export class Logger {
  private context: LogContext = {};
  private static logLevels = ['error', 'warn', 'info', 'debug'];
  private static currentLevelIndex: number;

  constructor(defaultContext: LogContext = {}) {
    this.context = defaultContext;
    // 缓存日志级别索引
    if (Logger.currentLevelIndex === undefined) {
      Logger.currentLevelIndex = Logger.logLevels.indexOf(env.LOG?.LEVEL || 'info');
    }
  }

  private formatMessage(level: string, message: string, context?: LogContext): string {
    // 使用对象池减少内存分配
    const logEntry = logEntryPool.get();

    logEntry.timestamp = new Date().toISOString();
    logEntry.level = level;
    logEntry.message = message;

    // 合并上下文，避免创建新对象
    if (this.context) {
      Object.assign(logEntry, this.context);
    }
    if (context) {
      Object.assign(logEntry, context);
    }

    const result = JSON.stringify(logEntry);

    // 释放对象回池中
    logEntryPool.release(logEntry);

    return result;
  }

  private shouldLog(level: string): boolean {
    // 使用缓存的索引，避免重复查找
    const messageLevelIndex = Logger.logLevels.indexOf(level);
    return messageLevelIndex <= Logger.currentLevelIndex;
  }

  error(message: string, context?: LogContext): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, context));
    }
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  child(context: LogContext): Logger {
    // 优化：直接合并上下文，避免展开操作符
    const childContext = Object.assign({}, this.context, context);
    return new Logger(childContext);
  }
}

// 默认logger实例
export const logger = new Logger({
  service: 'inspi-ai-platform',
  environment: env.NODE_ENV,
});
