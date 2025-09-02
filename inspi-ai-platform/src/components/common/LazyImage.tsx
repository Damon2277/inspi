/**
 * 懒加载图片组件
 */
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logging/logger';

/**
 * 懒加载图片配置
 */
export interface LazyImageConfig {
  // 占位符图片
  placeholder?: string;
  // 错误时显示的图片
  fallback?: string;
  // 交叉观察器选项
  intersectionOptions?: IntersectionObserverInit;
  // 是否启用渐入动画
  fadeIn?: boolean;
  // 渐入动画持续时间
  fadeInDuration?: number;
  // 是否启用模糊到清晰效果
  blurToSharp?: boolean;
  // 重试次数
  retries?: number;
  // 重试延迟
  retryDelay?: number;
  // 预加载策略
  preload?: 'none' | 'metadata' | 'auto';
  // 跨域设置
  crossOrigin?: 'anonymous' | 'use-credentials';
  // 图片优先级
  fetchPriority?: 'high' | 'low' | 'auto';
  // 响应式图片尺寸
  sizes?: string;
  // 响应式图片源集
  srcSet?: string;
}

/**
 * 懒加载图片状态
 */
export interface LazyImageState {
  loading: boolean;
  loaded: boolean;
  error: boolean;
  retryCount: number;
  currentSrc: string;
}

/**
 * 懒加载图片属性
 */
interface LazyImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'onLoad' | 'onError'> {
  // 图片源
  src: string;
  // 替代文本
  alt: string;
  // 配置
  config?: LazyImageConfig;
  // 容器样式
  containerStyle?: React.CSSProperties;
  // 容器类名
  containerClassName?: string;
  // 加载成功回调
  onLoad?: (event: React.SyntheticEvent<HTMLImageElement>) => void;
  // 加载失败回调
  onError?: (error: Error) => void;
  // 开始加载回调
  onLoadStart?: () => void;
  // 状态变化回调
  onStateChange?: (state: LazyImageState) => void;
}

/**
 * 懒加载图片组件
 */
const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  config = {},
  containerStyle,
  containerClassName,
  onLoad,
  onError,
  onLoadStart,
  onStateChange,
  style,
  className,
  ...imgProps
}) => {
  const {
    placeholder,
    fallback,
    intersectionOptions = { threshold: 0.1, rootMargin: '50px' },
    fadeIn = true,
    fadeInDuration = 300,
    blurToSharp = false,
    retries = 3,
    retryDelay = 1000,
    preload = 'none',
    crossOrigin,
    fetchPriority,
    sizes,
    srcSet
  } = config;

  // 状态
  const [state, setState] = useState<LazyImageState>({
    loading: false,
    loaded: false,
    error: false,
    retryCount: 0,
    currentSrc: placeholder || ''
  });

  // 引用
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 更新状态
  const updateState = useCallback((newState: Partial<LazyImageState>) => {
    setState(prevState => {
      const updatedState = { ...prevState, ...newState };
      onStateChange?.(updatedState);
      return updatedState;
    });
  }, [onStateChange]);

  // 加载图片
  const loadImage = useCallback(async (imageSrc: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      if (crossOrigin) {
        img.crossOrigin = crossOrigin;
      }

      img.onload = () => {
        resolve();
      };

      img.onerror = () => {
        reject(new Error(`Failed to load image: ${imageSrc}`));
      };

      img.src = imageSrc;
    });
  }, [crossOrigin]);

  // 开始加载图片
  const startLoading = useCallback(async () => {
    if (state.loading || state.loaded) {
      return;
    }

    updateState({ loading: true, error: false });
    onLoadStart?.();

    try {
      await loadImage(src);
      
      updateState({
        loading: false,
        loaded: true,
        currentSrc: src
      });

      // 触发加载成功回调
      if (onLoad && imgRef.current) {
        const event = new Event('load') as any;
        onLoad(event);
      }

      logger.debug('Lazy image loaded successfully', { src });

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      
      // 重试逻辑
      if (state.retryCount < retries) {
        const nextRetryCount = state.retryCount + 1;
        updateState({ retryCount: nextRetryCount });
        
        logger.warn('Lazy image load failed, retrying', {
          src,
          attempt: nextRetryCount,
          maxRetries: retries
        });

        retryTimeoutRef.current = setTimeout(() => {
          startLoading();
        }, retryDelay * nextRetryCount);

      } else {
        // 所有重试都失败了
        const finalSrc = fallback || placeholder || '';
        
        updateState({
          loading: false,
          error: true,
          currentSrc: finalSrc
        });

        onError?.(err);
        
        logger.error('Lazy image load failed after all retries', err, {
          src,
          retries
        });
      }
    }
  }, [src, state.loading, state.loaded, state.retryCount, retries, retryDelay, placeholder, fallback, loadImage, updateState, onLoadStart, onLoad, onError]);

  // 设置交叉观察器
  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const container = containerRef.current;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !state.loaded && !state.loading) {
          startLoading();
          observer.disconnect(); // 只加载一次
        }
      },
      intersectionOptions
    );

    observer.observe(container);
    observerRef.current = observer;

    return () => {
      observer.disconnect();
    };
  }, [intersectionOptions, state.loaded, state.loading, startLoading]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // 计算图片样式
  const getImageStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      width: '100%',
      height: 'auto',
      display: 'block',
      ...style
    };

    // 渐入动画
    if (fadeIn) {
      baseStyle.transition = `opacity ${fadeInDuration}ms ease-in-out`;
      baseStyle.opacity = state.loaded ? 1 : 0;
    }

    // 模糊到清晰效果
    if (blurToSharp && !state.loaded && state.currentSrc === placeholder) {
      baseStyle.filter = 'blur(5px)';
      baseStyle.transition = `${baseStyle.transition || ''}, filter ${fadeInDuration}ms ease-in-out`;
    }

    return baseStyle;
  };

  // 计算容器样式
  const getContainerStyle = (): React.CSSProperties => {
    return {
      position: 'relative',
      overflow: 'hidden',
      ...containerStyle
    };
  };

  // 渲染加载指示器
  const renderLoadingIndicator = () => {
    if (!state.loading) return null;

    return (
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1
        }}
      >
        <div
          style={{
            width: '24px',
            height: '24px',
            border: '2px solid #f3f4f6',
            borderTop: '2px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}
        />
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  };

  // 渲染错误指示器
  const renderErrorIndicator = () => {
    if (!state.error) return null;

    return (
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1,
          color: '#ef4444',
          fontSize: '12px',
          textAlign: 'center'
        }}
      >
        <div style={{ marginBottom: '4px' }}>⚠️</div>
        <div>加载失败</div>
      </div>
    );
  };

  const imgAttributes = {
    ref: imgRef,
    src: state.currentSrc,
    alt,
    style: getImageStyle(),
    className,
    loading: preload as any,
    crossOrigin,
    fetchPriority: fetchPriority as any,
    sizes,
    srcSet,
    ...imgProps
  };

  return (
    <div
      ref={containerRef}
      style={getContainerStyle()}
      className={containerClassName}
    >
      <img {...imgAttributes} />
      {renderLoadingIndicator()}
      {renderErrorIndicator()}
    </div>
  );
};

