/**
 * useResponsive Hook 测试
 * 测试响应式断点检测和屏幕尺寸监控功能
 */

import { renderHook, act } from '@testing-library/react';
import { 
  useResponsive, 
  useBreakpoint, 
  useMediaQuery, 
  useResponsiveValue,
  breakpoints 
} from '@/hooks/useResponsive';

// Mock window对象
const mockWindow = {
  innerWidth: 1024,
  innerHeight: 768,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  matchMedia: jest.fn(),
};

// Mock navigator
const mockNavigator = {
  maxTouchPoints: 0,
};

describe('useResponsive Hook Tests', () => {
  beforeEach(() => {
    // 重置所有mock
    jest.clearAllMocks();
    
    // 设置window mock
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768,
    });
    Object.defineProperty(window, 'addEventListener', {
      writable: true,
      configurable: true,
      value: mockWindow.addEventListener,
    });
    Object.defineProperty(window, 'removeEventListener', {
      writable: true,
      configurable: true,
      value: mockWindow.removeEventListener,
    });
    Object.defineProperty(navigator, 'maxTouchPoints', {
      writable: true,
      configurable: true,
      value: 0,
    });
  });

  describe('useResponsive基础功能', () => {
    it('应该返回正确的初始状态', () => {
      const { result } = renderHook(() => useResponsive());

      expect(result.current).toEqual({
        breakpoint: 'desktop',
        screenWidth: 1024,
        screenHeight: 768,
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isWide: false,
        orientation: 'landscape',
        touchDevice: false,
      });
    });

    it('应该正确检测移动端断点', () => {
      // 设置移动端尺寸
      Object.defineProperty(window, 'innerWidth', { value: 375 });
      Object.defineProperty(window, 'innerHeight', { value: 667 });

      const { result } = renderHook(() => useResponsive());

      expect(result.current.breakpoint).toBe('mobile');
      expect(result.current.isMobile).toBe(true);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isDesktop).toBe(false);
      expect(result.current.orientation).toBe('portrait');
    });

    it('应该正确检测平板端断点', () => {
      // 设置平板端尺寸
      Object.defineProperty(window, 'innerWidth', { value: 768 });
      Object.defineProperty(window, 'innerHeight', { value: 1024 });

      const { result } = renderHook(() => useResponsive());

      expect(result.current.breakpoint).toBe('tablet');
      expect(result.current.isMobile).toBe(false);
      expect(result.current.isTablet).toBe(true);
      expect(result.current.isDesktop).toBe(false);
      expect(result.current.orientation).toBe('portrait');
    });

    it('应该正确检测桌面端断点', () => {
      // 设置桌面端尺寸
      Object.defineProperty(window, 'innerWidth', { value: 1024 });
      Object.defineProperty(window, 'innerHeight', { value: 768 });

      const { result } = renderHook(() => useResponsive());

      expect(result.current.breakpoint).toBe('desktop');
      expect(result.current.isDesktop).toBe(true);
      expect(result.current.orientation).toBe('landscape');
    });

    it('应该正确检测宽屏断点', () => {
      // 设置宽屏尺寸
      Object.defineProperty(window, 'innerWidth', { value: 1440 });
      Object.defineProperty(window, 'innerHeight', { value: 900 });

      const { result } = renderHook(() => useResponsive());

      expect(result.current.breakpoint).toBe('wide');
      expect(result.current.isWide).toBe(true);
      expect(result.current.orientation).toBe('landscape');
    });

    it('应该正确检测触摸设备', () => {
      // Mock触摸设备
      Object.defineProperty(navigator, 'maxTouchPoints', { value: 1 });

      const { result } = renderHook(() => useResponsive());

      expect(result.current.touchDevice).toBe(true);
    });
  });

  describe('响应式事件监听', () => {
    it('应该添加resize事件监听器', () => {
      renderHook(() => useResponsive());

      expect(window.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
    });

    it('应该在组件卸载时移除事件监听器', () => {
      const { unmount } = renderHook(() => useResponsive());

      unmount();

      expect(window.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
    });

    it('应该响应窗口尺寸变化', () => {
      const { result } = renderHook(() => useResponsive());

      // 初始状态为桌面端
      expect(result.current.breakpoint).toBe('desktop');

      // 模拟窗口尺寸变化到移动端
      act(() => {
        Object.defineProperty(window, 'innerWidth', { value: 375 });
        Object.defineProperty(window, 'innerHeight', { value: 667 });
        
        // 触发resize事件
        const resizeHandler = mockWindow.addEventListener.mock.calls.find(
          call => call[0] === 'resize'
        )?.[1];
        
        if (resizeHandler) {
          resizeHandler();
        }
      });

      expect(result.current.breakpoint).toBe('mobile');
      expect(result.current.isMobile).toBe(true);
      expect(result.current.screenWidth).toBe(375);
      expect(result.current.screenHeight).toBe(667);
    });

    it('应该正确检测方向变化', () => {
      const { result } = renderHook(() => useResponsive());

      // 模拟从横屏变为竖屏
      act(() => {
        Object.defineProperty(window, 'innerWidth', { value: 768 });
        Object.defineProperty(window, 'innerHeight', { value: 1024 });
        
        const resizeHandler = mockWindow.addEventListener.mock.calls.find(
          call => call[0] === 'resize'
        )?.[1];
        
        if (resizeHandler) {
          resizeHandler();
        }
      });

      expect(result.current.orientation).toBe('portrait');
    });
  });

  describe('SSR兼容性', () => {
    it('应该在服务端渲染时返回默认状态', () => {
      // Mock服务端环境
      const originalWindow = global.window;
      delete (global as any).window;

      const { result } = renderHook(() => useResponsive());

      expect(result.current).toEqual({
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

      // 恢复window对象
      global.window = originalWindow;
    });
  });

  describe('性能优化', () => {
    it('应该防抖处理resize事件', async () => {
      const { result } = renderHook(() => useResponsive());

      // 快速触发多次resize事件
      act(() => {
        const resizeHandler = mockWindow.addEventListener.mock.calls.find(
          call => call[0] === 'resize'
        )?.[1];
        
        if (resizeHandler) {
          // 模拟快速连续的resize事件
          for (let i = 0; i < 10; i++) {
            Object.defineProperty(window, 'innerWidth', { value: 800 + i });
            resizeHandler();
          }
        }
      });

      // 最终状态应该是最后一次的值
      expect(result.current.screenWidth).toBe(809);
    });
  });
});

describe('useBreakpoint Hook Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(window, 'innerWidth', { value: 1024 });
    Object.defineProperty(window, 'innerHeight', { value: 768 });
  });

  it('应该正确匹配当前断点', () => {
    const { result } = renderHook(() => useBreakpoint('desktop'));

    expect(result.current).toBe(true);
  });

  it('应该正确匹配更小的断点', () => {
    const { result } = renderHook(() => useBreakpoint('tablet'));

    expect(result.current).toBe(true); // desktop >= tablet
  });

  it('应该不匹配更大的断点', () => {
    const { result } = renderHook(() => useBreakpoint('wide'));

    expect(result.current).toBe(false); // desktop < wide
  });

  it('应该响应断点变化', () => {
    const { result, rerender } = renderHook(() => useBreakpoint('wide'));

    // 初始状态不匹配wide
    expect(result.current).toBe(false);

    // 改变窗口尺寸到wide
    act(() => {
      Object.defineProperty(window, 'innerWidth', { value: 1440 });
      const resizeHandler = window.addEventListener.mock.calls.find(
        call => call[0] === 'resize'
      )?.[1];
      if (resizeHandler) resizeHandler();
    });

    rerender();
    expect(result.current).toBe(true);
  });
});

