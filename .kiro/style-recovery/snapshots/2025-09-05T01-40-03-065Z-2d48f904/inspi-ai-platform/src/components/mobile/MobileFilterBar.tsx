'use client';

import React, { useState } from 'react';
import { FilterOptions } from '@/types/square';

interface MobileFilterBarProps {
  filters: FilterOptions;
  selectedSubject?: string;
  selectedGradeLevel?: string;
  selectedSort?: string;
  onSubjectChange?: (subject: string | undefined) => void;
  onGradeLevelChange?: (gradeLevel: string | undefined) => void;
  onSortChange?: (sort: string) => void;
  onReset?: () => void;
}

const MobileFilterBar: React.FC<MobileFilterBarProps> = ({
  filters,
  selectedSubject,
  selectedGradeLevel,
  selectedSort = 'latest',
  onSubjectChange,
  onGradeLevelChange,
  onSortChange,
  onReset
}) => {
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);

  const hasActiveFilters = selectedSubject || selectedGradeLevel;
  const activeFilterCount = (selectedSubject ? 1 : 0) + (selectedGradeLevel ? 1 : 0);

  const handleSubjectClick = (subject: string) => {
    if (selectedSubject === subject) {
      onSubjectChange?.(undefined);
    } else {
      onSubjectChange?.(subject);
    }
  };

  const handleGradeLevelClick = (gradeLevel: string) => {
    if (selectedGradeLevel === gradeLevel) {
      onGradeLevelChange?.(undefined);
    } else {
      onGradeLevelChange?.(gradeLevel);
    }
  };

  const handleReset = () => {
    onSubjectChange?.(undefined);
    onGradeLevelChange?.(undefined);
    onSortChange?.('latest');
    onReset?.();
    setShowFilterModal(false);
  };

  const getSortLabel = (sort: string) => {
    const labels = {
      'latest': '最新',
      'popular': '热门',
      'reuse_count': '复用'
    };
    return labels[sort as keyof typeof labels] || '最新';
  };

  return (
    <>
      {/* 移动端筛选栏 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            {/* 筛选按钮 */}
            <button
              onClick={() => setShowFilterModal(true)}
              className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                hasActiveFilters 
                  ? 'text-indigo-700 bg-indigo-50 border border-indigo-200' 
                  : 'text-gray-700 bg-gray-50 border border-gray-200'
              }`}
              style={{ 
                minHeight: '44px',
                touchAction: 'manipulation'
              }}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              筛选
              {hasActiveFilters && (
                <span className="ml-2 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-indigo-600 rounded-full min-w-[18px]">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* 排序按钮 */}
            <button
              onClick={() => setShowSortModal(true)}
              className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 transition-colors duration-200"
              style={{ 
                minHeight: '44px',
                touchAction: 'manipulation'
              }}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              </svg>
              {getSortLabel(selectedSort)}
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* 活跃筛选标签 */}
          {hasActiveFilters && (
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedSubject && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-indigo-100 text-indigo-800">
                  {selectedSubject}
                  <button
                    onClick={() => onSubjectChange?.(undefined)}
                    className="ml-1 inline-flex items-center justify-center w-4 h-4 text-indigo-600 hover:text-indigo-800"
                    style={{ touchAction: 'manipulation' }}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )}
              {selectedGradeLevel && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-indigo-100 text-indigo-800">
                  {selectedGradeLevel}
                  <button
                    onClick={() => onGradeLevelChange?.(undefined)}
                    className="ml-1 inline-flex items-center justify-center w-4 h-4 text-indigo-600 hover:text-indigo-800"
                    style={{ touchAction: 'manipulation' }}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 筛选模态框 */}
      {showFilterModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* 背景遮罩 */}
            <div 
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowFilterModal(false)}
            ></div>

            {/* 模态框内容 */}
            <div className="inline-block align-bottom bg-white rounded-t-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:rounded-lg">
              {/* 头部 */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">筛选条件</h3>
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="inline-flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 rounded-full"
                  style={{ touchAction: 'manipulation' }}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* 学科筛选 */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-3">学科</h4>
                <div className="grid grid-cols-2 gap-2">
                  {filters.subjects.map((subject) => (
                    <button
                      key={subject.value}
                      onClick={() => handleSubjectClick(subject.value)}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                        selectedSubject === subject.value
                          ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                      }`}
                      style={{ 
                        minHeight: '44px',
                        touchAction: 'manipulation'
                      }}
                    >
                      <span>{subject.label}</span>
                      <span className="text-xs text-gray-500">
                        {subject.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 学段筛选 */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-3">学段</h4>
                <div className="grid grid-cols-2 gap-2">
                  {filters.gradeLevels.map((gradeLevel) => (
                    <button
                      key={gradeLevel.value}
                      onClick={() => handleGradeLevelClick(gradeLevel.value)}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                        selectedGradeLevel === gradeLevel.value
                          ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                      }`}
                      style={{ 
                        minHeight: '44px',
                        touchAction: 'manipulation'
                      }}
                    >
                      <span>{gradeLevel.label}</span>
                      <span className="text-xs text-gray-500">
                        {gradeLevel.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 底部按钮 */}
              <div className="flex space-x-3">
                <button
                  onClick={handleReset}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
                  style={{ 
                    minHeight: '44px',
                    touchAction: 'manipulation'
                  }}
                >
                  重置
                </button>
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="flex-1 px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors duration-200"
                  style={{ 
                    minHeight: '44px',
                    touchAction: 'manipulation'
                  }}
                >
                  确定
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 排序模态框 */}
      {showSortModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* 背景遮罩 */}
            <div 
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowSortModal(false)}
            ></div>

            {/* 模态框内容 */}
            <div className="inline-block align-bottom bg-white rounded-t-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-sm sm:w-full sm:rounded-lg">
              {/* 头部 */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">排序方式</h3>
                <button
                  onClick={() => setShowSortModal(false)}
                  className="inline-flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 rounded-full"
                  style={{ touchAction: 'manipulation' }}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* 排序选项 */}
              <div className="space-y-2">
                {filters.sortOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      onSortChange?.(option.value);
                      setShowSortModal(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium transition-colors duration-200 ${
                      selectedSort === option.value
                        ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }`}
                    style={{ 
                      minHeight: '44px',
                      touchAction: 'manipulation'
                    }}
                  >
                    <span>{option.label}</span>
                    {selectedSort === option.value && (
                      <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default React.memo(MobileFilterBar);