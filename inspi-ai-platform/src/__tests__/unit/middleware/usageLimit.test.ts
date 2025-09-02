/**
 * 使用限制中间件测试
 */

import {
  checkGenerationLimit,
  checkReuseLimit,
  checkWorkLimit,
  updateUsage,
  resetDailyUsage,
  getUsageLimits,
  UsageLimitConfig,
} from '@/lib/middleware/usageLimit'
import { createUserFixture, createSubscriptionFixture } from '@/fixtures'

// Mock数据库
const mockDatabase = {
  users: new Map(),
  subscriptions: new Map(),
  usage: new Map(),
}

jest.mock('@/lib/db/mongodb', () => ({
  connectDB: jest.fn().mockResolvedValue(true),
  getUserById: jest.fn().mockImplementation((id) => 
    Promise.resolve(mockDatabase.users.get(id))
  ),
  getUserSubscription: jest.fn().mockImplementation((userId) => 
    Promise.resolve(mockDatabase.subscriptions.get(userId))
  ),
  getUserUsage: jest.fn().mockImplementation((userId) => 
    Promise.resolve(mockDatabase.usage.get(userId) || {
      userId,
      dailyGenerations: 0,
      dailyReuses: 0,
      totalWorks: 0,
      lastResetDate: new Date().toISOString().split('T')[0],
    })
  ),
  updateUserUsage: jest.fn().mockImplementation((userId, usage) => {
    mockDatabase.usage.set(userId, { ...usage, userId })
    return Promise.resolve(mockDatabase.usage.get(userId))
  }),
  getWorkCount: jest.fn().mockImplementation((userId) => {
    const usage = mockDatabase.usage.get(userId)
    return Promise.resolve(usage?.totalWorks || 0)
  }),
}))

// Mock配置
jest.mock('@/lib/config/subscription', () => ({
  SUBSCRIPTION_LIMITS: {
    free: {
      dailyGenerations: 3,
      dailyReuses: 5,
      maxWorks: 10,
      features: ['basic'],
    },
    pro: {
      dailyGenerations: 20,
      dailyReuses: 50,
      maxWorks: 100,
      features: ['basic', 'advanced', 'priority'],
    },
    super: {
      dailyGenerations: -1, // 无限制
      dailyReuses: -1,
      maxWorks: -1,
      features: ['basic', 'advanced', 'priority', 'premium'],
    },
  },
}))

