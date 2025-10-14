/**
 * 错误响应处理器
 */
import { NextResponse } from 'next/server';

import { logger } from '@/lib/logging/logger';

import { CustomError } from './CustomError';
import { ErrorCode, ErrorResponse, SuccessResponse, ErrorContext } from './types';

/**
 * 创建成功响应
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  traceId?: string,
): NextResponse<SuccessResponse<T>> {
  const response: SuccessResponse<T> = {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    traceId,
  };

  return NextResponse.json(response);
}

/**
 * 创建错误响应
 */
export function createErrorResponse(
  error: CustomError | Error,
  traceId?: string,
): NextResponse<ErrorResponse> {
  let customError: CustomError;

  // 如果不是CustomError，转换为CustomError
  if (!(error instanceof CustomError)) {
    customError = CustomError.fromError(error);
  } else {
    customError = error;
  }

  // 记录错误日志
  const logLevel = customError.getLogLevel();
  const logContext = {
    traceId: traceId || customError.traceId,
    metadata: {
      code: customError.code,
      type: customError.type,
      severity: customError.severity,
      httpStatus: customError.httpStatus,
      retryable: customError.retryable,
    },
    context: customError.context,
  };

  switch (logLevel) {
    case 'error':
      logger.error(customError.message, error, logContext);
      break;
    case 'warn':
      logger.warn(customError.message, logContext);
      break;
    case 'info':
      logger.info(customError.message, logContext);
      break;
  }

  // 创建API响应
  const apiResponse = customError.toApiResponse();
  if (traceId && !apiResponse.error.traceId) {
    apiResponse.error.traceId = traceId;
  }

  return NextResponse.json(apiResponse, {
    status: customError.httpStatus,
  });
}

/**
 * 处理未知错误
 */
export function handleUnknownError(
  error: unknown,
  context?: ErrorContext,
  traceId?: string,
): NextResponse<ErrorResponse> {
  let customError: CustomError;

  if (error instanceof CustomError) {
    customError = error;
  } else if (error instanceof Error) {
    customError = CustomError.fromError(error, ErrorCode.INTERNAL_SERVER_ERROR, context);
  } else {
    customError = new CustomError(
      ErrorCode.UNKNOWN_ERROR,
      'An unknown error occurred',
      undefined,
      context,
    );
  }

  return createErrorResponse(customError, traceId);
}

/**
 * 创建验证错误响应
 */
export function createValidationErrorResponse(
  fieldErrors: Record<string, string>,
  context?: ErrorContext,
  traceId?: string,
): NextResponse<ErrorResponse> {
  const details = Object.entries(fieldErrors).map(([field, message]) => ({
    field,
    constraint: 'validation',
    message,
  }));

  const error = new CustomError(
    ErrorCode.VALIDATION_FAILED,
    'Validation failed',
    details,
    context,
  );

  return createErrorResponse(error, traceId);
}

/**
 * 创建认证错误响应
 */
export function createAuthErrorResponse(
  message?: string,
  context?: ErrorContext,
  traceId?: string,
): NextResponse<ErrorResponse> {
  const error = CustomError.unauthorized(message, context);
  return createErrorResponse(error, traceId);
}

/**
 * 创建权限错误响应
 */
export function createForbiddenErrorResponse(
  message?: string,
  context?: ErrorContext,
  traceId?: string,
): NextResponse<ErrorResponse> {
  const error = CustomError.forbidden(message, context);
  return createErrorResponse(error, traceId);
}

/**
 * 创建资源不存在错误响应
 */
export function createNotFoundErrorResponse(
  resource?: string,
  context?: ErrorContext,
  traceId?: string,
): NextResponse<ErrorResponse> {
  const error = CustomError.notFound(resource, context);
  return createErrorResponse(error, traceId);
}

/**
 * 创建冲突错误响应
 */
