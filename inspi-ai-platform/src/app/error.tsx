'use client';

import { useEffect } from 'react';
import Link from 'next/link';
// import { CustomError } from '@/lib/errors/CustomError';
// import { ErrorCode } from '@/lib/errors/types';
// import { logger } from '@/lib/logging/logger';

/**
 * 全局错误页面属性
 */
interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * 获取错误类型和用户友好的消息
 */
function getErrorInfo(error: Error) {
  // 简化的错误处理，不依赖CustomError
  const errorMessage = error.message || '发生了未知错误';
  const isNetworkError = errorMessage.includes('fetch') || errorMessage.includes('network');
  
  return {
    title: isNetworkError ? '网络连接错误' : '系统错误',
    message: isNetworkError ? '网络连接失败，请检查网络后重试' : '系统遇到了一个错误，请稍后重试',
    canRetry: true,
    isClientError: false,
    isServerError: !isNetworkError,
    code: 'UNKNOWN_ERROR',
    httpStatus: 500
  };
}

/**
 * 根据错误类型获取标题
 */
function getErrorTitle(httpStatus: number): string {
  if (httpStatus === 404) {
    return '页面未找到';
  } else if (httpStatus >= 500) {
    return '服务器错误';
  } else if (httpStatus >= 400) {
    return '请求错误';
  } else {
    return '系统错误';
  }
}

/**
 * 获取错误图标
 */
function getErrorIcon(httpStatus: number) {
  if (httpStatus === 404) {
    return (
      <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 20c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8a7.962 7.962 0 01-2 5.291z" />
      </svg>
    );
  } else if (httpStatus >= 500) {
    return (
      <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    );
  } else {
    return (
      <svg className="w-12 h-12 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }
}

/**
 * 全局错误页面组件
 */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const errorInfo = getErrorInfo(error);
  const isDevelopment = process.env.NODE_ENV === 'development';

  useEffect(() => {
    // 记录错误日志到控制台
    console.error('Global error page displayed', error, {
      code: errorInfo.code,
      httpStatus: errorInfo.httpStatus,
      canRetry: errorInfo.canRetry,
      digest: (error as any).digest,
      url: typeof window !== 'undefined' ? window.location.href : 'unknown'
    });
  }, [error, errorInfo]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-lg sm:px-10">
          {/* 错误图标 */}
          <div className="flex items-center justify-center w-16 h-16 mx-auto bg-gray-100 rounded-full mb-6">
            {getErrorIcon(errorInfo.httpStatus)}
          </div>

          {/* 错误标题和描述 */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {errorInfo.title}
            </h1>
            <p className="text-gray-600 mb-2">
              {errorInfo.message}
            </p>
            {errorInfo.httpStatus && (
              <p className="text-sm text-gray-500">
                错误代码: {errorInfo.httpStatus}
              </p>
            )}
          </div>

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
                {(error as any).digest && (
                  <div>
                    <strong>错误摘要:</strong>
                    <code className="ml-1">{(error as any).digest}</code>
                  </div>
                )}
                {error.stack && (
                  <div>
                    <strong>堆栈跟踪:</strong>
                    <pre className="mt-1 whitespace-pre-wrap overflow-x-auto max-h-40 text-xs">
                      {error.stack}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="space-y-4">
            {errorInfo.canRetry && (
              <button
                onClick={reset}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                重试
              </button>
            )}
            
            <button
              onClick={() => window.location.reload()}
              className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              刷新页面
            </button>
            
            <Link
              href="/"
              className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              返回首页
            </Link>
          </div>

          {/* 帮助信息 */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="text-center">
              <h3 className="text-sm font-medium text-gray-900 mb-4">
                需要帮助？
              </h3>
              <div className="space-y-2">
                <Link
                  href="/help"
                  className="block text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  访问帮助中心
                </Link>
                <Link
                  href="/contact"
                  className="block text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  联系技术支持
                </Link>
              </div>
            </div>
          </div>

          {/* 状态信息 */}
          {errorInfo.isServerError && (
            <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex">
                <svg className="w-5 h-5 text-yellow-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-yellow-800">
                    服务器暂时不可用
                  </h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    我们正在努力修复这个问题，请稍后再试。
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 页脚 */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500">
          Inspi.AI - 让AI成为您教学创意的放大器
        </p>
      </div>
    </div>
  );
}