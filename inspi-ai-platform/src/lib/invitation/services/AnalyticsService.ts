/**
 * 统计分析服务实现
 * 提供完整的邀请数据统计和分析功能
 */

import { DatabaseService } from '../database';
import {
  InviteEvent,
  InviteReport,
  LeaderboardEntry,
  PlatformStats,
  TimePeriod,
  InviteStats,
  InviteHistory,
  RewardSummary,
  InviteEventType,
  SharePlatform,
} from '../types';

export interface IAnalyticsService {
  // 记录邀请事件
  trackInviteEvent(event: InviteEvent): Promise<void>

  // 生成邀请报告
  generateInviteReport(userId: string, period: TimePeriod): Promise<InviteReport>

  // 获取排行榜
  getInviteLeaderboard(period: TimePeriod, limit: number): Promise<LeaderboardEntry[]>

  // 获取平台邀请统计
  getPlatformStats(period: TimePeriod): Promise<PlatformStats>

  // 更新用户统计
  updateUserStats(userId: string): Promise<void>

  // 获取转化率统计
  getConversionStats(period: TimePeriod): Promise<{ [key: string]: number }>

  // 获取用户邀请统计
  getUserInviteStats(userId: string): Promise<InviteStats>

  // 获取邀请历史
  getInviteHistory(userId: string, limit?: number): Promise<InviteHistory[]>

  // 获取实时统计数据
  getRealTimeStats(): Promise<{
    totalInvites: number
    todayInvites: number
    totalRegistrations: number
    todayRegistrations: number
    conversionRate: number
  }>

  // 获取趋势数据
  getTrendData(userId: string, days: number): Promise<Array<{
    date: string
    invites: number
    registrations: number
    rewards: number
  }>>
}

export class AnalyticsService implements IAnalyticsService {
  constructor(private db: DatabaseService) {}

  /**
   * 记录邀请事件
   */
  async trackInviteEvent(event: InviteEvent): Promise<void> {
    try {
      const query = `
        INSERT INTO invite_events (
          type, inviter_id, invitee_id, invite_code_id, 
          timestamp, metadata
        ) VALUES (?, ?, ?, ?, ?, ?)
      `;

      await this.db.execute(query, [
        event.type,
        event.inviterId,
        event.inviteeId || null,
        event.inviteCodeId,
        event.timestamp,
        event.metadata ? JSON.stringify(event.metadata) : null,
      ]);

      // 异步更新用户统计
      if (event.inviterId) {
        this.updateUserStats(event.inviterId).catch(error => {
          console.error('Failed to update user stats:', error);
        });
      }
    } catch (error) {
      console.error('Failed to track invite event:', error);
      throw new Error('Failed to track invite event');
    }
  }

  /**
   * 生成邀请报告
   */
  async generateInviteReport(userId: string, period: TimePeriod): Promise<InviteReport> {
    try {
      const stats = await this.getUserInviteStats(userId);
      const history = await this.getInviteHistory(userId, 10);
      const rewardsSummary = await this.getUserRewardsSummary(userId, period);

      return {
        userId,
        period,
        stats,
        topInvitees: history,
        rewardsSummary,
      };
    } catch (error) {
      console.error('Failed to generate invite report:', error);
      throw new Error('Failed to generate invite report');
    }
  }

