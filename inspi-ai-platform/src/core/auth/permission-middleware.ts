/**
 * 权限控制中间件
 * 基于用户订阅状态验证功能访问权限和配额限制
 */

import { NextRequest, NextResponse } from 'next/server';

import { permissionMapper, quotaMapper } from '@/core/subscription/plan-mapper';
import { EnhancedQuotaChecker } from '@/core/subscription/quota-checker';
import { subscriptionService } from '@/core/subscription/subscription-service';
import { UserTier, QuotaType, Subscription } from '@/shared/types/subscription';

/**
 * 权限检查结果
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  suggestedTier?: UserTier;
  quotaUsed?: number;
  quotaLimit?: number;
}

/**
 * 权限检查选项
 */
export interface PermissionCheckOptions {
  userId: string;
  requiredPermissions?: string[];
  quotaType?: QuotaType;
  quotaAmount?: number;
  skipQuotaCheck?: boolean;
}

/**
 * 权限控制中间件类
 */
export class PermissionMiddleware {
  private static instance: PermissionMiddleware;

  private constructor() {}

  public static getInstance(): PermissionMiddleware {
    if (!PermissionMiddleware.instance) {
      PermissionMiddleware.instance = new PermissionMiddleware();
    }
    return PermissionMiddleware.instance;
  }

  /**
   * 检查用户权限
   */
  async checkPermission(options: PermissionCheckOptions): Promise<PermissionCheckResult> {
    try {
      // 获取用户当前订阅和配额检查器
      const { subscription, quotaChecker } = await this.resolveQuotaContext(options.userId);
      const userTier: UserTier = subscription?.tier || 'free';

      // 检查功能权限
      if (options.requiredPermissions && options.requiredPermissions.length > 0) {
        const hasPermission = permissionMapper.hasAllPermissions(userTier, options.requiredPermissions);

        if (!hasPermission) {
          const missingPermissions = options.requiredPermissions.filter(permission =>
            !permissionMapper.hasPermission(userTier, permission),
          );

          // 找到能满足权限的最低层级
          const tiers: UserTier[] = ['basic', 'pro', 'admin'];
          const suggestedTier = (tiers.find as any)(tier =>
            permissionMapper.hasAllPermissions(tier, options.requiredPermissions!),
          );

          return {
            allowed: false,
            reason: `缺少权限: ${missingPermissions.join(', ')}`,
            suggestedTier,
          };
        }
      }

      // 检查配额限制
      if (options.quotaType && !options.skipQuotaCheck) {
        const amount = options.quotaAmount ?? 1;
        const quotaResult = await quotaChecker.checkQuota(options.quotaType, amount);

        if (!quotaResult.allowed) {
          const usage = quotaResult.usage;
          return {
            allowed: false,
            reason: quotaResult.reason || '配额不足',
            quotaUsed: usage.isUnlimited ? 0 : usage.used,
            quotaLimit: usage.isUnlimited ? -1 : usage.limit,
            suggestedTier: this.getSuggestedTierForQuota(userTier, options.quotaType),
          };
        }
      }

      return { allowed: true };

    } catch (error) {
      console.error('权限检查失败:', error);
      return {
        allowed: false,
        reason: '权限检查失败，请稍后重试',
      };
    }
  }

