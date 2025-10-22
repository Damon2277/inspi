/**
 * API错误处理Hook
 */

import { useState, useCallback, useEffect, useMemo } from 'react';

import { ApiError, ApiClient } from '@/lib/api/client';
import { RetryManager, DEFAULT_RETRY_STRATEGY, RetryStrategy } from '@/lib/api/retry';
import { logger } from '@/shared/utils/logger';

// import { useErrorToast } from '@/shared/components/ErrorToast';

/**
 * API错误处理Hook配置
 */
interface UseApiErrorOptions {
  showToast?: boolean;
  retryStrategy?: Partial<RetryStrategy>;
  onError?: (error: ApiError) => void;
  onRetry?: (attempt: number, error: ApiError) => void;
  onSuccess?: () => void;
}

/**
 * API错误状态
 */
interface ApiErrorState {
  error: ApiError | null;
  isError: boolean;
  isLoading: boolean;
  retryCount: number;
  canRetry: boolean;
}

/**
 * API错误处理Hook
 */
export function useApiError(options: UseApiErrorOptions = {}) {
  const {
    showToast = true,
    retryStrategy,
    onError,
    onRetry,
    onSuccess,
  } = options;

  const [state, setState] = useState<ApiErrorState>({
    error: null,
    isError: false,
    isLoading: false,
    retryCount: 0,
    canRetry: false,
  });

  const retryManager = useMemo(
    () => new RetryManager({ ...DEFAULT_RETRY_STRATEGY, ...retryStrategy }),
    [retryStrategy],
  );

  /**
   * 处理API错误
   */
  const handleError = useCallback((error: ApiError) => {
    setState(prev => ({
      ...prev,
      error,
      isError: true,
      isLoading: false,
      canRetry: error.isRetryable(),
    }));

    // 显示Toast通知
    if (showToast) {
      // TODO: Implement toast notifications
      console.error('Toast notification:', error.message);
    }

    // 记录错误日志
    logger.error('API Error handled by useApiError', error, {
      metadata: {
        status: error.status,
        code: error.code,
        traceId: error.traceId,
        retryable: error.isRetryable(),
      },
    });

    // 调用错误回调
    if (onError) {
      onError(error);
    }
  }, [showToast, onError]);

  /**
   * 清除错误
   */
  const clearError = useCallback(() => {
    setState({
      error: null,
      isError: false,
      isLoading: false,
      retryCount: 0,
      canRetry: false,
    });
  }, []);

  /**
   * 执行API请求（带错误处理）
   */
  const executeRequest = useCallback(async <T>(
    requestFn: () => Promise<T>,
  ): Promise<T | null> => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      isError: false,
    }));

    try {
      const result = await retryManager.execute(requestFn, {
        retryCondition: (error: ApiError, attempt: number) => {
          setState(prev => ({
            ...prev,
            retryCount: attempt,
          }));

          if (onRetry) {
            onRetry(attempt, error);
          }

          return (retryStrategy?.retryCondition || DEFAULT_RETRY_STRATEGY.retryCondition)(error, attempt);
        },
      });

      if (result.success) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          retryCount: result.attempts - 1,
        }));

        if (onSuccess) {
          onSuccess();
        }

        return result.data!;
      } else {
        handleError(result.error!);
        return null;
      }
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError(
        error instanceof Error ? error.message : 'Unknown error',
        0,
      );

      handleError(apiError);
      return null;
    }
  }, [retryManager, handleError, onRetry, onSuccess, retryStrategy]);

  /**
   * 重试最后的请求
   */
  const retry = useCallback(async <T>(
    requestFn: () => Promise<T>,
  ): Promise<T | null> => {
    if (!state.canRetry) {
      return null;
    }

    return executeRequest(requestFn);
  }, [state.canRetry, executeRequest]);

  return {
    // 状态
    error: state.error,
    isError: state.isError,
    isLoading: state.isLoading,
    retryCount: state.retryCount,
    canRetry: state.canRetry,

    // 方法
    handleError,
    clearError,
    executeRequest,
    retry,
  };
}

/**
 * API请求Hook
 */
