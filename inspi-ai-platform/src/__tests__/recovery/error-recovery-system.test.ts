/**
 * 错误恢复系统测试套件
 */
import {
  AdvancedRetryManager,
  RecoveryStrategyManager,
  ErrorRecoverySystem,
  RetryStrategyType,
  RecoveryStrategyType,
  DEFAULT_RETRY_CONDITIONS,
  DELAY_CALCULATORS,
  executeWithRecovery
} from '@/lib/recovery';
import { ApiError } from '@/lib/api/client';
import { CustomError } from '@/lib/errors/CustomError';
import { ErrorCode } from '@/lib/errors/types';

// Mock logger
jest.mock('@/lib/logging/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock monitoring
jest.mock('@/lib/monitoring', () => ({
  reportError: jest.fn(),
  monitoringContext: {}
}));

describe('AdvancedRetryManager', () => {
  let retryManager: AdvancedRetryManager;

  beforeEach(() => {
    retryManager = new AdvancedRetryManager();
    jest.clearAllMocks();
  });

  describe('基本重试功能', () => {
    it('应该在成功时不重试', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      
      const result = await retryManager.execute(mockOperation);
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(1);
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('应该在失败时进行重试', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success');
      
      const result = await retryManager.execute(mockOperation, {
        maxRetries: 3,
        retryCondition: DEFAULT_RETRY_CONDITIONS.networkErrors
      });
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(3);
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('应该在达到最大重试次数后失败', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Network error'));
      
      const result = await retryManager.execute(mockOperation, {
        maxRetries: 2,
        retryCondition: DEFAULT_RETRY_CONDITIONS.networkErrors
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.attempts).toBe(3); // 初始尝试 + 2次重试
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });
  });

  describe('重试策略', () => {
    it('应该使用指数退避策略', async () => {
      const delays: number[] = [];
      const mockOperation = jest.fn().mockRejectedValue(new Error('Network error'));
      
      await retryManager.execute(mockOperation, {
        strategy: RetryStrategyType.EXPONENTIAL_BACKOFF,
        maxRetries: 3,
        baseDelay: 100,
        multiplier: 2,
        jitter: false,
        retryCondition: () => true,
        onRetry: (attempt, error, delay) => {
          delays.push(delay);
        }
      });
      
      expect(delays).toEqual([100, 200, 400]); // 100 * 2^0, 100 * 2^1, 100 * 2^2
    });

    it('应该使用线性退避策略', async () => {
      const delays: number[] = [];
      const mockOperation = jest.fn().mockRejectedValue(new Error('Network error'));
      
      await retryManager.execute(mockOperation, {
        strategy: RetryStrategyType.LINEAR_BACKOFF,
        maxRetries: 3,
        baseDelay: 100,
        jitter: false,
        retryCondition: () => true,
        onRetry: (attempt, error, delay) => {
          delays.push(delay);
        }
      });
      
      expect(delays).toEqual([100, 200, 300]); // 100 * 1, 100 * 2, 100 * 3
    });

    it('应该使用固定间隔策略', async () => {
      const delays: number[] = [];
      const mockOperation = jest.fn().mockRejectedValue(new Error('Network error'));
      
      await retryManager.execute(mockOperation, {
        strategy: RetryStrategyType.FIXED_INTERVAL,
        maxRetries: 3,
        baseDelay: 100,
        jitter: false,
        retryCondition: () => true,
        onRetry: (attempt, error, delay) => {
          delays.push(delay);
        }
      });
      
      expect(delays).toEqual([100, 100, 100]); // 固定100ms
    });
  });

  describe('重试条件', () => {
    it('应该对网络错误进行重试', () => {
      const networkError = new ApiError('Network error', 0, 'NETWORK_ERROR');
      expect(DEFAULT_RETRY_CONDITIONS.networkErrors(networkError, 1)).toBe(true);
      expect(DEFAULT_RETRY_CONDITIONS.networkErrors(networkError, 5)).toBe(false);
    });

    it('应该对服务器错误进行重试', () => {
      const serverError = new ApiError('Server error', 500, 'INTERNAL_SERVER_ERROR');
      expect(DEFAULT_RETRY_CONDITIONS.serverErrors(serverError, 1)).toBe(true);
      expect(DEFAULT_RETRY_CONDITIONS.serverErrors(serverError, 3)).toBe(false);
    });

    it('应该对超时错误进行重试', () => {
      const timeoutError = new ApiError('Timeout', 408, 'REQUEST_TIMEOUT');
      expect(DEFAULT_RETRY_CONDITIONS.timeoutErrors(timeoutError, 1)).toBe(true);
      expect(DEFAULT_RETRY_CONDITIONS.timeoutErrors(timeoutError, 4)).toBe(false);
    });

    it('应该对速率限制错误进行重试', () => {
      const rateLimitError = new ApiError('Rate limit', 429, 'RATE_LIMIT_EXCEEDED');
      expect(DEFAULT_RETRY_CONDITIONS.rateLimitErrors(rateLimitError, 1)).toBe(true);
      expect(DEFAULT_RETRY_CONDITIONS.rateLimitErrors(rateLimitError, 6)).toBe(false);
    });
  });

  describe('统计信息', () => {
    it('应该正确记录统计信息', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success');
      
      await retryManager.execute(mockOperation, {
        strategy: RetryStrategyType.EXPONENTIAL_BACKOFF,
        maxRetries: 2,
        retryCondition: () => true
      });
      
      const stats = retryManager.getStats();
      expect(stats.successfulRetries).toBe(1);
      expect(stats.totalAttempts).toBe(2);
      expect(stats.strategyUsage[RetryStrategyType.EXPONENTIAL_BACKOFF]).toBe(1);
    });

    it('应该能够重置统计信息', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      await retryManager.execute(mockOperation);
      
      retryManager.resetStats();
      const stats = retryManager.getStats();
      
      expect(stats.successfulRetries).toBe(0);
      expect(stats.totalAttempts).toBe(0);
    });
  });
});

describe('RecoveryStrategyManager', () => {
  let recoveryManager: RecoveryStrategyManager;

  beforeEach(() => {
    recoveryManager = new RecoveryStrategyManager();
    jest.clearAllMocks();
  });

  describe('策略匹配', () => {
    it('应该为网络错误找到合适的策略', async () => {
      const networkError = new ApiError('Network error', 0, 'NETWORK_ERROR');
      
      const result = await recoveryManager.recover(networkError, 'test-operation');
      
      expect(result.strategy).toBe(RecoveryStrategyType.EXPONENTIAL_BACKOFF);
    });

    it('应该为服务器错误找到合适的策略', async () => {
      const serverError = new ApiError('Server error', 500, 'INTERNAL_SERVER_ERROR');
      
      const result = await recoveryManager.recover(serverError, 'test-operation');
      
      expect(result.strategy).toBe(RecoveryStrategyType.CIRCUIT_BREAKER);
    });

    it('应该为验证错误找到合适的策略', async () => {
      const validationError = new CustomError('Validation failed', ErrorCode.VALIDATION_ERROR);
      
      const result = await recoveryManager.recover(validationError, 'test-operation');
      
      expect(result.strategy).toBe(RecoveryStrategyType.USER_INTERVENTION);
    });

    it('应该为认证错误找到合适的策略', async () => {
      const authError = new ApiError('Unauthorized', 401, 'AUTHENTICATION_ERROR');
      
      const result = await recoveryManager.recover(authError, 'test-operation');
      
      expect(result.strategy).toBe(RecoveryStrategyType.AUTOMATIC_RECOVERY);
    });
  });

  describe('策略管理', () => {
    it('应该能够注册新策略', () => {
      const customStrategy = {
        name: 'Custom Strategy',
        type: RecoveryStrategyType.FALLBACK,
        condition: () => true,
        actions: [],
        maxAttempts: 1,
        cooldownPeriod: 0,
        priority: 10,
        enabled: true
      };
      
      recoveryManager.registerStrategy(customStrategy);
      const stats = recoveryManager.getStrategyStats();
      
      expect(stats.totalStrategies).toBeGreaterThan(4); // 默认策略数量 + 1
    });

    it('应该能够注销策略', () => {
      const result = recoveryManager.unregisterStrategy('Network Error Recovery');
      expect(result).toBe(true);
      
      const stats = recoveryManager.getStrategyStats();
      expect(stats.totalStrategies).toBeLessThan(4); // 少了一个策略
    });
  });

  describe('冷却机制', () => {
    it('应该在冷却期内阻止策略执行', async () => {
      const networkError = new ApiError('Network error', 0, 'NETWORK_ERROR');
      
      // 第一次执行
      await recoveryManager.recover(networkError, 'test-operation');
      
      // 立即第二次执行应该被冷却机制阻止
      const result = await recoveryManager.recover(networkError, 'test-operation');
      
      // 由于冷却机制，应该没有找到可用策略
      expect(result.success).toBe(false);
    });
  });
});

describe('ErrorRecoverySystem', () => {
  let errorRecoverySystem: ErrorRecoverySystem;

  beforeEach(() => {
    errorRecoverySystem = new ErrorRecoverySystem();
    jest.clearAllMocks();
  });

  describe('统一恢复接口', () => {
    it('应该先尝试重试，然后尝试恢复', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Network error'));
      
      try {
        await errorRecoverySystem.executeWithRecovery(
          mockOperation,
          'test-operation',
          { maxRetries: 2 }
        );
      } catch (error) {
        // 预期会失败，因为我们没有实际的恢复逻辑
      }
      
      // 应该尝试了重试（3次：初始 + 2次重试）
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('应该返回系统统计信息', () => {
      const stats = errorRecoverySystem.getSystemStats();
      
      expect(stats).toHaveProperty('retry');
      expect(stats).toHaveProperty('recovery');
      expect(stats.retry).toHaveProperty('totalAttempts');
      expect(stats.recovery).toHaveProperty('totalStrategies');
    });
  });
});

describe('便捷函数', () => {
  describe('executeWithRecovery', () => {
    it('应该使用默认配置执行操作', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      
      const result = await executeWithRecovery(mockOperation, 'test-operation');
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('应该使用自定义配置执行操作', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success');
      
      const result = await executeWithRecovery(mockOperation, 'test-operation', {
        retryConfig: {
          maxRetries: 2,
          retryCondition: () => true
        }
      });
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });
  });
});

describe('延迟计算器', () => {
  describe('DELAY_CALCULATORS', () => {
    it('应该正确计算指数退避延迟', () => {
      expect(DELAY_CALCULATORS.exponentialBackoff(1, 100, 2)).toBe(100);
      expect(DELAY_CALCULATORS.exponentialBackoff(2, 100, 2)).toBe(200);
      expect(DELAY_CALCULATORS.exponentialBackoff(3, 100, 2)).toBe(400);
    });

    it('应该正确计算线性退避延迟', () => {
      expect(DELAY_CALCULATORS.linearBackoff(1, 100)).toBe(100);
      expect(DELAY_CALCULATORS.linearBackoff(2, 100)).toBe(200);
      expect(DELAY_CALCULATORS.linearBackoff(3, 100)).toBe(300);
    });

    it('应该正确计算固定间隔延迟', () => {
      expect(DELAY_CALCULATORS.fixedInterval(1, 100)).toBe(100);
      expect(DELAY_CALCULATORS.fixedInterval(2, 100)).toBe(100);
      expect(DELAY_CALCULATORS.fixedInterval(3, 100)).toBe(100);
    });

    it('应该正确计算斐波那契延迟', () => {
      expect(DELAY_CALCULATORS.fibonacci(1, 100)).toBe(100); // 100 * 1
      expect(DELAY_CALCULATORS.fibonacci(2, 100)).toBe(100); // 100 * 1
      expect(DELAY_CALCULATORS.fibonacci(3, 100)).toBe(200); // 100 * 2
      expect(DELAY_CALCULATORS.fibonacci(4, 100)).toBe(300); // 100 * 3
      expect(DELAY_CALCULATORS.fibonacci(5, 100)).toBe(500); // 100 * 5
    });

    it('应该正确计算带抖动的指数退避延迟', () => {
      // 由于抖动是随机的，我们只能测试范围
      const delay = DELAY_CALCULATORS.exponentialBackoffWithJitter(2, 100, 2, 0.1);
      const expectedBase = 200; // 100 * 2^1
      const jitterRange = expectedBase * 0.1;
      
      expect(delay).toBeGreaterThanOrEqual(expectedBase - jitterRange);
      expect(delay).toBeLessThanOrEqual(expectedBase + jitterRange);
    });
  });
});

describe('集成测试', () => {
  it('应该完整地处理网络错误恢复流程', async () => {
    const mockOperation = jest.fn().mockRejectedValue(new ApiError('Network error', 0, 'NETWORK_ERROR'));
    
    try {
      await executeWithRecovery(mockOperation, 'network-test', {
        retryConfig: {
          maxRetries: 2,
          retryCondition: DEFAULT_RETRY_CONDITIONS.networkErrors
        }
      });
    } catch (error) {
      // 预期会失败
    }
    
    // 应该尝试了重试
    expect(mockOperation).toHaveBeenCalledTimes(3);
  });

  it('应该完整地处理服务器错误恢复流程', async () => {
    const mockOperation = jest.fn().mockRejectedValue(new ApiError('Server error', 500, 'INTERNAL_SERVER_ERROR'));
    
    try {
      await executeWithRecovery(mockOperation, 'server-test', {
        retryConfig: {
          maxRetries: 1,
          retryCondition: DEFAULT_RETRY_CONDITIONS.serverErrors
        }
      });
    } catch (error) {
      // 预期会失败
    }
    
    // 应该尝试了重试
    expect(mockOperation).toHaveBeenCalledTimes(2);
  });
});