  /**
   * 创建权限检查中间件
   */
  createMiddleware(options: {
    requiredPermissions?: string[];
    quotaType?: QuotaType;
    quotaAmount?: number;
    skipQuotaCheck?: boolean;
  }) {
    return async (request: NextRequest) => {
      try {
        // 从请求中获取用户ID（实际应用中应该从JWT token或session中获取）
        const userId = request.headers.get('x-user-id') ||
                      request.nextUrl.searchParams.get('userId') ||
                      'anonymous';

        if (userId === 'anonymous') {
          return NextResponse.json(
            {
              success: false,
              error: '需要登录',
              code: 'AUTHENTICATION_REQUIRED',
            },
            { status: 401 },
          );
        }

        // 检查权限
        const result = await this.checkPermission({
          userId,
          ...options,
        });

        if (!result.allowed) {
          const response = {
            success: false,
            error: result.reason || '权限不足',
            code: result.quotaUsed !== undefined ? 'QUOTA_EXCEEDED' : 'PERMISSION_DENIED',
            ...(result.suggestedTier && { suggestedTier: result.suggestedTier }),
            ...(result.quotaUsed !== undefined && {
              quotaInfo: {
                used: result.quotaUsed,
                limit: result.quotaLimit,
                type: options.quotaType,
              },
            }),
          };

          return NextResponse.json(response, { status: 403 });
        }

        // 权限检查通过，继续处理请求
        return NextResponse.next();

      } catch (error) {
        console.error('权限中间件执行失败:', error);
        return NextResponse.json(
          {
            success: false,
            error: '服务器内部错误',
            code: 'INTERNAL_ERROR',
          },
          { status: 500 },
        );
      }
    };
  }

  /**
   * 消费配额
   */
  async consumeQuota(
    userId: string,
    quotaType: QuotaType,
    amount: number = 1,
  ): Promise<{
    success: boolean;
    remainingQuota?: number;
    error?: string;
  }> {
    try {
      const normalizedAmount = amount > 0 ? amount : 1;
      const { quotaChecker } = await this.resolveQuotaContext(userId);

      const preCheck = await quotaChecker.checkQuota(quotaType, normalizedAmount);
      if (!preCheck.allowed) {
        return {
          success: false,
          error: preCheck.reason || '配额不足',
        };
      }

      const consumed = await quotaChecker.consumeQuota(quotaType, normalizedAmount);

      if (!consumed) {
        return {
          success: false,
          error: '配额操作失败',
        };
      }

      const postCheck = await quotaChecker.checkQuota(quotaType, 0);
      const usage = postCheck.usage;
      const remainingQuota = usage.isUnlimited
        ? -1
        : Math.max(usage.limit - usage.used, 0);

      return {
        success: true,
        remainingQuota,
      };

    } catch (error) {
      console.error('消费配额失败:', error);
      return {
        success: false,
        error: '配额操作失败',
      };
    }
  }

  /**
   * 获取用户权限信息
   */
  async getUserPermissions(userId: string): Promise<{
    tier: UserTier;
    permissions: string[];
    quotas: Record<QuotaType, { used: number; limit: number; }>;
  }> {
    try {
      // 获取用户订阅与配额检查器
      const { subscription, quotaChecker } = await this.resolveQuotaContext(userId);
      const userTier: UserTier = subscription?.tier || 'free';

      // 获取权限列表
      const permissions = permissionMapper.getPermissions(userTier);

      // 获取配额使用情况
      const quotaTypes: QuotaType[] = ['create', 'reuse', 'export', 'graph_nodes'];
      const quotas: Record<QuotaType, { used: number; limit: number; }> = {} as any;

      for (const quotaType of quotaTypes) {
        const quotaStatus = await quotaChecker.checkQuota(quotaType, 0);
        const usage = quotaStatus.usage;

        quotas[quotaType] = {
          used: usage.isUnlimited ? 0 : usage.used,
          limit: usage.isUnlimited ? -1 : usage.limit,
        };
      }

      return {
        tier: userTier,
        permissions,
        quotas,
      };

    } catch (error) {
      console.error('获取用户权限信息失败:', error);
      throw error;
    }
  }

  // 私有方法

  /**
   * 获取配额建议升级层级
   */
  private getSuggestedTierForQuota(currentTier: UserTier, quotaType: QuotaType): UserTier | undefined {
    const tiers: UserTier[] = ['basic', 'pro', 'admin'];
    const quotaKey =
      quotaType === 'create' ? 'dailyCreateQuota' :
      quotaType === 'reuse' ? 'dailyReuseQuota' :
      quotaType === 'export' ? 'maxExportsPerDay' :
      'maxGraphNodes';

    const currentQuota = quotaMapper.getQuotaValue(currentTier, quotaKey);

    // 找到配额更高的层级
    for (const tier of tiers) {
      const tierQuota = quotaMapper.getQuotaValue(tier, quotaKey);
      if (tierQuota > currentQuota || tierQuota === -1) {
        return tier;
      }
    }

    return undefined;
  }

