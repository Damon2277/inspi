/**
 * 配额管理器单元测试
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

import { quotaManager } from '@/core/subscription/quota-manager';

// Mock dependencies
jest.mock('@/lib/cache/redis');
jest.mock('@/lib/utils/logger');
jest.mock('@/lib/models/User');

describe('QuotaManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('配额检查', () => {
    it('应该正确检查免费用户配额', async () => {
      const mockUser = {
        _id: 'user123',
        tier: 'free',
      };

      // Mock User.findById
      const User = require('@/lib/models/User').default;
      User.findById = jest.fn().mockResolvedValue(mockUser);

      // Mock redis.get
      const { redis } = require('@/lib/cache/redis');
      redis.get = jest.fn().mockResolvedValue('2'); // 已使用2次

      const result = await quotaManager.checkQuota('user123', 'create', 1);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(3); // 免费用户每日5次，已用2次，剩余3次
      expect(result.tier).toBe('free');
    });

    it('应该正确处理配额不足的情况', async () => {
      const mockUser = {
        _id: 'user123',
        tier: 'free',
      };

      const User = require('@/lib/models/User').default;
      User.findById = jest.fn().mockResolvedValue(mockUser);

      const { redis } = require('@/lib/cache/redis');
      redis.get = jest.fn().mockResolvedValue('5'); // 已使用5次，达到上限

      const result = await quotaManager.checkQuota('user123', 'create', 1);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.upgradeRecommended).toBe(true);
    });

    it('应该正确处理无限制配额', async () => {
      const mockUser = {
        _id: 'user123',
        tier: 'pro',
      };

      const User = require('@/lib/models/User').default;
      User.findById = jest.fn().mockResolvedValue(mockUser);

      const result = await quotaManager.checkQuota('user123', 'create', 1);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(-1); // 无限制
      expect(result.tier).toBe('pro');
    });
  });

  describe('配额消费', () => {
    it('应该成功消费配额', async () => {
      const mockUser = {
        _id: 'user123',
        tier: 'free',
      };

      const User = require('@/lib/models/User').default;
      User.findById = jest.fn().mockResolvedValue(mockUser);

      const { redis } = require('@/lib/cache/redis');
      redis.get = jest.fn().mockResolvedValue('1'); // 已使用1次
      redis.increment = jest.fn().mockResolvedValue(2); // 消费后变成2次

      const result = await quotaManager.consumeQuota('user123', 'create', 1);

      expect(result.success).toBe(true);
      expect(result.newUsage).toBe(2);
      expect(result.remaining).toBe(3); // 5-2=3
    });

    it('应该拒绝超出配额的消费', async () => {
      const mockUser = {
        _id: 'user123',
        tier: 'free',
      };

      const User = require('@/lib/models/User').default;
      User.findById = jest.fn().mockResolvedValue(mockUser);

      const { redis } = require('@/lib/cache/redis');
      redis.get = jest.fn().mockResolvedValue('5'); // 已达上限

      const result = await quotaManager.consumeQuota('user123', 'create', 1);

      expect(result.success).toBe(false);
      expect(result.error).toBe('配额不足');
    });
  });

  describe('配额统计', () => {
    it('应该正确获取用户配额状态', async () => {
      const mockUser = {
        _id: 'user123',
        tier: 'basic',
      };

      const User = require('@/lib/models/User').default;
      User.findById = jest.fn().mockResolvedValue(mockUser);

      const { redis } = require('@/lib/cache/redis');
      redis.get = jest.fn()
        .mockResolvedValueOnce('5')  // create usage
        .mockResolvedValueOnce('2')  // reuse usage
        .mockResolvedValueOnce('10') // export usage
        .mockResolvedValueOnce('0');  // graph_nodes usage

      const result = await quotaManager.getUserQuotaStatus('user123');

      expect(result.tier).toBe('basic');
      expect(result.quotas.create.current).toBe(5);
      expect(result.quotas.create.limit).toBe(20); // basic用户限制
      expect(result.quotas.create.remaining).toBe(15);
      expect(result.upgradeRecommended).toBe(false);
    });

    it('应该推荐升级当配额使用率高时', async () => {
      const mockUser = {
        _id: 'user123',
        tier: 'free',
      };

      const User = require('@/lib/models/User').default;
      User.findById = jest.fn().mockResolvedValue(mockUser);

      const { redis } = require('@/lib/cache/redis');
      redis.get = jest.fn()
        .mockResolvedValueOnce('3')  // create usage (100%)
        .mockResolvedValueOnce('1')  // reuse usage (100%)
        .mockResolvedValueOnce('9')  // export usage (90%)
        .mockResolvedValueOnce('45'); // graph_nodes usage (90%)

      const result = await quotaManager.getUserQuotaStatus('user123');

      expect(result.upgradeRecommended).toBe(true);
    });
  });

  describe('配额重置', () => {
    it('应该成功重置用户配额', async () => {
      const { redis } = require('@/lib/cache/redis');
      redis.del = jest.fn().mockResolvedValue(1);

      await quotaManager.resetUserQuota('user123', 'create');

      expect(redis.del).toHaveBeenCalledWith(
        expect.stringContaining('quota:user123:create:'),
      );
    });

    it('应该成功重置所有配额', async () => {
      const { redis } = require('@/lib/cache/redis');
      redis.del = jest.fn().mockResolvedValue(4);

      await quotaManager.resetUserQuota('user123');

      expect(redis.del).toHaveBeenCalledWith(
        expect.stringContaining('quota:user123:create:'),
        expect.stringContaining('quota:user123:reuse:'),
        expect.stringContaining('quota:user123:export:'),
        expect.stringContaining('quota:user123:graph_nodes:'),
      );
    });
  });

  describe('批量操作', () => {
    it('应该正确处理批量配额检查', async () => {
      const mockUser = {
        _id: 'user123',
        tier: 'basic',
      };

      const User = require('@/lib/models/User').default;
      User.findById = jest.fn().mockResolvedValue(mockUser);

      const { redis } = require('@/lib/cache/redis');
      redis.get = jest.fn()
        .mockResolvedValueOnce('5')  // create usage
        .mockResolvedValueOnce('2');  // reuse usage

      const requests = [
        { userId: 'user123', quotaType: 'create', amount: 1 },
        { userId: 'user123', quotaType: 'reuse', amount: 1 },
      ];

      const results = await quotaManager.batchCheckQuota(requests);

      expect(results).toHaveLength(2);
      expect(results[0].allowed).toBe(true);
      expect(results[0].quotaType).toBe('create');
      expect(results[1].allowed).toBe(true);
      expect(results[1].quotaType).toBe('reuse');
    });
  });

  describe('健康检查', () => {
    it('应该通过健康检查', async () => {
      const mockUser = {
        _id: 'health_check_user',
        tier: 'free',
      };

      const User = require('@/lib/models/User').default;
      User.findById = jest.fn().mockResolvedValue(mockUser);

      const { redis } = require('@/lib/cache/redis');
      redis.get = jest.fn().mockResolvedValue('0');

      const result = await quotaManager.healthCheck();

      expect(result).toBe(true);
    });

    it('应该处理健康检查失败', async () => {
      const User = require('@/lib/models/User').default;
      User.findById = jest.fn().mockRejectedValue(new Error('Database error'));

      const result = await quotaManager.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('配额限制管理', () => {
    it('应该正确更新配额限制', () => {
      const newLimits = {
        dailyCreateQuota: 50,
        dailyReuseQuota: 20,
      };

      quotaManager.updateQuotaLimits('basic', newLimits);

      const limits = quotaManager.getQuotaLimits();
      expect(limits.basic.dailyCreateQuota).toBe(50);
      expect(limits.basic.dailyReuseQuota).toBe(20);
    });

    it('应该返回当前配额限制', () => {
      const limits = quotaManager.getQuotaLimits();

      expect(limits).toHaveProperty('free');
      expect(limits).toHaveProperty('basic');
      expect(limits).toHaveProperty('pro');
      expect(limits).toHaveProperty('admin');

      expect(limits.free.dailyCreateQuota).toBe(3);
      expect(limits.basic.dailyCreateQuota).toBe(20);
      expect(limits.pro.dailyCreateQuota).toBe(100);
      expect(limits.admin.dailyCreateQuota).toBe(-1);
    });
  });

  describe('错误处理', () => {
    it('应该处理用户不存在的情况', async () => {
      const User = require('@/lib/models/User').default;
      User.findById = jest.fn().mockResolvedValue(null);

      const result = await quotaManager.checkQuota('nonexistent', 'create', 1);

      expect(result.allowed).toBe(true); // 默认允许，避免阻塞
      expect(result.tier).toBe('free');
    });

    it('应该处理Redis错误', async () => {
      const mockUser = {
        _id: 'user123',
        tier: 'free',
      };

      const User = require('@/lib/models/User').default;
      User.findById = jest.fn().mockResolvedValue(mockUser);

      const { redis } = require('@/lib/cache/redis');
      redis.get = jest.fn().mockRejectedValue(new Error('Redis error'));

      const result = await quotaManager.checkQuota('user123', 'create', 1);

      expect(result.allowed).toBe(true); // 默认允许
    });
  });
});
