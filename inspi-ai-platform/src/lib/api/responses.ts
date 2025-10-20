/**
 * API响应标准化工具
 */

import { NextResponse } from 'next/server';

import { logger } from '@/lib/logging/logger';
import { reportError } from '@/lib/monitoring';
import { CustomError } from '@/shared/errors/CustomError';
import { ErrorCode } from '@/shared/errors/types';

/**
 * 标准API响应接口
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
  status?: number;
}

/**
 * API错误接口
 */
export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: any;
  timestamp: string;
  traceId: string;
  field?: string; // 用于字段验证错误
  stack?: string; // 仅开发环境
}

/**
 * API元数据接口
 */
export interface ApiMeta {
  timestamp: string;
  version: string;
  requestId: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  performance?: {
    duration: number;
    queries?: number;
  };
}

/**
 * 分页参数接口
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

/**
 * 生成追踪ID
 */
function generateTraceId(): string {
  return `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 创建成功响应
 */
export function createSuccessResponse<T>(
  data: T,
  meta?: Partial<ApiMeta>,
  status: number = 200,
): NextResponse<ApiResponse<T>> {
  const response: ApiResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      requestId: generateTraceId(),
      ...meta,
    },
  };

  return NextResponse.json(response, { status });
}

/**
 * 创建错误响应
 */
export function createErrorResponse(
  error: Error | CustomError | string,
  status?: number,
  details?: any,
  field?: string,
): NextResponse<ApiResponse> {
  let customError: CustomError;
  let httpStatus = status || 500;

  // 转换为CustomError
  if (error instanceof CustomError) {
    customError = error;
    httpStatus = status || error.httpStatus;
  } else if (error instanceof Error) {
    customError = CustomError.fromError(error, ErrorCode.INTERNAL_SERVER_ERROR);
  } else {
    const message = typeof error === 'string' ? error : 'Unknown error';
    customError = new CustomError(ErrorCode.INTERNAL_SERVER_ERROR, message);
  }

  const traceId = generateTraceId();
  const isDevelopment = process.env.NODE_ENV === 'development';

  // 记录错误日志
  logger.error('API Error Response', customError, {
    metadata: {
      traceId,
      httpStatus,
      field,
      details,
    },
  });

  // 报告错误到监控系统
  reportError(customError, {
    tags: {
      api_error: 'true',
      http_status: httpStatus.toString(),
      error_code: customError.code,
    },
    extra: {
      traceId,
      field,
      details,
    },
  });

  const apiError: ApiError = {
    code: customError.code,
    message: customError.userMessage,
    timestamp: new Date().toISOString(),
    traceId,
    ...(details && { details }),
    ...(field && { field }),
    ...(isDevelopment && customError.stack && { stack: customError.stack }),
  };

  const response: ApiResponse = {
    success: false,
    error: apiError,
  };

  return NextResponse.json(response, { status: httpStatus });
}

/**
 * 创建验证错误响应
 */
export function createValidationErrorResponse(
  message: string,
  field?: string,
  details?: any,
): NextResponse<ApiResponse> {
  const error = new CustomError(ErrorCode.VALIDATION_ERROR, message);
  return createErrorResponse(error, 400, details, field);
}

/**
 * 创建认证错误响应
 */
export function createAuthErrorResponse(
  message: string = '认证失败，请重新登录',
): NextResponse<ApiResponse> {
  const error = new CustomError(ErrorCode.AUTHENTICATION_ERROR, message);
  return createErrorResponse(error, 401);
}

/**
 * 创建权限错误响应
 */
export function createPermissionErrorResponse(
  message: string = '权限不足，无法访问此资源',
): NextResponse<ApiResponse> {
  const error = new CustomError(ErrorCode.AUTHORIZATION_ERROR, message);
  return createErrorResponse(error, 403);
}

/**
 * 创建资源未找到错误响应
 */
export function createNotFoundErrorResponse(
  resource: string = '资源',
): NextResponse<ApiResponse> {
  const error = new CustomError(ErrorCode.RESOURCE_NOT_FOUND, `${resource}不存在`);
  return createErrorResponse(error, 404);
}

/**
 * 创建业务逻辑错误响应
 */
export function createBusinessErrorResponse(
  message: string,
  code?: ErrorCode,
  details?: any,
): NextResponse<ApiResponse> {
  const errorCode = code || ErrorCode.BUSINESS_LOGIC_ERROR;
  const error = new CustomError(errorCode, message);
  return createErrorResponse(error, 400, details);
}

/**
 * 创建服务器错误响应
 */
export function createServerErrorResponse(
  message: string = '服务器内部错误，请稍后重试',
): NextResponse<ApiResponse> {
  const error = new CustomError(ErrorCode.INTERNAL_SERVER_ERROR, message);
  return createErrorResponse(error, 500);
}

/**
 * 创建分页响应
 */
export function createPaginatedResponse<T>(
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
  },
  meta?: Partial<ApiMeta>,
): NextResponse<ApiResponse<T[]>> {
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return createSuccessResponse(data, {
    ...meta,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages,
    },
  });
}

/**
 * 解析分页参数
 */
export function parsePaginationParams(searchParams: URLSearchParams): {
  page: number;
  limit: number;
  offset: number;
} {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * API错误处理装饰器
 */
export function withErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<R>,
) {
  return async (...args: T): Promise<R | NextResponse<ApiResponse>> => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof CustomError) {
        return createErrorResponse(error);
      } else if (error instanceof Error) {
        return createErrorResponse(error);
      } else {
        return createServerErrorResponse('未知错误');
      }
    }
  };
}

/**
 * 验证请求体
 */
export async function validateRequestBody<T>(
  request: Request,
  validator: (data: any) => T | Promise<T>,
): Promise<T> {
  try {
    const body = await request.json();
    return await validator(body);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new CustomError(ErrorCode.VALIDATION_ERROR, '请求体格式错误，请检查JSON格式');
    }
    throw error;
  }
}

/**
 * 验证查询参数
 */
export function validateQueryParams<T>(
  searchParams: URLSearchParams,
  validator: (params: Record<string, string>) => T,
): T {
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  return validator(params);
}

/**
 * 错误码映射
 */
export const ERROR_CODE_MAP: Partial<Record<ErrorCode, { status: number; message: string }>> = {
  [ErrorCode.VALIDATION_ERROR]: {
    status: 400,
    message: '请求参数验证失败',
  },
  [ErrorCode.AUTHENTICATION_ERROR]: {
    status: 401,
    message: '认证失败，请重新登录',
  },
  [ErrorCode.AUTHORIZATION_ERROR]: {
    status: 403,
    message: '权限不足，无法访问此资源',
  },
  [ErrorCode.RESOURCE_NOT_FOUND]: {
    status: 404,
    message: '请求的资源不存在',
  },
  [ErrorCode.BUSINESS_LOGIC_ERROR]: {
    status: 400,
    message: '业务逻辑错误',
  },
  [ErrorCode.RATE_LIMIT_EXCEEDED]: {
    status: 429,
    message: '请求频率过高，请稍后重试',
  },
  [ErrorCode.CIRCUIT_BREAKER_OPEN]: {
    status: 503,
    message: '服务暂时不可用，请稍后重试',
  },
  [ErrorCode.CIRCUIT_BREAKER_HALF_OPEN_LIMIT]: {
    status: 503,
    message: '服务正在恢复中，请稍后重试',
  },
  [ErrorCode.INTERNAL_SERVER_ERROR]: {
    status: 500,
    message: '服务器内部错误',
  },
  [ErrorCode.SERVICE_UNAVAILABLE]: {
    status: 503,
    message: '服务暂时不可用',
  },
};

/**
 * 根据错误码获取HTTP状态码
 */
export function getHttpStatusFromErrorCode(code: ErrorCode): number {
  return ERROR_CODE_MAP[code]?.status || 500;
}

/**
 * 根据错误码获取默认错误消息
 */
export function getDefaultErrorMessage(code: ErrorCode): string {
  return ERROR_CODE_MAP[code]?.message || '未知错误';
}

const apiResponseUtils = {
  createSuccessResponse,
  createErrorResponse,
  createValidationErrorResponse,
  createAuthErrorResponse,
  createPermissionErrorResponse,
  createNotFoundErrorResponse,
  createBusinessErrorResponse,
  createServerErrorResponse,
  createPaginatedResponse,
  parsePaginationParams,
  withErrorHandling,
  validateRequestBody,
  validateQueryParams,
};

export default apiResponseUtils;
