'use client';

import React, { useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { useApiError, useApiRequest, useApiEndpoint } from '@/hooks/useApiError';
import { useToast } from '@/components/ui/ErrorToast';

/**
 * API测试页面
 */
export default function TestApiPage() {
  const [results, setResults] = useState<any[]>([]);
  const toast = useToast();

  // 使用API错误处理Hook
  const apiError = useApiError({
    showToast: true,
    onError: (error) => {
      console.error('API Error:', error);
    },
    onRetry: (attempt, error) => {
      console.log(`Retry attempt ${attempt} for error:`, error.message);
    }
  });

  // 使用API请求Hook
  const apiRequest = useApiRequest({
    showToast: true
  });

  // 使用API端点Hook
  const exampleEndpoint = useApiEndpoint('/api/example', apiClient, {
    showToast: true
  });

  /**
   * 测试GET请求
   */
  const testGetRequest = async () => {
    try {
      const response = await apiClient.get('/api/example', {
        timeout: 5000
      });
      
      if (response.success) {
        setResults(prev => [...prev, {
          type: 'GET',
          status: 'success',
          data: response.data,
          timestamp: new Date().toISOString()
        }]);
        toast.success('GET请求成功');
      }
    } catch (error) {
      setResults(prev => [...prev, {
        type: 'GET',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }]);
    }
  };

  /**
   * 测试POST请求
   */
  const testPostRequest = async () => {
    const testData = {
      name: 'Test User',
      email: `test${Date.now()}@example.com`
    };

    try {
      const response = await apiClient.post('/api/example', testData);
      
      if (response.success) {
        setResults(prev => [...prev, {
          type: 'POST',
          status: 'success',
          data: response.data,
          timestamp: new Date().toISOString()
        }]);
        toast.success('POST请求成功');
      }
    } catch (error) {
      setResults(prev => [...prev, {
        type: 'POST',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }]);
    }
  };

  /**
   * 测试验证错误
   */
  const testValidationError = async () => {
    const invalidData = {
      name: '', // 空名称
      email: 'invalid-email' // 无效邮箱
    };

    try {
      await apiClient.post('/api/example', invalidData);
    } catch (error) {
      setResults(prev => [...prev, {
        type: 'POST (Validation Error)',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }]);
    }
  };

  /**
   * 测试404错误
   */
  const testNotFoundError = async () => {
    try {
      await apiClient.get('/api/nonexistent');
    } catch (error) {
      setResults(prev => [...prev, {
        type: 'GET (404 Error)',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }]);
    }
  };

  /**
   * 测试网络错误
   */
  const testNetworkError = async () => {
    try {
      await apiClient.get('http://localhost:9999/nonexistent', {
        timeout: 2000
      });
    } catch (error) {
      setResults(prev => [...prev, {
        type: 'GET (Network Error)',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }]);
    }
  };

  /**
   * 测试重试机制
   */
  const testRetryMechanism = async () => {
    const result = await apiError.executeRequest(async () => {
      // 模拟不稳定的请求
      if (Math.random() > 0.3) {
        throw new Error('Random failure for retry test');
      }
      return { message: 'Success after retries' };
    });

    if (result) {
      setResults(prev => [...prev, {
        type: 'Retry Test',
        status: 'success',
        data: result,
        retryCount: apiError.retryCount,
        timestamp: new Date().toISOString()
      }]);
    }
  };

  /**
   * 测试Hook请求
   */
  const testHookRequest = async () => {
    await apiRequest.execute(async () => {
      const response = await apiClient.get('/api/example');
      return response.data;
    });

    if (apiRequest.data) {
      setResults(prev => [...prev, {
        type: 'Hook Request',
        status: 'success',
        data: apiRequest.data,
        timestamp: new Date().toISOString()
      }]);
    }
  };

  /**
   * 测试端点Hook
   */
  const testEndpointHook = async () => {
    await exampleEndpoint.get({ page: '1', limit: '5' });

    if (exampleEndpoint.data) {
      setResults(prev => [...prev, {
        type: 'Endpoint Hook',
        status: 'success',
        data: exampleEndpoint.data,
        timestamp: new Date().toISOString()
      }]);
    }
  };

  /**
   * 清除结果
   */
  const clearResults = () => {
    setResults([]);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">API错误处理测试页面</h1>
      
      <div className="space-y-8">
        {/* 基础API测试 */}
        <section className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">基础API测试</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={testGetRequest}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              GET请求
            </button>
            <button
              onClick={testPostRequest}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              POST请求
            </button>
            <button
              onClick={testValidationError}
              className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
            >
              验证错误
            </button>
            <button
              onClick={testNotFoundError}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              404错误
            </button>
          </div>
        </section>

        {/* 错误处理测试 */}
        <section className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">错误处理测试</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <button
              onClick={testNetworkError}
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
            >
              网络错误
            </button>
            <button
              onClick={testRetryMechanism}
              className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700"
            >
              重试机制
            </button>
            <button
              onClick={() => apiError.clearError()}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              清除错误
            </button>
          </div>
          
          {/* 错误状态显示 */}
          {apiError.isError && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
              <h3 className="font-medium text-red-800">当前错误状态:</h3>
              <p className="text-red-700">{apiError.error?.message}</p>
              <p className="text-sm text-red-600">
                重试次数: {apiError.retryCount} | 可重试: {apiError.canRetry ? '是' : '否'}
              </p>
            </div>
          )}
        </section>

        {/* Hook测试 */}
        <section className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Hook测试</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <button
              onClick={testHookRequest}
              disabled={apiRequest.isLoading}
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:bg-indigo-400"
            >
              {apiRequest.isLoading ? '加载中...' : 'Hook请求'}
            </button>
            <button
              onClick={testEndpointHook}
              disabled={exampleEndpoint.isLoading}
              className="bg-teal-600 text-white px-4 py-2 rounded hover:bg-teal-700 disabled:bg-teal-400"
            >
              {exampleEndpoint.isLoading ? '加载中...' : '端点Hook'}
            </button>
            <button
              onClick={() => {
                apiRequest.reset();
                exampleEndpoint.reset();
              }}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              重置Hook
            </button>
          </div>

          {/* Hook状态显示 */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {apiRequest.data && (
              <div className="p-3 bg-green-50 border border-green-200 rounded">
                <h4 className="font-medium text-green-800">API请求Hook数据:</h4>
                <pre className="text-xs text-green-700 mt-1 overflow-auto">
                  {JSON.stringify(apiRequest.data, null, 2)}
                </pre>
              </div>
            )}
            
            {exampleEndpoint.data && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <h4 className="font-medium text-blue-800">端点Hook数据:</h4>
                <pre className="text-xs text-blue-700 mt-1 overflow-auto">
                  {JSON.stringify(exampleEndpoint.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </section>

        {/* 结果显示 */}
        <section className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">测试结果</h2>
            <button
              onClick={clearResults}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              清除结果
            </button>
          </div>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {results.length === 0 ? (
              <p className="text-gray-500 text-center py-8">暂无测试结果</p>
            ) : (
              results.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded border-l-4 ${
                    result.status === 'success'
                      ? 'bg-green-50 border-green-400'
                      : 'bg-red-50 border-red-400'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium">
                      {result.type}
                      {result.retryCount !== undefined && (
                        <span className="ml-2 text-sm text-gray-600">
                          (重试 {result.retryCount} 次)
                        </span>
                      )}
                    </h3>
                    <span className="text-xs text-gray-500">
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  
                  {result.status === 'success' ? (
                    <pre className="text-sm text-green-700 overflow-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-sm text-red-700">{result.error}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {/* 开发者信息 */}
        <section className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">开发者信息</h2>
          <div className="text-sm text-gray-600 space-y-2">
            <p>• 所有API请求都会自动处理错误和重试</p>
            <p>• 错误信息会显示在Toast通知中</p>
            <p>• 网络错误和服务器错误会自动重试</p>
            <p>• 验证错误和客户端错误不会重试</p>
            <p>• 示例API端点: /api/example</p>
            <p>• 支持GET、POST、PUT、DELETE方法</p>
          </div>
        </section>
      </div>
    </div>
  );
}