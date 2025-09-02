/**
 * 错误类型定义
 */

/**
 * 错误类型枚举
 */
export enum ErrorType {
  // 验证错误
  VALIDATION = 'VALIDATION',
  // 业务逻辑错误
  BUSINESS = 'BUSINESS',
  // 系统错误
  SYSTEM = 'SYSTEM',
  // 网络错误
  NETWORK = 'NETWORK',
  // 认证错误
  AUTH = 'AUTH',
  // 权限错误
  PERMISSION = 'PERMISSION',
  // 资源不存在
  NOT_FOUND = 'NOT_FOUND',
  // 冲突错误
  CONFLICT = 'CONFLICT',
  // 限流错误
  RATE_LIMIT = 'RATE_LIMIT',
  // 外部服务错误
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE'
}

/**
 * 错误严重程度
 */
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

/**
 * 错误码定义
 */
export enum ErrorCode {
  // 通用错误码 (1000-1999)
  UNKNOWN_ERROR = 'E1000',
  INTERNAL_SERVER_ERROR = 'E1001',
  SERVICE_UNAVAILABLE = 'E1002',
  TIMEOUT = 'E1003',
  
  // 验证错误码 (2000-2999)
  VALIDATION_FAILED = 'E2000',
  INVALID_INPUT = 'E2001',
  MISSING_REQUIRED_FIELD = 'E2002',
  INVALID_FORMAT = 'E2003',
  INVALID_LENGTH = 'E2004',
  INVALID_RANGE = 'E2005',
  
  // 认证错误码 (3000-3999)
  UNAUTHORIZED = 'E3000',
  INVALID_TOKEN = 'E3001',
  TOKEN_EXPIRED = 'E3002',
  INVALID_CREDENTIALS = 'E3003',
  ACCOUNT_LOCKED = 'E3004',
  ACCOUNT_DISABLED = 'E3005',
  
  // 权限错误码 (4000-4999)
  FORBIDDEN = 'E4000',
  INSUFFICIENT_PERMISSIONS = 'E4001',
  RESOURCE_ACCESS_DENIED = 'E4002',
  OPERATION_NOT_ALLOWED = 'E4003',
  
  // 资源错误码 (5000-5999)
  RESOURCE_NOT_FOUND = 'E5000',
  USER_NOT_FOUND = 'E5001',
  WORK_NOT_FOUND = 'E5002',
  FILE_NOT_FOUND = 'E5003',
  
  // 业务逻辑错误码 (6000-6999)
  BUSINESS_RULE_VIOLATION = 'E6000',
  DUPLICATE_RESOURCE = 'E6001',
  RESOURCE_CONFLICT = 'E6002',
  INVALID_STATE = 'E6003',
  QUOTA_EXCEEDED = 'E6004',
  SUBSCRIPTION_REQUIRED = 'E6005',
  USAGE_LIMIT_EXCEEDED = 'E6006',
  
  // 外部服务错误码 (7000-7999)
  EXTERNAL_SERVICE_ERROR = 'E7000',
  AI_SERVICE_ERROR = 'E7001',
  EMAIL_SERVICE_ERROR = 'E7002',
  DATABASE_ERROR = 'E7003',
  CACHE_ERROR = 'E7004',
  
  // 网络错误码 (8000-8999)
  NETWORK_ERROR = 'E8000',
  CONNECTION_TIMEOUT = 'E8001',
  REQUEST_TIMEOUT = 'E8002',
  RATE_LIMIT_EXCEEDED = 'E8003'
}

/**
 * HTTP状态码映射
 */
