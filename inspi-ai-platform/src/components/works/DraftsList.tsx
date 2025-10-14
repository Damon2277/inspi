'use client';

import React, { useState, useEffect } from 'react';

import { WorkDocument } from '@/lib/models/Work';

interface DraftsListProps {
  onSelectDraft?: (draft: WorkDocument) => void;
  onDeleteDraft?: (draftId: string) => void;
  className?: string;
}

export default function DraftsList({
  onSelectDraft,
  onDeleteDraft,
  className = '',
}: DraftsListProps) {
  const [drafts, setDrafts] = useState<WorkDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDrafts();
  }, []);

  const fetchDrafts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/works/drafts');
      const data = await response.json();

      if (data.success) {
        setDrafts(data.data);
      } else {
        setError(data.message || '获取草稿失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (draftId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('确定要删除这个草稿吗？此操作不可恢复。')) {
      return;
    }

    try {
      const response = await fetch(`/api/works/${draftId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setDrafts(drafts.filter(draft => String(draft._id) !== draftId));
        onDeleteDraft && onDeleteDraft(draftId);
      } else {
        alert(data.message || '删除失败');
      }
    } catch (err) {
      alert('删除失败，请稍后重试');
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-gray-200 h-20 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className}`}>
        <div className="text-center py-8">
          <div className="text-red-600 mb-2">{error}</div>
          <button
            onClick={fetchDrafts}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  if (drafts.length === 0) {
    return (
      <div className={`${className}`}>
        <div className="text-center py-8 text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm">暂无草稿</p>
          <p className="text-xs text-gray-400 mt-1">创建的草稿会自动保存在这里</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <div className="space-y-3">
        {drafts.map((draft) => (
          <div
            key={String(draft._id)}
            onClick={() => onSelectDraft && onSelectDraft(draft)}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer group"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 truncate group-hover:text-blue-600">
                  {draft.title || '未命名作品'}
                </h3>
                <p className="text-sm text-gray-600 mt-1 truncate">
                  {draft.knowledgePoint || '暂无知识点'}
                </p>

                <div className="flex items-center mt-2 text-xs text-gray-500 space-x-3">
                  <span>{draft.subject || '未选择学科'}</span>
                  <span>•</span>
                  <span>{draft.gradeLevel || '未选择学段'}</span>
                  <span>•</span>
                  <span>{draft.cards?.length || 0} 张卡片</span>
                </div>

                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-400">
                    更新于 {formatDate(draft.updatedAt)}
                  </span>

                  <div className="flex items-center space-x-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      草稿
                    </span>
                  </div>
                </div>
              </div>

              <div className="ml-3 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => handleDelete(String(draft._id), e)}
                  className="p-1 text-gray-400 hover:text-red-600 rounded"
                  title="删除草稿"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {drafts.length > 0 && (
        <div className="text-center mt-4">
          <p className="text-xs text-gray-500">
            共 {drafts.length} 个草稿
          </p>
        </div>
      )}
    </div>
  );
}
