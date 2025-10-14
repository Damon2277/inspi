/**
 * 排行榜服务
 * 提供各种排行榜功能和缓存管理
 */

import { DatabaseService } from '../database';
import { LeaderboardEntry, TimePeriod, RewardSummary } from '../types';

export interface LeaderboardFilter {
  period?: TimePeriod
  category?: 'invites' | 'registrations' | 'rewards' | 'activations'
  userGroup?: 'all' | 'teachers' | 'students' | 'premium'
  minInvites?: number
}

export interface LeaderboardService {
  // 获取邀请排行榜
  getInviteLeaderboard(filter: LeaderboardFilter, limit: number): Promise<LeaderboardEntry[]>

  // 获取月度排行榜
  getMonthlyLeaderboard(year: number, month: number, limit: number): Promise<LeaderboardEntry[]>

  // 获取实时排行榜
  getRealTimeLeaderboard(limit: number): Promise<LeaderboardEntry[]>

  // 获取用户排名
  getUserRank(userId: string, filter: LeaderboardFilter): Promise<{
    rank: number
    totalUsers: number
    percentile: number
  }>

  // 获取排行榜变化
  getLeaderboardChanges(previousPeriod: TimePeriod, currentPeriod: TimePeriod): Promise<Array<{
    userId: string
    userName: string
    previousRank: number
    currentRank: number
    rankChange: number
    trend: 'up' | 'down' | 'stable' | 'new'
  }>>

  // 更新排行榜缓存
  updateLeaderboardCache(filter: LeaderboardFilter): Promise<void>

  // 获取排行榜统计
  getLeaderboardStats(): Promise<{
    totalParticipants: number
    averageInvites: number
    topPerformerThreshold: number
    lastUpdated: Date
  }>
}

export class LeaderboardServiceImpl implements LeaderboardService {
  private cachePrefix = 'leaderboard:';
  private cacheExpiry = 300; // 5分钟缓存

  constructor(private db: DatabaseService) {}

  /**
   * 获取邀请排行榜
   */
  async getInviteLeaderboard(filter: LeaderboardFilter, limit: number = 50): Promise<LeaderboardEntry[]> {
    try {
      const cacheKey = this.generateCacheKey('invite', filter, limit);

      // 尝试从缓存获取
      const cached = await this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }

      let query = `
        SELECT 
          u.id as user_id,
          u.name as user_name,
          u.email as user_email,
          COUNT(DISTINCT ir.id) as invite_count,
          COUNT(DISTINCT CASE WHEN ir.is_activated = 1 THEN ir.id END) as active_invite_count,
          SUM(CASE WHEN r.type = 'ai_credits' THEN r.amount ELSE 0 END) as total_credits,
          COUNT(DISTINCT CASE WHEN r.type = 'badge' THEN r.id END) as badge_count,
          COUNT(DISTINCT CASE WHEN r.type = 'title' THEN r.id END) as title_count,
          MAX(ir.registered_at) as last_invite_date
        FROM users u
        LEFT JOIN invite_codes ic ON u.id = ic.inviter_id
        LEFT JOIN invite_registrations ir ON ic.id = ir.invite_code_id
        LEFT JOIN rewards r ON u.id = r.user_id AND r.source_type IN ('invite_registration', 'invite_activation')
      `;

      const params: any[] = [];
      const conditions: string[] = [];

      // 添加时间过滤
      if (filter.period) {
        conditions.push('ir.registered_at BETWEEN ? AND ?');
        params.push(filter.period.start, filter.period.end);
      }

      // 添加最小邀请数过滤
      if (filter.minInvites && filter.minInvites > 0) {
        // 这个条件会在HAVING子句中处理
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += `
        GROUP BY u.id, u.name, u.email
        HAVING COUNT(DISTINCT ir.id) > 0
      `;

      // 添加最小邀请数过滤
      if (filter.minInvites && filter.minInvites > 0) {
        query += ` AND COUNT(DISTINCT ir.id) >= ${filter.minInvites}`;
      }

      // 添加排序
      switch (filter.category) {
        case 'registrations':
          query += ' ORDER BY invite_count DESC, total_credits DESC';
          break;
        case 'rewards':
          query += ' ORDER BY total_credits DESC, invite_count DESC';
          break;
        case 'activations':
          query += ' ORDER BY active_invite_count DESC, invite_count DESC';
          break;
        default:
          query += ' ORDER BY invite_count DESC, total_credits DESC';
      }

      query += ' LIMIT ?';
      params.push(limit);

      const results = await this.db.query(query, params);

      const leaderboard = results.map((row: any, index: number) => ({
        userId: row.user_id,
        userName: row.user_name,
        inviteCount: parseInt(row.invite_count, 10) || 0,
        rank: index + 1,
        rewards: {
          totalCredits: parseInt(row.total_credits, 10) || 0,
          badges: [], // 需要单独查询具体徽章
          titles: [], // 需要单独查询具体称号
          premiumDays: 0,
        },
      }));

      // 缓存结果
      await this.setCache(cacheKey, leaderboard);

      return leaderboard;
    } catch (error) {
      console.error('Failed to get invite leaderboard:', error);
      throw new Error('Failed to get invite leaderboard');
    }
  }

