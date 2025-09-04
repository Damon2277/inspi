/**
 * 简化的Redis客户端
 * 用于MVP阶段，提供基本的缓存功能
 */

import Redis from 'ioredis';

class SimpleRedisManager {
  private client: Redis | null = null;
  private isConnected = false;

  constructor() {
    this.setupClient();
  }

  private setupClient(): void {
    try {
      // 在开发环境中，Redis是可选的
      if (process.env.NODE_ENV === 'development' && !process.env.REDIS_URL) {
        console.log('Redis not configured for development environment');
        return;
      }

      this.client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        maxRetriesPerRequest: 3,
        lazyConnect: true
      });

      this.client.on('connect', () => {
        console.log('Redis connected');
        this.isConnected = true;
      });

      this.client.on('error', (error) => {
        console.warn('Redis error (non-critical in development):', error.message);
        this.isConnected = false;
      });

    } catch (error) {
      console.warn('Failed to setup Redis client:', error);
    }
  }

  getClient(): Redis | null {
    return this.client;
  }

  isReady(): boolean {
    return this.isConnected && this.client?.status === 'ready';
  }

  async get(key: string): Promise<string | null> {
    if (!this.isReady()) {
      return null;
    }

    try {
      return await this.client!.get(key);
    } catch (error) {
      console.warn('Redis GET error:', error);
      return null;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (!this.isReady()) {
      return;
    }

    try {
      if (ttl && ttl > 0) {
        await this.client!.setex(key, ttl, value);
      } else {
        await this.client!.set(key, value);
      }
    } catch (error) {
      console.warn('Redis SET error:', error);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isReady()) {
      return;
    }

    try {
      await this.client!.del(key);
    } catch (error) {
      console.warn('Redis DEL error:', error);
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
    }
  }
}

export const redisManager = new SimpleRedisManager();
export default redisManager;