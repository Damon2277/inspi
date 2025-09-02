import { ApiClient, ApiError } from '@/lib/api/client';
import { RetryManager, CircuitBreaker, DEFAULT_RETRY_STRATEGY } from '@/lib/api/retry';
import {
  createSuccessResponse,
  createErrorResponse,
  createValidationErrorResponse,
  parsePaginationParams
} from '@/lib/api/responses';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { describe } from 'node:test';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { describe } from 'node:test';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// 模拟fetch
global.fetch = jest.fn();

// 模拟日志记录器
jest.mock('@/lib/logging/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn()
  }
}));

// 模拟监控系统
jest.mock('@/lib/monitoring', () => ({
  reportError: jest.fn(),
  monitoringContext: {
    setRequest: jest.fn(),
    getCurrentContext: jest.fn(() => ({ request: { startTime: Date.now() } }))
  }
}));

describe('API错误处理系统测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  describe('ApiClient', () => {
    let apiClient: ApiClient;

    beforeEach(() => {
      apiClient = new ApiClient({
        baseURL: 'https://api.example.com',
        timeout: 5000,
        retries: 2
      });
    });

    it('应该成功处理GET请求', async () => {
      const mockResponse = {
        success: true,
        data: { id: 1, name: 'Test' }
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => mockResponse
      });

      const result = await apiClient.get('/users/1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 1, name: 'Test' });
      expect(fetch).toHaveBeenCalledWith(
        'https://api.example.com/users/1',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          })
        })
      );
    });

    it('应该成功处理POST请求', async () => {
      const requestData = { name: 'New User', email: 'user@example.com' };
      const mockResponse = {
        success: true,
        data: { id: 2, ...requestData }
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => mockResponse
      });

      const result = await apiClient.post('/users', requestData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 2, ...requestData });
      expect(fetch).toHaveBeenCalledWith(
        'https://api.example.com/users',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestData)
        })
      );
    });

    it('应该处理API错误响应', async () => {
      const errorResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '验证失败',
          timestamp: new Date().toISOString(),
          traceId: 'trace-123'
        }
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => errorResponse
      });

      await expect(apiClient.get('/users/invalid')).rejects.toThrow(ApiError);
      
      try {
        await apiClient.get('/users/invalid');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(400);
        expect((error as ApiError).message).toBe('验证失败');
        expect((error as ApiError).code).toBe('VALIDATION_ERROR');
      }
    });

    it('应该处理网络错误', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new TypeError('fetch failed'));

      await expect(apiClient.get('/users')).rejects.toThrow(ApiError);
      
      try {
        await apiClient.get('/users');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).isNetworkError()).toBe(true);
        expect((error as ApiError).isRetryable()).toBe(true);
      }
    });

    it('应该处理超时', async () => {
      // 模拟超时情况
      (fetch as jest.Mock).mockImplementationOnce(() => 
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 50);
        })
      );

      const shortTimeoutClient = new ApiClient({ timeout: 100 });
      
      await expect(shortTimeoutClient.get('/users')).rejects.toThrow();
    });
  });

  describe('RetryManager', () => {
    let retryManager: RetryManager;

    beforeEach(() => {
      retryManager = new RetryManager({
        ...DEFAULT_RETRY_STRATEGY,
        maxRetries: 2,
        baseDelay: 10 // 快速测试
      });
    });

    it('应该在成功时不重试', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');

      const result = await retryManager.execute(mockOperation);

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(1);
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('应该在失败时重试', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new ApiError('Network error', 0, 'NETWORK_ERROR'))
        .mockRejectedValueOnce(new ApiError('Network error', 0, 'NETWORK_ERROR'))
        .mockResolvedValueOnce('success');

      const result = await retryManager.execute(mockOperation);

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(3);
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('应该在达到最大重试次数后失败', async () => {
      const mockError = new ApiError('Persistent error', 500, 'SERVER_ERROR');
      const mockOperation = jest.fn().mockRejectedValue(mockError);

      const result = await retryManager.execute(mockOperation);

      expect(result.success).toBe(false);
      expect(result.error).toBe(mockError);
      expect(result.attempts).toBe(3); // 1 + 2 retries
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('应该根据重试条件决定是否重试', async () => {
      const clientError = new ApiError('Client error', 400, 'CLIENT_ERROR');
      const mockOperation = jest.fn().mockRejectedValue(clientError);

      // 客户端错误不应该重试
      const result = await retryManager.execute(mockOperation);

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1);
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });
  });

  describe('CircuitBreaker', () => {
    let circuitBreaker: CircuitBreaker;

    beforeEach(() => {
      circuitBreaker = new CircuitBreaker({
        failureThreshold: 2,
        recoveryTimeout: 100,
        halfOpenMaxCalls: 1
      });
    });

    it('应该在正常情况下执行操作', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');

      const result = await circuitBreaker.execute(mockOperation);

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('应该在失败次数达到阈值时打开断路器', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Service error'));

      // 第一次失败
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow();
      expect(circuitBreaker.getState()).toBe('closed');

      // 第二次失败，应该打开断路器
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow();
      expect(circuitBreaker.getState()).toBe('open');

      // 第三次调用应该直接被断路器拒绝
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow(ApiError);
      expect(mockOperation).toHaveBeenCalledTimes(2); // 第三次没有实际调用
    });

    it('应该在恢复时间后尝试半开状态', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValueOnce('recovered');

      // 触发断路器打开
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow();
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow();
      expect(circuitBreaker.getState()).toBe('open');

      // 等待恢复时间
      await new Promise(resolve => setTimeout(resolve, 150));

      // 现在应该尝试半开状态
      const result = await circuitBreaker.execute(mockOperation);
      expect(result).toBe('recovered');
      expect(circuitBreaker.getState()).toBe('closed');
    });
  });

  describe('API响应工具', () => {
    it('应该创建成功响应', async () => {
      const data = { id: 1, name: 'Test' };
      const response = createSuccessResponse(data);

      expect(response.status).toBe(200);
      
      // 解析响应体
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.data).toEqual(data);
      expect(responseData.meta).toBeDefined();
      expect(responseData.meta.timestamp).toBeDefined();
      expect(responseData.meta.version).toBeDefined();
      expect(responseData.meta.requestId).toBeDefined();
    });

    it('应该创建错误响应', async () => {
      const error = new Error('Test error');
      const response = createErrorResponse(error, 400);

      expect(response.status).toBe(400);
      
      // 解析响应体
      const responseData = await response.json();
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBeDefined();
      expect(responseData.error.message).toBe('Test error');
      expect(responseData.error.timestamp).toBeDefined();
      expect(responseData.error.traceId).toBeDefined();
    });

    it('应该创建验证错误响应', async () => {
      const response = createValidationErrorResponse('字段验证失败', 'email');

      expect(response.status).toBe(400);
      
      // 解析响应体
      const responseData = await response.json();
      expect(responseData.success).toBe(false);
      expect(responseData.error.message).toBe('字段验证失败');
      expect(responseData.error.field).toBe('email');
    });

    it('应该解析分页参数', () => {
      const searchParams = new URLSearchParams('page=2&limit=20');
      const { page, limit, offset } = parsePaginationParams(searchParams);

      expect(page).toBe(2);
      expect(limit).toBe(20);
      expect(offset).toBe(20);
    });

    it('应该使用默认分页参数', () => {
      const searchParams = new URLSearchParams();
      const { page, limit, offset } = parsePaginationParams(searchParams);

      expect(page).toBe(1);
      expect(limit).toBe(10);
      expect(offset).toBe(0);
    });

    it('应该限制分页参数范围', () => {
      const searchParams = new URLSearchParams('page=0&limit=1000');
      const { page, limit } = parsePaginationParams(searchParams);

      expect(page).toBe(1); // 最小值为1
      expect(limit).toBe(100); // 最大值为100
    });
  });

  describe('ApiError', () => {
    it('应该正确识别错误类型', () => {
      const clientError = new ApiError('Client error', 400);
      const serverError = new ApiError('Server error', 500);
      const networkError = new ApiError('Network error', 0, 'NETWORK_ERROR');

      expect(clientError.isClientError()).toBe(true);
      expect(clientError.isServerError()).toBe(false);
      expect(clientError.isNetworkError()).toBe(false);

      expect(serverError.isClientError()).toBe(false);
      expect(serverError.isServerError()).toBe(true);
      expect(serverError.isNetworkError()).toBe(false);

      expect(networkError.isClientError()).toBe(false);
      expect(networkError.isServerError()).toBe(false);
      expect(networkError.isNetworkError()).toBe(true);
    });

    it('应该正确判断是否可重试', () => {
      const clientError = new ApiError('Client error', 400);
      const serverError = new ApiError('Server error', 500);
      const networkError = new ApiError('Network error', 0, 'NETWORK_ERROR');
      const timeoutError = new ApiError('Timeout', 408);
      const rateLimitError = new ApiError('Rate limit', 429);

      expect(clientError.isRetryable()).toBe(false);
      expect(serverError.isRetryable()).toBe(true);
      expect(networkError.isRetryable()).toBe(true);
      expect(timeoutError.isRetryable()).toBe(true);
      expect(rateLimitError.isRetryable()).toBe(true);
    });
  });
});