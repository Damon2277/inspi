/**
 * 数据库模拟对象
 * 提供一致的数据库模拟功能
 */
import { jest } from '@jest/globals';

/**
 * MongoDB模拟
 */
export const createMockMongoose = () => {
  const mockDocuments = new Map();

  const mockModel = {
    find: jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    }),
    findById: jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(null),
    }),
    findOne: jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(null),
    }),
    create: jest.fn().mockImplementation((data) => {
      const id = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const doc = { _id: id, ...data, save: jest.fn().mockResolvedValue({ _id: id, ...data }) };
      mockDocuments.set(id, doc);
      return Promise.resolve(doc);
    }),
    findByIdAndUpdate: jest.fn().mockImplementation((id, update) => {
      const existing = mockDocuments.get(id);
      if (existing) {
        const updated = { ...existing, ...update, updatedAt: new Date() };
        mockDocuments.set(id, updated);
        return Promise.resolve(updated);
      }
      return Promise.resolve(null);
    }),
    findByIdAndDelete: jest.fn().mockImplementation((id) => {
      const existing = mockDocuments.get(id);
      if (existing) {
        mockDocuments.delete(id);
        return Promise.resolve(existing);
      }
      return Promise.resolve(null);
    }),
    countDocuments: jest.fn().mockResolvedValue(0),
    aggregate: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
  };

  return {
    model: mockModel,
    documents: mockDocuments,
    reset: () => {
      mockDocuments.clear();
      Object.values(mockModel).forEach(fn => {
        if (typeof fn === 'function' && fn.mockReset) {
          fn.mockReset();
        }
      });
    },
  };
};

/**
 * Redis模拟
 */
export const createMockRedis = () => {
  const mockData = new Map();

  const mockRedis = {
    get: jest.fn().mockImplementation((key) => {
      return Promise.resolve(mockData.get(key) || null);
    }),
    set: jest.fn().mockImplementation((key, value, options) => {
      mockData.set(key, value);
      if (options?.ttl) {
        setTimeout(() => mockData.delete(key), options.ttl * 1000);
      }
      return Promise.resolve('OK');
    }),
    del: jest.fn().mockImplementation((...keys) => {
      let deleted = 0;
      keys.forEach(key => {
        if (mockData.has(key)) {
          mockData.delete(key);
          deleted++;
        }
      });
      return Promise.resolve(deleted);
    }),
    increment: jest.fn().mockImplementation((key, options = {}) => {
      const current = parseInt(mockData.get(key, 10) || '0', 10);
      const newValue = current + (options.amount || 1);
      mockData.set(key, newValue.toString());

      if (options.ttl) {
        setTimeout(() => mockData.delete(key), options.ttl * 1000);
      }

      return Promise.resolve(newValue);
    }),
    exists: jest.fn().mockImplementation((key) => {
      return Promise.resolve(mockData.has(key) ? 1 : 0);
    }),
    expire: jest.fn().mockImplementation((key, seconds) => {
      if (mockData.has(key)) {
        setTimeout(() => mockData.delete(key), seconds * 1000);
        return Promise.resolve(1);
      }
      return Promise.resolve(0);
    }),
    keys: jest.fn().mockImplementation((pattern) => {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return Promise.resolve(
        Array.from(mockData.keys()).filter(key => regex.test(key)),
      );
    }),
    flushall: jest.fn().mockImplementation(() => {
      mockData.clear();
      return Promise.resolve('OK');
    }),
    isReady: jest.fn().mockReturnValue(true),
  };

  return {
    redis: mockRedis,
    data: mockData,
    reset: () => {
      mockData.clear();
      Object.values(mockRedis).forEach(fn => {
        if (typeof fn === 'function' && fn.mockReset) {
          fn.mockReset();
        }
      });
    },
  };
};

/**
 * 外部API模拟
 */
export const createMockExternalAPIs = () => {
  const mockFetch = jest.fn();

  // 模拟Gemini API
  const mockGeminiAPI = {
    generateContent: jest.fn().mockResolvedValue({
      response: {
        text: () => 'Mock AI generated content',
      },
    }),
    getModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: () => 'Mock AI generated content',
        },
      }),
    }),
  };

  // 模拟微信支付API
  const mockWeChatPayAPI = {
    unifiedOrder: jest.fn().mockResolvedValue({
      return_code: 'SUCCESS',
      result_code: 'SUCCESS',
      code_url: 'weixin://wxpay/bizpayurl?pr=mock_qr_code',
    }),
    orderQuery: jest.fn().mockResolvedValue({
      return_code: 'SUCCESS',
      result_code: 'SUCCESS',
      trade_state: 'SUCCESS',
    }),
    refund: jest.fn().mockResolvedValue({
      return_code: 'SUCCESS',
      result_code: 'SUCCESS',
    }),
  };

  // 模拟邮件服务API
  const mockEmailAPI = {
    sendEmail: jest.fn().mockResolvedValue({
      success: true,
      messageId: 'mock-message-id',
    }),
    sendVerificationEmail: jest.fn().mockResolvedValue({
      success: true,
      messageId: 'mock-verification-id',
    }),
    sendPasswordResetEmail: jest.fn().mockResolvedValue({
      success: true,
      messageId: 'mock-reset-id',
    }),
  };

  return {
    fetch: mockFetch,
    gemini: mockGeminiAPI,
    wechatPay: mockWeChatPayAPI,
    email: mockEmailAPI,
    reset: () => {
      [mockFetch, ...Object.values(mockGeminiAPI), ...Object.values(mockWeChatPayAPI), ...Object.values(mockEmailAPI)]
        .forEach(fn => {
          if (typeof fn === 'function' && fn.mockReset) {
            fn.mockReset();
          }
        });
    },
  };
};

/**
 * 完整的模拟环境
 */
export class MockEnvironment {
  public mongoose: ReturnType<typeof createMockMongoose>;
  public redis: ReturnType<typeof createMockRedis>;
  public apis: ReturnType<typeof createMockExternalAPIs>;

  constructor() {
    this.mongoose = createMockMongoose();
    this.redis = createMockRedis();
    this.apis = createMockExternalAPIs();
  }

  /**
   * 重置所有模拟
   */
  reset() {
    this.mongoose.reset();
    this.redis.reset();
    this.apis.reset();
  }

  /**
   * 设置测试数据
   */
  async seedData(data: {
    users?: any[]
    works?: any[]
    subscriptions?: any[]
    comments?: any[]
  }) {
    const { users = [], works = [], subscriptions = [], comments = [] } = data;

    // 创建用户
    for (const user of users) {
      await (this.mongoose.model as any).create(user);
    }

    // 创建作品
    for (const work of works) {
      await (this.mongoose.model as any).create(work);
    }

    // 创建订阅
    for (const subscription of subscriptions) {
      await (this.mongoose.model as any).create(subscription);
    }

    // 创建评论
    for (const comment of comments) {
      await (this.mongoose.model as any).create(comment);
    }
  }

  /**
   * 获取测试统计
   */
  getStats() {
    return {
      mongooseDocuments: this.mongoose.documents.size,
      redisKeys: this.redis.data.size,
      apiCalls: {
        fetch: this.apis.fetch.mock?.calls?.length || 0,
        gemini: this.apis.gemini.generateContent.mock?.calls?.length || 0,
        wechatPay: this.apis.wechatPay.unifiedOrder.mock?.calls?.length || 0,
        email: this.apis.email.sendEmail.mock?.calls?.length || 0,
      },
    };
  }
}

// 导出单例实例
export const mockEnvironment = new MockEnvironment();
