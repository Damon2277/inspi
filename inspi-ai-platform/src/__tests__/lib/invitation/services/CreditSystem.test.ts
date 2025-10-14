/**
 * 积分系统测试
 */

import { DatabaseFactory } from '../../../../lib/invitation/database';
import { CreditSystemServiceImpl, CreditType, CreditSource } from '../../../../lib/invitation/services/CreditSystem';

// Mock数据库
jest.mock('../../../../lib/invitation/database');
jest.mock('../../../../lib/utils/logger');

describe('CreditSystem', () => {
  let creditSystem: CreditSystemServiceImpl;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
      execute: jest.fn(),
      transaction: jest.fn(),
    }

    ;(DatabaseFactory.getInstance as jest.Mock).mockReturnValue(mockDb);
    creditSystem = new CreditSystemServiceImpl();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addCredits', () => {
    it('should add credits successfully', async () => {
      const userId = 'user-123';
      const amount = 10;
      const source = CreditSource.INVITE_REWARD;
      const sourceId = 'invite-456';
      const description = '邀请用户注册奖励';

      mockDb.execute
        .mockResolvedValueOnce({ affectedRows: 1 }) // Insert credit record
        .mockResolvedValueOnce({ affectedRows: 1 }); // Update balance cache

      // Mock balance update queries
      mockDb.query
        .mockResolvedValueOnce([]) // getUserBalance (cache miss)
        .mockResolvedValueOnce([{ available: 10 }]) // getAvailableCredits
        .mockResolvedValueOnce([]); // getExpiringCredits

      const result = await creditSystem.addCredits(userId, amount, source, sourceId, description);

      expect(result).toMatchObject({
        userId,
        amount,
        type: CreditType.EARNED,
        source,
        sourceId,
        description,
      });
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO credit_records'),
        expect.arrayContaining([
          expect.any(String), // id
          userId,
          amount,
          CreditType.EARNED,
          source,
          sourceId,
          description,
          expect.any(Date), // expires_at
          expect.any(Date),  // created_at
        ]),
      );
    });
  });

  describe('useCredits', () => {
    it('should use credits successfully', async () => {
      const userId = 'user-123';
      const amount = 5;
      const purpose = 'AI生成';

      const mockConnection = {
        query: jest.fn(),
        execute: jest.fn(),
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockConnection);
      });

      // Mock available credits check
      mockDb.query.mockResolvedValueOnce([{ available: 10 }]);

      // Mock earned credits to use
      mockConnection.query.mockResolvedValueOnce([
        {
          id: 'credit-1',
          amount: 10,
          source: CreditSource.INVITE_REWARD,
          source_id: 'invite-123',
        },
      ]);

      // Mock credit usage operations
      mockConnection.execute
        .mockResolvedValueOnce({ affectedRows: 1 }) // Insert usage record
        .mockResolvedValueOnce({ affectedRows: 1 }) // Update original credit
        .mockResolvedValueOnce({ affectedRows: 1 }); // Insert usage detail

      // Mock balance update
      mockDb.execute.mockResolvedValueOnce({ affectedRows: 1 });

      const result = await creditSystem.useCredits(userId, amount, purpose);

      expect(result).toBe(true);
      expect(mockConnection.execute).toHaveBeenCalledTimes(3);
    });

    it('should fail when insufficient credits', async () => {
      const userId = 'user-123';
      const amount = 15;
      const purpose = 'AI生成';

      const mockConnection = {
        query: jest.fn(),
        execute: jest.fn(),
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockConnection);
      });

      // Mock insufficient credits
      mockDb.query.mockResolvedValueOnce([{ available: 5 }]);

      const result = await creditSystem.useCredits(userId, amount, purpose);

      expect(result).toBe(false);
      expect(mockConnection.execute).not.toHaveBeenCalled();
    });
  });

  describe('getAvailableCredits', () => {
    it('should return available credits', async () => {
      const userId = 'user-123';

      mockDb.query.mockResolvedValueOnce([{ available: 25 }]);

      const result = await creditSystem.getAvailableCredits(userId);

      expect(result).toBe(25);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COALESCE(SUM(CASE'),
        [CreditType.EARNED, userId],
      );
    });

    it('should return 0 when no credits available', async () => {
      const userId = 'user-123';

      mockDb.query.mockResolvedValueOnce([{ available: 0 }]);

      const result = await creditSystem.getAvailableCredits(userId);

      expect(result).toBe(0);
    });
  });

  describe('getUserBalance', () => {
    it('should return cached balance when available', async () => {
      const userId = 'user-123';
      const mockBalance = {
        user_id: userId,
        total_earned: 50,
        total_used: 20,
        total_expired: 5,
        available_credits: 25,
        expiring_credits: 10,
        last_updated: new Date(),
      };

      mockDb.query.mockResolvedValueOnce([mockBalance]);

      const result = await creditSystem.getUserBalance(userId);

      expect(result).toMatchObject({
        userId,
        totalEarned: 50,
        totalUsed: 20,
        totalExpired: 5,
        availableCredits: 25,
        expiringCredits: 10,
      });
    });

    it('should calculate balance when cache is empty', async () => {
      const userId = 'user-123';

      mockDb.query
        .mockResolvedValueOnce([]) // No cached balance
        .mockResolvedValueOnce([]) // Cache miss again (recursive call)
        .mockResolvedValueOnce([{ available: 15 }]) // Available credits
        .mockResolvedValueOnce([]); // Expiring credits

      mockDb.execute.mockResolvedValueOnce({ affectedRows: 1 }); // Update cache

      // Mock the recursive call return
      mockDb.query.mockResolvedValueOnce([{
        user_id: userId,
        total_earned: 20,
        total_used: 5,
        total_expired: 0,
        available_credits: 15,
        expiring_credits: 0,
        last_updated: new Date(),
      }]);

      const result = await creditSystem.getUserBalance(userId);

      expect(result.userId).toBe(userId);
      expect(result.availableCredits).toBe(15);
    });
  });

  describe('getUserCreditHistory', () => {
    it('should return user credit history', async () => {
      const userId = 'user-123';
      const mockHistory = [
        {
          id: 'credit-1',
          user_id: userId,
          amount: 10,
          type: CreditType.EARNED,
          source: CreditSource.INVITE_REWARD,
          source_id: 'invite-123',
          description: '邀请奖励',
          expires_at: new Date(),
          created_at: new Date(),
          used_at: null,
        },
        {
          id: 'credit-2',
          user_id: userId,
          amount: -5,
          type: CreditType.USED,
          source: CreditSource.INVITE_REWARD,
          source_id: 'usage-456',
          description: '使用积分',
          expires_at: null,
          created_at: new Date(),
          used_at: new Date(),
        },
      ];

      mockDb.query.mockResolvedValueOnce(mockHistory);

      const result = await creditSystem.getUserCreditHistory(userId, 10);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'credit-1',
        userId,
        amount: 10,
        type: CreditType.EARNED,
        source: CreditSource.INVITE_REWARD,
      });
      expect(result[1]).toMatchObject({
        id: 'credit-2',
        userId,
        amount: -5,
        type: CreditType.USED,
      });
    });
  });

  describe('expireCredits', () => {
    it('should expire credits successfully', async () => {
      const mockExpiredCredits = [
        {
          id: 'credit-1',
          user_id: 'user-123',
          amount: 10,
          source: CreditSource.INVITE_REWARD,
          source_id: 'invite-123',
          description: '邀请奖励',
        },
        {
          id: 'credit-2',
          user_id: 'user-456',
          amount: 5,
          source: CreditSource.MILESTONE_REWARD,
          source_id: 'milestone-456',
          description: '里程碑奖励',
        },
      ];

      mockDb.query.mockResolvedValueOnce(mockExpiredCredits);

      mockDb.execute
        .mockResolvedValueOnce({ affectedRows: 1 }) // Insert expired record 1
        .mockResolvedValueOnce({ affectedRows: 1 }) // Mark original as used 1
        .mockResolvedValueOnce({ affectedRows: 1 }) // Update balance 1
        .mockResolvedValueOnce({ affectedRows: 1 }) // Insert expired record 2
        .mockResolvedValueOnce({ affectedRows: 1 }) // Mark original as used 2
        .mockResolvedValueOnce({ affectedRows: 1 }); // Update balance 2

      // Mock balance update queries
      mockDb.query
        .mockResolvedValue([]); // Various balance update queries

      const result = await creditSystem.expireCredits();

      expect(result).toBe(2);
      expect(mockDb.execute).toHaveBeenCalledTimes(6); // 2 credits * 3 operations each
    });

    it('should return 0 when no credits to expire', async () => {
      mockDb.query.mockResolvedValueOnce([]);

      const result = await creditSystem.expireCredits();

      expect(result).toBe(0);
      expect(mockDb.execute).not.toHaveBeenCalled();
    });
  });

  describe('getExpiringCredits', () => {
    it('should return credits expiring within specified days', async () => {
      const userId = 'user-123';
      const days = 30;

      const mockExpiringCredits = [
        {
          id: 'credit-1',
          user_id: userId,
          amount: 10,
          type: CreditType.EARNED,
          source: CreditSource.INVITE_REWARD,
          source_id: 'invite-123',
          description: '邀请奖励',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          created_at: new Date(),
          used_at: null,
        },
      ];

      mockDb.query.mockResolvedValueOnce(mockExpiringCredits);

      const result = await creditSystem.getExpiringCredits(userId, days);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'credit-1',
        userId,
        amount: 10,
        type: CreditType.EARNED,
      });
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('expires_at BETWEEN NOW() AND ?'),
        [userId, CreditType.EARNED, expect.any(Date)],
      );
    });
  });

  describe('getCreditStats', () => {
    it('should return comprehensive credit statistics', async () => {
      const userId = 'user-123';

      mockDb.query
        .mockResolvedValueOnce([{ total: 100 }]) // Total earned
        .mockResolvedValueOnce([{ total: 30 }])  // Total used
        .mockResolvedValueOnce([{ total: 10 }])  // Total expired
        .mockResolvedValueOnce([{ first_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }]) // First record (30 days ago)
        .mockResolvedValueOnce([ // Top sources
          { source: CreditSource.INVITE_REWARD, amount: 60 },
          { source: CreditSource.MILESTONE_REWARD, amount: 40 },
        ]);

      const result = await creditSystem.getCreditStats(userId);

      expect(result).toEqual({
        totalEarned: 100,
        totalUsed: 30,
        totalExpired: 10,
        averageDaily: 3.33, // 100 / 30 days
        topSources: [
          { source: CreditSource.INVITE_REWARD, amount: 60 },
          { source: CreditSource.MILESTONE_REWARD, amount: 40 },
        ],
      });
    });

    it('should handle case with no credit history', async () => {
      const userId = 'user-123';

      mockDb.query
        .mockResolvedValueOnce([{ total: 0 }]) // Total earned
        .mockResolvedValueOnce([{ total: 0 }]) // Total used
        .mockResolvedValueOnce([{ total: 0 }]) // Total expired
        .mockResolvedValueOnce([{ first_date: null }]) // No first record
        .mockResolvedValueOnce([]); // No sources

      const result = await creditSystem.getCreditStats(userId);

      expect(result).toEqual({
        totalEarned: 0,
        totalUsed: 0,
        totalExpired: 0,
        averageDaily: 0,
        topSources: [],
      });
    });
  });

  describe('getCreditUsageHistory', () => {
    it('should return credit usage history', async () => {
      const userId = 'user-123';
      const mockUsageHistory = [
        {
          id: 'usage-1',
          user_id: userId,
          amount: 5,
          purpose: 'AI生成',
          metadata: JSON.stringify({ model: 'gpt-4', tokens: 1000 }),
          created_at: new Date(),
        },
        {
          id: 'usage-2',
          user_id: userId,
          amount: 3,
          purpose: '图片生成',
          metadata: null,
          created_at: new Date(),
        },
      ];

      mockDb.query.mockResolvedValueOnce(mockUsageHistory);

      const result = await creditSystem.getCreditUsageHistory(userId, 20);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'usage-1',
        userId,
        amount: 5,
        purpose: 'AI生成',
        metadata: { model: 'gpt-4', tokens: 1000 },
      });
      expect(result[1]).toMatchObject({
        id: 'usage-2',
        userId,
        amount: 3,
        purpose: '图片生成',
        metadata: undefined,
      });
    });
  });
});
