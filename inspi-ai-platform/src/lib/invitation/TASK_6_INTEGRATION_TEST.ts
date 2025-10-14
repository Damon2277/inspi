/**
 * Task 6 - 通知系统集成测试
 * 验证通知系统的核心功能是否正常工作
 */

import type { DatabaseService } from './database';
import { NotificationEventHandler } from './services/NotificationEventHandler';
import { NotificationScheduler } from './services/NotificationScheduler';
import { NotificationServiceImpl, NotificationType, NotificationChannel, NotificationStatus } from './services/NotificationService';
import { InviteEventType } from './types';

type MockDatabase = Pick<DatabaseService, 'execute' | 'queryOne' | 'query' | 'transaction'>;

/**
 * 简单的集成测试，验证通知系统核心功能
 */
export async function testNotificationSystemIntegration(): Promise<boolean> {
  try {
    console.log('开始通知系统集成测试...');

    // 创建模拟数据库服务
    const mockDb: MockDatabase & {
      execute: jest.Mock;
      queryOne: jest.Mock;
      query: jest.Mock;
      transaction: jest.Mock;
    } = {
      execute: jest.fn().mockResolvedValue({ affectedRows: 1 }),
      queryOne: jest.fn().mockResolvedValue({
        id: 'user1',
        email: 'user1@example.com',
        name: '测试用户',
      }),
      query: jest.fn().mockResolvedValue([]),
      transaction: jest.fn().mockImplementation(async (callback) => {
        const connection = {
          query: jest.fn().mockResolvedValue([]),
          execute: jest.fn().mockResolvedValue({ affectedRows: 1 }),
          commit: jest.fn(),
          rollback: jest.fn(),
        };
        return await callback(connection as unknown as any);
      }),
    };

    // 创建通知服务实例
    const dbService = mockDb as unknown as DatabaseService;
    const notificationService = new NotificationServiceImpl(dbService);
    const eventHandler = new NotificationEventHandler(dbService);
    const scheduler = new NotificationScheduler(dbService);

    // 测试1: 发送基本通知
    console.log('测试1: 发送基本通知');
    const notificationId = await notificationService.sendNotification({
      userId: 'user1',
      type: NotificationType.INVITE_SUCCESS,
      title: '邀请成功！',
      content: '恭喜！您的邀请已成功',
      channel: NotificationChannel.IN_APP,
      status: NotificationStatus.PENDING,
    });

    if (!notificationId) {
      throw new Error('通知发送失败');
    }
    console.log('✓ 基本通知发送成功');

    // 测试2: 处理邀请事件
    console.log('测试2: 处理邀请事件');
    await eventHandler.handleEvent(InviteEventType.USER_REGISTERED, {
      inviterId: 'user1',
      inviteeId: 'user2',
      metadata: {
        inviteeName: '张三',
      },
    });
    console.log('✓ 邀请事件处理成功');

    // 测试3: 获取用户通知
    console.log('测试3: 获取用户通知');
    mockDb.query.mockResolvedValueOnce([
      {
        id: 'notif1',
        user_id: 'user1',
        type: 'invite_success',
        title: '邀请成功！',
        content: '恭喜！您的邀请已成功',
        channel: 'in_app',
        status: 'sent',
        created_at: new Date(),
      },
    ]);

    const notifications = await notificationService.getUserNotifications('user1');
    if (!notifications || notifications.length === 0) {
      throw new Error('获取用户通知失败');
    }
    console.log('✓ 用户通知获取成功');

    // 测试4: 标记通知已读
    console.log('测试4: 标记通知已读');
    await notificationService.markAsRead('notif1');
    console.log('✓ 通知标记已读成功');

    // 测试5: 获取未读数量
    console.log('测试5: 获取未读数量');
    mockDb.queryOne.mockResolvedValueOnce({ count: 5 });
    const unreadCount = await notificationService.getUnreadCount('user1');
    if (typeof unreadCount !== 'number') {
      throw new Error('获取未读数量失败');
    }
    console.log('✓ 未读数量获取成功');

    console.log('通知系统集成测试完成 ✓');
    return true;

  } catch (error) {
    console.error('通知系统集成测试失败:', error);
    return false;
  }
}

/**
 * 验证通知系统的所有组件是否正确导出
 */
export function verifyNotificationSystemExports(): boolean {
  try {
    console.log('验证通知系统导出...');

    // 验证服务类
    if (!NotificationServiceImpl) {
      throw new Error('NotificationServiceImpl 未正确导出');
    }

    if (!NotificationEventHandler) {
      throw new Error('NotificationEventHandler 未正确导出');
    }

    if (!NotificationScheduler) {
      throw new Error('NotificationScheduler 未正确导出');
    }

    // 验证枚举类型
    if (!NotificationType.INVITE_SUCCESS) {
      throw new Error('NotificationType 枚举未正确导出');
    }

    if (!NotificationChannel.IN_APP) {
      throw new Error('NotificationChannel 枚举未正确导出');
    }

    if (!NotificationStatus.PENDING) {
      throw new Error('NotificationStatus 枚举未正确导出');
    }

    console.log('✓ 通知系统导出验证成功');
    return true;

  } catch (error) {
    console.error('通知系统导出验证失败:', error);
    return false;
  }
}

/**
 * 运行完整的通知系统验证
 */
export async function runNotificationSystemVerification(): Promise<void> {
  console.log('=== 通知系统完整性验证 ===');

  // 验证导出
  const exportsValid = verifyNotificationSystemExports();

  // 运行集成测试
  const integrationValid = await testNotificationSystemIntegration();

  if (exportsValid && integrationValid) {
    console.log('🎉 通知系统验证成功！所有功能正常工作');
  } else {
    console.error('❌ 通知系统验证失败');
    throw new Error('通知系统验证失败');
  }
}
