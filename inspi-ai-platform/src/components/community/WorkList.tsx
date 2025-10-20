/**
 * 作品列表组件
 * 支持网格和列表展示，搜索和筛选功能
 */
'use client';

import Image from 'next/image';
import Link from 'next/link';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/shared/hooks/useAuth';

interface Work {
  _id: string
  title: string
  description?: string
  knowledgePoint: string
  subject: string
  gradeLevel: string
  category: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimatedTime: number
  tags: string[]
  author: {
    _id: string
    name: string
    avatar?: string
  }
  likesCount: number
  views: number
  reuseCount: number
  commentsCount: number
  qualityScore: number
  publishedAt: string
  userInteractions?: {
    isLiked: boolean
    isBookmarked: boolean
  }
}

interface WorkListProps {
  initialWorks?: Work[]
  searchQuery?: string
  filters?: {
    subject?: string
    gradeLevel?: string
    category?: string
    difficulty?: string
    tags?: string[]
    author?: string
  }
  sortBy?: 'latest' | 'popular' | 'trending' | 'views'
  viewMode?: 'grid' | 'list'
  showFilters?: boolean
  showSearch?: boolean
  className?: string
}

export function WorkList({
  initialWorks = [],
  searchQuery = '',
  filters = {},
  sortBy = 'latest',
  viewMode = 'grid',
  showFilters = true,
  showSearch = true,
  className = '',
}: WorkListProps) {
  const { user } = useAuth();

  const [works, setWorks] = useState<Work[]>(initialWorks);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [currentFilters, setCurrentFilters] = useState(filters);
  const [currentSort, setCurrentSort] = useState(sortBy);
  const [currentViewMode, setCurrentViewMode] = useState(viewMode);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const isInitialLoad = useRef(true);

  // 学科和年级选项
  const subjects = [
    '数学', '语文', '英语', '物理', '化学', '生物',
    '历史', '地理', '政治', '科学', '艺术', '体育',
  ];

  const gradeLevels = [
    '小学一年级', '小学二年级', '小学三年级', '小学四年级', '小学五年级', '小学六年级',
    '初中一年级', '初中二年级', '初中三年级',
    '高中一年级', '高中二年级', '高中三年级',
  ];

  const categories = [
    '概念解释', '例题讲解', '实验演示', '历史故事',
    '生活应用', '思维训练', '复习总结', '拓展延伸',
  ];

  const loadWorks = useCallback(
    async ({ page: targetPage, reset = false }: { page: number; reset?: boolean }) => {
      setLoading(true);

      try {
        const params = new URLSearchParams({
          page: targetPage.toString(),
          limit: '20',
          sortBy: currentSort,
        });

        const trimmedQuery = searchInput.trim();
        if (trimmedQuery) {
          params.append('query', trimmedQuery);
        }

        Object.entries(currentFilters).forEach(([key, value]) => {
          if (!value) return;
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v));
          } else {
            params.append(key, value);
          }
        });

        const response = await fetch(`/api/works/search?${params}`);
        const result = await response.json();

        if (result.success) {
          const list: Work[] = Array.isArray(result.works) ? result.works : [];

          setWorks(prev => (reset ? list : [...prev, ...list]));
          setPage(targetPage);
          setTotal(result.total ?? list.length);
          setHasMore(targetPage < (result.totalPages ?? targetPage));
        }
      } catch (error) {
        console.error('Load works error:', error);
      } finally {
        setLoading(false);
      }
    },
    [currentFilters, currentSort, searchInput],
  );

  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;

      if (initialWorks.length > 0) {
        setWorks(initialWorks);
        setTotal(initialWorks.length);
        setHasMore(initialWorks.length >= 20);
        setPage(1);
        return;
      }
    }

    setPage(1);
    void loadWorks({ page: 1, reset: true });
  }, [initialWorks, loadWorks]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    void loadWorks({ page: 1, reset: true });
  };

  const handleFilterChange = (key: string, value: any) => {
    setCurrentFilters({
      ...currentFilters,
      [key]: value,
    });
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    void loadWorks({ page: nextPage });
  };

  const handleLike = async (workId: string) => {
    if (!user) return;

    try {
      const response = await fetch(`/api/works/${workId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (response.ok) {
        setWorks(prev =>
          prev.map(work => {
            if (work._id === workId) {
              const isLiked = work.userInteractions?.isLiked;
              return {
                ...work,
                likesCount: isLiked ? work.likesCount - 1 : work.likesCount + 1,
                userInteractions: {
                  ...work.userInteractions,
                  isLiked: !isLiked,
                },
              };
            }
            return work;
          }),
        );
      }
    } catch (error) {
      console.error('Like error:', error);
    }
  };

  const handleBookmark = async (workId: string) => {
    if (!user) return;

    try {
      const response = await fetch(`/api/works/${workId}/bookmark`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (response.ok) {
        setWorks(prev =>
          prev.map(work => {
            if (work._id === workId) {
              return {
                ...work,
                userInteractions: {
                  ...work.userInteractions,
                  isBookmarked: !work.userInteractions?.isBookmarked,
                },
              };
            }
            return work;
          }),
        );
      }
    } catch (error) {
      console.error('Bookmark error:', error);
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return '初级';
      case 'intermediate': return '中级';
      case 'advanced': return '高级';
      default: return difficulty;
    }
  };

  const getSortLabel = (sort: string) => {
    switch (sort) {
      case 'latest': return '最新发布';
      case 'popular': return '最受欢迎';
      case 'trending': return '热门趋势';
      case 'views': return '浏览最多';
      default: return sort;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    if (days < 30) return `${Math.floor(days / 7)}周前`;
    if (days < 365) return `${Math.floor(days / 30)}个月前`;
    return `${Math.floor(days / 365)}年前`;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 搜索栏 */}
      {showSearch && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="搜索作品标题、知识点、标签..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              搜索
            </button>
          </form>
        </div>
      )}

      {/* 筛选和排序 */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">学科</label>
              <select
                value={currentFilters.subject || ''}
                onChange={(e) => handleFilterChange('subject', e.target.value || undefined)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">全部学科</option>
                {subjects.map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">年级</label>
              <select
                value={currentFilters.gradeLevel || ''}
                onChange={(e) => handleFilterChange('gradeLevel', e.target.value || undefined)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">全部年级</option>
                {gradeLevels.map(grade => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
              <select
                value={currentFilters.category || ''}
                onChange={(e) => handleFilterChange('category', e.target.value || undefined)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">全部分类</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">难度</label>
              <select
                value={currentFilters.difficulty || ''}
                onChange={(e) => handleFilterChange('difficulty', e.target.value || undefined)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">全部难度</option>
                <option value="beginner">初级</option>
                <option value="intermediate">中级</option>
                <option value="advanced">高级</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">排序</label>
              <select
                value={currentSort}
                onChange={(e) => setCurrentSort(e.target.value as any)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="latest">最新发布</option>
                <option value="popular">最受欢迎</option>
                <option value="trending">热门趋势</option>
                <option value="views">浏览最多</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">视图</label>
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setCurrentViewMode('grid')}
                  className={`flex-1 px-3 py-2 text-sm ${
                    currentViewMode === 'grid'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  网格
                </button>
                <button
                  onClick={() => setCurrentViewMode('list')}
                  className={`flex-1 px-3 py-2 text-sm ${
                    currentViewMode === 'list'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  列表
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 结果统计 */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>共找到 {total} 个作品</span>
        <span>按{getSortLabel(currentSort)}排序</span>
      </div>

      {/* 作品列表 */}
      <div className={
        currentViewMode === 'grid'
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
          : 'space-y-4'
      }>
        {works.map(work => (
          <div
            key={work._id}
            className={`bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow ${
              currentViewMode === 'list' ? 'flex p-4' : 'overflow-hidden'
            }`}
          >
            {currentViewMode === 'grid' ? (
              // 网格视图
              <>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <Link
                        href={`/works/${work._id}`}
                        className="text-lg font-semibold text-gray-900 hover:text-blue-600 line-clamp-2"
                      >
                        {work.title}
                      </Link>
                      {work.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {work.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 text-xs text-gray-500 mb-3">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                      {work.subject}
                    </span>
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full">
                      {work.gradeLevel}
                    </span>
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full">
                      {getDifficultyLabel(work.difficulty)}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 mb-3">
                    <div className="flex items-center space-x-1">
                      {work.author.avatar ? (
                        <Image
                          src={work.author.avatar}
                          alt={work.author.name}
                          width={20}
                          height={20}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-5 h-5 bg-gray-300 rounded-full flex items-center justify-center">
                          <span className="text-xs text-gray-600">
                            {work.author.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <Link
                        href={`/users/${work.author._id}`}
                        className="text-sm text-gray-700 hover:text-blue-600"
                      >
                        {work.author.name}
                      </Link>
                    </div>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">
                      {formatDate(work.publishedAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center space-x-4">
                      <span className="flex items-center space-x-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span>{work.views}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        <span>{work.likesCount}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <span>{work.reuseCount}</span>
                      </span>
                    </div>

                    {user && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleLike(work._id)}
                          className={`p-1 rounded-full hover:bg-gray-100 ${
                            work.userInteractions?.isLiked ? 'text-red-500' : 'text-gray-400'
                          }`}
                        >
                          <svg className="w-4 h-4" fill={work.userInteractions?.isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleBookmark(work._id)}
                          className={`p-1 rounded-full hover:bg-gray-100 ${
                            work.userInteractions?.isBookmarked ? 'text-yellow-500' : 'text-gray-400'
                          }`}
                        >
                          <svg className="w-4 h-4" fill={work.userInteractions?.isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              // 列表视图
              <>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <Link
                      href={`/works/${work._id}`}
                      className="text-lg font-semibold text-gray-900 hover:text-blue-600"
                    >
                      {work.title}
                    </Link>
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                        {work.subject}
                      </span>
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full">
                        {getDifficultyLabel(work.difficulty)}
                      </span>
                    </div>
                  </div>

                  {work.description && (
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {work.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        {work.author.avatar ? (
                          <Image
                            src={work.author.avatar}
                            alt={work.author.name}
                            width={16}
                            height={16}
                            className="rounded-full"
                          />
                        ) : (
                          <div className="w-4 h-4 bg-gray-300 rounded-full flex items-center justify-center">
                            <span className="text-xs text-gray-600">
                              {work.author.name.charAt(0)}
                            </span>
                          </div>
                        )}
                        <Link
                          href={`/users/${work.author._id}`}
                          className="hover:text-blue-600"
                        >
                          {work.author.name}
                        </Link>
                      </div>
                      <span>•</span>
                      <span>{formatDate(work.publishedAt)}</span>
                      <span>•</span>
                      <span>{work.views} 浏览</span>
                      <span>•</span>
                      <span>{work.likesCount} 点赞</span>
                      <span>•</span>
                      <span>{work.reuseCount} 复用</span>
                    </div>

                    {user && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleLike(work._id)}
                          className={`p-1 rounded-full hover:bg-gray-100 ${
                            work.userInteractions?.isLiked ? 'text-red-500' : 'text-gray-400'
                          }`}
                        >
                          <svg className="w-4 h-4" fill={work.userInteractions?.isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleBookmark(work._id)}
                          className={`p-1 rounded-full hover:bg-gray-100 ${
                            work.userInteractions?.isBookmarked ? 'text-yellow-500' : 'text-gray-400'
                          }`}
                        >
                          <svg className="w-4 h-4" fill={work.userInteractions?.isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* 加载更多 */}
      {hasMore && (
        <div className="text-center">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="px-6 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            {loading ? '加载中...' : '加载更多'}
          </button>
        </div>
      )}

      {/* 空状态 */}
      {works.length === 0 && !loading && (
        <div className="text-center py-12">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">暂无作品</h3>
          <p className="text-gray-600">
            {searchInput || Object.values(currentFilters).some(v => v)
              ? '没有找到符合条件的作品，试试调整搜索条件'
              : '还没有发布的作品，快来创建第一个作品吧！'
            }
          </p>
        </div>
      )}
    </div>
  );
}

export default WorkList;
