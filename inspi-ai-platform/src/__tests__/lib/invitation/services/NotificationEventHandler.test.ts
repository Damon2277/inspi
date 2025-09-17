/**
 * 通知事件处理器测试
 */

import { NotificationEventHandler } from '@/lib/invitation/services/NotificationEventHandler'
import { InviteEventType } from '@/lib/invitation/types'

// Mock数据库服务
const mockDb = {
  query: jest.fn(),
  queryOne: jest.fn(),
  execute: jest.fn()
}

// Mock通知服务
jest.mock('@/lib/invitation/services/NotificationService', () => ({
  NotificationServiceImpl: jest.fn().mockImplementation(() => ({
    handleInviteEvent: jest.fn(),
    sendNotification: jest.fn(),
    schedulePeriodicNotifications: jest.fn(),
    cleanupExpiredNotifications: jest.fn()
  }))
}))

describe('NotificationEventHandler', () => {
  let eventHandler: NotificationEventHandler
  let mockNotificationService: any

  beforeEach(() => {
    jest.clearAllMocks()
    eventHandler = new NotificationEventHandler(mockDb as any)
    mockNotificationService = (eventHandler as any).notificationService
  })

  describe('handleEvent', () => {
    it('should handle USER_REGISTERED event', async () => {
      // Mock用户信息查询
      mockDb.queryOne.mockResolvedValueOnce({
        id: 'user2',
        name: '张三',
        email: 'zhangsan@example.com'
      })

      // Mock邀请统计查询
      mockDb.queryOne.mockResolvedValueOnce({
        total_invites: 3,
        successful_registrations: 3,
        active_invitees: 2
      })

      const eventData = {
        inviterId: 'user1',
        inviteeId: 'user2',
        inviteCodeId: 'code1'
      }

      await eventHandler.handleEvent(InviteEventType.USER_REGISTERED, eventData)

      expect(mockNotificationService.handleInviteEvent).toHaveBeenCalledWith(
        InviteEventType.USER_REGISTERED,
        {
          inviterId: 'user1',
          inviteeId: 'user2',
          inviteeName: '张三',
          inviteeEmail: 'zhangsan@example.com',
          rewardAmount: 10
        }
      )

      expect(mockNotificationService.handleInviteEvent).toHaveBeenCalledWith(
        InviteEventType.USER_ACTIVATED,
        expect.objectContaining({
          userId: 'user1',
          inviteCount: 3
        })
      )
    })

    it('should handle USER_ACTIVATED event', async () => {
      // Mock用户信息查询
      mockDb.queryOne.mockResolvedValueOnce({
        id: 'user2',
        name: '张三',
        email: 'zhangsan@example.com'
      })

      // Mock邀请统计查询
      mockDb.queryOne.mockResolvedValueOnce({
        total_invites: 5,
        successful_registrations: 5,
        active_invitees: 4
      })

      const eventData = {
        inviterId: 'user1',
        inviteeId: 'user2'
      }

      await eventHandler.handleEvent(InviteEventType.USER_ACTIVATED, eventData)

      expect(mockNotificationService.handleInviteEvent).toHaveBeenCalledWith(
        InviteEventType.REWARD_GRANTED,
        expect.objectContaining({
          userId: 'user1',
          rewardType: 'AI生成次数',
          rewardAmount: 5,
          description: '张三 激活账户奖励'
        })
      )
    })

    it('should handle REWARD_GRANTED event', async () => {
      // Mock奖励信息查询
      mockDb.queryOne.mockResolvedValueOnce({
        user_id: 'user1',
        reward_type: 'ai_credits',
        amount: 10,
        description: '邀请奖励',
        source_type: 'invite_registration',
        source_id: 'reg1'
      })

      const eventData = {
        rewardId: 'reward1'
      }

      await eventHandler.handleEvent(InviteEventType.REWARD_GRANTED, eventData)

      expect(mockNotificationService.handleInviteEvent).toHaveBeenCalledWith(
        InviteEventType.REWARD_GRANTED,
        {
          userId: 'user1',
          rewardType: 'AI生成次数',
          rewardAmount: 10,
          description: '邀请奖励',
          sourceType: 'invite_registration',
          sourceId: 'reg1'
        }
      )
    })

    it('should handle unknown event type gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      await eventHandler.handleEvent('unknown_event' as any, {
        inviterId: 'user1'
      })

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No notification handler for event type')
      )

      consoleSpy.mockRestore()
    })

    it('should handle errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
      
      // Mock数据库错误
      mockDb.queryOne.mockRejectedValueOnce(new Error('Database error'))

      const eventData = {
        inviterId: 'user1',
        inviteeId: 'user2'
      }

      await eventHandler.handleEvent(InviteEventType.USER_REGISTERED, eventData)

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to handle notification event'),
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })
  })

  describe('checkInviteProgress', () => {
    it('should send progress notification for milestone approach', async () => {
      // Mock邀请统计 - 用户有3次成功邀请，下一个里程碑是5
      mockDb.queryOne.mockResolvedValueOnce({
        total_invites: 3,
        successful_registrations: 3,
        active_invitees: 2
      })

      await (eventHandler as any).checkInviteProgress('user1')

      expect(mockNotificationService.handleInviteEvent).toHaveBeenCalledWith(
        InviteEventType.USER_ACTIVATED,
        {
          userId: 'user1',
          inviteCount: 3,
          nextMilestone: 5,
          remainingCount: 2,
          milestoneName: '5人邀请达人'
        }
      )
    })

    it('should not send notification if no next milestone', async () => {
      // Mock邀请统计 - 用户已超过最高里程碑
      mockDb.queryOne.mockResolvedValueOnce({
        total_invites: 150,
        successful_registrations: 150,
        active_invitees: 120
      })

      await (eventHandler as any).checkInviteProgress('user1')

      expect(mockNotificationService.handleInviteEvent).not.toHaveBeenCalled()
    })
  })

  describe('checkMilestones', () => {
    it('should send milestone notification when achieved', async () => {
      // Mock邀请统计 - 用户刚好达到5人里程碑
      mockDb.queryOne.mockResolvedValueOnce({
        total_invites: 5,
        successful_registrations: 5,
        active_invitees: 4
      })

      await (eventHandler as any).checkMilestones('user1')

      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user1',
          type: 'milestone_achieved',
          title: '里程碑达成！',
          content: expect.stringContaining('邀请新手'),
          metadata: expect.objectContaining({
            milestoneName: '邀请新手',
            rewardDescription: '专属徽章',
            inviteCount: 5
          })
        })
      )
    })

    it('should not send notification if milestone not achieved', async () => {
      // Mock邀请统计 - 用户有4次成功邀请，未达到里程碑
      mockDb.queryOne.mockResolvedValueOnce({
        total_invites: 4,
        successful_registrations: 4,
        active_invitees: 3
      })

      await (eventHandler as any).checkMilestones('user1')

      expect(mockNotificationService.sendNotification).not.toHaveBeenCalled()
    })
  })

  describe('schedulePeriodicNotifications', () => {
    it('should delegate to notification service', async () => {
      await eventHandler.schedulePeriodicNotifications()

      expect(mockNotificationService.schedulePeriodicNotifications).toHaveBeenCalled()
    })

    it('should handle errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
      
      mockNotificationService.schedulePeriodicNotifications.mockRejectedValueOnce(
        new Error('Scheduling error')
      )

      await eventHandler.schedulePeriodicNotifications()

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to schedule periodic notifications'),
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })
  })

  describe('cleanupExpiredNotifications', () => {
    it('should delegate to notification service and return count', async () => {
      mockNotificationService.cleanupExpiredNotifications.mockResolvedValueOnce(25)

      const result = await eventHandler.cleanupExpiredNotifications(30)

      expect(result).toBe(25)
      expect(mockNotificationService.cleanupExpiredNotifications).toHaveBeenCalledWith(30)
    })

    it('should return 0 on error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
      
      mockNotificationService.cleanupExpiredNotifications.mockRejectedValueOnce(
        new Error('Cleanup error')
      )

      const result = await eventHandler.cleanupExpiredNotifications(30)

      expect(result).toBe(0)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to cleanup expired notifications'),
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })
  })

  describe('getUserInfo', () => {
    it('should return user info', async () => {
      mockDb.queryOne.mockResolvedValueOnce({
        id: 'user1',
        name: '张三',
        email: 'zhangsan@example.com'
      })

      const result = await (eventHandler as any).getUserInfo('user1')

      expect(result).toEqual({
        id: 'user1',
        name: '张三',
        email: 'zhangsan@example.com'
      })
    })

    it('should return null if user not found', async () => {
      mockDb.queryOne.mockResolvedValueOnce(null)

      const result = await (eventHandler as any).getUserInfo('user1')

      expect(result).toBeNull()
    })

    it('should handle database errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
      
      mockDb.queryOne.mockRejectedValueOnce(new Error('Database error'))

      const result = await (eventHandler as any).getUserInfo('user1')

      expect(result).toBeNull()
      expect(consoleErrorSpy).toHaveBeenCalled()

      consoleErrorSpy.mockRestore()
    })
  })

  describe('getRewardInfo', () => {
    it('should return reward info', async () => {
      mockDb.queryOne.mockResolvedValueOnce({
        user_id: 'user1',
        reward_type: 'ai_credits',
        amount: 10,
        description: '邀请奖励',
        source_type: 'invite_registration',
        source_id: 'reg1'
      })

      const result = await (eventHandler as any).getRewardInfo('reward1')

      expect(result).toEqual({
        userId: 'user1',
        rewardType: 'ai_credits',
        amount: 10,
        description: '邀请奖励',
        sourceType: 'invite_registration',
        sourceId: 'reg1'
      })
    })

    it('should return null if reward not found', async () => {
      mockDb.queryOne.mockResolvedValueOnce(null)

      const result = await (eventHandler as any).getRewardInfo('reward1')

      expect(result).toBeNull()
    })
  })

  describe('getInviteStats', () => {
    it('should return invite stats', async () => {
      mockDb.queryOne.mockResolvedValueOnce({
        total_invites: 10,
        successful_registrations: 8,
        active_invitees: 6
      })

      const result = await (eventHandler as any).getInviteStats('user1')

      expect(result).toEqual({
        totalInvites: 10,
        successfulRegistrations: 8,
        activeInvitees: 6
      })
    })

    it('should return default stats if no record found', async () => {
      mockDb.queryOne.mockResolvedValueOnce(null)

      const result = await (eventHandler as any).getInviteStats('user1')

      expect(result).toEqual({
        totalInvites: 0,
        successfulRegistrations: 0,
        activeInvitees: 0
      })
    })
  })
})