describe('使用限制中间件测试', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDatabase.users.clear()
    mockDatabase.subscriptions.clear()
    mockDatabase.usage.clear()
  })

  describe('checkGenerationLimit', () => {
    test('应该允许免费用户在限制内生成', async () => {
      const testUser = createUserFixture({ id: 'user-1' })
      const subscription = createSubscriptionFixture({
        userId: testUser.id,
        plan: 'free',
        status: 'active',
      })

      mockDatabase.users.set(testUser.id, testUser)
      mockDatabase.subscriptions.set(testUser.id, subscription)
      mockDatabase.usage.set(testUser.id, {
        userId: testUser.id,
        dailyGenerations: 2, // 在限制内
        dailyReuses: 0,
        totalWorks: 5,
        lastResetDate: new Date().toISOString().split('T')[0],
      })

      const result = await checkGenerationLimit(testUser.id)

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(1) // 3 - 2 = 1
      expect(result.limit).toBe(3)
      expect(result.resetTime).toBeDefined()
    })

    test('应该拒绝免费用户超出限制的生成', async () => {
      const testUser = createUserFixture({ id: 'user-1' })
      const subscription = createSubscriptionFixture({
        userId: testUser.id,
        plan: 'free',
        status: 'active',
      })

      mockDatabase.users.set(testUser.id, testUser)
      mockDatabase.subscriptions.set(testUser.id, subscription)
      mockDatabase.usage.set(testUser.id, {
        userId: testUser.id,
        dailyGenerations: 3, // 已达限制
        dailyReuses: 0,
        totalWorks: 5,
        lastResetDate: new Date().toISOString().split('T')[0],
      })

      const result = await checkGenerationLimit(testUser.id)

      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
      expect(result.limit).toBe(3)
      expect(result.resetTime).toBeDefined()
      expect(result.upgradeRequired).toBe(true)
    })

    test('应该允许Pro用户更高的限制', async () => {
      const testUser = createUserFixture({ id: 'user-1' })
      const subscription = createSubscriptionFixture({
        userId: testUser.id,
        plan: 'pro',
        status: 'active',
      })

      mockDatabase.users.set(testUser.id, testUser)
      mockDatabase.subscriptions.set(testUser.id, subscription)
      mockDatabase.usage.set(testUser.id, {
        userId: testUser.id,
        dailyGenerations: 15, // Pro用户限制内
        dailyReuses: 0,
        totalWorks: 50,
        lastResetDate: new Date().toISOString().split('T')[0],
      })

      const result = await checkGenerationLimit(testUser.id)

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(5) // 20 - 15 = 5
      expect(result.limit).toBe(20)
    })

    test('应该允许Super用户无限制生成', async () => {
      const testUser = createUserFixture({ id: 'user-1' })
      const subscription = createSubscriptionFixture({
        userId: testUser.id,
        plan: 'super',
        status: 'active',
      })

      mockDatabase.users.set(testUser.id, testUser)
      mockDatabase.subscriptions.set(testUser.id, subscription)
      mockDatabase.usage.set(testUser.id, {
        userId: testUser.id,
        dailyGenerations: 100, // 大量使用
        dailyReuses: 0,
        totalWorks: 500,
        lastResetDate: new Date().toISOString().split('T')[0],
      })

      const result = await checkGenerationLimit(testUser.id)

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(-1) // 无限制
      expect(result.limit).toBe(-1)
      expect(result.unlimited).toBe(true)
    })

    test('应该处理暂停的订阅', async () => {
      const testUser = createUserFixture({ id: 'user-1' })
      const subscription = createSubscriptionFixture({
        userId: testUser.id,
        plan: 'pro',
        status: 'paused', // 暂停状态
      })

      mockDatabase.users.set(testUser.id, testUser)
      mockDatabase.subscriptions.set(testUser.id, subscription)

      const result = await checkGenerationLimit(testUser.id)

      // 暂停的订阅应该降级到免费限制
      expect(result.limit).toBe(3)
      expect(result.downgraded).toBe(true)
    })

    test('应该处理过期的订阅', async () => {
      const testUser = createUserFixture({ id: 'user-1' })
      const subscription = createSubscriptionFixture({
        userId: testUser.id,
        plan: 'pro',
        status: 'expired', // 过期状态
      })

      mockDatabase.users.set(testUser.id, testUser)
      mockDatabase.subscriptions.set(testUser.id, subscription)

      const result = await checkGenerationLimit(testUser.id)

      expect(result.limit).toBe(3) // 降级到免费限制
      expect(result.expired).toBe(true)
    })

    test('应该自动重置每日使用量', async () => {
      const testUser = createUserFixture({ id: 'user-1' })
      const subscription = createSubscriptionFixture({
        userId: testUser.id,
        plan: 'free',
        status: 'active',
      })

      mockDatabase.users.set(testUser.id, testUser)
      mockDatabase.subscriptions.set(testUser.id, subscription)
      
      // 设置昨天的使用数据
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      
      mockDatabase.usage.set(testUser.id, {
        userId: testUser.id,
        dailyGenerations: 3, // 昨天已用完
        dailyReuses: 5,
        totalWorks: 5,
        lastResetDate: yesterday.toISOString().split('T')[0],
      })

      const result = await checkGenerationLimit(testUser.id)

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(3) // 应该重置为满额
      expect(result.reset).toBe(true)
    })
  })

  describe('checkReuseLimit', () => {
    test('应该检查复用限制', async () => {
      const testUser = createUserFixture({ id: 'user-1' })
      const subscription = createSubscriptionFixture({
        userId: testUser.id,
        plan: 'free',
        status: 'active',
      })

      mockDatabase.users.set(testUser.id, testUser)
      mockDatabase.subscriptions.set(testUser.id, subscription)
      mockDatabase.usage.set(testUser.id, {
        userId: testUser.id,
        dailyGenerations: 0,
        dailyReuses: 3, // 在限制内
        totalWorks: 5,
        lastResetDate: new Date().toISOString().split('T')[0],
      })

      const result = await checkReuseLimit(testUser.id)

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(2) // 5 - 3 = 2
      expect(result.limit).toBe(5)
    })

    test('应该拒绝超出复用限制', async () => {
      const testUser = createUserFixture({ id: 'user-1' })
      const subscription = createSubscriptionFixture({
        userId: testUser.id,
        plan: 'free',
        status: 'active',
      })

      mockDatabase.users.set(testUser.id, testUser)
      mockDatabase.subscriptions.set(testUser.id, subscription)
      mockDatabase.usage.set(testUser.id, {
        userId: testUser.id,
        dailyGenerations: 0,
        dailyReuses: 5, // 已达限制
        totalWorks: 5,
        lastResetDate: new Date().toISOString().split('T')[0],
      })

      const result = await checkReuseLimit(testUser.id)

      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
      expect(result.upgradeRequired).toBe(true)
    })
  })

  describe('checkWorkLimit', () => {
    test('应该检查作品总数限制', async () => {
      const testUser = createUserFixture({ id: 'user-1' })
      const subscription = createSubscriptionFixture({
        userId: testUser.id,
        plan: 'free',
        status: 'active',
      })

      mockDatabase.users.set(testUser.id, testUser)
      mockDatabase.subscriptions.set(testUser.id, subscription)
      mockDatabase.usage.set(testUser.id, {
        userId: testUser.id,
        dailyGenerations: 0,
        dailyReuses: 0,
        totalWorks: 8, // 在限制内
        lastResetDate: new Date().toISOString().split('T')[0],
      })

      const result = await checkWorkLimit(testUser.id)

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(2) // 10 - 8 = 2
      expect(result.limit).toBe(10)
    })

    test('应该拒绝超出作品限制', async () => {
      const testUser = createUserFixture({ id: 'user-1' })
      const subscription = createSubscriptionFixture({
        userId: testUser.id,
        plan: 'free',
        status: 'active',
      })

      mockDatabase.users.set(testUser.id, testUser)
      mockDatabase.subscriptions.set(testUser.id, subscription)
      mockDatabase.usage.set(testUser.id, {
        userId: testUser.id,
        dailyGenerations: 0,
        dailyReuses: 0,
        totalWorks: 10, // 已达限制
        lastResetDate: new Date().toISOString().split('T')[0],
      })

      const result = await checkWorkLimit(testUser.id)

      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
      expect(result.upgradeRequired).toBe(true)
    })
  })

  describe('updateUsage', () => {
    test('应该更新生成使用量', async () => {
      const testUser = createUserFixture({ id: 'user-1' })
      
      mockDatabase.users.set(testUser.id, testUser)
      mockDatabase.usage.set(testUser.id, {
        userId: testUser.id,
        dailyGenerations: 2,
        dailyReuses: 1,
        totalWorks: 5,
        lastResetDate: new Date().toISOString().split('T')[0],
      })

      const result = await updateUsage(testUser.id, 'generation', 1)

      expect(result.success).toBe(true)
      expect(result.newUsage.dailyGenerations).toBe(3)
      expect(result.newUsage.dailyReuses).toBe(1) // 不变
      expect(result.newUsage.totalWorks).toBe(5) // 不变
    })

    test('应该更新复用使用量', async () => {
      const testUser = createUserFixture({ id: 'user-1' })
      
      mockDatabase.users.set(testUser.id, testUser)
      mockDatabase.usage.set(testUser.id, {
        userId: testUser.id,
        dailyGenerations: 2,
        dailyReuses: 3,
        totalWorks: 5,
        lastResetDate: new Date().toISOString().split('T')[0],
      })

      const result = await updateUsage(testUser.id, 'reuse', 2)

      expect(result.success).toBe(true)
      expect(result.newUsage.dailyReuses).toBe(5)
      expect(result.newUsage.dailyGenerations).toBe(2) // 不变
    })

    test('应该更新作品总数', async () => {
      const testUser = createUserFixture({ id: 'user-1' })
      
      mockDatabase.users.set(testUser.id, testUser)
      mockDatabase.usage.set(testUser.id, {
        userId: testUser.id,
        dailyGenerations: 2,
        dailyReuses: 3,
        totalWorks: 8,
        lastResetDate: new Date().toISOString().split('T')[0],
      })

      const result = await updateUsage(testUser.id, 'work', 1)

      expect(result.success).toBe(true)
      expect(result.newUsage.totalWorks).toBe(9)
    })

    test('应该处理负数更新（删除作品）', async () => {
      const testUser = createUserFixture({ id: 'user-1' })
      
      mockDatabase.users.set(testUser.id, testUser)
      mockDatabase.usage.set(testUser.id, {
        userId: testUser.id,
        dailyGenerations: 2,
        dailyReuses: 3,
        totalWorks: 8,
        lastResetDate: new Date().toISOString().split('T')[0],
      })

      const result = await updateUsage(testUser.id, 'work', -2)

      expect(result.success).toBe(true)
      expect(result.newUsage.totalWorks).toBe(6)
    })

    test('应该防止负数使用量', async () => {
      const testUser = createUserFixture({ id: 'user-1' })
      
      mockDatabase.users.set(testUser.id, testUser)
      mockDatabase.usage.set(testUser.id, {
        userId: testUser.id,
        dailyGenerations: 1,
        dailyReuses: 0,
        totalWorks: 2,
        lastResetDate: new Date().toISOString().split('T')[0],
      })

      const result = await updateUsage(testUser.id, 'work', -5)

      expect(result.success).toBe(true)
      expect(result.newUsage.totalWorks).toBe(0) // 不应该为负数
    })
  })

  describe('resetDailyUsage', () => {
    test('应该重置每日使用量', async () => {
      const testUser = createUserFixture({ id: 'user-1' })
      
      mockDatabase.users.set(testUser.id, testUser)
      mockDatabase.usage.set(testUser.id, {
        userId: testUser.id,
        dailyGenerations: 3,
        dailyReuses: 5,
        totalWorks: 10,
        lastResetDate: '2024-08-25', // 昨天
      })

      const result = await resetDailyUsage(testUser.id)

      expect(result.success).toBe(true)
      expect(result.newUsage.dailyGenerations).toBe(0)
      expect(result.newUsage.dailyReuses).toBe(0)
      expect(result.newUsage.totalWorks).toBe(10) // 总数不重置
      expect(result.newUsage.lastResetDate).toBe(new Date().toISOString().split('T')[0])
    })

    test('应该处理不存在的用户', async () => {
      const result = await resetDailyUsage('nonexistent-user')

      expect(result.success).toBe(true)
      expect(result.created).toBe(true)
      expect(result.newUsage.dailyGenerations).toBe(0)
      expect(result.newUsage.dailyReuses).toBe(0)
      expect(result.newUsage.totalWorks).toBe(0)
    })
  })

  describe('getUsageLimits', () => {
    test('应该获取免费用户限制', async () => {
      const testUser = createUserFixture({ id: 'user-1' })
      const subscription = createSubscriptionFixture({
        userId: testUser.id,
        plan: 'free',
        status: 'active',
      })

      mockDatabase.users.set(testUser.id, testUser)
      mockDatabase.subscriptions.set(testUser.id, subscription)

      const limits = await getUsageLimits(testUser.id)

      expect(limits.dailyGenerations).toBe(3)
      expect(limits.dailyReuses).toBe(5)
      expect(limits.maxWorks).toBe(10)
      expect(limits.features).toContain('basic')
    })

    test('应该获取Pro用户限制', async () => {
      const testUser = createUserFixture({ id: 'user-1' })
      const subscription = createSubscriptionFixture({
        userId: testUser.id,
        plan: 'pro',
        status: 'active',
      })

      mockDatabase.users.set(testUser.id, testUser)
      mockDatabase.subscriptions.set(testUser.id, subscription)

      const limits = await getUsageLimits(testUser.id)

      expect(limits.dailyGenerations).toBe(20)
      expect(limits.dailyReuses).toBe(50)
      expect(limits.maxWorks).toBe(100)
      expect(limits.features).toContain('advanced')
    })

    test('应该获取Super用户限制', async () => {
      const testUser = createUserFixture({ id: 'user-1' })
      const subscription = createSubscriptionFixture({
        userId: testUser.id,
        plan: 'super',
        status: 'active',
      })

      mockDatabase.users.set(testUser.id, testUser)
      mockDatabase.subscriptions.set(testUser.id, subscription)

      const limits = await getUsageLimits(testUser.id)

      expect(limits.dailyGenerations).toBe(-1)
      expect(limits.dailyReuses).toBe(-1)
      expect(limits.maxWorks).toBe(-1)
      expect(limits.features).toContain('premium')
    })

    test('应该处理无订阅用户', async () => {
      const testUser = createUserFixture({ id: 'user-1' })

      mockDatabase.users.set(testUser.id, testUser)
      // 没有订阅记录

      const limits = await getUsageLimits(testUser.id)

      // 应该返回免费限制
      expect(limits.dailyGenerations).toBe(3)
      expect(limits.dailyReuses).toBe(5)
      expect(limits.maxWorks).toBe(10)
    })
  })

  describe('高级功能测试', () => {
    test('应该支持临时提升限制', async () => {
      const testUser = createUserFixture({ id: 'user-1' })
      const subscription = createSubscriptionFixture({
        userId: testUser.id,
        plan: 'free',
        status: 'active',
        temporaryBoost: {
          dailyGenerations: 10, // 临时提升到10次
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
      })

      mockDatabase.users.set(testUser.id, testUser)
      mockDatabase.subscriptions.set(testUser.id, subscription)

      const result = await checkGenerationLimit(testUser.id)

      expect(result.limit).toBe(10) // 临时提升的限制
      expect(result.boosted).toBe(true)
    })

    test('应该处理过期的临时提升', async () => {
      const testUser = createUserFixture({ id: 'user-1' })
      const subscription = createSubscriptionFixture({
        userId: testUser.id,
        plan: 'free',
        status: 'active',
        temporaryBoost: {
          dailyGenerations: 10,
          expiresAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1小时前过期
        },
      })

      mockDatabase.users.set(testUser.id, testUser)
      mockDatabase.subscriptions.set(testUser.id, subscription)

      const result = await checkGenerationLimit(testUser.id)

      expect(result.limit).toBe(3) // 恢复到原始限制
      expect(result.boostExpired).toBe(true)
    })

    test('应该支持基于使用历史的动态限制', async () => {
      const testUser = createUserFixture({ id: 'user-1' })
      const subscription = createSubscriptionFixture({
        userId: testUser.id,
        plan: 'free',
        status: 'active',
      })

      mockDatabase.users.set(testUser.id, testUser)
      mockDatabase.subscriptions.set(testUser.id, subscription)
      
      // 模拟连续多天未使用完限额的用户
      mockDatabase.usage.set(testUser.id, {
        userId: testUser.id,
        dailyGenerations: 1, // 使用很少
        dailyReuses: 0,
        totalWorks: 3,
        lastResetDate: new Date().toISOString().split('T')[0],
        usageHistory: [1, 0, 2, 1, 0], // 过去5天的使用记录
      })

      const config: UsageLimitConfig = {
        dynamicLimits: true,
        loyaltyBonus: true,
      }

      const result = await checkGenerationLimit(testUser.id, config)

      // 低使用用户可能获得奖励限制
      expect(result.limit).toBeGreaterThanOrEqual(3)
      if (result.limit > 3) {
        expect(result.loyaltyBonus).toBe(true)
      }
    })

    test('应该支持团队共享限制', async () => {
      const teamOwner = createUserFixture({ id: 'team-owner' })
      const teamMember = createUserFixture({ id: 'team-member' })
      
      const subscription = createSubscriptionFixture({
        userId: teamOwner.id,
        plan: 'pro',
        status: 'active',
        teamSettings: {
          enabled: true,
          members: ['team-member'],
          sharedLimits: {
            dailyGenerations: 50, // 团队共享50次
            dailyReuses: 100,
          },
        },
      })

      mockDatabase.users.set(teamOwner.id, teamOwner)
      mockDatabase.users.set(teamMember.id, teamMember)
      mockDatabase.subscriptions.set(teamOwner.id, subscription)
      
      // 团队已使用30次
      mockDatabase.usage.set('team-shared', {
        dailyGenerations: 30,
        dailyReuses: 20,
        lastResetDate: new Date().toISOString().split('T')[0],
      })

      const result = await checkGenerationLimit(teamMember.id, {
        checkTeamLimits: true,
      })

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(20) // 50 - 30 = 20
      expect(result.teamShared).toBe(true)
    })
  })

  describe('错误处理和边界情况', () => {
    test('应该处理数据库错误', async () => {
      const { getUserSubscription } = require('@/lib/db/mongodb')
      getUserSubscription.mockRejectedValueOnce(new Error('Database error'))

      const result = await checkGenerationLimit('user-1')

      expect(result.allowed).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.fallback).toBe(true)
    })

    test('应该处理无效用户ID', async () => {
      const result = await checkGenerationLimit('')

      expect(result.allowed).toBe(false)
      expect(result.error).toContain('Invalid user ID')
    })

    test('应该处理损坏的使用数据', async () => {
      const testUser = createUserFixture({ id: 'user-1' })
      
      mockDatabase.users.set(testUser.id, testUser)
      mockDatabase.usage.set(testUser.id, {
        userId: testUser.id,
        dailyGenerations: 'invalid', // 无效数据
        dailyReuses: null,
        totalWorks: undefined,
      })

      const result = await checkGenerationLimit(testUser.id)

      // 应该重置为默认值
      expect(result.allowed).toBe(true)
      expect(result.reset).toBe(true)
      expect(result.remaining).toBe(3) // 免费用户默认限制
    })

    test('应该处理时区问题', async () => {
      const testUser = createUserFixture({ id: 'user-1' })
      
      mockDatabase.users.set(testUser.id, testUser)
      
      // 模拟不同时区的重置时间
      const utcDate = new Date()
      const userTimezone = 'Asia/Shanghai' // UTC+8
      
      mockDatabase.usage.set(testUser.id, {
        userId: testUser.id,
        dailyGenerations: 3,
        dailyReuses: 0,
        totalWorks: 5,
        lastResetDate: utcDate.toISOString().split('T')[0],
        timezone: userTimezone,
      })

      const result = await checkGenerationLimit(testUser.id, {
        respectTimezone: true,
      })

      expect(result.timezone).toBe(userTimezone)
    })

    test('应该处理并发更新', async () => {
      const testUser = createUserFixture({ id: 'user-1' })
      
      mockDatabase.users.set(testUser.id, testUser)
      mockDatabase.usage.set(testUser.id, {
        userId: testUser.id,
        dailyGenerations: 2,
        dailyReuses: 0,
        totalWorks: 5,
        lastResetDate: new Date().toISOString().split('T')[0],
      })

      // 模拟并发更新
      const promises = Array(5).fill(null).map(() =>
        updateUsage(testUser.id, 'generation', 1)
      )

      const results = await Promise.all(promises)

      // 应该有适当的并发控制
      const successCount = results.filter(r => r.success).length
      expect(successCount).toBeGreaterThan(0)
      expect(successCount).toBeLessThanOrEqual(5)
    })
  })
})