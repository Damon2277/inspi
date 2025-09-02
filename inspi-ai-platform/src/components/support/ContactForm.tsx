'use client';

import { useState } from 'react';
import { EmailType, EmailPriority } from '@/lib/email/config';

interface ContactFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
}

interface FormData {
  name: string;
  email: string;
  subject: string;
  message: string;
  type: EmailType;
  priority: EmailPriority;
}

interface FormErrors {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
}

export default function ContactForm({ onSuccess, onError, className = '' }: ContactFormProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    subject: '',
    message: '',
    type: 'general',
    priority: 'normal'
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState('');

  // 表单验证
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim() || formData.name.trim().length < 2) {
      newErrors.name = '姓名至少需要2个字符';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim() || !emailRegex.test(formData.email)) {
      newErrors.email = '请提供有效的邮箱地址';
    }

    if (!formData.subject.trim() || formData.subject.trim().length < 5) {
      newErrors.subject = '主题至少需要5个字符';
    }

    if (!formData.message.trim() || formData.message.trim().length < 10) {
      newErrors.message = '消息内容至少需要10个字符';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 处理输入变化
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // 清除对应字段的错误
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        setSubmitStatus('success');
        setSubmitMessage(result.message);
        
        // 重置表单
        setFormData({
          name: '',
          email: '',
          subject: '',
          message: '',
          type: 'general',
          priority: 'normal'
        });
        
        onSuccess?.();
      } else {
        setSubmitStatus('error');
        setSubmitMessage(result.message || '提交失败，请重试');
        
        if (result.errors) {
          const fieldErrors: FormErrors = {};
          result.errors.forEach((error: string) => {
            if (error.includes('姓名')) fieldErrors.name = error;
            else if (error.includes('邮箱')) fieldErrors.email = error;
            else if (error.includes('主题')) fieldErrors.subject = error;
            else if (error.includes('消息')) fieldErrors.message = error;
          });
          setErrors(fieldErrors);
        }
        
        onError?.(result.message);
      }
    } catch (error) {
      console.error('提交联系表单时出错:', error);
      setSubmitStatus('error');
      setSubmitMessage('网络错误，请检查连接后重试');
      onError?.('网络错误');
    } finally {
      setIsSubmitting(false);
    }
  };

  const typeOptions = [
    { value: 'general', label: '一般咨询' },
    { value: 'feedback', label: '用户反馈' },
    { value: 'bug', label: 'Bug报告' },
    { value: 'feature', label: '功能建议' },
    { value: 'contact', label: '其他联系' }
  ];

  const priorityOptions = [
    { value: 'low', label: '低优先级' },
    { value: 'normal', label: '普通' },
    { value: 'high', label: '高优先级' },
    { value: 'urgent', label: '紧急' }
  ];

  return (
    <div className={`max-w-2xl mx-auto ${className}`}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 姓名和邮箱 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              姓名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="请输入您的姓名"
              disabled={isSubmitting}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              邮箱 <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="your@email.com"
              disabled={isSubmitting}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>
        </div>

        {/* 类型和优先级 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
              联系类型
            </label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              disabled={isSubmitting}
            >
              {typeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
              优先级
            </label>
            <select
              id="priority"
              name="priority"
              value={formData.priority}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              disabled={isSubmitting}
            >
              {priorityOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 主题 */}
        <div>
          <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
            主题 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="subject"
            name="subject"
            value={formData.subject}
            onChange={handleInputChange}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
              errors.subject ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="请简要描述您的问题或建议"
            disabled={isSubmitting}
          />
          {errors.subject && (
            <p className="mt-1 text-sm text-red-600">{errors.subject}</p>
          )}
        </div>

        {/* 消息内容 */}
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
            详细描述 <span className="text-red-500">*</span>
          </label>
          <textarea
            id="message"
            name="message"
            rows={6}
            value={formData.message}
            onChange={handleInputChange}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-vertical ${
              errors.message ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="请详细描述您的问题、建议或反馈..."
            disabled={isSubmitting}
          />
          {errors.message && (
            <p className="mt-1 text-sm text-red-600">{errors.message}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            {formData.message.length}/5000 字符
          </p>
        </div>

        {/* 提交状态消息 */}
        {submitStatus !== 'idle' && (
          <div className={`p-4 rounded-lg ${
            submitStatus === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <div className="flex items-center">
              <span className="text-lg mr-2">
                {submitStatus === 'success' ? '✅' : '❌'}
              </span>
              <p>{submitMessage}</p>
            </div>
          </div>
        )}

        {/* 提交按钮 */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-8 py-3 rounded-lg font-medium transition-all duration-200 ${
              isSubmitting
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-200'
            } text-white`}
          >
            {isSubmitting ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                发送中...
              </div>
            ) : (
              '发送消息'
            )}
          </button>
        </div>
      </form>

      {/* 帮助信息 */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">📧 联系说明</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• 我们会在 24 小时内回复您的消息</li>
          <li>• 紧急问题请选择"高优先级"或"紧急"</li>
          <li>• 您会收到一封确认邮件</li>
          <li>• 如有技术问题，请详细描述操作步骤</li>
        </ul>
      </div>
    </div>
  );
}