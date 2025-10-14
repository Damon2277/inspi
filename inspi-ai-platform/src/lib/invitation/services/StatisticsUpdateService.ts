/**
 * 统计数据更新服务
 * 负责实时更新和维护邀请统计数据
 */

import { DatabaseService } from '../database';
import { InviteEventType } from '../types';

type NumericValue = number | string | null | undefined;

interface LastUpdateRow {
  last_update: Date | string | null;
}

interface PendingUserRow {
  user_id: string;
}

interface ConsistencyRow {
  user_id: string;
  stats_total_invites: NumericValue;
  actual_total_invites: NumericValue;
  stats_registrations: NumericValue;
  actual_registrations: NumericValue;
  stats_active: NumericValue;
  actual_active: NumericValue;
}

export interface StatisticsUpdateService {
  // 更新用户统计
  updateUserStatistics(userId: string): Promise<void>

  // 批量更新统计
  batchUpdateStatistics(userIds: string[]): Promise<void>

  // 重新计算所有统计
  recalculateAllStatistics(): Promise<void>

  // 清理过期统计数据
  cleanupExpiredData(daysToKeep: number): Promise<number>

  // 更新排行榜缓存
  updateLeaderboardCache(): Promise<void>

  // 获取统计更新状态
  getUpdateStatus(): Promise<{
    lastUpdate: Date
    pendingUpdates: number
    isUpdating: boolean
  }>
}

export class StatisticsUpdateServiceImpl implements StatisticsUpdateService {
  private isUpdating = false;
  private updateQueue = new Set<string>();

  constructor(private db: DatabaseService) {}

