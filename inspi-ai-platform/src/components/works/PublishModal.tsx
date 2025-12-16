'use client';

import React, { useState } from 'react';

import { TeachingCard } from '@/shared/types/teaching';

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: PublishData) => void;
  workData: {
    title: string;
    knowledgePoint: string;
    subject: string;
    gradeLevel: string;
    cards: TeachingCard[];
    tags: string[];
  };
  isLoading?: boolean;
}

interface PublishData {
  title: string;
  knowledgePoint: string;
  subject: string;
  gradeLevel: string;
  cards: TeachingCard[];
  tags: string[];
  description?: string;
}

const CARD_TYPE_NAMES = {
  visualization: '可视化卡',
  analogy: '类比延展卡',
  thinking: '启发思考卡',
  interaction: '互动氛围卡',
};

export default function PublishModal({
  isOpen,
  onClose,
  onConfirm,
  workData,
  isLoading = false,
}: PublishModalProps) {
  const [description, setDescription] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!agreedToTerms) {
      setFormError('请先勾选并同意发布协议。');
      return;
    }

    setFormError(null);
    onConfirm({
      ...workData,
      description: description.trim(),
    });
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">发布作品预览</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isLoading}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 space-y-6">
          {formError ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
              {formError}
            </div>
          ) : null}

          {/* 作品基本信息 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">作品信息</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">标题：</span>
                <span className="font-medium">{workData.title}</span>
              </div>
              <div>
                <span className="text-gray-600">知识点：</span>
                <span className="font-medium">{workData.knowledgePoint}</span>
              </div>
              <div>
                <span className="text-gray-600">学科：</span>
                <span className="font-medium">{workData.subject}</span>
              </div>
              <div>
                <span className="text-gray-600">学段：</span>
                <span className="font-medium">{workData.gradeLevel}</span>
              </div>
            </div>

            {workData.tags.length > 0 && (
              <div className="mt-3">
                <span className="text-gray-600 text-sm">标签：</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {workData.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 教学卡片预览 */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">
              教学卡片 ({workData.cards.length}张)
            </h3>
            <div className="space-y-3">
              {workData.cards.map((card, index) => (
                <div key={card.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-600">
                      {CARD_TYPE_NAMES[card.type] || card.type}
                    </span>
                    <span className="text-xs text-gray-500">#{index + 1}</span>
                  </div>
                  <h4 className="font-medium text-gray-900 mb-1">{card.title}</h4>
                  <p className="text-sm text-gray-600 line-clamp-2">{card.content}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 作品描述 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              作品描述 (可选)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="简单介绍一下这个作品的特色和使用场景..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              {description.length}/200 字符
            </p>
          </div>

          {/* 发布协议 */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">发布协议</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p>• 发布的作品将在智慧广场公开展示，供其他教学伙伴学习和复用</p>
              <p>• 您保留作品的原创权，其他教学伙伴复用时会自动标注归属</p>
              <p>• 作品被复用时，您将获得贡献度积分奖励</p>
              <p>• 请确保作品内容健康、积极，符合教育价值观</p>
              <p>• 平台有权对不当内容进行审核和处理</p>
            </div>

            <label className="flex items-center mt-3">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mr-2"
                disabled={isLoading}
              />
              <span className="text-sm text-gray-700">
                我已阅读并同意以上发布协议
              </span>
            </label>
          </div>

          {/* 发布提示 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">发布后您将获得：</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>+10 贡献度积分（创作奖励）</li>
                  <li>作品在智慧广场展示机会</li>
                  <li>每次被复用额外获得 +50 积分</li>
                  <li>提升个人教学影响力</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={!agreedToTerms || isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                发布中...
              </div>
            ) : (
              '确认发布'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
