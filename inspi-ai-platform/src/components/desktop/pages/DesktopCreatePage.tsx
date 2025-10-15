'use client';
import React, { useState } from 'react';

/**
 * 现代化桌面端创作页面组件
 */
import { useLoginPrompt } from '@/components/auth/LoginPrompt';
import { GeneratedCard } from '@/components/cards/GeneratedCard';
import { useAuth } from '@/shared/hooks/useAuth';
import type { CardType, TeachingCard, GenerateCardsResponse } from '@/shared/types/teaching';

export function DesktopCreatePage() {
  const [formData, setFormData] = useState({
    content: '',
    subject: '',
    gradeLevel: '',
    cardTypes: ['visualization', 'analogy', 'thinking', 'interaction'] as CardType[],
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCards, setGeneratedCards] = useState<TeachingCard[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();
  const { showPrompt, LoginPromptComponent } = useLoginPrompt();

  const subjects = [
    '数学', '语文', '英语', '物理', '化学', '生物',
    '历史', '地理', '政治', '音乐', '美术', '体育',
  ];

  const gradeLevels = [
    '小学', '初中', '高中', '大学',
  ];

  const cardTypes: Array<{
    id: CardType;
    name: string;
    description: string;
    icon: string;
  }> = [
    {
      id: 'visualization',
      name: '可视化卡',
      description: '化抽象为"看见"',
      icon: '👁️',
    },
    {
      id: 'analogy',
      name: '类比延展卡',
      description: '用生活温度点亮知识',
      icon: '🌟',
    },
    {
      id: 'thinking',
      name: '启发思考卡',
      description: '好问题胜过灌输',
      icon: '💭',
    },
    {
      id: 'interaction',
      name: '互动氛围卡',
      description: '让课堂破冰升温',
      icon: '🎭',
    },
  ];

  const recentProjects = [
    { name: '二次函数教学', time: '2小时前', cards: 4 },
    { name: '古诗词赏析', time: '1天前', cards: 6 },
    { name: '化学反应原理', time: '3天前', cards: 5 },
  ];

  const templates = [
    {
      id: 'math-concept',
      name: '数学概念模板',
      usage: 156,
      rating: 4.8,
      preset: {
        content: '二次函数的图像与性质',
        subject: '数学',
        gradeLevel: '初中',
        cardTypes: ['visualization', 'thinking'] as CardType[],
      },
    },
    {
      id: 'chinese-reading',
      name: '语文阅读模板',
      usage: 89,
      rating: 4.6,
      preset: {
        content: '古诗词意境与语言表达',
        subject: '语文',
        gradeLevel: '高中',
        cardTypes: ['analogy', 'interaction'] as CardType[],
      },
    },
    {
      id: 'science-experiment',
      name: '科学实验模板',
      usage: 234,
      rating: 4.9,
      preset: {
        content: '化学反应速率的影响因素',
        subject: '化学',
        gradeLevel: '高中',
        cardTypes: ['visualization', 'interaction'] as CardType[],
      },
    },
  ];

  const applyTemplate = (templateId: string) => {
    const template = templates.find(item => item.id === templateId);
    if (!template) return;

    setSelectedTemplate(template.id);
    setFormData({
      content: template.preset.content,
      subject: template.preset.subject,
      gradeLevel: template.preset.gradeLevel,
      cardTypes: Array.from(new Set(template.preset.cardTypes)),
    });
  };

  const handleGenerate = async () => {
    const loginPromptMessage = '登录后即可生成专属教学卡片';
    setErrorMessage(null);

    if (!isAuthenticated) {
      showPrompt('create', loginPromptMessage);
      return;
    }

    setIsGenerating(true);
    setGeneratedCards([]);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      const authToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }

      const response = await fetch('/api/magic/generate', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          knowledgePoint: formData.content,
          subject: formData.subject,
          gradeLevel: formData.gradeLevel,
          cardTypes: formData.cardTypes,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          showPrompt('create', loginPromptMessage);
          throw new Error('登录状态已失效，请重新登录后重试');
        }

        const errorData = await response.json();
        throw new Error(errorData.error || '生成失败');
      }

      const result: GenerateCardsResponse = await response.json();

      const normalizedCards: TeachingCard[] = (result.cards as TeachingCard[]).map((card, index) => {
        const fallbackTitle = card.title || `教学卡片 ${index + 1}`;
        const knowledgePoint = card.metadata?.knowledgePoint ?? formData.content;
        return {
          ...card,
          id: card.id || `card-${Date.now()}-${index}`,
          title: fallbackTitle,
          explanation: card.explanation || `AI生成的${fallbackTitle}，帮助理解"${knowledgePoint}"`,
          metadata: {
            ...card.metadata,
            knowledgePoint,
            subject: card.metadata?.subject ?? formData.subject,
            gradeLevel: card.metadata?.gradeLevel ?? formData.gradeLevel,
            generatedAt: card.metadata?.generatedAt ?? new Date().toISOString(),
          },
          sop: card.sop ?? [],
          presentation: card.presentation,
        };
      });

      setGeneratedCards(normalizedCards);

    } catch (error) {
      console.error('生成卡片失败:', error);
      setErrorMessage(`生成失败：${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleCardType = (typeId: CardType) => {
    const newCardTypes = formData.cardTypes.includes(typeId)
      ? formData.cardTypes.filter(id => id !== typeId)
      : [...formData.cardTypes, typeId];
    setFormData({
      ...formData,
      cardTypes: newCardTypes,
    });
  };

  const isGenerateDisabled =
    !formData.content || formData.cardTypes.length === 0 || isGenerating;

  return (
    <div>
      <LoginPromptComponent />
      <div style={{ display: 'flex', height: 'calc(100vh - 80px)', background: 'var(--gray-50)' }}>
        {/* 侧边栏 - 缩小宽度 */}
        <aside style={{
          width: '200px',
          flexShrink: 0,
          background: 'white',
          borderRight: '1px solid var(--gray-200)',
          padding: '20px 12px',
          overflowY: 'auto',
        }}>
          {/* 最近项目 */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{
              fontSize: '14px',
              fontWeight: '600',
              color: 'var(--gray-900)',
              marginBottom: '12px',
            }}>
              最近项目
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recentProjects.map((project, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    setFormData({
                      content: project.name,
                      subject: '数学',
                      gradeLevel: '初中',
                      cardTypes: ['visualization', 'analogy', 'thinking', 'interaction'] as CardType[],
                    });
                  }}
                  className="modern-card"
                  style={{
                    width: '100%',
                    padding: '10px',
                    cursor: 'pointer',
                    transition: 'all var(--transition-base)',
                    textAlign: 'left',
                    border: '1px solid var(--gray-200)',
                    background: 'white',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--gray-50)';
                    e.currentTarget.style.borderColor = 'var(--primary-300)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.borderColor = 'var(--gray-200)';
                  }}
                >
                  <div style={{
                    fontSize: '12px',
                    fontWeight: '500',
                    color: 'var(--gray-900)',
                    marginBottom: '2px',
                  }}>
                    {project.name}
                  </div>
                  <div style={{
                    fontSize: '10px',
                    color: 'var(--gray-500)',
                  }}>
                    {project.time} • {project.cards}张
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 推荐模板 */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{
              fontSize: '14px',
              fontWeight: '600',
              color: 'var(--gray-900)',
              marginBottom: '12px',
            }}>
              推荐模板
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {templates.map((template) => {
                const isActive = selectedTemplate === template.id;
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => applyTemplate(template.id)}
                    className="modern-card"
                    style={{
                      padding: '10px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all var(--transition-base)',
                      border: isActive ? '2px solid var(--primary-500)' : '1px solid var(--gray-200)',
                      background: isActive ? 'var(--primary-50)' : 'white',
                    }}
                  >
                    <div style={{
                      fontSize: '12px',
                      fontWeight: '500',
                      color: 'var(--gray-900)',
                      marginBottom: '2px',
                    }}>
                      {template.name}
                    </div>
                    <div style={{
                      fontSize: '10px',
                      color: 'var(--gray-500)',
                    }}>
                      {template.usage}次 • ⭐{template.rating}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 使用小贴士 */}
          <div>
            <h3 style={{
              fontSize: '14px',
              fontWeight: '600',
              color: 'var(--gray-900)',
              marginBottom: '12px',
            }}>
              使用小贴士
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                <span style={{ fontSize: '12px' }}>💡</span>
                <span style={{ fontSize: '11px', color: 'var(--gray-600)', lineHeight: '1.4' }}>
                  详细描述知识点，AI会生成更精准的内容
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                <span style={{ fontSize: '12px' }}>🎯</span>
                <span style={{ fontSize: '11px', color: 'var(--gray-600)', lineHeight: '1.4' }}>
                  选择合适的学科和学段
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                <span style={{ fontSize: '12px' }}>✨</span>
                <span style={{ fontSize: '11px', color: 'var(--gray-600)', lineHeight: '1.4' }}>
                  多选卡片类型，构建完整教学体系
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* 主内容区 - 上下布局 */}
        <main
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--gray-50)',
            overflow: 'hidden',
          }}
        >
          {/* 顶部标题区 */}
          <div
            style={{
              padding: '20px 24px',
              background: 'white',
              borderBottom: '1px solid var(--gray-200)',
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '12px',
            }}>
              <h1 style={{
                fontSize: 'var(--font-size-2xl)',
                fontWeight: '700',
                color: 'var(--gray-900)',
              }}>
                AI教学魔法师工作区
              </h1>
              <p style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--gray-600)',
              }}>
                让抽象知识变得可见，用生活温度点亮学习
              </p>
            </div>
          </div>

          {/* 上部：输入区域 */}
          <div
            style={{
              padding: '20px 24px',
              background: 'white',
              borderBottom: '1px solid var(--gray-200)',
            }}
          >
            {/* 创作设置 */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px', gap: '12px', alignItems: 'start' }}>
                <div className="modern-form-group" style={{ marginBottom: 0 }}>
                  <label className="modern-label" style={{ fontSize: 'var(--font-size-sm)' }}>知识点内容</label>
                  <textarea
                    className="modern-input"
                    style={{
                      fontSize: 'var(--font-size-base)',
                      minHeight: '60px',
                      resize: 'none',
                    }}
                    placeholder="请详细描述你要教授的知识点..."
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    required
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '28px' }}>
                  <div className="modern-form-group" style={{ marginBottom: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label className="modern-label" style={{ fontSize: 'var(--font-size-sm)', marginBottom: 0, whiteSpace: 'nowrap' }}>学科</label>
                      <select
                        className="modern-input"
                        style={{ fontSize: 'var(--font-size-sm)', padding: '4px 8px' }}
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      >
                        <option value="">选择学科</option>
                        {subjects.map(subject => (
                          <option key={subject} value={subject}>{subject}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="modern-form-group" style={{ marginBottom: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label className="modern-label" style={{ fontSize: 'var(--font-size-sm)', marginBottom: 0, whiteSpace: 'nowrap' }}>学段</label>
                      <select
                        className="modern-input"
                        style={{ fontSize: 'var(--font-size-sm)', padding: '4px 8px' }}
                        value={formData.gradeLevel}
                        onChange={(e) => setFormData({ ...formData, gradeLevel: e.target.value })}
                      >
                        <option value="">选择学段</option>
                        {gradeLevels.map(level => (
                          <option key={level} value={level}>{level}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 卡片类型选择 */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                {cardTypes.map((type) => (
                  <div
                    key={type.id}
                    onClick={() => toggleCardType(type.id)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      cursor: 'pointer',
                      border: formData.cardTypes.includes(type.id)
                        ? '2px solid var(--primary-500)'
                        : '1px solid var(--gray-200)',
                      borderRadius: '8px',
                      background: formData.cardTypes.includes(type.id)
                        ? 'var(--primary-50)'
                        : 'white',
                      transition: 'all 0.2s',
                      textAlign: 'center',
                      position: 'relative',
                    }}
                  >
                    {formData.cardTypes.includes(type.id) && (
                      <div style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: 'var(--primary-500)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                    <div style={{ fontSize: '20px', marginBottom: '4px' }}>
                      {type.icon}
                    </div>
                    <h4 style={{
                      fontSize: 'var(--font-size-xs)',
                      fontWeight: '600',
                      color: 'var(--gray-900)',
                      marginBottom: '2px',
                    }}>
                      {type.name}
                    </h4>
                    <p style={{
                      fontSize: '10px',
                      color: 'var(--gray-600)',
                      lineHeight: '1.3',
                    }}>
                      {type.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* 生成按钮 */}
            <div style={{ textAlign: 'center' }}>
              {errorMessage && (
                <p style={{
                  color: '#dc2626',
                  fontSize: '13px',
                  marginBottom: '12px',
                }}>
                  {errorMessage}
                </p>
              )}
              <button
                className="modern-btn modern-btn-primary"
                style={{ minWidth: '200px', fontSize: 'var(--font-size-base)', padding: '10px 24px' }}
                onClick={handleGenerate}
                disabled={isGenerateDisabled}
              >
                {isGenerating ? (
                  <>
                    <div className="modern-spinner" style={{ width: '16px', height: '16px' }}></div>
                    正在生成中...
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    开启教学魔法
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 下部：结果区域 */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
          }}>
            {generatedCards.length === 0 && (
              <h2 style={{
                fontSize: 'var(--font-size-lg)',
                fontWeight: '600',
                color: 'var(--gray-900)',
                marginBottom: '20px',
              }}>
                预览区域
              </h2>
            )}

            {isGenerating ? (
              <div className="modern-card" style={{ textAlign: 'center', padding: '60px 0' }}>
                <div className="modern-spinner" style={{ margin: '0 auto 16px' }}></div>
                <p style={{ color: 'var(--gray-600)' }}>AI正在为您施展教学魔法...</p>
                <p style={{ color: 'var(--gray-500)', fontSize: 'var(--font-size-sm)', marginTop: '8px' }}>
                  正在生成 {formData.cardTypes.length} 张卡片...
                </p>
              </div>
            ) : generatedCards.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
                gap: '20px',
              }}>
                {generatedCards.map((card) => (
                  <GeneratedCard key={card.id} card={card} />
                ))}
              </div>
            ) : formData.cardTypes.length > 0 ? (
              <div className="modern-card" style={{ padding: '24px' }}>
                <p style={{ color: 'var(--gray-600)', fontSize: 'var(--font-size-base)', marginBottom: '16px' }}>
                  已选择 {formData.cardTypes.length} 种卡片类型，点击生成按钮开始创作
                </p>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {formData.cardTypes.map((typeId) => {
                    const type = cardTypes.find(t => t.id === typeId);
                    return type ? (
                      <div key={typeId} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        background: 'var(--gray-50)',
                        borderRadius: '6px',
                      }}>
                        <span>{type.icon}</span>
                        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--gray-700)' }}>
                          {type.name}
                        </span>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            ) : (
              <div className="modern-card" style={{ textAlign: 'center', padding: '60px 0' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
                <h3 style={{
                  fontSize: 'var(--font-size-xl)',
                  fontWeight: '600',
                  color: 'var(--gray-900)',
                  marginBottom: '8px',
                }}>
                  开始创作
                </h3>
                <p style={{ color: 'var(--gray-600)', fontSize: 'var(--font-size-base)' }}>
                  填写知识点内容，选择卡片类型，AI将为您生成教学卡片
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
