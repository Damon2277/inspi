/**
 * 订阅API测试
 */

import { GET, POST, PUT } from '@/app/api/subscription/route'
import { 
  ApiTestHelper, 
  setupApiTestEnvironment, 
  mockDatabase, 
  mockServices,
  jwtUtils,
  responseValidators
} from '../setup/api-test-setup'
import { createUserFixture, createSubscriptionFixture } from '@/fixtures'

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
  getUserSubscription: jest.fn().mockImplementation((userId) => 
    Promise.resolve(mockDatabase.subscriptions.get(userId))
  ),
  createSubscription: jest.fn().mockImplementation((subscriptionData) => {
    const subscription = { 
      ...subscriptionData, 
      id: `sub-${Date.now()}`,
      createdAt: new Date().toISOString()
    }
    mockDatabase.subscriptions.set(subscriptionData.userId, subscription)
    return Promise.resolve(subscription)
  }),
  updateSubscription: jest.fn().mockImplementation((userId, updates) => {
    const subscription = mockDatabase.subscriptions.get(userId)
    if (subscription) {
      Object.assign(subscription, updates, { updatedAt: new Date().toISOString() })
      return Promise.resolve(subscription)
    }
    return Promise.resolve(null)
  }),
  getUserUsage: jest.fn().mockImplementation((userId) => 
    Promise.resolve({
      dailyGenerations: 5,
      dailyReuses: 3,
      totalWorks: 10,
      lastResetDate: new Date().toISOString().split('T')[0],
    })
  ),
  updateUserUsage: jest.fn().mockImplementation((userId, usage) => 
    Promise.resolve({ ...usage, userId })
  ),
}))

// Mock支付服务
jest.mock('@/lib/services/paymentService', () => ({
  createPaymentIntent: jest.fn().mockResolvedValue({
    clientSecret: 'pi_test_client_secret',
    paymentIntentId: 'pi_test_123',
  }),
  confirmPayment: jest.fn().mockResolvedValue({
    status: 'succeeded',
    paymentIntentId: 'pi_test_123',
  }),
  cancelSubscription: jest.fn().mockResolvedValue({
    status: 'canceled',
    canceledAt: new Date().toISOString(),
  }),
}))

