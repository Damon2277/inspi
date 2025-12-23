'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Buffer } from 'buffer';
import { useAuth } from '@/shared/hooks/useAuth';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { LazyImage } from '@/components/performance/LazyImage';
import {
  copyImageToClipboard,
  DEFAULT_EXPORT_DIMENSIONS,
  downloadImage,
  exportElementToImage,
  exportPresets,
} from '@/lib/export/html-to-image';
import { shareToSocial, generateShareLink, trackShareEvent } from '@/lib/share/share-service';
import type { TeachingCard, VisualizationSpec, VisualizationTheme } from '@/shared/types/teaching';
import { useVisualStore } from '@/shared/store/useVisualStore';

import { SimpleCardEditor } from './SimpleCardEditor';

interface GeneratedCardProps {
  card: TeachingCard;
  className?: string;
  onPreview?: () => void;
  onRetry?: () => void;
  retrying?: boolean;
  enableEditing?: boolean;
  workId?: string;
  onVisualUpdate?: (payload: { cardId: string; visual: VisualizationSpec }) => void;
  relatedCards?: TeachingCard[];
}

type ViewMode = 'content' | 'sop' | 'presentation';

const BRAND_PRIMARY = '#2563eb';

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
    color: '#60a5fa',
    description: '用生活的温度，点亮知识',
  },
  thinking: {
    name: '启发思考卡',
    icon: '💭',
    color: '#93c5fd',
    description: '抛出一个好问题',
  },
  interaction: {
    name: '互动氛围卡',
    icon: '🎭',
    color: BRAND_PRIMARY,
    description: '让课堂"破冰"',
  },
};

const OPTIONAL_VISUAL_CARD_TYPES: TeachingCard['type'][] = ['analogy', 'thinking', 'interaction'];

const visualizationThemes: Record<VisualizationTheme, {
  background: string;
  accent: string;
  centerBg: string;
  branchBg: string;
  branchText: string;
  border: string;
}> = {
  ocean: {
    background: 'linear-gradient(135deg, #e0f2fe 0%, #d9f99d 100%)',
    accent: '#0ea5e9',
    centerBg: '#0f172a',
    branchBg: '#eff6ff',
    branchText: '#0f172a',
    border: '#bae6fd',
  },
  sunrise: {
    background: 'linear-gradient(135deg, #fee2e2 0%, #fef3c7 100%)',
    accent: '#f97316',
    centerBg: '#7c2d12',
    branchBg: '#fff7ed',
    branchText: '#7c2d12',
    border: '#fed7aa',
  },
  forest: {
    background: 'linear-gradient(135deg, #dcfce7 0%, #fefce8 100%)',
    accent: '#22c55e',
    centerBg: '#14532d',
    branchBg: '#f0fdf4',
    branchText: '#14532d',
    border: '#bbf7d0',
  },
  galaxy: {
    background: 'linear-gradient(135deg, #ede9fe 0%, #e0f2fe 100%)',
    accent: '#6366f1',
    centerBg: '#1e1b4b',
    branchBg: '#eef2ff',
    branchText: '#1e1b4b',
    border: '#c7d2fe',
  },
  neutral: {
    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    accent: '#475569',
    centerBg: '#1e293b',
    branchBg: '#f8fafc',
    branchText: '#1e293b',
    border: '#cbd5f5',
  },
};

const visualizationBranchPalette = ['#38bdf8', '#34d399', '#f97316', '#a855f7', '#f472b6', '#facc15'];
const linearLayouts = ['left-to-right', 'right-to-left'];

