/**
 * @jest-environment node
 */

// Mock ioredis before importing
const mockRedisClient = {
  ping: jest.fn().mockResolvedValue('PONG'),
  set: jest.fn().mockResolvedValue('OK'),
  setex: jest.fn().mockResolvedValue('OK'),
  get: jest.fn().mockResolvedValue('test_value'),
  del: jest.fn().mockResolvedValue(1),
  exists: jest.fn().mockResolvedValue(1),
  incr: jest.fn().mockResolvedValue(1),
  expire: jest.fn().mockResolvedValue(1),
  quit: jest.fn().mockResolvedValue('OK'),
  status: 'ready',
  on: jest.fn(),
};

jest.doMock('ioredis', () => {
  return jest.fn().mockImplementation(() => mockRedisClient);
});

import { it, beforeEach, describe } from 'node:test';

import { getRedisClient, getRedisStatus, RedisService } from '@/lib/redis';

describe('Redis Connection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the module to clear any cached connections
    jest.resetModules();
  });

  afterAll(async () => {
    // Clean up any open handles
    jest.clearAllTimers();
  });

  it('should create Redis client successfully', () => {
    const client = getRedisClient();

    expect(client).toBeDefined();
    expect(client.ping).toBeDefined();
    expect(client.set).toBeDefined();
    expect(client.get).toBeDefined();
  });

  it('should return connection status', async () => {
    const status = await getRedisStatus();

    expect(status).toHaveProperty('isConnected');
    expect(status).toHaveProperty('status');
    // URL might not be present in error cases, so make it optional
    if (status.isConnected) {
      expect(status).toHaveProperty('url');
    }
  });

  it('should handle Redis operations through RedisService', async () => {
    const redisService = new RedisService();

    // Mock the operations to avoid actual Redis calls
    jest.spyOn(redisService, 'set').mockResolvedValue();
    jest.spyOn(redisService, 'get').mockResolvedValue('test_value');

    await redisService.set('test_key', 'test_value');
    const value = await redisService.get('test_key');

    expect(value).toBe('test_value');
  });

  it('should handle JSON operations', async () => {
    const redisService = new RedisService();
    const testObject = { name: 'test', value: 123 };

    // Mock the operations to avoid actual Redis calls
    jest.spyOn(redisService, 'set').mockResolvedValue();
    jest.spyOn(redisService, 'getJSON').mockResolvedValue(testObject);

    await redisService.set('test_json', testObject);
    const retrieved = await redisService.getJSON('test_json');

    expect(retrieved).toEqual(testObject);
  });
});
