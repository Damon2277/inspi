'use client';
import { useRouter } from 'next/navigation';
import React, { useEffect, useMemo, useRef, useState } from 'react';

/**
 * 现代化桌面端创作页面组件
 */
import { useLoginPrompt } from '@/components/auth/LoginPrompt';
import { GeneratedCard } from '@/components/cards/GeneratedCard';
import { useAuth } from '@/shared/hooks/useAuth';
import type { CardType, TeachingCard, GenerateCardsResponse } from '@/shared/types/teaching';

const CARD_TYPE_TO_RAW: Record<CardType, 'concept' | 'example' | 'practice' | 'extension'> = {
  visualization: 'concept',
  analogy: 'example',
  thinking: 'practice',
  interaction: 'extension',
};

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
  const [showNewCardsToast, setShowNewCardsToast] = useState(false);
  const [showFloatingControls, setShowFloatingControls] = useState(false);
  const [isFormCollapsed, setIsFormCollapsed] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [lastRequest, setLastRequest] = useState<{
    knowledgePoint: string;
    subject: string;
    gradeLevel: string;
  } | null>(null);
  const [retryingCardId, setRetryingCardId] = useState<string | null>(null);
  const [quotaHint, setQuotaHint] = useState<string | null>(null);
  const [quotaErrorCount, setQuotaErrorCount] = useState(0);
  const actionMessageTimeoutRef = useRef<number | null>(null);
  const cardsContainerRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated } = useAuth();
  const { showPrompt, LoginPromptComponent } = useLoginPrompt();
  const router = useRouter();
  const shouldCompactForm = isFormCollapsed || isGenerating || generatedCards.length > 0;

  const normalizeCard = (
    incomingCard: TeachingCard,
    sequenceIndex: number,
    fallback: { knowledgePoint: string; subject: string; gradeLevel: string },
  ): TeachingCard => {
    const fallbackTitle = incomingCard.title && incomingCard.title.trim().length > 0
      ? incomingCard.title
      : `教学卡片 ${sequenceIndex + 1}`;

    const knowledgePointValue = incomingCard.metadata?.knowledgePoint ?? fallback.knowledgePoint;
    const subjectValue = incomingCard.metadata?.subject ?? fallback.subject;
    const gradeLevelValue = incomingCard.metadata?.gradeLevel ?? fallback.gradeLevel;

    return {
      ...incomingCard,
      id: incomingCard.id || `card-${Date.now()}-${sequenceIndex}`,
      title: fallbackTitle,
      explanation: incomingCard.explanation || `AI生成的${fallbackTitle}，帮助理解“${knowledgePointValue}”`,
      metadata: {
        ...incomingCard.metadata,
        knowledgePoint: knowledgePointValue,
        subject: subjectValue,
        gradeLevel: gradeLevelValue,
        generatedAt: incomingCard.metadata?.generatedAt ?? new Date().toISOString(),
      },
      sop: incomingCard.sop ?? [],
    };
  };

  const subjects = useMemo(
    () => [
      '数学', '语文', '英语', '物理', '化学', '生物',
      '历史', '地理', '政治', '音乐', '美术', '体育',
    ],
    [],
  );

  const gradeLevels = useMemo(() => ['小学', '初中', '高中', '大学'], []);

  const cardTypes: Array<{
    id: CardType;
    name: string;
    description: string;
    icon: string;
  }> = useMemo(() => [
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
  ], []);

  const recentProjects = useMemo(() => [
    { name: '二次函数教学', time: '2小时前', cards: 4 },
    { name: '古诗词赏析', time: '1天前', cards: 6 },
    { name: '化学反应原理', time: '3天前', cards: 5 },
  ].slice(0, 3), []);

  const templates = useMemo(() => [
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
  ], []);

  const cardGridStyle = useMemo(
    () => ({
      display: 'grid',
      gap: '20px',
      gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    }),
    [],
  );

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
    setShowNewCardsToast(false);
  };

  const handleGenerate = async () => {
    const loginPromptMessage = '登录后即可生成专属教学卡片';
    setErrorMessage(null);
    setQuotaHint(null);

    if (!isAuthenticated) {
      showPrompt('create', loginPromptMessage);
      return;
    }

    setIsFormCollapsed(true);
    setIsGenerating(true);
    setGeneratedCards([]);
    setRetryingCardId(null);

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

      const rawPayload = await response.text();
      const parsedPayload: GenerateCardsResponse & { error?: string } | null = safeParseJSON(rawPayload);

      if (!response.ok || !parsedPayload) {
        if (response.status === 401) {
          showPrompt('create', loginPromptMessage);
          throw new Error('登录状态已失效，请重新登录后重试');
        }

        const errorMessage = parsedPayload?.error || 'AI服务暂时不可用，请稍后重试';
        console.warn('生成卡片额度检查跳过，原始错误：', errorMessage);
        throw new Error(errorMessage);
      }

      const result: GenerateCardsResponse = parsedPayload;

      const fallbackContext = {
        knowledgePoint: formData.content,
        subject: formData.subject,
        gradeLevel: formData.gradeLevel,
      };

      const normalizedCards: TeachingCard[] = (result.cards as TeachingCard[]).map((card, index) =>
        normalizeCard(card as TeachingCard, index, fallbackContext),
      );

      setGeneratedCards(normalizedCards);
      setLastRequest(fallbackContext);
      setQuotaHint(null);
      setQuotaErrorCount(0);

    } catch (error) {
      console.error('生成卡片失败:', error);
      setIsFormCollapsed(false);
      const rawMessage = error instanceof Error ? error.message : '未知错误';
      const friendlyMessage = normalizeErrorMessage(rawMessage);
      setErrorMessage(`生成失败：${friendlyMessage}`);
      setQuotaHint(null);
      setQuotaErrorCount(0);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRetryCard = async (card: TeachingCard, index: number) => {
    const fallback = lastRequest || {
      knowledgePoint: formData.content,
      subject: formData.subject,
      gradeLevel: formData.gradeLevel,
    };

    if (!fallback.knowledgePoint) {
      setActionMessage('请先填写知识点，再尝试重新生成。');
      return;
    }

    const rawType = CARD_TYPE_TO_RAW[card.type];

    setRetryingCardId(card.id);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/magic/regenerate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cardType: rawType,
          knowledgePoint: fallback.knowledgePoint,
          subject: fallback.subject,
          gradeLevel: fallback.gradeLevel,
        }),
      });

      const rawData = await response.text();
      const parsedData: { card?: TeachingCard; error?: string } | null = safeParseJSON(rawData);

      if (!response.ok || !parsedData) {
        throw new Error(parsedData?.error || '重新生成失败');
      }

      const data = parsedData;
      const newCard = normalizeCard(data.card as TeachingCard, index, fallback);

      setGeneratedCards((prev) => prev.map((item, idx) => (idx === index ? newCard : item)));
      showActionFeedback('已重新生成卡片');
    } catch (error) {
      console.error('重新生成卡片失败:', error);
      const rawMessage = error instanceof Error ? error.message : '未知错误';
      const friendlyMessage = normalizeErrorMessage(rawMessage);
      setErrorMessage(`重新生成失败：${friendlyMessage}`);
      if (/(额度|配额)/.test(rawMessage)) {
        setQuotaHint(friendlyMessage);
        setQuotaErrorCount((prev) => prev + 1);
      }
    } finally {
      setRetryingCardId(null);
    }
  };

  const showActionFeedback = (message: string) => {
    setActionMessage(message);
    if (actionMessageTimeoutRef.current) {
      window.clearTimeout(actionMessageTimeoutRef.current);
    }
    actionMessageTimeoutRef.current = window.setTimeout(() => {
      setActionMessage(null);
      actionMessageTimeoutRef.current = null;
    }, 2200);
  };

  const handleBatchExport = () => {
    showActionFeedback('已准备批量导出，请在卡片内完成最终导出操作');
  };

  const handleBatchFavorite = () => {
    showActionFeedback('已收藏全部教学卡片');
  };

  const handleBatchShare = () => {
    showActionFeedback('分享链接已准备，可在下方卡片中获取导出信息');
  };

  const openGalleryAt = (index: number) => {
    if (generatedCards.length === 0) return;
    setGalleryIndex(index);
    setGalleryOpen(true);
  };

  const closeGallery = () => setGalleryOpen(false);

  const goPrevGallery = () => {
    setGalleryIndex((prev) => (prev - 1 + generatedCards.length) % generatedCards.length);
  };

  const goNextGallery = () => {
    setGalleryIndex((prev) => (prev + 1) % generatedCards.length);
  };

  const handleOpenGallery = () => {
    if (generatedCards.length === 0) return;
    openGalleryAt(0);
  };

  useEffect(() => () => {
    if (actionMessageTimeoutRef.current) {
      window.clearTimeout(actionMessageTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    if (generatedCards.length === 0) {
      return;
    }
    setShowNewCardsToast(true);
    setShowFloatingControls(false);
    const container = cardsContainerRef.current;
    if (container) {
      requestAnimationFrame(() => {
        container.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
    const timer = window.setTimeout(() => setShowNewCardsToast(false), 2400);
    return () => window.clearTimeout(timer);
  }, [generatedCards]);

  const handleCardsScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    setShowFloatingControls(element.scrollTop > 260);
  };


  const toggleFormCollapsed = () => {
    setIsFormCollapsed((prev) => {
      const next = !prev;
      if (!next) {
        requestAnimationFrame(() => {
          cardsContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        });
      }
      return next;
    });
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
    <React.Fragment>
      <LoginPromptComponent />
      <div style={{ display: 'flex', height: 'calc(100vh - 80px)', background: 'var(--gray-50)' }}>
        {/* 侧边栏 - 缩小宽度 */}
        <aside style={{
          width: '168px',
          flexShrink: 0,
          background: 'white',
          borderRight: '1px solid var(--gray-200)',
          padding: '16px 10px',
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
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
                    padding: '8px',
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
                    fontWeight: '600',
                    color: 'var(--gray-900)',
                    marginBottom: '2px',
                    lineHeight: 1.35,
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {templates.map((template) => {
                const isActive = selectedTemplate === template.id;
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => applyTemplate(template.id)}
                    className="modern-card"
                    style={{
                      padding: '8px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all var(--transition-base)',
                      border: isActive ? '2px solid #3b82f6' : '1px solid var(--gray-200)',
                      background: isActive ? '#eff6ff' : 'white',
                    }}
                  >
                    <div style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: 'var(--gray-900)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '8px',
                    }}>
                      <span>{template.name}</span>
                      <span style={{
                        fontSize: '10px',
                        color: 'var(--gray-500)',
                        fontWeight: '400',
                      }}>{template.usage}次</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {!shouldCompactForm && (
            <div>
              <h3 style={{
                fontSize: '14px',
                fontWeight: '600',
                color: 'var(--gray-900)',
                marginBottom: '12px',
              }}>
                使用小贴士
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                  <span style={{ fontSize: '12px' }}>💡</span>
                  <span style={{ fontSize: '11px', color: 'var(--gray-600)', lineHeight: '1.4' }}>
                    详细描述知识点，AI会生成更精准的内容
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                  <span style={{ fontSize: '12px' }}>🎯</span>
                  <span style={{ fontSize: '11px', color: 'var(--gray-600)', lineHeight: '1.4' }}>
                    选择合适的学科和学段
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                  <span style={{ fontSize: '12px' }}>✨</span>
                  <span style={{ fontSize: '11px', color: 'var(--gray-600)', lineHeight: '1.4' }}>
                    多选卡片类型，构建完整教学体系
                  </span>
                </div>
              </div>
            </div>
          )}
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
                fontSize: 'var(--font-size-4xl)',
                fontWeight: '700',
                color: 'var(--gray-900)',
              }}>
                AI教学魔法师工作区
              </h1>
              {!shouldCompactForm && (
                <p style={{
                  fontSize: 'var(--font-size-lg)',
                  color: 'var(--gray-600)',
                }}>
                  让抽象知识变得可见，用生活温度点亮学习
                </p>
              )}
            </div>
          </div>

          {/* 上部：输入区域 */}
          {isFormCollapsed ? (
            <div
              style={{
                padding: '12px 24px',
                background: 'white',
                borderBottom: '1px solid var(--gray-200)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--gray-600)' }}>
                创作表单已收起{isGenerating ? '，正在生成教学卡片...' : '，点击箭头重新展开继续编辑'}
              </span>
              <button
                type="button"
                onClick={toggleFormCollapsed}
                style={{
                  border: '1px solid var(--gray-200)',
                  borderRadius: '8px',
                  background: '#fff',
                  padding: '6px 10px',
                  fontSize: '12px',
                  color: '#64748b',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#fff';
                  e.currentTarget.style.borderColor = 'var(--gray-200)';
                }}
                aria-label="展开创作表单"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          ) : (
            <div
              style={{
                padding: '20px 24px',
                background: 'white',
                borderBottom: '1px solid var(--gray-200)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, color: 'var(--gray-900)', margin: 0 }}>
                  创作设置
                </h2>
                <button
                  type="button"
                  onClick={toggleFormCollapsed}
                  style={{
                    border: '1px solid var(--gray-200)',
                    borderRadius: '8px',
                    background: '#fff',
                    padding: '6px 10px',
                    fontSize: '12px',
                    color: '#64748b',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                    e.currentTarget.style.borderColor = '#cbd5e1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#fff';
                    e.currentTarget.style.borderColor = 'var(--gray-200)';
                  }}
                  aria-label="收起创作表单"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M3 7.5L6 4.5L9 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px', gap: '12px', alignItems: 'start' }}>
                  <div className="modern-form-group" style={{ marginBottom: 0 }}>
                    <textarea
                      className="modern-input"
                      style={{
                        fontSize: 'var(--font-size-base)',
                        minHeight: '60px',
                        resize: 'none',
                      }}
                      placeholder="请详细描述你要教授的知识点、课堂目标或学习活动..."
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      required
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                {quotaHint && (
                  <div
                    style={{
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      background: 'rgba(239, 246, 255, 0.9)',
                      borderRadius: '12px',
                      padding: '16px',
                      marginBottom: '16px',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <span style={{ fontSize: '18px' }}>⚡️</span>
                      <div style={{ flex: 1 }}>
                        <p style={{
                          margin: 0,
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#1d4ed8',
                        }}>
                          额度用尽，升级即可继续生成
                        </p>
                        <p style={{
                          margin: '6px 0 0',
                          fontSize: '12px',
                          color: '#1e3a8a',
                          lineHeight: 1.6,
                        }}>
                          {quotaHint}
                          {quotaErrorCount > 1 ? '（已多次触发，可考虑立即升级或联系管理员）' : ''}
                        </p>
                        <div style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '8px',
                          marginTop: '12px',
                        }}>
                          <button
                            type="button"
                            onClick={() => router.push('/profile?tab=subscription&upgrade=1')}
                            style={{
                              background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
                              color: '#fff',
                              borderRadius: '999px',
                              padding: '8px 16px',
                              fontSize: '12px',
                              fontWeight: 600,
                              boxShadow: '0 8px 18px rgba(99, 102, 241, 0.25)',
                            }}
                          >
                            升级获取更多额度
                          </button>
                          <button
                            type="button"
                            onClick={() => router.push('/subscription')}
                            style={{
                              background: '#ffffff',
                              color: '#1d4ed8',
                              border: '1px solid rgba(59, 130, 246, 0.35)',
                              borderRadius: '999px',
                              padding: '8px 16px',
                              fontSize: '12px',
                              fontWeight: 600,
                            }}
                          >
                            查看订阅方案
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
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
          )}

          {/* 下部：结果区域 */}
          <div
            ref={cardsContainerRef}
            onScroll={handleCardsScroll}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '24px 28px 120px',
              position: 'relative',
            }}
          >
            {showNewCardsToast && (
              <div
                style={{
                  position: 'absolute',
                  top: '20px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgba(13,148,136,0.92)',
                  color: '#fff',
                  padding: '8px 18px',
                  borderRadius: '999px',
                  fontSize: 'var(--font-size-sm)',
                  boxShadow: '0 18px 36px rgba(13,148,136,0.35)',
                  zIndex: 6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span role="img" aria-label="sparkles">🎉</span>
                <span>新的教学卡片已生成</span>
              </div>
            )}

            <div
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 5,
                marginBottom: '18px',
                paddingBottom: '16px',
                background: 'linear-gradient(180deg, rgba(248,250,252,0.96) 0%, rgba(248,250,252,0.86) 70%, rgba(248,250,252,0) 100%)',
                backdropFilter: 'blur(6px)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '16px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={toggleFormCollapsed}
                    style={{
                      border: '1px solid var(--gray-200)',
                      borderRadius: '8px',
                      background: '#fff',
                      padding: '6px 10px',
                      fontSize: '12px',
                      color: '#64748b',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8fafc';
                      e.currentTarget.style.borderColor = '#cbd5e1';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#fff';
                      e.currentTarget.style.borderColor = 'var(--gray-200)';
                    }}
                    aria-label={isFormCollapsed ? '展开创作区' : '收起创作区'}
                    title={isFormCollapsed ? '展开创作区' : '收起创作区'}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      {isFormCollapsed ? (
                        <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      ) : (
                        <path d="M3 7.5L6 4.5L9 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      )}
                    </svg>
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, color: 'var(--gray-900)', margin: 0 }}>
                      生成结果
                    </h2>
                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--gray-500)' }}>
                      {generatedCards.length} 张卡片
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleBatchExport}
                    disabled={generatedCards.length === 0}
                    style={{
                      border: '1px solid var(--gray-200)',
                      borderRadius: '8px',
                      background: generatedCards.length === 0 ? 'var(--gray-100)' : '#fff',
                      padding: '8px',
                      width: '36px',
                      height: '36px',
                      color: generatedCards.length === 0 ? 'var(--gray-400)' : '#2563eb',
                      cursor: generatedCards.length === 0 ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                    }}
                    title="批量导出"
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M9 12L5 8h8l-4 4z" fill="currentColor"/>
                      <path d="M4 14h10v2H4v-2z" fill="currentColor"/>
                      <rect x="2" y="2" width="14" height="10" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={handleBatchFavorite}
                    disabled={generatedCards.length === 0}
                    style={{
                      border: '1px solid var(--gray-200)',
                      borderRadius: '8px',
                      background: generatedCards.length === 0 ? 'var(--gray-100)' : '#fff',
                      padding: '8px',
                      width: '36px',
                      height: '36px',
                      color: generatedCards.length === 0 ? 'var(--gray-400)' : '#047857',
                      cursor: generatedCards.length === 0 ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                    }}
                    title="收藏全部"
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M9 2l2.163 4.279L16 6.967l-3.5 3.378.826 4.655L9 12.779 4.674 15 5.5 10.345 2 6.967l4.837-.688L9 2z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={handleBatchShare}
                    disabled={generatedCards.length === 0}
                    style={{
                      border: '1px solid var(--gray-200)',
                      borderRadius: '8px',
                      background: generatedCards.length === 0 ? 'var(--gray-100)' : '#fff',
                      padding: '8px',
                      width: '36px',
                      height: '36px',
                      color: generatedCards.length === 0 ? 'var(--gray-400)' : '#7c3aed',
                      cursor: generatedCards.length === 0 ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                    }}
                    title="分享链接"
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M14 6a2 2 0 100-4 2 2 0 000 4zM14 16a2 2 0 100-4 2 2 0 000 4zM4 11a2 2 0 100-4 2 2 0 000 4z" fill="currentColor"/>
                      <path d="M5.5 9.5l7-3M5.5 8.5l7 3" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenGallery}
                    style={{
                      border: '1px solid var(--gray-200)',
                      borderRadius: '8px',
                      background: generatedCards.length === 0 ? 'var(--gray-100)' : '#fff',
                      padding: '8px',
                      width: '36px',
                      height: '36px',
                      color: generatedCards.length === 0 ? 'var(--gray-400)' : '#0f172a',
                      cursor: generatedCards.length === 0 ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                    }}
                    disabled={generatedCards.length === 0}
                    title="全屏预览"
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M3 3h4v2H5v2H3V3zM15 3h-4v2h2v2h2V3zM3 15h4v-2H5v-2H3v4zM15 15h-4v-2h2v-2h2v4z" fill="currentColor"/>
                    </svg>
                  </button>
                </div>
              </div>
              {actionMessage && (
                <div
                  style={{
                    marginTop: '12px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(37, 99, 235, 0.1)',
                    color: '#1d4ed8',
                    fontSize: 'var(--font-size-sm)',
                  }}
                >
                  {actionMessage}
                </div>
              )}
            </div>

            {isGenerating ? (
              <div className="modern-card" style={{ textAlign: 'center', padding: '60px 0' }}>
                <div className="modern-spinner" style={{ margin: '0 auto 16px' }}></div>
                <p style={{ color: 'var(--gray-600)' }}>AI正在为您施展教学魔法...</p>
                <p style={{ color: 'var(--gray-500)', fontSize: 'var(--font-size-sm)', marginTop: '8px' }}>
                  正在生成 {formData.cardTypes.length} 张卡片...
                </p>
              </div>
            ) : generatedCards.length > 0 ? (
              <div style={cardGridStyle}>
                {generatedCards.map((card, index) => (
                  <GeneratedCard
                    key={card.id}
                    card={card}
                    onPreview={() => openGalleryAt(index)}
                    onRetry={() => handleRetryCard(card, index)}
                    retrying={retryingCardId === card.id}
                  />
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
                  填入教学主题或课堂目标，选择卡片类型，AI将为您生成教学卡片
                </p>
              </div>
            )}

          </div>
        </main>
      </div>

      {galleryOpen && generatedCards[galleryIndex] && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.92)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 28px', color: '#e2e8f0' }}>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 600 }}>{generatedCards[galleryIndex].title}</div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                {galleryIndex + 1} / {generatedCards.length}
              </div>
            </div>
            <button
              type="button"
              onClick={closeGallery}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#f8fafc',
                fontSize: '28px',
                cursor: 'pointer',
              }}
              aria-label="关闭预览"
            >
              ×
            </button>
          </div>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 80px 40px' }}>
            <div style={{ width: 'min(960px, 100%)', maxHeight: '90vh', overflowY: 'auto' }}>
              <GeneratedCard card={generatedCards[galleryIndex]} className="gallery-card" />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 40px 32px', color: '#cbd5f5' }}>
            <button
              type="button"
              onClick={goPrevGallery}
              style={{
                border: '1px solid rgba(148, 163, 184, 0.4)',
                background: 'rgba(30, 64, 175, 0.25)',
                padding: '10px 20px',
                borderRadius: '999px',
                color: '#e0f2fe',
                cursor: 'pointer',
              }}
            >
              ← 上一张
            </button>
            <button
              type="button"
              onClick={goNextGallery}
              style={{
                border: '1px solid rgba(148, 163, 184, 0.4)',
                background: 'rgba(30, 64, 175, 0.25)',
                padding: '10px 20px',
                borderRadius: '999px',
                color: '#e0f2fe',
                cursor: 'pointer',
              }}
            >
              下一张 →
            </button>
          </div>
        </div>
      )}
    </React.Fragment>
  );
}

function safeParseJSON<T = any>(payload: string): T | null {
  if (!payload) {
    return null;
  }

  try {
    return JSON.parse(payload) as T;
  } catch (error) {
    return null;
  }
}

function normalizeErrorMessage(message: string, fallback: string = '系统繁忙，请稍后再试'): string {
  if (!message) {
    return fallback;
  }

  const lower = message.toLowerCase();

  if (/timeout|network|failed to fetch/.test(lower)) {
    return '网络波动，请检查连接后重试';
  }

  if (/body stream already read/.test(lower) || /json/.test(lower)) {
    return '服务响应异常，请稍后再试';
  }

  if (/ai服务暂时不可用/.test(message)) {
    return 'AI服务暂时不可用，请稍后再试';
  }

  if (/(额度|配额)/.test(message)) {
    return message;
  }

  const hasChinese = /[\u4e00-\u9fa5]/.test(message);
  if (!hasChinese) {
    return fallback;
  }

  return message;
}
