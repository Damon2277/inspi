/**
 * 错误恢复策略管理器
 */
import { ApiError } from '@/lib/api/client';
import { logger } from '@/lib/logging/logger';
import { monitoringContext } from '@/lib/monitoring';
import { CustomError } from '@/shared/errors/CustomError';
import { ErrorCode } from '@/shared/errors/types';

/**
 * 恢复策略类型
 */
export enum RecoveryStrategyType {
  IMMEDIATE_RETRY = 'immediate_retry',
  DELAYED_RETRY = 'delayed_retry',
  EXPONENTIAL_BACKOFF = 'exponential_backoff',
  CIRCUIT_BREAKER = 'circuit_breaker',
  FALLBACK = 'fallback',
  GRACEFUL_DEGRADATION = 'graceful_degradation',
  CACHE_FALLBACK = 'cache_fallback',
  ALTERNATIVE_SERVICE = 'alternative_service',
  USER_INTERVENTION = 'user_intervention',
  AUTOMATIC_RECOVERY = 'automatic_recovery'
}

/**
 * 恢复动作类型
 */
export enum RecoveryActionType {
  RETRY = 'retry',
  FALLBACK = 'fallback',
  DEGRADE = 'degrade',
  CACHE = 'cache',
  REDIRECT = 'redirect',
  NOTIFY = 'notify',
  LOG = 'log',
  ESCALATE = 'escalate'
}

/**
 * 恢复上下文
 */
export interface RecoveryContext {
  error: Error;
  operation: string;
  attempt: number;
  startTime: number;
  metadata?: Record<string, any>;
  userContext?: {
    userId?: string;
    sessionId?: string;
    preferences?: Record<string, any>;
  };
}

/**
 * 恢复动作
 */
export interface RecoveryAction {
  type: RecoveryActionType;
  priority: number;
  condition: (context: RecoveryContext) => boolean;
  execute: (context: RecoveryContext) => Promise<any>;
  fallback?: RecoveryAction;
  timeout?: number;
  description: string;
}

/**
 * 恢复策略
 */
export interface RecoveryStrategy {
  name: string;
  type: RecoveryStrategyType;
  condition: (error: Error, context?: any) => boolean;
  actions: RecoveryAction[];
  maxAttempts: number;
  cooldownPeriod: number;
  priority: number;
  enabled: boolean;
}

/**
 * 恢复结果
 */
export interface RecoveryResult {
  success: boolean;
  strategy: RecoveryStrategyType;
  action: RecoveryActionType;
  data?: any;
  error?: Error;
  attempts: number;
  duration: number;
  fallbackUsed: boolean;
}

/**
 * 预定义恢复动作
 */
export const RECOVERY_ACTIONS = {
  /**
   * 立即重试
   */
  immediateRetry: (maxRetries: number = 3): RecoveryAction => ({
    type: RecoveryActionType.RETRY,
    priority: 1,
    condition: (context) => context.attempt < maxRetries,
    execute: async (context) => {
      logger.info('Executing immediate retry', {
        metadata: {
          operation: context.operation,
          attempt: context.attempt,
          error: context.error.message,
        },
      });
      throw new Error('RETRY_REQUESTED');
    },
    description: `Immediate retry (max ${maxRetries} attempts)`,
  }),

  /**
   * 延迟重试
   */
  delayedRetry: (delay: number, maxRetries: number = 3): RecoveryAction => ({
    type: RecoveryActionType.RETRY,
    priority: 2,
    condition: (context) => context.attempt < maxRetries,
    execute: async (context) => {
      await new Promise(resolve => setTimeout(resolve, delay));
      logger.info('Executing delayed retry', {
        metadata: {
          operation: context.operation,
          attempt: context.attempt,
          delay,
          error: context.error.message,
        },
      });
      throw new Error('RETRY_REQUESTED');
    },
    description: `Delayed retry with ${delay}ms delay (max ${maxRetries} attempts)`,
  }),

  /**
   * 缓存回退
   */
  cacheFallback: (cacheKey: string): RecoveryAction => ({
    type: RecoveryActionType.CACHE,
    priority: 3,
    condition: () => true,
    execute: async (context) => {
      logger.info('Attempting cache fallback', {
        metadata: {
          operation: context.operation,
          cacheKey,
          error: context.error.message,
        },
      });
      // 模拟缓存查找
      const cachedData = await getCachedData(cacheKey);
      if (cachedData) {
        return cachedData;
      }
      throw new Error('No cached data available');
    },
    description: `Cache fallback for key: ${cacheKey}`,
  }),

  /**
   * 优雅降级
   */
  gracefulDegradation: (fallbackData: any): RecoveryAction => ({
    type: RecoveryActionType.DEGRADE,
    priority: 4,
    condition: () => true,
    execute: async (context) => {
      logger.info('Executing graceful degradation', {
        metadata: {
          operation: context.operation,
          error: context.error.message,
        },
      });
      return fallbackData;
    },
    description: 'Graceful degradation with fallback data',
  }),

  /**
   * 用户通知
   */
  userNotification: (message: string): RecoveryAction => ({
    type: RecoveryActionType.NOTIFY,
    priority: 5,
    condition: () => true,
    execute: async (context) => {
      logger.info('Sending user notification', {
        metadata: {
          operation: context.operation,
          message,
          userId: context.userContext?.userId,
        },
      });
      await sendUserNotification(context.userContext?.userId, message);
      return { notified: true, message };
    },
    description: `User notification: ${message}`,
  }),

  /**
   * 错误上报
   */
  errorEscalation: (severity: 'low' | 'medium' | 'high' | 'critical'): RecoveryAction => ({
    type: RecoveryActionType.ESCALATE,
    priority: 6,
    condition: () => true,
    execute: async (context) => {
      logger.error('Escalating error', context.error, {
        metadata: {
          operation: context.operation,
          severity,
          attempt: context.attempt,
        },
      });
      await escalateError(context.error, severity, context);
      return { escalated: true, severity };
    },
    description: `Error escalation with ${severity} severity`,
  }),
};

