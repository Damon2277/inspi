/**
 * 作品数据缓存实现
 */
import { logger } from '@/lib/logging/logger';
import { CacheManager } from './manager';
import { WorkCacheStrategy } from './strategies';
import { CacheKeyGenerator, CacheKeyPrefix } from './config';
import { Cache, CacheEvict, CacheUtils } from './utils';

/**
 * 作品缓存数据接口
 */
export interface WorkCacheData {
  id: string;
  title: string;
  description: string;
  authorId: string;
  authorName: string;
  subject: string;
  grade: string;
  tags: string[];
  cards: WorkCard[];
  metadata: {
    difficulty: 'easy' | 'medium' | 'hard';
    estimatedTime: number; // 分钟
    language: string;
    version: string;
  };
  stats: {
    views: number;
    likes: number;
    reuses: number;
    downloads: number;
    rating: number;
    ratingCount: number;
  };
  status: 'draft' | 'published' | 'archived';
  visibility: 'public' | 'private' | 'unlisted';
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

/**
 * 作品卡片接口
 */
export interface WorkCard {
  id: string;
  type: 'concept' | 'example' | 'practice' | 'summary';
  title: string;
  content: string;
  order: number;
  metadata?: Record<string, any>;
}

/**
 * 作品列表查询参数
 */
export interface WorkListQuery {
  subject?: string;
  grade?: string;
  tags?: string[];
  authorId?: string;
  status?: 'draft' | 'published' | 'archived';
  visibility?: 'public' | 'private' | 'unlisted';
  sortBy?: 'created' | 'updated' | 'views' | 'likes' | 'rating';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  search?: string;
}

/**
 * 作品统计信息
 */
export interface WorkStats {
  workId: string;
  views: number;
  uniqueViews: number;
  likes: number;
  reuses: number;
  downloads: number;
  shares: number;
  rating: number;
  ratingCount: number;
  comments: number;
  lastViewedAt: Date;
  updatedAt: Date;
}

/**
 * 作品缓存服务
 */
export class WorkCacheService {
  private cacheManager: CacheManager;
  private strategy: WorkCacheStrategy;

  constructor(cacheManager: CacheManager) {
    this.cacheManager = cacheManager;
    this.strategy = new WorkCacheStrategy(cacheManager);
  }

  /**
   * 获取作品详情
   */
  @Cache({ ttl: 1800, prefix: 'work:detail' })
  async getWorkDetail(workId: string): Promise<WorkCacheData | null> {
    try {
      // 尝试从缓存获取
      const cached = await this.strategy.getWorkDetail(workId);
      if (cached) {
        return cached;
      }

      // 从数据库获取
      const workDetail = await this.fetchWorkFromDatabase(workId);
      if (workDetail) {
        await this.strategy.setWorkDetail(workId, workDetail);
      }

      return workDetail;
    } catch (error) {
      logger.error('Failed to get work detail', error instanceof Error ? error : new Error(String(error)), { workId });
      return null;
    }
  }

  /**
   * 获取作品基本信息
   */
  @Cache({ ttl: 900, prefix: 'work:basic' })
  async getWorkBasicInfo(workId: string): Promise<Partial<WorkCacheData> | null> {
    try {
      const fullDetail = await this.getWorkDetail(workId);
      if (!fullDetail) return null;

      // 返回基本信息
      return {
        id: fullDetail.id,
        title: fullDetail.title,
        description: fullDetail.description,
        authorId: fullDetail.authorId,
        authorName: fullDetail.authorName,
        subject: fullDetail.subject,
        grade: fullDetail.grade,
        tags: fullDetail.tags,
        stats: fullDetail.stats,
        status: fullDetail.status,
        visibility: fullDetail.visibility,
        createdAt: fullDetail.createdAt,
        updatedAt: fullDetail.updatedAt
      };
    } catch (error) {
      logger.error('Failed to get work basic info', error instanceof Error ? error : new Error(String(error)), { workId });
      return null;
    }
  }

