/**
 * 高级重试策略管理器
 */
import { logger } from '@/lib/logging/logger';
import { ApiError } from '@/lib/api/client';
import { reportError, monitoringContext } from '@/lib/monitoring';

/**
 * 重试策略类型
 */
export enum RetryStrategyType {
  EXPONENTIAL_BACKOFF = 'exponential_backoff',
  LINEAR_BACKOFF = 'linear_backoff',
  FIXED_INTERVAL = 'fixed_interval',
  FIBONACCI = 'fibonacci',
  CUSTOM = 'custom'
}

/**
 * 重试条件函数类型
 */
export type RetryConditionFn = (error: Error, attempt: number, context?: any) => boolean;

/**
 * 延迟计算函数类型
 */
export type DelayCalculatorFn = (attempt: number, baseDelay: number, context?: any) => number;

/**
 * 高级重试配置
 */
export interface AdvancedRetryConfig {
  strategy: RetryStrategyType;
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  multiplier: number;
  jitter: boolean;
  jitterFactor: number;
  retryCondition: RetryConditionFn;
  delayCalculator?: DelayCalculatorFn;
  onRetry?: (attempt: number, error: Error, delay: number) => void;
  onSuccess?: (attempt: number, duration: number) => void;
  onFailure?: (error: Error, attempts: number, duration: number) => void;
  context?: any;
}

/**
 * 重试结果
 */
export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalDuration: number;
  strategy: RetryStrategyType;
}

/**
 * 重试统计信息
 */
export interface RetryStats {
  totalAttempts: number;
  successfulRetries: number;
  failedRetries: number;
  averageAttempts: number;
  averageDuration: number;
  strategyUsage: Record<RetryStrategyType, number>;
}

/**
 * 默认重试条件
 */
export const DEFAULT_RETRY_CONDITIONS = {
  /**
   * 网络错误重试条件
   */
  networkErrors: (error: Error, attempt: number): boolean => {
    if (error instanceof ApiError) {
      return error.isNetworkError() && attempt < 5;
    }
    return error.message.toLowerCase().includes('network') && attempt < 3;
  },

  /**
   * 服务器错误重试条件
   */
  serverErrors: (error: Error, attempt: number): boolean => {
    if (error instanceof ApiError) {
      return error.isServerError() && attempt < 3;
    }
    return false;
  },

  /**
   * 超时错误重试条件
   */
  timeoutErrors: (error: Error, attempt: number): boolean => {
    if (error instanceof ApiError) {
      return error.status === 408 && attempt < 4;
    }
    return error.message.toLowerCase().includes('timeout') && attempt < 4;
  },

  /**
   * 速率限制重试条件
   */
  rateLimitErrors: (error: Error, attempt: number): boolean => {
    if (error instanceof ApiError) {
      return error.status === 429 && attempt < 6;
    }
    return false;
  },

  /**
   * 组合重试条件
   */
  combined: (error: Error, attempt: number): boolean => {
    return DEFAULT_RETRY_CONDITIONS.networkErrors(error, attempt) ||
           DEFAULT_RETRY_CONDITIONS.serverErrors(error, attempt) ||
           DEFAULT_RETRY_CONDITIONS.timeoutErrors(error, attempt) ||
           DEFAULT_RETRY_CONDITIONS.rateLimitErrors(error, attempt);
  }
};

/**
 * 延迟计算器
 */
export const DELAY_CALCULATORS = {
  /**
   * 指数退避
   */
  exponentialBackoff: (attempt: number, baseDelay: number, multiplier: number = 2): number => {
    return baseDelay * Math.pow(multiplier, attempt - 1);
  },

  /**
   * 线性退避
   */
  linearBackoff: (attempt: number, baseDelay: number): number => {
    return baseDelay * attempt;
  },

  /**
   * 固定间隔
   */
  fixedInterval: (attempt: number, baseDelay: number): number => {
    return baseDelay;
  },

  /**
   * 斐波那契退避
   */
  fibonacci: (attempt: number, baseDelay: number): number => {
    const fib = (n: number): number => {
      if (n <= 0) return 0;
      if (n === 1) return 1;
      return fib(n - 1) + fib(n - 2);
    };
    return baseDelay * Math.max(1, fib(attempt));
  },

  /**
   * 带抖动的指数退避
   */
  exponentialBackoffWithJitter: (
    attempt: number, 
    baseDelay: number, 
    multiplier: number = 2, 
    jitterFactor: number = 0.1
  ): number => {
    const delay = baseDelay * Math.pow(multiplier, attempt - 1);
    const jitter = delay * jitterFactor * (Math.random() * 2 - 1);
    return Math.max(0, delay + jitter);
  }
};

