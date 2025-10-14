/**
 * 标准化错误处理工具
 * 基于Task 6经验教训创建，用于统一项目中的错误处理模式
 */

/**
 * 标准服务错误处理
 * @param error - 捕获的错误对象
 * @param operation - 操作描述
 * @returns never - 总是抛出错误
 */
export const handleServiceError = (error: unknown, operation: string): never => {
  const message = error instanceof Error ? error.message : '未知错误';
  throw new Error(`${operation}失败: ${message}`);
};

/**
 * API路由错误处理
 * @param error - 捕获的错误对象
 * @param context - 上下文描述
 * @returns 标准化的错误响应对象
 */
export const handleApiError = (error: unknown, context: string) => {
  const message = error instanceof Error ? error.message : '服务器内部错误';
  console.error(`API错误 [${context}]:`, error);

  return {
    success: false,
    error: message,
    code: 'INTERNAL_ERROR',
  };
};

/**
 * 数据库操作错误处理
 * @param error - 捕获的错误对象
 * @param operation - 数据库操作描述
 * @returns never - 总是抛出错误
 */
export const handleDbError = (error: unknown, operation: string): never => {
  const message = error instanceof Error ? error.message : '数据库操作失败';
  throw new Error(`数据库${operation}失败: ${message}`);
};

/**
 * 验证错误处理
 * @param error - 捕获的错误对象
 * @param field - 验证失败的字段
 * @returns never - 总是抛出错误
 */
export const handleValidationError = (error: unknown, field?: string): never => {
  const message = error instanceof Error ? error.message : '数据验证失败';
  const fieldInfo = field ? `字段[${field}]` : '';
  throw new Error(`${fieldInfo}验证失败: ${message}`);
};

/**
 * 异步操作错误处理包装器
 * @param operation - 异步操作函数
 * @param context - 操作上下文
 * @returns Promise<T> - 包装后的异步操作
 */
export const withErrorHandling = async <T>(
  operation: () => Promise<T>,
  context: string,
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    handleServiceError(error, context);
    // handleServiceError会抛出错误，这里永远不会执行到
    throw error;
  }
};

/**
 * React组件错误边界使用的错误处理
 * @param error - 错误对象
 * @param errorInfo - React错误信息
 */
export const handleComponentError = (error: Error, errorInfo: any) => {
  console.error('组件错误:', error);
  console.error('错误信息:', errorInfo);

  // 这里可以添加错误上报逻辑
  // reportError(error, errorInfo);
};

/**
 * 类型安全的错误消息提取
 * @param error - 未知类型的错误
 * @returns string - 错误消息
 */
export const extractErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }

  return '未知错误';
};

/**
 * 错误类型判断工具
 */
export const ErrorTypes = {
  isValidationError: (error: unknown): boolean => {
    return error instanceof Error && error.name === 'ValidationError';
  },

  isNetworkError: (error: unknown): boolean => {
    return error instanceof Error && (
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('ECONNREFUSED')
    );
  },

  isDatabaseError: (error: unknown): boolean => {
    return error instanceof Error && (
      error.message.includes('MongoError') ||
      error.message.includes('mongoose') ||
      error.message.includes('database')
    );
  },
};

/**
 * 开发环境错误详情
 * @param error - 错误对象
 * @param context - 上下文
 */
export const logDetailedError = (error: unknown, context: string) => {
  if (process.env.NODE_ENV === 'development') {
    console.group(`🚨 详细错误信息 [${context}]`);
    console.error('错误对象:', error);
    console.error('错误堆栈:', error instanceof Error ? error.stack : 'N/A');
    console.error('错误类型:', typeof error);
    console.error('时间戳:', new Date().toISOString());
    console.groupEnd();
  }
};
