/**
 * 通知服务
 * 处理系统内通知、邮件通知和推送通知
 */

import { PaymentRecord, Subscription } from '@/shared/types/subscription';

/**
 * 通知类型
 */
export type NotificationType =
  | 'payment_success'
  | 'payment_failed'
  | 'subscription_activated'
  | 'subscription_cancelled'
  | 'subscription_expired'
  | 'subscription_expiring'
  | 'quota_warning'
  | 'quota_exceeded'
  | 'upgrade_recommendation';

/**
 * 通知渠道
 */
export type NotificationChannel = 'email' | 'system' | 'push' | 'sms';

/**
 * 通知消息
 */
export interface NotificationMessage {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  data?: Record<string, any>;
  channels: NotificationChannel[];
  priority: 'low' | 'normal' | 'high' | 'urgent';
  scheduledAt?: Date;
  createdAt: Date;
  sentAt?: Date;
  readAt?: Date;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
}

/**
 * 邮件模板
 */
export interface EmailTemplate {
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: Record<string, string>;
}

/**
 * 通知配置
 */
export interface NotificationConfig {
  enableEmail: boolean;
  enableSystem: boolean;
  enablePush: boolean;
  enableSms: boolean;
  emailProvider: 'smtp' | 'sendgrid' | 'ses';
  smtpConfig?: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
}

/**
 * 通知服务类
 */
export class NotificationService {
  private static instance: NotificationService;
  private notifications: Map<string, NotificationMessage> = new Map();
  private config: NotificationConfig;

