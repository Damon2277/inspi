/**
 * 指数退避重试系统
 */

import { logger } from '@/lib/logging/logger';
import { reportError } from '@/lib/monitoring';

/**
 * 指数退避配置接口
 */
export interface ExponentialBackoffConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  jitter: boolean;
  retryCondition?: (error: Error, attempt: number) => boolean;
  onRetry?: (attempt: number, delay: number, error: Error) => void;
  onSuccess?: (attempt: number, totalDuration: number) => void;
  onFailure?: (error: Error, totalAttempts: number, totalDuration: number) => void;
}

/**
 * 重试结果接口
 */
export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalDuration: number;
  retryDelays: number[];
}

/**
 * 默认重试条件
 */
export const DEFAULT_RETRY_CONDITION = (error: Error, attempt: number): boolean => {
  // 网络错误、超时错误、服务器错误可重试
  const retryableErrors = [
    'NetworkError',
    'TimeoutError',
    'ECONNREFUSED',
    'ENOTFOUND',
    'ETIMEDOUT',
    'ECONNRESET',
  ];

  const errorMessage = error.message || error.toString();
  const isRetryableError = retryableErrors.some(pattern =>
    errorMessage.includes(pattern),
  );

  // HTTP 5xx错误也可重试
  const isServerError = error.message.includes('5') && error.message.includes('0');

  return (isRetryableError || isServerError) && attempt < 5;
};

/**
 * 指数退避重试器
 */
export class ExponentialBackoffRetry {
  private config: Required<ExponentialBackoffConfig>;

  constructor(config: Partial<ExponentialBackoffConfig> = {}) {
    this.config = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffFactor: 2,
      jitter: true,
      retryCondition: DEFAULT_RETRY_CONDITION,
      onRetry: () => {},
      onSuccess: () => {},
      onFailure: () => {},
      ...config,
    };
  }

  /**
   * 执行带重试的操作
   */
  async execute<T>(operation: () => Promise<T>): Promise<RetryResult<T>> {
    const startTime = Date.now();
    const retryDelays: number[] = [];
    let lastError: Error;
    let attempts = 0;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      attempts = attempt + 1;

      try {
        if (attempt > 0) {
          const delay = this.calculateDelay(attempt);
          retryDelays.push(delay);

          logger.info('Exponential backoff retry', {
            metadata: {
              attempt,
              maxRetries: this.config.maxRetries,
              delay,
              lastError: lastError?.message,
            },
          });

          // 调用重试回调
          this.config.onRetry(attempt, delay, lastError!);

          // 等待延迟
          await this.delay(delay);
        }

        // 执行操作
        const result = await operation();
        const totalDuration = Date.now() - startTime;

        // 调用成功回调
        this.config.onSuccess(attempts, totalDuration);

        return {
          success: true,
          data: result,
          attempts,
          totalDuration,
          retryDelays,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // 检查是否应该重试
        if (!this.config.retryCondition(lastError, attempt)) {
          break;
        }
      }
    }

    const totalDuration = Date.now() - startTime;

    // 调用失败回调
    this.config.onFailure(lastError!, attempts, totalDuration);

    // 报告最终失败
    reportError(lastError!, {
      tags: {
        retry_failed: 'true',
        total_attempts: attempts.toString(),
        total_duration: totalDuration.toString(),
      },
      extra: {
        retryDelays,
        config: this.config,
      },
    });

    return {
      success: false,
      error: lastError!,
      attempts,
      totalDuration,
      retryDelays,
    };
  }

  /**
   * 计算延迟时间
   */
  private calculateDelay(attempt: number): number {
    // 指数退避计算
    let delay = this.config.baseDelay * Math.pow(this.config.backoffFactor, attempt - 1);

    // 应用最大延迟限制
    delay = Math.min(delay, this.config.maxDelay);

    // 添加抖动
    if (this.config.jitter) {
      // 使用全抖动：delay * random(0, 1)
      delay = delay * Math.random();
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
   * 更新配置
   */
  updateConfig(config: Partial<ExponentialBackoffConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取当前配置
   */
  getConfig(): ExponentialBackoffConfig {
    return { ...this.config };
  }
}

/**
 * 预定义的重试策略
 */
export const RETRY_STRATEGIES = {
  /**
   * 快速重试策略 - 用于实时操作
   */
  FAST: {
    maxRetries: 2,
    baseDelay: 100,
    maxDelay: 1000,
    backoffFactor: 2,
    jitter: true,
  },

  /**
   * 标准重试策略 - 通用场景
   */
  STANDARD: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
    jitter: true,
  },

  /**
   * 保守重试策略 - 重要操作
   */
  CONSERVATIVE: {
    maxRetries: 5,
    baseDelay: 2000,
    maxDelay: 30000,
    backoffFactor: 1.5,
    jitter: true,
  },

  /**
   * 激进重试策略 - 网络不稳定环境
   */
  AGGRESSIVE: {
    maxRetries: 7,
    baseDelay: 500,
    maxDelay: 60000,
    backoffFactor: 2.5,
    jitter: true,
  },
} as const;

/**
 * 创建指数退避重试器
 */
export function createExponentialBackoffRetry(
  config?: Partial<ExponentialBackoffConfig>,
): ExponentialBackoffRetry {
  return new ExponentialBackoffRetry(config);
}

/**
 * 指数退避装饰器
 */
export function withExponentialBackoff<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  config?: Partial<ExponentialBackoffConfig>,
): (...args: T) => Promise<R> {
  const retry = new ExponentialBackoffRetry(config);

  return async (...args: T): Promise<R> => {
    const result = await retry.execute(() => fn(...args));

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
 * 批量重试操作
 */
export async function retryBatch<T>(
  operations: Array<() => Promise<T>>,
  config?: Partial<ExponentialBackoffConfig>,
): Promise<Array<RetryResult<T>>> {
  const retry = new ExponentialBackoffRetry(config);

  return Promise.all(
    operations.map(operation => retry.execute(operation)),
  );
}

/**
 * 条件重试 - 只有满足条件时才重试
 */
export function createConditionalRetry(
  condition: (error: Error, attempt: number) => boolean,
  config?: Partial<ExponentialBackoffConfig>,
): ExponentialBackoffRetry {
  return new ExponentialBackoffRetry({
    ...config,
    retryCondition: condition,
  });
}

/**
 * 网络错误重试器
 */
export const networkRetry = createConditionalRetry(
  (error: Error) => {
    const networkErrors = ['NetworkError', 'fetch', 'ECONNREFUSED', 'ENOTFOUND'];
    return networkErrors.some(pattern =>
      error.message.toLowerCase().includes(pattern.toLowerCase()),
    );
  },
  RETRY_STRATEGIES.FAST,
);

/**
 * 服务器错误重试器
 */
export const serverErrorRetry = createConditionalRetry(
  (error: Error) => {
    return error.message.includes('5') && error.message.includes('0');
  },
  RETRY_STRATEGIES.STANDARD,
);

/**
 * 超时错误重试器
 */
export const timeoutRetry = createConditionalRetry(
  (error: Error) => {
    const timeoutErrors = ['timeout', 'ETIMEDOUT', 'AbortError'];
    return timeoutErrors.some(pattern =>
      error.message.toLowerCase().includes(pattern.toLowerCase()),
    );
  },
  RETRY_STRATEGIES.CONSERVATIVE,
);

export default ExponentialBackoffRetry;
