/**
 * 分享功能React Hook
 * 提供便捷的分享功能集成
 */

import { useState, useCallback, useEffect } from 'react';

import { ShareSDKResult } from '@/lib/invitation/services/ShareSDKIntegration';
import { ShareService } from '@/lib/invitation/services/ShareService';
import { SharePlatform, ShareContent } from '@/lib/invitation/types';

export interface UseShareOptions {
  onShareSuccess?: (platform: SharePlatform, result: ShareSDKResult) => void
  onShareError?: (platform: SharePlatform, error: string) => void
  trackEvents?: boolean
}

export interface UseShareReturn {
  // 分享状态
  isSharing: boolean
  shareError: string | null

  // 分享方法
  shareWithSDK: (inviteCode: string, platform: SharePlatform) => Promise<void>
  shareWithUrl: (inviteCode: string, platform: SharePlatform) => Promise<void>
  copyShareUrl: (inviteCode: string) => Promise<void>

  // 平台检查
  isPlatformAvailable: (platform: SharePlatform) => boolean
  getAvailablePlatforms: () => SharePlatform[]

  // 内容生成
  generateShareContent: (inviteCode: string, platform: SharePlatform) => Promise<ShareContent | null>
  generateQRCode: (inviteCode: string) => Promise<string | null>

  // 清除错误
  clearError: () => void
}

