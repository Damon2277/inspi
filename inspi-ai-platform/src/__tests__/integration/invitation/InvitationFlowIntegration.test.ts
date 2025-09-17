/**
 * 邀请系统完整流程集成测试
 * 测试从邀请码生成到奖励发放的完整流程
 */

import { InvitationService } from '@/lib/invitation/services/InvitationService'
import { RewardEngine } from '@/lib/invitation/services/RewardEngine'
import { InviteRegistrationHandler } from '@/lib/invitation/services/InviteRegistrationHandler'
import { FraudDetectionService } from '@/lib/invitation/services/FraudDetectionService'
import { NotificationService } from '@/lib/invitation/services/NotificationService'
import { DatabaseFactory } from '@/lib/invitation/database'
import { logger } from '@/lib/utils/logger'

describe('邀请系统完整流程集成测试', () => {
  let invitationService: InvitationService
  let rewardEngine: RewardEngine
  let registrationHandler: InviteRegistrationHandler
  let fraudDetection: FraudDetectionService
  let notificationService: NotificationService
  let db: any

  beforeAll(async () => {
    // 初始化数据库连接
    db = await DatabaseFactory.createPool({
      host: 'localhost',
      port: 3306,
      database: 'test_invitation_system',
      username: 'test',
      password: 'test'
    })

    // 初始化服务
    invitationService = new InvitationService(db)
    rewardEngine = new RewardEngine(db)
    registrationHandler = new InviteRegistrationHandler(db, rewardEngine)
    fraudDetection = new FraudDetectionService(db)
    notificationService = new NotificationService(db)
  })

  afterAll(async () => {
    await DatabaseFactory.closePool()
  })

  beforeEach(async () => {
    // 清理测试数据
    await db.execute('DELETE FROM invite_registrations')
    await db.execute('DELETE FROM invite_codes')
    await db.execute('DELETE FROM reward_records')
    await db.execute('DELETE FROM user_behavior_patterns')
    await db.execute('DELETE FROM notifications')
  })

  describe('完整邀请流程测试', () => {
    it('应该完成从邀请码生成到奖励发放的完整流程', async () => {
      const inviterId = 'user-inviter-001'
      const inviteeId = 'user-invitee-001'
      const inviteeEmail = 'invitee@example.com'

      // 步骤1: 生成邀请码
      const inviteCode = await invitationService.generateInviteCode(inviterId, {
        maxUsage: 10,
        expiresInDays: 30
      })

      expect(inviteCode).toBeDefined()
      expect(inviteCode.inviterId).toBe(inviterId)
      expect(inviteCode.isActive).toBe(true)

      // 步骤2: 验证邀请码
      const validation = await invitationService.validateInviteCode(inviteCode.code)
      expect(validation.isValid).toBe(true)
      expect(validation.code?.id).toBe(inviteCode.id)

      // 步骤3: 防作弊检测
      const fraudCheck = await fraudDetection.checkInviteRegistration({
        inviteCodeId: inviteCode.id,
        inviterId,
        inviteeId,
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 Test Browser',
        registrationTime: new Date()
      })

      expect(fraudCheck.action).toBe('allow')
      expect(fraudCheck.isSuspicious).toBe(false)

      // 步骤4: 处理邀请注册
      const registrationResult = await registrationHandler.handleInviteRegistration({
        inviteCode: inviteCode.code,
        inviteeId,
        inviteeEmail,
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 Test Browser'
      })

      expect(registrationResult.success).toBe(true)
      expect(registrationResult.registration).toBeDefined()
      expect(registrationResult.rewards).toBeDefined()
      expect(registrationResult.rewards!.length).toBeGreaterThan(0)

      // 步骤5: 验证奖励发放
      const rewardRecords = await db.query(
        'SELECT * FROM reward_records WHERE user_id = ?',
        [inviterId]
      )

      expect(rewardRecords.length).toBeGreaterThan(0)
      expect(rewardRecords[0].source_type).toBe('invite_registration')

      // 步骤6: 验证通知发送
      const notifications = await db.query(
        'SELECT * FROM notifications WHERE user_id = ?',
        [inviterId]
      )

      expect(notifications.length).toBeGreaterThan(0)
      expect(notifications[0].type).toBe('invite_success')

      // 步骤7: 验证统计数据更新
      const stats = await invitationService.getUserInviteStats(inviterId)
      expect(stats.totalInvites).toBe(1)
      expect(stats.successfulRegistrations).toBe(1)
      expect(stats.totalRewardsEarned).toBeGreaterThan(0)

      logger.info('完整邀请流程测试通过', {
        inviteCode: inviteCode.code,
        inviterId,
        inviteeId,
        rewardsCount: registrationResult.rewards!.length
      })
    })

    it('应该正确处理邀请激活流程', async () => {
      const inviterId = 'user-inviter-002'
      const inviteeId = 'user-invitee-002'

      // 生成邀请码并完成注册
      const inviteCode = await invitationService.generateInviteCode(inviterId)
      await registrationHandler.handleInviteRegistration({
        inviteCode: inviteCode.code,
        inviteeId,
        inviteeEmail: 'invitee2@example.com',
        ipAddress: '192.168.1.101',
        userAgent: 'Mozilla/5.0 Test Browser'
      })

      // 激活邀请用户
      const activationResult = await registrationHandler.activateInvitee(inviteeId)
      expect(activationResult.success).toBe(true)

      // 验证激活奖励
      const activationRewards = await db.query(
        'SELECT * FROM reward_records WHERE user_id = ? AND source_type = ?',
        [inviterId, 'invite_activation']
      )

      expect(activationRewards.length).toBeGreaterThan(0)

      // 验证激活通知
      const activationNotifications = await db.query(
        'SELECT * FROM notifications WHERE user_id = ? AND type = ?',
        [inviterId, 'invite_activation']
      )

      expect(activationNotifications.length).toBeGreaterThan(0)

      logger.info('邀请激活流程测试通过', {
        inviterId,
        inviteeId,
        activationRewards: activationRewards.length
      })
    })

    it('应该正确处理多次邀请的累积奖励', async () => {
      const inviterId = 'user-inviter-003'
      const inviteCode = await invitationService.generateInviteCode(inviterId, {
        maxUsage: 5
      })

      const invitees = [
        { id: 'user-invitee-003-1', email: 'invitee3-1@example.com' },
        { id: 'user-invitee-003-2', email: 'invitee3-2@example.com' },
        { id: 'user-invitee-003-3', email: 'invitee3-3@example.com' }
      ]

      // 处理多个邀请注册
      for (let i = 0; i < invitees.length; i++) {
        const invitee = invitees[i]
        const result = await registrationHandler.handleInviteRegistration({
          inviteCode: inviteCode.code,
          inviteeId: invitee.id,
          inviteeEmail: invitee.email,
          ipAddress: `192.168.1.${110 + i}`,
          userAgent: 'Mozilla/5.0 Test Browser'
        })

        expect(result.success).toBe(true)

        // 激活用户
        await registrationHandler.activateInvitee(invitee.id)
      }

      // 验证累积奖励
      const totalRewards = await db.query(
        'SELECT COUNT(*) as count, SUM(CASE WHEN reward_type = "ai_credits" THEN reward_amount ELSE 0 END) as total_credits FROM reward_records WHERE user_id = ?',
        [inviterId]
      )

      expect(totalRewards[0].count).toBe(invitees.length * 2) // 注册奖励 + 激活奖励
      expect(totalRewards[0].total_credits).toBeGreaterThan(0)

      // 验证统计数据
      const stats = await invitationService.getUserInviteStats(inviterId)
      expect(stats.totalInvites).toBe(invitees.length)
      expect(stats.successfulRegistrations).toBe(invitees.length)
      expect(stats.activeInvitees).toBe(invitees.length)

      logger.info('多次邀请累积奖励测试通过', {
        inviterId,
        inviteesCount: invitees.length,
        totalRewards: totalRewards[0].count,
        totalCredits: totalRewards[0].total_credits
      })
    })
  })

  describe('异常情况处理测试', () => {
    it('应该正确处理无效邀请码', async () => {
      const invalidCode = 'INVALID_CODE_123'

      const validation = await invitationService.validateInviteCode(invalidCode)
      expect(validation.isValid).toBe(false)
      expect(validation.errorCode).toBe('INVALID_INVITE_CODE')

      const registrationResult = await registrationHandler.handleInviteRegistration({
        inviteCode: invalidCode,
        inviteeId: 'user-test-001',
        inviteeEmail: 'test@example.com',
        ipAddress: '192.168.1.200',
        userAgent: 'Mozilla/5.0 Test Browser'
      })

      expect(registrationResult.success).toBe(false)
      expect(registrationResult.errorCode).toBe('INVALID_INVITE_CODE')
    })

    it('应该正确处理过期邀请码', async () => {
      const inviterId = 'user-inviter-004'
      
      // 创建已过期的邀请码
      const expiredCode = await invitationService.generateInviteCode(inviterId, {
        expiresInDays: -1 // 已过期
      })

      const validation = await invitationService.validateInviteCode(expiredCode.code)
      expect(validation.isValid).toBe(false)
      expect(validation.errorCode).toBe('EXPIRED_INVITE_CODE')

      const registrationResult = await registrationHandler.handleInviteRegistration({
        inviteCode: expiredCode.code,
        inviteeId: 'user-test-002',
        inviteeEmail: 'test2@example.com',
        ipAddress: '192.168.1.201',
        userAgent: 'Mozilla/5.0 Test Browser'
      })

      expect(registrationResult.success).toBe(false)
      expect(registrationResult.errorCode).toBe('EXPIRED_INVITE_CODE')
    })

    it('应该正确处理自我邀请', async () => {
      const userId = 'user-self-invite-001'
      const inviteCode = await invitationService.generateInviteCode(userId)

      const registrationResult = await registrationHandler.handleInviteRegistration({
        inviteCode: inviteCode.code,
        inviteeId: userId, // 自我邀请
        inviteeEmail: 'self@example.com',
        ipAddress: '192.168.1.202',
        userAgent: 'Mozilla/5.0 Test Browser'
      })

      expect(registrationResult.success).toBe(false)
      expect(registrationResult.errorCode).toBe('SELF_INVITE_ATTEMPT')
    })

    it('应该正确处理使用次数超限', async () => {
      const inviterId = 'user-inviter-005'
      const inviteCode = await invitationService.generateInviteCode(inviterId, {
        maxUsage: 1
      })

      // 第一次使用成功
      const firstResult = await registrationHandler.handleInviteRegistration({
        inviteCode: inviteCode.code,
        inviteeId: 'user-invitee-005-1',
        inviteeEmail: 'invitee5-1@example.com',
        ipAddress: '192.168.1.203',
        userAgent: 'Mozilla/5.0 Test Browser'
      })

      expect(firstResult.success).toBe(true)

      // 第二次使用应该失败
      const secondResult = await registrationHandler.handleInviteRegistration({
        inviteCode: inviteCode.code,
        inviteeId: 'user-invitee-005-2',
        inviteeEmail: 'invitee5-2@example.com',
        ipAddress: '192.168.1.204',
        userAgent: 'Mozilla/5.0 Test Browser'
      })

      expect(secondResult.success).toBe(false)
      expect(secondResult.errorCode).toBe('USAGE_LIMIT_EXCEEDED')
    })
  })

  describe('防作弊机制集成测试', () => {
    it('应该检测并阻止可疑的批量注册', async () => {
      const inviterId = 'user-inviter-006'
      const inviteCode = await invitationService.generateInviteCode(inviterId, {
        maxUsage: 10
      })

      const suspiciousIP = '192.168.1.250'
      const results = []

      // 模拟短时间内大量注册
      for (let i = 0; i < 5; i++) {
        const result = await registrationHandler.handleInviteRegistration({
          inviteCode: inviteCode.code,
          inviteeId: `user-suspicious-${i}`,
          inviteeEmail: `suspicious${i}@example.com`,
          ipAddress: suspiciousIP,
          userAgent: 'Mozilla/5.0 Test Browser'
        })
        results.push(result)
      }

      // 前几次可能成功，但后续应该被阻止
      const blockedResults = results.filter(r => !r.success && r.errorCode === 'SUSPICIOUS_ACTIVITY')
      expect(blockedResults.length).toBeGreaterThan(0)

      logger.info('防作弊机制测试通过', {
        totalAttempts: results.length,
        blockedAttempts: blockedResults.length
      })
    })

    it('应该检测设备指纹异常', async () => {
      const inviterId = 'user-inviter-007'
      const inviteCode = await invitationService.generateInviteCode(inviterId)

      // 模拟异常的设备指纹
      const suspiciousUserAgent = 'SuspiciousBot/1.0'

      const result = await registrationHandler.handleInviteRegistration({
        inviteCode: inviteCode.code,
        inviteeId: 'user-suspicious-device',
        inviteeEmail: 'suspicious-device@example.com',
        ipAddress: '192.168.1.251',
        userAgent: suspiciousUserAgent
      })

      // 根据防作弊规则，可能被标记为可疑或直接阻止
      if (!result.success) {
        expect(result.errorCode).toBe('SUSPICIOUS_ACTIVITY')
      } else {
        // 如果允许通过，应该有风险标记
        const behaviorPattern = await db.query(
          'SELECT * FROM user_behavior_patterns WHERE user_id = ?',
          ['user-suspicious-device']
        )
        expect(behaviorPattern.length).toBeGreaterThan(0)
      }
    })
  })

  describe('并发场景测试', () => {
    it('应该正确处理并发邀请注册', async () => {
      const inviterId = 'user-inviter-concurrent'
      const inviteCode = await invitationService.generateInviteCode(inviterId, {
        maxUsage: 10
      })

      // 创建并发注册请求
      const concurrentRequests = Array.from({ length: 5 }, (_, i) => 
        registrationHandler.handleInviteRegistration({
          inviteCode: inviteCode.code,
          inviteeId: `user-concurrent-${i}`,
          inviteeEmail: `concurrent${i}@example.com`,
          ipAddress: `192.168.2.${100 + i}`,
          userAgent: 'Mozilla/5.0 Test Browser'
        })
      )

      const results = await Promise.all(concurrentRequests)
      const successfulResults = results.filter(r => r.success)

      expect(successfulResults.length).toBe(5)

      // 验证使用次数正确更新
      const updatedCode = await invitationService.getInviteCodeById(inviteCode.id)
      expect(updatedCode.usageCount).toBe(5)

      logger.info('并发邀请注册测试通过', {
        concurrentRequests: concurrentRequests.length,
        successfulResults: successfulResults.length,
        finalUsageCount: updatedCode.usageCount
      })
    })

    it('应该正确处理并发奖励发放', async () => {
      const inviterId = 'user-inviter-reward-concurrent'
      const inviteCode = await invitationService.generateInviteCode(inviterId)

      // 并发处理多个邀请注册和激活
      const concurrentOperations = []

      for (let i = 0; i < 3; i++) {
        const inviteeId = `user-reward-concurrent-${i}`
        
        // 注册
        concurrentOperations.push(
          registrationHandler.handleInviteRegistration({
            inviteCode: inviteCode.code,
            inviteeId,
            inviteeEmail: `reward-concurrent${i}@example.com`,
            ipAddress: `192.168.3.${100 + i}`,
            userAgent: 'Mozilla/5.0 Test Browser'
          })
        )

        // 激活
        concurrentOperations.push(
          registrationHandler.activateInvitee(inviteeId)
        )
      }

      const results = await Promise.all(concurrentOperations)
      const successfulOperations = results.filter(r => r.success)

      expect(successfulOperations.length).toBe(6) // 3个注册 + 3个激活

      // 验证奖励记录数量正确
      const rewardRecords = await db.query(
        'SELECT * FROM reward_records WHERE user_id = ?',
        [inviterId]
      )

      expect(rewardRecords.length).toBe(6) // 每个邀请2个奖励（注册+激活）

      logger.info('并发奖励发放测试通过', {
        totalOperations: concurrentOperations.length,
        successfulOperations: successfulOperations.length,
        rewardRecords: rewardRecords.length
      })
    })
  })
})