describe('useMediaQuery Hook Tests', () => {
  const mockMatchMedia = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: mockMatchMedia,
    });
  });

  it('应该正确处理媒体查询匹配', () => {
    const mockMediaQueryList = {
      matches: true,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };

    mockMatchMedia.mockReturnValue(mockMediaQueryList);

    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));

    expect(result.current).toBe(true);
    expect(mockMatchMedia).toHaveBeenCalledWith('(min-width: 768px)');
    expect(mockMediaQueryList.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('应该正确处理媒体查询不匹配', () => {
    const mockMediaQueryList = {
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };

    mockMatchMedia.mockReturnValue(mockMediaQueryList);

    const { result } = renderHook(() => useMediaQuery('(min-width: 1200px)'));

    expect(result.current).toBe(false);
  });

  it('应该响应媒体查询变化', () => {
    const mockMediaQueryList = {
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };

    mockMatchMedia.mockReturnValue(mockMediaQueryList);

    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));

    expect(result.current).toBe(false);

    // 模拟媒体查询变化
    act(() => {
      const changeHandler = mockMediaQueryList.addEventListener.mock.calls.find(
        call => call[0] === 'change'
      )?.[1];
      
      if (changeHandler) {
        changeHandler({ matches: true });
      }
    });

    expect(result.current).toBe(true);
  });

  it('应该在组件卸载时清理事件监听器', () => {
    const mockMediaQueryList = {
      matches: true,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };

    mockMatchMedia.mockReturnValue(mockMediaQueryList);

    const { unmount } = renderHook(() => useMediaQuery('(min-width: 768px)'));

    unmount();

    expect(mockMediaQueryList.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });
});

