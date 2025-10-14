/**
 * useErrorHandler Hook 测试
 * 测试错误处理、恢复机制和用户体验优化
 */

import { renderHook, act } from '@testing-library/react';

import {
  useErrorHandler,
  useGlobalErrorHandler,
  useApiErrorHandler,
  useRetryHandler,
  formatError,
  getUserFriendlyMessage,
  isNetworkError,
  isApiError,
  AppError,
  ApiError,
  NetworkError,
} from '@/shared/hooks/useErrorHandler';

// Mock console methods
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation();
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();

// Mock navigator
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

describe('useErrorHandler Hook Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('基础错误处理功能', () => {
    it('应该初始化为无错误状态', () => {
      const { result } = renderHook(() => useErrorHandler());

      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.hasError).toBe(false);
    });

    it('应该处理字符串错误', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.handleError('Something went wrong');
      });

      expect(result.current.error).toEqual({
        message: 'Something went wrong',
        timestamp: expect.any(Date),
      });
      expect(result.current.hasError).toBe(true);
    });

    it('应该处理Error对象', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = new Error('Test error');

      act(() => {
        result.current.handleError(error);
      });

      expect(result.current.error).toEqual({
        message: 'Test error',
        details: error.stack,
        timestamp: expect.any(Date),
      });
    });

    it('应该处理AppError对象', () => {
      const { result } = renderHook(() => useErrorHandler());
      const appError: AppError = {
        message: 'App error',
        code: 'APP_001',
        status: 400,
      };

      act(() => {
        result.current.handleError(appError);
      });

      expect(result.current.error).toEqual({
        ...appError,
        timestamp: expect.any(Date),
      });
    });

    it('应该清除错误状态', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.handleError('Test error');
      });

      expect(result.current.hasError).toBe(true);

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.hasError).toBe(false);
    });
  });

  describe('错误日志记录', () => {
    it('应该默认记录错误日志', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.handleError('Test error', 'test context');
      });

      expect(mockConsoleError).toHaveBeenCalledWith(
        '[ErrorHandler - test context]:',
        expect.objectContaining({
          message: 'Test error',
        }),
      );
    });

    it('应该支持禁用错误日志', () => {
      const { result } = renderHook(() =>
        useErrorHandler({ logError: false }),
      );

      act(() => {
        result.current.handleError('Test error');
      });

      expect(mockConsoleError).not.toHaveBeenCalled();
    });

    it('应该在日志中包含上下文信息', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.handleError('Test error', 'API call');
      });

      expect(mockConsoleError).toHaveBeenCalledWith(
        '[ErrorHandler - API call]:',
        expect.any(Object),
      );
    });
  });

  describe('重试功能', () => {
    it('应该支持重试操作', async () => {
      const { result } = renderHook(() =>
        useErrorHandler({ retryable: true }),
      );

      const mockRetryFn = jest.fn().mockResolvedValue('success');

      await act(async () => {
        const retryResult = await result.current.retry(mockRetryFn);
        expect(retryResult).toBe('success');
      });

      expect(mockRetryFn).toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    it('应该处理重试失败', async () => {
      const { result } = renderHook(() =>
        useErrorHandler({ retryable: true }),
      );

      const mockRetryFn = jest.fn().mockRejectedValue(new Error('Retry failed'));

      await act(async () => {
        const retryResult = await result.current.retry(mockRetryFn);
        expect(retryResult).toBeNull();
      });

      expect(result.current.hasError).toBe(true);
      expect(result.current.error?.message).toBe('Retry failed');
    });

    it('应该在非重试模式下警告', async () => {
      const { result } = renderHook(() =>
        useErrorHandler({ retryable: false }),
      );

      const mockRetryFn = jest.fn();

      await act(async () => {
        await result.current.retry(mockRetryFn);
      });

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        'Retry attempted on non-retryable error handler',
      );
    });

    it('应该在重试时设置加载状态', async () => {
      const { result } = renderHook(() =>
        useErrorHandler({ retryable: true }),
      );

      const mockRetryFn = jest.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve('success'), 100)),
      );

      act(() => {
        result.current.retry(mockRetryFn);
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        jest.advanceTimersByTime(100);
        await Promise.resolve(); // 等待Promise解析
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('配置选项测试', () => {
    it('应该支持自定义配置', () => {
      const config = {
        showToast: true,
        logError: false,
        retryable: true,
        fallbackMessage: 'Custom fallback',
      };

      const { result } = renderHook(() => useErrorHandler(config));

      act(() => {
        result.current.handleError('Test error');
      });

      // 验证日志被禁用
      expect(mockConsoleError).not.toHaveBeenCalled();
    });
  });
});

describe('useGlobalErrorHandler Hook Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('全局错误管理', () => {
    it('应该初始化为空错误列表', () => {
      const { result } = renderHook(() => useGlobalErrorHandler());

      expect(result.current.globalErrors).toEqual([]);
      expect(result.current.hasGlobalErrors).toBe(false);
    });

    it('应该添加全局错误', () => {
      const { result } = renderHook(() => useGlobalErrorHandler());
      const error: AppError = {
        message: 'Global error',
        code: 'GLOBAL_001',
      };

      act(() => {
        result.current.addGlobalError(error);
      });

      expect(result.current.globalErrors).toContain(error);
      expect(result.current.hasGlobalErrors).toBe(true);
    });

    it('应该移除特定错误', () => {
      const { result } = renderHook(() => useGlobalErrorHandler());
      const error1: AppError = { message: 'Error 1' };
      const error2: AppError = { message: 'Error 2' };

      act(() => {
        result.current.addGlobalError(error1);
        result.current.addGlobalError(error2);
      });

      expect(result.current.globalErrors).toHaveLength(2);

      act(() => {
        result.current.removeGlobalError(error1);
      });

      expect(result.current.globalErrors).toHaveLength(1);
      expect(result.current.globalErrors).toContain(error2);
    });

    it('应该清除所有错误', () => {
      const { result } = renderHook(() => useGlobalErrorHandler());

      act(() => {
        result.current.addGlobalError({ message: 'Error 1' });
        result.current.addGlobalError({ message: 'Error 2' });
      });

      expect(result.current.globalErrors).toHaveLength(2);

      act(() => {
        result.current.clearAllErrors();
      });

      expect(result.current.globalErrors).toEqual([]);
      expect(result.current.hasGlobalErrors).toBe(false);
    });

    it('应该自动清除错误（5秒后）', () => {
      const { result } = renderHook(() => useGlobalErrorHandler());
      const error: AppError = { message: 'Auto clear error' };

      act(() => {
        result.current.addGlobalError(error);
      });

      expect(result.current.globalErrors).toContain(error);

      // 快进5秒
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(result.current.globalErrors).not.toContain(error);
    });
  });
});