/**
 * 预定义恢复策略
 */
export const RECOVERY_STRATEGIES: RecoveryStrategy[] = [
  {
    name: 'Network Error Recovery',
    type: RecoveryStrategyType.EXPONENTIAL_BACKOFF,
    condition: (error) => {
      if (error instanceof ApiError) {
        return error.isNetworkError();
      }
      return error.message.toLowerCase().includes('network');
    },
    actions: [
      RECOVERY_ACTIONS.immediateRetry(2),
      RECOVERY_ACTIONS.delayedRetry(1000, 3),
      RECOVERY_ACTIONS.cacheFallback('network_fallback'),
      RECOVERY_ACTIONS.userNotification('网络连接不稳定，正在尝试恢复...'),
    ],
    maxAttempts: 5,
    cooldownPeriod: 30000,
    priority: 1,
    enabled: true,
  },
  {
    name: 'Server Error Recovery',
    type: RecoveryStrategyType.CIRCUIT_BREAKER,
    condition: (error) => {
      if (error instanceof ApiError) {
        return error.isServerError();
      }
      return false;
    },
    actions: [
      RECOVERY_ACTIONS.delayedRetry(2000, 2),
      RECOVERY_ACTIONS.cacheFallback('server_fallback'),
      RECOVERY_ACTIONS.gracefulDegradation({ message: '服务暂时不可用，请稍后重试' }),
      RECOVERY_ACTIONS.errorEscalation('high'),
    ],
    maxAttempts: 3,
    cooldownPeriod: 60000,
    priority: 2,
    enabled: true,
  },
  {
    name: 'Validation Error Recovery',
    type: RecoveryStrategyType.USER_INTERVENTION,
    condition: (error) => {
      if (error instanceof CustomError) {
        return error.code === ErrorCode.VALIDATION_ERROR;
      }
      return false;
    },
    actions: [
      RECOVERY_ACTIONS.userNotification('请检查输入信息并重试'),
      RECOVERY_ACTIONS.errorEscalation('low'),
    ],
    maxAttempts: 1,
    cooldownPeriod: 0,
    priority: 3,
    enabled: true,
  },
  {
    name: 'Authentication Error Recovery',
    type: RecoveryStrategyType.AUTOMATIC_RECOVERY,
    condition: (error) => {
      if (error instanceof ApiError) {
        return error.status === 401;
      }
      return false;
    },
    actions: [
      RECOVERY_ACTIONS.userNotification('登录已过期，请重新登录'),
      {
        type: RecoveryActionType.REDIRECT,
        priority: 1,
        condition: () => true,
        execute: async (context) => {
          logger.info('Redirecting to login', {
            metadata: {
              operation: context.operation,
              userId: context.userContext?.userId,
            },
          });
          // 重定向到登录页面
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          return { redirected: true, url: '/login' };
        },
        description: 'Redirect to login page',
      },
    ],
    maxAttempts: 1,
    cooldownPeriod: 0,
    priority: 4,
    enabled: true,
  },
];

