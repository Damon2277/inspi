/**
 * 贡献度系统API测试
 */

import { GET, POST } from '@/app/api/contribution/route'
import { GET as GetHistory } from '@/app/api/contribution/history/route'
import { POST as RecordContribution } from '@/app/api/contribution/record/route'
import { 
  ApiTestHelper, 
  setupApiTestEnvironment, 
  mockDatabase, 
  mockServices,
  jwtUtils,
  responseValidators
} from '../setup/api-test-setup'
import { createUserFixture, createWorkFixture, createContributionLogFixture } from '@/fixtures'

// Mock外部依赖
jest.mock('@/lib/auth/middleware', () => ({
  authenticateUser: jest.fn().mockImplementation((request) => {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Unauthorized')
    }
    
    const token = authHeader.replace('Bearer ', '')
    try {
      const payload = jwtUtils.verifyTestToken(token)
      return Promise.resolve({ userId: payload.userId })
    } catch {
      throw new Error('Invalid token')
    }
  }),
}))

jest.mock('@/lib/db/mongodb', () => ({
  connectDB: jest.fn().mockResolvedValue(true),
  getUserContribution: jest.fn().mockImplementation((userId) => {
    const contributions = Array.from(mockDatabase.contributions?.values() || [])
    const userContributions = contributions.filter(c => c.userId === userId)
    
    const totalScore = userContributions.reduce((sum, c) => sum + c.points, 0)
    const creationScore = userContributions
      .filter(c => c.type === 'creation')
      .reduce((sum, c) => sum + c.points, 0)
    const reuseScore = userContributions
      .filter(c => c.type === 'reuse_made' || c.type === 'reuse_received')
      .reduce((sum, c) => sum + c.points, 0)
    
    return Promise.resolve({
      userId,
      totalScore,
      creationScore,
      reuseScore,
      level: Math.floor(totalScore / 100) + 1,
      rank: 1, // 简化处理
      achievements: [],
    })
  }),
  getContributionHistory: jest.fn().mockImplementation((userId, options = {}) => {
    const contributions = Array.from(mockDatabase.contributions?.values() || [])
    let filtered = contributions.filter(c => c.userId === userId)
    
    if (options.type) {
      filtered = filtered.filter(c => c.type === options.type)
    }
    if (options.startDate) {
      filtered = filtered.filter(c => new Date(c.createdAt) >= new Date(options.startDate))
    }
    if (options.endDate) {
      filtered = filtered.filter(c => new Date(c.createdAt) <= new Date(options.endDate))
    }
    
    // 排序和分页
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    const page = options.page || 1
    const limit = options.limit || 20
    const start = (page - 1) * limit
    const items = filtered.slice(start, start + limit)
    
    return Promise.resolve({
      items,
      total: filtered.length,
      page,
      limit,
      totalPages: Math.ceil(filtered.length / limit),
    })
  }),
  recordContribution: jest.fn().mockImplementation((contributionData) => {
    const contribution = {
      ...contributionData,
      id: `contrib-${Date.now()}`,
      createdAt: new Date().toISOString(),
    }
    
    if (!mockDatabase.contributions) {
      mockDatabase.contributions = new Map()
    }
    mockDatabase.contributions.set(contribution.id, contribution)
    
    return Promise.resolve(contribution)
  }),
  getContributionLeaderboard: jest.fn().mockImplementation((type, timeRange, limit = 10) => {
    const contributions = Array.from(mockDatabase.contributions?.values() || [])
    const userScores = new Map()
    
    // 计算用户总分
    contributions.forEach(contrib => {
      if (type && contrib.type !== type) return
      
      const current = userScores.get(contrib.userId) || 0
      userScores.set(contrib.userId, current + contrib.points)
    })
    
    // 转换为排行榜格式
    const leaderboard = Array.from(userScores.entries())
      .map(([userId, score]) => ({
        userId,
        score,
        rank: 1, // 简化处理
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item, index) => ({ ...item, rank: index + 1 }))
    
    return Promise.resolve(leaderboard)
  }),
  getTrendingContributions: jest.fn().mockImplementation((timeRange = '7d') => {
    const contributions = Array.from(mockDatabase.contributions?.values() || [])
    const now = new Date()
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 1
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    
    const recent = contributions.filter(c => new Date(c.createdAt) >= cutoff)
    
    return Promise.resolve({
      totalContributions: recent.length,
      totalPoints: recent.reduce((sum, c) => sum + c.points, 0),
      topContributors: recent.slice(0, 5),
      trendingWorks: [], // 简化处理
    })
  }),
  updateUserLevel: jest.fn().mockImplementation((userId, newLevel) => {
    // 模拟等级更新
    return Promise.resolve({ userId, level: newLevel, updatedAt: new Date().toISOString() })
  }),
}))

// Mock贡献度服务
jest.mock('@/lib/services/contributionService', () => ({
  calculateContributionPoints: jest.fn().mockImplementation((type, metadata = {}) => {
    const pointsMap = {
      creation: 10,
      reuse_made: 5,
      reuse_received: 3,
      like_received: 1,
      comment_received: 2,
    }
    
    let basePoints = pointsMap[type] || 0
    
    // 根据元数据调整分数
    if (metadata.difficulty === 'hard') basePoints *= 1.5
    if (metadata.isFirstWork) basePoints += 5
    if (metadata.popularityBonus) basePoints += metadata.popularityBonus
    
    return Math.floor(basePoints)
  }),
  checkLevelUp: jest.fn().mockImplementation((userId, currentScore) => {
    const currentLevel = Math.floor(currentScore / 100) + 1
    const newLevel = Math.floor((currentScore + 10) / 100) + 1 // 假设新增10分
    
    return {
      levelUp: newLevel > currentLevel,
      oldLevel: currentLevel,
      newLevel,
      nextLevelThreshold: newLevel * 100,
    }
  }),
  getAchievements: jest.fn().mockImplementation((userId) => {
    return Promise.resolve([
      { id: 'first-work', name: '首次创作', description: '发布第一个作品', unlockedAt: new Date().toISOString() },
    ])
  }),
}))

describe('/api/contribution API测试', () => {
  setupApiTestEnvironment()
  
  const testUser = createUserFixture({ id: 'user-1' })
  const authToken = jwtUtils.createTestToken({ userId: testUser.id })
  const authHeaders = ApiTestHelper.createAuthHeaders(authToken)

  beforeEach(() => {
    mockDatabase.users.set(testUser.id, testUser)
    
    // 初始化贡献度数据
    if (!mockDatabase.contributions) {
      mockDatabase.contributions = new Map()
    }
    
    // 添加测试贡献记录
    const testContributions = [
      createContributionLogFixture({
        id: 'contrib-1',
        userId: testUser.id,
        type: 'creation',
        points: 10,
        metadata: { workId: 'work-1', title: '测试作品' },
      }),
      createContributionLogFixture({
        id: 'contrib-2',
        userId: testUser.id,
        type: 'reuse_received',
        points: 3,
        metadata: { workId: 'work-1', reuseId: 'reuse-1' },
      }),
    ]
    
    testContributions.forEach(contrib => {
      mockDatabase.contributions.set(contrib.id, contrib)
    })
  })

  describe('GET /api/contribution/user/[id] - 获取用户贡献度', () => {
    test('应该返回用户的完整贡献度信息', async () => {
      const result = await ApiTestHelper.callApi(
        GET,
        `/api/contribution/user/${testUser.id}`,
        {
          headers: authHeaders,
        }
      )

      expect(result.status).toBe(200)
      const response = await result.json()
      
      responseValidators.validateApiResponse(response)
      expect(response.success).toBe(true)
      expect(response.data.userId).toBe(testUser.id)
      expect(response.data.totalScore).toBe(13) // 10 + 3
      expect(response.data.creationScore).toBe(10)
      expect(response.data.reuseScore).toBe(3)
      expect(response.data.level).toBe(1) // 13分对应1级
      expect(response.data.rank).toBeDefined()
    })

    test('应该处理不存在的用户', async () => {
      const result = await ApiTestHelper.callApi(
        GET,
        '/api/contribution/user/nonexistent',
        {
          headers: authHeaders,
        }
      )

      expect(result.status).toBe(200)
      const response = await result.json()
      
      // 不存在的用户应该返回默认值
      expect(response.data.totalScore).toBe(0)
      expect(response.data.level).toBe(1)
    })

    test('应该支持获取其他用户的公开贡献度', async () => {
      const otherUser = createUserFixture({ id: 'other-user' })
      mockDatabase.users.set(otherUser.id, otherUser)

      const result = await ApiTestHelper.callApi(
        GET,
        `/api/contribution/user/${otherUser.id}`,
        {
          headers: authHeaders,
        }
      )

      expect(result.status).toBe(200)
      const response = await result.json()
      expect(response.data.userId).toBe(otherUser.id)
    })
  })

  describe('GET /api/contribution/history - 获取贡献历史', () => {
    test('应该返回用户的贡献历史', async () => {
      const result = await ApiTestHelper.callApi(
        GetHistory,
        '/api/contribution/history',
        {
          headers: authHeaders,
        }
      )

      expect(result.status).toBe(200)
      const response = await result.json()
      
      responseValidators.validatePaginatedResponse(response)
      expect(response.success).toBe(true)
      expect(response.data.items).toHaveLength(2)
      expect(response.data.items[0].userId).toBe(testUser.id)
      
      // 应该按时间倒序排列
      expect(new Date(response.data.items[0].createdAt).getTime())
        .toBeGreaterThanOrEqual(new Date(response.data.items[1].createdAt).getTime())
    })

    test('应该支持按类型筛选', async () => {
      const result = await ApiTestHelper.callApi(
        GetHistory,
        '/api/contribution/history',
        {
          searchParams: { type: 'creation' },
          headers: authHeaders,
        }
      )

      expect(result.status).toBe(200)
      const response = await result.json()
      
      expect(response.data.items).toHaveLength(1)
      expect(response.data.items[0].type).toBe('creation')
    })

    test('应该支持时间范围筛选', async () => {
      const today = new Date().toISOString().split('T')[0]
      
      const result = await ApiTestHelper.callApi(
        GetHistory,
        '/api/contribution/history',
        {
          searchParams: { 
            startDate: today,
            endDate: today,
          },
          headers: authHeaders,
        }
      )

      expect(result.status).toBe(200)
      const response = await result.json()
      
      // 应该只返回今天的记录
      response.data.items.forEach((item: any) => {
        expect(item.createdAt.startsWith(today)).toBe(true)
      })
    })

    test('应该支持分页', async () => {
      const result = await ApiTestHelper.callApi(
        GetHistory,
        '/api/contribution/history',
        {
          searchParams: { 
            page: '1',
            limit: '1',
          },
          headers: authHeaders,
        }
      )

      expect(result.status).toBe(200)
      const response = await result.json()
      
      expect(response.data.items).toHaveLength(1)
      expect(response.data.pagination.page).toBe(1)
      expect(response.data.pagination.limit).toBe(1)
      expect(response.data.pagination.total).toBe(2)
    })
  })

  describe('POST /api/contribution/record - 记录贡献', () => {
    test('应该成功记录创作贡献', async () => {
      const contributionData = {
        type: 'creation',
        metadata: {
          workId: 'new-work-1',
          title: '新作品',
          subject: 'Mathematics',
          difficulty: 'medium',
          isFirstWork: false,
        },
      }

      const result = await ApiTestHelper.callApi(
        RecordContribution,
        '/api/contribution/record',
        {
          body: contributionData,
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        }
      )

      expect(result.status).toBe(201)
      const response = await result.json()
      
      responseValidators.validateApiResponse(response)
      expect(response.success).toBe(true)
      expect(response.data.type).toBe('creation')
      expect(response.data.userId).toBe(testUser.id)
      expect(response.data.points).toBe(10) // 基础创作分
      
      // 验证贡献度计算
      const { calculateContributionPoints } = require('@/lib/services/contributionService')
      expect(calculateContributionPoints).toHaveBeenCalledWith('creation', contributionData.metadata)
    })

    test('应该成功记录复用贡献', async () => {
      const contributionData = {
        type: 'reuse_made',
        metadata: {
          originalWorkId: 'work-1',
          reuseWorkId: 'reuse-work-1',
          originalAuthorId: 'author-1',
        },
      }

      const result = await ApiTestHelper.callApi(
        RecordContribution,
        '/api/contribution/record',
        {
          body: contributionData,
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        }
      )

      expect(result.status).toBe(201)
      const response = await result.json()
      
      expect(response.data.type).toBe('reuse_made')
      expect(response.data.points).toBe(5) // 复用分
    })

    test('应该验证必需字段', async () => {
      const invalidData = {
        metadata: { workId: 'work-1' },
        // 缺少 type
      }

      const result = await ApiTestHelper.callApi(
        RecordContribution,
        '/api/contribution/record',
        {
          body: invalidData,
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        }
      )

      ApiTestHelper.expectValidationError(result, ['type'])
    })

    test('应该验证贡献类型', async () => {
      const invalidData = {
        type: 'invalid-type',
        metadata: { workId: 'work-1' },
      }

      const result = await ApiTestHelper.callApi(
        RecordContribution,
        '/api/contribution/record',
        {
          body: invalidData,
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        }
      )

      ApiTestHelper.expectValidationError(result, ['type'])
    })

    test('应该检查等级提升', async () => {
      const contributionData = {
        type: 'creation',
        metadata: {
          workId: 'level-up-work',
          title: '等级提升作品',
          popularityBonus: 90, // 大量奖励分，触发等级提升
        },
      }

      const result = await ApiTestHelper.callApi(
        RecordContribution,
        '/api/contribution/record',
        {
          body: contributionData,
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        }
      )

      expect(result.status).toBe(201)
      const response = await result.json()
      
      expect(response.data.levelUp).toBeDefined()
      if (response.data.levelUp) {
        expect(response.data.newLevel).toBeGreaterThan(response.data.oldLevel)
      }
      
      // 验证等级检查
      const { checkLevelUp } = require('@/lib/services/contributionService')
      expect(checkLevelUp).toHaveBeenCalled()
    })

    test('应该防止重复记录', async () => {
      const contributionData = {
        type: 'creation',
        metadata: {
          workId: 'work-1', // 已存在的作品
          title: '重复作品',
        },
        idempotencyKey: 'unique-key-123',
      }

      // 第一次记录
      const result1 = await ApiTestHelper.callApi(
        RecordContribution,
        '/api/contribution/record',
        {
          body: contributionData,
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        }
      )

      expect(result1.status).toBe(201)

      // 第二次记录（相同的幂等键）
      const result2 = await ApiTestHelper.callApi(
        RecordContribution,
        '/api/contribution/record',
        {
          body: contributionData,
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        }
      )

      // 应该返回已存在的记录，而不是创建新的
      expect(result2.status).toBe(200)
      const response2 = await result2.json()
      expect(response2.data.id).toBe((await result1.json()).data.id)
    })
  })

  describe('GET /api/contribution/leaderboard - 获取贡献度排行榜', () => {
    test('应该返回总贡献度排行榜', async () => {
      const result = await ApiTestHelper.callApi(
        GET,
        '/api/contribution/leaderboard',
        {
          searchParams: { type: 'total', limit: '10' },
        }
      )

      expect(result.status).toBe(200)
      const response = await result.json()
      
      responseValidators.validateApiResponse(response)
      expect(response.success).toBe(true)
      expect(response.data.leaderboard).toBeDefined()
      expect(Array.isArray(response.data.leaderboard)).toBe(true)
      
      // 验证排行榜格式
      if (response.data.leaderboard.length > 0) {
        expect(response.data.leaderboard[0]).toHaveProperty('userId')
        expect(response.data.leaderboard[0]).toHaveProperty('score')
        expect(response.data.leaderboard[0]).toHaveProperty('rank')
      }
    })

    test('应该支持按类型筛选排行榜', async () => {
      const result = await ApiTestHelper.callApi(
        GET,
        '/api/contribution/leaderboard',
        {
          searchParams: { type: 'creation', limit: '5' },
        }
      )

      expect(result.status).toBe(200)
      const response = await result.json()
      
      expect(response.data.type).toBe('creation')
      expect(response.data.leaderboard.length).toBeLessThanOrEqual(5)
    })

    test('应该支持时间范围筛选', async () => {
      const result = await ApiTestHelper.callApi(
        GET,
        '/api/contribution/leaderboard',
        {
          searchParams: { 
            type: 'total',
            timeRange: '7d',
            limit: '10',
          },
        }
      )

      expect(result.status).toBe(200)
      const response = await result.json()
      
      expect(response.data.timeRange).toBe('7d')
    })
  })

  describe('GET /api/contribution/trending - 获取趋势数据', () => {
    test('应该返回贡献趋势数据', async () => {
      const result = await ApiTestHelper.callApi(
        GET,
        '/api/contribution/trending',
        {
          searchParams: { timeRange: '7d' },
        }
      )

      expect(result.status).toBe(200)
      const response = await result.json()
      
      responseValidators.validateApiResponse(response)
      expect(response.success).toBe(true)
      expect(response.data.totalContributions).toBeDefined()
      expect(response.data.totalPoints).toBeDefined()
      expect(response.data.topContributors).toBeDefined()
      expect(Array.isArray(response.data.topContributors)).toBe(true)
    })

    test('应该支持不同时间范围', async () => {
      const timeRanges = ['1d', '7d', '30d']

      for (const timeRange of timeRanges) {
        const result = await ApiTestHelper.callApi(
          GET,
          '/api/contribution/trending',
          {
            searchParams: { timeRange },
          }
        )

        expect(result.status).toBe(200)
        const response = await result.json()
        expect(response.data.timeRange).toBe(timeRange)
      }
    })
  })

  describe('错误处理和边界情况', () => {
    test('应该处理数据库错误', async () => {
      const { getUserContribution } = require('@/lib/db/mongodb')
      getUserContribution.mockRejectedValueOnce(new Error('Database error'))

      const result = await ApiTestHelper.callApi(
        GET,
        `/api/contribution/user/${testUser.id}`,
        {
          headers: authHeaders,
        }
      )

      expect(result.status).toBe(500)
      const response = await result.json()
      expect(response.success).toBe(false)
    })

    test('应该处理大量贡献记录', async () => {
      // 添加大量贡献记录
      for (let i = 0; i < 1000; i++) {
        const contrib = createContributionLogFixture({
          id: `contrib-bulk-${i}`,
          userId: testUser.id,
          type: 'creation',
          points: 1,
        })
        mockDatabase.contributions.set(contrib.id, contrib)
      }

      const result = await ApiTestHelper.callApi(
        GetHistory,
        '/api/contribution/history',
        {
          searchParams: { limit: '100' },
          headers: authHeaders,
        }
      )

      expect(result.status).toBe(200)
      const response = await result.json()
      
      // 应该正确处理大量数据
      expect(response.data.items.length).toBeLessThanOrEqual(100)
      expect(response.data.pagination.total).toBe(1002) // 原有2个 + 新增1000个
    })

    test('应该处理并发贡献记录', async () => {
      const contributionData = {
        type: 'creation',
        metadata: { workId: 'concurrent-work' },
      }

      const concurrentRequests = Array(5).fill(null).map(() =>
        ApiTestHelper.callApi(
          RecordContribution,
          '/api/contribution/record',
          {
            body: contributionData,
            headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
          }
        )
      )

      const results = await Promise.all(concurrentRequests)
      
      // 至少有一个请求成功
      const successfulRequests = results.filter(r => r.status === 201)
      expect(successfulRequests.length).toBeGreaterThan(0)
    })
  })

  describe('性能测试', () => {
    test('应该在合理时间内响应', async () => {
      const startTime = Date.now()
      
      const result = await ApiTestHelper.callApi(
        GET,
        `/api/contribution/user/${testUser.id}`,
        {
          headers: authHeaders,
        }
      )
      
      const responseTime = Date.now() - startTime
      expect(responseTime).toBeLessThanOrEqual(1000) // 1秒内响应
      expect(result.status).toBe(200)
    })

    test('应该高效处理排行榜查询', async () => {
      const startTime = Date.now()
      
      const result = await ApiTestHelper.callApi(
        GET,
        '/api/contribution/leaderboard',
        {
          searchParams: { type: 'total', limit: '50' },
        }
      )
      
      const responseTime = Date.now() - startTime
      expect(responseTime).toBeLessThanOrEqual(2000) // 2秒内响应
      expect(result.status).toBe(200)
    })
  })
})