  /**
   * 获取作品列表
   */
  @Cache({ 
    ttl: 300, 
    prefix: 'work:list',
    keyGenerator: (query: WorkListQuery) => CacheUtils.serializeToKey(query)
  })
  async getWorkList(query: WorkListQuery): Promise<{
    works: Partial<WorkCacheData>[];
    total: number;
    page: number;
    limit: number;
  } | null> {
    try {
      const queryKey = CacheUtils.serializeToKey(query);
      
      // 尝试从缓存获取
      const cached = await this.strategy.getWorkList(queryKey);
      if (cached) {
        return cached;
      }

      // 从数据库获取
      const workList = await this.fetchWorkListFromDatabase(query);
      if (workList) {
        await this.strategy.setWorkList(queryKey, workList);
      }

      return workList;
    } catch (error) {
      logger.error('Failed to get work list', error instanceof Error ? error : new Error(String(error)), { query });
      return null;
    }
  }

  /**
   * 获取作品统计信息
   */
  @Cache({ ttl: 300, prefix: 'work:stats' })
  async getWorkStats(workId: string): Promise<WorkStats | null> {
    try {
      // 尝试从缓存获取
      const cached = await this.strategy.getWorkStats(workId);
      if (cached) {
        return cached;
      }

      // 从数据库获取
      const stats = await this.fetchWorkStatsFromDatabase(workId);
      if (stats) {
        await this.strategy.setWorkStats(workId, stats);
      }

      return stats;
    } catch (error) {
      logger.error('Failed to get work stats', error instanceof Error ? error : new Error(String(error)), { workId });
      return null;
    }
  }

  /**
   * 获取用户作品列表
   */
  @Cache({ ttl: 600, prefix: 'work:user' })
  async getUserWorks(userId: string, status?: WorkCacheData['status']): Promise<Partial<WorkCacheData>[]> {
    try {
      const query: WorkListQuery = {
        authorId: userId,
        status,
        sortBy: 'updated',
        sortOrder: 'desc'
      };

      const result = await this.getWorkList(query);
      return result?.works || [];
    } catch (error) {
      logger.error('Failed to get user works', error instanceof Error ? error : new Error(String(error)), { userId, status });
      return [];
    }
  }

  /**
   * 获取热门作品
   */
  @Cache({ ttl: 900, prefix: 'work:popular' })
  async getPopularWorks(limit: number = 20): Promise<Partial<WorkCacheData>[]> {
    try {
      const query: WorkListQuery = {
        status: 'published',
        visibility: 'public',
        sortBy: 'views',
        sortOrder: 'desc',
        limit
      };

      const result = await this.getWorkList(query);
      return result?.works || [];
    } catch (error) {
      logger.error('Failed to get popular works', error instanceof Error ? error : new Error(String(error)), { limit });
      return [];
    }
  }

  /**
   * 获取最新作品
   */
  @Cache({ ttl: 300, prefix: 'work:recent' })
  async getRecentWorks(limit: number = 20): Promise<Partial<WorkCacheData>[]> {
    try {
      const query: WorkListQuery = {
        status: 'published',
        visibility: 'public',
        sortBy: 'created',
        sortOrder: 'desc',
        limit
      };

      const result = await this.getWorkList(query);
      return result?.works || [];
    } catch (error) {
      logger.error('Failed to get recent works', error instanceof Error ? error : new Error(String(error)), { limit });
      return [];
    }
  }

  /**
   * 搜索作品
   */
  @Cache({ ttl: 300, prefix: 'work:search' })
  async searchWorks(searchTerm: string, filters?: Partial<WorkListQuery>): Promise<Partial<WorkCacheData>[]> {
    try {
      const query: WorkListQuery = {
        ...filters,
        search: searchTerm,
        status: 'published',
        visibility: 'public',
        sortBy: 'rating',
        sortOrder: 'desc'
      };

      const result = await this.getWorkList(query);
      return result?.works || [];
    } catch (error) {
      logger.error('Failed to search works', error instanceof Error ? error : new Error(String(error)), { searchTerm, filters });
      return [];
    }
  }

