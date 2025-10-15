/**
 * 作品编辑器组件
 * 支持作品的创建和编辑功能
 */
'use client';

import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useState } from 'react';

import { WorkService, CreateWorkRequest, UpdateWorkRequest } from '@/core/community/work-service';
import { useAuth } from '@/shared/hooks/useAuth';

interface WorkEditorProps {
  workId?: string // 编辑模式时传入
  onSave?: (work: any) => void
  onCancel?: () => void
  className?: string
}

interface FormData extends CreateWorkRequest {
  status?: 'draft' | 'published' | 'archived' | 'private'
}

export function WorkEditor({ workId, onSave, onCancel, className = '' }: WorkEditorProps) {
  const router = useRouter();
  const { user } = useAuth();

  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    knowledgePoint: '',
    subject: '',
    gradeLevel: '',
    cards: [],
    tags: [],
    category: '',
    difficulty: 'beginner',
    estimatedTime: 30,
    visibility: 'public',
    allowReuse: true,
    allowComments: true,
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tagInput, setTagInput] = useState('');
  const [previewMode, setPreviewMode] = useState(false);

  // 学科和年级选项
  const subjects = [
    '数学', '语文', '英语', '物理', '化学', '生物',
    '历史', '地理', '政治', '科学', '艺术', '体育',
  ];

  const gradeLevels = [
    '小学一年级', '小学二年级', '小学三年级', '小学四年级', '小学五年级', '小学六年级',
    '初中一年级', '初中二年级', '初中三年级',
    '高中一年级', '高中二年级', '高中三年级',
  ];

  const categories = [
    '概念解释', '例题讲解', '实验演示', '历史故事',
    '生活应用', '思维训练', '复习总结', '拓展延伸',
  ];

  const loadWork = useCallback(async () => {
    if (!workId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/works/${workId}`);
      const result = await response.json();

      if (result.success && result.work) {
        const work = result.work;
        setFormData({
          title: work.title,
          description: work.description || '',
          knowledgePoint: work.knowledgePoint,
          subject: work.subject,
          gradeLevel: work.gradeLevel,
          cards: work.cards,
          tags: work.tags,
          category: work.category,
          difficulty: work.difficulty,
          estimatedTime: work.estimatedTime,
          visibility: work.visibility,
          allowReuse: work.allowReuse,
          allowComments: work.allowComments,
          status: work.status,
        });
      } else {
        setErrors({ general: result.error || '加载作品失败' });
      }
    } catch (error) {
      setErrors({ general: '加载作品失败' });
    } finally {
      setLoading(false);
    }
  }, [workId]);

  // 加载现有作品数据（编辑模式）
  useEffect(() => {
    void loadWork();
  }, [loadWork]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    const newValue = type === 'checkbox' ? checked :
                     type === 'number' ? parseInt(value, 10) || 0 : value;
    setFormData({
      ...formData,
      [name]: newValue,
    });

    // 清除对应字段的错误
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handleTagAdd = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim();

      if (!formData.tags.includes(newTag) && formData.tags.length < 10) {
        setFormData({
          ...formData,
          tags: [...formData.tags, newTag],
        });
      }

      setTagInput('');
    }
  };

  const handleTagRemove = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove),
    });
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = '请输入作品标题';
    } else if (formData.title.length < 2 || formData.title.length > 100) {
      newErrors.title = '标题长度应在2-100个字符之间';
    }

    if (!formData.knowledgePoint.trim()) {
      newErrors.knowledgePoint = '请输入知识点';
    }

    if (!formData.subject) {
      newErrors.subject = '请选择学科';
    }

    if (!formData.gradeLevel) {
      newErrors.gradeLevel = '请选择年级';
    }

    if (!formData.category) {
      newErrors.category = '请选择分类';
    }

    if (formData.cards.length === 0) {
      newErrors.cards = '请至少添加一张教学卡片';
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = '描述长度不能超过500个字符';
    }

    if (formData.estimatedTime < 5 || formData.estimatedTime > 300) {
      newErrors.estimatedTime = '预计学习时间应在5-300分钟之间';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (publish: boolean = false) => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      setErrors({});

      const saveData = { ...formData };
      if (publish) {
        saveData.status = 'published';
      }

      let result;
      if (workId) {
        // 更新作品
        const response = await fetch(`/api/works/${workId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          },
          body: JSON.stringify(saveData),
        });
        result = await response.json();
      } else {
        // 创建作品
        const response = await fetch('/api/works', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          },
          body: JSON.stringify(saveData),
        });
        result = await response.json();
      }

      if (result.success) {
        onSave && onSave(result.work);

        if (publish) {
          router.push(`/works/${result.work._id}`);
        } else {
          router.push('/dashboard/works');
        }
      } else {
        setErrors({ general: result.error || '保存失败' });
      }
    } catch (error) {
      setErrors({ general: '保存失败，请稍后重试' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.back();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`max-w-4xl mx-auto p-6 ${className}`}>
      <div className="bg-white rounded-lg shadow-lg">
        {/* 头部 */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              {workId ? '编辑作品' : '创建作品'}
            </h1>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPreviewMode(!previewMode)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {previewMode ? '编辑模式' : '预览模式'}
              </button>
            </div>
          </div>
        </div>

        {/* 错误提示 */}
        {errors.general && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{errors.general}</p>
          </div>
        )}

        <div className="p-6">
          {previewMode ? (
            // 预览模式
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{formData.title || '未命名作品'}</h2>
                {formData.description && (
                  <p className="mt-2 text-gray-600">{formData.description}</p>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">学科：</span>
                  <span className="text-gray-600">{formData.subject || '-'}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">年级：</span>
                  <span className="text-gray-600">{formData.gradeLevel || '-'}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">难度：</span>
                  <span className="text-gray-600">
                    {formData.difficulty === 'beginner' ? '初级' :
                     formData.difficulty === 'intermediate' ? '中级' : '高级'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">时长：</span>
                  <span className="text-gray-600">{formData.estimatedTime}分钟</span>
                </div>
              </div>

              {formData.tags.length > 0 && (
                <div>
                  <span className="font-medium text-gray-700">标签：</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {formData.tags.map(tag => (
                      <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-medium text-gray-700 mb-3">教学卡片 ({formData.cards.length})</h3>
                <div className="grid gap-4">
                  {formData.cards.map((card, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg">
                      <h4 className="font-medium text-gray-900">{card.title}</h4>
                      <p className="mt-2 text-gray-600">{card.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // 编辑模式
            <form className="space-y-6">
              {/* 基本信息 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    作品标题 *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.title ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="请输入作品标题"
                    maxLength={100}
                  />
                  {errors.title && (
                    <p className="mt-1 text-sm text-red-600">{errors.title}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    作品描述
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.description ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="请简要描述作品内容和特色"
                    maxLength={500}
                  />
                  <div className="mt-1 flex justify-between">
                    {errors.description && (
                      <p className="text-sm text-red-600">{errors.description}</p>
                    )}
                    <p className="text-sm text-gray-500">
                      {formData.description?.length || 0}/500
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    知识点 *
                  </label>
                  <input
                    type="text"
                    name="knowledgePoint"
                    value={formData.knowledgePoint}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.knowledgePoint ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="如：二次函数"
                  />
                  {errors.knowledgePoint && (
                    <p className="mt-1 text-sm text-red-600">{errors.knowledgePoint}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    学科 *
                  </label>
                  <select
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.subject ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">请选择学科</option>
                    {subjects.map(subject => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                  {errors.subject && (
                    <p className="mt-1 text-sm text-red-600">{errors.subject}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    年级 *
                  </label>
                  <select
                    name="gradeLevel"
                    value={formData.gradeLevel}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.gradeLevel ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">请选择年级</option>
                    {gradeLevels.map(grade => (
                      <option key={grade} value={grade}>{grade}</option>
                    ))}
                  </select>
                  {errors.gradeLevel && (
                    <p className="mt-1 text-sm text-red-600">{errors.gradeLevel}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    分类 *
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.category ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">请选择分类</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                  {errors.category && (
                    <p className="mt-1 text-sm text-red-600">{errors.category}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    难度等级
                  </label>
                  <select
                    name="difficulty"
                    value={formData.difficulty}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="beginner">初级</option>
                    <option value="intermediate">中级</option>
                    <option value="advanced">高级</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    预计学习时间（分钟）
                  </label>
                  <input
                    type="number"
                    name="estimatedTime"
                    value={formData.estimatedTime}
                    onChange={handleChange}
                    min={5}
                    max={300}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.estimatedTime ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.estimatedTime && (
                    <p className="mt-1 text-sm text-red-600">{errors.estimatedTime}</p>
                  )}
                </div>
              </div>

              {/* 标签 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  标签
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagAdd}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="输入标签后按回车添加（最多10个）"
                    maxLength={20}
                  />
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.tags.map(tag => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleTagRemove(tag)}
                            className="ml-1 text-blue-600 hover:text-blue-800"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 权限设置 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">权限设置</h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    可见性
                  </label>
                  <select
                    name="visibility"
                    value={formData.visibility}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="public">公开 - 所有人可见</option>
                    <option value="unlisted">不公开 - 仅通过链接访问</option>
                    <option value="private">私有 - 仅自己可见</option>
                  </select>
                </div>

                <div className="flex items-center space-x-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="allowReuse"
                      checked={formData.allowReuse}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">允许他人复用</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="allowComments"
                      checked={formData.allowComments}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">允许评论</span>
                  </label>
                </div>
              </div>

              {/* 教学卡片提示 */}
              {formData.cards.length === 0 && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex">
                    <svg className="w-5 h-5 text-yellow-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-800">
                        请使用AI生成功能创建教学卡片，或手动添加卡片内容。
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>

        {/* 底部操作栏 */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={saving}
            >
              取消
            </button>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => handleSave(false)}
                disabled={saving}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存草稿'}
              </button>

              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={saving || formData.cards.length === 0}
                className="px-6 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? '发布中...' : '发布作品'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WorkEditor;
