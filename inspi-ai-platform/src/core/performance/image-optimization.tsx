/**
 * 图片优化组件
 * 实现图片懒加载、渐进式加载和格式优化
 */

import Image from 'next/image';
import React, { useState, useRef, useEffect, useCallback } from 'react';

/**
 * 图片优化配置
 */
interface ImageOptimizationConfig {
  quality?: number;
  format?: 'webp' | 'avif' | 'auto';
  placeholder?: 'blur' | 'empty' | string;
  priority?: boolean;
  sizes?: string;
  loading?: 'lazy' | 'eager';
}

/**
 * 优化图片组件Props
 */
interface OptimizedImageProps extends ImageOptimizationConfig {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  fallbackSrc?: string;
  blurDataURL?: string;
}

/**
 * 图片加载状态
 */
type ImageLoadState = 'loading' | 'loaded' | 'error';

/**
 * 优化图片组件
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  style,
  quality = 75,
  format = 'auto',
  placeholder = 'blur',
  priority = false,
  sizes,
  loading = 'lazy',
  onLoad,
  onError,
  fallbackSrc,
  blurDataURL,
}: OptimizedImageProps) {
  const [loadState, setLoadState] = useState<ImageLoadState>('loading');
  const [currentSrc, setCurrentSrc] = useState(src);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  // 处理加载成功
  const handleLoad = useCallback(() => {
    setLoadState('loaded');
    onLoad && onLoad();
  }, [onLoad]);

  // 处理加载失败
  const handleError = useCallback(() => {
    if (retryCount < maxRetries) {
      // 重试加载
      setRetryCount(retryCount + 1);
      setTimeout(() => {
        setCurrentSrc(`${src}?retry=${retryCount + 1}`);
      }, 1000 * (retryCount + 1));
    } else if (fallbackSrc && currentSrc !== fallbackSrc) {
      // 使用备用图片
      setCurrentSrc(fallbackSrc);
      setRetryCount(0);
    } else {
      // 最终失败
      setLoadState('error');
      onError && onError(new Error('图片加载失败'));
    }
  }, [src, fallbackSrc, currentSrc, retryCount, onError]);

  // 生成优化的图片URL
  const getOptimizedSrc = useCallback((originalSrc: string) => {
    if (originalSrc.startsWith('data:') || originalSrc.startsWith('blob:')) {
      return originalSrc;
    }

    const url = new URL(originalSrc, window.location.origin);

    // 添加质量参数
    if (quality !== 75) {
      url.searchParams.set('q', quality.toString());
    }

    // 添加格式参数
    if (format !== 'auto') {
      url.searchParams.set('f', format);
    }

    // 添加尺寸参数
    if (width) {
      url.searchParams.set('w', width.toString());
    }
    if (height) {
      url.searchParams.set('h', height.toString());
    }

    return url.toString();
  }, [quality, format, width, height]);

  // 生成默认的模糊占位符
  const generateBlurDataURL = useCallback((w: number = 10, h: number = 10) => {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // 创建简单的渐变作为占位符
      const gradient = ctx.createLinearGradient(0, 0, w, h);
      gradient.addColorStop(0, '#f3f4f6');
      gradient.addColorStop(1, '#e5e7eb');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
    }

    return canvas.toDataURL();
  }, []);

  const optimizedSrc = getOptimizedSrc(currentSrc);
  const defaultBlurDataURL = blurDataURL || generateBlurDataURL(width, height);

  return (
    <div
      className={`optimized-image-container ${className}`}
      style={style}
    >
      <Image
        src={optimizedSrc}
        alt={alt}
        width={width}
        height={height}
        quality={quality}
        priority={priority}
        sizes={sizes}
        loading={loading}
        placeholder={placeholder === 'blur' ? 'blur' : 'empty'}
        blurDataURL={placeholder === 'blur' ? defaultBlurDataURL : undefined}
        onLoad={handleLoad}
        onError={handleError}
        className={`
          transition-opacity duration-300
          ${loadState === 'loading' ? 'opacity-0' : 'opacity-100'}
          ${loadState === 'error' ? 'bg-gray-200' : ''}
        `}
      />

      {/* 加载状态指示器 */}
      {loadState === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* 错误状态 */}
      {loadState === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-500">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}
    </div>
  );
}

/**
 * 响应式图片组件
 */
interface ResponsiveImageProps extends Omit<OptimizedImageProps, 'width' | 'height' | 'sizes'> {
  breakpoints?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  aspectRatio?: number;
}

export function ResponsiveImage({
  breakpoints = { mobile: 640, tablet: 768, desktop: 1024 },
  aspectRatio = 16 / 9,
  ...props
}: ResponsiveImageProps) {
  const sizes = `
    (max-width: ${breakpoints.mobile}px) 100vw,
    (max-width: ${breakpoints.tablet}px) 50vw,
    (max-width: ${breakpoints.desktop}px) 33vw,
    25vw
  `;

  return (
    <div
      className="responsive-image-container relative w-full"
      style={{ aspectRatio: aspectRatio.toString() }}
    >
      <OptimizedImage
        {...props}
        sizes={sizes}
        className={`object-cover ${props.className || ''}`}
        style={{ ...props.style, width: '100%', height: '100%' }}
      />
    </div>
  );
}

