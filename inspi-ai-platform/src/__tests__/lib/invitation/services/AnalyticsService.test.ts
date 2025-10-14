/**
 * AnalyticsService 单元测试
 */

import { DatabaseService } from '../../../../lib/invitation/database';
import { AnalyticsService } from '../../../../lib/invitation/services/AnalyticsService';
import { InviteEventType, TimePeriod } from '../../../../lib/invitation/types';

// Mock DatabaseService
const mockDb = {
  query: jest.fn(),
  queryOne: jest.fn(),
  execute: jest.fn(),
} as jest.Mocked<DatabaseService>;

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  const mockUserId = 'user-123';
  const mockPeriod: TimePeriod = {
    start: new Date('2024-01-01'),
    end: new Date('2024-01-31'),
  };

  beforeEach(() => {
    service = new AnalyticsService(mockDb);
    jest.clearAllMocks();
  });

  describe('trackInviteEvent', () => {
    it('should track invite event successfully', async () => {
      mockDb.execute.mockResolvedValue({ affectedRows: 1 });

      const event = {
        type: InviteEventType.CODE_GENERATED,
        inviterId: mockUserId,
        inviteCodeId: 'invite-123',
        timestamp: new Date(),
        metadata: { source: 'web' },
      };

      await service.trackInviteEvent(event);

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO invite_events'),
        [
          event.type,
          event.inviterId,
          null,
          event.inviteCodeId,
          event.timestamp,
          '{"source":"web"}',
        ],
      );
    });

    it('should handle event without metadata', async () => {
      mockDb.execute.mockResolvedValue({ affectedRows: 1 });

      const event = {
        type: InviteEventType.USER_REGISTERED,
        inviterId: mockUserId,
        inviteeId: 'invitee-123',
        inviteCodeId: 'invite-123',
        timestamp: new Date(),
      };

      await service.trackInviteEvent(event);

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO invite_events'),
        [
          event.type,
          event.inviterId,
          event.inviteeId,
          event.inviteCodeId,
          event.timestamp,
          null,
        ],
      );
    });

    it('should handle database error', async () => {
      mockDb.execute.mockRejectedValue(new Error('Database error'));

      const event = {
        type: InviteEventType.CODE_GENERATED,
        inviterId: mockUserId,
        inviteCodeId: 'invite-123',
        timestamp: new Date(),
      };

      await expect(service.trackInviteEvent(event)).rejects.toThrow('Failed to track invite event');
    });
  });

  describe('getUserInviteStats', () => {
    it('should return existing user stats', async () => {
      const mockStats = {
        user_id: mockUserId,
        total_invites: 10,
        successful_registrations: 5,
        active_invitees: 3,
        total_rewards_earned: 150,
        last_updated: new Date(),
      };

      mockDb.queryOne.mockResolvedValue(mockStats);

      const result = await service.getUserInviteStats(mockUserId);

      expect(result).toEqual({
        userId: mockUserId,
        totalInvites: 10,
        successfulRegistrations: 5,
        activeInvitees: 3,
        totalRewardsEarned: 150,
        lastUpdated: mockStats.last_updated,
      });
    });

    it('should update stats if not found and return default', async () => {
      mockDb.queryOne
        .mockResolvedValueOnce(null) // First call returns null
        .mockResolvedValueOnce(null); // Second call after update also returns null

      mockDb.execute.mockResolvedValue({ affectedRows: 1 });

      const result = await service.getUserInviteStats(mockUserId);

      expect(result).toEqual({
        userId: mockUserId,
        totalInvites: 0,
        successfulRegistrations: 0,
        activeInvitees: 0,
        totalRewardsEarned: 0,
        lastUpdated: expect.any(Date),
      });

      expect(mockDb.execute).toHaveBeenCalled(); // updateUserStats was called
    });
  });

  describe('getInviteHistory', () => {
    it('should return invite history correctly', async () => {
      const mockHistory = [
        {
          id: 'reg-1',
          invite_code: 'CODE123',
          invitee_email: 'test@example.com',
          invitee_name: 'Test User',
          registered_at: '2024-01-15 10:00:00',
          is_activated: 1,
          activated_at: '2024-01-15 11:00:00',
          rewards_claimed: 1,
        },
        {
          id: 'reg-2',
          invite_code: 'CODE456',
          invitee_email: 'test2@example.com',
          invitee_name: 'Test User 2',
          registered_at: '2024-01-10 14:00:00',
          is_activated: 0,
          activated_at: null,
          rewards_claimed: 0,
        },
      ];

      mockDb.query.mockResolvedValue(mockHistory);

      const result = await service.getInviteHistory(mockUserId, 10);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'reg-1',
        inviteCode: 'CODE123',
        inviteeEmail: 'test@example.com',
        inviteeName: 'Test User',
        registeredAt: new Date('2024-01-15 10:00:00'),
        isActivated: true,
        activatedAt: new Date('2024-01-15 11:00:00'),
        rewardsClaimed: true,
      });

      expect(result[1]).toEqual({
        id: 'reg-2',
        inviteCode: 'CODE456',
        inviteeEmail: 'test2@example.com',
        inviteeName: 'Test User 2',
        registeredAt: new Date('2024-01-10 14:00:00'),
        isActivated: false,
        activatedAt: undefined,
        rewardsClaimed: false,
      });
    });

    it('should use default limit when not specified', async () => {
      mockDb.query.mockResolvedValue([]);

      await service.getInviteHistory(mockUserId);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.any(String),
        [mockUserId, 50],
      );
    });
  });

  describe('getInviteLeaderboard', () => {
    it('should return leaderboard correctly', async () => {
      const mockLeaderboard = [
        {
          user_id: 'user-1',
          user_name: 'Top User',
          invite_count: '15',
          total_credits: '300',
          badge_count: '2',
          title_count: '1',
        },
        {
          user_id: 'user-2',
          user_name: 'Second User',
          invite_count: '10',
          total_credits: '200',
          badge_count: '1',
          title_count: '0',
        },
      ];

      mockDb.query.mockResolvedValue(mockLeaderboard);

      const result = await service.getInviteLeaderboard(mockPeriod, 10);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        userId: 'user-1',
        userName: 'Top User',
        inviteCount: 15,
        rank: 1,
        rewards: {
          totalCredits: 300,
          badges: [],
          titles: [],
          premiumDays: 0,
        },
      });

      expect(result[1]).toEqual({
        userId: 'user-2',
        userName: 'Second User',
        inviteCount: 10,
        rank: 2,
        rewards: {
          totalCredits: 200,
          badges: [],
          titles: [],
          premiumDays: 0,
        },
      });
    });

    it('should use default limit when not specified', async () => {
      mockDb.query.mockResolvedValue([]);

      await service.getInviteLeaderboard(mockPeriod);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.any(String),
        [mockPeriod.start, mockPeriod.end, mockPeriod.start, mockPeriod.end, 10],
      );
    });
  });

  describe('getRealTimeStats', () => {
    it('should return real-time statistics', async () => {
      const mockStats = [
        { count: '100' }, // total invites
        { count: '15' },  // today invites
        { count: '60' },  // total registrations
        { count: '8' },    // today registrations
      ];

      mockDb.query
        .mockResolvedValueOnce([mockStats[0]])
        .mockResolvedValueOnce([mockStats[1]])
        .mockResolvedValueOnce([mockStats[2]])
        .mockResolvedValueOnce([mockStats[3]]);

      const result = await service.getRealTimeStats();

      expect(result).toEqual({
        totalInvites: 100,
        todayInvites: 15,
        totalRegistrations: 60,
        todayRegistrations: 8,
        conversionRate: 60, // 60/100 * 100
      });
    });

    it('should handle zero invites', async () => {
      const mockStats = [
        { count: '0' }, // total invites
        { count: '0' }, // today invites
        { count: '0' }, // total registrations
        { count: '0' },  // today registrations
      ];

      mockDb.query
        .mockResolvedValueOnce([mockStats[0]])
        .mockResolvedValueOnce([mockStats[1]])
        .mockResolvedValueOnce([mockStats[2]])
        .mockResolvedValueOnce([mockStats[3]]);

      const result = await service.getRealTimeStats();

      expect(result.conversionRate).toBe(0);
    });
  });

  describe('getTrendData', () => {
    it('should return trend data for specified period', async () => {
      const mockTrendData = [
        {
          date: '2024-01-01',
          invites: '5',
          registrations: '2',
          rewards: '1',
        },
        {
          date: '2024-01-02',
          invites: '3',
          registrations: '1',
          rewards: '0',
        },
      ];

      mockDb.query.mockResolvedValue(mockTrendData);

      const result = await service.getTrendData(mockUserId, 7);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        date: '2024-01-01',
        invites: 5,
        registrations: 2,
        rewards: 1,
      });

      expect(result[1]).toEqual({
        date: '2024-01-02',
        invites: 3,
        registrations: 1,
        rewards: 0,
      });
    });

    it('should use default days when not specified', async () => {
      mockDb.query.mockResolvedValue([]);

      await service.getTrendData(mockUserId);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([expect.any(Date), 30, mockUserId]),
      );
    });
  });

  describe('updateUserStats', () => {
    it('should update user statistics successfully', async () => {
      mockDb.execute.mockResolvedValue({ affectedRows: 1 });

      await service.updateUserStats(mockUserId);

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO invite_stats'),
        [mockUserId, mockUserId, mockUserId],
      );
    });

    it('should handle database error', async () => {
      mockDb.execute.mockRejectedValue(new Error('Database error'));

      await expect(service.updateUserStats(mockUserId)).rejects.toThrow('Failed to update user stats');
    });
  });

  describe('getConversionStats', () => {
    it('should return conversion statistics by date', async () => {
      const mockConversionData = [
        {
          date: '2024-01-01',
          invites: '10',
          registrations: '3',
          activations: '2',
        },
        {
          date: '2024-01-02',
          invites: '8',
          registrations: '4',
          activations: '3',
        },
      ];

      mockDb.query.mockResolvedValue(mockConversionData);

      const result = await service.getConversionStats(mockPeriod);

      expect(result).toEqual({
        '2024-01-01_invites': 10,
        '2024-01-01_registrations': 3,
        '2024-01-01_activations': 2,
        '2024-01-01_conversion_rate': 30, // 3/10 * 100
        '2024-01-01_activation_rate': 66.66666666666667, // 2/3 * 100
        '2024-01-02_invites': 8,
        '2024-01-02_registrations': 4,
        '2024-01-02_activations': 3,
        '2024-01-02_conversion_rate': 50, // 4/8 * 100
        '2024-01-02_activation_rate': 75, // 3/4 * 100
      });
    });

    it('should handle zero values correctly', async () => {
      const mockConversionData = [
        {
          date: '2024-01-01',
          invites: '0',
          registrations: '0',
          activations: '0',
        },
      ];

      mockDb.query.mockResolvedValue(mockConversionData);

      const result = await service.getConversionStats(mockPeriod);

      expect(result['2024-01-01_conversion_rate']).toBe(0);
      expect(result['2024-01-01_activation_rate']).toBe(0);
    });
  });

  describe('generateInviteReport', () => {
    it('should generate complete invite report', async () => {
      // Mock getUserInviteStats
      const mockStats = {
        userId: mockUserId,
        totalInvites: 10,
        successfulRegistrations: 5,
        activeInvitees: 3,
        totalRewardsEarned: 150,
        lastUpdated: new Date(),
      };

      // Mock getInviteHistory
      const mockHistory = [
        {
          id: 'reg-1',
          inviteCode: 'CODE123',
          inviteeEmail: 'test@example.com',
          inviteeName: 'Test User',
          registeredAt: new Date(),
          isActivated: true,
          activatedAt: new Date(),
          rewardsClaimed: true,
        },
      ];

      // Mock getUserRewardsSummary
      const mockRewardsSummary = {
        totalCredits: 150,
        badges: ['badge1'],
        titles: ['title1'],
        premiumDays: 0,
      };

      // Setup mocks for getUserInviteStats
      mockDb.queryOne.mockResolvedValueOnce({
        user_id: mockUserId,
        total_invites: 10,
        successful_registrations: 5,
        active_invitees: 3,
        total_rewards_earned: 150,
        last_updated: new Date(),
      });

      // Setup mocks for getInviteHistory
      mockDb.query.mockResolvedValueOnce([
        {
          id: 'reg-1',
          invite_code: 'CODE123',
          invitee_email: 'test@example.com',
          invitee_name: 'Test User',
          registered_at: new Date(),
          is_activated: 1,
          activated_at: new Date(),
          rewards_claimed: 1,
        },
      ]);

      // Setup mocks for getUserRewardsSummary
      mockDb.query.mockResolvedValueOnce([
        {
          type: 'ai_credits',
          total_credits: '150',
          badges: null,
          titles: null,
          premium_days: '0',
        },
      ]);

      const result = await service.generateInviteReport(mockUserId, mockPeriod);

      expect(result).toEqual({
        userId: mockUserId,
        period: mockPeriod,
        stats: mockStats,
        topInvitees: expect.any(Array),
        rewardsSummary: expect.objectContaining({
          totalCredits: 150,
        }),
      });
    });
  });
});