export function GeneratedCard({
  card,
  className = '',
  onPreview,
  onRetry,
  retrying = false,
  enableEditing = true,
  workId,
  onVisualUpdate,
  relatedCards,
}: GeneratedCardProps) {
  const [cardContent, setCardContent] = useState(card.content);
  const [isEditing, setIsEditing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('content');
  const [isPresentationOpen, setPresentationOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const exportContainerRef = useRef<HTMLDivElement>(null);
  const [isExportPreview, setIsExportPreview] = useState(false);
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [generatedVisual, setGeneratedVisual] = useState<VisualizationSpec | null>(null);
  const [cachedVisual, setCachedVisual] = useState<VisualizationSpec | null>(null);
  const [isGeneratingVisual, setIsGeneratingVisual] = useState(false);
  const [visualContainer, setVisualContainer] = useState<HTMLDivElement | null>(null);
  const [visualContainerSize, setVisualContainerSize] = useState({ width: 0, height: 0 });

  const { isAuthenticated, checkAuth } = useAuth();

  const visualEntry = useVisualStore((state) => state.cache[card.id]);
  const setVisualInStore = useVisualStore((state) => state.setVisual);
  const removeVisualFromStore = useVisualStore((state) => state.removeVisual);

  const getAuthToken = () => {
    if (typeof window === 'undefined') {
      return null;
    }
    return localStorage.getItem('auth_token');
  };

  const typeConfig = cardTypeConfig[card.type];

  const presentationSeries = useMemo(() => {
    const deduped: TeachingCard[] = [];
    const seen = new Set<string>();
    const append = (item?: TeachingCard) => {
      if (!item || !item.id) {
        return;
      }
      const cues = item.presentation?.cues;
      if (!cues || cues.length === 0) {
        return;
      }
      if (seen.has(item.id)) {
        return;
      }
      seen.add(item.id);
      deduped.push(item);
    };

    if (Array.isArray(relatedCards)) {
      relatedCards.forEach(append);
    }
    append(card);
    return deduped;
  }, [relatedCards, card]);
  const isOptionalVisualCard = OPTIONAL_VISUAL_CARD_TYPES.includes(card.type);
  const allowEditing = enableEditing;
  const hasSOP = Boolean(card.sop && card.sop.length > 0);
  const formattedCardContent = useMemo(() => formatCardContentMarkdown(cardContent), [cardContent]);
  const structuredSections = useMemo(() => buildStructuredSections(formattedCardContent), [formattedCardContent]);
  const hasStructuredSections = structuredSections.length > 0;
  const effectiveVisual = useMemo(() => {
    return generatedVisual
      || visualEntry?.visual
      || cachedVisual
      || card.visual
      || null;
  }, [generatedVisual, visualEntry, cachedVisual, card.visual]);
  const headerSummary = useMemo(() => {
    const base = card.metadata?.knowledgePoint || card.explanation || typeConfig.description;
    if (!base) return '';
    return base.length > 28 ? `${base.slice(0, 28)}...` : base;
  }, [card.metadata?.knowledgePoint, card.explanation, typeConfig.description]);

  useEffect(() => {
    if (!allowEditing && isEditing) {
      setIsEditing(false);
    }
  }, [allowEditing, isEditing]);

  useEffect(() => {
    setCardContent(card.content);
    setIsContentExpanded(false);
  }, [card.content]);

  useEffect(() => {
    setGeneratedVisual(null);
  }, [card.id]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const localVisual = loadCardVisualCache(card.id);
    setCachedVisual(localVisual);
  }, [card.id]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (card.visual) {
      setVisualInStore(card.id, {
        visual: card.visual,
        updatedAt: typeof card.metadata?.visualUpdatedAt === 'string' ? card.metadata?.visualUpdatedAt : undefined,
      });
      saveCardVisualCache(card.id, card.visual, card.metadata?.visualSummary);
      setCachedVisual(card.visual);
      return;
    }
    removeVisualFromStore(card.id);
    clearCardVisualCache(card.id);
  }, [card.id, card.visual, card.metadata?.visualUpdatedAt, card.metadata?.visualSummary, setVisualInStore, removeVisualFromStore]);

  useEffect(() => {
    if (!visualContainer) {
      setVisualContainerSize({ width: 0, height: 0 });
      return undefined;
    }

    if (typeof window === 'undefined') {
      return undefined;
    }

    const updateSize = (rect?: DOMRectReadOnly) => {
      const width = rect?.width ?? visualContainer.clientWidth ?? 0;
      const height = rect?.height ?? visualContainer.clientHeight ?? 0;
      setVisualContainerSize(prev => (prev.width === width && prev.height === height ? prev : { width, height }));
    };

    updateSize();

    if (typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        updateSize(entry.contentRect);
      }
    });
    observer.observe(visualContainer);

    return () => observer.disconnect();
  }, [visualContainer]);

  useEffect(() => {
    if (viewMode !== 'content') {
      setIsEditing(false);
    }
  }, [viewMode]);

  const handleContentChange = (newContent: string) => {
    setCardContent(newContent);
  };

  const showFeedback = useCallback((type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3000);
  }, []);

  const handleVisualContainerRef = useCallback((node: HTMLDivElement | null) => {
    setVisualContainer(node);
  }, []);

  const persistVisualLocally = useCallback((visual: VisualizationSpec, summary?: string) => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      saveCardVisualCache(card.id, visual, summary);
      setCachedVisual(visual);
      if (workId) {
        const cacheKey = `work-detail-cache-${workId}`;
        const cachedRaw = sessionStorage.getItem(cacheKey);
        if (cachedRaw) {
          try {
            const cached = JSON.parse(cachedRaw);
            if (cached && Array.isArray(cached.cards)) {
              const nextCards = cached.cards.map((item: TeachingCard) =>
                item && item.id === card.id ? { ...item, visual } : item,
              );
              sessionStorage.setItem(cacheKey, JSON.stringify({ ...cached, cards: nextCards }));
            }
          } catch (error) {
            console.warn('解析缓存作品失败', error);
          }
        }
        if (visual?.imageUrl) {
          sessionStorage.setItem(`work-cover-cache-${workId}`, visual.imageUrl);
        }
      }
    } catch (error) {
      console.warn('缓存辅助图示失败', error);
    }
  }, [workId, card.id, setCachedVisual]);

  const handleExport = async (presetKey: keyof typeof exportPresets) => {
    setIsExporting(true);
    let prepared = false;

    try {
      const options = exportPresets[presetKey];
      const { target, prepared: didPrepare } = await resolveExportTarget();
      prepared = prepared || didPrepare;

      if (!target) {
        throw new Error('未找到可导出的卡片区域');
      }

      const result = await exportElementToImage(target, options);
      downloadImage(result);
      showFeedback('success', '图片已保存');

    } catch (error) {
      showFeedback('error', `导出失败：${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      if (prepared && finalizeExport) {
        finalizeExport();
      }
      setIsExporting(false);
    }
  };

  const handleCopyImage = async () => {
    setIsExporting(true);
    let prepared = false;

    try {
      const { target, prepared: didPrepare } = await resolveExportTarget();
      prepared = prepared || didPrepare;

      if (!target) {
        throw new Error('未找到可导出的卡片区域');
      }

      const result = await exportElementToImage(target, exportPresets.social);
      await copyImageToClipboard(result);
      showFeedback('success', '卡片已复制到剪贴板');
    } catch (error) {
      showFeedback('error', `复制失败：${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      if (prepared && finalizeExport) {
        finalizeExport();
      }
      setIsExporting(false);
    }
  };

  const handleShare = async (platform: 'wechat') => {
    setIsExporting(true);

    try {
      const shareUrl = await generateShareLink(card.id, card);
      const shareContent = {
        title: card.title || '我用AI创建了一张教学卡片',
        description: `${cardContent.substring(0, 100)}...`,
        url: shareUrl,
        hashtags: ['AI教学', '教育创新', 'InspiAI'],
      };

      await shareToSocial({ platform, content: shareContent });
      await trackShareEvent(card.id, platform);
      showFeedback('success', '分享链接已生成');

    } catch (error) {
      showFeedback('error', `分享失败：${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      if (finalizeExport) {
        finalizeExport();
      }
      setIsExporting(false);
    }
  };

  const resolveExportTarget = async (): Promise<{ target: HTMLElement | null; prepared: boolean }> => {
    if (prepareExportElement) {
      const target = await prepareExportElement();
      return { target, prepared: true };
    }
    return { target: cardRef.current, prepared: false };
  };

  const handleGenerateVisualAssist = useCallback(async () => {
    if (isGeneratingVisual) {
      return;
    }

    if (!isAuthenticated) {
      showFeedback('error', '请先登录，才能生成辅助图示');
      return;
    }

    const sessionValid = await checkAuth();
    if (!sessionValid) {
      showFeedback('error', '登录状态已过期，请重新登录后再试');
      return;
    }

    const knowledgePoint = card.metadata?.knowledgePoint || card.title || card.explanation;
    if (!knowledgePoint) {
      showFeedback('error', '缺少知识点，无法生成辅助图示');
      return;
    }

    const trimmedContent = typeof cardContent === 'string'
      ? cardContent.trim()
      : '';

    setIsGeneratingVisual(true);
    try {
      const token = getAuthToken();
      if (!token) {
        showFeedback('error', '登录状态已失效，请重新登录');
        return;
      }

      const response = await fetch('/api/magic/visualize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          knowledgePoint,
          subject: card.metadata?.subject,
          gradeLevel: card.metadata?.gradeLevel,
          cardType: card.type,
          cardTitle: card.title,
          cardContent: trimmedContent || undefined,
          cardId: card.id,
          workId,
        }),
      });

      if (response.status === 401) {
        showFeedback('error', '请先登录，才能生成辅助图示');
        return;
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || '辅助图示生成失败');
      }

      if (!data?.visual) {
        throw new Error('AI 未返回可用的图示');
      }

      setGeneratedVisual(data.visual);
      setVisualInStore(card.id, { visual: data.visual });
      persistVisualLocally(data.visual, data.summary);
      onVisualUpdate?.({ cardId: card.id, visual: data.visual });
      if (data.fallbackReason) {
        showFeedback('error', `AI 暂未生成完整图示：${data.fallbackReason}`);
      } else {
        showFeedback('success', '已生成辅助图示');
      }
    } catch (error) {
      showFeedback('error', error instanceof Error ? error.message : '辅助图示生成失败');
    } finally {
      setIsGeneratingVisual(false);
    }
  }, [
    card.metadata?.gradeLevel,
    card.metadata?.knowledgePoint,
    card.metadata?.subject,
    card.title,
    card.type,
    card.explanation,
    cardContent,
    isGeneratingVisual,
    showFeedback,
    isAuthenticated,
    checkAuth,
    persistVisualLocally,
    onVisualUpdate,
    card.id,
    workId,
    setVisualInStore,
  ]);

  const viewTabs: Array<{ key: ViewMode; label: string; disabled?: boolean }> = [
    { key: 'content', label: '卡片内容' },
    { key: 'sop', label: '教学SOP', disabled: !hasSOP },
    { key: 'presentation', label: '演示预设', disabled: !card.presentation },
  ];

  const renderVisualizationCanvas = (forExport: boolean = false) => {
    if (!effectiveVisual) {
      return null;
    }

    const visual: VisualizationSpec = effectiveVisual;
    const theme = visualizationThemes[visual.theme] ?? visualizationThemes.neutral;
    const branches = Array.isArray(visual.branches) ? visual.branches.slice(0, 8) : [];
    const layout = typeof visual.layout === 'string' ? visual.layout.toLowerCase() : undefined;
    const branchCount = branches.length;
    const resolvedWidth = (() => {
      if (forExport) {
        return Math.max(360, Math.min(DEFAULT_EXPORT_DIMENSIONS.width - 80, DEFAULT_EXPORT_DIMENSIONS.width));
      }
      const measured = visualContainerSize.width || cardRef.current?.clientWidth || 0;
      const fallback = measured > 0 ? measured : 360;
      return Math.min(Math.max(fallback, 320), 960);
    })();
    const responsivePadding = forExport ? 48 : Math.max(28, Math.round(resolvedWidth * 0.04));

    const shouldUseInteractionColumn = card.type === 'interaction'
      && branches.length > 0
      && visual.type !== 'hero-illustration'
      && !visual.structured;

    const renderStructuredFallback = () => {
      const fallbackTitle = visual.center?.title || card.title || card.metadata?.knowledgePoint || '辅助图示';
      const fallbackSubtitle = visual.center?.subtitle || headerSummary || 'AI 暂未生成详细结构';
      const fallbackNotice = visual.fallbackReason
        ? `AI 暂未返回完整的辅助图示结构：${visual.fallbackReason}`
        : 'AI 暂未返回完整的辅助图示结构，可尝试重新生成，或根据当前卡片内容自行设计步骤。';
      return (
        <div
          style={{
            background: theme.background,
            borderRadius: '28px',
            padding: forExport ? '40px' : '28px',
            margin: '0 auto 24px',
            boxShadow: '0 24px 60px rgba(15, 23, 42, 0.12)',
            textAlign: 'left',
          }}
        >
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', marginBottom: '10px' }}>{fallbackTitle}</div>
          <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.7, marginBottom: '12px' }}>{fallbackSubtitle}</p>
          <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>{fallbackNotice}</p>
        </div>
      );
    };

    const renderStructuredDiagram = () => {
      if (!visual?.structured) {
        return renderStructuredFallback();
      }

      const { header, stages, outcomes, notes, highlight } = visual.structured;
      const stageList = Array.isArray(stages) ? stages.slice(0, 5) : [];
      const hasStages = stageList.length > 0;
      const structuredImage = typeof visual.imageUrl === 'string' && visual.imageUrl.trim().length > 0 ? visual.imageUrl : null;
      const structuredSvgMarkup = decodeStructuredSvg(structuredImage);
      const outcomesList = Array.isArray(outcomes) ? outcomes.slice(0, 4) : [];
      const notesList = Array.isArray(notes) ? notes.slice(0, 4) : [];
      const isFallbackVisual = (visual.source && visual.source !== 'ai') || Boolean(visual.fallbackReason);
      const fallbackMessage = visual.fallbackReason || 'AI 暂未返回完整图示，已提供基础模板';

      return (
        <div
          style={{
            background: theme.background,
            borderRadius: '32px',
            padding: forExport ? '48px' : '34px',
            margin: '0 auto 24px',
            boxShadow: '0 32px 72px rgba(15, 23, 42, 0.18)',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          {isFallbackVisual && !forExport ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: '#fff6e6',
                border: '1px solid #fbbf24',
                color: '#92400e',
                padding: '10px 14px',
                borderRadius: '14px',
              }}
            >
              <span style={{ fontSize: '13px', lineHeight: 1.4 }}>{fallbackMessage}</span>
            </div>
          ) : null}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              background: 'rgba(255,255,255,0.78)',
              borderRadius: '20px',
              padding: forExport ? '24px 28px' : '20px 24px',
              boxShadow: '0 14px 28px rgba(15,23,42,0.12)',
            }}
          >
            {header.conceptTagline ? (
              <span
                style={{
                  alignSelf: 'flex-start',
                  padding: '6px 14px',
                  borderRadius: '999px',
                  background: `${theme.accent}1f`,
                  color: theme.branchText,
                  fontSize: '12px',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                {header.conceptTagline}
              </span>
            ) : null}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: forExport ? '30px' : '26px', fontWeight: 700, color: '#0f172a' }}>
                {header.title || visual.center?.title || card.title}
              </div>
              {header.subtitle ? (
                <div style={{ fontSize: '14px', color: '#1e293b', opacity: 0.85, lineHeight: 1.6 }}>
                  {header.subtitle}
                </div>
              ) : null}
              {header.summary ? (
                <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.7 }}>
                  {header.summary}
                </div>
              ) : null}
            </div>

            {header.formula && header.formula !== '无公式' ? (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: 'rgba(15,23,42,0.08)',
                  fontFamily: 'Menlo, SFMono-Regular, Consolas, monospace',
                  fontSize: '13px',
                  color: '#0f172a',
                  alignSelf: 'flex-start',
                }}
              >
                {header.formula}
              </div>
            ) : null}
          </div>

          {structuredSvgMarkup ? (
            <div
              style={{
                width: '100%',
                borderRadius: '24px',
                overflow: 'hidden',
                boxShadow: '0 18px 36px rgba(15, 23, 42, 0.18)',
              }}
              dangerouslySetInnerHTML={{ __html: structuredSvgMarkup }}
            />
          ) : structuredImage ? (
            <div
              style={{
                width: '100%',
                borderRadius: '24px',
                overflow: 'hidden',
                boxShadow: '0 18px 36px rgba(15, 23, 42, 0.18)',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={structuredImage} alt="辅助图示" style={{ width: '100%', height: 'auto', display: 'block' }} />
            </div>
          ) : null}

          <div
            style={{
              display: 'flex',
              gap: '16px',
              alignItems: 'stretch',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
            }}
          >
            {hasStages ? (
              stageList.map((stage, index) => {
                const accent = visualizationBranchPalette[index % visualizationBranchPalette.length];
                return (
                  <React.Fragment key={stage.id || `stage-${index}`}>
                    <div
                      style={{
                        flex: `1 1 ${Math.max(220, 100 / stageList.length)}%`,
                        minWidth: forExport ? 200 : 220,
                        background: '#ffffff',
                        borderRadius: '20px',
                        padding: forExport ? '22px' : '18px',
                        boxShadow: '0 18px 32px rgba(15, 23, 42, 0.12)',
                        borderTop: `6px solid ${accent}`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                      }}
                    >
                      {stage.imageUrl ? (
                        <div
                          style={{
                            width: '100%',
                            borderRadius: '14px',
                            overflow: 'hidden',
                            height: forExport ? '120px' : '140px',
                            boxShadow: '0 12px 18px rgba(15, 23, 42, 0.15)',
                          }}
                        >
                          <LazyImage
                            src={stage.imageUrl}
                            alt={`${stage.title} 插图`}
                            forceLoad={forExport}
                            preferProxy={forExport}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                          />
                        </div>
                      ) : null}

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#0f172a' }}>
                        <span style={{ fontSize: '22px' }}>{stage.icon || '✨'}</span>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 700 }}>{stage.title}</div>
                          <div style={{ fontSize: '12px', opacity: 0.7 }}>{stage.summary}</div>
                        </div>
                      </div>

                      {Array.isArray(stage.details) && stage.details.length > 0 ? (
                        <ul style={{ margin: 0, padding: '0 0 0 18px', color: '#334155', fontSize: '12px', lineHeight: 1.6 }}>
                          {stage.details.map((detail, detailIndex) => (
                            <li key={`${stage.id}-detail-${detailIndex}`}>{detail}</li>
                          ))}
                        </ul>
                      ) : null}

                      {stage.outcome ? (
                        <div
                          style={{
                            marginTop: 'auto',
                            padding: '10px 12px',
                            borderRadius: '12px',
                            background: `${accent}1d`,
                            color: '#0f172a',
                            fontSize: '12px',
                          }}
                        >
                          产出：{stage.outcome}
                        </div>
                      ) : null}

                      {stage.imagePrompt && !forExport ? (
                        <div
                          style={{
                            fontSize: '11px',
                            color: '#64748b',
                            background: '#f8fafc',
                            padding: '8px 10px',
                            borderRadius: '8px',
                          }}
                        >
                          图像提示：{stage.imagePrompt}
                        </div>
                      ) : null}
                    </div>

                    {index < stageList.length - 1 ? (
                      <div
                        style={{
                          alignSelf: 'center',
                          color: '#1e293b',
                          fontSize: '18px',
                          opacity: 0.55,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: '24px',
                        }}
                      >
                        →
                      </div>
                    ) : null}
                  </React.Fragment>
                );
              })
            ) : (
              <div
                style={{
                  width: '100%',
                  padding: '32px',
                  borderRadius: '20px',
                  background: '#ffffff',
                  border: '1px dashed #cbd5f5',
                  color: '#475569',
                  textAlign: 'center',
                  fontSize: '14px',
                  lineHeight: 1.6,
                }}
              >
                暂无可展示的步骤，可重新生成辅助图示或手动补充教学流程。
              </div>
            )}
          </div>

          {outcomesList.length > 0 ? (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              {outcomesList.map((outcome, index) => (
                <div
                  key={`outcome-${index}-${outcome.title}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: '#ffffff',
                    borderRadius: '999px',
                    padding: '10px 16px',
                    boxShadow: '0 12px 24px rgba(15, 23, 42, 0.12)',
                    fontSize: '12px',
                    color: '#0f172a',
                  }}
                >
                  <span>{outcome.icon || '⭐️'}</span>
                  <span>
                    <strong style={{ marginRight: '6px' }}>{outcome.title}</strong>
                    {outcome.description ? (
                      <span style={{ opacity: 0.75 }}>{outcome.description}</span>
                    ) : null}
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          {notesList.length > 0 ? (
            <div
              style={{
                background: '#ffffff',
                borderRadius: '18px',
                padding: '16px 20px',
                boxShadow: '0 10px 22px rgba(15, 23, 42, 0.1)',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>教学提示</div>
              <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: '12px', color: '#334155', lineHeight: 1.6 }}>
                {notesList.map((note, index) => (
                  <li key={`note-${index}`}>{note}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {highlight ? (
            <div
              style={{
                padding: '14px 18px',
                borderRadius: '16px',
                background: `${theme.accent}1c`,
                color: '#0f172a',
                fontSize: '13px',
                letterSpacing: '0.03em',
                textTransform: 'uppercase',
              }}
            >
              {highlight}
            </div>
          ) : null}
        </div>
      );
    };

    const renderHeroIllustration = () => {
      if (visual.type === 'structured-diagram') {
        return renderStructuredDiagram();
      }

      const annotations = Array.isArray(visual.annotations) ? visual.annotations.slice(0, 4) : [];
      const composition = visual.composition ?? {};
      const palette = Array.isArray(composition.colorPalette)
        ? composition.colorPalette.filter(color => typeof color === 'string' && color.trim().length > 0)
        : [];

      const hasImage = Boolean(typeof visual.imageUrl === 'string' && visual.imageUrl.trim().length > 0);
      const imageMetadata = visual.imageMetadata;
      const providerLabel = imageMetadata?.provider === 'placeholder' ? '豆包' : imageMetadata?.provider;

      const renderGeneratedHero = () => (
        <div
          style={{
            background: theme.background,
            borderRadius: '32px',
            padding: forExport ? '48px' : '32px',
            margin: '0 auto 24px',
            boxShadow: '0 32px 72px rgba(15, 23, 42, 0.2)',
            maxWidth: forExport ? 720 : 560,
            display: 'flex',
            flexDirection: 'column',
            gap: forExport ? '28px' : '20px',
          }}
        >
          <div
            style={{
              borderRadius: '30px',
              overflow: 'hidden',
              aspectRatio: forExport ? '4 / 3' : '16 / 11',
              boxShadow: '0 26px 50px rgba(15, 23, 42, 0.22)',
            }}
          >
            <LazyImage
              src={visual.imageUrl!}
              alt={`${visual.center.title} 可视化插画`}
              forceLoad={forExport}
              preferProxy={forExport}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: '30px',
              }}
            />
          </div>

          {providerLabel ? (
            <div style={{ fontSize: '12px', color: '#64748b', textAlign: 'right' }}>
              图像提供：{providerLabel}
            </div>
          ) : null}

          {(visual.center.title || visual.center.subtitle) ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                textAlign: 'center',
                color: '#0f172a',
              }}
            >
              {visual.center.title ? (
                <div style={{ fontSize: forExport ? '28px' : '22px', fontWeight: 700 }}>
                  {visual.center.title}
                </div>
              ) : null}
              {visual.center.subtitle ? (
                <div style={{ fontSize: '14px', lineHeight: 1.6, color: '#475569' }}>
                  {visual.center.subtitle}
                </div>
              ) : null}
            </div>
          ) : null}

          {annotations.length > 0 ? (
            <div
              style={{
                display: 'grid',
                gap: '12px',
                gridTemplateColumns: forExport ? 'repeat(2, minmax(0, 1fr))' : '1fr',
              }}
            >
              {annotations.map((annotation, index) => (
                <div
                  key={`annotation-hero-${index}`}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    background: 'rgba(255,255,255,0.9)',
                    borderRadius: '18px',
                    padding: '14px 16px',
                    boxShadow: '0 12px 24px rgba(15, 23, 42, 0.12)',
                  }}
                >
                  {annotation.icon ? <span style={{ fontSize: '20px' }}>{annotation.icon}</span> : null}
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: '#0f172a' }}>{annotation.title}</div>
                    {annotation.description ? (
                      <p style={{ margin: '6px 0 0', fontSize: '12px', lineHeight: 1.6, color: '#334155' }}>
                        {annotation.description}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {(composition.metaphor || composition.visualFocus) ? (
            <div
              style={{
                background: 'rgba(255,255,255,0.82)',
                borderRadius: '24px',
                padding: '20px',
                boxShadow: '0 18px 36px rgba(15,23,42,0.12)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              {composition.metaphor ? (
                <div>
                  <div style={{ fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b' }}>隐喻</div>
                  <div style={{ marginTop: '6px', fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>{composition.metaphor}</div>
                </div>
              ) : null}
              {composition.visualFocus ? (
                <div>
                  <div style={{ fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b' }}>视觉焦点</div>
                  <p style={{ marginTop: '6px', fontSize: '13px', lineHeight: 1.6, color: '#334155' }}>{composition.visualFocus}</p>
                </div>
              ) : null}
            </div>
          ) : null}


        </div>
      );

      const renderConceptBlueprint = () => (
        <div
          style={{
            background: theme.background,
            borderRadius: '32px',
            padding: forExport ? '48px' : '32px',
            margin: '0 auto 24px',
            boxShadow: '0 28px 60px rgba(15, 23, 42, 0.16)',
            maxWidth: forExport ? 720 : 560,
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <div
            style={{
              alignSelf: 'flex-start',
              borderRadius: '999px',
              padding: '8px 16px',
              fontSize: '12px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#1e293b',
              background: 'rgba(255,255,255,0.5)',
              backdropFilter: 'blur(4px)',
            }}
          >
            概念可视化插画草稿
          </div>

          <div
            style={{
              display: 'grid',
              gap: '20px',
              gridTemplateColumns: forExport ? 'repeat(2, minmax(0,1fr))' : '1fr',
            }}
          >
            <div
              style={{
                background: 'rgba(255,255,255,0.75)',
                borderRadius: '24px',
                padding: forExport ? '32px' : '24px',
                boxShadow: '0 18px 36px rgba(15, 23, 42, 0.12)',
              }}
            >
              <div style={{ fontSize: forExport ? '26px' : '22px', fontWeight: 700, color: '#0f172a' }}>
                {visual.center.title}
              </div>
              {visual.center.subtitle ? (
                <div style={{ marginTop: '10px', fontSize: '14px', lineHeight: 1.6, color: '#1e293b', opacity: 0.8 }}>
                  {visual.center.subtitle}
                </div>
              ) : null}
              {structuredSections.length > 0 ? (
                <div style={{ marginTop: '16px' }}>
                  {renderStructuredSections(structuredSections, {
                    fontSize: '13px',
                    color: '#475569',
                    paragraphIndent: '2em',
                  })}
                </div>
              ) : formattedCardContent ? (
                <div style={{ marginTop: '16px' }}>
                  {renderMarkdownContent(formattedCardContent, {
                    fontSize: '13px',
                    color: '#475569',
                    lineHeight: 1.7,
                    textIndent: '2em',
                  })}
                </div>
              ) : null}
            </div>

            <div
              style={{
                background: 'rgba(15, 23, 42, 0.85)',
                borderRadius: '24px',
                padding: forExport ? '32px' : '24px',
                color: '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              {composition.metaphor ? (
                <div>
                  <div style={{ fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.6 }}>隐喻</div>
                  <div style={{ marginTop: '6px', fontSize: '16px', fontWeight: 600 }}>{composition.metaphor}</div>
                </div>
              ) : null}
              {composition.visualFocus ? (
                <div>
                  <div style={{ fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.6 }}>视觉焦点</div>
                  <p style={{ marginTop: '6px', fontSize: '13px', lineHeight: 1.6, opacity: 0.85 }}>{composition.visualFocus}</p>
                </div>
              ) : null}
            </div>
          </div>

          {annotations.length > 0 ? (
            <div
              style={{
                display: 'grid',
                gap: '14px',
                gridTemplateColumns: forExport ? 'repeat(2, minmax(0, 1fr))' : '1fr',
              }}
            >
              {annotations.map((annotation, index) => (
                <div
                  key={`annotation-fallback-${index}`}
                  style={{
                    background: 'rgba(255,255,255,0.85)',
                    borderRadius: '18px',
                    padding: '14px 16px',
                    boxShadow: '0 12px 24px rgba(15, 23, 42, 0.12)',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'flex-start',
                  }}
                >
                  <span style={{ fontSize: '20px' }}>{annotation.icon || '✨'}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: '#0f172a' }}>{annotation.title}</div>
                    {annotation.description ? (
                      <p style={{ margin: '6px 0 0', fontSize: '12px', lineHeight: 1.6, color: '#334155' }}>
                        {annotation.description}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      );

      return hasImage ? renderGeneratedHero() : renderConceptBlueprint();
    };
    if (visual.type === 'hero-illustration') {
      return renderHeroIllustration();
    }

    if (branches.length === 0) {
      return null;
    }

    const preferredOrder = ['input', 'process', 'output', 'insight'];
    const shouldApplyPreferredOrder = linearLayouts.includes(layout ?? '')
      || visual.type === 'process-flow'
      || branchCount <= 3;
    const prioritizedBranches = shouldApplyPreferredOrder
      ? [...branches].sort((a, b) => {
          const idA = typeof a.id === 'string' ? a.id.toLowerCase() : '';
          const idB = typeof b.id === 'string' ? b.id.toLowerCase() : '';
          const indexA = preferredOrder.indexOf(idA);
          const indexB = preferredOrder.indexOf(idB);

          if (indexA === -1 && indexB === -1) {
            return 0;
          }
          if (indexA === -1) {
            return 1;
          }
          if (indexB === -1) {
            return -1;
          }
          return indexA - indexB;
        })
      : branches;

    const renderInteractionColumn = () => {
      const columnWidth = Math.max(Math.min(resolvedWidth, forExport ? DEFAULT_EXPORT_DIMENSIONS.width - 40 : 960), 340);
      const columnPadding = Math.max(responsivePadding, 24);
      return (
        <div
          style={{
            background: theme.background,
            borderRadius: '28px',
            padding: `${columnPadding}px`,
            margin: '0 auto 24px',
            boxShadow: '0 24px 60px rgba(15, 23, 42, 0.16)',
            width: '100%',
            maxWidth: `${columnWidth}px`,
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <div
            style={{
              background: 'rgba(255,255,255,0.92)',
              borderRadius: '20px',
              padding: '20px',
              boxShadow: '0 12px 32px rgba(15, 23, 42, 0.12)',
              textAlign: 'left',
            }}
          >
            <div style={{ fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b', marginBottom: '8px' }}>
              互动任务
            </div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
              {visual.center.title}
            </div>
            {visual.center.subtitle ? (
              <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.7, color: '#334155' }}>{visual.center.subtitle}</p>
            ) : null}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {branches.map((branch, index) => {
              const accent = branch.color || visualizationBranchPalette[index % visualizationBranchPalette.length];
              return (
                <div
                  key={branch.id}
                  style={{
                    background: '#ffffff',
                    borderRadius: '18px',
                    borderLeft: `6px solid ${accent}`,
                    padding: '18px 20px',
                    boxShadow: '0 16px 36px rgba(15, 23, 42, 0.12)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '22px' }}>{branch.icon || '✨'}</span>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>{branch.title}</div>
                      {branch.summary ? (
                        <div style={{ fontSize: '13px', color: '#475569', marginTop: '2px' }}>{branch.summary}</div>
                      ) : null}
                    </div>
                    <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#94a3b8' }}>
                      {index + 1 < 10 ? `0${index + 1}` : index + 1}
                    </span>
                  </div>
                  {branch.keywords && branch.keywords.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {branch.keywords.map((keyword) => (
                        <span
                          key={`${branch.id}-${keyword}`}
                          style={{
                            fontSize: '12px',
                            padding: '4px 10px',
                            borderRadius: '999px',
                            background: `${accent}1a`,
                            color: '#0f172a',
                          }}
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          {visual.footerNote ? (
            <div style={{ fontSize: '12px', color: '#475569', textAlign: 'center', opacity: 0.8 }}>
              {visual.footerNote}
            </div>
          ) : null}
        </div>
      );
    };

    const renderConceptMap = () => {
      const conceptPadding = Math.max(responsivePadding, 32);
      const maxSize = forExport ? Math.min(resolvedWidth, DEFAULT_EXPORT_DIMENSIONS.width - 40) : resolvedWidth;
      const size = Math.max(Math.min(maxSize, forExport ? 760 : 900), 320);
      const center = size / 2;
      const densityFactor = branchCount >= 6 ? 0.42 : branchCount >= 5 ? 0.38 : branchCount >= 4 ? 0.36 : 0.32;
      const radius = center * densityFactor;
      const lineRadius = radius - Math.max(24, size * 0.035);
      const branchBoxWidth = Math.min(300, size * 0.45);

      const positions = branches.map((branch, index) => {
        const angle = -Math.PI / 2 + (index * (2 * Math.PI / Math.max(branchCount, 1)));
        const x = center + radius * Math.cos(angle);
        const y = center + radius * Math.sin(angle);
        const lineX = center + lineRadius * Math.cos(angle);
        const lineY = center + lineRadius * Math.sin(angle);
        const accent = branch.color || visualizationBranchPalette[index % visualizationBranchPalette.length];

        return {
          branch,
          x,
          y,
          lineX,
          lineY,
          accent,
          branchBoxWidth,
        };
      });

      return (
        <div
          style={{
            position: 'relative',
            width: forExport ? `${size}px` : '100%',
            maxWidth: `${size}px`,
            height: `${size}px`,
            margin: '0 auto 24px',
            background: theme.background,
            borderRadius: '24px',
            padding: `${conceptPadding}px`,
            boxShadow: '0 30px 60px rgba(15, 23, 42, 0.12)',
            overflow: 'visible',
          }}
        >
          <svg
            width={size}
            height={size}
            style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
          >
            {positions.map((pos) => (
              <line
                key={`line-${pos.branch.id}`}
                x1={center}
                y1={center}
                x2={pos.lineX}
                y2={pos.lineY}
                stroke={theme.accent}
                strokeWidth={2}
                strokeLinecap="round"
                opacity={0.7}
              />
            ))}
          </svg>

          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: theme.centerBg,
              color: '#fff',
              padding: forExport ? '24px 32px' : '20px 28px',
              borderRadius: '24px',
              boxShadow: '0 18px 32px rgba(15, 23, 42, 0.25)',
              minWidth: '180px',
              maxWidth: '70%',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: forExport ? '20px' : '18px', fontWeight: 700, marginBottom: '8px' }}>
              {visual.center.title}
            </div>
            {visual.center.subtitle ? (
              <div style={{ fontSize: '13px', lineHeight: 1.5, opacity: 0.85 }}>
                {visual.center.subtitle}
              </div>
            ) : null}
          </div>

          {positions.map((pos) => (
            <div
              key={pos.branch.id}
              style={{
                position: 'absolute',
                left: pos.x,
                top: pos.y,
                transform: 'translate(-50%, -50%)',
                width: pos.branchBoxWidth,
                maxWidth: '85%',
                background: theme.branchBg,
                border: `1px solid ${theme.border}`,
                borderTop: `4px solid ${pos.accent}`,
                borderRadius: '16px',
                padding: forExport ? '18px 18px' : '14px 16px',
                boxShadow: '0 18px 30px rgba(15, 23, 42, 0.12)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: forExport ? '22px' : '18px' }}>{pos.branch.icon || '✨'}</span>
                <span style={{
                  fontSize: forExport ? '15px' : '14px',
                  fontWeight: 600,
                  color: theme.branchText,
                }}>
                  {pos.branch.title}
                </span>
              </div>
              {pos.branch.summary ? (
                <p
                  style={{
                    margin: 0,
                    fontSize: forExport ? '13px' : '12px',
                    lineHeight: 1.6,
                    color: '#475569',
                  }}
                >
                  {pos.branch.summary}
                </p>
              ) : null}
              {Array.isArray(pos.branch.keywords) && pos.branch.keywords.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                  {pos.branch.keywords.map((keyword: string) => (
                    <span
                      key={`${pos.branch.id}-${keyword}`}
                      style={{
                        fontSize: '11px',
                        padding: '4px 8px',
                        borderRadius: '999px',
                        background: `${pos.accent}15`,
                        color: theme.branchText,
                      }}
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ))}

          {visual.footerNote ? (
            <div
              style={{
                position: 'absolute',
                bottom: '12px',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '12px',
                color: '#1f2937',
                opacity: 0.8,
                textAlign: 'center',
                maxWidth: '80%',
              }}
            >
              {visual.footerNote}
            </div>
          ) : null}
        </div>
      );
    };

    const renderProcessFlow = (direction: 'left-to-right' | 'right-to-left' | string = 'left-to-right') => (
      <div
        style={{
          background: theme.background,
          borderRadius: '24px',
          padding: `${Math.max(responsivePadding, 28)}px`,
          margin: '0 auto 24px',
          boxShadow: '0 30px 60px rgba(15, 23, 42, 0.12)',
          width: '100%',
          maxWidth: `${Math.max(Math.min(resolvedWidth, forExport ? DEFAULT_EXPORT_DIMENSIONS.width - 40 : 960), 320)}px`,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px', color: theme.branchText }}>
          <div style={{ fontSize: '20px', fontWeight: 700 }}>{visual.center.title}</div>
          {visual.center.subtitle ? (
            <div style={{ fontSize: '13px', opacity: 0.8, marginTop: '6px' }}>{visual.center.subtitle}</div>
          ) : null}
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: direction === 'right-to-left' ? 'row-reverse' : 'row',
            gap: forExport ? '24px' : '20px',
            alignItems: 'stretch',
            justifyContent: 'space-between',
            position: 'relative',
            flexWrap: 'wrap',
          }}
        >
          {prioritizedBranches.map((branch, index) => (
            <React.Fragment key={branch.id}>
              <div
                style={{
                  flex: '1 1 200px',
                  minWidth: 180,
                  background: theme.branchBg,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '16px',
                  padding: '18px',
                  color: theme.branchText,
                  boxShadow: '0 12px 24px rgba(15, 23, 42, 0.12)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '22px' }}>{branch.icon || '✨'}</span>
                  <span style={{ fontSize: '15px', fontWeight: 600 }}>{branch.title}</span>
                </div>
                {branch.summary ? (
                  <p style={{ fontSize: '13px', lineHeight: 1.6, margin: 0 }}>{branch.summary}</p>
                ) : null}
                {branch.keywords && branch.keywords.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
                    {branch.keywords.map((keyword) => (
                      <span
                        key={keyword}
                        style={{
                          fontSize: '12px',
                          padding: '4px 10px',
                          borderRadius: '9999px',
                          background: `${(branch.color || theme.accent)}16`,
                        }}
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              {index < prioritizedBranches.length - 1 ? (
                <div
                  aria-hidden
                  style={{
                    alignSelf: 'center',
                    color: theme.accent,
                    fontSize: '24px',
                  }}
                >
                  {direction === 'right-to-left' ? '⬅' : '➔'}
                </div>
              ) : null}
            </React.Fragment>
          ))}
        </div>
        {visual.footerNote ? (
          <div style={{ marginTop: '20px', fontSize: '12px', color: theme.branchText, opacity: 0.75, textAlign: 'center' }}>
            {visual.footerNote}
          </div>
        ) : null}
      </div>
    );

    const renderMatrix = () => {
      const gridWidth = Math.max(Math.min(resolvedWidth, forExport ? DEFAULT_EXPORT_DIMENSIONS.width - 40 : 960), 320);
      const idealColumns = gridWidth >= 720 ? 3 : gridWidth >= 520 ? 2 : 1;
      const columnCount = Math.max(1, Math.min(idealColumns, branches.length));
      const gridPadding = Math.max(responsivePadding, 28);
      return (
        <div
          style={{
            background: theme.background,
            borderRadius: '24px',
            padding: `${gridPadding}px`,
            margin: '0 auto 24px',
            boxShadow: '0 30px 60px rgba(15, 23, 42, 0.12)',
            width: '100%',
            maxWidth: `${gridWidth}px`,
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '24px', color: theme.branchText }}>
            <div style={{ fontSize: '20px', fontWeight: 700 }}>{visual.center.title}</div>
            {visual.center.subtitle ? (
              <div style={{ fontSize: '13px', opacity: 0.8, marginTop: '6px' }}>{visual.center.subtitle}</div>
            ) : null}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
              gap: '16px',
            }}
          >
            {branches.map((branch) => (
              <div
                key={branch.id}
                style={{
                  background: theme.branchBg,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '16px',
                  padding: '18px',
                  color: theme.branchText,
                  boxShadow: '0 12px 24px rgba(15, 23, 42, 0.12)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '22px' }}>{branch.icon || '✨'}</span>
                  <span style={{ fontSize: '15px', fontWeight: 600 }}>{branch.title}</span>
                </div>
                {branch.summary ? (
                  <p style={{ fontSize: '13px', lineHeight: 1.6, margin: 0 }}>{branch.summary}</p>
                ) : null}
                {branch.keywords && branch.keywords.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
                    {branch.keywords.map((keyword) => (
                      <span
                        key={keyword}
                        style={{
                          fontSize: '12px',
                          padding: '4px 10px',
                          borderRadius: '9999px',
                          background: `${(branch.color || theme.accent)}16`,
                        }}
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          {visual.footerNote ? (
            <div style={{ marginTop: '20px', fontSize: '12px', color: theme.branchText, opacity: 0.75, textAlign: 'center' }}>
              {visual.footerNote}
            </div>
          ) : null}
        </div>
      );
    };

    const isLinearFlow = visual.type === 'process-flow'
      || linearLayouts.includes(layout ?? '')
      || branchCount <= 3;

    const prefersGridLayout = layout === 'grid' || branchCount >= 6;

    switch (visual.type) {
      case 'structured-diagram':
        return renderStructuredDiagram();
      case 'process-flow':
        return renderProcessFlow(layout === 'right-to-left' ? 'right-to-left' : 'left-to-right');
      case 'matrix':
        return renderMatrix();
      case 'concept-map':
      default:
        if (shouldUseInteractionColumn) {
          return renderInteractionColumn();
        }
        if (prefersGridLayout && branches.length >= 4) {
          return renderMatrix();
        }
        if (isLinearFlow) {
          return renderProcessFlow(layout === 'right-to-left' ? 'right-to-left' : 'left-to-right');
        }
        return renderConceptMap();
    }
  };

  const expandable = useMemo(() => {
    if (effectiveVisual) {
      return false;
    }
    const textLength = cardContent.replace(/<[^>]+>/g, '').length;
    return textLength > 320;
  }, [effectiveVisual, cardContent]);

  const renderCardSurface = (forExport: boolean = false) => {
    const effectivePadding = 32;
    const backgroundColor = '#ffffff';
    const borderColor = typeConfig.color;
    const visual = effectiveVisual;
    const hasVisualization = Boolean(visual);
    const isHeroVisualization = hasVisualization && visual?.type === 'hero-illustration';
    const hasHeroImage = Boolean(visual?.imageUrl);
    const shouldShowExplanation = Boolean(card.explanation) && !(isHeroVisualization && hasHeroImage);
    const showCompactPlaceholder = isOptionalVisualCard && !hasVisualization && !forExport;

    const titleStyle: React.CSSProperties = {
      margin: '0 0 16px 0',
      fontSize: '18px',
      fontWeight: 700,
      color: '#0f172a',
      paddingRight: forExport ? '0' : '80px',
      letterSpacing: '0.01em',
      display: 'flex',
      alignItems: 'baseline',
      gap: '12px',
    };

    const bottomSectionStyle: React.CSSProperties = {
      marginTop: '18px',
      paddingTop: '18px',
      borderTop: `1px dashed ${borderColor}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      gap: '16px',
    };

    const explanationStyle: React.CSSProperties = {
      fontSize: '14px',
      color: '#64748b',
      lineHeight: 1.6,
      flex: 1,
    };

    const watermarkStyle: React.CSSProperties = {
      fontSize: '10px',
      color: '#cbd5e1',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      opacity: 0.7,
      flexShrink: 0,
    };

    const surfaceStyle: React.CSSProperties = {
      backgroundColor: isHeroVisualization ? 'transparent' : backgroundColor,
      color: '#1f2937',
      fontSize: '16px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
      padding: isHeroVisualization ? (forExport ? '0' : '12px') : `${effectivePadding}px`,
      paddingBottom: isHeroVisualization ? (forExport ? '0' : '12px') : `${Math.max(effectivePadding, 48)}px`,
      borderRadius: isHeroVisualization ? '20px' : '12px',
      border: isHeroVisualization ? 'none' : `2px solid ${borderColor}`,
      minHeight: isHeroVisualization ? 'auto' : forExport ? `${DEFAULT_EXPORT_DIMENSIONS.height}px` : '520px',
      position: 'relative',
      marginBottom: forExport ? 0 : '16px',
      boxShadow: isHeroVisualization
        ? 'none'
        : forExport
          ? '0 24px 48px rgba(15, 23, 42, 0.18)'
          : '0 2px 8px rgba(0, 0, 0, 0.08)',
      width: '100%',
      overflow: 'visible',
      transition: forExport ? 'none' : 'all 0.2s ease',
      cursor: allowEditing && !forExport && !isEditing && viewMode === 'content' && !isHeroVisualization
        ? 'pointer'
        : 'default',
    };

    if (showCompactPlaceholder) {
      const previewSections = structuredSections
        .slice(0, 2)
        .map((section) => {
          const summary = extractSectionPreview(section);
          if (!summary) {
            return null;
          }
          return { title: section.title, summary: truncateText(summary, 56) };
        })
        .filter((item): item is { title: string; summary: string } => Boolean(item));

      if (previewSections.length === 0) {
        const fallbackSummary = truncateText(
          headerSummary || typeConfig.description || '辅助图示可以把复杂关系变成清晰的视觉。',
          56,
        );
        previewSections.push(
          { title: '知识要点', summary: fallbackSummary || '辅助图示让内容更直观。' },
          { title: '课堂亮点', summary: '生成后可保存、导出，用作课堂互动的视觉锚点。' },
        );
      }

      return (
        <div
          ref={forExport ? undefined : cardRef}
          className="card-export-area"
          style={{
            position: 'relative',
            backgroundColor: '#f8fafc',
            border: `1px dashed ${borderColor}`,
            borderRadius: '18px',
            padding: '24px',
            marginBottom: '16px',
            minHeight: 'auto',
            boxShadow: 'none',
            cursor: allowEditing && !forExport ? 'pointer' : 'default',
          }}
          onClick={() => allowEditing && !forExport && !isEditing && viewMode === 'content' && setIsEditing(true)}
        >
          {(retrying || isGeneratingVisual) && !forExport && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(255,255,255,0.85)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                borderRadius: '18px',
                zIndex: 25,
              }}
            >
              <div className="modern-spinner" style={{ width: '20px', height: '20px' }} />
              <span style={{ fontSize: '12px', color: '#334155' }}>
                {retrying ? '重新生成中...' : '生成辅助图示中...'}
              </span>
            </div>
          )}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '16px',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ flex: '1 1 260px' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>辅助图示尚未生成</div>
              <p style={{ marginTop: '6px', fontSize: '14px', color: '#475569', lineHeight: 1.6 }}>
                {(headerSummary ? `基于「${headerSummary}」` : '基于卡片内容')} 即可快速生成视觉草图，
                让{typeConfig.name}的思路更直观。
              </p>
            </div>
          </div>
          <div style={{ marginTop: '12px', display: 'grid', gap: '10px' }}>
            {previewSections.map((item) => (
              <div
                key={`preview-${item.title}`}
                style={{
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'flex-start',
                }}
              >
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: typeConfig.color,
                    minWidth: '72px',
                  }}
                >
                  {item.title}
                </span>
                <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>{item.summary}</p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div
        ref={forExport ? undefined : cardRef}
        className="card-export-area"
        style={surfaceStyle}
        onClick={() => allowEditing && !forExport && !isEditing && viewMode === 'content' && setIsEditing(true)}
        title={allowEditing && !forExport && !isEditing && viewMode === 'content' ? '点击编辑卡片' : undefined}
      >
        {(retrying || isGeneratingVisual) && !forExport && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(255,255,255,0.78)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              zIndex: 25,
            }}
          >
            <div className="modern-spinner" style={{ width: '20px', height: '20px' }} />
            <span style={{ fontSize: '12px', color: '#334155' }}>
              {retrying ? '重新生成中...' : '生成辅助图示中...'}
            </span>
          </div>
        )}
        {hasVisualization ? (
          <div
            ref={!forExport ? handleVisualContainerRef : undefined}
            style={{ marginBottom: isHeroVisualization ? '0' : '20px', width: '100%' }}
          >
            {renderVisualizationCanvas(forExport)}
          </div>
        ) : null}
        {!forExport && expandable && !isContentExpanded && (
          <div
            style={{
              position: 'absolute',
              left: effectivePadding,
              right: effectivePadding,
              bottom: effectivePadding + 64,
              height: '80px',
              pointerEvents: 'none',
              background: `linear-gradient(180deg, rgba(255,255,255,0) 0%, ${backgroundColor} 85%)`,
            }}
          />
        )}
      </div>
    );
  };

  const renderContentView = (forExport: boolean = false) => (
    <>
      {allowEditing && isEditing && !forExport ? (
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
          <SimpleCardEditor
            initialContent={cardContent}
            onContentChange={handleContentChange}
          />
        </div>
      ) : (
        renderCardSurface(forExport)
      )}

      {cardContent && (
        <div
          className="generated-card__summary"
          style={hasStructuredSections ? {
            textAlign: 'left',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '18px',
            padding: forExport ? '20px' : '24px',
            boxShadow: forExport ? 'none' : '0 18px 40px rgba(15,23,42,0.08)',
            alignItems: 'stretch',
            gap: '16px',
          } : {
            textAlign: 'center',
            ...(forExport ? {
              background: '#ffffff',
              border: '1px dashed #e2e8f0',
              boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
            } : {}),
          }}
        >
          {hasStructuredSections
            ? renderStructuredSections(structuredSections, {
                fontSize: '14px',
                color: '#0f172a',
                paragraphIndent: '1.6em',
                titleColor: typeConfig.color,
              })
            : renderMarkdownContent(formattedCardContent || cardContent, {
                fontSize: '15px',
                color: '#0f172a',
                lineHeight: 1.7,
              })}
        </div>
      )}

      {(!allowEditing || !isEditing) && expandable && !forExport && (
        <div style={{ textAlign: 'right', marginBottom: '16px' }}>
          <button
            type="button"
            onClick={() => setIsContentExpanded(prev => !prev)}
            style={{
              border: 'none',
              background: 'transparent',
              color: typeConfig.color,
              fontSize: 'var(--font-size-sm)',
              cursor: 'pointer',
            }}
          >
            {isContentExpanded ? '收起详情' : '展开详情'}
          </button>
        </div>
      )}

      {forExport && (
        <>
          {renderSOPView({ hidePlaceholder: true })}
          {renderPresentationView({ hidePlaceholder: true })}
        </>
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
  const exportContentStyle: React.CSSProperties = {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    backgroundColor: '#ffffff',
    boxSizing: 'border-box',
  };

  const renderSOPView = (options?: { hidePlaceholder?: boolean }) => {
    const sopSections = card.sop ?? [];
    if (!sopSections.length) {
      if (options?.hidePlaceholder) {
        return null;
      }
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
                    <p style={{ margin: '0 0 4px 0' }}>教学引导：{step.teacherActions}</p>
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

  const renderPresentationView = (options?: { hidePlaceholder?: boolean }) => {
    const presentation = card.presentation;
    if (!presentation) {
      if (options?.hidePlaceholder) {
        return null;
      }
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
            padding: '10px 18px',
            backgroundColor: BRAND_PRIMARY,
            color: '#f5f9ff',
            border: 'none',
            borderRadius: '999px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 10px 24px rgba(37, 99, 235, 0.25)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.backgroundColor = '#1d4ed8';
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.backgroundColor = BRAND_PRIMARY;
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
    <React.Fragment>
      <div className={rootClassName} style={{ marginBottom: '24px', position: 'relative' }}>
        <div
          data-export-hidden
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            marginBottom: '12px',
            ...(exportHiddenStyle ?? {}),
          }}
        >
          {hasSOP || card.presentation ? (
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {viewTabs.map((tab) => {
                if (tab.disabled) return null;
                const isActive = viewMode === tab.key;
                const isPresentationTab = tab.key === 'presentation';
                const activeBg = isPresentationTab ? BRAND_PRIMARY : typeConfig.color;
                const activeColor = '#f6f9ff';
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setViewMode(tab.key)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '999px',
                      border: 'none',
                      backgroundColor: isActive ? activeBg : 'transparent',
                      color: isActive ? activeColor : '#64748b',
                      fontSize: '13px',
                      fontWeight: isActive ? 600 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: isActive ? '0 8px 18px rgba(37, 99, 235, 0.25)' : 'none',
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          ) : <span />}

          <button
            type="button"
            onClick={(e) => {
              handleExport('social');
              e.stopPropagation();
            }}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
              color: '#64748b',
              fontSize: '16px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f8fafc';
              e.currentTarget.style.borderColor = '#cbd5e1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ffffff';
              e.currentTarget.style.borderColor = '#e2e8f0';
            }}
            title="下载图片"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 10L4 6h8l-4 4z" fill="currentColor"/>
              <path d="M3 12h10v2H3v-2z" fill="currentColor"/>
            </svg>
          </button>
        </div>

      {viewMode === 'content' && renderContentView()}
      {viewMode === 'sop' && renderSOPView()}
      {viewMode === 'presentation' && renderPresentationView()}


      {feedback && (
        <div
          style={{
            marginTop: '12px',
            padding: '10px 12px',
            borderRadius: '8px',
            fontSize: '13px',
            color: feedback.type === 'error' ? '#b91c1c' : '#0f172a',
            backgroundColor: feedback.type === 'error' ? '#fee2e2' : '#dcfce7',
          }}
        >
          {feedback.message}
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
        presentationSeries={presentationSeries}
      />
      </div>
      <div aria-hidden style={offscreenWrapperStyle}>
        <div ref={exportContainerRef} style={exportContentStyle}>
          {renderContentView(true)}
        </div>
      </div>
    </React.Fragment>
  );
}

interface MarkdownStyleOptions {
  fontSize?: string;
  color?: string;
  lineHeight?: number;
  strongColor?: string;
  textIndent?: string;
  paragraphTag?: 'p' | 'span';
}

interface StructuredSection {
  title: string;
  icon?: string;
  blocks: Array<
    | { type: 'paragraph'; text: string }
    | { type: 'orderedList'; items: string[] }
    | { type: 'unorderedList'; items: string[] }
  >;
}

interface StructuredRenderOptions {
  fontSize?: string;
  color?: string;
  paragraphIndent?: string;
  titleColor?: string;
}

const HEADING_KEYWORDS = [
  '典型例子',
  '详细分析',
  '举一反三',
  '思考启发',
  '延伸提醒',
  '案例',
  '背景相似',
  '严密立法',
  '应用建议',
  '步骤提示',
  '基础练习',
  '提升练习',
  '解题提示',
  '参考答案',
  '知识拓展',
  '学科联系',
  '趣味知识',
  '进一步探索',
  '活动目标',
  '活动流程',
  '评分标准',
  '奖励机制',
];

const REGEX_SPECIAL_CHARS = /[.*+?^${}()|[\]\\]/g;
const escapeRegex = (value: string) => value.replace(REGEX_SPECIAL_CHARS, '\\$&');

const HEADING_ICONS = [
  '📌', '📍', '🎯', '📝', '✏️', '✅', '⚠️', '📘', '📗', '📙', '📕', '⭐', '🌟', '🔍', '💡',
  '🚀', '🌐', '🔗', '🎨', '🔄', '📋', '🏆', '🎁',
] as const;
const HEADING_ICON_PATTERN = HEADING_ICONS.map((icon) => escapeRegex(icon)).join('|');
const ICON_ONLY_LINE_REGEX = new RegExp(`^(?:${HEADING_ICON_PATTERN}|\s)+$`, 'u');
const ICON_ONLY_LINE_GLOBAL_REGEX = new RegExp(`^(?:${HEADING_ICON_PATTERN}|\s)+$`, 'gmu');

function renderMarkdownContent(content: string, options?: MarkdownStyleOptions) {
  if (!content) {
    return null;
  }

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={createMarkdownComponents(options)}
    >
      {content}
    </ReactMarkdown>
  );
}

function renderStructuredSections(sections: StructuredSection[], options: StructuredRenderOptions = {}) {
  if (!sections || sections.length === 0) {
    return null;
  }

  return sections.map((section, index) => (
    <div key={`${section.title}-${index}`} style={{ marginBottom: '18px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontWeight: 700,
          fontSize: '15px',
          color: options.titleColor ?? '#0f172a',
        }}
      >
        {section.icon && <span style={{ fontSize: '18px' }}>{section.icon}</span>}
        <span>{section.title}</span>
      </div>
      <div style={{ marginLeft: options.paragraphIndent ?? '2em', marginTop: '8px' }}>
        {section.blocks.map((block, blockIndex) => {
          if (block.type === 'paragraph') {
            return (
              <div key={`p-${blockIndex}`} style={{ marginBottom: '10px' }}>
                {renderMarkdownContent(block.text, {
                  fontSize: options.fontSize ?? '14px',
                  color: options.color ?? '#1f2937',
                  lineHeight: 1.75,
                  textIndent: options.paragraphIndent ?? '2em',
                })}
              </div>
            );
          }

          if (block.type === 'orderedList') {
            return (
              <ol
                key={`ol-${blockIndex}`}
                style={{
                  margin: '4px 0 12px 1.5rem',
                  color: options.color ?? '#1f2937',
                  fontSize: options.fontSize ?? '14px',
                  lineHeight: 1.65,
                }}
              >
                {block.items.map((item, itemIndex) => (
                  <li key={`ol-item-${itemIndex}`} style={{ marginBottom: '6px' }}>
                    {renderMarkdownContent(item, {
                      fontSize: options.fontSize ?? '14px',
                      color: options.color ?? '#1f2937',
                      paragraphTag: 'span',
                      lineHeight: 1.65,
                    })}
                  </li>
                ))}
              </ol>
            );
          }

          if (block.type === 'unorderedList') {
            return (
              <ul
                key={`ul-${blockIndex}`}
                style={{
                  margin: '4px 0 12px 1.5rem',
                  color: options.color ?? '#1f2937',
                  fontSize: options.fontSize ?? '14px',
                  lineHeight: 1.65,
                }}
              >
                {block.items.map((item, itemIndex) => (
                  <li key={`ul-item-${itemIndex}`} style={{ marginBottom: '6px' }}>
                    {renderMarkdownContent(item, {
                      fontSize: options.fontSize ?? '14px',
                      color: options.color ?? '#1f2937',
                      paragraphTag: 'span',
                      lineHeight: 1.65,
                    })}
                  </li>
                ))}
              </ul>
            );
          }

          return null;
        })}
      </div>
    </div>
  ));
}

function createMarkdownComponents(options: MarkdownStyleOptions = {}) {
  const paragraphStyle: React.CSSProperties = {
    margin: '0 0 12px 0',
    fontSize: options.fontSize ?? '14px',
    color: options.color ?? '#0f172a',
    lineHeight: options.lineHeight ?? 1.7,
    textIndent: options.textIndent,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  };

  const inlineParagraphStyle: React.CSSProperties = {
    fontSize: options.fontSize ?? '14px',
    color: options.color ?? '#0f172a',
    lineHeight: options.lineHeight ?? 1.6,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  };

  const listStyle: React.CSSProperties = {
    margin: '0 0 12px 1.25rem',
    padding: 0,
    color: paragraphStyle.color,
    fontSize: paragraphStyle.fontSize,
    lineHeight: paragraphStyle.lineHeight,
  };

  const listItemStyle: React.CSSProperties = {
    margin: '0 0 6px 0',
  };

  const components: Components = {
    p({ children }) {
      if (options.paragraphTag === 'span') {
        return <span style={inlineParagraphStyle}>{children}</span>;
      }
      return <p style={paragraphStyle}>{children}</p>;
    },
    ul({ children }) {
      return <ul style={listStyle}>{children}</ul>;
    },
    ol({ children }) {
      return <ol style={listStyle}>{children}</ol>;
    },
    li({ children }) {
      return <li style={listItemStyle}>{children}</li>;
    },
    strong({ children }) {
      return <strong style={{ color: options.strongColor ?? '#0f172a' }}>{children}</strong>;
    },
    br() {
      return <br />;
    },
  };

  return components;
}

function formatCardContentMarkdown(content: string): string {
  if (!content) {
    return '';
  }

  let text = stripHtmlTags(content)
    .replace(/&nbsp;/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/\u3000/g, ' ');

  text = text.replace(/\s+\n/g, '\n');

  const emphasisPatterns = [
    '举一反三',
    '思考启发',
    '延伸提醒',
    '案例',
    '典型例子',
    '拓展建议',
    '详细分析',
    '背景提示',
  ];

  emphasisPatterns.forEach((pattern) => {
    const regex = new RegExp(`(${pattern})`, 'g');
    text = text.replace(regex, '\n\n$1');
  });

  const emojiMarkers = [...HEADING_ICONS];
  emojiMarkers.forEach((marker) => {
    const regex = new RegExp(`${escapeRegex(marker)}\s*([^\n：:]{0,12})`, 'g');
    text = text.replace(regex, (_match, label) => {
      const cleanedLabel = label ? ` ${label.trim()}` : '';
      return `\n${marker}${cleanedLabel}\n`;
    });
  });

  text = text.replace(/(\*\*)([\s\S]+?)(\*\*)/g, (_match, start, inner, end) => {
    const cleaned = inner.replace(/\s*\n+\s*/g, '');
    return `${start}${cleaned}${end}`;
  });

  text = text.replace(/(\*\*[\s\S]+?\*\*)\s*([：:])/g, '$1$2');

  text = text.replace(/(\*\*[\s\S]+?\*\*)/g, (match, offset, source) => {
    const prevChar = offset > 0 ? source[offset - 1] : '';
    const nextChar = offset + match.length < source.length ? source[offset + match.length] : '';
    const prefix = prevChar && prevChar !== '\n' ? '\n' : '';
    const suffix = nextChar && nextChar !== '\n' ? '\n' : '';
    return `${prefix}${match}${suffix}`;
  });
  text = text.replace(/(\*\*[\s\S]+?\*\*)\n([：:])/g, '$1$2\n');

  text = text
    .replace(/([。！？!?])(?=[^\n\s”’）】》〉』」"'])/g, '$1\n')
    .replace(/(?<!\n)(\d+\.(?!\d))/g, '\n\n$1')
    .replace(/(?<!\n)([-–—]\s)/g, '\n$1')
    .replace(/\n{3,}/g, '\n\n');

  text = text.replace(/(\n\n)(\d+\.(?!\d))/g, '\n\n$2');
  text = text.replace(/(\d+\.(?!\d))\s*\n+(?=\S)/g, '$1 ');
  text = text.replace(/\n\s*([：:])/g, '$1');
  text = text.replace(ICON_ONLY_LINE_GLOBAL_REGEX, '');

  return text.trim();
}

function stripHtmlTags(value: string): string {
  return value.replace(/<[^>]+>/g, '');
}

function buildStructuredSections(markdown: string): StructuredSection[] {
  if (!markdown) {
    return [];
  }

  const lines = markdown
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const sections: StructuredSection[] = [];
  let currentSection: StructuredSection | null = null;

  const ensureSection = () => {
    if (!currentSection) {
      currentSection = { title: '内容要点', blocks: [] };
      sections.push(currentSection);
    }
    return currentSection;
  };

  const startSection = (title: string, icon?: string) => {
    currentSection = { title, icon, blocks: [] };
    sections.push(currentSection);
  };

  const appendToParagraph = (rawLine: string, normalizedLine: string): boolean => {
    if (!currentSection) {
      return false;
    }
    const section = currentSection;
    if (section.blocks.length === 0) {
      return false;
    }
    const lastBlock = section.blocks[section.blocks.length - 1];
    if (!lastBlock || lastBlock.type !== 'paragraph') {
      return false;
    }
    const trimmedLine = rawLine.trim();
    if (!trimmedLine || !normalizedLine) {
      return false;
    }
    const lastText = lastBlock.text.trim();
    if (!lastText || /[。！？!?；;：:,，、]$/.test(lastText)) {
      return false;
    }
    if (!/^[一-龥A-Za-z0-9（(“"《【]/.test(normalizedLine)) {
      return false;
    }
    lastBlock.text = `${lastBlock.text}${trimmedLine}`;
    return true;
  };

  lines.forEach((rawLine) => {
    const withoutHeadingMarks = rawLine.replace(/^#{1,6}\s*/, '');
    const normalizedLine = withoutHeadingMarks.replace(/\*\*/g, '').trim();
    const line = withoutHeadingMarks.trim();
    if (!normalizedLine) {
      return;
    }

    if (ICON_ONLY_LINE_REGEX.test(normalizedLine)) {
      return;
    }
    const heading = detectStructuredHeading(normalizedLine);
    if (heading) {
      startSection(heading.title, heading.icon);
      if (heading.remainder) {
        currentSection!.blocks.push({ type: 'paragraph', text: heading.remainder });
      }
      return;
    }

    const orderedMatch = normalizedLine.match(/^(\d+)\.\s*(.+)$/);
    if (orderedMatch) {
      const itemText = orderedMatch[2].trim();
      if (itemText) {
        const section = ensureSection();
        const lastBlock = section.blocks[section.blocks.length - 1];
        if (!lastBlock || lastBlock.type !== 'orderedList') {
          section.blocks.push({ type: 'orderedList', items: [itemText] });
        } else {
          lastBlock.items.push(itemText);
        }
      }
      return;
    }

    const unorderedMatch = normalizedLine.match(/^(?:[-•●]|·)\s*(.+)$/);
    if (unorderedMatch) {
      const itemText = unorderedMatch[1].trim();
      if (itemText) {
        const section = ensureSection();
        const lastBlock = section.blocks[section.blocks.length - 1];
        if (!lastBlock || lastBlock.type !== 'unorderedList') {
          section.blocks.push({ type: 'unorderedList', items: [itemText] });
        } else {
          lastBlock.items.push(itemText);
        }
      }
      return;
    }

    if (appendToParagraph(line, normalizedLine)) {
      return;
    }

    ensureSection().blocks.push({ type: 'paragraph', text: line });
  });

  return sections;
}

function extractSectionPreview(section: StructuredSection): string | null {
  for (const block of section.blocks) {
    if (block.type === 'paragraph') {
      const plain = stripHtmlTags(block.text).replace(/\s+/g, ' ').trim();
      if (plain) {
        return plain;
      }
    }
    if ((block.type === 'orderedList' || block.type === 'unorderedList') && block.items.length > 0) {
      const plain = stripHtmlTags(block.items[0]).replace(/\s+/g, ' ').trim();
      if (plain) {
        return plain;
      }
    }
  }
  return null;
}

function truncateText(value: string, maxLength: number = 56): string {
  const normalized = value.trim();
  if (!normalized) {
    return '';
  }
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}…` : normalized;
}

function detectStructuredHeading(line: string): { icon?: string; title: string; remainder?: string } | null {
  const iconRegex = new RegExp(`^(${HEADING_ICON_PATTERN})\s*([^：:]+)(?:[:：]+)?(.*)$`, 'u');
  const iconMatch = line.match(iconRegex);
  if (iconMatch) {
    const title = iconMatch[2].trim();
    if (!title || ICON_ONLY_LINE_REGEX.test(title)) {
      return null;
    }
    return {
      icon: iconMatch[1],
      title,
      remainder: iconMatch[3]?.trim(),
    };
  }

  const keyword = HEADING_KEYWORDS.find((key) => line.startsWith(key));
  if (keyword) {
    const remainder = line.slice(keyword.length).replace(/^[:：\s]+/, '');
    return {
      title: keyword,
      remainder: remainder || undefined,
    };
  }

  return null;
}

interface CardPresentationModalProps {
  card: TeachingCard;
  isOpen: boolean;
  onClose: () => void;
  presentationSeries?: TeachingCard[];
}

function CardPresentationModal({ card, isOpen, onClose, presentationSeries }: CardPresentationModalProps) {
  const [mounted, setMounted] = useState(false);
  const [currentCardId, setCurrentCardId] = useState(card.id);
  const [currentCueIndex, setCurrentCueIndex] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setCurrentCardId(card.id);
      setCurrentCueIndex(0);
    }
  }, [isOpen, card.id]);

  const series = useMemo(() => {
    const base = Array.isArray(presentationSeries) && presentationSeries.length > 0
      ? presentationSeries
      : [];
    const seen = new Set<string>();
    const ordered: TeachingCard[] = [];
    const append = (item?: TeachingCard) => {
      if (!item || !item.id) {
        return;
      }
      const cues = item.presentation?.cues;
      if (!cues || cues.length === 0) {
        return;
      }
      if (seen.has(item.id)) {
        return;
      }
      seen.add(item.id);
      ordered.push(item);
    };

    base.forEach(append);
    append(card);
    return ordered;
  }, [presentationSeries, card]);

  const activeIndex = Math.max(0, series.findIndex((item) => item.id === currentCardId));
  const activeCard = series[activeIndex] ?? series[0];
  const activePresentation = activeCard?.presentation;
  const cues = activePresentation?.cues ?? [];

  const prevDisabled = activeIndex === 0 && currentCueIndex === 0;
  const nextDisabled =
    activeIndex === Math.max(0, series.length - 1) && currentCueIndex === Math.max(0, cues.length - 1);

  const goPrev = useCallback(() => {
    if (currentCueIndex > 0) {
      setCurrentCueIndex((prev) => Math.max(0, prev - 1));
      return;
    }
    if (activeIndex > 0) {
      const prevCard = series[activeIndex - 1];
      const prevCues = prevCard?.presentation?.cues ?? [];
      setCurrentCardId(prevCard.id);
      setCurrentCueIndex(Math.max(0, prevCues.length - 1));
    }
  }, [currentCueIndex, activeIndex, series]);

  const goNext = useCallback(() => {
    if (currentCueIndex < cues.length - 1) {
      setCurrentCueIndex((prev) => Math.min(cues.length - 1, prev + 1));
      return;
    }
    if (activeIndex < series.length - 1) {
      const nextCard = series[activeIndex + 1];
      setCurrentCardId(nextCard.id);
      setCurrentCueIndex(0);
    }
  }, [currentCueIndex, cues.length, activeIndex, series]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
      if (event.key === 'ArrowRight') {
        goNext();
      }
      if (event.key === 'ArrowLeft') {
        goPrev();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose, goNext, goPrev]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    if (!isOpen) {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      return;
    }
    const elem = document.documentElement as any;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(() => {});
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen();
    }
    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else if ((document as any).webkitFullscreenElement) {
        (document as any).webkitExitFullscreen?.();
      }
    };
  }, [isOpen]);

  if (!mounted || !isOpen || typeof document === 'undefined' || !activePresentation || cues.length === 0) {
    return null;
  }

  const currentCue = cues[currentCueIndex];

  return createPortal(
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
        gap: '16px',
      }}>
        <button
          type="button"
          onClick={goPrev}
          disabled={prevDisabled}
          style={{
            padding: '8px 16px',
            borderRadius: '999px',
            border: '1px solid rgba(203, 213, 225, 0.6)',
            background: prevDisabled ? 'rgba(148, 163, 184, 0.2)' : 'rgba(14, 165, 233, 0.25)',
            color: prevDisabled ? '#94a3b8' : '#e0f2fe',
            cursor: prevDisabled ? 'not-allowed' : 'pointer',
          }}
        >
          ← 上一步
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'center', flex: 1 }}>
          <span>{activePresentation.headline || activeCard.title}</span>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
            卡片 {activeIndex + 1} / {Math.max(1, series.length)} · 片段 {currentCueIndex + 1} / {cues.length}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={goNext}
            disabled={nextDisabled}
            style={{
              padding: '8px 16px',
              borderRadius: '999px',
              border: '1px solid rgba(203, 213, 225, 0.6)',
              background: nextDisabled ? 'rgba(148, 163, 184, 0.2)' : BRAND_PRIMARY,
              color: '#f8fafc',
              cursor: nextDisabled ? 'not-allowed' : 'pointer',
            }}
          >
            下一步 →
          </button>
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
      </div>

      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 80px',
      }}>
        <div style={{ maxWidth: '760px', width: '100%', textAlign: 'center' }}>
          <h2 style={{ fontSize: '40px', marginBottom: '20px', fontWeight: 600 }}>{currentCue.title}</h2>
          <p style={{ fontSize: '24px', lineHeight: 1.75, marginBottom: '28px' }}>{currentCue.narrative}</p>
          {currentCue.emphasis && (
            <p style={{ fontSize: '18px', color: '#93c5fd', marginBottom: '22px' }}>
              提示：{currentCue.emphasis}
            </p>
          )}
          {activePresentation.callToAction && nextDisabled && (
            <p style={{ fontSize: '18px', color: '#bbf7d0' }}>{activePresentation.callToAction}</p>
          )}
        </div>
      </div>

    </div>,
    document.body,
  );
}

function decodeStructuredSvg(dataUrl?: string | null): string | null {
  if (!dataUrl?.startsWith('data:image/svg+xml;base64,')) {
    return null;
  }
  try {
    const base64 = dataUrl.split(',')[1];
    if (!base64) {
      return null;
    }
    if (typeof window !== 'undefined' && window.atob) {
      return window.atob(base64);
    }
    return Buffer.from(base64, 'base64').toString('utf-8');
  } catch (error) {
    console.warn('解析辅助图示 SVG 失败', error);
    return null;
  }
}

const CARD_VISUAL_CACHE_PREFIX = 'card-visual-cache:';

function saveCardVisualCache(cardId: string, visual: VisualizationSpec, summary?: string) {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    const payload = {
      visual,
      summary,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(`${CARD_VISUAL_CACHE_PREFIX}${cardId}`, JSON.stringify(payload));
  } catch (error) {
    console.warn('写入辅助图示缓存失败', error);
  }
}

function loadCardVisualCache(cardId: string): VisualizationSpec | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = localStorage.getItem(`${CARD_VISUAL_CACHE_PREFIX}${cardId}`);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return parsed?.visual ?? null;
  } catch (error) {
    console.warn('读取辅助图示缓存失败', error);
    return null;
  }
}

function clearCardVisualCache(cardId: string) {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.removeItem(`${CARD_VISUAL_CACHE_PREFIX}${cardId}`);
  } catch (error) {
    console.warn('清理辅助图示缓存失败', error);
  }
}
