/**
 * API客户端错误处理
 */

import { CustomError } from '@/shared/errors/CustomError';
import { ErrorCode } from '@/shared/errors/types';
import { logger } from '@/shared/utils/logger';

import { ApiResponse } from './responses';

/**
 * API客户端配置
 */
export interface ApiClientConfig {
  baseURL?: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
  onError?: (error: ApiError) => void;
  onRetry?: (attempt: number, error: ApiError) => void;
}

/**
 * API错误类
 */
export class ApiError extends CustomError {
  public readonly status: number;
  public readonly response?: Response;
  public readonly data?: any;
  public readonly traceId?: string;

  constructor(
    message: string,
    status: number,
    code: ErrorCode = ErrorCode.API_ERROR,
    response?: Response,
    data?: any,
    traceId?: string,
  ) {
    super(code, message);
    this.name = 'ApiError';
    this.status = status;
    this.response = response;
    this.data = data;
    this.traceId = traceId;
  }

  /**
   * 判断是否为客户端错误
   */
  isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  /**
   * 判断是否为服务器错误
   */
  isServerError(): boolean {
    return this.status >= 500;
  }

  /**
   * 判断是否为网络错误
   */
  isNetworkError(): boolean {
    return this.status === 0 || this.code === ErrorCode.NETWORK_ERROR;
  }

  /**
   * 判断是否可重试
   */
  isRetryable(): boolean {
    // 网络错误、服务器错误、超时错误可重试
    return this.isNetworkError() ||
           this.isServerError() ||
           this.status === 408 || // Request Timeout
           this.status === 429;   // Too Many Requests
  }
}

/**
 * 请求配置接口
 */
export interface RequestConfig extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  skipErrorHandling?: boolean;
}

/**
 * API客户端类
 */
export class ApiClient {
  private config: ApiClientConfig;
  private abortControllers = new Map<string, AbortController>();

  constructor(config: ApiClientConfig = {}) {
    this.config = {
      baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || '',
      timeout: 10000,
      retries: 3,
      retryDelay: 1000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      ...config,
    };
  }

  /**
   * 发送请求
   */
  async request<T = any>(
    url: string,
    config: RequestConfig = {},
  ): Promise<ApiResponse<T>> {
    const requestId = this.generateRequestId();
    const fullUrl = this.buildUrl(url);
    const requestConfig = this.buildRequestConfig(config, requestId);

    // 设置请求上下文
    // monitoringContext.setRequest({
    //   id: requestId,
    //   method: requestConfig.method || 'GET',
    //   url: fullUrl,
    //   startTime: Date.now(),
    // });

    try {
      const response = await this.executeRequest<T>(fullUrl, requestConfig, requestId);

      // 更新请求上下文
      // monitoringContext.setRequest({
      //   id: requestId,
      //   endTime: Date.now(),
      //   duration: Date.now() - (monitoringContext.getCurrentContext().request.startTime || Date.now()),
      //   statusCode: response.status,
      // });

      return response;
    } catch (error) {
      // 更新请求上下文
      // monitoringContext.setRequest({
      //   id: requestId,
      //   endTime: Date.now(),
      //   duration: Date.now() - (monitoringContext.getCurrentContext().request.startTime || Date.now()),
      //   statusCode: error instanceof ApiError ? error.status : 0,
      // });

      throw error;
    } finally {
      this.abortControllers.delete(requestId);
    }
  }

