/**
 * 断路器模式实现
 */

import { logger } from '@/lib/logging/logger';
import { reportError } from '@/lib/monitoring';

/**
 * 断路器状态
 */
export enum CircuitBreakerState {
  CLOSED = 'closed',     // 正常状态，允许请求通过
  OPEN = 'open',         // 断路状态，拒绝所有请求
  HALF_OPEN = 'half_open' // 半开状态，允许少量请求测试服务恢复
}

/**
 * 断路器配置接口
 */
export interface CircuitBreakerConfig {
  failureThreshold: number;      // 失败阈值
  recoveryTimeout: number;       // 恢复超时时间（毫秒）
  monitoringPeriod: number;      // 监控周期（毫秒）
  halfOpenMaxCalls: number;      // 半开状态最大调用次数
  volumeThreshold: number;       // 最小请求量阈值
  errorThresholdPercentage: number; // 错误率阈值（百分比）
  onStateChange?: (from: CircuitBreakerState, to: CircuitBreakerState) => void;
  onCallSuccess?: (duration: number) => void;
  onCallFailure?: (error: Error, duration: number) => void;
  onCircuitOpen?: (metrics: CircuitBreakerMetrics) => void;
  onCircuitClose?: (metrics: CircuitBreakerMetrics) => void;
}

/**
 * 断路器指标接口
 */
export interface CircuitBreakerMetrics {
  totalCalls: number;
  successCalls: number;
  failureCalls: number;
  errorRate: number;
  averageResponseTime: number;
  lastFailureTime: number;
  state: CircuitBreakerState;
  stateChangedAt: number;
}

/**
 * 调用记录接口
 */
interface CallRecord {
  timestamp: number;
  success: boolean;
  duration: number;
  error?: Error;
}

/**
 * 断路器实现
 */
