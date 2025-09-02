/**
 * 业务逻辑错误类
 */
import { CustomError } from './CustomError';
import { ErrorCode, ErrorDetails, ErrorContext } from './types';

/**
 * 业务逻辑错误基类
 */
export class BusinessError extends CustomError {
  constructor(
    code: ErrorCode,
    message?: string,
    details?: ErrorDetails[],
    context?: ErrorContext
  ) {
    super(code, message, details, context);
    this.name = 'BusinessError';
  }

  /**
   * 配额超限错误
   */
  static quotaExceeded(
    resource: string,
    limit: number,
    current: number,
    context?: ErrorContext
  ): BusinessError {
    const message = `${resource} quota exceeded: ${current}/${limit}`;
    const details: ErrorDetails[] = [
      {
        field: 'quota',
        value: current,
        constraint: `max_${limit}`,
        message: `Maximum ${limit} ${resource} allowed`
      }
    ];
    
    return new BusinessError(
      ErrorCode.QUOTA_EXCEEDED,
      message,
      details,
      context
    );
  }

  /**
   * 订阅要求错误
   */
  static subscriptionRequired(
    feature: string,
    requiredPlan: string,
    context?: ErrorContext
  ): BusinessError {
    const message = `Feature '${feature}' requires ${requiredPlan} subscription`;
    const details: ErrorDetails[] = [
      {
        field: 'feature',
        value: feature,
        constraint: `requires_${requiredPlan}`,
        message: `This feature is only available for ${requiredPlan} subscribers`
      }
    ];
    
    return new BusinessError(
      ErrorCode.SUBSCRIPTION_REQUIRED,
      message,
      details,
      context
    );
  }

  /**
   * 使用限制超出错误
   */
  static usageLimitExceeded(
    action: string,
    limit: number,
    period: string,
    context?: ErrorContext
  ): BusinessError {
    const message = `${action} limit exceeded: ${limit} per ${period}`;
    const details: ErrorDetails[] = [
      {
        field: 'usage',
        value: limit,
        constraint: `${limit}_per_${period}`,
        message: `You can only ${action} ${limit} times per ${period}`
      }
    ];
    
    return new BusinessError(
      ErrorCode.USAGE_LIMIT_EXCEEDED,
      message,
      details,
      context
    );
  }

  /**
   * 资源冲突错误
   */
  static resourceConflict(
    resource: string,
    identifier: string,
    context?: ErrorContext
  ): BusinessError {
    const message = `${resource} '${identifier}' already exists`;
    const details: ErrorDetails[] = [
      {
        field: 'identifier',
        value: identifier,
        constraint: 'unique',
        message: `${resource} with this identifier already exists`
      }
    ];
    
    return new BusinessError(
      ErrorCode.DUPLICATE_RESOURCE,
      message,
      details,
      context
    );
  }

  /**
   * 无效状态错误
   */
  static invalidState(
    resource: string,
    currentState: string,
    expectedState: string,
    context?: ErrorContext
  ): BusinessError {
    const message = `${resource} is in '${currentState}' state, expected '${expectedState}'`;
    const details: ErrorDetails[] = [
      {
        field: 'state',
        value: currentState,
        constraint: `expected_${expectedState}`,
        message: `Operation requires ${resource} to be in '${expectedState}' state`
      }
    ];
    
    return new BusinessError(
      ErrorCode.INVALID_STATE,
      message,
      details,
      context
    );
  }

  /**
   * 业务规则违反错误
   */
  static ruleViolation(
    rule: string,
    message?: string,
    context?: ErrorContext
  ): BusinessError {
    const finalMessage = message || `Business rule '${rule}' violated`;
    const details: ErrorDetails[] = [
      {
        field: 'rule',
        value: rule,
        constraint: 'business_rule',
        message: finalMessage
      }
    ];
    
    return new BusinessError(
      ErrorCode.BUSINESS_RULE_VIOLATION,
      finalMessage,
      details,
      context
    );
  }
}

/**
 * 用户相关业务错误
 */
export class UserBusinessError extends BusinessError {
  /**
   * 用户不存在错误
   */
  static notFound(userId: string, context?: ErrorContext): UserBusinessError {
    const message = `User '${userId}' not found`;
    const details: ErrorDetails[] = [
      {
        field: 'userId',
        value: userId,
        constraint: 'exists',
        message: 'User does not exist'
      }
    ];
    
    return new UserBusinessError(
      ErrorCode.USER_NOT_FOUND,
      message,
      details,
      context
    );
  }

