/**
 * 分享服务
 * 支持社交媒体分享、链接生成、二维码生成
 */

import * as QRCode from 'qrcode';

import { env } from '@/shared/config/environment';

const LOCAL_SHARE_HOSTS = ['localhost', '127.0.0.1'];
const SHARE_BASE_URL = (process.env.NEXT_PUBLIC_SHARE_BASE_URL || env.APP_URL || '').replace(/\/$/, '');
const ALLOW_INLINE_SHARE_PAYLOAD = process.env.NEXT_PUBLIC_SHARE_EMBED_PAYLOAD === 'true';

export interface ShareContent {
  title: string;
  description: string;
  imageUrl?: string;
  url?: string;
  hashtags?: string[];
}

export interface ShareOptions {
  platform: SharePlatform;
  content: ShareContent;
  shareWindow?: Window | null;
}

export type SharePlatform =
  | 'wechat'
  | 'weibo'
  | 'qq'
  | 'twitter'
  | 'facebook'
  | 'linkedin'
  | 'copy-link'
  | 'qr-code';

/**
 * 分享到社交媒体平台
 */
export async function shareToSocial(options: ShareOptions): Promise<void> {
  const { platform, content, shareWindow } = options;

  try {
    switch (platform) {
      case 'wechat':
        await shareToWeChat(content);
        break;
      case 'weibo':
        shareToWeibo(content, shareWindow);
        break;
      case 'qq':
        shareToQQ(content, shareWindow);
        break;
      case 'twitter':
        shareToTwitter(content, shareWindow);
        break;
      case 'facebook':
        shareToFacebook(content, shareWindow);
        break;
      case 'linkedin':
        shareToLinkedIn(content, shareWindow);
        break;
      case 'copy-link':
        await copyLinkToClipboard(content);
        break;
      case 'qr-code':
        await generateQRCode(content);
        break;
      default:
        throw new Error(`不支持的分享平台: ${platform}`);
    }
  } catch (error) {
    console.error(`分享到${platform}失败:`, error);
    throw error;
  }
}

/**
 * 分享到微信 (生成二维码)
 */
async function shareToWeChat(content: ShareContent): Promise<void> {
  if (!content.url) {
    throw new Error('微信分享需要提供链接');
  }

  const shareHost = content.url ? new URL(content.url).hostname : '';
  const isLocalHost = LOCAL_SHARE_HOSTS.includes(shareHost);

  // 生成二维码供用户扫描
  const qrCodeDataUrl = await QRCode.toDataURL(content.url, {
    width: 200,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });

  // 显示二维码弹窗
  showQRCodeModal({
    title: '微信分享',
    description: isLocalHost
      ? '当前链接为本地地址，仅能在此设备访问。请部署到可访问域名后再分享。'
      : '请使用微信扫描二维码分享',
    qrCodeUrl: qrCodeDataUrl,
    content,
  });
}

/**
 * 分享到微博
 */
function shareToWeibo(content: ShareContent, shareWindow?: Window | null): void {
  const text = `${content.title} - ${content.description}`;
  const hashtags = content.hashtags ? content.hashtags.map(tag => `#${tag}#`).join(' ') : '';
  const url = content.url || window.location.href;

  const shareUrl = 'https://service.weibo.com/share/share.php?' +
    `url=${encodeURIComponent(url)}&` +
    `title=${encodeURIComponent(`${text} ${hashtags}`)}&` +
    `pic=${encodeURIComponent(content.imageUrl || '')}`;

  openShareWindow(shareUrl, shareWindow);
}

/**
 * 分享到QQ空间
 */
function shareToQQ(content: ShareContent, shareWindow?: Window | null): void {
  const url = content.url || window.location.href;
  const shareUrl = 'https://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshare_onekey?' +
    `url=${encodeURIComponent(url)}&` +
    `title=${encodeURIComponent(content.title)}&` +
    `desc=${encodeURIComponent(content.description)}&` +
    `pics=${encodeURIComponent(content.imageUrl || '')}`;

  openShareWindow(shareUrl, shareWindow);
}

/**
 * 分享到Twitter
 */
function shareToTwitter(content: ShareContent, shareWindow?: Window | null): void {
  const text = `${content.title} - ${content.description}`;
  const hashtags = content.hashtags ? content.hashtags.join(',') : '';
  const url = content.url || window.location.href;

  const shareUrl = 'https://twitter.com/intent/tweet?' +
    `text=${encodeURIComponent(text)}&` +
    `url=${encodeURIComponent(url)}&` +
    `hashtags=${encodeURIComponent(hashtags)}`;

  openShareWindow(shareUrl, shareWindow);
}

