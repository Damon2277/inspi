/**
 * 邀请事件通知处理器
 * 监听邀请系统事件并触发相应的通知
 */

import { DatabaseService } from '../database';
import { InviteEventType, RewardType } from '../types';

import { NotificationServiceImpl, NotificationType, NotificationChannel, NotificationStatus } from './NotificationService';

export interface InviteEventData {
  inviterId: string
  inviteeId?: string
  inviteCodeId?: string
  rewardId?: string
  metadata?: Record<string, any>
}

export class NotificationEventHandler {
  private notificationService: NotificationServiceImpl;

  constructor(private db: DatabaseService) {
    this.notificationService = new NotificationServiceImpl(db);
  }

  /**
   * 处理邀请事件
   */
  async handleEvent(eventType: InviteEventType, data: InviteEventData): Promise<void> {
    try {
      switch (eventType) {
        case InviteEventType.USER_REGISTERED:
          await this.handleUserRegistered(data);
          break;

        case InviteEventType.USER_ACTIVATED:
          await this.handleUserActivated(data);
          break;

        case InviteEventType.REWARD_GRANTED:
          await this.handleRewardGranted(data);
          break;

        default:
          console.log(`No notification handler for event type: ${eventType}`);
      }
    } catch (error) {
      console.error(`Failed to handle notification event ${eventType}:`, error);
    }
  }

  /**
   * 处理用户注册事件
   */
  private async handleUserRegistered(data: InviteEventData): Promise<void> {
    if (!data.inviteeId || !data.inviterId) return;

    try {
      // 获取被邀请人信息
      const inviteeInfo = await this.getUserInfo(data.inviteeId);
      if (!inviteeInfo) return;

      // 发送邀请成功通知
      await this.notificationService.handleInviteEvent(InviteEventType.USER_REGISTERED, {
        inviterId: data.inviterId,
        inviteeId: data.inviteeId,
        inviteeName: inviteeInfo.name || inviteeInfo.email,
        inviteeEmail: inviteeInfo.email,
        rewardAmount: 10, // 默认奖励数量
      });

      // 检查是否达到邀请进度里程碑
      await this.checkInviteProgress(data.inviterId);

    } catch (error) {
      console.error('Failed to handle user registered event:', error);
    }
  }

  /**
   * 处理用户激活事件
   */
  private async handleUserActivated(data: InviteEventData): Promise<void> {
    if (!data.inviteeId || !data.inviterId) return;

    try {
      // 获取被邀请人信息
      const inviteeInfo = await this.getUserInfo(data.inviteeId);
      if (!inviteeInfo) return;

      // 发送激活奖励通知
      await this.notificationService.handleInviteEvent(InviteEventType.REWARD_GRANTED, {
        userId: data.inviterId,
        rewardType: 'AI生成次数',
        rewardAmount: 5,
        description: `${inviteeInfo.name || inviteeInfo.email} 激活账户奖励`,
        sourceType: 'invite_activation',
        sourceId: data.inviteeId,
      });

      // 检查是否达到里程碑
      await this.checkMilestones(data.inviterId);

    } catch (error) {
      console.error('Failed to handle user activated event:', error);
    }
  }

  /**
   * 处理奖励发放事件
   */
  private async handleRewardGranted(data: InviteEventData): Promise<void> {
    if (!data.rewardId) return;

    try {
      // 获取奖励详情
      const reward = await this.getRewardInfo(data.rewardId);
      if (!reward) return;

      // 发送奖励到账通知
      await this.notificationService.handleInviteEvent(InviteEventType.REWARD_GRANTED, {
        userId: reward.userId,
        rewardType: this.getRewardTypeDisplayName(reward.rewardType),
        rewardAmount: reward.amount || reward.description,
        description: reward.description,
        sourceType: reward.sourceType,
        sourceId: reward.sourceId,
      });

    } catch (error) {
      console.error('Failed to handle reward granted event:', error);
    }
  }

  /**
   * 检查邀请进度
   */
  private async checkInviteProgress(inviterId: string): Promise<void> {
    try {
      const stats = await this.getInviteStats(inviterId);

      // 定义里程碑
      const milestones = [5, 10, 20, 50, 100];
      const nextMilestone = (milestones.find as any)(m => m > stats.successfulRegistrations);

      if (nextMilestone) {
        const remainingCount = nextMilestone - stats.successfulRegistrations;

        // 发送进度通知
        await this.notificationService.handleInviteEvent(InviteEventType.USER_ACTIVATED, {
          userId: inviterId,
          inviteCount: stats.successfulRegistrations,
          nextMilestone,
          remainingCount,
          milestoneName: `${nextMilestone}人邀请达人`,
        });
      }
    } catch (error) {
      console.error('Failed to check invite progress:', error);
    }
  }