  /**
   * 账户被锁定错误
   */
  static accountLocked(userId: string, reason?: string, context?: ErrorContext): UserBusinessError {
    const message = `Account '${userId}' is locked${reason ? `: ${reason}` : ''}`;
    const details: ErrorDetails[] = [
      {
        field: 'account',
        value: 'locked',
        constraint: 'active_account',
        message: reason || 'Account is temporarily locked'
      }
    ];
    
    return new UserBusinessError(
      ErrorCode.ACCOUNT_LOCKED,
      message,
      details,
      context
    );
  }

  /**
   * 账户被禁用错误
   */
  static accountDisabled(userId: string, context?: ErrorContext): UserBusinessError {
    const message = `Account '${userId}' is disabled`;
    const details: ErrorDetails[] = [
      {
        field: 'account',
        value: 'disabled',
        constraint: 'active_account',
        message: 'Account has been disabled'
      }
    ];
    
    return new UserBusinessError(
      ErrorCode.ACCOUNT_DISABLED,
      message,
      details,
      context
    );
  }
}

/**
 * 作品相关业务错误
 */
export class WorkBusinessError extends BusinessError {
  /**
   * 作品不存在错误
   */
  static notFound(workId: string, context?: ErrorContext): WorkBusinessError {
    const message = `Work '${workId}' not found`;
    const details: ErrorDetails[] = [
      {
        field: 'workId',
        value: workId,
        constraint: 'exists',
        message: 'Work does not exist'
      }
    ];
    
    return new WorkBusinessError(
      ErrorCode.WORK_NOT_FOUND,
      message,
      details,
      context
    );
  }

  /**
   * 作品访问权限错误
   */
  static accessDenied(workId: string, userId: string, context?: ErrorContext): WorkBusinessError {
    const message = `User '${userId}' cannot access work '${workId}'`;
    const details: ErrorDetails[] = [
      {
        field: 'access',
        value: 'denied',
        constraint: 'owner_or_public',
        message: 'You can only access your own works or public works'
      }
    ];
    
    return new WorkBusinessError(
      ErrorCode.RESOURCE_ACCESS_DENIED,
      message,
      details,
      context
    );
  }

  /**
   * 作品状态无效错误
   */
  static invalidStatus(
    workId: string,
    currentStatus: string,
    requiredStatus: string,
    context?: ErrorContext
  ): WorkBusinessError {
    const message = `Work '${workId}' is '${currentStatus}', expected '${requiredStatus}'`;
    const details: ErrorDetails[] = [
      {
        field: 'status',
        value: currentStatus,
        constraint: `required_${requiredStatus}`,
        message: `Operation requires work to be in '${requiredStatus}' status`
      }
    ];
    
    return new WorkBusinessError(
      ErrorCode.INVALID_STATE,
      message,
      details,
      context
    );
  }
}

/**
 * AI服务相关业务错误
 */
export class AIServiceError extends BusinessError {
  /**
   * AI生成失败错误
   */
  static generationFailed(reason?: string, context?: ErrorContext): AIServiceError {
    const message = `AI generation failed${reason ? `: ${reason}` : ''}`;
    const details: ErrorDetails[] = [
      {
        field: 'generation',
        value: 'failed',
        constraint: 'successful_generation',
        message: reason || 'AI service failed to generate content'
      }
    ];
    
    return new AIServiceError(
      ErrorCode.AI_SERVICE_ERROR,
      message,
      details,
      context
    );
  }

  /**
   * Token超限错误
   */
  static tokenLimitExceeded(used: number, limit: number, context?: ErrorContext): AIServiceError {
    const message = `Token limit exceeded: ${used}/${limit}`;
    const details: ErrorDetails[] = [
      {
        field: 'tokens',
        value: used,
        constraint: `max_${limit}`,
        message: `Request uses ${used} tokens, but limit is ${limit}`
      }
    ];
    
    return new AIServiceError(
      ErrorCode.QUOTA_EXCEEDED,
      message,
      details,
      context
    );
  }

  /**
   * 内容过滤错误
   */
  static contentFiltered(reason: string, context?: ErrorContext): AIServiceError {
    const message = `Content filtered: ${reason}`;
    const details: ErrorDetails[] = [
      {
        field: 'content',
        value: 'filtered',
        constraint: 'content_policy',
        message: `Content was filtered due to: ${reason}`
      }
    ];
    
    return new AIServiceError(
      ErrorCode.BUSINESS_RULE_VIOLATION,
      message,
      details,
      context
    );
  }
}