export function createConflictErrorResponse(
  message?: string,
  context?: ErrorContext,
  traceId?: string,
): NextResponse<ErrorResponse> {
  const error = CustomError.conflict(message, context);
  return createErrorResponse(error, traceId);
}

/**
 * 创建限流错误响应
 */
export function createRateLimitErrorResponse(
  message?: string,
  context?: ErrorContext,
  traceId?: string,
): NextResponse<ErrorResponse> {
  const error = CustomError.rateLimit(message, context);
  return createErrorResponse(error, traceId);
}

/**
 * 创建内部服务器错误响应
 */
export function createInternalErrorResponse(
  message?: string,
  cause?: Error,
  context?: ErrorContext,
  traceId?: string,
): NextResponse<ErrorResponse> {
  const error = CustomError.internal(message, cause, context);
  return createErrorResponse(error, traceId);
}

/**
 * 错误响应工厂类
 */
export class ErrorResponseFactory {
  private traceId?: string;
  private context?: ErrorContext;

  constructor(traceId?: string, context?: ErrorContext) {
    this.traceId = traceId;
    this.context = context;
  }

  /**
   * 设置追踪ID
   */
  withTraceId(traceId: string): ErrorResponseFactory {
    return new ErrorResponseFactory(traceId, this.context);
  }

  /**
   * 设置上下文
   */
  withContext(context: ErrorContext): ErrorResponseFactory {
    return new ErrorResponseFactory(this.traceId, { ...this.context, ...context });
  }

  /**
   * 创建成功响应
   */
  success<T>(data: T, message?: string): NextResponse<SuccessResponse<T>> {
    return createSuccessResponse(data, message, this.traceId);
  }

  /**
   * 创建错误响应
   */
  error(error: CustomError | Error): NextResponse<ErrorResponse> {
    const contextualError = error instanceof CustomError && this.context
      ? error.withContext(this.context)
      : error;

    return createErrorResponse(contextualError, this.traceId);
  }

  /**
   * 创建验证错误响应
   */
  validation(fieldErrors: Record<string, string>): NextResponse<ErrorResponse> {
    return createValidationErrorResponse(fieldErrors, this.context, this.traceId);
  }

  /**
   * 创建认证错误响应
   */
  unauthorized(message?: string): NextResponse<ErrorResponse> {
    return createAuthErrorResponse(message, this.context, this.traceId);
  }

  /**
   * 创建权限错误响应
   */
  forbidden(message?: string): NextResponse<ErrorResponse> {
    return createForbiddenErrorResponse(message, this.context, this.traceId);
  }

  /**
   * 创建资源不存在错误响应
   */
  notFound(resource?: string): NextResponse<ErrorResponse> {
    return createNotFoundErrorResponse(resource, this.context, this.traceId);
  }

  /**
   * 创建冲突错误响应
   */
  conflict(message?: string): NextResponse<ErrorResponse> {
    return createConflictErrorResponse(message, this.context, this.traceId);
  }

  /**
   * 创建限流错误响应
   */
  rateLimit(message?: string): NextResponse<ErrorResponse> {
    return createRateLimitErrorResponse(message, this.context, this.traceId);
  }

  /**
   * 创建内部服务器错误响应
   */
  internal(message?: string, cause?: Error): NextResponse<ErrorResponse> {
    return createInternalErrorResponse(message, cause, this.context, this.traceId);
  }

  /**
   * 处理未知错误
   */
  unknown(error: unknown): NextResponse<ErrorResponse> {
    return handleUnknownError(error, this.context, this.traceId);
  }
}

/**
 * 创建错误响应工厂
 */
export function createErrorResponseFactory(
  traceId?: string,
  context?: ErrorContext,
): ErrorResponseFactory {
  return new ErrorResponseFactory(traceId, context);
}

/**
 * 错误响应中间件辅助函数
 */
export function withErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<R>,
  context?: ErrorContext,
) {
  return async (...args: T): Promise<R | NextResponse<ErrorResponse>> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleUnknownError(error, context);
    }
  };
}