  /**
   * 检查里程碑达成
   */
  private async checkMilestones(inviterId: string): Promise<void> {
    try {
      const stats = await this.getInviteStats(inviterId);

      // 检查邀请数量里程碑
      const milestones = [
        { count: 5, name: '邀请新手', reward: '专属徽章' },
        { count: 10, name: '邀请达人', reward: '20次AI生成次数' },
        { count: 20, name: '社区建设者', reward: '专属称号' },
        { count: 50, name: '推广大使', reward: '高级模板解锁' },
        { count: 100, name: '传播之星', reward: '终身会员' },
      ];

      const achievedMilestone = (milestones.find as any)(m =>
        m.count === stats.successfulRegistrations,
      );

      if (achievedMilestone) {
        // 发送里程碑达成通知
        await this.notificationService.sendNotification({
          userId: inviterId,
          type: NotificationType.MILESTONE_ACHIEVED,
          title: '里程碑达成！',
          content: `恭喜您达成了 ${achievedMilestone.name} 里程碑！获得了 ${achievedMilestone.reward} 奖励！`,
          channel: NotificationChannel.IN_APP,
          status: NotificationStatus.PENDING,
          metadata: {
            milestoneName: achievedMilestone.name,
            rewardDescription: achievedMilestone.reward,
            inviteCount: stats.successfulRegistrations,
          },
        });
      }
    } catch (error) {
      console.error('Failed to check milestones:', error);
    }
  }

  /**
   * 调度定期通知任务
   */
  async schedulePeriodicNotifications(): Promise<void> {
    try {
      await this.notificationService.schedulePeriodicNotifications();
    } catch (error) {
      console.error('Failed to schedule periodic notifications:', error);
    }
  }

  /**
   * 清理过期通知
   */
  async cleanupExpiredNotifications(daysToKeep: number = 30): Promise<number> {
    try {
      return await this.notificationService.cleanupExpiredNotifications(daysToKeep);
    } catch (error) {
      console.error('Failed to cleanup expired notifications:', error);
      return 0;
    }
  }

  // 辅助方法

  /**
   * 获取用户信息
   */
  private async getUserInfo(userId: string): Promise<{
    id: string
    name?: string
    email: string
  } | null> {
    try {
      const query = 'SELECT id, name, email FROM users WHERE id = ?';
      const result = await this.db.queryOne<{ id: string; name?: string; email: string }>(query, [userId]);

      if (!result) return null;

      return {
        id: result.id,
        name: result.name,
        email: result.email,
      };
    } catch (error) {
      console.error('Failed to get user info:', error);
      return null;
    }
  }

  /**
   * 获取奖励信息
   */
  private async getRewardInfo(rewardId: string): Promise<{
    userId: string
    rewardType: string
    amount?: number
    description: string
    sourceType: string
    sourceId: string
  } | null> {
    try {
      const query = `
        SELECT user_id, reward_type, amount, description, source_type, source_id
        FROM rewards 
        WHERE id = ?
      `;
      const result = await this.db.queryOne<{
        user_id: string;
        reward_type: string;
        amount: number | null;
        description: string;
        source_type: string;
        source_id: string;
      }>(query, [rewardId]);

      if (!result) return null;

      return {
        userId: result.user_id,
        rewardType: result.reward_type,
        amount: result.amount,
        description: result.description,
        sourceType: result.source_type,
        sourceId: result.source_id,
      };
    } catch (error) {
      console.error('Failed to get reward info:', error);
      return null;
    }
  }

  /**
   * 获取邀请统计
   */
  private async getInviteStats(userId: string): Promise<{
    totalInvites: number
    successfulRegistrations: number
    activeInvitees: number
  }> {
    try {
      const query = `
        SELECT 
          total_invites,
          successful_registrations,
          active_invitees
        FROM invite_stats 
        WHERE user_id = ?
      `;
      const result = await this.db.queryOne<{
        total_invites: number | null;
        successful_registrations: number | null;
        active_invitees: number | null;
      }>(query, [userId]);

      if (!result) {
        return {
          totalInvites: 0,
          successfulRegistrations: 0,
          activeInvitees: 0,
        };
      }

      return {
        totalInvites: result.total_invites || 0,
        successfulRegistrations: result.successful_registrations || 0,
        activeInvitees: result.active_invitees || 0,
      };
    } catch (error) {
      console.error('Failed to get invite stats:', error);
      return {
        totalInvites: 0,
        successfulRegistrations: 0,
        activeInvitees: 0,
      };
    }
  }

  /**
   * 获取奖励类型显示名称
   */
  private getRewardTypeDisplayName(rewardType: string): string {
    const typeMap: Record<string, string> = {
      [RewardType.AI_CREDITS]: 'AI生成次数',
      [RewardType.BADGE]: '徽章',
      [RewardType.TITLE]: '称号',
      [RewardType.PREMIUM_ACCESS]: '会员权限',
      [RewardType.TEMPLATE_UNLOCK]: '模板解锁',
    };

    return typeMap[rewardType] || rewardType;
  }
}