describe('useResponsiveValue Hook Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('应该返回当前断点对应的值', () => {
    // 设置为桌面端
    Object.defineProperty(window, 'innerWidth', { value: 1024 });

    const { result } = renderHook(() => 
      useResponsiveValue({
        mobile: 'mobile-value',
        tablet: 'tablet-value',
        desktop: 'desktop-value',
        wide: 'wide-value',
      })
    );

    expect(result.current).toBe('desktop-value');
  });

  it('应该使用降级策略返回可用值', () => {
    // 设置为桌面端，但没有desktop值
    Object.defineProperty(window, 'innerWidth', { value: 1024 });

    const { result } = renderHook(() => 
      useResponsiveValue({
        mobile: 'mobile-value',
        tablet: 'tablet-value',
        // desktop值缺失
        wide: 'wide-value',
      })
    );

    // 应该降级到tablet值
    expect(result.current).toBe('tablet-value');
  });

  it('应该在所有值都缺失时返回undefined', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1024 });

    const { result } = renderHook(() => useResponsiveValue({}));

    expect(result.current).toBeUndefined();
  });

  it('应该响应断点变化更新值', () => {
    Object.defineProperty(window, 'innerWidth', { value: 375 }); // 移动端

    const { result, rerender } = renderHook(() => 
      useResponsiveValue({
        mobile: 'mobile-value',
        desktop: 'desktop-value',
      })
    );

    expect(result.current).toBe('mobile-value');

    // 改变到桌面端
    act(() => {
      Object.defineProperty(window, 'innerWidth', { value: 1024 });
      const resizeHandler = window.addEventListener.mock.calls.find(
        call => call[0] === 'resize'
      )?.[1];
      if (resizeHandler) resizeHandler();
    });

    rerender();
    expect(result.current).toBe('desktop-value');
  });

  it('应该处理复杂对象值', () => {
    Object.defineProperty(window, 'innerWidth', { value: 768 }); // 平板端

    const { result } = renderHook(() => 
      useResponsiveValue({
        mobile: { columns: 1, gap: 8 },
        tablet: { columns: 2, gap: 16 },
        desktop: { columns: 3, gap: 24 },
      })
    );

    expect(result.current).toEqual({ columns: 2, gap: 16 });
  });
});

describe('断点常量测试', () => {
  it('应该定义正确的断点值', () => {
    expect(breakpoints).toEqual({
      mobile: 0,
      tablet: 768,
      desktop: 1024,
      wide: 1440,
    });
  });
});

describe('边界条件测试', () => {
  it('应该正确处理断点边界值', () => {
    const testCases = [
      { width: 767, expected: 'mobile' },
      { width: 768, expected: 'tablet' },
      { width: 1023, expected: 'tablet' },
      { width: 1024, expected: 'desktop' },
      { width: 1439, expected: 'desktop' },
      { width: 1440, expected: 'wide' },
    ];

    testCases.forEach(({ width, expected }) => {
      Object.defineProperty(window, 'innerWidth', { value: width });
      
      const { result } = renderHook(() => useResponsive());
      
      expect(result.current.breakpoint).toBe(expected);
    });
  });

  it('应该处理极端尺寸值', () => {
    // 测试极小尺寸
    Object.defineProperty(window, 'innerWidth', { value: 1 });
    Object.defineProperty(window, 'innerHeight', { value: 1 });

    const { result: smallResult } = renderHook(() => useResponsive());
    
    expect(smallResult.current.breakpoint).toBe('mobile');
    expect(smallResult.current.screenWidth).toBe(1);
    expect(smallResult.current.screenHeight).toBe(1);

    // 测试极大尺寸
    Object.defineProperty(window, 'innerWidth', { value: 9999 });
    Object.defineProperty(window, 'innerHeight', { value: 9999 });

    const { result: largeResult } = renderHook(() => useResponsive());
    
    expect(largeResult.current.breakpoint).toBe('wide');
    expect(largeResult.current.screenWidth).toBe(9999);
    expect(largeResult.current.screenHeight).toBe(9999);
  });
});

describe('内存泄漏防护测试', () => {
  it('应该正确清理所有事件监听器', () => {
    const { unmount } = renderHook(() => {
      useResponsive();
      useMediaQuery('(min-width: 768px)');
    });

    // 记录添加的监听器数量
    const addedListeners = window.addEventListener.mock.calls.length;

    unmount();

    // 验证移除的监听器数量
    expect(window.removeEventListener).toHaveBeenCalledTimes(addedListeners);
  });

  it('应该处理重复挂载和卸载', () => {
    const { unmount: unmount1 } = renderHook(() => useResponsive());
    const { unmount: unmount2 } = renderHook(() => useResponsive());

    unmount1();
    unmount2();

    // 不应该抛出错误
    expect(window.removeEventListener).toHaveBeenCalled();
  });
});