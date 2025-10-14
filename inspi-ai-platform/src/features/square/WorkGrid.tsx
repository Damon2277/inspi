'use client';

import React from 'react';

import { WorkCardData } from '@/shared/types/square';

import WorkCard from './WorkCard';

interface WorkGridProps {
  works: WorkCardData[];
  loading?: boolean;
  onReuse?: (workId: string) => void;
  onView?: (workId: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

const WorkGrid: React.FC<WorkGridProps> = ({
  works,
  loading = false,
  onReuse,
  onView,
  onLoadMore,
  hasMore = false,
}) => {
  // 加载状态骨架屏
  const LoadingSkeleton = () => (
    <div className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="h-6 bg-gray-200 rounded w-3/4"></div>
          <div className="h-6 bg-gray-200 rounded w-16"></div>
        </div>
        <div className="h-4 bg-gray-200 rounded w-full mb-3"></div>
        <div className="flex space-x-2 mb-3">
          <div className="h-6 w-6 bg-gray-200 rounded-full"></div>
          <div className="h-6 w-6 bg-gray-200 rounded-full"></div>
          <div className="h-6 w-6 bg-gray-200 rounded-full"></div>
        </div>
        <div className="flex items-center space-x-2 mb-3">
          <div className="h-6 w-6 bg-gray-200 rounded-full"></div>
          <div className="h-4 bg-gray-200 rounded w-20"></div>
        </div>
        <div className="flex space-x-1">
          <div className="h-6 bg-gray-200 rounded w-12"></div>
          <div className="h-6 bg-gray-200 rounded w-16"></div>
        </div>
      </div>
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div className="h-4 bg-gray-200 rounded w-20"></div>
          <div className="h-8 bg-gray-200 rounded w-16"></div>
        </div>
      </div>
    </div>
  );

  // 空状态
  const EmptyState = () => (
    <div className="col-span-full flex flex-col items-center justify-center py-12">
      <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">暂无作品</h3>
      <p className="text-gray-500 text-center max-w-sm">
        还没有找到符合条件的作品，试试调整筛选条件或搜索关键词
      </p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* 作品网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {/* 实际作品卡片 */}
        {works.map((work) => (
          <WorkCard
            key={work.id}
            work={work}
            onReuse={onReuse}
            onView={onView}
          />
        ))}

        {/* 加载状态骨架屏 */}
        {loading && Array.from({ length: 8 }).map((_, index) => (
          <LoadingSkeleton key={`skeleton-${index}`} />
        ))}
      </div>

      {/* 空状态 */}
      {!loading && works.length === 0 && <EmptyState />}

      {/* 加载更多按钮 */}
      {!loading && works.length > 0 && hasMore && (
        <div className="flex justify-center">
          <button
            onClick={onLoadMore}
            className="inline-flex items-center px-6 py-3 border border-gray-300 shadow-sm text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            加载更多
          </button>
        </div>
      )}

      {/* 加载更多状态 */}
      {loading && works.length > 0 && (
        <div className="flex justify-center">
          <div className="inline-flex items-center px-6 py-3 text-base font-medium text-gray-500">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            加载中...
          </div>
        </div>
      )}

      {/* 没有更多数据提示 */}
      {!loading && works.length > 0 && !hasMore && (
        <div className="flex justify-center">
          <p className="text-gray-500 text-sm">已显示全部作品</p>
        </div>
      )}
    </div>
  );
};

export default React.memo(WorkGrid);
