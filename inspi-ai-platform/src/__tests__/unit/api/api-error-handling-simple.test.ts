/**
 * API错误处理系统测试 - 简化版本
 * 测试基本的API错误处理逻辑
 */

// 简单的API错误类
class ApiError extends Error {
  constructor(
    message: string,
    public status: number = 0,
    public code?: string,
    public details?: any,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  isServerError(): boolean {
    return this.status >= 500 && this.status < 600;
  }

  isNetworkError(): boolean {
    return this.status === 0 || this.code === 'NETWORK_ERROR';
  }

  isRetryable(): boolean {
    // 客户端错误通常不可重试
    if (this.isClientError()) {
      // 除了这些特殊情况
      return this.status === 408 || this.status === 429;
    }

    // 服务器错误和网络错误可以重试
    return this.isServerError() || this.isNetworkError();
  }
}

// 简单的API客户端
class ApiClient {
  constructor(private config: { baseURL: string; timeout?: number; retries?: number }) {}

  async get(path: string): Promise<{ success: boolean; data?: any; error?: any }> {
    try {
      const response = await fetch(`${this.config.baseURL}${path}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new ApiError(
          errorData.error?.message || 'API Error',
          response.status,
          errorData.error?.code,
        );
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Network Error', 0, 'NETWORK_ERROR');
    }
  }

  async post(path: string, data: any): Promise<{ success: boolean; data?: any; error?: any }> {
    try {
      const response = await fetch(`${this.config.baseURL}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new ApiError(
          errorData.error?.message || 'API Error',
          response.status,
          errorData.error?.code,
        );
      }

      const responseData = await response.json();
      return { success: true, data: responseData };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Network Error', 0, 'NETWORK_ERROR');
    }
  }
}

// 简单的重试管理器
class RetryManager {
  constructor(private config: { maxRetries: number; baseDelay: number }) {}

  async execute<T>(operation: () => Promise<T>): Promise<{
    success: boolean
    data?: T
    error?: Error
    attempts: number
  }> {
    let attempts = 0;
    let lastError: Error;

    while (attempts <= this.config.maxRetries) {
      attempts++;

      try {
        const result = await operation();
        return { success: true, data: result, attempts };
      } catch (error) {
        lastError = error as Error;

        // 如果是不可重试的错误，直接返回
        if (error instanceof ApiError && !error.isRetryable()) {
          break;
        }

        // 如果还有重试机会，等待后重试
        if (attempts <= this.config.maxRetries) {
          await this.delay(this.config.baseDelay * Math.pow(2, attempts - 1));
        }
      }
    }

    return { success: false, error: lastError!, attempts };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 简单的断路器
class CircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount = 0;
  private lastFailureTime = 0;

  constructor(private config: {
    failureThreshold: number
    recoveryTimeout: number
    halfOpenMaxCalls: number
  }) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.config.recoveryTimeout) {
        this.state = 'half-open';
      } else {
        throw new ApiError('Circuit breaker is open', 503, 'CIRCUIT_BREAKER_OPEN');
      }
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

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'closed';
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'open';
    }
  }

  getState(): string {
    return this.state;
  }
}

// 响应工具函数
function createSuccessResponse(data: any): Response {
  const responseData = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      requestId: Math.random().toString(36).substr(2, 9),
    },
  };

  return new Response(JSON.stringify(responseData), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function createErrorResponse(error: Error, status: number = 500): Response {
  const responseData = {
    success: false,
    error: {
      message: error.message,
      timestamp: new Date().toISOString(),
      traceId: Math.random().toString(36).substr(2, 9),
    },
  };

  return new Response(JSON.stringify(responseData), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function createValidationErrorResponse(message: string, field?: string): Response {
  const responseData = {
    success: false,
    error: {
      message,
      field,
      code: 'VALIDATION_ERROR',
      timestamp: new Date().toISOString(),
      traceId: Math.random().toString(36).substr(2, 9),
    },
  };

  return new Response(JSON.stringify(responseData), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
}

function parsePaginationParams(searchParams: URLSearchParams): {
  page: number
  limit: number
  offset: number
} {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

// 模拟fetch
global.fetch = jest.fn();

describe('API错误处理系统测试', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(fetch as jest.Mock).mockClear();
  });

  describe('ApiClient', () => {
    let apiClient: ApiClient;

    beforeEach(() => {
      apiClient = new ApiClient({
        baseURL: 'https://api.example.com',
        timeout: 5000,
        retries: 2,
      });
    });

    it('应该成功处理GET请求', async () => {
      const mockResponse = {
        success: true,
        data: { id: 1, name: 'Test' },
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => mockResponse,
      });

      const result = await apiClient.get('/users/1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ success: true, data: { id: 1, name: 'Test' } });
    });

    it('应该处理API错误响应', async () => {
      const errorResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '验证失败',
        },
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => errorResponse,
      });

      await expect(apiClient.get('/users/invalid')).rejects.toThrow(ApiError);
    });

    it('应该处理网络错误', async () => {
      ;(fetch as jest.Mock).mockRejectedValueOnce(new TypeError('fetch failed'));

      await expect(apiClient.get('/users')).rejects.toThrow(ApiError);
    });
  });

  describe('RetryManager', () => {
    let retryManager: RetryManager;

    beforeEach(() => {
      retryManager = new RetryManager({
        maxRetries: 2,
        baseDelay: 10,
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
      expect(result.attempts).toBe(3);
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('应该根据重试条件决定是否重试', async () => {
      const clientError = new ApiError('Client error', 400, 'CLIENT_ERROR');
      const mockOperation = jest.fn().mockRejectedValue(clientError);

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
        halfOpenMaxCalls: 1,
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

      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow();
      expect(circuitBreaker.getState()).toBe('closed');

      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow();
      expect(circuitBreaker.getState()).toBe('open');

      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow(ApiError);
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it('应该在恢复时间后尝试半开状态', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValueOnce('recovered');

      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow();
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow();
      expect(circuitBreaker.getState()).toBe('open');

      await new Promise(resolve => setTimeout(resolve, 150));

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

      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.data).toEqual(data);
      expect(responseData.meta).toBeDefined();
    });

    it('应该创建错误响应', async () => {
      const error = new Error('Test error');
      const response = createErrorResponse(error, 400);

      expect(response.status).toBe(400);

      const responseData = await response.json();
      expect(responseData.success).toBe(false);
      expect(responseData.error.message).toBe('Test error');
    });

    it('应该解析分页参数', () => {
      const searchParams = new URLSearchParams('page=2&limit=20');
      const { page, limit, offset } = parsePaginationParams(searchParams);

      expect(page).toBe(2);
      expect(limit).toBe(20);
      expect(offset).toBe(20);
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
