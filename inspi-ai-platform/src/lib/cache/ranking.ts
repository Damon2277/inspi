/**
 * 排行榜缓存实现
 */
import { logger } from '@/lib/logging/logger';
import { CacheManager } from './manager';
import { RankingCacheStrategy } from './strategies';
import { Cache, CacheEvict, CacheUtils } from './utils';

/**
 * 排行榜项目接口
 */
export interface RankingItem {
  id: string;
  name: string;
  avatar?: string;
  score: number;
  rank: number;
  change: number; // 排名变化
  metadata?: Record<string, any>;
}

/**
 * 贡献度排行榜项目
 */
export interface ContributionRankingItem extends RankingItem {
  contributionScore: number;
  worksCount: number;
  reusedCount: number;
  likesReceived: number;
}

/**
 * 作品复用排行榜项目
 */
export interface WorkReuseRankingItem extends RankingItem {
  workId: string;
  workTitle: string;
  authorId: string;
  authorName: string;
  reuseCount: number;
  subject: string;
  grade: string;
}

/**
 * 排行榜缓存服务
 */
export class RankingCacheService {
  private cacheManager: CacheManager;
  private strategy: RankingCacheStrategy;

  constructor(cacheManager: CacheManager) {
    this.cacheManager = cacheManager;
    this.strategy = new RankingCacheStrategy(cacheManager);
  }

  /**
   * 获取贡献度排行榜
   */
  @Cache({ ttl: 1800, prefix: 'ranking:contribution' })
  async getContributionRanking(
    period: 'day' | 'week' | 'month' | 'all' = 'all',
    limit: number = 50
  ): Promise<ContributionRankingItem[]> {
    try {
      const cacheKey = `${period}:${limit}`;
      
      // 尝试从缓存获取
      const cached = await this.strategy.getContributionRanking(cacheKey);
      if (cached) {
        return cached;
      }

      // 从数据库计算排行榜
      const ranking = await this.calculateContributionRanking(period, limit);
      if (ranking.length > 0) {
        await this.strategy.setContributionRanking(cacheKey, ranking);
      }

      return ranking;
    } catch (error) {
      logger.error('Failed to get contribution ranking', error instanceof Error ? error : new Error(String(error)), { period, limit });
      return [];
    }
  }

  /**
   * 获取作品复用排行榜
   */
  @Cache({ ttl: 1800, prefix: 'ranking:reuse' })
  async getWorkReuseRanking(
    period: 'day' | 'week' | 'month' | 'all' = 'all',
    limit: number = 50
  ): Promise<WorkReuseRankingItem[]> {
    try {
      const cacheKey = `${period}:${limit}`;
      
      // 尝试从缓存获取
      const cached = await this.strategy.getWorkReuseRanking(cacheKey);
      if (cached) {
        return cached;
      }

      // 从数据库计算排行榜
      const ranking = await this.calculateWorkReuseRanking(period, limit);
      if (ranking.length > 0) {
        await this.strategy.setWorkReuseRanking(cacheKey, ranking);
      }

      return ranking;
    } catch (error) {
      logger.error('Failed to get work reuse ranking', error instanceof Error ? error : new Error(String(error)), { period, limit });
      return [];
    }
  }

  /**
   * 获取热门作品排行
   */
  @Cache({ ttl: 900, prefix: 'ranking:popular' })
  async getPopularWorksRanking(
    period: 'day' | 'week' | 'month' = 'week',
    limit: number = 20
  ): Promise<WorkReuseRankingItem[]> {
    try {
      const cacheKey = `${period}:${limit}`;
      
      // 尝试从缓存获取
      const cached = await this.strategy.getPopularWorksRanking(cacheKey);
      if (cached) {
        return cached;
      }

      // 从数据库计算排行榜
      const ranking = await this.calculatePopularWorksRanking(period, limit);
      if (ranking.length > 0) {
        await this.strategy.setPopularWorksRanking(cacheKey, ranking);
      }

      return ranking;
    } catch (error) {
      logger.error('Failed to get popular works ranking', error instanceof Error ? error : new Error(String(error)), { period, limit });
      return [];
    }
  }

  /**
   * 获取用户在排行榜中的位置
   */
  @Cache({ ttl: 600, prefix: 'ranking:user_position' })
  async getUserRankingPosition(
    userId: string,
    type: 'contribution' | 'reuse',
    period: 'day' | 'week' | 'month' | 'all' = 'all'
  ): Promise<{ rank: number; score: number; total: number } | null> {
    try {
      let ranking: RankingItem[];
      
      if (type === 'contribution') {
        ranking = await this.getContributionRanking(period, 1000); // 获取更多数据以找到用户位置
      } else {
        ranking = await this.getWorkReuseRanking(period, 1000);
      }

      const userIndex = ranking.findIndex(item => item.id === userId);
      if (userIndex === -1) {
        return null;
      }

      return {
        rank: userIndex + 1,
        score: ranking[userIndex].score,
        total: ranking.length
      };
    } catch (error) {
      logger.error('Failed to get user ranking position', error instanceof Error ? error : new Error(String(error)), { userId, type, period });
      return null;
    }
  }

  /**
   * 更新排行榜缓存
   */
  @CacheEvict(['ranking:contribution:*', 'ranking:reuse:*', 'ranking:popular:*'])
  async refreshRankings(): Promise<void> {
    try {
      // 失效所有排行榜缓存
      await this.strategy.invalidate();
      
      // 预热常用的排行榜
      const periods = ['day', 'week', 'month', 'all'] as const;
      
      for (const period of periods) {
        // 预热贡献度排行榜
        await this.getContributionRanking(period);
        
        // 预热作品复用排行榜
        await this.getWorkReuseRanking(period);
        
        if (period !== 'all') {
          // 预热热门作品排行
          await this.getPopularWorksRanking(period);
        }
      }

      logger.info('Rankings refreshed successfully');
    } catch (error) {
      logger.error('Failed to refresh rankings', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 计算贡献度排行榜
   */
  private async calculateContributionRanking(
    period: string,
    limit: number
  ): Promise<ContributionRankingItem[]> {
    // 这里应该实现实际的数据库查询和计算逻辑
    // 暂时返回空数组
    return [];
  }

  /**
   * 计算作品复用排行榜
   */
  private async calculateWorkReuseRanking(
    period: string,
    limit: number
  ): Promise<WorkReuseRankingItem[]> {
    // 这里应该实现实际的数据库查询和计算逻辑
    return [];
  }

  /**
   * 计算热门作品排行
   */
  private async calculatePopularWorksRanking(
    period: string,
    limit: number
  ): Promise<WorkReuseRankingItem[]> {
    // 这里应该实现实际的数据库查询和计算逻辑
    return [];
  }
}

export default RankingCacheService;