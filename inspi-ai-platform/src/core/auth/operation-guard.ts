/**
 * 写入操作拦截系统
 * 用于拦截需要登录的操作并引导用户登录
 */

export type WriteOperation = 'create' | 'edit' | 'save' | 'reuse';

export interface OperationContext {
  operation: WriteOperation;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, any>;
}

export interface OperationGuardResult {
  allowed: boolean;
  reason?: 'not_authenticated' | 'quota_exceeded' | 'permission_denied';
  message?: string;
  upgradePrompt?: {
    title: string;
    description: string;
    benefits: string[];
    ctaText: string;
    ctaAction: string;
  };
}

/**
 * 检查用户是否可以执行指定操作
 */
export function checkOperationPermission(
  context: OperationContext,
  user: any | null,
  isAuthenticated: boolean,
): OperationGuardResult {
  const { operation } = context;

  // 1. 认证检查
  if (!isAuthenticated || !user) {
    return {
      allowed: false,
      reason: 'not_authenticated',
      message: getAuthRequiredMessage(operation),
    };
  }

  // 2. 邮箱验证检查
  if (!user.emailVerified) {
    return {
      allowed: false,
      reason: 'permission_denied',
      message: '请先验证您的邮箱地址才能使用此功能',
    };
  }

  // 3. 订阅状态检查
  if (user.subscriptionStatus === 'expired' || user.subscriptionStatus === 'cancelled') {
    return {
      allowed: false,
      reason: 'permission_denied',
      message: '您的订阅已过期，请续费后继续使用',
      upgradePrompt: getSubscriptionExpiredPrompt(),
    };
  }

  // 4. 基础权限检查 - 所有登录用户都可以执行写入操作
  return {
    allowed: true,
  };
}

/**
 * 获取认证要求消息
 */
function getAuthRequiredMessage(operation: WriteOperation): string {
  const messages = {
    create: '登录后即可创建您的专属AI卡片',
    edit: '登录后即可编辑卡片内容',
    save: '登录后即可保存您的创作',
    reuse: '登录后即可复用这个卡片模板',
  };

  return messages[operation] || '登录后即可使用此功能';
}

/**
 * 获取订阅过期提示
 */
function getSubscriptionExpiredPrompt() {
  return {
    title: '订阅已过期',
    description: '您的付费订阅已过期，请续费后继续享受高级功能',
    benefits: [
      '恢复每日创建和复用配额',
      '继续使用高清导出功能',
      '保持个人知识图谱访问',
    ],
    ctaText: '立即续费',
    ctaAction: 'renew_subscription',
  };
}

/**
 * 操作拦截Hook
 */
export function useOperationGuard() {
  const checkOperation = (context: OperationContext, user: any | null, isAuthenticated: boolean) => {
    return checkOperationPermission(context, user, isAuthenticated);
  };

  const requireAuth = (operation: WriteOperation, onAuthRequired?: () => void) => {
    return (user: any | null, isAuthenticated: boolean) => {
      const result = checkOperationPermission({ operation }, user, isAuthenticated);

      if (!result.allowed && result.reason === 'not_authenticated') {
        onAuthRequired && onAuthRequired();
        return false;
      }

      return result.allowed;
    };
  };

  return {
    checkOperation,
    requireAuth,
  };
}

/**
 * 操作拦截装饰器
 */
export function withOperationGuard(operation: WriteOperation) {
  return function <T extends (...args: any[]) => any>(
    target: T,
    _context: OperationContext = { operation },
  ): T {
    return ((...args: any[]) => {
      // 这里需要在实际使用时注入认证状态
      // 装饰器主要用于标记需要拦截的函数
      return target(...args);
    }) as T;
  };
}

/**
 * 客户端操作拦截器
 */
export class ClientOperationGuard {
  private user: any | null = null;
  private isAuthenticated: boolean = false;
  private onAuthRequired?: (operation: WriteOperation, message: string) => void;
  private onQuotaExceeded?: (operation: WriteOperation, upgradePrompt: any) => void;

  constructor(options?: {
    onAuthRequired?: (operation: WriteOperation, message: string) => void;
    onQuotaExceeded?: (operation: WriteOperation, upgradePrompt: any) => void;
  }) {
    this.onAuthRequired = options?.onAuthRequired;
    this.onQuotaExceeded = options?.onQuotaExceeded;
  }

  setAuthState(user: any | null, isAuthenticated: boolean) {
    this.user = user;
    this.isAuthenticated = isAuthenticated;
  }

  async guardOperation(context: OperationContext): Promise<boolean> {
    const result = checkOperationPermission(context, this.user, this.isAuthenticated);

    if (!result.allowed) {
      switch (result.reason) {
        case 'not_authenticated':
          this.onAuthRequired?.(context.operation, result.message || '');
          break;
        case 'quota_exceeded':
          this.onQuotaExceeded?.(context.operation, result.upgradePrompt);
          break;
        case 'permission_denied':
          // 显示权限不足提示
          console.warn('Permission denied:', result.message);
          break;
      }
    }

    return result.allowed;
  }

  // 便捷方法
  async canCreate(): Promise<boolean> {
    return this.guardOperation({ operation: 'create' });
  }

  async canEdit(resourceId?: string): Promise<boolean> {
    return this.guardOperation({ operation: 'edit', resourceId });
  }

  async canSave(resourceId?: string): Promise<boolean> {
    return this.guardOperation({ operation: 'save', resourceId });
  }

  async canReuse(resourceId?: string): Promise<boolean> {
    return this.guardOperation({ operation: 'reuse', resourceId });
  }
}

/**
 * 服务端操作拦截中间件
 */
export function createOperationGuardMiddleware() {
  return async (req: any, res: any, next: any) => {
    // 从请求中提取操作信息
    const operation = req.headers['x-operation-type'] as WriteOperation;
    const resourceType = req.headers['x-resource-type'] as string;
    const resourceId = req.headers['x-resource-id'] as string;

    if (!operation) {
      return next();
    }

    const context: OperationContext = {
      operation,
      resourceType,
      resourceId,
    };

    const result = checkOperationPermission(context, req.user, !!req.user);

    if (!result.allowed) {
      return res.status(403).json({
        success: false,
        error: result.message,
        reason: result.reason,
        upgradePrompt: result.upgradePrompt,
      });
    }

    next();
  };
}
