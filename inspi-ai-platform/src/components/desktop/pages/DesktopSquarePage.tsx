'use client';
import React, { useEffect, useRef, useState } from 'react';

import { SquareQuickReuseButton } from '@/components/square/SquareQuickReuseButton';
import { mockSquareWorks } from '@/data/mockSquareWorks';
import { useAdvancedSearch } from '@/hooks/useSearch';
import { useAuth } from '@/shared/hooks/useAuth';
import { useReuseState } from '@/shared/hooks/useReuseState';

/**
 * 现代化桌面端广场页面组件
 */
export function DesktopSquarePage() {
  const { user } = useAuth();
  const { reusedThemes } = useReuseState(user?._id);

  const baseReuseCountsRef = useRef<Map<number, number>>(new Map(mockSquareWorks.map(work => [work.id, work.reuses])));
  const [works, setWorks] = useState(() => mockSquareWorks.map(work => ({ ...work })));

  useEffect(() => {
    setWorks(mockSquareWorks.map(work => ({
      ...work,
      reuses: (baseReuseCountsRef.current.get(work.id) ?? work.reuses) + (reusedThemes.includes(work.id) ? 1 : 0),
    })));
  }, [reusedThemes]);

  // 使用高级搜索 Hook
  const {
    searchQuery,
    setSearchQuery,
    filterValues,
    updateFilter,
    clearFilters,
    filteredItems: filteredWorks,
    activeFilterCount,
    searchStats,
  } = useAdvancedSearch(
    works,
    [
      { field: 'subject', type: 'select', label: '学科', options: [
        { value: '数学', label: '数学' },
        { value: '语文', label: '语文' },
        { value: '英语', label: '英语' },
        { value: '物理', label: '物理' },
        { value: '化学', label: '化学' },
        { value: '生物', label: '生物' },
      ] },
      { field: 'grade', type: 'select', label: '年级', options: [
        { value: '小学', label: '小学' },
        { value: '初中', label: '初中' },
        { value: '高中', label: '高中' },
        { value: '大学', label: '大学' },
      ] },
      { field: 'rating', type: 'range', label: '评分' },
    ],
    {
      fields: ['title', 'description', 'author', 'tags'],
      fuzzy: true,
      minScore: 0.3,
    },
  );

  const handleCardClick = (workId: number) => {
    window.location.href = `/square/${workId}`;
  };

  return (
    <div className="modern-layout">
      <div style={{ padding: '32px 0', minHeight: 'calc(100vh - 80px)' }}>
        {/* 页面标题 */}
        <div className="modern-container" style={{ marginBottom: '32px' }}>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '24px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '16px',
              flexWrap: 'wrap',
              maxWidth: '60%',
            }}>
              <h1 style={{
                fontSize: 'var(--font-size-4xl)',
                fontWeight: '800',
                color: 'var(--gray-900)',
                margin: 0,
              }}>
                智慧广场
              </h1>
              <p style={{
                fontSize: 'var(--font-size-lg)',
                color: 'var(--gray-600)',
                margin: 0,
                whiteSpace: 'nowrap',
              }}>
                看同行们正在创造什么，每一份作品都是灵感
              </p>
            </div>
            <div style={{ flexBasis: '280px', flexGrow: 1, maxWidth: '360px' }}>
              <div style={{ position: 'relative' }}>
                <input
                  className="modern-input"
                  type="search"
                  placeholder="搜索教学内容、作者或标签..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: '48px' }}
                />
                <div style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--gray-400)',
                }}>
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 搜索结果统计 */}
        {searchStats.hasFilters && (
          <div className="modern-container" style={{ marginBottom: '16px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              background: 'var(--primary-50)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--primary-200)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '14px', color: 'var(--gray-700)' }}>
                  找到 <strong>{searchStats.filtered}</strong> 个结果
                  {searchQuery && (
                    <span> 关于 "<strong>{searchQuery}</strong>"</span>
                  )}
                </span>
                {activeFilterCount > 0 && (
                  <span style={{
                    padding: '2px 8px',
                    background: 'var(--primary-600)',
                    color: 'white',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '12px',
                  }}>
                    {activeFilterCount} 个筛选
                  </span>
                )}
              </div>
              <button
                onClick={clearFilters}
                style={{
                  padding: '6px 12px',
                  background: 'white',
                  border: '1px solid var(--gray-300)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '13px',
                  color: 'var(--gray-700)',
                  cursor: 'pointer',
                }}
              >
                清除筛选
              </button>
            </div>
          </div>
        )}

        {/* 作品网格 */}
        <div className="modern-container">
          <div className="modern-grid modern-grid-3">
            {filteredWorks.map((work) => (
              <div
                key={work.id}
                className="modern-card modern-card-elevated group"
                style={{ cursor: 'pointer' }}
                onClick={() => handleCardClick(work.id)}
              >
                <div
                  className="modern-card-body"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    marginBottom: '16px',
                  }}>
                    <div style={{ fontSize: 'var(--font-size-3xl)' }}>{work.thumbnail}</div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <span style={{
                        padding: '4px 8px',
                        background: 'var(--gray-100)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--gray-600)',
                      }}>
                        {work.subject}
                      </span>
                      <span style={{
                        padding: '4px 8px',
                        background: 'var(--gray-100)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--gray-600)',
                      }}>
                        {work.grade}
                      </span>
                    </div>
                  </div>

                  <h3 style={{
                    fontSize: 'var(--font-size-lg)',
                    fontWeight: '600',
                    color: 'var(--gray-900)',
                    marginBottom: '8px',
                    transition: 'color var(--transition-base)',
                  }}>
                    {work.title}
                  </h3>

                  <p style={{
                    color: 'var(--gray-600)',
                    fontSize: 'var(--font-size-sm)',
                    marginBottom: '16px',
                    lineHeight: '1.5',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {work.description}
                  </p>

                  <div style={{ marginTop: 'auto' }}>
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '4px',
                      alignItems: 'flex-end',
                      marginBottom: '12px',
                    }}>
                      {work.tags.map((tag, index) => (
                        <span
                          key={index}
                          style={{
                            padding: '2px 8px',
                            background: 'var(--primary-100)',
                            color: 'var(--primary-700)',
                            fontSize: 'var(--font-size-xs)',
                            borderRadius: 'var(--radius-sm)',
                            alignSelf: 'flex-end',
                          }}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto',
                      alignItems: 'center',
                      gap: '16px',
                      paddingTop: '16px',
                      borderTop: '1px solid var(--gray-200)',
                    }}>
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '12px',
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--gray-500)',
                      }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                          {work.likes}
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          {work.reuses}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}
                        onClick={(event) => event.stopPropagation()}>
                        <SquareQuickReuseButton
                          themeId={work.id}
                          themeTitle={work.title}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 空状态 */}
          {filteredWorks.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '80px 20px',
              color: 'var(--gray-500)',
            }}>
              <svg width="64" height="64" fill="none" viewBox="0 0 24 24" style={{ margin: '0 auto 16px', color: 'var(--gray-300)' }}>
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3 style={{ fontSize: '18px', marginBottom: '8px', color: 'var(--gray-700)' }}>
                没有找到匹配的作品
              </h3>
              <p style={{ marginBottom: '24px' }}>
                尝试使用不同的关键词或筛选条件
              </p>
              <button
                onClick={clearFilters}
                className="modern-btn modern-btn-primary"
              >
                清除所有筛选
              </button>
            </div>
          )}

          {/* 加载更多 */}
          <div style={{ textAlign: 'center', marginTop: '48px' }}>
            <button className="modern-btn modern-btn-outline modern-btn-lg">
              发现更多智慧
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
