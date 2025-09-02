'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SearchBar from '@/components/square/SearchBar';
import FilterBar from '@/components/square/FilterBar';
import WorkGrid from '@/components/square/WorkGrid';
import MobileFilterBar from '@/components/mobile/MobileFilterBar';
import MobileWorkCard from '@/components/mobile/MobileWorkCard';
import PullToRefresh from '@/components/mobile/PullToRefresh';
import { WorkCardData, FilterOptions, SearchSuggestion } from '@/types/square';
import { useDebounce } from '@/hooks/useDebounce';
import { useIsMobile } from '@/hooks/useResponsive';

function SquarePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  
  // 状态管理
  const [works, setWorks] = useState<WorkCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  
  // 筛选和搜索状态
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedSubject, setSelectedSubject] = useState(searchParams.get('subject') || undefined);
  const [selectedGradeLevel, setSelectedGradeLevel] = useState(searchParams.get('gradeLevel') || undefined);
  const [selectedSort, setSelectedSort] = useState(searchParams.get('sortBy') || 'latest');
  
  // 防抖搜索
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  
  // 筛选选项和搜索建议
  const [filters, setFilters] = useState<FilterOptions>({
    subjects: [],
    gradeLevels: [],
    sortOptions: []
  });
  const [searchSuggestions] = useState<SearchSuggestion[]>([]);

  // 获取作品数据
  const fetchWorks = useCallback(async (page = 1, reset = false) => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '12');
      params.set('sortBy', selectedSort);
      
      if (debouncedSearchQuery) params.set('search', debouncedSearchQuery);
      if (selectedSubject) params.set('subject', selectedSubject);
      if (selectedGradeLevel) params.set('gradeLevel', selectedGradeLevel);

      const response = await fetch(`/api/works?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        const newWorks = result.data.works || [];
        
        if (reset || page === 1) {
          setWorks(newWorks);
        } else {
          setWorks(prev => [...prev, ...newWorks]);
        }
        
        setHasMore(result.data.pagination?.hasNext || false);
        setCurrentPage(page);
        
        // 更新筛选选项
        if (result.data.filters) {
          setFilters({
            subjects: result.data.filters.subjects || [],
            gradeLevels: result.data.filters.gradeLevels || [],
            sortOptions: [
              { value: 'latest', label: '最新发布' },
              { value: 'popular', label: '最受欢迎' },
              { value: 'reuse_count', label: '复用最多' }
            ]
          });
        }
      }
    } catch (error) {
      console.error('获取作品失败:', error);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchQuery, selectedSubject, selectedGradeLevel, selectedSort]);

  // 初始加载
  useEffect(() => {
    fetchWorks(1, true);
  }, [fetchWorks]);

  // 更新URL参数
  const updateURL = useCallback(() => {
    const params = new URLSearchParams();
    if (debouncedSearchQuery) params.set('search', debouncedSearchQuery);
    if (selectedSubject) params.set('subject', selectedSubject);
    if (selectedGradeLevel) params.set('gradeLevel', selectedGradeLevel);
    if (selectedSort !== 'latest') params.set('sortBy', selectedSort);
    
    const newURL = params.toString() ? `/square?${params.toString()}` : '/square';
    router.replace(newURL, { scroll: false });
  }, [debouncedSearchQuery, selectedSubject, selectedGradeLevel, selectedSort, router]);

  // 搜索处理
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  // 筛选处理
  const handleSubjectChange = (subject: string | undefined) => {
    setSelectedSubject(subject);
    setCurrentPage(1);
  };

  const handleGradeLevelChange = (gradeLevel: string | undefined) => {
    setSelectedGradeLevel(gradeLevel);
    setCurrentPage(1);
  };

  const handleSortChange = (sort: string) => {
    setSelectedSort(sort);
    setCurrentPage(1);
  };

  const handleReset = () => {
    setSearchQuery('');
    setSelectedSubject(undefined);
    setSelectedGradeLevel(undefined);
    setSelectedSort('latest');
    setCurrentPage(1);
  };

  // 加载更多
  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchWorks(currentPage + 1, false);
    }
  };

  // 作品操作
  const handleWorkView = (workId: string) => {
    router.push(`/works/${workId}`);
  };

  const handleWorkReuse = (workId: string) => {
    // TODO: 实现复用逻辑
    console.log('复用作品:', workId);
  };

  // 搜索建议点击
  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setSearchQuery(suggestion.value);
    setCurrentPage(1);
  };

  // 下拉刷新处理
  const handleRefresh = async () => {
    setCurrentPage(1);
    await fetchWorks(1, true);
  };

  // 更新URL（延迟执行以避免频繁更新）
  useEffect(() => {
    const timer = setTimeout(updateURL, 300);
    return () => clearTimeout(timer);
  }, [updateURL]);

  // 移动端作品网格组件
  const MobileWorkGrid = () => (
    <div className="space-y-3">
      {works.map((work) => (
        <MobileWorkCard
          key={work.id}
          work={work}
          onReuse={handleWorkReuse}
          onView={handleWorkView}
        />
      ))}
      
      {/* 移动端加载更多 */}
      {!loading && works.length > 0 && hasMore && (
        <div className="flex justify-center pt-4">
          <button
            onClick={handleLoadMore}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 active:bg-gray-100 transition-colors duration-200"
            style={{ 
              minHeight: '44px',
              touchAction: 'manipulation'
            }}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            加载更多
          </button>
        </div>
      )}

      {/* 移动端空状态 */}
      {!loading && works.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">暂无作品</h3>
          <p className="text-gray-500 text-center text-sm">
            还没有找到符合条件的作品<br />试试调整筛选条件或搜索关键词
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {isMobile ? (
        // 移动端布局
        <PullToRefresh onRefresh={handleRefresh}>
          {/* 移动端页面头部 */}
          <div className="bg-white border-b border-gray-200">
            <div className="px-4 py-6">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  智慧广场
                </h1>
                <p className="text-sm text-gray-600">
                  探索教学智慧，发现创意方法
                </p>
              </div>

              {/* 移动端搜索栏 */}
              <SearchBar
                value={searchQuery}
                onSearch={handleSearch}
                suggestions={searchSuggestions}
                onSuggestionClick={handleSuggestionClick}
                loading={loading && currentPage === 1}
              />
            </div>
          </div>

          {/* 移动端筛选栏 */}
          <MobileFilterBar
            filters={filters}
            selectedSubject={selectedSubject}
            selectedGradeLevel={selectedGradeLevel}
            selectedSort={selectedSort}
            onSubjectChange={handleSubjectChange}
            onGradeLevelChange={handleGradeLevelChange}
            onSortChange={handleSortChange}
            onReset={handleReset}
          />

          {/* 移动端主要内容区域 */}
          <div className="px-4 py-4">
            {/* 移动端结果统计 */}
            {!loading && works.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-gray-600">
                  {debouncedSearchQuery && `搜索 "${debouncedSearchQuery}" `}
                  {selectedSubject && `在 ${selectedSubject} `}
                  {selectedGradeLevel && `${selectedGradeLevel} `}
                  找到 {works.length} 个作品
                </p>
              </div>
            )}

            {/* 移动端作品网格 */}
            <MobileWorkGrid />
          </div>
        </PullToRefresh>
      ) : (
        // 桌面端布局（保持原有逻辑）
        <>
          {/* 页面头部 */}
          <div className="bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                  智慧广场
                </h1>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                  探索全球教师的教学智慧，发现创意教学方法，让每一份灵感都能被传承和发扬
                </p>
              </div>

              {/* 搜索栏 */}
              <div className="max-w-2xl mx-auto">
                <SearchBar
                  value={searchQuery}
                  onSearch={handleSearch}
                  suggestions={searchSuggestions}
                  onSuggestionClick={handleSuggestionClick}
                  loading={loading && currentPage === 1}
                />
              </div>
            </div>
          </div>

          {/* 筛选栏 */}
          <FilterBar
            filters={filters}
            selectedSubject={selectedSubject}
            selectedGradeLevel={selectedGradeLevel}
            selectedSort={selectedSort}
            onSubjectChange={handleSubjectChange}
            onGradeLevelChange={handleGradeLevelChange}
            onSortChange={handleSortChange}
            onReset={handleReset}
          />

          {/* 主要内容区域 */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* 结果统计 */}
            {!loading && works.length > 0 && (
              <div className="mb-6">
                <p className="text-sm text-gray-600">
                  {debouncedSearchQuery && `搜索 "${debouncedSearchQuery}" `}
                  {selectedSubject && `在 ${selectedSubject} `}
                  {selectedGradeLevel && `${selectedGradeLevel} `}
                  找到 {works.length} 个作品
                </p>
              </div>
            )}

            {/* 作品网格 */}
            <WorkGrid
              works={works}
              loading={loading && currentPage === 1}
              onReuse={handleWorkReuse}
              onView={handleWorkView}
              onLoadMore={handleLoadMore}
              hasMore={hasMore}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default function SquarePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    }>
      <SquarePageContent />
    </Suspense>
  );
}