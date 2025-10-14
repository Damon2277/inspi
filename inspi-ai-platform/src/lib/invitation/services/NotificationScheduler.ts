/**
 * 通知调度服务
 * 处理定期通知任务的调度和执行
 */

import { DatabaseService } from '../database';

import { NotificationEventHandler } from './NotificationEventHandler';
import { NotificationChannel, NotificationStatus } from './NotificationService';

interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  content: string;
  channel: NotificationChannel | string;
  status: string;
  metadata: string | null;
  scheduled_at: Date | null;
  sent_at: Date | null;
  created_at: Date;
}

interface ScheduledNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  content: string;
  channel: NotificationChannel | string;
  status: string;
  metadata: Record<string, unknown> | null;
  scheduledAt: Date | null;
  sentAt: Date | null;
  createdAt: Date;
}

interface ExpiringInviteCodeRow {
  id: string;
  inviter_id: string;
  code: string;
  expires_at: Date | string;
  inviter_email: string;
}

export class NotificationScheduler {
  private eventHandler: NotificationEventHandler;
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(private db: DatabaseService) {
    this.eventHandler = new NotificationEventHandler(db);
  }

  private mapNotification(row: NotificationRow): ScheduledNotification {
    let metadata: Record<string, unknown> | null = null;
    if (row.metadata) {
      try {
        metadata = JSON.parse(row.metadata);
      } catch (error) {
        console.error('Failed to parse notification metadata:', error);
      }
    }

    return {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      title: row.title,
      content: row.content,
      channel: row.channel,
      status: row.status,
      metadata,
      scheduledAt: row.scheduled_at,
      sentAt: row.sent_at,
      createdAt: row.created_at,
    };
  }