describe('useApiErrorHandler Hook Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(navigator, 'onLine', { value: true });
  });

  describe('API错误处理', () => {
    it('应该处理HTTP响应错误', () => {
      const { result } = renderHook(() => useApiErrorHandler());
      const httpError = {
        response: {
          status: 400,
          data: {
            message: 'Bad Request',
            code: 'INVALID_INPUT',
          },
        },
      };

      act(() => {
        result.current.handleApiError(httpError, '/api/users', 'POST');
      });

      const expectedError: ApiError = {
        message: 'Bad Request',
        code: 'INVALID_INPUT',
        status: 400,
        endpoint: '/api/users',
        method: 'POST',
        details: httpError.response.data,
        timestamp: expect.any(Date),
      };

      expect(result.current.error).toEqual(expectedError);
    });

    it('应该处理网络请求错误', () => {
      const { result } = renderHook(() => useApiErrorHandler());
      const networkError = {
        request: {},
        message: 'Network Error',
      };

      act(() => {
        result.current.handleApiError(networkError, '/api/data', 'GET');
      });

      const expectedError: NetworkError = {
        message: '网络连接失败，请检查网络设置',
        code: 'NETWORK_ERROR',
        isNetworkError: true,
        isOffline: false,
        endpoint: '/api/data',
        method: 'GET',
        timestamp: expect.any(Date),
      };

      expect(result.current.error).toEqual(expectedError);
    });

    it('应该处理离线状态', () => {
      Object.defineProperty(navigator, 'onLine', { value: false });

      const { result } = renderHook(() => useApiErrorHandler());
      const networkError = {
        request: {},
        message: 'Network Error',
      };

      act(() => {
        result.current.handleApiError(networkError, '/api/data', 'GET');
      });

      expect(result.current.error).toEqual(
        expect.objectContaining({
          isOffline: true,
        }),
      );
    });

    it('应该处理未知错误', () => {
      const { result } = renderHook(() => useApiErrorHandler());
      const unknownError = {
        message: 'Unknown error',
      };

      act(() => {
        result.current.handleApiError(unknownError, '/api/test', 'PUT');
      });

      expect(result.current.error).toEqual({
        message: 'Unknown error',
        code: 'UNKNOWN_ERROR',
        endpoint: '/api/test',
        method: 'PUT',
        details: unknownError,
        timestamp: expect.any(Date),
      });
    });

    it('应该处理网络离线错误', () => {
      const { result } = renderHook(() => useApiErrorHandler());

      act(() => {
        result.current.handleNetworkError();
      });

      const expectedError: NetworkError = {
        message: '网络连接已断开，请检查网络设置',
        code: 'NETWORK_OFFLINE',
        isNetworkError: true,
        isOffline: true,
        timestamp: expect.any(Date),
      };

      expect(result.current.error).toEqual(expectedError);
    });
  });
});

