/**
 * 健康检查API测试
 * 测试系统健康状态监控和检查功能
 */

import { executeApiRoute, expectApiResponse } from '../setup/test-server'
import { mockHealthService, resetAllMocks } from '../mocks/api-mocks'

// Mock健康管理器
jest.mock('@/lib/monitoring/health', () => ({
  healthManager: {
    getSystemHealth: jest.fn(),
    runCheck: jest.fn(),
  },
}))

// Mock日志系统
jest.mock('@/lib/logging/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}))

// 导入要测试的API路由
import { GET as getHealthHandler, POST as postHealthHandler } from '@/app/api/health/route'

describe('健康检查API测试', () => {
  const mockHealthManager = require('@/lib/monitoring/health').healthManager
  const mockLogger = require('@/lib/logging/logger').logger

  beforeEach(() => {
    resetAllMocks()
    jest.clearAllMocks()
  })

  describe('GET /api/health', () => {
    test('应该返回健康的系统状态', async () => {
      const healthyStatus = {
        status: 'healthy',
        timestamp: Date.now(),
        uptime: 3600,
        checks: {
          database: { status: 'healthy', message: 'Database connection OK' },
          redis: { status: 'healthy', message: 'Redis connection OK' },
          ai: { status: 'healthy', message: 'AI service available' },
          email: { status: 'healthy', message: 'Email service available' },
        },
        summary: {
          total: 4,
          healthy: 4,
          unhealthy: 0,
          degraded: 0,
        },
      }

      mockHealthManager.getSystemHealth.mockResolvedValue(healthyStatus)

      const response = await executeApiRoute(getHealthHandler, {
        method: 'GET',
        url: 'http://localhost:3000/api/health',
      })

      expectApiResponse(response)
        .toHaveStatus(200)
        .toHaveBodyContaining({
          status: 'healthy',
          timestamp: expect.any(Number),
          uptime: expect.any(Number),
          checks: expect.objectContaining({
            database: expect.objectContaining({
              status: 'healthy',
              message: expect.any(String),
            }),
            redis: expect.objectContaining({
              status: 'healthy',
              message: expect.any(String),
            }),
            ai: expect.objectContaining({
              status: 'healthy',
              message: expect.any(String),
            }),
            email: expect.objectContaining({
              status: 'healthy',
              message: expect.any(String),
            }),
          }),
          summary: expect.objectContaining({
            total: 4,
            healthy: 4,
            unhealthy: 0,
            degraded: 0,
          }),
        })

      // 验证日志记录
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Health check performed',
        expect.objectContaining({
          metadata: expect.objectContaining({
            status: 'healthy',
            totalChecks: 4,
            healthyChecks: 4,
            unhealthyChecks: 0,
            degradedChecks: 0,
            uptime: expect.any(Number),
          }),
        })
      )
    })

    test('应该返回降级的系统状态', async () => {
      const degradedStatus = {
        status: 'degraded',
        timestamp: Date.now(),
        uptime: 3600,
        checks: {
          database: { status: 'healthy', message: 'Database connection OK' },
          redis: { status: 'degraded', message: 'Redis connection slow' },
          ai: { status: 'healthy', message: 'AI service available' },
          email: { status: 'healthy', message: 'Email service available' },
        },
        summary: {
          total: 4,
          healthy: 3,
          unhealthy: 0,
          degraded: 1,
        },
      }

      mockHealthManager.getSystemHealth.mockResolvedValue(degradedStatus)

      const response = await executeApiRoute(getHealthHandler, {
        method: 'GET',
        url: 'http://localhost:3000/api/health',
      })

      expectApiResponse(response)
        .toHaveStatus(200) // 降级但仍可用
        .toHaveBodyContaining({
          status: 'degraded',
          summary: expect.objectContaining({
            healthy: 3,
            degraded: 1,
          }),
        })
    })

    test('应该返回不健康的系统状态', async () => {
      const unhealthyStatus = {
        status: 'unhealthy',
        timestamp: Date.now(),
        uptime: 3600,
        checks: {
          database: { status: 'unhealthy', message: 'Database connection failed' },
          redis: { status: 'healthy', message: 'Redis connection OK' },
          ai: { status: 'unhealthy', message: 'AI service unavailable' },
          email: { status: 'healthy', message: 'Email service available' },
        },
        summary: {
          total: 4,
          healthy: 2,
          unhealthy: 2,
          degraded: 0,
        },
      }

      mockHealthManager.getSystemHealth.mockResolvedValue(unhealthyStatus)

      const response = await executeApiRoute(getHealthHandler, {
        method: 'GET',
        url: 'http://localhost:3000/api/health',
      })

      expectApiResponse(response)
        .toHaveStatus(503) // 服务不可用
        .toHaveBodyContaining({
          status: 'unhealthy',
          summary: expect.objectContaining({
            healthy: 2,
            unhealthy: 2,
          }),
        })
    })

    test('应该处理健康检查系统失败', async () => {
      mockHealthManager.getSystemHealth.mockRejectedValue(new Error('Health system failed'))

      const response = await executeApiRoute(getHealthHandler, {
        method: 'GET',
        url: 'http://localhost:3000/api/health',
      })

      expectApiResponse(response)
        .toHaveStatus(500)
        .toHaveBodyContaining({
          status: 'unhealthy',
          timestamp: expect.any(Number),
          message: 'Health check system failed',
          error: 'Health system failed',
        })

      // 验证错误日志
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Health check failed',
        expect.any(Error)
      )
    })

    test('应该处理未知错误', async () => {
      mockHealthManager.getSystemHealth.mockRejectedValue('Unknown error')

      const response = await executeApiRoute(getHealthHandler, {
        method: 'GET',
        url: 'http://localhost:3000/api/health',
      })

      expectApiResponse(response)
        .toHaveStatus(500)
        .toHaveBodyContaining({
          status: 'unhealthy',
          error: 'Unknown error',
        })
    })
  })

  describe('POST /api/health', () => {
    test('应该执行指定的健康检查', async () => {
      const checkNames = ['database', 'redis']
      const checkResults = [
        {
          name: 'database',
          status: 'healthy',
          message: 'Database connection OK',
          duration: 50,
          timestamp: Date.now(),
        },
        {
          name: 'redis',
          status: 'healthy',
          message: 'Redis connection OK',
          duration: 30,
          timestamp: Date.now(),
        },
      ]

      mockHealthManager.runCheck
        .mockResolvedValueOnce(checkResults[0])
        .mockResolvedValueOnce(checkResults[1])

      const response = await executeApiRoute(postHealthHandler, {
        method: 'POST',
        url: 'http://localhost:3000/api/health',
        body: { checks: checkNames },
      })

      expectApiResponse(response)
        .toHaveSuccessStatus()
        .toHaveBodyContaining({
          status: 'healthy',
          timestamp: expect.any(Number),
          checks: expect.arrayContaining([
            expect.objectContaining({
              name: 'database',
              status: 'healthy',
              message: 'Database connection OK',
            }),
            expect.objectContaining({
              name: 'redis',
              status: 'healthy',
              message: 'Redis connection OK',
            }),
          ]),
          summary: expect.objectContaining({
            total: 2,
            healthy: 2,
            unhealthy: 0,
            degraded: 0,
          }),
        })

      expect(mockHealthManager.runCheck).toHaveBeenCalledTimes(2)
      expect(mockHealthManager.runCheck).toHaveBeenCalledWith('database')
      expect(mockHealthManager.runCheck).toHaveBeenCalledWith('redis')
    })

    test('应该处理部分检查失败', async () => {
      const checkNames = ['database', 'redis']

      mockHealthManager.runCheck
        .mockResolvedValueOnce({
          name: 'database',
          status: 'healthy',
          message: 'Database connection OK',
          duration: 50,
          timestamp: Date.now(),
        })
        .mockRejectedValueOnce(new Error('Redis connection failed'))

      const response = await executeApiRoute(postHealthHandler, {
        method: 'POST',
        url: 'http://localhost:3000/api/health',
        body: { checks: checkNames },
      })

      expectApiResponse(response)
        .toHaveSuccessStatus()
        .toHaveBodyContaining({
          status: 'unhealthy',
          checks: expect.arrayContaining([
            expect.objectContaining({
              name: 'database',
              status: 'healthy',
            }),
            expect.objectContaining({
              name: 'redis',
              status: 'unhealthy',
              message: 'Redis connection failed',
            }),
          ]),
          summary: expect.objectContaining({
            total: 2,
            healthy: 1,
            unhealthy: 1,
          }),
        })
    })

    test('应该验证请求体格式', async () => {
      const response = await executeApiRoute(postHealthHandler, {
        method: 'POST',
        url: 'http://localhost:3000/api/health',
        body: { checks: 'invalid' }, // 非数组类型
      })

      expectApiResponse(response)
        .toHaveStatus(400)
        .toHaveBodyContaining({
          error: 'Invalid request body. Expected array of check names.',
        })
    })

    test('应该处理空的检查列表', async () => {
      const response = await executeApiRoute(postHealthHandler, {
        method: 'POST',
        url: 'http://localhost:3000/api/health',
        body: { checks: [] },
      })

      expectApiResponse(response)
        .toHaveSuccessStatus()
        .toHaveBodyContaining({
          status: 'healthy',
          checks: [],
          summary: expect.objectContaining({
            total: 0,
            healthy: 0,
            unhealthy: 0,
            degraded: 0,
          }),
        })
    })

    test('应该处理无效的检查名称', async () => {
      const checkNames = ['invalid-check']

      mockHealthManager.runCheck.mockRejectedValue(new Error('Unknown check'))

      const response = await executeApiRoute(postHealthHandler, {
        method: 'POST',
        url: 'http://localhost:3000/api/health',
        body: { checks: checkNames },
      })

      expectApiResponse(response)
        .toHaveSuccessStatus()
        .toHaveBodyContaining({
          status: 'unhealthy',
          checks: expect.arrayContaining([
            expect.objectContaining({
              name: 'invalid-check',
              status: 'unhealthy',
              message: 'Unknown check',
            }),
          ]),
        })
    })

    test('应该处理JSON解析错误', async () => {
      // 模拟无效的JSON
      const response = await executeApiRoute(postHealthHandler, {
        method: 'POST',
        url: 'http://localhost:3000/api/health',
        body: null,
      })

      expectApiResponse(response)
        .toHaveErrorStatus()
    })

    test('应该处理系统异常', async () => {
      mockHealthManager.runCheck.mockImplementation(() => {
        throw new Error('System error')
      })

      const response = await executeApiRoute(postHealthHandler, {
        method: 'POST',
        url: 'http://localhost:3000/api/health',
        body: { checks: ['database'] },
      })

      expectApiResponse(response)
        .toHaveStatus(500)
        .toHaveBodyContaining({
          error: 'Health check failed',
          message: expect.any(String),
        })

      expect(mockLogger.error).toHaveBeenCalled()
    })
  })

  describe('健康检查状态映射', () => {
    test('应该正确映射健康状态到HTTP状态码', async () => {
      const testCases = [
        { healthStatus: 'healthy', expectedHttpStatus: 200 },
        { healthStatus: 'degraded', expectedHttpStatus: 200 },
        { healthStatus: 'unhealthy', expectedHttpStatus: 503 },
      ]

      for (const testCase of testCases) {
        mockHealthManager.getSystemHealth.mockResolvedValue({
          status: testCase.healthStatus,
          timestamp: Date.now(),
          uptime: 3600,
          checks: {},
          summary: { total: 0, healthy: 0, unhealthy: 0, degraded: 0 },
        })

        const response = await executeApiRoute(getHealthHandler, {
          method: 'GET',
          url: 'http://localhost:3000/api/health',
        })

        expect(response.status).toBe(testCase.expectedHttpStatus)
      }
    })
  })

  describe('健康检查日志记录', () => {
    test('应该记录健康检查执行日志', async () => {
      const healthStatus = {
        status: 'healthy',
        timestamp: Date.now(),
        uptime: 3600,
        checks: {},
        summary: { total: 4, healthy: 4, unhealthy: 0, degraded: 0 },
      }

      mockHealthManager.getSystemHealth.mockResolvedValue(healthStatus)

      await executeApiRoute(getHealthHandler, {
        method: 'GET',
        url: 'http://localhost:3000/api/health',
      })

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Health check performed',
        expect.objectContaining({
          metadata: expect.objectContaining({
            status: 'healthy',
            totalChecks: 4,
            healthyChecks: 4,
            unhealthyChecks: 0,
            degradedChecks: 0,
            uptime: 3600,
          }),
        })
      )
    })

    test('应该记录健康检查失败日志', async () => {
      const error = new Error('Health check failed')
      mockHealthManager.getSystemHealth.mockRejectedValue(error)

      await executeApiRoute(getHealthHandler, {
        method: 'GET',
        url: 'http://localhost:3000/api/health',
      })

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Health check failed',
        error
      )
    })
  })
})