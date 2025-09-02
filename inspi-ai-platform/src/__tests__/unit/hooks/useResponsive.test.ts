/**
 * useResponsive Hook 单元测试
 */

import { renderHook, act } from '@testing-library/react'
import { 
  useResponsive, 
  useResponsiveValue, 
  useMediaQuery, 
  useIsMobile, 
  useIsTouchDevice 
} from '@/hooks/useResponsive'

// Mock responsive breakpoints
jest.mock('@/lib/responsive/breakpoints', () => ({
  getBreakpoint: jest.fn((width: number) => {
    if (width < 768) return 'mobile'
    if (width < 1024) return 'tablet'
    if (width < 1440) return 'desktop'
    return 'wide'
  }),
  getResponsiveValue: jest.fn((value: any, breakpoint: string) => {
    if (typeof value === 'object' && value !== null) {
      return value[breakpoint] || value.desktop || Object.values(value)[0]
    }
    return value
  }),
}))

// Mock window
const mockWindow = {
  innerWidth: 1024,
  innerHeight: 768,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  matchMedia: jest.fn(),
}

const mockNavigator = {
  maxTouchPoints: 0,
  msMaxTouchPoints: 0,
}

Object.defineProperty(global, 'window', {
  value: mockWindow,
  writable: true,
})

Object.defineProperty(global, 'navigator', {
  value: mockNavigator,
  writable: true,
})

