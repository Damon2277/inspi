/**
 * API模块入口文件
 */

// 响应工具
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
  getDefaultErrorMessage,
} from './responses';

// 客户端
export {
  ApiClient,
  ApiError,
  apiClient,
  createApiClient,
} from './client';

// 重试机制
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
  CircuitBreakerState,
} from './retry';

// 类型
export type {
  ApiResponse,
  ApiError as ApiErrorPayload,
  ApiMeta,
  PaginationParams,
} from './responses';

export type {
  ApiClientConfig,
  RequestConfig,
} from './client';

export type {
  RetryStrategy,
  RetryResult,
  CircuitBreakerConfig,
} from './retry';
