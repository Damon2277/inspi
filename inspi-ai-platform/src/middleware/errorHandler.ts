/**
 * 全局错误处理中间件
 */
import { NextRequest, NextResponse } from 'next/server';
import { CustomError } from '@/lib/errors/CustomError';
import { ErrorCode, ErrorContext } from '@/lib/errors/types';
import { createErrorResponse, handleUnknownError } from '@/lib/errors/responses';
import { logger, createTracedLogger } from '@/lib/logging/logger';
import { extractRequestContext } from '@/lib/logging/utils';

/**
 * 错误处理中间件配置
 */
interface ErrorHandlerConfig {
  enabled: boolean;
  logErrors: boolean;
  includeStackTrace: boolean;
  sanitizeErrors: boolean;
  rateLimitErrors: boolean;
  maxErrorsPerMinute: number;
}

/**
 * 默认配置
 */
const defaultConfig: ErrorHandlerConfig = {
  enabled: true,
  logErrors: true,
  includeStackTrace: process.env.NODE_ENV === 'development',
  sanitizeErrors: process.env.NODE_ENV === 'production',
  rateLimitErrors: true,
  maxErrorsPerMinute: 60
};

/**
 * 获取配置
 */
const getConfig = (): ErrorHandlerConfig => {
  const env = process.env.NODE_ENV || 'development';
  
  if (env === 'test') {
    return {
      ...defaultConfig,
      enabled: false,
      logErrors: false
    };
  }
  
  if (env === 'production') {
    return {
      ...defaultConfig,
      includeStackTrace: false,
      sanitizeErrors: true
    };
  }
  
  return defaultConfig;
};

/**
 * 错误频率限制器
 */
class ErrorRateLimiter {
  private errorCounts = new Map<string, number[]>();
  private readonly windowMs = 60 * 1000; // 1分钟窗口
  
  /**
   * 检查是否超过错误频率限制
   */
  isRateLimited(identifier: string, maxErrors: number): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // 获取当前错误计数
    const errors = this.errorCounts.get(identifier) || [];
    
    // 清理过期的错误记录
    const recentErrors = errors.filter(timestamp => timestamp > windowStart);
    
    // 更新错误计数
    this.errorCounts.set(identifier, recentErrors);
    
    // 检查是否超过限制
    return recentErrors.length >= maxErrors;
  }
  
  /**
   * 记录错误
   */
  recordError(identifier: string): void {
    const now = Date.now();
    const errors = this.errorCounts.get(identifier) || [];
    errors.push(now);
    this.errorCounts.set(identifier, errors);
  }
  
  /**
   * 清理过期记录
   */
  cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    for (const [identifier, errors] of this.errorCounts.entries()) {
      const recentErrors = errors.filter(timestamp => timestamp > windowStart);
      if (recentErrors.length === 0) {
        this.errorCounts.delete(identifier);
      } else {
        this.errorCounts.set(identifier, recentErrors);
      }
    }
  }
}

// 全局错误频率限制器实例
const errorRateLimiter = new ErrorRateLimiter();

// 定期清理过期记录
setInterval(() => {
  errorRateLimiter.cleanup();
}, 5 * 60 * 1000); // 每5分钟清理一次

/**
 * 从请求中提取错误上下文
 */
const extractErrorContext = (request: NextRequest): ErrorContext => {
  const requestContext = extractRequestContext(request);
  
  return {
    url: request.url,
    method: request.method,
    userAgent: requestContext.context?.userAgent,
    ip: requestContext.context?.ip,
    traceId: requestContext.traceId,
    timestamp: new Date().toISOString()
  };
};

/**
 * 清理敏感信息
 */
const sanitizeError = (error: CustomError): CustomError => {
  // 在生产环境中，移除可能包含敏感信息的详细错误信息
  if (process.env.NODE_ENV === 'production') {
    // 对于系统错误，使用通用错误消息
    if (error.isServerError()) {
      return new CustomError(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'An internal server error occurred',
        undefined,
        error.context
      );
    }
  }
  
  return error;
};

/**
 * 检查是否为可忽略的错误
 */
const isIgnorableError = (error: Error): boolean => {
  const ignorableMessages = [
    'ECONNRESET',
    'ECONNABORTED',
    'EPIPE',
    'Client closed connection'
  ];
  
  return ignorableMessages.some(msg => 
    error.message.includes(msg) || error.name.includes(msg)
  );
};

/**
 * 全局错误处理中间件
 */
