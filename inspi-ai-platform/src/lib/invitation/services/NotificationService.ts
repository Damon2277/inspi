/**
 * 通知服务
 * 提供邀请系统相关的通知功能
 */

import { DatabaseService } from '../database';
import { InviteEventType, InviteCode } from '../types';

interface NotificationMessageRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  content: string;
  channel: string;
  status: string;
  metadata: string | null;
  scheduled_at: Date | string | null;
  sent_at: Date | string | null;
  read_at: Date | string | null;
  created_at: Date | string;
}

interface NotificationPreferenceRow {
  user_id: string;
  type: NotificationType;
  channels: string | null;
  frequency: NotificationFrequency;
  is_enabled: number;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
}

interface NotificationTemplateRow {
  id: string;
  type: NotificationType;
  title: string;
  content: string;
  variables: string | null;
  channels: string | null;
  is_active: number;
}

export interface NotificationTemplate {
  id: string
  type: NotificationType
  title: string
  content: string
  variables: string[]
  channels: NotificationChannel[]
  isActive: boolean
}

export interface NotificationMessage {
  id?: string
  userId: string
  type: NotificationType
  title: string
  content: string
  channel: NotificationChannel
  status: NotificationStatus
  metadata?: Record<string, any>
  scheduledAt?: Date
  sentAt?: Date
  readAt?: Date
  createdAt: Date
}

export interface NotificationPreference {
  userId: string
  type: NotificationType
  channels: NotificationChannel[]
  frequency: NotificationFrequency
  isEnabled: boolean
  quietHours?: {
    start: string // HH:mm format
    end: string   // HH:mm format
  }
}

export enum NotificationType {
  INVITE_SUCCESS = 'invite_success',           // 邀请成功通知
  REWARD_RECEIVED = 'reward_received',         // 奖励到账通知
  INVITE_PROGRESS = 'invite_progress',         // 邀请进度提醒
  INVITE_CODE_EXPIRING = 'invite_code_expiring', // 邀请码过期提醒
  MILESTONE_ACHIEVED = 'milestone_achieved',   // 里程碑达成
  WEEKLY_SUMMARY = 'weekly_summary',           // 周度总结
  MONTHLY_REPORT = 'monthly_report'            // 月度报告
}

export enum NotificationChannel {
  IN_APP = 'in_app',           // 应用内通知
  EMAIL = 'email',             // 邮件通知
  SMS = 'sms',                 // 短信通知
  PUSH = 'push',               // 推送通知
  WECHAT = 'wechat',           // 微信通知
  WEBHOOK = 'webhook'          // Webhook通知
}

export enum NotificationStatus {
  PENDING = 'pending',         // 待发送
  SENT = 'sent',              // 已发送
  DELIVERED = 'delivered',     // 已送达
  READ = 'read',              // 已读
  FAILED = 'failed'           // 发送失败
}

export enum NotificationFrequency {
  IMMEDIATE = 'immediate',     // 立即
  DAILY = 'daily',            // 每日汇总
  WEEKLY = 'weekly',          // 每周汇总
  MONTHLY = 'monthly'         // 每月汇总
}

export interface NotificationService {
  // 发送通知
  sendNotification(notification: Omit<NotificationMessage, 'id' | 'createdAt'>): Promise<string>

  // 批量发送通知
  sendBulkNotifications(notifications: Omit<NotificationMessage, 'id' | 'createdAt'>[]): Promise<string[]>

  // 获取用户通知
  getUserNotifications(userId: string, options?: {
    channel?: NotificationChannel
    status?: NotificationStatus
    limit?: number
    offset?: number
  }): Promise<NotificationMessage[]>

  // 标记通知为已读
  markAsRead(notificationId: string): Promise<void>

  // 批量标记为已读
  markMultipleAsRead(notificationIds: string[]): Promise<void>

  // 获取未读通知数量
  getUnreadCount(userId: string, channel?: NotificationChannel): Promise<number>

  // 获取用户通知偏好
  getUserPreferences(userId: string): Promise<NotificationPreference[]>

  // 更新用户通知偏好
  updateUserPreferences(userId: string, preferences: Partial<NotificationPreference>[]): Promise<void>

  // 获取通知模板
  getNotificationTemplate(type: NotificationType): Promise<NotificationTemplate | null>

  // 创建或更新通知模板
  upsertNotificationTemplate(template: NotificationTemplate): Promise<void>

  // 处理邀请事件通知
  handleInviteEvent(eventType: InviteEventType, data: any): Promise<void>

  // 调度定期通知
  schedulePeriodicNotifications(): Promise<void>

  // 清理过期通知
  cleanupExpiredNotifications(daysToKeep: number): Promise<number>
}

export class NotificationServiceImpl implements NotificationService {
  constructor(private db: DatabaseService) {}

