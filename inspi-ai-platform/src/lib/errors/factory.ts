/**
 * 错误工厂函数
 */
import { CustomError } from './CustomError';
import { BusinessError, UserBusinessError, WorkBusinessError, AIServiceError } from './BusinessError';
import { ValidationError, FormValidationError, ApiValidationError } from './ValidationError';
import { ErrorCode, ErrorContext, ErrorDetails } from './types';

/**
 * 错误工厂类
 */
export class ErrorFactory {
  private context?: ErrorContext;

  constructor(context?: ErrorContext) {
    this.context = context;
  }

  /**
   * 设置上下文
   */
  withContext(context: ErrorContext): ErrorFactory {
    return new ErrorFactory({ ...this.context, ...context });
  }

  /**
   * 创建验证错误
   */
  validation(message?: string, details?: ErrorDetails[]): ValidationError {
    return new ValidationError(message, details, this.context);
  }

  /**
   * 创建表单验证错误
   */
  formValidation(formName: string, fieldErrors: Record<string, string>): FormValidationError {
    const details: ErrorDetails[] = Object.entries(fieldErrors).map(([field, message]) => ({
      field,
      constraint: 'validation',
      message
    }));
    
    return new FormValidationError(formName, details, this.context);
  }

  /**
   * 创建API验证错误
   */
  apiValidation(
    endpoint: string,
    method: string,
    errors: Record<string, string>
  ): ApiValidationError {
    const details: ErrorDetails[] = Object.entries(errors).map(([field, message]) => ({
      field,
      constraint: 'validation',
      message
    }));
    
    return new ApiValidationError(endpoint, method, details, this.context);
  }

  /**
   * 创建认证错误
   */
  unauthorized(message?: string): CustomError {
    return CustomError.unauthorized(message, this.context);
  }

  /**
   * 创建权限错误
   */
  forbidden(message?: string): CustomError {
    return CustomError.forbidden(message, this.context);
  }

  /**
   * 创建资源不存在错误
   */
  notFound(resource?: string): CustomError {
    return CustomError.notFound(resource, this.context);
  }

  /**
   * 创建冲突错误
   */
  conflict(message?: string): CustomError {
    return CustomError.conflict(message, this.context);
  }

  /**
   * 创建限流错误
   */
  rateLimit(message?: string): CustomError {
    return CustomError.rateLimit(message, this.context);
  }

  /**
   * 创建内部服务器错误
   */
  internal(message?: string, cause?: Error): CustomError {
    return CustomError.internal(message, cause, this.context);
  }

  /**
   * 创建业务错误
   */
  business(code: ErrorCode, message?: string, details?: ErrorDetails[]): BusinessError {
    return new BusinessError(code, message, details, this.context);
  }

  /**
   * 创建用户业务错误
   */
  user = {
    notFound: (userId: string): UserBusinessError => {
      return UserBusinessError.notFound(userId, this.context);
    },
    
    accountLocked: (userId: string, reason?: string): UserBusinessError => {
      return UserBusinessError.accountLocked(userId, reason, this.context);
    },
    
    accountDisabled: (userId: string): UserBusinessError => {
      return UserBusinessError.accountDisabled(userId, this.context);
    }
  };

  /**
   * 创建作品业务错误
   */
  work = {
    notFound: (workId: string): WorkBusinessError => {
      return WorkBusinessError.notFound(workId, this.context);
    },
    
    accessDenied: (workId: string, userId: string): WorkBusinessError => {
      return WorkBusinessError.accessDenied(workId, userId, this.context);
    },
    
    invalidStatus: (
      workId: string,
      currentStatus: string,
      requiredStatus: string
    ): WorkBusinessError => {
      return WorkBusinessError.invalidStatus(
        workId,
        currentStatus,
        requiredStatus,
        this.context
      );
    }
  };

  /**
   * 创建AI服务错误
   */
  ai = {
    generationFailed: (reason?: string): AIServiceError => {
      return AIServiceError.generationFailed(reason, this.context);
    },
    
    tokenLimitExceeded: (used: number, limit: number): AIServiceError => {
      return AIServiceError.tokenLimitExceeded(used, limit, this.context);
    },
    
    contentFiltered: (reason: string): AIServiceError => {
      return AIServiceError.contentFiltered(reason, this.context);
    }
  };

  /**
   * 创建配额相关错误
   */
  quota = {
    exceeded: (resource: string, limit: number, current: number): BusinessError => {
      return BusinessError.quotaExceeded(resource, limit, current, this.context);
    },
    
    subscriptionRequired: (feature: string, requiredPlan: string): BusinessError => {
      return BusinessError.subscriptionRequired(feature, requiredPlan, this.context);
    },
    
    usageLimitExceeded: (action: string, limit: number, period: string): BusinessError => {
      return BusinessError.usageLimitExceeded(action, limit, period, this.context);
    }
  };