/**
 * 高级重试管理器
 */
export class AdvancedRetryManager {
  private stats: RetryStats = {
    totalAttempts: 0,
    successfulRetries: 0,
    failedRetries: 0,
    averageAttempts: 0,
    averageDuration: 0,
    strategyUsage: {} as Record<RetryStrategyType, number>
  };
  private activeRetries = new Map<string, AbortController>();

  /**
   * 执行带重试的操作
   */
  async execute<T>(
    operation: () => Promise<T>,
    config: Partial<AdvancedRetryConfig> = {}
  ): Promise<RetryResult<T>> {
    const fullConfig = this.buildConfig(config);
    const operationId = this.generateOperationId();
    const startTime = Date.now();

    // 创建取消控制器
    const abortController = new AbortController();
    this.activeRetries.set(operationId, abortController);

    try {
      const result = await this.executeWithRetry(operation, fullConfig, operationId, abortController.signal);
      // 更新统计信息
      this.updateStats(result, fullConfig.strategy);
      return result;
    } finally {
      this.activeRetries.delete(operationId);
    }
  }

  /**
   * 取消重试操作
   */
  cancelRetry(operationId: string): boolean {
    const controller = this.activeRetries.get(operationId);
    if (controller) {
      controller.abort();
      this.activeRetries.delete(operationId);
      return true;
    }
    return false;
  }

  /**
   * 取消所有重试操作
   */
  cancelAllRetries(): void {
    this.activeRetries.forEach(controller => controller.abort());
    this.activeRetries.clear();
  }

  /**
   * 获取统计信息
   */
  getStats(): RetryStats {
    return { ...this.stats };
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats = {
      totalAttempts: 0,
      successfulRetries: 0,
      failedRetries: 0,
      averageAttempts: 0,
      averageDuration: 0,
      strategyUsage: {} as Record<RetryStrategyType, number>
    };
  }

  /**
   * 执行重试逻辑
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: AdvancedRetryConfig,
    operationId: string,
    signal: AbortSignal
  ): Promise<RetryResult<T>> {
    const startTime = Date.now();
    let lastError: Error;
    let attempts = 0;

    for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
      attempts = attempt;

      // 检查是否被取消
      if (signal.aborted) {
        throw new Error('Operation was cancelled');
      }

      try {
        // 如果不是第一次尝试，等待延迟
        if (attempt > 1) {
          const delay = this.calculateDelay(attempt - 1, config);
          
          // 调用重试回调
          if (config.onRetry) {
            config.onRetry(attempt - 1, lastError!, delay);
          }

          // 记录重试日志
          logger.info('Retrying operation', {
            metadata: {
              operationId,
              attempt: attempt - 1,
              maxRetries: config.maxRetries,
              delay,
              strategy: config.strategy,
              lastError: lastError!.message
            }
          });

          // 等待延迟
          await this.delay(delay, signal);
        }

        // 执行操作
        const result = await operation();
        const duration = Date.now() - startTime;

        // 调用成功回调
        if (config.onSuccess) {
          config.onSuccess(attempts, duration);
        }

        // 记录成功日志
        if (attempts > 1) {
          logger.info('Operation succeeded after retry', {
            metadata: {
              operationId,
              attempts,
              duration,
              strategy: config.strategy
            }
          });
        }

        return {
          success: true,
          data: result,
          attempts,
          totalDuration: duration,
          strategy: config.strategy
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // 检查是否应该重试
        if (attempt <= config.maxRetries && config.retryCondition(lastError, attempt, config.context)) {
          continue;
        }
        
        // 不再重试，返回失败结果
        break;
      }
    }

    const duration = Date.now() - startTime;

    // 调用失败回调
    if (config.onFailure) {
      config.onFailure(lastError!, attempts, duration);
    }

    // 记录失败日志
    logger.error('Operation failed after all retries', lastError!, {
      metadata: {
        operationId,
        attempts,
        maxRetries: config.maxRetries,
        duration,
        strategy: config.strategy
      }
    });

    // 报告错误到监控系统
    reportError(lastError!, {
      tags: {
        retry_failed: 'true',
        attempts: attempts.toString(),
        strategy: config.strategy
      },
      extra: {
        operationId,
        duration,
        maxRetries: config.maxRetries
      }
    });

    return {
      success: false,
      error: lastError!,
      attempts,
      totalDuration: duration,
      strategy: config.strategy
    };
  }

  /**
   * 构建完整配置
   */
  private buildConfig(config: Partial<AdvancedRetryConfig>): AdvancedRetryConfig {
    return {
      strategy: RetryStrategyType.EXPONENTIAL_BACKOFF,
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      multiplier: 2,
      jitter: true,
      jitterFactor: 0.1,
      retryCondition: DEFAULT_RETRY_CONDITIONS.combined,
      ...config
    };
  }

