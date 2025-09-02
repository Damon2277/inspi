'use client';

import React, { ErrorInfo } from 'react';
import { ErrorBoundary } from './ErrorBoundary';

/**
 * 全局错误边界属性
 */
interface GlobalErrorBoundaryProps {
  children: React.ReactNode;
}

/**
 * 全局错误回退组件
 */
const GlobalErrorFallback: React.FC<{
  error: Error;
  errorInfo: ErrorInfo;
}> = ({ error, errorInfo }) => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* 错误图标 */}
          <div className="flex items-center justify-center w-16 h-16 mx-auto bg-red-100 rounded-full mb-6">
            <svg
              className="w-8 h-8 text-red-600"
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
          <h2 className="text-center text-2xl font-bold text-gray-900 mb-4">
            应用程序出错
          </h2>

          {/* 错误描述 */}
          <p className="text-center text-sm text-gray-600 mb-8">
            很抱歉，应用程序遇到了一个意外错误。我们已经记录了这个问题，并会尽快修复。
          </p>

          {/* 开发环境错误详情 */}
          {isDevelopment && (
            <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-md">
              <h3 className="text-sm font-medium text-red-800 mb-2">
                错误详情 (开发环境)
              </h3>
              <div className="text-xs text-red-700 space-y-2">
                <div>
                  <strong>错误消息:</strong>
                  <pre className="mt-1 whitespace-pre-wrap">{error.message}</pre>
                </div>
                {error.stack && (
                  <div>
                    <strong>堆栈跟踪:</strong>
                    <pre className="mt-1 whitespace-pre-wrap overflow-x-auto max-h-40">
                      {error.stack}
                    </pre>
                  </div>
                )}
                {errorInfo.componentStack && (
                  <div>
                    <strong>组件堆栈:</strong>
                    <pre className="mt-1 whitespace-pre-wrap overflow-x-auto max-h-40">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="space-y-4">
            <button
              onClick={() => window.location.reload()}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              刷新页面
            </button>
            
            <button
              onClick={() => window.location.href = '/'}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              返回首页
            </button>
          </div>

          {/* 帮助信息 */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500 mb-2">
              如果问题持续存在，请联系我们的技术支持
            </p>
            <a
              href="/contact"
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              联系技术支持
            </a>
          </div>
        </div>
      </div>

      {/* 页脚 */}
      <div className="mt-8 text-center">
        <p className="text-xs text-gray-400">
          Inspi.AI - 让AI成为您教学创意的放大器
        </p>
      </div>
    </div>
  );
};

/**
 * 全局错误边界组件
 */
export const GlobalErrorBoundary: React.FC<GlobalErrorBoundaryProps> = ({ children }) => {
  const handleError = (error: Error, errorInfo: ErrorInfo) => {
    // 记录全局错误到控制台
    console.error('Global Error Boundary caught an error:', error, {
      level: 'global',
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
      critical: true
    });

    // 在生产环境中，可以发送错误报告到监控服务
    if (process.env.NODE_ENV === 'production') {
      // 这里可以集成 Sentry 或其他错误监控服务
      // Sentry.captureException(error, { contexts: { react: errorInfo } });
    }
  };

  return (
    <ErrorBoundary
      level="global"
      onError={handleError}
      fallback={(error, errorInfo) => (
        <GlobalErrorFallback error={error} errorInfo={errorInfo} />
      )}
    >
      {children}
    </ErrorBoundary>
  );
};

/**
 * 页面级错误边界组件
 */
export const PageErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const handleError = (error: Error, errorInfo: ErrorInfo) => {
    console.error('Page Error Boundary caught an error:', error, {
      level: 'page',
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
      url: typeof window !== 'undefined' ? window.location.href : 'unknown'
    });
  };

  return (
    <ErrorBoundary
      level="page"
      onError={handleError}
      resetOnPropsChange={true}
    >
      {children}
    </ErrorBoundary>
  );
};

/**
 * 组件级错误边界组件
 */
export const ComponentErrorBoundary: React.FC<{ 
  children: React.ReactNode;
  componentName?: string;
}> = ({ children, componentName }) => {
  const handleError = (error: Error, errorInfo: ErrorInfo) => {
    console.error(`Component Error Boundary caught an error${componentName ? ` in ${componentName}` : ''}`, error, {
      level: 'component',
      componentName,
      componentStack: errorInfo.componentStack,
      errorBoundary: true
    });
  };

  return (
    <ErrorBoundary
      level="component"
      onError={handleError}
      resetOnPropsChange={true}
    >
      {children}
    </ErrorBoundary>
  );
};

/**
 * 错误边界提供者组件 - 为整个应用提供错误边界
 */
export const ErrorBoundaryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <GlobalErrorBoundary>
      {children}
    </GlobalErrorBoundary>
  );
};