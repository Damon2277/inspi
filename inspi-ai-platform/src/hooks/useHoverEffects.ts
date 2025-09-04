'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface UseHoverEffectsOptions {
  disabled?: boolean;
  delay?: number;
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
}

/**
 * 悬停效果管理Hook
 * 提供悬停状态管理和回调处理
 */
export const useHoverEffects = (options: UseHoverEffectsOptions = {}) => {
  const {
    disabled = false,
    delay = 0,
    onHoverStart,
    onHoverEnd
  } = options;

  const [isHovered, setIsHovered] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = useCallback(() => {
    if (disabled) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (delay > 0) {
      timeoutRef.current = setTimeout(() => {
        setIsHovered(true);
        onHoverStart?.();
      }, delay);
    } else {
      setIsHovered(true);
      onHoverStart?.();
    }
  }, [disabled, delay, onHoverStart]);

  const handleMouseLeave = useCallback(() => {
    if (disabled) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setIsHovered(false);
    onHoverEnd?.();
  }, [disabled, onHoverEnd]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    isHovered,
    hoverProps: {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave
    }
  };
};

/**
 * 检测设备是否支持悬停
 */
export const useHoverSupport = () => {
  const [supportsHover, setSupportsHover] = useState(false);

  useEffect(() => {
    // 检测设备是否支持悬停（非触摸设备）
    const mediaQuery = window.matchMedia('(hover: hover)');
    setSupportsHover(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setSupportsHover(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return supportsHover;
};