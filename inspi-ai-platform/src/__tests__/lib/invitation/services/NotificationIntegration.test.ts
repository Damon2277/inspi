/**
 * 通知系统集成测试
 * 测试通知服务、事件处理器和调度器的集成
 */

import { NotificationEventHandler } from '@/lib/invitation/services/NotificationEventHandler';
import { NotificationScheduler } from '@/lib/invitation/services/NotificationScheduler';
import { NotificationServiceImpl, NotificationType, NotificationChannel, NotificationStatus } from '@/lib/invitation/services/NotificationService';
import { InviteEventType } from '@/lib/invitation/types';

// Mock数据库服务
const mockDb = {
  query: jest.fn(),
  queryOne: jest.fn(),
  execute: jest.fn(),
};

// Mock邮件服务
jest.mock('@/lib/email/service', () => ({
  emailService: {
    sendEmail: jest.fn().mockResolvedValue({ success: true, messageId: 'test-message-id' }),
  },
}));

describe('Notification System Integration', () => {
  let notificationService: NotificationServiceImpl;
  let eventHandler: NotificationEventHandler;
  let scheduler: NotificationScheduler;

  beforeEach(() => {
    jest.clearAllMocks();

    notificationService = new NotificationServiceImpl(mockDb as any);
    eventHandler = new NotificationEventHandler(mockDb as any);
    scheduler = new NotificationScheduler(mockDb as any);

    // Mock默认用户偏好设置
    mockDb.query.mockImplementation((query: string) => {
      if (query.includes('notification_preferences')) {
        return Promise.resolve([{
          user_id: 'user1',
          type: 'invite_success',
          channels: JSON.stringify(['in_app', 'email']),
          frequency: 'immediate',
          is_enabled: true,
          quiet_hours_start: null,
          quiet_hours_end: null,
        }]);
      }
      return Promise.resolve([]);
    });

    // Mock通知保存
    mockDb.execute.mockResolvedValue({ affectedRows: 1 });
  });

  afterEach(() => {
    scheduler.stop();
  });

  describe('Complete Invitation Flow', () => {
    it('should handle complete invitation success flow', async () => {
      // 1. 模拟用户注册事件
      const eventData = {
        inviterId: 'user1',
        inviteeId: 'user2',
        inviteCodeId: 'code1',
      };

      // Mock用户信息查询
      mockDb.queryOne.mockImplementation((query: string) => {
        if (query.includes('SELECT id, name, email FROM users')) {
          return Promise.resolve({
            id: 'user2',
            name: '张三',
            email: 'zhangsan@example.com',
          });
        }
        if (query.includes('SELECT email FROM users')) {
          return Promise.resolve({ email: 'user1@example.com' });
        }
        if (query.includes('invite_stats')) {
          return Promise.resolve({
            total_invites: 3,
            successful_registrations: 3,
            active_invitees: 2,
          });
        }
        return Promise.resolve(null);
      });

      // 2. 处理事件
      await eventHandler.handleEvent(InviteEventType.USER_REGISTERED, eventData);

      // 3. 验证通知创建
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notifications'),
        expect.arrayContaining([
          expect.any(String), // id
          'user1', // user_id
          'invite_success', // type
          expect.stringContaining('邀请成功'), // title
          expect.stringContaining('张三'), // content
          'in_app', // channel
          'pending', // status
          expect.any(String), // metadata
          undefined, // scheduled_at
          expect.any(Date), // created_at
        ]),
      );

      // 4. 验证邮件通知也被创建
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notifications'),
        expect.arrayContaining([
          expect.any(String), // id
          'user1', // user_id
          'invite_success', // type
          expect.stringContaining('邀请成功'), // title
          expect.stringContaining('张三'), // content
          'email', // channel
          'pending', // status
          expect.any(String), // metadata
          undefined, // scheduled_at
          expect.any(Date), // created_at
        ]),
      );
    });

    it('should handle reward granted event', async () => {
      const eventData = {
        rewardId: 'reward1',
      };

      // Mock奖励信息查询
      mockDb.queryOne.mockResolvedValueOnce({
        user_id: 'user1',
        reward_type: 'ai_credits',
        amount: 10,
        description: '邀请奖励',
        source_type: 'invite_registration',
        source_id: 'reg1',
      });

      await eventHandler.handleEvent(InviteEventType.REWARD_GRANTED, eventData);

      // 验证奖励通知创建
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notifications'),
        expect.arrayContaining([
          expect.any(String), // id
          'user1', // user_id
          'reward_received', // type
          expect.stringContaining('奖励到账'), // title
          expect.stringContaining('AI生成次数'), // content
          'in_app', // channel
          'pending', // status
          expect.any(String), // metadata
          undefined, // scheduled_at
          expect.any(Date), // created_at
        ]),
      );
    });

    it('should handle milestone achievement', async () => {
      // Mock邀请统计 - 用户刚好达到5人里程碑
      mockDb.queryOne.mockResolvedValueOnce({
        total_invites: 5,
        successful_registrations: 5,
        active_invitees: 4,
      });

      await (eventHandler as any).checkMilestones('user1');

      // 验证里程碑通知创建
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notifications'),
        expect.arrayContaining([
          expect.any(String), // id
          'user1', // user_id
          'milestone_achieved', // type
          '里程碑达成！', // title
          expect.stringContaining('邀请新手'), // content
          'in_app', // channel
          'pending', // status
          expect.any(String), // metadata
          undefined, // scheduled_at
          expect.any(Date), // created_at
        ]),
      );
    });
  });

  describe('Notification Preferences Integration', () => {
    it('should respect user notification preferences', async () => {
      // Mock用户偏好 - 禁用邮件通知
      mockDb.query.mockResolvedValueOnce([{
        user_id: 'user1',
        type: 'invite_success',
        channels: JSON.stringify(['in_app']), // 只允许应用内通知
        frequency: 'immediate',
        is_enabled: true,
        quiet_hours_start: null,
        quiet_hours_end: null,
      }]);

      const notification = {
        userId: 'user1',
        type: NotificationType.INVITE_SUCCESS,
        title: '邀请成功！',
        content: '恭喜！张三 通过您的邀请成功注册了 Inspi.AI',
        channel: NotificationChannel.EMAIL, // 尝试发送邮件通知
        status: NotificationStatus.PENDING,
      };

      const result = await notificationService.sendNotification(notification);

      // 应该返回空字符串，表示通知被阻止
      expect(result).toBe('');
      expect(mockDb.execute).not.toHaveBeenCalled();
    });

    it('should schedule notification during quiet hours', async () => {
      // Mock用户偏好 - 有静默时间
      mockDb.query.mockResolvedValueOnce([{
        user_id: 'user1',
        type: 'invite_success',
        channels: JSON.stringify(['in_app']),
        frequency: 'immediate',
        is_enabled: true,
        quiet_hours_start: '22:00',
        quiet_hours_end: '08:00',
      }]);

      // Mock当前时间在静默时间内
      const originalDate = Date;
      const mockDate = new Date('2024-01-01T23:00:00Z');
      global.Date = jest.fn(() => mockDate) as any;
      global.Date.now = jest.fn(() => mockDate.getTime());

      const notification = {
        userId: 'user1',
        type: NotificationType.INVITE_SUCCESS,
        title: '邀请成功！',
        content: '恭喜！张三 通过您的邀请成功注册了 Inspi.AI',
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.PENDING,
      };

      await notificationService.sendNotification(notification);

      // 验证通知被调度到静默时间结束后
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notifications'),
        expect.arrayContaining([
          expect.any(String), // id
          'user1', // user_id
          'invite_success', // type
          '邀请成功！', // title
          expect.stringContaining('张三'), // content
          'in_app', // channel
          'pending', // status
          null, // metadata
          expect.any(Date), // scheduled_at - 应该不为null
          expect.any(Date), // created_at
        ]),
      );

      // 恢复原始Date
      global.Date = originalDate;
    });
  });

  describe('Scheduler Integration', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should process scheduled notifications', async () => {
      // Mock待发送通知
      mockDb.query.mockResolvedValueOnce([
        {
          id: 'notif1',
          user_id: 'user1',
          type: 'invite_success',
          title: '邀请成功！',
          content: '恭喜！张三 通过您的邀请成功注册了 Inspi.AI',
          channel: 'email',
          status: 'pending',
          metadata: null,
          scheduled_at: null,
          created_at: '2024-01-01T08:00:00Z',
        },
      ]);

      // Mock用户邮箱查询
      mockDb.queryOne.mockResolvedValueOnce({
        email: 'user1@example.com',
      });

      // 设置时间为早上9点（处理待发送通知的时间）
      const mockDate = new Date('2024-01-01T09:00:00Z');
      jest.setSystemTime(mockDate);

      await (scheduler as any).runScheduledTasks();

      // 验证邮件发送
      const { emailService } = require('@/lib/email/service');
      expect(emailService.sendEmail).toHaveBeenCalledWith({
        to: 'user1@example.com',
        subject: '邀请成功！',
        html: expect.stringContaining('邀请成功！'),
        text: '恭喜！张三 通过您的邀请成功注册了 Inspi.AI',
      });

      // 验证通知状态更新
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE notifications'),
        ['sent', 'sent', 'notif1'],
      );
    });

    it('should handle invite code expiration notifications', async () => {
      // Mock即将过期的邀请码
      mockDb.query.mockResolvedValueOnce([
        {
          id: 'code1',
          code: 'ABC123',
          inviter_id: 'user1',
          expires_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2天后过期
          inviter_email: 'user1@example.com',
        },
      ]);

      await (scheduler as any).checkInviteCodeExpiration();

      // 验证过期提醒通知创建
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notifications'),
        expect.arrayContaining([
          expect.any(String), // id
          'user1', // user_id
          'invite_code_expiring', // type
          '邀请码即将过期', // title
          expect.stringContaining('ABC123'), // content
          'in_app', // channel
          'pending', // status
          expect.any(String), // metadata
        ]),
      );
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle database errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Mock数据库错误
      mockDb.query.mockRejectedValueOnce(new Error('Database connection failed'));

      const notification = {
        userId: 'user1',
        type: NotificationType.INVITE_SUCCESS,
        title: '邀请成功！',
        content: '恭喜！张三 通过您的邀请成功注册了 Inspi.AI',
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.PENDING,
      };

      await expect(
        notificationService.sendNotification(notification),
      ).rejects.toThrow('Failed to send notification');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to send notification:',
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle email service errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Mock邮件服务错误
      const { emailService } = require('@/lib/email/service');
      emailService.sendEmail.mockResolvedValueOnce({
        success: false,
        error: 'SMTP server unavailable',
      });

      // Mock用户邮箱查询
      mockDb.queryOne.mockResolvedValueOnce({ email: 'user1@example.com' });

      const mockNotification = {
        user_id: 'user1',
        title: '邀请成功！',
        content: '恭喜！张三 通过您的邀请成功注册了 Inspi.AI',
        channel: 'email',
      };

      await expect(
        (scheduler as any).sendEmailNotification(mockNotification),
      ).rejects.toThrow('SMTP server unavailable');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle bulk notifications efficiently', async () => {
      const notifications = Array.from({ length: 100 }, (_, i) => ({
        userId: `user${i}`,
        type: NotificationType.INVITE_SUCCESS,
        title: '邀请成功！',
        content: `恭喜！用户${i} 通过您的邀请成功注册了 Inspi.AI`,
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.PENDING,
      }));

      const results = await notificationService.sendBulkNotifications(notifications);

      expect(results).toHaveLength(100);
      expect(mockDb.execute).toHaveBeenCalledTimes(100); // 每个通知都应该被保存
    });

    it('should cleanup expired notifications efficiently', async () => {
      mockDb.execute.mockResolvedValueOnce({ affectedRows: 1500 });

      const cleanedCount = await notificationService.cleanupExpiredNotifications(30);

      expect(cleanedCount).toBe(1500);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM notifications'),
        expect.arrayContaining([
          expect.any(Date),
          NotificationStatus.READ,
          NotificationStatus.DELIVERED,
        ]),
      );
    });
  });
});