  /**
   * 获取排行榜
   */
  async getInviteLeaderboard(period: TimePeriod, limit: number = 10): Promise<LeaderboardEntry[]> {
    try {
      const query = `
        SELECT 
          u.id as user_id,
          u.name as user_name,
          COUNT(DISTINCT ir.id) as invite_count,
          SUM(CASE WHEN r.type = 'ai_credits' THEN r.amount ELSE 0 END) as total_credits,
          COUNT(DISTINCT CASE WHEN r.type = 'badge' THEN r.id END) as badge_count,
          COUNT(DISTINCT CASE WHEN r.type = 'title' THEN r.id END) as title_count
        FROM users u
        LEFT JOIN invite_codes ic ON u.id = ic.inviter_id
        LEFT JOIN invite_registrations ir ON ic.id = ir.invite_code_id 
          AND ir.registered_at BETWEEN ? AND ?
        LEFT JOIN rewards r ON u.id = r.user_id 
          AND r.granted_at BETWEEN ? AND ?
        WHERE ic.id IS NOT NULL
        GROUP BY u.id, u.name
        HAVING invite_count > 0
        ORDER BY invite_count DESC, total_credits DESC
        LIMIT ?
      `;

      const results = await this.db.query<{
        user_id: string;
        user_name: string;
        invite_count: number;
        total_credits: number;
      }>(query, [
        period.start,
        period.end,
        period.start,
        period.end,
        limit,
      ]);

      return results.map((row, index: number) => ({
        userId: row.user_id,
        userName: row.user_name,
        inviteCount: Number(row.invite_count) || 0,
        rank: index + 1,
        rewards: {
          totalCredits: Number(row.total_credits) || 0,
          badges: [], // 需要单独查询具体徽章
          titles: [], // 需要单独查询具体称号
          premiumDays: 0,
        },
      }));
    } catch (error) {
      console.error('Failed to get invite leaderboard:', error);
      throw new Error('Failed to get invite leaderboard');
    }
  }

  /**
   * 获取平台邀请统计
   */
  async getPlatformStats(period: TimePeriod): Promise<PlatformStats> {
    try {
      const totalInvitesQuery = `
        SELECT COUNT(*) as total_invites
        FROM invite_events 
        WHERE type = 'code_generated' 
        AND timestamp BETWEEN ? AND ?
      `;

      const totalRegistrationsQuery = `
        SELECT COUNT(*) as total_registrations
        FROM invite_registrations 
        WHERE registered_at BETWEEN ? AND ?
      `;

      const topInvitersQuery = `
        SELECT 
          u.id as user_id,
          u.name as user_name,
          COUNT(ir.id) as invite_count,
          ROW_NUMBER() OVER (ORDER BY COUNT(ir.id) DESC) as rank
        FROM users u
        JOIN invite_codes ic ON u.id = ic.inviter_id
        JOIN invite_registrations ir ON ic.id = ir.invite_code_id
        WHERE ir.registered_at BETWEEN ? AND ?
        GROUP BY u.id, u.name
        ORDER BY invite_count DESC
        LIMIT 10
      `;

      const [totalInvitesResult] = await this.db.query<{ total_invites: number | string }>(
        totalInvitesQuery,
        [period.start, period.end],
      );
      const [totalRegistrationsResult] = await this.db.query<{ total_registrations: number | string }>(
        totalRegistrationsQuery,
        [period.start, period.end],
      );
      const topInvitersResults = await this.db.query<{
        user_id: string;
        user_name: string;
        invite_count: number | string;
        rank: number | string;
      }>(topInvitersQuery, [period.start, period.end]);

      const totalInvites = Number(totalInvitesResult?.total_invites) || 0;
      const totalRegistrations = Number(totalRegistrationsResult?.total_registrations) || 0;
      const conversionRate = totalInvites > 0 ? (totalRegistrations / totalInvites) * 100 : 0;

      const topInviters: LeaderboardEntry[] = topInvitersResults.map(row => ({
        userId: row.user_id,
        userName: row.user_name,
        inviteCount: Number(row.invite_count) || 0,
        rank: Number(row.rank) || 0,
        rewards: {
          totalCredits: 0,
          badges: [],
          titles: [],
          premiumDays: 0,
        },
      }));

      return {
        period,
        totalInvites,
        totalRegistrations,
        conversionRate,
        topInviters,
        rewardsDistributed: {
          totalCredits: 0, // 需要单独计算
          badges: [],
          titles: [],
          premiumDays: 0,
        },
      };
    } catch (error) {
      console.error('Failed to get platform stats:', error);
      throw new Error('Failed to get platform stats');
    }
  }

  /**
   * 更新用户统计
   */
  async updateUserStats(userId: string): Promise<void> {
    try {
      const query = `
        INSERT INTO invite_stats (
          user_id, total_invites, successful_registrations, 
          active_invitees, total_rewards_earned, last_updated
        )
        SELECT 
          ? as user_id,
          COUNT(DISTINCT ic.id) as total_invites,
          COUNT(DISTINCT ir.id) as successful_registrations,
          COUNT(DISTINCT CASE WHEN ir.is_activated = 1 THEN ir.id END) as active_invitees,
          COALESCE(SUM(CASE WHEN r.type = 'ai_credits' THEN r.amount ELSE 0 END), 0) as total_rewards_earned,
          NOW() as last_updated
        FROM invite_codes ic
        LEFT JOIN invite_registrations ir ON ic.id = ir.invite_code_id
        LEFT JOIN rewards r ON ? = r.user_id
        WHERE ic.inviter_id = ?
        ON DUPLICATE KEY UPDATE
          total_invites = VALUES(total_invites),
          successful_registrations = VALUES(successful_registrations),
          active_invitees = VALUES(active_invitees),
          total_rewards_earned = VALUES(total_rewards_earned),
          last_updated = VALUES(last_updated)
      `;

      await this.db.execute(query, [userId, userId, userId]);
    } catch (error) {
      console.error('Failed to update user stats:', error);
      throw new Error('Failed to update user stats');
    }
  }

  /**
   * 获取转化率统计
   */
  async getConversionStats(period: TimePeriod): Promise<{ [key: string]: number }> {
    try {
      const query = `
        SELECT 
          DATE(ie.timestamp) as date,
          COUNT(CASE WHEN ie.type = 'code_generated' THEN 1 END) as invites,
          COUNT(CASE WHEN ie.type = 'user_registered' THEN 1 END) as registrations,
          COUNT(CASE WHEN ie.type = 'user_activated' THEN 1 END) as activations
        FROM invite_events ie
        WHERE ie.timestamp BETWEEN ? AND ?
        GROUP BY DATE(ie.timestamp)
        ORDER BY date
      `;

      const results = await this.db.query<{
        date: string;
        invites: number | string;
        registrations: number | string;
        activations: number | string;
      }>(query, [period.start, period.end]);

      const stats: { [key: string]: number } = {};

      results.forEach(row => {
        const date = row.date;
        const invites = Number(row.invites) || 0;
        const registrations = Number(row.registrations) || 0;
        const activations = Number(row.activations) || 0;

        stats[`${date}_invites`] = invites;
        stats[`${date}_registrations`] = registrations;
        stats[`${date}_activations`] = activations;
        stats[`${date}_conversion_rate`] = invites > 0 ? (registrations / invites) * 100 : 0;
        stats[`${date}_activation_rate`] = registrations > 0 ? (activations / registrations) * 100 : 0;
      });

      return stats;
    } catch (error) {
      console.error('Failed to get conversion stats:', error);
      throw new Error('Failed to get conversion stats');
    }
  }

  /**
   * 获取用户邀请统计
   */
  async getUserInviteStats(userId: string): Promise<InviteStats> {
    try {
      const query = `
        SELECT * FROM invite_stats WHERE user_id = ?
      `;

      const result = await this.db.queryOne<InviteStats>(query, [userId]);

      if (!result) {
        // 如果没有统计数据，先更新一次
        await this.updateUserStats(userId);
        const updatedResult = await this.db.queryOne<InviteStats>(query, [userId]);

        if (!updatedResult) {
          return {
            userId,
            totalInvites: 0,
            successfulRegistrations: 0,
            activeInvitees: 0,
            totalRewardsEarned: 0,
            lastUpdated: new Date(),
          };
        }

        return this.mapToInviteStats(updatedResult);
      }

      return this.mapToInviteStats(result);
    } catch (error) {
      console.error('Failed to get user invite stats:', error);
      throw new Error('Failed to get user invite stats');
    }
  }

