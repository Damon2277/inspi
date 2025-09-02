/**
 * 缓存策略实现
 */
import { EventEmitter } from 'events';
import { logger } from '@/lib/logging/logger';
import { CacheManager } from './manager';
import { 
  CacheStrategyConfig, 
  CacheLayer, 
  CacheKeyPrefix,
  CacheKeyGenerator,
  DEFAULT_CACHE_CONFIG 
} from './config';

/**
 * 缓存预热策略
 */
export enum WarmupStrategy {
  EAGER = 'eager',      // 立即预热
  LAZY = 'lazy',        // 懒加载预热
  SCHEDULED = 'scheduled' // 定时预热
}

/**
 * 缓存失效策略
 */
export enum InvalidationStrategy {
  TTL = 'ttl',                // 基于TTL自动失效
  MANUAL = 'manual',          // 手动失效
  EVENT_DRIVEN = 'event_driven' // 事件驱动失效
}

/**
 * 缓存策略基类
 */
export abstract class BaseCacheStrategy extends EventEmitter {
  protected cacheManager: CacheManager;
  protected config: CacheStrategyConfig;
  protected keyPrefix: CacheKeyPrefix;

  constructor(
    cacheManager: CacheManager,
    config: CacheStrategyConfig,
    keyPrefix: CacheKeyPrefix
  ) {
    super();
    this.cacheManager = cacheManager;
    this.config = config;
    this.keyPrefix = keyPrefix;
  }

  /**
   * 获取缓存值
   */
  async get<T>(key: string): Promise<T | null> {
    const fullKey = this.buildKey(key);
    return await this.cacheManager.get<T>(fullKey, {
      layers: this.config.layers,
      ttl: this.config.ttl.memory
    });
  }

  /**
   * 设置缓存值
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const fullKey = this.buildKey(key);
    await this.cacheManager.set(fullKey, value, {
      layers: this.config.layers,
      ttl: ttl || this.config.ttl.memory
    });
  }

  /**
   * 删除缓存值
   */
  async delete(key: string): Promise<void> {
    const fullKey = this.buildKey(key);
    await this.cacheManager.delete(fullKey, {
      layers: this.config.layers
    });
  }

  /**
   * 批量删除缓存
   */
  async deletePattern(pattern: string): Promise<void> {
    const fullPattern = this.buildKey(pattern);
    await this.cacheManager.deletePattern(fullPattern, {
      layers: this.config.layers
    });
  }

  /**
   * 获取或设置缓存值
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const fullKey = this.buildKey(key);
    return await this.cacheManager.getOrSet(fullKey, factory, {
      layers: this.config.layers,
      ttl: ttl || this.config.ttl.memory
    });
  }

  /**
   * 预热缓存
   */
  abstract warmup(): Promise<void>;

  /**
   * 失效缓存
   */
  abstract invalidate(keys?: string[]): Promise<void>;

  /**
   * 构建完整的缓存键
   */
  protected buildKey(key: string): string {
    return CacheKeyGenerator.generate(this.keyPrefix, key);
  }

  /**
   * 检查策略是否启用
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }
}

/**
 * 用户缓存策略
 */
export class UserCacheStrategy extends BaseCacheStrategy {
  constructor(cacheManager: CacheManager) {
    super(
      cacheManager,
      DEFAULT_CACHE_CONFIG.strategies.user,
      CacheKeyPrefix.USER
    );
  }

  /**
   * 获取用户信息
   */
  async getUserInfo(userId: string): Promise<any> {
    return await this.get(`${userId}:info`);
  }

  /**
   * 设置用户信息
   */
  async setUserInfo(userId: string, userInfo: any): Promise<void> {
    await this.set(`${userId}:info`, userInfo, this.config.ttl.redis);
  }

  /**
   * 获取用户订阅状态
   */
  async getUserSubscription(userId: string): Promise<any> {
    return await this.get(`${userId}:subscription`);
  }

  /**
   * 设置用户订阅状态
   */
  async setUserSubscription(userId: string, subscription: any): Promise<void> {
    await this.set(`${userId}:subscription`, subscription, this.config.ttl.redis);
  }

  /**
   * 获取用户偏好设置
   */
  async getUserPreferences(userId: string): Promise<any> {
    return await this.get(`${userId}:preferences`);
  }

  /**
   * 设置用户偏好设置
   */
  async setUserPreferences(userId: string, preferences: any): Promise<void> {
    await this.set(`${userId}:preferences`, preferences, this.config.ttl.redis);
  }

