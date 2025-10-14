'use client';

import Link from 'next/link';
import React, { useState, useEffect } from 'react';

import { DEFAULT_PLANS } from '@/core/subscription/constants';
import { formatQuota, calculateQuotaUsagePercentage } from '@/core/subscription/utils';
import { QuotaType, UserTier, UpgradeRecommendation } from '@/shared/types/subscription';

interface UpgradePromptProps {
  isOpen: boolean;
  onClose: () => void;
  quotaType: QuotaType;
  currentUsage: number;
  limit: number;
  currentTier: UserTier;
  recommendation?: UpgradeRecommendation;
  onUpgrade?: (targetTier: UserTier) => void;
}

export function UpgradePrompt({
  isOpen,
  onClose,
  quotaType,
  currentUsage,
  limit,
  currentTier,
  recommendation,
  onUpgrade,
}: UpgradePromptProps) {
  const [selectedPlan, setSelectedPlan] = useState<UserTier>('basic');
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      document.body.style.overflow = 'hidden';

      // 根据当前等级推荐升级目标
      if (currentTier === 'free') {
        setSelectedPlan('basic');
      } else if (currentTier === 'basic') {
        setSelectedPlan('pro');
      }
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, currentTier]);

  if (!isOpen) return null;

  const quotaInfo = getQuotaInfo(quotaType, currentUsage, limit);
  const currentPlan = (DEFAULT_PLANS.find as any)(p => p.tier === currentTier);
  const targetPlan = (DEFAULT_PLANS.find as any)(p => p.tier === selectedPlan);
  const usagePercentage = calculateQuotaUsagePercentage(currentUsage, limit);

  const handleUpgrade = () => {
    onUpgrade && onUpgrade(selectedPlan);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* 背景遮罩 */}
      <div
        className={`fixed inset-0 bg-black transition-opacity duration-300 ${
          isAnimating ? 'bg-opacity-50' : 'bg-opacity-0'
        }`}
        onClick={onClose}
      />

      {/* 弹窗内容 */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className={`relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full transform transition-all duration-300 ${
          isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}>
          {/* 关闭按钮 */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="p-8">
            {/* 头部 */}
            <div className="text-center mb-8">
              <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 mb-4">
                <span className="text-4xl">{quotaInfo.icon}</span>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-3">
                {quotaInfo.title}
              </h3>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                {quotaInfo.description}
              </p>
            </div>

            {/* 当前状态 */}
            <div className="bg-gray-50 rounded-xl p-6 mb-8">
              <div className="text-center mb-4">
                <p className="text-sm text-gray-600 mb-3">当前配额使用情况</p>
                <div className="flex items-center justify-center space-x-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900">{currentUsage}</div>
                    <div className="text-sm text-gray-500">已使用</div>
                  </div>
                  <div className="text-gray-400 text-2xl">/</div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900">{formatQuota(limit)}</div>
                    <div className="text-sm text-gray-500">总配额</div>
                  </div>
                </div>
              </div>

              {/* 进度条 */}
              <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${
                    usagePercentage >= 100 ? 'bg-red-500' :
                    usagePercentage >= 80 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                />
              </div>
              <p className="text-center text-sm text-gray-600">
                使用率: {usagePercentage.toFixed(1)}%
              </p>
            </div>

            {/* 升级方案对比 */}
            <div className="mb-8">
              <h4 className="text-xl font-semibold text-gray-900 mb-6 text-center">选择升级方案</h4>
              <div className="grid md:grid-cols-2 gap-6">
                {/* 基础版 */}
                {currentTier === 'free' && (
                  <PlanCard
                    plan={(DEFAULT_PLANS.find as any)(p => p.tier === 'basic')!}
                    isSelected={selectedPlan === 'basic'}
                    onSelect={() => setSelectedPlan('basic')}
                    quotaType={quotaType}
                    currentQuota={limit}
                    badge="推荐"
                  />
                )}

                {/* 专业版 */}
                <PlanCard
                  plan={(DEFAULT_PLANS.find as any)(p => p.tier === 'pro')!}
                  isSelected={selectedPlan === 'pro'}
                  onSelect={() => setSelectedPlan('pro')}
                  quotaType={quotaType}
                  currentQuota={limit}
                  badge={currentTier === 'free' ? '最受欢迎' : '推荐'}
                  highlight={true}
                />
              </div>
            </div>

            {/* 升级后的价值 */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 mb-8">
              <h4 className="font-semibold text-gray-900 mb-4 text-center">升级后您将获得：</h4>
              <div className="grid grid-cols-2 gap-3">
                {quotaInfo.benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center text-sm text-gray-700">
                    <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {benefit}
                  </div>
                ))}
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex space-x-4">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-4 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                稍后升级
              </button>
              <button
                onClick={handleUpgrade}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium py-4 px-6 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-colors shadow-lg"
              >
                立即升级到{targetPlan?.displayName} - ¥{targetPlan?.monthlyPrice}/月
              </button>
            </div>

            {/* 底部提示 */}
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                💡 升级用户平均每月创建 {selectedPlan === 'basic' ? '450+' : '2000+'} 张卡片，效率提升 {selectedPlan === 'basic' ? '5' : '15'} 倍
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 套餐卡片组件
interface PlanCardProps {
  plan: any;
  isSelected: boolean;
  onSelect: () => void;
  quotaType: QuotaType;
  currentQuota: number;
  badge?: string;
  highlight?: boolean;
}

function PlanCard({ plan, isSelected, onSelect, quotaType, currentQuota, badge, highlight }: PlanCardProps) {
  const getQuotaValue = (quotaType: QuotaType) => {
    switch (quotaType) {
      case 'create': return plan.quotas.dailyCreateQuota;
      case 'reuse': return plan.quotas.dailyReuseQuota;
      case 'export': return plan.quotas.maxExportsPerDay;
      case 'graph_nodes': return plan.quotas.maxGraphNodes;
      default: return 0;
    }
  };

  const quotaValue = getQuotaValue(quotaType);
  const increase = currentQuota === 0 ? '∞' :
    quotaValue === -1 ? '无限制' :
    `${Math.round(((quotaValue - currentQuota) / currentQuota) * 100)}%`;

  return (
    <div
      className={`relative border-2 rounded-xl p-6 cursor-pointer transition-all ${
        isSelected
          ? highlight
            ? 'border-purple-500 bg-purple-50 shadow-lg'
            : 'border-blue-500 bg-blue-50 shadow-lg'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
      }`}
      onClick={onSelect}
    >
      {/* 推荐标签 */}
      {badge && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className={`text-white text-xs px-3 py-1 rounded-full font-medium ${
            highlight ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-blue-500'
          }`}>
            {badge}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xl font-semibold text-gray-900">{plan.displayName}</h4>
        <div className="text-right">
          <div className={`text-3xl font-bold ${highlight ? 'text-purple-600' : 'text-blue-600'}`}>
            ¥{plan.monthlyPrice}
          </div>
          <div className="text-sm text-gray-500">/月</div>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">配额提升</span>
          <span className="font-medium text-gray-900">
            {formatQuota(quotaValue)}
            <span className="text-green-600 ml-2 font-semibold">
              (+{increase})
            </span>
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">高级功能</span>
          <span className="font-medium text-green-600">✓</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">优先支持</span>
          <span className="font-medium text-green-600">✓</span>
        </div>
      </div>

      {isSelected && (
        <div className={`text-xs rounded-lg p-3 ${
          highlight ? 'text-purple-600 bg-purple-100' : 'text-blue-600 bg-blue-100'
        }`}>
          ✨ {highlight ? '最佳选择：功能最全面，性价比最高' : '经济实惠：满足日常使用需求'}
        </div>
      )}
    </div>
  );
}

// 获取配额信息的辅助函数
function getQuotaInfo(quotaType: QuotaType, currentUsage: number, limit: number) {
  const quotaInfoMap = {
    create: {
      icon: '✨',
      title: '今日创建配额已用完',
      description: `您今天已经创建了 ${currentUsage} 张精美卡片！升级后可以创建更多优质内容。`,
      benefits: [
        '释放更大创作潜力',
        '支持更多教学场景',
        '提升工作效率',
        '专业内容制作',
        '高级模板库',
        '智能推荐功能',
        '批量操作工具',
        '数据分析报告',
      ],
    },
    reuse: {
      icon: '🔄',
      title: '今日复用配额已用完',
      description: `您今天已经复用了 ${currentUsage} 张卡片模板！升级后可以更高效地构建知识体系。`,
      benefits: [
        '快速构建教学体系',
        '积累个人知识库',
        '提升创作效率 10 倍',
        '知识复用最大化',
        '模板收藏功能',
        '智能分类管理',
        '批量复用工具',
        '版本历史记录',
      ],
    },
    export: {
      icon: '📥',
      title: '今日导出配额已用完',
      description: `您今天已经导出了 ${currentUsage} 张图片！升级后可以无限制导出高质量内容。`,
      benefits: [
        '无限制图片导出',
        '高清质量保证',
        '批量导出功能',
        '多格式支持',
        '自定义尺寸',
        '水印移除',
        '云端存储',
        'API接口调用',
      ],
    },
    graph_nodes: {
      icon: '🧠',
      title: '知识图谱节点已达上限',
      description: `您的知识图谱已有 ${currentUsage} 个节点！升级后可以构建更完整的知识体系。`,
      benefits: [
        '无限知识图谱节点',
        '高级智能分析',
        '学习路径规划',
        '完整知识体系构建',
        '关联关系挖掘',
        '可视化图表',
        '数据导入导出',
        '协作分享功能',
      ],
    },
  };

  return quotaInfoMap[quotaType];
}

// Hook for using upgrade prompt
export function useUpgradePrompt() {
  const [promptState, setPromptState] = useState<{
    isOpen: boolean;
    quotaType: QuotaType;
    currentUsage: number;
    limit: number;
    currentTier: UserTier;
    recommendation?: UpgradeRecommendation;
  }>({
    isOpen: false,
    quotaType: 'create',
    currentUsage: 0,
    limit: 0,
    currentTier: 'free',
  });

  const showPrompt = (
    quotaType: QuotaType,
    currentUsage: number,
    limit: number,
    currentTier: UserTier,
    recommendation?: UpgradeRecommendation,
  ) => {
    setPromptState({
      isOpen: true,
      quotaType,
      currentUsage,
      limit,
      currentTier,
      recommendation,
    });
  };

  const hidePrompt = () => {
    setPromptState(prev => ({ ...prev, isOpen: false }));
  };

  const UpgradePromptComponent = ({ onUpgrade }: { onUpgrade?: (targetTier: UserTier) => void }) => (
    <UpgradePrompt
      isOpen={promptState.isOpen}
      onClose={hidePrompt}
      quotaType={promptState.quotaType}
      currentUsage={promptState.currentUsage}
      limit={promptState.limit}
      currentTier={promptState.currentTier}
      recommendation={promptState.recommendation}
      onUpgrade={onUpgrade}
    />
  );

  return {
    showPrompt,
    hidePrompt,
    UpgradePromptComponent,
    isOpen: promptState.isOpen,
  };
}
