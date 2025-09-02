'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/context';
import WorkPreview from '@/components/works/WorkPreview';
import { WorkDocument } from '@/lib/models/Work';
import Link from 'next/link';

type TabType = 'published' | 'drafts' | 'all';

const SUBJECTS = [
  '数学', '语文', '英语', '物理', '化学', '生物', 
  '历史', '地理', '政治', '音乐', '美术', '体育'
];

const GRADE_LEVELS = [
  '小学一年级', '小学二年级', '小学三年级', '小学四年级', '小学五年级', '小学六年级',
  '初中一年级', '初中二年级', '初中三年级',
  '高中一年级', '高中二年级', '高中三年级'
];

export default function WorksPage() {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('published');
  const [works, setWorks] = useState<WorkDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    subject: '',
    gradeLevel: '',
    search: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0
  });

  useEffect(() => {
    if (isAuthenticated) {
      fetchWorks();
    }
  }, [isAuthenticated, activeTab, filters, pagination.page]);

  const fetchWorks = async () => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        author: user?.id || '',
        status: activeTab === 'all' ? '' : activeTab === 'drafts' ? 'draft' : 'published',
        page: pagination.page.toString(),
        limit: '10'
      });

      if (filters.subject) params.append('subject', filters.subject);
      if (filters.gradeLevel) params.append('gradeLevel', filters.gradeLevel);

      const response = await fetch(`/api/works?${params}`);
      const data = await response.json();

      if (data.success) {
        setWorks(data.data.works);
        setPagination({
          page: data.data.page,
          totalPages: data.data.totalPages,
          total: data.data.total
        });
      } else {
        setError(data.message || '获取作品失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!filters.search.trim()) {
      fetchWorks();
      return;
    }

    try {
      setLoading(true);
      const params = new URLSearchParams({
        q: filters.search,
        limit: '20'
      });

      if (filters.subject) params.append('subject', filters.subject);
      if (filters.gradeLevel) params.append('gradeLevel', filters.gradeLevel);

      const response = await fetch(`/api/works/search?${params}`);
      const data = await response.json();

      if (data.success) {
        setWorks(data.data);
        setPagination({ page: 1, totalPages: 1, total: data.total });
      } else {
        setError(data.message || '搜索失败');
      }
    } catch (err) {
      setError('搜索失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (workId: string) => {
    if (!confirm('确定要删除这个作品吗？此操作不可恢复。')) {
      return;
    }

    try {
      const response = await fetch(`/api/works/${workId}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setWorks(prev => prev.filter(work => work._id !== workId));
      } else {
        alert(data.message || '删除失败');
      }
    } catch (err) {
      alert('删除失败，请稍后重试');
    }
  };

  const handleReuse = async (work: WorkDocument) => {
    // 复用逻辑：创建基于现有作品的新草稿
    try {
      const response = await fetch('/api/works', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: `${work.title} (复用)`,
          knowledgePoint: work.knowledgePoint,
          subject: work.subject,
          gradeLevel: work.gradeLevel,
          cards: work.cards,
          tags: work.tags,
          status: 'draft',
          originalWork: work._id
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // 跳转到编辑页面
        window.location.href = `/create?edit=${data.data._id}`;
      } else {
        alert(data.message || '复用失败');
      }
    } catch (err) {
      alert('复用失败，请稍后重试');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">请先登录</h1>
          <p className="text-gray-600 mb-6">登录后即可查看和管理您的作品</p>
          <Link 
            href="/"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold text-gray-900">我的作品</h1>
            <Link
              href="/create"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              创建新作品
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 标签页和筛选器 */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          {/* 标签页 */}
          <div className="flex space-x-1 mb-6">
            {[
              { key: 'published', label: '已发布', count: works.filter(w => w.status === 'published').length },
              { key: 'drafts', label: '草稿', count: works.filter(w => w.status === 'draft').length },
              { key: 'all', label: '全部', count: works.length }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key as TabType);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* 搜索和筛选 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="flex">
                <input
                  type="text"
                  placeholder="搜索作品标题、知识点或标签..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSearch}
                  className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700"
                >
                  搜索
                </button>
              </div>
            </div>
            
            <select
              value={filters.subject}
              onChange={(e) => setFilters(prev => ({ ...prev, subject: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部学科</option>
              {SUBJECTS.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
            
            <select
              value={filters.gradeLevel}
              onChange={(e) => setFilters(prev => ({ ...prev, gradeLevel: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部学段</option>
              {GRADE_LEVELS.map(grade => (
                <option key={grade} value={grade}>{grade}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 作品列表 */}
        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-lg shadow-sm border p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-red-600 mb-4">{error}</div>
            <button
              onClick={fetchWorks}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              重新加载
            </button>
          </div>
        ) : works.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无作品</h3>
            <p className="text-gray-600 mb-6">
              {activeTab === 'drafts' ? '还没有草稿' : '还没有发布的作品'}
            </p>
            <Link
              href="/create"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              创建第一个作品
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {works.map(work => (
              <WorkPreview
                key={work._id?.toString() || Math.random().toString()}
                work={work}
                showActions={true}
                onEdit={() => window.location.href = `/create?edit=${work._id}`}
                onDelete={() => handleDelete(work._id?.toString() || '')}
                onReuse={() => handleReuse(work)}
              />
            ))}
          </div>
        )}

        {/* 分页 */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-center mt-8">
            <div className="flex space-x-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page <= 1}
                className="px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                上一页
              </button>
              
              <span className="px-3 py-2 text-sm text-gray-700">
                第 {pagination.page} 页，共 {pagination.totalPages} 页
              </span>
              
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}