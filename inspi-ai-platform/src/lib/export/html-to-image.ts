/**
 * HTML转图片导出服务
 * 支持PNG、JPG、SVG格式导出
 */

import domtoimage from 'dom-to-image';
import html2canvas from 'html2canvas';

import { buildProxiedImageUrl, needsProxying } from '@/lib/export/image-proxy';

export const DEFAULT_EXPORT_DIMENSIONS = {
  width: 944,
  height: 600,
} as const;

export interface ExportOptions {
  format: 'png' | 'jpg' | 'svg';
  quality?: number; // 0-1, 仅对JPG有效
  scale?: number; // 导出分辨率倍数，默认2 (高清)
  backgroundColor?: string;
  width?: number;
  height?: number;
}

export interface ExportResult {
  blob: Blob;
  dataUrl: string;
  filename: string;
}

/**
 * 导出HTML元素为图片
 */
export async function exportElementToImage(
  element: HTMLElement,
  options: ExportOptions,
): Promise<ExportResult> {
  const {
    format = 'png',
    quality = 0.9,
    scale = 2,
    backgroundColor = '#ffffff',
    width,
    height,
  } = options;

  let cleanupImages: (() => void) | undefined;
  let cleanupBlockedStyles: (() => void) | undefined;

  try {
    cleanupBlockedStyles = suppressBlockedStylesheets();
    cleanupImages = prepareImagesForExport(element);
    let blob: Blob;
    let dataUrl: string;

    const elementWidth = Math.max(element.scrollWidth, element.offsetWidth);
    const elementHeight = Math.max(element.scrollHeight, element.offsetHeight);

    const targetWidth = Math.max(width ?? elementWidth, elementWidth);
    const targetHeight = Math.max(height ?? elementHeight, elementHeight);

    // 准备导出选项
    const exportOptions = {
      backgroundColor,
      scale,
      useCORS: true,
      allowTaint: true,
      width: targetWidth,
      height: targetHeight,
      style: {
        transform: 'scale(1)',
        transformOrigin: 'top left',
      },
    };

    switch (format) {
      case 'png':
        if (scale > 1) {
          // 使用html2canvas获得更好的高分辨率支持
          const canvas = await html2canvas(element, {
            ...exportOptions,
            scale,
            onclone: sanitizeClonedDocument,
          });
          dataUrl = canvas.toDataURL('image/png');
        } else {
          // 使用dom-to-image获得更好的质量
          dataUrl = await domtoimage.toPng(element, exportOptions);
        }
        blob = await dataUrlToBlob(dataUrl);
        break;

      case 'jpg':
        if (scale > 1) {
          const canvas = await html2canvas(element, {
            ...exportOptions,
            scale,
            onclone: sanitizeClonedDocument,
          });
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        } else {
          dataUrl = await domtoimage.toJpeg(element, {
            ...exportOptions,
            quality,
          });
        }
        blob = await dataUrlToBlob(dataUrl);
        break;

      case 'svg':
        dataUrl = await domtoimage.toSvg(element, exportOptions);
        blob = await dataUrlToBlob(dataUrl);
        break;

      default:
        throw new Error(`不支持的格式: ${format}`);
    }

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `card-${timestamp}.${format}`;

    return {
      blob,
      dataUrl,
      filename,
    };

  } catch (error) {
    console.error('导出图片失败:', error);
    throw new Error(`导出${format.toUpperCase()}格式失败: ${error instanceof Error ? error.message : '未知错误'}`);
  } finally {
    cleanupImages?.();
    cleanupBlockedStyles?.();
  }
}

/**
 * 批量导出多个元素
 */
export async function batchExportElements(
  elements: HTMLElement[],
  options: ExportOptions,
): Promise<ExportResult[]> {
  const results: ExportResult[] = [];

  for (let i = 0; i < elements.length; i++) {
    try {
      const result = await exportElementToImage(elements[i], {
        ...options,
        // 为批量导出添加序号
      });

      // 修改文件名添加序号
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      result.filename = `card-${i + 1}-${timestamp}.${options.format}`;

      results.push(result);
    } catch (error) {
      console.error(`导出第${i + 1}张卡片失败:`, error);
      // 继续导出其他卡片，不中断整个过程
    }
  }

  return results;
}

/**
 * 下载图片文件
 */
