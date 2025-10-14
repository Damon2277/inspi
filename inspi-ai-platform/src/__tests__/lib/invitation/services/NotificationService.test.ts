/**
 * 通知服务测试
 */

import { NotificationServiceImpl, NotificationType, NotificationChannel, NotificationStatus } from '@/lib/invitation/services/NotificationService';
import { InviteEventType } from '@/lib/invitation/types';

// Mock数据库服务
const mockDb = {
  query: jest.fn(),
  queryOne: jest.fn(),
  execute: jest.fn(),
};

describe('NotificationService', () => {
  let notificationService: NotificationServiceImpl;

  beforeEach(() => {
    jest.clearAllMocks();
    notificationService = new NotificationServiceImpl(mockDb as any);
  });

  describe('sendNotification', () => {
    it('should send notification successfully', async () => {
      // Mock用户偏好设置
      mockDb.query.mockResolvedValueOnce([{
        user_id: 'user1',
        type: NotificationType.INVITE_SUCCESS,
        channels: JSON.stringify([NotificationChannel.IN_APP, NotificationChannel.EMAIL]),
        frequency: 'immediate',
        is_enabled: true,
        quiet_hours_start: null,
        quiet_hours_end: null,
      }]);

      // Mock保存通知
      mockDb.execute.mockResolvedValueOnce({ insertId: 1 });

      const notification = {
        userId: 'user1',
        type: NotificationType.INVITE_SUCCESS,
        title: '邀请成功！',
        content: '恭喜！张三 通过您的邀请成功注册了 Inspi.AI',
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.PENDING,
        metadata: { inviteeName: '张三' },
      };

      const result = await notificationService.sendNotification(notification);

      expect(result).toBeTruthy();
      expect(mockDb.execute).toHaveBeenCalled();
    });

    it('should not send notification if disabled in preferences', async () => {
      // Mock用户偏好设置 - 已禁用
      mockDb.query.mockResolvedValueOnce([{
        user_id: 'user1',
        type: NotificationType.INVITE_SUCCESS,
        channels: JSON.stringify([NotificationChannel.IN_APP]),
        frequency: 'immediate',
        is_enabled: false,
        quiet_hours_start: null,
        quiet_hours_end: null,
      }]);

      const notification = {
        userId: 'user1',
        type: NotificationType.INVITE_SUCCESS,
        title: '邀请成功！',
        content: '恭喜！张三 通过您的邀请成功注册了 Inspi.AI',
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.PENDING,
      };

      const result = await notificationService.sendNotification(notification);

      expect(result).toBe('');
      expect(mockDb.execute).not.toHaveBeenCalled();
    });

    it('should schedule notification during quiet hours', async () => {
      // Mock用户偏好设置 - 有静默时间
      mockDb.query.mockResolvedValueOnce([{
        user_id: 'user1',
        type: NotificationType.INVITE_SUCCESS,
        channels: JSON.stringify([NotificationChannel.IN_APP]),
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

      mockDb.execute.mockResolvedValueOnce({ insertId: 1 });

      const notification = {
        userId: 'user1',
        type: NotificationType.INVITE_SUCCESS,
        title: '邀请成功！',
        content: '恭喜！张三 通过您的邀请成功注册了 Inspi.AI',
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.PENDING,
      };

      const result = await notificationService.sendNotification(notification);

      expect(result).toBeTruthy();

      // 验证通知被保存，scheduled_at应该不为undefined
      const insertCall = mockDb.execute.mock.calls.find(call =>
        call[0].includes('INSERT INTO notifications'),
      );
      expect(insertCall).toBeDefined();
      expect(insertCall[1][8]).toBeDefined(); // scheduled_at should be defined

      // 恢复原始Date
      global.Date = originalDate;
    });
  });

  describe('getUserNotifications', () => {
    it('should get user notifications with pagination', async () => {
      const mockNotifications = [
        {
          id: 'notif1',
          user_id: 'user1',
          type: 'invite_success',
          title: '邀请成功！',
          content: '恭喜！张三 通过您的邀请成功注册了 Inspi.AI',
          channel: 'in_app',
          status: 'sent',
          metadata: null,
          scheduled_at: null,
          sent_at: '2024-01-01T10:00:00Z',
          read_at: null,
          created_at: '2024-01-01T10:00:00Z',
        },
      ];

      mockDb.query.mockResolvedValueOnce(mockNotifications);

      const result = await notificationService.getUserNotifications('user1', {
        limit: 10,
        offset: 0,
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('notif1');
      expect(result[0].userId).toBe('user1');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM notifications'),
        ['user1', 10, 0],
      );
    });

    it('should filter notifications by channel and status', async () => {
      mockDb.query.mockResolvedValueOnce([]);

      await notificationService.getUserNotifications('user1', {
        channel: NotificationChannel.EMAIL,
        status: NotificationStatus.READ,
        limit: 20,
        offset: 0,
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('AND channel = ?'),
        ['user1', NotificationChannel.EMAIL, NotificationStatus.READ, 20, 0],
      );
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      mockDb.execute.mockResolvedValueOnce({ affectedRows: 1 });

      await notificationService.markAsRead('notif1');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE notifications'),
        [NotificationStatus.READ, 'notif1', NotificationStatus.READ],
      );
    });
  });

  describe('markMultipleAsRead', () => {
    it('should mark multiple notifications as read', async () => {
      mockDb.execute.mockResolvedValueOnce({ affectedRows: 2 });

      await notificationService.markMultipleAsRead(['notif1', 'notif2']);

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id IN (?,?)'),
        [NotificationStatus.READ, 'notif1', 'notif2', NotificationStatus.READ],
      );
    });

    it('should handle empty array', async () => {
      await notificationService.markMultipleAsRead([]);

      expect(mockDb.execute).not.toHaveBeenCalled();
    });
  });

  describe('getUnreadCount', () => {
    it('should get unread notification count', async () => {
      mockDb.queryOne.mockResolvedValueOnce({ count: '5' });

      const count = await notificationService.getUnreadCount('user1');

      expect(count).toBe(5);
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COUNT(*) as count'),
        ['user1', NotificationStatus.READ],
      );
    });

    it('should get unread count for specific channel', async () => {
      mockDb.queryOne.mockResolvedValueOnce({ count: '3' });

      const count = await notificationService.getUnreadCount('user1', NotificationChannel.EMAIL);

      expect(count).toBe(3);
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('AND channel = ?'),
        ['user1', NotificationStatus.READ, NotificationChannel.EMAIL],
      );
    });

    it('should return 0 on error', async () => {
      mockDb.queryOne.mockRejectedValueOnce(new Error('Database error'));

      const count = await notificationService.getUnreadCount('user1');

      expect(count).toBe(0);
    });
  });

  describe('handleInviteEvent', () => {
    it('should handle USER_REGISTERED event', async () => {
      const spy = jest.spyOn(notificationService as any, 'handleInviteSuccessNotification');
      spy.mockResolvedValueOnce(undefined);

      const eventData = {
        inviterId: 'user1',
        inviteeId: 'user2',
        inviteeName: '张三',
        inviteeEmail: 'zhangsan@example.com',
        rewardAmount: 10,
      };

      await notificationService.handleInviteEvent(InviteEventType.USER_REGISTERED, eventData);

      expect(spy).toHaveBeenCalledWith(eventData);
    });

    it('should handle REWARD_GRANTED event', async () => {
      const spy = jest.spyOn(notificationService as any, 'handleRewardReceivedNotification');
      spy.mockResolvedValueOnce(undefined);

      const eventData = {
        userId: 'user1',
        rewardType: 'AI生成次数',
        rewardAmount: 10,
        description: '邀请奖励',
        sourceType: 'invite_registration',
        sourceId: 'reg1',
      };

      await notificationService.handleInviteEvent(InviteEventType.REWARD_GRANTED, eventData);

      expect(spy).toHaveBeenCalledWith(eventData);
    });

    it('should handle USER_ACTIVATED event', async () => {
      const spy = jest.spyOn(notificationService as any, 'handleInviteProgressNotification');
      spy.mockResolvedValueOnce(undefined);

      const eventData = {
        userId: 'user1',
        inviteCount: 5,
        nextMilestone: 10,
        remainingCount: 5,
      };

      await notificationService.handleInviteEvent(InviteEventType.USER_ACTIVATED, eventData);

      expect(spy).toHaveBeenCalledWith(eventData);
    });

    it('should handle unknown event type gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await notificationService.handleInviteEvent('unknown_event' as any, {});

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No notification handler for event type'),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('cleanupExpiredNotifications', () => {
    it('should cleanup expired notifications', async () => {
      mockDb.execute.mockResolvedValueOnce({ affectedRows: 15 });

      const result = await notificationService.cleanupExpiredNotifications(30);

      expect(result).toBe(15);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM notifications'),
        [
          expect.any(Date),
          'read',
          'delivered',
        ],
      );
    });

    it('should return 0 on error', async () => {
      mockDb.execute.mockRejectedValueOnce(new Error('Database error'));

      const result = await notificationService.cleanupExpiredNotifications(30);

      expect(result).toBe(0);
    });
  });

  describe('getUserPreferences', () => {
    it('should get user preferences', async () => {
      const mockPreferences = [
        {
          user_id: 'user1',
          type: 'invite_success',
          channels: JSON.stringify(['in_app', 'email']),
          frequency: 'immediate',
          is_enabled: true,
          quiet_hours_start: '22:00',
          quiet_hours_end: '08:00',
        },
      ];

      mockDb.query.mockResolvedValueOnce(mockPreferences);

      const result = await notificationService.getUserPreferences('user1');

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('user1');
      expect(result[0].type).toBe('invite_success');
      expect(result[0].channels).toEqual(['in_app', 'email']);
      expect(result[0].isEnabled).toBe(true);
      expect(result[0].quietHours).toEqual({
        start: '22:00',
        end: '08:00',
      });
    });

    it('should return default preferences if none exist', async () => {
      mockDb.query.mockResolvedValueOnce([]);

      const result = await notificationService.getUserPreferences('user1');

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].userId).toBe('user1');
      expect(result[0].isEnabled).toBe(true);
    });
  });

  describe('updateUserPreferences', () => {
    it('should update user preferences', async () => {
      mockDb.execute.mockResolvedValue({ affectedRows: 1 });

      const preferences = [
        {
          type: NotificationType.INVITE_SUCCESS,
          channels: [NotificationChannel.IN_APP],
          frequency: 'daily' as any,
          isEnabled: false,
          quietHours: {
            start: '23:00',
            end: '07:00',
          },
        },
      ];

      await notificationService.updateUserPreferences('user1', preferences);

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notification_preferences'),
        [
          'user1',
          NotificationType.INVITE_SUCCESS,
          JSON.stringify([NotificationChannel.IN_APP]),
          'daily',
          false,
          '23:00',
          '07:00',
        ],
      );
    });
  });
});
