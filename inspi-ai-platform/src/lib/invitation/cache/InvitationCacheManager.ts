/**
 * 邀请系统缓存管理器
 * 实现邀请数据的缓存机制，提升系统性能
 */

import { logger } from '@/shared/utils/logger';

import { InviteCode, InviteStats, LeaderboardEntry, RewardRecord } from '../types';

export interface CacheConfig {
  redis?: {
    host: string
    port: number
    password?: string
    db?: number
  }
  ttl: {
    inviteCode: number      // 邀请码缓存时间 (秒)
    userStats: number       // 用户统计缓存时间
    leaderboard: number     // 排行榜缓存时间
    rewardRecords: number   // 奖励记录缓存时间
    fraudCheck: number      // 防作弊检查缓存时间
  }
  maxMemoryItems: number    // 内存缓存最大条目数
}

export interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number
}

export class InvitationCacheManager {
  private memoryCache: Map<string, CacheItem<any>> = new Map();
  private redisClient: any = null;
  private config: CacheConfig;

  constructor(config: CacheConfig) {
    this.config = config;
    this.initializeRedis();
    this.startCleanupTimer();
  }

  /**
   * 初始化Redis连接
   */
  private async initializeRedis(): Promise<void> {
    if (!this.config.redis) {
      logger.info('Redis not configured, using memory cache only');
      return;
    }

    try {
      // 这里应该使用实际的Redis客户端
      // const Redis = require('ioredis')
      // this.redisClient = new Redis(this.config.redis)

      // 模拟Redis连接
      this.redisClient = {
        get: async (key: string) => null,
        set: async (key: string, value: string, ex?: string, ttl?: number) => 'OK',
        del: async (key: string) => 1,
        exists: async (key: string) => 0,
        expire: async (key: string, ttl: number) => 1,
        flushdb: async () => 'OK',
      };

      logger.info('Redis cache initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Redis cache', { error });
      this.redisClient = null;
    }
  }

