/**
 * 奖励引擎测试
 */

import { RewardEngineImpl } from '../../../../lib/invitation/services/RewardEngine'
import { InviteEventType, RewardType } from '../../../../lib/invitation/types'
import { DatabaseFactory } from '../../../../lib/invitation/database'

// Mock数据库
jest.mock('../../../../lib/invitation/database')
jest.mock('../../../../lib/utils/logger')

describe('RewardEngine', () => {
  let engine: RewardEngineImpl
  let mockDb: any

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
      execute: jest.fn(),
      transaction: jest.fn()
    }
    
    ;(DatabaseFactory.getInstance as jest.Mock).mockReturnValue(mockDb)
    engine = new RewardEngineImpl()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('calculateInviteReward', () => {
    it('should calculate registration rewards', async () => {
      const event = {
        type: InviteEventType.USER_REGISTERED,
        inviterId: 'user-123',
        inviteeId: 'user-456',
        inviteCodeId: 'invite-123',
        timestamp: new Date()
      }

      // Mock reward config query
      mockDb.query.mockResolvedValueOnce([
        {
          id: 'config-1',
          event_type: 'user_registration',
          reward_type: RewardType.AI_CREDITS,
          amount: 10,
          description: '邀请用户注册奖励',
          conditions: null,
          is_active: true
        }
      ])

      // Mock milestone check
      mockDb.query.mockResolvedValueOnce([
        { successful_registrations: 4, active_invitees: 2 }
      ])

      const rewards = await engine.calculateInviteReward(event)

      expect(rewards).toHaveLength(1)
      expect(rewards[0]).toMatchObject({
        type: RewardType.AI_CREDITS,
        amount: 10,
        description: '邀请用户注册奖励'
      })
    })

    it('should calculate activation rewards', async () => {
      const event = {
        type: InviteEventType.USER_ACTIVATED,
        inviterId: 'user-123',
        inviteeId: 'user-456',
        inviteCodeId: 'invite-123',
        timestamp: new Date()
      }

      // Mock reward config query
      mockDb.query.mockResolvedValueOnce([
        {
          id: 'config-2',
          event_type: 'user_activation',
          reward_type: RewardType.AI_CREDITS,
          amount: 5,
          description: '邀请用户激活奖励',
          conditions: null,
          is_active: true
        }
      ])

      // Mock milestone check
      mockDb.query.mockResolvedValueOnce([
        { successful_registrations: 2, active_invitees: 1 }
      ])

      const rewards = await engine.calculateInviteReward(event)

      expect(rewards).toHaveLength(1)
      expect(rewards[0]).toMatchObject({
        type: RewardType.AI_CREDITS,
        amount: 5,
        description: '邀请用户激活奖励'
      })
    })

    it('should include milestone rewards', async () => {
      const event = {
        type: InviteEventType.USER_REGISTERED,
        inviterId: 'user-123',
        inviteeId: 'user-456',
        inviteCodeId: 'invite-123',
        timestamp: new Date()
      }

      // Mock reward config query
      mockDb.query.mockResolvedValueOnce([])

      // Mock milestone check - user reaches 5 registrations milestone
      mockDb.query
        .mockResolvedValueOnce([{ successful_registrations: 5, active_invitees: 3 }])
        .mockResolvedValueOnce([]) // No existing milestone reward

      mockDb.execute.mockResolvedValueOnce({ affectedRows: 1 }) // Record milestone

      const rewards = await engine.calculateInviteReward(event)

      expect(rewards).toHaveLength(1)
      expect(rewards[0]).toMatchObject({
        type: RewardType.AI_CREDITS,
        amount: 10, // 5 * 2
        description: '邀请5人注册里程碑奖励'
      })
    })
  })

  describe('grantReward', () => {
    it('should grant AI credits reward successfully', async () => {
      const userId = 'user-123'
      const reward = {
        type: RewardType.AI_CREDITS,
        amount: 10,
        description: '邀请奖励'
      }

      mockDb.execute.mockResolvedValueOnce({ affectedRows: 1 })

      const result = await engine.grantReward(userId, reward)

      expect(result.success).toBe(true)
      expect(result.rewardId).toBeDefined()
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO reward_records'),
        expect.arrayContaining([
          expect.any(String), // rewardId
          userId,
          RewardType.AI_CREDITS,
          10,
          null, // badge_id
          null, // title_id
          '邀请奖励',
          expect.any(Date), // granted_at
          null, // expires_at
          'invite_registration',
          expect.any(String) // source_id
        ])
      )
    })

    it('should grant badge reward successfully', async () => {
      const userId = 'user-123'
      const reward = {
        type: RewardType.BADGE,
        badgeId: 'super_inviter',
        description: '超级邀请者徽章'
      }

      mockDb.execute.mockResolvedValueOnce({ affectedRows: 1 })

      const result = await engine.grantReward(userId, reward)

      expect(result.success).toBe(true)
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO reward_records'),
        expect.arrayContaining([
          expect.any(String),
          userId,
          RewardType.BADGE,
          null, // amount
          'super_inviter',
          null, // title_id
          '超级邀请者徽章',
          expect.any(Date),
          null,
          'invite_registration',
          expect.any(String)
        ])
      )
    })

    it('should handle grant reward error', async () => {
      const userId = 'user-123'
      const reward = {
        type: RewardType.AI_CREDITS,
        amount: 10,
        description: '邀请奖励'
      }

      mockDb.execute.mockRejectedValueOnce(new Error('Database error'))

      const result = await engine.grantReward(userId, reward)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Database error')
    })
  })

  describe('getRewardConfig', () => {
    it('should return existing reward config', async () => {
      const eventType = 'user_registration'
      
      mockDb.query.mockResolvedValueOnce([
        {
          id: 'config-1',
          event_type: eventType,
          reward_type: RewardType.AI_CREDITS,
          amount: 10,
          badge_id: null,
          title_id: null,
          description: '注册奖励',
          conditions: '{"minAge": 18}',
          is_active: true
        }
      ])

      const config = await engine.getRewardConfig(eventType)

      expect(config).toMatchObject({
        eventType,
        rewards: [{
          type: RewardType.AI_CREDITS,
          amount: 10,
          description: '注册奖励'
        }],
        conditions: { minAge: 18 },
        isActive: true
      })
    })

    it('should return default config when no config exists', async () => {
      const eventType = 'user_registration'
      
      mockDb.query.mockResolvedValueOnce([])

      const config = await engine.getRewardConfig(eventType)

      expect(config).toMatchObject({
        eventType,
        rewards: [{
          type: RewardType.AI_CREDITS,
          amount: 10,
          description: '邀请用户注册奖励'
        }],
        isActive: true
      })
    })
  })

  describe('updateRewardConfig', () => {
    it('should update reward config successfully', async () => {
      const config = {
        eventType: 'user_registration',
        rewards: [
          {
            type: RewardType.AI_CREDITS,
            amount: 15,
            description: '更新的注册奖励'
          }
        ],
        isActive: true
      }

      const mockConnection = {
        execute: jest.fn()
      }

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockConnection)
      })

      mockConnection.execute
        .mockResolvedValueOnce({ affectedRows: 1 }) // DELETE
        .mockResolvedValueOnce({ affectedRows: 1 }) // INSERT

      await engine.updateRewardConfig(config)

      expect(mockConnection.execute).toHaveBeenCalledTimes(2)
      expect(mockConnection.execute).toHaveBeenNthCalledWith(1,
        'DELETE FROM reward_configs WHERE event_type = ?',
        ['user_registration']
      )
      expect(mockConnection.execute).toHaveBeenNthCalledWith(2,
        expect.stringContaining('INSERT INTO reward_configs'),
        expect.arrayContaining([
          expect.any(String), // id
          'user_registration',
          RewardType.AI_CREDITS,
          15,
          null, // badge_id
          null, // title_id
          '更新的注册奖励',
          null, // conditions
          true // is_active
        ])
      )
    })
  })

  describe('getUserRewards', () => {
    it('should return user rewards', async () => {
      const userId = 'user-123'
      
      mockDb.query.mockResolvedValueOnce([
        {
          id: 'reward-1',
          user_id: userId,
          reward_type: RewardType.AI_CREDITS,
          amount: 10,
          badge_id: null,
          title_id: null,
          description: '邀请奖励',
          granted_at: new Date(),
          expires_at: null,
          source_type: 'invite_registration',
          source_id: 'source-1'
        },
        {
          id: 'reward-2',
          user_id: userId,
          reward_type: RewardType.BADGE,
          amount: null,
          badge_id: 'super_inviter',
          title_id: null,
          description: '超级邀请者',
          granted_at: new Date(),
          expires_at: null,
          source_type: 'milestone',
          source_id: 'source-2'
        }
      ])

      const rewards = await engine.getUserRewards(userId)

      expect(rewards).toHaveLength(2)
      expect(rewards[0]).toMatchObject({
        type: RewardType.AI_CREDITS,
        amount: 10,
        description: '邀请奖励'
      })
      expect(rewards[1]).toMatchObject({
        type: RewardType.BADGE,
        badgeId: 'super_inviter',
        description: '超级邀请者'
      })
    })
  })

  describe('calculateUserCredits', () => {
    it('should calculate total user credits', async () => {
      const userId = 'user-123'
      
      mockDb.query.mockResolvedValueOnce([{ total: 50 }])

      const credits = await engine.calculateUserCredits(userId)

      expect(credits).toBe(50)
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COALESCE(SUM(amount), 0) as total'),
        [userId, RewardType.AI_CREDITS]
      )
    })

    it('should return 0 when no credits found', async () => {
      const userId = 'user-123'
      
      mockDb.query.mockResolvedValueOnce([{ total: 0 }])

      const credits = await engine.calculateUserCredits(userId)

      expect(credits).toBe(0)
    })
  })

  describe('checkMilestones', () => {
    it('should return registration milestone rewards', async () => {
      const userId = 'user-123'
      
      // Mock user stats - user has 5 registrations (milestone)
      mockDb.query
        .mockResolvedValueOnce([{ successful_registrations: 5, active_invitees: 2 }])
        .mockResolvedValueOnce([]) // No existing milestone reward

      mockDb.execute.mockResolvedValueOnce({ affectedRows: 1 })

      const rewards = await engine.checkMilestones(userId)

      expect(rewards).toHaveLength(1)
      expect(rewards[0]).toMatchObject({
        type: RewardType.AI_CREDITS,
        amount: 10, // 5 * 2
        description: '邀请5人注册里程碑奖励'
      })
    })

    it('should return activation milestone rewards', async () => {
      const userId = 'user-123'
      
      // Mock user stats - user has 3 active invitees (milestone)
      mockDb.query
        .mockResolvedValueOnce([{ successful_registrations: 2, active_invitees: 3 }])
        .mockResolvedValueOnce([]) // No existing registration milestone
        .mockResolvedValueOnce([]) // No existing activation milestone

      mockDb.execute.mockResolvedValueOnce({ affectedRows: 1 })

      const rewards = await engine.checkMilestones(userId)

      expect(rewards).toHaveLength(1)
      expect(rewards[0]).toMatchObject({
        type: RewardType.BADGE,
        badgeId: 'active_inviter_3',
        description: '激活3人里程碑徽章'
      })
    })

    it('should return special title for super inviter', async () => {
      const userId = 'user-123'
      
      // Mock user stats - user qualifies for super inviter title
      mockDb.query
        .mockResolvedValueOnce([{ successful_registrations: 50, active_invitees: 40 }])
        .mockResolvedValueOnce([{ id: 'existing' }]) // Has registration milestone
        .mockResolvedValueOnce([{ id: 'existing' }]) // Has activation milestone
        .mockResolvedValueOnce([]) // No existing title

      mockDb.execute.mockResolvedValueOnce({ affectedRows: 1 })

      const rewards = await engine.checkMilestones(userId)

      expect(rewards).toHaveLength(1)
      expect(rewards[0]).toMatchObject({
        type: RewardType.TITLE,
        titleId: 'super_inviter',
        description: '超级邀请达人称号'
      })
    })

    it('should return empty array when no milestones reached', async () => {
      const userId = 'user-123'
      
      mockDb.query.mockResolvedValueOnce([{ successful_registrations: 2, active_invitees: 1 }])

      const rewards = await engine.checkMilestones(userId)

      expect(rewards).toHaveLength(0)
    })
  })

  describe('batchGrantRewards', () => {
    it('should grant multiple rewards successfully', async () => {
      const rewards = [
        {
          userId: 'user-1',
          reward: {
            type: RewardType.AI_CREDITS,
            amount: 10,
            description: '奖励1'
          }
        },
        {
          userId: 'user-2',
          reward: {
            type: RewardType.AI_CREDITS,
            amount: 5,
            description: '奖励2'
          }
        }
      ]

      mockDb.execute.mockResolvedValue({ affectedRows: 1 })

      const results = await engine.batchGrantRewards(rewards)

      expect(results).toHaveLength(2)
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(true)
      expect(mockDb.execute).toHaveBeenCalledTimes(2)
    })

    it('should handle partial failures in batch', async () => {
      const rewards = [
        {
          userId: 'user-1',
          reward: {
            type: RewardType.AI_CREDITS,
            amount: 10,
            description: '奖励1'
          }
        },
        {
          userId: 'user-2',
          reward: {
            type: RewardType.AI_CREDITS,
            amount: 5,
            description: '奖励2'
          }
        }
      ]

      mockDb.execute
        .mockResolvedValueOnce({ affectedRows: 1 }) // First success
        .mockRejectedValueOnce(new Error('Database error')) // Second fails

      const results = await engine.batchGrantRewards(rewards)

      expect(results).toHaveLength(2)
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(false)
      expect(results[1].error).toBe('Database error')
    })
  })

  describe('getRewardStats', () => {
    it('should return reward statistics', async () => {
      const userId = 'user-123'
      
      mockDb.query
        .mockResolvedValueOnce([{ total: 100 }]) // total credits
        .mockResolvedValueOnce([{ count: 3 }])   // total badges
        .mockResolvedValueOnce([{ count: 1 }])   // total titles
        .mockResolvedValueOnce([               // recent rewards
          {
            id: 'reward-1',
            user_id: userId,
            reward_type: RewardType.AI_CREDITS,
            amount: 10,
            badge_id: null,
            title_id: null,
            description: '最近奖励',
            granted_at: new Date(),
            expires_at: null,
            source_type: 'invite_registration',
            source_id: 'source-1'
          }
        ])

      const stats = await engine.getRewardStats(userId)

      expect(stats).toEqual({
        totalCredits: 100,
        totalBadges: 3,
        totalTitles: 1,
        recentRewards: expect.arrayContaining([
          expect.objectContaining({
            id: 'reward-1',
            userId,
            reward: expect.objectContaining({
              type: RewardType.AI_CREDITS,
              amount: 10,
              description: '最近奖励'
            })
          })
        ])
      })
    })
  })
})