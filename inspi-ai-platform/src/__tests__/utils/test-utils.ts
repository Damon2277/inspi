/**
 * 测试工具库 - 通用测试工具函数
 */
import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// 创建测试专用的QueryClient
export const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

// 自定义render函数，包含必要的Provider
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient
}

export const renderWithProviders = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { queryClient = createTestQueryClient(), ...renderOptions } = options

  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children
    )
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  }
}

// 等待异步操作完成
export const waitForAsync = (ms: number = 0) => 
  new Promise(resolve => setTimeout(resolve, ms))

// 模拟用户交互延迟
export const simulateUserDelay = () => waitForAsync(100)

// 创建模拟的DOM事件
export const createMockEvent = (type: string, properties: any = {}) => {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.assign(event, properties)
  return event
}

// 模拟网络请求延迟
export const mockNetworkDelay = (ms: number = 200) => 
  new Promise(resolve => setTimeout(resolve, ms))

// 生成随机测试数据
export const generateRandomString = (length: number = 10) => 
  Math.random().toString(36).substring(2, length + 2)

export const generateRandomEmail = () => 
  `test-${generateRandomString(8)}@example.com`

export const generateRandomId = () => 
  Math.random().toString(36).substring(2, 15)

// 模拟localStorage
export const mockLocalStorage = () => {
  const store: { [key: string]: string } = {}
  
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach(key => delete store[key])
    }),
    length: Object.keys(store).length,
    key: jest.fn((index: number) => Object.keys(store)[index] || null)
  }
}

// 模拟sessionStorage
export const mockSessionStorage = () => mockLocalStorage()

// 模拟window.matchMedia
export const mockMatchMedia = (matches: boolean = false) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })
}

// 模拟IntersectionObserver
export const mockIntersectionObserver = () => {
  const mockIntersectionObserver = jest.fn()
  mockIntersectionObserver.mockReturnValue({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  })
  window.IntersectionObserver = mockIntersectionObserver
  window.IntersectionObserverEntry = jest.fn()
}

// 模拟ResizeObserver
export const mockResizeObserver = () => {
  const mockResizeObserver = jest.fn()
  mockResizeObserver.mockReturnValue({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  })
  window.ResizeObserver = mockResizeObserver
}

// 清理所有模拟
export const cleanupMocks = () => {
  jest.clearAllMocks()
  jest.clearAllTimers()
  jest.restoreAllMocks()
}

// 测试环境检查
export const isTestEnvironment = () => process.env.NODE_ENV === 'test'

// 跳过测试的条件检查
export const skipIf = (condition: boolean, reason: string) => {
  if (condition) {
    console.warn(`Skipping test: ${reason}`)
    return true
  }
  return false
}

// 测试超时处理
export const withTimeout = async <T>(
  promise: Promise<T>, 
  timeoutMs: number = 5000,
  errorMessage: string = 'Test timeout'
): Promise<T> => {
  const timeout = new Promise<never>((_, reject) => 
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
  )
  
  return Promise.race([promise, timeout])
}

// 重试测试函数
export const retryTest = async (
  testFn: () => Promise<void>,
  maxRetries: number = 3,
  delay: number = 1000
) => {
  let lastError: Error
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      await testFn()
      return
    } catch (error) {
      lastError = error as Error
      if (i < maxRetries - 1) {
        await waitForAsync(delay)
      }
    }
  }
  
  throw lastError!
}