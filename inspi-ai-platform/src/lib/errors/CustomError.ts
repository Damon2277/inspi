/**
 * 自定义错误基类
 */
import { ErrorCode, ErrorType, ErrorSeverity, ErrorDetails, ErrorContext, getErrorMetadata } from './types';

/**
 * 自定义错误基类
 */
export class CustomError extends Error {
  public readonly code: ErrorCode;
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly httpStatus: number;
  public readonly retryable: boolean;
  public readonly userMessage: string;
  public readonly developerMessage: string;
  public readonly details?: ErrorDetails[];
  public readonly context?: ErrorContext;
  public readonly timestamp: string;
  public readonly traceId?: string;

  constructor(
    code: ErrorCode,
    message?: string,
    details?: ErrorDetails[],
    context?: ErrorContext,
    cause?: Error
  ) {
    const metadata = getErrorMetadata(code);
    const finalMessage = message || metadata.developerMessage;
    
    super(finalMessage);
    
    // 设置错误名称
    this.name = this.constructor.name;
    
    // 设置错误属性
    this.code = code;
    this.type = metadata.type;
    this.severity = metadata.severity;
    this.httpStatus = metadata.httpStatus;
    this.retryable = metadata.retryable;
    this.userMessage = metadata.userMessage;
    this.developerMessage = finalMessage;
    this.details = details;
    this.context = context;
    this.timestamp = new Date().toISOString();
    this.traceId = context?.traceId;
    
    // 保持堆栈跟踪
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
    
    // 设置原因
    if (cause) {
      this.cause = cause;
    }
  }

  /**
   * 转换为JSON对象
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      code: this.code,
      type: this.type,
      severity: this.severity,
      httpStatus: this.httpStatus,
      retryable: this.retryable,
      message: this.message,
      userMessage: this.userMessage,
      developerMessage: this.developerMessage,
      details: this.details,
      context: this.context,
      timestamp: this.timestamp,
      traceId: this.traceId,
      stack: this.stack
    };
  }

  /**
   * 转换为API响应格式
   */
  toApiResponse() {
    return {
      success: false as const,
      error: {
        code: this.code,
        type: this.type,
        message: this.userMessage,
        details: this.details,
        context: this.context,
        timestamp: this.timestamp,
        traceId: this.traceId
      }
    };
  }

  /**
   * 创建带上下文的新错误
   */
  withContext(context: ErrorContext): CustomError {
    return new CustomError(
      this.code,
      this.message,
      this.details,
      { ...this.context, ...context },
      this
    );
  }

  /**
   * 创建带详情的新错误
   */
  withDetails(details: ErrorDetails[]): CustomError {
    return new CustomError(
      this.code,
      this.message,
      [...(this.details || []), ...details],
      this.context,
      this
    );
  }

  /**
   * 检查是否为特定类型的错误
   */
  isType(type: ErrorType): boolean {
    return this.type === type;
  }

  /**
   * 检查是否为特定严重程度的错误
   */
  isSeverity(severity: ErrorSeverity): boolean {
    return this.severity === severity;
  }

  /**
   * 检查是否可重试
   */
  isRetryable(): boolean {
    return this.retryable;
  }

  /**
   * 检查是否为客户端错误（4xx）
   */
  isClientError(): boolean {
    return this.httpStatus >= 400 && this.httpStatus < 500;
  }

  /**
   * 检查是否为服务器错误（5xx）
   */
  isServerError(): boolean {
    return this.httpStatus >= 500;
  }

  /**
   * 获取日志级别
   */
  getLogLevel(): 'error' | 'warn' | 'info' {
    switch (this.severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      case ErrorSeverity.LOW:
      default:
        return 'info';
    }
  }

  /**
   * 静态工厂方法：创建验证错误
   */
  static validation(
    message?: string,
    details?: ErrorDetails[],
    context?: ErrorContext
  ): CustomError {
    return new CustomError(ErrorCode.VALIDATION_FAILED, message, details, context);
  }

  /**
   * 静态工厂方法：创建认证错误
   */
  static unauthorized(
    message?: string,
    context?: ErrorContext
  ): CustomError {
    return new CustomError(ErrorCode.UNAUTHORIZED, message, undefined, context);
  }

  /**
   * 静态工厂方法：创建权限错误
   */
  static forbidden(
    message?: string,
    context?: ErrorContext
  ): CustomError {
    return new CustomError(ErrorCode.FORBIDDEN, message, undefined, context);
  }

  /**
   * 静态工厂方法：创建资源不存在错误
   */
  static notFound(
    resource?: string,
    context?: ErrorContext
  ): CustomError {
    const message = resource ? `${resource} not found` : undefined;
    return new CustomError(ErrorCode.RESOURCE_NOT_FOUND, message, undefined, context);
  }

  /**
   * 静态工厂方法：创建冲突错误
   */
  static conflict(
    message?: string,
    context?: ErrorContext
  ): CustomError {
    return new CustomError(ErrorCode.RESOURCE_CONFLICT, message, undefined, context);
  }

  /**
   * 静态工厂方法：创建限流错误
   */
  static rateLimit(
    message?: string,
    context?: ErrorContext
  ): CustomError {
    return new CustomError(ErrorCode.RATE_LIMIT_EXCEEDED, message, undefined, context);
  }

  /**
   * 静态工厂方法：创建内部服务器错误
   */
  static internal(
    message?: string,
    cause?: Error,
    context?: ErrorContext
  ): CustomError {
    return new CustomError(ErrorCode.INTERNAL_SERVER_ERROR, message, undefined, context, cause);
  }

  /**
   * 静态工厂方法：创建外部服务错误
   */
  static externalService(
    service: string,
    message?: string,
    context?: ErrorContext
  ): CustomError {
    const finalMessage = message || `External service ${service} error`;
    return new CustomError(ErrorCode.EXTERNAL_SERVICE_ERROR, finalMessage, undefined, context);
  }

  /**
   * 从标准Error创建CustomError
   */
  static fromError(
    error: Error,
    code: ErrorCode = ErrorCode.UNKNOWN_ERROR,
    context?: ErrorContext
  ): CustomError {
    if (error instanceof CustomError) {
      return context ? error.withContext(context) : error;
    }

    return new CustomError(
      code,
      error.message,
      undefined,
      context,
      error
    );
  }

  /**
   * 从HTTP状态码创建错误
   */
  static fromHttpStatus(
    status: number,
    message?: string,
    context?: ErrorContext
  ): CustomError {
    let code: ErrorCode;

    switch (status) {
      case 400:
        code = ErrorCode.INVALID_INPUT;
        break;
      case 401:
        code = ErrorCode.UNAUTHORIZED;
        break;
      case 403:
        code = ErrorCode.FORBIDDEN;
        break;
      case 404:
        code = ErrorCode.RESOURCE_NOT_FOUND;
        break;
      case 409:
        code = ErrorCode.RESOURCE_CONFLICT;
        break;
      case 422:
        code = ErrorCode.VALIDATION_FAILED;
        break;
      case 429:
        code = ErrorCode.RATE_LIMIT_EXCEEDED;
        break;
      case 500:
        code = ErrorCode.INTERNAL_SERVER_ERROR;
        break;
      case 502:
        code = ErrorCode.EXTERNAL_SERVICE_ERROR;
        break;
      case 503:
        code = ErrorCode.SERVICE_UNAVAILABLE;
        break;
      default:
        code = ErrorCode.UNKNOWN_ERROR;
    }

    return new CustomError(code, message, undefined, context);
  }
}