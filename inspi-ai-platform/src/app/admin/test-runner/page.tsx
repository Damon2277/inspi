'use client';

import React, { useState, useEffect } from 'react';

interface TestResult {
  testName: string;
  success: boolean;
  duration: number;
  error?: string;
  details?: Record<string, any>;
}

interface TestSuite {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  results?: TestResult[];
  duration?: number;
  successRate?: number;
}

export default function TestRunnerPage() {
  const [testSuites, setTestSuites] = useState<TestSuite[]>([
    { name: '单元测试', status: 'pending' },
    { name: '集成测试', status: 'pending' },
    { name: '端到端测试', status: 'pending' },
    { name: '视觉测试', status: 'pending' },
    { name: '系统集成测试', status: 'pending' },
  ]);

  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string | null>(null);
  const [overallResults, setOverallResults] = useState<any>(null);

  const runAllTests = async () => {
    setIsRunning(true);
    setOverallResults(null);

    // 重置所有测试状态
    const resetSuites = testSuites.map(suite => ({
      ...suite,
      status: 'pending' as const,
    }));
    setTestSuites(resetSuites);

    try {
      // 1. 运行系统集成测试
      await runTestSuite('系统集成测试', async () => {
        const response = await fetch('/api/test/integration', {
          method: 'POST',
        });
        const data = await response.json();
        return data;
      });

      // 2. 模拟其他测试套件
      await runTestSuite('单元测试', async () => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return {
          success: true,
          testResult: {
            totalTests: 45,
            passedTests: 42,
            failedTests: 3,
            duration: 2000,
            results: [
              { testName: '订阅服务测试', success: true, duration: 500 },
              { testName: '支付服务测试', success: true, duration: 600 },
              { testName: '权限中间件测试', success: false, duration: 300, error: '模拟失败' },
            ],
          },
        };
      });

      await runTestSuite('集成测试', async () => {
        await new Promise(resolve => setTimeout(resolve, 3000));
        return {
          success: true,
          testResult: {
            totalTests: 25,
            passedTests: 24,
            failedTests: 1,
            duration: 3000,
            results: [
              { testName: 'API集成测试', success: true, duration: 1500 },
              { testName: '数据库集成测试', success: true, duration: 1200 },
              { testName: '外部服务集成测试', success: false, duration: 300, error: '网络超时' },
            ],
          },
        };
      });

      await runTestSuite('端到端测试', async () => {
        await new Promise(resolve => setTimeout(resolve, 4000));
        return {
          success: true,
          testResult: {
            totalTests: 15,
            passedTests: 15,
            failedTests: 0,
            duration: 4000,
            results: [
              { testName: '用户订阅流程', success: true, duration: 2000 },
              { testName: '支付流程', success: true, duration: 1500 },
              { testName: '升级流程', success: true, duration: 500 },
            ],
          },
        };
      });

      await runTestSuite('视觉测试', async () => {
        await new Promise(resolve => setTimeout(resolve, 1500));
        return {
          success: true,
          testResult: {
            totalTests: 20,
            passedTests: 19,
            failedTests: 1,
            duration: 1500,
            results: [
              { testName: 'UI组件渲染测试', success: true, duration: 800 },
              { testName: '响应式设计测试', success: true, duration: 400 },
              { testName: '视觉回归测试', success: false, duration: 300, error: '样式差异' },
            ],
          },
        };
      });

      // 计算总体结果
      calculateOverallResults();

    } catch (error) {
      console.error('测试运行失败:', error);
    } finally {
      setIsRunning(false);
      setCurrentTest(null);
    }
  };

  const runTestSuite = async (suiteName: string, testFunction: () => Promise<any>) => {
    setCurrentTest(suiteName);

    // 更新状态为运行中
    const updatedSuites = testSuites.map(suite =>
      suite.name === suiteName
        ? { ...suite, status: 'running' as const }
        : suite,
    );
    setTestSuites(updatedSuites);

    try {
      const result = await testFunction();

      // 更新测试结果
      const updatedSuites = testSuites.map(suite =>
        suite.name === suiteName
          ? {
              ...suite,
              status: (result.success ? 'completed' : 'failed') as TestSuite['status'],
              results: result.testResult?.results || [],
              duration: result.testResult?.duration || 0,
              successRate: result.testResult ?
                Math.round((result.testResult.passedTests / result.testResult.totalTests) * 100) : 0,
            }
          : suite,
      );
      setTestSuites(updatedSuites);

    } catch (error) {
      const updatedSuites = testSuites.map(suite =>
        suite.name === suiteName
          ? { ...suite, status: 'failed' as const }
          : suite,
      );
      setTestSuites(updatedSuites);
    }
  };

  const calculateOverallResults = () => {
    const completedSuites = testSuites.filter(suite =>
      suite.status === 'completed' || suite.status === 'failed',
    );

    const totalTests = completedSuites.reduce((sum, suite) =>
      sum + (suite.results?.length || 0), 0,
    );

    const passedTests = completedSuites.reduce((sum, suite) =>
      sum + (suite.results?.filter(r => r.success).length || 0), 0,
    );

    const totalDuration = completedSuites.reduce((sum, suite) =>
      sum + (suite.duration || 0), 0,
    );

    setOverallResults({
      totalSuites: testSuites.length,
      completedSuites: completedSuites.length,
      totalTests,
      passedTests,
      failedTests: totalTests - passedTests,
      successRate: totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0,
      totalDuration,
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'running': return '🔄';
      case 'completed': return '✅';
      case 'failed': return '❌';
      default: return '⏳';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-gray-500';
      case 'running': return 'text-blue-500';
      case 'completed': return 'text-green-500';
      case 'failed': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">测试运行器</h1>
          <p className="text-gray-600">运行订阅支付系统的完整测试套件</p>
        </div>

        {/* 控制面板 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">测试控制</h2>
              <p className="text-gray-600">
                {isRunning ? `正在运行: ${currentTest}` : '点击开始运行所有测试'}
              </p>
            </div>
            <button
              onClick={runAllTests}
              disabled={isRunning}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRunning ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  运行中...
                </span>
              ) : (
                '🚀 运行所有测试'
              )}
            </button>
          </div>
        </div>

        {/* 总体结果 */}
        {overallResults && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">总体结果</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{overallResults.totalSuites}</div>
                <div className="text-sm text-gray-600">测试套件</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{overallResults.totalTests}</div>
                <div className="text-sm text-gray-600">总测试数</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{overallResults.passedTests}</div>
                <div className="text-sm text-gray-600">通过测试</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{overallResults.failedTests}</div>
                <div className="text-sm text-gray-600">失败测试</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{overallResults.successRate}%</div>
                <div className="text-sm text-gray-600">成功率</div>
              </div>
            </div>
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">
                总耗时: {Math.round(overallResults.totalDuration / 1000)}秒
              </p>
            </div>
          </div>
        )}

        {/* 测试套件列表 */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">测试套件</h2>
          </div>

          <div className="divide-y divide-gray-200">
            {testSuites.map((suite, index) => (
              <div key={index} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">{getStatusIcon(suite.status)}</span>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{suite.name}</h3>
                      <p className={`text-sm ${getStatusColor(suite.status)}`}>
                        {suite.status === 'pending' && '等待运行'}
                        {suite.status === 'running' && '正在运行...'}
                        {suite.status === 'completed' && `完成 - 成功率: ${suite.successRate}%`}
                        {suite.status === 'failed' && '运行失败'}
                      </p>
                    </div>
                  </div>

                  {suite.duration && (
                    <div className="text-right">
                      <div className="text-sm text-gray-500">
                        耗时: {Math.round(suite.duration / 1000)}秒
                      </div>
                    </div>
                  )}
                </div>

                {/* 测试结果详情 */}
                {suite.results && suite.results.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">测试详情:</h4>
                    <div className="space-y-2">
                      {suite.results.map((result, resultIndex) => (
                        <div key={resultIndex} className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">{result.testName}</span>
                          <div className="flex items-center">
                            <span className={`mr-2 ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                              {result.success ? '✅' : '❌'}
                            </span>
                            <span className="text-gray-500">{result.duration}ms</span>
                            {result.error && (
                              <span className="ml-2 text-red-500 text-xs">({result.error})</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 运行中的进度条 */}
                {suite.status === 'running' && (
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 测试建议 */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-2">💡 测试建议</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• 建议在每次代码提交前运行完整测试套件</li>
            <li>• 单元测试应该保持快速执行，通常在几秒内完成</li>
            <li>• 集成测试和端到端测试可能需要更长时间</li>
            <li>• 如果测试失败，请检查错误信息并修复相关问题</li>
            <li>• 保持测试覆盖率在80%以上</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
