'use client';

import { useState, useEffect } from 'react';

// 断点定义
export const breakpoints = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
  wide: 1440,
} as const;

export type Breakpoint = keyof typeof breakpoints;

// 响应式状态接口
export interface ResponsiveState {
  breakpoint: Breakpoint;
  screenWidth: number;
  screenHeight: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isWide: boolean;
  orientation: 'portrait' | 'landscape';
  touchDevice: boolean;
}

// 获取当前断点
function getCurrentBreakpoint(width: number): Breakpoint {
  if (width >= breakpoints.wide) return 'wide';
  if (width >= breakpoints.desktop) return 'desktop';
  if (width >= breakpoints.tablet) return 'tablet';
  return 'mobile';
}

// 检测是否为触摸设备
function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * 响应式断点检测Hook
 * 提供当前屏幕尺寸、断点信息和设备类型检测
 */
export function useResponsive(): ResponsiveState {
  // 始终使用相同的初始状态以避免hydration错误
  const [state, setState] = useState<ResponsiveState>({
    breakpoint: 'mobile',
    screenWidth: 0,
    screenHeight: 0,
    isMobile: true,
    isTablet: false,
    isDesktop: false,
    isWide: false,
    orientation: 'portrait',
    touchDevice: false,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const breakpoint = getCurrentBreakpoint(width);

      setState({
        breakpoint,
        screenWidth: width,
        screenHeight: height,
        isMobile: breakpoint === 'mobile',
        isTablet: breakpoint === 'tablet',
        isDesktop: breakpoint === 'desktop',
        isWide: breakpoint === 'wide',
        orientation: width > height ? 'landscape' : 'portrait',
        touchDevice: isTouchDevice(),
      });
    };

    // 初始化时立即执行一次
    handleResize();

    // 添加resize监听器
    window.addEventListener('resize', handleResize);
    
    // 清理函数
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return state;
}

/**
 * 断点匹配Hook
 * 用于条件渲染特定断点的组件
 */
export function useBreakpoint(targetBreakpoint: Breakpoint): boolean {
  const { breakpoint } = useResponsive();
  
  const breakpointOrder: Breakpoint[] = ['mobile', 'tablet', 'desktop', 'wide'];
  const currentIndex = breakpointOrder.indexOf(breakpoint);
  const targetIndex = breakpointOrder.indexOf(targetBreakpoint);
  
  return currentIndex >= targetIndex;
}

/**
 * 媒体查询Hook
 * 用于自定义媒体查询条件
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [query]);

  return matches;
}

/**
 * 响应式值Hook
 * 根据当前断点返回不同的值
 */
export function useResponsiveValue<T>(values: {
  mobile?: T;
  tablet?: T;
  desktop?: T;
  wide?: T;
}): T | undefined {
  const { breakpoint } = useResponsive();
  
  // 按优先级返回值
  if (breakpoint === 'wide' && values.wide !== undefined) return values.wide;
  if (breakpoint === 'desktop' && values.desktop !== undefined) return values.desktop;
  if (breakpoint === 'tablet' && values.tablet !== undefined) return values.tablet;
  if (values.mobile !== undefined) return values.mobile;
  
  // 降级策略：返回最接近的可用值
  if (values.desktop !== undefined) return values.desktop;
  if (values.tablet !== undefined) return values.tablet;
  if (values.wide !== undefined) return values.wide;
  
  return undefined;
}