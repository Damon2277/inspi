/**
 * 智慧广场相关类型定义
 */

import { IWork } from '../lib/models/Work';

// 作品卡片展示类型
export interface WorkCardData {
  id: string;
  title: string;
  knowledgePoint: string;
  subject: string;
  gradeLevel: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  reuseCount: number;
  createdAt: string;
  updatedAt: string;
  thumbnail?: string;
  tags: string[];
  // 卡片预览信息
  cardCount: number;
  cardTypes: string[];
}

// 作品列表查询参数
export interface WorksQueryParams {
  page?: number;
  limit?: number;
  subject?: string;
  gradeLevel?: string;
  sortBy?: 'latest' | 'popular' | 'reuse_count';
  search?: string;
  tags?: string[];
}

// 作品列表响应
export interface WorksListResponse {
  works: WorkCardData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: {
    subjects: string[];
    gradeLevels: string[];
    availableTags: string[];
  };
}

// 筛选选项
export interface FilterOptions {
  subjects: Array<{
    value: string;
    label: string;
    count: number;
  }>;
  gradeLevels: Array<{
    value: string;
    label: string;
    count: number;
  }>;
  sortOptions: Array<{
    value: string;
    label: string;
  }>;
}

// 搜索建议
export interface SearchSuggestion {
  type: 'knowledge_point' | 'title' | 'author' | 'tag';
  value: string;
  count: number;
}

// 搜索响应
export interface SearchResponse {
  works: WorkCardData[];
  suggestions: SearchSuggestion[];
  total: number;
  query: string;
}

// 无限滚动数据
export interface InfiniteWorksData {
  pages: WorksListResponse[];
  pageParams: number[];
}

// 作品详情（用于预览）
export interface WorkDetail extends WorkCardData {
  cards: Array<{
    id: string;
    type: string;
    title: string;
    content: string;
  }>;
  attribution: Array<{
    originalAuthor: string;
    originalWorkTitle: string;
    originalWorkId: string;
  }>;
  description?: string;
}