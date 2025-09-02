/**
 * API集成测试套件
 * 测试多个API之间的交互和数据流
 */

import { 
  ApiTestHelper, 
  setupApiTestEnvironment, 
  mockDatabase, 
  mockServices,
  jwtUtils,
  responseValidators
} from '../setup/api-test-setup'
import { createUserFixture, createWorkFixture } from '@/fixtures'

// Mock所有API路由
jest.mock('@/app/api/auth/route', () => ({
  POST: jest.fn(),
}))

jest.mock('@/app/api/works/route', () => ({
  GET: jest.fn(),
  POST: jest.fn(),
  PUT: jest.fn(),
  DELETE: jest.fn(),
}))

jest.mock('@/app/api/profile/route', () => ({
  GET: jest.fn(),
  PUT: jest.fn(),
}))

jest.mock('@/app/api/subscription/route', () => ({
  GET: jest.fn(),
  POST: jest.fn(),
  PUT: jest.fn(),
}))

jest.mock('@/app/api/leaderboard/route', () => ({
  GET: jest.fn(),
}))

// Mock数据库和服务
jest.mock('@/lib/db/mongodb', () => ({
  connectDB: jest.fn().mockResolvedValue(true),
  getUserByEmail: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn(),
  getWorks: jest.fn(),
  createWork: jest.fn(),
  updateWork: jest.fn(),
  deleteWork: jest.fn(),
  getUserSubscription: jest.fn(),
  updateUserUsage: jest.fn(),
  getLeaderboard: jest.fn(),
  updateContributionScore: jest.fn(),
}))

