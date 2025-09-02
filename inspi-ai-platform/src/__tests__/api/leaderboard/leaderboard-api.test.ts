/**
 * 排行榜API测试
 */

import { GET } from '@/app/api/leaderboard/route'
import { 
  ApiTestHelper, 
  setupApiTestEnvironment, 
  mockDatabase, 
  mockServices,
  responseValidators
} from '../setup/api-test-setup'
import { createUserFixture, createWorkFixture, createContributionLogFixture } from '@/fixtures'

// Mock外部依赖
jest.mock('@/lib/db/mongodb', () => ({
  connectDB: jest.fn().mockResolvedValue(true),
  getLeaderboard: jest.fn().mockImplementation((type, timeRange, limit) => {
    const users = Array.from(mockDatabase.users.values())
    const contributions = Array.from(mockDatabase.contributions?.values() || [])
    
    // 模拟排行榜数据
    const leaderboardData = users.slice(0, limit || 10).map((user, index) => ({
      userId: user.id,
      name: user.name,
      avatar: user.avatar,
      score: 100 - index * 10,
      rank: index + 1,
      totalWorks: 5 + index,
      totalReuses: 10 + index * 2,
      contributionScore: 100 - index * 10,
    }))
    
    return Promise.resolve(leaderboardData)
  }),
  getTopWorks: jest.fn().mockImplementation((timeRange, limit) => {
    const works = Array.from(mockDatabase.works.values())
    
    return Promise.resolve(works.slice(0, limit || 10).map((work, index) => ({
      ...work,
      reuseCount: 50 - index * 5,
      viewCount: 1000 - index * 100,
      likeCount: 100 - index * 10,
      rank: index + 1,
    })))
  }),
  getUserRank: jest.fn().mockImplementation((userId, type) => {
    return Promise.resolve({
      rank: 5,
      score: 85,
      totalUsers: 100,
      percentile: 95,
    })
  }),
  getContributionStats: jest.fn().mockImplementation(() => {
    return Promise.resolve({
      totalUsers: 1000,
      totalWorks: 5000,
      totalReuses: 15000,
      totalContributions: 20000,
    })
  }),
}))

// Mock缓存服务
jest.mock('@/lib/services/cacheService', () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(true),
  del: jest.fn().mockResolvedValue(true),
}))

