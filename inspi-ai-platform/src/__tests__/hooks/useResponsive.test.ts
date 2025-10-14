import { renderHook, act } from '@testing-library/react';

import { useResponsive, useBreakpoint, useMediaQuery, useResponsiveValue } from '@/shared/hooks/useResponsive';

// Mock window.matchMedia
const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
};

// Mock window dimensions
const mockWindowDimensions = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
};

describe('useResponsive Hook', () => {
  beforeEach(() => {
    mockMatchMedia(false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should return mobile breakpoint for small screens', () => {
    mockWindowDimensions(600, 800);

    const { result } = renderHook(() => useResponsive());

    expect(result.current.breakpoint).toBe('mobile');
    expect(result.current.isMobile).toBe(true);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isDesktop).toBe(false);
    expect(result.current.isWide).toBe(false);
  });

  test('should return tablet breakpoint for medium screens', () => {
    mockWindowDimensions(800, 600);

    const { result } = renderHook(() => useResponsive());

    expect(result.current.breakpoint).toBe('tablet');
    expect(result.current.isMobile).toBe(false);
    expect(result.current.isTablet).toBe(true);
    expect(result.current.isDesktop).toBe(false);
    expect(result.current.isWide).toBe(false);
  });

  test('should return desktop breakpoint for large screens', () => {
    mockWindowDimensions(1200, 800);

    const { result } = renderHook(() => useResponsive());

    expect(result.current.breakpoint).toBe('desktop');
    expect(result.current.isMobile).toBe(false);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isDesktop).toBe(true);
    expect(result.current.isWide).toBe(false);
  });

  test('should return wide breakpoint for extra large screens', () => {
    mockWindowDimensions(1600, 900);

    const { result } = renderHook(() => useResponsive());

    expect(result.current.breakpoint).toBe('wide');
    expect(result.current.isMobile).toBe(false);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isDesktop).toBe(false);
    expect(result.current.isWide).toBe(true);
  });

  test('should detect orientation correctly', () => {
    // Portrait
    mockWindowDimensions(600, 800);
    const { result: portraitResult } = renderHook(() => useResponsive());
    expect(portraitResult.current.orientation).toBe('portrait');

    // Landscape
    mockWindowDimensions(800, 600);
    const { result: landscapeResult } = renderHook(() => useResponsive());
    expect(landscapeResult.current.orientation).toBe('landscape');
  });

  test('should update on window resize', () => {
    mockWindowDimensions(600, 800);

    const { result } = renderHook(() => useResponsive());

    expect(result.current.breakpoint).toBe('mobile');

    // Simulate window resize
    act(() => {
      mockWindowDimensions(1200, 800);
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current.breakpoint).toBe('desktop');
  });
});

describe('useBreakpoint Hook', () => {
  test('should return true for current and smaller breakpoints', () => {
    mockWindowDimensions(1200, 800); // desktop

    const { result: mobileResult } = renderHook(() => useBreakpoint('mobile'));
    const { result: tabletResult } = renderHook(() => useBreakpoint('tablet'));
    const { result: desktopResult } = renderHook(() => useBreakpoint('desktop'));
    const { result: wideResult } = renderHook(() => useBreakpoint('wide'));

    expect(mobileResult.current).toBe(true);
    expect(tabletResult.current).toBe(true);
    expect(desktopResult.current).toBe(true);
    expect(wideResult.current).toBe(false);
  });
});

describe('useMediaQuery Hook', () => {
  test('should return media query match result', () => {
    mockMatchMedia(true);

    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'));

    expect(result.current).toBe(true);
  });
});

describe('useResponsiveValue Hook', () => {
  test('should return appropriate value for current breakpoint', () => {
    mockWindowDimensions(1200, 800); // desktop

    const values = {
      mobile: 'mobile-value',
      tablet: 'tablet-value',
      desktop: 'desktop-value',
      wide: 'wide-value',
    };

    const { result } = renderHook(() => useResponsiveValue(values));

    expect(result.current).toBe('desktop-value');
  });

  test('should fallback to available values', () => {
    mockWindowDimensions(1200, 800); // desktop

    const values = {
      mobile: 'mobile-value',
      wide: 'wide-value',
    };

    const { result } = renderHook(() => useResponsiveValue(values));

    // Should fallback to mobile-value since desktop/tablet are not available
    // and mobile is the base fallback
    expect(result.current).toBe('mobile-value');
  });
});
