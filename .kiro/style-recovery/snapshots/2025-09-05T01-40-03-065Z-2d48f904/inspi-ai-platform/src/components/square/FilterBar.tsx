'use client';

import React, { useState } from 'react';
import { FilterOptions } from '@/types/square';

interface FilterBarProps {
  filters: FilterOptions;
  selectedSubject?: string;
  selectedGradeLevel?: string;
  selectedSort?: string;
  onSubjectChange?: (subject: string | undefined) => void;
  onGradeLevelChange?: (gradeLevel: string | undefined) => void;
  onSortChange?: (sort: string) => void;
  onReset?: () => void;
}

const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  selectedSubject,
  selectedGradeLevel,
  selectedSort = 'latest',
  onSubjectChange,
  onGradeLevelChange,
  onSortChange,
  onReset
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasActiveFilters = selectedSubject || selectedGradeLevel;

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
  };

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="px-4 py-3">
        {/* 顶部控制栏 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* 筛选按钮 */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md transition-colors duration-200 ${
                hasActiveFilters 
                  ? 'text-indigo-700 bg-indigo-50 border-indigo-300' 
                  : 'text-gray-700 bg-white hover:bg-gray-50'
              }`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              筛选
              {hasActiveFilters && (
                <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-indigo-600 rounded-full">
                  {(selectedSubject ? 1 : 0) + (selectedGradeLevel ? 1 : 0)}
                </span>
              )}
              <svg className={`w-4 h-4 ml-2 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* 排序选择 */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">排序：</span>
              <select
                value={selectedSort}
                onChange={(e) => onSortChange?.(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="latest">最新发布</option>
                <option value="popular">最受欢迎</option>
                <option value="reuse_count">复用最多</option>
              </select>
            </div>
          </div>

          {/* 重置按钮 */}
          {hasActiveFilters && (
            <button
              onClick={handleReset}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors duration-200"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              清除筛选
            </button>
          )}
        </div>

        {/* 展开的筛选面板 */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 学科筛选 */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">学科</h4>
                <div className="flex flex-wrap gap-2">
                  {filters.subjects.map((subject) => (
                    <button
                      key={subject.value}
                      onClick={() => handleSubjectClick(subject.value)}
                      className={`inline-flex items-center px-3 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
                        selectedSubject === subject.value
                          ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-transparent'
                      }`}
                    >
                      {subject.label}
                      <span className="ml-2 text-xs text-gray-500">
                        ({subject.count})
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 学段筛选 */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">学段</h4>
                <div className="flex flex-wrap gap-2">
                  {filters.gradeLevels.map((gradeLevel) => (
                    <button
                      key={gradeLevel.value}
                      onClick={() => handleGradeLevelClick(gradeLevel.value)}
                      className={`inline-flex items-center px-3 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
                        selectedGradeLevel === gradeLevel.value
                          ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-transparent'
                      }`}
                    >
                      {gradeLevel.label}
                      <span className="ml-2 text-xs text-gray-500">
                        ({gradeLevel.count})
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 活跃筛选标签 */}
        {hasActiveFilters && !isExpanded && (
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedSubject && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-indigo-100 text-indigo-800">
                学科: {selectedSubject}
                <button
                  onClick={() => onSubjectChange?.(undefined)}
                  className="ml-2 inline-flex items-center justify-center w-4 h-4 text-indigo-600 hover:text-indigo-800"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )}
            {selectedGradeLevel && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-indigo-100 text-indigo-800">
                学段: {selectedGradeLevel}
                <button
                  onClick={() => onGradeLevelChange?.(undefined)}
                  className="ml-2 inline-flex items-center justify-center w-4 h-4 text-indigo-600 hover:text-indigo-800"
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
  );
};

export default React.memo(FilterBar);