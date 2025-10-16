'use client';

import React, { useEffect, useRef, useState } from 'react';

import {
  exportElementToImage,
  downloadImage,
  copyImageToClipboard,
  exportPresets,
  type ExportOptions,
} from '@/lib/export/html-to-image';
import {
  shareToSocial,
  generateShareLink,
  trackShareEvent,
  type ShareContent,
  type SharePlatform,
} from '@/lib/share/share-service';

interface ExportSharePanelProps {
  cardElement: HTMLElement | null;
  cardData: {
    id: string;
    title: string;
    content: string;
    type: string;
  };
  className?: string;
  prepareExportElement?: () => Promise<HTMLElement | null>;
  finalizeExport?: () => void;
  onPreview?: () => void;
}

export function ExportSharePanel({
  cardElement,
  cardData,
  className = '',
  prepareExportElement,
  finalizeExport,
  onPreview,
}: ExportSharePanelProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [exportProgress, setExportProgress] = useState('');
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [showMoreActions, setShowMoreActions] = useState(false);
  const moreActionsRef = useRef<HTMLDivElement>(null);

  const showFeedback = (type: 'success' | 'error' | 'info', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3000);
  };

  useEffect(() => {
    if (!showMoreActions) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!moreActionsRef.current) return;
      if (!moreActionsRef.current.contains(event.target as Node)) {
        setShowMoreActions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMoreActions]);

  const resolveExportTarget = async (): Promise<{ target: HTMLElement | null; prepared: boolean }> => {
    if (prepareExportElement) {
      const target = await prepareExportElement();
      return { target, prepared: true };
    }

    return { target: cardElement, prepared: false };
  };

  /**
   * 导出图片
   */
  const handleExport = async (presetKey: keyof typeof exportPresets) => {
    setShowMoreActions(false);
    setIsExporting(true);
    setExportProgress('准备导出...');

    let prepared = false;

    try {
      const options = exportPresets[presetKey];
      setExportProgress('正在生成图片...');

      const { target, prepared: didPrepare } = await resolveExportTarget();
      prepared = prepared || didPrepare;

      if (!target) {
        throw new Error('未找到可导出的卡片区域');
      }

      const result = await exportElementToImage(target, options);

      setExportProgress('准备下载...');
      downloadImage(result);

      setExportProgress('导出完成！');

      showFeedback('success', '图片已保存');

    } catch (error) {
      showFeedback('error', `导出失败：${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      if (prepared && finalizeExport) {
        finalizeExport();
      }
      setIsExporting(false);
      setTimeout(() => setExportProgress(''), 2000);
    }
  };

  /**
   * 复制图片到剪贴板
   */
  const handleCopyImage = async () => {
    setIsExporting(true);
    setExportProgress('正在复制到剪贴板...');

    let prepared = false;

    try {
      const { target, prepared: didPrepare } = await resolveExportTarget();
      prepared = prepared || didPrepare;

      if (!target) {
        throw new Error('未找到可导出的卡片区域');
      }

      const result = await exportElementToImage(target, exportPresets.social);
      await copyImageToClipboard(result);
      setExportProgress('已复制到剪贴板！');
      showFeedback('success', '卡片已复制到剪贴板');
    } catch (error) {
      showFeedback('error', `复制失败：${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      if (prepared && finalizeExport) {
        finalizeExport();
      }
      setIsExporting(false);
      setTimeout(() => setExportProgress(''), 2000);
    }
  };

  /**
   * 分享到社交媒体
   */
  const handleShare = async (platform: SharePlatform) => {
    setIsSharing(true);

    let prepared = false;

    try {
      // 生成分享链接
      const shareUrl = await generateShareLink(cardData.id, cardData);

      // 准备分享内容
      const shareContent: ShareContent = {
        title: cardData.title || '我用AI创建了一张教学卡片',
        description: `${cardData.content.substring(0, 100)}...`,
        url: shareUrl,
        hashtags: ['AI教学', '教育创新', 'InspiAI'],
      };

      // 如果需要图片，先导出
      if (['weibo', 'qq'].includes(platform)) {
        setExportProgress('正在生成分享图片...');
        const { target, prepared: didPrepare } = await resolveExportTarget();
        prepared = prepared || didPrepare;

        if (!target) {
          throw new Error('未找到可导出的卡片区域');
        }

        const result = await exportElementToImage(target, exportPresets.social);

        // 这里需要上传图片到服务器获取公开URL
        // 暂时使用本地DataURL (某些平台可能不支持)
        shareContent.imageUrl = result.dataUrl;
      }

      // 执行分享
      await shareToSocial({ platform, content: shareContent });

      // 记录分享事件
      await trackShareEvent(cardData.id, platform);
      showFeedback('success', '分享链接已生成');

    } catch (error) {
      showFeedback('error', `分享失败：${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      if (prepared && finalizeExport) {
        finalizeExport();
      }
      setIsSharing(false);
      setExportProgress('');
    }
  };

  return (
    <div className={`export-share-panel ${className}`} style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button
          onClick={() => handleExport('social')}
          disabled={isExporting || (!cardElement && !prepareExportElement)}
          style={{
            padding: '8px 16px',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: isExporting ? 'not-allowed' : 'pointer',
            opacity: isExporting ? 0.7 : 1,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (!isExporting) {
              e.currentTarget.style.backgroundColor = '#1d4ed8';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#2563eb';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 10L4 6h8l-4 4z" fill="currentColor"/>
            <path d="M3 12h10v2H3v-2z" fill="currentColor"/>
          </svg>
          {isExporting ? '导出中...' : '下载图片'}
        </button>

        <div ref={moreActionsRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setShowMoreActions(prev => !prev)}
            disabled={isExporting}
            style={{
              padding: '8px',
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
            title="更多操作"
          >
            ⋯
          </button>

          {showMoreActions && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                right: 0,
                minWidth: '160px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                padding: '4px',
                zIndex: 20,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setShowMoreActions(false);
                  handleCopyImage();
                }}
                disabled={isExporting}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: 'none',
                  borderRadius: '6px',
                  background: 'transparent',
                  textAlign: 'left',
                  fontSize: '13px',
                  color: '#475569',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f1f5f9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M10 1H3a2 2 0 00-2 2v7h2V3h7V1z" fill="currentColor"/>
                  <rect x="5" y="5" width="8" height="8" rx="1" fill="currentColor"/>
                </svg>
                复制图片
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowMoreActions(false);
                  handleShare('wechat' as SharePlatform);
                }}
                disabled={isSharing}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: 'none',
                  borderRadius: '6px',
                  background: 'transparent',
                  textAlign: 'left',
                  fontSize: '13px',
                  color: '#475569',
                  cursor: isSharing ? 'not-allowed' : 'pointer',
                  opacity: isSharing ? 0.6 : 1,
                  transition: 'background 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                onMouseEnter={(e) => {
                  if (!isSharing) {
                    e.currentTarget.style.backgroundColor = '#f1f5f9';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M10.5 9.5a2 2 0 11-1.3-.48l-3.4-2a2 2 0 010-.04l3.4-2a2 2 0 11-.4-.96L5.4 6a2 2 0 100 2l3.4 2a2 2 0 111.7-.5z" fill="currentColor"/>
                </svg>
                分享微信
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowMoreActions(false);
                  if (onPreview) onPreview();
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: 'none',
                  borderRadius: '6px',
                  background: 'transparent',
                  textAlign: 'left',
                  fontSize: '13px',
                  color: '#475569',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f1f5f9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="2" y="3" width="10" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                  <path d="M4 1h6M7 11v2" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
                全屏预览
              </button>
            </div>
          )}
        </div>
      </div>

      {feedback && (
        <div
          style={{
            marginTop: '12px',
            padding: '10px 12px',
            borderRadius: '8px',
            fontSize: '13px',
            color: feedback.type === 'error' ? '#b91c1c' : '#0f172a',
            backgroundColor:
              feedback.type === 'error' ? '#fee2e2' : feedback.type === 'success' ? '#dcfce7' : '#e0f2fe',
          }}
        >
          {feedback.message}
        </div>
      )}

      {/* 进度提示 */}
      {exportProgress && (
        <div style={{
          marginTop: '8px',
          padding: '8px 12px',
          backgroundColor: '#f3f4f6',
          borderRadius: '6px',
          fontSize: '14px',
          color: '#374151',
        }}>
          {exportProgress}
        </div>
      )}

    </div>
  );
}