/**
 * 恢复策略管理器
 */
export class RecoveryStrategyManager {
  private strategies: Map<string, RecoveryStrategy> = new Map();
  private activeRecoveries = new Map<string, RecoveryContext>();
  private cooldowns = new Map<string, number>();

  constructor() {
    // 注册默认策略
    RECOVERY_STRATEGIES.forEach(strategy => {
      this.registerStrategy(strategy);
    });
  }

  /**
   * 注册恢复策略
   */
  registerStrategy(strategy: RecoveryStrategy): void {
    this.strategies.set(strategy.name, strategy);
    logger.info('Recovery strategy registered', {
      metadata: {
        name: strategy.name,
        type: strategy.type,
        priority: strategy.priority,
      },
    });
  }

  /**
   * 注销恢复策略
   */
  unregisterStrategy(name: string): boolean {
    return this.strategies.delete(name);
  }

  /**
   * 执行错误恢复
   */
  async recover(
    error: Error,
    operation: string,
    context?: any,
  ): Promise<RecoveryResult> {
    const recoveryContext: RecoveryContext = {
      error,
      operation,
      attempt: 1,
      startTime: Date.now(),
      metadata: context,
      userContext: this.extractUserContext(),
    };

    // 查找适用的策略
    const applicableStrategies = this.findApplicableStrategies(error, context);
    if (applicableStrategies.length === 0) {
      logger.warn('No applicable recovery strategies found', {
        metadata: {
          operation,
          error: error.message,
        },
      });
      return {
        success: false,
        strategy: RecoveryStrategyType.USER_INTERVENTION,
        action: RecoveryActionType.LOG,
        error,
        attempts: 0,
        duration: 0,
        fallbackUsed: false,
      };
    }

    // 按优先级排序
    applicableStrategies.sort((a, b) => a.priority - b.priority);

    // 尝试执行恢复策略
    for (const strategy of applicableStrategies) {
      if (!this.canExecuteStrategy(strategy)) {
        continue;
      }

      try {
        const result = await this.executeStrategy(strategy, recoveryContext);
        if (result.success) {
          return result;
        }
      } catch (strategyError) {
        logger.error('Recovery strategy failed', strategyError instanceof Error ? strategyError : new Error(String(strategyError)), {
          metadata: {
            strategy: strategy.name,
            operation,
            originalError: error.message,
          },
        });
      }
    }

    // 没有找到适用的策略，返回失败结果
    const duration = Date.now() - recoveryContext.startTime;

    logger.error('All recovery strategies failed', error, {
      metadata: {
        operation,
        strategiesAttempted: applicableStrategies.length,
        duration,
      },
    });

    return {
      success: false,
      strategy: RecoveryStrategyType.USER_INTERVENTION,
      action: RecoveryActionType.LOG,
      error,
      attempts: 0,
      duration,
      fallbackUsed: false,
    };
  }

  /**
   * 查找适用的恢复策略
   */
  private findApplicableStrategies(error: Error, context?: any): RecoveryStrategy[] {
    return Array.from(this.strategies.values())
      .filter(strategy => strategy.enabled && strategy.condition(error, context));
  }

  /**
   * 检查是否可以执行策略
   */
  private canExecuteStrategy(strategy: RecoveryStrategy): boolean {
    const cooldownKey = `${strategy.name}_cooldown`;
    const lastExecution = this.cooldowns.get(cooldownKey);

    if (lastExecution && Date.now() - lastExecution < strategy.cooldownPeriod) {
      logger.debug('Strategy in cooldown period', {
        metadata: {
          strategy: strategy.name,
          cooldownRemaining: strategy.cooldownPeriod - (Date.now() - lastExecution),
        },
      });
      return false;
    }

    return true;
  }

