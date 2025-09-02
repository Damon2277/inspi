/**
 * 热门作品组件
 */

'use client';

import React, { useState, useEffect } from 'react';
import { TrendingWorksResponse, TrendingWork } from '@/types/contribution';

interface TrendingWorksProps {
  className?: string;
  limit?: number;
  showPeriodSelector?: boolean;
}

interface WorkCardProps {
  work: TrendingWork;
  rank: number;
}

const WorkCard: React.FC<WorkCardProps> = ({ work, rank }) => {
  const getRankBadge = (rank: number) => {
    if (rank <= 3) {
      const badges = ['🥇', '🥈', '🥉'];
      return badges[rank - 1];
    }
    return `#${rank}`;
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 2: return 'bg-gray-100 text-gray-800 border-gray-200';
      case 3: return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200">
      {/* 排名徽章 */}
      <div className="relative">
        <div className={`absolute top-3 left-3 px-2 py-1 rounded-full text-sm font-bold border ${getRankColor(rank)}`}>
          {getRankBadge(rank)}
        </div>
        
        {/* 作品缩略图 */}
        {work.thumbnail ? (
          <img
            src={work.thumbnail}
            alt={work.title}
            className="w-full h-48 object-cover rounded-t-lg"
          />
        ) : (
          <div className="w-full h-48 bg-gradient-to-br from-blue-100 to-purple-100 rounded-t-lg flex items-center justify-center">
            <div className="text-4xl text-gray-400">📚</div>
          </div>
        )}
      </div>

      {/* 作品信息 */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
          {work.title}
        </h3>
        
        <p className="text-sm text-gray-600 mb-3">
          作者: {work.authorName}
        </p>

        {/* 统计数据 */}
        <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
          <div className="flex items-center space-x-4">
            <span className="flex items-center">
              <span className="text-purple-500 mr-1">🔄</span>
              {work.reuseCount}
            </span>
            <span className="flex items-center">
              <span className="text-blue-500 mr-1">👍</span>
              {work.likeCount}
            </span>
            <span className="flex items-center">
              <span className="text-green-500 mr-1">👁️</span>
              {work.viewCount}
            </span>
          </div>
          <div className="text-orange-600 font-medium">
            {work.trendingScore.toFixed(1)}分
          </div>
        </div>

        {/* 标签 */}
        {work.tags && work.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {work.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
              >
                {tag}
              </span>
            ))}
            {work.tags.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                +{work.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* 创建时间 */}
        <div className="text-xs text-gray-400">
          {formatDate(work.createdAt)}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="px-4 pb-4">
        <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium">
          查看详情
        </button>
      </div>
    </div>
  );
};

const TrendingWorksComponent: React.FC<TrendingWorksProps> = ({
  className = '',
  limit = 12,
  showPeriodSelector = true
}) => {
  const [trendingWorks, setTrendingWorks] = useState<TrendingWorksResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

  const fetchTrendingWorks = async (period: 'daily' | 'weekly' | 'monthly') => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        period,
        limit: limit.toString()
      });

      const response = await fetch(`/api/contribution/trending?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '获取热门作品失败');
      }

      if (data.success) {
        setTrendingWorks(data.data);
      } else {
        throw new Error(data.error || '获取热门作品失败');
      }
    } catch (err) {
      console.error('获取热门作品失败:', err);
      setError(err instanceof Error ? err.message : '获取热门作品失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrendingWorks(selectedPeriod);
  }, [selectedPeriod, limit]);

  const handlePeriodChange = (period: 'daily' | 'weekly' | 'monthly') => {
    setSelectedPeriod(period);
  };

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case 'daily': return '日榜';
      case 'weekly': return '周榜';
      case 'monthly': return '月榜';
      default: return period;
    }
  };

  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded mb-4 w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: limit }).map((_, i) => (
                <div key={i} className="bg-gray-100 rounded-lg">
                  <div className="h-48 bg-gray-200 rounded-t-lg"></div>
                  <div className="p-4">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded mb-3 w-2/3"></div>
                    <div className="flex justify-between">
                      <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className}`}>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="text-red-500 text-xl mr-3">⚠️</div>
              <div>
                <h3 className="text-red-800 font-medium">加载失败</h3>
                <p className="text-red-600 text-sm mt-1">{error}</p>
              </div>
            </div>
            <button
              onClick={() => fetchTrendingWorks(selectedPeriod)}
              className="mt-3 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors text-sm"
            >
              重新加载
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <div className="bg-white rounded-lg shadow-md">
        {/* 头部 */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">热门作品</h2>
            {trendingWorks && (
              <p className="text-sm text-gray-500">
                最后更新: {new Date(trendingWorks.lastUpdated).toLocaleString('zh-CN')}
              </p>
            )}
          </div>

          {/* 时间段选择器 */}
          {showPeriodSelector && (
            <div className="flex space-x-2">
              {(['daily', 'weekly', 'monthly'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => handlePeriodChange(period)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    selectedPeriod === period
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {getPeriodLabel(period)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 作品网格 */}
        <div className="p-6">
          {trendingWorks && trendingWorks.works.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {trendingWorks.works.map((work, index) => (
                <WorkCard
                  key={work.workId}
                  work={work}
                  rank={index + 1}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 text-4xl mb-4">🔥</div>
              <h3 className="text-gray-600 font-medium">暂无热门作品</h3>
              <p className="text-gray-500 text-sm mt-1">
                {selectedPeriod === 'daily' && '今日还没有热门作品'}
                {selectedPeriod === 'weekly' && '本周还没有热门作品'}
                {selectedPeriod === 'monthly' && '本月还没有热门作品'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrendingWorksComponent;