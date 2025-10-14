/**
 * 分享追踪服务
 * 负责记录分享事件和统计数据
 */

import { DatabaseService } from '../database';
import { SharePlatform, ShareStats, InviteEvent, InviteEventType } from '../types';

type NumericValue = number | string | null | undefined;

interface ShareStatsRow {
  platform: string;
  share_count: NumericValue;
  click_count: NumericValue;
  conversion_count: NumericValue;
}

interface PlatformStatsRow {
  total_shares: NumericValue;
  total_clicks: NumericValue;
  total_conversions: NumericValue;
}

interface TopShareRow {
  invite_code_id: string;
  invite_code: string;
  share_count: NumericValue;
  click_count: NumericValue;
  conversion_count: NumericValue;
}

interface ShareEventRow {
  id: string;
  invite_code_id: string;
  platform: string;
  event_type: string;
  timestamp: Date | string;
  ip_address?: string | null;
  user_agent?: string | null;
  referrer?: string | null;
  metadata?: string | null;
}

export interface ShareEvent {
  id?: string
  inviteCodeId: string
  platform: SharePlatform
  eventType: 'share' | 'click' | 'conversion'
  timestamp: Date
  ipAddress?: string
  userAgent?: string
  referrer?: string
  metadata?: Record<string, any>
}

export class ShareTrackingService {
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

  private parseMetadata<T = Record<string, unknown>>(value?: string | null): T | undefined {
    if (!value) {
      return undefined;
    }
    try {
      return JSON.parse(value) as T;
    } catch (error) {
      console.warn('Failed to parse share event metadata', error);
      return undefined;
    }
  }

  /**
   * 记录分享事件
   */
  async trackShareEvent(
    inviteCodeId: string,
    platform: SharePlatform,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const event: ShareEvent = {
      inviteCodeId,
      platform,
      eventType: 'share',
      timestamp: new Date(),
      metadata,
    };

    await this.recordShareEvent(event);

    // 同时记录到邀请事件系统
    const inviteEvent: InviteEvent = {
      type: InviteEventType.CODE_SHARED,
      inviterId: '', // 需要从邀请码获取
      inviteCodeId,
      timestamp: new Date(),
      metadata: { platform, ...metadata },
    };

    await this.recordInviteEvent(inviteEvent);
  }

  /**
   * 记录点击事件
   */
  async trackClickEvent(
    inviteCodeId: string,
    platform: SharePlatform,
    ipAddress?: string,
    userAgent?: string,
    referrer?: string,
  ): Promise<void> {
    const event: ShareEvent = {
      inviteCodeId,
      platform,
      eventType: 'click',
      timestamp: new Date(),
      ipAddress,
      userAgent,
      referrer,
    };

    await this.recordShareEvent(event);

    // 记录到邀请事件系统
    const inviteEvent: InviteEvent = {
      type: InviteEventType.LINK_CLICKED,
      inviterId: '', // 需要从邀请码获取
      inviteCodeId,
      timestamp: new Date(),
      metadata: { platform, ipAddress, userAgent, referrer },
    };

    await this.recordInviteEvent(inviteEvent);
  }

  /**
   * 记录转化事件
   */
  async trackConversionEvent(
    inviteCodeId: string,
    platform: SharePlatform,
    inviteeId: string,
  ): Promise<void> {
    const event: ShareEvent = {
      inviteCodeId,
      platform,
      eventType: 'conversion',
      timestamp: new Date(),
      metadata: { inviteeId },
    };

    await this.recordShareEvent(event);
  }

  /**
   * 获取分享统计数据
   */
  async getShareStats(inviteCodeId: string): Promise<ShareStats[]> {
    const query = `
      SELECT 
        platform,
        COUNT(CASE WHEN event_type = 'share' THEN 1 END) as share_count,
        COUNT(CASE WHEN event_type = 'click' THEN 1 END) as click_count,
        COUNT(CASE WHEN event_type = 'conversion' THEN 1 END) as conversion_count
      FROM share_events 
      WHERE invite_code_id = ?
      GROUP BY platform
    `;

    const results = await this.db.query<ShareStatsRow>(query, [inviteCodeId]);

    return results.map((row) => ({
      inviteCodeId,
      platform: row.platform as SharePlatform,
      shareCount: this.toNumber(row.share_count),
      clickCount: this.toNumber(row.click_count),
      conversionCount: this.toNumber(row.conversion_count),
    }));
  }

