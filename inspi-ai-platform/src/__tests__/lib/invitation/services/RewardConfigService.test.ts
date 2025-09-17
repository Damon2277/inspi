/**
 * 奖励配置服务测试
 */

import { RewardConfigServiceImpl } from '@/lib/invitation/services/RewardConfigService'
import { DatabaseService } from '@/lib/invitation/database'
import { RewardType, InviteEventType } from '@/lib/invitation/types'

// Mock database service
jest.mock('@/lib/invitation/database')
jest.mock('@/lib/utils/logger')

describe('RewardConfigService', () => {
  let service: RewardConfigServiceImpl
  let mockDb: jest.Mocked<DatabaseService>

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
      transaction: jest.fn()
    } as any

    // Mock DatabaseFactory.getInstance()
    ;(require('@/lib/invitation/database').DatabaseFactory.getInstance as jest.Mock).mockReturnValue(mockDb)
    
    service = new RewardConfigServiceImpl()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('getRewardRules', () => {
    it('should return reward rules successfully', async () => {
      const mockRules = [
        {
          id: 'rule1',
          name: 'Test Rule',
          description: 'Test Description',
          event_type: 'user_registered',
          reward_type: 'ai_credits',
          reward_amount: 100,
          conditions: '{}',
          priority: 10,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        }
      ]

      mockDb.query.mockResolvedValue({ rows: mockRules })

      const result = await service.getRewardRules()

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Test Rule')
      expect(result[0].eventType).toBe('user_registered')
      expect(result[0].rewardType).toBe('ai_credits')
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM reward_rules')
      )
    })

    it('should handle database errors', async () => {
      mockDb.query.mockRejectedValue(new Error('Database error'))

      await expect(service.getRewardRules()).rejects.toThrow('Failed to get reward rules')
    })
  })

  describe('createRewardRule', () => {
    it('should create reward rule successfully', async () => {
      const newRule = {
        name: 'New Rule',
        description: 'New Description',
        eventType: 'user_registered' as InviteEventType,
        rewardType: 'ai_credits' as RewardType,
        rewardAmount: 50,
        conditions: {},
        priority: 5,
        isActive: true
      }

      const mockCreatedRule = {
        id: 'new-rule-id',
        ...newRule,
        event_type: newRule.eventType,
        reward_type: newRule.rewardType,
        reward_amount: newRule.rewardAmount,
        is_active: newRule.isActive,
        conditions: '{}',
        created_at: new Date(),
        updated_at: new Date()
      }

      mockDb.query.mockResolvedValue({ rows: [mockCreatedRule] })

      const result = await service.createRewardRule(newRule)

      expect(result.name).toBe('New Rule')
      expect(result.eventType).toBe('user_registered')
      expect(result.rewardAmount).toBe(50)
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO reward_rules'),
        expect.arrayContaining([
          expect.any(String), // id
          'New Rule',
          'New Description',
          'user_registered',
          'ai_credits',
          50,
          '{}',
          5,
          true,
          expect.any(Date),
          expect.any(Date)
        ])
      )
    })

    it('should handle creation errors', async () => {
      const newRule = {
        name: 'New Rule',
        description: 'New Description',
        eventType: 'user_registered' as InviteEventType,
        rewardType: 'ai_credits' as RewardType,
        rewardAmount: 50,
        conditions: {},
        priority: 5,
        isActive: true
      }

      mockDb.query.mockRejectedValue(new Error('Database error'))

      await expect(service.createRewardRule(newRule)).rejects.toThrow('Failed to create reward rule')
    })
  })

  describe('updateRewardRule', () => {
    it('should update reward rule successfully', async () => {
      const updates = {
        name: 'Updated Rule',
        rewardAmount: 75
      }

      const mockUpdatedRule = {
        id: 'rule1',
        name: 'Updated Rule',
        description: 'Test Description',
        event_type: 'user_registered',
        reward_type: 'ai_credits',
        reward_amount: 75,
        conditions: '{}',
        priority: 10,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }

      mockDb.query.mockResolvedValue({ rows: [mockUpdatedRule] })

      const result = await service.updateRewardRule('rule1', updates)

      expect(result.name).toBe('Updated Rule')
      expect(result.rewardAmount).toBe(75)
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE reward_rules'),
        expect.arrayContaining(['Updated Rule', 75, expect.any(Date), 'rule1'])
      )
    })

    it('should handle rule not found', async () => {
      mockDb.query.mockResolvedValue({ rows: [] })

      await expect(service.updateRewardRule('nonexistent', { name: 'Test' }))
        .rejects.toThrow('Failed to update reward rule')
    })
  })

  describe('deleteRewardRule', () => {
    it('should delete reward rule successfully', async () => {
      mockDb.query.mockResolvedValue({ rows: [] })

      await service.deleteRewardRule('rule1')

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE reward_rules'),
        [expect.any(Date), 'rule1']
      )
    })
  })

  describe('getRewardActivities', () => {
    it('should return reward activities successfully', async () => {
      const mockActivities = [
        {
          id: 'activity1',
          name: 'Test Activity',
          description: 'Test Description',
          start_date: new Date(),
          end_date: new Date(),
          reward_rules: '[]',
          target_metrics: '{}',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        }
      ]

      mockDb.query.mockResolvedValue({ rows: mockActivities })

      const result = await service.getRewardActivities()

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Test Activity')
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM reward_activities')
      )
    })
  })

  describe('getPendingApprovals', () => {
    it('should return pending approvals successfully', async () => {
      const mockApprovals = [
        {
          id: 'approval1',
          user_id: 'user1',
          user_name: 'Test User',
          user_email: 'test@example.com',
          reward_type: 'ai_credits',
          reward_amount: 100,
          description: 'Test reward',
          status: 'pending',
          admin_id: null,
          admin_notes: null,
          created_at: new Date(),
          approved_at: null,
          rejected_at: null,
          updated_at: new Date()
        }
      ]

      mockDb.query.mockResolvedValue({ rows: mockApprovals })

      const result = await service.getPendingApprovals()

      expect(result).toHaveLength(1)
      expect(result[0].userName).toBe('Test User')
      expect(result[0].status).toBe('pending')
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT ra.*, u.name as user_name')
      )
    })
  })

  describe('approveReward', () => {
    it('should approve reward successfully', async () => {
      const mockApproval = {
        id: 'approval1',
        user_id: 'user1',
        reward_type: 'ai_credits',
        reward_amount: 100,
        description: 'Test reward'
      }

      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        const mockClient = {
          query: jest.fn()
            .mockResolvedValueOnce({ rows: [mockApproval] }) // Update approval
            .mockResolvedValueOnce({ rows: [] }) // Insert reward record
        }
        return callback(mockClient)
      })

      mockDb.transaction = mockTransaction

      await service.approveReward('approval1', 'admin1', 'Approved')

      expect(mockTransaction).toHaveBeenCalled()
    })
  })

  describe('rejectReward', () => {
    it('should reject reward successfully', async () => {
      mockDb.query.mockResolvedValue({ rows: [] })

      await service.rejectReward('approval1', 'admin1', 'Invalid request')

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE reward_approvals'),
        ['admin1', 'Invalid request', expect.any(Date), expect.any(Date), 'approval1']
      )
    })
  })

  describe('getRewardStatistics', () => {
    it('should return reward statistics successfully', async () => {
      const mockStats = [
        {
          reward_type: 'ai_credits',
          count: '10',
          total_amount: '1000',
          avg_amount: '100'
        },
        {
          reward_type: 'badge',
          count: '5',
          total_amount: '5',
          avg_amount: '1'
        }
      ]

      mockDb.query.mockResolvedValue({ rows: mockStats })

      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-01-31')
      const result = await service.getRewardStatistics(startDate, endDate)

      expect(result.totalRewards).toBe(15)
      expect(result.totalAmount).toBe(1005)
      expect(result.byType['ai_credits'].count).toBe(10)
      expect(result.byType['badge'].count).toBe(5)
      expect(result.period.start).toBe(startDate)
      expect(result.period.end).toBe(endDate)
    })
  })

  describe('getRewardTrends', () => {
    it('should return reward trends successfully', async () => {
      const mockTrends = [
        {
          date: '2024-01-01',
          count: '5',
          amount: '500'
        },
        {
          date: '2024-01-02',
          count: '3',
          amount: '300'
        }
      ]

      mockDb.query.mockResolvedValue({ rows: mockTrends })

      const result = await service.getRewardTrends(30)

      expect(result).toHaveLength(2)
      expect(result[0].date).toBe('2024-01-01')
      expect(result[0].count).toBe(5)
      expect(result[0].amount).toBe(500)
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT')
      )
    })
  })

  describe('getTopRewardUsers', () => {
    it('should return top reward users successfully', async () => {
      const mockUsers = [
        {
          user_id: 'user1',
          user_name: 'User One',
          total_rewards: '1000'
        },
        {
          user_id: 'user2',
          user_name: 'User Two',
          total_rewards: '800'
        }
      ]

      mockDb.query.mockResolvedValue({ rows: mockUsers })

      const result = await service.getTopRewardUsers(10)

      expect(result).toHaveLength(2)
      expect(result[0].userId).toBe('user1')
      expect(result[0].userName).toBe('User One')
      expect(result[0].totalRewards).toBe(1000)
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [10]
      )
    })
  })
})