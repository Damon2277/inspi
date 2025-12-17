'use client';

import React, { useEffect, useMemo, useState } from 'react';

import WorkPreview from '@/components/works/WorkPreview';
import type { WorkDocument } from '@/lib/models/Work';
import type { TeachingCard } from '@/shared/types/teaching';

const dateTimeFormatter = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' });
const dateFormatter = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium' });
const numberFormatter = new Intl.NumberFormat('zh-CN');

interface AdminContentAuthor {
  _id: string;
  name: string;
  avatar?: string | null;
  email?: string;
}

interface AdminContentItem {
  id: string;
  _id: string;
  title: string;
  description?: string;
  knowledgePoint: string;
  subject: string;
  gradeLevel: string;
  category: string;
  tags: string[];
  cards: TeachingCard[];
  author: AdminContentAuthor;
  status: 'draft' | 'published' | 'archived' | 'private';
  visibility: 'public' | 'unlisted' | 'private';
  createdAt: string;
  updatedAt: string;
  views: number;
  likesCount: number;
  reuseCount: number;
  bookmarksCount: number;
}

interface BannerState {
  type: 'success' | 'error';
  message: string;
}

const STATUS_LABELS: Record<AdminContentItem['status'], string> = {
  draft: '草稿',
  published: '已发布',
  archived: '已归档',
  private: '私有',
};

export function ContentManagementPanel() {
  const pageSize = 10;
  const [items, setItems] = useState<AdminContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [selectedContent, setSelectedContent] = useState<AdminContentItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [banner, setBanner] = useState<BannerState | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    let isActive = true;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ page: page.toString(), pageSize: pageSize.toString() });
    if (query) params.set('search', query);

    const load = async () => {
      try {
        const response = await fetch(`/api/admin/content?${params.toString()}`, { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || '加载内容列表失败');
        }
        if (!isActive) return;
        setItems(data?.data?.items || []);
        setTotal(data?.data?.total || 0);
      } catch (err) {
        if (!isActive) return;
        console.error('Failed to fetch content list', err);
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      isActive = false;
    };
  }, [page, pageSize, query, refreshIndex]);

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setQuery(searchInput.trim());
    setPage(1);
  };

  const handleSelectContent = async (record: AdminContentItem) => {
    setSelectedContent(record);
    setDetailLoading(true);
    try {
      const response = await fetch(`/api/admin/content/${record.id}`);
      const data = await response.json();
      if (response.ok && data?.data) {
        setSelectedContent(data.data);
      }
    } catch (err) {
      console.error('Failed to load content detail', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = async (record: AdminContentItem) => {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line no-alert
      const confirmed = window.confirm('确认删除该内容？操作不可恢复。');
      if (!confirmed) {
        return;
      }
    }

    setBanner(null);
    try {
      const response = await fetch(`/api/admin/content/${record.id}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || '删除失败');
      }
      setBanner({ type: 'success', message: '内容已删除' });
      if (selectedContent?.id === record.id) {
        setSelectedContent(null);
      }
      setRefreshIndex(prev => prev + 1);
    } catch (err) {
      console.error('Failed to delete content', err);
      setBanner({ type: 'error', message: err instanceof Error ? err.message : '删除失败' });
    }
  };

  const closePreview = () => setSelectedContent(null);

  const previewWork = useMemo<WorkDocument | null>(() => (
    selectedContent ? (selectedContent as unknown as WorkDocument) : null
  ), [selectedContent]);

  const renderStatus = (status: AdminContentItem['status']) => {
    const tone = status === 'published' ? 'text-emerald-700 bg-emerald-50' : status === 'draft' ? 'text-amber-700 bg-amber-50' : 'text-gray-700 bg-gray-100';
    return (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>
        {STATUS_LABELS[status]}
      </span>
    );
  };

  return (
    <>
      <section className="bg-white border border-gray-100 rounded-2xl shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-100 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">内容管理</h2>
            <p className="text-sm text-gray-500">与用户端保持一致的创作内容预览</p>
          </div>
          <form onSubmit={handleSearchSubmit} className="flex rounded-lg border border-gray-200">
            <input
              type="text"
              value={searchInput}
              onChange={event => setSearchInput(event.target.value)}
              placeholder="搜索标题或知识点"
              className="w-full rounded-l-lg border-none px-3 py-2 text-sm focus:outline-none"
            />
            <button type="submit" className="rounded-r-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white">
              搜索
            </button>
          </form>
        </div>

        {banner && (
          <div className={`mx-6 mt-4 rounded-lg border px-4 py-3 text-sm ${banner.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
            <div className="flex items-center justify-between">
              <span>{banner.message}</span>
              <button className="text-xs underline" onClick={() => setBanner(null)}>
                关闭
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mx-6 mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">标题 / 作者</th>
                <th className="px-4 py-3">学科 / 年级</th>
                <th className="px-4 py-3">状态 / 标签</th>
                <th className="px-4 py-3">创建时间</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                    正在加载内容...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                    暂无记录
                  </td>
                </tr>
              ) : (
                items.map(record => (
                  <tr key={record.id} className="border-b border-gray-100">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{record.title}</p>
                      <p className="text-xs text-gray-500">{record.author.name} · {record.knowledgePoint}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {record.subject}
                      <p className="text-xs text-gray-400">{record.gradeLevel}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {renderStatus(record.status)}
                      <div className="mt-1 flex flex-wrap gap-1">
                        {record.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{dateTimeFormatter.format(new Date(record.createdAt))}</td>
                    <td className="px-4 py-3 text-right text-sm space-x-3">
                      <button className="text-indigo-600 hover:underline" onClick={() => handleSelectContent(record)}>
                        查看
                      </button>
                      <button className="text-rose-600 hover:underline" onClick={() => handleDelete(record)}>
                        删除
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4 text-sm text-gray-600">
          <p>
            第 {page} / {totalPages} 页 · 共 {numberFormatter.format(total)} 条
          </p>
          <div className="space-x-2">
            <button
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              disabled={page === 1}
              className="rounded-lg border border-gray-200 px-3 py-1 disabled:opacity-50"
            >
              上一页
            </button>
            <button
              onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
              className="rounded-lg border border-gray-200 px-3 py-1 disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        </div>
      </section>

      {selectedContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="absolute inset-0" onClick={closePreview} />
          <div className="relative z-10 w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{selectedContent.title}</h3>
                <p className="text-sm text-gray-500">
                  作者：{selectedContent.author.name} · 学科：{selectedContent.subject} · 年级：{selectedContent.gradeLevel}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {detailLoading && <span className="text-xs text-gray-500">加载详情中...</span>}
                <button className="text-sm text-gray-500 hover:text-gray-700" onClick={closePreview}>
                  关闭
                </button>
              </div>
            </div>
            <div className="max-h-[75vh] overflow-y-auto px-6 py-6">
              {previewWork ? (
                <WorkPreview work={previewWork} />
              ) : (
                <p className="text-sm text-gray-500">暂未获取到内容详情。</p>
              )}
              <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                <span>创建于 {dateFormatter.format(new Date(selectedContent.createdAt))}</span>
                <span className="text-right">
                  浏览 {numberFormatter.format(selectedContent.views)} ·
                  收藏 {numberFormatter.format(selectedContent.bookmarksCount)}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
              <button
                onClick={() => handleDelete(selectedContent)}
                className="rounded-lg border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-600"
              >
                删除此内容
              </button>
              <button onClick={closePreview} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700">
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
