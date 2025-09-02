/**
 * 错误处理系统测试
 */

import {
  CustomError,
  BusinessError,
  ValidationError,
  createErrorFactory,
  ErrorHandler,
  formatErrorResponse,
  logError,
  ErrorConfig,
} from '@/lib/errors'
import { NextRequest, NextResponse } from 'next/server'
import { createMockNextRequest } from '../../api/setup/api-test-setup'

// Mock日志系统
const mockLogger = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}

jest.mock('@/lib/logging/logger', () => ({
  getLogger: jest.fn(() => mockLogger),
}))

// Mock监控系统
const mockMonitoring = {
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  setContext: jest.fn(),
  setUser: jest.fn(),
}

jest.mock('@/lib/monitoring/sentry', () => ({
  getSentryClient: jest.fn(() => mockMonitoring),
}))

describe('错误处理系统测试', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('CustomError', () => {
    test('应该创建基础自定义错误', () => {
      const error = new CustomError('Test error', 'TEST_ERROR', 400)

      expect(error.message).toBe('Test error')
      expect(error.code).toBe('TEST_ERROR')
      expect(error.statusCode).toBe(400)
      expect(error.name).toBe('CustomError')
      expect(error instanceof Error).toBe(true)
    })

    test('应该包含错误详情', () => {
      const details = { field: 'email', reason: 'invalid format' }
      const error = new CustomError('Validation failed', 'VALIDATION_ERROR', 400, details)

      expect(error.details).toEqual(details)
    })

    test('应该包含错误上下文', () => {
      const context = { userId: '123', action: 'create_work' }
      const error = new CustomError('Permission denied', 'PERMISSION_ERROR', 403)
      error.setContext(context)

      expect(error.context).toEqual(context)
    })

    test('应该支持错误链', () => {
      const originalError = new Error('Database connection failed')
      const customError = new CustomError('Service unavailable', 'SERVICE_ERROR', 503)
      customError.setCause(originalError)

      expect(customError.cause).toBe(originalError)
    })

    test('应该序列化为JSON', () => {
      const error = new CustomError('Test error', 'TEST_ERROR', 400, { field: 'test' })
      error.setContext({ userId: '123' })

      const json = error.toJSON()

      expect(json).toEqual({
        name: 'CustomError',
        message: 'Test error',
        code: 'TEST_ERROR',
        statusCode: 400,
        details: { field: 'test' },
        context: { userId: '123' },
        timestamp: expect.any(String),
        stack: expect.any(String),
      })
    })
  })

  describe('BusinessError', () => {
    test('应该创建业务错误', () => {
      const error = new BusinessError('Insufficient credits', 'INSUFFICIENT_CREDITS')

      expect(error.message).toBe('Insufficient credits')
      expect(error.code).toBe('INSUFFICIENT_CREDITS')
      expect(error.statusCode).toBe(400)
      expect(error.name).toBe('BusinessError')
    })

    test('应该支持不同的业务错误类型', () => {
      const errors = [
        new BusinessError('User not found', 'USER_NOT_FOUND'),
        new BusinessError('Work already exists', 'WORK_EXISTS'),
        new BusinessError('Subscription expired', 'SUBSCRIPTION_EXPIRED'),
      ]

      errors.forEach(error => {
        expect(error instanceof BusinessError).toBe(true)
        expect(error instanceof CustomError).toBe(true)
      })
    })

    test('应该包含业务规则信息', () => {
      const error = new BusinessError(
        'Daily limit exceeded',
        'DAILY_LIMIT_EXCEEDED',
        {
          limit: 10,
          used: 10,
          resetTime: '2024-08-27T00:00:00Z',
        }
      )

      expect(error.details.limit).toBe(10)
      expect(error.details.used).toBe(10)
      expect(error.details.resetTime).toBe('2024-08-27T00:00:00Z')
    })
  })

  describe('ValidationError', () => {
    test('应该创建验证错误', () => {
      const errors = [
        { field: 'email', message: 'Invalid email format' },
        { field: 'password', message: 'Password too short' },
      ]
      const error = new ValidationError('Validation failed', errors)

      expect(error.message).toBe('Validation failed')
      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.statusCode).toBe(400)
      expect(error.validationErrors).toEqual(errors)
    })

    test('应该格式化验证错误消息', () => {
      const errors = [
        { field: 'email', message: 'Required field' },
        { field: 'name', message: 'Too short' },
      ]
      const error = new ValidationError('Multiple validation errors', errors)

      const formatted = error.getFormattedMessage()

      expect(formatted).toContain('email: Required field')
      expect(formatted).toContain('name: Too short')
    })

    test('应该获取特定字段的错误', () => {
      const errors = [
        { field: 'email', message: 'Invalid format' },
        { field: 'password', message: 'Too weak' },
      ]
      const error = new ValidationError('Validation failed', errors)

      expect(error.getFieldError('email')).toBe('Invalid format')
      expect(error.getFieldError('password')).toBe('Too weak')
      expect(error.getFieldError('nonexistent')).toBeNull()
    })

    test('应该检查字段是否有错误', () => {
      const errors = [
        { field: 'email', message: 'Invalid format' },
      ]
      const error = new ValidationError('Validation failed', errors)

      expect(error.hasFieldError('email')).toBe(true)
      expect(error.hasFieldError('password')).toBe(false)
    })
  })

  describe('createErrorFactory', () => {
    test('应该创建错误工厂', () => {
      const factory = createErrorFactory({
        USER_NOT_FOUND: {
          message: 'User not found',
          statusCode: 404,
          type: 'BusinessError',
        },
        VALIDATION_FAILED: {
          message: 'Validation failed',
          statusCode: 400,
          type: 'ValidationError',
        },
      })

      expect(typeof factory.USER_NOT_FOUND).toBe('function')
      expect(typeof factory.VALIDATION_FAILED).toBe('function')
    })

    test('应该通过工厂创建业务错误', () => {
      const factory = createErrorFactory({
        INSUFFICIENT_CREDITS: {
          message: 'Insufficient credits to perform this action',
          statusCode: 402,
          type: 'BusinessError',
        },
      })

      const error = factory.INSUFFICIENT_CREDITS({ userId: '123', required: 10, available: 5 })

      expect(error instanceof BusinessError).toBe(true)
      expect(error.message).toBe('Insufficient credits to perform this action')
      expect(error.code).toBe('INSUFFICIENT_CREDITS')
      expect(error.statusCode).toBe(402)
      expect(error.details).toEqual({ userId: '123', required: 10, available: 5 })
    })

    test('应该通过工厂创建验证错误', () => {
      const factory = createErrorFactory({
        INVALID_INPUT: {
          message: 'Invalid input data',
          statusCode: 400,
          type: 'ValidationError',
        },
      })

      const validationErrors = [
        { field: 'email', message: 'Required' },
        { field: 'password', message: 'Too short' },
      ]
      const error = factory.INVALID_INPUT(validationErrors)

      expect(error instanceof ValidationError).toBe(true)
      expect(error.validationErrors).toEqual(validationErrors)
    })

    test('应该支持动态消息', () => {
      const factory = createErrorFactory({
        RATE_LIMITED: {
          message: (details) => `Rate limit exceeded. Try again in ${details.retryAfter} seconds`,
          statusCode: 429,
          type: 'BusinessError',
        },
      })

      const error = factory.RATE_LIMITED({ retryAfter: 60 })

      expect(error.message).toBe('Rate limit exceeded. Try again in 60 seconds')
    })
  })

  describe('ErrorHandler', () => {
    let errorHandler: ErrorHandler

    beforeEach(() => {
      const config: ErrorConfig = {
        logLevel: 'error',
        includeStack: true,
        sanitizeOutput: true,
        notifyOnError: true,
      }
      errorHandler = new ErrorHandler(config)
    })

    test('应该处理自定义错误', async () => {
      const request = createMockNextRequest('POST', '/api/test')
      const error = new BusinessError('Test business error', 'TEST_ERROR')

      const response = await errorHandler.handle(error, request)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.success).toBe(false)
      expect(body.error).toBe('Test business error')
      expect(body.code).toBe('TEST_ERROR')
    })

    test('应该处理原生JavaScript错误', async () => {
      const request = createMockNextRequest('GET', '/api/test')
      const error = new Error('Unexpected error')

      const response = await errorHandler.handle(error, request)

      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.success).toBe(false)
      expect(body.error).toBe('Internal server error')
      expect(body.code).toBe('INTERNAL_ERROR')
    })

    test('应该处理验证错误', async () => {
      const request = createMockNextRequest('POST', '/api/test')
      const validationErrors = [
        { field: 'email', message: 'Required field' },
        { field: 'password', message: 'Too short' },
      ]
      const error = new ValidationError('Validation failed', validationErrors)

      const response = await errorHandler.handle(error, request)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.success).toBe(false)
      expect(body.error).toBe('Validation failed')
      expect(body.details).toEqual(validationErrors)
    })

    test('应该记录错误日志', async () => {
      const request = createMockNextRequest('POST', '/api/test')
      const error = new BusinessError('Test error', 'TEST_ERROR')

      await errorHandler.handle(error, request)

      expect(mockLogger.error).toHaveBeenCalledWith(
        'API Error',
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Test error',
            code: 'TEST_ERROR',
          }),
          request: expect.objectContaining({
            method: 'POST',
            url: '/api/test',
          }),
        })
      )
    })

    test('应该发送错误监控', async () => {
      const request = createMockNextRequest('POST', '/api/test')
      const error = new Error('Critical error')

      await errorHandler.handle(error, request)

      expect(mockMonitoring.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: expect.any(Object),
          extra: expect.any(Object),
        })
      )
    })

    test('应该清理敏感信息', async () => {
      const request = createMockNextRequest('POST', '/api/test')
      const error = new BusinessError('Database error: password=secret123', 'DB_ERROR')

      const response = await errorHandler.handle(error, request)

      const body = await response.json()
      expect(body.error).not.toContain('password=secret123')
      expect(body.error).toContain('[REDACTED]')
    })

    test('应该处理错误处理器自身的错误', async () => {
      const request = createMockNextRequest('POST', '/api/test')
      const error = new Error('Test error')

      // 模拟日志记录失败
      mockLogger.error.mockImplementationOnce(() => {
        throw new Error('Logger failed')
      })

      const response = await errorHandler.handle(error, request)

      // 应该仍然返回有效响应
      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.success).toBe(false)
    })
  })

  describe('formatErrorResponse', () => {
    test('应该格式化成功响应', () => {
      const data = { id: '123', name: 'Test' }
      const response = formatErrorResponse(null, data)

      expect(response).toEqual({
        success: true,
        data,
        timestamp: expect.any(String),
      })
    })

    test('应该格式化错误响应', () => {
      const error = new BusinessError('Test error', 'TEST_ERROR', { field: 'test' })
      const response = formatErrorResponse(error)

      expect(response).toEqual({
        success: false,
        error: 'Test error',
        code: 'TEST_ERROR',
        details: { field: 'test' },
        timestamp: expect.any(String),
      })
    })

    test('应该格式化验证错误响应', () => {
      const validationErrors = [
        { field: 'email', message: 'Required' },
      ]
      const error = new ValidationError('Validation failed', validationErrors)
      const response = formatErrorResponse(error)

      expect(response).toEqual({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: validationErrors,
        timestamp: expect.any(String),
      })
    })

    test('应该包含请求ID', () => {
      const error = new BusinessError('Test error', 'TEST_ERROR')
      const response = formatErrorResponse(error, null, 'req-123')

      expect(response.requestId).toBe('req-123')
    })

    test('应该支持开发模式详细信息', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const error = new Error('Test error')
      error.stack = 'Error: Test error\n    at test.js:1:1'
      
      const response = formatErrorResponse(error)

      expect(response.stack).toBeDefined()
      expect(response.stack).toContain('test.js:1:1')

      process.env.NODE_ENV = originalEnv
    })
  })

  describe('logError', () => {
    test('应该记录错误信息', () => {
      const error = new BusinessError('Test error', 'TEST_ERROR')
      const context = { userId: '123', action: 'test' }

      logError(error, context)

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error occurred',
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Test error',
            code: 'TEST_ERROR',
          }),
          context,
        })
      )
    })

    test('应该根据错误级别记录', () => {
      const warningError = new BusinessError('Warning', 'WARNING', null, 'warn')
      const criticalError = new Error('Critical error')

      logError(warningError)
      logError(criticalError)

      expect(mockLogger.warn).toHaveBeenCalled()
      expect(mockLogger.error).toHaveBeenCalled()
    })

    test('应该过滤敏感信息', () => {
      const error = new Error('Database connection failed: password=secret123')
      
      logError(error)

      const logCall = mockLogger.error.mock.calls[0]
      const loggedMessage = JSON.stringify(logCall)
      expect(loggedMessage).not.toContain('password=secret123')
    })
  })

  describe('错误恢复和重试', () => {
    test('应该支持错误重试', async () => {
      let attempts = 0
      const operation = jest.fn().mockImplementation(() => {
        attempts++
        if (attempts < 3) {
          throw new Error('Temporary failure')
        }
        return 'success'
      })

      const result = await errorHandler.withRetry(operation, {
        maxAttempts: 3,
        delay: 100,
        backoff: 'exponential',
      })

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(3)
    })

    test('应该支持断路器模式', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Service unavailable'))

      // 模拟多次失败
      for (let i = 0; i < 5; i++) {
        try {
          await errorHandler.withCircuitBreaker(operation, {
            failureThreshold: 3,
            timeout: 60000,
          })
        } catch (error) {
          // 预期的错误
        }
      }

      // 断路器应该打开
      await expect(
        errorHandler.withCircuitBreaker(operation, {
          failureThreshold: 3,
          timeout: 60000,
        })
      ).rejects.toThrow('Circuit breaker is open')
    })

    test('应该支持优雅降级', async () => {
      const primaryOperation = jest.fn().mockRejectedValue(new Error('Primary failed'))
      const fallbackOperation = jest.fn().mockResolvedValue('fallback result')

      const result = await errorHandler.withFallback(
        primaryOperation,
        fallbackOperation
      )

      expect(result).toBe('fallback result')
      expect(primaryOperation).toHaveBeenCalled()
      expect(fallbackOperation).toHaveBeenCalled()
    })
  })

  describe('性能和内存管理', () => {
    test('应该限制错误堆栈大小', () => {
      const error = new Error('Test error')
      // 创建很长的堆栈
      error.stack = 'Error: Test error\n' + '    at test.js:1:1\n'.repeat(1000)

      const formatted = formatErrorResponse(error)

      if (formatted.stack) {
        expect(formatted.stack.length).toBeLessThan(10000) // 限制堆栈大小
      }
    })

    test('应该清理旧的错误记录', async () => {
      const config: ErrorConfig = {
        maxErrorHistory: 100,
        cleanupInterval: 1000,
      }
      const handler = new ErrorHandler(config)

      // 生成大量错误
      for (let i = 0; i < 150; i++) {
        const error = new Error(`Error ${i}`)
        await handler.handle(error, createMockNextRequest('GET', '/api/test'))
      }

      // 应该清理旧记录
      const history = handler.getErrorHistory()
      expect(history.length).toBeLessThanOrEqual(100)
    })

    test('应该处理内存不足情况', async () => {
      const request = createMockNextRequest('POST', '/api/test')
      const error = new Error('Out of memory')

      // 模拟内存不足
      mockLogger.error.mockImplementationOnce(() => {
        throw new Error('Cannot allocate memory')
      })

      const response = await errorHandler.handle(error, request)

      // 应该仍然返回响应
      expect(response.status).toBe(500)
    })
  })

  describe('边界情况和异常处理', () => {
    test('应该处理null和undefined错误', async () => {
      const request = createMockNextRequest('GET', '/api/test')

      const nullResponse = await errorHandler.handle(null, request)
      const undefinedResponse = await errorHandler.handle(undefined, request)

      expect(nullResponse.status).toBe(500)
      expect(undefinedResponse.status).toBe(500)
    })

    test('应该处理非Error对象', async () => {
      const request = createMockNextRequest('GET', '/api/test')
      const stringError = 'String error'
      const objectError = { message: 'Object error', code: 123 }

      const stringResponse = await errorHandler.handle(stringError, request)
      const objectResponse = await errorHandler.handle(objectError, request)

      expect(stringResponse.status).toBe(500)
      expect(objectResponse.status).toBe(500)
    })

    test('应该处理循环引用的错误对象', async () => {
      const request = createMockNextRequest('GET', '/api/test')
      const error = new Error('Circular error')
      error.circular = error // 创建循环引用

      const response = await errorHandler.handle(error, request)

      expect(response.status).toBe(500)
      // 不应该抛出序列化错误
    })

    test('应该处理超大错误消息', async () => {
      const request = createMockNextRequest('GET', '/api/test')
      const largeMessage = 'x'.repeat(100000) // 100KB消息
      const error = new Error(largeMessage)

      const response = await errorHandler.handle(error, request)

      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error.length).toBeLessThan(10000) // 应该被截断
    })
  })
})