/**
 * 奖励系统集成测试
 * 测试奖励计算、发放、配置等完整流程
 */

import { RewardEngine } from '@/lib/invitation/services/RewardEngine'
import { RewardConfigService } from '@/lib/invitation/services/RewardConfigService'
import { CreditSystem } from '@/lib/invitation/services/CreditSystem'
import { BadgeSystem } from '@/lib/invitation/services/BadgeSystem'
import { DatabaseFactory } from '@/lib/invitation/database'
import { RewardType, InviteEventType } from '@/lib/invitation/types'
import { logger } from '@/lib/utils/logger'

describe('奖励系统集成测试', () => {
  let rewardEngine: RewardEngine
  let rewardConfigService: RewardConfigService
  let creditSystem: CreditSystem
  let badgeSystem: BadgeSystem
  let db: any

  beforeAll(async () => {
    db = await DatabaseFactory.createPool({
      host: 'localhost',
      port: 3306,
      database: 'test_invitation_system',
      username: 'test',
      password: 'test'
    })

    rewardEngine = new RewardEngine(db)
    rewardConfigService = new RewardConfigService(db)
    creditSystem = new CreditSystem(db)
    badgeSystem = new BadgeSystem(db)
  })

  afterAll(async () => {
    await DatabaseFactory.closePool()
  })

  beforeEach(async () => {
    // 清理测试数据
    await db.execute('DELETE FROM reward_records')
    await db.execute('DELETE FROM reward_rules')
    await db.execute('DELETE FROM reward_activities')
    await db.execute('DELETE FROM user_credits')
    await db.execute('DELETE FROM user_badges')
    await db.execute('DELETE FROM reward_approvals')
  })

  describe('奖励配置和规则测试', () => {
    it('应该正确创建和应用奖励规则', async () => {
      const userId = 'user-reward-001'

      // 创建奖励规则
      const rule = await rewardConfigService.createRewardRule({
        name: '邀请注册奖励',
        description: '用户通过邀请成功注册获得奖励',
        eventType: InviteEventType.USER_REGISTERED,
        rewardType: RewardType.AI_CREDITS,
        rewardAmount: 50,
        conditions: {
          minInvites: 1,
          maxDailyRewards: 10
        },
        priority: 1,
        isActive: true
      })

      expect(rule).toBeDefined()
      expect(rule.name).toBe('邀请注册奖励')
      expect(rule.rewardAmount).toBe(50)

      // 应用奖励规则
      const rewards = await rewardEngine.calculateRewards(userId, InviteEventType.USER_REGISTERED, {
        inviteCount: 1,
        registrationTime: new Date()
      })

      expect(rewards.length).toBeGreaterThan(0)
      expect(rewards[0].type).toBe(RewardType.AI_CREDITS)
      expect(rewards[0].amount).toBe(50)

      // 发放奖励
      const grantResult = await rewardEngine.grantRewards(userId, rewards, {
        sourceType: 'invite_registration',
        sourceId: 'test-registration-001'
      })

      expect(grantResult.success).toBe(true)
      expect(grantResult.grantedRewards.length).toBe(1)

      logger.info('奖励规则创建和应用测试通过', {
        ruleId: rule.id,
        userId,
        rewardsCount: rewards.length
      })
    })

    it('应该正确处理多层级奖励规则', async () => {
      const userId = 'user-reward-002'

      // 创建多个优先级不同的奖励规则
      const rules = [
        {
          name: '基础邀请奖励',
          eventType: InviteEventType.USER_REGISTERED,
          rewardType: RewardType.AI_CREDITS,
          rewardAmount: 30,
          priority: 1,
          conditions: {}
        },
        {
          name: '高级邀请奖励',
          eventType: InviteEventType.USER_REGISTERED,
          rewardType: RewardType.AI_CREDITS,
          rewardAmount: 20,
          priority: 2,
          conditions: { minInvites: 5 }
        },
        {
          name: '邀请徽章奖励',
          eventType: InviteEventType.USER_REGISTERED,
          rewardType: RewardType.BADGE,
          rewardAmount: 1,
          priority: 3,
          conditions: { minInvites: 10 }
        }
      ]

      for (const ruleData of rules) {
        await rewardConfigService.createRewardRule({
          ...ruleData,
          description: `测试规则: ${ruleData.name}`,
          isActive: true
        })
      }

      // 测试不同邀请数量的奖励计算
      const testCases = [
        { inviteCount: 1, expectedRewards: 1 }, // 只有基础奖励
        { inviteCount: 5, expectedRewards: 2 }, // 基础 + 高级奖励
        { inviteCount: 10, expectedRewards: 3 } // 基础 + 高级 + 徽章奖励
      ]

      for (const testCase of testCases) {
        const rewards = await rewardEngine.calculateRewards(userId, InviteEventType.USER_REGISTERED, {
          inviteCount: testCase.inviteCount
        })

        expect(rewards.length).toBe(testCase.expectedRewards)

        logger.info('多层级奖励规则测试', {
          inviteCount: testCase.inviteCount,
          expectedRewards: testCase.expectedRewards,
          actualRewards: rewards.length
        })
      }
    })

    it('应该正确处理奖励活动配置', async () => {
      const userId = 'user-activity-001'

      // 创建奖励活动
      const activity = await rewardConfigService.createRewardActivity({
        name: '春节邀请活动',
        description: '春节期间邀请奖励翻倍',
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7天后
        rewardRules: [
          {
            name: '春节邀请奖励',
            eventType: InviteEventType.USER_REGISTERED,
            rewardType: RewardType.AI_CREDITS,
            rewardAmount: 100, // 翻倍奖励
            conditions: {},
            priority: 1
          }
        ],
        targetMetrics: {
          totalInvites: 1000,
          totalRegistrations: 500
        },
        isActive: true
      })

      expect(activity).toBeDefined()
      expect(activity.name).toBe('春节邀请活动')

      // 在活动期间计算奖励
      const rewards = await rewardEngine.calculateRewards(userId, InviteEventType.USER_REGISTERED, {
        inviteCount: 1,
        activityId: activity.id
      })

      expect(rewards.length).toBeGreaterThan(0)
      expect(rewards[0].amount).toBe(100) // 活动期间的翻倍奖励

      logger.info('奖励活动配置测试通过', {
        activityId: activity.id,
        rewardAmount: rewards[0].amount
      })
    })
  })

  describe('积分系统集成测试', () => {
    it('应该正确管理用户积分', async () => {
      const userId = 'user-credits-001'

      // 初始化用户积分
      await creditSystem.initializeUserCredits(userId)

      // 获取初始积分
      const initialCredits = await creditSystem.getUserCredits(userId)
      expect(initialCredits.aiCredits).toBe(0)
      expect(initialCredits.totalEarned).toBe(0)

      // 增加积分
      const addResult = await creditSystem.addCredits(userId, 100, 'invite_registration', 'test-001')
      expect(addResult.success).toBe(true)
      expect(addResult.newBalance).toBe(100)

      // 验证积分更新
      const updatedCredits = await creditSystem.getUserCredits(userId)
      expect(updatedCredits.aiCredits).toBe(100)
      expect(updatedCredits.totalEarned).toBe(100)

      // 使用积分
      const useResult = await creditSystem.useCredits(userId, 30, 'ai_generation', 'test-use-001')
      expect(useResult.success).toBe(true)
      expect(useResult.remainingBalance).toBe(70)

      // 验证积分使用后的余额
      const finalCredits = await creditSystem.getUserCredits(userId)
      expect(finalCredits.aiCredits).toBe(70)
      expect(finalCredits.totalUsed).toBe(30)

      logger.info('积分系统管理测试通过', {
        userId,
        finalBalance: finalCredits.aiCredits,
        totalEarned: finalCredits.totalEarned,
        totalUsed: finalCredits.totalUsed
      })
    })

    it('应该正确处理积分不足的情况', async () => {
      const userId = 'user-credits-002'

      await creditSystem.initializeUserCredits(userId)
      await creditSystem.addCredits(userId, 50, 'test', 'test-002')

      // 尝试使用超过余额的积分
      const useResult = await creditSystem.useCredits(userId, 100, 'ai_generation', 'test-use-002')
      expect(useResult.success).toBe(false)
      expect(useResult.error).toContain('积分不足')

      // 验证余额未变
      const credits = await creditSystem.getUserCredits(userId)
      expect(credits.aiCredits).toBe(50)
    })

    it('应该正确处理积分过期', async () => {
      const userId = 'user-credits-003'

      await creditSystem.initializeUserCredits(userId)

      // 添加有过期时间的积分
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24小时后过期
      await creditSystem.addCredits(userId, 100, 'test', 'test-003', expiresAt)

      // 验证积分添加成功
      const credits = await creditSystem.getUserCredits(userId)
      expect(credits.aiCredits).toBe(100)

      // 模拟积分过期处理
      await creditSystem.processExpiredCredits()

      // 由于是测试环境，我们手动更新过期时间来模拟过期
      await db.execute(
        'UPDATE user_credits SET expires_at = ? WHERE user_id = ?',
        [new Date(Date.now() - 1000), userId] // 设为已过期
      )

      await creditSystem.processExpiredCredits()

      // 验证过期积分被处理
      const expiredCredits = await creditSystem.getUserCredits(userId)
      expect(expiredCredits.aiCredits).toBe(0)

      logger.info('积分过期处理测试通过', { userId })
    })
  })

  describe('徽章系统集成测试', () => {
    it('应该正确授予和管理徽章', async () => {
      const userId = 'user-badge-001'

      // 授予徽章
      const grantResult = await badgeSystem.grantBadge(userId, 'first_invite', {
        name: '首次邀请',
        description: '完成第一次邀请',
        iconUrl: '/badges/first-invite.png'
      })

      expect(grantResult.success).toBe(true)
      expect(grantResult.badge).toBeDefined()

      // 获取用户徽章
      const userBadges = await badgeSystem.getUserBadges(userId)
      expect(userBadges.length).toBe(1)
      expect(userBadges[0].badgeId).toBe('first_invite')

      // 尝试重复授予相同徽章
      const duplicateResult = await badgeSystem.grantBadge(userId, 'first_invite', {
        name: '首次邀请',
        description: '完成第一次邀请',
        iconUrl: '/badges/first-invite.png'
      })

      expect(duplicateResult.success).toBe(false)
      expect(duplicateResult.error).toContain('已拥有该徽章')

      logger.info('徽章授予和管理测试通过', {
        userId,
        badgeId: 'first_invite',
        userBadgesCount: userBadges.length
      })
    })

    it('应该正确处理徽章升级', async () => {
      const userId = 'user-badge-002'

      // 授予初级徽章
      await badgeSystem.grantBadge(userId, 'inviter_bronze', {
        name: '邀请达人（铜）',
        description: '邀请5人注册',
        iconUrl: '/badges/inviter-bronze.png'
      })

      // 升级到银级徽章
      const upgradeResult = await badgeSystem.upgradeBadge(userId, 'inviter_bronze', 'inviter_silver', {
        name: '邀请达人（银）',
        description: '邀请20人注册',
        iconUrl: '/badges/inviter-silver.png'
      })

      expect(upgradeResult.success).toBe(true)

      // 验证徽章升级
      const userBadges = await badgeSystem.getUserBadges(userId)
      const silverBadge = userBadges.find(b => b.badgeId === 'inviter_silver')
      const bronzeBadge = userBadges.find(b => b.badgeId === 'inviter_bronze')

      expect(silverBadge).toBeDefined()
      expect(bronzeBadge).toBeUndefined() // 旧徽章应该被移除

      logger.info('徽章升级测试通过', {
        userId,
        upgradedBadge: 'inviter_silver'
      })
    })
  })

  describe('奖励审核流程测试', () => {
    it('应该正确处理奖励审核流程', async () => {
      const userId = 'user-approval-001'

      // 创建需要审核的奖励规则
      const rule = await rewardConfigService.createRewardRule({
        name: '高价值奖励',
        description: '需要审核的高价值奖励',
        eventType: InviteEventType.USER_REGISTERED,
        rewardType: RewardType.PREMIUM_ACCESS,
        rewardAmount: 30, // 30天高级访问
        conditions: { requiresApproval: true },
        priority: 1,
        isActive: true
      })

      // 计算奖励（应该进入审核流程）
      const rewards = await rewardEngine.calculateRewards(userId, InviteEventType.USER_REGISTERED, {
        inviteCount: 1
      })

      expect(rewards.length).toBeGreaterThan(0)

      // 尝试发放奖励（应该进入审核状态）
      const grantResult = await rewardEngine.grantRewards(userId, rewards, {
        sourceType: 'invite_registration',
        sourceId: 'test-approval-001'
      })

      expect(grantResult.success).toBe(true)
      expect(grantResult.pendingApprovals).toBeDefined()
      expect(grantResult.pendingApprovals!.length).toBeGreaterThan(0)

      // 获取待审核的奖励
      const pendingApprovals = await rewardConfigService.getPendingApprovals({
        status: 'pending',
        pagination: { page: 1, limit: 10 }
      })

      expect(pendingApprovals.approvals.length).toBeGreaterThan(0)

      const approval = pendingApprovals.approvals[0]
      expect(approval.userId).toBe(userId)
      expect(approval.status).toBe('pending')

      // 审核通过
      const approveResult = await rewardConfigService.approveReward(approval.id, 'admin-001', {
        approved: true,
        notes: '审核通过，奖励合理'
      })

      expect(approveResult.success).toBe(true)

      // 验证奖励已发放
      const rewardRecords = await db.query(
        'SELECT * FROM reward_records WHERE user_id = ? AND source_id = ?',
        [userId, 'test-approval-001']
      )

      expect(rewardRecords.length).toBeGreaterThan(0)
      expect(rewardRecords[0].reward_type).toBe(RewardType.PREMIUM_ACCESS)

      logger.info('奖励审核流程测试通过', {
        userId,
        approvalId: approval.id,
        rewardType: RewardType.PREMIUM_ACCESS
      })
    })

    it('应该正确处理奖励审核拒绝', async () => {
      const userId = 'user-approval-002'

      // 创建需要审核的奖励
      const rule = await rewardConfigService.createRewardRule({
        name: '可疑奖励',
        description: '可能被拒绝的奖励',
        eventType: InviteEventType.USER_REGISTERED,
        rewardType: RewardType.AI_CREDITS,
        rewardAmount: 1000, // 异常高的奖励
        conditions: { requiresApproval: true },
        priority: 1,
        isActive: true
      })

      const rewards = await rewardEngine.calculateRewards(userId, InviteEventType.USER_REGISTERED, {
        inviteCount: 1
      })

      const grantResult = await rewardEngine.grantRewards(userId, rewards, {
        sourceType: 'invite_registration',
        sourceId: 'test-approval-002'
      })

      const pendingApprovals = await rewardConfigService.getPendingApprovals({
        status: 'pending',
        pagination: { page: 1, limit: 10 }
      })

      const approval = pendingApprovals.approvals.find(a => a.userId === userId)
      expect(approval).toBeDefined()

      // 审核拒绝
      const rejectResult = await rewardConfigService.approveReward(approval!.id, 'admin-002', {
        approved: false,
        notes: '奖励金额异常，拒绝发放'
      })

      expect(rejectResult.success).toBe(true)

      // 验证奖励未发放
      const rewardRecords = await db.query(
        'SELECT * FROM reward_records WHERE user_id = ? AND source_id = ?',
        [userId, 'test-approval-002']
      )

      expect(rewardRecords.length).toBe(0)

      // 验证审核记录
      const rejectedApproval = await db.query(
        'SELECT * FROM reward_approvals WHERE id = ?',
        [approval!.id]
      )

      expect(rejectedApproval[0].status).toBe('rejected')
      expect(rejectedApproval[0].admin_notes).toContain('拒绝发放')

      logger.info('奖励审核拒绝测试通过', {
        userId,
        approvalId: approval!.id
      })
    })
  })

  describe('奖励统计和报表测试', () => {
    it('应该正确生成奖励统计数据', async () => {
      const userIds = ['user-stats-001', 'user-stats-002', 'user-stats-003']
      const rewardTypes = [RewardType.AI_CREDITS, RewardType.BADGE, RewardType.PREMIUM_ACCESS]

      // 为多个用户发放不同类型的奖励
      for (let i = 0; i < userIds.length; i++) {
        const userId = userIds[i]
        const rewardType = rewardTypes[i]
        const amount = (i + 1) * 50

        await rewardEngine.grantRewards(userId, [{
          type: rewardType,
          amount,
          description: `测试奖励 ${i + 1}`
        }], {
          sourceType: 'test',
          sourceId: `test-stats-${i + 1}`
        })
      }

      // 获取奖励统计
      const stats = await rewardConfigService.getRewardStatistics({
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endDate: new Date()
      })

      expect(stats.totalRewards).toBe(userIds.length)
      expect(stats.totalAmount).toBeGreaterThan(0)
      expect(Object.keys(stats.byType).length).toBeGreaterThan(0)

      // 验证按类型统计
      for (const rewardType of rewardTypes) {
        if (stats.byType[rewardType]) {
          expect(stats.byType[rewardType].count).toBeGreaterThan(0)
        }
      }

      logger.info('奖励统计数据生成测试通过', {
        totalRewards: stats.totalRewards,
        totalAmount: stats.totalAmount,
        rewardTypes: Object.keys(stats.byType)
      })
    })
  })
})