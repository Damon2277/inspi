/**
 * API重试机制
 */

import { logger } from '@/lib/logging/logger';
import { ErrorCode } from '@/shared/errors/types';

import { ApiError } from './client';

/**
 * 重试策略接口
 */
export interface RetryStrategy {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  jitter: boolean;
  retryCondition: (error: ApiError, attempt: number) => boolean;
}

/**
 * 重试结果接口
 */
export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  attempts: number;
  totalDuration: number;
}

/**
 * 默认重试策略
 */
export const DEFAULT_RETRY_STRATEGY: RetryStrategy = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2,
  jitter: true,
  retryCondition: (error: ApiError, attempt: number) => {
    // 只对特定错误进行重试
    return error.isRetryable() && attempt < 3;
  },
};

/**
 * 指数退避重试策略
 */
export const EXPONENTIAL_BACKOFF_STRATEGY: RetryStrategy = {
  maxRetries: 5,
  baseDelay: 500,
  maxDelay: 60000,
  backoffFactor: 2,
  jitter: true,
  retryCondition: (error: ApiError, attempt: number) => {
    // 网络错误和服务器错误可重试
    return (error.isNetworkError() || error.isServerError()) && attempt < 5;
  },
};

/**
 * 线性重试策略
 */
export const LINEAR_RETRY_STRATEGY: RetryStrategy = {
  maxRetries: 3,
  baseDelay: 2000,
  maxDelay: 10000,
  backoffFactor: 1,
  jitter: false,
  retryCondition: (error: ApiError, attempt: number) => {
    // 只对5xx错误重试
    return error.isServerError() && attempt < 3;
  },
};

/**
 * 快速重试策略（用于实时操作）
 */
export const FAST_RETRY_STRATEGY: RetryStrategy = {
  maxRetries: 2,
  baseDelay: 100,
  maxDelay: 1000,
  backoffFactor: 2,
  jitter: true,
  retryCondition: (error: ApiError, attempt: number) => {
    // 只对网络错误快速重试
    return error.isNetworkError() && attempt < 2;
  },
};

/**
 * 重试管理器
 */
export class RetryManager {
  private strategy: RetryStrategy;

  constructor(strategy: RetryStrategy = DEFAULT_RETRY_STRATEGY) {
    this.strategy = strategy;
  }

  /**
   * 执行带重试的操作
   */
  async execute<T>(
    operation: () => Promise<T>,
    customStrategy?: Partial<RetryStrategy>,
  ): Promise<RetryResult<T>> {
    const strategy = { ...this.strategy, ...customStrategy };
    const startTime = Date.now();
    let lastError: ApiError;
    let attempts = 0;

    for (let attempt = 0; attempt <= strategy.maxRetries; attempt++) {
      attempts = attempt + 1;

      try {
        if (attempt > 0) {
          // 计算延迟时间
          const delay = this.calculateDelay(attempt, strategy);

          logger.info('Retrying operation', {
            metadata: {
              attempt,
              maxRetries: strategy.maxRetries,
              delay,
              lastError: lastError?.message,
            },
          });

          await this.delay(delay);
        }

        const result = await operation();

        return {
          success: true,
          data: result,
          attempts,
          totalDuration: Date.now() - startTime,
        };
      } catch (error) {
        lastError = error instanceof ApiError ? error : new ApiError(
          error instanceof Error ? error.message : 'Unknown error',
          0,
        );

        // 检查是否应该重试
        if (!strategy.retryCondition(lastError, attempt)) {
          break;
        }
      }
    }

    return {
      success: false,
      error: lastError!,
      attempts,
      totalDuration: Date.now() - startTime,
    };
  }

  /**
   * 计算延迟时间
   */
  private calculateDelay(attempt: number, strategy: RetryStrategy): number {
    let delay: number;

    if (strategy.backoffFactor === 1) {
      // 线性退避
      delay = strategy.baseDelay * attempt;
    } else {
      // 指数退避
      delay = strategy.baseDelay * Math.pow(strategy.backoffFactor, attempt - 1);
    }

    // 应用最大延迟限制
    delay = Math.min(delay, strategy.maxDelay);

    // 添加抖动
    if (strategy.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }

    return Math.floor(delay);
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 更新重试策略
   */
  updateStrategy(strategy: Partial<RetryStrategy>): void {
    this.strategy = { ...this.strategy, ...strategy };
  }

  /**
   * 获取当前策略
   */
  getStrategy(): RetryStrategy {
    return { ...this.strategy };
  }
}

/**
 * 断路器状态
 */
export enum CircuitBreakerState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open'
}

/**
 * 断路器配置
 */
export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
  halfOpenMaxCalls: number;
}

/**
 * 断路器
 */
export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;
  private halfOpenCalls = 0;
  private config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = {
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1分钟
      monitoringPeriod: 10000, // 10秒
      halfOpenMaxCalls: 3,
      ...config,
    };
  }

  /**
   * 执行操作
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitBreakerState.HALF_OPEN;
        this.halfOpenCalls = 0;
      } else {
        throw new ApiError(
          '服务暂时不可用，请稍后重试',
          503,
          ErrorCode.CIRCUIT_BREAKER_OPEN,
        );
      }
    }

    if (this.state === CircuitBreakerState.HALF_OPEN &&
        this.halfOpenCalls >= this.config.halfOpenMaxCalls) {
      throw new ApiError(
        '服务正在恢复中，请稍后重试',
        503,
        ErrorCode.CIRCUIT_BREAKER_HALF_OPEN_LIMIT,
      );
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * 成功回调
   */
  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.halfOpenCalls++;

      if (this.halfOpenCalls >= this.config.halfOpenMaxCalls) {
        this.state = CircuitBreakerState.CLOSED;
        this.halfOpenCalls = 0;
      }
    }
  }

  /**
   * 失败回调
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.state = CircuitBreakerState.OPEN;
      this.halfOpenCalls = 0;
    } else if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitBreakerState.OPEN;
    }
  }

  /**
   * 是否应该尝试重置
   */
  private shouldAttemptReset(): boolean {
    return Date.now() - this.lastFailureTime >= this.config.recoveryTimeout;
  }

  /**
   * 获取状态
   */
  getState(): CircuitBreakerState {
    return this.state;
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      halfOpenCalls: this.halfOpenCalls,
    };
  }

  /**
   * 重置断路器
   */
  reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.halfOpenCalls = 0;
  }
}

/**
 * 创建重试管理器
 */
export function createRetryManager(strategy?: RetryStrategy): RetryManager {
  return new RetryManager(strategy);
}

/**
 * 创建断路器
 */
export function createCircuitBreaker(config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
  return new CircuitBreaker(config);
}

/**
 * 重试装饰器
 */
export function withRetry<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  strategy?: Partial<RetryStrategy>,
): (...args: T) => Promise<R> {
  const retryManager = new RetryManager({ ...DEFAULT_RETRY_STRATEGY, ...strategy });

  return async (...args: T): Promise<R> => {
    const result = await retryManager.execute(() => fn(...args));

    if (result.success) {
      return result.data!;
    }

    if (result.error instanceof Error) {
      throw result.error;
    }

    throw new Error(String(result.error));
  };
}

/**
 * 断路器装饰器
 */
export function withCircuitBreaker<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  config?: Partial<CircuitBreakerConfig>,
): (...args: T) => Promise<R> {
  const circuitBreaker = new CircuitBreaker(config);

  return async (...args: T): Promise<R> => {
    return circuitBreaker.execute(() => fn(...args));
  };
}

export default {
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
};
