/**
 * LeaderboardService 单元测试
 */

import { DatabaseService } from '../../../../lib/invitation/database';
import { LeaderboardServiceImpl } from '../../../../lib/invitation/services/LeaderboardService';
import { TimePeriod } from '../../../../lib/invitation/types';

// Mock DatabaseService
const mockDb = {
  query: jest.fn(),
  queryOne: jest.fn(),
  execute: jest.fn(),
} as jest.Mocked<DatabaseService>;

describe('LeaderboardService', () => {
  let service: LeaderboardServiceImpl;
  const mockPeriod: TimePeriod = {
    start: new Date('2024-01-01'),
    end: new Date('2024-01-31'),
  };

  beforeEach(() => {
    service = new LeaderboardServiceImpl(mockDb);
    jest.clearAllMocks();
  });

  describe('getInviteLeaderboard', () => {
    it('should return leaderboard correctly', async () => {
      const mockResults = [
        {
          user_id: 'user-1',
          user_name: 'Top User',
          user_email: 'top@example.com',
          invite_count: '15',
          active_invite_count: '12',
          total_credits: '300',
          badge_count: '2',
          title_count: '1',
          last_invite_date: '2024-01-15',
        },
        {
          user_id: 'user-2',
          user_name: 'Second User',
          user_email: 'second@example.com',
          invite_count: '10',
          active_invite_count: '8',
          total_credits: '200',
          badge_count: '1',
          title_count: '0',
          last_invite_date: '2024-01-10',
        },
      ];

      mockDb.query.mockResolvedValue(mockResults);

      const result = await service.getInviteLeaderboard({ period: mockPeriod }, 10);

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

    it('should apply period filter correctly', async () => {
      mockDb.query.mockResolvedValue([]);

      await service.getInviteLeaderboard({ period: mockPeriod }, 10);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('ir.registered_at BETWEEN ? AND ?'),
        expect.arrayContaining([mockPeriod.start, mockPeriod.end]),
      );
    });

    it('should apply minimum invites filter', async () => {
      mockDb.query.mkResolvedValue([]);

      await service.getInviteLeaderboard({
        period: mockPeriod,
        minInvites: 5,
      }, 10);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(DISTINCT ir.id) >= 5'),
        expect.any(Array),
      );
    });

    it('should sort by different categories', async () => {
      mockDb.query.mockResolvedValue([]);

      // Test rewards category
      await service.getInviteLeaderboard({
        period: mockPeriod,
        category: 'rewards',
      }, 10);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY total_credits DESC'),
        expect.any(Array),
      );

      // Test activations category
      await service.getInviteLeaderboard({
        period: mockPeriod,
        category: 'activations',
      }, 10);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY active_invite_count DESC'),
        expect.any(Array),
      );
    });
  });

  describe('getMonthlyLeaderboard', () => {
    it('should generate correct date range for monthly leaderboard', async () => {
      mockDb.query.mockResolvedValue([]);

      await service.getMonthlyLeaderboard(2024, 1, 20);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          new Date(2024, 0, 1), // January 1st
          expect.any(Date), // End of January
        ]),
      );
    });
  });

  describe('getRealTimeLeaderboard', () => {
    it('should get leaderboard for last 7 days', async () => {
      mockDb.query.mockResolvedValue([]);

      await service.getRealTimeLeaderboard(15);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          expect.any(Date), // 7 days ago
          expect.any(Date), // now
          15,
        ]),
      );
    });
  });

  describe('getUserRank', () => {
    it('should return user rank correctly', async () => {
      const mockRankResult = {
        rank: '5',
        total_users: '100',
        invite_count: '8',
      };

      mockDb.queryOne.mockResolvedValue(mockRankResult);

      const result = await service.getUserRank('user-123', { period: mockPeriod });

      expect(result).toEqual({
        rank: 5,
        totalUsers: 100,
        percentile: 96, // (100 - 5 + 1) / 100 * 100
      });
    });

    it('should return zero values when user not found', async () => {
      mockDb.queryOne.mockResolvedValue(null);

      const result = await service.getUserRank('user-123', { period: mockPeriod });

      expect(result).toEqual({
        rank: 0,
        totalUsers: 0,
        percentile: 0,
      });
    });
  });

  describe('getLeaderboardChanges', () => {
    it('should calculate rank changes correctly', async () => {
      const previousPeriod: TimePeriod = {
        start: new Date('2023-12-01'),
        end: new Date('2023-12-31'),
      };

      const currentPeriod: TimePeriod = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      };

      // Mock previous leaderboard
      const previousLeaderboard = [
        { userId: 'user-1', userName: 'User 1', inviteCount: 10, rank: 1, rewards: { totalCredits: 0, badges: [], titles: [], premiumDays: 0 } },
        { userId: 'user-2', userName: 'User 2', inviteCount: 8, rank: 2, rewards: { totalCredits: 0, badges: [], titles: [], premiumDays: 0 } },
        { userId: 'user-3', userName: 'User 3', inviteCount: 6, rank: 3, rewards: { totalCredits: 0, badges: [], titles: [], premiumDays: 0 } },
      ];

      // Mock current leaderboard (user-2 moved up, user-3 moved down, user-4 is new)
      const currentLeaderboard = [
        { userId: 'user-2', userName: 'User 2', inviteCount: 15, rank: 1, rewards: { totalCredits: 0, badges: [], titles: [], premiumDays: 0 } },
        { userId: 'user-1', userName: 'User 1', inviteCount: 12, rank: 2, rewards: { totalCredits: 0, badges: [], titles: [], premiumDays: 0 } },
        { userId: 'user-4', userName: 'User 4', inviteCount: 10, rank: 3, rewards: { totalCredits: 0, badges: [], titles: [], premiumDays: 0 } },
        { userId: 'user-3', userName: 'User 3', inviteCount: 8, rank: 4, rewards: { totalCredits: 0, badges: [], titles: [], premiumDays: 0 } },
      ];

      // Mock the getInviteLeaderboard calls
      mockDb.query
        .mockResolvedValueOnce(previousLeaderboard.map(entry => ({
          user_id: entry.userId,
          user_name: entry.userName,
          invite_count: entry.inviteCount.toString(),
          total_credits: '0',
        })))
        .mockResolvedValueOnce(currentLeaderboard.map(entry => ({
          user_id: entry.userId,
          user_name: entry.userName,
          invite_count: entry.inviteCount.toString(),
          total_credits: '0',
        })));

      const result = await service.getLeaderboardChanges(previousPeriod, currentPeriod);

      expect(result).toHaveLength(4);

      // User 2: moved from rank 2 to rank 1 (up)
      expect(result[0]).toEqual({
        userId: 'user-2',
        userName: 'User 2',
        previousRank: 2,
        currentRank: 1,
        rankChange: 1,
        trend: 'up',
      });

      // User 1: moved from rank 1 to rank 2 (down)
      expect(result[1]).toEqual({
        userId: 'user-1',
        userName: 'User 1',
        previousRank: 1,
        currentRank: 2,
        rankChange: -1,
        trend: 'down',
      });

      // User 4: new entry
      expect(result[2]).toEqual({
        userId: 'user-4',
        userName: 'User 4',
        previousRank: 0,
        currentRank: 3,
        rankChange: 0,
        trend: 'new',
      });

      // User 3: moved from rank 3 to rank 4 (down)
      expect(result[3]).toEqual({
        userId: 'user-3',
        userName: 'User 3',
        previousRank: 3,
        currentRank: 4,
        rankChange: -1,
        trend: 'down',
      });
    });
  });

  describe('getLeaderboardStats', () => {
    it('should return leaderboard statistics', async () => {
      const mockStats = {
        total_participants: '150',
        average_invites: '7.5',
        top_performer_threshold: '15.0',
      };

      mockDb.queryOne.mockResolvedValue(mockStats);

      const result = await service.getLeaderboardStats();

      expect(result).toEqual({
        totalParticipants: 150,
        averageInvites: 7.5,
        topPerformerThreshold: 15.0,
        lastUpdated: expect.any(Date),
      });
    });

    it('should handle missing data gracefully', async () => {
      mockDb.queryOne.mockResolvedValue(null);

      const result = await service.getLeaderboardStats();

      expect(result).toEqual({
        totalParticipants: 0,
        averageInvites: 0,
        topPerformerThreshold: 0,
        lastUpdated: expect.any(Date),
      });
    });
  });

  describe('updateLeaderboardCache', () => {
    it('should update cache successfully', async () => {
      mockDb.query.mockResolvedValue([]);

      await service.updateLeaderboardCache({ period: mockPeriod });

      // Should call getInviteLeaderboard to regenerate cache
      expect(mockDb.query).toHaveBeenCalled();
    });
  });
});