describe('useRetryHandler Hook Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('重试机制', () => {
    it('应该初始化重试状态', () => {
      const { result } = renderHook(() => useRetryHandler(3, 1000));

      expect(result.current.retryCount).toBe(0);
      expect(result.current.isRetrying).toBe(false);
      expect(result.current.canRetry).toBe(true);
    });

    it('应该成功执行操作', async () => {
      const { result } = renderHook(() => useRetryHandler(3, 1000));
      const mockOperation = jest.fn().mockResolvedValue('success');

      await act(async () => {
        const operationResult = await result.current.executeWithRetry(mockOperation);
        expect(operationResult).toBe('success');
      });

      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(result.current.retryCount).toBe(0);
      expect(result.current.isRetrying).toBe(false);
    });

    it('应该重试失败的操作', async () => {
      const { result } = renderHook(() => useRetryHandler(3, 100));
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('Attempt 1 failed'))
        .mockRejectedValueOnce(new Error('Attempt 2 failed'))
        .mockResolvedValueOnce('success');

      await act(async () => {
        const promise = result.current.executeWithRetry(mockOperation);

        // 快进重试延迟
        jest.advanceTimersByTime(100);
        await Promise.resolve();
        jest.advanceTimersByTime(200); // 指数退避：100 * 2^1
        await Promise.resolve();

        const operationResult = await promise;
        expect(operationResult).toBe('success');
      });

      expect(mockOperation).toHaveBeenCalledTimes(3);
      expect(result.current.retryCount).toBe(0); // 成功后重置
    });

    it('应该在达到最大重试次数后抛出错误', async () => {
      const { result } = renderHook(() => useRetryHandler(2, 100));
      const mockOperation = jest.fn().mockRejectedValue(new Error('Always fails'));

      await act(async () => {
        const promise = result.current.executeWithRetry(mockOperation);

        // 快进所有重试延迟
        jest.advanceTimersByTime(100); // 第一次重试
        await Promise.resolve();
        jest.advanceTimersByTime(200); // 第二次重试
        await Promise.resolve();

        await expect(promise).rejects.toThrow('Always fails');
      });

      expect(mockOperation).toHaveBeenCalledTimes(3); // 初始 + 2次重试
      expect(result.current.isRetrying).toBe(false);
    });

    it('应该调用错误回调', async () => {
      const { result } = renderHook(() => useRetryHandler(2, 100));
      const mockOperation = jest.fn().mockRejectedValue(new Error('Test error'));
      const mockOnError = jest.fn();

      await act(async () => {
        const promise = result.current.executeWithRetry(mockOperation, mockOnError);

        jest.advanceTimersByTime(100);
        await Promise.resolve();
        jest.advanceTimersByTime(200);
        await Promise.resolve();

        await expect(promise).rejects.toThrow('Test error');
      });

      expect(mockOnError).toHaveBeenCalledTimes(3);
      expect(mockOnError).toHaveBeenNthCalledWith(1, expect.any(Error), 1);
      expect(mockOnError).toHaveBeenNthCalledWith(2, expect.any(Error), 2);
      expect(mockOnError).toHaveBeenNthCalledWith(3, expect.any(Error), 3);
    });

    it('应该重置重试状态', () => {
      const { result } = renderHook(() => useRetryHandler(3, 1000));

      // 模拟一些重试
      act(() => {
        result.current.executeWithRetry(jest.fn().mockRejectedValue(new Error()));
      });

      act(() => {
        result.current.resetRetry();
      });

      expect(result.current.retryCount).toBe(0);
      expect(result.current.isRetrying).toBe(false);
    });

    it('应该使用指数退避延迟', async () => {
      const { result } = renderHook(() => useRetryHandler(3, 100));
      const mockOperation = jest.fn().mockRejectedValue(new Error('Always fails'));

      const startTime = Date.now();

      await act(async () => {
        const promise = result.current.executeWithRetry(mockOperation);

        // 第一次重试：100ms
        jest.advanceTimersByTime(100);
        await Promise.resolve();

        // 第二次重试：200ms (100 * 2^1)
        jest.advanceTimersByTime(200);
        await Promise.resolve();

        // 第三次重试：400ms (100 * 2^2)
        jest.advanceTimersByTime(400);
        await Promise.resolve();

        await expect(promise).rejects.toThrow();
      });

      // 验证总延迟时间
      expect(jest.getTimerCount()).toBe(0); // 所有定时器都应该被清理
    });
  });
});

