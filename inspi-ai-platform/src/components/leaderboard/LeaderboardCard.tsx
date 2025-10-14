/**
 * 排行榜卡片组件
 * 显示单个用户的排名信息
 */
'use client';

import Image from 'next/image';
import React from 'react';

import { LeaderboardEntry } from '@/shared/types/contribution';

interface LeaderboardCardProps {
  entry: LeaderboardEntry;
  showRankChange?: boolean;
  isCurrentUser?: boolean;
  className?: string;
}

export function LeaderboardCard({
  entry,
  showRankChange = false,
  isCurrentUser = false,
  className = '',
}: LeaderboardCardProps) {
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return null;
    }
  };

  const getRankColor = (rank: number) => {
    if (rank <= 3) return 'text-yellow-600';
    if (rank <= 10) return 'text-blue-600';
    return 'text-gray-600';
  };

  const getTrendIcon = (trend?: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <span className="text-green-500">↗️</span>;
      case 'down':
        return <span className="text-red-500">↘️</span>;
      case 'stable':
        return <span className="text-gray-400">→</span>;
      default:
        return null;
    }
  };

  return (
    <div className={`
      flex items-center p-4 bg-white rounded-lg border transition-all duration-200
      ${isCurrentUser ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}
      ${entry.rank <= 3 ? 'shadow-md' : 'shadow-sm hover:shadow-md'}
      ${className}
    `}>
      {/* 排名 */}
      <div className="flex items-center justify-center w-12 h-12 mr-4">
        {getRankIcon(entry.rank) ? (
          <span className="text-2xl">{getRankIcon(entry.rank)}</span>
        ) : (
          <span className={`text-xl font-bold ${getRankColor(entry.rank)}`}>
            #{entry.rank}
          </span>
        )}
      </div>

      {/* 用户头像 */}
      <div className="relative w-12 h-12 mr-4">
        {entry.userAvatar ? (
          <Image
            src={entry.userAvatar}
            alt={entry.userName}
            fill
            className="rounded-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold text-lg">
              {entry.userName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* 当前用户标识 */}
        {isCurrentUser && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs">✓</span>
          </div>
        )}
      </div>

      {/* 用户信息 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <h3 className="font-semibold text-gray-900 truncate">
            {entry.userName}
          </h3>
          {showRankChange && entry.trend && (
            <span className="flex-shrink-0">
              {getTrendIcon(entry.trend)}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
          <span className="flex items-center">
            <span className="mr-1">🏆</span>
            {entry.totalPoints} 分
          </span>
          <span className="flex items-center">
            <span className="mr-1">📝</span>
            {entry.creationCount} 作品
          </span>
          <span className="flex items-center">
            <span className="mr-1">🔄</span>
            {entry.reuseCount} 复用
          </span>
        </div>
      </div>

      {/* 积分显示 */}
      <div className="text-right">
        <div className={`text-2xl font-bold ${getRankColor(entry.rank)}`}>
          {entry.totalPoints}
        </div>
        <div className="text-xs text-gray-500">
          贡献度
        </div>
      </div>
    </div>
  );
}

export default LeaderboardCard;
