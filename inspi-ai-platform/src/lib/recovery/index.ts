/**
 * 错误恢复系统入口
 */

// 高级重试管理器
export {
  AdvancedRetryManager,
  createAdvancedRetryManager,
  withAdvancedRetry,
  RetryStrategyType,
  DEFAULT_RETRY_CONDITIONS,
  DELAY_CALCULATORS
} from './advanced-retry';

export type {
  AdvancedRetryConfig,
  RetryResult,
  RetryStats,
  RetryConditionFn,
  DelayCalculatorFn
} from './advanced-retry';

// 恢复策略管理器
export {
  RecoveryStrategyManager,
  createRecoveryStrategyManager,
  withRecovery,
  RecoveryStrategyType,
  RecoveryActionType,
  RECOVERY_ACTIONS,
  RECOVERY_STRATEGIES
} from './recovery-strategies';

export type {
  RecoveryContext,
  RecoveryAction,
  RecoveryStrategy,
  RecoveryResult
} from './recovery-strategies';

// 创建默认实例
import { createAdvancedRetryManager } from './advanced-retry';
import { createRecoveryStrategyManager } from './recovery-strategies';

/**
 * 默认高级重试管理器实例
 */
export const defaultRetryManager = createAdvancedRetryManager();

/**
 * 默认恢复策略管理器实例
 */
export const defaultRecoveryManager = createRecoveryStrategyManager();

/**
 * 统一的错误恢复接口
 */
export class ErrorRecoverySystem {
  constructor(
    private retryManager = defaultRetryManager,
    private recoveryManager = defaultRecoveryManager
  ) {}

  /**
   * 执行带重试和恢复的操作
   */
  async executeWithRecovery<T>(
    operation: () => Promise<T>,
    operationName: string,
    retryConfig?: Partial<import('./advanced-retry').AdvancedRetryConfig>,
    recoveryContext?: any
  ): Promise<T> {
    try {
      const result = await this.retryManager.execute(operation, retryConfig);
      if (result.success) {
        return result.data!;
      } else {
        throw result.error!;
      }
    } catch (error) {
      // 尝试恢复
      const recoveryResult = await this.recoveryManager.recover(
        error instanceof Error ? error : new Error(String(error)),
        operationName,
        recoveryContext
      );

      if (recoveryResult.success) {
        return recoveryResult.data;
      } else {
        throw recoveryResult.error || error;
      }
    }
  }

  /**
   * 获取系统统计信息
   */
  getSystemStats() {
    return {
      retry: this.retryManager.getStats(),
      recovery: this.recoveryManager.getStrategyStats()
    };
  }

  /**
   * 重置系统统计信息
   */
  resetSystemStats() {
    this.retryManager.resetStats();
    // 恢复管理器没有重置方法，可以考虑添加
  }
}

/**
 * 默认错误恢复系统实例
 */
export const defaultErrorRecoverySystem = new ErrorRecoverySystem();

/**
 * 便捷的错误恢复函数
 */
export async function executeWithRecovery<T>(
  operation: () => Promise<T>,
  operationName: string,
  options?: {
    retryConfig?: Partial<import('./advanced-retry').AdvancedRetryConfig>;
    recoveryContext?: any;
  }
): Promise<T> {
  return defaultErrorRecoverySystem.executeWithRecovery(
    operation,
    operationName,
    options?.retryConfig,
    options?.recoveryContext
  );
}