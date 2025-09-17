/**
 * 防作弊检测中间件测试
 */

import { FraudDetectionMiddleware, FraudDetectionContext } from '@/lib/invitation/middleware/fraudDetectionMiddleware'

// Mock dependencies
jest.mock('@/lib/invitation/services/FraudDetectionService')
jest.mock('@/lib/invitation/database')

const mockFraudDetectionService = {
  assessRegistrationRisk: jest.fn(),
  checkSelfInvitation: jest.fn(),
  checkIPFrequency: jest.fn(),
  isUserBanned: jest.fn(),
  recordSuspiciousActivity: jest.fn()
}

const mockDb = {
  queryOne: jest.fn(),
  query: jest.fn(),
  execute: jest.fn()
}

// Mock the constructor
jest.mock('@/lib/invitation/services/FraudDetectionService', () => ({
  FraudDetectionServiceImpl: jest.fn().mockImplementation(() => mockFraudDetectionService)
}))

jest.mock('@/lib/invitation/database', () => ({
  DatabaseService: jest.fn().mockImplementation(() => mockDb)
}))

describe('FraudDetectionMiddleware', () => {
  let middleware: FraudDetectionMiddleware

  beforeEach(() => {
    jest.clearAllMocks()
    middleware = new FraudDetectionMiddleware()
  })

  describe('checkRegistration', () => {
    const mockContext: FraudDetectionContext = {
      ip: '192.168.1.1',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'x-forwarded-for': '203.0.113.1'
      },
      deviceInfo: {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        screenWidth: 1920,
        screenHeight: 1080,
        timezone: 'Asia/Shanghai',
        language: 'zh-CN',
        platform: 'Win32',
        cookieEnabled: true
      }
    }

    it('should allow low-risk registration', async () => {
      mockFraudDetectionService.assessRegistrationRisk.mockResolvedValue({
        isValid: true,
        riskLevel: 'low',
        reasons: [],
        actions: []
      })

      mockDb.execute.mockResolvedValue({})

      const result = await middleware.checkRegistration(
        mockContext,
        'test@example.com',
        'INVITE123'
      )

      expect(result.allowed).toBe(true)
      expect(result.riskLevel).toBe('low')
      expect(result.requiresReview).toBe(false)
    })

    it('should block high-risk registration', async () => {
      mockFraudDetectionService.assessRegistrationRisk.mockResolvedValue({
        isValid: false,
        riskLevel: 'high',
        reasons: ['IP频率过高'],
        actions: [{ type: 'block', description: '阻止注册' }]
      })

      mockDb.execute.mockResolvedValue({})

      const result = await middleware.checkRegistration(
        mockContext,
        'test@example.com'
      )

      expect(result.allowed).toBe(false)
      expect(result.riskLevel).toBe('high')
      expect(result.reasons).toContain('IP频率过高')
    })

    it('should require review for medium-risk registration', async () => {
      mockFraudDetectionService.assessRegistrationRisk.mockResolvedValue({
        isValid: true,
        riskLevel: 'medium',
        reasons: ['设备指纹可疑'],
        actions: [{ type: 'review', description: '需要人工审核' }]
      })

      mockDb.execute.mockResolvedValue({})

      const result = await middleware.checkRegistration(
        mockContext,
        'test@example.com'
      )

      expect(result.allowed).toBe(true)
      expect(result.riskLevel).toBe('medium')
      expect(result.requiresReview).toBe(true)
    })

    it('should handle errors gracefully', async () => {
      mockFraudDetectionService.assessRegistrationRisk.mockRejectedValue(
        new Error('Service error')
      )

      const result = await middleware.checkRegistration(
        mockContext,
        'test@example.com'
      )

      expect(result.allowed).toBe(true)
      expect(result.riskLevel).toBe('low')
      expect(result.reasons).toContain('检测系统暂时不可用')
    })

    it('should extract real IP from headers', async () => {
      const contextWithForwardedIP = {
        ...mockContext,
        ip: '127.0.0.1',
        headers: {
          ...mockContext.headers,
          'cf-connecting-ip': '203.0.113.1'
        }
      }

      mockFraudDetectionService.assessRegistrationRisk.mockResolvedValue({
        isValid: true,
        riskLevel: 'low',
        reasons: [],
        actions: []
      })

      mockDb.execute.mockResolvedValue({})

      await middleware.checkRegistration(
        contextWithForwardedIP,
        'test@example.com'
      )

      expect(mockFraudDetectionService.assessRegistrationRisk).toHaveBeenCalledWith(
        expect.objectContaining({
          ip: '203.0.113.1'
        }),
        undefined
      )
    })
  })

  describe('checkInvitation', () => {
    const mockContext: FraudDetectionContext = {
      ip: '192.168.1.1',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }

    it('should allow valid invitation', async () => {
      mockFraudDetectionService.isUserBanned.mockResolvedValue(false)
      mockFraudDetectionService.checkSelfInvitation.mockResolvedValue({
        isValid: true,
        riskLevel: 'low',
        reasons: [],
        actions: []
      })
      mockFraudDetectionService.checkIPFrequency.mockResolvedValue({
        isValid: true,
        riskLevel: 'low',
        reasons: [],
        actions: []
      })

      mockDb.execute.mockResolvedValue({})

      const result = await middleware.checkInvitation(
        mockContext,
        'inviter123',
        'invitee@example.com'
      )

      expect(result.allowed).toBe(true)
      expect(result.riskLevel).toBe('low')
      expect(result.requiresReview).toBe(false)
    })

    it('should block invitation from banned user', async () => {
      mockFraudDetectionService.isUserBanned.mockResolvedValue(true)

      const result = await middleware.checkInvitation(
        mockContext,
        'bannedUser',
        'invitee@example.com'
      )

      expect(result.allowed).toBe(false)
      expect(result.riskLevel).toBe('high')
      expect(result.reasons).toContain('用户已被禁止参与邀请活动')
    })

    it('should block self-invitation', async () => {
      mockFraudDetectionService.isUserBanned.mockResolvedValue(false)
      mockFraudDetectionService.checkSelfInvitation.mockResolvedValue({
        isValid: false,
        riskLevel: 'high',
        reasons: ['检测到自我邀请行为'],
        actions: [{ type: 'block', description: '阻止自我邀请' }]
      })
      mockFraudDetectionService.checkIPFrequency.mockResolvedValue({
        isValid: true,
        riskLevel: 'low',
        reasons: [],
        actions: []
      })

      mockDb.execute.mockResolvedValue({})

      const result = await middleware.checkInvitation(
        mockContext,
        'user123',
        'user123@example.com'
      )

      expect(result.allowed).toBe(false)
      expect(result.riskLevel).toBe('high')
      expect(result.reasons).toContain('检测到自我邀请行为')
    })

    it('should require review for medium-risk invitation', async () => {
      mockFraudDetectionService.isUserBanned.mockResolvedValue(false)
      mockFraudDetectionService.checkSelfInvitation.mockResolvedValue({
        isValid: true,
        riskLevel: 'medium',
        reasons: ['相似邮箱模式'],
        actions: [{ type: 'review', description: '需要审核' }]
      })
      mockFraudDetectionService.checkIPFrequency.mockResolvedValue({
        isValid: true,
        riskLevel: 'low',
        reasons: [],
        actions: []
      })

      mockDb.execute.mockResolvedValue({})

      const result = await middleware.checkInvitation(
        mockContext,
        'user123',
        'similar@example.com'
      )

      expect(result.allowed).toBe(true)
      expect(result.riskLevel).toBe('medium')
      expect(result.requiresReview).toBe(true)
    })

    it('should handle invitation check errors gracefully', async () => {
      mockFraudDetectionService.isUserBanned.mockRejectedValue(
        new Error('Database error')
      )

      const result = await middleware.checkInvitation(
        mockContext,
        'user123',
        'invitee@example.com'
      )

      expect(result.allowed).toBe(true)
      expect(result.riskLevel).toBe('low')
      expect(result.reasons).toContain('检测系统暂时不可用')
    })
  })

  describe('IP extraction', () => {
    it('should extract IP from cf-connecting-ip header', async () => {
      const context: FraudDetectionContext = {
        ip: '127.0.0.1',
        userAgent: 'test',
        headers: {
          'cf-connecting-ip': '203.0.113.1',
          'x-forwarded-for': '198.51.100.1',
          'x-real-ip': '192.0.2.1'
        }
      }

      mockFraudDetectionService.assessRegistrationRisk.mockResolvedValue({
        isValid: true,
        riskLevel: 'low',
        reasons: [],
        actions: []
      })

      mockDb.execute.mockResolvedValue({})

      await middleware.checkRegistration(context, 'test@example.com')

      expect(mockFraudDetectionService.assessRegistrationRisk).toHaveBeenCalledWith(
        expect.objectContaining({
          ip: '203.0.113.1'
        }),
        undefined
      )
    })

    it('should extract IP from x-real-ip header when cf-connecting-ip is not available', async () => {
      const context: FraudDetectionContext = {
        ip: '127.0.0.1',
        userAgent: 'test',
        headers: {
          'x-real-ip': '192.0.2.1',
          'x-forwarded-for': '198.51.100.1'
        }
      }

      mockFraudDetectionService.assessRegistrationRisk.mockResolvedValue({
        isValid: true,
        riskLevel: 'low',
        reasons: [],
        actions: []
      })

      mockDb.execute.mockResolvedValue({})

      await middleware.checkRegistration(context, 'test@example.com')

      expect(mockFraudDetectionService.assessRegistrationRisk).toHaveBeenCalledWith(
        expect.objectContaining({
          ip: '192.0.2.1'
        }),
        undefined
      )
    })

    it('should extract first IP from x-forwarded-for header', async () => {
      const context: FraudDetectionContext = {
        ip: '127.0.0.1',
        userAgent: 'test',
        headers: {
          'x-forwarded-for': '203.0.113.1, 198.51.100.1, 192.0.2.1'
        }
      }

      mockFraudDetectionService.assessRegistrationRisk.mockResolvedValue({
        isValid: true,
        riskLevel: 'low',
        reasons: [],
        actions: []
      })

      mockDb.execute.mockResolvedValue({})

      await middleware.checkRegistration(context, 'test@example.com')

      expect(mockFraudDetectionService.assessRegistrationRisk).toHaveBeenCalledWith(
        expect.objectContaining({
          ip: '203.0.113.1'
        }),
        undefined
      )
    })

    it('should fall back to context IP when no valid headers', async () => {
      const context: FraudDetectionContext = {
        ip: '192.168.1.1',
        userAgent: 'test',
        headers: {}
      }

      mockFraudDetectionService.assessRegistrationRisk.mockResolvedValue({
        isValid: true,
        riskLevel: 'low',
        reasons: [],
        actions: []
      })

      mockDb.execute.mockResolvedValue({})

      await middleware.checkRegistration(context, 'test@example.com')

      expect(mockFraudDetectionService.assessRegistrationRisk).toHaveBeenCalledWith(
        expect.objectContaining({
          ip: '192.168.1.1'
        }),
        undefined
      )
    })
  })
})