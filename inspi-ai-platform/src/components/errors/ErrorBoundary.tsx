'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
// import { CustomError } from '@/lib/errors/CustomError';
// import { ErrorCode } from '@/lib/errors/types';
// import { logger } from '@/lib/logging/logger';

/**
 * 错误边界属性接口
 * 
 * @property children - 子组件，将被错误边界包裹
 * @property fallback - 自定义错误回退UI渲染函数，接收错误对象和错误信息
 * @property onError - 错误发生时的回调函数，可用于日志记录或错误报告
 * @property level - 错误边界级别，用于区分不同层级的错误处理
 *   - 'global': 应用全局级错误边界，通常在应用根部使用
 *   - 'page': 页面级错误边界，用于隔离整个页面的错误
 *   - 'component': 组件级错误边界，用于隔离特定组件的错误
 * @property resetOnPropsChange - 当props变化时是否重置错误状态
 * @property resetKeys - 用于触发错误状态重置的特定props键数组
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'page' | 'component' | 'global';
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
}

/**
 * 错误边界状态接口
 * 
 * @property hasError - 是否捕获到错误
 * @property error - 捕获到的错误对象
 * @property errorInfo - React提供的错误信息，包含组件堆栈
 * @property errorId - 错误的唯一标识符，用于日志追踪和错误报告
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

/**
 * React错误边界组件
 * 
 * 这是基础错误边界组件，用于捕获子组件树中的JavaScript错误，记录错误信息，
 * 并显示备用UI，防止整个应用崩溃。
 * 
 * 使用场景：
 * 1. 作为其他错误边界组件的基础组件
 * 2. 直接用于包裹可能出错的组件
 * 3. 通过withErrorBoundary高阶组件应用于函数组件
 * 
 * @example
 * // 基本用法
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 * 
 * @example
 * // 自定义错误UI
 * <ErrorBoundary
 *   fallback={(error, errorInfo) => <MyErrorUI error={error} />}
 *   onError={(error, errorInfo) => logError(error, errorInfo)}
 * >
 *   <MyComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  /**
   * 捕获错误
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId
    };
  }

  /**
   * 组件捕获错误后调用
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    
    // 记录错误日志
    this.logError(error, errorInfo);
    
    // 调用自定义错误处理函数
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  /**
   * 检查是否需要重置错误状态
   */
  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetOnPropsChange, resetKeys } = this.props;
    const { hasError } = this.state;
    
    if (hasError && resetOnPropsChange) {
      if (resetKeys) {
        // 检查重置键是否发生变化
        const hasResetKeyChanged = resetKeys.some(
          (resetKey, idx) => prevProps.resetKeys?.[idx] !== resetKey
        );
        
        if (hasResetKeyChanged) {
          this.resetErrorBoundary();
        }
      }
    }
  }

  /**
   * 组件卸载时清理
   */
  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  /**
   * 记录错误日志
   */
  private logError(error: Error, errorInfo: ErrorInfo) {
    console.error('React Error Boundary caught an error', error, {
      errorId: this.state.errorId,
      level: this.props.level,
      componentStack: errorInfo.componentStack,
      errorBoundary: true
    });
  }

  /**
   * 重置错误边界
   */
  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
    
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
  };

  /**
   * 自动重置错误边界
   */
  private autoReset(delay: number = 5000) {
    this.resetTimeoutId = window.setTimeout(() => {
      this.resetErrorBoundary();
    }, delay);
  }

  /**
   * 渲染错误回退UI
   */
  private renderErrorFallback() {
    const { error, errorInfo, errorId } = this.state;
    const { fallback, level } = this.props;

    if (fallback && error && errorInfo) {
      return fallback(error, errorInfo);
    }

    // 默认错误UI
    return (
      <ErrorFallback
        error={error}
        errorInfo={errorInfo}
        errorId={errorId}
        level={level}
        onReset={this.resetErrorBoundary}
        onAutoReset={() => this.autoReset()}
      />
    );
  }

  render() {
    if (this.state.hasError) {
      return this.renderErrorFallback();
    }

    return this.props.children;
  }
}

/**
 * 默认错误回退组件属性
 */
interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  level?: string;
  onReset: () => void;
  onAutoReset: () => void;
}

/**
 * 默认错误回退组件
 */
const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo,
  errorId,
  level,
  onReset,
  onAutoReset
}) => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className="min-h-[400px] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg border border-red-200">
        <div className="p-6">
          {/* 错误图标 */}
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
            <svg
              className="w-6 h-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>

          {/* 错误标题 */}
          <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
            {level === 'page' ? '页面加载出错' : '组件渲染出错'}
          </h3>

          {/* 错误描述 */}
          <p className="text-sm text-gray-600 text-center mb-6">
            {level === 'page' 
              ? '页面在加载过程中遇到了问题，请尝试刷新页面或稍后再试。'
              : '页面的某个部分出现了问题，但不影响其他功能的使用。'
            }
          </p>

          {/* 开发环境错误详情 */}
          {isDevelopment && error && (
            <div className="mb-6 p-3 bg-gray-50 rounded border text-xs">
              <details>
                <summary className="cursor-pointer font-medium text-gray-700 mb-2">
                  错误详情 (开发环境)
                </summary>
                <div className="space-y-2">
                  <div>
                    <strong>错误消息:</strong>
                    <pre className="mt-1 text-red-600 whitespace-pre-wrap">{error.message}</pre>
                  </div>
                  {errorId && (
                    <div>
                      <strong>错误ID:</strong>
                      <code className="ml-1 text-blue-600">{errorId}</code>
                    </div>
                  )}
                  {error.stack && (
                    <div>
                      <strong>堆栈跟踪:</strong>
                      <pre className="mt-1 text-gray-600 whitespace-pre-wrap text-xs overflow-x-auto">
                        {error.stack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onReset}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              重试
            </button>
            
            {level === 'page' && (
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors text-sm font-medium"
              >
                刷新页面
              </button>
            )}
            
            <button
              onClick={onAutoReset}
              className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors text-sm font-medium"
            >
              5秒后自动重试
            </button>
          </div>

          {/* 帮助链接 */}
          <div className="mt-4 text-center">
            <a
              href="/help"
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              需要帮助？访问帮助中心
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * 高阶组件：为组件添加错误边界
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

/**
 * Hook：在函数组件中使用错误边界
 */
export function useErrorBoundary() {
  return React.useCallback((error: Error, errorInfo?: ErrorInfo) => {
    // 在函数组件中，我们需要抛出错误让上层的ErrorBoundary捕获
    throw error;
  }, []);
}