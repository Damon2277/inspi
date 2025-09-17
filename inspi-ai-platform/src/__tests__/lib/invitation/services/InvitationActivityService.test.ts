/**
 * InvitationActivityService 单元测试
 * 测试邀请活动管理服务的各项功能
 */

import { InvitationActivityService } from '@/lib/invitation/services/InvitationActivityService'
import { DatabasePool } from '@/lib/invitation/database'
import { ActivityType, ActivityStatus, ActivityRules, ActivityReward, RewardType } from '@/lib/invitation/types'

// Mock数据库连接
const mockDb: jest.Mocked<DatabasePool> = {
  query: jest.fn(),
  execute: jest.fn(),
  transaction: jest.fn(),
  close: jest.fn()
}

// Mock连接对象
const mockConnection = {
  query: jest.fn(),
  execute: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn()
}

describe('InvitationActivityService', () => {
  let service: InvitationActivityService

  beforeEach(() => {
    service = new InvitationActivityService(mockDb)
    jest.clearAllMocks()
  })

  describe('createActivity', () => {
    const mockActivityData = {
      name: '春季邀请挑战',
      description: '邀请好友获得丰厚奖励',
      type: ActivityType.CHALLENGE,
      startDate: new Date('2024-03-01'),
      endDate: new Date('2024-03-31'),
      rules: {
        winConditions: { type: 'top_ranks' as const, count: 10 },
        scoringRules: {
          invitePoints: 10,
          registrationPoints: 50,
          activationPoints: 100
        }
      } as ActivityRules,
      rewards: [
        {
          type: RewardType.AI_CREDITS,
          amount: 100,
          description: '前10名奖励',
          rankRange: { min: 1, max: 10 }
        }
      ] as ActivityReward[],
      targetMetrics: { totalInvites: 1000 }
    }

    it('应该成功创建活动', async () => {
      // 模拟事务执行
      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockConnection)
      })

      // 模拟获取活动详情
      mockDb.query.mockResolvedValueOnce([{
        id: 'activity-1',
        name: mockActivityData.name,
        description: mockActivityData.description,
        type: mockActivityData.type,
        status: 'draft',
        start_date: mockActivityData.startDate,
        end_date: mockActivityData.endDate,
        rules: JSON.stringify(mockActivityData.rules),
        target_metrics: JSON.stringify(mockActivityData.targetMetrics),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }])

      // 模拟获取奖励
      mockDb.query.mockResolvedValueOnce([{
        reward_type: 'ai_credits',
        reward_amount: 100,
        description: '前10名奖励',
        rank_min: 1,
        rank_max: 10
      }])

      const result = await service.createActivity(mockActivityData)

      expect(result).toBeDefined()
      expect(result.name).toBe(mockActivityData.name)
      expect(result.type).toBe(mockActivityData.type)
      expect(mockDb.transaction).toHaveBeenCalledTimes(1)
      expect(mockConnection.execute).toHaveBeenCalledTimes(3) // 活动、奖励、事件日志
    })

    it('应该在创建失败时抛出错误', async () => {
      mockDb.transaction.mockRejectedValue(new Error('Database error'))

      await expect(service.createActivity(mockActivityData)).rejects.toThrow('创建活动失败')
    })
  })

  describe('updateActivity', () => {
    it('应该成功更新活动', async () => {
      const activityId = 'activity-1'
      const updates = {
        name: '更新后的活动名称',
        status: ActivityStatus.ACTIVE
      }

      mockDb.execute.mockResolvedValueOnce({ affectedRows: 1 })

      // 模拟获取更新后的活动
      mockDb.query.mockResolvedValueOnce([{
        id: activityId,
        name: updates.name,
        description: '活动描述',
        type: 'challenge',
        status: updates.status,
        start_date: new Date(),
        end_date: new Date(),
        rules: '{}',
        target_metrics: '{}',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }])

      mockDb.query.mockResolvedValueOnce([]) // 奖励查询

      const result = await service.updateActivity(activityId, updates)

      expect(result.name).toBe(updates.name)
      expect(result.status).toBe(updates.status)
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE invitation_activities'),
        expect.arrayContaining([updates.name, updates.status, activityId])
      )
    })

    it('应该在没有更新字段时抛出错误', async () => {
      await expect(service.updateActivity('activity-1', {})).rejects.toThrow('没有提供更新字段')
    })
  })

  describe('getActivityById', () => {
    it('应该成功获取活动详情', async () => {
      const activityId = 'activity-1'
      
      mockDb.query.mockResolvedValueOnce([{
        id: activityId,
        name: '测试活动',
        description: '测试描述',
        type: 'challenge',
        status: 'active',
        start_date: new Date(),
        end_date: new Date(),
        rules: JSON.stringify({ winConditions: { type: 'top_ranks', count: 10 } }),
        target_metrics: JSON.stringify({ totalInvites: 100 }),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }])

      mockDb.query.mockResolvedValueOnce([{
        reward_type: 'ai_credits',
        reward_amount: 50,
        description: '测试奖励',
        rank_min: 1,
        rank_max: 5
      }])

      const result = await service.getActivityById(activityId)

      expect(result).toBeDefined()
      expect(result.id).toBe(activityId)
      expect(result.rewards).toHaveLength(1)
      expect(result.rewards[0].type).toBe(RewardType.AI_CREDITS)
    })

    it('应该在活动不存在时抛出错误', async () => {
      mockDb.query.mockResolvedValueOnce([])

      await expect(service.getActivityById('nonexistent')).rejects.toThrow('活动不存在')
    })
  })

  describe('joinActivity', () => {
    const activityId = 'activity-1'
    const userId = 'user-1'
    const userInfo = {
      userName: '测试用户',
      userEmail: 'test@example.com'
    }

    it('应该成功加入活动', async () => {
      // 模拟获取活动详情
      mockDb.query.mockResolvedValueOnce([{
        id: activityId,
        name: '测试活动',
        description: '测试描述',
        type: 'challenge',
        status: 'active',
        start_date: new Date(Date.now() - 86400000), // 昨天开始
        end_date: new Date(Date.now() + 86400000), // 明天结束
        rules: JSON.stringify({ winConditions: { type: 'top_ranks', count: 10 } }),
        target_metrics: '{}',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }])

      mockDb.query.mockResolvedValueOnce([]) // 奖励查询
      mockDb.query.mockResolvedValueOnce([]) // 检查是否已参与

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockConnection)
      })

      const result = await service.joinActivity(activityId, userId, userInfo)

      expect(result).toBeDefined()
      expect(result.userId).toBe(userId)
      expect(result.userName).toBe(userInfo.userName)
      expect(mockConnection.execute).toHaveBeenCalledTimes(3) // 参与者、进度、事件日志
    })

    it('应该在活动未开放时拒绝加入', async () => {
      // 模拟获取非活跃状态的活动
      mockDb.query.mockResolvedValueOnce([{
        id: activityId,
        status: 'draft',
        start_date: new Date(),
        end_date: new Date(),
        rules: '{}',
        target_metrics: '{}',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }])

      mockDb.query.mockResolvedValueOnce([]) // 奖励查询

      await expect(service.joinActivity(activityId, userId, userInfo)).rejects.toThrow('活动未开放参与')
    })

    it('应该在用户已参与时拒绝重复加入', async () => {
      // 模拟获取活跃活动
      mockDb.query.mockResolvedValueOnce([{
        id: activityId,
        status: 'active',
        start_date: new Date(Date.now() - 86400000),
        end_date: new Date(Date.now() + 86400000),
        rules: '{}',
        target_metrics: '{}',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }])

      mockDb.query.mockResolvedValueOnce([]) // 奖励查询
      mockDb.query.mockResolvedValueOnce([{ id: 'existing-participant' }]) // 已存在的参与者

      await expect(service.joinActivity(activityId, userId, userInfo)).rejects.toThrow('用户已参与该活动')
    })
  })

  describe('updateUserProgress', () => {
    it('应该成功更新用户进度', async () => {
      const activityId = 'activity-1'
      const userId = 'user-1'
      const progressData = {
        invitesSent: 5,
        registrationsAchieved: 3,
        activationsAchieved: 2
      }

      // 模拟获取活动详情
      mockDb.query.mockResolvedValueOnce([{
        id: activityId,
        rules: JSON.stringify({
          scoringRules: {
            invitePoints: 10,
            registrationPoints: 50,
            activationPoints: 100
          }
        }),
        target_metrics: '{}',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }])

      mockDb.query.mockResolvedValueOnce([]) // 奖励查询

      // 模拟获取当前进度
      mockDb.query.mockResolvedValueOnce([{
        activity_id: activityId,
        user_id: userId,
        invites_sent: 2,
        registrations_achieved: 1,
        activations_achieved: 1,
        current_score: 160,
        current_rank: 5,
        updated_at: new Date()
      }])

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockConnection)
      })

      // 模拟更新后的进度
      mockDb.query.mockResolvedValueOnce([{
        activity_id: activityId,
        user_id: userId,
        invites_sent: progressData.invitesSent,
        registrations_achieved: progressData.registrationsAchieved,
        activations_achieved: progressData.activationsAchieved,
        current_score: 400, // 5*10 + 3*50 + 2*100
        current_rank: 3,
        updated_at: new Date()
      }])

      const result = await service.updateUserProgress(activityId, userId, progressData)

      expect(result.invitesSent).toBe(progressData.invitesSent)
      expect(result.registrationsAchieved).toBe(progressData.registrationsAchieved)
      expect(result.activationsAchieved).toBe(progressData.activationsAchieved)
      expect(result.currentScore).toBe(400)
    })
  })

  describe('getActivityLeaderboard', () => {
    it('应该成功获取活动排行榜', async () => {
      const activityId = 'activity-1'
      const pagination = { page: 1, limit: 10 }

      mockDb.query.mockResolvedValueOnce([{ count: 25 }]) // 总数查询

      mockDb.query.mockResolvedValueOnce([
        {
          activity_id: activityId,
          user_id: 'user-1',
          invites_sent: 10,
          registrations_achieved: 8,
          activations_achieved: 6,
          current_score: 980,
          current_rank: 1,
          updated_at: new Date(),
          user_name: '用户1',
          user_email: 'user1@example.com'
        },
        {
          activity_id: activityId,
          user_id: 'user-2',
          invites_sent: 8,
          registrations_achieved: 6,
          activations_achieved: 4,
          current_score: 780,
          current_rank: 2,
          updated_at: new Date(),
          user_name: '用户2',
          user_email: 'user2@example.com'
        }
      ])

      const result = await service.getActivityLeaderboard(activityId, pagination)

      expect(result.leaderboard).toHaveLength(2)
      expect(result.total).toBe(25)
      expect(result.leaderboard[0].rank).toBe(1)
      expect(result.leaderboard[0].currentScore).toBe(980)
      expect(result.leaderboard[1].rank).toBe(2)
      expect(result.leaderboard[1].currentScore).toBe(780)
    })
  })

  describe('completeActivity', () => {
    it('应该成功完成活动并生成结果', async () => {
      const activityId = 'activity-1'

      // 模拟获取活动详情
      mockDb.query.mockResolvedValueOnce([{
        id: activityId,
        status: 'active',
        rewards: JSON.stringify([
          {
            type: 'ai_credits',
            amount: 100,
            description: '冠军奖励',
            rankRange: { min: 1, max: 1 }
          }
        ]),
        target_metrics: '{}',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }])

      mockDb.query.mockResolvedValueOnce([
        {
          reward_type: 'ai_credits',
          reward_amount: 100,
          description: '冠军奖励',
          rank_min: 1,
          rank_max: 1
        }
      ])

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockConnection)
      })

      // 模拟最终排行榜
      mockConnection.query.mockResolvedValueOnce([
        {
          user_id: 'user-1',
          current_score: 1000,
          user_name: '用户1'
        },
        {
          user_id: 'user-2',
          current_score: 800,
          user_name: '用户2'
        }
      ])

      const results = await service.completeActivity(activityId)

      expect(results).toHaveLength(2)
      expect(results[0].rank).toBe(1)
      expect(results[0].isWinner).toBe(true)
      expect(results[1].rank).toBe(2)
      expect(results[1].isWinner).toBe(false)
      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE invitation_activities'),
        expect.arrayContaining(['completed', activityId])
      )
    })

    it('应该在活动已完成时抛出错误', async () => {
      const activityId = 'activity-1'

      mockDb.query.mockResolvedValueOnce([{
        id: activityId,
        status: 'completed',
        rewards: '[]',
        target_metrics: '{}',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }])

      mockDb.query.mockResolvedValueOnce([])

      await expect(service.completeActivity(activityId)).rejects.toThrow('活动已完成')
    })
  })

  describe('getActivityStatistics', () => {
    it('应该成功获取活动统计数据', async () => {
      const activityId = 'activity-1'

      mockDb.query.mockResolvedValueOnce([{
        total_participants: 50,
        active_participants: 45,
        total_invites: 500,
        total_registrations: 300,
        total_activations: 200,
        average_score: 450,
        top_score: 1200
      }])

      const stats = await service.getActivityStatistics(activityId)

      expect(stats.totalParticipants).toBe(50)
      expect(stats.activeParticipants).toBe(45)
      expect(stats.totalInvites).toBe(500)
      expect(stats.totalRegistrations).toBe(300)
      expect(stats.totalActivations).toBe(200)
      expect(stats.averageScore).toBe(450)
      expect(stats.topScore).toBe(1200)
    })
  })
})