describe('useResponsive Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockWindow.innerWidth = 1024
    mockWindow.innerHeight = 768
    mockNavigator.maxTouchPoints = 0
    mockNavigator.msMaxTouchPoints = 0
  })

  describe('useResponsive', () => {
    test('应该返回默认的响应式状态', () => {
      const { result } = renderHook(() => useResponsive())
      
      expect(result.current).toEqual({
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isWide: false,
        currentBreakpoint: 'desktop',
        screenWidth: 1024,
        screenHeight: 768,
      })
    })

    test('应该监听窗口大小变化', () => {
      renderHook(() => useResponsive())
      
      expect(mockWindow.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function))
      expect(mockWindow.addEventListener).toHaveBeenCalledWith('orientationchange', expect.any(Function))
    })

    test('应该在组件卸载时清理事件监听器', () => {
      const { unmount } = renderHook(() => useResponsive())
      
      unmount()
      
      expect(mockWindow.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function))
      expect(mockWindow.removeEventListener).toHaveBeenCalledWith('orientationchange', expect.any(Function))
    })

    test('应该响应窗口大小变化', () => {
      const { result } = renderHook(() => useResponsive())
      
      // 模拟窗口大小变化到移动端
      mockWindow.innerWidth = 500
      mockWindow.innerHeight = 800
      
      // 获取resize事件处理器并调用
      const resizeHandler = mockWindow.addEventListener.mock.calls.find(
        call => call[0] === 'resize'
      )?.[1]
      
      act(() => {
        resizeHandler?.()
      })
      
      expect(result.current).toEqual({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        isWide: false,
        currentBreakpoint: 'mobile',
        screenWidth: 500,
        screenHeight: 800,
      })
    })

    test('应该处理服务端渲染', () => {
      const originalWindow = global.window
      delete (global as any).window
      
      const { result } = renderHook(() => useResponsive())
      
      expect(result.current).toEqual({
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isWide: false,
        currentBreakpoint: 'desktop',
        screenWidth: 1024,
        screenHeight: 768,
      })
      
      global.window = originalWindow
    })
  })

  describe('useResponsiveValue', () => {
    test('应该返回当前断点对应的值', () => {
      const responsiveValue = {
        mobile: 'mobile-value',
        tablet: 'tablet-value',
        desktop: 'desktop-value',
        wide: 'wide-value',
      }
      
      const { result } = renderHook(() => useResponsiveValue(responsiveValue))
      
      expect(result.current).toBe('desktop-value')
    })

    test('应该处理简单值', () => {
      const { result } = renderHook(() => useResponsiveValue('simple-value'))
      
      expect(result.current).toBe('simple-value')
    })

    test('应该响应断点变化', () => {
      const responsiveValue = {
        mobile: 'mobile-value',
        desktop: 'desktop-value',
      }
      
      const { result } = renderHook(() => useResponsiveValue(responsiveValue))
      
      expect(result.current).toBe('desktop-value')
      
      // 模拟窗口大小变化
      mockWindow.innerWidth = 500
      const resizeHandler = mockWindow.addEventListener.mock.calls.find(
        call => call[0] === 'resize'
      )?.[1]
      
      act(() => {
        resizeHandler?.()
      })
      
      expect(result.current).toBe('mobile-value')
    })
  })

  describe('useMediaQuery', () => {
    test('应该返回媒体查询匹配状态', () => {
      const mockMediaQuery = {
        matches: true,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }
      
      mockWindow.matchMedia.mockReturnValue(mockMediaQuery)
      
      const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'))
      
      expect(result.current).toBe(true)
      expect(mockWindow.matchMedia).toHaveBeenCalledWith('(max-width: 768px)')
    })

    test('应该监听媒体查询变化', () => {
      const mockMediaQuery = {
        matches: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }
      
      mockWindow.matchMedia.mockReturnValue(mockMediaQuery)
      
      const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'))
      
      expect(mockMediaQuery.addEventListener).toHaveBeenCalledWith('change', expect.any(Function))
      
      // 模拟媒体查询变化
      const changeHandler = mockMediaQuery.addEventListener.mock.calls[0][1]
      act(() => {
        changeHandler({ matches: true })
      })
      
      expect(result.current).toBe(true)
    })

    test('应该在组件卸载时清理监听器', () => {
      const mockMediaQuery = {
        matches: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }
      
      mockWindow.matchMedia.mockReturnValue(mockMediaQuery)
      
      const { unmount } = renderHook(() => useMediaQuery('(max-width: 768px)'))
      
      unmount()
      
      expect(mockMediaQuery.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
    })

    test('应该处理服务端渲染', () => {
      const originalWindow = global.window
      delete (global as any).window
      
      const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'))
      
      expect(result.current).toBe(false)
      
      global.window = originalWindow
    })
  })

  describe('useIsMobile', () => {
    test('应该返回移动端状态', () => {
      const { result } = renderHook(() => useIsMobile())
      
      expect(result.current).toBe(false) // 默认是desktop
    })

    test('应该响应移动端变化', () => {
      const { result } = renderHook(() => useIsMobile())
      
      // 模拟变为移动端
      mockWindow.innerWidth = 500
      const resizeHandler = mockWindow.addEventListener.mock.calls.find(
        call => call[0] === 'resize'
      )?.[1]
      
      act(() => {
        resizeHandler?.()
      })
      
      expect(result.current).toBe(true)
    })
  })

  describe('useIsTouchDevice', () => {
    test('应该检测非触摸设备', () => {
      const { result } = renderHook(() => useIsTouchDevice())
      
      expect(result.current).toBe(false)
    })

    test('应该检测触摸设备 - ontouchstart', () => {
      Object.defineProperty(window, 'ontouchstart', {
        value: {},
        writable: true,
      })
      
      const { result } = renderHook(() => useIsTouchDevice())
      
      expect(result.current).toBe(true)
      
      // 清理
      delete (window as any).ontouchstart
    })

    test('应该检测触摸设备 - maxTouchPoints', () => {
      mockNavigator.maxTouchPoints = 1
      
      const { result } = renderHook(() => useIsTouchDevice())
      
      expect(result.current).toBe(true)
    })

    test('应该检测触摸设备 - msMaxTouchPoints', () => {
      mockNavigator.msMaxTouchPoints = 1
      
      const { result } = renderHook(() => useIsTouchDevice())
      
      expect(result.current).toBe(true)
    })

    test('应该处理服务端渲染', () => {
      const originalWindow = global.window
      delete (global as any).window
      
      const { result } = renderHook(() => useIsTouchDevice())
      
      expect(result.current).toBe(false)
      
      global.window = originalWindow
    })
  })
})