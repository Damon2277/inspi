'use client';

import React, { useState } from 'react';

import { useToast } from '@/shared/hooks';
import { QuotaType, UserTier } from '@/shared/types/subscription';

// 升级提示组件（简化版，用于测试）
interface UpgradePromptProps {
  isOpen: boolean;
  onClose: () => void;
  quotaType: QuotaType;
  currentUsage: number;
  limit: number;
  currentTier: UserTier;
}

function UpgradePrompt({
  isOpen,
  onClose,
  quotaType,
  currentUsage,
  limit,
  currentTier,
}: UpgradePromptProps) {
  const { toast } = useToast();

  if (!isOpen) return null;

  const quotaInfo = {
    create: {
      icon: '✨',
      title: '今日创建配额已用完',
      description: `您今天已经创建了 ${currentUsage} 张精美卡片！`,
      benefits: [
        '释放更大创作潜力',
        '支持更多教学场景',
        '提升工作效率',
        '专业内容制作',
      ],
    },
    reuse: {
      icon: '🔄',
      title: '今日复用配额已用完',
      description: `您今天已经复用了 ${currentUsage} 张卡片模板！`,
      benefits: [
        '快速构建教学体系',
        '积累个人知识库',
        '提升创作效率 10 倍',
        '知识复用最大化',
      ],
    },
    export: {
      icon: '📥',
      title: '今日导出配额已用完',
      description: `您今天已经导出了 ${currentUsage} 张图片！`,
      benefits: [
        '无限制图片导出',
        '高清质量保证',
        '批量导出功能',
        '多格式支持',
      ],
    },
    graph_nodes: {
      icon: '🧠',
      title: '知识图谱节点已达上限',
      description: `您的知识图谱已有 ${currentUsage} 个节点！`,
      benefits: [
        '无限知识图谱节点',
        '高级智能分析',
        '学习路径规划',
        '完整知识体系构建',
      ],
    },
  };

  const info = quotaInfo[quotaType];

  const planInfo = {
    free: { name: '免费版', price: 0, nextTier: 'basic' },
    basic: { name: '基础版', price: 69, nextTier: 'pro' },
    pro: { name: '专业版', price: 199, nextTier: 'pro' },
    admin: { name: '管理员', price: 0, nextTier: 'admin' },
  };

  const current = planInfo[currentTier];
  const recommended = planInfo[current.nextTier as UserTier];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="text-center mb-6">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 mb-4">
              <span className="text-3xl">{info.icon}</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {info.title}
            </h3>
            <p className="text-gray-600 text-lg">
              {info.description}
            </p>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">当前配额使用情况</p>
              <div className="flex items-center justify-center space-x-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{currentUsage}</div>
                  <div className="text-sm text-gray-500">已使用</div>
                </div>
                <div className="text-gray-400">/</div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{limit === -1 ? '无限' : limit}</div>
                  <div className="text-sm text-gray-500">总配额</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-4 mb-6">
            <h4 className="font-semibold text-gray-900 mb-3">升级后您将获得：</h4>
            <div className="grid grid-cols-2 gap-2">
              {info.benefits.map((benefit, index) => (
                <div key={index} className="flex items-center text-sm text-gray-700">
                  <svg className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {benefit}
                </div>
              ))}
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              稍后升级
            </button>
            <button
              onClick={() => {
                toast({
                  title: `升级到${recommended.name}`,
                  description: `已为您记录意向，套餐费用为 ¥${recommended.price}/月。`,
                });
                onClose();
              }}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium py-3 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors"
            >
              立即升级到{recommended.name}
            </button>
          </div>

          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              💡 升级用户平均每月创建 {recommended.nextTier === 'basic' ? '450+' : '2000+'} 张卡片
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UpgradePromptTestPage() {
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [selectedQuotaType, setSelectedQuotaType] = useState<QuotaType>('create');
  const [selectedTier, setSelectedTier] = useState<UserTier>('free');
  const [currentUsage, setCurrentUsage] = useState(3);
  const [limit, setLimit] = useState(3);

  const quotaTypes: { value: QuotaType; label: string }[] = [
    { value: 'create', label: '创建配额' },
    { value: 'reuse', label: '复用配额' },
    { value: 'export', label: '导出配额' },
    { value: 'graph_nodes', label: '图谱节点' },
  ];

  const userTiers: { value: UserTier; label: string }[] = [
    { value: 'free', label: '免费版' },
    { value: 'basic', label: '基础版' },
    { value: 'pro', label: '专业版' },
    { value: 'admin', label: '管理员' },
  ];

  const showPrompt = () => {
    setIsPromptOpen(true);
  };

  const closePrompt = () => {
    setIsPromptOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            升级提示组件测试
          </h1>

          {/* 测试控制面板 */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">测试参数设置</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  配额类型
                </label>
                <select
                  value={selectedQuotaType}
                  onChange={(e) => setSelectedQuotaType(e.target.value as QuotaType)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
                >
                  {quotaTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  用户等级
                </label>
                <select
                  value={selectedTier}
                  onChange={(e) => setSelectedTier(e.target.value as UserTier)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
                >
                  {userTiers.map(tier => (
                    <option key={tier.value} value={tier.value}>
                      {tier.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  当前使用量
                </label>
                <input
                  type="number"
                  value={currentUsage}
                  onChange={(e) => setCurrentUsage(parseInt(e.target.value, 10) || 0)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  配额限制
                </label>
                <input
                  type="number"
                  value={limit}
                  onChange={(e) => setLimit(parseInt(e.target.value, 10) || 0)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  min="-1"
                  placeholder="-1 表示无限"
                />
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={showPrompt}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                显示升级提示
              </button>
            </div>
          </div>

          {/* 当前配置显示 */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h3 className="text-md font-semibold text-blue-800 mb-2">
              当前测试配置
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-blue-700">
              <div>
                <strong>配额类型:</strong> {(quotaTypes.find as any)(t => t.value === selectedQuotaType)?.label}
              </div>
              <div>
                <strong>用户等级:</strong> {(userTiers.find as any)(t => t.value === selectedTier)?.label}
              </div>
              <div>
                <strong>使用情况:</strong> {currentUsage} / {limit === -1 ? '无限' : limit}
              </div>
              <div>
                <strong>使用率:</strong> {limit === -1 ? '0%' : Math.round((currentUsage / limit) * 100)}%
              </div>
            </div>
          </div>

          {/* 功能说明 */}
          <div className="bg-green-50 rounded-lg p-4">
            <h3 className="text-md font-semibold text-green-800 mb-2">
              测试说明
            </h3>
            <div className="text-sm text-green-700 space-y-2">
              <p>• 调整上方参数，然后点击"显示升级提示"按钮测试不同场景</p>
              <p>• 升级提示会根据配额类型显示不同的图标、标题和描述</p>
              <p>• 推荐的升级方案会根据当前用户等级自动计算</p>
              <p>• 测试不同的使用量和限制组合，观察提示内容的变化</p>
            </div>
          </div>

          {/* 测试场景快捷按钮 */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">快速测试场景</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <button
                onClick={() => {
                  setSelectedQuotaType('create');
                  setSelectedTier('free');
                  setCurrentUsage(3);
                  setLimit(3);
                  setTimeout(() => setIsPromptOpen(true), 100);
                }}
                className="p-3 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors text-sm"
              >
                免费用户创建配额用完
              </button>

              <button
                onClick={() => {
                  setSelectedQuotaType('reuse');
                  setSelectedTier('basic');
                  setCurrentUsage(5);
                  setLimit(5);
                  setTimeout(() => setIsPromptOpen(true), 100);
                }}
                className="p-3 bg-orange-100 text-orange-800 rounded-lg hover:bg-orange-200 transition-colors text-sm"
              >
                基础用户复用配额用完
              </button>

              <button
                onClick={() => {
                  setSelectedQuotaType('export');
                  setSelectedTier('free');
                  setCurrentUsage(10);
                  setLimit(10);
                  setTimeout(() => setIsPromptOpen(true), 100);
                }}
                className="p-3 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition-colors text-sm"
              >
                免费用户导出配额用完
              </button>

              <button
                onClick={() => {
                  setSelectedQuotaType('graph_nodes');
                  setSelectedTier('free');
                  setCurrentUsage(50);
                  setLimit(50);
                  setTimeout(() => setIsPromptOpen(true), 100);
                }}
                className="p-3 bg-purple-100 text-purple-800 rounded-lg hover:bg-purple-200 transition-colors text-sm"
              >
                免费用户图谱节点达上限
              </button>

              <button
                onClick={() => {
                  setSelectedQuotaType('create');
                  setSelectedTier('basic');
                  setCurrentUsage(20);
                  setLimit(20);
                  setTimeout(() => setIsPromptOpen(true), 100);
                }}
                className="p-3 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors text-sm"
              >
                基础用户创建配额用完
              </button>

              <button
                onClick={() => {
                  setSelectedQuotaType('create');
                  setSelectedTier('pro');
                  setCurrentUsage(100);
                  setLimit(100);
                  setTimeout(() => setIsPromptOpen(true), 100);
                }}
                className="p-3 bg-indigo-100 text-indigo-800 rounded-lg hover:bg-indigo-200 transition-colors text-sm"
              >
                专业用户创建配额用完
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 升级提示组件 */}
      <UpgradePrompt
        isOpen={isPromptOpen}
        onClose={closePrompt}
        quotaType={selectedQuotaType}
        currentUsage={currentUsage}
        limit={limit}
        currentTier={selectedTier}
      />
    </div>
  );
}
