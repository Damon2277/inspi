/**
 * 加载边界组件 - 处理懒加载过程中的错误和加载状态
 */
'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '@/lib/logging/logger';

/**
 * 加载边界属性
 */
interface LoadingBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<{ error?: Error; retry?: () => void }>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  retryable?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * 加载边界状态
 */
interface LoadingBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  isRetrying: boolean;
}

/**
 * 加载边界组件
 */
class LoadingBoundary extends Component<LoadingBoundaryProps, LoadingBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: LoadingBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<LoadingBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      errorInfo
    });

    // 记录错误日志
    logger.error('Loading boundary caught error', error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: 'LoadingBoundary'
    });

    // 调用错误回调
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  /**
   * 重试加载
   */
  retry = () => {
    const { maxRetries = 3, retryDelay = 1000 } = this.props;
    
    if (this.state.retryCount >= maxRetries) {
      logger.warn('Max retries reached for loading boundary');
      return;
    }

    this.setState({
      isRetrying: true
    });

    // 延迟重试
    this.retryTimeoutId = setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: this.state.retryCount + 1,
        isRetrying: false
      });

      logger.info('Loading boundary retry attempt', {
        retryCount: this.state.retryCount + 1,
        maxRetries
      });
    }, retryDelay);
  };

  render() {
    const { hasError, error, isRetrying, retryCount } = this.state;
    const { children, fallback: FallbackComponent, retryable = true, maxRetries = 3 } = this.props;

    if (hasError && error) {
      // 如果提供了自定义错误组件
      if (FallbackComponent) {
        return (
          <FallbackComponent 
            error={error} 
            retry={retryable && retryCount < maxRetries ? this.retry : undefined}
          />
        );
      }

      // 默认错误UI
      return (
        <DefaultErrorFallback
          error={error}
          retry={retryable && retryCount < maxRetries ? this.retry : undefined}
          isRetrying={isRetrying}
          retryCount={retryCount}
          maxRetries={maxRetries}
        />
      );
    }

    return children;
  }
}

/**
 * 默认错误回退组件
 */
interface DefaultErrorFallbackProps {
  error: Error;
  retry?: () => void;
  isRetrying: boolean;
  retryCount: number;
  maxRetries: number;
}

const DefaultErrorFallback: React.FC<DefaultErrorFallbackProps> = ({
  error,
  retry,
  isRetrying,
  retryCount,
  maxRetries
}) => {
  return (
    <div className="loading-boundary-error">
      <div className="error-content">
        <div className="error-icon">⚠️</div>
        <h3 className="error-title">加载失败</h3>
        <p className="error-message">
          {error.message || '组件加载时发生错误'}
        </p>
        
        {retry && (
          <div className="error-actions">
            <button
              onClick={retry}
              disabled={isRetrying}
              className="retry-button"
            >
              {isRetrying ? '重试中...' : '重试'}
            </button>
            <p className="retry-info">
              已重试 {retryCount} / {maxRetries} 次
            </p>
          </div>
        )}
        
        {process.env.NODE_ENV === 'development' && (
          <details className="error-details">
            <summary>错误详情</summary>
            <pre className="error-stack">
              {error.stack}
            </pre>
          </details>
        )}
      </div>

      <style jsx>{`
        .loading-boundary-error {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 200px;
          padding: 20px;
          background-color: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          margin: 10px 0;
        }

        .error-content {
          text-align: center;
          max-width: 400px;
        }

        .error-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .error-title {
          color: #dc2626;
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .error-message {
          color: #7f1d1d;
          margin-bottom: 16px;
          line-height: 1.5;
        }

        .error-actions {
          margin-bottom: 16px;
        }

        .retry-button {
          background-color: #dc2626;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.2s;
        }

        .retry-button:hover:not(:disabled) {
          background-color: #b91c1c;
        }

        .retry-button:disabled {
          background-color: #9ca3af;
          cursor: not-allowed;
        }

        .retry-info {
          font-size: 12px;
          color: #6b7280;
          margin-top: 8px;
        }

        .error-details {
          text-align: left;
          margin-top: 16px;
          padding: 12px;
          background-color: #f9fafb;
          border-radius: 4px;
          border: 1px solid #e5e7eb;
        }

        .error-details summary {
          cursor: pointer;
          font-weight: 500;
          color: #374151;
          margin-bottom: 8px;
        }

        .error-stack {
          font-size: 12px;
          color: #6b7280;
          white-space: pre-wrap;
          overflow-x: auto;
          max-height: 200px;
        }
      `}</style>
    </div>
  );
};