export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private halfOpenCalls = 0;
  private lastFailureTime = 0;
  private stateChangedAt = Date.now();
  private callHistory: CallRecord[] = [];
  private config: Required<CircuitBreakerConfig>;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = {
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1分钟
      monitoringPeriod: 10000, // 10秒
      halfOpenMaxCalls: 3,
      volumeThreshold: 10,
      errorThresholdPercentage: 50,
      onStateChange: () => {},
      onCallSuccess: () => {},
      onCallFailure: () => {},
      onCircuitOpen: () => {},
      onCircuitClose: () => {},
      ...config
    };

    // 定期清理历史记录
    setInterval(() => {
      this.cleanupHistory();
    }, this.config.monitoringPeriod);
  }

  /**
   * 执行操作
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // 检查断路器状态
    this.checkState();

    if (this.state === CircuitBreakerState.OPEN) {
      const error = new Error(
        `Circuit breaker is OPEN. Service calls are blocked for ${
          Math.ceil((this.config.recoveryTimeout - (Date.now() - this.lastFailureTime)) / 1000)
        } more seconds.`
      );
      
      logger.warn('Circuit breaker blocked call', {
        metadata: {
          state: this.state,
          failureCount: this.failureCount,
          lastFailureTime: this.lastFailureTime,
          metrics: this.getMetrics()
        }
      });

      throw error;
    }

    if (this.state === CircuitBreakerState.HALF_OPEN && 
        this.halfOpenCalls >= this.config.halfOpenMaxCalls) {
      throw new Error('Circuit breaker is HALF_OPEN and max calls limit reached.');
    }

    const startTime = Date.now();

    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      
      this.onCallSuccess(duration);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const err = error instanceof Error ? error : new Error(String(error));
      
      this.onCallFailure(err, duration);
      throw error;
    }
  }

  /**
   * 成功调用处理
   */
  private onCallSuccess(duration: number): void {
    this.recordCall(true, duration);
    this.successCount++;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.halfOpenCalls++;
      
      // 如果半开状态下的测试调用都成功，关闭断路器
      if (this.halfOpenCalls >= this.config.halfOpenMaxCalls) {
        this.changeState(CircuitBreakerState.CLOSED);
        this.reset();
      }
    }

    // 调用成功回调
    this.config.onCallSuccess(duration);

    logger.debug('Circuit breaker call succeeded', {
      metadata: {
        duration,
        state: this.state,
        successCount: this.successCount,
        halfOpenCalls: this.halfOpenCalls
      }
    });
  }

  /**
   * 失败调用处理
   */
  private onCallFailure(error: Error, duration: number): void {
    this.recordCall(false, duration, error);
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      // 半开状态下失败，立即打开断路器
      this.changeState(CircuitBreakerState.OPEN);
    } else if (this.state === CircuitBreakerState.CLOSED) {
      // 检查是否需要打开断路器
      const metrics = this.getMetrics();
      
      if (this.shouldOpenCircuit(metrics)) {
        this.changeState(CircuitBreakerState.OPEN);
        this.config.onCircuitOpen(metrics);
      }
    }

    // 调用失败回调
    this.config.onCallFailure(error, duration);

    logger.warn('Circuit breaker call failed', {
      metadata: {
        error: error.message,
        duration,
        state: this.state,
        failureCount: this.failureCount,
        metrics: this.getMetrics()
      }
    });
  }

  /**
   * 检查是否应该打开断路器
   */
  private shouldOpenCircuit(metrics: CircuitBreakerMetrics): boolean {
    // 检查失败次数阈值
    if (this.failureCount >= this.config.failureThreshold) {
      return true;
    }

    // 检查请求量和错误率
    if (metrics.totalCalls >= this.config.volumeThreshold &&
        metrics.errorRate >= this.config.errorThresholdPercentage) {
      return true;
    }

    return false;
  }

  /**
   * 检查断路器状态
   */
  private checkState(): void {
    if (this.state === CircuitBreakerState.OPEN && this.shouldAttemptReset()) {
      this.changeState(CircuitBreakerState.HALF_OPEN);
      this.halfOpenCalls = 0;
    }
  }

  /**
   * 是否应该尝试重置
   */
  private shouldAttemptReset(): boolean {
    return Date.now() - this.lastFailureTime >= this.config.recoveryTimeout;
  }

  /**
   * 改变状态
   */
  private changeState(newState: CircuitBreakerState): void {
    const oldState = this.state;
    this.state = newState;
    this.stateChangedAt = Date.now();

    logger.info('Circuit breaker state changed', {
      metadata: {
        from: oldState,
        to: newState,
        metrics: this.getMetrics()
      }
    });

    // 调用状态变化回调
    this.config.onStateChange(oldState, newState);

    // 报告状态变化
    if (newState === CircuitBreakerState.OPEN) {
      reportError(new Error('Circuit breaker opened'), {
        tags: {
          circuit_breaker: 'true',
          state_change: `${oldState}_to_${newState}`
        },
        extra: {
          metrics: this.getMetrics(),
          config: this.config
        }
      });
    }
  }

  /**
   * 记录调用
   */
  private recordCall(success: boolean, duration: number, error?: Error): void {
    this.callHistory.push({
      timestamp: Date.now(),
      success,
      duration,
      error
    });

    // 限制历史记录大小
    if (this.callHistory.length > 1000) {
      this.callHistory = this.callHistory.slice(-500);
    }
  }

  /**
   * 清理历史记录
   */
  private cleanupHistory(): void {
    const cutoff = Date.now() - this.config.monitoringPeriod;
    this.callHistory = this.callHistory.filter(record => record.timestamp > cutoff);
  }

  /**
   * 重置断路器
   */
  private reset(): void {
    this.failureCount = 0;
    this.successCount = 0;
    this.halfOpenCalls = 0;
    this.lastFailureTime = 0;
  }

  /**
   * 获取指标
   */
  getMetrics(): CircuitBreakerMetrics {
    const recentCalls = this.callHistory.filter(
      record => record.timestamp > Date.now() - this.config.monitoringPeriod
    );

    const totalCalls = recentCalls.length;
    const successCalls = recentCalls.filter(record => record.success).length;
    const failureCalls = totalCalls - successCalls;
    const errorRate = totalCalls > 0 ? (failureCalls / totalCalls) * 100 : 0;
    
    const totalDuration = recentCalls.reduce((sum, record) => sum + record.duration, 0);
    const averageResponseTime = totalCalls > 0 ? totalDuration / totalCalls : 0;

    return {
      totalCalls,
      successCalls,
      failureCalls,
      errorRate,
      averageResponseTime,
      lastFailureTime: this.lastFailureTime,
      state: this.state,
      stateChangedAt: this.stateChangedAt
    };
  }

  /**
   * 获取状态
   */
  getState(): CircuitBreakerState {
    return this.state;
  }

  /**
   * 手动打开断路器
   */
  open(): void {
    this.changeState(CircuitBreakerState.OPEN);
    this.lastFailureTime = Date.now();
  }

  /**
   * 手动关闭断路器
   */
  close(): void {
    this.changeState(CircuitBreakerState.CLOSED);
    this.reset();
  }

  /**
   * 手动设置为半开状态
   */
  halfOpen(): void {
    this.changeState(CircuitBreakerState.HALF_OPEN);
    this.halfOpenCalls = 0;
  }

  /**
   * 强制重置
   */
  forceReset(): void {
    this.changeState(CircuitBreakerState.CLOSED);
    this.reset();
    this.callHistory = [];
  }
}

/**
 * 创建断路器
 */
export function createCircuitBreaker(
  config?: Partial<CircuitBreakerConfig>
): CircuitBreaker {
  return new CircuitBreaker(config);
}

/**
 * 断路器装饰器
 */
export function withCircuitBreaker<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  config?: Partial<CircuitBreakerConfig>
): (...args: T) => Promise<R> {
  const circuitBreaker = new CircuitBreaker(config);

  return async (...args: T): Promise<R> => {
    return circuitBreaker.execute(() => fn(...args));
  };
}

/**
 * 预定义的断路器配置
 */
export const CIRCUIT_BREAKER_CONFIGS = {
  /**
   * 快速断路器 - 用于实时服务
   */
  FAST: {
    failureThreshold: 3,
    recoveryTimeout: 30000, // 30秒
    monitoringPeriod: 5000,  // 5秒
    halfOpenMaxCalls: 2,
    volumeThreshold: 5,
    errorThresholdPercentage: 30
  },

  /**
   * 标准断路器 - 通用场景
   */
  STANDARD: {
    failureThreshold: 5,
    recoveryTimeout: 60000, // 1分钟
    monitoringPeriod: 10000, // 10秒
    halfOpenMaxCalls: 3,
    volumeThreshold: 10,
    errorThresholdPercentage: 50
  },

  /**
   * 保守断路器 - 关键服务
   */
  CONSERVATIVE: {
    failureThreshold: 10,
    recoveryTimeout: 300000, // 5分钟
    monitoringPeriod: 30000,  // 30秒
    halfOpenMaxCalls: 5,
    volumeThreshold: 20,
    errorThresholdPercentage: 70
  }
} as const;

export default CircuitBreaker;