/**
 * 图片画廊组件
 */
interface ImageGalleryProps {
  images: Array<{
    src: string;
    alt: string;
    thumbnail?: string;
  }>;
  className?: string;
  onImageClick?: (index: number) => void;
}

export function ImageGallery({ images, className = '', onImageClick }: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleImageClick = useCallback((index: number) => {
    setSelectedIndex(index);
    onImageClick && onImageClick(index);
  }, [onImageClick]);

  return (
    <div className={`image-gallery ${className}`}>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((image, index) => (
          <div
            key={index}
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => handleImageClick(index)}
          >
            <OptimizedImage
              src={image.thumbnail || image.src}
              alt={image.alt}
              width={300}
              height={200}
              className="rounded-lg"
              loading="lazy"
            />
          </div>
        ))}
      </div>

      {/* 全屏预览 */}
      {selectedIndex !== null && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
          onClick={() => setSelectedIndex(null)}
        >
          <div className="relative max-w-4xl max-h-full p-4">
            <OptimizedImage
              src={images[selectedIndex].src}
              alt={images[selectedIndex].alt}
              width={1200}
              height={800}
              className="max-w-full max-h-full object-contain"
              priority
            />
            <button
              className="absolute top-4 right-4 text-white text-2xl"
              onClick={() => setSelectedIndex(null)}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 图片预加载Hook
 */
export function useImagePreloader(urls: string[]) {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const preloadImages = useCallback(async (imageUrls: string[]) => {
    setLoading(true);

    const promises = imageUrls.map(url => {
      return new Promise<string>((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => resolve(url);
        img.onerror = () => reject(new Error(`Failed to load ${url}`));
        img.src = url;
      });
    });

    try {
      const results = await Promise.allSettled(promises);
      const loaded = results
        .filter((result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled')
        .map(result => result.value);

      setLoadedImages(new Set(loaded));
    } catch (error: any) {
      console.warn('Some images failed to preload:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (urls.length > 0) {
      preloadImages(urls);
    }
  }, [urls, preloadImages]);

  return { loadedImages, loading, preloadImages };
}

/**
 * 图片压缩工具
 */
export class ImageCompressor {
  static async compressImage(
    file: File,
    options: {
      maxWidth?: number;
      maxHeight?: number;
      quality?: number;
      format?: 'jpeg' | 'webp' | 'png';
    } = {},
  ): Promise<Blob> {
    const {
      maxWidth = 1920,
      maxHeight = 1080,
      quality = 0.8,
      format = 'jpeg',
    } = options;

    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new window.Image();

      img.onload = () => {
        // 计算新尺寸
        let { width, height } = img;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;

        // 绘制图片
        ctx?.drawImage(img, 0, 0, width, height);

        // 转换为Blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('压缩失败'));
            }
          },
          `image/${format}`,
          quality,
        );
      };

      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = URL.createObjectURL(file);
    });
  }

  static async resizeImage(
    file: File,
    targetWidth: number,
    targetHeight: number,
  ): Promise<Blob> {
    return this.compressImage(file, {
      maxWidth: targetWidth,
      maxHeight: targetHeight,
      quality: 1,
    });
  }
}

/**
 * 图片格式检测
 */
export function detectImageFormat(file: File): string {
  const extension = file.name.split('.').pop()?.toLowerCase();

  const formatMap: Record<string, string> = {
    'jpg': 'jpeg',
    'jpeg': 'jpeg',
    'png': 'png',
    'webp': 'webp',
    'avif': 'avif',
    'gif': 'gif',
    'svg': 'svg+xml',
  };

  return formatMap[extension || ''] || 'jpeg';
}

/**
 * 图片性能监控
 */
interface ImagePerformanceMetrics {
  totalImages: number;
  loadedImages: number;
  failedImages: number;
  averageLoadTime: number;
  totalLoadTime: number;
}

export function useImagePerformanceMonitoring() {
  const [metrics, setMetrics] = useState<ImagePerformanceMetrics>({
    totalImages: 0,
    loadedImages: 0,
    failedImages: 0,
    averageLoadTime: 0,
    totalLoadTime: 0,
  });

  const recordImageLoad = useCallback((loadTime: number, success: boolean) => {
    setMetrics(prev => ({
      totalImages: prev.totalImages + 1,
      loadedImages: success ? prev.loadedImages + 1 : prev.loadedImages,
      failedImages: success ? prev.failedImages : prev.failedImages + 1,
      totalLoadTime: prev.totalLoadTime + loadTime,
      averageLoadTime: (prev.totalLoadTime + loadTime) / (prev.totalImages + 1),
    }));
  }, []);

  return { metrics, recordImageLoad };
}
