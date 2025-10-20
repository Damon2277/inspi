'use client';

import { useState, useCallback, useMemo } from 'react';

import { useDebouncedValue } from './useOptimizedState';

interface SearchOptions {
  fields?: string[];
  caseSensitive?: boolean;
  fuzzy?: boolean;
  minScore?: number;
}

/**
 * 通用搜索 Hook
 */
export function useSearch<T extends Record<string, any>>(
  items: T[],
  options: SearchOptions = {},
) {
  const {
    fields = [],
    caseSensitive = false,
    fuzzy = true,
    minScore = 0.3,
  } = options;

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebouncedValue(searchQuery, 300);

  // 计算相似度分数（简单的模糊匹配）
  const calculateScore = useCallback((text: string, query: string): number => {
    if (!fuzzy) {
      return text.includes(query) ? 1 : 0;
    }

    const textLower = caseSensitive ? text : text.toLowerCase();
    const queryLower = caseSensitive ? query : query.toLowerCase();

    // 完全匹配
    if (textLower === queryLower) return 1;

    // 包含匹配
    if (textLower.includes(queryLower)) return 0.8;

    // 开头匹配
    if (textLower.startsWith(queryLower)) return 0.9;

    // 模糊匹配（Levenshtein距离的简化版）
    let score = 0;
    const queryChars = queryLower.split('');
    let lastIndex = -1;

    for (const char of queryChars) {
      const index = textLower.indexOf(char, lastIndex + 1);
      if (index > lastIndex) {
        score += 1;
        lastIndex = index;
      }
    }

    return score / queryChars.length * 0.6;
  }, [caseSensitive, fuzzy]);

  // 搜索单个项目
  const searchItem = useCallback((item: T, query: string): number => {
    if (!query) return 1;

    let maxScore = 0;
    const searchFields = fields.length > 0 ? fields : Object.keys(item);

    for (const field of searchFields) {
      const value = item[field];
      if (typeof value === 'string') {
        const score = calculateScore(value, query);
        maxScore = Math.max(maxScore, score);
      } else if (Array.isArray(value)) {
        // 搜索数组中的字符串
        for (const v of value) {
          if (typeof v === 'string') {
            const score = calculateScore(v, query);
            maxScore = Math.max(maxScore, score);
          }
        }
      }
    }

    return maxScore;
  }, [fields, calculateScore]);

  // 过滤和排序结果
  const filteredItems = useMemo(() => {
    if (!debouncedQuery) return items;

    const results = items
      .map(item => ({
        item,
        score: searchItem(item, debouncedQuery),
      }))
      .filter(result => result.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .map(result => result.item);

    return results;
  }, [items, debouncedQuery, searchItem, minScore]);

  // 搜索统计
  const searchStats = useMemo(() => ({
    total: items.length,
    filtered: filteredItems.length,
    hasQuery: !!debouncedQuery,
    query: debouncedQuery,
  }), [items.length, filteredItems.length, debouncedQuery]);

  return {
    searchQuery,
    setSearchQuery,
    filteredItems,
    searchStats,
    isSearching: searchQuery !== debouncedQuery,
  };
}

/**
 * 高级搜索 Hook，支持多条件筛选
 */
export interface FilterConfig<T> {
  field: keyof T;
  type: 'text' | 'select' | 'range' | 'boolean';
  label: string;
  options?: { value: any; label: string }[];
}

export function useAdvancedSearch<T extends Record<string, any>>(
  items: T[],
  filters: FilterConfig<T>[],
  searchOptions: SearchOptions = {},
) {
  const [filterValues, setFilterValues] = useState<Record<string, any>>({});
  const { searchQuery, setSearchQuery, filteredItems: textFiltered } = useSearch(
    items,
    searchOptions,
  );

  // 应用过滤器
  const filteredItems = useMemo(() => {
    return textFiltered.filter(item => {
      for (const filter of filters) {
        const filterValue = filterValues[filter.field as string];

        if (filterValue === undefined || filterValue === '' || filterValue === null) {
          continue;
        }

        const itemValue = item[filter.field];

        switch (filter.type) {
          case 'text':
            if (!String(itemValue).toLowerCase().includes(String(filterValue).toLowerCase())) {
              return false;
            }
            break;

          case 'select':
            if (itemValue !== filterValue) {
              return false;
            }
            break;

          case 'range':
            if (Array.isArray(filterValue)) {
              const [min, max] = filterValue;
              if (itemValue < min || itemValue > max) {
                return false;
              }
            }
            break;

          case 'boolean':
            if (Boolean(itemValue) !== Boolean(filterValue)) {
              return false;
            }
            break;
        }
      }

      return true;
    });
  }, [textFiltered, filters, filterValues]);

  const updateFilter = useCallback((field: string, value: any) => {
    setFilterValues(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilterValues({});
    setSearchQuery('');
  }, [setSearchQuery]);

  const activeFilterCount = useMemo(() => {
    return Object.values(filterValues).filter(v => v !== undefined && v !== '' && v !== null).length;
  }, [filterValues]);

  return {
    searchQuery,
    setSearchQuery,
    filterValues,
    updateFilter,
    clearFilters,
    filteredItems,
    activeFilterCount,
    searchStats: {
      total: items.length,
      filtered: filteredItems.length,
      hasFilters: activeFilterCount > 0 || !!searchQuery,
    },
  };
}
