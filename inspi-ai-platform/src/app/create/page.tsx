'use client';

import React, { useState } from 'react';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { MobileCard } from '@/components/mobile/MobileCard';
import { MobileButton } from '@/components/mobile/MobileButton';
import { MobileInput } from '@/components/mobile/MobileInput';
import { MobilePageHeader } from '@/components/mobile/MobilePageHeader';

/**
 * 移动端AI魔法师创作页面
 * 专为移动设备优化的创作界面
 */
export default function CreatePage() {
  const [knowledge, setKnowledge] = useState('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const subjects = [
    { value: 'math', label: '数学' },
    { value: 'chinese', label: '语文' },
    { value: 'english', label: '英语' },
    { value: 'physics', label: '物理' },
    { value: 'chemistry', label: '化学' },
    { value: 'biology', label: '生物' },
    { value: 'history', label: '历史' },
    { value: 'geography', label: '地理' }
  ];

  const grades = [
    { value: 'primary', label: '小学' },
    { value: 'middle', label: '初中' },
    { value: 'high', label: '高中' }
  ];

  const cardTypes = [
    {
      id: 'concept',
      title: '概念解释卡',
      description: '清晰解释核心概念',
      icon: '💡',
      color: 'bg-blue-50 border-blue-200'
    },
    {
      id: 'example',
      title: '实例演示卡',
      description: '生动的实际案例',
      icon: '📝',
      color: 'bg-green-50 border-green-200'
    },
    {
      id: 'practice',
      title: '练习巩固卡',
      description: '针对性练习题目',
      icon: '🎯',
      color: 'bg-orange-50 border-orange-200'
    },
    {
      id: 'extension',
      title: '拓展思考卡',
      description: '深入思考与延伸',
      icon: '🚀',
      color: 'bg-purple-50 border-purple-200'
    }
  ];

  const handleGenerate = async () => {
    if (!knowledge.trim() || !subject || !grade) {
      alert('请填写完整信息');
      return;
    }

    setIsGenerating(true);
    
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 这里应该调用实际的AI生成API
      console.log('Generating cards for:', { knowledge, subject, grade });
      
      alert('卡片生成成功！');
    } catch (error) {
      console.error('Generation failed:', error);
      alert('生成失败，请重试');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <MobileLayout>
      <MobilePageHeader 
        title="AI魔法师" 
        subtitle="输入知识点，生成精美教学卡片"
      />
      
      {/* 输入区域 */}
      <div className="px-4 py-6 space-y-4">
        <MobileCard className="p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            输入知识点
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                知识点内容 *
              </label>
              <MobileInput
                type="textarea"
                placeholder="请输入要生成教学卡片的知识点内容..."
                value={knowledge}
                onChange={(e) => setKnowledge(e.target.value)}
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  学科 *
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                >
                  <option value="">选择学科</option>
                  {subjects.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  学段 *
                </label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                >
                  <option value="">选择学段</option>
                  {grades.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </MobileCard>

        {/* 卡片类型预览 */}
        <MobileCard className="p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            将生成的卡片类型
          </h3>
          
          <div className="space-y-3">
            {cardTypes.map((type) => (
              <div
                key={type.id}
                className={`p-3 rounded-lg border-2 ${type.color}`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-xl">{type.icon}</span>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 text-sm">
                      {type.title}
                    </h4>
                    <p className="text-gray-600 text-xs mt-1">
                      {type.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </MobileCard>

        {/* 生成按钮 */}
        <div className="pt-4">
          <MobileButton
            onClick={handleGenerate}
            disabled={isGenerating || !knowledge.trim() || !subject || !grade}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>AI正在生成中...</span>
              </div>
            ) : (
              '✨ 生成教学卡片'
            )}
          </MobileButton>
        </div>
      </div>

      {/* 使用提示 */}
      <div className="px-4 py-6 bg-gray-50">
        <MobileCard className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-start space-x-3">
            <span className="text-blue-500 text-lg">💡</span>
            <div className="flex-1">
              <h4 className="font-medium text-blue-900 text-sm mb-1">
                使用小贴士
              </h4>
              <ul className="text-blue-700 text-xs space-y-1">
                <li>• 知识点描述越详细，生成的卡片质量越高</li>
                <li>• 可以包含具体的教学目标和重难点</li>
                <li>• 生成后可以进一步编辑和完善卡片内容</li>
              </ul>
            </div>
          </div>
        </MobileCard>
      </div>
    </MobileLayout>
  );
}