/**
 * 响应式系统测试
 */

import { getBreakpoint, getResponsiveValue, ResponsiveValue } from '@/lib/responsive/breakpoints'

describe('响应式系统测试', () => {
  describe('断点检测', () => {
    test('应该正确识别移动端断点', () => {
      expect(getBreakpoint(320)).toBe('mobile')
      expect(getBreakpoint(767)).toBe('mobile')
    })

    test('应该正确识别平板端断点', () => {
      expect(getBreakpoint(768)).toBe('tablet')
      expect(getBreakpoint(1023)).toBe('tablet')
    })

    test('应该正确识别桌面端断点', () => {
      expect(getBreakpoint(1024)).toBe('desktop')
      expect(getBreakpoint(1439)).toBe('desktop')
    })

    test('应该正确识别宽屏断点', () => {
      expect(getBreakpoint(1440)).toBe('wide')
      expect(getBreakpoint(1920)).toBe('wide')
    })
  })

  describe('响应式值获取', () => {
    const testValue: ResponsiveValue<string> = {
      mobile: 'mobile-value',
      tablet: 'tablet-value',
      desktop: 'desktop-value',
      wide: 'wide-value',
      default: 'default-value'
    }

    test('应该返回对应断点的值', () => {
      expect(getResponsiveValue(testValue, 'mobile')).toBe('mobile-value')
      expect(getResponsiveValue(testValue, 'tablet')).toBe('tablet-value')
      expect(getResponsiveValue(testValue, 'desktop')).toBe('desktop-value')
      expect(getResponsiveValue(testValue, 'wide')).toBe('wide-value')
    })

    test('应该在缺少断点值时返回默认值', () => {
      const partialValue: ResponsiveValue<string> = {
        mobile: 'mobile-value',
        default: 'default-value'
      }

      expect(getResponsiveValue(partialValue, 'tablet')).toBe('default-value')
      expect(getResponsiveValue(partialValue, 'desktop')).toBe('default-value')
      expect(getResponsiveValue(partialValue, 'wide')).toBe('default-value')
    })
  })

  describe('媒体查询字符串', () => {
    test('应该生成正确的媒体查询', () => {
      const { mediaQueries } = require('@/lib/responsive/breakpoints')
      
      expect(mediaQueries.mobile).toBe('@media (max-width: 767px)')
      expect(mediaQueries.tablet).toBe('@media (min-width: 768px) and (max-width: 1023px)')
      expect(mediaQueries.desktop).toBe('@media (min-width: 1024px) and (max-width: 1439px)')
      expect(mediaQueries.wide).toBe('@media (min-width: 1440px)')
    })
  })
})