  /**
   * 创建外部服务错误
   */
  external = {
    service: (service: string, message?: string): CustomError => {
      return CustomError.externalService(service, message, this.context);
    },
    
    timeout: (service: string): CustomError => {
      const message = `${service} service timeout`;
      return new CustomError(ErrorCode.TIMEOUT, message, undefined, this.context);
    },
    
    unavailable: (service: string): CustomError => {
      const message = `${service} service unavailable`;
      return new CustomError(ErrorCode.SERVICE_UNAVAILABLE, message, undefined, this.context);
    }
  };

  /**
   * 从标准Error创建CustomError
   */
  fromError(error: Error, code?: ErrorCode): CustomError {
    return CustomError.fromError(error, code, this.context);
  }

  /**
   * 从HTTP状态码创建错误
   */
  fromHttpStatus(status: number, message?: string): CustomError {
    return CustomError.fromHttpStatus(status, message, this.context);
  }
}

/**
 * 创建错误工厂实例
 */
export function createErrorFactory(context?: ErrorContext): ErrorFactory {
  return new ErrorFactory(context);
}

/**
 * 默认错误工厂实例
 */
export const errorFactory = new ErrorFactory();

/**
 * 常用错误创建函数
 */
export const createError = {
  /**
   * 验证错误
   */
  validation: (message?: string, details?: ErrorDetails[], context?: ErrorContext) => {
    return new ValidationError(message, details, context);
  },

  /**
   * 必填字段错误
   */
  required: (field: string, context?: ErrorContext) => {
    return ValidationError.required(field, context);
  },

  /**
   * 格式错误
   */
  invalidFormat: (field: string, value: any, format: string, context?: ErrorContext) => {
    return ValidationError.invalidFormat(field, value, format, context);
  },

  /**
   * 长度错误
   */
  invalidLength: (field: string, value: any, min?: number, max?: number, context?: ErrorContext) => {
    return ValidationError.invalidLength(field, value, min, max, context);
  },

  /**
   * 认证错误
   */
  unauthorized: (message?: string, context?: ErrorContext) => {
    return CustomError.unauthorized(message, context);
  },

  /**
   * 权限错误
   */
  forbidden: (message?: string, context?: ErrorContext) => {
    return CustomError.forbidden(message, context);
  },

  /**
   * 资源不存在错误
   */
  notFound: (resource?: string, context?: ErrorContext) => {
    return CustomError.notFound(resource, context);
  },

  /**
   * 冲突错误
   */
  conflict: (message?: string, context?: ErrorContext) => {
    return CustomError.conflict(message, context);
  },

  /**
   * 限流错误
   */
  rateLimit: (message?: string, context?: ErrorContext) => {
    return CustomError.rateLimit(message, context);
  },

  /**
   * 内部错误
   */
  internal: (message?: string, cause?: Error, context?: ErrorContext) => {
    return CustomError.internal(message, cause, context);
  },

  /**
   * 配额超限错误
   */
  quotaExceeded: (resource: string, limit: number, current: number, context?: ErrorContext) => {
    return BusinessError.quotaExceeded(resource, limit, current, context);
  },

  /**
   * 订阅要求错误
   */
  subscriptionRequired: (feature: string, plan: string, context?: ErrorContext) => {
    return BusinessError.subscriptionRequired(feature, plan, context);
  },

  /**
   * AI生成失败错误
   */
  aiGenerationFailed: (reason?: string, context?: ErrorContext) => {
    return AIServiceError.generationFailed(reason, context);
  },

  /**
   * 用户不存在错误
   */
  userNotFound: (userId: string, context?: ErrorContext) => {
    return UserBusinessError.notFound(userId, context);
  },

  /**
   * 作品不存在错误
   */
  workNotFound: (workId: string, context?: ErrorContext) => {
    return WorkBusinessError.notFound(workId, context);
  }
};

/**
 * 错误断言函数
 */
export const assert = {
  /**
   * 断言条件为真，否则抛出错误
   */
  isTrue: (condition: boolean, error: CustomError | (() => CustomError)) => {
    if (!condition) {
      throw typeof error === 'function' ? error() : error;
    }
  },

  /**
   * 断言值存在，否则抛出NotFound错误
   */
  exists: <T>(value: T | null | undefined, resource?: string, context?: ErrorContext): T => {
    if (value == null) {
      throw createError.notFound(resource, context);
    }
    return value;
  },

  /**
   * 断言用户已认证，否则抛出Unauthorized错误
   */
  authenticated: (user: any, context?: ErrorContext) => {
    if (!user) {
      throw createError.unauthorized('Authentication required', context);
    }
  },

  /**
   * 断言用户有权限，否则抛出Forbidden错误
   */
  authorized: (hasPermission: boolean, message?: string, context?: ErrorContext) => {
    if (!hasPermission) {
      throw createError.forbidden(message || 'Insufficient permissions', context);
    }
  },

  /**
   * 断言验证通过，否则抛出Validation错误
   */
  valid: (isValid: boolean, message: string, field?: string, context?: ErrorContext) => {
    if (!isValid) {
      const details = field ? [{ field, constraint: 'validation', message }] : undefined;
      throw createError.validation(message, details, context);
    }
  }
};