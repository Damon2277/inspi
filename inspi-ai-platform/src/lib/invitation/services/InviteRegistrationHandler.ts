/**
 * 邀请注册处理器
 * 处理邀请链接验证、用户激活状态管理等逻辑
 */

import { logger } from '../../utils/logger';
import { DatabaseFactory } from '../database';
import {
  InviteRegistration,
  InviteEvent,
  InviteEventType,
  InviteErrorCode,
  InviteError,
} from '../types';
import { generateUUID } from '../utils';

export interface InviteRegistrationHandler {
  // 激活用户（用户完成首次作品创建等关键操作时调用）
  activateUser(userId: string): Promise<boolean>

  // 检查用户是否通过邀请注册
  isInvitedUser(userId: string): Promise<boolean>

  // 获取用户的邀请注册信息
  getUserInviteRegistration(userId: string): Promise<InviteRegistration | null>

  // 记录邀请事件
  logInviteEvent(event: InviteEvent): Promise<void>

  // 处理邀请链接点击
  handleInviteLinkClick(inviteCode: string, ipAddress?: string, userAgent?: string): Promise<void>

  // 批量激活用户（用于数据修复或批量操作）
  batchActivateUsers(userIds: string[]): Promise<{ success: string[], failed: string[] }>
}

export class InviteRegistrationHandlerImpl implements InviteRegistrationHandler {
  private db = DatabaseFactory.getInstance();

  async activateUser(userId: string): Promise<boolean> {
    return await this.db.transaction(async (connection) => {
      try {
        // 查找用户的邀请注册记录
        const registrations = await connection.query<any>(
          'SELECT * FROM invite_registrations WHERE invitee_id = ? AND is_activated = false',
          [userId],
        );

        if (registrations.length === 0) {
          logger.info('No pending invite registration found for user', { userId });
          return false;
        }

        const registration = registrations[0];
        const activatedAt = new Date();

        // 更新激活状态
        await connection.execute(
          'UPDATE invite_registrations SET is_activated = true, activated_at = ? WHERE id = ?',
          [activatedAt, registration.id],
        );

        // 记录激活事件
        await this.logInviteEvent({
          type: InviteEventType.USER_ACTIVATED,
          inviterId: registration.inviter_id,
          inviteeId: userId,
          inviteCodeId: registration.invite_code_id,
          timestamp: activatedAt,
        });

        // 更新邀请人统计中的活跃邀请人数
        await this.updateInviterActiveCount(registration.inviter_id);

        logger.info('User activated successfully', {
          userId,
          inviterId: registration.inviter_id,
          registrationId: registration.id,
        });

        return true;

      } catch (error) {
        logger.error('Failed to activate user', { userId, error });
        throw error;
      }
    });
  }

  async isInvitedUser(userId: string): Promise<boolean> {
    try {
      const results = await this.db.query<any>(
        'SELECT id FROM invite_registrations WHERE invitee_id = ?',
        [userId],
      );

      return results.length > 0;

    } catch (error) {
      logger.error('Failed to check if user is invited', { userId, error });
      throw error;
    }
  }

  async getUserInviteRegistration(userId: string): Promise<InviteRegistration | null> {
    try {
      const results = await this.db.query<any>(
        `SELECT ir.*, ic.code as invite_code
         FROM invite_registrations ir
         JOIN invite_codes ic ON ir.invite_code_id = ic.id
         WHERE ir.invitee_id = ?`,
        [userId],
      );

      if (results.length === 0) {
        return null;
      }

      const row = results[0];
      return {
        id: row.id,
        inviteCodeId: row.invite_code_id,
        inviterId: row.inviter_id,
        inviteeId: row.invitee_id,
        registeredAt: row.registered_at,
        isActivated: row.is_activated,
        activatedAt: row.activated_at,
        rewardsClaimed: row.rewards_claimed,
      };

    } catch (error) {
      logger.error('Failed to get user invite registration', { userId, error });
      throw error;
    }
  }