export const errorHandlerMiddleware = async (
  request: NextRequest,
  error: unknown
): Promise<NextResponse> => {
  const config = getConfig();
  
  if (!config.enabled) {
    throw error;
  }
  
  // 提取错误上下文
  const errorContext = extractErrorContext(request);
  const traceId = errorContext.traceId || request.headers.get('x-trace-id') || undefined;
  
  // 创建带追踪的日志器
  const requestLogger = createTracedLogger(traceId, errorContext);
  
  let customError: CustomError;
  
  // 转换为CustomError
  if (error instanceof CustomError) {
    customError = error.withContext(errorContext);
  } else if (error instanceof Error) {
    // 检查是否为可忽略的错误
    if (isIgnorableError(error)) {
      requestLogger.debug(`Ignorable error: ${error.message}`, {
        metadata: { ignorable: true }
      });
      return NextResponse.json(
        { success: false, error: { message: 'Request aborted' } },
        { status: 499 }
      );
    }
    
    customError = CustomError.fromError(error, ErrorCode.INTERNAL_SERVER_ERROR, errorContext);
  } else {
    customError = new CustomError(
      ErrorCode.UNKNOWN_ERROR,
      'An unknown error occurred',
      undefined,
      errorContext
    );
  }
  
  // 错误频率限制检查
  if (config.rateLimitErrors && errorContext.ip) {
    const identifier = `${errorContext.ip}:${customError.code}`;
    
    if (errorRateLimiter.isRateLimited(identifier, config.maxErrorsPerMinute)) {
      requestLogger.warn('Error rate limit exceeded', {
        metadata: {
          ip: errorContext.ip,
          errorCode: customError.code,
          rateLimited: true
        }
      });
      
      return createErrorResponse(
        CustomError.rateLimit('Too many errors from this client'),
        traceId
      );
    }
    
    errorRateLimiter.recordError(identifier);
  }
  
  // 清理敏感信息
  if (config.sanitizeErrors) {
    customError = sanitizeError(customError);
  }
  
  // 记录错误日志
  if (config.logErrors) {
    const logLevel = customError.getLogLevel();
    const logContext = {
      traceId,
      metadata: {
        code: customError.code,
        type: customError.type,
        severity: customError.severity,
        httpStatus: customError.httpStatus,
        retryable: customError.retryable,
        url: errorContext.url,
        method: errorContext.method,
        userAgent: errorContext.userAgent,
        ip: errorContext.ip
      },
      context: customError.context
    };
    
    switch (logLevel) {
      case 'error':
        requestLogger.error(
          `API Error: ${customError.message}`,
          error instanceof Error ? error : undefined,
          logContext
        );
        break;
      case 'warn':
        requestLogger.warn(`API Warning: ${customError.message}`, logContext);
        break;
      case 'info':
        requestLogger.info(`API Info: ${customError.message}`, logContext);
        break;
    }
  }
  
  // 创建错误响应
  return createErrorResponse(customError, traceId);
};

/**
 * API路由错误处理装饰器
 */
export const withErrorHandler = <T extends any[], R>(
  handler: (...args: T) => Promise<R>
) => {
  return async (...args: T): Promise<R | NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      const request = args[0] as NextRequest;
      return errorHandlerMiddleware(request, error);
    }
  };
};

/**
 * 异步操作错误处理装饰器
 */
export const withAsyncErrorHandler = <T extends any[], R>(
  operation: (...args: T) => Promise<R>,
  context?: ErrorContext
) => {
  return async (...args: T): Promise<R> => {
    try {
      return await operation(...args);
    } catch (error) {
      if (error instanceof CustomError) {
        throw context ? error.withContext(context) : error;
      }
      
      if (error instanceof Error) {
        throw CustomError.fromError(error, ErrorCode.INTERNAL_SERVER_ERROR, context);
      }
      
      throw new CustomError(
        ErrorCode.UNKNOWN_ERROR,
        'An unknown error occurred',
        undefined,
        context
      );
    }
  };
};

/**
 * 错误边界处理函数
 */
export const handleErrorBoundary = (
  error: Error,
  errorInfo: { componentStack: string }
): void => {
  const customError = CustomError.fromError(error, ErrorCode.INTERNAL_SERVER_ERROR, {
    componentStack: errorInfo.componentStack
  });
  
  logger.error('React Error Boundary caught an error', error, {
    metadata: {
      code: customError.code,
      type: customError.type,
      componentStack: errorInfo.componentStack
    }
  });
};

/**
 * 未处理的Promise拒绝处理
 */
export const handleUnhandledRejection = (reason: any, promise: Promise<any>): void => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  const customError = CustomError.fromError(error, ErrorCode.INTERNAL_SERVER_ERROR, {
    unhandledRejection: true,
    promise: promise.toString()
  });
  
  logger.error('Unhandled Promise Rejection', error, {
    metadata: {
      code: customError.code,
      type: customError.type,
      unhandledRejection: true
    }
  });
};

/**
 * 未捕获异常处理
 */
export const handleUncaughtException = (error: Error): void => {
  const customError = CustomError.fromError(error, ErrorCode.INTERNAL_SERVER_ERROR, {
    uncaughtException: true
  });
  
  logger.error('Uncaught Exception', error, {
    metadata: {
      code: customError.code,
      type: customError.type,
      uncaughtException: true
    }
  });
  
  // 在生产环境中，记录错误后优雅退出
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
};

/**
 * 初始化全局错误处理
 */
export const initializeGlobalErrorHandling = (): void => {
  // 处理未处理的Promise拒绝
  process.on('unhandledRejection', handleUnhandledRejection);
  
  // 处理未捕获的异常
  process.on('uncaughtException', handleUncaughtException);
  
  logger.info('Global error handling initialized');
};

/**
 * 错误处理中间件健康检查
 */
export const checkErrorHandlerHealth = (): {
  healthy: boolean;
  config: ErrorHandlerConfig;
  rateLimiterStats: {
    activeClients: number;
    totalErrors: number;
  };
} => {
  const config = getConfig();
  
  // 计算频率限制器统计信息
  const rateLimiterStats = {
    activeClients: errorRateLimiter['errorCounts'].size,
    totalErrors: Array.from(errorRateLimiter['errorCounts'].values())
      .reduce((total, errors) => total + errors.length, 0)
  };
  
  return {
    healthy: config.enabled,
    config,
    rateLimiterStats
  };
};