/**
 * 加载状态组件
 */
interface LoadingStateProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'spinner' | 'skeleton' | 'dots';
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = '加载中...',
  size = 'medium',
  variant = 'spinner'
}) => {
  const sizeClasses = {
    small: 'loading-small',
    medium: 'loading-medium',
    large: 'loading-large'
  };

  const renderSpinner = () => (
    <div className={`loading-spinner ${sizeClasses[size]}`}>
      <div className="spinner"></div>
      {message && <p className="loading-message">{message}</p>}
    </div>
  );

  const renderSkeleton = () => (
    <div className={`loading-skeleton ${sizeClasses[size]}`}>
      <div className="skeleton-line skeleton-line-1"></div>
      <div className="skeleton-line skeleton-line-2"></div>
      <div className="skeleton-line skeleton-line-3"></div>
    </div>
  );

  const renderDots = () => (
    <div className={`loading-dots ${sizeClasses[size]}`}>
      <div className="dot dot-1"></div>
      <div className="dot dot-2"></div>
      <div className="dot dot-3"></div>
      {message && <p className="loading-message">{message}</p>}
    </div>
  );

  const renderContent = () => {
    switch (variant) {
      case 'skeleton':
        return renderSkeleton();
      case 'dots':
        return renderDots();
      default:
        return renderSpinner();
    }
  };

  return (
    <div className="loading-state">
      {renderContent()}

      <style jsx>{`
        .loading-state {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        /* Spinner styles */
        .loading-spinner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .spinner {
          border: 2px solid #f3f4f6;
          border-top: 2px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .loading-small .spinner {
          width: 20px;
          height: 20px;
        }

        .loading-medium .spinner {
          width: 32px;
          height: 32px;
        }

        .loading-large .spinner {
          width: 48px;
          height: 48px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Skeleton styles */
        .loading-skeleton {
          width: 100%;
          max-width: 300px;
        }

        .skeleton-line {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: loading 1.5s infinite;
          border-radius: 4px;
          margin-bottom: 8px;
        }

        .loading-small .skeleton-line {
          height: 12px;
        }

        .loading-medium .skeleton-line {
          height: 16px;
        }

        .loading-large .skeleton-line {
          height: 20px;
        }

        .skeleton-line-1 {
          width: 100%;
        }

        .skeleton-line-2 {
          width: 80%;
        }

        .skeleton-line-3 {
          width: 60%;
        }

        @keyframes loading {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }

        /* Dots styles */
        .loading-dots {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .loading-dots > div:first-child {
          display: flex;
          gap: 4px;
        }

        .dot {
          background-color: #3b82f6;
          border-radius: 50%;
          animation: bounce 1.4s infinite ease-in-out both;
        }

        .loading-small .dot {
          width: 6px;
          height: 6px;
        }

        .loading-medium .dot {
          width: 8px;
          height: 8px;
        }

        .loading-large .dot {
          width: 12px;
          height: 12px;
        }

        .dot-1 {
          animation-delay: -0.32s;
        }

        .dot-2 {
          animation-delay: -0.16s;
        }

        @keyframes bounce {
          0%, 80%, 100% {
            transform: scale(0);
          }
          40% {
            transform: scale(1);
          }
        }

        .loading-message {
          color: #6b7280;
          font-size: 14px;
          margin: 0;
          text-align: center;
        }

        .loading-small .loading-message {
          font-size: 12px;
        }

        .loading-large .loading-message {
          font-size: 16px;
        }
      `}</style>
    </div>
  );
};

/**
 * 高阶组件：添加加载边界
 */
export function withLoadingBoundary<P extends object>(
  Component: React.ComponentType<P>,
  boundaryProps?: Omit<LoadingBoundaryProps, 'children'>
) {
  const WrappedComponent: React.FC<P> = (props) => (
    <LoadingBoundary {...boundaryProps}>
      <Component {...props} />
    </LoadingBoundary>
  );

  WrappedComponent.displayName = `withLoadingBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

export default LoadingBoundary;