  /**
   * 更新作品信息
   */
  @CacheEvict(['work:detail:*', 'work:basic:*', 'work:list:*', 'work:user:*'])
  async updateWork(workId: string, updates: Partial<WorkCacheData>): Promise<boolean> {
    try {
      // 更新数据库
      const success = await this.updateWorkInDatabase(workId, updates);
      
      if (success) {
        // 失效相关缓存
        await this.invalidateWorkCache(workId);
        
        // 预热新数据
        await this.getWorkDetail(workId);
      }

      return success;
    } catch (error) {
      logger.error('Failed to update work', error instanceof Error ? error : new Error(String(error)), { workId, updates });
      return false;
    }
  }

  /**
   * 更新作品统计
   */
  @CacheEvict(['work:stats:*', 'work:detail:*', 'work:popular:*'])
  async updateWorkStats(workId: string, stats: Partial<WorkStats>): Promise<boolean> {
    try {
      // 更新数据库
      const success = await this.updateWorkStatsInDatabase(workId, stats);
      
      if (success) {
        // 失效统计缓存
        await this.strategy.delete(`${workId}:stats`);
        
        // 预热新数据
        await this.getWorkStats(workId);
      }

      return success;
    } catch (error) {
      logger.error('Failed to update work stats', error instanceof Error ? error : new Error(String(error)), { workId, stats });
      return false;
    }
  }

  /**
   * 增加作品浏览量
   */
  async incrementWorkViews(workId: string, userId?: string): Promise<void> {
    try {
      // 使用Redis计数器增加浏览量
      const viewKey = CacheKeyGenerator.generate(CacheKeyPrefix.WORK, `${workId}:views`);
      const uniqueViewKey = userId ? CacheKeyGenerator.generate(CacheKeyPrefix.WORK, `${workId}:unique:${userId}`) : null;

      // 增加总浏览量
      await this.cacheManager.getRedisManager().getClient()?.incr(viewKey);

      // 记录唯一浏览量
      if (uniqueViewKey) {
        const isUnique = await this.cacheManager.getRedisManager().set(uniqueViewKey, '1', 86400); // 24小时过期
        if (isUnique) {
          const uniqueViewCountKey = CacheKeyGenerator.generate(CacheKeyPrefix.WORK, `${workId}:unique_views`);
          await this.cacheManager.getRedisManager().getClient()?.incr(uniqueViewCountKey);
        }
      }

      // 异步更新数据库
      this.updateWorkViewsInDatabase(workId, userId).catch(error => {
        logger.error('Failed to update work views in database', error instanceof Error ? error : new Error(String(error)), { workId, userId });
      });

    } catch (error) {
      logger.error('Failed to increment work views', error instanceof Error ? error : new Error(String(error)), { workId, userId });
    }
  }

  /**
   * 批量获取作品基本信息
   */
  async getBatchWorkBasicInfo(workIds: string[]): Promise<Map<string, Partial<WorkCacheData>>> {
    const result = new Map<string, Partial<WorkCacheData>>();
    
    // 并发获取作品信息
    const promises = workIds.map(async (workId) => {
      try {
        const workInfo = await this.getWorkBasicInfo(workId);
        if (workInfo) {
          result.set(workId, workInfo);
        }
      } catch (error) {
        logger.error('Failed to get work info in batch', error instanceof Error ? error : new Error(String(error)), { workId });
      }
    });

    await Promise.all(promises);
    return result;
  }

  /**
   * 失效作品缓存
   */
  async invalidateWorkCache(workId: string): Promise<void> {
    try {
      await this.strategy.invalidate([workId]);
      
      // 同时失效相关的列表缓存
      await this.cacheManager.deletePattern('work:list:*');
      await this.cacheManager.deletePattern('work:popular:*');
      await this.cacheManager.deletePattern('work:recent:*');
      
      logger.info('Work cache invalidated', { workId });
    } catch (error) {
      logger.error('Failed to invalidate work cache', error instanceof Error ? error : new Error(String(error)), { workId });
    }
  }

  /**
   * 预热作品缓存
   */
  async warmupWorkCache(workId: string): Promise<void> {
    try {
      // 预热作品详情
      await this.getWorkDetail(workId);
      
      // 预热作品统计
      await this.getWorkStats(workId);
      
      logger.info('Work cache warmed up', { workId });
    } catch (error) {
      logger.error('Failed to warmup work cache', error instanceof Error ? error : new Error(String(error)), { workId });
    }
  }