/**
 * 分享到Facebook
 */
function shareToFacebook(content: ShareContent, shareWindow?: Window | null): void {
  const url = content.url || window.location.href;
  const shareUrl = 'https://www.facebook.com/sharer/sharer.php?' +
    `u=${encodeURIComponent(url)}&` +
    `quote=${encodeURIComponent(`${content.title} - ${content.description}`)}`;

  openShareWindow(shareUrl, shareWindow);
}

/**
 * 分享到LinkedIn
 */
function shareToLinkedIn(content: ShareContent, shareWindow?: Window | null): void {
  const url = content.url || window.location.href;
  const shareUrl = 'https://www.linkedin.com/sharing/share-offsite/?' +
    `url=${encodeURIComponent(url)}`;

  openShareWindow(shareUrl, shareWindow);
}

function openShareWindow(targetUrl: string, shareWindow?: Window | null) {
  if (typeof window === 'undefined') {
    return;
  }

  const features = 'width=600,height=500,noopener,noreferrer';
  if (shareWindow && !shareWindow.closed) {
    shareWindow.location.href = targetUrl;
    shareWindow.focus();
    return;
  }

  window.open(targetUrl, '_blank', features);
}

/**
 * 复制链接到剪贴板
 */
async function copyLinkToClipboard(content: ShareContent): Promise<void> {
  const url = content.url || window.location.href;

  try {
    await navigator.clipboard.writeText(url);
    showToast('链接已复制到剪贴板', 'success');
  } catch (error) {
    // 降级方案：使用传统方法
    const textArea = document.createElement('textarea');
    textArea.value = url;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    showToast('链接已复制到剪贴板', 'success');
  }
}

/**
 * 生成二维码
 */
async function generateQRCode(content: ShareContent): Promise<void> {
  const url = content.url || window.location.href;

  try {
    const qrCodeDataUrl = await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    showQRCodeModal({
      title: '二维码分享',
      description: '扫描二维码查看内容',
      qrCodeUrl: qrCodeDataUrl,
      content,
    });
  } catch (error) {
    throw new Error('生成二维码失败');
  }
}

/**
 * 生成分享链接
 */
export async function generateShareLink(cardId: string, cardData?: any): Promise<string> {
  try {
    const baseUrl = resolveShareBaseUrl();
    const url = new URL(`/share/card/${cardId}`, baseUrl);

    if (ALLOW_INLINE_SHARE_PAYLOAD && cardData && typeof cardData === 'object') {
      const minimalPayload = buildMinimalSharePayload(cardData);
      const serialized = JSON.stringify(minimalPayload);
      if (serialized.length <= 512) {
        const encodedData = safeBase64Encode(serialized);
        if (encodedData.length <= 512) {
          url.searchParams.set('data', encodedData);
        }
      }
    }

    return url.toString();
  } catch (error) {
    console.error('生成分享链接失败:', error);
    throw new Error('生成分享链接失败');
  }
}

function safeBase64Encode(text: string): string {
  try {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(text, 'utf-8').toString('base64');
    }
    if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
      return window.btoa(unescape(encodeURIComponent(text)));
    }
    return text;
  } catch (error) {
    console.warn('Base64编码失败，返回原始内容', error);
    return text;
  }
}

function buildMinimalSharePayload(cardData: any) {
  const contentPreview = typeof cardData.content === 'string'
    ? cardData.content.slice(0, 160)
    : undefined;

  return {
    id: cardData.id,
    title: cardData.title,
    type: cardData.type,
    content: contentPreview,
    metadata: cardData.metadata
      ? {
          knowledgePoint: cardData.metadata.knowledgePoint,
          subject: cardData.metadata.subject,
          gradeLevel: cardData.metadata.gradeLevel,
        }
      : undefined,
  };
}

/**
 * 获取分享统计
 */
export async function getShareStats(_cardId: string): Promise<ShareStats> {
  try {
    // 这里应该调用后端API获取分享统计
    // 暂时返回模拟数据
    return {
      totalShares: 0,
      platforms: {
        wechat: 0,
        weibo: 0,
        qq: 0,
        twitter: 0,
        facebook: 0,
        linkedin: 0,
        'copy-link': 0,
        'qr-code': 0,
      },
      views: 0,
      lastShared: null,
    };
  } catch (error) {
    console.error('获取分享统计失败:', error);
    throw new Error('获取分享统计失败');
  }
}

