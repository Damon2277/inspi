'use client';

import React, { memo } from 'react';

import { LazyImage } from './LazyImage';

interface CardData {
  id: number;
  title: string;
  author: string;
  subject: string;
  grade: string;
  description: string;
  thumbnail: string;
  likes: number;
  views: number;
  reuses: number;
  rating: number;
  tags: string[];
  createdAt: string;
}

interface OptimizedCardProps {
  data: CardData;
  onClick?: (id: number) => void;
  renderActions?: (data: CardData) => React.ReactNode;
}

// 使用 React.memo 优化，只在 props 真正改变时重新渲染
export const OptimizedCard = memo(function OptimizedCard({
  data,
  onClick,
  renderActions,
}: OptimizedCardProps) {
  const handleClick = () => {
    onClick?.(data.id);
  };

  return (
    <div
      className="modern-card modern-card-elevated"
      onClick={handleClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all var(--transition-base)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div className="modern-card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* 顶部信息 */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}>
          {/* 使用 emoji 而不是图片，性能更好 */}
          <div style={{
            fontSize: '32px',
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {data.thumbnail}
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{
              padding: '4px 8px',
              background: 'var(--primary-100)',
              color: 'var(--primary-700)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
              fontWeight: '500',
            }}>
              {data.subject}
            </span>
            <span style={{
              padding: '4px 8px',
              background: 'var(--gray-100)',
              color: 'var(--gray-600)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
            }}>
              {data.grade}
            </span>
          </div>
        </div>

        {/* 标题和描述 */}
        <div style={{ flex: 1 }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: 'var(--gray-900)',
            marginBottom: '8px',
            lineHeight: '1.4',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {data.title}
          </h3>

          <p style={{
            fontSize: '13px',
            color: 'var(--gray-600)',
            lineHeight: '1.5',
            marginBottom: '12px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {data.description}
          </p>
        </div>

        {/* 标签 */}
        {data.tags && data.tags.length > 0 && (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            marginBottom: '12px',
          }}>
            {data.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                style={{
                  fontSize: '11px',
                  padding: '2px 8px',
                  background: 'var(--gray-100)',
                  color: 'var(--gray-600)',
                  borderRadius: 'var(--radius-full)',
                }}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* 底部统计和操作 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '12px',
          borderTop: '1px solid var(--gray-200)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            fontSize: '12px',
            color: 'var(--gray-500)',
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {data.likes}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {data.views}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {data.reuses}
            </span>
          </div>

          {/* 自定义操作区域 */}
          {renderActions && (
            <div onClick={(e) => e.stopPropagation()}>
              {renderActions(data)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // 自定义比较函数，只在必要的 props 改变时重新渲染
  return (
    prevProps.data.id === nextProps.data.id &&
    prevProps.data.likes === nextProps.data.likes &&
    prevProps.data.views === nextProps.data.views &&
    prevProps.data.reuses === nextProps.data.reuses &&
    prevProps.onClick === nextProps.onClick &&
    prevProps.renderActions === nextProps.renderActions
  );
});
