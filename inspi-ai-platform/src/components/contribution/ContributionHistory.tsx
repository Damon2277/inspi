/**
 * 贡献度历史记录组件
 */

'use client';

import React, { useState, useEffect } from 'react';

import { ContributionHistory, ContributionRecord, ContributionType } from '@/shared/types/contribution';

interface ContributionHistoryProps {
  userId: string;
  className?: string;
  limit?: number;
}

interface HistoryItemProps {
  record: ContributionRecord;
}

const HistoryItem: React.FC<HistoryItemProps> = ({ record }) => {
  const getTypeIcon = (type: ContributionType) => {
    switch (type) {
      case ContributionType.WORK_CREATION:
        return '📝';
      case ContributionType.WORK_REUSED:
        return '🔄';
      case ContributionType.WORK_LIKED:
        return '👍';
      case ContributionType.WORK_SHARED:
        return '📤';
      case ContributionType.PROFILE_COMPLETED:
        return '👤';
      case ContributionType.FIRST_WORK:
        return '🌟';
      case ContributionType.MILESTONE_REACHED:
        return '🏆';
      default:
        return '📊';
    }
  };

  const getTypeColor = (type: ContributionType) => {
    switch (type) {
      case ContributionType.WORK_CREATION:
        return 'text-green-600 bg-green-50';
      case ContributionType.WORK_REUSED:
        return 'text-purple-600 bg-purple-50';
      case ContributionType.WORK_LIKED:
        return 'text-blue-600 bg-blue-50';
      case ContributionType.WORK_SHARED:
        return 'text-orange-600 bg-orange-50';
      case ContributionType.PROFILE_COMPLETED:
        return 'text-indigo-600 bg-indigo-50';
      case ContributionType.FIRST_WORK:
        return 'text-yellow-600 bg-yellow-50';
      case ContributionType.MILESTONE_REACHED:
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getTypeName = (type: ContributionType) => {
    switch (type) {
      case ContributionType.WORK_CREATION:
        return '创作作品';
      case ContributionType.WORK_REUSED:
        return '作品被复用';
      case ContributionType.WORK_LIKED:
        return '作品被点赞';
      case ContributionType.WORK_SHARED:
        return '作品被分享';
      case ContributionType.PROFILE_COMPLETED:
        return '完善资料';
      case ContributionType.FIRST_WORK:
        return '首次发布';
      case ContributionType.MILESTONE_REACHED:
        return '达成里程碑';
      default:
        return '未知操作';
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}天前`;
    if (hours > 0) return `${hours}小时前`;
    if (minutes > 0) return `${minutes}分钟前`;
    return '刚刚';
  };

  return (
    <div className="flex items-start p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
      {/* 类型图标 */}
      <div className={`flex items-center justify-center w-10 h-10 rounded-full ${getTypeColor(record.type)}`}>
        <span className="text-lg">{getTypeIcon(record.type)}</span>
      </div>

      {/* 内容 */}
      <div className="flex-1 ml-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900">{getTypeName(record.type)}</h3>
            <p className="text-sm text-gray-600 mt-1">{record.description}</p>
            {record.workId && record.metadata?.workTitle && (
              <p className="text-xs text-gray-500 mt-1">
                作品: {record.metadata.workTitle}
              </p>
            )}
          </div>
          <div className="text-right ml-4">
            <div className={`text-lg font-semibold ${
              record.points > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {record.points > 0 ? '+' : ''}{record.points}
            </div>
            <div className="text-xs text-gray-500">
              {formatDate(new Date(record.createdAt))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ContributionHistoryComponent: React.FC<ContributionHistoryProps> = ({
  userId,
  className = '',
  limit = 20,
}) => {
  const [history, setHistory] = useState<ContributionHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<ContributionType | 'all'>('all');
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchHistory = async (type: ContributionType | 'all' = 'all', offset = 0, append = false) => {
    try {
      if (!append) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      const params = new URLSearchParams({
        userId,
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (type !== 'all') {
        params.append('type', type);
      }

      const response = await fetch(`/api/contribution/history?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '获取历史记录失败');
      }

      if (data.success) {
        if (append && history) {
          setHistory({
            ...data.data,
            records: [...history.records, ...data.data.records],
          });
        } else {
          setHistory(data.data);
        }
        setHasMore(data.data.hasMore);
      } else {
        throw new Error(data.error || '获取历史记录失败');
      }
    } catch (err) {
      console.error('获取贡献度历史记录失败:', err);
      setError(err instanceof Error ? err.message : '获取历史记录失败');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchHistory(selectedType);
    }
  }, [userId, selectedType]);

  const handleTypeChange = (type: ContributionType | 'all') => {
    setSelectedType(type);
  };

  const handleLoadMore = () => {
    if (history && hasMore && !loadingMore) {
      fetchHistory(selectedType, history.records.length, true);
    }
  };

  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded mb-4 w-1/3"></div>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-start p-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 ml-4">
                    <div className="h-4 bg-gray-200 rounded mb-2 w-1/3"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
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
              onClick={() => fetchHistory(selectedType)}
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
          <h2 className="text-2xl font-bold text-gray-900 mb-4">贡献度历史</h2>

          {/* 统计摘要 */}
          {history && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-xl font-bold text-blue-600">
                  {history.summary.totalPoints}
                </div>
                <div className="text-sm text-blue-700">总积分</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-xl font-bold text-green-600">
                  {history.summary.thisWeek}
                </div>
                <div className="text-sm text-green-700">本周</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-xl font-bold text-purple-600">
                  {history.summary.thisMonth}
                </div>
                <div className="text-sm text-purple-700">本月</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-xl font-bold text-orange-600">
                  {history.records.length}
                </div>
                <div className="text-sm text-orange-700">记录数</div>
              </div>
            </div>
          )}

          {/* 类型筛选 */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleTypeChange('all')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                selectedType === 'all'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              全部
            </button>
            {Object.values(ContributionType).map((type) => (
              <button
                key={type}
                onClick={() => handleTypeChange(type)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedType === type
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {type === ContributionType.WORK_CREATION && '创作'}
                {type === ContributionType.WORK_REUSED && '复用'}
                {type === ContributionType.WORK_LIKED && '点赞'}
                {type === ContributionType.WORK_SHARED && '分享'}
                {type === ContributionType.PROFILE_COMPLETED && '资料'}
                {type === ContributionType.FIRST_WORK && '首发'}
                {type === ContributionType.MILESTONE_REACHED && '里程碑'}
              </button>
            ))}
          </div>
        </div>

        {/* 历史记录列表 */}
        <div className="p-6">
          {history && history.records.length > 0 ? (
            <div className="space-y-4">
              {history.records.map((record) => (
                <HistoryItem key={record.id} record={record} />
              ))}

              {/* 加载更多按钮 */}
              {hasMore && (
                <div className="text-center pt-4">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="px-6 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingMore ? '加载中...' : '加载更多'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 text-4xl mb-4">📋</div>
              <h3 className="text-gray-600 font-medium">暂无历史记录</h3>
              <p className="text-gray-500 text-sm mt-1">开始创作或复用作品来获得贡献度吧！</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContributionHistoryComponent;