  /**
   * 从数据库获取作品信息
   */
  private async fetchWorkFromDatabase(workId: string): Promise<WorkCacheData | null> {
    // 这里应该实现实际的数据库查询
    return null;
  }

  /**
   * 从数据库获取作品列表
   */
  private async fetchWorkListFromDatabase(query: WorkListQuery): Promise<{
    works: Partial<WorkCacheData>[];
    total: number;
    page: number;
    limit: number;
  } | null> {
    // 这里应该实现实际的数据库查询
    return null;
  }

  /**
   * 从数据库获取作品统计
   */
  private async fetchWorkStatsFromDatabase(workId: string): Promise<WorkStats | null> {
    // 这里应该实现实际的数据库查询
    return null;
  }

  /**
   * 更新数据库中的作品信息
   */
  private async updateWorkInDatabase(workId: string, updates: Partial<WorkCacheData>): Promise<boolean> {
    // 这里应该实现实际的数据库更新
    return true;
  }

  /**
   * 更新数据库中的作品统计
   */
  private async updateWorkStatsInDatabase(workId: string, stats: Partial<WorkStats>): Promise<boolean> {
    // 这里应该实现实际的数据库更新
    return true;
  }

  /**
   * 更新数据库中的作品浏览量
   */
  private async updateWorkViewsInDatabase(workId: string, userId?: string): Promise<void> {
    // 这里应该实现实际的数据库更新
  }
}

/**
 * 作品缓存工具函数
 */
export class WorkCacheUtils {
  /**
   * 生成作品缓存键
   */
  static generateWorkKey(workId: string, suffix?: string): string {
    return CacheKeyGenerator.work(workId, suffix);
  }

  /**
   * 计算作品缓存优先级
   */
  static calculateCachePriority(work: WorkCacheData): number {
    let priority = 0;
    
    // 基于浏览量
    priority += Math.min(work.stats.views / 100, 50);
    
    // 基于点赞数
    priority += Math.min(work.stats.likes * 2, 30);
    
    // 基于复用次数
    priority += Math.min(work.stats.reuses * 5, 40);
    
    // 基于评分
    priority += work.stats.rating * 10;
    
    // 基于发布时间（新作品优先级更高）
    const daysSincePublished = work.publishedAt 
      ? (Date.now() - work.publishedAt.getTime()) / (1000 * 60 * 60 * 24)
      : 365;
    
    if (daysSincePublished < 7) {
      priority += 20;
    } else if (daysSincePublished < 30) {
      priority += 10;
    }
    
    return priority;
  }

  /**
   * 检查作品是否应该被缓存
   */
  static shouldCacheWork(work: WorkCacheData): boolean {
    // 只缓存已发布的公开作品
    if (work.status !== 'published' || work.visibility !== 'public') {
      return false;
    }
    
    // 计算优先级，只缓存高优先级作品
    const priority = this.calculateCachePriority(work);
    return priority > 20;
  }

  /**
   * 生成作品搜索缓存键
   */
  static generateSearchKey(searchTerm: string, filters?: Partial<WorkListQuery>): string {
    const searchData = {
      term: searchTerm.toLowerCase().trim(),
      ...filters
    };
    return CacheUtils.serializeToKey(searchData);
  }

  /**
   * 序列化作品数据
   */
  static serializeWorkData(work: WorkCacheData): string {
    try {
      return JSON.stringify({
        ...work,
        createdAt: work.createdAt.toISOString(),
        updatedAt: work.updatedAt.toISOString(),
        publishedAt: work.publishedAt?.toISOString()
      });
    } catch (error) {
      logger.error('Failed to serialize work data', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * 反序列化作品数据
   */
  static deserializeWorkData(data: string): WorkCacheData {
    try {
      const parsed = JSON.parse(data);
      return {
        ...parsed,
        createdAt: new Date(parsed.createdAt),
        updatedAt: new Date(parsed.updatedAt),
        publishedAt: parsed.publishedAt ? new Date(parsed.publishedAt) : undefined
      };
    } catch (error) {
      logger.error('Failed to deserialize work data', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
}

export default WorkCacheService;