  /**
   * 执行恢复策略
   */
  private async executeStrategy(
    strategy: RecoveryStrategy,
    context: RecoveryContext,
  ): Promise<RecoveryResult> {
    const startTime = Date.now();
    const cooldownKey = `${strategy.name}_cooldown`;

    logger.info('Executing recovery strategy', {
      metadata: {
        strategy: strategy.name,
        operation: context.operation,
        attempt: context.attempt,
      },
    });

    // 设置冷却时间
    this.cooldowns.set(cooldownKey, Date.now());

    // 按优先级排序动作
    const sortedActions = [...strategy.actions].sort((a, b) => a.priority - b.priority);

    for (const action of sortedActions) {
      if (!action.condition(context)) {
        continue;
      }

      try {
        const actionResult = await this.executeAction(action, context);
        const duration = Date.now() - startTime;

        logger.info('Recovery action succeeded', {
          metadata: {
            strategy: strategy.name,
            action: action.type,
            operation: context.operation,
            duration,
          },
        });

        return {
          success: true,
          strategy: strategy.type,
          action: action.type,
          data: actionResult,
          attempts: context.attempt,
          duration,
          fallbackUsed: false,
        };
      } catch (actionError) {
        logger.warn('Recovery action failed, trying fallback', {
          metadata: {
            strategy: strategy.name,
            action: action.type,
            error: actionError instanceof Error ? actionError.message : String(actionError),
          },
        });

        // 尝试回退动作
        if (action.fallback) {
          try {
            const fallbackResult = await this.executeAction(action.fallback, context);
            const duration = Date.now() - startTime;

            return {
              success: true,
              strategy: strategy.type,
              action: action.fallback.type,
              data: fallbackResult,
              attempts: context.attempt,
              duration,
              fallbackUsed: true,
            };
          } catch (fallbackError) {
            logger.error('Fallback action also failed', fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError)));
          }
        }
      }
    }

    const duration = Date.now() - startTime;
    return {
      success: false,
      strategy: strategy.type,
      action: RecoveryActionType.LOG,
      error: context.error,
      attempts: context.attempt,
      duration,
      fallbackUsed: false,
    };
  }

  /**
   * 执行恢复动作
   */
  private async executeAction(action: RecoveryAction, context: RecoveryContext): Promise<any> {
    const timeout = action.timeout || 30000; // 默认30秒超时

    return Promise.race([
      action.execute(context),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Action timeout')), timeout),
      ),
    ]);
  }

  /**
   * 提取用户上下文
   */
  private extractUserContext(): any {
    // 这里应该从实际的用户会话中提取信息
    // 暂时返回空对象
    return {};
  }

  /**
   * 获取策略统计信息
   */
  getStrategyStats(): Record<string, any> {
    return {
      totalStrategies: this.strategies.size,
      enabledStrategies: Array.from(this.strategies.values()).filter(s => s.enabled).length,
      activeRecoveries: this.activeRecoveries.size,
      cooldowns: Object.fromEntries(this.cooldowns),
    };
  }

  /**
   * 清理过期的冷却时间
   */
  cleanupCooldowns(): void {
    const now = Date.now();
    for (const [key, timestamp] of this.cooldowns.entries()) {
      const strategy = Array.from(this.strategies.values())
        .find(s => `${s.name}_cooldown` === key);

      if (strategy && now - timestamp > strategy.cooldownPeriod) {
        this.cooldowns.delete(key);
      }
    }
  }
}

/**
 * 辅助函数：获取缓存数据
 */
async function getCachedData(key: string): Promise<any> {
  // 这里应该实现实际的缓存逻辑
  // 暂时返回null表示没有缓存数据
  return null;
}

/**
 * 辅助函数：发送用户通知
 */
async function sendUserNotification(userId: string | undefined, message: string): Promise<void> {
  // 这里应该实现实际的通知逻辑
  logger.info('User notification sent', {
    metadata: { userId, message },
  });
}

/**
 * 辅助函数：错误上报
 */
async function escalateError(
  error: Error,
  severity: 'low' | 'medium' | 'high' | 'critical',
  context: RecoveryContext,
): Promise<void> {
  // 这里应该实现实际的错误上报逻辑
  logger.error('Error escalated', error, {
    metadata: {
      severity,
      operation: context.operation,
      attempt: context.attempt,
    },
  });
}

/**
 * 创建恢复策略管理器
 */
export function createRecoveryStrategyManager(): RecoveryStrategyManager {
  return new RecoveryStrategyManager();
}

/**
 * 恢复装饰器
 */
export function withRecovery<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  operation: string,
  context?: any,
): (...args: T) => Promise<R> {
  const recoveryManager = new RecoveryStrategyManager();

  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      const recoveryResult = await recoveryManager.recover(
        error instanceof Error ? error : new Error(String(error)),
        operation,
        context,
      );

      if (recoveryResult.success) {
        return recoveryResult.data;
      } else {
        throw recoveryResult.error || error;
      }
    }
  };
}

export default RecoveryStrategyManager;
