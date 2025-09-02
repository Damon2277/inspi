import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let redis: Redis | null = null;

/**
 * Get Redis client instance with connection pooling
 */
export function getRedisClient(): Redis {
  if (!redis) {
    redis = new Redis(REDIS_URL, {
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000,
    });

    redis.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });

    redis.on('error', (error) => {
      console.error('❌ Redis connection error:', error);
    });

    redis.on('close', () => {
      console.log('🔌 Redis connection closed');
    });
  }

  return redis;
}

/**
 * Disconnect from Redis
 */
export async function disconnectRedis() {
  if (redis) {
    await redis.quit();
    redis = null;
    console.log('✅ Redis disconnected');
  }
}

/**
 * Check Redis connection status
 */
export async function getRedisStatus() {
  try {
    const client = getRedisClient();
    const pong = await client.ping();
    return {
      isConnected: pong === 'PONG',
      status: client.status,
      url: REDIS_URL.replace(/\/\/.*@/, '//***@') // Hide credentials
    };
  } catch (error) {
    return {
      isConnected: false,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Redis utility functions
 */
export class RedisService {
  private client: Redis;

  constructor() {
    this.client = getRedisClient();
  }

  /**
   * Set a key-value pair with optional expiration
   */
  async set(key: string, value: string | object, ttlSeconds?: number): Promise<void> {
    const serializedValue = typeof value === 'object' ? JSON.stringify(value) : value;
    
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, serializedValue);
    } else {
      await this.client.set(key, serializedValue);
    }
  }

  /**
   * Get a value by key
   */
  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  /**
   * Get and parse JSON value
   */
  async getJSON<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    if (!value) return null;
    
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  /**
   * Delete a key
   */
  async del(key: string): Promise<number> {
    return await this.client.del(key);
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  /**
   * Increment a counter
   */
  async incr(key: string): Promise<number> {
    return await this.client.incr(key);
  }

  /**
   * Set expiration for a key
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    const result = await this.client.expire(key, seconds);
    return result === 1;
  }

  /**
   * Get Redis connection status
   */
  async getStatus() {
    try {
      const pong = await this.client.ping();
      return {
        isConnected: pong === 'PONG',
        status: this.client.status,
      };
    } catch (error) {
      return {
        isConnected: false,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export default new RedisService();