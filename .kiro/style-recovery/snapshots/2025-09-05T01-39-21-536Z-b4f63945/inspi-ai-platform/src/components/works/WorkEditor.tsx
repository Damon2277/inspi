'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { TeachingCard } from '@/types/teaching';
import CardEditor from '@/components/magic/CardEditor';

interface WorkEditorProps {
  initialData?: {
    id?: string;
    title?: string;
    knowledgePoint?: string;
    subject?: string;
    gradeLevel?: string;
    cards?: TeachingCard[];
    tags?: string[];
    status?: 'draft' | 'published';
  };
  onSave?: (data: any) => void;
  onPublish?: (data: any) => void;
  onAutoSave?: (data: any) => void;
  isLoading?: boolean;
}

const SUBJECTS = [
  '数学', '语文', '英语', '物理', '化学', '生物', 
  '历史', '地理', '政治', '音乐', '美术', '体育'
];

const GRADE_LEVELS = [
  '小学一年级', '小学二年级', '小学三年级', '小学四年级', '小学五年级', '小学六年级',
  '初中一年级', '初中二年级', '初中三年级',
  '高中一年级', '高中二年级', '高中三年级'
];

export default function WorkEditor({ 
  initialData, 
  onSave, 
  onPublish, 
  onAutoSave,
  isLoading = false 
}: WorkEditorProps) {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    knowledgePoint: initialData?.knowledgePoint || '',
    subject: initialData?.subject || '',
    gradeLevel: initialData?.gradeLevel || '',
    cards: initialData?.cards || [],
    tags: initialData?.tags || [],
    status: initialData?.status || 'draft'
  });

  const [tagInput, setTagInput] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // 自动保存逻辑
  const debouncedAutoSave = useCallback(
    debounce((data: any) => {
      if (onAutoSave && hasChanges) {
        setAutoSaveStatus('saving');
        try {
          const result = onAutoSave(data) as any;
          if (result && typeof result?.then === 'function') {
            result
              .then(() => {
                setAutoSaveStatus('saved');
                setHasChanges(false);
                setTimeout(() => setAutoSaveStatus('idle'), 2000);
              })
              .catch(() => {
                setAutoSaveStatus('error');
                setTimeout(() => setAutoSaveStatus('idle'), 3000);
              });
          } else {
            setAutoSaveStatus('saved');
            setHasChanges(false);
            setTimeout(() => setAutoSaveStatus('idle'), 2000);
          }
        } catch (error) {
          setAutoSaveStatus('error');
          setTimeout(() => setAutoSaveStatus('idle'), 3000);
        }
      }
    }, 2000),
    [onAutoSave, hasChanges]
  );

  // 监听数据变化，触发自动保存
  useEffect(() => {
    if (hasChanges) {
      debouncedAutoSave(formData);
    }
  }, [formData, hasChanges, debouncedAutoSave]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleCardUpdate = (cardIndex: number, updatedCard: TeachingCard) => {
    const newCards = [...formData.cards];
    newCards[cardIndex] = updatedCard;
    handleInputChange('cards', newCards);
  };

  const handleCardDelete = (cardIndex: number) => {
    const newCards = formData.cards.filter((_, index) => index !== cardIndex);
    handleInputChange('cards', newCards);
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      handleInputChange('tags', [...formData.tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    handleInputChange('tags', formData.tags.filter(tag => tag !== tagToRemove));
  };

  const handleSave = () => {
    if (onSave) {
      onSave(formData);
      setHasChanges(false);
    }
  };

  const handlePublish = () => {
    if (onPublish) {
      onPublish({ ...formData, status: 'published' });
      setHasChanges(false);
    }
  };

  const isFormValid = formData.title.trim() && 
                     formData.knowledgePoint.trim() && 
                     formData.subject && 
                     formData.gradeLevel && 
                     formData.cards.length > 0;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* 自动保存状态指示器 */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">
          {initialData?.id ? '编辑作品' : '创建作品'}
        </h1>
        <div className="flex items-center space-x-2 text-sm">
          {autoSaveStatus === 'saving' && (
            <span className="text-blue-600">保存中...</span>
          )}
          {autoSaveStatus === 'saved' && (
            <span className="text-green-600">已自动保存</span>
          )}
          {autoSaveStatus === 'error' && (
            <span className="text-red-600">保存失败</span>
          )}
          {hasChanges && autoSaveStatus === 'idle' && (
            <span className="text-orange-600">有未保存的更改</span>
          )}
        </div>
      </div>

      {/* 基本信息表单 */}
      <div className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">基本信息</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              作品标题 *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="请输入作品标题"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              知识点 *
            </label>
            <input
              type="text"
              value={formData.knowledgePoint}
              onChange={(e) => handleInputChange('knowledgePoint', e.target.value)}
              placeholder="请输入知识点"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              学科 *
            </label>
            <select
              value={formData.subject}
              onChange={(e) => handleInputChange('subject', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">请选择学科</option>
              {SUBJECTS.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              学段 *
            </label>
            <select
              value={formData.gradeLevel}
              onChange={(e) => handleInputChange('gradeLevel', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">请选择学段</option>
              {GRADE_LEVELS.map(grade => (
                <option key={grade} value={grade}>{grade}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 标签管理 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            标签
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {formData.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
              placeholder="输入标签后按回车添加"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              添加
            </button>
          </div>
        </div>
      </div>

      {/* 教学卡片编辑 */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">教学卡片</h2>
        
        {formData.cards.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>暂无教学卡片</p>
            <p className="text-sm">请先使用AI魔法师生成卡片</p>
          </div>
        ) : (
          <div className="space-y-4">
            {formData.cards.map((card, index) => (
              <div key={card.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-medium text-gray-900">{card.title}</h4>
                  {formData.cards.length > 1 && (
                    <button
                      onClick={() => handleCardDelete(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      删除
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      标题
                    </label>
                    <input
                      type="text"
                      value={card.title}
                      onChange={(e) => handleCardUpdate(index, { ...card, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      内容
                    </label>
                    <textarea
                      value={card.content}
                      onChange={(e) => handleCardUpdate(index, { ...card, content: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-500">
          {formData.cards.length} 张卡片
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={!hasChanges || isLoading}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '保存中...' : '保存草稿'}
          </button>
          
          <button
            onClick={handlePublish}
            disabled={!isFormValid || isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '发布中...' : '发布作品'}
          </button>
        </div>
      </div>
    </div>
  );
}

// 防抖函数
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}