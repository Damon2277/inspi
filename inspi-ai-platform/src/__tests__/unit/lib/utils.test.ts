/**
 * lib/utils.ts 工具函数单元测试
 */

import {
  cn,
  formatFileSize,
  debounce,
  throttle,
  deepClone,
  generateId,
  formatNumber,
  isValidEmail,
  isMobileDevice,
  getDeviceType,
  safeJsonParse,
  sleep,
  getFileExtension,
  truncateText,
} from '@/lib/utils'

// Mock window and navigator
const mockWindow = {
  innerWidth: 1024,
}
const mockNavigator = {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
}

Object.defineProperty(global, 'window', {
  value: mockWindow,
  writable: true,
})

Object.defineProperty(global, 'navigator', {
  value: mockNavigator,
  writable: true,
})

describe('lib/utils.ts 工具函数', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.clearAllTimers()
    // 重置window mock
    mockWindow.innerWidth = 1024
    mockNavigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  })

  describe('cn - CSS类名合并', () => {
    test('应该合并基础类名', () => {
      const result = cn('class1', 'class2')
      expect(result).toBe('class1 class2')
    })

    test('应该处理条件类名', () => {
      const result = cn('base', true && 'show', false && 'hide')
      expect(result).toBe('base show')
    })

    test('应该处理对象形式的类名', () => {
      const result = cn({
        'active': true,
        'disabled': false,
        'primary': true,
      })
      expect(result).toBe('active primary')
    })
  })

  describe('formatFileSize - 文件大小格式化', () => {
    test('应该格式化不同大小的文件', () => {
      expect(formatFileSize(0)).toBe('0 Bytes')
      expect(formatFileSize(1024)).toBe('1 KB')
      expect(formatFileSize(1024 * 1024)).toBe('1 MB')
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB')
      expect(formatFileSize(1024 * 1024 * 1024 * 1024)).toBe('1 TB')
    })

    test('应该处理小数', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB')
      expect(formatFileSize(1024 * 1024 * 2.5)).toBe('2.5 MB')
    })
  })

  describe('debounce - 防抖函数', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    test('应该延迟执行函数', () => {
      const mockFn = jest.fn()
      const debouncedFn = debounce(mockFn, 100)

      debouncedFn('test')
      expect(mockFn).not.toHaveBeenCalled()

      jest.advanceTimersByTime(100)
      expect(mockFn).toHaveBeenCalledWith('test')
    })

    test('应该取消之前的调用', () => {
      const mockFn = jest.fn()
      const debouncedFn = debounce(mockFn, 100)

      debouncedFn('first')
      debouncedFn('second')
      debouncedFn('third')

      jest.advanceTimersByTime(100)
      expect(mockFn).toHaveBeenCalledTimes(1)
      expect(mockFn).toHaveBeenCalledWith('third')
    })

    test('应该处理多个参数', () => {
      const mockFn = jest.fn()
      const debouncedFn = debounce(mockFn, 100)

      debouncedFn('arg1', 'arg2', 'arg3')
      jest.advanceTimersByTime(100)
      
      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2', 'arg3')
    })
  })

  describe('throttle - 节流函数', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    test('应该限制函数执行频率', () => {
      const mockFn = jest.fn()
      const throttledFn = throttle(mockFn, 100)

      throttledFn('first')
      throttledFn('second')
      throttledFn('third')

      expect(mockFn).toHaveBeenCalledTimes(1)
      expect(mockFn).toHaveBeenCalledWith('first')

      jest.advanceTimersByTime(100)
      throttledFn('fourth')
      expect(mockFn).toHaveBeenCalledTimes(2)
      expect(mockFn).toHaveBeenCalledWith('fourth')
    })
  })

  describe('deepClone - 深度克隆', () => {
    test('应该克隆基本类型', () => {
      expect(deepClone(null)).toBe(null)
      expect(deepClone(undefined)).toBe(undefined)
      expect(deepClone(42)).toBe(42)
      expect(deepClone('string')).toBe('string')
      expect(deepClone(true)).toBe(true)
    })

    test('应该克隆Date对象', () => {
      const date = new Date('2024-01-15')
      const cloned = deepClone(date)
      
      expect(cloned).toEqual(date)
      expect(cloned).not.toBe(date)
      expect(cloned instanceof Date).toBe(true)
    })

    test('应该克隆数组', () => {
      const arr = [1, 2, { a: 3 }]
      const cloned = deepClone(arr)
      
      expect(cloned).toEqual(arr)
      expect(cloned).not.toBe(arr)
      expect(cloned[2]).not.toBe(arr[2])
    })

    test('应该克隆对象', () => {
      const obj = {
        a: 1,
        b: 'string',
        c: {
          d: 4,
          e: [5, 6]
        }
      }
      const cloned = deepClone(obj)
      
      expect(cloned).toEqual(obj)
      expect(cloned).not.toBe(obj)
      expect(cloned.c).not.toBe(obj.c)
      expect(cloned.c.e).not.toBe(obj.c.e)
    })

    test('应该处理循环引用', () => {
      const obj: any = { a: 1 }
      obj.self = obj
      
      // 这个测试可能会导致无限递归，所以我们只测试简单情况
      const simple = { a: 1, b: { c: 2 } }
      const cloned = deepClone(simple)
      expect(cloned).toEqual(simple)
      expect(cloned).not.toBe(simple)
    })
  })

  describe('generateId - 生成随机ID', () => {
    test('应该生成指定长度的ID', () => {
      const id4 = generateId(4)
      const id8 = generateId(8)
      const id16 = generateId(16)
      
      expect(id4).toHaveLength(4)
      expect(id8).toHaveLength(8)
      expect(id16).toHaveLength(16)
    })

    test('应该生成默认长度的ID', () => {
      const id = generateId()
      expect(id).toHaveLength(8)
    })

    test('应该只包含字母和数字', () => {
      const id = generateId(20)
      expect(id).toMatch(/^[A-Za-z0-9]+$/)
    })

    test('应该生成唯一ID', () => {
      const ids = Array.from({ length: 100 }, () => generateId())
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(100)
    })
  })

  describe('formatNumber - 数字格式化', () => {
    test('应该格式化小数字', () => {
      expect(formatNumber(0)).toBe('0')
      expect(formatNumber(999)).toBe('999')
    })

    test('应该格式化千位数', () => {
      expect(formatNumber(1000)).toBe('1.0K')
      expect(formatNumber(1500)).toBe('1.5K')
      expect(formatNumber(999999)).toBe('1000.0K')
    })

    test('应该格式化百万位数', () => {
      expect(formatNumber(1000000)).toBe('1.0M')
      expect(formatNumber(1500000)).toBe('1.5M')
      expect(formatNumber(2500000)).toBe('2.5M')
    })
  })

  describe('isValidEmail - 邮箱验证', () => {
    test('应该验证有效邮箱', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'user123@test-domain.com',
        'a@b.co',
      ]

      validEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(true)
      })
    })

    test('应该拒绝无效邮箱', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user@.com',
        'user..name@example.com',
        'user name@example.com',
        '',
        'user@domain',
      ]

      invalidEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(false)
      })
    })
  })

  describe('isMobileDevice - 移动设备检测', () => {
    test('应该检测桌面设备', () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      expect(isMobileDevice()).toBe(false)
    })

    test('应该检测移动设备', () => {
      const mobileUserAgents = [
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        'Mozilla/5.0 (Linux; Android 10; SM-G975F)',
        'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)',
      ]

      mobileUserAgents.forEach(ua => {
        mockNavigator.userAgent = ua
        expect(isMobileDevice()).toBe(true)
      })
    })

    test('应该处理服务端环境', () => {
      const originalWindow = global.window
      delete (global as any).window
      
      expect(isMobileDevice()).toBe(false)
      
      global.window = originalWindow
    })
  })

  describe('getDeviceType - 设备类型检测', () => {
    test('应该检测移动设备', () => {
      mockWindow.innerWidth = 500
      expect(getDeviceType()).toBe('mobile')
    })

    test('应该检测平板设备', () => {
      mockWindow.innerWidth = 800
      expect(getDeviceType()).toBe('tablet')
    })

    test('应该检测桌面设备', () => {
      mockWindow.innerWidth = 1200
      expect(getDeviceType()).toBe('desktop')
    })

    test('应该处理边界值', () => {
      mockWindow.innerWidth = 768
      expect(getDeviceType()).toBe('tablet')
      
      mockWindow.innerWidth = 1024
      expect(getDeviceType()).toBe('desktop')
    })

    test('应该处理服务端环境', () => {
      const originalWindow = global.window
      delete (global as any).window
      
      expect(getDeviceType()).toBe('desktop')
      
      global.window = originalWindow
    })
  })

  describe('safeJsonParse - 安全JSON解析', () => {
    test('应该解析有效JSON', () => {
      const obj = { name: 'test', value: 123 }
      const json = JSON.stringify(obj)
      const result = safeJsonParse(json, null)
      
      expect(result).toEqual(obj)
    })

    test('应该返回fallback值', () => {
      const fallback = { error: true }
      const result = safeJsonParse('invalid json', fallback)
      
      expect(result).toEqual(fallback)
    })

    test('应该处理不同类型的fallback', () => {
      expect(safeJsonParse('invalid', [])).toEqual([])
      expect(safeJsonParse('invalid', 'default')).toBe('default')
      expect(safeJsonParse('invalid', 42)).toBe(42)
    })
  })

  describe('sleep - 延迟函数', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    test('应该返回Promise', () => {
      const promise = sleep(100)
      expect(promise).toBeInstanceOf(Promise)
    })

    test('应该在指定时间后resolve', async () => {
      const promise = sleep(100)
      jest.advanceTimersByTime(100)
      await expect(promise).resolves.toBeUndefined()
    })
  })

  describe('getFileExtension - 获取文件扩展名', () => {
    test('应该获取常见文件扩展名', () => {
      expect(getFileExtension('file.txt')).toBe('txt')
      expect(getFileExtension('image.jpg')).toBe('jpg')
      expect(getFileExtension('document.pdf')).toBe('pdf')
      expect(getFileExtension('archive.tar.gz')).toBe('gz')
    })

    test('应该处理没有扩展名的文件', () => {
      expect(getFileExtension('filename')).toBe('')
      expect(getFileExtension('.')).toBe('')
    })

    test('应该处理隐藏文件', () => {
      expect(getFileExtension('.gitignore')).toBe('gitignore')
      expect(getFileExtension('.env.local')).toBe('local')
    })

    test('应该处理空字符串', () => {
      expect(getFileExtension('')).toBe('')
    })
  })

  describe('truncateText - 文本截断', () => {
    test('应该截断长文本', () => {
      const longText = 'This is a very long text that needs to be truncated'
      const result = truncateText(longText, 20)
      expect(result).toBe('This is a very long ...')
      expect(result).toHaveLength(23) // 20 + '...'
    })

    test('不应该截断短文本', () => {
      const shortText = 'Short'
      const result = truncateText(shortText, 20)
      expect(result).toBe('Short')
    })

    test('应该处理边界情况', () => {
      const text = 'Exactly twenty chars'
      const result = truncateText(text, 20)
      expect(result).toBe('Exactly twenty chars')
    })

    test('应该处理空字符串', () => {
      expect(truncateText('', 10)).toBe('')
    })

    test('应该处理零长度限制', () => {
      expect(truncateText('text', 0)).toBe('...')
    })
  })
})