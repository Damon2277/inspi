'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { DEFAULT_EXPORT_DIMENSIONS } from '@/lib/export/html-to-image';
import type { TeachingCard } from '@/shared/types/teaching';

import { CardEditor, defaultCardStyle, type CardStyle } from './CardEditor';
import { ExportSharePanel } from './ExportSharePanel';

interface GeneratedCardProps {
  card: TeachingCard;
  className?: string;
}

type ViewMode = 'content' | 'sop' | 'presentation';

const cardTypeConfig = {
  visualization: {
    name: '可视化卡',
    icon: '👁️',
    color: '#3b82f6',
    description: '化抽象为"看见"',
  },
  analogy: {
    name: '类比延展卡',
    icon: '🌟',
    color: '#10b981',
    description: '用生活的温度，点亮知识',
  },
  thinking: {
    name: '启发思考卡',
    icon: '💭',
    color: '#8b5cf6',
    description: '抛出一个好问题',
  },
  interaction: {
    name: '互动氛围卡',
    icon: '🎭',
    color: '#f59e0b',
    description: '让课堂"破冰"',
  },
};

export function GeneratedCard({ card, className = '' }: GeneratedCardProps) {
  const [cardContent, setCardContent] = useState(card.content);
  const [cardStyle, setCardStyle] = useState<CardStyle>({
    ...defaultCardStyle,
    backgroundColor: '#ffffff',
    borderColor: cardTypeConfig[card.type].color,
    borderWidth: 2,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('content');
  const [isPresentationOpen, setPresentationOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const exportContainerRef = useRef<HTMLDivElement>(null);
  const [isExportPreview, setIsExportPreview] = useState(false);

  const typeConfig = cardTypeConfig[card.type];
  const hasSOP = Boolean(card.sop && card.sop.length > 0);

  useEffect(() => {
    setCardContent(card.content);
  }, [card.content]);

  useEffect(() => {
    if (viewMode !== 'content') {
      setIsEditing(false);
    }
  }, [viewMode]);

  const handleContentChange = (newContent: string) => {
    setCardContent(newContent);
  };

  const handleStyleChange = (newStyle: CardStyle) => {
    setCardStyle(newStyle);
  };

  const viewTabs: Array<{ key: ViewMode; label: string; disabled?: boolean }> = [
    { key: 'content', label: '卡片内容' },
    { key: 'sop', label: '教学SOP', disabled: !hasSOP },
    { key: 'presentation', label: '演示预设', disabled: !card.presentation },
  ];

  const renderCardSurface = (forExport: boolean = false) => {
    const effectivePadding = Math.max(cardStyle.padding, 32);
    const backgroundColor = cardStyle.backgroundColor || '#ffffff';
    const borderColor = cardStyle.borderColor || typeConfig.color;

    const surfaceStyle: React.CSSProperties = {
      backgroundColor,
      color: cardStyle.textColor,
      fontSize: `${cardStyle.fontSize}px`,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
      padding: `${effectivePadding}px`,
      paddingBottom: `${Math.max(effectivePadding, 48)}px`,
      borderRadius: '16px',
      border: `${cardStyle.borderWidth}px solid ${borderColor}`,
      minHeight: forExport ? `${DEFAULT_EXPORT_DIMENSIONS.height}px` : '280px',
      position: 'relative',
      marginBottom: forExport ? 0 : '16px',
      boxShadow: forExport
        ? '0 24px 48px rgba(15, 23, 42, 0.18)'
        : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      width: '100%',
      overflow: 'hidden',
      transition: forExport ? 'none' : 'box-shadow 0.2s ease',
    };

    const badgeStyle: React.CSSProperties = {
      position: 'absolute',
      top: '16px',
      right: '16px',
      padding: '8px 14px',
      backgroundColor: typeConfig.color,
      color: '#ffffff',
      borderRadius: '9999px',
      fontSize: '13px',
      fontWeight: 600,
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      letterSpacing: '0.01em',
      boxShadow: '0 6px 24px rgba(15, 23, 42, 0.18)',
      maxWidth: 'min(60%, calc(100% - 32px))',
      justifyContent: 'center',
      lineHeight: 1.1,
    };

    const titleStyle: React.CSSProperties = {
      margin: '8px 0 18px 0',
      fontSize: `${cardStyle.fontSize + 4}px`,
      fontWeight: 700,
      color: typeConfig.color,
      paddingRight: '180px',
      letterSpacing: '0.01em',
    };

    const explanationStyle: React.CSSProperties = {
      marginTop: '18px',
      paddingTop: '18px',
      borderTop: `1px solid ${borderColor}`,
      fontSize: `${Math.max(cardStyle.fontSize - 2, 12)}px`,
      color: '#6b7280',
      fontStyle: 'italic',
      lineHeight: 1.6,
    };

    const watermarkStyle: React.CSSProperties = {
      position: 'absolute',
      bottom: '16px',
      right: '16px',
      fontSize: '11px',
      color: '#94a3b8',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
    };

    return (
      <div
        ref={forExport ? exportContainerRef : cardRef}
        className="card-export-area"
        style={surfaceStyle}
      >
        <div style={badgeStyle}>
          {typeConfig.icon}
          <span>{typeConfig.name}</span>
        </div>

        <h2 style={titleStyle}>{card.title}</h2>

        <div
          dangerouslySetInnerHTML={{ __html: cardContent }}
          style={{
            lineHeight: 1.75,
            wordBreak: 'break-word',
            letterSpacing: '0.02em',
          }}
        />

        {card.explanation ? (
          <div style={explanationStyle}>{card.explanation}</div>
        ) : null}

        <div style={watermarkStyle}>
          <span>✨</span>
          <span>AI生成</span>
        </div>
      </div>
    );
  };

  const renderContentView = () => (
    <>
      {isEditing ? (
        <div
          className="card-export-area"
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            marginBottom: '16px',
          }}
        >
          <CardEditor
            initialContent={cardContent}
            onContentChange={handleContentChange}
            onStyleChange={handleStyleChange}
            style={{
              ...cardStyle,
              padding: Math.max(cardStyle.padding, 32),
            }}
          />
        </div>
      ) : (
        renderCardSurface(false)
      )}
    </>
  );

  const prepareExportElement = useCallback(async () => {
    setViewMode('content');
    setIsEditing(false);
    setIsExportPreview(true);

    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    return exportContainerRef.current ?? cardRef.current;
  }, []);

  const finalizeExport = useCallback(() => {
    setIsExportPreview(false);
  }, []);

  const exportHiddenStyle = isExportPreview ? { display: 'none' } : undefined;
  const offscreenWrapperStyle: React.CSSProperties = {
    position: 'fixed',
    top: '-200vh',
    left: '-200vw',
    width: `${DEFAULT_EXPORT_DIMENSIONS.width}px`,
    minHeight: `${DEFAULT_EXPORT_DIMENSIONS.height}px`,
    backgroundColor: '#ffffff',
    pointerEvents: 'none',
    opacity: isExportPreview ? 1 : 0,
    zIndex: -1,
  };

  const renderSOPView = () => {
    const sopSections = card.sop ?? [];
    if (!sopSections.length) {
      return (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          border: '1px dashed #d1d5db',
          padding: '20px',
          textAlign: 'center',
          color: '#6b7280',
          marginBottom: '16px',
        }}>
          暂无SOP结构，尝试重新生成或手动补充教学步骤。
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px' }}>
        {sopSections.map((section, sectionIndex) => (
          <div
            key={`${section.title}-${sectionIndex}`}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              border: '1px solid #e5e7eb',
              padding: '16px',
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: '12px',
            }}>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>
                {section.title}
              </div>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>{section.durationMinutes}′</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {section.steps.map((step, stepIndex) => (
                <div
                  key={`${sectionIndex}-${stepIndex}`}
                  style={{
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    padding: '12px',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px',
                  }}>
                    <span style={{ fontWeight: 600, color: '#1f2937' }}>
                      {step.title}
                    </span>
                    {step.durationSeconds ? (
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>
                        {Math.max(1, Math.round(step.durationSeconds / 60))}′
                      </span>
                    ) : null}
                  </div>
                  <div style={{ fontSize: '13px', color: '#1f2937', lineHeight: 1.6 }}>
                    <p style={{ margin: '0 0 6px 0', color: '#4b5563' }}>目标：{step.goal}</p>
                    <p style={{ margin: '0 0 4px 0' }}>教师：{step.teacherActions}</p>
                    <p style={{ margin: 0 }}>学生：{step.studentActions}</p>
                  </div>
                  {step.interactionMode && (
                    <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#2563eb' }}>
                      互动形式：{step.interactionMode}
                    </p>
                  )}
                  {step.evidence && (
                    <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#2563eb' }}>
                      达成证据：{step.evidence}
                    </p>
                  )}
                  {step.differentiation && (
                    <div style={{ marginTop: '8px', fontSize: '12px', color: '#059669' }}>
                      <span style={{ fontWeight: 500 }}>差异化支持：</span>
                      <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                        {step.differentiation.basic && <li>基础：{step.differentiation.basic}</li>}
                        {step.differentiation.intermediate && <li>进阶：{step.differentiation.intermediate}</li>}
                        {step.differentiation.advanced && <li>挑战：{step.differentiation.advanced}</li>}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderPresentationView = () => {
    const presentation = card.presentation;
    if (!presentation) {
      return (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          border: '1px dashed #d1d5db',
          padding: '20px',
          textAlign: 'center',
          color: '#6b7280',
          marginBottom: '16px',
        }}>
          暂无演示预设，可结合 SOP 手动设计演示流程。
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px' }}>
        <div style={{
          backgroundColor: '#111827',
          color: '#f9fafb',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 10px 36px rgba(15, 23, 42, 0.35)',
        }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '20px', fontWeight: 600 }}>{presentation.headline}</h3>
          <p style={{ margin: '0 0 16px 0', fontSize: '14px', lineHeight: 1.7 }}>{presentation.summary}</p>
          <div style={{ fontSize: '12px', color: '#cbd5f5' }}>推荐时长：{presentation.recommendedDuration} 分钟</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {presentation.cues.map((cue, idx) => (
            <div
              key={`${cue.title}-${idx}`}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '10px',
                border: '1px solid #e5e7eb',
                padding: '14px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '15px', fontWeight: 600, color: '#1f2937' }}>
                  {idx + 1}. {cue.title}
                </span>
                {cue.durationSeconds ? (
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>
                    {Math.max(1, Math.round(cue.durationSeconds / 60))}′
                  </span>
                ) : null}
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#374151', lineHeight: 1.6 }}>{cue.narrative}</p>
              {cue.emphasis && (
                <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#2563eb' }}>提示：{cue.emphasis}</p>
              )}
            </div>
          ))}
        </div>

        {presentation.callToAction && (
          <div style={{
            backgroundColor: '#f5f3ff',
            borderRadius: '10px',
            border: '1px solid #ddd6fe',
            padding: '12px',
            fontSize: '13px',
            color: '#4c1d95',
          }}>
            {presentation.callToAction}
          </div>
        )}

        <button
          type="button"
          onClick={() => setPresentationOpen(true)}
          style={{
            alignSelf: 'flex-start',
            padding: '10px 16px',
            backgroundColor: typeConfig.color,
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          进入全屏演示
        </button>
      </div>
    );
  };

  const rootClassName = ['generated-card', className, isExportPreview ? 'generated-card--exporting' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <div className={rootClassName} style={{ marginBottom: '24px' }}>
      {viewMode === 'content' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
          padding: '12px 16px',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: typeConfig.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
            }}>
              {typeConfig.icon}
            </div>
            <div>
              <h3 style={{
                margin: '0',
                fontSize: '16px',
                fontWeight: '600',
                color: '#374151',
              }}>
                {typeConfig.name}
              </h3>
              <p style={{
                margin: '2px 0 0 0',
                fontSize: '14px',
                color: '#6b7280',
              }}>
                {typeConfig.description}
              </p>
            </div>
          </div>

          <div
            data-export-hidden
            style={{
              display: 'flex',
              gap: '8px',
              ...(exportHiddenStyle ?? {}),
            }}
          >
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              style={{
                padding: '6px 12px',
                backgroundColor: isEditing ? '#ef4444' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {isEditing ? '👁️ 预览' : '✏️ 编辑'}
            </button>
          </div>
        </div>
      )}

      <div
        data-export-hidden
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '16px',
          ...(exportHiddenStyle ?? {}),
        }}
      >
        {viewTabs.map((tab) => {
          const isActive = viewMode === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              disabled={tab.disabled}
              onClick={() => setViewMode(tab.key)}
              style={{
                padding: '6px 14px',
                borderRadius: '9999px',
                border: '1px solid',
                borderColor: isActive ? typeConfig.color : '#d1d5db',
                backgroundColor: tab.disabled ? '#f9fafb' : isActive ? typeConfig.color : '#ffffff',
                color: tab.disabled ? '#9ca3af' : isActive ? '#ffffff' : '#1f2937',
                fontSize: '12px',
                cursor: tab.disabled ? 'not-allowed' : 'pointer',
                opacity: tab.disabled ? 0.6 : 1,
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {viewMode === 'content' && renderContentView()}
      {viewMode === 'sop' && renderSOPView()}
      {viewMode === 'presentation' && renderPresentationView()}

      {viewMode === 'content' && (
        <div data-export-hidden style={exportHiddenStyle || undefined}>
          <ExportSharePanel
            cardElement={cardRef.current}
            cardData={{
              id: card.id,
              title: card.title,
              content: cardContent,
              type: card.type,
            }}
            prepareExportElement={prepareExportElement}
            finalizeExport={finalizeExport}
          />
        </div>
      )}

      {viewMode === 'content' && !isEditing && (
        <div
          data-export-hidden
          style={{
            marginTop: '16px',
            padding: '12px',
            backgroundColor: '#f0f9ff',
            borderRadius: '8px',
            border: '1px solid #bae6fd',
            fontSize: '13px',
            color: '#075985',
            lineHeight: 1.6,
            ...(exportHiddenStyle ?? {}),
          }}
        >
          小提示：完成自定义后可使用下方导出面板生成高清图片或分享链接，适合投屏展示或留存。
        </div>
      )}

      {viewMode === 'sop' && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          backgroundColor: '#ecfdf5',
          borderRadius: '8px',
          border: '1px solid #d1fae5',
          fontSize: '13px',
          color: '#047857',
          lineHeight: 1.6,
        }}>
          可将 SOP 步骤复制到教案或排课系统，也可结合课堂实际调整时间与差异化支持。
        </div>
      )}

      <CardPresentationModal
        card={card}
        isOpen={isPresentationOpen}
        onClose={() => setPresentationOpen(false)}
      />
      </div>
      <div aria-hidden style={offscreenWrapperStyle}>
        {renderCardSurface(true)}
      </div>
    </>
  );
}

interface CardPresentationModalProps {
  card: TeachingCard;
  isOpen: boolean;
  onClose: () => void;
}

function CardPresentationModal({ card, isOpen, onClose }: CardPresentationModalProps) {
  const presentation = card.presentation;
  const cues = presentation?.cues ?? [];
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
      if (event.key === 'ArrowRight') {
        setCurrentIndex((prev) => Math.min(cues.length - 1, prev + 1));
      }
      if (event.key === 'ArrowLeft') {
        setCurrentIndex((prev) => Math.max(0, prev - 1));
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, cues.length, onClose]);

  if (!isOpen || !presentation || cues.length === 0) {
    return null;
  }

  const currentCue = cues[currentIndex];
  const prevDisabled = currentIndex === 0;
  const nextDisabled = currentIndex === cues.length - 1;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.92)',
      color: '#f8fafc',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 32px',
        fontSize: '14px',
      }}>
        <span>{presentation.headline}</span>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#e2e8f0',
            fontSize: '26px',
            cursor: 'pointer',
          }}
          aria-label="关闭演示"
        >
          ×
        </button>
      </div>

      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 80px',
      }}>
        <div style={{ maxWidth: '760px', width: '100%', textAlign: 'center' }}>
          <h2 style={{ fontSize: '32px', marginBottom: '18px', fontWeight: 600 }}>{currentCue.title}</h2>
          <p style={{ fontSize: '20px', lineHeight: 1.6, marginBottom: '24px' }}>{currentCue.narrative}</p>
          {currentCue.emphasis && (
            <p style={{ fontSize: '16px', color: '#93c5fd', marginBottom: '20px' }}>
              提示：{currentCue.emphasis}
            </p>
          )}
          {presentation.callToAction && nextDisabled && (
            <p style={{ fontSize: '16px', color: '#bbf7d0' }}>{presentation.callToAction}</p>
          )}
        </div>
      </div>

      <div style={{
        padding: '16px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '12px',
        color: '#cbd5f5',
      }}>
        <span>{currentIndex + 1} / {cues.length}</span>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="button"
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            disabled={prevDisabled}
            style={{
              padding: '10px 18px',
              borderRadius: '9999px',
              border: '1px solid #cbd5f5',
              background: prevDisabled ? 'rgba(148, 163, 184, 0.2)' : 'rgba(14, 165, 233, 0.25)',
              color: prevDisabled ? '#94a3b8' : '#e0f2fe',
              cursor: prevDisabled ? 'not-allowed' : 'pointer',
            }}
          >
            ← 上一步
          </button>
          <button
            type="button"
            onClick={() => setCurrentIndex((prev) => Math.min(cues.length - 1, prev + 1))}
            disabled={nextDisabled}
            style={{
              padding: '10px 18px',
              borderRadius: '9999px',
              border: '1px solid #cbd5f5',
              background: nextDisabled ? 'rgba(148, 163, 184, 0.2)' : '#2563eb',
              color: '#f8fafc',
              cursor: nextDisabled ? 'not-allowed' : 'pointer',
            }}
          >
            下一步 →
          </button>
        </div>
      </div>
    </div>
  );
}
