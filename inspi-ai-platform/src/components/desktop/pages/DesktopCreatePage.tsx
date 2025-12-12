'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import QRCode from 'qrcode';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * 现代化桌面端创作页面组件
 */

import { useLoginPrompt } from '@/components/auth/LoginPrompt';
import { GeneratedCard } from '@/components/cards/GeneratedCard';
import { exportElementToImage, DEFAULT_EXPORT_DIMENSIONS } from '@/lib/export/html-to-image';
import { buildProxiedImageUrl, needsProxying } from '@/lib/export/image-proxy';
import { shareToSocial, generateShareLink, trackShareEvent, type SharePlatform } from '@/lib/share/share-service';
import { env } from '@/shared/config/environment';
import { useAuth } from '@/shared/hooks/useAuth';
import type { CardType, TeachingCard, GenerateCardsResponse, VisualizationSpec } from '@/shared/types/teaching';

const CARD_TYPE_TO_RAW: Record<CardType, 'concept' | 'example' | 'practice' | 'extension'> = {
  visualization: 'concept',
  analogy: 'example',
  thinking: 'practice',
  interaction: 'extension',
};

interface RecentProjectSummary {
  id: string;
  title: string;
  updatedAt?: string;
  cardsCount: number;
  knowledgePoint?: string;
  subject?: string;
  gradeLevel?: string;
}

export function DesktopCreatePage() {
  const [formData, setFormData] = useState({
    content: '',
    subject: '',
    gradeLevel: '',
    cardTypes: ['visualization'] as CardType[],
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCards, setGeneratedCards] = useState<TeachingCard[]>([]);
  const [isSavingWork, setIsSavingWork] = useState(false);
  const [savedWorkId, setSavedWorkId] = useState<string | null>(null);
  const [saveWorkError, setSaveWorkError] = useState<string | null>(null);
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
  const [editingWorkId, setEditingWorkId] = useState<string | null>(null);
  const [loadingExistingWork, setLoadingExistingWork] = useState(false);
  const [loadExistingError, setLoadExistingError] = useState<string | null>(null);
  const [retryingCardId, setRetryingCardId] = useState<string | null>(null);
  const [quotaHint, setQuotaHint] = useState<string | null>(null);
  const [quotaErrorCount, setQuotaErrorCount] = useState(0);
  const [isShareMenuOpen, setShareMenuOpen] = useState(false);

  const handleCardVisualUpdate = useCallback(({ cardId, visual }: { cardId: string; visual: VisualizationSpec }) => {
    setGeneratedCards(prev => prev.map(card => (card.id === cardId ? { ...card, visual } : card)));
  }, []);

  const resolvedWorkId = editingWorkId || savedWorkId || undefined;
  const [isSharing, setIsSharing] = useState(false);
  const [shareQrCode, setShareQrCode] = useState('');
  const [recentProjects, setRecentProjects] = useState<RecentProjectSummary[]>([]);
  const actionMessageTimeoutRef = useRef<number | null>(null);
  const cardsContainerRef = useRef<HTMLDivElement>(null);
  const shareMenuRef = useRef<HTMLDivElement>(null);
  const sharePosterRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated } = useAuth();
  const { showPrompt, LoginPromptComponent } = useLoginPrompt();
  const router = useRouter();
  const shouldCompactForm = isFormCollapsed || isGenerating || generatedCards.length > 0;
  const searchParams = useSearchParams();
  const editWorkIdParam = searchParams?.get('edit');

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
    gap: 'var(--layout-card-gap)',
    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
  }),
  [],
);

const shareMenuOptions = useMemo(() => ([
  { platform: 'twitter' as SharePlatform, label: 'X', helper: '分享到 X' },
  { platform: 'weibo' as SharePlatform, label: '微博', helper: '发布到微博' },
  { platform: 'wechat' as SharePlatform, label: '朋友圈', helper: '生成二维码' },
]), []);