describe('/api/leaderboard API测试', () => {
  setupApiTestEnvironment()

  beforeEach(() => {
    // 添加测试用户
    for (let i = 1; i <= 10; i++) {
      const user = createUserFixture({
        id: `user-${i}`,
        name: `User ${i}`,
        email: `user${i}@example.com`,
      })
      mockDatabase.users.set(user.id, user)
    }

    // 添加测试作品
    for (let i = 1; i <= 20; i++) {
      const work = createWorkFixture({
        id: `work-${i}`,
        title: `Work ${i}`,
        authorId: `user-${Math.ceil(i / 2)}`,
        isPublished: true,
      })
      mockDatabase.works.set(work.id, work)
    }

    // 初始化贡献记录
    if (!mockDatabase.contributions) {
      mockDatabase.contributions = new Map()
    }
  })

  describe('GET /api/leaderboard - 获取排行榜', () => {
    test('应该返回总贡献度排行榜', async () => {
      const result = await ApiTestHelper.callApi(
        GET,
        '/api/leaderboard',
        {
          searchParams: { 
            type: 'contribution',
            timeRange: 'all',
            limit: '10'
          },
        }
      )

      expect(result.status).toBe(200)
      const response = await result.json()
      
      responseValidators.validateApiResponse(response)
      expect(response.success).toBe(true)
      expect(response.data.leaderboard).toHaveLength(10)
      expect(response.data.leaderboard[0]).toHaveProperty('rank', 1)
      expect(response.data.leaderboard[0]).toHaveProperty('userId')
      expect(response.data.leaderboard[0]).toHaveProperty('name')
      expect(response.data.leaderboard[0]).toHaveProperty('score')
    })

    test('应该返回作品复用排行榜', async () => {
      const result = await ApiTestHelper.callApi(
        GET,
        '/api/leaderboard',
        {
          searchParams: { 
            type: 'reuse',
            timeRange: 'month',
            limit: '5'
          },
        }
      )

      expect(result.status).toBe(200)
      const response = await result.json()
      
      expect(response.data.leaderboard).toHaveLength(5)
      expect(response.data.leaderboard[0]).toHaveProperty('totalReuses')
    })

    test('应该返回创作数量排行榜', async () => {
      const result = await ApiTestHelper.callApi(
        GET,
        '/api/leaderboard',
        {
          searchParams: { 
            type: 'creation',
            timeRange: 'week'
          },
        }
      )

      expect(result.status).toBe(200)
      const response = await result.json()
      
      expect(response.data.leaderboard[0]).toHaveProperty('totalWorks')
    })

    test('应该支持不同时间范围', async () => {
      const timeRanges = ['day', 'week', 'month', 'year', 'all']

      for (const timeRange of timeRanges) {
        const result = await ApiTestHelper.callApi(
          GET,
          '/api/leaderboard',
          {
            searchParams: { 
              type: 'contribution',
              timeRange,
              limit: '5'
            },
          }
        )

        expect(result.status).toBe(200)
        const response = await result.json()
        expect(response.success).toBe(true)
        expect(response.data.timeRange).toBe(timeRange)
      }
    })

    test('应该返回热门作品排行榜', async () => {
      const result = await ApiTestHelper.callApi(
        GET,
        '/api/leaderboard',
        {
          searchParams: { 
            type: 'popular-works',
            timeRange: 'month',
            limit: '10'
          },
        }
      )

      expect(result.status).toBe(200)
      const response = await result.json()
      
      expect(response.data.works).toBeDefined()
      expect(response.data.works).toHaveLength(10)
      expect(response.data.works[0]).toHaveProperty('rank', 1)
      expect(response.data.works[0]).toHaveProperty('reuseCount')
      expect(response.data.works[0]).toHaveProperty('viewCount')
    })

    test('应该支持分页', async () => {
      const result = await ApiTestHelper.callApi(
        GET,
        '/api/leaderboard',
        {
          searchParams: { 
            type: 'contribution',
            page: '2',
            limit: '5'
          },
        }
      )

      expect(result.status).toBe(200)
      const response = await result.json()
      
      expect(response.data.pagination).toBeDefined()
      expect(response.data.pagination.page).toBe(2)
      expect(response.data.pagination.limit).toBe(5)
      expect(response.data.leaderboard[0].rank).toBeGreaterThan(5)
    })

    test('应该验证参数', async () => {
      const result = await ApiTestHelper.callApi(
        GET,
        '/api/leaderboard',
        {
          searchParams: { 
            type: 'invalid-type',
            timeRange: 'invalid-range',
            limit: '1000'
          },
        }
      )

      expect(result.status).toBe(400)
      const response = await result.json()
      expect(response.success).toBe(false)
      expect(response.error).toContain('Invalid')
    })

    test('应该使用默认参数', async () => {
      const result = await ApiTestHelper.callApi(
        GET,
        '/api/leaderboard'
      )

      expect(result.status).toBe(200)
      const response = await result.json()
      
      expect(response.data.type).toBe('contribution') // 默认类型
      expect(response.data.timeRange).toBe('all') // 默认时间范围
      expect(response.data.leaderboard.length).toBeLessThanOrEqual(20) // 默认限制
    })

    test('应该返回统计信息', async () => {
      const result = await ApiTestHelper.callApi(
        GET,
        '/api/leaderboard',
        {
          searchParams: { 
            type: 'contribution',
            includeStats: 'true'
          },
        }
      )

      expect(result.status).toBe(200)
      const response = await result.json()
      
      expect(response.data.stats).toBeDefined()
      expect(response.data.stats.totalUsers).toBeDefined()
      expect(response.data.stats.totalWorks).toBeDefined()
      expect(response.data.stats.totalReuses).toBeDefined()
    })

    test('应该支持按学科筛选', async () => {
      const result = await ApiTestHelper.callApi(
        GET,
        '/api/leaderboard',
        {
          searchParams: { 
            type: 'contribution',
            subject: 'Mathematics',
            timeRange: 'month'
          },
        }
      )

      expect(result.status).toBe(200)
      const response = await result.json()
      
      expect(response.data.subject).toBe('Mathematics')
      expect(response.success).toBe(true)
    })

    test('应该支持按学段筛选', async () => {
      const result = await ApiTestHelper.callApi(
        GET,
        '/api/leaderboard',
        {
          searchParams: { 
            type: 'contribution',
            grade: 'Grade 5',
            timeRange: 'week'
          },
        }
      )

      expect(result.status).toBe(200)
      const response = await result.json()
      
      expect(response.data.grade).toBe('Grade 5')
    })
  })

  describe('GET /api/leaderboard/user/:userId - 获取用户排名', () => {
    test('应该返回用户在各排行榜中的排名', async () => {
      const result = await ApiTestHelper.callApi(
        GET,
        '/api/leaderboard/user/user-1',
        {
          searchParams: { 
            type: 'contribution',
            timeRange: 'all'
          },
        }
      )

      expect(result.status).toBe(200)
      const response = await result.json()
      
      expect(response.success).toBe(true)
      expect(response.data.rank).toBeDefined()
      expect(response.data.score).toBeDefined()
      expect(response.data.totalUsers).toBeDefined()
      expect(response.data.percentile).toBeDefined()
    })

    test('应该处理不存在的用户', async () => {
      const { getUserRank } = require('@/lib/db/mongodb')
      getUserRank.mockResolvedValueOnce(null)

      const result = await ApiTestHelper.callApi(
        GET,
        '/api/leaderboard/user/nonexistent-user'
      )

      ApiTestHelper.expectNotFoundError(result)
    })

    test('应该返回用户在不同时间范围的排名', async () => {
      const timeRanges = ['day', 'week', 'month', 'all']

      for (const timeRange of timeRanges) {
        const result = await ApiTestHelper.callApi(
          GET,
          '/api/leaderboard/user/user-1',
          {
            searchParams: { 
              type: 'contribution',
              timeRange
            },
          }
        )

        expect(result.status).toBe(200)
        const response = await result.json()
        expect(response.data.timeRange).toBe(timeRange)
      }
    })
  })

  describe('缓存机制测试', () => {
    test('应该使用缓存数据', async () => {
      const { get: cacheGet, set: cacheSet } = require('@/lib/services/cacheService')
      
      // 第一次请求
      const result1 = await ApiTestHelper.callApi(
        GET,
        '/api/leaderboard',
        {
          searchParams: { type: 'contribution' },
        }
      )

      expect(result1.status).toBe(200)
      expect(cacheGet).toHaveBeenCalled()
      expect(cacheSet).toHaveBeenCalled()

      // 模拟缓存命中
      const cachedData = {
        leaderboard: [{ userId: 'user-1', rank: 1, score: 100 }],
        type: 'contribution',
        timeRange: 'all',
      }
      cacheGet.mockResolvedValueOnce(cachedData)

      const result2 = await ApiTestHelper.callApi(
        GET,
        '/api/leaderboard',
        {
          searchParams: { type: 'contribution' },
        }
      )

      expect(result2.status).toBe(200)
      const response = await result2.json()
      expect(response.data.leaderboard[0].userId).toBe('user-1')
    })

    test('应该在数据更新时清除缓存', async () => {
      const { del: cacheDel } = require('@/lib/services/cacheService')

      // 模拟数据更新触发缓存清除
      const result = await ApiTestHelper.callApi(
        GET,
        '/api/leaderboard',
        {
          searchParams: { 
            type: 'contribution',
            refresh: 'true' // 强制刷新
          },
        }
      )

      expect(result.status).toBe(200)
      expect(cacheDel).toHaveBeenCalled()
    })
  })

  describe('性能测试', () => {
    test('应该在合理时间内响应', async () => {
      const startTime = Date.now()
      
      const result = await ApiTestHelper.callApi(
        GET,
        '/api/leaderboard',
        {
          searchParams: { type: 'contribution' },
        }
      )
      
      const responseTime = Date.now() - startTime
      expect(responseTime).toBeLessThan(2000) // 2秒内响应
      expect(result.status).toBe(200)
    })

    test('应该处理大量数据请求', async () => {
      const result = await ApiTestHelper.callApi(
        GET,
        '/api/leaderboard',
        {
          searchParams: { 
            type: 'contribution',
            limit: '100' // 大量数据
          },
        }
      )

      expect(result.status).toBe(200)
      const response = await result.json()
      
      // 应该限制在合理范围内
      expect(response.data.leaderboard.length).toBeLessThanOrEqual(100)
    })

    test('应该处理并发请求', async () => {
      const concurrentRequests = Array(5).fill(null).map(() =>
        ApiTestHelper.callApi(
          GET,
          '/api/leaderboard',
          {
            searchParams: { type: 'contribution' },
          }
        )
      )

      const results = await Promise.all(concurrentRequests)
      
      results.forEach(result => {
        expect(result.status).toBe(200)
      })
    })
  })

  describe('错误处理', () => {
    test('应该处理数据库错误', async () => {
      const { getLeaderboard } = require('@/lib/db/mongodb')
      getLeaderboard.mockRejectedValueOnce(new Error('Database error'))

      const result = await ApiTestHelper.callApi(
        GET,
        '/api/leaderboard',
        {
          searchParams: { type: 'contribution' },
        }
      )

      expect(result.status).toBe(500)
      const response = await result.json()
      expect(response.success).toBe(false)
    })

    test('应该处理缓存服务错误', async () => {
      const { get: cacheGet } = require('@/lib/services/cacheService')
      cacheGet.mockRejectedValueOnce(new Error('Cache service error'))

      const result = await ApiTestHelper.callApi(
        GET,
        '/api/leaderboard',
        {
          searchParams: { type: 'contribution' },
        }
      )

      // 应该降级到直接查询数据库
      expect(result.status).toBe(200)
    })

    test('应该处理空数据', async () => {
      const { getLeaderboard } = require('@/lib/db/mongodb')
      getLeaderboard.mockResolvedValueOnce([])

      const result = await ApiTestHelper.callApi(
        GET,
        '/api/leaderboard',
        {
          searchParams: { type: 'contribution' },
        }
      )

      expect(result.status).toBe(200)
      const response = await result.json()
      expect(response.data.leaderboard).toEqual([])
    })
  })

  describe('数据一致性测试', () => {
    test('排名应该连续且唯一', async () => {
      const result = await ApiTestHelper.callApi(
        GET,
        '/api/leaderboard',
        {
          searchParams: { 
            type: 'contribution',
            limit: '10'
          },
        }
      )

      const response = await result.json()
      const ranks = response.data.leaderboard.map(item => item.rank)
      
      // 检查排名连续性
      for (let i = 0; i < ranks.length; i++) {
        expect(ranks[i]).toBe(i + 1)
      }
      
      // 检查排名唯一性
      const uniqueRanks = new Set(ranks)
      expect(uniqueRanks.size).toBe(ranks.length)
    })

    test('分数应该按降序排列', async () => {
      const result = await ApiTestHelper.callApi(
        GET,
        '/api/leaderboard',
        {
          searchParams: { 
            type: 'contribution',
            limit: '10'
          },
        }
      )

      const response = await result.json()
      const scores = response.data.leaderboard.map(item => item.score)
      
      for (let i = 1; i < scores.length; i++) {
        expect(scores[i]).toBeLessThanOrEqual(scores[i - 1])
      }
    })

    test('用户信息应该完整', async () => {
      const result = await ApiTestHelper.callApi(
        GET,
        '/api/leaderboard',
        {
          searchParams: { type: 'contribution' },
        }
      )

      const response = await result.json()
      
      response.data.leaderboard.forEach(user => {
        expect(user).toHaveProperty('userId')
        expect(user).toHaveProperty('name')
        expect(user).toHaveProperty('rank')
        expect(user).toHaveProperty('score')
        expect(typeof user.userId).toBe('string')
        expect(typeof user.name).toBe('string')
        expect(typeof user.rank).toBe('number')
        expect(typeof user.score).toBe('number')
      })
    })
  })
})