  /**
   * 获取邀请历史
   */
  async getInviteHistory(userId: string, limit: number = 50): Promise<InviteHistory[]> {
    try {
      const query = `
        SELECT 
          ir.id,
          ic.code as invite_code,
          u.email as invitee_email,
          u.name as invitee_name,
          ir.registered_at,
          ir.is_activated,
          ir.activated_at,
          ir.rewards_claimed
        FROM invite_registrations ir
        JOIN invite_codes ic ON ir.invite_code_id = ic.id
        LEFT JOIN users u ON ir.invitee_id = u.id
        WHERE ic.inviter_id = ?
        ORDER BY ir.registered_at DESC
        LIMIT ?
      `;

      const results = await this.db.query<{
        id: string;
        invite_code: string;
        invitee_email: string;
        invitee_name: string;
        registered_at: string;
        is_activated: number;
        activated_at: string | null;
        rewards_claimed: number;
      }>(query, [userId, limit]);

      return results.map(row => ({
        id: row.id,
        inviteCode: row.invite_code,
        inviteeEmail: row.invitee_email,
        inviteeName: row.invitee_name,
        registeredAt: new Date(row.registered_at),
        isActivated: Boolean(row.is_activated),
        activatedAt: row.activated_at ? new Date(row.activated_at) : undefined,
        rewardsClaimed: Boolean(row.rewards_claimed),
      }));
    } catch (error) {
      console.error('Failed to get invite history:', error);
      throw new Error('Failed to get invite history');
    }
  }