export function useApiRequest<T = any>(options: UseApiErrorOptions = {}) {
  const apiError = useApiError(options);
  const [data, setData] = useState<T | null>(null);

  /**
   * 执行请求
   */
  const execute = useCallback(async (
    requestFn: () => Promise<T>,
  ): Promise<void> => {
    const result = await apiError.executeRequest(requestFn);
    if (result !== null) {
      setData(result);
    }
  }, [apiError]);

  /**
   * 重试请求
   */
  const retry = useCallback(async (
    requestFn: () => Promise<T>,
  ): Promise<void> => {
    const result = await apiError.retry(requestFn);
    if (result !== null) {
      setData(result);
    }
  }, [apiError]);

  /**
   * 重置状态
   */
  const reset = useCallback(() => {
    setData(null);
    apiError.clearError();
  }, [apiError]);

  return {
    // 数据
    data,

    // 状态
    error: apiError.error,
    isError: apiError.isError,
    isLoading: apiError.isLoading,
    retryCount: apiError.retryCount,
    canRetry: apiError.canRetry,

    // 方法
    execute,
    retry,
    reset,
    clearError: apiError.clearError,
  };
}

/**
 * 特定API端点Hook
 */
export function useApiEndpoint<T = any>(
  endpoint: string,
  apiClient: ApiClient,
  options: UseApiErrorOptions = {},
) {
  const apiRequest = useApiRequest<T>(options);

  /**
   * GET请求
   */
  const get = useCallback(async (params?: Record<string, any>) => {
    const url = params ? `${endpoint}?${new URLSearchParams(params).toString()}` : endpoint;
    await apiRequest.execute(() => apiClient.get<T>(url).then(res => res.data!));
  }, [endpoint, apiClient, apiRequest]);

  /**
   * POST请求
   */
  const post = useCallback(async (data?: any) => {
    await apiRequest.execute(() => apiClient.post<T>(endpoint, data).then(res => res.data!));
  }, [endpoint, apiClient, apiRequest]);

  /**
   * PUT请求
   */
  const put = useCallback(async (data?: any) => {
    await apiRequest.execute(() => apiClient.put<T>(endpoint, data).then(res => res.data!));
  }, [endpoint, apiClient, apiRequest]);

  /**
   * DELETE请求
   */
  const del = useCallback(async () => {
    await apiRequest.execute(() => apiClient.delete<T>(endpoint).then(res => res.data!));
  }, [endpoint, apiClient, apiRequest]);

  /**
   * PATCH请求
   */
  const patch = useCallback(async (data?: any) => {
    await apiRequest.execute(() => apiClient.patch<T>(endpoint, data).then(res => res.data!));
  }, [endpoint, apiClient, apiRequest]);

  return {
    // 数据和状态
    ...apiRequest,

    // HTTP方法
    get,
    post,
    put,
    delete: del,
    patch,
  };
}

/**
 * 批量API请求Hook
 */
export function useBatchApiRequest(options: UseApiErrorOptions = {}) {
  const [requests, setRequests] = useState<Map<string, any>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Map<string, ApiError>>(new Map());

  const errorToast = useErrorToast();

  /**
   * 执行批量请求
   */
  const executeBatch = useCallback(async (
    requestMap: Record<string, () => Promise<any>>,
  ): Promise<Record<string, any>> => {
    setIsLoading(true);
    setErrors(new Map());

    const results: Record<string, any> = {};
    const newErrors = new Map<string, ApiError>();

    await Promise.allSettled(
      Object.entries(requestMap).map(async ([key, requestFn]) => {
        try {
          const result = await requestFn();
          results[key] = result;
          setRequests(prev => new Map(prev.set(key, result)));
        } catch (error) {
          const apiError = error instanceof ApiError ? error : new ApiError(
            error instanceof Error ? error.message : 'Unknown error',
            0,
          );

          newErrors.set(key, apiError);

          if (options.showToast !== false) {
            errorToast.showError(apiError, {
              title: `请求失败: ${key}`,
            });
          }
        }
      }),
    );

    setErrors(newErrors);
    setIsLoading(false);

    return results;
  }, [errorToast, options.showToast]);

  /**
   * 清除所有错误
   */
  const clearAllErrors = useCallback(() => {
    setErrors(new Map());
  }, []);

  /**
   * 清除特定错误
   */
  const clearError = useCallback((key: string) => {
    setErrors(prev => {
      const newErrors = new Map(prev);
      newErrors.delete(key);
      return newErrors;
    });
  }, []);

  return {
    // 状态
    requests: Object.fromEntries(requests),
    isLoading,
    errors: Object.fromEntries(errors),
    hasErrors: errors.size > 0,

    // 方法
    executeBatch,
    clearAllErrors,
    clearError,
  };
}

export default useApiError;