  /**
   * GET请求
   */
  async get<T = any>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...config, method: 'GET' });
  }

  /**
   * POST请求
   */
  async post<T = any>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      ...config,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT请求
   */
  async put<T = any>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      ...config,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE请求
   */
  async delete<T = any>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...config, method: 'DELETE' });
  }

  /**
   * PATCH请求
   */
  async patch<T = any>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      ...config,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * 取消请求
   */
  cancelRequest(requestId: string): void {
    const controller = this.abortControllers.get(requestId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(requestId);
    }
  }

  /**
   * 取消所有请求
   */
  cancelAllRequests(): void {
    this.abortControllers.forEach(controller => controller.abort());
    this.abortControllers.clear();
  }

  /**
   * 执行请求（带重试）
   */
  private async executeRequest<T>(
    url: string,
    config: RequestConfig & { signal: AbortSignal },
    requestId: string,
  ): Promise<ApiResponse<T>> {
    const maxRetries = config.retries ?? this.config.retries ?? 3;
    const retryDelay = config.retryDelay ?? this.config.retryDelay ?? 1000;

    let lastError: ApiError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          // 等待重试延迟
          await this.delay(retryDelay * Math.pow(2, attempt - 1)); // 指数退避

          // 调用重试回调
          if (this.config.onRetry) {
            this.config.onRetry(attempt, lastError!);
          }

          logger.info('API request retry', {
            metadata: {
              requestId,
              url,
              attempt,
              maxRetries,
              lastError: lastError!.message,
            },
          });
        }

        const response = await this.fetchWithTimeout(url, config, requestId);
        const data = await this.parseResponse<T>(response);

        // 检查业务错误
        if (!data.success && data.error) {
          throw new ApiError(
            data.error.message,
            response.status,
            data.error.code,
            response,
            data,
            data.error.traceId,
          );
        }

        return data;
      } catch (error) {
        lastError = this.handleRequestError(error, url, requestId);

        // 如果不可重试或已达到最大重试次数，抛出错误
        if (!lastError.isRetryable() || attempt === maxRetries) {
          if (lastError instanceof Error) {
            throw lastError;
          }

          throw new Error(String(lastError));
        }
      }
    }

    if (lastError instanceof Error) {
      throw lastError;
    }

    throw new Error('API request failed');
  }

  /**
   * 带超时的fetch
   */
  private async fetchWithTimeout(
    url: string,
    config: RequestConfig & { signal: AbortSignal },
    requestId: string,
  ): Promise<Response> {
    const timeout = config.timeout ?? this.config.timeout ?? 10000;

    const controller = this.abortControllers.get(requestId);

    const timeoutId = setTimeout(() => {
      controller?.abort();
    }, timeout);

    try {
      const response = await fetch(url, config);
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * 解析响应
   */
  private async parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      try {
        const json = await response.json();
        return {
          ...json,
          status: response.status,
        };
      } catch (error) {
        throw new ApiError(
          '响应解析失败：无效的JSON格式',
          response.status,
          ErrorCode.PARSE_ERROR,
          response,
        );
      }
    } else {
      // 非JSON响应
      const text = await response.text();
      if (!response.ok) {
        throw new ApiError(
          text || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          ErrorCode.HTTP_ERROR,
          response,
        );
      }

      return {
        success: true,
        data: text as any,
        status: response.status,
      };
    }
  }

  /**
   * 处理请求错误
   */
  private handleRequestError(error: any, url: string, requestId: string): ApiError {
    let apiError: ApiError;

    if (error instanceof ApiError) {
      apiError = error;
    } else if (error.name === 'AbortError') {
      apiError = new ApiError(
        '请求已取消',
        0,
        ErrorCode.REQUEST_CANCELLED,
      );
    } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
      apiError = new ApiError(
        '网络连接失败，请检查网络连接',
        0,
        ErrorCode.NETWORK_ERROR,
      );
    } else {
      apiError = new ApiError(
        error.message || '请求失败',
        0,
        ErrorCode.UNKNOWN_ERROR,
      );
    }

    // 记录错误日志
    logger.error('API request failed', apiError, {
      metadata: {
        requestId,
        url,
        status: apiError.status,
        code: apiError.code,
      },
    });

    // 报告错误到监控系统
    // if (!apiError.isClientError() || apiError.status >= 500) {
    //   reportError(apiError, {
    //     tags: {
    //       api_client: 'true',
    //       request_id: requestId,
    //       status: apiError.status.toString(),
    //     },
    //     extra: {
    //       url,
    //       traceId: apiError.traceId,
    //     },
    //   });
    // }

    // 调用错误回调
    if (this.config.onError) {
      this.config.onError(apiError);
    }

    return apiError;
  }

  /**
   * 构建完整URL
   */
  private buildUrl(url: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    const baseURL = this.config.baseURL || '';
    return `${baseURL}${url.startsWith('/') ? url : `/${url}`}`;
  }

  /**
   * 构建请求配置
   */
  private buildRequestConfig(config: RequestConfig, requestId: string): RequestConfig & { signal: AbortSignal } {
    const controller = new AbortController();
    this.abortControllers.set(requestId, controller);

    return {
      ...config,
      headers: {
        ...this.config.headers,
        ...config.headers,
        'X-Request-ID': requestId,
      },
      signal: controller.signal,
    };
  }

  /**
   * 生成请求ID
   */
  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 默认API客户端实例
 */
export const apiClient = new ApiClient();

/**
 * 创建API客户端实例
 */
export function createApiClient(config?: ApiClientConfig): ApiClient {
  return new ApiClient(config);
}

export default apiClient;
