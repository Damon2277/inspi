/**
 * 请求日志中间件
 */
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

import { LOG_TAGS } from '@/lib/logging/config';
import { logger, createTracedLogger } from '@/lib/logging/logger';
import { extractRequestContext, createTimer } from '@/lib/logging/utils';

/**
 * 请求日志中间件配置
 */
interface LoggingMiddlewareConfig {
  enabled: boolean;
  logRequests: boolean;
  logResponses: boolean;
  logHeaders: boolean;
  logBody: boolean;
  excludePaths: string[];
  sensitiveHeaders: string[];
  maxBodySize: number;
}

/**
 * 默认配置
 */
const defaultConfig: LoggingMiddlewareConfig = {
  enabled: true,
  logRequests: true,
  logResponses: true,
  logHeaders: false,
  logBody: false,
  excludePaths: [
    '/api/health',
    '/favicon.ico',
    '/_next',
    '/static',
  ],
  sensitiveHeaders: [
    'authorization',
    'cookie',
    'x-api-key',
    'x-auth-token',
  ],
  maxBodySize: 1024 * 10, // 10KB
};

/**
 * 获取配置
 */
const getConfig = (): LoggingMiddlewareConfig => {
  const env = process.env.NODE_ENV || 'development';

  if (env === 'test') {
    return {
      ...defaultConfig,
      enabled: false,
    };
  }

  if (env === 'production') {
    return {
      ...defaultConfig,
      logHeaders: false,
      logBody: false,
    };
  }

  return defaultConfig;
};

/**
 * 检查路径是否应该被排除
 */
const shouldExcludePath = (pathname: string, excludePaths: string[]): boolean => {
  return excludePaths.some(path => pathname.startsWith(path));
};

/**
 * 过滤敏感头信息
 */
const filterSensitiveHeaders = (
  headers: Headers,
  sensitiveHeaders: string[],
): Record<string, string> => {
  const filtered: Record<string, string> = {};

  headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    if (sensitiveHeaders.includes(lowerKey)) {
      filtered[key] = '[REDACTED]';
    } else {
      filtered[key] = value;
    }
  });

  return filtered;
};

/**
 * 安全地读取请求体
 */
const safeReadBody = async (
  request: NextRequest,
  maxSize: number,
): Promise<string | null> => {
  try {
    const contentType = request.headers.get('content-type') || '';

    // 只记录文本类型的请求体
    if (!contentType.includes('application/json') &&
        !contentType.includes('application/x-www-form-urlencoded') &&
        !contentType.includes('text/')) {
      return null;
    }

    const body = await request.text();

    if (body.length > maxSize) {
      return body.substring(0, maxSize) + '... [TRUNCATED]';
    }

    return body;
  } catch (error) {
    return null;
  }
};

/**
 * 请求日志中间件
 */
export const loggingMiddleware = async (
  request: NextRequest,
  next: () => Promise<NextResponse>,
): Promise<NextResponse> => {
  const config = getConfig();

  if (!config.enabled) {
    return next();
  }

  const { pathname } = new URL(request.url);

  // 检查是否应该排除此路径
  if (shouldExcludePath(pathname, config.excludePaths)) {
    return next();
  }

  // 生成追踪ID
  const traceId = request.headers.get('x-trace-id') || uuidv4();
  const requestId = uuidv4();

  // 创建带追踪ID的日志器
  const requestLogger = createTracedLogger(traceId, { requestId });

  // 提取请求上下文
  const requestContext = extractRequestContext(request);

  // 开始性能计时
  const timer = createTimer(`${request.method} ${pathname}`, requestLogger, requestContext);

  // 记录请求开始
  if (config.logRequests) {
    const logContext = {
      ...requestContext,
      tag: LOG_TAGS.API,
      metadata: {
        method: request.method,
        url: request.url,
        pathname,
        query: Object.fromEntries(new URL(request.url).searchParams),
        headers: config.logHeaders ?
          filterSensitiveHeaders(request.headers, config.sensitiveHeaders) :
          undefined,
        body: config.logBody ?
          await safeReadBody(request, config.maxBodySize) :
          undefined,
      },
    };

    requestLogger.http(`Request started: ${request.method} ${pathname}`, logContext);
  }

  let response: NextResponse;
  let error: Error | null = null;

  try {
    // 执行下一个中间件/处理器
    response = await next();

    // 添加追踪头到响应
    response.headers.set('x-trace-id', traceId);
    response.headers.set('x-request-id', requestId);

  } catch (err) {
    error = err instanceof Error ? err : new Error('Unknown error');

    // 记录错误
    requestLogger.error(`Request failed: ${request.method} ${pathname}`, error, {
      ...requestContext,
      tag: LOG_TAGS.API,
    });

    // 重新抛出错误
    throw error;
  } finally {
    // 结束计时
    const duration = timer.end({
      metadata: {
        status: response?.status,
        success: !error && response?.status < 400,
      },
    });

    // 记录响应
    if (config.logResponses && response) {
      const logContext = {
        ...requestContext,
        tag: LOG_TAGS.API,
        metadata: {
          method: request.method,
          url: request.url,
          pathname,
          status: response.status,
          duration,
          headers: config.logHeaders ?
            Object.fromEntries(response.headers.entries()) :
            undefined,
        },
        performance: {
          duration,
        },
      };

      const level = response.status >= 500 ? 'error' :
                   response.status >= 400 ? 'warn' : 'info';

      const message = `Request completed: ${request.method} ${pathname} ${response.status} ${duration}ms`;

      switch (level) {
        case 'error':
          requestLogger.error(message, undefined, logContext);
          break;
        case 'warn':
          requestLogger.warn(message, logContext);
          break;
        default:
          requestLogger.http(message, logContext);
      }
    }

    // 记录访问日志
    if (response) {
      requestLogger.access(
        request.method,
        pathname,
        response.status,
        duration,
        requestContext,
      );
    }
  }

  return response;
};

/**
 * API路由日志装饰器
 */
export const withRequestLogging = <T extends any[], R>(
  handler: (...args: T) => Promise<R>,
  operationName?: string,
) => {
  return async (...args: T): Promise<R> => {
    const request = args[0] as NextRequest;
    const traceId = request?.headers?.get('x-trace-id') || uuidv4();
    const requestContext = request ? extractRequestContext(request) : {};

    const requestLogger = createTracedLogger(traceId, requestContext);
    const operation = operationName || 'API Handler';
    const timer = createTimer(operation, requestLogger, requestContext);

    try {
      requestLogger.debug(`${operation} started`, {
        ...requestContext,
        tag: LOG_TAGS.API,
      });

      const result = await handler(...args);

      timer.end({
        metadata: { success: true },
      });

      requestLogger.debug(`${operation} completed successfully`, {
        ...requestContext,
        tag: LOG_TAGS.API,
      });

      return result;
    } catch (error) {
      timer.end({
        metadata: { success: false },
      });

      requestLogger.error(`${operation} failed`, error instanceof Error ? error : new Error('Unknown error'), {
        ...requestContext,
        tag: LOG_TAGS.API,
      });

      throw error;
    }
  };
};

/**
 * 中间件健康检查
 */
export const checkLoggingMiddlewareHealth = (): {
  healthy: boolean;
  config: LoggingMiddlewareConfig;
} => {
  const config = getConfig();

  return {
    healthy: config.enabled,
    config,
  };
};