  /**
   * 发送通知
   */
  async sendNotification(notification: Omit<NotificationMessage, 'id' | 'createdAt'>): Promise<string> {
    try {
      // 检查用户通知偏好
      const preferences = await this.getUserPreferences(notification.userId);
      const typePreference = preferences.find(p => p.type === notification.type);

      if (!typePreference || !typePreference.isEnabled) {
        console.log(`Notification ${notification.type} disabled for user ${notification.userId}`);
        return '';
      }

      // 检查渠道是否允许
      if (!typePreference.channels.includes(notification.channel)) {
        console.log(`Channel ${notification.channel} not allowed for ${notification.type}`);
        return '';
      }

      // 检查静默时间
      const scheduledAt = notification.scheduledAt
        ?? (this.isInQuietHours(typePreference.quietHours)
          ? this.getNextAvailableTime(typePreference.quietHours)
          : undefined);

      const message: NotificationMessage = {
        ...notification,
        scheduledAt,
        createdAt: new Date(),
      };

      const notificationId = await this.saveNotification(message);
      const storedMessage: NotificationMessage = {
        ...message,
        id: notificationId,
      };

      // 立即发送或调度发送
      if (!storedMessage.scheduledAt) {
        await this.deliverNotification(notificationId, storedMessage);
      }

      return notificationId;
    } catch (error) {
      console.error('Failed to send notification:', error);
      throw new Error('Failed to send notification');
    }
  }

  /**
   * 批量发送通知
   */
  async sendBulkNotifications(notifications: Omit<NotificationMessage, 'id' | 'createdAt'>[]): Promise<string[]> {
    const results: string[] = [];

    for (const notification of notifications) {
      try {
        const id = await this.sendNotification(notification);
        results.push(id);
      } catch (error) {
        console.error('Failed to send bulk notification:', error);
        results.push('');
      }
    }

    return results;
  }

  /**
   * 获取用户通知
   */
  async getUserNotifications(userId: string, options: {
    channel?: NotificationChannel
    status?: NotificationStatus
    limit?: number
    offset?: number
  } = {}): Promise<NotificationMessage[]> {
    try {
      const { channel, status, limit = 50, offset = 0 } = options;

      let query = `
        SELECT * FROM notifications 
        WHERE user_id = ?
      `;
      const params: Array<string | NotificationChannel | NotificationStatus | number> = [userId];

      if (channel) {
        query += ' AND channel = ?';
        params.push(channel);
      }

      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const results = await this.db.query<NotificationMessageRow>(query, params);

      return results.map(row => this.mapToNotificationMessage(row));
    } catch (error) {
      console.error('Failed to get user notifications:', error);
      throw new Error('Failed to get user notifications');
    }
  }

  /**
   * 标记通知为已读
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const query = `
        UPDATE notifications 
        SET status = ?, read_at = NOW() 
        WHERE id = ? AND status != ?
      `;

      await this.db.execute(query, [
        NotificationStatus.READ,
        notificationId,
        NotificationStatus.READ,
      ]);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw new Error('Failed to mark notification as read');
    }
  }

  /**
   * 批量标记为已读
   */
  async markMultipleAsRead(notificationIds: string[]): Promise<void> {
    if (notificationIds.length === 0) return;

    try {
      const placeholders = notificationIds.map(() => '?').join(',');
      const query = `
        UPDATE notifications 
        SET status = ?, read_at = NOW() 
        WHERE id IN (${placeholders}) AND status != ?
      `;

      await this.db.execute(query, [
        NotificationStatus.READ,
        ...notificationIds,
        NotificationStatus.READ,
      ]);
    } catch (error) {
      console.error('Failed to mark multiple notifications as read:', error);
      throw new Error('Failed to mark multiple notifications as read');
    }
  }

  /**
   * 获取未读通知数量
   */
  async getUnreadCount(userId: string, channel?: NotificationChannel): Promise<number> {
    try {
      let query = `
        SELECT COUNT(*) as count 
        FROM notifications 
        WHERE user_id = ? AND status != ?
      `;
      const params: Array<string | NotificationChannel | NotificationStatus> = [userId, NotificationStatus.READ];

      if (channel) {
        query += ' AND channel = ?';
        params.push(channel);
      }

      const result = await this.db.queryOne<{ count: number | string }>(query, params);
      return Number(result?.count) || 0;
    } catch (error) {
      console.error('Failed to get unread count:', error);
      return 0;
    }
  }

  /**
   * 获取用户通知偏好
   */
  async getUserPreferences(userId: string): Promise<NotificationPreference[]> {
    try {
      const query = `
        SELECT * FROM notification_preferences 
        WHERE user_id = ?
      `;

      const results = await this.db.query<NotificationPreferenceRow>(query, [userId]);

      if (results.length === 0) {
        // 返回默认偏好设置
        return this.getDefaultPreferences(userId);
      }

      return results.map(this.mapToNotificationPreference);
    } catch (error) {
      console.error('Failed to get user preferences:', error);
      return this.getDefaultPreferences(userId);
    }
  }

