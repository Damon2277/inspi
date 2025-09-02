/**
 * 重试策略管理器
 */

import { ExponentialBackoffRetry, ExponentialBackoffConfig, RETRY_STRATEGIES } from './exponentialBackoff';
import { CircuitBreaker, CircuitBreakerConfig, CIRCUIT_BREAKER_CONFIGS } from './circuitBreaker';
import { logger } from '@/lib/logging/logger';

/**
 * 重试策略类型
 */
export type RetryStrategyType = 'fast' | 'standard' | 'conservative' | 'aggressive' | 'custom';

/**
 * 断路器策略类型
 */
export type CircuitBreakerStrategyType = 'fast' | 'standard' | 'conservative' | 'custom';

/**
 * 重试策略配置
 */
export interface RetryPolicyConfig {
  retryStrategy?: RetryStrategyType;
  circuitBreakerStrategy?: CircuitBreakerStrategyType;
  customRetryConfig?: Partial<ExponentialBackoffConfig>;
  customCircuitBreakerConfig?: Partial<CircuitBreakerConfig>;
  enableCircuitBreaker?: boolean;
  enableRetry?: boolean;
  name?: string;
}

/**
 * 重试策略管理器
 */
export class RetryPolicyManager {
  private retryInstances = new Map<string, ExponentialBackoffRetry>();
  private circuitBreakerInstances = new Map<string, CircuitBreaker>();
  private policies = new Map<string, RetryPolicyConfig>();

  /**
   * 注册重试策略
   */
  registerPolicy(name: string, config: RetryPolicyConfig): void {
    this.policies.set(name, { ...config, name });

    // 创建重试实例
    if (config.enableRetry !== false) {
      const retryConfig = this.getRetryConfig(config);
      this.retryInstances.set(name, new ExponentialBackoffRetry(retryConfig));
    }

    // 创建断路器实例
    if (config.enableCircuitBreaker !== false) {
      const circuitBreakerConfig = this.getCircuitBreakerConfig(config);
      this.circuitBreakerInstances.set(name, new CircuitBreaker(circuitBreakerConfig));
    }

    logger.info('Retry policy registered', {
      metadata: {
        name,
        config,
        hasRetry: this.retryInstances.has(name),
        hasCircuitBreaker: this.circuitBreakerInstances.has(name)
      }
    });
  }

  /**
   * 注销重试策略
   */
  unregisterPolicy(name: string): void {
    this.policies.delete(name);
    this.retryInstances.delete(name);
    this.circuitBreakerInstances.delete(name);

    logger.info('Retry policy unregistered', {
      metadata: { name }
    });
  }

  /**
   * 执行带策略的操作
   */
  async executeWithPolicy<T>(
    policyName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const policy = this.policies.get(policyName);
    if (!policy) {
      throw new Error(`Retry policy '${policyName}' not found`);
    }

    const retry = this.retryInstances.get(policyName);
    const circuitBreaker = this.circuitBreakerInstances.get(policyName);

    // 包装操作
    let wrappedOperation = operation;

    // 应用断路器
    if (circuitBreaker) {
      wrappedOperation = () => circuitBreaker.execute(operation);
    }

    // 应用重试
    if (retry) {
      const result = await retry.execute(wrappedOperation);
      if (result.success) {
        return result.data!;
      } else {
        throw result.error!;
      }
    } else {
      return wrappedOperation();
    }
  }

  /**
   * 获取策略指标
   */
  getPolicyMetrics(policyName: string): {
    retry?: any;
    circuitBreaker?: any;
  } {
    const circuitBreaker = this.circuitBreakerInstances.get(policyName);
    
    return {
      circuitBreaker: circuitBreaker?.getMetrics()
    };
  }

  /**
   * 获取所有策略状态
   */
  getAllPoliciesStatus(): Record<string, any> {
    const status: Record<string, any> = {};

    this.policies.forEach((policy, name) => {
      status[name] = {
        config: policy,
        metrics: this.getPolicyMetrics(name)
      };
    });

    return status;
  }

