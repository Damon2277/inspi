'use client';

import React, { useState } from 'react';
import { 
  ErrorBoundary, 
  ErrorFallback, 
  NetworkError, 
  RetryButton,
  useErrorBoundary,
  useErrorHandler
} from '@/components/errors';
import { useToast, useErrorToast } from '@/components/ui/ErrorToast';

/**
 * 错误测试组件
 */
const ErrorTestComponent: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('这是一个测试错误！');
  }
  return <div className="p-4 bg-green-100 text-green-800 rounded">组件正常工作</div>;
};

/**
 * 网络错误模拟组件
 */
const NetworkTestComponent: React.FC = () => {
  const [showNetworkError, setShowNetworkError] = useState(false);
  
  const handleRetry = async () => {
    // 模拟网络请求
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 50% 概率成功
    if (Math.random() > 0.5) {
      setShowNetworkError(false);
    } else {
      throw new Error('网络请求失败');
    }
  };

  if (showNetworkError) {
    return <NetworkError onRetry={handleRetry} />;
  }

  return (
    <div className="p-4 bg-blue-100 text-blue-800 rounded">
      <p className="mb-2">网络组件正常</p>
      <button
        onClick={() => setShowNetworkError(true)}
        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
      >
        模拟网络错误
      </button>
    </div>
  );
};

/**
 * Hook错误测试组件
 */
const HookErrorTestComponent: React.FC = () => {
  const { captureError } = useErrorBoundary();

  return (
    <div className="p-4 bg-purple-100 text-purple-800 rounded">
      <p className="mb-2">使用Hook触发错误</p>
      <button
        onClick={() => captureError(new Error('Hook触发的错误'))}
        className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
      >
        触发Hook错误
      </button>
    </div>
  );
};

/**
 * Toast测试组件
 */
const ToastTestComponent: React.FC = () => {
  const toast = useToast();
  const errorToast = useErrorToast();

  return (
    <div className="p-4 bg-green-100 text-green-800 rounded">
      <p className="mb-4">Toast通知测试</p>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => toast.success('操作成功！')}
          className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
        >
          成功提示
        </button>
        <button
          onClick={() => toast.info('这是一条信息')}
          className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
        >
          信息提示
        </button>
        <button
          onClick={() => toast.warning('请注意！')}
          className="bg-yellow-500 text-white px-3 py-1 rounded text-sm hover:bg-yellow-600"
        >
          警告提示
        </button>
        <button
          onClick={() => errorToast.showError('这是一个错误！')}
          className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
        >
          错误提示
        </button>
        <button
          onClick={() => errorToast.showNetworkError(() => console.log('重试网络请求'))}
          className="bg-orange-500 text-white px-3 py-1 rounded text-sm hover:bg-orange-600"
        >
          网络错误
        </button>
        <button
          onClick={() => toast.clear()}
          className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600"
        >
          清除所有
        </button>
      </div>
    </div>
  );
};

/**
 * 错误处理Hook测试组件
 */
const ErrorHandlerTestComponent: React.FC = () => {
  const { error, isError, handleError, clearError, wrapAsync } = useErrorHandler({
    enableRetry: true,
    maxRetries: 2
  });

  const testAsyncOperation = wrapAsync(async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (Math.random() > 0.5) {
      throw new Error('随机异步错误');
    }
    return '操作成功';
  });

  return (
    <div className="p-4 bg-indigo-100 text-indigo-800 rounded">
      <p className="mb-2">错误处理Hook测试</p>
      {isError && error && (
        <div className="mb-3 p-2 bg-red-100 text-red-800 rounded text-sm">
          错误: {error.message}
          <button
            onClick={clearError}
            className="ml-2 text-red-600 hover:text-red-800 underline"
          >
            清除
          </button>
        </div>
      )}
      <div className="space-x-2">
        <button
          onClick={() => handleError('手动触发错误')}
          className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
        >
          手动错误
        </button>
        <button
          onClick={testAsyncOperation}
          className="bg-indigo-500 text-white px-3 py-1 rounded text-sm hover:bg-indigo-600"
        >
          异步操作
        </button>
      </div>
    </div>
  );
};

/**
 * 错误测试页面
 */
export default function TestErrorsPage() {
  const [componentError, setComponentError] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const handleAsyncError = async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    throw new Error('异步操作失败');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">错误处理测试页面</h1>
      
      <div className="space-y-8">
        {/* 基础错误边界测试 */}
        <section className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">基础错误边界测试</h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <button
                onClick={() => setComponentError(!componentError)}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                {componentError ? '修复错误' : '触发错误'}
              </button>
              <button
                onClick={() => setResetKey(prev => prev + 1)}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                重置组件 (resetKey: {resetKey})
              </button>
            </div>
            
            <ErrorBoundary 
              level="component" 
              resetKeys={[resetKey]}
              resetOnPropsChange
            >
              <ErrorTestComponent shouldThrow={componentError} />
            </ErrorBoundary>
          </div>
        </section>

        {/* 页面级错误边界测试 */}
        <section className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">页面级错误边界测试</h2>
          <ErrorBoundary level="page">
            <ErrorTestComponent shouldThrow={componentError} />
          </ErrorBoundary>
        </section>

        {/* 区域级错误边界测试 */}
        <section className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">区域级错误边界测试</h2>
          <ErrorBoundary level="section">
            <ErrorTestComponent shouldThrow={componentError} />
          </ErrorBoundary>
        </section>

        {/* 网络错误测试 */}
        <section className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">网络错误测试</h2>
          <NetworkTestComponent />
        </section>

        {/* Hook错误测试 */}
        <section className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Hook错误测试</h2>
          <ErrorBoundary level="component">
            <HookErrorTestComponent />
          </ErrorBoundary>
        </section>

        {/* 重试按钮测试 */}
        <section className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">重试按钮测试</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">基础重试按钮</h3>
              <RetryButton
                onRetry={handleAsyncError}
                maxRetries={3}
                showCount={true}
              />
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2">自动重试按钮</h3>
              <RetryButton
                onRetry={handleAsyncError}
                maxRetries={3}
                autoRetry={true}
                retryDelay={2000}
                showCount={true}
              />
            </div>
          </div>
        </section>

        {/* 自定义错误回退测试 */}
        <section className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">自定义错误回退测试</h2>
          <div className="space-y-4">
            <ErrorFallback
              title="自定义错误标题"
              message="这是一个自定义的错误消息"
              variant="card"
              size="lg"
              showRetry={true}
              showHome={true}
              showContact={true}
              resetError={() => console.log('重置错误')}
            />
          </div>
        </section>

        {/* Toast测试 */}
        <section className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Toast通知测试</h2>
          <ToastTestComponent />
        </section>

        {/* 错误处理Hook测试 */}
        <section className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">错误处理Hook测试</h2>
          <ErrorHandlerTestComponent />
        </section>

        {/* 开发模式错误详情 */}
        {process.env.NODE_ENV === 'development' && (
          <section className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">开发模式功能</h2>
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
              <p className="text-yellow-800">
                在开发模式下，错误组件会显示详细的错误信息和堆栈跟踪。
                在生产环境中，这些信息将被隐藏以保护应用安全。
              </p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}