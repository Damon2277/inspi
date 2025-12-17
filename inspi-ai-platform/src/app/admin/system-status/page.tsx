'use client';

import React, { useState, useEffect } from 'react';

import { AdminGuard } from '@/components/admin/AdminGuard';

interface SystemStatus {
  subscription: {
    totalSubscriptions: number;
    activeSubscriptions: number;
    revenue: number;
  };
  payments: {
    totalPayments: number;
    successfulPayments: number;
    failedPayments: number;
    successRate: number;
  };
  quotas: {
    totalQuotaUsage: number;
    quotaWarnings: number;
    quotaExceeded: number;
  };
  errors: {
    totalErrors: number;
    criticalErrors: number;
    recentErrors: number;
  };
  security: {
    rateLimitViolations: number;
    signatureFailures: number;
    suspiciousActivity: number;
  };
}

function SystemStatusContent() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [testResults, setTestResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  useEffect(() => {
    loadSystemStatus();
  }, []);

  const loadSystemStatus = async () => {
    try {
      setIsLoading(true);

      // 模拟系统状态数据
      const mockStatus: SystemStatus = {
        subscription: {
          totalSubscriptions: 1250,
          activeSubscriptions: 980,
          revenue: 125000,
        },
        payments: {
          totalPayments: 1580,
          successfulPayments: 1520,
          failedPayments: 60,
          successRate: 96.2,
        },
        quotas: {
          totalQuotaUsage: 85000,
          quotaWarnings: 45,
          quotaExceeded: 12,
        },
        errors: {
          totalErrors: 156,
          criticalErrors: 3,
          recentErrors: 8,
        },
        security: {
          rateLimitViolations: 23,
          signatureFailures: 2,
          suspiciousActivity: 1,
        },
      };

      setStatus(mockStatus);

    } catch (error) {
      console.error('加载系统状态失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const runIntegrationTests = async () => {
    try {
      setIsRunningTests(true);
      setTestError(null);

      const response = await fetch('/api/test/integration', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setTestResults(data);
        setTestError(null);
      } else {
        setTestError(`测试运行失败: ${data.error}`);
        setTestResults(null);
      }

    } catch (error) {
      console.error('运行集成测试失败:', error);
      setTestError('运行集成测试失败');
      setTestResults(null);
    } finally {
      setIsRunningTests(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载系统状态中...</p>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">无法加载系统状态</p>
        </div>
      </div>
    );
  }

  const activeSubscriptionRate = status.subscription.totalSubscriptions
    ? (status.subscription.activeSubscriptions / status.subscription.totalSubscriptions) * 100
    : 0;
  const roundedActiveSubscriptionRate = Math.round(activeSubscriptionRate);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">系统状态监控</h1>
          <p className="text-gray-600">订阅支付系统运行状态和健康监控</p>
        </div>

        {/* 系统概览 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* 订阅状态 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">活跃订阅</p>
                <p className="text-2xl font-semibold text-gray-900">{status.subscription.activeSubscriptions}</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center text-sm text-gray-500">
                <span>总订阅: {status.subscription.totalSubscriptions}</span>
              </div>
            </div>
          </div>

          {/* 支付状态 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">支付成功率</p>
                <p className="text-2xl font-semibold text-gray-900">{status.payments.successRate}%</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center text-sm text-gray-500">
                <span>成功: {status.payments.successfulPayments} / 失败: {status.payments.failedPayments}</span>
              </div>
            </div>
          </div>

          {/* 配额使用 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">配额使用</p>
                <p className="text-2xl font-semibold text-gray-900">{status.quotas.totalQuotaUsage.toLocaleString()}</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center text-sm text-gray-500">
                <span>警告: {status.quotas.quotaWarnings} / 超限: {status.quotas.quotaExceeded}</span>
              </div>
            </div>
          </div>

          {/* 错误监控 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">系统错误</p>
                <p className="text-2xl font-semibold text-gray-900">{status.errors.totalErrors}</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center text-sm text-gray-500">
                <span>严重: {status.errors.criticalErrors} / 最近: {status.errors.recentErrors}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 详细状态 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* 收入统计 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">收入统计</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">总收入</span>
                <span className="text-2xl font-bold text-green-600">¥{status.subscription.revenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">月均收入</span>
                <span className="font-medium">¥{Math.round(status.subscription.revenue / 12).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">ARPU (平均每用户收入)</span>
                <span className="font-medium">¥{Math.round(status.subscription.revenue / status.subscription.totalSubscriptions)}</span>
              </div>
            </div>
          </div>

          {/* 安全监控 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">安全监控</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">访问频率限制违规</span>
                <span className="font-medium text-yellow-600">{status.security.rateLimitViolations}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">签名验证失败</span>
                <span className="font-medium text-red-600">{status.security.signatureFailures}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">可疑活动</span>
                <span className="font-medium text-red-600">{status.security.suspiciousActivity}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 集成测试 */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">系统集成测试</h3>
            <button
              onClick={runIntegrationTests}
              disabled={isRunningTests}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRunningTests ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  运行中...
                </span>
              ) : (
                '运行集成测试'
              )}
            </button>
          </div>

          {testError && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {testError}
            </div>
          )}

          {testResults && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{testResults.summary.totalTests}</div>
                  <div className="text-sm text-gray-600">总测试数</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{testResults.summary.passedTests}</div>
                  <div className="text-sm text-gray-600">通过测试</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{testResults.summary.failedTests}</div>
                  <div className="text-sm text-gray-600">失败测试</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{testResults.summary.successRate}%</div>
                  <div className="text-sm text-gray-600">成功率</div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">测试详情</h4>
                <div className="space-y-2">
                  {testResults.testResult.results.map((result: any, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{result.testName}</span>
                      <span className={`text-sm font-medium ${
                        result.success ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {result.success ? '✅ 通过' : '❌ 失败'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {testResults.summary.failedTests > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-medium text-red-800 mb-2">⚠️ 发现问题</h4>
                  <p className="text-sm text-red-700">
                    有 {testResults.summary.failedTests} 个测试失败，请检查系统状态并修复相关问题。
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 系统健康指标 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">系统健康指标</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 订阅健康度 */}
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 relative">
                <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-gray-300"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-green-500"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeDasharray={`${activeSubscriptionRate}, 100`}
                    strokeLinecap="round"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold text-gray-900">
                    {roundedActiveSubscriptionRate}%
                  </span>
                </div>
              </div>
              <h4 className="font-medium text-gray-900">订阅健康度</h4>
              <p className="text-sm text-gray-600">活跃订阅比例</p>
            </div>

            {/* 支付健康度 */}
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 relative">
                <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-gray-300"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-blue-500"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeDasharray={`${status.payments.successRate}, 100`}
                    strokeLinecap="round"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold text-gray-900">{status.payments.successRate}%</span>
                </div>
              </div>
              <h4 className="font-medium text-gray-900">支付健康度</h4>
              <p className="text-sm text-gray-600">支付成功率</p>
            </div>

            {/* 系统稳定性 */}
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 relative">
                <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-gray-300"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-purple-500"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeDasharray="92, 100"
                    strokeLinecap="round"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold text-gray-900">92%</span>
                </div>
              </div>
              <h4 className="font-medium text-gray-900">系统稳定性</h4>
              <p className="text-sm text-gray-600">综合健康评分</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SystemStatusPage() {
  return (
    <AdminGuard>
      <SystemStatusContent />
    </AdminGuard>
  );
}

