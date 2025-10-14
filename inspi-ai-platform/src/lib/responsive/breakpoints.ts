/**
 * 响应式断点系统
 * 移动优先设计，渐进增强
 */

export const breakpoints = {
  // 移动端 - 320px到767px
  mobile: {
    min: '320px',
    max: '767px',
  },
  // 平板端 - 768px到1023px
  tablet: {
    min: '768px',
    max: '1023px',
  },
  // 桌面端 - 1024px到1439px
  desktop: {
    min: '1024px',
    max: '1439px',
  },
  // 宽屏 - 1440px以上
  wide: {
    min: '1440px',
    max: '9999px',
  },
} as const;

// Tailwind CSS 断点配置
export const tailwindBreakpoints = {
  'sm': '640px',   // 小屏幕
  'md': '768px',   // 中等屏幕
  'lg': '1024px',  // 大屏幕
  'xl': '1280px',  // 超大屏幕
  '2xl': '1536px',  // 超宽屏幕
};

// 媒体查询工具函数
export const mediaQueries = {
  mobile: `@media (max-width: ${breakpoints.mobile.max})`,
  tablet: `@media (min-width: ${breakpoints.tablet.min}) and (max-width: ${breakpoints.tablet.max})`,
  desktop: `@media (min-width: ${breakpoints.desktop.min}) and (max-width: ${breakpoints.desktop.max})`,
  wide: `@media (min-width: ${breakpoints.wide.min})`,

  // 最小宽度查询（移动优先）
  minMobile: `@media (min-width: ${breakpoints.mobile.min})`,
  minTablet: `@media (min-width: ${breakpoints.tablet.min})`,
  minDesktop: `@media (min-width: ${breakpoints.desktop.min})`,
  minWide: `@media (min-width: ${breakpoints.wide.min})`,
};

// React Hook for responsive detection
export type BreakpointKey = keyof typeof breakpoints

export interface ResponsiveState {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isWide: boolean
  currentBreakpoint: BreakpointKey
  screenWidth: number
  screenHeight: number
}

// 断点检测工具
export const getBreakpoint = (width: number): BreakpointKey => {
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  if (width < 1440) return 'desktop';
  return 'wide';
};

// 响应式值映射
export interface ResponsiveValue<T> {
  mobile?: T
  tablet?: T
  desktop?: T
  wide?: T
  default: T
}

export const getResponsiveValue = <T>(
  value: ResponsiveValue<T>,
  breakpoint: BreakpointKey,
): T => {
  return value[breakpoint] ?? value.default;
};
