/**
 * 热门作品展示组件
 * 显示热门作品推荐
 */
'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { TrendingWork, TrendingWorksResponse } from '@/types/contribution';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface TrendingWorksProps {
  period?: 'daily' | 'weekly' | 'monthly';
  limit?: number;
  showPeriodSelector?: boolean;
  className?: string;
}

export function TrendingWorks({ 
  period = 'weekly', 
  limit = 12,
  showPeriodSelector = true,
  className = '' 
}: TrendingWorksProps) {
  const [trendingWorks, setTrendingWorks] = useState<TrendingWorksResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>(period);

  // 获取热门作品数据
  const fetchTrendingWorks = async (currentPeriod: 'daily' | 'weekly' | 'monthly') => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        period: currentPeriod,
        limit: limit.toString()
      });

      const response = await fetch(`/api/trending?${params}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '获取热门作品失败');
      }

      setTrendingWorks(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取热门作品失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始加载和周期变化时重新加载
  useEffect(() => {
    fetchTrendingWorks(selectedPeriod);
  }, [selectedPeriod, limit]);

  // 获取周期标题
  const getPeriodTitle = (period: string) => {
    switch (period) {
      case 'daily':
        return '今日热门';
      case 'weekly':
        return '本周热门';
      case 'monthly':
        return '本月热门';
      default:
        return '热门作品';
    }
  };

  // 获取热度图标
  const getHotIcon = (score: number) => {
    if (score >= 10) return '🔥🔥🔥';
    if (score >= 5) return '🔥🔥';
    if (score >= 2) return '🔥';
    return '⭐';
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-red-600 mb-4">
          <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="font-medium">加载失败</p>
          <p className="text-sm text-gray-600 mt-1">{error}</p>
        </div>
        <button
          onClick={() => fetchTrendingWorks(selectedPeriod)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          重试
        </button>
      </div>
    );
  }

  if (!trendingWorks || trendingWorks.works.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <p className="font-medium">暂无热门作品</p>
          <p className="text-sm mt-1">还没有符合条件的热门作品</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* 标题和周期选择器 */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {getPeriodTitle(selectedPeriod)}
        </h2>
        
        {showPeriodSelector && (
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['daily', 'weekly', 'monthly'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setSelectedPeriod(p)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  selectedPeriod === p
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {getPeriodTitle(p).replace('热门', '')}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 更新时间 */}
      <div className="text-sm text-gray-500 mb-4">
        更新时间: {new Date(trendingWorks.lastUpdated).toLocaleString()}
      </div>

      {/* 热门作品网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {trendingWorks.works.map((work, index) => (
          <div
            key={work.workId}
            className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-200"
          >
            {/* 作品缩略图 */}
            <div className="relative h-48 bg-gradient-to-br from-blue-50 to-purple-50">
              {work.thumbnail ? (
                <Image
                  src={work.thumbnail}
                  alt={work.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-4xl">📚</div>
                </div>
              )}
              
              {/* 排名标识 */}
              {index < 3 && (
                <div className="absolute top-2 left-2 w-8 h-8 bg-yellow-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </div>
              )}
              
              {/* 热度标识 */}
              <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded-full text-xs">
                {getHotIcon(work.trendingScore)} {work.trendingScore}
              </div>
            </div>

            {/* 作品信息 */}
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                <Link 
                  href={`/works/${work.workId}`}
                  className="hover:text-blue-600 transition-colors"
                >
                  {work.title}
                </Link>
              </h3>
              
              <div className="flex items-center text-sm text-gray-600 mb-3">
                <span className="mr-2">👤</span>
                <Link 
                  href={`/users/${work.authorId}`}
                  className="hover:text-blue-600 transition-colors"
                >
                  {work.authorName}
                </Link>
              </div>

              {/* 统计信息 */}
              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center space-x-3">
                  <span className="flex items-center">
                    <span className="mr-1">🔄</span>
                    {work.reuseCount}
                  </span>
                  <span className="flex items-center">
                    <span className="mr-1">👁️</span>
                    {work.viewCount}
                  </span>
                </div>
                <span className="text-xs">
                  {new Date(work.createdAt).toLocaleDateString()}
                </span>
              </div>

              {/* 标签 */}
              {work.tags && work.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {work.tags.slice(0, 3).map((tag, tagIndex) => (
                    <span
                      key={tagIndex}
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
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TrendingWorks;