export const HTTP_STATUS_MAP: Record<ErrorCode, number> = {
  // 通用错误 - 500
  [ErrorCode.UNKNOWN_ERROR]: 500,
  [ErrorCode.INTERNAL_SERVER_ERROR]: 500,
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,
  [ErrorCode.TIMEOUT]: 408,
  
  // 验证错误 - 400
  [ErrorCode.VALIDATION_FAILED]: 400,
  [ErrorCode.INVALID_INPUT]: 400,
  [ErrorCode.MISSING_REQUIRED_FIELD]: 400,
  [ErrorCode.INVALID_FORMAT]: 400,
  [ErrorCode.INVALID_LENGTH]: 400,
  [ErrorCode.INVALID_RANGE]: 400,
  
  // 认证错误 - 401
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.INVALID_TOKEN]: 401,
  [ErrorCode.TOKEN_EXPIRED]: 401,
  [ErrorCode.INVALID_CREDENTIALS]: 401,
  [ErrorCode.ACCOUNT_LOCKED]: 423,
  [ErrorCode.ACCOUNT_DISABLED]: 423,
  
  // 权限错误 - 403
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.INSUFFICIENT_PERMISSIONS]: 403,
  [ErrorCode.RESOURCE_ACCESS_DENIED]: 403,
  [ErrorCode.OPERATION_NOT_ALLOWED]: 403,
  
  // 资源错误 - 404
  [ErrorCode.RESOURCE_NOT_FOUND]: 404,
  [ErrorCode.USER_NOT_FOUND]: 404,
  [ErrorCode.WORK_NOT_FOUND]: 404,
  [ErrorCode.FILE_NOT_FOUND]: 404,
  
  // 业务逻辑错误 - 409/422
  [ErrorCode.BUSINESS_RULE_VIOLATION]: 422,
  [ErrorCode.DUPLICATE_RESOURCE]: 409,
  [ErrorCode.RESOURCE_CONFLICT]: 409,
  [ErrorCode.INVALID_STATE]: 422,
  [ErrorCode.QUOTA_EXCEEDED]: 429,
  [ErrorCode.SUBSCRIPTION_REQUIRED]: 402,
  [ErrorCode.USAGE_LIMIT_EXCEEDED]: 429,
  
  // 外部服务错误 - 502/503
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 502,
  [ErrorCode.AI_SERVICE_ERROR]: 502,
  [ErrorCode.EMAIL_SERVICE_ERROR]: 502,
  [ErrorCode.DATABASE_ERROR]: 503,
  [ErrorCode.CACHE_ERROR]: 503,
  
  // 网络错误
  [ErrorCode.NETWORK_ERROR]: 502,
  [ErrorCode.CONNECTION_TIMEOUT]: 504,
  [ErrorCode.REQUEST_TIMEOUT]: 408,
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 429
};

/**
 * 错误详情接口
 */
export interface ErrorDetails {
  field?: string;
  value?: any;
  constraint?: string;
  message?: string;
  [key: string]: any;
}

/**
 * 错误上下文接口
 */
export interface ErrorContext {
  userId?: string;
  requestId?: string;
  traceId?: string;
  url?: string;
  method?: string;
  userAgent?: string;
  ip?: string;
  timestamp?: string;
  [key: string]: any;
}

/**
 * 标准错误响应接口
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    type: ErrorType;
    message: string;
    details?: ErrorDetails[];
    context?: ErrorContext;
    timestamp: string;
    traceId?: string;
  };
}

/**
 * 成功响应接口
 */
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
  traceId?: string;
}

/**
 * API响应联合类型
 */
export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse;

/**
 * 错误元数据接口
 */
export interface ErrorMetadata {
  code: ErrorCode;
  type: ErrorType;
  severity: ErrorSeverity;
  httpStatus: number;
  retryable: boolean;
  userMessage: string;
  developerMessage: string;
}

/**
 * 错误配置映射
 */
