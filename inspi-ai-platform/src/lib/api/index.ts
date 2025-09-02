/**
 * API模块入口文件
 */

// 导出响应工具
export {
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
  getHttpStatusFromErrorCode,
  getDefaultErrorMessage
} from './responses';

// 导出客户端
export {
  ApiClient,
  ApiError,
  apiClient,
  createApiClient
} from './client';

// 导出重试机制
export {
  RetryManager,
  CircuitBreaker,
  createRetryManager,
  createCircuitBreaker,
  withRetry,
  withCircuitBreaker,
  DEFAULT_RETRY_STRATEGY,
  EXPONENTIAL_BACKOFF_STRATEGY,
  LINEAR_RETRY_STRATEGY,
  FAST_RETRY_STRATEGY,
  CircuitBreakerState
} from './retry';

// 导出类型
export type {
  ApiResponse,
  ApiError as ApiErrorType,
  ApiMeta,
  PaginationParams,
  RequestConfig,
  ApiClientConfig,
  RetryStrategy,
  RetryResult,
  CircuitBreakerConfig
} from './responses';

export type { RequestConfig as ClientRequestConfig } from './client';
export type { RetryStrategy as RetryStrategyType, RetryResult as RetryResultType } from './retry';

// 默认导出
export default {
  // 响应工具
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

  // 客户端
  ApiClient,
  ApiError,
  apiClient,
  createApiClient,

  // 重试机制
  RetryManager,
  CircuitBreaker,
  createRetryManager,
  createCircuitBreaker,
  withRetry,
  withCircuitBreaker,

  // 策略
  DEFAULT_RETRY_STRATEGY,
  EXPONENTIAL_BACKOFF_STRATEGY,
  LINEAR_RETRY_STRATEGY,
  FAST_RETRY_STRATEGY
};