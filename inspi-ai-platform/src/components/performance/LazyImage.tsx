'use client';

import React, { useState, useEffect, useRef, CSSProperties } from 'react';

interface LazyImageProps {
  src: string;
  alt: string;
  placeholder?: string;
  style?: CSSProperties;
  className?: string;
  threshold?: number;
  rootMargin?: string;
  onLoad?: () => void;
  onError?: () => void;
  forceLoad?: boolean;
}

export function LazyImage({
  src,
  alt,
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2YzZjRmNiIvPjwvc3ZnPg==',
  style,
  className,
  threshold = 0.1,
  rootMargin = '100px',
  onLoad,
  onError,
  forceLoad = false,
}: LazyImageProps) {
  const [imageSrc, setImageSrc] = useState(placeholder);
  const [imageRef, setImageRef] = useState<HTMLImageElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (forceLoad) {
      setImageSrc(src);
      setIsLoaded(true);
      setIsError(false);
      onLoad?.();
    } else {
      setImageSrc(placeholder);
      setIsLoaded(false);
      setIsError(false);
    }
  }, [forceLoad, src, placeholder, onLoad]);

  useEffect(() => {
    if (forceLoad) {
      return () => undefined;
    }

    let observer: IntersectionObserver | null = null;

    if (imageRef && !isLoaded) {
      // 使用 IntersectionObserver 进行懒加载
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              // 开始加载真实图片
              const img = new Image();
              img.src = src;

              img.onload = () => {
                setImageSrc(src);
                setIsLoaded(true);
                onLoad?.();
              };

              img.onerror = () => {
                setIsError(true);
                onError?.();
              };

              // 断开观察
              observer?.disconnect();
            }
          });
        },
        {
          threshold,
          rootMargin,
        },
      );

      observer.observe(imageRef);
    }

    return () => {
      observer?.disconnect();
    };
  }, [imageRef, src, isLoaded, threshold, rootMargin, onLoad, onError, forceLoad]);

  return (
    // 使用原生 <img> 以便完全掌控懒加载流程
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={setImageRef}
      src={imageSrc}
      alt={alt}
      style={{
        ...style,
        transition: 'opacity 0.3s ease-in-out',
        opacity: isLoaded ? 1 : 0.8,
        filter: isLoaded ? 'none' : 'blur(5px)',
      }}
      className={className}
      loading="lazy"
      decoding="async"
    />
  );
}

// 懒加载背景图片组件
interface LazyBackgroundProps {
  src: string;
  placeholder?: string;
  children: React.ReactNode;
  style?: CSSProperties;
  className?: string;
  threshold?: number;
  rootMargin?: string;
}

export function LazyBackground({
  src,
  placeholder = 'linear-gradient(to right, #f3f4f6, #e5e7eb)',
  children,
  style,
  className,
  threshold = 0.1,
  rootMargin = '100px',
}: LazyBackgroundProps) {
  const [backgroundImage, setBackgroundImage] = useState(placeholder);
  const [elementRef, setElementRef] = useState<HTMLDivElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let observer: IntersectionObserver | null = null;

    if (elementRef && !isLoaded) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              // 预加载图片
              const img = new Image();
              img.src = src;

              img.onload = () => {
                setBackgroundImage(`url(${src})`);
                setIsLoaded(true);
              };

              observer?.disconnect();
            }
          });
        },
        {
          threshold,
          rootMargin,
        },
      );

      observer.observe(elementRef);
    }

    return () => {
      observer?.disconnect();
    };
  }, [elementRef, src, isLoaded, threshold, rootMargin]);

  return (
    <div
      ref={setElementRef}
      style={{
        ...style,
        backgroundImage,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        transition: 'background-image 0.3s ease-in-out',
      }}
      className={className}
    >
      {children}
    </div>
  );
}
