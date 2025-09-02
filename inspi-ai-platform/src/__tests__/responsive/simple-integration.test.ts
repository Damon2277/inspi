/**
 * 响应式系统简单集成测试
 */

import { getBreakpoint, getResponsiveValue } from '@/lib/responsive/breakpoints'

describe('响应式系统简单集成测试', () => {
  test('断点系统应该正常工作', () => {
    // 测试移动端
    expect(getBreakpoint(320)).toBe('mobile')
    expect(getBreakpoint(767)).toBe('mobile')
    
    // 测试平板端
    expect(getBreakpoint(768)).toBe('tablet')
    expect(getBreakpoint(1023)).toBe('tablet')
    
    // 测试桌面端
    expect(getBreakpoint(1024)).toBe('desktop')
    expect(getBreakpoint(1439)).toBe('desktop')
    
    // 测试宽屏
    expect(getBreakpoint(1440)).toBe('wide')
    expect(getBreakpoint(1920)).toBe('wide')
  })

  test('响应式值系统应该正常工作', () => {
    const testValue = {
      mobile: 'mobile-value',
      tablet: 'tablet-value',
      desktop: 'desktop-value',
      wide: 'wide-value',
      default: 'default-value'
    }

    // 测试各断点值
    expect(getResponsiveValue(testValue, 'mobile')).toBe('mobile-value')
    expect(getResponsiveValue(testValue, 'tablet')).toBe('tablet-value')
    expect(getResponsiveValue(testValue, 'desktop')).toBe('desktop-value')
    expect(getResponsiveValue(testValue, 'wide')).toBe('wide-value')
  })

  test('默认值回退应该正常工作', () => {
    const partialValue = {
      mobile: 'mobile-value',
      default: 'default-value'
    }

    // 移动端应该返回指定值
    expect(getResponsiveValue(partialValue, 'mobile')).toBe('mobile-value')
    
    // 其他断点应该返回默认值
    expect(getResponsiveValue(partialValue, 'tablet')).toBe('default-value')
    expect(getResponsiveValue(partialValue, 'desktop')).toBe('default-value')
    expect(getResponsiveValue(partialValue, 'wide')).toBe('default-value')
  })

  test('媒体查询字符串应该正确生成', () => {
    const { mediaQueries } = require('@/lib/responsive/breakpoints')
    
    expect(mediaQueries.mobile).toBe('@media (max-width: 767px)')
    expect(mediaQueries.tablet).toBe('@media (min-width: 768px) and (max-width: 1023px)')
    expect(mediaQueries.desktop).toBe('@media (min-width: 1024px) and (max-width: 1439px)')
    expect(mediaQueries.wide).toBe('@media (min-width: 1440px)')
  })
})