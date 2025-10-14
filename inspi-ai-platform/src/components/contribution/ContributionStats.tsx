/**
 * 贡献度统计组件
 */

'use client';

import React, { useState, useEffect } from 'react';

import { ContributionStats } from '@/shared/types/contribution';

interface ContributionStatsProps {
  userId: string;
  className?: string;
}

interface StatsCardProps {
  title: string;
  value: number;
  icon: string;
  color: string;
  description?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, color, description }) => {
  return (
    <div className={`bg-white rounded-lg shadow-md p-6 border-l-4 border-${color}-500`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
          {description && (
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          )}
        </div>
        <div className={`text-3xl text-${color}-500`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

const ContributionStatsComponent: React.FC<ContributionStatsProps> = ({
  userId,
  className = '',
}) => {
  const [stats, setStats] = useState<ContributionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/contribution/user/${userId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || '获取统计数据失败');
        }

        if (data.success) {
          setStats(data.data);
        } else {
          throw new Error(data.error || '获取统计数据失败');
        }
      } catch (err) {
        console.error('获取贡献度统计失败:', err);
        setError(err instanceof Error ? err.message : '获取统计数据失败');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchStats();
    }
  }, [userId]);

  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
                <div className="w-12 h-12 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-red-500 text-xl mr-3">⚠️</div>
            <div>
              <h3 className="text-red-800 font-medium">加载失败</h3>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors text-sm"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className={`${className}`}>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <div className="text-gray-400 text-4xl mb-4">📊</div>
          <h3 className="text-gray-600 font-medium">暂无统计数据</h3>
          <p className="text-gray-500 text-sm mt-1">开始创作或复用作品来获得贡献度吧！</p>
        </div>
      </div>
    );
  }

  const statsCards = [
    {
      title: '总贡献度',
      value: stats.totalPoints,
      icon: '🏆',
      color: 'blue',
      description: '累计获得的贡献度积分',
    },
    {
      title: '创作作品',
      value: stats.worksCount,
      icon: '📝',
      color: 'green',
      description: '发布的原创作品数量',
    },
    {
      title: '被复用次数',
      value: stats.reuseCount,
      icon: '🔄',
      color: 'purple',
      description: '作品被他人复用的总次数',
    },
    {
      title: '当前排名',
      value: stats.rank || 0,
      icon: '📊',
      color: 'orange',
      description: '在贡献度排行榜中的位置',
    },
  ];

  return (
    <div className={`${className}`}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">贡献度统计</h2>
        <p className="text-gray-600">
          最后更新: {new Date(stats.lastUpdated).toLocaleString('zh-CN')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((card, index) => (
          <StatsCard
            key={index}
            title={card.title}
            value={card.value}
            icon={card.icon}
            color={card.color}
            description={card.description}
          />
        ))}
      </div>

      {/* 详细分数分布 */}
      <div className="mt-8 bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">积分分布</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {stats.creationPoints}
            </div>
            <div className="text-sm text-green-700">创作积分</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {stats.reusePoints}
            </div>
            <div className="text-sm text-purple-700">复用积分</div>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {stats.bonusPoints}
            </div>
            <div className="text-sm text-orange-700">奖励积分</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContributionStatsComponent;