describe('错误工具函数测试', () => {
  describe('formatError', () => {
    it('应该格式化带代码的错误', () => {
      const error: AppError = {
        message: 'Test error',
        code: 'TEST_001',
      };

      expect(formatError(error)).toBe('[TEST_001] Test error');
    });

    it('应该格式化不带代码的错误', () => {
      const error: AppError = {
        message: 'Test error',
      };

      expect(formatError(error)).toBe('Test error');
    });
  });

  describe('isNetworkError', () => {
    it('应该识别网络错误', () => {
      const networkError: NetworkError = {
        message: 'Network error',
        isNetworkError: true,
      };

      expect(isNetworkError(networkError)).toBe(true);
    });

    it('应该识别非网络错误', () => {
      const appError: AppError = {
        message: 'App error',
      };

      expect(isNetworkError(appError)).toBe(false);
    });
  });

  describe('isApiError', () => {
    it('应该识别API错误', () => {
      const apiError: ApiError = {
        message: 'API error',
        status: 400,
      };

      expect(isApiError(apiError)).toBe(true);
    });

    it('应该识别非API错误', () => {
      const appError: AppError = {
        message: 'App error',
      };

      expect(isApiError(appError)).toBe(false);
    });
  });

  describe('getUserFriendlyMessage', () => {
    it('应该返回网络错误的友好消息', () => {
      const networkError: NetworkError = {
        message: 'Network error',
        isNetworkError: true,
        isOffline: true,
      };

      expect(getUserFriendlyMessage(networkError)).toBe('网络连接已断开，请检查网络设置');
    });

    it('应该返回API错误的友好消息', () => {
      const testCases = [
        { status: 400, expected: '请求参数错误，请检查输入信息' },
        { status: 401, expected: '登录已过期，请重新登录' },
        { status: 403, expected: '没有权限执行此操作' },
        { status: 404, expected: '请求的资源不存在' },
        { status: 500, expected: '服务器内部错误，请稍后重试' },
        { status: 502, expected: '服务暂时不可用，请稍后重试' },
        { status: 503, expected: '服务暂时不可用，请稍后重试' },
        { status: 504, expected: '服务暂时不可用，请稍后重试' },
      ];

      testCases.forEach(({ status, expected }) => {
        const apiError: ApiError = {
          message: 'API error',
          status,
        };

        expect(getUserFriendlyMessage(apiError)).toBe(expected);
      });
    });

    it('应该返回通用错误的友好消息', () => {
      const appError: AppError = {
        message: 'Generic error',
      };

      expect(getUserFriendlyMessage(appError)).toBe('Generic error');
    });

    it('应该处理没有消息的错误', () => {
      const appError: AppError = {
        message: '',
      };

      expect(getUserFriendlyMessage(appError)).toBe('发生未知错误');
    });
  });
});
