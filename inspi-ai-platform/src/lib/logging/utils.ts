/**
 * 日志工具函数
 */
import { NextRequest } from 'next/server';

import { LOG_TAGS } from './config';
import type { Logger, LogContext } from './logger';

/**
 * 从请求中提取日志上下文
 */
export const extractRequestContext = (request: NextRequest): LogContext => {
  const url = request.url;
  const method = request.method;
  const userAgent = request.headers.get('user-agent') || undefined;
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
             request.headers.get('x-real-ip') ||
             'unknown';
  const traceId = request.headers.get('x-trace-id') || undefined;
  const userId = request.headers.get('x-user-id') || undefined;

  return {
    traceId,
    userId,
    context: {
      url,
      method,
      userAgent,
      ip,
    },
  };
};

/**
 * 性能计时器
 */
export class PerformanceTimer {
  private startTime: number;
  private startCpuUsage: NodeJS.CpuUsage;
  private startMemoryUsage: NodeJS.MemoryUsage;
  private logger: Logger;
  private operation: string;
  private context?: LogContext;

  private getDefaultLogger(): Logger {
    // 延迟导入避免循环依赖
    const { logger } = require('./logger');
    return logger;
  }

  constructor(operation: string, loggerInstance?: Logger, context?: LogContext) {
    this.operation = operation;
    this.logger = loggerInstance || this.getDefaultLogger();
    this.context = context;
    this.startTime = Date.now();
    this.startCpuUsage = process.cpuUsage();
    this.startMemoryUsage = process.memoryUsage();
  }

  /**
   * 结束计时并记录性能日志
   */
  end(additionalContext?: LogContext): number {
    const duration = Date.now() - this.startTime;
    const cpuUsage = process.cpuUsage(this.startCpuUsage);
    const memoryUsage = process.memoryUsage();

    const performanceContext: LogContext = {
      ...this.context,
      ...additionalContext,
      performance: {
        duration,
        memory: memoryUsage.heapUsed - this.startMemoryUsage.heapUsed,
        cpu: cpuUsage.user,
      },
    };

    this.logger.performance(`${this.operation} completed`, duration, performanceContext);

    return duration;
  }

  /**
   * 记录中间检查点
   */
  checkpoint(name: string, additionalContext?: LogContext): number {
    const duration = Date.now() - this.startTime;

    this.logger.debug(`${this.operation} checkpoint: ${name}`, {
      ...this.context,
      ...additionalContext,
      performance: { duration },
    });

    return duration;
  }
}

/**
 * 创建性能计时器
 */
export const createTimer = (operation: string, loggerInstance?: Logger, context?: LogContext): PerformanceTimer => {
  return new PerformanceTimer(operation, loggerInstance, context);
};

/**
 * 异步操作性能装饰器
 */
export const withPerformanceLogging = <T extends any[], R>(
  operation: string,
  fn: (...args: T) => Promise<R>,
  logger?: Logger,
  context?: LogContext,
) => {
  return async (...args: T): Promise<R> => {
    const timer = createTimer(operation, logger, context);

    try {
      const result = await fn(...args);
      timer.end({ metadata: { success: true } });
      return result;
    } catch (error) {
      timer.end({
        metadata: { success: false },
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : undefined,
      });
      throw error;
    }
  };
};

/**
 * 同步操作性能装饰器
 */
export const withSyncPerformanceLogging = <T extends any[], R>(
  operation: string,
  fn: (...args: T) => R,
  logger?: Logger,
  context?: LogContext,
) => {
  return (...args: T): R => {
    const timer = createTimer(operation, logger, context);

    try {
      const result = fn(...args);
      timer.end({ metadata: { success: true } });
      return result;
    } catch (error) {
      timer.end({
        metadata: { success: false },
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : undefined,
      });
      throw error;
    }
  };
};

/**
 * 错误日志辅助函数
 */
export const logError = (
  error: Error,
  message: string,
  context?: LogContext,
  loggerInstance?: Logger,
): void => {
  if (loggerInstance) {
    loggerInstance.error(message, error, context);
  } else {
    // 延迟导入避免循环依赖
    import('./logger').then(({ logger }) => {
      logger.error(message, error, context);
    });
  }
};

/**
 * API请求日志辅助函数
 */
export const logApiRequest = (
  request: NextRequest,
  response: { status: number },
  duration: number,
  loggerInstance?: Logger,
): void => {
  const requestContext = extractRequestContext(request);

  if (loggerInstance) {
    loggerInstance.access(
      request.method,
      request.url,
      response.status,
      duration,
      requestContext,
    );
  } else {
    import('./logger').then(({ logger }) => {
      logger.access(
        request.method,
        request.url,
        response.status,
        duration,
        requestContext,
      );
    });
  }
};

/**
 * 数据库操作日志辅助函数
 */
export const logDatabaseOperation = (
  operation: string,
  collection: string,
  duration: number,
  success: boolean,
  context?: LogContext,
  loggerInstance?: Logger,
): void => {
  const dbContext: LogContext = {
    ...context,
    tag: LOG_TAGS.DATABASE,
    metadata: {
      operation,
      collection,
      success,
      ...context?.metadata,
    },
    performance: {
      duration,
      ...context?.performance,
    },
  };

  if (loggerInstance) {
    if (success) {
      loggerInstance.database(`Database ${operation} on ${collection} completed`, dbContext);
    } else {
      loggerInstance.error(`Database ${operation} on ${collection} failed`, undefined, dbContext);
    }
  } else {
    import('./logger').then(({ logger }) => {
      if (success) {
        logger.database(`Database ${operation} on ${collection} completed`, dbContext);
      } else {
        logger.error(`Database ${operation} on ${collection} failed`, undefined, dbContext);
      }
    });
  }
};