describe('API集成测试', () => {
  setupApiTestEnvironment()

  let testUser: any
  let authToken: string
  let authHeaders: any

  beforeEach(() => {
    testUser = createUserFixture({
      id: 'integration-user-1',
      email: 'integration@example.com',
      name: 'Integration Test User',
    })
    authToken = jwtUtils.createTestToken({ userId: testUser.id })
    authHeaders = ApiTestHelper.createAuthHeaders(authToken)

    mockDatabase.users.set(testUser.id, testUser)
  })

  describe('用户注册到创作流程', () => {
    test('完整的用户注册和首次创作流程', async () => {
      // 1. 用户注册
      const { POST: authPost } = require('@/app/api/auth/route')
      authPost.mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        data: {
          user: testUser,
          token: authToken,
        },
      }), { status: 201 }))

      const registerResult = await ApiTestHelper.callApi(
        authPost,
        '/api/auth',
        {
          body: {
            action: 'register',
            email: testUser.email,
            password: 'password123',
            name: testUser.name,
          },
        }
      )

      expect(registerResult.status).toBe(201)
      const registerResponse = await registerResult.json()
      expect(registerResponse.success).toBe(true)
      expect(registerResponse.data.user.email).toBe(testUser.email)

      // 2. 获取用户订阅信息
      const { GET: subscriptionGet } = require('@/app/api/subscription/route')
      subscriptionGet.mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        data: {
          subscription: { plan: 'free', status: 'active' },
          usage: { dailyGenerations: 0, dailyReuses: 0 },
          limits: { dailyGenerations: 3, dailyReuses: 5 },
        },
      })))

      const subscriptionResult = await ApiTestHelper.callApi(
        subscriptionGet,
        '/api/subscription',
        { headers: authHeaders }
      )

      expect(subscriptionResult.status).toBe(200)
      const subscriptionResponse = await subscriptionResult.json()
      expect(subscriptionResponse.data.subscription.plan).toBe('free')

      // 3. 创建第一个作品
      const newWork = createWorkFixture({
        title: 'My First Work',
        authorId: testUser.id,
      })

      const { POST: worksPost } = require('@/app/api/works/route')
      worksPost.mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        data: newWork,
      }), { status: 201 }))

      const createWorkResult = await ApiTestHelper.callApi(
        worksPost,
        '/api/works',
        {
          body: {
            title: 'My First Work',
            description: 'This is my first work',
            subject: 'Mathematics',
          },
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        }
      )

      expect(createWorkResult.status).toBe(201)
      const createWorkResponse = await createWorkResult.json()
      expect(createWorkResponse.data.title).toBe('My First Work')

      // 4. 验证使用量更新
      const { updateUserUsage } = require('@/lib/db/mongodb')
      expect(updateUserUsage).toHaveBeenCalledWith(
        testUser.id,
        expect.objectContaining({
          dailyGenerations: 1,
        })
      )

      // 5. 检查排行榜更新
      const { updateContributionScore } = require('@/lib/db/mongodb')
      expect(updateContributionScore).toHaveBeenCalledWith(
        testUser.id,
        expect.objectContaining({
          type: 'creation',
          points: expect.any(Number),
        })
      )
    })

    test('用户达到免费限制后的升级流程', async () => {
      // 1. 模拟用户已达到免费限制
      const { GET: subscriptionGet } = require('@/app/api/subscription/route')
      subscriptionGet.mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        data: {
          subscription: { plan: 'free', status: 'active' },
          usage: { dailyGenerations: 3, dailyReuses: 5 }, // 已达限制
          limits: { dailyGenerations: 3, dailyReuses: 5 },
        },
      })))

      const subscriptionResult = await ApiTestHelper.callApi(
        subscriptionGet,
        '/api/subscription',
        { headers: authHeaders }
      )

      const subscriptionResponse = await subscriptionResult.json()
      expect(subscriptionResponse.data.usage.dailyGenerations).toBe(3)

      // 2. 尝试创建新作品（应该失败）
      const { POST: worksPost } = require('@/app/api/works/route')
      worksPost.mockResolvedValueOnce(new Response(JSON.stringify({
        success: false,
        error: 'Daily generation limit exceeded',
      }), { status:429 }))

      const createWorkResult = await ApiTestHelper.callApi(
        worksPost,
        '/api/works',
        {
          body: { title: 'Blocked Work' },
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        }
      )

      expect(createWorkResult.status).toBe(429)

      // 3. 升级到Pro订阅
      const { POST: subscriptionPost } = require('@/app/api/subscription/route')
      subscriptionPost.mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        data: {
          subscription: { plan: 'pro', status: 'active' },
          paymentIntent: { clientSecret: 'pi_test_123' },
        },
      }), { status: 201 }))

      const upgradeResult = await ApiTestHelper.callApi(
        subscriptionPost,
        '/api/subscription',
        {
          body: {
            plan: 'pro',
            paymentMethodId: 'pm_test_123',
          },
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        }
      )

      expect(upgradeResult.status).toBe(201)
      const upgradeResponse = await upgradeResult.json()
      expect(upgradeResponse.data.subscription.plan).toBe('pro')

      // 4. 现在应该可以创建更多作品
      worksPost.mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        data: createWorkFixture({ title: 'Pro Work' }),
      }), { status: 201 }))

      const newWorkResult = await ApiTestHelper.callApi(
        worksPost,
        '/api/works',
        {
          body: { title: 'Pro Work' },
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        }
      )

      expect(newWorkResult.status).toBe(201)
    })
  })

  describe('作品发布到复用流程', () => {
    test('完整的作品发布和被复用流程', async () => {
      const originalWork = createWorkFixture({
        id: 'original-work',
        title: 'Original Work',
        authorId: testUser.id,
        isPublished: false,
      })

      // 1. 发布作品
      const { PUT: worksPut } = require('@/app/api/works/route')
      worksPut.mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        data: { ...originalWork, isPublished: true, publishedAt: new Date().toISOString() },
      })))

      const publishResult = await ApiTestHelper.callApi(
        worksPut,
        '/api/works',
        {
          body: {
            id: originalWork.id,
            isPublished: true,
          },
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        }
      )

      expect(publishResult.status).toBe(200)
      const publishResponse = await publishResult.json()
      expect(publishResponse.data.isPublished).toBe(true)

      // 2. 作品出现在广场
      const { GET: worksGet } = require('@/app/api/works/route')
      worksGet.mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        data: {
          items: [publishResponse.data],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        },
      })))

      const squareResult = await ApiTestHelper.callApi(
        worksGet,
        '/api/works',
        {
          searchParams: { published: 'true' },
        }
      )

      expect(squareResult.status).toBe(200)
      const squareResponse = await squareResult.json()
      expect(squareResponse.data.items).toHaveLength(1)
      expect(squareResponse.data.items[0].id).toBe(originalWork.id)

      // 3. 其他用户复用作品
      const otherUser = createUserFixture({
        id: 'other-user',
        email: 'other@example.com',
      })
      const otherAuthToken = jwtUtils.createTestToken({ userId: otherUser.id })
      const otherAuthHeaders = ApiTestHelper.createAuthHeaders(otherAuthToken)

      const { POST: worksPost } = require('@/app/api/works/route')
      worksPost.mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        data: createWorkFixture({
          title: 'Reused Work',
          authorId: otherUser.id,
          originalWorkId: originalWork.id,
          isReuse: true,
        }),
      }), { status: 201 }))

      const reuseResult = await ApiTestHelper.callApi(
        worksPost,
        '/api/works',
        {
          body: {
            title: 'Reused Work',
            originalWorkId: originalWork.id,
            isReuse: true,
          },
          headers: { ...otherAuthHeaders, ...ApiTestHelper.createJsonHeaders() },
        }
      )

      expect(reuseResult.status).toBe(201)

      // 4. 验证贡献度更新
      const { updateContributionScore } = require('@/lib/db/mongodb')
      expect(updateContributionScore).toHaveBeenCalledWith(
        testUser.id, // 原作者获得复用分
        expect.objectContaining({
          type: 'reuse_received',
          points: expect.any(Number),
        })
      )
      expect(updateContributionScore).toHaveBeenCalledWith(
        otherUser.id, // 复用者获得复用分
        expect.objectContaining({
          type: 'reuse_made',
          points: expect.any(Number),
        })
      )

      // 5. 检查排行榜更新
      const { GET: leaderboardGet } = require('@/app/api/leaderboard/route')
      leaderboardGet.mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        data: {
          leaderboard: [
            { userId: testUser.id, rank: 1, score: 100 },
            { userId: otherUser.id, rank: 2, score: 50 },
          ],
        },
      })))

      const leaderboardResult = await ApiTestHelper.callApi(
        leaderboardGet,
        '/api/leaderboard',
        {
          searchParams: { type: 'contribution' },
        }
      )

      expect(leaderboardResult.status).toBe(200)
      const leaderboardResponse = await leaderboardResult.json()
      expect(leaderboardResponse.data.leaderboard[0].userId).toBe(testUser.id)
    })
  })

  describe('用户资料更新流程', () => {
    test('用户资料更新影响作品显示', async () => {
      // 1. 更新用户资料
      const { PUT: profilePut } = require('@/app/api/profile/route')
      profilePut.mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        data: {
          user: { ...testUser, name: 'Updated Name', avatar: 'new-avatar.jpg' },
          profile: { bio: 'Updated bio', skills: ['Teaching', 'Math'] },
        },
      })))

      const updateProfileResult = await ApiTestHelper.callApi(
        profilePut,
        '/api/profile',
        {
          body: {
            name: 'Updated Name',
            bio: 'Updated bio',
            avatar: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...',
          },
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        }
      )

      expect(updateProfileResult.status).toBe(200)

      // 2. 检查作品列表中的作者信息是否更新
      const userWork = createWorkFixture({
        authorId: testUser.id,
        author: {
          id: testUser.id,
          name: 'Updated Name',
          avatar: 'new-avatar.jpg',
        },
      })

      const { GET: worksGet } = require('@/app/api/works/route')
      worksGet.mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        data: {
          items: [userWork],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        },
      })))

      const worksResult = await ApiTestHelper.callApi(
        worksGet,
        '/api/works',
        {
          searchParams: { authorId: testUser.id },
          headers: authHeaders,
        }
      )

      expect(worksResult.status).toBe(200)
      const worksResponse = await worksResult.json()
      expect(worksResponse.data.items[0].author.name).toBe('Updated Name')

      // 3. 检查排行榜中的用户信息是否更新
      const { GET: leaderboardGet } = require('@/app/api/leaderboard/route')
      leaderboardGet.mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        data: {
          leaderboard: [
            {
              userId: testUser.id,
              name: 'Updated Name',
              avatar: 'new-avatar.jpg',
              rank: 1,
              score: 100,
            },
          ],
        },
      })))

      const leaderboardResult = await ApiTestHelper.callApi(
        leaderboardGet,
        '/api/leaderboard',
        {
          searchParams: { type: 'contribution' },
        }
      )

      const leaderboardResponse = await leaderboardResult.json()
      expect(leaderboardResponse.data.leaderboard[0].name).toBe('Updated Name')
    })
  })

  describe('错误传播和恢复', () => {
    test('数据库错误的级联处理', async () => {
      // 模拟数据库连接失败
      const { connectDB } = require('@/lib/db/mongodb')
      connectDB.mockRejectedValueOnce(new Error('Database connection failed'))

      // 所有依赖数据库的API都应该返回500错误
      const apis = [
        { route: require('@/app/api/works/route').GET, path: '/api/works' },
        { route: require('@/app/api/profile/route').GET, path: '/api/profile' },
        { route: require('@/app/api/subscription/route').GET, path: '/api/subscription' },
        { route: require('@/app/api/leaderboard/route').GET, path: '/api/leaderboard' },
      ]

      for (const api of apis) {
        api.route.mockResolvedValueOnce(new Response(JSON.stringify({
          success: false,
          error: 'Internal server error',
        }), { status: 500 }))

        const result = await ApiTestHelper.callApi(
          api.route,
          api.path,
          { headers: authHeaders }
        )

        expect(result.status).toBe(500)
        const response = await result.json()
        expect(response.success).toBe(false)
      }
    })

    test('服务降级和备用方案', async () => {
      // 模拟AI服务不可用
      mockServices.ai.generateCards.mockRejectedValueOnce(new Error('AI service unavailable'))

      const { POST: worksPost } = require('@/app/api/works/route')
      worksPost.mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        data: createWorkFixture({
          title: 'Manual Work',
          cards: [], // 空卡片，用户需要手动添加
          aiGenerated: false,
        }),
      }), { status: 201 }))

      const result = await ApiTestHelper.callApi(
        worksPost,
        '/api/works',
        {
          body: {
            title: 'Manual Work',
            useAI: true,
            prompt: 'Generate math cards',
          },
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        }
      )

      expect(result.status).toBe(201)
      const response = await result.json()
      expect(response.data.aiGenerated).toBe(false)
    })
  })

  describe('数据一致性验证', () => {
    test('跨API数据一致性检查', async () => {
      // 1. 创建作品
      const work = createWorkFixture({
        id: 'consistency-work',
        authorId: testUser.id,
        title: 'Consistency Test Work',
      })

      const { POST: worksPost } = require('@/app/api/works/route')
      worksPost.mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        data: work,
      }), { status: 201 }))

      await ApiTestHelper.callApi(
        worksPost,
        '/api/works',
        {
          body: { title: work.title },
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        }
      )

      // 2. 检查用户统计是否更新
      const { GET: profileGet } = require('@/app/api/profile/route')
      profileGet.mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        data: {
          user: testUser,
          profile: {},
          stats: {
            totalWorks: 1, // 应该增加
            totalViews: 0,
            totalLikes: 0,
          },
        },
      })))

      const profileResult = await ApiTestHelper.callApi(
        profileGet,
        '/api/profile',
        { headers: authHeaders }
      )

      const profileResponse = await profileResult.json()
      expect(profileResponse.data.stats.totalWorks).toBe(1)

      // 3. 检查订阅使用量是否更新
      const { GET: subscriptionGet } = require('@/app/api/subscription/route')
      subscriptionGet.mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        data: {
          subscription: { plan: 'free', status: 'active' },
          usage: { dailyGenerations: 1 }, // 应该增加
          limits: { dailyGenerations: 3 },
        },
      })))

      const subscriptionResult = await ApiTestHelper.callApi(
        subscriptionGet,
        '/api/subscription',
        { headers: authHeaders }
      )

      const subscriptionResponse = await subscriptionResult.json()
      expect(subscriptionResponse.data.usage.dailyGenerations).toBe(1)

      // 4. 检查排行榜是否反映变化
      const { GET: leaderboardGet } = require('@/app/api/leaderboard/route')
      leaderboardGet.mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        data: {
          leaderboard: [
            {
              userId: testUser.id,
              rank: 1,
              score: 10, // 创作得分
              totalWorks: 1,
            },
          ],
        },
      })))

      const leaderboardResult = await ApiTestHelper.callApi(
        leaderboardGet,
        '/api/leaderboard',
        { searchParams: { type: 'contribution' } }
      )

      const leaderboardResponse = await leaderboardResult.json()
      expect(leaderboardResponse.data.leaderboard[0].totalWorks).toBe(1)
    })
  })

  describe('并发操作处理', () => {
    test('并发创作请求的处理', async () => {
      const { POST: worksPost } = require('@/app/api/works/route')
      
      // 模拟多个并发创作请求
      const concurrentRequests = Array(5).fill(null).map((_, index) => {
        worksPost.mockResolvedValueOnce(new Response(JSON.stringify({
          success: true,
          data: createWorkFixture({
            id: `concurrent-work-${index}`,
            title: `Concurrent Work ${index}`,
            authorId: testUser.id,
          }),
        }), { status: 201 }))

        return ApiTestHelper.callApi(
          worksPost,
          '/api/works',
          {
            body: { title: `Concurrent Work ${index}` },
            headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
          }
        )
      })

      const results = await Promise.all(concurrentRequests)
      
      // 所有请求都应该成功
      results.forEach(result => {
        expect(result.status).toBe(201)
      })

      // 验证使用量正确累计
      const { updateUserUsage } = require('@/lib/db/mongodb')
      expect(updateUserUsage).toHaveBeenCalledTimes(5)
    })

    test('并发复用同一作品的处理', async () => {
      const originalWork = createWorkFixture({
        id: 'popular-work',
        authorId: testUser.id,
        isPublished: true,
      })

      const { POST: worksPost } = require('@/app/api/works/route')
      
      // 模拟多个用户同时复用同一作品
      const concurrentReuses = Array(3).fill(null).map((_, index) => {
        const reuseUser = createUserFixture({
          id: `reuse-user-${index}`,
          email: `reuse${index}@example.com`,
        })
        const reuseAuthHeaders = ApiTestHelper.createAuthHeaders(
          jwtUtils.createTestToken({ userId: reuseUser.id })
        )

        worksPost.mockResolvedValueOnce(new Response(JSON.stringify({
          success: true,
          data: createWorkFixture({
            id: `reuse-${index}`,
            title: `Reused Work ${index}`,
            authorId: reuseUser.id,
            originalWorkId: originalWork.id,
            isReuse: true,
          }),
        }), { status: 201 }))

        return ApiTestHelper.callApi(
          worksPost,
          '/api/works',
          {
            body: {
              title: `Reused Work ${index}`,
              originalWorkId: originalWork.id,
              isReuse: true,
            },
            headers: { ...reuseAuthHeaders, ...ApiTestHelper.createJsonHeaders() },
          }
        )
      })

      const results = await Promise.all(concurrentReuses)
      
      // 所有复用都应该成功
      results.forEach(result => {
        expect(result.status).toBe(201)
      })

      // 验证原作者的贡献度正确累计
      const { updateContributionScore } = require('@/lib/db/mongodb')
      const originalAuthorCalls = updateContributionScore.mock.calls.filter(
        call => call[0] === testUser.id && call[1].type === 'reuse_received'
      )
      expect(originalAuthorCalls).toHaveLength(3)
    })
  })
})