describe('/api/subscription API测试', () => {
  setupApiTestEnvironment()
  
  const testUser = createUserFixture({ id: 'user-1' })
  const authToken = jwtUtils.createTestToken({ userId: testUser.id })
  const authHeaders = ApiTestHelper.createAuthHeaders(authToken)

  beforeEach(() => {
    mockDatabase.users.set(testUser.id, testUser)
    
    // 添加测试订阅
    const testSubscription = createSubscriptionFixture({
      userId: testUser.id,
      plan: 'free',
      status: 'active',
    })
    mockDatabase.subscriptions.set(testUser.id, testSubscription)
  })

  describe('GET /api/subscription - 获取订阅信息', () => {
    test('应该返回用户当前订阅信息', async () => {
      const result = await ApiTestHelper.callApi(
        GET,
        '/api/subscription',
        {
          headers: authHeaders,
        }
      )

      expect(result.status).toBe(200)
      const response = await result.json()
      
      responseValidators.validateApiResponse(response)
      expect(response.success).toBe(true)
      expect(response.data.subscription).toBeDefined()
      expect(response.data.subscription.plan).toBe('free')
      expect(response.data.usage).toBeDefined()
      expect(response.data.limits).toBeDefined()
    })

    test('应该返回使用统计', async () => {
      const result = await ApiTestHelper.callApi(
        GET,
        '/api/subscription',
        {
          headers: authHeaders,
        }
      )

      const response = await result.json()
      
      expect(response.data.usage.dailyGenerations).toBeDefined()
      expect(response.data.usage.dailyReuses).toBeDefined()
      expect(response.data.usage.totalWorks).toBeDefined()
    })

    test('应该返回订阅限制信息', async () => {
      const result = await ApiTestHelper.callApi(
        GET,
        '/api/subscription',
        {
          headers: authHeaders,
        }
      )

      const response = await result.json()
      
      expect(response.data.limits.dailyGenerations).toBeDefined()
      expect(response.data.limits.dailyReuses).toBeDefined()
      expect(response.data.limits.maxWorks).toBeDefined()
    })

    test('应该处理没有订阅的用户', async () => {
      mockDatabase.subscriptions.delete(testUser.id)

      const result = await ApiTestHelper.callApi(
        GET,
        '/api/subscription',
        {
          headers: authHeaders,
        }
      )

      expect(result.status).toBe(200)
      const response = await result.json()
      
      // 应该返回默认免费订阅
      expect(response.data.subscription.plan).toBe('free')
      expect(response.data.subscription.status).toBe('active')
    })

    test('应该要求用户认证', async () => {
      const result = await ApiTestHelper.callApi(
        GET,
        '/api/subscription'
      )

      ApiTestHelper.expectUnauthorizedError(result)
    })
  })

  describe('POST /api/subscription - 创建订阅', () => {
    test('应该成功创建Pro订阅', async () => {
      const subscriptionData = {
        plan: 'pro',
        paymentMethodId: 'pm_test_123',
      }

      const result = await ApiTestHelper.callApi(
        POST,
        '/api/subscription',
        {
          body: subscriptionData,
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        }
      )

      expect(result.status).toBe(201)
      const response = await result.json()
      
      expect(response.success).toBe(true)
      expect(response.data.subscription.plan).toBe('pro')
      expect(response.data.paymentIntent).toBeDefined()
    })

    test('应该成功创建Super订阅', async () => {
      const subscriptionData = {
        plan: 'super',
        paymentMethodId: 'pm_test_456',
      }

      const result = await ApiTestHelper.callApi(
        POST,
        '/api/subscription',
        {
          body: subscriptionData,
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        }
      )

      expect(result.status).toBe(201)
      const response = await result.json()
      
      expect(response.data.subscription.plan).toBe('super')
    })

    test('应该验证订阅计划', async () => {
      const invalidData = {
        plan: 'invalid-plan',
        paymentMethodId: 'pm_test_123',
      }

      const result = await ApiTestHelper.callApi(
        POST,
        '/api/subscription',
        {
          body: invalidData,
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        }
      )

      ApiTestHelper.expectValidationError(result, ['plan'])
    })

    test('应该验证支付方式', async () => {
      const invalidData = {
        plan: 'pro',
        // 缺少paymentMethodId
      }

      const result = await ApiTestHelper.callApi(
        POST,
        '/api/subscription',
        {
          body: invalidData,
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        }
      )

      ApiTestHelper.expectValidationError(result, ['paymentMethodId'])
    })

    test('应该处理支付失败', async () => {
      const { createPaymentIntent } = require('@/lib/services/paymentService')
      createPaymentIntent.mockRejectedValueOnce(new Error('Payment failed'))

      const subscriptionData = {
        plan: 'pro',
        paymentMethodId: 'pm_test_fail',
      }

      const result = await ApiTestHelper.callApi(
        POST,
        '/api/subscription',
        {
          body: subscriptionData,
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        }
      )

      expect(result.status).toBe(400)
      const response = await result.json()
      expect(response.success).toBe(false)
      expect(response.error).toContain('Payment failed')
    })

    test('应该防止重复订阅', async () => {
      // 用户已有Pro订阅
      const proSubscription = createSubscriptionFixture({
        userId: testUser.id,
        plan: 'pro',
        status: 'active',
      })
      mockDatabase.subscriptions.set(testUser.id, proSubscription)

      const subscriptionData = {
        plan: 'pro',
        paymentMethodId: 'pm_test_123',
      }

      const result = await ApiTestHelper.callApi(
        POST,
        '/api/subscription',
        {
          body: subscriptionData,
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        }
      )

      expect(result.status).toBe(409)
      const response = await result.json()
      expect(response.error).toContain('already have an active subscription')
    })
  })

  describe('PUT /api/subscription - 更新订阅', () => {
    test('应该成功升级订阅', async () => {
      const updateData = {
        action: 'upgrade',
        newPlan: 'super',
        paymentMethodId: 'pm_test_upgrade',
      }

      const result = await ApiTestHelper.callApi(
        PUT,
        '/api/subscription',
        {
          body: updateData,
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        }
      )

      expect(result.status).toBe(200)
      const response = await result.json()
      
      expect(response.success).toBe(true)
      expect(response.data.subscription.plan).toBe('super')
    })

    test('应该成功取消订阅', async () => {
      // 设置Pro订阅
      const proSubscription = createSubscriptionFixture({
        userId: testUser.id,
        plan: 'pro',
        status: 'active',
      })
      mockDatabase.subscriptions.set(testUser.id, proSubscription)

      const updateData = {
        action: 'cancel',
      }

      const result = await ApiTestHelper.callApi(
        PUT,
        '/api/subscription',
        {
          body: updateData,
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        }
      )

      expect(result.status).toBe(200)
      const response = await result.json()
      
      expect(response.success).toBe(true)
      expect(response.data.subscription.status).toBe('canceled')
    })

    test('应该成功暂停订阅', async () => {
      const proSubscription = createSubscriptionFixture({
        userId: testUser.id,
        plan: 'pro',
        status: 'active',
      })
      mockDatabase.subscriptions.set(testUser.id, proSubscription)

      const updateData = {
        action: 'pause',
      }

      const result = await ApiTestHelper.callApi(
        PUT,
        '/api/subscription',
        {
          body: updateData,
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        }
      )

      expect(result.status).toBe(200)
      const response = await result.json()
      
      expect(response.data.subscription.status).toBe('paused')
    })

    test('应该成功恢复订阅', async () => {
      const pausedSubscription = createSubscriptionFixture({
        userId: testUser.id,
        plan: 'pro',
        status: 'paused',
      })
      mockDatabase.subscriptions.set(testUser.id, pausedSubscription)

      const updateData = {
        action: 'resume',
      }

      const result = await ApiTestHelper.callApi(
        PUT,
        '/api/subscription',
        {
          body: updateData,
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        }
      )

      expect(result.status).toBe(200)
      const response = await result.json()
      
      expect(response.data.subscription.status).toBe('active')
    })

    test('应该验证操作类型', async () => {
      const invalidData = {
        action: 'invalid-action',
      }

      const result = await ApiTestHelper.callApi(
        PUT,
        '/api/subscription',
        {
          body: invalidData,
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        }
      )

      ApiTestHelper.expectValidationError(result, ['action'])
    })

    test('应该处理不存在的订阅', async () => {
      mockDatabase.subscriptions.delete(testUser.id)

      const updateData = {
        action: 'cancel',
      }

      const result = await ApiTestHelper.callApi(
        PUT,
        '/api/subscription',
        {
          body: updateData,
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        }
      )

      ApiTestHelper.expectNotFoundError(result)
    })
  })

  describe('使用限制检查', () => {
    test('应该正确检查免费用户限制', async () => {
      const result = await ApiTestHelper.callApi(
        GET,
        '/api/subscription',
        {
          searchParams: { checkLimits: 'true' },
          headers: authHeaders,
        }
      )

      const response = await result.json()
      
      expect(response.data.limits.dailyGenerations).toBe(3)
      expect(response.data.limits.dailyReuses).toBe(5)
      expect(response.data.limits.maxWorks).toBe(10)
    })

    test('应该正确检查Pro用户限制', async () => {
      const proSubscription = createSubscriptionFixture({
        userId: testUser.id,
        plan: 'pro',
        status: 'active',
      })
      mockDatabase.subscriptions.set(testUser.id, proSubscription)

      const result = await ApiTestHelper.callApi(
        GET,
        '/api/subscription',
        {
          searchParams: { checkLimits: 'true' },
          headers: authHeaders,
        }
      )

      const response = await result.json()
      
      expect(response.data.limits.dailyGenerations).toBe(20)
      expect(response.data.limits.dailyReuses).toBe(50)
      expect(response.data.limits.maxWorks).toBe(100)
    })

    test('应该正确检查Super用户限制', async () => {
      const superSubscription = createSubscriptionFixture({
        userId: testUser.id,
        plan: 'super',
        status: 'active',
      })
      mockDatabase.subscriptions.set(testUser.id, superSubscription)

      const result = await ApiTestHelper.callApi(
        GET,
        '/api/subscription',
        {
          searchParams: { checkLimits: 'true' },
          headers: authHeaders,
        }
      )

      const response = await result.json()
      
      expect(response.data.limits.dailyGenerations).toBe(-1) // 无限制
      expect(response.data.limits.dailyReuses).toBe(-1) // 无限制
      expect(response.data.limits.maxWorks).toBe(-1) // 无限制
    })
  })

  describe('错误处理', () => {
    test('应该处理数据库错误', async () => {
      const { getUserSubscription } = require('@/lib/db/mongodb')
      getUserSubscription.mockRejectedValueOnce(new Error('Database error'))

      const result = await ApiTestHelper.callApi(
        GET,
        '/api/subscription',
        {
          headers: authHeaders,
        }
      )

      expect(result.status).toBe(500)
      const response = await result.json()
      expect(response.success).toBe(false)
    })

    test('应该处理支付服务错误', async () => {
      const { createPaymentIntent } = require('@/lib/services/paymentService')
      createPaymentIntent.mockRejectedValueOnce(new Error('Payment service unavailable'))

      const subscriptionData = {
        plan: 'pro',
        paymentMethodId: 'pm_test_123',
      }

      const result = await ApiTestHelper.callApi(
        POST,
        '/api/subscription',
        {
          body: subscriptionData,
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        }
      )

      expect(result.status).toBe(503)
      const response = await result.json()
      expect(response.error).toContain('service unavailable')
    })
  })

  describe('Webhook处理', () => {
    test('应该处理支付成功webhook', async () => {
      const webhookData = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            status: 'succeeded',
            metadata: {
              userId: testUser.id,
              plan: 'pro',
            },
          },
        },
      }

      const result = await ApiTestHelper.callApi(
        POST,
        '/api/subscription/webhook',
        {
          body: webhookData,
          headers: {
            'stripe-signature': 'test-signature',
            ...ApiTestHelper.createJsonHeaders(),
          },
        }
      )

      expect(result.status).toBe(200)
      const response = await result.json()
      expect(response.success).toBe(true)
    })

    test('应该处理支付失败webhook', async () => {
      const webhookData = {
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_test_fail',
            status: 'requires_payment_method',
            metadata: {
              userId: testUser.id,
              plan: 'pro',
            },
          },
        },
      }

      const result = await ApiTestHelper.callApi(
        POST,
        '/api/subscription/webhook',
        {
          body: webhookData,
          headers: {
            'stripe-signature': 'test-signature',
            ...ApiTestHelper.createJsonHeaders(),
          },
        }
      )

      expect(result.status).toBe(200)
      const response = await result.json()
      expect(response.success).toBe(true)
    })
  })
})