  async logInviteEvent(event: InviteEvent): Promise<void> {
    try {
      const eventId = generateUUID();

      await this.db.execute(
        `INSERT INTO invite_event_logs 
         (id, event_type, inviter_id, invitee_id, invite_code_id, timestamp, ip_address, user_agent, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          eventId,
          event.type,
          event.inviterId,
          event.inviteeId || null,
          event.inviteCodeId,
          event.timestamp,
          event.metadata?.ipAddress || null,
          event.metadata?.userAgent || null,
          event.metadata ? JSON.stringify(event.metadata) : null,
        ],
      );

      logger.debug('Invite event logged', { eventId, eventType: event.type });

    } catch (error) {
      logger.error('Failed to log invite event', { event, error });
      // 不抛出错误，避免影响主流程
    }
  }

  async handleInviteLinkClick(inviteCode: string, ipAddress?: string, userAgent?: string): Promise<void> {
    try {
      // 查找邀请码信息
      const inviteCodes = await this.db.query<any>(
        'SELECT * FROM invite_codes WHERE code = ?',
        [inviteCode],
      );

      if (inviteCodes.length === 0) {
        logger.warn('Invite link clicked with invalid code', { inviteCode, ipAddress });
        return;
      }

      const inviteCodeData = inviteCodes[0];

      // 记录链接点击事件
      await this.logInviteEvent({
        type: InviteEventType.LINK_CLICKED,
        inviterId: inviteCodeData.inviter_id,
        inviteCodeId: inviteCodeData.id,
        timestamp: new Date(),
        metadata: {
          ipAddress,
          userAgent,
          inviteCode,
        },
      });

      // 更新分享统计（如果有对应的分享记录）
      await this.updateShareClickStats(inviteCodeData.id);

      logger.info('Invite link click recorded', { inviteCode, ipAddress });

    } catch (error) {
      logger.error('Failed to handle invite link click', { inviteCode, ipAddress, error });
      // 不抛出错误，避免影响用户体验
    }
  }

  async batchActivateUsers(userIds: string[]): Promise<{ success: string[], failed: string[] }> {
    const success: string[] = [];
    const failed: string[] = [];

    for (const userId of userIds) {
      try {
        const activated = await this.activateUser(userId);
        if (activated) {
          success.push(userId);
        } else {
          failed.push(userId);
        }
      } catch (error) {
        logger.error('Failed to activate user in batch', { userId, error });
        failed.push(userId);
      }
    }

    logger.info('Batch user activation completed', {
      total: userIds.length,
      success: success.length,
      failed: failed.length,
    });

    return { success, failed };
  }

  // 私有方法：更新邀请人的活跃邀请人数统计
  private async updateInviterActiveCount(inviterId: string): Promise<void> {
    try {
      const [activeCount] = await this.db.query<{ count: number }>(
        'SELECT COUNT(*) as count FROM invite_registrations WHERE inviter_id = ? AND is_activated = true',
        [inviterId],
      );

      await this.db.execute(
        'UPDATE invite_stats SET active_invitees = ? WHERE user_id = ?',
        [activeCount.count, inviterId],
      );

    } catch (error) {
      logger.error('Failed to update inviter active count', { inviterId, error });
      // 不抛出错误，避免影响主流程
    }
  }

  // 私有方法：更新分享点击统计
  private async updateShareClickStats(inviteCodeId: string): Promise<void> {
    try {
      // 更新通用链接分享的点击统计
      await this.db.execute(
        `INSERT INTO share_stats (id, invite_code_id, platform, click_count)
         VALUES (?, ?, 'link', 1)
         ON DUPLICATE KEY UPDATE click_count = click_count + 1`,
        [generateUUID(), inviteCodeId],
      );

    } catch (error) {
      logger.error('Failed to update share click stats', { inviteCodeId, error });
      // 不抛出错误
    }
  }

  // 获取邀请注册的详细统计信息
  async getInviteRegistrationStats(inviterId: string, days: number = 30): Promise<{
    totalRegistrations: number
    activatedRegistrations: number
    recentRegistrations: number
    activationRate: number
  }> {
    try {
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - days);

      const [totalResult] = await this.db.query<{ count: number }>(
        'SELECT COUNT(*) as count FROM invite_registrations WHERE inviter_id = ?',
        [inviterId],
      );

      const [activatedResult] = await this.db.query<{ count: number }>(
        'SELECT COUNT(*) as count FROM invite_registrations WHERE inviter_id = ? AND is_activated = true',
        [inviterId],
      );

      const [recentResult] = await this.db.query<{ count: number }>(
        'SELECT COUNT(*) as count FROM invite_registrations WHERE inviter_id = ? AND registered_at >= ?',
        [inviterId, sinceDate],
      );

      const totalRegistrations = totalResult.count;
      const activatedRegistrations = activatedResult.count;
      const recentRegistrations = recentResult.count;
      const activationRate = totalRegistrations > 0 ? (activatedRegistrations / totalRegistrations) * 100 : 0;

      return {
        totalRegistrations,
        activatedRegistrations,
        recentRegistrations,
        activationRate: Math.round(activationRate * 100) / 100, // 保留两位小数
      };

    } catch (error) {
      logger.error('Failed to get invite registration stats', { inviterId, error });
      throw error;
    }
  }

  // 获取邀请码的使用详情
  async getInviteCodeUsageDetails(inviteCodeId: string): Promise<{
    code: string
    totalClicks: number
    totalRegistrations: number
    activatedUsers: number
    conversionRate: number
    recentActivity: any[]
  }> {
    try {
      // 获取邀请码基本信息
      const [codeInfo] = await this.db.query<any>(
        'SELECT code FROM invite_codes WHERE id = ?',
        [inviteCodeId],
      );

      if (!codeInfo) {
        throw new InviteError(
          InviteErrorCode.INVALID_INVITE_CODE,
          'Invite code not found',
        );
      }

      // 获取点击统计
      const [clickStats] = await this.db.query<{ clicks: number }>(
        'SELECT COALESCE(SUM(click_count), 0) as clicks FROM share_stats WHERE invite_code_id = ?',
        [inviteCodeId],
      );

      // 获取注册统计
      const [registrationStats] = await this.db.query<{ count: number }>(
        'SELECT COUNT(*) as count FROM invite_registrations WHERE invite_code_id = ?',
        [inviteCodeId],
      );

      // 获取激活用户统计
      const [activatedStats] = await this.db.query<{ count: number }>(
        'SELECT COUNT(*) as count FROM invite_registrations WHERE invite_code_id = ? AND is_activated = true',
        [inviteCodeId],
      );

      // 获取最近活动
      const recentActivity = await this.db.query<any>(
        `SELECT event_type, timestamp, ip_address
         FROM invite_event_logs 
         WHERE invite_code_id = ? 
         ORDER BY timestamp DESC 
         LIMIT 10`,
        [inviteCodeId],
      );

      const totalClicks = clickStats.clicks;
      const totalRegistrations = registrationStats.count;
      const activatedUsers = activatedStats.count;
      const conversionRate = totalClicks > 0 ? (totalRegistrations / totalClicks) * 100 : 0;

      return {
        code: codeInfo.code,
        totalClicks,
        totalRegistrations,
        activatedUsers,
        conversionRate: Math.round(conversionRate * 100) / 100,
        recentActivity: recentActivity.map(activity => ({
          eventType: activity.event_type,
          timestamp: activity.timestamp,
          ipAddress: activity.ip_address,
        })),
      };

    } catch (error) {
      logger.error('Failed to get invite code usage details', { inviteCodeId, error });
      throw error;
    }
  }
}
