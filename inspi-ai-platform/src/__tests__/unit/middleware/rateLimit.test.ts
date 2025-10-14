/**
 * 限流中间件测试
 */

import { NextRequest } from 'next/server';

import { rateLimitMiddleware, createRateLimiter, RateLimitConfig } from '@/lib/middleware/rateLimit';

// Mock Redis
const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
};

jest.mock('@/lib/redis', () => ({
  getRedisClient: jest.fn(() => mockRedis),
}));

// Mock IP获取工具
jest.mock('@/lib/utils/ip', () => ({
  getClientIP: jest.fn((request) => {
    const forwarded = request.headers.get('x-forwarded-for');
    return forwarded || '127.0.0.1';
  }),
}));

describe('限流中间件测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // 默认Redis返回值
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue('OK');
    mockRedis.incr.mockResolvedValue(1);
    mockRedis.expire.mockResolvedValue(1);
    mockRedis.exists.mockResolvedValue(0);
  });

  describe('createRateLimiter', () => {
    test('应该创建基本限流器', () => {
      const config: RateLimitConfig = {
        windowMs: 60000, // 1分钟
        maxRequests: 10,
        keyGenerator: (req) => `basic:${req.ip}`,
      };

      const limiter = createRateLimiter(config);

      expect(limiter).toBeDefined();
      expect(typeof limiter).toBe('function');
    });

    test('应该使用默认配置', () => {
      const limiter = createRateLimiter({});

      expect(limiter).toBeDefined();
    });

    test('应该支持自定义键生成器', () => {
      const customKeyGenerator = jest.fn((req) => `custom:${req.headers.get('user-id')}`);

      const config: RateLimitConfig = {
        keyGenerator: customKeyGenerator,
      };

      const limiter = createRateLimiter(config);
      expect(limiter).toBeDefined();
    });
  });

  describe('rateLimitMiddleware', () => {
    test('应该允许在限制内的请求', async () => {
      const request = createMockNextRequest('GET', '/api/test');

      // 模拟Redis返回当前计数为1（在限制内）
      mockRedis.incr.mockResolvedValueOnce(1);

      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 10,
      };

      const result = await rateLimitMiddleware(request, config);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9); // 10 - 1
      expect(result.resetTime).toBeDefined();
      expect(mockRedis.incr).toHaveBeenCalled();
      expect(mockRedis.expire).toHaveBeenCalled();
    });

    test('应该拒绝超出限制的请求', async () => {
      const request = createMockNextRequest('GET', '/api/test');

      // 模拟Redis返回当前计数为11（超出限制）
      mockRedis.incr.mockResolvedValueOnce(11);

      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 10,
      };

      const result = await rateLimitMiddleware(request, config);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeDefined();
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    test('应该根据IP地址限流', async () => {
      const request1 = createMockNextRequest('GET', '/api/test', {
        headers: { 'x-forwarded-for': '192.168.1.1' },
      });
      const request2 = createMockNextRequest('GET', '/api/test', {
        headers: { 'x-forwarded-for': '192.168.1.2' },
      });

      mockRedis.incr.mockResolvedValue(1);

      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 10,
        keyGenerator: (req) => `ip:${req.headers.get('x-forwarded-for')}`,
      };

      await rateLimitMiddleware(request1, config);
      await rateLimitMiddleware(request2, config);

      // 应该为不同IP生成不同的键
      expect(mockRedis.incr).toHaveBeenCalledWith('ip:192.168.1.1');
      expect(mockRedis.incr).toHaveBeenCalledWith('ip:192.168.1.2');
    });

    test('应该根据用户ID限流', async () => {
      const request = createMockNextRequest('GET', '/api/test', {
        headers: { 'authorization': 'Bearer test-token' },
      });

      mockRedis.incr.mockResolvedValue(1);

      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 100, // 认证用户更高限制
        keyGenerator: (req) => {
          const auth = req.headers.get('authorization');
          if (auth) {
            return `user:${auth.replace('Bearer ', '')}`;
          }
          return `ip:${req.ip}`;
        },
      };

      const result = await rateLimitMiddleware(request, config);

      expect(result.allowed).toBe(true);
      expect(mockRedis.incr).toHaveBeenCalledWith('user:test-token');
    });

    test('应该支持不同的时间窗口', async () => {
      const request = createMockNextRequest('GET', '/api/test');

      mockRedis.incr.mockResolvedValue(1);

      const configs = [
        { windowMs: 1000, maxRequests: 5 },   // 1秒5次
        { windowMs: 60000, maxRequests: 100 }, // 1分钟100次
        { windowMs: 3600000, maxRequests: 1000 }, // 1小时1000次
      ];

      for (const config of configs) {
        const result = await rateLimitMiddleware(request, config);
        expect(result.allowed).toBe(true);

        // 验证过期时间设置
        expect(mockRedis.expire).toHaveBeenCalledWith(
          expect.any(String),
          Math.ceil(config.windowMs / 1000),
        );
      }
    });

    test('应该处理Redis错误', async () => {
      const request = createMockNextRequest('GET', '/api/test');

      // 模拟Redis错误
      mockRedis.incr.mockRejectedValueOnce(new Error('Redis connection failed'));

      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 10,
        skipOnError: true, // 出错时跳过限流
      };

      const result = await rateLimitMiddleware(request, config);

      expect(result.allowed).toBe(true); // 应该允许请求通过
      expect(result.error).toBeDefined();
    });

    test('应该支持跳过某些请求', async () => {
      const request = createMockNextRequest('GET', '/api/health');

      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 10,
        skip: (req) => req.url.includes('/health'), // 跳过健康检查
      };

      const result = await rateLimitMiddleware(request, config);

      expect(result.allowed).toBe(true);
      expect(result.skipped).toBe(true);
      expect(mockRedis.incr).not.toHaveBeenCalled();
    });

    test('应该支持自定义响应头', async () => {
      const request = createMockNextRequest('GET', '/api/test');

      mockRedis.incr.mockResolvedValue(5);

      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 10,
        headers: {
          'X-Custom-Limit': '10',
          'X-Custom-Window': '60',
        },
      };

      const result = await rateLimitMiddleware(request, config);

      expect(result.headers).toEqual(
        expect.objectContaining({
          'X-Custom-Limit': '10',
          'X-Custom-Window': '60',
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': '5',
        }),
      );
    });

    test('应该支持动态限制', async () => {
      const request = createMockNextRequest('POST', '/api/upload');

      mockRedis.incr.mockResolvedValue(1);

      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: (req) => {
          // 上传接口更严格的限制
          if (req.url.includes('/upload')) {
            return 5;
          }
          return 100;
        },
      };

      const result = await rateLimitMiddleware(request, config);

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(5);
      expect(result.remaining).toBe(4);
    });

    test('应该处理分布式限流', async () => {
      const request = createMockNextRequest('GET', '/api/test');

      // 模拟分布式环境下的计数
      mockRedis.incr.mockResolvedValue(8);
      mockRedis.get.mockResolvedValue('7'); // 之前的计数

      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 10,
        distributed: true,
      };

      const result = await rateLimitMiddleware(request, config);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2); // 10 - 8
    });

    test('应该支持白名单', async () => {
      const request = createMockNextRequest('GET', '/api/test', {
        headers: { 'x-forwarded-for': '127.0.0.1' },
      });

      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 10,
        whitelist: ['127.0.0.1', '::1'], // 本地IP白名单
      };

      const result = await rateLimitMiddleware(request, config);

      expect(result.allowed).toBe(true);
      expect(result.whitelisted).toBe(true);
      expect(mockRedis.incr).not.toHaveBeenCalled();
    });

    test('应该支持黑名单', async () => {
      const request = createMockNextRequest('GET', '/api/test', {
        headers: { 'x-forwarded-for': '192.168.1.100' },
      });

      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 10,
        blacklist: ['192.168.1.100'], // 黑名单IP
      };

      const result = await rateLimitMiddleware(request, config);

      expect(result.allowed).toBe(false);
      expect(result.blacklisted).toBe(true);
      expect(mockRedis.incr).not.toHaveBeenCalled();
    });
  });

  describe('高级功能测试', () => {
    test('应该支持滑动窗口限流', async () => {
      const request = createMockNextRequest('GET', '/api/test');

      // 模拟滑动窗口数据
      const now = Date.now();
      const windowData = [
        now - 30000, // 30秒前
        now - 20000, // 20秒前
        now - 10000, // 10秒前
      ];

      mockRedis.get.mockResolvedValue(JSON.stringify(windowData));

      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 10,
        algorithm: 'sliding-window',
      };

      const result = await rateLimitMiddleware(request, config);

      expect(result.allowed).toBe(true);
      expect(result.windowData).toBeDefined();
    });

    test('应该支持令牌桶算法', async () => {
      const request = createMockNextRequest('GET', '/api/test');

      // 模拟令牌桶状态
      const bucketState = {
        tokens: 8,
        lastRefill: Date.now() - 10000, // 10秒前
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(bucketState));

      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 10,
        algorithm: 'token-bucket',
        refillRate: 1, // 每秒补充1个令牌
      };

      const result = await rateLimitMiddleware(request, config);

      expect(result.allowed).toBe(true);
      expect(result.tokens).toBeDefined();
    });

    test('应该支持漏桶算法', async () => {
      const request = createMockNextRequest('GET', '/api/test');

      // 模拟漏桶状态
      const bucketState = {
        volume: 5,
        lastLeak: Date.now() - 5000, // 5秒前
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(bucketState));

      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 10,
        algorithm: 'leaky-bucket',
        leakRate: 2, // 每秒漏出2个请求
      };

      const result = await rateLimitMiddleware(request, config);

      expect(result.allowed).toBe(true);
      expect(result.volume).toBeDefined();
    });

    test('应该支持自适应限流', async () => {
      const request = createMockNextRequest('GET', '/api/test');

      // 模拟系统负载数据
      mockRedis.get.mockResolvedValue(JSON.stringify({
        cpuUsage: 0.8, // 80% CPU使用率
        memoryUsage: 0.7, // 70% 内存使用率
        responseTime: 500, // 500ms响应时间
      }));

      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 100,
        adaptive: true,
        loadThreshold: 0.75, // 75%负载阈值
      };

      const result = await rateLimitMiddleware(request, config);

      // 高负载时应该降低限制
      expect(result.adaptiveLimit).toBeLessThan(100);
    });
  });

  describe('性能测试', () => {
    test('应该快速处理请求', async () => {
      const request = createMockNextRequest('GET', '/api/test');

      mockRedis.incr.mockResolvedValue(1);

      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 10,
      };

      const startTime = Date.now();
      await rateLimitMiddleware(request, config);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // 100ms内完成
    });

    test('应该处理并发请求', async () => {
      const requests = Array(10).fill(null).map(() =>
        createMockNextRequest('GET', '/api/test'),
      );

      mockRedis.incr.mockImplementation(() =>
        Promise.resolve(Math.floor(Math.random() * 5) + 1),
      );

      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 10,
      };

      const promises = requests.map(req => rateLimitMiddleware(req, config));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toHaveProperty('allowed');
        expect(result).toHaveProperty('remaining');
      });
    });

    test('应该处理大量键', async () => {
      const requests = Array(1000).fill(null).map((_, i) =>
        createMockNextRequest('GET', '/api/test', {
          headers: { 'x-forwarded-for': `192.168.1.${i % 255}` },
        }),
      );

      mockRedis.incr.mockResolvedValue(1);

      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 10,
      };

      const startTime = Date.now();
      const promises = requests.slice(0, 100).map(req =>
        rateLimitMiddleware(req, config),
      );
      await Promise.all(promises);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // 1秒内完成100个请求
    });
  });

  describe('边界情况和错误处理', () => {
    test('应该处理无效配置', () => {
      expect(() => {
        createRateLimiter({
          windowMs: -1000, // 负数窗口
          maxRequests: 0,   // 零限制
        });
      }).toThrow('Invalid rate limit configuration');
    });

    test('应该处理Redis连接失败', async () => {
      const request = createMockNextRequest('GET', '/api/test');

      mockRedis.incr.mockRejectedValue(new Error('Connection refused'));

      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 10,
        skipOnError: false, // 不跳过错误
      };

      await expect(rateLimitMiddleware(request, config)).rejects.toThrow();
    });

    test('应该处理Redis数据损坏', async () => {
      const request = createMockNextRequest('GET', '/api/test');

      mockRedis.get.mockResolvedValue('invalid-json-data');

      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 10,
        algorithm: 'sliding-window',
      };

      const result = await rateLimitMiddleware(request, config);

      // 应该重置为默认状态
      expect(result.allowed).toBe(true);
      expect(result.reset).toBe(true);
    });

    test('应该处理时钟偏移', async () => {
      const request = createMockNextRequest('GET', '/api/test');

      // 模拟未来时间戳
      const futureTime = Date.now() + 3600000; // 1小时后
      mockRedis.get.mockResolvedValue(JSON.stringify({
        lastUpdate: futureTime,
        count: 5,
      }));

      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 10,
      };

      const result = await rateLimitMiddleware(request, config);

      // 应该重置计数器
      expect(result.allowed).toBe(true);
      expect(result.clockSkewDetected).toBe(true);
    });

    test('应该处理内存不足', async () => {
      const request = createMockNextRequest('GET', '/api/test');

      mockRedis.incr.mockRejectedValue(new Error('OOM command not allowed'));

      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 10,
        fallbackToMemory: true,
      };

      const result = await rateLimitMiddleware(request, config);

      expect(result.allowed).toBe(true);
      expect(result.fallback).toBe('memory');
    });
  });
});
