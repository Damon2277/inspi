/**
 * 排名列表组件
 * 显示排行榜列表
 */
'use client';

import React, { useState, useEffect } from 'react';
import { LeaderboardEntry, LeaderboardResponse } from '@/types/contribution';
import { LeaderboardCard } from './LeaderboardCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface RankingListProps {
  type: 'total' | 'weekly' | 'monthly' | 'creation' | 'reuse';
  currentUserId?: string;
  limit?: number;
  className?: string;
}

export function RankingList({ 
  type, 
  currentUserId, 
  limit = 20,
  className = '' 
}: RankingListProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // 获取排行榜数据
  const fetchLeaderboard = async (offset = 0, append = false) => {
    try {
      if (offset === 0) setLoading(true);
      else setLoadingMore(true);

      const params = new URLSearchParams({
        type,
        limit: limit.toString(),
        offset: offset.toString(),
        includeUserRank: currentUserId ? 'true' : 'false',
        ...(currentUserId && { userId: currentUserId })
      });

      const response = await fetch(`/api/leaderboard?${params}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '获取排行榜失败');
      }

      const newData = result.data as LeaderboardResponse;
      
      if (append && leaderboard) {
        setLeaderboard({
          ...newData,
          entries: [...leaderboard.entries, ...newData.entries]
        });
      } else {
        setLeaderboard(newData);
      }

      // 检查是否还有更多数据
      setHasMore(newData.entries.length === limit);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取排行榜失败');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // 加载更多数据
  const loadMore = () => {
    if (!loadingMore && hasMore && leaderboard) {
      fetchLeaderboard(leaderboard.entries.length, true);
    }
  };

  // 初始加载和类型变化时重新加载
  useEffect(() => {
    fetchLeaderboard();
  }, [type, currentUserId]);

  // 获取类型标题
  const getTypeTitle = (type: string) => {
    switch (type) {
      case 'total':
        return '总贡献度排行榜';
      case 'weekly':
        return '本周贡献度排行榜';
      case 'monthly':
        return '本月贡献度排行榜';
      case 'creation':
        return '创作排行榜';
      case 'reuse':
        return '复用排行榜';
      default:
        return '排行榜';
    }
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
          onClick={() => fetchLeaderboard()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          重试
        </button>
      </div>
    );
  }

  if (!leaderboard || leaderboard.entries.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="font-medium">暂无排行榜数据</p>
          <p className="text-sm mt-1">还没有用户获得贡献度积分</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* 标题和统计信息 */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {getTypeTitle(type)}
        </h2>
        <div className="flex items-center space-x-6 text-sm text-gray-600">
          <span>共 {leaderboard.entries.length} 位用户</span>
          <span>更新时间: {new Date(leaderboard.lastUpdated).toLocaleString()}</span>
        </div>
      </div>

      {/* 当前用户排名（如果不在前列表中） */}
      {leaderboard.userRank && leaderboard.userRank.rank > limit && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">您的排名</h3>
          <LeaderboardCard
            entry={leaderboard.userRank}
            isCurrentUser={true}
            showRankChange={true}
          />
        </div>
      )}

      {/* 排行榜列表 */}
      <div className="space-y-3">
        {leaderboard.entries.map((entry, index) => (
          <LeaderboardCard
            key={entry.userId}
            entry={entry}
            isCurrentUser={entry.userId === currentUserId}
            showRankChange={type !== 'total'}
            className={index < 3 ? 'ring-2 ring-yellow-200' : ''}
          />
        ))}
      </div>

      {/* 加载更多按钮 */}
      {hasMore && (
        <div className="text-center mt-6">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingMore ? (
              <span className="flex items-center">
                <LoadingSpinner size="sm" className="mr-2" />
                加载中...
              </span>
            ) : (
              '加载更多'
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default RankingList;