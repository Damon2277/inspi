/**
 * 排行榜页面
 * 显示贡献度排行榜和热门作品推荐
 */
'use client';

import React, { useState } from 'react';
import { RankingList } from '@/components/leaderboard/RankingList';
import { TrendingWorks } from '@/components/leaderboard/TrendingWorks';

type TabType = 'total' | 'weekly' | 'monthly' | 'trending';

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<TabType>('total');

  const tabs = [
    { id: 'total' as TabType, label: '总榜', icon: '🏆' },
    { id: 'weekly' as TabType, label: '周榜', icon: '📅' },
    { id: 'monthly' as TabType, label: '月榜', icon: '📊' },
    { id: 'trending' as TabType, label: '热门作品', icon: '🔥' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 页面头部 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                智慧贡献榜
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                致敬每一位教师的创作与分享，让智慧在这里汇聚与传承
              </p>
            </div>

            {/* 统计卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">👥</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-blue-100">活跃用户</p>
                    <p className="text-2xl font-bold">1,234</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">📝</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-green-100">总作品数</p>
                    <p className="text-2xl font-bold">5,678</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">🔄</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-purple-100">总复用次数</p>
                    <p className="text-2xl font-bold">12,345</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-6 text-white">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">🏆</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-orange-100">总贡献度</p>
                    <p className="text-2xl font-bold">98,765</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 标签页导航 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors
                    ${activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* 标签页内容 */}
          <div className="p-6">
            {activeTab === 'trending' ? (
              <TrendingWorks 
                period="weekly"
                limit={12}
                showPeriodSelector={true}
              />
            ) : (
              <RankingList 
                type={activeTab}
                limit={20}
              />
            )}
          </div>
        </div>

        {/* 底部说明 */}
        <div className="bg-blue-50 rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            贡献度计算规则
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div className="flex items-center justify-center">
              <span className="mr-2">📝</span>
              <span>发布原创作品：+10 分</span>
            </div>
            <div className="flex items-center justify-center">
              <span className="mr-2">🔄</span>
              <span>作品被复用：+50 分</span>
            </div>
          </div>
          <p className="text-blue-700 mt-4 text-sm">
            排行榜每30分钟更新一次，数据可能存在延迟
          </p>
        </div>
      </div>
    </div>
  );
}