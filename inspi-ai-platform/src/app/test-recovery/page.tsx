'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  executeWithRecovery,
  AdvancedRetryManager,
  RecoveryStrategyManager,
  RetryStrategyType,
  DEFAULT_RETRY_CONDITIONS,
  DELAY_CALCULATORS
} from '@/lib/recovery';
import { ApiError } from '@/lib/api/client';
import { CustomError } from '@/lib/errors/CustomError';
import { ErrorCode } from '@/lib/errors/types';

interface TestResult {
  success: boolean;
  message: string;
  attempts?: number;
  duration?: number;
  strategy?: string;
  error?: string;
}

export default function TestRecoveryPage() {
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [retryManager] = useState(() => new AdvancedRetryManager());
  const [recoveryManager] = useState(() => new RecoveryStrategyManager());

  const updateResult = (testName: string, result: TestResult) => {
    setResults(prev => ({ ...prev, [testName]: result }));
    setLoading(prev => ({ ...prev, [testName]: false }));
  };

  const setTestLoading = (testName: string, isLoading: boolean) => {
    setLoading(prev => ({ ...prev, [testName]: isLoading }));
  };

  // 模拟网络错误
  const simulateNetworkError = async (): Promise<string> => {
    throw new ApiError('Network connection failed', 0, 'NETWORK_ERROR');
  };

  // 模拟服务器错误
  const simulateServerError = async (): Promise<string> => {
    throw new ApiError('Internal server error', 500, 'INTERNAL_SERVER_ERROR');
  };

  // 模拟超时错误
  const simulateTimeoutError = async (): Promise<string> => {
    throw new ApiError('Request timeout', 408, 'REQUEST_TIMEOUT');
  };

  // 模拟速率限制错误
  const simulateRateLimitError = async (): Promise<string> => {
    throw new ApiError('Rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED');
  };

  // 模拟验证错误
  const simulateValidationError = async (): Promise<string> => {
    throw new CustomError('Validation failed', ErrorCode.VALIDATION_ERROR);
  };

  // 模拟认证错误
  const simulateAuthError = async (): Promise<string> => {
    throw new ApiError('Unauthorized', 401, 'AUTHENTICATION_ERROR');
  };

  // 模拟间歇性错误（前几次失败，最后成功）
  const createIntermittentError = (failCount: number) => {
    let attempts = 0;
    return async (): Promise<string> => {
      attempts++;
      if (attempts <= failCount) {
        throw new ApiError('Network error', 0, 'NETWORK_ERROR');
      }
      return `Success after ${attempts} attempts`;
    };
  };

  // 测试基本重试功能
  const testBasicRetry = async () => {
    setTestLoading('basicRetry', true);
    try {
      const result = await retryManager.execute(createIntermittentError(2), {
        maxRetries: 3,
        baseDelay: 100,
        retryCondition: DEFAULT_RETRY_CONDITIONS.networkErrors
      });

      updateResult('basicRetry', {
        success: result.success,
        message: result.success ? result.data! : 'Failed',
        attempts: result.attempts,
        duration: result.totalDuration,
        strategy: result.strategy
      });
    } catch (error) {
      updateResult('basicRetry', {
        success: false,
        message: 'Test failed',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  // 测试指数退避策略
  const testExponentialBackoff = async () => {
    setTestLoading('exponentialBackoff', true);
    const delays: number[] = [];
    
    try {
      await retryManager.execute(simulateNetworkError, {
        strategy: RetryStrategyType.EXPONENTIAL_BACKOFF,
        maxRetries: 3,
        baseDelay: 100,
        multiplier: 2,
        jitter: false,
        retryCondition: () => true,
        onRetry: (attempt, error, delay) => {
          delays.push(delay);
        }
      });
    } catch (error) {
      // 预期会失败
    }

    updateResult('exponentialBackoff', {
      success: delays.length > 0,
      message: `Delays: ${delays.join(', ')}ms`,
      attempts: delays.length + 1
    });
  };

  // 测试线性退避策略
  const testLinearBackoff = async () => {
    setTestLoading('linearBackoff', true);
    const delays: number[] = [];
    
    try {
      await retryManager.execute(simulateNetworkError, {
        strategy: RetryStrategyType.LINEAR_BACKOFF,
        maxRetries: 3,
        baseDelay: 100,
        jitter: false,
        retryCondition: () => true,
        onRetry: (attempt, error, delay) => {
          delays.push(delay);
        }
      });
    } catch (error) {
      // 预期会失败
    }

    updateResult('linearBackoff', {
      success: delays.length > 0,
      message: `Delays: ${delays.join(', ')}ms`,
      attempts: delays.length + 1
    });
  };

  // 测试固定间隔策略
  const testFixedInterval = async () => {
    setTestLoading('fixedInterval', true);
    const delays: number[] = [];
    
    try {
      await retryManager.execute(simulateNetworkError, {
        strategy: RetryStrategyType.FIXED_INTERVAL,
        maxRetries: 3,
        baseDelay: 100,
        jitter: false,
        retryCondition: () => true,
        onRetry: (attempt, error, delay) => {
          delays.push(delay);
        }
      });
    } catch (error) {
      // 预期会失败
    }

    updateResult('fixedInterval', {
      success: delays.length > 0,
      message: `Delays: ${delays.join(', ')}ms`,
      attempts: delays.length + 1
    });
  };

  // 测试网络错误恢复
  const testNetworkErrorRecovery = async () => {
    setTestLoading('networkRecovery', true);
    try {
      const result = await recoveryManager.recover(
        new ApiError('Network error', 0, 'NETWORK_ERROR'),
        'network-test'
      );

      updateResult('networkRecovery', {
        success: result.success,
        message: result.success ? 'Recovery successful' : 'Recovery failed',
        strategy: result.strategy,
        attempts: result.attempts,
        duration: result.duration
      });
    } catch (error) {
      updateResult('networkRecovery', {
        success: false,
        message: 'Recovery test failed',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  // 测试服务器错误恢复
  const testServerErrorRecovery = async () => {
    setTestLoading('serverRecovery', true);
    try {
      const result = await recoveryManager.recover(
        new ApiError('Server error', 500, 'INTERNAL_SERVER_ERROR'),
        'server-test'
      );

      updateResult('serverRecovery', {
        success: result.success,
        message: result.success ? 'Recovery successful' : 'Recovery failed',
        strategy: result.strategy,
        attempts: result.attempts,
        duration: result.duration
      });
    } catch (error) {
      updateResult('serverRecovery', {
        success: false,
        message: 'Recovery test failed',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  // 测试验证错误恢复
  const testValidationErrorRecovery = async () => {
    setTestLoading('validationRecovery', true);
    try {
      const result = await recoveryManager.recover(
        new CustomError('Validation failed', ErrorCode.VALIDATION_ERROR),
        'validation-test'
      );

      updateResult('validationRecovery', {
        success: result.success,
        message: result.success ? 'Recovery successful' : 'Recovery failed',
        strategy: result.strategy,
        attempts: result.attempts,
        duration: result.duration
      });
    } catch (error) {
      updateResult('validationRecovery', {
        success: false,
        message: 'Recovery test failed',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  // 测试统一恢复接口
  const testUnifiedRecovery = async () => {
    setTestLoading('unifiedRecovery', true);
    try {
      const result = await executeWithRecovery(
        createIntermittentError(1),
        'unified-test',
        {
          retryConfig: {
            maxRetries: 2,
            retryCondition: DEFAULT_RETRY_CONDITIONS.networkErrors
          }
        }
      );

      updateResult('unifiedRecovery', {
        success: true,
        message: result,
        attempts: 2 // 预期2次尝试
      });
    } catch (error) {
      updateResult('unifiedRecovery', {
        success: false,
        message: 'Unified recovery failed',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  // 获取统计信息
  const getStats = () => {
    return {
      retry: retryManager.getStats(),
      recovery: recoveryManager.getStrategyStats()
    };
  };

  const stats = getStats();

  const renderTestResult = (testName: string, result?: TestResult) => {
    if (loading[testName]) {
      return <Badge variant="secondary">运行中...</Badge>;
    }
    
    if (!result) {
      return <Badge variant="outline">未运行</Badge>;
    }

    return (
      <div className="space-y-2">
        <Badge variant={result.success ? "default" : "destructive"}>
          {result.success ? "成功" : "失败"}
        </Badge>
        <p className="text-sm text-gray-600">{result.message}</p>
        {result.attempts && (
          <p className="text-xs text-gray-500">尝试次数: {result.attempts}</p>
        )}
        {result.duration && (
          <p className="text-xs text-gray-500">耗时: {result.duration}ms</p>
        )}
        {result.strategy && (
          <p className="text-xs text-gray-500">策略: {result.strategy}</p>
        )}
        {result.error && (
          <p className="text-xs text-red-500">错误: {result.error}</p>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">错误恢复系统测试</h1>
        <p className="text-gray-600">测试高级重试机制和错误恢复策略</p>
      </div>

      <Tabs defaultValue="retry" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="retry">重试机制</TabsTrigger>
          <TabsTrigger value="recovery">恢复策略</TabsTrigger>
          <TabsTrigger value="stats">统计信息</TabsTrigger>
        </TabsList>

        <TabsContent value="retry" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>基本重试测试</CardTitle>
                <CardDescription>测试基本的重试功能</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={testBasicRetry} 
                  disabled={loading.basicRetry}
                  className="w-full"
                >
                  运行测试
                </Button>
                {renderTestResult('basicRetry', results.basicRetry)}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>指数退避策略</CardTitle>
                <CardDescription>测试指数退避重试策略</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={testExponentialBackoff} 
                  disabled={loading.exponentialBackoff}
                  className="w-full"
                >
                  运行测试
                </Button>
                {renderTestResult('exponentialBackoff', results.exponentialBackoff)}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>线性退避策略</CardTitle>
                <CardDescription>测试线性退避重试策略</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={testLinearBackoff} 
                  disabled={loading.linearBackoff}
                  className="w-full"
                >
                  运行测试
                </Button>
                {renderTestResult('linearBackoff', results.linearBackoff)}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>固定间隔策略</CardTitle>
                <CardDescription>测试固定间隔重试策略</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={testFixedInterval} 
                  disabled={loading.fixedInterval}
                  className="w-full"
                >
                  运行测试
                </Button>
                {renderTestResult('fixedInterval', results.fixedInterval)}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="recovery" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>网络错误恢复</CardTitle>
                <CardDescription>测试网络错误的恢复策略</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={testNetworkErrorRecovery} 
                  disabled={loading.networkRecovery}
                  className="w-full"
                >
                  运行测试
                </Button>
                {renderTestResult('networkRecovery', results.networkRecovery)}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>服务器错误恢复</CardTitle>
                <CardDescription>测试服务器错误的恢复策略</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={testServerErrorRecovery} 
                  disabled={loading.serverRecovery}
                  className="w-full"
                >
                  运行测试
                </Button>
                {renderTestResult('serverRecovery', results.serverRecovery)}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>验证错误恢复</CardTitle>
                <CardDescription>测试验证错误的恢复策略</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={testValidationErrorRecovery} 
                  disabled={loading.validationRecovery}
                  className="w-full"
                >
                  运行测试
                </Button>
                {renderTestResult('validationRecovery', results.validationRecovery)}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>统一恢复接口</CardTitle>
                <CardDescription>测试统一的错误恢复接口</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={testUnifiedRecovery} 
                  disabled={loading.unifiedRecovery}
                  className="w-full"
                >
                  运行测试
                </Button>
                {renderTestResult('unifiedRecovery', results.unifiedRecovery)}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>重试统计</CardTitle>
                <CardDescription>重试管理器的统计信息</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">总尝试次数:</span>
                    <span className="ml-2">{stats.retry.totalAttempts}</span>
                  </div>
                  <div>
                    <span className="font-medium">成功重试:</span>
                    <span className="ml-2">{stats.retry.successfulRetries}</span>
                  </div>
                  <div>
                    <span className="font-medium">失败重试:</span>
                    <span className="ml-2">{stats.retry.failedRetries}</span>
                  </div>
                  <div>
                    <span className="font-medium">平均尝试:</span>
                    <span className="ml-2">{stats.retry.averageAttempts.toFixed(2)}</span>
                  </div>
                </div>
                
                <div className="mt-4">
                  <h4 className="font-medium mb-2">策略使用情况:</h4>
                  <div className="space-y-1 text-sm">
                    {Object.entries(stats.retry.strategyUsage).map(([strategy, count]) => (
                      <div key={strategy} className="flex justify-between">
                        <span>{strategy}:</span>
                        <span>{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>恢复统计</CardTitle>
                <CardDescription>恢复策略管理器的统计信息</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">总策略数:</span>
                    <span className="ml-2">{stats.recovery.totalStrategies}</span>
                  </div>
                  <div>
                    <span className="font-medium">启用策略:</span>
                    <span className="ml-2">{stats.recovery.enabledStrategies}</span>
                  </div>
                  <div>
                    <span className="font-medium">活跃恢复:</span>
                    <span className="ml-2">{stats.recovery.activeRecoveries}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Alert>
            <AlertDescription>
              统计信息会在每次测试后更新。重试统计显示了重试机制的使用情况，
              恢复统计显示了恢复策略的配置和状态。
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  );
}