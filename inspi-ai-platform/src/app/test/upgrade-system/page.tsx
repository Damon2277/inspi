'use client';

import React, { useState } from 'react';

import { UpgradeRecommendationEngine, UserBehaviorData, UpgradeContext } from '@/core/subscription/upgrade-engine';
import { useUpgradeRecommendation } from '@/shared/hooks/useUpgradeRecommendation';
import { QuotaType, UserTier } from '@/shared/types/subscription';

export default function UpgradeSystemTestPage() {
  const [testUserId] = useState('test-user-upgrade');
  const [currentTier, setCurrentTier] = useState<UserTier>('free');
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const {
    triggerUpgradeRecommendation,
    UpgradePromptComponent,
    recordUserInteraction,
    behaviorData,
    isLoading,
  } = useUpgradeRecommendation({
    userId: testUserId,
    currentTier,
    onUpgrade: (targetTier) => {
      console.log('Upgrade to:', targetTier);
      addTestResult('升级操作', 'success', `用户选择升级到 ${targetTier}`);
    },
    enablePreventivePrompts: true,
    enableSmartTiming: true,
  });

  const addTestResult = (test: string, status: 'success' | 'error' | 'info', message: string, data?: any) => {
    const newResult = {
      test,
      status,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
    setTestResults([...testResults, newResult]);
  };

  const runUpgradeEngineTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    try {
      // 测试1: 基础升级推荐生成
      await testBasicRecommendation();

      // 测试2: 不同用户类型的推荐
      await testUserTypeRecommendations();

      // 测试3: 升级倾向分析
      await testUpgradePropensity();

      // 测试4: 预防性推荐
      await testPreventiveRecommendations();

      // 测试5: 智能时机推荐
      await testSmartTiming();

    } catch (error) {
      addTestResult('整体测试', 'error', `测试过程中发生错误: ${error}`);
    }

    setIsRunning(false);
  };

  const testBasicRecommendation = async () => {
    const mockBehaviorData: UserBehaviorData = {
      userId: testUserId,
      tier: 'free',
      registrationDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      lastActiveDate: new Date(),
      totalSessions: 15,
      averageSessionDuration: 20,
      dailyActiveStreak: 5,
      quotaUsageHistory: [
        { date: '2024-01-01', create: 3, reuse: 1, export: 5, graph_nodes: 10 },
        { date: '2024-01-02', create: 3, reuse: 1, export: 8, graph_nodes: 15 },
        { date: '2024-01-03', create: 3, reuse: 1, export: 10, graph_nodes: 20 },
      ],
      featureUsage: {
        cardCreation: 25,
        templateReuse: 8,
        imageExport: 15,
        knowledgeGraph: 5,
        sharing: 3,
      },
      upgradePromptViews: 2,
      upgradePromptDismissals: 1,
      pricingPageVisits: 1,
    };

    const context: UpgradeContext = {
      quotaType: 'create',
      currentUsage: 3,
      limit: 3,
      usagePercentage: 100,
      timeOfDay: 'morning',
      dayOfWeek: 'weekday',
      isRecurringUser: true,
      hasRecentActivity: true,
    };

    try {
      const recommendation = UpgradeRecommendationEngine.generateRecommendation(
        mockBehaviorData,
        context,
      );

      addTestResult(
        '基础推荐生成',
        'success',
        `成功生成推荐: ${recommendation.currentPlan} → ${recommendation.recommendedPlan}`,
        recommendation,
      );
    } catch (error) {
      addTestResult('基础推荐生成', 'error', `推荐生成失败: ${error}`);
    }
  };

  const testUserTypeRecommendations = async () => {
    const userTypes = [
      {
        name: '新手用户',
        data: {
          userId: testUserId,
          tier: 'free' as UserTier,
          registrationDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          lastActiveDate: new Date(),
          totalSessions: 3,
          averageSessionDuration: 10,
          dailyActiveStreak: 2,
          quotaUsageHistory: [],
          featureUsage: {
            cardCreation: 5,
            templateReuse: 1,
            imageExport: 2,
            knowledgeGraph: 0,
            sharing: 0,
          },
          upgradePromptViews: 0,
          upgradePromptDismissals: 0,
          pricingPageVisits: 0,
        },
      },
      {
        name: '活跃用户',
        data: {
          userId: testUserId,
          tier: 'free' as UserTier,
          registrationDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          lastActiveDate: new Date(),
          totalSessions: 50,
          averageSessionDuration: 25,
          dailyActiveStreak: 10,
          quotaUsageHistory: Array.from({ length: 7 }, (_, i) => ({
            date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            create: 3,
            reuse: 1,
            export: 8,
            graph_nodes: 20,
          })),
          featureUsage: {
            cardCreation: 100,
            templateReuse: 30,
            imageExport: 50,
            knowledgeGraph: 20,
            sharing: 10,
          },
          upgradePromptViews: 3,
          upgradePromptDismissals: 1,
          pricingPageVisits: 2,
        },
      },
      {
        name: '专业用户',
        data: {
          userId: testUserId,
          tier: 'basic' as UserTier,
          registrationDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          lastActiveDate: new Date(),
          totalSessions: 100,
          averageSessionDuration: 35,
          dailyActiveStreak: 15,
          quotaUsageHistory: Array.from({ length: 14 }, (_, i) => ({
            date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            create: 18,
            reuse: 4,
            export: 30,
            graph_nodes: 50,
          })),
          featureUsage: {
            cardCreation: 300,
            templateReuse: 80,
            imageExport: 150,
            knowledgeGraph: 60,
            sharing: 25,
          },
          upgradePromptViews: 5,
          upgradePromptDismissals: 2,
          pricingPageVisits: 3,
        },
      },
    ];

    const context: UpgradeContext = {
      quotaType: 'create',
      currentUsage: 15,
      limit: 20,
      usagePercentage: 75,
      timeOfDay: 'afternoon',
      dayOfWeek: 'weekday',
      isRecurringUser: true,
      hasRecentActivity: true,
    };

    for (const userType of userTypes) {
      try {
        const recommendation = UpgradeRecommendationEngine.generateRecommendation(
          userType.data,
          context,
        );

        addTestResult(
          `${userType.name}推荐`,
          'success',
          `${userType.name}: ${recommendation.currentPlan} → ${recommendation.recommendedPlan} (紧急程度: ${recommendation.urgency})`,
          recommendation,
        );
      } catch (error) {
        addTestResult(`${userType.name}推荐`, 'error', `${userType.name}推荐生成失败: ${error}`);
      }
    }
  };

  const testUpgradePropensity = async () => {
    const testCases = [
      {
        name: '高倾向用户',
        behaviorData: {
          userId: testUserId,
          tier: 'free' as UserTier,
          registrationDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          lastActiveDate: new Date(),
          totalSessions: 30,
          averageSessionDuration: 30,
          dailyActiveStreak: 8,
          quotaUsageHistory: [],
          featureUsage: {
            cardCreation: 50,
            templateReuse: 15,
            imageExport: 25,
            knowledgeGraph: 10,
            sharing: 5,
          },
          upgradePromptViews: 1,
          upgradePromptDismissals: 0,
          pricingPageVisits: 2,
        },
        context: {
          quotaType: 'create' as QuotaType,
          currentUsage: 3,
          limit: 3,
          usagePercentage: 100,
          timeOfDay: 'morning' as const,
          dayOfWeek: 'weekday' as const,
          isRecurringUser: true,
          hasRecentActivity: true,
        },
      },
      {
        name: '低倾向用户',
        behaviorData: {
          userId: testUserId,
          tier: 'free' as UserTier,
          registrationDate: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
          lastActiveDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          totalSessions: 5,
          averageSessionDuration: 8,
          dailyActiveStreak: 1,
          quotaUsageHistory: [],
          featureUsage: {
            cardCreation: 3,
            templateReuse: 0,
            imageExport: 1,
            knowledgeGraph: 0,
            sharing: 0,
          },
          upgradePromptViews: 5,
          upgradePromptDismissals: 5,
          pricingPageVisits: 0,
        },
        context: {
          quotaType: 'create' as QuotaType,
          currentUsage: 1,
          limit: 3,
          usagePercentage: 33,
          timeOfDay: 'night' as const,
          dayOfWeek: 'weekend' as const,
          isRecurringUser: false,
          hasRecentActivity: false,
        },
      },
    ];

    for (const testCase of testCases) {
      try {
        const propensityScore = UpgradeRecommendationEngine.calculateUpgradePropensity(
          testCase.behaviorData,
          testCase.context,
        );

        addTestResult(
          `升级倾向-${testCase.name}`,
          'success',
          `${testCase.name}: 分数 ${propensityScore.score}, 策略 ${propensityScore.recommendation}`,
          propensityScore,
        );
      } catch (error) {
        addTestResult(`升级倾向-${testCase.name}`, 'error', `倾向分析失败: ${error}`);
      }
    }
  };

  const testPreventiveRecommendations = async () => {
    const behaviorData: UserBehaviorData = {
      userId: testUserId,
      tier: 'free',
      registrationDate: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
      lastActiveDate: new Date(),
      totalSessions: 25,
      averageSessionDuration: 22,
      dailyActiveStreak: 6,
      quotaUsageHistory: [],
      featureUsage: {
        cardCreation: 35,
        templateReuse: 10,
        imageExport: 18,
        knowledgeGraph: 8,
        sharing: 4,
      },
      upgradePromptViews: 1,
      upgradePromptDismissals: 0,
      pricingPageVisits: 1,
    };

    const testCases = [
      { usage: 2, limit: 3, percentage: 67, shouldShow: false },
      { usage: 2.5, limit: 3, percentage: 83, shouldShow: true },
      { usage: 2.9, limit: 3, percentage: 97, shouldShow: true },
    ];

    for (const testCase of testCases) {
      const context: UpgradeContext = {
        quotaType: 'create',
        currentUsage: testCase.usage,
        limit: testCase.limit,
        usagePercentage: testCase.percentage,
        timeOfDay: 'afternoon',
        dayOfWeek: 'weekday',
        isRecurringUser: true,
        hasRecentActivity: true,
      };

      try {
        const recommendation = UpgradeRecommendationEngine.generatePreventiveRecommendation(
          behaviorData,
          context,
        );

        const hasRecommendation = recommendation !== null;
        const expectedResult = testCase.shouldShow;
        const status = hasRecommendation === expectedResult ? 'success' : 'error';

        addTestResult(
          `预防性推荐-${testCase.percentage}%`,
          status,
          `使用率 ${testCase.percentage}%: ${hasRecommendation ? '显示' : '不显示'}推荐 (预期: ${expectedResult ? '显示' : '不显示'})`,
          recommendation,
        );
      } catch (error) {
        addTestResult(`预防性推荐-${testCase.percentage}%`, 'error', `预防性推荐测试失败: ${error}`);
      }
    }
  };

  const testSmartTiming = async () => {
    const behaviorData: UserBehaviorData = {
      userId: testUserId,
      tier: 'free',
      registrationDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      lastActiveDate: new Date(),
      totalSessions: 20,
      averageSessionDuration: 25,
      dailyActiveStreak: 7,
      quotaUsageHistory: [],
      featureUsage: {
        cardCreation: 40,
        templateReuse: 12,
        imageExport: 20,
        knowledgeGraph: 6,
        sharing: 3,
      },
      upgradePromptViews: 0,
      upgradePromptDismissals: 0,
      pricingPageVisits: 1,
    };

    const timingScenarios = [
      { timeOfDay: 'morning', dayOfWeek: 'weekday', expected: 'optimal' },
      { timeOfDay: 'afternoon', dayOfWeek: 'weekday', expected: 'optimal' },
      { timeOfDay: 'evening', dayOfWeek: 'weekday', expected: 'suboptimal' },
      { timeOfDay: 'night', dayOfWeek: 'weekend', expected: 'poor' },
    ];

    for (const scenario of timingScenarios) {
      const context: UpgradeContext = {
        quotaType: 'create',
        currentUsage: 0,
        limit: 3,
        usagePercentage: 0,
        timeOfDay: scenario.timeOfDay as any,
        dayOfWeek: scenario.dayOfWeek as any,
        isRecurringUser: true,
        hasRecentActivity: true,
      };

      try {
        const propensityScore = UpgradeRecommendationEngine.calculateUpgradePropensity(
          behaviorData,
          context,
        );

        addTestResult(
          `智能时机-${scenario.timeOfDay}-${scenario.dayOfWeek}`,
          'info',
          `${scenario.timeOfDay} ${scenario.dayOfWeek}: 倾向分数 ${propensityScore.score} (预期: ${scenario.expected})`,
          { scenario, propensityScore },
        );
      } catch (error) {
        addTestResult(`智能时机-${scenario.timeOfDay}-${scenario.dayOfWeek}`, 'error', `智能时机测试失败: ${error}`);
      }
    }
  };

  const testManualTrigger = (quotaType: QuotaType) => {
    const usageScenarios = {
      create: { usage: 3, limit: 3 },
      reuse: { usage: 1, limit: 1 },
      export: { usage: 10, limit: 10 },
      graph_nodes: { usage: 50, limit: 50 },
    };

    const scenario = usageScenarios[quotaType];
    triggerUpgradeRecommendation(quotaType, scenario.usage, scenario.limit);
    addTestResult('手动触发', 'info', `手动触发 ${quotaType} 配额升级提示`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-50 border-green-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      case 'info': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'info': return 'ℹ️';
      default: return '❓';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            升级推荐系统测试
          </h1>

          {/* 测试控制面板 */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">测试控制</h2>
                <p className="text-sm text-gray-600">
                  当前用户等级: {currentTier} | 行为数据加载: {isLoading ? '加载中...' : '已完成'}
                </p>
              </div>
              <button
                onClick={runUpgradeEngineTests}
                disabled={isRunning}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                {isRunning ? '测试中...' : '运行完整测试'}
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <select
                value={currentTier}
                onChange={(e) => setCurrentTier(e.target.value as UserTier)}
                className="border border-gray-300 rounded-md px-3 py-2 bg-white"
              >
                <option value="free">免费版</option>
                <option value="basic">基础版</option>
                <option value="pro">专业版</option>
              </select>

              <button
                onClick={() => testManualTrigger('create')}
                className="bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 text-sm"
              >
                测试创建配额
              </button>

              <button
                onClick={() => testManualTrigger('reuse')}
                className="bg-yellow-600 text-white px-3 py-2 rounded-md hover:bg-yellow-700 text-sm"
              >
                测试复用配额
              </button>

              <button
                onClick={() => testManualTrigger('export')}
                className="bg-purple-600 text-white px-3 py-2 rounded-md hover:bg-purple-700 text-sm"
              >
                测试导出配额
              </button>
            </div>
          </div>

          {/* 测试结果 */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">
              测试结果 ({testResults.length} 项)
            </h2>

            {testResults.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                点击"运行完整测试"开始测试升级推荐系统
              </div>
            ) : (
              <div className="space-y-3">
                {testResults.map((result, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg p-4 ${getStatusColor(result.status)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{getStatusIcon(result.status)}</span>
                          <h3 className="font-medium text-gray-900">{result.test}</h3>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{result.message}</p>
                        {result.data && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                              查看详细数据
                            </summary>
                            <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                              {JSON.stringify(result.data, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 ml-4">
                        {new Date(result.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 测试统计 */}
          {testResults.length > 0 && (
            <div className="mt-6 bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-2">测试统计</h3>
              <div className="grid grid-cols-4 gap-4 text-center">
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
                  <div className="text-sm text-gray-600">成功</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {testResults.filter(r => r.status === 'error').length}
                  </div>
                  <div className="text-sm text-gray-600">失败</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {testResults.filter(r => r.status === 'info').length}
                  </div>
                  <div className="text-sm text-gray-600">信息</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 升级提示组件 */}
      <UpgradePromptComponent
        onUpgrade={(tier) => {
          console.log('User clicked upgrade to:', tier);
        }}
      />
    </div>
  );
}
