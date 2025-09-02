/**
 * 响应式状态管理Hook
 * 提供当前屏幕尺寸和断点信息
 */

import { useState, useEffect } from 'react'
import { 
  ResponsiveState, 
  BreakpointKey, 
  getBreakpoint,
  ResponsiveValue,
  getResponsiveValue
} from '@/lib/responsive/breakpoints'

// 默认响应式状态
const getDefaultState = (): ResponsiveState => {
  // 服务端渲染时的默认值
  if (typeof window === 'undefined') {
    return {
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isWide: false,
      currentBreakpoint: 'desktop',
      screenWidth: 1024,
      screenHeight: 768
    }
  }

  const width = window.innerWidth
  const height = window.innerHeight
  const breakpoint = getBreakpoint(width)

  return {
    isMobile: breakpoint === 'mobile',
    isTablet: breakpoint === 'tablet',
    isDesktop: breakpoint === 'desktop',
    isWide: breakpoint === 'wide',
    currentBreakpoint: breakpoint,
    screenWidth: width,
    screenHeight: height
  }
}

export const useResponsive = (): ResponsiveState => {
  const [state, setState] = useState<ResponsiveState>(getDefaultState)

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      const breakpoint = getBreakpoint(width)

      setState({
        isMobile: breakpoint === 'mobile',
        isTablet: breakpoint === 'tablet',
        isDesktop: breakpoint === 'desktop',
        isWide: breakpoint === 'wide',
        currentBreakpoint: breakpoint,
        screenWidth: width,
        screenHeight: height
      })
    }

    // 初始化时设置正确的状态
    handleResize()

    // 监听窗口大小变化
    window.addEventListener('resize', handleResize)
    
    // 监听设备方向变化
    window.addEventListener('orientationchange', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [])

  return state
}

// 响应式值Hook
export const useResponsiveValue = <T>(value: ResponsiveValue<T>): T => {
  const { currentBreakpoint } = useResponsive()
  return getResponsiveValue(value, currentBreakpoint)
}

// 媒体查询Hook
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia(query)
    setMatches(mediaQuery.matches)

    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [query])

  return matches
}

// 移动端检测Hook
export const useIsMobile = (): boolean => {
  const { isMobile } = useResponsive()
  return isMobile
}

// 触摸设备检测Hook
export const useIsTouchDevice = (): boolean => {
  const [isTouchDevice, setIsTouchDevice] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const checkTouchDevice = () => {
      return (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-ignore
        navigator.msMaxTouchPoints > 0
      )
    }

    setIsTouchDevice(checkTouchDevice())
  }, [])

  return isTouchDevice
}