  /**
   * 更新用户通知偏好
   */
  async updateUserPreferences(userId: string, preferences: Partial<NotificationPreference>[]): Promise<void> {
    try {
      for (const pref of preferences) {
        const query = `
          INSERT INTO notification_preferences (
            user_id, type, channels, frequency, is_enabled, quiet_hours_start, quiet_hours_end
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            channels = VALUES(channels),
            frequency = VALUES(frequency),
            is_enabled = VALUES(is_enabled),
            quiet_hours_start = VALUES(quiet_hours_start),
            quiet_hours_end = VALUES(quiet_hours_end)
        `;

        await this.db.execute(query, [
          userId,
          pref.type,
          JSON.stringify(pref.channels || []),
          pref.frequency || NotificationFrequency.IMMEDIATE,
          pref.isEnabled !== undefined ? pref.isEnabled : true,
          pref.quietHours?.start || null,
          pref.quietHours?.end || null,
        ]);
      }
    } catch (error) {
      console.error('Failed to update user preferences:', error);
      throw new Error('Failed to update user preferences');
    }
  }

  /**
   * 获取通知模板
   */
  async getNotificationTemplate(type: NotificationType): Promise<NotificationTemplate | null> {
    try {
      const query = `
        SELECT * FROM notification_templates 
        WHERE type = ? AND is_active = 1
      `;

      const result = await this.db.queryOne<NotificationTemplateRow>(query, [type]);

      if (!result) {
        return this.getDefaultTemplate(type);
      }

      return this.mapToNotificationTemplate(result);
    } catch (error) {
      console.error('Failed to get notification template:', error);
      return this.getDefaultTemplate(type);
    }
  }

  /**
   * 创建或更新通知模板
   */
  async upsertNotificationTemplate(template: NotificationTemplate): Promise<void> {
    try {
      const query = `
        INSERT INTO notification_templates (
          id, type, title, content, variables, channels, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          title = VALUES(title),
          content = VALUES(content),
          variables = VALUES(variables),
          channels = VALUES(channels),
          is_active = VALUES(is_active)
      `;

      await this.db.execute(query, [
        template.id,
        template.type,
        template.title,
        template.content,
        JSON.stringify(template.variables),
        JSON.stringify(template.channels),
        template.isActive,
      ]);
    } catch (error) {
      console.error('Failed to upsert notification template:', error);
      throw new Error('Failed to upsert notification template');
    }
  }

  /**
   * 处理邀请事件通知
   */
  async handleInviteEvent(eventType: InviteEventType, data: any): Promise<void> {
    try {
      switch (eventType) {
        case InviteEventType.USER_REGISTERED:
          await this.handleInviteSuccessNotification(data);
          break;

        case InviteEventType.REWARD_GRANTED:
          await this.handleRewardReceivedNotification(data);
          break;

        case InviteEventType.USER_ACTIVATED:
          await this.handleInviteProgressNotification(data);
          break;

        default:
          console.log(`No notification handler for event type: ${eventType}`);
      }
    } catch (error) {
      console.error('Failed to handle invite event notification:', error);
    }
  }

  /**
   * 调度定期通知
   */
  async schedulePeriodicNotifications(): Promise<void> {
    try {
      // 发送周度总结
      await this.scheduleWeeklySummary();

      // 发送月度报告
      await this.scheduleMonthlyReport();

      // 检查邀请码过期提醒
      await this.checkInviteCodeExpiration();
    } catch (error) {
      console.error('Failed to schedule periodic notifications:', error);
    }
  }