/**
 * 缓存操作日志辅助函数
 */
export const logCacheOperation = (
  operation: 'get' | 'set' | 'del' | 'clear',
  key: string,
  hit: boolean = false,
  duration?: number,
  context?: LogContext,
  logger?: Logger,
): void => {
  const cacheContext: LogContext = {
    ...context,
    tag: LOG_TAGS.CACHE,
    metadata: {
      operation,
      key,
      hit,
      ...context?.metadata,
    },
    performance: duration ? {
      duration,
      ...context?.performance,
    } : context?.performance,
  };

  (logger || logger).cache(`Cache ${operation} for key: ${key} (${hit ? 'HIT' : 'MISS'})`, cacheContext);
};

/**
 * 用户操作日志辅助函数
 */
export const logUserAction = (
  userId: string,
  action: string,
  resource?: string,
  context?: LogContext,
  loggerInstance?: Logger,
): void => {
  const userContext: LogContext = {
    ...context,
    userId,
    tag: LOG_TAGS.USER,
    metadata: {
      action,
      resource,
      ...context?.metadata,
    },
  };

  if (loggerInstance) {
    loggerInstance.user(`User action: ${action}${resource ? ` on ${resource}` : ''}`, userId, userContext);
  } else {
    import('./logger').then(({ logger }) => {
      logger.user(`User action: ${action}${resource ? ` on ${resource}` : ''}`, userId, userContext);
    });
  }
};

/**
 * 安全事件日志辅助函数
 */
export const logSecurityEvent = (
  event: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  context?: LogContext,
  logger?: Logger,
): void => {
  const securityContext: LogContext = {
    ...context,
    tag: LOG_TAGS.SECURITY,
    metadata: {
      event,
      severity,
      ...context?.metadata,
    },
  };

  (logger || logger).security(`Security event: ${event} (${severity})`, securityContext);
};

/**
 * AI操作日志辅助函数
 */
export const logAIOperation = (
  operation: string,
  model: string,
  tokensUsed?: number,
  duration?: number,
  success: boolean = true,
  context?: LogContext,
  loggerInstance?: Logger,
): void => {
  const aiContext: LogContext = {
    ...context,
    tag: LOG_TAGS.AI,
    metadata: {
      operation,
      model,
      tokensUsed,
      success,
      ...context?.metadata,
    },
    performance: duration ? {
      duration,
      ...context?.performance,
    } : context?.performance,
  };

  if (loggerInstance) {
    loggerInstance.ai(`AI ${operation} using ${model}${tokensUsed ? ` (${tokensUsed} tokens)` : ''}`, aiContext);
  } else {
    import('./logger').then(({ logger }) => {
      logger.ai(`AI ${operation} using ${model}${tokensUsed ? ` (${tokensUsed} tokens)` : ''}`, aiContext);
    });
  }
};

/**
 * 邮件操作日志辅助函数
 */
export const logEmailOperation = (
  operation: 'send' | 'receive' | 'bounce' | 'delivery',
  recipient: string,
  subject: string,
  success: boolean = true,
  context?: LogContext,
  logger?: Logger,
): void => {
  const emailContext: LogContext = {
    ...context,
    tag: LOG_TAGS.EMAIL,
    metadata: {
      operation,
      recipient: recipient.replace(/(.{3}).*(@.*)/, '$1***$2'), // 脱敏处理
      subject,
      success,
      ...context?.metadata,
    },
  };

  (logger || logger).email(`Email ${operation} to ${recipient} - ${subject}`, emailContext);
};

/**
 * 批量日志记录
 */
export const logBatch = (
  logs: Array<{
    level: 'error' | 'warn' | 'info' | 'debug';
    message: string;
    context?: LogContext;
    error?: Error;
  }>,
  logger?: Logger,
): void => {
  const loggerInstance = logger || logger;

  logs.forEach(({ level, message, context, error }) => {
    switch (level) {
      case 'error':
        loggerInstance.error(message, error, context);
        break;
      case 'warn':
        loggerInstance.warn(message, context);
        break;
      case 'info':
        loggerInstance.info(message, context);
        break;
      case 'debug':
        loggerInstance.debug(message, context);
        break;
    }
  });
};

/**
 * 条件日志记录
 */
export const logIf = (
  condition: boolean,
  level: 'error' | 'warn' | 'info' | 'debug',
  message: string,
  context?: LogContext,
  error?: Error,
  logger?: Logger,
): void => {
  if (!condition) return;

  const loggerInstance = logger || logger;

  switch (level) {
    case 'error':
      loggerInstance.error(message, error, context);
      break;
    case 'warn':
      loggerInstance.warn(message, context);
      break;
    case 'info':
      loggerInstance.info(message, context);
      break;
    case 'debug':
      loggerInstance.debug(message, context);
      break;
  }
};

/**
 * 日志采样器（用于高频日志）
 */
export class LogSampler {
  private counters = new Map<string, number>();
  private sampleRate: number;

  constructor(sampleRate: number = 0.1) {
    this.sampleRate = sampleRate;
  }

  /**
   * 判断是否应该记录日志
   */
  shouldLog(key: string): boolean {
    const count = this.counters.get(key) || 0;
    this.counters.set(key, count + 1);

    return Math.random() < this.sampleRate || count % Math.ceil(1 / this.sampleRate) === 0;
  }

  /**
   * 重置计数器
   */
  reset(): void {
    this.counters.clear();
  }
}

/**
 * 创建日志采样器
 */
export const createLogSampler = (sampleRate: number = 0.1): LogSampler => {
  return new LogSampler(sampleRate);
};