  /**
   * 预热用户缓存
   */
  async warmup(): Promise<void> {
    if (!this.config.warmup.enabled) return;

    logger.info('Starting user cache warmup');
    
    try {
      // 这里可以预热热门用户或最近活跃用户的数据
      // 实际实现时需要从数据库获取用户列表
      const activeUserIds = await this.getActiveUserIds();
      
      for (const userId of activeUserIds) {
        try {
          // 预热用户基本信息
          await this.warmupUserData(userId);
        } catch (error) {
          logger.error('Failed to warmup user data', error instanceof Error ? error : new Error(String(error)), { userId });
        }
      }

      logger.info('User cache warmup completed', { userCount: activeUserIds.length });
    } catch (error) {
      logger.error('User cache warmup failed', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 失效用户缓存
   */
  async invalidate(userIds?: string[]): Promise<void> {
    if (userIds && userIds.length > 0) {
      // 失效指定用户的缓存
      for (const userId of userIds) {
        await this.deletePattern(`${userId}:*`);
      }
    } else {
      // 失效所有用户缓存
      await this.deletePattern('*');
    }

    logger.info('User cache invalidated', { userIds });
  }

  /**
   * 获取活跃用户ID列表
   */
  private async getActiveUserIds(): Promise<string[]> {
    // 这里应该从数据库获取活跃用户列表
    // 暂时返回空数组
    return [];
  }

  /**
   * 预热单个用户数据
   */
  private async warmupUserData(userId: string): Promise<void> {
    // 这里应该从数据库获取用户数据并缓存
    // 暂时跳过实际实现
  }
}

/**
 * 作品缓存策略
 */
export class WorkCacheStrategy extends BaseCacheStrategy {
  constructor(cacheManager: CacheManager) {
    super(
      cacheManager,
      DEFAULT_CACHE_CONFIG.strategies.work,
      CacheKeyPrefix.WORK
    );
  }

  /**
   * 获取作品详情
   */
  async getWorkDetail(workId: string): Promise<any> {
    return await this.get(`${workId}:detail`);
  }

  /**
   * 设置作品详情
   */
  async setWorkDetail(workId: string, workDetail: any): Promise<void> {
    await this.set(`${workId}:detail`, workDetail, this.config.ttl.redis);
  }

  /**
   * 获取作品列表
   */
  async getWorkList(filters: string): Promise<any> {
    return await this.get(`list:${filters}`);
  }

  /**
   * 设置作品列表
   */
  async setWorkList(filters: string, workList: any): Promise<void> {
    await this.set(`list:${filters}`, workList, this.config.ttl.memory);
  }

  /**
   * 获取作品统计信息
   */
  async getWorkStats(workId: string): Promise<any> {
    return await this.get(`${workId}:stats`);
  }

  /**
   * 设置作品统计信息
   */
  async setWorkStats(workId: string, stats: any): Promise<void> {
    await this.set(`${workId}:stats`, stats, this.config.ttl.memory);
  }

  /**
   * 预热作品缓存
   */
  async warmup(): Promise<void> {
    if (!this.config.warmup.enabled) return;

    logger.info('Starting work cache warmup');
    
    try {
      // 预热热门作品
      const popularWorkIds = await this.getPopularWorkIds();
      
      for (const workId of popularWorkIds) {
        try {
          await this.warmupWorkData(workId);
        } catch (error) {
          logger.error('Failed to warmup work data', error instanceof Error ? error : new Error(String(error)), { workId });
        }
      }

      // 预热作品列表
      await this.warmupWorkLists();

      logger.info('Work cache warmup completed', { workCount: popularWorkIds.length });
    } catch (error) {
      logger.error('Work cache warmup failed', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 失效作品缓存
   */
  async invalidate(workIds?: string[]): Promise<void> {
    if (workIds && workIds.length > 0) {
      // 失效指定作品的缓存
      for (const workId of workIds) {
        await this.deletePattern(`${workId}:*`);
      }
      
      // 同时失效相关的列表缓存
      await this.deletePattern('list:*');
    } else {
      // 失效所有作品缓存
      await this.deletePattern('*');
    }

    logger.info('Work cache invalidated', { workIds });
  }

  /**
   * 获取热门作品ID列表
   */
  private async getPopularWorkIds(): Promise<string[]> {
    // 这里应该从数据库获取热门作品列表
    return [];
  }

  /**
   * 预热单个作品数据
   */
  private async warmupWorkData(workId: string): Promise<void> {
    // 这里应该从数据库获取作品数据并缓存
  }

  /**
   * 预热作品列表
   */
  private async warmupWorkLists(): Promise<void> {
    // 预热常用的作品列表查询
    const commonFilters = [
      'recent',
      'popular',
      'featured'
    ];

    for (const filter of commonFilters) {
      try {
        // 这里应该执行实际的查询并缓存结果
        // await this.setWorkList(filter, await fetchWorkList(filter));
      } catch (error) {
        logger.error('Failed to warmup work list', error instanceof Error ? error : new Error(String(error)), { filter });
      }
    }
  }
}

/**
 * 排行榜缓存策略
 */
export class RankingCacheStrategy extends BaseCacheStrategy {
  constructor(cacheManager: CacheManager) {
    super(
      cacheManager,
      DEFAULT_CACHE_CONFIG.strategies.ranking,
      CacheKeyPrefix.RANKING
    );
  }

  /**
   * 获取贡献度排行榜
   */
  async getContributionRanking(period: string = 'all'): Promise<any> {
    return await this.get(`contribution:${period}`);
  }

  /**
   * 设置贡献度排行榜
   */
  async setContributionRanking(period: string, ranking: any): Promise<void> {
    await this.set(`contribution:${period}`, ranking, this.config.ttl.redis);
  }

  /**
   * 获取作品复用排行榜
   */
  async getWorkReuseRanking(period: string = 'all'): Promise<any> {
    return await this.get(`reuse:${period}`);
  }

  /**
   * 设置作品复用排行榜
   */
  async setWorkReuseRanking(period: string, ranking: any): Promise<void> {
    await this.set(`reuse:${period}`, ranking, this.config.ttl.redis);
  }

  /**
   * 获取热门作品排行
   */
  async getPopularWorksRanking(period: string = 'week'): Promise<any> {
    return await this.get(`popular:${period}`);
  }

  /**
   * 设置热门作品排行
   */
  async setPopularWorksRanking(period: string, ranking: any): Promise<void> {
    await this.set(`popular:${period}`, ranking, this.config.ttl.redis);
  }

  /**
   * 预热排行榜缓存
   */
  async warmup(): Promise<void> {
    if (!this.config.warmup.enabled) return;

    logger.info('Starting ranking cache warmup');
    
    try {
      const periods = ['day', 'week', 'month', 'all'];
      
      for (const period of periods) {
        try {
          // 预热贡献度排行榜
          await this.warmupContributionRanking(period);
          
          // 预热作品复用排行榜
          await this.warmupWorkReuseRanking(period);
          
          // 预热热门作品排行
          await this.warmupPopularWorksRanking(period);
        } catch (error) {
          logger.error('Failed to warmup ranking data', error instanceof Error ? error : new Error(String(error)), { period });
        }
      }

      logger.info('Ranking cache warmup completed');
    } catch (error) {
      logger.error('Ranking cache warmup failed', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 失效排行榜缓存
   */
  async invalidate(types?: string[]): Promise<void> {
    if (types && types.length > 0) {
      // 失效指定类型的排行榜
      for (const type of types) {
        await this.deletePattern(`${type}:*`);
      }
    } else {
      // 失效所有排行榜缓存
      await this.deletePattern('*');
    }

    logger.info('Ranking cache invalidated', { types });
  }

  /**
   * 预热贡献度排行榜
   */
  private async warmupContributionRanking(period: string): Promise<void> {
    // 这里应该从数据库计算并缓存贡献度排行榜
  }

  /**
   * 预热作品复用排行榜
   */
  private async warmupWorkReuseRanking(period: string): Promise<void> {
    // 这里应该从数据库计算并缓存作品复用排行榜
  }

  /**
   * 预热热门作品排行
   */
  private async warmupPopularWorksRanking(period: string): Promise<void> {
    // 这里应该从数据库计算并缓存热门作品排行
  }
}

/**
 * 知识图谱缓存策略
 */
export class KnowledgeGraphCacheStrategy extends BaseCacheStrategy {
  constructor(cacheManager: CacheManager) {
    super(
      cacheManager,
      DEFAULT_CACHE_CONFIG.strategies.knowledgeGraph,
      CacheKeyPrefix.KNOWLEDGE_GRAPH
    );
  }

  /**
   * 获取知识图谱数据
   */
  async getGraphData(graphId: string): Promise<any> {
    return await this.get(`${graphId}:data`);
  }

  /**
   * 设置知识图谱数据
   */
  async setGraphData(graphId: string, graphData: any): Promise<void> {
    await this.set(`${graphId}:data`, graphData, this.config.ttl.redis);
  }

  /**
   * 获取图谱节点信息
   */
  async getNodeInfo(graphId: string, nodeId: string): Promise<any> {
    return await this.get(`${graphId}:node:${nodeId}`);
  }

  /**
   * 设置图谱节点信息
   */
  async setNodeInfo(graphId: string, nodeId: string, nodeInfo: any): Promise<void> {
    await this.set(`${graphId}:node:${nodeId}`, nodeInfo, this.config.ttl.redis);
  }

  /**
   * 预热知识图谱缓存
   */
  async warmup(): Promise<void> {
    if (!this.config.warmup.enabled) return;

    logger.info('Starting knowledge graph cache warmup');
    
    try {
      // 预热预设的学科图谱
      const presetGraphIds = await this.getPresetGraphIds();
      
      for (const graphId of presetGraphIds) {
        try {
          await this.warmupGraphData(graphId);
        } catch (error) {
          logger.error('Failed to warmup graph data', error instanceof Error ? error : new Error(String(error)), { graphId });
        }
      }

      logger.info('Knowledge graph cache warmup completed', { graphCount: presetGraphIds.length });
    } catch (error) {
      logger.error('Knowledge graph cache warmup failed', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 失效知识图谱缓存
   */
  async invalidate(graphIds?: string[]): Promise<void> {
    if (graphIds && graphIds.length > 0) {
      // 失效指定图谱的缓存
      for (const graphId of graphIds) {
        await this.deletePattern(`${graphId}:*`);
      }
    } else {
      // 失效所有图谱缓存
      await this.deletePattern('*');
    }

    logger.info('Knowledge graph cache invalidated', { graphIds });
  }

  /**
   * 获取预设图谱ID列表
   */
  private async getPresetGraphIds(): Promise<string[]> {
    // 这里应该返回预设的学科图谱ID列表
    return ['math', 'physics', 'chemistry', 'biology', 'history', 'geography'];
  }

  /**
   * 预热图谱数据
   */
  private async warmupGraphData(graphId: string): Promise<void> {
    // 这里应该从数据库获取图谱数据并缓存
  }
}

/**
 * 缓存策略工厂
 */
export class CacheStrategyFactory {
  private static strategies = new Map<string, BaseCacheStrategy>();

  /**
   * 创建或获取缓存策略实例
   */
  static getStrategy(
    type: 'user' | 'work' | 'ranking' | 'knowledgeGraph',
    cacheManager: CacheManager
  ): BaseCacheStrategy {
    if (!this.strategies.has(type)) {
      let strategy: BaseCacheStrategy;
      
      switch (type) {
        case 'user':
          strategy = new UserCacheStrategy(cacheManager);
          break;
        case 'work':
          strategy = new WorkCacheStrategy(cacheManager);
          break;
        case 'ranking':
          strategy = new RankingCacheStrategy(cacheManager);
          break;
        case 'knowledgeGraph':
          strategy = new KnowledgeGraphCacheStrategy(cacheManager);
          break;
        default:
          throw new Error(`Unknown cache strategy type: ${type}`);
      }
      
      this.strategies.set(type, strategy);
    }

    return this.strategies.get(type)!;
  }

  /**
   * 预热所有策略
   */
  static async warmupAll(cacheManager: CacheManager): Promise<void> {
    const strategyTypes = ['user', 'work', 'ranking', 'knowledgeGraph'] as const;
    
    for (const type of strategyTypes) {
      try {
        const strategy = this.getStrategy(type, cacheManager);
        if (strategy.isEnabled()) {
          await strategy.warmup();
        }
      } catch (error) {
        logger.error('Failed to warmup cache strategy', error instanceof Error ? error : new Error(String(error)), { type });
      }
    }
  }

  /**
   * 失效所有策略
   */
  static async invalidateAll(cacheManager: CacheManager): Promise<void> {
    const strategyTypes = ['user', 'work', 'ranking', 'knowledgeGraph'] as const;
    
    for (const type of strategyTypes) {
      try {
        const strategy = this.getStrategy(type, cacheManager);
        await strategy.invalidate();
      } catch (error) {
        logger.error('Failed to invalidate cache strategy', error instanceof Error ? error : new Error(String(error)), { type });
      }
    }
  }
}

export {
  UserCacheStrategy,
  WorkCacheStrategy,
  RankingCacheStrategy,
  KnowledgeGraphCacheStrategy
};