  /**
   * 清理过期通知
   */
  async cleanupExpiredNotifications(daysToKeep: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const query = `
        DELETE FROM notifications 
        WHERE created_at < ? AND status IN (?, ?)
      `;

      const result = await this.db.execute(query, [
        cutoffDate,
        NotificationStatus.READ,
        NotificationStatus.DELIVERED,
      ]);

      return result.affectedRows || 0;
    } catch (error) {
      console.error('Failed to cleanup expired notifications:', error);
      return 0;
    }
  }

  // 私有辅助方法

  private async saveNotification(notification: NotificationMessage): Promise<string> {
    const id = this.generateId();

    const query = `
      INSERT INTO notifications (
        id, user_id, type, title, content, channel, status, 
        metadata, scheduled_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db.execute(query, [
      id,
      notification.userId,
      notification.type,
      notification.title,
      notification.content,
      notification.channel,
      notification.status,
      notification.metadata ? JSON.stringify(notification.metadata) : null,
      notification.scheduledAt,
      notification.createdAt,
    ]);

    return id;
  }

  private async deliverNotification(notificationId: string, notification: NotificationMessage): Promise<void> {
    try {
      switch (notification.channel) {
        case NotificationChannel.IN_APP:
          // 应用内通知已保存到数据库，无需额外处理
          break;

        case NotificationChannel.EMAIL:
          await this.sendEmailNotification(notification);
          break;

        case NotificationChannel.PUSH:
          await this.sendPushNotification(notification);
          break;

        case NotificationChannel.SMS:
          await this.sendSMSNotification(notification);
          break;

        default:
          console.log(`Unsupported notification channel: ${notification.channel}`);
      }

      // 更新状态为已发送
      await this.updateNotificationStatus(notificationId, NotificationStatus.SENT);
    } catch (error) {
      console.error('Failed to deliver notification:', error);
      await this.updateNotificationStatus(notificationId, NotificationStatus.FAILED);
    }
  }

  private async updateNotificationStatus(notificationId: string, status: NotificationStatus): Promise<void> {
    const query = `
      UPDATE notifications 
      SET status = ?, sent_at = CASE WHEN ? = 'sent' THEN NOW() ELSE sent_at END
      WHERE id = ?
    `;

    await this.db.execute(query, [status, status, notificationId]);
  }

  private isInQuietHours(quietHours?: { start: string; end: string }): boolean {
    if (!quietHours) return false;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    return currentTime >= quietHours.start && currentTime <= quietHours.end;
  }

  private getNextAvailableTime(quietHours?: { start: string; end: string }): Date {
    if (!quietHours) return new Date();

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [endHour, endMinute] = quietHours.end.split(':').map(Number);
    tomorrow.setHours(endHour, endMinute, 0, 0);

    return tomorrow;
  }

  private getDefaultPreferences(userId: string): NotificationPreference[] {
    return Object.values(NotificationType).map(type => ({
      userId,
      type,
      channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      frequency: NotificationFrequency.IMMEDIATE,
      isEnabled: true,
      quietHours: {
        start: '22:00',
        end: '08:00',
      },
    }));
  }

  private getDefaultTemplate(type: NotificationType): NotificationTemplate | null {
    const templates: Record<NotificationType, NotificationTemplate> = {
      [NotificationType.INVITE_SUCCESS]: {
        id: 'invite_success',
        type: NotificationType.INVITE_SUCCESS,
        title: '邀请成功！',
        content: '恭喜！{{inviteeName}} 通过您的邀请成功注册了 Inspi.AI，您获得了 {{rewardAmount}} 次AI生成次数奖励！',
        variables: ['inviteeName', 'rewardAmount'],
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        isActive: true,
      },
      [NotificationType.REWARD_RECEIVED]: {
        id: 'reward_received',
        type: NotificationType.REWARD_RECEIVED,
        title: '奖励到账',
        content: '您获得了新的奖励：{{rewardType}} {{rewardAmount}}，快去查看吧！',
        variables: ['rewardType', 'rewardAmount'],
        channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
        isActive: true,
      },
      [NotificationType.INVITE_PROGRESS]: {
        id: 'invite_progress',
        type: NotificationType.INVITE_PROGRESS,
        title: '邀请进度更新',
        content: '您已成功邀请 {{inviteCount}} 人注册，距离下一个里程碑还需要 {{remainingCount}} 人！',
        variables: ['inviteCount', 'remainingCount'],
        channels: [NotificationChannel.IN_APP],
        isActive: true,
      },
      [NotificationType.INVITE_CODE_EXPIRING]: {
        id: 'invite_code_expiring',
        type: NotificationType.INVITE_CODE_EXPIRING,
        title: '邀请码即将过期',
        content: '您的邀请码 {{inviteCode}} 将在 {{daysLeft}} 天后过期，请及时分享给朋友！',
        variables: ['inviteCode', 'daysLeft'],
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        isActive: true,
      },
      [NotificationType.MILESTONE_ACHIEVED]: {
        id: 'milestone_achieved',
        type: NotificationType.MILESTONE_ACHIEVED,
        title: '里程碑达成！',
        content: '恭喜您达成了 {{milestoneName}} 里程碑！获得了 {{rewardDescription}} 奖励！',
        variables: ['milestoneName', 'rewardDescription'],
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.PUSH],
        isActive: true,
      },
      [NotificationType.WEEKLY_SUMMARY]: {
        id: 'weekly_summary',
        type: NotificationType.WEEKLY_SUMMARY,
        title: '本周邀请总结',
        content: '本周您邀请了 {{weeklyInvites}} 人，累计获得 {{weeklyRewards}} 奖励。继续加油！',
        variables: ['weeklyInvites', 'weeklyRewards'],
        channels: [NotificationChannel.EMAIL],
        isActive: true,
      },
      [NotificationType.MONTHLY_REPORT]: {
        id: 'monthly_report',
        type: NotificationType.MONTHLY_REPORT,
        title: '月度邀请报告',
        content: '您的月度邀请报告已生成，本月排名第 {{monthlyRank}} 位，共邀请 {{monthlyInvites}} 人！',
        variables: ['monthlyRank', 'monthlyInvites'],
        channels: [NotificationChannel.EMAIL],
        isActive: true,
      },
    };

    return templates[type] || null;
  }

  private mapToNotificationMessage(row: NotificationMessageRow): NotificationMessage {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type as NotificationType,
      title: row.title,
      content: row.content,
      channel: row.channel as NotificationChannel,
      status: row.status as NotificationStatus,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      scheduledAt: row.scheduled_at ? new Date(row.scheduled_at) : undefined,
      sentAt: row.sent_at ? new Date(row.sent_at) : undefined,
      readAt: row.read_at ? new Date(row.read_at) : undefined,
      createdAt: new Date(row.created_at),
    };
  }

  private mapToNotificationPreference(row: NotificationPreferenceRow): NotificationPreference {
    return {
      userId: row.user_id,
      type: row.type as NotificationType,
      channels: JSON.parse(row.channels || '[]'),
      frequency: row.frequency as NotificationFrequency,
      isEnabled: Boolean(row.is_enabled),
      quietHours: row.quiet_hours_start && row.quiet_hours_end ? {
        start: row.quiet_hours_start,
        end: row.quiet_hours_end,
      } : undefined,
    };
  }

  private mapToNotificationTemplate(row: NotificationTemplateRow): NotificationTemplate {
    return {
      id: row.id,
      type: row.type as NotificationType,
      title: row.title,
      content: row.content,
      variables: JSON.parse(row.variables || '[]'),
      channels: JSON.parse(row.channels || '[]'),
      isActive: Boolean(row.is_active),
    };
  }

  private generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 具体通知处理方法的实现

  /**
   * 处理邀请成功通知
   */
  private async handleInviteSuccessNotification(data: {
    inviterId: string
    inviteeId: string
    inviteeName: string
    inviteeEmail: string
    rewardAmount: number
  }): Promise<void> {
    try {
      const template = await this.getNotificationTemplate(NotificationType.INVITE_SUCCESS);
      if (!template) return;

      const content = this.renderNotificationContent(template.content, {
        inviteeName: data.inviteeName,
        rewardAmount: data.rewardAmount,
      });

      const title = this.renderNotificationContent(template.title, {
        inviteeName: data.inviteeName,
        rewardAmount: data.rewardAmount,
      });

      // 发送应用内通知
      await this.sendNotification({
        userId: data.inviterId,
        type: NotificationType.INVITE_SUCCESS,
        title,
        content,
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.PENDING,
        metadata: {
          inviteeId: data.inviteeId,
          inviteeName: data.inviteeName,
          rewardAmount: data.rewardAmount,
        },
      });

      // 发送邮件通知
      await this.sendNotification({
        userId: data.inviterId,
        type: NotificationType.INVITE_SUCCESS,
        title,
        content,
        channel: NotificationChannel.EMAIL,
        status: NotificationStatus.PENDING,
        metadata: {
          inviteeId: data.inviteeId,
          inviteeName: data.inviteeName,
          inviteeEmail: data.inviteeEmail,
          rewardAmount: data.rewardAmount,
        },
      });

      console.log(`Invite success notification sent for inviter ${data.inviterId}`);
    } catch (error) {
      console.error('Failed to handle invite success notification:', error);
    }
  }

  /**
   * 处理奖励到账通知
   */
  private async handleRewardReceivedNotification(data: {
    userId: string
    rewardType: string
    rewardAmount: number | string
    description: string
    sourceType: string
    sourceId: string
  }): Promise<void> {
    try {
      const template = await this.getNotificationTemplate(NotificationType.REWARD_RECEIVED);
      if (!template) return;

      const content = this.renderNotificationContent(template.content, {
        rewardType: data.rewardType,
        rewardAmount: data.rewardAmount,
      });

      const title = this.renderNotificationContent(template.title, {
        rewardType: data.rewardType,
        rewardAmount: data.rewardAmount,
      });

      // 发送应用内通知
      await this.sendNotification({
        userId: data.userId,
        type: NotificationType.REWARD_RECEIVED,
        title,
        content,
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.PENDING,
        metadata: {
          rewardType: data.rewardType,
          rewardAmount: data.rewardAmount,
          description: data.description,
          sourceType: data.sourceType,
          sourceId: data.sourceId,
        },
      });

      // 发送推送通知
      await this.sendNotification({
        userId: data.userId,
        type: NotificationType.REWARD_RECEIVED,
        title,
        content,
        channel: NotificationChannel.PUSH,
        status: NotificationStatus.PENDING,
        metadata: {
          rewardType: data.rewardType,
          rewardAmount: data.rewardAmount,
          description: data.description,
        },
      });

      console.log(`Reward received notification sent for user ${data.userId}`);
    } catch (error) {
      console.error('Failed to handle reward received notification:', error);
    }
  }

  /**
   * 处理邀请进度通知
   */
  private async handleInviteProgressNotification(data: {
    userId: string
    inviteCount: number
    nextMilestone: number
    remainingCount: number
    milestoneName?: string
  }): Promise<void> {
    try {
      const template = await this.getNotificationTemplate(NotificationType.INVITE_PROGRESS);
      if (!template) return;

      const content = this.renderNotificationContent(template.content, {
        inviteCount: data.inviteCount,
        remainingCount: data.remainingCount,
        nextMilestone: data.nextMilestone,
        milestoneName: data.milestoneName || `${data.nextMilestone}人邀请`,
      });

      const title = this.renderNotificationContent(template.title, {
        inviteCount: data.inviteCount,
        remainingCount: data.remainingCount,
      });

      // 只发送应用内通知，避免过于频繁的外部通知
      await this.sendNotification({
        userId: data.userId,
        type: NotificationType.INVITE_PROGRESS,
        title,
        content,
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.PENDING,
        metadata: {
          inviteCount: data.inviteCount,
          nextMilestone: data.nextMilestone,
          remainingCount: data.remainingCount,
          milestoneName: data.milestoneName,
        },
      });

      console.log(`Invite progress notification sent for user ${data.userId}`);
    } catch (error) {
      console.error('Failed to handle invite progress notification:', error);
    }
  }

  /**
   * 调度周度总结
   */
  private async scheduleWeeklySummary(): Promise<void> {
    try {
      // 获取所有活跃用户
      const activeUsers = await this.getActiveInviters(7); // 过去7天有邀请活动的用户

      for (const user of activeUsers) {
        const weeklyStats = await this.getWeeklyInviteStats(user.userId);

        if (weeklyStats.inviteCount > 0) {
          const template = await this.getNotificationTemplate(NotificationType.WEEKLY_SUMMARY);
          if (!template) continue;

          const content = this.renderNotificationContent(template.content, {
            weeklyInvites: weeklyStats.inviteCount,
            weeklyRewards: weeklyStats.rewardCount,
          });

          const title = this.renderNotificationContent(template.title, {
            weeklyInvites: weeklyStats.inviteCount,
          });

          await this.sendNotification({
            userId: user.userId,
            type: NotificationType.WEEKLY_SUMMARY,
            title,
            content,
            channel: NotificationChannel.EMAIL,
            status: NotificationStatus.PENDING,
            metadata: {
              weeklyStats,
              period: 'weekly',
            },
          });
        }
      }

      console.log(`Weekly summary scheduled for ${activeUsers.length} users`);
    } catch (error) {
      console.error('Failed to schedule weekly summary:', error);
    }
  }

  /**
   * 调度月度报告
   */
  private async scheduleMonthlyReport(): Promise<void> {
    try {
      // 获取所有有邀请记录的用户
      const users = await this.getAllInviters();

      for (const user of users) {
        const monthlyStats = await this.getMonthlyInviteStats(user.userId);
        const monthlyRank = await this.getUserMonthlyRank(user.userId);

        const template = await this.getNotificationTemplate(NotificationType.MONTHLY_REPORT);
        if (!template) continue;

        const content = this.renderNotificationContent(template.content, {
          monthlyRank: monthlyRank,
          monthlyInvites: monthlyStats.inviteCount,
        });

        const title = this.renderNotificationContent(template.title, {
          monthlyRank: monthlyRank,
          monthlyInvites: monthlyStats.inviteCount,
        });

        await this.sendNotification({
          userId: user.userId,
          type: NotificationType.MONTHLY_REPORT,
          title,
          content,
          channel: NotificationChannel.EMAIL,
          status: NotificationStatus.PENDING,
          metadata: {
            monthlyStats,
            monthlyRank,
            period: 'monthly',
          },
        });
      }

      console.log(`Monthly report scheduled for ${users.length} users`);
    } catch (error) {
      console.error('Failed to schedule monthly report:', error);
    }
  }

  /**
   * 检查邀请码过期提醒
   */
  private async checkInviteCodeExpiration(): Promise<void> {
    try {
      // 查找即将过期的邀请码（7天内过期）
      const expiringCodes = await this.getExpiringInviteCodes(7);

      for (const code of expiringCodes) {
        const daysLeft = Math.ceil((code.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

        if (daysLeft > 0 && daysLeft <= 7) {
          const template = await this.getNotificationTemplate(NotificationType.INVITE_CODE_EXPIRING);
          if (!template) continue;

          const content = this.renderNotificationContent(template.content, {
            inviteCode: code.code,
            daysLeft: daysLeft,
          });

          const title = this.renderNotificationContent(template.title, {
            inviteCode: code.code,
            daysLeft: daysLeft,
          });

          // 发送应用内通知
          await this.sendNotification({
            userId: code.inviterId,
            type: NotificationType.INVITE_CODE_EXPIRING,
            title,
            content,
            channel: NotificationChannel.IN_APP,
            status: NotificationStatus.PENDING,
            metadata: {
              inviteCodeId: code.id,
              inviteCode: code.code,
              daysLeft: daysLeft,
              expiresAt: code.expiresAt,
            },
          });

          // 如果只剩1天，发送邮件提醒
          if (daysLeft === 1) {
            await this.sendNotification({
              userId: code.inviterId,
              type: NotificationType.INVITE_CODE_EXPIRING,
              title,
              content,
              channel: NotificationChannel.EMAIL,
              status: NotificationStatus.PENDING,
              metadata: {
                inviteCodeId: code.id,
                inviteCode: code.code,
                daysLeft: daysLeft,
                expiresAt: code.expiresAt,
              },
            });
          }
        }
      }

      console.log(`Checked ${expiringCodes.length} expiring invite codes`);
    } catch (error) {
      console.error('Failed to check invite code expiration:', error);
    }
  }

  /**
   * 发送邮件通知
   */
  private async sendEmailNotification(notification: NotificationMessage): Promise<void> {
    try {
      // 获取用户邮箱
      const userEmail = await this.getUserEmail(notification.userId);
      if (!userEmail) {
        throw new Error('User email not found');
      }

      // 生成邮件模板
      const emailTemplate = this.generateEmailTemplate(notification);

      // 使用邮件服务发送
      const { emailService } = await import('@/lib/email/service');

      const result = await emailService.sendEmail({
        to: userEmail,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
        text: emailTemplate.text,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to send email');
      }

      console.log(`Email notification sent to ${userEmail}`);
    } catch (error) {
      console.error('Failed to send email notification:', error);
      throw error;
    }
  }

  /**
   * 发送推送通知
   */
  private async sendPushNotification(notification: NotificationMessage): Promise<void> {
    try {
      // 获取用户的推送令牌
      const pushTokens = await this.getUserPushTokens(notification.userId);

      if (pushTokens.length === 0) {
        console.log(`No push tokens found for user ${notification.userId}`);
        return;
      }

      // 构建推送消息
      const pushMessage = {
        title: notification.title,
        body: notification.content,
        data: {
          type: notification.type,
          userId: notification.userId,
          metadata: JSON.stringify(notification.metadata || {}),
        },
      };

      // 这里应该集成实际的推送服务（如 Firebase Cloud Messaging）
      // 目前只是记录日志
      console.log(`Push notification would be sent to ${pushTokens.length} devices:`, pushMessage);

      // TODO: 实现实际的推送发送逻辑
      // await pushService.sendToTokens(pushTokens, pushMessage)

    } catch (error) {
      console.error('Failed to send push notification:', error);
      throw error;
    }
  }

  /**
   * 发送短信通知
   */
  private async sendSMSNotification(notification: NotificationMessage): Promise<void> {
    try {
      // 获取用户手机号
      const phoneNumber = await this.getUserPhoneNumber(notification.userId);
      if (!phoneNumber) {
        throw new Error('User phone number not found');
      }

      // 构建短信内容
      const smsContent = `【Inspi.AI】${notification.title}: ${notification.content}`;

      // 这里应该集成实际的短信服务
      // 目前只是记录日志
      console.log(`SMS would be sent to ${phoneNumber}: ${smsContent}`);

      // TODO: 实现实际的短信发送逻辑
      // await smsService.send(phoneNumber, smsContent)

    } catch (error) {
      console.error('Failed to send SMS notification:', error);
      throw error;
    }
  }

  // 辅助方法

  /**
   * 渲染通知内容
   */
  private renderNotificationContent(template: string, variables: Record<string, any>): string {
    let rendered = template;

    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      rendered = rendered.replace(regex, String(value));
    });

    return rendered;
  }

  /**
   * 生成邮件模板
   */
  private generateEmailTemplate(notification: NotificationMessage): {
    subject: string
    html: string
    text: string
  } {
    const subject = notification.title;

    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background-color: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #6366f1;
            margin-bottom: 10px;
        }
        .title {
            font-size: 24px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 20px;
        }
        .content {
            font-size: 16px;
            line-height: 1.8;
            color: #4b5563;
            margin-bottom: 30px;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #6b7280;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">Inspi.AI</div>
            <div class="title">${notification.title}</div>
        </div>

        <div class="content">
            <p>${notification.content}</p>
        </div>

        <div class="footer">
            <p>此邮件由系统自动发送，请勿回复。</p>
            <p>如有疑问，请联系我们：<a href="mailto:support@inspi-ai.com">support@inspi-ai.com</a></p>
            <p>&copy; 2024 Inspi.AI. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;

    const text = `
【Inspi.AI】${notification.title}

${notification.content}

此邮件由系统自动发送，请勿回复。
如有疑问，请联系我们：support@inspi-ai.com

© 2024 Inspi.AI. All rights reserved.
`;

    return { subject, html, text };
  }

  /**
   * 获取用户邮箱
   */
  private async getUserEmail(userId: string): Promise<string | null> {
    try {
      const query = 'SELECT email FROM users WHERE id = ?';
      const result = await this.db.queryOne<{ email: string | null }>(query, [userId]);
      return result?.email || null;
    } catch (error) {
      console.error('Failed to get user email:', error);
      return null;
    }
  }

  /**
   * 获取用户推送令牌
   */
  private async getUserPushTokens(userId: string): Promise<string[]> {
    try {
      const query = 'SELECT token FROM push_tokens WHERE user_id = ? AND is_active = 1';
      const results = await this.db.query<{ token: string }>(query, [userId]);
      return results.map(row => row.token);
    } catch (error) {
      console.error('Failed to get user push tokens:', error);
      return [];
    }
  }

  /**
   * 获取用户手机号
   */
  private async getUserPhoneNumber(userId: string): Promise<string | null> {
    try {
      const query = 'SELECT phone FROM users WHERE id = ?';
      const result = await this.db.queryOne<{ phone: string | null }>(query, [userId]);
      return result?.phone || null;
    } catch (error) {
      console.error('Failed to get user phone number:', error);
      return null;
    }
  }

  /**
   * 获取活跃邀请者
   */
  private async getActiveInviters(days: number): Promise<{ userId: string }[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const query = `
        SELECT DISTINCT inviter_id as userId
        FROM invite_registrations 
        WHERE registered_at >= ?
      `;

      return await this.db.query(query, [cutoffDate]);
    } catch (error) {
      console.error('Failed to get active inviters:', error);
      return [];
    }
  }

  /**
   * 获取所有邀请者
   */
  private async getAllInviters(): Promise<{ userId: string }[]> {
    try {
      const query = `
        SELECT DISTINCT inviter_id as userId
        FROM invite_registrations
      `;

      return await this.db.query(query);
    } catch (error) {
      console.error('Failed to get all inviters:', error);
      return [];
    }
  }

  /**
   * 获取周度邀请统计
   */
  private async getWeeklyInviteStats(userId: string): Promise<{
    inviteCount: number
    rewardCount: number
  }> {
    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const inviteQuery = `
        SELECT COUNT(*) as count
        FROM invite_registrations 
        WHERE inviter_id = ? AND registered_at >= ?
      `;

      const rewardQuery = `
        SELECT COUNT(*) as count
        FROM rewards 
        WHERE user_id = ? AND granted_at >= ?
      `;

      const [inviteResult, rewardResult] = await Promise.all([
        this.db.queryOne<{ count: number | string }>(inviteQuery, [userId, weekAgo]),
        this.db.queryOne<{ count: number | string }>(rewardQuery, [userId, weekAgo]),
      ]);

      return {
        inviteCount: parseInt((inviteResult?.count ?? 0, 10).toString(), 10) || 0,
        rewardCount: parseInt((rewardResult?.count ?? 0, 10).toString(), 10) || 0,
      };
    } catch (error) {
      console.error('Failed to get weekly invite stats:', error);
      return { inviteCount: 0, rewardCount: 0 };
    }
  }

  /**
   * 获取月度邀请统计
   */
  private async getMonthlyInviteStats(userId: string): Promise<{
    inviteCount: number
    rewardCount: number
  }> {
    try {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      const inviteQuery = `
        SELECT COUNT(*) as count
        FROM invite_registrations 
        WHERE inviter_id = ? AND registered_at >= ?
      `;

      const rewardQuery = `
        SELECT COUNT(*) as count
        FROM rewards 
        WHERE user_id = ? AND granted_at >= ?
      `;

      const [inviteResult, rewardResult] = await Promise.all([
        this.db.queryOne<{ count: number | string }>(inviteQuery, [userId, monthAgo]),
        this.db.queryOne<{ count: number | string }>(rewardQuery, [userId, monthAgo]),
      ]);

      return {
        inviteCount: parseInt((inviteResult?.count ?? 0, 10).toString(), 10) || 0,
        rewardCount: parseInt((rewardResult?.count ?? 0, 10).toString(), 10) || 0,
      };
    } catch (error) {
      console.error('Failed to get monthly invite stats:', error);
      return { inviteCount: 0, rewardCount: 0 };
    }
  }

  /**
   * 获取用户月度排名
   */
  private async getUserMonthlyRank(userId: string): Promise<number> {
    try {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      const query = `
        SELECT 
          inviter_id,
          COUNT(*) as invite_count,
          RANK() OVER (ORDER BY COUNT(*) DESC) as rank
        FROM invite_registrations 
        WHERE registered_at >= ?
        GROUP BY inviter_id
        HAVING inviter_id = ?
      `;

      const result = await this.db.queryOne<{ rank: number | string }>(query, [monthAgo, userId]);
      return parseInt((result?.rank ?? 0, 10).toString(), 10) || 0;
    } catch (error) {
      console.error('Failed to get user monthly rank:', error);
      return 0;
    }
  }

  /**
   * 获取即将过期的邀请码
   */
  private async getExpiringInviteCodes(daysAhead: number): Promise<InviteCode[]> {
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      const query = `
        SELECT * FROM invite_codes 
        WHERE is_active = 1 
        AND expires_at <= ? 
        AND expires_at > NOW()
        ORDER BY expires_at ASC
      `;

      const results = await this.db.query(query, [futureDate]);

      return results.map((row: any) => ({
        id: row.id,
        code: row.code,
        inviterId: row.inviter_id,
        createdAt: new Date(row.created_at),
        expiresAt: new Date(row.expires_at),
        isActive: Boolean(row.is_active),
        usageCount: row.usage_count,
        maxUsage: row.max_usage,
      }));
    } catch (error) {
      console.error('Failed to get expiring invite codes:', error);
      return [];
    }
  }
}