  /**
   * 获取实时统计数据
   */
  async getRealTimeStats(): Promise<{
    totalInvites: number
    todayInvites: number
    totalRegistrations: number
    todayRegistrations: number
    conversionRate: number
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const totalInvitesQuery = `
        SELECT COUNT(*) as count FROM invite_codes
      `;

      const todayInvitesQuery = `
        SELECT COUNT(*) as count FROM invite_codes 
        WHERE created_at >= ?
      `;

      const totalRegistrationsQuery = `
        SELECT COUNT(*) as count FROM invite_registrations
      `;

      const todayRegistrationsQuery = `
        SELECT COUNT(*) as count FROM invite_registrations 
        WHERE registered_at >= ?
      `;

      const [totalInvites] = await this.db.query<{ count: number | string }>(totalInvitesQuery);
      const [todayInvites] = await this.db.query<{ count: number | string }>(todayInvitesQuery, [today]);
      const [totalRegistrations] = await this.db.query<{ count: number | string }>(totalRegistrationsQuery);
      const [todayRegistrations] = await this.db.query<{ count: number | string }>(todayRegistrationsQuery, [today]);

      const totalInvitesCount = Number(totalInvites?.count) || 0;
      const totalRegistrationsCount = Number(totalRegistrations?.count) || 0;
      const conversionRate = totalInvitesCount > 0 ? (totalRegistrationsCount / totalInvitesCount) * 100 : 0;

      return {
        totalInvites: totalInvitesCount,
        todayInvites: Number(todayInvites?.count) || 0,
        totalRegistrations: totalRegistrationsCount,
        todayRegistrations: Number(todayRegistrations?.count) || 0,
        conversionRate,
      };
    } catch (error) {
      console.error('Failed to get real-time stats:', error);
      throw new Error('Failed to get real-time stats');
    }
  }

  /**
   * 获取趋势数据
   */
  async getTrendData(userId: string, days: number = 30): Promise<Array<{
    date: string
    invites: number
    registrations: number
    rewards: number
  }>> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const query = `
        SELECT 
          DATE(d.date) as date,
          COALESCE(ic_count.invites, 0) as invites,
          COALESCE(ir_count.registrations, 0) as registrations,
          COALESCE(r_count.rewards, 0) as rewards
        FROM (
          SELECT DATE(DATE_ADD(?, INTERVAL seq.seq DAY)) as date
          FROM (
            SELECT 0 as seq UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION 
            SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION
            SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION
            SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION
            SELECT 20 UNION SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24 UNION
            SELECT 25 UNION SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29 UNION
            SELECT 30
          ) seq
          WHERE seq.seq < ?
        ) d
        LEFT JOIN (
          SELECT DATE(created_at) as date, COUNT(*) as invites
          FROM invite_codes 
          WHERE inviter_id = ? AND created_at >= ?
          GROUP BY DATE(created_at)
        ) ic_count ON d.date = ic_count.date
        LEFT JOIN (
          SELECT DATE(ir.registered_at) as date, COUNT(*) as registrations
          FROM invite_registrations ir
          JOIN invite_codes ic ON ir.invite_code_id = ic.id
          WHERE ic.inviter_id = ? AND ir.registered_at >= ?
          GROUP BY DATE(ir.registered_at)
        ) ir_count ON d.date = ir_count.date
        LEFT JOIN (
          SELECT DATE(granted_at) as date, COUNT(*) as rewards
          FROM rewards 
          WHERE user_id = ? AND granted_at >= ?
          GROUP BY DATE(granted_at)
        ) r_count ON d.date = r_count.date
        ORDER BY d.date
      `;

      const results = await this.db.query<{
        date: string;
        invites: number | string;
        registrations: number | string;
        rewards: number | string;
      }>(query, [
        startDate, days, userId, startDate, userId, startDate, userId, startDate,
      ]);

      return results.map(row => ({
        date: row.date,
        invites: Number(row.invites) || 0,
        registrations: Number(row.registrations) || 0,
        rewards: Number(row.rewards) || 0,
      }));
    } catch (error) {
      console.error('Failed to get trend data:', error);
      throw new Error('Failed to get trend data');
    }
  }

  /**
   * 获取用户奖励汇总
   */
  private async getUserRewardsSummary(userId: string, period: TimePeriod): Promise<RewardSummary> {
    try {
      const query = `
        SELECT 
          type,
          SUM(CASE WHEN type = 'ai_credits' THEN amount ELSE 0 END) as total_credits,
          GROUP_CONCAT(CASE WHEN type = 'badge' THEN badge_id END) as badges,
          GROUP_CONCAT(CASE WHEN type = 'title' THEN title_id END) as titles,
          SUM(CASE WHEN type = 'premium_access' THEN amount ELSE 0 END) as premium_days
        FROM rewards 
        WHERE user_id = ? AND granted_at BETWEEN ? AND ?
        GROUP BY type
      `;

      const results = await this.db.query<{
        type: string;
        total_credits: number | string;
        badges: string | null;
        titles: string | null;
        premium_days: number | string;
      }>(query, [userId, period.start, period.end]);

      let totalCredits = 0;
      let badges: string[] = [];
      let titles: string[] = [];
      let premiumDays = 0;

      results.forEach(row => {
        if (row.type === 'ai_credits') {
          totalCredits += Number(row.total_credits) || 0;
        } else if (row.type === 'badge' && row.badges) {
          badges = row.badges.toString().split(',').filter(Boolean);
        } else if (row.type === 'title' && row.titles) {
          titles = row.titles.toString().split(',').filter(Boolean);
        } else if (row.type === 'premium_access') {
          premiumDays += Number(row.premium_days) || 0;
        }
      });

      return {
        totalCredits,
        badges,
        titles,
        premiumDays,
      };
    } catch (error) {
      console.error('Failed to get user rewards summary:', error);
      return {
        totalCredits: 0,
        badges: [],
        titles: [],
        premiumDays: 0,
      };
    }
  }

  /**
   * 映射数据库结果到InviteStats类型
   */
  private mapToInviteStats(row: any): InviteStats {
    return {
      userId: row.user_id,
      totalInvites: parseInt(row.total_invites, 10) || 0,
      successfulRegistrations: parseInt(row.successful_registrations, 10) || 0,
      activeInvitees: parseInt(row.active_invitees, 10) || 0,
      totalRewardsEarned: parseInt(row.total_rewards_earned, 10) || 0,
      lastUpdated: new Date(row.last_updated),
    };
  }
}
