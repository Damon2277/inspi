/**
 * @jest-environment node
 */
import { DatabaseUtils, CacheUtils } from '@/lib/db-utils';

// Mock dependencies
jest.mock('@/lib/mongodb', () => jest.fn().mockResolvedValue({}));
jest.mock('@/lib/redis', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('mongoose', () => ({
  connection: {
    readyState: 1,
    close: jest.fn(),
  },
  startSession: jest.fn(),
}));

describe('DatabaseUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ensureConnection', () => {
    it('should call connectDB', async () => {
      const connectDB = require('@/lib/mongodb');
      await DatabaseUtils.ensureConnection();
      expect(connectDB).toHaveBeenCalled();
    });
  });

  describe('isMongoConnected', () => {
    it('should return true when connected', () => {
      const mongoose = require('mongoose');
      mongoose.connection.readyState = 1;

      expect(DatabaseUtils.isMongoConnected()).toBe(true);
    });

    it('should return false when not connected', () => {
      const mongoose = require('mongoose');
      mongoose.connection.readyState = 0;

      expect(DatabaseUtils.isMongoConnected()).toBe(false);
    });
  });

  describe('healthCheck', () => {
    it('should return health status', async () => {
      const getRedisClient = require('@/lib/redis').default;
      const mockClient = {
        ping: jest.fn().mockResolvedValue('PONG'),
      };
      getRedisClient.mockResolvedValue(mockClient);

      const health = await DatabaseUtils.healthCheck();

      expect(health).toHaveProperty('mongodb');
      expect(health).toHaveProperty('redis');
      expect(health).toHaveProperty('timestamp');
      expect(health.timestamp).toBeInstanceOf(Date);
    });
  });
});

describe('CacheUtils', () => {
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {
      set: jest.fn(),
      setEx: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      expire: jest.fn(),
      keys: jest.fn(),
      flushAll: jest.fn(),
    };

    const getRedisClient = require('@/lib/redis').default;
    getRedisClient.mockResolvedValue(mockClient);
  });

  describe('set', () => {
    it('should set cache without TTL', async () => {
      const testData = { key: 'value' };
      await CacheUtils.set('test-key', testData);

      expect(mockClient.set).toHaveBeenCalledWith('test-key', JSON.stringify(testData));
    });

    it('should set cache with TTL', async () => {
      const testData = { key: 'value' };
      await CacheUtils.set('test-key', testData, 3600);

      expect(mockClient.setEx).toHaveBeenCalledWith('test-key', 3600, JSON.stringify(testData));
    });
  });

  describe('get', () => {
    it('should get and parse cached data', async () => {
      const testData = { key: 'value' };
      mockClient.get.mockResolvedValue(JSON.stringify(testData));

      const result = await CacheUtils.get('test-key');

      expect(mockClient.get).toHaveBeenCalledWith('test-key');
      expect(result).toEqual(testData);
    });

    it('should return null for non-existent key', async () => {
      mockClient.get.mockResolvedValue(null);

      const result = await CacheUtils.get('non-existent-key');

      expect(result).toBeNull();
    });
  });

  describe('del', () => {
    it('should delete cache key', async () => {
      await CacheUtils.del('test-key');

      expect(mockClient.del).toHaveBeenCalledWith('test-key');
    });
  });

  describe('exists', () => {
    it('should return true if key exists', async () => {
      mockClient.exists.mockResolvedValue(1);

      const result = await CacheUtils.exists('test-key');

      expect(result).toBe(true);
    });

    it('should return false if key does not exist', async () => {
      mockClient.exists.mockResolvedValue(0);

      const result = await CacheUtils.exists('test-key');

      expect(result).toBe(false);
    });
  });
});
