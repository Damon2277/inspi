// @ts-nocheck
/**
 * 贡献度排行榜组件
 */

'use client';

import Image from 'next/image';
import React, { useState, useEffect, useCallback } from 'react';

import { LeaderboardResponse, LeaderboardEntry, LeaderboardType } from '@/shared/types/contribution';

interface LeaderboardProps {
  className?: string;
  limit?: number;
  showUserRank?: boolean;
  userId?: string;
}

interface LeaderboardItemProps {
  entry: LeaderboardEntry;
  index: number;
  isCurrentUser?: boolean;
}

const LeaderboardItem: React.FC<LeaderboardItemProps> = ({
  entry,
  index,
  isCurrentUser = false,
}) => {
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'text-yellow-600 bg-yellow-50';
      case 2: return 'text-gray-600 bg-gray-50';
      case 3: return 'text-orange-600 bg-orange-50';
      default: return 'text-gray-700 bg-gray-50';
    }
  };

  return (
    <div className={`flex items-center p-4 rounded-lg transition-colors ${
      isCurrentUser
        ? 'bg-blue-50 border-2 border-blue-200'
        : 'bg-white hover:bg-gray-50'
    }`}>
      {/* 排名 */}
      <div className={`flex items-center justify-center w-12 h-12 rounded-full font-bold ${getRankColor(entry.rank)}`}>
        {typeof getRankIcon(entry.rank) === 'string' && getRankIcon(entry.rank).startsWith('#')
          ? getRankIcon(entry.rank)
          : <span className="text-2xl">{getRankIcon(entry.rank)}</span>
        }
      </div>

      {/* 用户信息 */}
      <div className="flex-1 ml-4">
        <div className="flex items-center">
          {entry.userAvatar && (
            entry.userAvatar.startsWith('http') ? (
              <Image
                src={entry.userAvatar}
                alt={entry.userName}
                width={32}
                height={32}
                className="w-8 h-8 rounded-full mr-3"
                unoptimized
              />
            ) : (
              <span className="w-8 h-8 rounded-full mr-3 flex items-center justify-center bg-gray-100 text-lg">
                {entry.userAvatar}
              </span>
            )
          )}
          <div>
            <h3 className={`font-semibold ${isCurrentUser ? 'text-blue-900' : 'text-gray-900'}`}>
              {entry.userName}
              {isCurrentUser && <span className="ml-2 text-blue-600 text-sm">(你)</span>}
            </h3>
            <p className="text-sm text-gray-600">
              创作 {entry.creationCount} · 被复用 {entry.reuseCount}
            </p>
          </div>
        </div>
      </div>

      {/* 积分 */}
      <div className="text-right">
        <div className={`text-xl font-bold ${isCurrentUser ? 'text-blue-600' : 'text-gray-900'}`}>
          {entry.totalPoints.toLocaleString()}
        </div>
        <div className="text-sm text-gray-500">积分</div>
      </div>

      {/* 趋势指示器 */}
      {entry.trend && (
        <div className="ml-4">
          {entry.trend === 'up' && <span className="text-green-500">📈</span>}
          {entry.trend === 'down' && <span className="text-red-500">📉</span>}
          {entry.trend === 'stable' && <span className="text-gray-400">➡️</span>}
        </div>
      )}
    </div>
  );
};

const LeaderboardComponent: React.FC<LeaderboardProps> = ({
  className = '',
  limit = 50,
  showUserRank = false,
  userId,
}) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<LeaderboardType>(LeaderboardType.TOTAL);

  const fetchLeaderboard = useCallback(async (type: LeaderboardType) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        type,
        limit: limit.toString(),
        offset: '0',
      });

      if (showUserRank && userId) {
        params.append('includeUserRank', 'true');
        params.append('userId', userId);
      }

      const response = await fetch(`/api/contribution/leaderboard?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '获取排行榜失败');
      }

      if (data.success) {
        setLeaderboard(data.data);
      } else {
        throw new Error(data.error || '获取排行榜失败');
      }
    } catch (err) {
      console.error('获取排行榜失败:', err);
      setError(err instanceof Error ? err.message : '获取排行榜失败');
    } finally {
      setLoading(false);
    }
  }, [limit, showUserRank, userId]);

  useEffect(() => {
    void fetchLeaderboard(selectedType);
  }, [selectedType, fetchLeaderboard]);

  const handleTypeChange = (type: LeaderboardType) => {
    setSelectedType(type);
  };

  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded mb-4 w-1/3"></div>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center p-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 ml-4">
                    <div className="h-4 bg-gray-200 rounded mb-2 w-1/3"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                  </div>
                  <div className="w-16 h-6 bg-gray-200 rounded"></div>
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
              onClick={() => void fetchLeaderboard(selectedType)}
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
            <h2 className="text-2xl font-bold text-gray-900">贡献度排行榜</h2>
            {leaderboard && (
              <p className="text-sm text-gray-500">
                最后更新: {new Date(leaderboard.lastUpdated).toLocaleString('zh-CN')}
              </p>
            )}
          </div>

          {/* 类型切换 */}
          <div className="flex space-x-2">
            {Object.values(LeaderboardType).map((type) => (
              <button
                key={type}
                onClick={() => handleTypeChange(type)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedType === type
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {type === LeaderboardType.TOTAL && '总榜'}
                {type === LeaderboardType.WEEKLY && '周榜'}
                {type === LeaderboardType.MONTHLY && '月榜'}
                {type === LeaderboardType.CREATION && '创作榜'}
                {type === LeaderboardType.REUSE && '复用榜'}
              </button>
            ))}
          </div>
        </div>

        {/* 排行榜列表 */}
        <div className="p-6">
          {leaderboard && leaderboard.entries.length > 0 ? (
            <div className="space-y-3">
              {leaderboard.entries.map((entry, index) => (
                <LeaderboardItem
                  key={entry.userId}
                  entry={entry}
                  index={index}
                  isCurrentUser={showUserRank && userId === entry.userId}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 text-4xl mb-4">🏆</div>
              <h3 className="text-gray-600 font-medium">暂无排行榜数据</h3>
              <p className="text-gray-500 text-sm mt-1">快来创作作品，成为第一名吧！</p>
            </div>
          )}
        </div>

        {/* 用户排名（如果启用且不在列表中） */}
        {showUserRank && leaderboard?.userRank && !(leaderboard.entries as any).find(e => e.userId === userId) && (
          <div className="border-t border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">你的排名</h3>
            <LeaderboardItem
              entry={leaderboard.userRank}
              index={-1}
              isCurrentUser={true}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaderboardComponent;