  /**
   * 获取月度排行榜
   */
  async getMonthlyLeaderboard(year: number, month: number, limit: number = 50): Promise<LeaderboardEntry[]> {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      const filter: LeaderboardFilter = {
        period: { start: startDate, end: endDate },
        category: 'invites',
      };

      return await this.getInviteLeaderboard(filter, limit);
    } catch (error) {
      console.error('Failed to get monthly leaderboard:', error);
      throw new Error('Failed to get monthly leaderboard');
    }
  }

  /**
   * 获取实时排行榜
   */
  async getRealTimeLeaderboard(limit: number = 20): Promise<LeaderboardEntry[]> {
    try {
      // 获取最近7天的排行榜
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const filter: LeaderboardFilter = {
        period: { start: startDate, end: endDate },
        category: 'invites',
      };

      return await this.getInviteLeaderboard(filter, limit);
    } catch (error) {
      console.error('Failed to get real-time leaderboard:', error);
      throw new Error('Failed to get real-time leaderboard');
    }
  }

  /**
   * 获取用户排名
   */
  async getUserRank(userId: string, filter: LeaderboardFilter): Promise<{
    rank: number
    totalUsers: number
    percentile: number
  }> {
    try {
      let query = `
        SELECT 
          user_rank.rank,
          user_rank.total_users,
          user_rank.invite_count
        FROM (
          SELECT 
            u.id as user_id,
            COUNT(DISTINCT ir.id) as invite_count,
            ROW_NUMBER() OVER (ORDER BY COUNT(DISTINCT ir.id) DESC, SUM(CASE WHEN r.type = 'ai_credits' THEN r.amount ELSE 0 END) DESC) as rank,
            COUNT(*) OVER () as total_users
          FROM users u
          LEFT JOIN invite_codes ic ON u.id = ic.inviter_id
          LEFT JOIN invite_registrations ir ON ic.id = ir.invite_code_id
          LEFT JOIN rewards r ON u.id = r.user_id AND r.source_type IN ('invite_registration', 'invite_activation')
      `;

      const params: any[] = [];
      const conditions: string[] = [];

      if (filter.period) {
        conditions.push('ir.registered_at BETWEEN ? AND ?');
        params.push(filter.period.start, filter.period.end);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += `
          GROUP BY u.id
          HAVING COUNT(DISTINCT ir.id) > 0
        ) user_rank
        WHERE user_rank.user_id = ?
      `;

      params.push(userId);

      const result = await this.db.queryOne<{
        rank: number | string;
        total_users: number | string;
      }>(query, params);

      if (!result) {
        return {
          rank: 0,
          totalUsers: 0,
          percentile: 0,
        };
      }

      const rank = Number(result.rank);
      const totalUsers = Number(result.total_users);
      const percentile = totalUsers > 0 ? ((totalUsers - rank + 1) / totalUsers) * 100 : 0;

      return {
        rank,
        totalUsers,
        percentile,
      };
    } catch (error) {
      console.error('Failed to get user rank:', error);
      throw new Error('Failed to get user rank');
    }
  }

  /**
   * 获取排行榜变化
   */
  async getLeaderboardChanges(
    previousPeriod: TimePeriod,
    currentPeriod: TimePeriod,
  ): Promise<Array<{
    userId: string
    userName: string
    previousRank: number
    currentRank: number
    rankChange: number
    trend: 'up' | 'down' | 'stable' | 'new'
  }>> {
    try {
      const [previousLeaderboard, currentLeaderboard] = await Promise.all([
        this.getInviteLeaderboard({ period: previousPeriod }, 100),
        this.getInviteLeaderboard({ period: currentPeriod }, 100),
      ]);

      const previousRanks = new Map<string, number>();
      previousLeaderboard.forEach(entry => {
        previousRanks.set(entry.userId, entry.rank);
      });

      const changes = currentLeaderboard.map(entry => {
        const previousRank = previousRanks.get(entry.userId) || 0;
        const currentRank = entry.rank;
        const rankChange = previousRank > 0 ? previousRank - currentRank : 0;

        let trend: 'up' | 'down' | 'stable' | 'new';
        if (previousRank === 0) {
          trend = 'new';
        } else if (rankChange > 0) {
          trend = 'up';
        } else if (rankChange < 0) {
          trend = 'down';
        } else {
          trend = 'stable';
        }

        return {
          userId: entry.userId,
          userName: entry.userName,
          previousRank,
          currentRank,
          rankChange,
          trend,
        };
      });

      return changes;
    } catch (error) {
      console.error('Failed to get leaderboard changes:', error);
      throw new Error('Failed to get leaderboard changes');
    }
  }

  /**
   * 更新排行榜缓存
   */
  async updateLeaderboardCache(filter: LeaderboardFilter): Promise<void> {
    try {
      // 清除相关缓存
      const cacheKey = this.generateCacheKey('invite', filter, 50);
      await this.deleteFromCache(cacheKey);

      // 重新生成缓存
      await this.getInviteLeaderboard(filter, 50);

      console.log('Leaderboard cache updated for filter:', filter);
    } catch (error) {
      console.error('Failed to update leaderboard cache:', error);
      throw new Error('Failed to update leaderboard cache');
    }
  }

  /**
   * 获取排行榜统计
   */
  async getLeaderboardStats(): Promise<{
    totalParticipants: number
    averageInvites: number
    topPerformerThreshold: number
    lastUpdated: Date
  }> {
    try {
      const query = `
        SELECT 
          COUNT(DISTINCT u.id) as total_participants,
          AVG(invite_counts.invite_count) as average_invites,
          PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY invite_counts.invite_count) as top_performer_threshold
        FROM users u
        JOIN (
          SELECT 
            ic.inviter_id,
            COUNT(DISTINCT ir.id) as invite_count
          FROM invite_codes ic
          LEFT JOIN invite_registrations ir ON ic.id = ir.invite_code_id
          GROUP BY ic.inviter_id
          HAVING COUNT(DISTINCT ir.id) > 0
        ) invite_counts ON u.id = invite_counts.inviter_id
      `;

      const result = await this.db.queryOne<{
        total_participants: number | string;
        average_invites: number | string;
        top_performer_threshold: number | string;
      }>(query);

      return {
        totalParticipants: Number(result?.total_participants) || 0,
        averageInvites: Number(result?.average_invites) || 0,
        topPerformerThreshold: Number(result?.top_performer_threshold) || 0,
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error('Failed to get leaderboard stats:', error);
      throw new Error('Failed to get leaderboard stats');
    }
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(type: string, filter: LeaderboardFilter, limit: number): string {
    const filterStr = JSON.stringify(filter);
    const hash = this.simpleHash(filterStr);
    return `${this.cachePrefix}${type}:${hash}:${limit}`;
  }

  /**
   * 简单哈希函数
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 从缓存获取数据
   */
  private async getFromCache(key: string): Promise<LeaderboardEntry[] | null> {
    try {
      // 这里应该实现Redis缓存获取
      // 暂时返回null，表示缓存未命中
      return null;
    } catch (error) {
      console.error('Failed to get from cache:', error);
      return null;
    }
  }

  /**
   * 设置缓存
   */
  private async setCache(key: string, data: LeaderboardEntry[]): Promise<void> {
    try {
      // 这里应该实现Redis缓存设置
      // 暂时只记录日志
      console.log(`Cache set for key: ${key}, data length: ${data.length}`);
    } catch (error) {
      console.error('Failed to set cache:', error);
    }
  }

  /**
   * 删除缓存
   */
  private async deleteFromCache(key: string): Promise<void> {
    try {
      // 这里应该实现Redis缓存删除
      // 暂时只记录日志
      console.log(`Cache deleted for key: ${key}`);
    } catch (error) {
      console.error('Failed to delete from cache:', error);
    }
  }
}