  /**
   * 重置策略
   */
  resetPolicy(policyName: string): void {
    const circuitBreaker = this.circuitBreakerInstances.get(policyName);
    if (circuitBreaker) {
      circuitBreaker.forceReset();
    }

    logger.info('Retry policy reset', {
      metadata: { policyName }
    });
  }

  /**
   * 重置所有策略
   */
  resetAllPolicies(): void {
    this.circuitBreakerInstances.forEach(circuitBreaker => {
      circuitBreaker.forceReset();
    });

    logger.info('All retry policies reset');
  }

  /**
   * 获取重试配置
   */
  private getRetryConfig(policy: RetryPolicyConfig): Partial<ExponentialBackoffConfig> {
    if (policy.customRetryConfig) {
      return policy.customRetryConfig;
    }

    switch (policy.retryStrategy) {
      case 'fast':
        return RETRY_STRATEGIES.FAST;
      case 'conservative':
        return RETRY_STRATEGIES.CONSERVATIVE;
      case 'aggressive':
        return RETRY_STRATEGIES.AGGRESSIVE;
      case 'standard':
      default:
        return RETRY_STRATEGIES.STANDARD;
    }
  }

  /**
   * 获取断路器配置
   */
  private getCircuitBreakerConfig(policy: RetryPolicyConfig): Partial<CircuitBreakerConfig> {
    if (policy.customCircuitBreakerConfig) {
      return policy.customCircuitBreakerConfig;
    }

    switch (policy.circuitBreakerStrategy) {
      case 'fast':
        return CIRCUIT_BREAKER_CONFIGS.FAST;
      case 'conservative':
        return CIRCUIT_BREAKER_CONFIGS.CONSERVATIVE;
      case 'standard':
      default:
        return CIRCUIT_BREAKER_CONFIGS.STANDARD;
    }
  }
}

/**
 * 全局重试策略管理器实例
 */
export const retryPolicyManager = new RetryPolicyManager();

/**
 * 注册默认策略
 */
export function registerDefaultPolicies(): void {
  // API请求策略
  retryPolicyManager.registerPolicy('api', {
    retryStrategy: 'standard',
    circuitBreakerStrategy: 'standard',
    enableRetry: true,
    enableCircuitBreaker: true
  });

  // 数据库操作策略
  retryPolicyManager.registerPolicy('database', {
    retryStrategy: 'conservative',
    circuitBreakerStrategy: 'conservative',
    enableRetry: true,
    enableCircuitBreaker: true
  });

  // 外部服务策略
  retryPolicyManager.registerPolicy('external', {
    retryStrategy: 'aggressive',
    circuitBreakerStrategy: 'fast',
    enableRetry: true,
    enableCircuitBreaker: true
  });

  // 实时操作策略
  retryPolicyManager.registerPolicy('realtime', {
    retryStrategy: 'fast',
    circuitBreakerStrategy: 'fast',
    enableRetry: true,
    enableCircuitBreaker: false
  });

  // 批量操作策略
  retryPolicyManager.registerPolicy('batch', {
    retryStrategy: 'conservative',
    circuitBreakerStrategy: 'conservative',
    enableRetry: true,
    enableCircuitBreaker: true
  });

  logger.info('Default retry policies registered');
}

/**
 * 策略装饰器
 */
export function withRetryPolicy<T extends any[], R>(
  policyName: string,
  fn: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    return retryPolicyManager.executeWithPolicy(policyName, () => fn(...args));
  };
}

/**
 * 创建自定义策略
 */
export function createCustomPolicy(
  name: string,
  retryConfig?: Partial<ExponentialBackoffConfig>,
  circuitBreakerConfig?: Partial<CircuitBreakerConfig>
): void {
  retryPolicyManager.registerPolicy(name, {
    retryStrategy: 'custom',
    circuitBreakerStrategy: 'custom',
    customRetryConfig: retryConfig,
    customCircuitBreakerConfig: circuitBreakerConfig,
    enableRetry: Boolean(retryConfig),
    enableCircuitBreaker: Boolean(circuitBreakerConfig)
  });
}

// 自动注册默认策略
if (typeof window !== 'undefined' || typeof global !== 'undefined') {
  registerDefaultPolicies();
}

export default retryPolicyManager;