/**
 * 通知调度器测试
 */

import { NotificationScheduler } from '@/lib/invitation/services/NotificationScheduler';

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

// Mock事件处理器
jest.mock('@/lib/invitation/services/NotificationEventHandler', () => ({
  NotificationEventHandler: jest.fn().mockImplementation(() => ({
    schedulePeriodicNotifications: jest.fn(),
    cleanupExpiredNotifications: jest.fn().mockResolvedValue(10),
  })),
}));

describe('NotificationScheduler', () => {
  let scheduler: NotificationScheduler;
  let mockEventHandler: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    scheduler = new NotificationScheduler(mockDb as any);
    mockEventHandler = (scheduler as any).eventHandler;
  });

  afterEach(() => {
    scheduler.stop();
    jest.useRealTimers();
  });

  describe('start and stop', () => {
    it('should start scheduler successfully', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      scheduler.start();

      expect(consoleSpy).toHaveBeenCalledWith('Starting notification scheduler...');
      expect(scheduler.getStatus().isRunning).toBe(true);

      consoleSpy.mockRestore();
    });

    it('should not start if already running', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      scheduler.start();
      scheduler.start(); // 尝试再次启动

      expect(consoleSpy).toHaveBeenCalledWith('Notification scheduler is already running');

      consoleSpy.mockRestore();
    });

    it('should stop scheduler successfully', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      scheduler.start();
      scheduler.stop();

      expect(consoleSpy).toHaveBeenCalledWith('Notification scheduler stopped');
      expect(scheduler.getStatus().isRunning).toBe(false);

      consoleSpy.mockRestore();
    });

    it('should not stop if not running', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      scheduler.stop();

      expect(consoleSpy).toHaveBeenCalledWith('Notification scheduler is not running');

      consoleSpy.mockRestore();
    });
  });

  describe('runScheduledTasks', () => {
    beforeEach(() => {
      // Mock待发送通知查询
      mockDb.query.mockResolvedValue([]);

      // Mock过期邀请码查询
      mockDb.query.mockResolvedValue([]);
    });

    it('should process pending notifications at 9 AM', async () => {
      // 设置时间为早上9点
      const mockDate = new Date('2024-01-01T09:00:00Z');
      jest.setSystemTime(mockDate);

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

      // Mock更新通知状态
      mockDb.execute.mockResolvedValueOnce({ affectedRows: 1 });

      await (scheduler as any).runScheduledTasks();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM notifications'),
        [],
      );
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE notifications'),
        ['sent', 'sent', 'notif1'],
      );
    });

    it('should schedule periodic notifications on Monday at 10 AM', async () => {
      // 设置时间为周一早上10点
      const mockDate = new Date('2024-01-01T10:00:00Z'); // 2024-01-01是周一
      jest.setSystemTime(mockDate);

      await (scheduler as any).runScheduledTasks();

      expect(mockEventHandler.schedulePeriodicNotifications).toHaveBeenCalled();
    });

    it('should schedule monthly report on 1st at 10 AM', async () => {
      // 设置时间为1号早上10点
      const mockDate = new Date('2024-02-01T10:00:00Z');
      jest.setSystemTime(mockDate);

      await (scheduler as any).runScheduledTasks();

      expect(mockEventHandler.schedulePeriodicNotifications).toHaveBeenCalled();
    });

    it('should cleanup expired notifications at 2 AM', async () => {
      // 设置时间为凌晨2点
      const mockDate = new Date('2024-01-01T02:00:00Z');
      jest.setSystemTime(mockDate);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await (scheduler as any).runScheduledTasks();

      expect(mockEventHandler.cleanupExpiredNotifications).toHaveBeenCalledWith(30);
      expect(consoleSpy).toHaveBeenCalledWith('Cleaned up 10 expired notifications');

      consoleSpy.mockRestore();
    });

    it('should handle errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Mock数据库错误
      mockDb.query.mockRejectedValueOnce(new Error('Database error'));

      await (scheduler as any).runScheduledTasks();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to run scheduled notification tasks'),
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('processPendingNotifications', () => {
    it('should process pending notifications successfully', async () => {
      const mockNotifications = [
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
      ];

      mockDb.query.mockResolvedValueOnce(mockNotifications);
      mockDb.queryOne.mockResolvedValueOnce({ email: 'user1@example.com' });
      mockDb.execute.mockResolvedValueOnce({ affectedRows: 1 });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await (scheduler as any).processPendingNotifications();

      expect(consoleSpy).toHaveBeenCalledWith('Processed 1 pending notifications');

      consoleSpy.mockRestore();
    });

    it('should handle notification sending failure', async () => {
      const mockNotifications = [
        {
          id: 'notif1',
          user_id: 'user1',
          type: 'invite_success',
          title: '邀请成功！',
          content: '恭喜！张三 通过您的邀请成功注册了 Inspi.AI',
          channel: 'email',
          status: 'pending',
        },
      ];

      mockDb.query.mockResolvedValueOnce(mockNotifications);
      mockDb.queryOne.mockResolvedValueOnce(null); // 用户邮箱不存在

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await (scheduler as any).processPendingNotifications();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send notification notif1'),
        expect.any(Error),
      );

      // 应该更新状态为失败
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE notifications'),
        ['failed', 'failed', 'notif1'],
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle empty pending notifications', async () => {
      mockDb.query.mockResolvedValueOnce([]);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await (scheduler as any).processPendingNotifications();

      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Processed'),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('checkInviteCodeExpiration', () => {
    it('should create expiration notifications for expiring codes', async () => {
      const mockExpiringCodes = [
        {
          id: 'code1',
          code: 'ABC123',
          inviter_id: 'user1',
          expires_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2天后过期
          inviter_email: 'user1@example.com',
        },
      ];

      mockDb.query.mockResolvedValueOnce(mockExpiringCodes);
      mockDb.execute.mockResolvedValue({ affectedRows: 1 });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await (scheduler as any).checkInviteCodeExpiration();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Created expiration notifications for 1 invite codes',
      );

      // 应该创建应用内通知
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

      consoleSpy.mockRestore();
    });

    it('should create email notification for codes expiring in 1 day', async () => {
      const mockExpiringCodes = [
        {
          id: 'code1',
          code: 'ABC123',
          inviter_id: 'user1',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1天后过期
          inviter_email: 'user1@example.com',
        },
      ];

      mockDb.query.mockResolvedValueOnce(mockExpiringCodes);
      mockDb.execute.mockResolvedValue({ affectedRows: 1 });

      await (scheduler as any).checkInviteCodeExpiration();

      // 应该创建两个通知：应用内 + 邮件
      expect(mockDb.execute).toHaveBeenCalledTimes(2);
    });

    it('should handle no expiring codes', async () => {
      mockDb.query.mockResolvedValueOnce([]);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await (scheduler as any).checkInviteCodeExpiration();

      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Created expiration notifications'),
      );

      consoleSpy.mockRestore();
    });

    it('should handle database errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      mockDb.query.mockRejectedValueOnce(new Error('Database error'));

      await (scheduler as any).checkInviteCodeExpiration();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to check invite code expiration'),
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('sendEmailNotification', () => {
    it('should send email notification successfully', async () => {
      const mockNotification = {
        id: 'notif1',
        user_id: 'user1',
        title: '邀请成功！',
        content: '恭喜！张三 通过您的邀请成功注册了 Inspi.AI',
        channel: 'email',
      };

      mockDb.queryOne.mockResolvedValueOnce({ email: 'user1@example.com' });

      await (scheduler as any).sendEmailNotification(mockNotification);

      const { emailService } = require('@/lib/email/service');
      expect(emailService.sendEmail).toHaveBeenCalledWith({
        to: 'user1@example.com',
        subject: '邀请成功！',
        html: expect.stringContaining('邀请成功！'),
        text: '恭喜！张三 通过您的邀请成功注册了 Inspi.AI',
      });
    });

    it('should throw error if user email not found', async () => {
      const mockNotification = {
        user_id: 'user1',
        title: '邀请成功！',
        content: '恭喜！张三 通过您的邀请成功注册了 Inspi.AI',
        channel: 'email',
      };

      mockDb.queryOne.mockResolvedValueOnce(null);

      await expect(
        (scheduler as any).sendEmailNotification(mockNotification),
      ).rejects.toThrow('User email not found');
    });

    it('should throw error if email service fails', async () => {
      const mockNotification = {
        user_id: 'user1',
        title: '邀请成功！',
        content: '恭喜！张三 通过您的邀请成功注册了 Inspi.AI',
        channel: 'email',
      };

      mockDb.queryOne.mockResolvedValueOnce({ email: 'user1@example.com' });

      const { emailService } = require('@/lib/email/service');
      emailService.sendEmail.mockResolvedValueOnce({
        success: false,
        error: 'SMTP error',
      });

      await expect(
        (scheduler as any).sendEmailNotification(mockNotification),
      ).rejects.toThrow('SMTP error');
    });
  });

  describe('generateEmailHTML', () => {
    it('should generate proper HTML email template', () => {
      const mockNotification = {
        title: '邀请成功！',
        content: '恭喜！张三 通过您的邀请成功注册了 Inspi.AI',
      };

      const html = (scheduler as any).generateEmailHTML(mockNotification);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('邀请成功！');
      expect(html).toContain('恭喜！张三 通过您的邀请成功注册了 Inspi.AI');
      expect(html).toContain('Inspi.AI');
      expect(html).toContain('support@inspi-ai.com');
    });
  });

  describe('getStatus', () => {
    it('should return correct status when not running', () => {
      const status = scheduler.getStatus();

      expect(status.isRunning).toBe(false);
      expect(status.uptime).toBeUndefined();
    });

    it('should return correct status when running', () => {
      scheduler.start();
      const status = scheduler.getStatus();

      expect(status.isRunning).toBe(true);
      expect(status.uptime).toBeDefined();
    });
  });
});