export function downloadImage(result: ExportResult): void {
  const link = document.createElement('a');
  link.download = result.filename;
  link.href = result.dataUrl;

  // 触发下载
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * 批量下载图片文件
 */
export function downloadImages(results: ExportResult[]): void {
  results.forEach((result, index) => {
    // 添加延迟避免浏览器阻止多个下载
    setTimeout(() => {
      downloadImage(result);
    }, index * 100);
  });
}

/**
 * 复制图片到剪贴板
 */
export async function copyImageToClipboard(result: ExportResult): Promise<void> {
  try {
    if (navigator.clipboard && window.ClipboardItem) {
      const clipboardItem = new ClipboardItem({
        [result.blob.type]: result.blob,
      });
      await navigator.clipboard.write([clipboardItem]);
    } else {
      throw new Error('浏览器不支持剪贴板API');
    }
  } catch (error) {
    console.error('复制到剪贴板失败:', error);
    throw new Error('复制到剪贴板失败，请手动保存图片');
  }
}

/**
 * 获取图片预览URL (用于预览)
 */
export function getPreviewUrl(result: ExportResult): string {
  return result.dataUrl;
}

/**
 * 清理预览URL (释放内存)
 */
export function revokePreviewUrl(url: string): void {
  if (url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}

/**
 * 工具函数：DataURL转Blob
 */
async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

/**
 * 工具函数：获取元素的实际尺寸
 */
export function getElementDimensions(element: HTMLElement): { width: number; height: number } {
  const rect = element.getBoundingClientRect();
  return {
    width: rect.width,
    height: rect.height,
  };
}

/**
 * 工具函数：预处理元素样式（确保导出效果）
 */
export function prepareElementForExport(element: HTMLElement): () => void {
  const originalStyles = new Map<HTMLElement, string>();

  // 遍历所有子元素，确保字体已加载
  const allElements = [element, ...Array.from(element.querySelectorAll('*'))] as HTMLElement[];

  allElements.forEach(el => {
    const computedStyle = window.getComputedStyle(el);
    const fontFamily = computedStyle.fontFamily;

    // 保存原始样式
    originalStyles.set(el, el.style.cssText);

    // 确保字体渲染
    if (fontFamily && !fontFamily.includes('serif') && !fontFamily.includes('sans-serif')) {
      el.style.fontFamily = `${fontFamily}, sans-serif`;
    }

    // 确保背景色渲染
    if (computedStyle.backgroundColor === 'rgba(0, 0, 0, 0)' || computedStyle.backgroundColor === 'transparent') {
      el.style.backgroundColor = 'white';
    }
  });

  // 返回清理函数
  return () => {
    originalStyles.forEach((cssText, el) => {
      el.style.cssText = cssText;
    });
  };
}

function prepareImagesForExport(element: HTMLElement): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const currentOrigin = window.location.origin;
  const cleanups: Array<() => void> = [];
  const images = Array.from(element.querySelectorAll('img')) as HTMLImageElement[];

  images.forEach((img) => {
    const originalSrcAttribute = img.getAttribute('src');
    if (!originalSrcAttribute) {
      return;
    }

    const previousCrossOrigin = img.getAttribute('crossorigin');
    const { shouldProxy, targetUrl } = needsProxying(originalSrcAttribute, currentOrigin);

    if (shouldProxy && targetUrl) {
      const proxiedUrl = buildProxiedImageUrl(targetUrl);
      img.setAttribute('src', proxiedUrl);
      img.src = proxiedUrl;
      img.setAttribute('crossorigin', 'anonymous');
      img.crossOrigin = 'anonymous';

      cleanups.push(() => {
        img.setAttribute('src', originalSrcAttribute);
        img.src = originalSrcAttribute;
        if (previousCrossOrigin === null) {
          img.removeAttribute('crossorigin');
          img.crossOrigin = '';
        } else {
          img.setAttribute('crossorigin', previousCrossOrigin);
          img.crossOrigin = previousCrossOrigin;
        }
      });
    } else if (!previousCrossOrigin) {
      img.setAttribute('crossorigin', 'anonymous');
      img.crossOrigin = 'anonymous';
      cleanups.push(() => {
        img.removeAttribute('crossorigin');
        img.crossOrigin = '';
      });
    }
  });

  return () => {
    cleanups.forEach((cleanup) => {
      try {
        cleanup();
      } catch (error) {
        console.error('恢复图片导出状态失败:', error);
      }
    });
  };
}

const BLOCKED_STYLESHEET_PATTERNS = ['/_next/static/css/app/layout.css'];

function suppressBlockedStylesheets(): () => void {
  if (typeof document === 'undefined') {
    return () => undefined;
  }

  const suppressedLinks: HTMLLinkElement[] = [];
  const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[];

  links.forEach((link) => {
    const href = link.getAttribute('href') || link.href || '';
    if (!href) {
      return;
    }

    if (BLOCKED_STYLESHEET_PATTERNS.some(pattern => href.includes(pattern))) {
      if (!link.hasAttribute('data-html2canvas-ignore')) {
        link.setAttribute('data-html2canvas-ignore', 'true');
        suppressedLinks.push(link);
      }
    }
  });

  return () => {
    suppressedLinks.forEach((link) => {
      link.removeAttribute('data-html2canvas-ignore');
    });
  };
}

function sanitizeClonedDocument(clonedDoc: Document): void {
  try {
    const links = Array.from(clonedDoc.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[];
    links.forEach((link) => {
      const href = link.href || link.getAttribute('href') || '';
      if (href && BLOCKED_STYLESHEET_PATTERNS.some(pattern => href.includes(pattern))) {
        link.parentNode?.removeChild(link);
      }
    });
  } catch (error) {
    console.warn('清理导出样式表时出错:', error);
  }
}

/**
 * 预设导出配置
 */
export const exportPresets = {
  // 社交媒体分享 (正方形)
  social: {
    format: 'png' as const,
    scale: 2,
    width: DEFAULT_EXPORT_DIMENSIONS.width,
    height: DEFAULT_EXPORT_DIMENSIONS.height,
    backgroundColor: '#ffffff',
  },

  // 高清打印
  print: {
    format: 'png' as const,
    scale: 3,
    width: DEFAULT_EXPORT_DIMENSIONS.width,
    height: DEFAULT_EXPORT_DIMENSIONS.height,
    backgroundColor: '#ffffff',
  },

  // 网页使用 (较小文件)
  web: {
    format: 'jpg' as const,
    scale: 1,
    quality: 0.8,
    width: DEFAULT_EXPORT_DIMENSIONS.width,
    height: DEFAULT_EXPORT_DIMENSIONS.height,
    backgroundColor: '#ffffff',
  },

  // 透明背景
  transparent: {
    format: 'png' as const,
    scale: 2,
    width: DEFAULT_EXPORT_DIMENSIONS.width,
    height: DEFAULT_EXPORT_DIMENSIONS.height,
    backgroundColor: 'transparent',
  },
} as const;