  /**
   * 启动调度器
   */
  start(): void {
    if (this.isRunning) {
      console.log('Notification scheduler is already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting notification scheduler...');

    // 每小时检查一次
    this.intervalId = setInterval(async () => {
      await this.runScheduledTasks();
    }, 60 * 60 * 1000); // 1 hour

    // 立即执行一次
    this.runScheduledTasks();
  }

  /**
   * 停止调度器
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('Notification scheduler is not running');
      return;
    }

    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('Notification scheduler stopped');
  }

  /**
   * 执行调度任务
   */
  private async runScheduledTasks(): Promise<void> {
    try {
      console.log('Running scheduled notification tasks...');

      const now = new Date();
      const hour = now.getHours();
      const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const dayOfMonth = now.getDate();

      // 每天早上9点发送待发送的通知
      if (hour === 9) {
        await this.processPendingNotifications();
      }

      // 每周一早上10点发送周度总结
      if (dayOfWeek === 1 && hour === 10) {
        await this.eventHandler.schedulePeriodicNotifications();
      }

      // 每月1号早上10点发送月度报告
      if (dayOfMonth === 1 && hour === 10) {
        await this.eventHandler.schedulePeriodicNotifications();
      }

      // 每天凌晨2点清理过期通知
      if (hour === 2) {
        const cleanedCount = await this.eventHandler.cleanupExpiredNotifications(30);
        console.log(`Cleaned up ${cleanedCount} expired notifications`);
      }

      // 每天检查邀请码过期提醒
      await this.checkInviteCodeExpiration();

    } catch (error) {
      console.error('Failed to run scheduled notification tasks:', error);
    }
  }

  /**
   * 处理待发送的通知
   */
  private async processPendingNotifications(): Promise<void> {
    try {
      const query = `
        SELECT * FROM notifications 
        WHERE status = 'pending' 
        AND (scheduled_at IS NULL OR scheduled_at <= NOW())
        ORDER BY created_at ASC
        LIMIT 100
      `;

      const rows = await this.db.query<NotificationRow>(query);
      const pendingNotifications = rows.map(row => this.mapNotification(row));

      for (const notification of pendingNotifications) {
        try {
          // 这里应该调用实际的发送逻辑
          await this.sendNotification(notification);

          // 更新状态为已发送
          await this.updateNotificationStatus(notification.id, NotificationStatus.SENT);

        } catch (error) {
          console.error(`Failed to send notification ${notification.id}:`, error);

          // 更新状态为失败
          await this.updateNotificationStatus(notification.id, NotificationStatus.FAILED);
        }
      }

      if (pendingNotifications.length > 0) {
        console.log(`Processed ${pendingNotifications.length} pending notifications`);
      }

    } catch (error) {
      console.error('Failed to process pending notifications:', error);
    }
  }

  /**
   * 检查邀请码过期提醒
   */
  private async checkInviteCodeExpiration(): Promise<void> {
    try {
      // 查找7天内过期的邀请码
      const query = `
        SELECT ic.*, u.email as inviter_email
        FROM invite_codes ic
        JOIN users u ON ic.inviter_id = u.id
        WHERE ic.is_active = 1 
        AND ic.expires_at > NOW() 
        AND ic.expires_at <= DATE_ADD(NOW(), INTERVAL 7 DAY)
        AND NOT EXISTS (
          SELECT 1 FROM notifications n 
          WHERE n.user_id = ic.inviter_id 
          AND n.type = 'invite_code_expiring'
          AND JSON_EXTRACT(n.metadata, '$.inviteCodeId') = ic.id
          AND n.created_at > DATE_SUB(NOW(), INTERVAL 1 DAY)
        )
      `;

      const expiringCodes = await this.db.query<ExpiringInviteCodeRow>(query);

      for (const code of expiringCodes) {
        const expiresAt = new Date(code.expires_at);
        const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

        if (daysLeft > 0) {
          // 创建过期提醒通知
          await this.createExpirationNotification(code, daysLeft);
        }
      }

      if (expiringCodes.length > 0) {
        console.log(`Created expiration notifications for ${expiringCodes.length} invite codes`);
      }

    } catch (error) {
      console.error('Failed to check invite code expiration:', error);
    }
  }

  /**
   * 创建过期提醒通知
   */
  private async createExpirationNotification(code: ExpiringInviteCodeRow, daysLeft: number): Promise<void> {
    try {
      const notificationId = this.generateId();

      const query = `
        INSERT INTO notifications (
          id, user_id, type, title, content, channel, status, metadata, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `;

      const title = '邀请码即将过期';
      const content = `您的邀请码 ${code.code} 将在 ${daysLeft} 天后过期，请及时分享给朋友！`;

      await this.db.execute(query, [
        notificationId,
        code.inviter_id,
        'invite_code_expiring',
        title,
        content,
        NotificationChannel.IN_APP,
        NotificationStatus.PENDING,
        JSON.stringify({
          inviteCodeId: code.id,
          inviteCode: code.code,
          daysLeft,
          expiresAt: code.expires_at,
        }),
      ]);

      // 如果只剩1天，也发送邮件通知
      if (daysLeft === 1) {
        const emailNotificationId = this.generateId();

        await this.db.execute(query, [
          emailNotificationId,
          code.inviter_id,
          'invite_code_expiring',
          title,
          content,
          NotificationChannel.EMAIL,
          NotificationStatus.PENDING,
          JSON.stringify({
            inviteCodeId: code.id,
            inviteCode: code.code,
            daysLeft,
            expiresAt: code.expires_at,
          }),
        ]);
      }

    } catch (error) {
      console.error('Failed to create expiration notification:', error);
    }
  }

  /**
   * 发送通知
   */
  private async sendNotification(notification: ScheduledNotification): Promise<void> {
    // 根据通知渠道发送通知
    switch (notification.channel) {
      case NotificationChannel.IN_APP:
        // 应用内通知已经保存到数据库，无需额外处理
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
  }

  /**
   * 发送邮件通知
   */
  private async sendEmailNotification(notification: ScheduledNotification): Promise<void> {
    try {
      // 获取用户邮箱
      const userQuery = 'SELECT email FROM users WHERE id = ?';
      const user = await this.db.queryOne<{ email: string | null }>(userQuery, [notification.userId]);

      if (!user?.email) {
        throw new Error('User email not found');
      }

      // 使用邮件服务发送
      const { emailService } = await import('@/lib/email/service');

      const result = await emailService.sendEmail({
        to: user.email,
        subject: notification.title,
        html: this.generateEmailHTML(notification),
        text: notification.content,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to send email');
      }

    } catch (error) {
      console.error('Failed to send email notification:', error);
      throw error;
    }
  }

  /**
   * 发送推送通知
   */
  private async sendPushNotification(notification: ScheduledNotification): Promise<void> {
    // TODO: 实现推送通知发送逻辑
    console.log(`Push notification would be sent: ${notification.title}`);
  }

  /**
   * 发送短信通知
   */
  private async sendSMSNotification(notification: ScheduledNotification): Promise<void> {
    // TODO: 实现短信通知发送逻辑
    console.log(`SMS notification would be sent: ${notification.title}`);
  }

  /**
   * 更新通知状态
   */
  private async updateNotificationStatus(notificationId: string, status: NotificationStatus): Promise<void> {
    const query = `
      UPDATE notifications 
      SET status = ?, sent_at = CASE WHEN ? = 'sent' THEN NOW() ELSE sent_at END
      WHERE id = ?
    `;

    await this.db.execute(query, [status, status, notificationId]);
  }

  /**
   * 生成邮件HTML
   */
  private generateEmailHTML(notification: ScheduledNotification): string {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${notification.title}</title>
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
  }

  /**
   * 生成ID
   */
  private generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取调度器状态
   */
  getStatus(): { isRunning: boolean; uptime?: number } {
    return {
      isRunning: this.isRunning,
      uptime: this.intervalId ? Date.now() : undefined,
    };
  }
}

// 全局调度器实例
let globalScheduler: NotificationScheduler | null = null;

/**
 * 获取全局调度器实例
 */
export function getNotificationScheduler(): NotificationScheduler {
  if (!globalScheduler) {
    const db = new DatabaseService();
    globalScheduler = new NotificationScheduler(db);
  }
  return globalScheduler;
}

/**
 * 启动通知调度器
 */
export function startNotificationScheduler(): void {
  const scheduler = getNotificationScheduler();
  scheduler.start();
}

/**
 * 停止通知调度器
 */
export function stopNotificationScheduler(): void {
  if (globalScheduler) {
    globalScheduler.stop();
  }
}