  /**
   * 启动内存缓存清理定时器
   */
  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanupExpiredItems();
    }, 60000); // 每分钟清理一次过期项
  }

  /**
   * 清理过期的内存缓存项
   */
  private cleanupExpiredItems(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, item] of this.memoryCache.entries()) {
      if (now - item.timestamp > item.ttl * 1000) {
        this.memoryCache.delete(key);
        cleanedCount++;
      }
    }

    // 如果内存缓存项过多，清理最旧的项
    if (this.memoryCache.size > this.config.maxMemoryItems) {
      const entries = Array.from(this.memoryCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

      const toRemove = entries.slice(0, this.memoryCache.size - this.config.maxMemoryItems);
      toRemove.forEach(([key]) => this.memoryCache.delete(key));
      cleanedCount += toRemove.length;
    }

    if (cleanedCount > 0) {
      logger.debug('Cleaned up expired cache items', { cleanedCount, remainingItems: this.memoryCache.size });
    }
  }

  /**
   * 生成缓存键
   */
  private generateKey(prefix: string, ...parts: string[]): string {
    return `invitation:${prefix}:${parts.join(':')}`;
  }

  /**
   * 从缓存获取数据
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      // 先尝试从内存缓存获取
      const memoryItem = this.memoryCache.get(key);
      if (memoryItem && Date.now() - memoryItem.timestamp < memoryItem.ttl * 1000) {
        logger.debug('Cache hit (memory)', { key });
        return memoryItem.data;
      }

      // 如果内存缓存未命中，尝试从Redis获取
      if (this.redisClient) {
        const redisValue = await this.redisClient.get(key);
        if (redisValue) {
          const data = JSON.parse(redisValue);
          logger.debug('Cache hit (Redis)', { key });

          // 将Redis数据同步到内存缓存
          this.memoryCache.set(key, {
            data,
            timestamp: Date.now(),
            ttl: 300, // 内存缓存5分钟
          });

          return data;
        }
      }

      logger.debug('Cache miss', { key });
      return null;
    } catch (error) {
      logger.error('Cache get error', { key, error });
      return null;
    }
  }

  /**
   * 设置缓存数据
   */
  async set<T>(key: string, data: T, ttl: number): Promise<void> {
    try {
      // 设置内存缓存
      this.memoryCache.set(key, {
        data,
        timestamp: Date.now(),
        ttl: Math.min(ttl, 300), // 内存缓存最多5分钟
      });

      // 设置Redis缓存
      if (this.redisClient) {
        await this.redisClient.set(key, JSON.stringify(data), 'EX', ttl);
      }

      logger.debug('Cache set', { key, ttl });
    } catch (error) {
      logger.error('Cache set error', { key, error });
    }
  }

  /**
   * 删除缓存数据
   */
  async delete(key: string): Promise<void> {
    try {
      this.memoryCache.delete(key);

      if (this.redisClient) {
        await this.redisClient.del(key);
      }

      logger.debug('Cache deleted', { key });
    } catch (error) {
      logger.error('Cache delete error', { key, error });
    }
  }

  /**
   * 批量删除缓存（按模式）
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      // 删除内存缓存中匹配的键
      const keysToDelete = Array.from(this.memoryCache.keys()).filter(key =>
        key.includes(pattern.replace('*', '')),
      );
      keysToDelete.forEach(key => this.memoryCache.delete(key));

      // Redis批量删除需要具体实现
      if (this.redisClient) {
        // 这里应该使用Redis的SCAN命令来查找匹配的键
        // 然后批量删除，为了简化这里省略具体实现
      }

      logger.debug('Cache pattern deleted', { pattern, deletedCount: keysToDelete.length });
    } catch (error) {
      logger.error('Cache pattern delete error', { pattern, error });
    }
  }

  /**
   * 缓存邀请码信息
   */
  async cacheInviteCode(code: string, inviteCodeData: InviteCode): Promise<void> {
    const key = this.generateKey('invite_code', code);
    await this.set(key, inviteCodeData, this.config.ttl.inviteCode);
  }

  /**
   * 获取缓存的邀请码信息
   */
  async getCachedInviteCode(code: string): Promise<InviteCode | null> {
    const key = this.generateKey('invite_code', code);
    return await this.get<InviteCode>(key);
  }

  /**
   * 缓存用户邀请统计
   */
  async cacheUserStats(userId: string, stats: InviteStats): Promise<void> {
    const key = this.generateKey('user_stats', userId);
    await this.set(key, stats, this.config.ttl.userStats);
  }

  /**
   * 获取缓存的用户统计
   */
  async getCachedUserStats(userId: string): Promise<InviteStats | null> {
    const key = this.generateKey('user_stats', userId);
    return await this.get<InviteStats>(key);
  }

  /**
   * 缓存排行榜数据
   */
  async cacheLeaderboard(type: string, period: string, leaderboard: LeaderboardEntry[]): Promise<void> {
    const key = this.generateKey('leaderboard', type, period);
    await this.set(key, leaderboard, this.config.ttl.leaderboard);
  }

  /**
   * 获取缓存的排行榜数据
   */
  async getCachedLeaderboard(type: string, period: string): Promise<LeaderboardEntry[] | null> {
    const key = this.generateKey('leaderboard', type, period);
    return await this.get<LeaderboardEntry[]>(key);
  }

  /**
   * 缓存用户奖励记录
   */
  async cacheUserRewards(userId: string, rewards: RewardRecord[]): Promise<void> {
    const key = this.generateKey('user_rewards', userId);
    await this.set(key, rewards, this.config.ttl.rewardRecords);
  }

  /**
   * 获取缓存的用户奖励记录
   */
  async getCachedUserRewards(userId: string): Promise<RewardRecord[] | null> {
    const key = this.generateKey('user_rewards', userId);
    return await this.get<RewardRecord[]>(key);
  }

  /**
   * 缓存防作弊检查结果
   */
  async cacheFraudCheck(checkKey: string, result: any): Promise<void> {
    const key = this.generateKey('fraud_check', checkKey);
    await this.set(key, result, this.config.ttl.fraudCheck);
  }

  /**
   * 获取缓存的防作弊检查结果
   */
  async getCachedFraudCheck(checkKey: string): Promise<any | null> {
    const key = this.generateKey('fraud_check', checkKey);
    return await this.get(key);
  }

  /**
   * 使缓存失效（当数据更新时）
   */
  async invalidateUserCache(userId: string): Promise<void> {
    await Promise.all([
      this.deletePattern(`*user_stats:${userId}*`),
      this.deletePattern(`*user_rewards:${userId}*`),
      this.deletePattern('*leaderboard*'), // 用户数据变化可能影响排行榜
    ]);
  }

  /**
   * 使邀请码缓存失效
   */
  async invalidateInviteCodeCache(code: string): Promise<void> {
    const key = this.generateKey('invite_code', code);
    await this.delete(key);
  }

  /**
   * 预热缓存
   */
  async warmupCache(warmupData: {
    popularInviteCodes?: InviteCode[]
    topUsers?: string[]
    commonQueries?: string[]
  }): Promise<void> {
    logger.info('Starting cache warmup');

    try {
      // 预热热门邀请码
      if (warmupData.popularInviteCodes) {
        await Promise.all(
          warmupData.popularInviteCodes.map(code =>
            this.cacheInviteCode(code.code, code),
          ),
        );
      }

      // 可以添加更多预热逻辑
      logger.info('Cache warmup completed', {
        inviteCodes: warmupData.popularInviteCodes?.length || 0,
        topUsers: warmupData.topUsers?.length || 0,
      });
    } catch (error) {
      logger.error('Cache warmup failed', { error });
    }
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): {
    memoryItems: number
    memorySize: number
    hitRate?: number
    redisConnected: boolean
  } {
    return {
      memoryItems: this.memoryCache.size,
      memorySize: JSON.stringify(Array.from(this.memoryCache.entries())).length,
      redisConnected: !!this.redisClient,
    };
  }

  /**
   * 清空所有缓存
   */
  async clearAll(): Promise<void> {
    try {
      this.memoryCache.clear();

      if (this.redisClient) {
        await this.redisClient.flushdb();
      }

      logger.info('All cache cleared');
    } catch (error) {
      logger.error('Failed to clear cache', { error });
    }
  }

  /**
   * 关闭缓存管理器
   */
  async close(): Promise<void> {
    try {
      if (this.redisClient && this.redisClient.disconnect) {
        await this.redisClient.disconnect();
      }

      this.memoryCache.clear();
      logger.info('Cache manager closed');
    } catch (error) {
      logger.error('Error closing cache manager', { error });
    }
  }
}