  /**
   * 获取平台分享统计
   */
  async getPlatformShareStats(
    platform: SharePlatform,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalShares: number
    totalClicks: number
    totalConversions: number
    conversionRate: number
  }> {
    let query = `
      SELECT 
        COUNT(CASE WHEN event_type = 'share' THEN 1 END) as total_shares,
        COUNT(CASE WHEN event_type = 'click' THEN 1 END) as total_clicks,
        COUNT(CASE WHEN event_type = 'conversion' THEN 1 END) as total_conversions
      FROM share_events 
      WHERE platform = ?
    `;

    const params: any[] = [platform];

    if (startDate && endDate) {
      query += ' AND timestamp BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    const summary = await this.db.queryOne<PlatformStatsRow>(query, params);

    const totalShares = this.toNumber(summary?.total_shares);
    const totalClicks = this.toNumber(summary?.total_clicks);
    const totalConversions = this.toNumber(summary?.total_conversions);
    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

    return {
      totalShares,
      totalClicks,
      totalConversions,
      conversionRate,
    };
  }

  /**
   * 获取热门分享链接
   */
  async getTopSharedInvites(
    limit: number = 10,
    platform?: SharePlatform,
    startDate?: Date,
    endDate?: Date,
  ): Promise<Array<{
    inviteCodeId: string
    inviteCode: string
    shareCount: number
    clickCount: number
    conversionCount: number
    conversionRate: number
  }>> {
    let query = `
      SELECT 
        se.invite_code_id,
        ic.code as invite_code,
        COUNT(CASE WHEN se.event_type = 'share' THEN 1 END) as share_count,
        COUNT(CASE WHEN se.event_type = 'click' THEN 1 END) as click_count,
        COUNT(CASE WHEN se.event_type = 'conversion' THEN 1 END) as conversion_count
      FROM share_events se
      JOIN invite_codes ic ON se.invite_code_id = ic.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (platform) {
      query += ' AND se.platform = ?';
      params.push(platform);
    }

    if (startDate && endDate) {
      query += ' AND se.timestamp BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    query += `
      GROUP BY se.invite_code_id, ic.code
      ORDER BY share_count DESC, click_count DESC
      LIMIT ?
    `;
    params.push(limit);

    const results = await this.db.query<TopShareRow>(query, params);

    return results.map((row) => {
      const shareCount = this.toNumber(row.share_count);
      const clickCount = this.toNumber(row.click_count);
      const conversionCount = this.toNumber(row.conversion_count);
      const conversionRate = clickCount > 0 ? (conversionCount / clickCount) * 100 : 0;

      return {
        inviteCodeId: row.invite_code_id,
        inviteCode: row.invite_code,
        shareCount,
        clickCount,
        conversionCount,
        conversionRate,
      };
    });
  }

  /**
   * 记录分享事件到数据库
   */
  private async recordShareEvent(event: ShareEvent): Promise<void> {
    const query = `
      INSERT INTO share_events (
        invite_code_id, platform, event_type, timestamp, 
        ip_address, user_agent, referrer, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db.execute(query, [
      event.inviteCodeId,
      event.platform,
      event.eventType,
      event.timestamp,
      event.ipAddress || null,
      event.userAgent || null,
      event.referrer || null,
      event.metadata ? JSON.stringify(event.metadata) : null,
    ]);
  }

  /**
   * 记录邀请事件
   */
  private async recordInviteEvent(event: InviteEvent): Promise<void> {
    // 这里应该调用 AnalyticsService 来记录邀请事件
    // 为了简化，这里只是一个占位实现
    console.log('Recording invite event:', event);
  }

  /**
   * 获取分享链接的详细追踪信息
   */
  async getShareTrackingDetails(
    inviteCodeId: string,
    platform?: SharePlatform,
    limit: number = 50,
  ): Promise<ShareEvent[]> {
    let query = `
      SELECT * FROM share_events 
      WHERE invite_code_id = ?
    `;

    const params: unknown[] = [inviteCodeId];

    if (platform) {
      query += ' AND platform = ?';
      params.push(platform);
    }

    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(limit);

    const results = await this.db.query<ShareEventRow>(query, params);

    return results.map((row) => ({
      id: row.id,
      inviteCodeId: row.invite_code_id,
      platform: row.platform as SharePlatform,
      eventType: row.event_type as 'share' | 'click' | 'conversion',
      timestamp: new Date(row.timestamp),
      ipAddress: row.ip_address || undefined,
      userAgent: row.user_agent || undefined,
      referrer: row.referrer || undefined,
      metadata: this.parseMetadata(row.metadata),
    }));
  }

  /**
   * 清理过期的追踪数据
   */
  async cleanupOldTrackingData(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const query = 'DELETE FROM share_events WHERE timestamp < ?';
    const result = await this.db.execute(query, [cutoffDate]);

    return result.affectedRows || 0;
  }
}

// 兼容性导出
export const ShareTrackingServiceImpl = ShareTrackingService;