export function useShare(
  shareService: ShareService,
  options: UseShareOptions = {},
): UseShareReturn {
  const [isSharing, setIsSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [availablePlatforms, setAvailablePlatforms] = useState<SharePlatform[]>([]);

  const { onShareSuccess, onShareError, trackEvents = true } = options;

  // 初始化可用平台
  useEffect(() => {
    const platforms = shareService.getAvailablePlatforms();
    setAvailablePlatforms(platforms);
  }, [shareService]);

  // 使用SDK分享
  const shareWithSDK = useCallback(async (inviteCode: string, platform: SharePlatform) => {
    if (isSharing) return;

    setIsSharing(true);
    setShareError(null);

    try {
      const result = await shareService.shareWithSDK(inviteCode, platform);

      if (result.success) {
        onShareSuccess && onShareSuccess(platform, result);
      } else {
        const error = result.error || 'Share failed';
        setShareError(error);
        onShareError && onShareError(platform, error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setShareError(errorMessage);
      onShareError && onShareError(platform, errorMessage);
    } finally {
      setIsSharing(false);
    }
  }, [isSharing, shareService, onShareSuccess, onShareError]);

  // 使用URL分享（回退方案）
  const shareWithUrl = useCallback(async (inviteCode: string, platform: SharePlatform) => {
    if (isSharing) return;

    setIsSharing(true);
    setShareError(null);

    try {
      const content = await shareService.generateShareContent(inviteCode, platform);
      const params = shareService.getPlatformShareParams(platform, content);

      // 记录分享事件
      if (trackEvents) {
        await shareService.trackShareEvent('', platform, { method: 'url' });
      }

      // 根据平台打开相应的分享URL
      let shareUrl = '';

      switch (platform) {
        case SharePlatform.WECHAT:
          // 微信分享需要在微信环境中使用SDK，这里提供二维码
          shareUrl = content.qrCodeUrl || content.url;
          break;

        case SharePlatform.QQ:
          shareUrl = `https://connect.qq.com/widget/shareqq/index.html?${new URLSearchParams(params).toString()}`;
          break;

        case SharePlatform.EMAIL:
          shareUrl = `mailto:?${new URLSearchParams(params).toString()}`;
          break;

        default:
          shareUrl = content.url;
      }

      if (shareUrl.startsWith('data:')) {
        // 如果是二维码数据，显示二维码
        const img = new Image();
        img.src = shareUrl;
        const newWindow = window.open('', '_blank');
        newWindow?.document.write(`
          <html>
            <head><title>分享二维码</title></head>
            <body style="text-align: center; padding: 20px;">
              <h3>请使用微信扫描二维码分享</h3>
              <img src="${shareUrl}" alt="分享二维码" style="max-width: 300px;" />
              <p>邀请链接: ${content.url}</p>
            </body>
          </html>
        `);
      } else {
        window.open(shareUrl, '_blank');
      }

      onShareSuccess && onShareSuccess(platform, { success: true, shareId: `url_${Date.now()}` });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setShareError(errorMessage);
      onShareError && onShareError(platform, errorMessage);
    } finally {
      setIsSharing(false);
    }
  }, [isSharing, shareService, trackEvents, onShareSuccess, onShareError]);

  // 复制分享链接
  const copyShareUrl = useCallback(async (inviteCode: string) => {
    if (isSharing) return;

    setIsSharing(true);
    setShareError(null);

    try {
      const trackingUrl = await shareService.generateTrackingUrl(inviteCode, SharePlatform.LINK);

      if (navigator.clipboard) {
        await navigator.clipboard.writeText(trackingUrl);
      } else {
        // 回退方案
        const textArea = document.createElement('textarea');
        textArea.value = trackingUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      // 记录分享事件
      if (trackEvents) {
        await shareService.trackShareEvent('', SharePlatform.LINK, { method: 'copy' });
      }

      onShareSuccess && onShareSuccess(SharePlatform.LINK, { success: true, shareId: `copy_${Date.now()}` });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to copy URL';
      setShareError(errorMessage);
      onShareError && onShareError(SharePlatform.LINK, errorMessage);
    } finally {
      setIsSharing(false);
    }
  }, [isSharing, shareService, trackEvents, onShareSuccess, onShareError]);

  // 检查平台是否可用
  const isPlatformAvailable = useCallback((platform: SharePlatform) => {
    return shareService.isPlatformAvailable(platform);
  }, [shareService]);

  // 获取可用平台
  const getAvailablePlatforms = useCallback(() => {
    return availablePlatforms;
  }, [availablePlatforms]);

  // 生成分享内容
  const generateShareContent = useCallback(async (inviteCode: string, platform: SharePlatform) => {
    try {
      return await shareService.generateShareContent(inviteCode, platform);
    } catch (error) {
      console.error('Failed to generate share content:', error);
      return null;
    }
  }, [shareService]);

  // 生成二维码
  const generateQRCode = useCallback(async (inviteCode: string) => {
    try {
      return await shareService.generateQRCode(inviteCode);
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      return null;
    }
  }, [shareService]);

  // 清除错误
  const clearError = useCallback(() => {
    setShareError(null);
  }, []);

  return {
    isSharing,
    shareError,
    shareWithSDK,
    shareWithUrl,
    copyShareUrl,
    isPlatformAvailable,
    getAvailablePlatforms,
    generateShareContent,
    generateQRCode,
    clearError,
  };
}

// 分享平台配置
export const SHARE_PLATFORM_CONFIG = {
  [SharePlatform.WECHAT]: {
    name: '微信',
    icon: '💬',
    color: '#07C160',
    description: '分享到微信好友或朋友圈',
  },
  [SharePlatform.QQ]: {
    name: 'QQ',
    icon: '🐧',
    color: '#12B7F5',
    description: '分享到QQ好友或QQ空间',
  },
  [SharePlatform.DINGTALK]: {
    name: '钉钉',
    icon: '📱',
    color: '#2E7CF6',
    description: '分享到钉钉群聊或好友',
  },
  [SharePlatform.WEWORK]: {
    name: '企业微信',
    icon: '💼',
    color: '#699EF5',
    description: '分享到企业微信群聊',
  },
  [SharePlatform.EMAIL]: {
    name: '邮件',
    icon: '📧',
    color: '#FF6B35',
    description: '通过邮件发送邀请',
  },
  [SharePlatform.LINK]: {
    name: '复制链接',
    icon: '🔗',
    color: '#8E8E93',
    description: '复制邀请链接到剪贴板',
  },
};

// 获取平台配置
export function getPlatformConfig(platform: SharePlatform) {
  return SHARE_PLATFORM_CONFIG[platform] || {
    name: platform,
    icon: '📤',
    color: '#8E8E93',
    description: '分享邀请链接',
  };
}
