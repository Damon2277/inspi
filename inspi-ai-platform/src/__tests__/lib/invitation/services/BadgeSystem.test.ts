/**
 * 徽章系统测试
 */

import { DatabaseFactory } from '../../../../lib/invitation/database';
import { BadgeSystemServiceImpl, BadgeCategory, BadgeRarity, RequirementType } from '../../../../lib/invitation/services/BadgeSystem';

// Mock数据库
jest.mock('../../../../lib/invitation/database');
jest.mock('../../../../lib/utils/logger');

describe('BadgeSystem', () => {
  let badgeSystem: BadgeSystemServiceImpl;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
      execute: jest.fn(),
      transaction: jest.fn(),
    }

    ;(DatabaseFactory.getInstance as jest.Mock).mockReturnValue(mockDb);
    badgeSystem = new BadgeSystemServiceImpl();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createBadge', () => {
    it('should create badge successfully', async () => {
      const badge = {
        name: '新手邀请者',
        description: '成功邀请第一个用户',
        iconUrl: '/badges/first_inviter.png',
        category: BadgeCategory.INVITER,
        rarity: BadgeRarity.COMMON,
        requirements: [
          { type: RequirementType.INVITE_COUNT, value: 1, description: '邀请1个用户' },
        ],
        isActive: true,
      };

      mockDb.execute.mockResolvedValueOnce({ affectedRows: 1 });

      const result = await badgeSystem.createBadge(badge);

      expect(result).toMatchObject({
        name: '新手邀请者',
        description: '成功邀请第一个用户',
        category: BadgeCategory.INVITER,
        rarity: BadgeRarity.COMMON,
        isActive: true,
      });
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO badges'),
        expect.arrayContaining([
          expect.any(String), // id
          '新手邀请者',
          '成功邀请第一个用户',
          '/badges/first_inviter.png',
          BadgeCategory.INVITER,
          BadgeRarity.COMMON,
          expect.any(String), // JSON requirements
          true,
          expect.any(Date),
        ]),
      );
    });
  });

  describe('getBadge', () => {
    it('should return badge when found', async () => {
      const badgeId = 'badge-123';
      const mockBadge = {
        id: badgeId,
        name: '邀请达人',
        description: '成功邀请10个用户',
        icon_url: '/badges/inviter_expert.png',
        category: BadgeCategory.INVITER,
        rarity: BadgeRarity.RARE,
        requirements: JSON.stringify([
          { type: RequirementType.INVITE_COUNT, value: 10, description: '邀请10个用户' },
        ]),
        is_active: true,
        created_at: new Date(),
      };

      mockDb.query.mockResolvedValueOnce([mockBadge]);

      const result = await badgeSystem.getBadge(badgeId);

      expect(result).toMatchObject({
        id: badgeId,
        name: '邀请达人',
        description: '成功邀请10个用户',
        iconUrl: '/badges/inviter_expert.png',
        category: BadgeCategory.INVITER,
        rarity: BadgeRarity.RARE,
        isActive: true,
      });
      expect(result?.requirements).toHaveLength(1);
    });

    it('should return null when badge not found', async () => {
      const badgeId = 'nonexistent-badge';
      mockDb.query.mockResolvedValueOnce([]);

      const result = await badgeSystem.getBadge(badgeId);

      expect(result).toBeNull();
    });
  });

  describe('awardBadge', () => {
    it('should award badge to user successfully', async () => {
      const userId = 'user-123';
      const badgeId = 'badge-456';

      // Mock check for existing badge
      mockDb.query.mockResolvedValueOnce([]);

      // Mock insert user badge
      mockDb.execute.mockResolvedValueOnce({ affectedRows: 1 });

      const result = await badgeSystem.awardBadge(userId, badgeId);

      expect(result).toMatchObject({
        userId,
        badgeId,
        isDisplayed: true,
      });
      expect(result.id).toBeDefined();
      expect(result.earnedAt).toBeInstanceOf(Date);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_badges'),
        expect.arrayContaining([
          expect.any(String), // id
          userId,
          badgeId,
          expect.any(Date), // earned_at
          true, // is_displayed
        ]),
      );
    });

    it('should throw error when user already has badge', async () => {
      const userId = 'user-123';
      const badgeId = 'badge-456';

      // Mock existing badge
      mockDb.query.mockResolvedValueOnce([{ id: 'existing-user-badge' }]);

      await expect(badgeSystem.awardBadge(userId, badgeId))
        .rejects.toThrow('User already has this badge');
    });
  });

  describe('getUserBadges', () => {
    it('should return user badges with badge details', async () => {
      const userId = 'user-123';
      const mockUserBadges = [
        {
          id: 'user-badge-1',
          user_id: userId,
          badge_id: 'badge-1',
          earned_at: new Date(),
          is_displayed: true,
          name: '新手邀请者',
          description: '成功邀请第一个用户',
          icon_url: '/badges/first_inviter.png',
          category: BadgeCategory.INVITER,
          rarity: BadgeRarity.COMMON,
        },
      ];

      mockDb.query.mockResolvedValueOnce(mockUserBadges);

      const result = await badgeSystem.getUserBadges(userId);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'user-badge-1',
        userId,
        badgeId: 'badge-1',
        isDisplayed: true,
      });
      expect(result[0].badge).toMatchObject({
        id: 'badge-1',
        name: '新手邀请者',
        description: '成功邀请第一个用户',
        category: BadgeCategory.INVITER,
        rarity: BadgeRarity.COMMON,
      });
    });
  });

  describe('setDisplayedBadges', () => {
    it('should update displayed badges successfully', async () => {
      const userId = 'user-123';
      const badgeIds = ['badge-1', 'badge-2'];

      const mockConnection = {
        execute: jest.fn(),
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockConnection);
      });

      mockConnection.execute
        .mockResolvedValueOnce({ affectedRows: 3 }) // Clear all displayed
        .mockResolvedValueOnce({ affectedRows: 2 }); // Set new displayed

      const result = await badgeSystem.setDisplayedBadges(userId, badgeIds);

      expect(result).toBe(true);
      expect(mockConnection.execute).toHaveBeenCalledTimes(2);
      expect(mockConnection.execute).toHaveBeenNthCalledWith(1,
        'UPDATE user_badges SET is_displayed = false WHERE user_id = ?',
        [userId],
      );
      expect(mockConnection.execute).toHaveBeenNthCalledWith(2,
        expect.stringContaining('UPDATE user_badges SET is_displayed = true'),
        [userId, ...badgeIds],
      );
    });
  });

  describe('checkAndAwardBadges', () => {
    it('should award badges when requirements are met', async () => {
      const userId = 'user-123';

      // Mock user stats
      mockDb.query
        .mockResolvedValueOnce([{ // User stats
          total_invites: 10,
          active_invitees: 5,
          total_rewards_earned: 100,
        }])
        .mockResolvedValueOnce([]); // No existing user badges

      // Mock all badges
      const mockBadges = [
        {
          id: 'badge-1',
          name: '新手邀请者',
          description: '成功邀请第一个用户',
          icon_url: '/badges/first_inviter.png',
          category: BadgeCategory.INVITER,
          rarity: BadgeRarity.COMMON,
          requirements: JSON.stringify([
            { type: RequirementType.INVITE_COUNT, value: 1, description: '邀请1个用户' },
          ]),
          is_active: true,
          created_at: new Date(),
        },
        {
          id: 'badge-2',
          name: '邀请达人',
          description: '成功邀请10个用户',
          icon_url: '/badges/inviter_expert.png',
          category: BadgeCategory.INVITER,
          rarity: BadgeRarity.RARE,
          requirements: JSON.stringify([
            { type: RequirementType.INVITE_COUNT, value: 10, description: '邀请10个用户' },
          ]),
          is_active: true,
          created_at: new Date(),
        },
      ];

      mockDb.query
        .mockResolvedValueOnce(mockBadges) // getAllBadges
        .mockResolvedValueOnce([]) // getUserBadges (empty)
        .mockResolvedValueOnce([]) // Check existing badge 1
        .mockResolvedValueOnce([]); // Check existing badge 2

      // Mock award badge calls
      mockDb.execute
        .mockResolvedValueOnce({ affectedRows: 1 }) // Award badge 1
        .mockResolvedValueOnce({ affectedRows: 1 }); // Award badge 2

      const result = await badgeSystem.checkAndAwardBadges(userId);

      expect(result).toHaveLength(2);
      expect(mockDb.execute).toHaveBeenCalledTimes(2);
    });

    it('should not award badges when requirements are not met', async () => {
      const userId = 'user-123';

      // Mock user stats - low stats
      mockDb.query
        .mockResolvedValueOnce([{
          total_invites: 0,
          active_invitees: 0,
          total_rewards_earned: 0,
        }])
        .mockResolvedValueOnce([]); // No existing user badges

      // Mock badges with high requirements
      const mockBadges = [
        {
          id: 'badge-1',
          name: '邀请达人',
          description: '成功邀请10个用户',
          icon_url: '/badges/inviter_expert.png',
          category: BadgeCategory.INVITER,
          rarity: BadgeRarity.RARE,
          requirements: JSON.stringify([
            { type: RequirementType.INVITE_COUNT, value: 10, description: '邀请10个用户' },
          ]),
          is_active: true,
          created_at: new Date(),
        },
      ];

      mockDb.query
        .mockResolvedValueOnce(mockBadges) // getAllBadges
        .mockResolvedValueOnce([]); // getUserBadges

      const result = await badgeSystem.checkAndAwardBadges(userId);

      expect(result).toHaveLength(0);
      expect(mockDb.execute).not.toHaveBeenCalled();
    });
  });

  describe('createTitle', () => {
    it('should create title successfully', async () => {
      const title = {
        name: '邀请新星',
        description: '邀请界的新星',
        color: '#4CAF50',
        requirements: [
          { type: RequirementType.INVITE_COUNT, value: 5, description: '邀请5个用户' },
        ],
        isActive: true,
      };

      mockDb.execute.mockResolvedValueOnce({ affectedRows: 1 });

      const result = await badgeSystem.createTitle(title);

      expect(result).toMatchObject({
        name: '邀请新星',
        description: '邀请界的新星',
        color: '#4CAF50',
        isActive: true,
      });
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('awardTitle', () => {
    it('should award title to user successfully', async () => {
      const userId = 'user-123';
      const titleId = 'title-456';

      // Mock check for existing title
      mockDb.query.mockResolvedValueOnce([]);

      // Mock insert user title
      mockDb.execute.mockResolvedValueOnce({ affectedRows: 1 });

      const result = await badgeSystem.awardTitle(userId, titleId);

      expect(result).toMatchObject({
        userId,
        titleId,
        isActive: false,
      });
      expect(result.id).toBeDefined();
      expect(result.earnedAt).toBeInstanceOf(Date);
    });

    it('should throw error when user already has title', async () => {
      const userId = 'user-123';
      const titleId = 'title-456';

      // Mock existing title
      mockDb.query.mockResolvedValueOnce([{ id: 'existing-user-title' }]);

      await expect(badgeSystem.awardTitle(userId, titleId))
        .rejects.toThrow('User already has this title');
    });
  });

  describe('setActiveTitle', () => {
    it('should set active title successfully', async () => {
      const userId = 'user-123';
      const titleId = 'title-456';

      const mockConnection = {
        execute: jest.fn(),
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockConnection);
      });

      mockConnection.execute
        .mockResolvedValueOnce({ affectedRows: 2 }) // Clear all active
        .mockResolvedValueOnce({ affectedRows: 1 }); // Set new active

      const result = await badgeSystem.setActiveTitle(userId, titleId);

      expect(result).toBe(true);
      expect(mockConnection.execute).toHaveBeenCalledTimes(2);
    });

    it('should return false when title not found', async () => {
      const userId = 'user-123';
      const titleId = 'nonexistent-title';

      const mockConnection = {
        execute: jest.fn(),
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockConnection);
      });

      mockConnection.execute
        .mockResolvedValueOnce({ affectedRows: 0 }) // Clear all active
        .mockResolvedValueOnce({ affectedRows: 0 }); // Set new active (not found)

      const result = await badgeSystem.setActiveTitle(userId, titleId);

      expect(result).toBe(false);
    });
  });
});
