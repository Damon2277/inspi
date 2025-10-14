/**
 * HTML转图片导出服务
 * 支持PNG、JPG、SVG格式导出
 */

import domtoimage from 'dom-to-image';
import html2canvas from 'html2canvas';

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

  try {
    let blob: Blob;
    let dataUrl: string;

    // 准备导出选项
    const exportOptions = {
      backgroundColor,
      scale,
      useCORS: true,
      allowTaint: true,
      width: width || element.offsetWidth,
      height: height || element.offsetHeight,
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

/**
 * 预设导出配置
 */
export const exportPresets = {
  // 社交媒体分享 (正方形)
  social: {
    format: 'png' as const,
    scale: 2,
    width: 800,
    height: 800,
    backgroundColor: '#ffffff',
  },

  // 高清打印
  print: {
    format: 'png' as const,
    scale: 3,
    backgroundColor: '#ffffff',
  },

  // 网页使用 (较小文件)
  web: {
    format: 'jpg' as const,
    scale: 1,
    quality: 0.8,
    backgroundColor: '#ffffff',
  },

  // 透明背景
  transparent: {
    format: 'png' as const,
    scale: 2,
    backgroundColor: 'transparent',
  },
} as const;
