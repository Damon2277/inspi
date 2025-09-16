'use client';

import React, { useState } from 'react';

interface UserStats {
  worksCount: number;
  reuseCount: number;
  contributionScore: number;
  rank: number;
}

interface RecentWork {
  id: string;
  title: string;
  knowledgePoint: string;
  subject: string;
  gradeLevel: string;
  cardCount: number;
  reuseCount: number;
  createdAt: string;
  status: 'published' | 'draft';
}

interface MobileUserStatsProps {
  stats: UserStats;
  recentWorks: RecentWork[];
}

const MobileUserStats: React.FC<MobileUserStatsProps> = ({ stats, recentWorks }) => {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');

  // 模拟时间范围数据
  const getStatsForTimeRange = (range: 'week' | 'month' | 'year') => {
    const multipliers = {
      week: 0.2,
      month: 1,
      year: 12
    };
    
    const multiplier = multipliers[range];
    
    return {
      worksCreated: Math.floor(stats.worksCount * multiplier * 0.3),
      totalReuses: Math.floor(stats.reuseCount * multiplier * 0.4),
      contributionGained: Math.floor(stats.contributionScore * multiplier * 0.1),
      rankChange: range === 'week' ? 0 : range === 'month' ? -2 : -8
    };
  };

  const currentStats = getStatsForTimeRange(timeRange);

  // 格式化数字
  const formatNumber = (num: number) => {
    if (num >= 10000) {
      return `${(num / 10000).toFixed(1)}万`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  // 获取时间范围标签
  const getTimeRangeLabel = (range: 'week' | 'month' | 'year') => {
    const labels = {
      week: '本周',
      month: '本月',
      year: '今年'
    };
    return labels[range];
  };

  // 获取趋势图标和颜色
  const getTrendIcon = (value: number) => {
    if (value > 0) {
      return (
        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
        </svg>
      );
    } else if (value < 0) {
      return (
        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 7l-9.2 9.2M7 7v10h10" />
        </svg>
      );
    } else {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
      );
    }
  };

  const getTrendColor = (value: number) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  // 计算进度百分比（模拟）
  const getProgressPercentage = (current: number, total: number) => {
    return Math.min((current / total) * 100, 100);
  };

  return (
    <div className="space-y-4">
      {/* 时间范围选择 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">数据统计</h3>
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['week', 'month', 'year'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors duration-200 ${
                  timeRange === range
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                style={{ touchAction: 'manipulation' }}
              >
                {getTimeRangeLabel(range)}
              </button>
            ))}
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-blue-600 font-medium">创作作品</div>
              {getTrendIcon(currentStats.worksCreated)}
            </div>
            <div className="text-2xl font-bold text-blue-900 mb-1">
              {currentStats.worksCreated}
            </div>
            <div className="text-xs text-blue-600">
              总计 {formatNumber(stats.worksCount)} 个
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-green-600 font-medium">获得复用</div>
              {getTrendIcon(currentStats.totalReuses)}
            </div>
            <div className="text-2xl font-bold text-green-900 mb-1">
              {currentStats.totalReuses}
            </div>
            <div className="text-xs text-green-600">
              总计 {formatNumber(stats.reuseCount)} 次
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-purple-600 font-medium">贡献分</div>
              {getTrendIcon(currentStats.contributionGained)}
            </div>
            <div className="text-2xl font-bold text-purple-900 mb-1">
              +{currentStats.contributionGained}
            </div>
            <div className="text-xs text-purple-600">
              总计 {formatNumber(stats.contributionScore)} 分
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-orange-600 font-medium">排名变化</div>
              {getTrendIcon(-currentStats.rankChange)}
            </div>
            <div className={`text-2xl font-bold mb-1 ${getTrendColor(-currentStats.rankChange)}`}>
              {currentStats.rankChange > 0 ? '+' : ''}{currentStats.rankChange}
            </div>
            <div className="text-xs text-orange-600">
              当前 #{stats.rank}
            </div>
          </div>
        </div>
      </div>

      {/* 成就进度 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">成就进度</h4>
        
        <div className="space-y-4">
          {/* 创作达人 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">创作达人</div>
                  <div className="text-xs text-gray-500">创作 20 个作品</div>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                {stats.worksCount}/20
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${getProgressPercentage(stats.worksCount, 20)}%` }}
              ></div>
            </div>
          </div>

          {/* 分享之星 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">分享之星</div>
                  <div className="text-xs text-gray-500">获得 100 次复用</div>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                {stats.reuseCount}/100
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${getProgressPercentage(stats.reuseCount, 100)}%` }}
              ></div>
            </div>
          </div>

          {/* 贡献专家 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">贡献专家</div>
                  <div className="text-xs text-gray-500">获得 5000 贡献分</div>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                {formatNumber(stats.contributionScore)}/5k
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${getProgressPercentage(stats.contributionScore, 5000)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* 最近作品 */}
      {recentWorks.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-900">最近作品</h4>
            <button
              className="text-sm text-indigo-600 hover:text-indigo-700"
              style={{ touchAction: 'manipulation' }}
            >
              查看全部
            </button>
          </div>
          
          <div className="space-y-3">
            {recentWorks.map((work) => (
              <div
                key={work.id}
                className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
              >
                <div className={`w-2 h-2 rounded-full ${
                  work.status === 'published' ? 'bg-green-500' : 'bg-yellow-500'
                }`}></div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {work.title}
                  </div>
                  <div className="text-xs text-gray-500">
                    {work.subject} • {work.reuseCount} 次复用
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(work.createdAt).toLocaleDateString('zh-CN', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 数据洞察 */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-3">
          <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center">
            <svg className="w-3 h-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h4 className="text-sm font-semibold text-indigo-900">数据洞察</h4>
        </div>
        
        <div className="space-y-2 text-sm text-indigo-800">
          <p>• 你的作品平均获得 {Math.round(stats.reuseCount / Math.max(stats.worksCount, 1))} 次复用</p>
          <p>• 排名比上月提升了 {Math.abs(currentStats.rankChange)} 位</p>
          <p>• 你在数学学科的贡献排名前 20%</p>
        </div>
      </div>
    </div>
  );
};

export default React.memo(MobileUserStats);