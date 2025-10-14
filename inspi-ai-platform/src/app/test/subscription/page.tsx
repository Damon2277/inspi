'use client';

import React, { useState, useEffect } from 'react';

import { DEFAULT_PLANS } from '@/core/subscription/constants';
import { EnhancedQuotaChecker } from '@/core/subscription/quota-checker';
import { QuotaType, UserTier, Subscription } from '@/shared/types/subscription';

interface TestResult {
  test: string;
  status: 'success' | 'error' | 'warning';
  data?: any;
  error?: string;
  timestamp: string;
}

export default function SubscriptionTestPage() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTier, setSelectedTier] = useState<UserTier>('free');
  const [testUserId] = useState('test-user-123');

  // 模拟订阅数据
  const mockSubscriptions: Record<UserTier, Subscription | null> = {
    free: null,
    basic: {
      id: 'sub-basic-123',
      userId: testUserId,
      planId: 'plan-basic',
      planName: '基础版',
      tier: 'basic',
      status: 'active',
      monthlyPrice: 69,
      currency: 'CNY',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      paymentMethod: 'wechat_pay',
      quotas: {
        dailyCreateQuota: 20,
        dailyReuseQuota: 5,
        maxExportsPerDay: 50,
        maxGraphNodes: -1,
      },
      features: ['高清导出', '智能分析', '无限知识图谱'],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    pro: {
      id: 'sub-pro-123',
      userId: testUserId,
      planId: 'plan-pro',
      planName: '专业版',
      tier: 'pro',
      status: 'active',
      monthlyPrice: 199,
      currency: 'CNY',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      paymentMethod: 'wechat_pay',
      quotas: {
        dailyCreateQuota: 100,
        dailyReuseQuota: 50,
        maxExportsPerDay: 200,
        maxGraphNodes: -1,
      },
      features: ['高清导出', '智能分析', '无限知识图谱', '品牌定制', '数据导出'],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    admin: {
      id: 'sub-admin-123',
      userId: testUserId,
      planId: 'plan-admin',
      planName: '管理员',
      tier: 'admin',
      status: 'active',
      monthlyPrice: 0,
      currency: 'CNY',
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      paymentMethod: 'wechat_pay',
      quotas: {
        dailyCreateQuota: -1,
        dailyReuseQuota: -1,
        maxExportsPerDay: -1,
        maxGraphNodes: -1,
      },
      features: ['所有功能', '无限制使用'],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  const runQuotaTests = async () => {
    setIsLoading(true);
    const results: any[] = [];

    try {
      const subscription = mockSubscriptions[selectedTier];
      const checker = new EnhancedQuotaChecker(testUserId, subscription);

      // 测试所有配额类型
      const quotaTypes: QuotaType[] = ['create', 'reuse', 'export', 'graph_nodes'];

      for (const type of quotaTypes) {
        try {
          const checkResult = await checker.checkQuota(type);
          results.push({
            test: `配额检查 - ${type}`,
            status: 'success',
            data: checkResult,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          results.push({
            test: `配额检查 - ${type}`,
            status: 'error',
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
          });
        }
      }

      // 测试获取所有配额状态
      try {
        const allStatus = await checker.getAllQuotaStatus();
        results.push({
          test: '获取所有配额状态',
          status: 'success',
          data: allStatus,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        results.push({
          test: '获取所有配额状态',
          status: 'error',
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });
      }

      // 测试升级提示检查
      for (const type of quotaTypes) {
        try {
          const shouldShow = await checker.shouldShowUpgradePrompt(type);
          results.push({
            test: `升级提示检查 - ${type}`,
            status: 'success',
            data: { shouldShow },
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          results.push({
            test: `升级提示检查 - ${type}`,
            status: 'error',
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
          });
        }
      }

    } catch (error) {
      results.push({
        test: '整体测试',
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }

    setTestResults(results);
    setIsLoading(false);
  };

  const testPlanConfiguration = () => {
    const results: any[] = [];

    try {
      // 测试默认套餐配置
      results.push({
        test: '默认套餐配置',
        status: 'success',
        data: DEFAULT_PLANS,
        timestamp: new Date().toISOString(),
      });

      // 验证套餐数据完整性
      for (const plan of DEFAULT_PLANS) {
        const isValid = plan.name && plan.tier &&
                       plan.quotas && typeof plan.monthlyPrice === 'number';
        results.push({
          test: `套餐数据验证 - ${plan.name}`,
          status: isValid ? 'success' : 'error',
          data: { plan, isValid },
          timestamp: new Date().toISOString(),
        });
      }

    } catch (error) {
      results.push({
        test: '套餐配置测试',
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }

    setTestResults([...testResults, ...results]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            订阅系统功能测试
          </h1>

          {/* 测试控制面板 */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">测试控制</h2>

            <div className="flex flex-wrap gap-4 items-center">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  选择用户等级
                </label>
                <select
                  value={selectedTier}
                  onChange={(e) => setSelectedTier(e.target.value as UserTier)}
                  className="border border-gray-300 rounded-md px-3 py-2 bg-white"
                >
                  <option value="free">免费版</option>
                  <option value="basic">基础版</option>
                  <option value="pro">专业版</option>
                  <option value="admin">管理员</option>
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={runQuotaTests}
                  disabled={isLoading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? '测试中...' : '运行配额测试'}
                </button>

                <button
                  onClick={testPlanConfiguration}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                >
                  测试套餐配置
                </button>

                <button
                  onClick={clearResults}
                  className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
                >
                  清空结果
                </button>
              </div>
            </div>
          </div>

          {/* 当前配置显示 */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h3 className="text-md font-semibold text-blue-800 mb-2">
              当前测试配置
            </h3>
            <div className="text-sm text-blue-700">
              <p><strong>用户ID:</strong> {testUserId}</p>
              <p><strong>用户等级:</strong> {selectedTier}</p>
              <p><strong>订阅状态:</strong> {mockSubscriptions[selectedTier] ? '已订阅' : '未订阅'}</p>
              {mockSubscriptions[selectedTier] && (
                <div className="mt-2">
                  <p><strong>套餐:</strong> {mockSubscriptions[selectedTier]!.planName}</p>
                  <p><strong>月费:</strong> ¥{mockSubscriptions[selectedTier]!.monthlyPrice}</p>
                  <p><strong>配额:</strong></p>
                  <ul className="ml-4 list-disc">
                    <li>每日创建: {mockSubscriptions[selectedTier]!.quotas.dailyCreateQuota === -1 ? '无限' : mockSubscriptions[selectedTier]!.quotas.dailyCreateQuota}</li>
                    <li>每日复用: {mockSubscriptions[selectedTier]!.quotas.dailyReuseQuota === -1 ? '无限' : mockSubscriptions[selectedTier]!.quotas.dailyReuseQuota}</li>
                    <li>每日导出: {mockSubscriptions[selectedTier]!.quotas.maxExportsPerDay === -1 ? '无限' : mockSubscriptions[selectedTier]!.quotas.maxExportsPerDay}</li>
                    <li>图谱节点: {mockSubscriptions[selectedTier]!.quotas.maxGraphNodes === -1 ? '无限' : mockSubscriptions[selectedTier]!.quotas.maxGraphNodes}</li>
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* 测试结果 */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">
              测试结果 ({testResults.length} 项)
            </h2>

            {testResults.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                点击上方按钮开始测试
              </div>
            ) : (
              <div className="space-y-3">
                {testResults.map((result, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg p-4 ${
                      result.status === 'success'
                        ? 'border-green-200 bg-green-50'
                        : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900">
                        {result.test}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            result.status === 'success'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {result.status === 'success' ? '✅ 通过' : '❌ 失败'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(result.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>

                    {result.error && (
                      <div className="text-red-700 text-sm mb-2">
                        <strong>错误:</strong> {result.error}
                      </div>
                    )}

                    {result.data && (
                      <details className="text-sm">
                        <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                          查看详细数据
                        </summary>
                        <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 测试统计 */}
          {testResults.length > 0 && (
            <div className="mt-6 bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-2">测试统计</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {testResults.length}
                  </div>
                  <div className="text-sm text-gray-600">总测试数</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {testResults.filter(r => r.status === 'success').length}
                  </div>
                  <div className="text-sm text-gray-600">通过</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {testResults.filter(r => r.status === 'error').length}
                  </div>
                  <div className="text-sm text-gray-600">失败</div>
                </div>
              </div>
              <div className="mt-2 text-center">
                <div className="text-lg font-semibold">
                  通过率: {testResults.length > 0 ? Math.round((testResults.filter(r => r.status === 'success').length / testResults.length) * 100) : 0}%
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
