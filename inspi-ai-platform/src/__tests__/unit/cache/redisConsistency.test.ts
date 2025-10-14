/**
 * Redis缓存一致性测试
 * 测试Redis缓存操作的数据一致性和正确性
 */

import { redis } from '@/lib/cache/redis';
import { redisManager } from '@/lib/cache/simple-redis';

// Mock dependencies
jest.mock('@/lib/cache/simple-redis');
jest.mock('@/lib/utils/logger');

describe('Redis Cache Consistency Tests', () => {
  let mockRedisManager: jest.Mocked<typeof redisManager>;
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisManager = redisManager as jest.Mocked<typeof redisManager>;

    // Mock Redis client
    mockClient = {
      get: jest.fn(),
      set: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      incr: jest.fn(),
      decr: jest.fn(),
      expire: jest.fn(),
      exists: jest.fn(),
      ttl: jest.fn(),
      keys: jest.fn(),
      flushdb: jest.fn(),
    };

    mockRedisManager.getClient.mockReturnValue(mockClient);
    mockRedisManager.isReady.mockReturnValue(true);
    mockRedisManager.get.mockImplementation((key) => mockClient.get(key));
    mockRedisManager.set.mockImplementation((key, value, ttl) => {
      if (ttl) {
        return mockClient.setex(key, ttl, value);
      }
      return mockClient.set(key, value);
    });
    mockRedisManager.del.mockImplementation((key) => mockClient.del(key));
  });

  describe('基本缓存操作一致性', () => {
    it('应该正确处理字符串缓存的设置和获取', async () => {
      // Arrange
      const key = 'test:string';
      const value = 'test value';

      mockClient.get.mockResolvedValue(value);
      mockClient.set.mockResolvedValue('OK');

      // Act
      await redis.set(key, value);
      const result = await redis.get(key);

      // Assert
      expect(result).toBe(value);
      expect(mockClient.set).toHaveBeenCalledWith('inspi:test:string', value);
      expect(mockClient.get).toHaveBeenCalledWith('inspi:test:string');
    });

    it('应该正确处理带TTL的缓存设置', async () => {
      // Arrange
      const key = 'test:ttl';
      const value = 'ttl value';
      const ttl = 3600;

      mockClient.setex.mockResolvedValue('OK');

      // Act
      await redis.set(key, value, { ttl });

      // Assert
      expect(mockClient.setex).toHaveBeenCalledWith('inspi:test:ttl', ttl, value);
    });

    it('应该正确处理缓存删除操作', async () => {
      // Arrange
      const key = 'test:delete';

      mockClient.del.mockResolvedValue(1);

      // Act
      await redis.del(key);

      // Assert
      expect(mockClient.del).toHaveBeenCalledWith('inspi:test:delete');
    });

    it('应该正确处理缓存键的存在性检查', async () => {
      // Arrange
      const existingKey = 'test:exists';
      const nonExistingKey = 'test:not-exists';

      mockClient.get
        .mockResolvedValueOnce('exists')
        .mockResolvedValueOnce(null);

      // Act
      const exists = await redis.exists(existingKey);
      const notExists = await redis.exists(nonExistingKey);

      // Assert
      expect(exists).toBe(true);
      expect(notExists).toBe(false);
    });
  });

  describe('JSON缓存操作一致性', () => {
    it('应该正确序列化和反序列化JSON对象', async () => {
      // Arrange
      const key = 'test:json';
      const jsonObject = {
        id: 123,
        name: 'Test Object',
        data: {
          nested: true,
          array: [1, 2, 3],
        },
      };

      const serializedValue = JSON.stringify(jsonObject);
      mockClient.set.mockResolvedValue('OK');
      mockClient.get.mockResolvedValue(serializedValue);

      // Act
      await redis.setJSON(key, jsonObject);
      const result = await redis.getJSON(key);

      // Assert
      expect(result).toEqual(jsonObject);
      expect(mockClient.set).toHaveBeenCalledWith('inspi:test:json', serializedValue);
    });

    it('应该处理JSON序列化错误', async () => {
      // Arrange
      const key = 'test:invalid-json';
      const circularObject: any = { name: 'circular' };
      circularObject.self = circularObject; // 创建循环引用

      // Act
      await redis.setJSON(key, circularObject);

      // Assert
      // 应该优雅处理序列化错误，不抛出异常
      expect(mockClient.set).not.toHaveBeenCalled();
    });

    it('应该处理JSON反序列化错误', async () => {
      // Arrange
      const key = 'test:invalid-json-string';
      const invalidJson = '{ invalid json }';

      mockClient.get.mockResolvedValue(invalidJson);

      // Act
      const result = await redis.getJSON(key);

      // Assert
      expect(result).toBeNull();
    });

    it('应该正确处理复杂的嵌套JSON结构', async () => {
      // Arrange
      const key = 'test:complex-json';
      const complexObject = {
        users: [
          { id: 1, name: 'User 1', roles: ['admin', 'user'] },
          { id: 2, name: 'User 2', roles: ['user'] },
        ],
        metadata: {
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          config: {
            enabled: true,
            settings: {
              theme: 'dark',
              language: 'zh-CN',
            },
          },
        },
      };

      const serializedValue = JSON.stringify(complexObject);
      mockClient.set.mockResolvedValue('OK');
      mockClient.get.mockResolvedValue(serializedValue);

      // Act
      await redis.setJSON(key, complexObject);
      const result = await redis.getJSON(key);

      // Assert
      expect(result).toEqual(complexObject);
      expect(result?.users).toHaveLength(2);
      expect(result?.metadata.config.settings.theme).toBe('dark');
    });
  });

  describe('数值操作一致性', () => {
    it('应该正确处理递增操作', async () => {
      // Arrange
      const key = 'test:counter';
      const initialValue = 5;
      const incrementedValue = 6;

      mockClient.incr.mockResolvedValue(incrementedValue);

      // Act
      const result = await redis.increment(key);

      // Assert
      expect(result).toBe(incrementedValue);
      expect(mockClient.incr).toHaveBeenCalledWith('inspi:test:counter');
    });

    it('应该正确处理递减操作', async () => {
      // Arrange
      const key = 'test:counter';
      const decrementedValue = 4;

      mockClient.decr.mockResolvedValue(decrementedValue);

      // Act
      const result = await redis.decrement(key);

      // Assert
      expect(result).toBe(decrementedValue);
      expect(mockClient.decr).toHaveBeenCalledWith('inspi:test:counter');
    });

    it('应该在递增时正确设置TTL', async () => {
      // Arrange
      const key = 'test:counter-ttl';
      const ttl = 1800;

      mockClient.incr.mockResolvedValue(1);
      mockClient.expire.mockResolvedValue(1);

      // Act
      await redis.increment(key, { ttl });

      // Assert
      expect(mockClient.incr).toHaveBeenCalledWith('inspi:test:counter-ttl');
      expect(mockClient.expire).toHaveBeenCalledWith('inspi:test:counter-ttl', ttl);
    });

    it('应该处理多次递增操作的一致性', async () => {
      // Arrange
      const key = 'test:multi-increment';
      let currentValue = 0;

      mockClient.incr.mockImplementation(() => {
        currentValue++;
        return Promise.resolve(currentValue);
      });

      // Act
      const results = [];
      for (let i = 0; i < 5; i++) {
        const result = await redis.increment(key);
        results.push(result);
      }

      // Assert
      expect(results).toEqual([1, 2, 3, 4, 5]);
      expect(mockClient.incr).toHaveBeenCalledTimes(5);
    });
  });

  describe('键前缀一致性', () => {
    it('应该使用默认前缀', async () => {
      // Arrange
      const key = 'test-key';
      const value = 'test-value';

      mockClient.set.mockResolvedValue('OK');

      // Act
      await redis.set(key, value);

      // Assert
      expect(mockClient.set).toHaveBeenCalledWith('inspi:test-key', value);
    });

    it('应该使用自定义前缀', async () => {
      // Arrange
      const key = 'test-key';
      const value = 'test-value';
      const customPrefix = 'custom:';

      mockClient.set.mockResolvedValue('OK');

      // Act
      await redis.set(key, value, { prefix: customPrefix });

      // Assert
      expect(mockClient.set).toHaveBeenCalledWith('custom:test-key', value);
    });

    it('应该在所有操作中保持前缀一致性', async () => {
      // Arrange
      const key = 'consistency-key';
      const value = 'consistency-value';
      const prefix = 'test:';

      mockClient.set.mockResolvedValue('OK');
      mockClient.get.mockResolvedValue(value);
      mockClient.del.mockResolvedValue(1);

      // Act
      await redis.set(key, value, { prefix });
      await redis.get(key, { prefix });
      await redis.del(key, { prefix });

      // Assert
      expect(mockClient.set).toHaveBeenCalledWith('test:consistency-key', value);
      expect(mockClient.get).toHaveBeenCalledWith('test:consistency-key');
      expect(mockClient.del).toHaveBeenCalledWith('test:consistency-key');
    });

    it('应该处理空前缀', async () => {
      // Arrange
      const key = 'no-prefix-key';
      const value = 'no-prefix-value';

      mockClient.set.mockResolvedValue('OK');

      // Act
      await redis.set(key, value, { prefix: '' });

      // Assert
      expect(mockClient.set).toHaveBeenCalledWith('no-prefix-key', value);
    });
  });

  describe('错误处理一致性', () => {
    it('应该在Redis不可用时返回一致的默认值', async () => {
      // Arrange
      mockRedisManager.isReady.mockReturnValue(false);

      // Act
      const getValue = await redis.get('test-key');
      const getJsonValue = await redis.getJSON('test-json-key');
      const existsValue = await redis.exists('test-exists-key');
      const incrementValue = await redis.increment('test-increment-key');
      const decrementValue = await redis.decrement('test-decrement-key');

      // Assert
      expect(getValue).toBeNull();
      expect(getJsonValue).toBeNull();
      expect(existsValue).toBe(false);
      expect(incrementValue).toBe(0);
      expect(decrementValue).toBe(0);
    });

    it('应该在操作失败时保持数据一致性', async () => {
      // Arrange
      const key = 'error-key';
      const value = 'error-value';

      mockClient.set.mockRejectedValue(new Error('Redis connection failed'));
      mockClient.get.mockRejectedValue(new Error('Redis connection failed'));

      // Act
      await redis.set(key, value);
      const result = await redis.get(key);

      // Assert
      expect(result).toBeNull(); // 应该返回null而不是抛出异常
    });

    it('应该在JSON操作失败时保持一致性', async () => {
      // Arrange
      const key = 'json-error-key';
      const value = { test: 'value' };

      mockClient.set.mockRejectedValue(new Error('Redis error'));
      mockClient.get.mockRejectedValue(new Error('Redis error'));

      // Act
      await redis.setJSON(key, value);
      const result = await redis.getJSON(key);

      // Assert
      expect(result).toBeNull();
    });

    it('应该在数值操作失败时返回一致的默认值', async () => {
      // Arrange
      const key = 'numeric-error-key';

      mockClient.incr.mockRejectedValue(new Error('Redis error'));
      mockClient.decr.mockRejectedValue(new Error('Redis error'));

      // Act
      const incrementResult = await redis.increment(key);
      const decrementResult = await redis.decrement(key);

      // Assert
      expect(incrementResult).toBe(0);
      expect(decrementResult).toBe(0);
    });
  });

  describe('并发操作一致性', () => {
    it('应该正确处理并发的设置和获取操作', async () => {
      // Arrange
      const baseKey = 'concurrent-test';
      const operations = 10;

      mockClient.set.mockResolvedValue('OK');
      mockClient.get.mockImplementation((key) => {
        const keyParts = key.split(':');
        const index = keyParts[keyParts.length - 1];
        return Promise.resolve(`value-${index}`);
      });

      // Act
      const setPromises = Array.from({ length: operations }, (_, i) =>
        redis.set(`${baseKey}:${i}`, `value-${i}`),
      );

      const getPromises = Array.from({ length: operations }, (_, i) =>
        redis.get(`${baseKey}:${i}`),
      );

      await Promise.all(setPromises);
      const results = await Promise.all(getPromises);

      // Assert
      expect(results).toHaveLength(operations);
      results.forEach((result, index) => {
        expect(result).toBe(`value-${index}`);
      });
    });

    it('应该正确处理并发的JSON操作', async () => {
      // Arrange
      const baseKey = 'concurrent-json';
      const operations = 5;

      mockClient.set.mockResolvedValue('OK');
      mockClient.get.mockImplementation((key) => {
        const keyParts = key.split(':');
        const index = keyParts[keyParts.length - 1];
        return Promise.resolve(JSON.stringify({ id: parseInt(index, 10), name: `Object ${index}` }));
      });

      // Act
      const setPromises = Array.from({ length: operations }, (_, i) =>
        redis.setJSON(`${baseKey}:${i}`, { id: i, name: `Object ${i}` }),
      );

      const getPromises = Array.from({ length: operations }, (_, i) =>
        redis.getJSON(`${baseKey}:${i}`),
      );

      await Promise.all(setPromises);
      const results = await Promise.all(getPromises);

      // Assert
      expect(results).toHaveLength(operations);
      results.forEach((result, index) => {
        expect(result).toEqual({ id: index, name: `Object ${index}` });
      });
    });

    it('应该正确处理并发的数值操作', async () => {
      // Arrange
      const key = 'concurrent-counter';
      const operations = 20;
      let currentValue = 0;

      mockClient.incr.mockImplementation(() => {
        currentValue++;
        return Promise.resolve(currentValue);
      });

      // Act
      const promises = Array.from({ length: operations }, () =>
        redis.increment(key),
      );

      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(operations);
      expect(Math.max(...results)).toBe(operations);
      expect(mockClient.incr).toHaveBeenCalledTimes(operations);
    });
  });

  describe('数据类型一致性', () => {
    it('应该正确处理不同数据类型的存储和检索', async () => {
      // Arrange
      const testCases = [
        { key: 'string', value: 'simple string' },
        { key: 'number', value: '12345' },
        { key: 'boolean', value: 'true' },
        { key: 'json', value: JSON.stringify({ complex: 'object' }) },
        { key: 'array', value: JSON.stringify([1, 2, 3, 4, 5]) },
        { key: 'empty', value: '' },
        { key: 'unicode', value: '你好世界 🌍' },
      ];

      mockClient.set.mockResolvedValue('OK');
      mockClient.get.mockImplementation((key) => {
        const testCase = testCases.find(tc => key.includes(tc.key));
        return Promise.resolve(testCase ? testCase.value : null);
      });

      // Act & Assert
      for (const testCase of testCases) {
        await redis.set(testCase.key, testCase.value);
        const result = await redis.get(testCase.key);
        expect(result).toBe(testCase.value);
      }
    });

    it('应该保持特殊字符的完整性', async () => {
      // Arrange
      const specialChars = [
        'newline\ncharacter',
        'tab\tcharacter',
        'quote"character',
        "apostrophe'character",
        'backslash\\character',
        'unicode\u0000null',
        'emoji😀test',
      ];

      mockClient.set.mockResolvedValue('OK');
      mockClient.get.mockImplementation((key) => {
        const index = parseInt(key.split(':', 10).pop() || '0', 10);
        return Promise.resolve(specialChars[index]);
      });

      // Act & Assert
      for (let i = 0; i < specialChars.length; i++) {
        const key = `special:${i}`;
        const value = specialChars[i];

        await redis.set(key, value);
        const result = await redis.get(key);

        expect(result).toBe(value);
      }
    });

    it('应该正确处理大数据量的一致性', async () => {
      // Arrange
      const largeString = 'x'.repeat(10000); // 10KB string
      const largeObject = {
        data: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          description: `Description for item ${i}`.repeat(10),
        })),
      };

      mockClient.set.mockResolvedValue('OK');
      mockClient.get
        .mockResolvedValueOnce(largeString)
        .mockResolvedValueOnce(JSON.stringify(largeObject));

      // Act
      await redis.set('large-string', largeString);
      await redis.setJSON('large-object', largeObject);

      const stringResult = await redis.get('large-string');
      const objectResult = await redis.getJSON('large-object');

      // Assert
      expect(stringResult).toBe(largeString);
      expect(objectResult).toEqual(largeObject);
      expect(objectResult?.data).toHaveLength(1000);
    });
  });
});
