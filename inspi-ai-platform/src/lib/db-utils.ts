import mongoose from 'mongoose';

import connectDB from './mongodb';
import redisClient, { getRedisClient } from './redis';

/**
 * 数据库操作工具类
 */
export class DatabaseUtils {
  /**
   * 确保数据库连接
   */
  static async ensureConnection() {
    await connectDB();
  }

  /**
   * 确保Redis连接
   */
  static async ensureRedisConnection() {
    // Redis client is already initialized
  }

  /**
   * 检查数据库连接状态
   */
  static isMongoConnected(): boolean {
    return mongoose.connection.readyState === 1;
  }

  /**
   * 检查Redis连接状态
   */
  static async isRedisConnected(): Promise<boolean> {
    try {
      const status = await redisClient.getStatus();
      return status.isConnected;
    } catch (error) {
      return false;
    }
  }

  /**
   * 关闭所有数据库连接（主要用于测试）
   */
  static async closeConnections() {
    // 关闭MongoDB连接
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }

    // 关闭Redis连接
    try {
      const client = await getRedisClient();
      await client.quit();
    } catch (error) {
      // Redis连接可能已经关闭
    }

    // 清理全局缓存
    const globalCache = global as typeof global & {
      __mongooseCache?: { conn: any; promise: any };
      redis?: { conn: any; promise: any };
    };

    globalCache.__mongooseCache = { conn: null, promise: null };
    if (globalCache.redis) {
      globalCache.redis = { conn: null, promise: null };
    }
  }

  /**
   * 创建数据库索引
   */
  static async createIndexes() {
    await this.ensureConnection();

    // 这里可以添加额外的索引创建逻辑
    // 大部分索引已在模型定义中创建
    console.log('Database indexes created successfully');
  }

  /**
   * 数据库健康检查
   */
  static async healthCheck(): Promise<{
    mongodb: boolean;
    redis: boolean;
    timestamp: Date;
  }> {
    const mongodb = this.isMongoConnected();
    const redis = await this.isRedisConnected();

    return {
      mongodb,
      redis,
      timestamp: new Date(),
    };
  }
}

/**
 * Redis缓存工具类
 */
export class CacheUtils {
  /**
   * 设置缓存
   */
  static async set(key: string, value: any, ttl?: number): Promise<void> {
    const client = await getRedisClient();
    const serializedValue = JSON.stringify(value);

    if (ttl) {
      await client.setex(key, ttl, serializedValue);
    } else {
      await client.set(key, serializedValue);
    }
  }

  /**
   * 获取缓存
   */
  static async get<T = any>(key: string): Promise<T | null> {
    const client = await getRedisClient();
    const value = await client.get(key);

    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value) as T;
    } catch (error) {
      return value as T;
    }
  }

  /**
   * 删除缓存
   */
  static async del(key: string): Promise<void> {
    const client = await getRedisClient();
    await client.del(key);
  }

  /**
   * 检查缓存是否存在
   */
  static async exists(key: string): Promise<boolean> {
    const client = await getRedisClient();
    const result = await client.exists(key);
    return result === 1;
  }

  /**
   * 设置缓存过期时间
   */
  static async expire(key: string, ttl: number): Promise<void> {
    const client = await getRedisClient();
    await client.expire(key, ttl);
  }

  /**
   * 获取所有匹配的键
   */
  static async keys(pattern: string): Promise<string[]> {
    const client = await getRedisClient();
    return await client.keys(pattern);
  }

  /**
   * 清空所有缓存（谨慎使用）
   */
  static async flushAll(): Promise<void> {
    const client = await getRedisClient();
    await client.flushall();
  }
}

/**
 * 事务工具类
 */
export class TransactionUtils {
  /**
   * 执行MongoDB事务
   */
  static async executeTransaction<T>(
    operations: (session: mongoose.ClientSession) => Promise<T>,
  ): Promise<T> {
    await DatabaseUtils.ensureConnection();

    const session = await mongoose.startSession();

    try {
      session.startTransaction();
      const result = await operations(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }
}

// 默认导出
const dbUtils = {
  DatabaseUtils,
  CacheUtils,
  TransactionUtils,
};

export default dbUtils;