  private constructor() {
    this.config = {
      enableEmail: true,
      enableSystem: true,
      enablePush: false,
      enableSms: false,
      emailProvider: 'smtp',
      smtpConfig: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: false,
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || '',
        },
      },
    };
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * 发送通知
   */
  async sendNotification(
    userId: string,
    type: NotificationType,
    data: Record<string, any> = {},
    channels: NotificationChannel[] = ['system', 'email'],
  ): Promise<NotificationMessage> {
    try {
      const template = this.getNotificationTemplate(type, data);

      const notification: NotificationMessage = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        type,
        title: template.title,
        content: template.content,
        data,
        channels,
        priority: this.getNotificationPriority(type),
        createdAt: new Date(),
        status: 'pending',
      };

      // 保存通知记录
      this.notifications.set(notification.id, notification);

      // 发送到各个渠道
      await this.sendToChannels(notification);

      console.log('通知发送成功:', notification);
      return notification;

    } catch (error) {
      console.error('发送通知失败:', error);
      throw error;
    }
  }

  /**
   * 发送支付成功通知
   */
  async sendPaymentSuccessNotification(paymentRecord: PaymentRecord): Promise<void> {
    await this.sendNotification(
      paymentRecord.userId,
      'payment_success',
      {
        amount: paymentRecord.amount,
        currency: paymentRecord.currency,
        paymentId: paymentRecord.id,
        subscriptionId: paymentRecord.subscriptionId,
      },
      ['system', 'email'],
    );
  }

  /**
   * 发送支付失败通知
   */
  async sendPaymentFailedNotification(paymentRecord: PaymentRecord): Promise<void> {
    await this.sendNotification(
      paymentRecord.userId,
      'payment_failed',
      {
        amount: paymentRecord.amount,
        currency: paymentRecord.currency,
        paymentId: paymentRecord.id,
        reason: paymentRecord.errorMessage || '支付处理失败',
      },
      ['system', 'email'],
    );
  }

  /**
   * 发送订阅激活通知
   */
  async sendSubscriptionActivatedNotification(subscription: Subscription): Promise<void> {
    await this.sendNotification(
      subscription.userId,
      'subscription_activated',
      {
        planName: subscription.planName,
        subscriptionId: subscription.id,
        endDate: subscription.endDate.toLocaleDateString(),
      },
      ['system', 'email'],
    );
  }

  /**
   * 发送订阅取消通知
   */
  async sendSubscriptionCancelledNotification(subscription: Subscription): Promise<void> {
    await this.sendNotification(
      subscription.userId,
      'subscription_cancelled',
      {
        planName: subscription.planName,
        subscriptionId: subscription.id,
        endDate: subscription.endDate.toLocaleDateString(),
      },
      ['system', 'email'],
    );
  }

  /**
   * 发送订阅即将到期通知
   */
  async sendSubscriptionExpiringNotification(subscription: Subscription): Promise<void> {
    const remainingDays = Math.ceil(
      (subscription.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );

    await this.sendNotification(
      subscription.userId,
      'subscription_expiring',
      {
        planName: subscription.planName,
        subscriptionId: subscription.id,
        remainingDays,
        renewUrl: `/subscription/renew/${subscription.id}`,
      },
      ['system', 'email', 'push'],
    );
  }

  /**
   * 发送配额警告通知
   */
  async sendQuotaWarningNotification(
    userId: string,
    quotaType: string,
    usedQuota: number,
    totalQuota: number,
  ): Promise<void> {
    const usagePercentage = Math.round((usedQuota / totalQuota) * 100);

    await this.sendNotification(
      userId,
      'quota_warning',
      {
        quotaType,
        usedQuota,
        totalQuota,
        usagePercentage,
        upgradeUrl: '/subscription/plans',
      },
      ['system'],
    );
  }

  /**
   * 发送配额超限通知
   */
  async sendQuotaExceededNotification(
    userId: string,
    quotaType: string,
    usedQuota: number,
    totalQuota: number,
  ): Promise<void> {
    await this.sendNotification(
      userId,
      'quota_exceeded',
      {
        quotaType,
        usedQuota,
        totalQuota,
        upgradeUrl: '/subscription/plans',
      },
      ['system', 'email'],
    );
  }

  /**
   * 发送升级推荐通知
   */
  async sendUpgradeRecommendationNotification(
    userId: string,
    currentTier: string,
    recommendedTier: string,
    reason: string,
  ): Promise<void> {
    await this.sendNotification(
      userId,
      'upgrade_recommendation',
      {
        currentTier,
        recommendedTier,
        reason,
        upgradeUrl: '/subscription/plans',
      },
      ['system'],
    );
  }

  /**
   * 获取用户通知列表
   */
  async getUserNotifications(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
      type?: NotificationType;
    } = {},
  ): Promise<{
    notifications: NotificationMessage[];
    total: number;
    unreadCount: number;
  }> {
    try {
      let userNotifications = Array.from(this.notifications.values())
        .filter(n => n.userId === userId);

      // 类型过滤
      if (options.type) {
        userNotifications = userNotifications.filter(n => n.type === options.type);
      }

      // 未读过滤
      if (options.unreadOnly) {
        userNotifications = userNotifications.filter(n => !n.readAt);
      }

      // 排序（按创建时间倒序）
      userNotifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      const total = userNotifications.length;
      const unreadCount = userNotifications.filter(n => !n.readAt).length;

      // 分页
      if (options.limit) {
        const offset = options.offset || 0;
        userNotifications = userNotifications.slice(offset, offset + options.limit);
      }

      return {
        notifications: userNotifications,
        total,
        unreadCount,
      };

    } catch (error) {
      console.error('获取用户通知失败:', error);
      throw error;
    }
  }

  /**
   * 标记通知为已读
   */
  async markNotificationAsRead(notificationId: string): Promise<boolean> {
    try {
      const notification = this.notifications.get(notificationId);
      if (!notification) {
        return false;
      }

      notification.readAt = new Date();
      notification.status = 'read';
      this.notifications.set(notificationId, notification);

      return true;

    } catch (error) {
      console.error('标记通知已读失败:', error);
      return false;
    }
  }

  /**
   * 批量标记通知为已读
   */
  async markNotificationsAsRead(notificationIds: string[]): Promise<number> {
    let successCount = 0;

    for (const id of notificationIds) {
      const success = await this.markNotificationAsRead(id);
      if (success) successCount++;
    }

    return successCount;
  }

  /**
   * 删除通知
   */
  async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      return this.notifications.delete(notificationId);
    } catch (error) {
      console.error('删除通知失败:', error);
      return false;
    }
  }

  // 私有方法

  /**
   * 获取通知模板
   */
  private getNotificationTemplate(type: NotificationType, data: Record<string, any>): {
    title: string;
    content: string;
  } {
    const templates = {
      payment_success: {
        title: '支付成功',
        content: `您的支付已成功完成，金额：¥${(data.amount / 100).toFixed(2)}。订阅已激活，感谢您的支持！`,
      },
      payment_failed: {
        title: '支付失败',
        content: `很抱歉，您的支付未能成功完成。原因：${data.reason}。请重试或联系客服。`,
      },
      subscription_activated: {
        title: '订阅已激活',
        content: `恭喜！您的${data.planName}订阅已成功激活，有效期至${data.endDate}。现在可以享受完整功能了！`,
      },
      subscription_cancelled: {
        title: '订阅已取消',
        content: `您的${data.planName}订阅已取消，将在${data.endDate}到期后停止服务。感谢您的使用！`,
      },
      subscription_expired: {
        title: '订阅已过期',
        content: '您的订阅已过期，部分功能将受到限制。请及时续费以继续享受完整服务。',
      },
      subscription_expiring: {
        title: '订阅即将到期',
        content: `您的${data.planName}订阅将在${data.remainingDays}天后到期，请及时续费以免影响使用。`,
      },
      quota_warning: {
        title: '配额使用提醒',
        content: `您的${this.getQuotaDisplayName(data.quotaType)}已使用${data.usagePercentage}%（${data.usedQuota}/${data.totalQuota}），建议升级套餐获得更多配额。`,
      },
      quota_exceeded: {
        title: '配额已用完',
        content: `您的${this.getQuotaDisplayName(data.quotaType)}已用完（${data.usedQuota}/${data.totalQuota}），请升级套餐或等待明日重置。`,
      },
      upgrade_recommendation: {
        title: '套餐升级推荐',
        content: `基于您的使用情况，建议从${data.currentTier}升级到${data.recommendedTier}。${data.reason}`,
      },
    };

    return templates[type] || { title: '系统通知', content: '您有一条新的系统通知' };
  }

  /**
   * 获取通知优先级
   */
  private getNotificationPriority(type: NotificationType): 'low' | 'normal' | 'high' | 'urgent' {
    const priorityMap = {
      payment_success: 'high',
      payment_failed: 'high',
      subscription_activated: 'high',
      subscription_cancelled: 'normal',
      subscription_expired: 'urgent',
      subscription_expiring: 'high',
      quota_warning: 'normal',
      quota_exceeded: 'high',
      upgrade_recommendation: 'low',
    } as const;

    return priorityMap[type] || 'normal';
  }

  /**
   * 发送到各个渠道
   */
  private async sendToChannels(notification: NotificationMessage): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const channel of notification.channels) {
      switch (channel) {
        case 'email':
          if (this.config.enableEmail) {
            promises.push(this.sendEmail(notification));
          }
          break;
        case 'system':
          if (this.config.enableSystem) {
            promises.push(this.sendSystemNotification(notification));
          }
          break;
        case 'push':
          if (this.config.enablePush) {
            promises.push(this.sendPushNotification(notification));
          }
          break;
        case 'sms':
          if (this.config.enableSms) {
            promises.push(this.sendSmsNotification(notification));
          }
          break;
      }
    }

    try {
      await Promise.all(promises);
      notification.status = 'sent';
      notification.sentAt = new Date();
    } catch (error) {
      console.error('发送通知到渠道失败:', error);
      notification.status = 'failed';
    }

    this.notifications.set(notification.id, notification);
  }

  /**
   * 发送邮件
   */
  private async sendEmail(notification: NotificationMessage): Promise<void> {
    try {
      // 这里应该集成实际的邮件服务
      console.log('发送邮件通知:', {
        to: `user_${notification.userId}@example.com`,
        subject: notification.title,
        content: notification.content,
      });

      // 模拟邮件发送延迟
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.error('发送邮件失败:', error);
      throw error;
    }
  }

  /**
   * 发送系统内通知
   */
  private async sendSystemNotification(notification: NotificationMessage): Promise<void> {
    try {
      // 系统内通知已经通过保存到内存/数据库实现
      console.log('系统内通知已创建:', notification.id);
    } catch (error) {
      console.error('发送系统通知失败:', error);
      throw error;
    }
  }

  /**
   * 发送推送通知
   */
  private async sendPushNotification(notification: NotificationMessage): Promise<void> {
    try {
      // 这里应该集成推送服务（如Firebase、极光推送等）
      console.log('发送推送通知:', {
        userId: notification.userId,
        title: notification.title,
        body: notification.content,
      });

      // 模拟推送发送延迟
      await new Promise(resolve => setTimeout(resolve, 50));

    } catch (error) {
      console.error('发送推送通知失败:', error);
      throw error;
    }
  }

  /**
   * 发送短信通知
   */
  private async sendSmsNotification(notification: NotificationMessage): Promise<void> {
    try {
      // 这里应该集成短信服务
      console.log('发送短信通知:', {
        userId: notification.userId,
        content: notification.content,
      });

      // 模拟短信发送延迟
      await new Promise(resolve => setTimeout(resolve, 200));

    } catch (error) {
      console.error('发送短信通知失败:', error);
      throw error;
    }
  }

  /**
   * 获取配额显示名称
   */
  private getQuotaDisplayName(quotaType: string): string {
    const displayNames = {
      create: '每日创建配额',
      reuse: '每日复用配额',
      export: '每日导出配额',
      graph_nodes: '知识图谱节点配额',
    };

    return displayNames[quotaType as keyof typeof displayNames] || quotaType;
  }
}

// 导出单例实例
export const notificationService = NotificationService.getInstance();