  private toNumber(value: NumericValue): number {
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  /**
   * 更新用户统计
   */
  async updateUserStatistics(userId: string): Promise<void> {
    try {
      // 添加到更新队列
      this.updateQueue.add(userId);

      // 如果正在更新，直接返回
      if (this.isUpdating) {
        return;
      }

      await this.processUpdateQueue();
    } catch (error) {
      console.error('Failed to update user statistics:', error);
      throw new Error('Failed to update user statistics');
    }
  }

  /**
   * 批量更新统计
   */
  async batchUpdateStatistics(userIds: string[]): Promise<void> {
    try {
      // 添加到更新队列
      userIds.forEach(userId => this.updateQueue.add(userId));

      await this.processUpdateQueue();
    } catch (error) {
      console.error('Failed to batch update statistics:', error);
      throw new Error('Failed to batch update statistics');
    }
  }

  /**
   * 处理更新队列
   */
  private async processUpdateQueue(): Promise<void> {
    if (this.isUpdating || this.updateQueue.size === 0) {
      return;
    }

    this.isUpdating = true;

    try {
      const userIds = Array.from(this.updateQueue);
      this.updateQueue.clear();

      // 批量更新用户统计
      await this.batchUpdateUserStats(userIds);

      // 如果队列中有新的更新请求，递归处理
      if (this.updateQueue.size > 0) {
        await this.processUpdateQueue();
      }
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * 批量更新用户统计数据
   */
  private async batchUpdateUserStats(userIds: string[]): Promise<void> {
    if (userIds.length === 0) return;

    const placeholders = userIds.map(() => '?').join(',');

    const query = `
      INSERT INTO invite_stats (
        user_id, total_invites, successful_registrations, 
        active_invitees, total_rewards_earned, last_updated
      )
      SELECT 
        u.id as user_id,
        COALESCE(stats.total_invites, 0) as total_invites,
        COALESCE(stats.successful_registrations, 0) as successful_registrations,
        COALESCE(stats.active_invitees, 0) as active_invitees,
        COALESCE(rewards.total_rewards_earned, 0) as total_rewards_earned,
        NOW() as last_updated
      FROM (SELECT id FROM users WHERE id IN (${placeholders})) u
      LEFT JOIN (
        SELECT 
          ic.inviter_id,
          COUNT(DISTINCT ic.id) as total_invites,
          COUNT(DISTINCT ir.id) as successful_registrations,
          COUNT(DISTINCT CASE WHEN ir.is_activated = 1 THEN ir.id END) as active_invitees
        FROM invite_codes ic
        LEFT JOIN invite_registrations ir ON ic.id = ir.invite_code_id
        WHERE ic.inviter_id IN (${placeholders})
        GROUP BY ic.inviter_id
      ) stats ON u.id = stats.inviter_id
      LEFT JOIN (
        SELECT 
          user_id,
          SUM(CASE WHEN type = 'ai_credits' THEN amount ELSE 0 END) as total_rewards_earned
        FROM rewards 
        WHERE user_id IN (${placeholders})
        GROUP BY user_id
      ) rewards ON u.id = rewards.user_id
      ON DUPLICATE KEY UPDATE
        total_invites = VALUES(total_invites),
        successful_registrations = VALUES(successful_registrations),
        active_invitees = VALUES(active_invitees),
        total_rewards_earned = VALUES(total_rewards_earned),
        last_updated = VALUES(last_updated)
    `;

    await this.db.execute(query, [...userIds, ...userIds, ...userIds]);
  }

  /**
   * 重新计算所有统计
   */
  async recalculateAllStatistics(): Promise<void> {
    try {
      console.log('Starting full statistics recalculation...');

      // 清空现有统计数据
      await this.db.execute('DELETE FROM invite_stats');

      // 获取所有有邀请记录的用户
      const usersQuery = `
        SELECT DISTINCT inviter_id as user_id 
        FROM invite_codes 
        WHERE inviter_id IS NOT NULL
      `;

      const users = await this.db.query<PendingUserRow>(usersQuery);
      const userIds = users.map(row => row.user_id);

      // 分批处理用户统计更新
      const batchSize = 100;
      for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize);
        await this.batchUpdateUserStats(batch);

        // 添加小延迟避免数据库压力过大
        if (i + batchSize < userIds.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // 更新排行榜缓存
      await this.updateLeaderboardCache();

      console.log(`Statistics recalculation completed for ${userIds.length} users`);
    } catch (error) {
      console.error('Failed to recalculate all statistics:', error);
      throw new Error('Failed to recalculate all statistics');
    }
  }

  /**
   * 清理过期统计数据
   */
  async cleanupExpiredData(daysToKeep: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      // 清理过期的邀请事件
      const eventsQuery = 'DELETE FROM invite_events WHERE timestamp < ?';
      const eventsResult = await this.db.execute(eventsQuery, [cutoffDate]);

      // 清理过期的分享事件
      const shareEventsQuery = 'DELETE FROM share_events WHERE timestamp < ?';
      const shareEventsResult = await this.db.execute(shareEventsQuery, [cutoffDate]);

      const totalDeleted = (eventsResult.affectedRows || 0) + (shareEventsResult.affectedRows || 0);

      console.log(`Cleaned up ${totalDeleted} expired records older than ${daysToKeep} days`);

      return totalDeleted;
    } catch (error) {
      console.error('Failed to cleanup expired data:', error);
      throw new Error('Failed to cleanup expired data');
    }
  }

  /**
   * 更新排行榜缓存
   */
  async updateLeaderboardCache(): Promise<void> {
    try {
      // 这里可以实现Redis缓存更新
      // 暂时只记录日志
      console.log('Leaderboard cache updated');
    } catch (error) {
      console.error('Failed to update leaderboard cache:', error);
      throw new Error('Failed to update leaderboard cache');
    }
  }

  /**
   * 获取统计更新状态
   */
  async getUpdateStatus(): Promise<{
    lastUpdate: Date
    pendingUpdates: number
    isUpdating: boolean
  }> {
    try {
      const lastUpdateQuery = `
        SELECT MAX(last_updated) as last_update 
        FROM invite_stats
      `;

      const result = await this.db.queryOne<LastUpdateRow>(lastUpdateQuery);

      return {
        lastUpdate: result?.last_update ? new Date(result.last_update) : new Date(0),
        pendingUpdates: this.updateQueue.size,
        isUpdating: this.isUpdating,
      };
    } catch (error) {
      console.error('Failed to get update status:', error);
      return {
        lastUpdate: new Date(0),
        pendingUpdates: this.updateQueue.size,
        isUpdating: this.isUpdating,
      };
    }
  }

  /**
   * 定期统计更新任务
   */
  async schedulePeriodicUpdate(): Promise<void> {
    try {
      // 获取需要更新的用户（最近有活动但统计数据过期的用户）
      const query = `
        SELECT DISTINCT ic.inviter_id as user_id
        FROM invite_codes ic
        LEFT JOIN invite_stats ist ON ic.inviter_id = ist.user_id
        WHERE ic.created_at > DATE_SUB(NOW(), INTERVAL 1 DAY)
        AND (ist.last_updated IS NULL OR ist.last_updated < DATE_SUB(NOW(), INTERVAL 1 HOUR))
        LIMIT 1000
      `;

      const users = await this.db.query<PendingUserRow>(query);
      const userIds = users.map(row => row.user_id);

      if (userIds.length > 0) {
        await this.batchUpdateStatistics(userIds);
        console.log(`Periodic update completed for ${userIds.length} users`);
      }
    } catch (error) {
      console.error('Failed to run periodic update:', error);
    }
  }

  /**
   * 启动定期更新任务
   */
  startPeriodicUpdates(intervalMinutes: number = 30): void {
    setInterval(() => {
      this.schedulePeriodicUpdate();
    }, intervalMinutes * 60 * 1000);

    console.log(`Periodic statistics updates started (every ${intervalMinutes} minutes)`);
  }

  /**
   * 验证统计数据一致性
   */
  async validateStatisticsConsistency(): Promise<{
    isConsistent: boolean
    inconsistencies: Array<{
      userId: string
      field: string
      expected: number
      actual: number
    }>
  }> {
    try {
      const query = `
        SELECT 
          u.id as user_id,
          COALESCE(ist.total_invites, 0) as stats_total_invites,
          COALESCE(actual.total_invites, 0) as actual_total_invites,
          COALESCE(ist.successful_registrations, 0) as stats_registrations,
          COALESCE(actual.successful_registrations, 0) as actual_registrations,
          COALESCE(ist.active_invitees, 0) as stats_active,
          COALESCE(actual.active_invitees, 0) as actual_active
        FROM users u
        LEFT JOIN invite_stats ist ON u.id = ist.user_id
        LEFT JOIN (
          SELECT 
            ic.inviter_id,
            COUNT(DISTINCT ic.id) as total_invites,
            COUNT(DISTINCT ir.id) as successful_registrations,
            COUNT(DISTINCT CASE WHEN ir.is_activated = 1 THEN ir.id END) as active_invitees
          FROM invite_codes ic
          LEFT JOIN invite_registrations ir ON ic.id = ir.invite_code_id
          GROUP BY ic.inviter_id
        ) actual ON u.id = actual.inviter_id
        WHERE ist.user_id IS NOT NULL OR actual.inviter_id IS NOT NULL
      `;

      const results = await this.db.query<ConsistencyRow>(query);
      const inconsistencies: Array<{
        userId: string
        field: string
        expected: number
        actual: number
      }> = [];

      results.forEach((row) => {
        const statsTotalInvites = this.toNumber(row.stats_total_invites);
        const actualTotalInvites = this.toNumber(row.actual_total_invites);
        const statsRegistrations = this.toNumber(row.stats_registrations);
        const actualRegistrations = this.toNumber(row.actual_registrations);
        const statsActive = this.toNumber(row.stats_active);
        const actualActive = this.toNumber(row.actual_active);

        if (statsTotalInvites !== actualTotalInvites) {
          inconsistencies.push({
            userId: row.user_id,
            field: 'total_invites',
            expected: actualTotalInvites,
            actual: statsTotalInvites,
          });
        }

        if (statsRegistrations !== actualRegistrations) {
          inconsistencies.push({
            userId: row.user_id,
            field: 'successful_registrations',
            expected: actualRegistrations,
            actual: statsRegistrations,
          });
        }

        if (statsActive !== actualActive) {
          inconsistencies.push({
            userId: row.user_id,
            field: 'active_invitees',
            expected: actualActive,
            actual: statsActive,
          });
        }
      });

      return {
        isConsistent: inconsistencies.length === 0,
        inconsistencies,
      };
    } catch (error) {
      console.error('Failed to validate statistics consistency:', error);
      throw new Error('Failed to validate statistics consistency');
    }
  }
}
