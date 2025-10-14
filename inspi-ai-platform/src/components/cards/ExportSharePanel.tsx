'use client';

import React, { useState, useRef } from 'react';

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
}

export function ExportSharePanel({ cardElement, cardData, className = '' }: ExportSharePanelProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [exportProgress, setExportProgress] = useState('');

  // 导出格式选项
  const exportFormats = [
    {
      key: 'social',
      name: '社交媒体 (PNG)',
      description: '800x800 高清正方形',
      icon: '📱',
    },
    {
      key: 'print',
      name: '高清打印 (PNG)',
      description: '3倍分辨率，适合打印',
      icon: '🖨️',
    },
    {
      key: 'web',
      name: '网页使用 (JPG)',
      description: '压缩文件，快速加载',
      icon: '🌐',
    },
    {
      key: 'transparent',
      name: '透明背景 (PNG)',
      description: '无背景，便于设计',
      icon: '🎨',
    },
  ];

  /**
   * 导出图片
   */
  const handleExport = async (presetKey: keyof typeof exportPresets) => {
    if (!cardElement) {
      alert('请先生成卡片内容');
      return;
    }

    setIsExporting(true);
    setExportProgress('准备导出...');

    try {
      const options = exportPresets[presetKey];
      setExportProgress('正在生成图片...');

      const result = await exportElementToImage(cardElement, options);

      setExportProgress('准备下载...');
      downloadImage(result);

      setExportProgress('导出完成！');

      // 记录导出事件
      console.log(`导出卡片: ${cardData.id}, 格式: ${presetKey}`);

    } catch (error) {
      console.error('导出失败:', error);
      alert(`导出失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsExporting(false);
      setShowExportOptions(false);
      setTimeout(() => setExportProgress(''), 2000);
    }
  };

  /**
   * 复制图片到剪贴板
   */
  const handleCopyImage = async () => {
    if (!cardElement) {
      alert('请先生成卡片内容');
      return;
    }

    setIsExporting(true);
    setExportProgress('正在复制到剪贴板...');

    try {
      const result = await exportElementToImage(cardElement, exportPresets.social);
      await copyImageToClipboard(result);
      setExportProgress('已复制到剪贴板！');
    } catch (error) {
      console.error('复制失败:', error);
      alert(`复制失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportProgress(''), 2000);
    }
  };

  /**
   * 分享到社交媒体
   */
  const handleShare = async (platform: SharePlatform) => {
    setIsSharing(true);

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
      if (['weibo', 'qq'].includes(platform) && cardElement) {
        setExportProgress('正在生成分享图片...');
        const result = await exportElementToImage(cardElement, exportPresets.social);

        // 这里需要上传图片到服务器获取公开URL
        // 暂时使用本地DataURL (某些平台可能不支持)
        shareContent.imageUrl = result.dataUrl;
      }

      // 执行分享
      await shareToSocial({ platform, content: shareContent });

      // 记录分享事件
      await trackShareEvent(cardData.id, platform);

    } catch (error) {
      console.error('分享失败:', error);
      alert(`分享失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
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
          disabled={isExporting || !cardElement}
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

        {/* 复制到剪贴板 */}
        <button
          onClick={handleCopyImage}
          disabled={isExporting || !cardElement}
          style={{
            padding: '8px 16px',
            backgroundColor: '#10b981',
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
          📋 复制图片
        </button>

        {/* 更多导出选项 */}
        <button
          onClick={() => setShowExportOptions(!showExportOptions)}
          disabled={isExporting || !cardElement}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6b7280',
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
          ⚙️ 更多格式
        </button>

        {/* 分享按钮 */}
        <button
          onClick={() => setShowShareOptions(!showShareOptions)}
          disabled={isSharing}
          style={{
            padding: '8px 16px',
            backgroundColor: '#f59e0b',
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
          {isSharing ? '⏳' : '📤'}
          {isSharing ? '分享中...' : '分享'}
        </button>
      </div>

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

      {/* 导出选项面板 */}
      {showExportOptions && (
        <div style={{
          marginTop: '12px',
          padding: '16px',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
        }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600', color: '#374151' }}>
            选择导出格式
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
            {exportFormats.map(format => (
              <button
                key={format.key}
                onClick={() => handleExport(format.key as keyof typeof exportPresets)}
                disabled={isExporting}
                style={{
                  padding: '12px',
                  backgroundColor: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                  e.currentTarget.style.backgroundColor = 'white';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '16px' }}>{format.icon}</span>
                  <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                    {format.name}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  {format.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 分享选项面板 */}
      {showShareOptions && (
        <div style={{
          marginTop: '12px',
          padding: '16px',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
        }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600', color: '#374151' }}>
            分享到社交媒体
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
            {sharePlatforms.map(platform => (
              <button
                key={platform.id}
                onClick={() => handleShare(platform.id)}
                disabled={isSharing}
                style={{
                  padding: '12px 8px',
                  backgroundColor: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = platform.color;
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                  e.currentTarget.style.backgroundColor = 'white';
                }}
              >
                <span style={{ fontSize: '20px' }}>{platform.icon}</span>
                <span style={{ fontSize: '12px', fontWeight: '500', color: '#374151' }}>
                  {platform.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