const shareBaseUrl = useMemo(() => {
  const configured = process.env.NEXT_PUBLIC_SHARE_BASE_URL || env.APP_URL || '';
  if (configured) {
    return configured.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'http://localhost:3000';
}, []);

const shareJoinUrl = `${shareBaseUrl}/signup`;
const sharePosterOffscreenStyle: React.CSSProperties = {
  position: 'fixed',
  top: '-200vh',
  left: '-200vw',
  pointerEvents: 'none',
  opacity: 0,
  zIndex: -1,
};
const sharePosterContainerStyle: React.CSSProperties = {
  width: `${DEFAULT_EXPORT_DIMENSIONS.width}px`,
  minHeight: '1200px',
  padding: '48px',
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
  background: 'linear-gradient(180deg, #fefaf5 0%, #ffffff 60%, #f5f3ff 100%)',
  color: '#0f172a',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif',
  borderRadius: '32px',
  boxShadow: '0 40px 120px rgba(15, 23, 42, 0.18)',
};

  const copyTextToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.focus();
      area.select();
      try {
        document.execCommand('copy');
        document.body.removeChild(area);
        return true;
      } catch (err) {
        document.body.removeChild(area);
        console.error('复制到剪贴板失败', err);
        return false;
      }
    }
  };

  const uploadShareImage = async (imageData: string, cardId: string) => {
    const response = await fetch('/api/share/upload-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageData, cardId }),
    });

    if (!response.ok) {
      throw new Error('分享图片上传失败');
    }

    return response.json() as Promise<{ success: boolean; imageUrl: string; filename: string }>;
  };

  const openSharePopup = (platform: SharePlatform): Window | null => {
    if (typeof window === 'undefined') {
      return null;
    }

    if (platform === 'wechat' || platform === 'qr-code' || platform === 'copy-link') {
      return null;
    }

    const width = 600;
    const height = 500;
    const dualScreenLeft = window.screenLeft ?? window.screenX ?? 0;
    const dualScreenTop = window.screenTop ?? window.screenY ?? 0;
    const left = dualScreenLeft + Math.max((window.outerWidth - width) / 2, 0);
    const top = dualScreenTop + Math.max((window.outerHeight - height) / 2, 0);

    return window.open('about:blank', '_blank', `width=${width},height=${height},left=${left},top=${top},noopener,noreferrer`);
  };

  const exportSharePosterImage = async () => {
    if (!sharePosterRef.current) {
      throw new Error('未准备分享海报');
    }

    return exportElementToImage(sharePosterRef.current, {
      format: 'png',
      scale: 2,
      backgroundColor: '#fdfaf5',
      width: sharePosterRef.current.scrollWidth || DEFAULT_EXPORT_DIMENSIONS.width,
      height: sharePosterRef.current.scrollHeight || DEFAULT_EXPORT_DIMENSIONS.height * 1.4,
    });
  };

  const prefillFromWork = (work: any) => {
    const workCards = Array.isArray(work?.cards) ? work.cards : [];
    setFormData({
      content: work?.knowledgePoint || work?.title || '',
      subject: work?.subject || '',
      gradeLevel: work?.gradeLevel || '',
      cardTypes: Array.from(
        new Set(
          (workCards as TeachingCard[]).map(card => card.type as CardType),
        ),
      ).filter(Boolean) as CardType[],
    });
    if (workCards.length > 0) {
      setGeneratedCards(workCards as TeachingCard[]);
    }
    setSavedWorkId(null);
    setEditingWorkId(work?._id || work?.id || null);
    setLastRequest({
      knowledgePoint: work?.knowledgePoint || work?.title || '',
      subject: work?.subject || '',
      gradeLevel: work?.gradeLevel || '',
    });
  };

  useEffect(() => {
    if (!editWorkIdParam) {
      setEditingWorkId(null);
      return;
    }

    if (!/^[a-fA-F0-9]{24}$/.test(editWorkIdParam)) {
      setEditingWorkId(null);
      setLoadExistingError('作品不存在或已被删除');
      setErrorMessage('作品不存在或已被删除');
      return;
    }

    const controller = new AbortController();
    const loadWork = async () => {
      setLoadingExistingWork(true);
      setLoadExistingError(null);
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
        const response = await fetch(`/api/works/${editWorkIdParam}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          credentials: 'include',
          signal: controller.signal,
        });
        const payload = await response.json();
        if (!response.ok || !payload?.success || !payload?.work) {
          throw new Error(payload?.error || '加载作品失败');
        }
        prefillFromWork(payload.work);
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : '加载作品失败';
        setLoadExistingError(message);
        setErrorMessage(message);
        setEditingWorkId(null);
      } finally {
        if (!controller.signal.aborted) {
          setLoadingExistingWork(false);
        }
      }
    };

    loadWork();

    return () => controller.abort();
  }, [editWorkIdParam]);

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

  const deriveDifficulty = (gradeLevel?: string) => {
    if (!gradeLevel) return 'beginner';
    if (/高中|大学/.test(gradeLevel)) return 'advanced';
    if (/初中/.test(gradeLevel)) return 'intermediate';
    return 'beginner';
  };

  const buildWorkPayload = () => {
    const trimmedContent = formData.content.trim();
    const title = trimmedContent.length >= 2 ? trimmedContent : '未命名教学作品';
    const description = `${formData.subject || '通用学科'} · ${formData.gradeLevel || '通用年级'} · Inspi.AI 自动生成`;
    const difficulty = deriveDifficulty(formData.gradeLevel);
    const estimatedTime = Math.min(90, Math.max(10, generatedCards.length * 8));
    const tags = formData.cardTypes.map(type => {
      const meta = cardTypes.find(item => item.id === type);
      return meta ? meta.name : type;
    });
    const cards = generatedCards.map(card => {
      const visualImage = card.visual?.imageUrl;
      const structuredStages = (card.visual as any)?.structured?.stages;
      const structuredImage = Array.isArray(structuredStages)
        ? structuredStages.find((stage: any) => typeof stage?.imageUrl === 'string' && stage.imageUrl.trim())?.imageUrl
        : undefined;
      const coverImage = visualImage || structuredImage || (card.metadata as any)?.coverImageUrl;

      return {
        id: card.id,
        type: card.type,
        title: card.title,
        content: card.content || card.explanation || '',
        explanation: card.explanation,
        metadata: {
          ...card.metadata,
          coverImageUrl: coverImage,
        },
        visual: card.visual,
        sop: card.sop,
        presentation: card.presentation,
        editable: true,
      };
    });

    return {
      title,
      description,
      knowledgePoint: trimmedContent,
      subject: formData.subject || '通用学科',
      gradeLevel: formData.gradeLevel || '通用年级',
      cards,
      tags,
      category: formData.subject || '教学创作',
      difficulty,
      estimatedTime,
      visibility: 'public' as const,
      allowReuse: true,
      allowComments: true,
    };
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

      const hasContent = normalizedCards.some(card => (
        (typeof card.content === 'string' && card.content.trim().length > 0)
        || (typeof card.explanation === 'string' && card.explanation.trim().length > 0)
      ));

      if (!hasContent) {
        setGeneratedCards([]);
        setIsFormCollapsed(false);
        setErrorMessage('生成失败：AI 未返回内容，请重试');
        setIsGenerating(false);
        return;
      }

      setGeneratedCards(normalizedCards);
      setLastRequest(fallbackContext);
      setQuotaHint(null);
      setQuotaErrorCount(0);
      setSavedWorkId(null);
      setSaveWorkError(null);

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

  const handleSaveWork = async () => {
    const loginPromptMessage = '登录后即可保存作品';

    if (!isAuthenticated) {
      showPrompt('create', loginPromptMessage);
      return;
    }

    if (generatedCards.length === 0 || !formData.content.trim()) {
      setSaveWorkError('请先生成卡片并填写知识点');
      return;
    }

    setIsSavingWork(true);
    setSaveWorkError(null);

    try {
      const authToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      if (!authToken) {
        showPrompt('create', loginPromptMessage);
        throw new Error('登录状态已失效，请重新登录后再尝试保存');
      }

      const payload = buildWorkPayload();
      const targetUrl = editingWorkId ? `/api/works/${editingWorkId}` : '/api/works';
      const response = await fetch(targetUrl, {
        method: editingWorkId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result?.success || !result.work) {
        throw new Error(result?.error || '保存作品失败');
      }

      const workId = result.work._id || result.work.id || editingWorkId || null;
      setSavedWorkId(workId);
      if (!editingWorkId && workId) {
        setEditingWorkId(workId);
      }
      showActionFeedback(editingWorkId ? '作品已更新' : '已保存到作品中心');
    } catch (error) {
      const message = error instanceof Error ? error.message : '保存作品失败';
      setSaveWorkError(message);
    } finally {
      setIsSavingWork(false);
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

  const handleShareButtonClick = () => {
    if (generatedCards.length === 0) {
      return;
    }
    setShareMenuOpen(prev => !prev);
  };

  const handleShareOptionClick = async (platform: SharePlatform) => {
    if (generatedCards.length === 0) {
      return;
    }

    const targetCard = generatedCards[0];
    setIsSharing(true);
    const sharePopup = openSharePopup(platform);

    try {
      const posterImage = await exportSharePosterImage();
      const uploaded = await uploadShareImage(posterImage.dataUrl, targetCard.id);
      const shareUrl = await generateShareLink(targetCard.id, targetCard);
      const fallbackText = targetCard.content || targetCard.explanation || '';

      const shareContent = {
        title: targetCard.title || '我用AI创建了一张教学卡片',
        description: fallbackText.substring(0, 80) || '快来看我生成的教学灵感卡片',
        url: shareUrl,
        imageUrl: uploaded?.imageUrl,
        hashtags: ['AI教学', '教育创新', 'InspiAI'],
      };

      const shareHost = shareUrl ? new URL(shareUrl).hostname : '';
      const isLocalShareHost = ['localhost', '127.0.0.1'].includes(shareHost);

      if (isLocalShareHost) {
        await copyTextToClipboard(shareUrl);
        showActionFeedback('当前分享链接指向本地环境，外部设备可能无法访问');
      }

      await shareToSocial({ platform, content: shareContent, shareWindow: sharePopup });
      await trackShareEvent(targetCard.id, platform);
      if (!isLocalShareHost) {
        showActionFeedback('分享链接已生成');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '网络异常';
      if (sharePopup && !sharePopup.closed) {
        sharePopup.close();
      }
      showActionFeedback(`分享失败：${message}`);
    } finally {
      setIsSharing(false);
      setShareMenuOpen(false);
    }
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
    if (!isShareMenuOpen) {
      return undefined;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!shareMenuRef.current) {
        return;
      }
      if (!shareMenuRef.current.contains(event.target as Node)) {
        setShareMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isShareMenuOpen]);

  useEffect(() => {
    if (generatedCards.length === 0 && isShareMenuOpen) {
      setShareMenuOpen(false);
    }
  }, [generatedCards.length, isShareMenuOpen]);

  useEffect(() => {
    let aborted = false;

    if (!isAuthenticated) {
      setRecentProjects([]);
      return () => {
        aborted = true;
      };
    }

    const fetchRecentProjects = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
        const response = await fetch('/api/profile/works?status=all&limit=3', {
          credentials: 'include',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        if (response.status === 401) {
          if (!aborted) {
            setRecentProjects([]);
          }
          return;
        }

        if (!response.ok) {
          throw new Error('最近项目加载失败');
        }

        const data = await response.json();

        if (!data?.success || !Array.isArray(data.works)) {
          if (!aborted) {
            setRecentProjects([]);
          }
          return;
        }

        const projects: RecentProjectSummary[] = data.works
          .map((work: any) => ({
            id: work._id || work.id || '',
            title: work.title || work.knowledgePoint || '未命名作品',
            updatedAt: work.updatedAt || work.createdAt,
            cardsCount: Array.isArray(work.cards)
              ? work.cards.length
              : typeof work.cardsCount === 'number'
                ? work.cardsCount
                : 0,
            knowledgePoint: work.knowledgePoint,
            subject: work.subject,
            gradeLevel: work.gradeLevel,
          }))
          .filter(project => project.id && project.title);

        if (!aborted) {
          setRecentProjects(projects);
        }
      } catch (error) {
        if (!aborted) {
          setRecentProjects([]);
        }
      }
    };

    fetchRecentProjects();

    return () => {
      aborted = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    let cancelled = false;
    if (generatedCards.length === 0) {
      setShareQrCode('');
      return () => {
        cancelled = true;
      };
    }

    QRCode.toDataURL(shareJoinUrl, {
      width: 160,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    })
      .then((dataUrl) => {
        if (!cancelled) {
          setShareQrCode(dataUrl);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setShareQrCode('');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [generatedCards.length, shareJoinUrl]);

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

  useEffect(() => {
    setSavedWorkId(null);
    setSaveWorkError(null);
  }, [formData.content, formData.subject, formData.gradeLevel]);

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

  const handleApplyRecentProject = (project: RecentProjectSummary) => {
    setFormData((prev) => ({
      ...prev,
      content: project.knowledgePoint || project.title || prev.content,
      subject: project.subject || '',
      gradeLevel: project.gradeLevel || '',
    }));
    setIsFormCollapsed(false);
  };

  const isGenerateDisabled =
    !formData.content || formData.cardTypes.length === 0 || isGenerating;

  const sharePosterCard = generatedCards[0];
  const sharePosterExcerpt = sharePosterCard?.content
    ? sharePosterCard.content.replace(/[#*>\-]/g, '').replace(/\n+/g, ' ').trim().slice(0, 160)
    : sharePosterCard?.explanation?.slice(0, 160) ?? '';
  const sharePosterImageUrl = (sharePosterCard as any)?.visual?.imageUrl || (sharePosterCard as any)?.coverImage || '';
  const sharePosterImageSrc = useMemo(() => {
    if (!sharePosterImageUrl) {
      return '';
    }

    try {
      const currentOrigin = typeof window !== 'undefined' ? window.location.origin : undefined;
      const { shouldProxy, targetUrl } = needsProxying(sharePosterImageUrl, currentOrigin);
      if (shouldProxy && targetUrl) {
        return buildProxiedImageUrl(targetUrl);
      }
    } catch (error) {
      // 忽略解析错误，直接返回原始图片地址
    }

    return sharePosterImageUrl;
  }, [sharePosterImageUrl]);

  const horizontalPadding = 'var(--layout-page-padding)';
  const sectionGap = 'calc(var(--layout-section-gap) * 0.22)';
  const moduleGap = 'var(--layout-panel-gap)';
  const heroPadding = 'calc(var(--layout-hero-padding-y) * 0.75) var(--layout-hero-padding-x)';
  const panelRadius = 'var(--layout-panel-radius)';
  const cardGap = 'var(--layout-card-gap)';
  const cardPadding = 'var(--layout-card-padding)';
  const mainPadding = 'var(--layout-main-padding)';
  const sidebarWidth = 'var(--layout-sidebar-width)';

  const pageBackgroundStyle: React.CSSProperties = {
    width: '100%',
    minHeight: 'calc(100vh - 80px)',
    background: 'linear-gradient(180deg, #f5f3ff 0%, #f0f9ff 35%, #ffffff 100%)',
    paddingTop: 'calc(var(--layout-section-gap) * 0.32)',
    paddingBottom: 'calc(var(--layout-section-gap) * 0.11)',
    paddingLeft: horizontalPadding,
    paddingRight: horizontalPadding,
    overflowY: 'auto',
    boxSizing: 'border-box',
  };

  const constrainedLayoutStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: sectionGap,
  };

  const contentLayoutStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '100%',
    display: 'flex',
    gap: moduleGap,
    alignItems: 'flex-start',
    boxSizing: 'border-box',
  };

  const heroSectionStyle: React.CSSProperties = {
    width: '100%',
    padding: 'calc(var(--layout-hero-padding-y) * 0.5) var(--layout-hero-padding-x)',
    borderRadius: 'calc(var(--layout-panel-radius) * 0.35)',
    background: 'linear-gradient(120deg, rgba(99,102,241,0.1) 0%, rgba(14,165,233,0.06) 40%, rgba(255,255,255,0) 100%)',
    border: '1px solid rgba(148,163,184,0.2)',
    boxShadow: 'none',
    position: 'relative',
    overflow: 'hidden',
    boxSizing: 'border-box',
  };

  const resultsPaddingTop = 'calc((var(--layout-main-padding) + 10px) * 0.5)';
  const resultsPaddingX = 'calc(var(--layout-main-padding) + 16px)';
  const resultsPaddingBottom = 'calc(var(--layout-main-padding) * 2)';

  const heroTextWrapperStyle: React.CSSProperties = {
    position: 'relative',
    zIndex: 1,
    maxWidth: 'min(1100px, 100%)',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 'var(--space-3)',
    color: '#0f172a',
  };

  return (
    <React.Fragment>
      <LoginPromptComponent />
      <div style={pageBackgroundStyle}>
        <div style={{ ...constrainedLayoutStyle, marginBottom: 0 }}>
          <div style={{ marginBottom: 'calc(var(--layout-section-gap) * 0.028)' }}>
          <div style={heroSectionStyle}>
            <div style={heroTextWrapperStyle}>
              <h1
                style={{
                  fontSize: '24px',
                  fontWeight: 800,
                  margin: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                AI教学魔法师工作区
                <span style={{ fontSize: 'var(--font-size-lg)', color: '#1f2937', fontWeight: 500 }}>
                  输入一个知识点，即可自动获得图文并茂的教学灵感、课堂互动与 SOP。
                </span>
              </h1>
            </div>
          </div>
          </div>
            <div style={{ ...contentLayoutStyle, marginTop: 'calc(var(--layout-section-gap) * 0.012)' }}>
            {/* 侧边栏 - 信息卡 */}
          <aside style={{
            width: sidebarWidth,
            flexShrink: 0,
            background: '#ffffff',
            borderRadius: 'calc(var(--layout-panel-radius) * 0.7)',
            padding: 'calc(var(--layout-card-padding) * 1.4) var(--layout-card-padding) calc(var(--layout-card-padding) * 1.8)',
            boxShadow: '0 25px 65px rgba(15, 23, 42, 0.08)',
          }}>
          {/* 最近项目 */}
          {recentProjects.length > 0 && (
            <div style={{ marginBottom: 'calc(var(--layout-card-gap) * 0.55)' }}>
              <h3 style={{
                fontSize: 'var(--font-size-base)',
                fontWeight: '700',
                color: 'var(--gray-900)',
                marginBottom: 'calc(var(--layout-card-gap) * 0.25)',
              }}>
                最近项目
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--layout-card-gap) * 0.25)' }}>
                {recentProjects.map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => handleApplyRecentProject(project)}
                    className="modern-card"
                    style={{
                      width: '100%',
                      padding: 'calc(var(--layout-card-padding) * 0.75)',
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
                      fontWeight: 600,
                      fontSize: 'var(--font-size-base)',
                      color: 'var(--gray-900)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}>
                      <span>{project.title}</span>
                      {project.subject ? (
                        <span style={{ fontSize: 'var(--font-size-sm)', color: '#64748b' }}>{project.subject}</span>
                      ) : null}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--gray-500)' }}>
                      {project.cardsCount || 0} 张卡片
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 推荐模板 */}
          <div style={{ marginBottom: 'calc(var(--layout-card-gap) * 0.75)' }}>
            <h3 style={{
              fontSize: 'var(--font-size-base)',
              fontWeight: '700',
              color: 'var(--gray-900)',
              marginBottom: 'calc(var(--layout-card-gap) * 0.4)',
            }}>
              推荐模板
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--layout-card-gap) * 0.25)' }}>
              {templates.map((template) => {
                const isActive = selectedTemplate === template.id;
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => applyTemplate(template.id)}
                    className="modern-card"
                    style={{
                      padding: 'calc(var(--layout-card-padding) * 0.75)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all var(--transition-base)',
                      border: isActive ? '2px solid #3b82f6' : '1px solid var(--gray-200)',
                      background: isActive ? '#eff6ff' : 'white',
                    }}
                  >
                    <div style={{
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: '600',
                      color: 'var(--gray-900)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 'calc(var(--layout-card-gap) * 0.3)',
                    }}>
                      <span>{template.name}</span>
                      <span style={{
                        fontSize: 'var(--font-size-xs)',
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
                fontSize: 'var(--font-size-base)',
                fontWeight: '700',
                color: 'var(--gray-900)',
                marginBottom: 'calc(var(--layout-card-gap) * 0.4)',
              }}>
                使用小贴士
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--layout-card-gap) * 0.25)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                  <span style={{ fontSize: 'var(--font-size-sm)' }}>💡</span>
                  <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--gray-600)', lineHeight: '1.5' }}>
                    详细描述知识点，AI会生成更精准的内容
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                  <span style={{ fontSize: 'var(--font-size-sm)' }}>🎯</span>
                  <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--gray-600)', lineHeight: '1.5' }}>
                    选择合适的学科和学段
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                  <span style={{ fontSize: 'var(--font-size-sm)' }}>✨</span>
                  <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--gray-600)', lineHeight: '1.5' }}>
                    多选卡片类型，构建完整教学体系
                  </span>
                </div>
              </div>
            </div>
          )}
          </aside>

          {/* 主内容区 - 居中卡片 */}
          <main
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              background: 'rgba(255,255,255,0.92)',
              borderRadius: panelRadius,
              boxShadow: '0 35px 120px rgba(15, 23, 42, 0.15)',
              overflow: 'hidden',
            }}
          >
          {/* 上部：输入区域 */}
          {isFormCollapsed ? (
            <div
              style={{
                padding: 'calc(var(--layout-panel-padding-y) * 0.8) var(--layout-panel-padding-x)',
                background: 'rgba(255,255,255,0.9)',
                borderBottom: '1px solid rgba(148,163,184,0.25)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 'calc(var(--layout-card-gap) * 0.35)',
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
                  border: '1px solid rgba(148,163,184,0.35)',
                  borderRadius: '999px',
                  background: '#fff',
                  padding: 'var(--layout-card-padding) calc(var(--layout-card-padding) * 1.3)',
                  fontSize: 'var(--font-size-xs)',
                  color: '#64748b',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 'calc(var(--layout-card-gap) * 0.2)',
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
                padding: 'calc(var(--layout-panel-padding-y) * 0.5) var(--layout-panel-padding-x) calc(var(--layout-panel-padding-y) * 0.5)',
                background: 'rgba(255,255,255,0.95)',
                borderBottom: '1px solid rgba(148,163,184,0.25)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 'calc(var(--layout-card-gap) * 0.5)',
                  gap: 'calc(var(--layout-card-gap) * 0.35)',
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
                    border: '1px solid rgba(148,163,184,0.35)',
                    borderRadius: '999px',
                    background: '#fff',
                    padding: 'var(--layout-card-padding) calc(var(--layout-card-padding) * 1.3)',
                    fontSize: 'var(--font-size-xs)',
                    color: '#64748b',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 'calc(var(--layout-card-gap) * 0.2)',
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

              <div style={{ marginBottom: 'calc(var(--layout-card-gap) * 0.65)' }}>
                {(() => {
                  const lateralGap = 'calc(var(--layout-card-gap) * 0.8)';
                  const tripleGap = `calc(${lateralGap} * 3)`;
                  const rightColumnWidth = `calc((100% - ${tripleGap}) / 4)`;
                  const leftColumnWidth = `calc(100% - (${lateralGap} + ${rightColumnWidth}))`;
                  const controlGap = 'calc(var(--layout-card-gap) * 0.45)';
                  const selectStyle = {
                    fontSize: 'var(--font-size-sm)',
                    padding: 'calc(var(--layout-card-padding) * 0.4) calc(var(--layout-card-padding) * 0.8)',
                    width: '220px',
                    maxWidth: '100%',
                  } as React.CSSProperties;

                  return (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: `minmax(0, ${leftColumnWidth}) minmax(280px, ${rightColumnWidth})`,
                      gap: lateralGap,
                      alignItems: 'start',
                      width: '100%',
                    }}>
                      <div className="modern-form-group" style={{ marginBottom: 0 }}>
                        <textarea
                          className="modern-input"
                          style={{
                            fontSize: 'var(--font-size-base)',
                            minHeight: '104px',
                            width: '100%',
                            resize: 'none',
                          }}
                          placeholder="请表述你要教授的知识点，比如“光合作用”、“三角形”"
                          value={formData.content}
                          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                          required
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--layout-card-gap) * 0.3)' }}>
                        <div className="modern-form-group" style={{ marginBottom: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: controlGap }}>
                            <label className="modern-label" style={{ fontSize: 'var(--font-size-sm)', marginBottom: 0, whiteSpace: 'nowrap' }}>学科</label>
                            <select
                              className="modern-input"
                              style={selectStyle}
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: controlGap }}>
                            <label className="modern-label" style={{ fontSize: 'var(--font-size-sm)', marginBottom: 0, whiteSpace: 'nowrap' }}>学段</label>
                            <select
                              className="modern-input"
                              style={selectStyle}
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
                  );
                })()}
              </div>

              <div style={{ marginBottom: 'calc(var(--layout-card-gap) * 0.65)' }}>
                <div style={{ display: 'flex', gap: 'calc(var(--layout-card-gap) * 0.4)' }}>
                  {cardTypes.map((type) => (
                    <div
                      key={type.id}
                      onClick={() => toggleCardType(type.id)}
                      style={{
                        flex: 1,
                        padding: cardPadding,
                        cursor: 'pointer',
                        border: formData.cardTypes.includes(type.id)
                          ? '2px solid var(--primary-500)'
                          : '1px solid var(--gray-200)',
                        borderRadius: 'calc(var(--layout-panel-radius) * 0.25)',
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
                          top: 'calc(var(--layout-card-padding) * 0.6)',
                          right: 'calc(var(--layout-card-padding) * 0.6)',
                          width: 'calc(var(--layout-card-padding) * 1.4)',
                          height: 'calc(var(--layout-card-padding) * 1.4)',
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
                        fontSize: 'var(--font-size-base)',
                        fontWeight: '600',
                        color: 'var(--gray-900)',
                        marginBottom: '6px',
                      }}>
                        {type.name}
                      </h4>
                      <p style={{
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--gray-600)',
                        lineHeight: '1.5',
                      }}>
                        {type.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ textAlign: 'center' }}>
                {errorMessage && (
                  <div style={{ marginBottom: '12px' }}>
                    <p style={{
                      color: '#dc2626',
                      fontSize: '13px',
                      marginBottom: '8px',
                    }}>
                      {errorMessage}
                    </p>
                    <button
                      type="button"
                      className="modern-btn modern-btn-secondary"
                      onClick={handleGenerate}
                      disabled={isGenerating}
                      style={{ fontSize: '12px', padding: '6px 16px' }}
                    >
                      {isGenerating ? '重新生成中...' : '重试生成'}
                    </button>
                  </div>
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
              padding: `${resultsPaddingTop} ${resultsPaddingX} ${resultsPaddingBottom}`,
              position: 'relative',
            }}
          >
            {showNewCardsToast && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(var(--layout-card-gap) * 0.7)',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgba(13,148,136,0.92)',
                  color: '#fff',
                  padding: 'calc(var(--layout-card-padding) * 0.7) calc(var(--layout-card-padding) * 1.4)',
                  borderRadius: '999px',
                  fontSize: 'var(--font-size-sm)',
                  boxShadow: '0 18px 36px rgba(13,148,136,0.35)',
                  zIndex: 6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'calc(var(--layout-card-gap) * 0.3)',
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
                marginBottom: 'calc(var(--layout-card-gap) * 0.275)',
                paddingBottom: 'calc(var(--layout-card-gap) * 0.225)',
                background: 'linear-gradient(180deg, rgba(248,250,252,0.96) 0%, rgba(248,250,252,0.86) 70%, rgba(248,250,252,0) 100%)',
                backdropFilter: 'blur(6px)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 'calc(var(--layout-card-gap) * 0.5)',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(var(--layout-card-gap) * 0.35)', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={toggleFormCollapsed}
                    style={{
                      border: '1px solid var(--gray-200)',
                      borderRadius: 'calc(var(--layout-panel-radius) * 0.25)',
                      background: '#fff',
                      padding: 'calc(var(--layout-card-padding) * 0.5) calc(var(--layout-card-padding) * 0.9)',
                      fontSize: 'var(--font-size-xs)',
                      color: '#64748b',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 'calc(var(--layout-card-gap) * 0.2)',
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(var(--layout-card-gap) * 0.3)' }}>
                    <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, color: 'var(--gray-900)', margin: 0 }}>
                      生成结果
                    </h2>
                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--gray-500)' }}>
                      {generatedCards.length} 张卡片
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'calc(var(--layout-card-gap) * 0.25)',
                    flexWrap: 'wrap',
                    justifyContent: 'flex-end',
                  }}
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 'calc(var(--layout-card-gap) * 0.25)', flexWrap: 'wrap' }}>
                    <div
                      ref={shareMenuRef}
                      style={{ position: 'relative', display: 'inline-flex' }}
                    >
                      <button
                        type="button"
                        onClick={handleShareButtonClick}
                        disabled={generatedCards.length === 0 || isSharing}
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
                        title="分享到社交媒体"
                      >
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                          <path d="M14 6a2 2 0 100-4 2 2 0 000 4zM14 16a2 2 0 100-4 2 2 0 000 4zM4 11a2 2 0 100-4 2 2 0 000 4z" fill="currentColor"/>
                          <path d="M5.5 9.5l7-3M5.5 8.5l7 3" stroke="currentColor" strokeWidth="1.5"/>
                        </svg>
                      </button>
                      {isShareMenuOpen && generatedCards.length > 0 && (
                        <div
                          style={{
                            position: 'absolute',
                            top: 'calc(100% + 8px)',
                            right: 0,
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            boxShadow: '0 20px 40px rgba(15, 23, 42, 0.18)',
                            padding: '10px',
                            minWidth: '180px',
                            zIndex: 20,
                          }}
                        >
                          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                            选择分享渠道
                          </div>
                          {shareMenuOptions.map(option => (
                            <button
                              key={option.platform}
                              type="button"
                              onClick={() => handleShareOptionClick(option.platform)}
                              disabled={isSharing}
                              style={{
                                width: '100%',
                                textAlign: 'left',
                                border: 'none',
                                background: 'transparent',
                                padding: '8px 6px',
                                borderRadius: '8px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '2px',
                                color: '#0f172a',
                                cursor: 'pointer',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#f1f5f9';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                            >
                              <span style={{ fontWeight: 600 }}>{option.label}</span>
                              <span style={{ fontSize: '12px', color: '#64748b' }}>{option.helper}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
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
                  <button
                    type="button"
                    onClick={handleSaveWork}
                    disabled={generatedCards.length === 0 || isSavingWork || Boolean(savedWorkId)}
                    style={{
                      padding: '0 16px',
                      minWidth: '120px',
                      height: '36px',
                      borderRadius: '8px',
                      border: 'none',
                      background: generatedCards.length === 0 || savedWorkId ? 'var(--gray-200)' : '#2563eb',
                      color: savedWorkId ? '#0f172a' : '#fff',
                      cursor: generatedCards.length === 0 || savedWorkId ? 'not-allowed' : 'pointer',
                      fontWeight: 600,
                      fontSize: '13px',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {savedWorkId ? '已保存' : isSavingWork ? '保存中...' : '保存为作品'}
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
              {saveWorkError && (
                <div
                  style={{
                    marginTop: '10px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(248, 113, 113, 0.12)',
                    color: '#b91c1c',
                    fontSize: 'var(--font-size-sm)',
                  }}
                >
                  {saveWorkError}
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
                    onVisualUpdate={handleCardVisualUpdate}
                    workId={resolvedWorkId}
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
              <div className="modern-card" style={{ textAlign: 'center', padding: '32px 0', border: '1px dashed var(--gray-200)', borderRadius: 'var(--radius-lg)', background: 'var(--gray-50)' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>📝</div>
                <h3 style={{ fontSize: '18px', color: 'var(--gray-800)', marginBottom: '6px' }}>请先选择卡片类型</h3>
                <p style={{ color: 'var(--gray-600)', fontSize: 'var(--font-size-sm)', marginBottom: '16px' }}>
                  选择 1 种以上卡片类型，即可点击按钮生成教学灵感。
                </p>
                <div style={{ display: 'inline-flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {cardTypes.map(type => (
                    <span key={type.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 10px', background: '#fff', borderRadius: '999px', fontSize: 'var(--font-size-sm)', color: 'var(--gray-600)' }}>
                      {type.icon} {type.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
      </div>
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
              <GeneratedCard
                card={generatedCards[galleryIndex]}
                className="gallery-card"
                onVisualUpdate={handleCardVisualUpdate}
                workId={resolvedWorkId}
              />
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
      {sharePosterCard && (
        <div aria-hidden style={sharePosterOffscreenStyle}>
          <div ref={sharePosterRef} style={sharePosterContainerStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 600, color: '#6366f1' }}>Inspi.AI 教学灵感</div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                {new Date().toLocaleDateString()} · {sharePosterCard.type === 'visualization' ? '可视化卡' : '教学卡'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '24px', marginTop: '16px', alignItems: 'stretch' }}>
              <div style={{
                flex: '1 1 65%',
                background: '#ffffff',
                borderRadius: '24px',
                padding: '32px',
                boxShadow: '0 20px 60px rgba(15,23,42,0.12)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '12px', color: '#475569' }}>
                  {sharePosterCard.metadata?.subject && (
                    <span style={{ padding: '4px 10px', borderRadius: '999px', background: '#eef2ff', color: '#4338ca' }}>
                      {sharePosterCard.metadata.subject}
                    </span>
                  )}
                  {sharePosterCard.metadata?.gradeLevel && (
                    <span style={{ padding: '4px 10px', borderRadius: '999px', background: '#ecfdf3', color: '#059669' }}>
                      {sharePosterCard.metadata.gradeLevel}
                    </span>
                  )}
                  <span style={{ padding: '4px 10px', borderRadius: '999px', background: '#fef3c7', color: '#b45309' }}>
                    {cardTypes.find(type => type.id === sharePosterCard.type)?.name || 'AI 教学卡'}
                  </span>
                </div>
                <div>
                  <h3 style={{ fontSize: '28px', margin: '0 0 12px 0' }}>{sharePosterCard.title}</h3>
                  <p style={{ fontSize: '15px', lineHeight: 1.7, color: '#475569', margin: 0 }}>{sharePosterExcerpt}</p>
                </div>
                {sharePosterImageSrc ? (
                  <div style={{ borderRadius: '20px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(15,23,42,0.12)' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={sharePosterImageSrc}
                      alt="卡片插图"
                      style={{ width: '100%', height: '260px', objectFit: 'cover' }}
                      crossOrigin="anonymous"
                    />
                  </div>
                ) : null}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '8px' }}>
                  {(sharePosterCard.metadata?.knowledgePoint || sharePosterCard.explanation) && (
                    <div style={{
                      flex: '1 1 60%',
                      background: '#f8fafc',
                      borderRadius: '16px',
                      padding: '16px',
                      fontSize: '13px',
                      color: '#475569',
                      lineHeight: 1.6,
                    }}>
                      <strong style={{ display: 'block', marginBottom: '6px', color: '#1e293b' }}>知识点亮点</strong>
                      {sharePosterCard.metadata?.knowledgePoint || sharePosterCard.explanation}
                    </div>
                  )}
                </div>
              </div>
              <div style={{
                width: '240px',
                background: '#0f172a',
                color: '#f8fafc',
                borderRadius: '24px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
              }}>
                <div style={{ fontSize: '14px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#a5b4fc' }}>扫码加入</div>
                {shareQrCode ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={shareQrCode} alt="加入平台二维码" style={{ width: '180px', height: '180px' }} />
                ) : (
                  <div style={{ width: '180px', height: '180px', borderRadius: '16px', background: '#1e293b' }} />
                )}
                <div style={{ fontSize: '13px', color: '#c7d2fe', textAlign: 'center' }}>
                  Inspi.AI 教学魔法平台
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', wordBreak: 'break-all' }}>
                  {shareJoinUrl}
                </div>
              </div>
            </div>
            <div style={{
              padding: '18px 24px',
              borderRadius: '20px',
              background: '#111827',
              color: '#e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '6px',
            }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 600 }}>Inspi.AI · AI赋能教学革新</div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                  让灵感即刻变成课堂资源 · 扫码开启你的教学魔法
                </div>
              </div>
              <div style={{ fontSize: '12px', color: '#cbd5f5' }}>{shareBaseUrl.replace(/^https?:\/\//, '')}</div>
            </div>
          </div>
        </div>
      )}
    </React.Fragment>
  );
}

function formatRelativeTimeFromNow(input?: string): string {
  if (!input) {
    return '';
  }

  const timestamp = new Date(input).getTime();
  if (Number.isNaN(timestamp)) {
    return '';
  }

  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return '刚刚';
  if (diffMinutes < 60) return `${diffMinutes} 分钟前`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} 小时前`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays} 天前`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} 个月前`;
  const diffYears = Math.floor(diffMonths / 12);
  return `${diffYears} 年前`;
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
