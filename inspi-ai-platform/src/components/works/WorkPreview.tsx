'use client';

import React from 'react';

import { WorkDocument } from '@/lib/models/Work';
import { TeachingCard } from '@/shared/types/teaching';

interface WorkPreviewProps {
  work: WorkDocument;
  showActions?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onReuse?: () => void;
  className?: string;
}

const CARD_TYPE_NAMES: Record<string, string> = {
  visualization: '可视化卡',
  analogy: '类比延展卡',
  thinking: '启发思考卡',
  interaction: '互动氛围卡',
};

const CARD_TYPE_COLORS: Record<string, string> = {
  visualization: 'bg-purple-100 text-purple-800 border-purple-200',
  analogy: 'bg-green-100 text-green-800 border-green-200',
  thinking: 'bg-orange-100 text-orange-800 border-orange-200',
  interaction: 'bg-blue-100 text-blue-800 border-blue-200',
};

const CARD_TYPE_ICONS: Record<string, React.ReactNode> = {
  visualization: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  analogy: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  ),
  thinking: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  interaction: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
};

export default function WorkPreview({
  work,
  showActions = false,
  onEdit,
  onDelete,
  onReuse,
  className = '',
}: WorkPreviewProps) {
  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      draft: 'bg-yellow-100 text-yellow-800',
      published: 'bg-green-100 text-green-800',
      archived: 'bg-gray-100 text-gray-800',
    };

    const labels: Record<string, string> = {
      draft: '草稿',
      published: '已发布',
      archived: '已归档',
    };

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badges[status] || badges.draft}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow ${className}`}>
      {/* 头部信息 */}
      <div className="p-6 border-b">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-gray-900 truncate">
              {work.title}
            </h2>
            <p className="text-gray-600 mt-1">
              知识点：{work.knowledgePoint}
            </p>
          </div>

          <div className="ml-4 flex items-center space-x-2">
            {getStatusBadge(work.status)}
            {showActions && (
              <div className="flex items-center space-x-1">
                {onEdit && (
                  <button
                    onClick={onEdit}
                    className="p-2 text-gray-400 hover:text-blue-600 rounded-full hover:bg-blue-50"
                    title="编辑"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                )}
                {onReuse && work.status === 'published' && (
                  <button
                    onClick={onReuse}
                    className="p-2 text-gray-400 hover:text-green-600 rounded-full hover:bg-green-50"
                    title="复用"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={onDelete}
                    className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50"
                    title="删除"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 元数据 */}
        <div className="flex items-center text-sm text-gray-500 space-x-4">
          <span>{work.subject}</span>
          <span>•</span>
          <span>{work.gradeLevel}</span>
          <span>•</span>
          <span>{work.cards?.length || 0} 张卡片</span>
          {work.reuseCount > 0 && (
            <>
              <span>•</span>
              <span className="text-blue-600 font-medium">
                {work.reuseCount} 次复用
              </span>
            </>
          )}
        </div>

        {/* 标签 */}
        {work.tags && work.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {work.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* 作者和时间信息 */}
        <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
          <div className="flex items-center">
            {work.author && typeof work.author === 'object' && 'name' in work.author && (
              <>
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-2">
                  <span className="text-xs font-medium text-blue-600">
                    {(work.author as any).name?.charAt(0) || 'U'}
                  </span>
                </div>
                <span>{(work.author as any).name || '匿名用户'}</span>
              </>
            )}
          </div>
          <span>创建于 {formatDate(work.createdAt)}</span>
        </div>
      </div>

      {/* 教学卡片展示 */}
      <div className="p-6">
        <h3 className="font-medium text-gray-900 mb-4">教学卡片</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {work.cards?.map((card: any, index) => (
            <div
              key={card.id}
              className={`border rounded-lg p-4 ${CARD_TYPE_COLORS[card.type] || 'bg-gray-100 text-gray-800 border-gray-200'}`}
            >
              <div className="flex items-center mb-2">
                <div className="mr-2">
                  {CARD_TYPE_ICONS[card.type]}
                </div>
                <span className="text-sm font-medium">
                  {CARD_TYPE_NAMES[card.type] || card.type}
                </span>
              </div>
              <h4 className="font-medium mb-2 text-gray-900">{card.title}</h4>
              <p className="text-sm text-gray-700 line-clamp-3">{card.content}</p>
            </div>
          ))}
        </div>

        {(!work.cards || work.cards.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>暂无教学卡片</p>
          </div>
        )}
      </div>

      {/* 归属信息 */}
      {work.attribution && work.attribution.length > 0 && (
        <div className="px-6 pb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h4 className="text-sm font-medium text-blue-900 mb-2">作品归属</h4>
            <div className="space-y-1">
              {work.attribution.map((attr, index) => (
                <p key={index} className="text-sm text-blue-800">
                  本作品部分灵感来源于 <span className="font-medium">{attr.originalWorkTitle}</span>
                </p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