  /**
   * 计算延迟时间
   */
  private calculateDelay(attempt: number, config: AdvancedRetryConfig): number {
    let delay: number;

    if (config.delayCalculator) {
      delay = config.delayCalculator(attempt, config.baseDelay, config.context);
    } else {
      switch (config.strategy) {
        case RetryStrategyType.EXPONENTIAL_BACKOFF:
          delay = DELAY_CALCULATORS.exponentialBackoff(attempt, config.baseDelay, config.multiplier);
          break;
        case RetryStrategyType.LINEAR_BACKOFF:
          delay = DELAY_CALCULATORS.linearBackoff(attempt, config.baseDelay);
          break;
        case RetryStrategyType.FIXED_INTERVAL:
          delay = DELAY_CALCULATORS.fixedInterval(attempt, config.baseDelay);
          break;
        case RetryStrategyType.FIBONACCI:
          delay = DELAY_CALCULATORS.fibonacci(attempt, config.baseDelay);
          break;
        default:
          delay = DELAY_CALCULATORS.exponentialBackoff(attempt, config.baseDelay, config.multiplier);
      }
    }

    // 应用抖动
    if (config.jitter) {
      delay = DELAY_CALCULATORS.exponentialBackoffWithJitter(
        attempt, 
        config.baseDelay, 
        config.multiplier, 
        config.jitterFactor
      );
    }

    // 应用最大延迟限制
    return Math.min(delay, config.maxDelay);
  }

  /**
   * 延迟函数（支持取消）
   */
  private delay(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(resolve, ms);
      signal.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        reject(new Error('Delay was cancelled'));
      });
    });
  }

  /**
   * 生成操作ID
   */
  private generateOperationId(): string {
    return `retry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 更新统计信息
   */
  private updateStats(result: RetryResult<any>, strategy: RetryStrategyType): void {
    this.stats.totalAttempts += result.attempts;
    if (result.success) {
      this.stats.successfulRetries++;
    } else {
      this.stats.failedRetries++;
    }

    // 更新策略使用统计
    this.stats.strategyUsage[strategy] = (this.stats.strategyUsage[strategy] || 0) + 1;

    // 计算平均值
    const totalOperations = this.stats.successfulRetries + this.stats.failedRetries;
    this.stats.averageAttempts = this.stats.totalAttempts / totalOperations;
  }
}

/**
 * 创建高级重试管理器
 */
export function createAdvancedRetryManager(): AdvancedRetryManager {
  return new AdvancedRetryManager();
}

/**
 * 高级重试装饰器
 */
export function withAdvancedRetry<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  config?: Partial<AdvancedRetryConfig>
): (...args: T) => Promise<R> {
  const retryManager = new AdvancedRetryManager();
  
  return async (...args: T): Promise<R> => {
    const result = await retryManager.execute(() => fn(...args), config);
    if (result.success) {
      return result.data!;
    } else {
      throw result.error!;
    }
  };
}

export default AdvancedRetryManager;