'use client';

import React, { useState } from 'react';

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
  sharePlatforms,
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
}

export function ExportSharePanel({
  cardElement,
  cardData,
  className = '',
  prepareExportElement,
  finalizeExport,
}: ExportSharePanelProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [exportProgress, setExportProgress] = useState('');
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const showFeedback = (type: 'success' | 'error' | 'info', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3000);
  };

  // 导出格式选项
  const exportFormats = [
    {
      key: 'social',
      name: '课堂展示 (PNG)',
      description: '944×600 高清画布，适合投屏',
      icon: '📱',
    },
    {
      key: 'print',
      name: '高清导出 (PNG)',
      description: '3× 分辨率，保留细节',
      icon: '🖨️',
    },
    {
      key: 'web',
      name: '网页使用 (JPG)',
      description: '标准尺寸，便于分享',
      icon: '🌐',
    },
    {
      key: 'transparent',
      name: '透明背景 (PNG)',
      description: '无背景，便于设计',
      icon: '🎨',
    },
  ];

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
      setShowExportOptions(false);
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
      setShowShareOptions(false);
      setExportProgress('');
    }
  };

  return (
    <div className={`export-share-panel ${className}`}>
      {/* 主要操作按钮 */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {/* 快速导出按钮 */}
        <button
          onClick={() => handleExport('social')}
          disabled={isExporting || (!cardElement && !prepareExportElement)}
          style={{
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: isExporting ? 'not-allowed' : 'pointer',
            opacity: isExporting ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          {isExporting ? '⏳' : '📥'}
          {isExporting ? '导出中...' : '下载图片'}
        </button>


        {/* 分享按钮 */}
        <button
          onClick={() => handleShare('wechat' as SharePlatform)}
          disabled={isSharing}
          style={{
            padding: '8px 16px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: isSharing ? 'not-allowed' : 'pointer',
            opacity: isSharing ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          {isSharing ? '⏳' : '💬'}
          {isSharing ? '分享中...' : '分享到微信'}
        </button>
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
