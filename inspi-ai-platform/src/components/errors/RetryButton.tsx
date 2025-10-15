'use client';

import React, { useState, useEffect, useCallback } from 'react';

/**
 * 重试按钮属性
 */
interface RetryButtonProps {
  onRetry: () => Promise<void> | void;
  maxRetries?: number;
  retryDelay?: number;
  autoRetry?: boolean;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'outline';
  showCount?: boolean;
  resetOnSuccess?: boolean;
  children?: React.ReactNode;
}

/**
 * 重试按钮组件
 */
export const RetryButton: React.FC<RetryButtonProps> = ({
  onRetry,
  maxRetries = 3,
  retryDelay = 3000,
  autoRetry = false,
  disabled = false,
  className = '',
  size = 'md',
  variant = 'primary',
  showCount = true,
  resetOnSuccess = true,
  children,
}) => {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [lastError, setLastError] = useState<Error | null>(null);

  // 自动重试倒计时
  const handleRetry = useCallback(async () => {
    if (isRetrying || retryCount >= maxRetries) {
      return;
    }

    setIsRetrying(true);
    setLastError(null);

    try {
      await onRetry();

      // 成功后重置计数
      if (resetOnSuccess) {
        setRetryCount(0);
      }
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error('Retry failed');
      setLastError(normalizedError);
      setRetryCount(prev => {
        const next = prev + 1;

        // 如果还有重试次数且启用自动重试，开始倒计时
        if (autoRetry && next < maxRetries) {
          setCountdown(Math.floor(retryDelay / 1000));
        }

        return next;
      });
    } finally {
      setIsRetrying(false);
    }
  }, [autoRetry, isRetrying, maxRetries, onRetry, resetOnSuccess, retryDelay, retryCount]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }

    if (countdown === 0 && autoRetry && retryCount > 0 && retryCount < maxRetries) {
      void handleRetry();
    }
  }, [countdown, autoRetry, retryCount, maxRetries, handleRetry]);

  const resetRetries = () => {
    setRetryCount(0);
    setCountdown(0);
    setLastError(null);
  };

  // 样式配置
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 disabled:bg-gray-400',
    outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50 disabled:border-gray-300 disabled:text-gray-400',
  };

  const baseClasses = 'font-medium rounded-md transition-colors duration-200 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500';

  const buttonClasses = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`;

  const canRetry = retryCount < maxRetries;
  const isDisabled = disabled || isRetrying || !canRetry;

  return (
    <div className="inline-flex flex-col items-center space-y-2">
      {/* 主重试按钮 */}
      <button
        onClick={() => void handleRetry()}
        disabled={isDisabled}
        className={buttonClasses}
      >
        {isRetrying ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            重试中...
          </span>
        ) : countdown > 0 ? (
          `${countdown}秒后重试`
        ) : (
          children || (
            <span>
              重试
              {showCount && retryCount > 0 && ` (${retryCount}/${maxRetries})`}
            </span>
          )
        )}
      </button>

      {/* 重试状态信息 */}
      {retryCount > 0 && (
        <div className="text-center">
          {canRetry ? (
            <p className="text-sm text-gray-600">
              已重试 {retryCount}/{maxRetries} 次
              {countdown > 0 && autoRetry && (
                <span className="block text-xs text-gray-500 mt-1">
                  {countdown} 秒后自动重试
                </span>
              )}
            </p>
          ) : (
            <div className="text-center">
              <p className="text-sm text-red-600 mb-2">
                已达到最大重试次数 ({maxRetries})
              </p>
              <button
                onClick={resetRetries}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                重置重试
              </button>
            </div>
          )}
        </div>
      )}

      {/* 错误信息 */}
      {lastError && (
        <div className="text-center max-w-xs">
          <p className="text-xs text-red-600">
            {lastError.message}
          </p>
        </div>
      )}
    </div>
  );
};

/**
 * 智能重试按钮（带指数退避）
 */
export const SmartRetryButton: React.FC<Omit<RetryButtonProps, 'retryDelay'> & {
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
}> = ({
  baseDelay = 1000,
  maxDelay = 30000,
  backoffFactor = 2,
  ...props
}) => {
  const [currentDelay, setCurrentDelay] = useState(baseDelay);

  // 计算下次重试延迟（指数退避）
  const calculateDelay = (retryCount: number): number => {
    const delay = baseDelay * Math.pow(backoffFactor, retryCount);
    return Math.min(delay, maxDelay);
  };

  const handleRetry = async () => {
    try {
      await props.onRetry();
      // 成功后重置延迟
      setCurrentDelay(baseDelay);
    } catch (error) {
      // 失败后增加延迟
      setCurrentDelay(calculateDelay(Math.log(currentDelay / baseDelay) / Math.log(backoffFactor) + 1));
      throw error;
    }
  };

  return (
    <RetryButton
      {...props}
      onRetry={handleRetry}
      retryDelay={currentDelay}
    />
  );
};

/**
 * 重试按钮组（多个操作）
 */
export const RetryButtonGroup: React.FC<{
  actions: Array<{
    label: string;
    action: () => Promise<void> | void;
    variant?: 'primary' | 'secondary' | 'outline';
  }>;
  className?: string;
}> = ({ actions, className = '' }) => {
  return (
    <div className={`flex flex-wrap gap-2 justify-center ${className}`}>
      {actions.map((action, index) => (
        <RetryButton
          key={index}
          onRetry={action.action}
          variant={action.variant || (index === 0 ? 'primary' : 'secondary')}
          size="sm"
          showCount={false}
          maxRetries={1}
        >
          {action.label}
        </RetryButton>
      ))}
    </div>
  );
};

/**
 * 重试Hook
 */
export function useRetry({
  maxRetries = 3,
  baseDelay = 1000,
  maxDelay = 30000,
  backoffFactor = 2,
}: {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
} = {}) {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [lastError, setLastError] = useState<Error | null>(null);

  const retry = async (fn: () => Promise<void> | void) => {
    if (isRetrying || retryCount >= maxRetries) {
      return;
    }

    setIsRetrying(true);
    setLastError(null);

    try {
      await fn();
      setRetryCount(0); // 成功后重置
    } catch (error) {
      const newRetryCount = retryCount + 1;
      setRetryCount(newRetryCount);
      setLastError(error instanceof Error ? error : new Error('Operation failed'));

      // 如果还有重试次数，计算延迟后自动重试
      if (newRetryCount < maxRetries) {
        const delay = Math.min(baseDelay * Math.pow(backoffFactor, newRetryCount - 1), maxDelay);
        setTimeout(() => {
          retry(fn);
        }, delay);
      }
    } finally {
      setIsRetrying(false);
    }
  };

  const reset = () => {
    setRetryCount(0);
    setLastError(null);
    setIsRetrying(false);
  };

  return {
    retry,
    reset,
    retryCount,
    isRetrying,
    lastError,
    canRetry: retryCount < maxRetries,
  };
}

export default RetryButton;