export const ERROR_METADATA: Record<ErrorCode, ErrorMetadata> = {
  // 通用错误
  [ErrorCode.UNKNOWN_ERROR]: {
    code: ErrorCode.UNKNOWN_ERROR,
    type: ErrorType.SYSTEM,
    severity: ErrorSeverity.HIGH,
    httpStatus: 500,
    retryable: true,
    userMessage: '系统发生未知错误，请稍后重试',
    developerMessage: 'An unknown error occurred'
  },
  
  [ErrorCode.INTERNAL_SERVER_ERROR]: {
    code: ErrorCode.INTERNAL_SERVER_ERROR,
    type: ErrorType.SYSTEM,
    severity: ErrorSeverity.HIGH,
    httpStatus: 500,
    retryable: true,
    userMessage: '服务器内部错误，请稍后重试',
    developerMessage: 'Internal server error'
  },
  
  [ErrorCode.SERVICE_UNAVAILABLE]: {
    code: ErrorCode.SERVICE_UNAVAILABLE,
    type: ErrorType.SYSTEM,
    severity: ErrorSeverity.HIGH,
    httpStatus: 503,
    retryable: true,
    userMessage: '服务暂时不可用，请稍后重试',
    developerMessage: 'Service temporarily unavailable'
  },
  
  // 验证错误
  [ErrorCode.VALIDATION_FAILED]: {
    code: ErrorCode.VALIDATION_FAILED,
    type: ErrorType.VALIDATION,
    severity: ErrorSeverity.LOW,
    httpStatus: 400,
    retryable: false,
    userMessage: '输入数据验证失败',
    developerMessage: 'Input validation failed'
  },
  
  [ErrorCode.INVALID_INPUT]: {
    code: ErrorCode.INVALID_INPUT,
    type: ErrorType.VALIDATION,
    severity: ErrorSeverity.LOW,
    httpStatus: 400,
    retryable: false,
    userMessage: '输入数据格式不正确',
    developerMessage: 'Invalid input format'
  },
  
  // 认证错误
  [ErrorCode.UNAUTHORIZED]: {
    code: ErrorCode.UNAUTHORIZED,
    type: ErrorType.AUTH,
    severity: ErrorSeverity.MEDIUM,
    httpStatus: 401,
    retryable: false,
    userMessage: '请先登录',
    developerMessage: 'Authentication required'
  },
  
  [ErrorCode.INVALID_TOKEN]: {
    code: ErrorCode.INVALID_TOKEN,
    type: ErrorType.AUTH,
    severity: ErrorSeverity.MEDIUM,
    httpStatus: 401,
    retryable: false,
    userMessage: '登录状态已失效，请重新登录',
    developerMessage: 'Invalid or expired token'
  },
  
  // 权限错误
  [ErrorCode.FORBIDDEN]: {
    code: ErrorCode.FORBIDDEN,
    type: ErrorType.PERMISSION,
    severity: ErrorSeverity.MEDIUM,
    httpStatus: 403,
    retryable: false,
    userMessage: '没有权限执行此操作',
    developerMessage: 'Insufficient permissions'
  },
  
  // 资源错误
  [ErrorCode.RESOURCE_NOT_FOUND]: {
    code: ErrorCode.RESOURCE_NOT_FOUND,
    type: ErrorType.NOT_FOUND,
    severity: ErrorSeverity.LOW,
    httpStatus: 404,
    retryable: false,
    userMessage: '请求的资源不存在',
    developerMessage: 'Requested resource not found'
  },
  
  [ErrorCode.USER_NOT_FOUND]: {
    code: ErrorCode.USER_NOT_FOUND,
    type: ErrorType.NOT_FOUND,
    severity: ErrorSeverity.LOW,
    httpStatus: 404,
    retryable: false,
    userMessage: '用户不存在',
    developerMessage: 'User not found'
  },
  
  // 业务逻辑错误
  [ErrorCode.QUOTA_EXCEEDED]: {
    code: ErrorCode.QUOTA_EXCEEDED,
    type: ErrorType.BUSINESS,
    severity: ErrorSeverity.MEDIUM,
    httpStatus: 429,
    retryable: true,
    userMessage: '已达到使用限额，请升级订阅或稍后重试',
    developerMessage: 'Usage quota exceeded'
  },
  
  [ErrorCode.SUBSCRIPTION_REQUIRED]: {
    code: ErrorCode.SUBSCRIPTION_REQUIRED,
    type: ErrorType.BUSINESS,
    severity: ErrorSeverity.MEDIUM,
    httpStatus: 402,
    retryable: false,
    userMessage: '此功能需要订阅，请升级您的账户',
    developerMessage: 'Subscription required for this feature'
  },
  
  // 外部服务错误
  [ErrorCode.AI_SERVICE_ERROR]: {
    code: ErrorCode.AI_SERVICE_ERROR,
    type: ErrorType.EXTERNAL_SERVICE,
    severity: ErrorSeverity.HIGH,
    httpStatus: 502,
    retryable: true,
    userMessage: 'AI服务暂时不可用，请稍后重试',
    developerMessage: 'AI service error'
  },
  
  // 网络错误
  [ErrorCode.RATE_LIMIT_EXCEEDED]: {
    code: ErrorCode.RATE_LIMIT_EXCEEDED,
    type: ErrorType.RATE_LIMIT,
    severity: ErrorSeverity.MEDIUM,
    httpStatus: 429,
    retryable: true,
    userMessage: '请求过于频繁，请稍后重试',
    developerMessage: 'Rate limit exceeded'
  }
} as Record<ErrorCode, ErrorMetadata>;

// 为未定义的错误码提供默认元数据
Object.values(ErrorCode).forEach(code => {
  if (!ERROR_METADATA[code]) {
    ERROR_METADATA[code] = {
      code,
      type: ErrorType.SYSTEM,
      severity: ErrorSeverity.MEDIUM,
      httpStatus: HTTP_STATUS_MAP[code] || 500,
      retryable: false,
      userMessage: '系统错误，请稍后重试',
      developerMessage: 'System error'
    };
  }
});

/**
 * 获取错误元数据
 */
export const getErrorMetadata = (code: ErrorCode): ErrorMetadata => {
  return ERROR_METADATA[code] || ERROR_METADATA[ErrorCode.UNKNOWN_ERROR];
};