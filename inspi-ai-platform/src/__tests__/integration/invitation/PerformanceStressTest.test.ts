/**
 * 邀请系统性能和压力测试
 * 测试系统在高并发和大数据量下的性能表现
 */

import { InvitationService } from '@/lib/invitation/services/InvitationService'
import { RewardEngine } from '@/lib/invitation/services/RewardEngine'
import { InviteRegistrationHandler } from '@/lib/invitation/services/InviteRegistrationHandler'
import { FraudDetectionService } from '@/lib/invitation/services/FraudDetectionService'
import { AnalyticsService } from '@/lib/invitation/services/AnalyticsService'
import { DatabaseFactory } from '@/lib/invitation/database'
import { logger } from '@/lib/utils/logger'

describe('邀请系统性能和压力测试', () => {
  let invitationService: InvitationService
  let rewardEngine: RewardEngine
  let registrationHandler: InviteRegistrationHandler
  let fraudDetection: FraudDetectionService
  let analyticsService: AnalyticsService
  let db: any

  beforeAll(async () => {
    db = await DatabaseFactory.createPool({
      host: 'localhost',
      port: 3306,
      database: 'test_invitation_system',
      username: 'test',
      password: 'test',
      connectionLimit: 20 // 增加连接池大小用于压力测试
    })

    invitationService = new InvitationService(db)
    rewardEngine = new RewardEngine(db)
    registrationHandler = new InviteRegistrationHandler(db, rewardEngine)
    fraudDetection = new FraudDetectionService(db)
    analyticsService = new AnalyticsService(db)
  })

  afterAll(async () => {
    await DatabaseFactory.closePool()
  })

  beforeEach(async () => {
    // 清理测试数据
    await db.execute('DELETE FROM invite_registrations')
    await db.execute('DELETE FROM invite_codes')
    await db.execute('DELETE FROM reward_records')
    await db.execute('DELETE FROM fraud_detection_logs')
    await db.execute('DELETE FROM invite_stats')
  })

  describe('并发性能测试', () => {
    it('应该处理大量并发邀请码生成', async () => {
      const concurrency = 100
      const startTime = Date.now()

      // 创建大量并发邀请码生成请求
      const promises = Array.from({ length: concurrency }, (_, i) =>
        invitationService.generateInviteCode(`user-concurrent-${i}`, {
          maxUsage: 10,
          expiresInDays: 30
        })
      )

      const results = await Promise.all(promises)
      const endTime = Date.now()
      const duration = endTime - startTime

      // 验证所有请求都成功
      expect(results.length).toBe(concurrency)
      results.forEach(result => {
        expect(result).toBeDefined()
        expect(result.code).toBeDefined()
        expect(result.isActive).toBe(true)
      })

      // 性能指标
      const avgResponseTime = duration / concurrency
      expect(avgResponseTime).toBeLessThan(100) // 平均响应时间应小于100ms

      logger.info('并发邀请码生成性能测试', {
        concurrency,
        totalDuration: duration,
        avgResponseTime,
        successRate: results.length / concurrency
      })
    })

    it('应该处理大量并发邀请注册', async () => {
      const inviterId = 'user-stress-test'
      const inviteCode = await invitationService.generateInviteCode(inviterId, {
        maxUsage: 200
      })

      const concurrency = 50
      const startTime = Date.now()

      // 创建大量并发注册请求
      const promises = Array.from({ length: concurrency }, (_, i) =>
        registrationHandler.handleInviteRegistration({
          inviteCode: inviteCode.code,
          inviteeId: `user-stress-invitee-${i}`,
          inviteeEmail: `stress-invitee-${i}@example.com`,
          ipAddress: `192.168.${Math.floor(i / 10) + 1}.${(i % 10) + 1}`,
          userAgent: 'Mozilla/5.0 Stress Test Browser'
        })
      )

      const results = await Promise.all(promises)
      const endTime = Date.now()
      const duration = endTime - startTime

      // 验证结果
      const successfulResults = results.filter(r => r.success)
      expect(successfulResults.length).toBeGreaterThan(concurrency * 0.8) // 至少80%成功

      // 性能指标
      const avgResponseTime = duration / concurrency
      expect(avgResponseTime).toBeLessThan(200) // 平均响应时间应小于200ms

      // 验证数据一致性
      const updatedCode = await invitationService.getInviteCodeById(inviteCode.id)
      expect(updatedCode.usageCount).toBe(successfulResults.length)

      logger.info('并发邀请注册性能测试', {
        concurrency,
        successfulResults: successfulResults.length,
        totalDuration: duration,
        avgResponseTime,
        finalUsageCount: updatedCode.usageCount
      })
    })

    it('应该处理大量并发奖励发放', async () => {
      const concurrency = 100
      const startTime = Date.now()

      // 创建大量并发奖励发放请求
      const promises = Array.from({ length: concurrency }, (_, i) =>
        rewardEngine.grantRewards(`user-reward-stress-${i}`, [
          {
            type: 'ai_credits' as any,
            amount: 50,
            description: `压力测试奖励 ${i}`
          }
        ], {
          sourceType: 'stress_test',
          sourceId: `stress-test-${i}`
        })
      )

      const results = await Promise.all(promises)
      const endTime = Date.now()
      const duration = endTime - startTime

      // 验证结果
      const successfulResults = results.filter(r => r.success)
      expect(successfulResults.length).toBe(concurrency)

      // 性能指标
      const avgResponseTime = duration / concurrency
      expect(avgResponseTime).toBeLessThan(150) // 平均响应时间应小于150ms

      // 验证数据库记录
      const rewardRecords = await db.query(
        'SELECT COUNT(*) as count FROM reward_records WHERE source_type = ?',
        ['stress_test']
      )
      expect(rewardRecords[0].count).toBe(concurrency)

      logger.info('并发奖励发放性能测试', {
        concurrency,
        totalDuration: duration,
        avgResponseTime,
        rewardRecordsCount: rewardRecords[0].count
      })
    })

    it('应该处理大量并发防作弊检测', async () => {
      const inviterId = 'user-fraud-stress'
      const inviteCode = await invitationService.generateInviteCode(inviterId, {
        maxUsage: 300
      })

      const concurrency = 100
      const startTime = Date.now()

      // 创建大量并发防作弊检测请求
      const promises = Array.from({ length: concurrency }, (_, i) =>
        fraudDetection.checkInviteRegistration({
          inviteCodeId: inviteCode.id,
          inviterId,
          inviteeId: `user-fraud-stress-${i}`,
          ipAddress: `10.0.${Math.floor(i / 50)}.${i % 50 + 1}`,
          userAgent: i % 10 === 0 ? 'SuspiciousBot/1.0' : 'Mozilla/5.0 Test Browser',
          registrationTime: new Date()
        })
      )

      const results = await Promise.all(promises)
      const endTime = Date.now()
      const duration = endTime - startTime

      // 验证结果
      expect(results.length).toBe(concurrency)
      results.forEach(result => {
        expect(result).toBeDefined()
        expect(result.action).toBeDefined()
        expect(typeof result.isSuspicious).toBe('boolean')
      })

      // 性能指标
      const avgResponseTime = duration / concurrency
      expect(avgResponseTime).toBeLessThan(100) // 防作弊检测应该很快

      const suspiciousCount = results.filter(r => r.isSuspicious).length
      const blockedCount = results.filter(r => r.action === 'block').length

      logger.info('并发防作弊检测性能测试', {
        concurrency,
        totalDuration: duration,
        avgResponseTime,
        suspiciousCount,
        blockedCount
      })
    })
  })

  describe('大数据量性能测试', () => {
    it('应该处理大量邀请数据的统计查询', async () => {
      const inviterId = 'user-big-data'
      const dataSize = 1000

      // 创建大量测试数据
      const inviteCode = await invitationService.generateInviteCode(inviterId, {
        maxUsage: dataSize
      })

      // 批量插入邀请注册数据
      const batchSize = 100
      for (let i = 0; i < dataSize; i += batchSize) {
        const batch = Array.from({ length: Math.min(batchSize, dataSize - i) }, (_, j) => {
          const index = i + j
          return [
            `reg-${index}`,
            inviteCode.id,
            inviterId,
            `user-big-data-${index}`,
            new Date(),
            true,
            new Date(),
            false
          ]
        })

        const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(', ')
        const values = batch.flat()

        await db.execute(`
          INSERT INTO invite_registrations 
          (id, invite_code_id, inviter_id, invitee_id, registered_at, is_activated, activated_at, rewards_claimed)
          VALUES ${placeholders}
        `, values)
      }

      // 测试统计查询性能
      const startTime = Date.now()
      const stats = await invitationService.getUserInviteStats(inviterId)
      const endTime = Date.now()
      const queryDuration = endTime - startTime

      // 验证统计结果
      expect(stats.totalInvites).toBe(1)
      expect(stats.successfulRegistrations).toBe(dataSize)
      expect(stats.activeInvitees).toBe(dataSize)

      // 性能要求：大数据量查询应在合理时间内完成
      expect(queryDuration).toBeLessThan(1000) // 应小于1秒

      logger.info('大数据量统计查询性能测试', {
        dataSize,
        queryDuration,
        stats
      })
    })

    it('应该处理大量数据的分析计算', async () => {
      const userCount = 100
      const invitesPerUser = 50

      // 创建大量用户和邀请数据
      const users = Array.from({ length: userCount }, (_, i) => `user-analytics-${i}`)
      
      for (const userId of users) {
        const inviteCode = await invitationService.generateInviteCode(userId, {
          maxUsage: invitesPerUser
        })

        // 为每个用户创建多个邀请注册
        for (let j = 0; j < invitesPerUser; j++) {
          await db.execute(`
            INSERT INTO invite_registrations 
            (id, invite_code_id, inviter_id, invitee_id, registered_at, is_activated, activated_at, rewards_claimed)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            `reg-${userId}-${j}`,
            inviteCode.id,
            userId,
            `invitee-${userId}-${j}`,
            new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // 随机过去30天内
            Math.random() > 0.3, // 70%激活率
            new Date(),
            Math.random() > 0.5 // 50%奖励领取率
          ])
        }
      }

      // 测试分析计算性能
      const startTime = Date.now()
      const analytics = await analyticsService.generateInviteAnalytics({
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
        includeConversionAnalysis: true,
        includeUserSegmentation: true
      })
      const endTime = Date.now()
      const analyticsDuration = endTime - startTime

      // 验证分析结果
      expect(analytics.totalInvites).toBe(userCount)
      expect(analytics.totalRegistrations).toBe(userCount * invitesPerUser)
      expect(analytics.conversionRate).toBeGreaterThan(0)

      // 性能要求：复杂分析应在合理时间内完成
      expect(analyticsDuration).toBeLessThan(5000) // 应小于5秒

      logger.info('大数据量分析计算性能测试', {
        userCount,
        invitesPerUser,
        totalDataPoints: userCount * invitesPerUser,
        analyticsDuration,
        conversionRate: analytics.conversionRate
      })
    })
  })

  describe('内存和资源使用测试', () => {
    it('应该在大量操作后正确释放内存', async () => {
      const initialMemory = process.memoryUsage()

      // 执行大量操作
      const operations = 500
      for (let i = 0; i < operations; i++) {
        const userId = `user-memory-${i}`
        const inviteCode = await invitationService.generateInviteCode(userId)
        
        await registrationHandler.handleInviteRegistration({
          inviteCode: inviteCode.code,
          inviteeId: `invitee-memory-${i}`,
          inviteeEmail: `memory-${i}@example.com`,
          ipAddress: `172.16.${Math.floor(i / 255)}.${i % 255 + 1}`,
          userAgent: 'Mozilla/5.0 Memory Test'
        })

        // 每100次操作检查一次内存
        if (i % 100 === 0) {
          const currentMemory = process.memoryUsage()
          const heapUsed = currentMemory.heapUsed / 1024 / 1024 // MB
          
          // 内存使用不应该无限增长
          expect(heapUsed).toBeLessThan(500) // 应小于500MB
          
          if (i > 0) {
            logger.info('内存使用检查', {
              operation: i,
              heapUsedMB: Math.round(heapUsed),
              heapTotalMB: Math.round(currentMemory.heapTotal / 1024 / 1024)
            })
          }
        }
      }

      // 强制垃圾回收（如果可用）
      if (global.gc) {
        global.gc()
      }

      const finalMemory = process.memoryUsage()
      const memoryIncrease = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024

      logger.info('内存使用测试完成', {
        operations,
        initialHeapMB: Math.round(initialMemory.heapUsed / 1024 / 1024),
        finalHeapMB: Math.round(finalMemory.heapUsed / 1024 / 1024),
        memoryIncreaseMB: Math.round(memoryIncrease)
      })

      // 内存增长应该在合理范围内
      expect(memoryIncrease).toBeLessThan(200) // 应小于200MB增长
    })

    it('应该正确处理数据库连接池', async () => {
      const concurrentConnections = 50
      const operationsPerConnection = 10

      // 创建大量并发数据库操作
      const promises = Array.from({ length: concurrentConnections }, async (_, i) => {
        const operations = []
        
        for (let j = 0; j < operationsPerConnection; j++) {
          operations.push(
            invitationService.generateInviteCode(`user-pool-${i}-${j}`)
          )
        }
        
        return Promise.all(operations)
      })

      const startTime = Date.now()
      const results = await Promise.all(promises)
      const endTime = Date.now()
      const duration = endTime - startTime

      // 验证所有操作都成功
      const totalOperations = concurrentConnections * operationsPerConnection
      const successfulOperations = results.flat().length
      expect(successfulOperations).toBe(totalOperations)

      // 性能应该在合理范围内
      const avgResponseTime = duration / totalOperations
      expect(avgResponseTime).toBeLessThan(50) // 平均响应时间应小于50ms

      logger.info('数据库连接池测试', {
        concurrentConnections,
        operationsPerConnection,
        totalOperations,
        duration,
        avgResponseTime
      })
    })
  })

  describe('极限压力测试', () => {
    it('应该在极高并发下保持稳定', async () => {
      const extremeConcurrency = 200
      const inviterId = 'user-extreme-stress'
      const inviteCode = await invitationService.generateInviteCode(inviterId, {
        maxUsage: extremeConcurrency
      })

      const startTime = Date.now()
      
      // 创建极高并发请求
      const promises = Array.from({ length: extremeConcurrency }, (_, i) =>
        Promise.race([
          registrationHandler.handleInviteRegistration({
            inviteCode: inviteCode.code,
            inviteeId: `user-extreme-${i}`,
            inviteeEmail: `extreme-${i}@example.com`,
            ipAddress: `203.0.${Math.floor(i / 255)}.${i % 255 + 1}`,
            userAgent: 'Mozilla/5.0 Extreme Test'
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 10000) // 10秒超时
          )
        ])
      )

      const results = await Promise.allSettled(promises)
      const endTime = Date.now()
      const duration = endTime - startTime

      // 分析结果
      const successful = results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length
      const failed = results.filter(r => r.status === 'rejected' || !(r.value as any).success).length
      const successRate = successful / extremeConcurrency

      // 在极限压力下，成功率应该至少达到70%
      expect(successRate).toBeGreaterThan(0.7)

      // 系统应该在合理时间内响应
      expect(duration).toBeLessThan(30000) // 应小于30秒

      logger.info('极限压力测试', {
        extremeConcurrency,
        successful,
        failed,
        successRate,
        duration
      })
    })
  })
})