'use client';

import React from 'react';
import Image from 'next/image';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  school?: string;
  subject?: string;
  gradeLevel?: string;
  joinDate: string;
  stats: {
    worksCount: number;
    reuseCount: number;
    contributionScore: number;
    rank: number;
  };
}

interface MobileProfileProps {
  user: UserProfile;
  onEdit?: () => void;
}

const MobileProfile: React.FC<MobileProfileProps> = ({ user, onEdit }) => {
  // 格式化加入时间
  const formatJoinDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) {
      return `${diffDays}天前加入`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months}个月前加入`;
    } else {
      const years = Math.floor(diffDays / 365);
      return `${years}年前加入`;
    }
  };

  // 格式化数字显示
  const formatNumber = (num: number) => {
    if (num >= 10000) {
      return `${(num / 10000).toFixed(1)}万`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  // 获取排名显示文本
  const getRankText = (rank: number) => {
    if (rank <= 10) return '顶级贡献者';
    if (rank <= 50) return '优秀贡献者';
    if (rank <= 100) return '活跃贡献者';
    return '贡献者';
  };

  // 获取排名颜色
  const getRankColor = (rank: number) => {
    if (rank <= 10) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    if (rank <= 50) return 'text-purple-600 bg-purple-50 border-purple-200';
    if (rank <= 100) return 'text-blue-600 bg-blue-50 border-blue-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  return (
    <div className="bg-white">
      {/* 个人信息卡片 */}
      <div className="px-4 py-6">
        <div className="flex items-start space-x-4">
          {/* 头像 */}
          <div className="flex-shrink-0">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
              {user.avatar ? (
                <Image
                  src={user.avatar}
                  alt={user.name}
                  width={64}
                  height={64}
                  className="rounded-full"
                />
              ) : (
                <span className="text-2xl font-bold text-white">
                  {user.name.charAt(0)}
                </span>
              )}
            </div>
          </div>

          {/* 基本信息 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-xl font-bold text-gray-900 truncate">
                {user.name}
              </h1>
              <button
                onClick={onEdit}
                className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 active:bg-gray-100 transition-colors duration-200"
                style={{ 
                  minHeight: '32px',
                  touchAction: 'manipulation'
                }}
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                编辑
              </button>
            </div>

            {/* 排名徽章 */}
            <div className="flex items-center space-x-2 mb-2">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getRankColor(user.stats.rank)}`}>
                #{user.stats.rank} {getRankText(user.stats.rank)}
              </span>
            </div>

            {/* 学校和学科信息 */}
            <div className="space-y-1 text-sm text-gray-600">
              {user.school && (
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span className="truncate">{user.school}</span>
                </div>
              )}
              {user.subject && user.gradeLevel && (
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <span>{user.subject} • {user.gradeLevel}</span>
                </div>
              )}
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0h6m-6 0l-2 9a2 2 0 002 2h8a2 2 0 002-2l-2-9m-6 0V7" />
                </svg>
                <span>{formatJoinDate(user.joinDate)}</span>
              </div>
            </div>

            {/* 个人简介 */}
            {user.bio && (
              <div className="mt-3">
                <p className="text-sm text-gray-700 line-clamp-2">
                  {user.bio}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 统计数据 */}
      <div className="border-t border-gray-200 px-4 py-4">
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">
              {formatNumber(user.stats.worksCount)}
            </div>
            <div className="text-xs text-gray-500">作品</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">
              {formatNumber(user.stats.reuseCount)}
            </div>
            <div className="text-xs text-gray-500">复用</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-indigo-600">
              {formatNumber(user.stats.contributionScore)}
            </div>
            <div className="text-xs text-gray-500">贡献分</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-purple-600">
              #{user.stats.rank}
            </div>
            <div className="text-xs text-gray-500">排名</div>
          </div>
        </div>
      </div>

      {/* 快捷操作 */}
      <div className="border-t border-gray-200 px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          <button
            className="flex items-center justify-center px-4 py-3 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 active:bg-gray-100 transition-colors duration-200"
            style={{ 
              minHeight: '44px',
              touchAction: 'manipulation'
            }}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            创建作品
          </button>
          <button
            className="flex items-center justify-center px-4 py-3 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 active:bg-gray-100 transition-colors duration-200"
            style={{ 
              minHeight: '44px',
              touchAction: 'manipulation'
            }}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
            </svg>
            分享资料
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(MobileProfile);