'use client';

import React, { useState, useEffect, useCallback } from 'react';

/**
 * 网络错误组件属性
 */
interface NetworkErrorProps {
  error?: Error;
  onRetry?: () => void;
  retryDelay?: number;
  maxRetries?: number;
  showDetails?: boolean;
  className?: string;
}

/**
 * 网络状态Hook
 */
function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [connectionType, setConnectionType] = useState<string>('unknown');

  useEffect(() => {
    // 检查初始网络状态
    setIsOnline(navigator.onLine);

    // 获取连接类型（如果支持）
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      setConnectionType(connection?.effectiveType || 'unknown');
    }

    // 监听网络状态变化
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 监听连接变化
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      const handleConnectionChange = () => {
        setConnectionType(connection?.effectiveType || 'unknown');
      };
      connection?.addEventListener('change', handleConnectionChange);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        connection?.removeEventListener('change', handleConnectionChange);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, connectionType };
}

/**
 * 网络错误组件
 */
export const NetworkError: React.FC<NetworkErrorProps> = ({
  error,
  onRetry,
  retryDelay = 3000,
  maxRetries = 3,
  showDetails = false,
  className = '',
}) => {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const { isOnline, connectionType } = useNetworkStatus();

  /**
   * 处理重试
   */
  const handleRetry = useCallback(async () => {
    if (retryCount >= maxRetries) {
      setIsRetrying(false);
      return;
    }

    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    try {
      if (onRetry) {
        await onRetry();
      }
    } catch (error) {
      console.error('Retry failed:', error);
    } finally {
      setIsRetrying(false);
    }
  }, [retryCount, maxRetries, onRetry]);

  // 自动重试倒计时
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && isRetrying) {
      void handleRetry();
    }
  }, [countdown, isRetrying, handleRetry]);

  /**
   * 开始自动重试
   */
  const startAutoRetry = () => {
    if (retryCount >= maxRetries) {
      return;
    }

    setCountdown(Math.ceil(retryDelay / 1000));
    setIsRetrying(true);
  };

  /**
   * 取消自动重试
   */
  const cancelAutoRetry = () => {
    setCountdown(0);
    setIsRetrying(false);
  };

  /**
   * 重置重试计数
   */
  const resetRetries = () => {
    setRetryCount(0);
    setIsRetrying(false);
    setCountdown(0);
  };

  /**
   * 获取错误类型
   */
  const getErrorType = () => {
    if (!isOnline) {
      return 'offline';
    }

    if (error?.message.includes('timeout')) {
      return 'timeout';
    }

    if (error?.message.includes('fetch')) {
      return 'fetch';
    }

    return 'network';
  };

  /**
   * 获取错误信息
   */
  const getErrorInfo = () => {
    const errorType = getErrorType();

    switch (errorType) {
      case 'offline':
        return {
          title: '网络连接已断开',
          message: '请检查您的网络连接，然后重试。',
          icon: (
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        };
      case 'timeout':
        return {
          title: '请求超时',
          message: '服务器响应时间过长，请稍后重试。',
          icon: (
            <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        };
      default:
        return {
          title: '网络请求失败',
          message: '无法连接到服务器，请检查网络连接。',
          icon: (
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        };
    }
  };

  const errorInfo = getErrorInfo();
  const canRetry = retryCount < maxRetries && onRetry;

  return (
    <div className={`bg-white border border-red-200 rounded-lg p-6 ${className}`}>
      {/* 错误图标和标题 */}
      <div className="flex items-center mb-4">
        <div className="flex-shrink-0 mr-3">
          {errorInfo.icon}
        </div>
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            {errorInfo.title}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {errorInfo.message}
          </p>
        </div>
      </div>

      {/* 网络状态信息 */}
      <div className="mb-4 p-3 bg-gray-50 rounded-md">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">网络状态:</span>
          <span className={`font-medium ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
            {isOnline ? '已连接' : '已断开'}
          </span>
        </div>
        {isOnline && connectionType !== 'unknown' && (
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-gray-600">连接类型:</span>
            <span className="font-medium text-gray-900">
              {connectionType.toUpperCase()}
            </span>
          </div>
        )}
        {retryCount > 0 && (
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-gray-600">重试次数:</span>
            <span className="font-medium text-gray-900">
              {retryCount}/{maxRetries}
            </span>
          </div>
        )}
      </div>

      {/* 开发环境错误详情 */}
      {showDetails && error && process.env.NODE_ENV === 'development' && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <h4 className="text-sm font-medium text-red-800 mb-2">
            错误详情 (开发环境)
          </h4>
          <pre className="text-xs text-red-700 whitespace-pre-wrap overflow-x-auto">
            {error.message}
          </pre>
          {error.stack && (
            <pre className="text-xs text-red-600 whitespace-pre-wrap overflow-x-auto mt-2 max-h-32">
              {error.stack}
            </pre>
          )}
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex flex-col sm:flex-row gap-3">
        {canRetry && (
          <button
            onClick={handleRetry}
            disabled={isRetrying || !isOnline}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            {isRetrying ? '重试中...' : '立即重试'}
          </button>
        )}

        {canRetry && !isRetrying && (
          <button
            onClick={startAutoRetry}
            disabled={!isOnline}
            className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            自动重试
          </button>
        )}

        {isRetrying && countdown > 0 && (
          <button
            onClick={cancelAutoRetry}
            className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
          >
            取消重试 ({countdown}s)
          </button>
        )}

        {retryCount >= maxRetries && (
          <button
            onClick={resetRetries}
            className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
          >
            重置重试
          </button>
        )}
      </div>

      {/* 帮助提示 */}
      {!isOnline && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <h4 className="text-sm font-medium text-blue-800 mb-2">
            网络连接故障排除
          </h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 检查WiFi或移动数据连接</li>
            <li>• 尝试访问其他网站确认网络状态</li>
            <li>• 重启路由器或切换网络</li>
            <li>• 检查防火墙或代理设置</li>
          </ul>
        </div>
      )}
    </div>
  );
};

/**
 * 网络错误Hook
 */
export function useNetworkError() {
  const [networkError, setNetworkError] = useState<Error | null>(null);
  const { isOnline } = useNetworkStatus();

  const handleNetworkError = (error: Error) => {
    setNetworkError(error);
  };

  const clearNetworkError = () => {
    setNetworkError(null);
  };

  const isNetworkError = (error: Error): boolean => {
    return (
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('timeout') ||
      error.name === 'NetworkError' ||
      !isOnline
    );
  };

  return {
    networkError,
    isOnline,
    handleNetworkError,
    clearNetworkError,
    isNetworkError,
  };
}
