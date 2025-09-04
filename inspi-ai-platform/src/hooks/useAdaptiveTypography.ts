'use client';

import { useResponsive } from './useResponsive';

interface TypographyScale {
  mobile: number;
  tablet: number;
  desktop: number;
  wide: number;
}

interface SpacingScale {
  mobile: number;
  tablet: number;
  desktop: number;
  wide: number;
}

interface AdaptiveTypographyConfig {
  fontScale?: TypographyScale;
  spacingScale?: SpacingScale;
  baseSize?: number;
  baseSpacing?: number;
}

/**
 * 自适应字体和间距Hook
 * 根据当前断点返回适当的字体大小和间距值
 */
export function useAdaptiveTypography(config: AdaptiveTypographyConfig = {}) {
  const { breakpoint } = useResponsive();
  
  const defaultFontScale: TypographyScale = {
    mobile: 1,
    tablet: 1.125,
    desktop: 1.25,
    wide: 1.375,
  };
  
  const defaultSpacingScale: SpacingScale = {
    mobile: 1,
    tablet: 1.125,
    desktop: 1.25,
    wide: 1.375,
  };
  
  const fontScale = config.fontScale || defaultFontScale;
  const spacingScale = config.spacingScale || defaultSpacingScale;
  const baseSize = config.baseSize || 16;
  const baseSpacing = config.baseSpacing || 4;
  
  // 获取当前断点的缩放比例
  const currentFontScale = fontScale[breakpoint];
  const currentSpacingScale = spacingScale[breakpoint];
  
  /**
   * 计算响应式字体大小
   * @param size 基础字体大小（rem）
   * @returns 缩放后的字体大小（px）
   */
  const getFontSize = (size: number): number => {
    return Math.round(size * baseSize * currentFontScale);
  };
  
  /**
   * 计算响应式间距
   * @param spacing 基础间距（单位）
   * @returns 缩放后的间距（px）
   */
  const getSpacing = (spacing: number): number => {
    return Math.round(spacing * baseSpacing * currentSpacingScale);
  };
  
  /**
   * 获取字体大小的CSS值
   * @param size 基础字体大小（rem）
   * @returns CSS字体大小值
   */
  const getFontSizeCSS = (size: number): string => {
    return `${getFontSize(size)}px`;
  };
  
  /**
   * 获取间距的CSS值
   * @param spacing 基础间距（单位）
   * @returns CSS间距值
   */
  const getSpacingCSS = (spacing: number): string => {
    return `${getSpacing(spacing)}px`;
  };
  
  /**
   * 获取行高
   * @param ratio 行高比例
   * @returns 行高值
   */
  const getLineHeight = (ratio: number): number => {
    return ratio;
  };
  
  /**
   * 预定义的字体大小
   */
  const fontSizes = {
    xs: getFontSize(0.75),
    sm: getFontSize(0.875),
    base: getFontSize(1),
    lg: getFontSize(1.125),
    xl: getFontSize(1.25),
    '2xl': getFontSize(1.5),
    '3xl': getFontSize(1.875),
    '4xl': getFontSize(2.25),
    '5xl': getFontSize(3),
    '6xl': getFontSize(3.75),
  };
  
  /**
   * 预定义的间距大小
   */
  const spacings = {
    xs: getSpacing(1),
    sm: getSpacing(2),
    md: getSpacing(4),
    lg: getSpacing(6),
    xl: getSpacing(8),
    '2xl': getSpacing(12),
    '3xl': getSpacing(16),
    '4xl': getSpacing(24),
    '5xl': getSpacing(32),
  };
  
  /**
   * 预定义的行高
   */
  const lineHeights = {
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  };
  
  /**
   * 语义化字体样式
   */
  const textStyles = {
    heading1: {
      fontSize: fontSizes['5xl'],
      fontWeight: 700,
      lineHeight: lineHeights.tight,
    },
    heading2: {
      fontSize: fontSizes['4xl'],
      fontWeight: 600,
      lineHeight: lineHeights.tight,
    },
    heading3: {
      fontSize: fontSizes['3xl'],
      fontWeight: 600,
      lineHeight: lineHeights.snug,
    },
    heading4: {
      fontSize: fontSizes['2xl'],
      fontWeight: 500,
      lineHeight: lineHeights.snug,
    },
    heading5: {
      fontSize: fontSizes.xl,
      fontWeight: 500,
      lineHeight: lineHeights.normal,
    },
    heading6: {
      fontSize: fontSizes.lg,
      fontWeight: 500,
      lineHeight: lineHeights.normal,
    },
    bodyLarge: {
      fontSize: fontSizes.lg,
      fontWeight: 400,
      lineHeight: lineHeights.relaxed,
    },
    body: {
      fontSize: fontSizes.base,
      fontWeight: 400,
      lineHeight: lineHeights.normal,
    },
    bodySmall: {
      fontSize: fontSizes.sm,
      fontWeight: 400,
      lineHeight: lineHeights.normal,
    },
    caption: {
      fontSize: fontSizes.xs,
      fontWeight: 400,
      lineHeight: lineHeights.normal,
    },
    label: {
      fontSize: fontSizes.sm,
      fontWeight: 500,
      lineHeight: lineHeights.normal,
    },
  };
  
  return {
    // 当前缩放比例
    fontScale: currentFontScale,
    spacingScale: currentSpacingScale,
    
    // 计算函数
    getFontSize,
    getSpacing,
    getFontSizeCSS,
    getSpacingCSS,
    getLineHeight,
    
    // 预定义值
    fontSizes,
    spacings,
    lineHeights,
    textStyles,
    
    // 当前断点
    breakpoint,
  };
}

/**
 * 响应式值选择Hook
 * 根据当前断点选择对应的值
 */
export function useResponsiveTypographyValue<T>(values: {
  mobile?: T;
  tablet?: T;
  desktop?: T;
  wide?: T;
}): T | undefined {
  const { breakpoint } = useResponsive();
  
  // 优先返回当前断点的值
  if (values[breakpoint] !== undefined) {
    return values[breakpoint];
  }
  
  // 向下查找最近的可用值
  const breakpointOrder: Array<keyof typeof values> = ['wide', 'desktop', 'tablet', 'mobile'];
  const currentIndex = breakpointOrder.indexOf(breakpoint);
  
  for (let i = currentIndex + 1; i < breakpointOrder.length; i++) {
    const bp = breakpointOrder[i];
    if (values[bp] !== undefined) {
      return values[bp];
    }
  }
  
  return undefined;
}

/**
 * 字体大小工具函数
 */
export const createResponsiveFontSize = (sizes: {
  mobile?: number;
  tablet?: number;
  desktop?: number;
  wide?: number;
}) => {
  return (breakpoint: string): string => {
    const size = sizes[breakpoint as keyof typeof sizes] || sizes.mobile || 1;
    const scales = {
      mobile: 1,
      tablet: 1.125,
      desktop: 1.25,
      wide: 1.375,
    };
    const scale = scales[breakpoint as keyof typeof scales] || 1;
    return `${size * 16 * scale}px`;
  };
};

/**
 * 间距工具函数
 */
export const createResponsiveSpacing = (spacings: {
  mobile?: number;
  tablet?: number;
  desktop?: number;
  wide?: number;
}) => {
  return (breakpoint: string): string => {
    const spacing = spacings[breakpoint as keyof typeof spacings] || spacings.mobile || 1;
    const scales = {
      mobile: 1,
      tablet: 1.125,
      desktop: 1.25,
      wide: 1.375,
    };
    const scale = scales[breakpoint as keyof typeof scales] || 1;
    return `${spacing * 4 * scale}px`;
  };
};