/**
 * 记录分享事件
 */
export async function trackShareEvent(cardId: string, platform: SharePlatform): Promise<void> {
  try {
    // 这里应该调用后端API记录分享事件
    console.log(`分享事件记录: 卡片${cardId} 分享到${platform}`);

    // 可以发送到分析服务
    if (typeof (window as any).gtag !== 'undefined') {
      (window as any).gtag('event', 'share', {
        method: platform,
        content_type: 'card',
        item_id: cardId,
      });
    }
  } catch (error) {
    console.error('记录分享事件失败:', error);
    // 不抛出错误，避免影响分享功能
  }
}

/**
 * 分享统计接口
 */
export interface ShareStats {
  totalShares: number;
  platforms: Record<SharePlatform, number>;
  views: number;
  lastShared: Date | null;
}

/**
 * 显示二维码弹窗
 */
function showQRCodeModal(options: {
  title: string;
  description: string;
  qrCodeUrl: string;
  content: ShareContent;
}): void {
  // 创建弹窗元素
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;

  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: white;
    padding: 24px;
    border-radius: 12px;
    text-align: center;
    max-width: 400px;
    width: 90%;
  `;

  const previewHtml = options.content.imageUrl
    ? `<div style="margin: 0 auto 16px auto; border-radius: 16px; overflow: hidden; box-shadow: 0 12px 24px rgba(15, 23, 42, 0.2); max-width: 320px;">
        <img src="${options.content.imageUrl}" alt="分享海报预览" style="width: 100%; display: block;" />
      </div>`
    : '';

  modalContent.innerHTML = `
    <h3 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600;">${options.title}</h3>
    <p style="margin: 0 0 12px 0; color: #666; font-size: 14px;">${options.description}</p>
    ${previewHtml}
    <img src="${options.qrCodeUrl}" alt="QR Code" style="width: 200px; height: 200px; margin: 0 auto 12px;" />
    <div style="margin-bottom: 16px;">
      <p style="margin: 0; font-size: 14px; font-weight: 500;">${options.content.title}</p>
      <p style="margin: 4px 0 0 0; font-size: 12px; color: #666;">${options.content.description}</p>
    </div>
    <button id="closeModal" style="
      padding: 8px 16px;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
    ">关闭</button>
  `;

  modal.appendChild(modalContent);
  document.body.appendChild(modal);

  // 关闭弹窗
  const closeModal = () => {
    document.body.removeChild(modal);
  };

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  modalContent.querySelector('#closeModal')?.addEventListener('click', closeModal);
}

/**
 * 显示提示消息
 */
function showToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
  const toast = document.createElement('div');
  const bgColor = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6';

  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${bgColor};
    color: white;
    padding: 12px 16px;
    border-radius: 6px;
    font-size: 14px;
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
  `;

  toast.textContent = message;
  document.body.appendChild(toast);

  // 3秒后自动移除
  setTimeout(() => {
    if (document.body.contains(toast)) {
      document.body.removeChild(toast);
    }
  }, 3000);
}

/**
 * 分享平台配置
 */
export const sharePlatforms = [
  {
    id: 'wechat' as SharePlatform,
    name: '微信',
    icon: '💬',
    color: '#07c160',
  },
  {
    id: 'weibo' as SharePlatform,
    name: '微博',
    icon: '🔥',
    color: '#e6162d',
  },
  {
    id: 'qq' as SharePlatform,
    name: 'QQ空间',
    icon: '🐧',
    color: '#12b7f5',
  },
  {
    id: 'twitter' as SharePlatform,
    name: 'Twitter',
    icon: '🐦',
    color: '#1da1f2',
  },
  {
    id: 'facebook' as SharePlatform,
    name: 'Facebook',
    icon: '📘',
    color: '#1877f2',
  },
  {
    id: 'linkedin' as SharePlatform,
    name: 'LinkedIn',
    icon: '💼',
    color: '#0a66c2',
  },
  {
    id: 'copy-link' as SharePlatform,
    name: '复制链接',
    icon: '🔗',
    color: '#6b7280',
  },
  {
    id: 'qr-code' as SharePlatform,
    name: '二维码',
    icon: '📱',
    color: '#374151',
  },
] as const;
function resolveShareBaseUrl(): string {
  const candidate = SHARE_BASE_URL && SHARE_BASE_URL.trim().length > 0
    ? SHARE_BASE_URL
    : undefined;

  if (candidate) {
    return candidate;
  }

  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin;
  }

  return 'http://localhost:3000';
}