  /**
   * 获取订阅与配额检查上下文
   */
  private async resolveQuotaContext(userId: string): Promise<{
    subscription: Subscription | null;
    quotaChecker: EnhancedQuotaChecker;
  }> {
    const subscription = await subscriptionService.getCurrentSubscription(userId);
    return {
      subscription,
      quotaChecker: new EnhancedQuotaChecker(userId, subscription),
    };
  }
}

/**
 * 权限装饰器工厂
 */
export function requirePermissions(permissions: string[]) {
  return function (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const request = args[0] as NextRequest;
      const userId = request.headers.get('x-user-id') || 'anonymous';

      if (userId === 'anonymous') {
        return NextResponse.json(
          { success: false, error: '需要登录' },
          { status: 401 },
        );
      }

      const middleware = PermissionMiddleware.getInstance();
      const result = await middleware.checkPermission({
        userId,
        requiredPermissions: permissions,
      });

      if (!result.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: result.reason,
            suggestedTier: result.suggestedTier,
          },
          { status: 403 },
        );
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * 配额检查装饰器工厂
 */
export function requireQuota(quotaType: QuotaType, amount: number = 1) {
  return function (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const request = args[0] as NextRequest;
      const userId = request.headers.get('x-user-id') || 'anonymous';

      if (userId === 'anonymous') {
        return NextResponse.json(
          { success: false, error: '需要登录' },
          { status: 401 },
        );
      }

      const middleware = PermissionMiddleware.getInstance();
      const result = await middleware.checkPermission({
        userId,
        quotaType,
        quotaAmount: amount,
      });

      if (!result.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: result.reason,
            quotaInfo: {
              used: result.quotaUsed,
              limit: result.quotaLimit,
              type: quotaType,
            },
          },
          { status: 403 },
        );
      }

      // 消费配额
      await middleware.consumeQuota(userId, quotaType, amount);

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

// 导出单例实例
export const permissionMiddleware = PermissionMiddleware.getInstance();

// 导出常用的权限检查函数
export const PermissionUtils = {
  /**
   * 检查卡片创建权限
   */
  async checkCardCreatePermission(userId: string, amount: number = 1): Promise<PermissionCheckResult> {
    return permissionMiddleware.checkPermission({
      userId,
      requiredPermissions: ['card:create:basic'],
      quotaType: 'create',
      quotaAmount: amount,
    });
  },

  /**
   * 检查卡片复用权限
   */
  async checkCardReusePermission(userId: string, amount: number = 1): Promise<PermissionCheckResult> {
    return permissionMiddleware.checkPermission({
      userId,
      requiredPermissions: ['card:reuse:basic'],
      quotaType: 'reuse',
      quotaAmount: amount,
    });
  },

  /**
   * 检查导出权限
   */
  async checkExportPermission(userId: string, amount: number = 1): Promise<PermissionCheckResult> {
    return permissionMiddleware.checkPermission({
      userId,
      requiredPermissions: ['card:export:standard'],
      quotaType: 'export',
      quotaAmount: amount,
    });
  },

  /**
   * 检查高清导出权限
   */
  async checkHDExportPermission(userId: string, amount: number = 1): Promise<PermissionCheckResult> {
    return permissionMiddleware.checkPermission({
      userId,
      requiredPermissions: ['card:export:hd'],
      quotaType: 'export',
      quotaAmount: amount,
    });
  },

  /**
   * 检查知识图谱权限
   */
  async checkGraphPermission(userId: string): Promise<PermissionCheckResult> {
    return permissionMiddleware.checkPermission({
      userId,
      requiredPermissions: ['graph:create:unlimited'],
    });
  },
};
