'use client';

import React, { useState } from 'react';
import { GlassCard, Button, IconContainer } from '@/components/ui';

interface TeachingCard {
  id: string;
  type: 'visualization' | 'analogy' | 'thinking' | 'interaction';
  title: string;
  content: string;
  explanation: string;
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

const CARD_TYPE_ICONS = {
  visualization: (
    <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  analogy: (
    <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  thinking: (
    <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  interaction: (
    <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  )
};

const CARD_TYPE_NAMES = {
  visualization: '可视化理解',
  analogy: '类比延展',
  thinking: '启发思考',
  interaction: '互动氛围'
};

export default function CreatePage() {
  const [step, setStep] = useState<'input' | 'generating' | 'result'>('input');
  const [formData, setFormData] = useState({
    knowledgePoint: '',
    subject: '',
    gradeLevel: ''
  });
  const [generatedCards, setGeneratedCards] = useState<TeachingCard[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!formData.knowledgePoint.trim() || !formData.subject || !formData.gradeLevel) {
      alert('请填写完整信息');
      return;
    }

    setIsGenerating(true);
    setStep('generating');

    try {
      const response = await fetch('/api/magic/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-token' // 模拟token
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok && data.cards) {
        setGeneratedCards(data.cards);
        setStep('result');
      } else {
        throw new Error(data.error || '生成失败');
      }
    } catch (error) {
      console.error('生成教学卡片失败:', error);
      alert('生成失败，请重试');
      setStep('input');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    try {
      const response = await fetch('/api/works', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-token'
        },
        body: JSON.stringify({
          title: `${formData.subject} - ${formData.knowledgePoint}`,
          knowledgePoint: formData.knowledgePoint,
          subject: formData.subject,
          gradeLevel: formData.gradeLevel,
          cards: generatedCards,
          status: 'published'
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert('作品发布成功！');
        window.location.href = '/works';
      } else {
        throw new Error(data.message || '保存失败');
      }
    } catch (error) {
      console.error('保存作品失败:', error);
      alert('保存失败，请重试');
    }
  };

  const handleReset = () => {
    setStep('input');
    setFormData({ knowledgePoint: '', subject: '', gradeLevel: '' });
    setGeneratedCards([]);
  };

  return (
    <div className="min-h-screen">
      <section className="container section-padding">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 fade-in-up">
            <h1 className="heading-1 gradient-text mb-4">
              AI教学魔法师
            </h1>
            <p className="body-text mb-8">
              智能生成教学创意卡片，激发无限教学灵感
            </p>
          </div>

          {step === 'input' && (
            <GlassCard className="fade-in-up stagger-1">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    知识点 *
                  </label>
                  <input
                    type="text"
                    value={formData.knowledgePoint}
                    onChange={(e) => setFormData(prev => ({ ...prev, knowledgePoint: e.target.value }))}
                    placeholder="请输入要教学的知识点，如：两位数加法、分数概念等"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    maxLength={100}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    {formData.knowledgePoint.length}/100
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      学科 *
                    </label>
                    <select
                      value={formData.subject}
                      onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">请选择学科</option>
                      {SUBJECTS.map(subject => (
                        <option key={subject} value={subject}>{subject}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      年级 *
                    </label>
                    <select
                      value={formData.gradeLevel}
                      onChange={(e) => setFormData(prev => ({ ...prev, gradeLevel: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">请选择年级</option>
                      {GRADE_LEVELS.map(grade => (
                        <option key={grade} value={grade}>{grade}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-center pt-4">
                  <Button
                    variant="primary"
                    size="large"
                    onClick={handleGenerate}
                    disabled={isGenerating}
                  >
                    ✨ 生成教学魔法卡片
                  </Button>
                </div>
              </div>
            </GlassCard>
          )}

          {step === 'generating' && (
            <GlassCard className="fade-in-up text-center py-12">
              <IconContainer size="large" className="mx-auto mb-6">
                <div className="animate-spin">
                  <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </IconContainer>
              <h2 className="heading-2 mb-4">AI正在施展魔法...</h2>
              <p className="body-text">
                正在为"{formData.knowledgePoint}"生成创意教学卡片，请稍候
              </p>
            </GlassCard>
          )}

          {step === 'result' && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="heading-2 mb-4">🎉 教学魔法卡片生成完成！</h2>
                <p className="body-text mb-6">
                  为"{formData.knowledgePoint}"生成了 {generatedCards.length} 张创意教学卡片
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {generatedCards.map((card, index) => (
                  <GlassCard key={card.id} className={`fade-in-up stagger-${index + 1}`}>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <IconContainer size="small">
                          {CARD_TYPE_ICONS[card.type]}
                        </IconContainer>
                        <h3 className="heading-3">{CARD_TYPE_NAMES[card.type]}</h3>
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-4">
                        <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                          {card.content}
                        </pre>
                      </div>
                      
                      <div className="text-sm text-gray-600 bg-blue-50 rounded-lg p-3">
                        <strong>教学说明：</strong>{card.explanation}
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
                <Button variant="primary" size="large" onClick={handleSave}>
                  📚 发布到智慧广场
                </Button>
                <Button variant="secondary" onClick={handleReset}>
                  🔄 重新生成
                </Button>
                <Button variant="secondary" onClick={() => window.location.href = '/works'}>
                  📝 查看我的作品
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}