/**
 * 响应式懒加载图片组件
 */
interface ResponsiveLazyImageProps extends Omit<LazyImageProps, 'src' | 'srcSet' | 'sizes'> {
  // 响应式图片源
  sources: Array<{
    src: string;
    width: number;
    density?: number;
  }>;
  // 默认图片源
  defaultSrc: string;
  // 尺寸描述
  sizes?: string;
}

export const ResponsiveLazyImage: React.FC<ResponsiveLazyImageProps> = ({
  sources,
  defaultSrc,
  sizes = '100vw',
  ...props
}) => {
  // 生成srcSet
  const srcSet = sources
    .map(source => {
      const descriptor = source.density ? `${source.density}x` : `${source.width}w`;
      return `${source.src} ${descriptor}`;
    })
    .join(', ');

  return (
    <LazyImage
      {...props}
      src={defaultSrc}
      config={{
        ...props.config,
        srcSet,
        sizes
      }}
    />
  );
};

/**
 * 图片画廊懒加载组件
 */
interface LazyImageGalleryProps {
  images: Array<{
    src: string;
    alt: string;
    thumbnail?: string;
    caption?: string;
  }>;
  columns?: number;
  gap?: number;
  config?: LazyImageConfig;
  onImageClick?: (index: number, image: any) => void;
}

export const LazyImageGallery: React.FC<LazyImageGalleryProps> = ({
  images,
  columns = 3,
  gap = 16,
  config,
  onImageClick
}) => {
  const galleryStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    gap: `${gap}px`
  };

  const itemStyle: React.CSSProperties = {
    cursor: onImageClick ? 'pointer' : 'default',
    borderRadius: '8px',
    overflow: 'hidden',
    transition: 'transform 0.2s ease-in-out'
  };

  return (
    <div style={galleryStyle}>
      {images.map((image, index) => (
        <div
          key={index}
          style={itemStyle}
          onClick={() => onImageClick?.(index, image)}
          onMouseEnter={(e) => {
            if (onImageClick) {
              (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)';
            }
          }}
          onMouseLeave={(e) => {
            if (onImageClick) {
              (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
            }
          }}
        >
          <LazyImage
            src={image.thumbnail || image.src}
            alt={image.alt}
            config={{
              fadeIn: true,
              blurToSharp: true,
              ...config
            }}
            style={{
              width: '100%',
              height: '200px',
              objectFit: 'cover'
            }}
          />
          {image.caption && (
            <div
              style={{
                padding: '8px',
                fontSize: '14px',
                color: '#666',
                backgroundColor: '#f9fafb'
              }}
            >
              {image.caption}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

/**
 * 懒加载图片Hook
 */
export function useLazyImage(src: string, config: LazyImageConfig = {}) {
  const [state, setState] = useState<LazyImageState>({
    loading: false,
    loaded: false,
    error: false,
    retryCount: 0,
    currentSrc: config.placeholder || ''
  });

  const [isIntersecting, setIsIntersecting] = useState(false);
  const elementRef = useRef<HTMLElement | null>(null);

  // 加载图片
  const loadImage = useCallback(async () => {
    if (state.loading || state.loaded) return;

    setState(prev => ({ ...prev, loading: true, error: false }));

    try {
      const img = new Image();
      if (config.crossOrigin) {
        img.crossOrigin = config.crossOrigin;
      }

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = src;
      });

      setState(prev => ({
        ...prev,
        loading: false,
        loaded: true,
        currentSrc: src
      }));

    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: true,
        currentSrc: config.fallback || config.placeholder || ''
      }));
    }
  }, [src, state.loading, state.loaded, config.crossOrigin, config.fallback, config.placeholder]);

  // 设置交叉观察器
  useEffect(() => {
    if (!elementRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      config.intersectionOptions || { threshold: 0.1, rootMargin: '50px' }
    );

    observer.observe(elementRef.current);

    return () => observer.disconnect();
  }, [config.intersectionOptions]);

  // 当元素可见时加载图片
  useEffect(() => {
    if (isIntersecting && !state.loaded && !state.loading) {
      loadImage();
    }
  }, [isIntersecting, state.loaded, state.loading, loadImage]);

  return {
    ...state,
    elementRef,
    loadImage
  };
}

export default LazyImage;