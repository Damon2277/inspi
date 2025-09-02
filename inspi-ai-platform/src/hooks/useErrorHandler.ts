'use client'

import { useCallback, useState } from 'react'

// 错误类型定义
export interface AppError {
  message: string
  code?: string
  status?: number
  details?: any
  timestamp?: Date
}

// API错误类型
export interface ApiError extends AppError {
  endpoint?: string
  method?: string
  requestId?: string
}

// 网络错误类型
export interface NetworkError extends AppError {
  isNetworkError: true
  isOffline?: boolean
}

// 错误处理器配置
export interface ErrorHandlerConfig {
  showToast?: boolean
  logError?: boolean
  retryable?: boolean
  fallbackMessage?: string
}

// 基础错误处理Hook
export function useErrorHandler(config: ErrorHandlerConfig = {}) {
  const [error, setError] = useState<AppError | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleError = useCallback((error: Error | AppError | string, context?: string) => {
    const appError: AppError = typeof error === 'string' 
      ? { message: error, timestamp: new Date() }
      : error instanceof Error 
        ? { message: error.message, details: error.stack, timestamp: new Date() }
        : { ...error, timestamp: error.timestamp || new Date() }

    // 设置错误状态
    setError(appError)
    setIsLoading(false)

    // 日志记录
    if (config.logError !== false) {
      console.error(`[ErrorHandler${context ? ` - ${context}` : ''}]:`, appError)
    }

    // 这里可以添加错误上报逻辑
    // reportError(appError, context)

    return appError
  }, [config.logError])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const retry = useCallback(async (retryFn: () => Promise<any>) => {
    if (!config.retryable) {
      console.warn('Retry attempted on non-retryable error handler')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await retryFn()
      setIsLoading(false)
      return result
    } catch (error) {
      handleError(error as Error, 'retry')
      return null
    }
  }, [config.retryable, handleError])

  return {
    error,
    isLoading,
    handleError,
    clearError,
    retry,
    hasError: !!error
  }
}

// 全局错误处理Hook
export function useGlobalErrorHandler() {
  const [globalErrors, setGlobalErrors] = useState<AppError[]>([])

  const addGlobalError = useCallback((error: AppError) => {
    setGlobalErrors(prev => [...prev, error])
    
    // 自动清除错误（5秒后）
    setTimeout(() => {
      setGlobalErrors(prev => prev.filter(e => e !== error))
    }, 5000)
  }, [])

  const removeGlobalError = useCallback((error: AppError) => {
    setGlobalErrors(prev => prev.filter(e => e !== error))
  }, [])

  const clearAllErrors = useCallback(() => {
    setGlobalErrors([])
  }, [])

  return {
    globalErrors,
    addGlobalError,
    removeGlobalError,
    clearAllErrors,
    hasGlobalErrors: globalErrors.length > 0
  }
}

// API错误处理Hook
export function useApiErrorHandler() {
  const { handleError, ...rest } = useErrorHandler({ 
    showToast: true, 
    logError: true, 
    retryable: true 
  })

  const handleApiError = useCallback((error: any, endpoint?: string, method?: string) => {
    let apiError: ApiError

    if (error.response) {
      // HTTP错误响应
      apiError = {
        message: error.response.data?.message || error.message || 'API请求失败',
        code: error.response.data?.code || 'API_ERROR',
        status: error.response.status,
        endpoint,
        method,
        details: error.response.data,
        timestamp: new Date()
      }
    } else if (error.request) {
      // 网络错误
      const networkError: NetworkError = {
        message: '网络连接失败，请检查网络设置',
        code: 'NETWORK_ERROR',
        isNetworkError: true,
        isOffline: !navigator.onLine,
        endpoint,
        method,
        timestamp: new Date()
      }
      apiError = networkError
    } else {
      // 其他错误
      apiError = {
        message: error.message || '未知错误',
        code: 'UNKNOWN_ERROR',
        endpoint,
        method,
        details: error,
        timestamp: new Date()
      }
    }

    return handleError(apiError, `API ${method} ${endpoint}`)
  }, [handleError])

  const handleNetworkError = useCallback(() => {
    const networkError: NetworkError = {
      message: '网络连接已断开，请检查网络设置',
      code: 'NETWORK_OFFLINE',
      isNetworkError: true,
      isOffline: true,
      timestamp: new Date()
    }
    return handleError(networkError, 'Network')
  }, [handleError])

  return {
    ...rest,
    handleApiError,
    handleNetworkError
  }
}

// 错误重试Hook
export function useRetryHandler(maxRetries: number = 3, retryDelay: number = 1000) {
  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)

  const executeWithRetry = useCallback(async <T>(
    operation: () => Promise<T>,
    onError?: (error: Error, attempt: number) => void
  ): Promise<T | null> => {
    setIsRetrying(true)
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation()
        setRetryCount(0)
        setIsRetrying(false)
        return result
      } catch (error) {
        setRetryCount(attempt + 1)
        
        if (onError) {
          onError(error as Error, attempt + 1)
        }

        if (attempt === maxRetries) {
          setIsRetrying(false)
          throw error
        }

        // 等待重试延迟
        await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)))
      }
    }

    setIsRetrying(false)
    return null
  }, [maxRetries, retryDelay])

  const resetRetry = useCallback(() => {
    setRetryCount(0)
    setIsRetrying(false)
  }, [])

  return {
    retryCount,
    isRetrying,
    executeWithRetry,
    resetRetry,
    canRetry: retryCount < maxRetries
  }
}

// 错误上报函数（可以集成第三方服务）
export function reportError(error: AppError, context?: string) {
  // 这里可以集成 Sentry、LogRocket 等错误监控服务
  console.log('Reporting error:', { error, context })
  
  // 示例：发送到错误监控服务
  // if (window.Sentry) {
  //   window.Sentry.captureException(error, { tags: { context } })
  // }
}

// 错误格式化工具
export function formatError(error: AppError): string {
  if (error.code) {
    return `[${error.code}] ${error.message}`
  }
  return error.message
}

// 判断是否为网络错误
export function isNetworkError(error: any): error is NetworkError {
  return error && error.isNetworkError === true
}

// 判断是否为API错误
export function isApiError(error: any): error is ApiError {
  return error && typeof error.status === 'number'
}

// 获取用户友好的错误消息
export function getUserFriendlyMessage(error: AppError): string {
  if (isNetworkError(error)) {
    return error.isOffline 
      ? '网络连接已断开，请检查网络设置' 
      : '网络请求失败，请稍后重试'
  }

  if (isApiError(error)) {
    switch (error.status) {
      case 400:
        return '请求参数错误，请检查输入信息'
      case 401:
        return '登录已过期，请重新登录'
      case 403:
        return '没有权限执行此操作'
      case 404:
        return '请求的资源不存在'
      case 500:
        return '服务器内部错误，请稍后重试'
      case 502:
      case 503:
      case 504:
        return '服务暂时不可用，请稍后重试'
      default:
        return error.message || '操作失败，请稍后重试'
    }
  }

  return error.message || '发生未知错误'
}