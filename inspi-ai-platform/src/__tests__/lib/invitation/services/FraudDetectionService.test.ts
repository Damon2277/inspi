/**
 * 防作弊检测服务测试
 */

import { FraudDetectionServiceImpl, RegistrationAttempt, DeviceFingerprint } from '@/lib/invitation/services/FraudDetectionService'

// Mock数据库服务
const mockDb = {
  queryOne: jest.fn(),
  query: jest.fn(),
  execute: jest.fn()
}

describe('FraudDetectionService', () => {
  let fraudDetectionService: FraudDetectionServiceImpl

  beforeEach(() => {
    jest.clearAllMocks()
    fraudDetectionService = new FraudDetectionServiceImpl(mockDb as any)
  })

  describe('checkIPFrequency', () => {
    it('should allow registration when IP frequency is low', async () => {
      mockDb.queryOne.mockResolvedValue({ count: '2' })

      const result = await fraudDetectionService.checkIPFrequency('192.168.1.1')

      expect(result.isValid).toBe(true)
      expect(result.riskLevel).toBe('low')
      expect(result.reasons).toHaveLength(0)
    })

    it('should flag medium risk when IP frequency is moderate', async () => {
      mockDb.queryOne.mockResolvedValue({ count: '4' })

      const result = await fraudDetectionService.checkIPFrequency('192.168.1.1')

      expect(result.isValid).toBe(true)
      expect(result.riskLevel).toBe('medium')
      expect(result.reasons).toContain('IP 192.168.1.1 注册频率较高 (4次)')
    })

    it('should block registration when IP frequency is too high', async () => {
      mockDb.queryOne.mockResolvedValue({ count: '6' })

      const result = await fraudDetectionService.checkIPFrequency('192.168.1.1')

      expect(result.isValid).toBe(false)
      expect(result.riskLevel).toBe('high')
      expect(result.actions[0].type).toBe('block')
    })

    it('should handle database errors gracefully', async () => {
      mockDb.queryOne.mockRejectedValue(new Error('Database error'))

      const result = await fraudDetectionService.checkIPFrequency('192.168.1.1')

      expect(result.isValid).toBe(true)
      expect(result.riskLevel).toBe('low')
      expect(result.reasons).toContain('检测失败，默认通过')
    })
  })

  describe('checkDeviceFingerprint', () => {
    const mockFingerprint: DeviceFingerprint = {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      screenResolution: '1920x1080',
      timezone: 'Asia/Shanghai',
      language: 'zh-CN',
      platform: 'Win32',
      cookieEnabled: true,
      hash: 'abc123def456'
    }

    it('should allow when device fingerprint is new', async () => {
      mockDb.queryOne.mockResolvedValue({ user_count: '1' })

      const result = await fraudDetectionService.checkDeviceFingerprint(mockFingerprint)

      expect(result.isValid).toBe(true)
      expect(result.riskLevel).toBe('low')
    })

    it('should flag medium risk when device is moderately reused', async () => {
      mockDb.queryOne.mockResolvedValue({ user_count: '2' })

      const result = await fraudDetectionService.checkDeviceFingerprint(mockFingerprint)

      expect(result.isValid).toBe(true)
      expect(result.riskLevel).toBe('medium')
      expect(result.actions[0].type).toBe('review')
    })

    it('should block when device is heavily reused', async () => {
      mockDb.queryOne.mockResolvedValue({ user_count: '4' })

      const result = await fraudDetectionService.checkDeviceFingerprint(mockFingerprint)

      expect(result.isValid).toBe(false)
      expect(result.riskLevel).toBe('high')
      expect(result.actions[0].type).toBe('block')
    })
  })

  describe('checkSelfInvitation', () => {
    it('should block self invitation with same email', async () => {
      mockDb.queryOne.mockResolvedValue({
        email: 'test@example.com',
        registration_ip: '192.168.1.2'
      })

      const result = await fraudDetectionService.checkSelfInvitation(
        'user1',
        'test@example.com',
        '192.168.1.1'
      )

      expect(result.isValid).toBe(false)
      expect(result.riskLevel).toBe('high')
      expect(result.reasons).toContain('检测到自我邀请行为')
    })

    it('should block invitation from same IP', async () => {
      mockDb.queryOne.mockResolvedValue({
        email: 'inviter@example.com',
        registration_ip: '192.168.1.1'
      })

      const result = await fraudDetectionService.checkSelfInvitation(
        'user1',
        'invitee@example.com',
        '192.168.1.1'
      )

      expect(result.isValid).toBe(false)
      expect(result.riskLevel).toBe('high')
      expect(result.reasons).toContain('邀请人和被邀请人来自相同IP')
    })

    it('should flag similar email patterns', async () => {
      mockDb.queryOne.mockResolvedValue({
        email: 'john@example.com',
        registration_ip: '192.168.1.2'
      })

      const result = await fraudDetectionService.checkSelfInvitation(
        'user1',
        'john123@example.com',
        '192.168.1.1'
      )

      expect(result.isValid).toBe(false)
      expect(result.riskLevel).toBe('medium')
      expect(result.reasons).toContain('检测到相似邮箱模式')
    })

    it('should allow valid invitations', async () => {
      mockDb.queryOne.mockResolvedValue({
        email: 'inviter@example.com',
        registration_ip: '192.168.1.2'
      })

      const result = await fraudDetectionService.checkSelfInvitation(
        'user1',
        'invitee@different.com',
        '192.168.1.1'
      )

      expect(result.isValid).toBe(true)
      expect(result.riskLevel).toBe('low')
    })

    it('should handle non-existent inviter', async () => {
      mockDb.queryOne.mockResolvedValue(null)

      const result = await fraudDetectionService.checkSelfInvitation(
        'nonexistent',
        'invitee@example.com',
        '192.168.1.1'
      )

      expect(result.isValid).toBe(false)
      expect(result.riskLevel).toBe('high')
      expect(result.reasons).toContain('邀请人不存在')
    })
  })

  describe('checkBatchRegistration', () => {
    const mockAttempt: RegistrationAttempt = {
      ip: '192.168.1.1',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      email: 'test@example.com',
      timestamp: new Date()
    }

    it('should allow when no batch patterns detected', async () => {
      mockDb.queryOne
        .mockResolvedValueOnce({ count: '1' }) // IP pattern
        .mockResolvedValueOnce({ count: '1' }) // User-Agent pattern
        .mockResolvedValueOnce({ count: '1' }) // Email domain pattern

      const result = await fraudDetectionService.checkBatchRegistration(mockAttempt)

      expect(result.isValid).toBe(true)
      expect(result.riskLevel).toBe('low')
    })

    it('should flag medium risk with one suspicious pattern', async () => {
      mockDb.queryOne
        .mockResolvedValueOnce({ count: '4' }) // IP pattern - suspicious
        .mockResolvedValueOnce({ count: '1' }) // User-Agent pattern
        .mockResolvedValueOnce({ count: '1' }) // Email domain pattern

      const result = await fraudDetectionService.checkBatchRegistration(mockAttempt)

      expect(result.isValid).toBe(true)
      expect(result.riskLevel).toBe('medium')
      expect(result.actions[0].type).toBe('monitor')
    })

    it('should block with multiple suspicious patterns', async () => {
      mockDb.queryOne
        .mockResolvedValueOnce({ count: '4' }) // IP pattern - suspicious
        .mockResolvedValueOnce({ count: '4' }) // User-Agent pattern - suspicious
        .mockResolvedValueOnce({ count: '1' }) // Email domain pattern

      const result = await fraudDetectionService.checkBatchRegistration(mockAttempt)

      expect(result.isValid).toBe(false)
      expect(result.riskLevel).toBe('high')
      expect(result.actions[0].type).toBe('block')
    })
  })

  describe('assessRegistrationRisk', () => {
    const mockAttempt: RegistrationAttempt = {
      ip: '192.168.1.1',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      email: 'test@example.com',
      deviceFingerprint: {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        screenResolution: '1920x1080',
        timezone: 'Asia/Shanghai',
        language: 'zh-CN',
        platform: 'Win32',
        cookieEnabled: true,
        hash: 'abc123def456'
      },
      timestamp: new Date()
    }

    it('should allow low-risk registration', async () => {
      // Mock all checks to return low risk
      mockDb.queryOne
        .mockResolvedValueOnce({ count: '1' }) // IP frequency
        .mockResolvedValueOnce({ user_count: '1' }) // Device fingerprint
        .mockResolvedValueOnce({ count: '1' }) // Batch - IP
        .mockResolvedValueOnce({ count: '1' }) // Batch - User-Agent
        .mockResolvedValueOnce({ count: '1' }) // Batch - Email domain

      mockDb.execute.mockResolvedValue({})

      const result = await fraudDetectionService.assessRegistrationRisk(mockAttempt)

      expect(result.isValid).toBe(true)
      expect(result.riskLevel).toBe('low')
    })

    it('should block high-risk registration', async () => {
      // Mock IP frequency check to return high risk
      mockDb.queryOne
        .mockResolvedValueOnce({ count: '6' }) // IP frequency - high risk
        .mockResolvedValueOnce({ user_count: '1' }) // Device fingerprint
        .mockResolvedValueOnce({ count: '1' }) // Batch - IP
        .mockResolvedValueOnce({ count: '1' }) // Batch - User-Agent
        .mockResolvedValueOnce({ count: '1' }) // Batch - Email domain

      mockDb.execute.mockResolvedValue({})

      const result = await fraudDetectionService.assessRegistrationRisk(mockAttempt)

      expect(result.isValid).toBe(false)
      expect(result.riskLevel).toBe('high')
    })

    it('should escalate multiple medium risks to high', async () => {
      // Mock multiple medium risk checks
      mockDb.queryOne
        .mockResolvedValueOnce({ count: '4' }) // IP frequency - medium risk
        .mockResolvedValueOnce({ user_count: '2' }) // Device fingerprint - medium risk
        .mockResolvedValueOnce({ count: '1' }) // Batch - IP
        .mockResolvedValueOnce({ count: '1' }) // Batch - User-Agent
        .mockResolvedValueOnce({ count: '1' }) // Batch - Email domain

      mockDb.execute.mockResolvedValue({})

      const result = await fraudDetectionService.assessRegistrationRisk(mockAttempt)

      expect(result.isValid).toBe(false)
      expect(result.riskLevel).toBe('high')
    })
  })

  describe('recordSuspiciousActivity', () => {
    it('should record suspicious activity successfully', async () => {
      mockDb.execute.mockResolvedValue({})

      await fraudDetectionService.recordSuspiciousActivity({
        userId: 'user1',
        ip: '192.168.1.1',
        type: 'ip_frequency',
        description: 'High IP frequency detected',
        severity: 'high',
        metadata: { count: 6 },
        timestamp: new Date()
      })

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO suspicious_activities'),
        expect.arrayContaining(['user1', '192.168.1.1', 'ip_frequency'])
      )
    })

    it('should handle recording errors gracefully', async () => {
      mockDb.execute.mockRejectedValue(new Error('Database error'))

      // Should not throw
      await expect(fraudDetectionService.recordSuspiciousActivity({
        ip: '192.168.1.1',
        type: 'ip_frequency',
        description: 'Test',
        severity: 'medium',
        timestamp: new Date()
      })).resolves.toBeUndefined()
    })
  })

  describe('getUserRiskLevel', () => {
    it('should return user risk level', async () => {
      mockDb.queryOne.mockResolvedValue({ risk_level: 'medium' })

      const result = await fraudDetectionService.getUserRiskLevel('user1')

      expect(result).toBe('medium')
    })

    it('should return low risk as default', async () => {
      mockDb.queryOne.mockResolvedValue(null)

      const result = await fraudDetectionService.getUserRiskLevel('user1')

      expect(result).toBe('low')
    })
  })

  describe('isUserBanned', () => {
    it('should return true for banned user', async () => {
      mockDb.queryOne.mockResolvedValue({ id: 'ban1' })

      const result = await fraudDetectionService.isUserBanned('user1')

      expect(result).toBe(true)
    })

    it('should return false for non-banned user', async () => {
      mockDb.queryOne.mockResolvedValue(null)

      const result = await fraudDetectionService.isUserBanned('user1')

      expect(result).toBe(false)
    })
  })

  describe('banUser', () => {
    it('should ban user successfully', async () => {
      mockDb.execute.mockResolvedValue({})

      await fraudDetectionService.banUser('user1', 'Fraudulent activity', 60)

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_bans'),
        expect.arrayContaining(['user1', 'Fraudulent activity'])
      )
    })

    it('should ban user permanently when no duration specified', async () => {
      mockDb.execute.mockResolvedValue({})

      await fraudDetectionService.banUser('user1', 'Permanent ban')

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_bans'),
        expect.arrayContaining(['user1', 'Permanent ban', null])
      )
    })
  })
})