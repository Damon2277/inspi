/**
 * 错误处理工具
 * 提供统一的错误处理和响应格式
 */
import { NextResponse } from 'next/server';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

/**
 * 处理服务层错误，返回标准化的API响应
 */
export function handleServiceError(error: unknown): NextResponse {
  console.error('Service error:', error);

  if (error instanceof Error) {
    const apiError = error as ApiError;

    // 根据错误类型返回不同的状态码
    let statusCode = apiError.statusCode || 500;
    const message = apiError.message;

    // 处理常见错误类型
    if (message.includes('不存在') || message.includes('not found')) {
      statusCode = 404;
    } else if (message.includes('无权限') || message.includes('unauthorized')) {
      statusCode = 403;
    } else if (message.includes('不能为空') || message.includes('无效') || message.includes('格式')) {
      statusCode = 400;
    } else if (message.includes('已存在') || message.includes('重复')) {
      statusCode = 409;
    } else if (message.includes('超过限制') || message.includes('已达上限')) {
      statusCode = 429;
    }

    return NextResponse.json({
      success: false,
      error: message,
      code: apiError.code,
    }, { status: statusCode });
  }

  // 未知错误
  return NextResponse.json({
    success: false,
    error: '服务器内部错误',
  }, { status: 500 });
}

/**
 * 创建API错误
 */
export function createApiError(message: string, statusCode = 500, code?: string): ApiError {
  const error = new Error(message) as ApiError;
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

/**
 * 验证错误
 */
export function createValidationError(message: string): ApiError {
  return createApiError(message, 400, 'VALIDATION_ERROR');
}

/**
 * 权限错误
 */
export function createPermissionError(message = '无权限访问'): ApiError {
  return createApiError(message, 403, 'PERMISSION_ERROR');
}

/**
 * 资源不存在错误
 */
export function createNotFoundError(message = '资源不存在'): ApiError {
  return createApiError(message, 404, 'NOT_FOUND');
}

/**
 * 冲突错误
 */
export function createConflictError(message: string): ApiError {
  return createApiError(message, 409, 'CONFLICT_ERROR');
}

/**
 * 限制错误
 */
export function createLimitError(message: string): ApiError {
  return createApiError(message, 429, 'LIMIT_ERROR');
}

// 兼容性导出
export const handleAPIError = handleServiceError;

const errorHandlerUtils = {
  handleServiceError,
  handleAPIError,
  createApiError,
  createValidationError,
  createPermissionError,
  createNotFoundError,
  createConflictError,
  createLimitError,
};

export default errorHandlerUtils;
