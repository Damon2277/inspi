/**
 * 邀请管理服务测试
 */

import { DatabaseFactory } from '../../../../lib/invitation/database';
import { InvitationServiceImpl } from '../../../../lib/invitation/services/InvitationService';
import { InviteErrorCode } from '../../../../lib/invitation/types';
import { generateUUID } from '../../../../lib/invitation/utils';

// Mock数据库
jest.mock('../../../../lib/invitation/database');
jest.mock('../../../../lib/utils/logger');

describe('InvitationService', () => {
  let service: InvitationServiceImpl;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
      execute: jest.fn(),
      transaction: jest.fn(),
    }

    ;(DatabaseFactory.getInstance as jest.Mock).mockReturnValue(mockDb);
    service = new InvitationServiceImpl();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateInviteCode', () => {
    it('should generate unique invite code successfully', async () => {
      const userId = 'user-123';

      // Mock数据库查询返回空结果（邀请码唯一）
      mockDb.query.mockResolvedValueOnce([]); // 检查邀请码唯一性
      mockDb.execute.mockResolvedValueOnce({ affectedRows: 1 }); // 插入邀请码
      mockDb.execute.mockResolvedValueOnce({ affectedRows: 1 }); // 更新统计

      // Mock统计查询
      mockDb.query
        .mockResolvedValueOnce([{ count: 1 }]) // invite count
        .mockResolvedValueOnce([{ count: 0 }]) // registration count
        .mockResolvedValueOnce([{ count: 0 }]) // active count
        .mockResolvedValueOnce([{ total: 0 }]); // reward count

      const result = await service.generateInviteCode(userId);

      expect(result).toMatchObject({
        inviterId: userId,
        isActive: true,
        usageCount: 0,
        maxUsage: 100,
      });
      expect(result.code).toMatch(/^[A-Z0-9]{8}$/);
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('should retry when invite code is not unique', async () => {
      const userId = 'user-123';

      // Mock第一次查询返回已存在的邀请码，第二次返回空结果
      mockDb.query
        .mockResolvedValueOnce([{ id: 'existing-id' }]) // 第一次检查：已存在
        .mockResolvedValueOnce([]); // 第二次检查：唯一

      mockDb.execute.mockResolvedValueOnce({ affectedRows: 1 }); // 插入邀请码
      mockDb.execute.mockResolvedValueOnce({ affectedRows: 1 }); // 更新统计

      // Mock统计查询
      mockDb.query
        .mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([{ total: 0 }]);

      const result = await service.generateInviteCode(userId);

      expect(result.inviterId).toBe(userId);
      expect(mockDb.query).toHaveBeenCalledTimes(6); // 2次唯一性检查 + 4次统计查询
    });

    it('should throw error when unable to generate unique code', async () => {
      const userId = 'user-123';

      // Mock所有查询都返回已存在的邀请码
      mockDb.query.mockResolvedValue([{ id: 'existing-id' }]);

      await expect(service.generateInviteCode(userId)).rejects.toThrow();
    });
  });

  describe('validateInviteCode', () => {
    it('should validate correct invite code', async () => {
      const code = 'ABC12345';
      const mockInviteCode = {
        id: 'invite-123',
        code,
        inviter_id: 'user-123',
        created_at: new Date(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30天后过期
        is_active: true,
        usage_count: 0,
        max_usage: 100,
      };

      mockDb.query.mockResolvedValueOnce([mockInviteCode]);

      const result = await service.validateInviteCode(code);

      expect(result.isValid).toBe(true);
      expect(result.code).toMatchObject({
        id: 'invite-123',
        code,
        inviterId: 'user-123',
        isActive: true,
        usageCount: 0,
        maxUsage: 100,
      });
    });

    it('should reject invalid format', async () => {
      const result = await service.validateInviteCode('invalid');

      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(InviteErrorCode.INVALID_INVITE_CODE);
      expect(result.error).toBe('Invalid invite code format');
    });

    it('should reject non-existent invite code', async () => {
      const code = 'ABC12345';
      mockDb.query.mockResolvedValueOnce([]);

      const result = await service.validateInviteCode(code);

      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(InviteErrorCode.INVALID_INVITE_CODE);
      expect(result.error).toBe('Invite code not found');
    });

    it('should reject expired invite code', async () => {
      const code = 'ABC12345';
      const mockInviteCode = {
        id: 'invite-123',
        code,
        inviter_id: 'user-123',
        created_at: new Date(),
        expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000), // 昨天过期
        is_active: true,
        usage_count: 0,
        max_usage: 100,
      };

      mockDb.query.mockResolvedValueOnce([mockInviteCode]);

      const result = await service.validateInviteCode(code);

      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(InviteErrorCode.EXPIRED_INVITE_CODE);
      expect(result.error).toBe('Invite code has expired');
    });

    it('should reject inactive invite code', async () => {
      const code = 'ABC12345';
      const mockInviteCode = {
        id: 'invite-123',
        code,
        inviter_id: 'user-123',
        created_at: new Date(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        is_active: false, // 未激活
        usage_count: 0,
        max_usage: 100,
      };

      mockDb.query.mockResolvedValueOnce([mockInviteCode]);

      const result = await service.validateInviteCode(code);

      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(InviteErrorCode.INVALID_INVITE_CODE);
      expect(result.error).toBe('Invite code is inactive');
    });

    it('should reject invite code with exceeded usage limit', async () => {
      const code = 'ABC12345';
      const mockInviteCode = {
        id: 'invite-123',
        code,
        inviter_id: 'user-123',
        created_at: new Date(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        is_active: true,
        usage_count: 100, // 已达到使用限制
        max_usage: 100,
      };

      mockDb.query.mockResolvedValueOnce([mockInviteCode]);

      const result = await service.validateInviteCode(code);

      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(InviteErrorCode.USAGE_LIMIT_EXCEEDED);
      expect(result.error).toBe('Invite code usage limit exceeded');
    });
  });

  describe('processInviteRegistration', () => {
    it('should process invite registration successfully', async () => {
      const code = 'ABC12345';
      const newUserId = 'user-456';
      const inviterId = 'user-123';

      const mockInviteCode = {
        id: 'invite-123',
        code,
        inviter_id: inviterId,
        created_at: new Date(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        is_active: true,
        usage_count: 0,
        max_usage: 100,
      };

      const mockConnection = {
        query: jest.fn(),
        execute: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn(),
      };

      // Mock事务
      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockConnection);
      });

      // Mock邀请码验证
      mockDb.query.mockResolvedValueOnce([mockInviteCode]);

      // Mock检查已存在注册
      mockConnection.query.mockResolvedValueOnce([]);

      // Mock插入注册记录和更新使用次数
      mockConnection.execute
        .mockResolvedValueOnce({ affectedRows: 1 }) // 插入注册记录
        .mockResolvedValueOnce({ affectedRows: 1 }); // 更新使用次数

      // Mock统计更新
      mockDb.query
        .mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([{ total: 0 }]);
      mockDb.execute.mockResolvedValueOnce({ affectedRows: 1 });

      const result = await service.processInviteRegistration(code, newUserId);

      expect(result.success).toBe(true);
      expect(result.registration).toMatchObject({
        inviterId,
        inviteeId: newUserId,
        isActivated: false,
        rewardsClaimed: false,
      });
    });

    it('should reject self-invitation', async () => {
      const code = 'ABC12345';
      const userId = 'user-123'; // 同一个用户

      const mockInviteCode = {
        id: 'invite-123',
        code,
        inviter_id: userId, // 邀请人和被邀请人是同一个
        created_at: new Date(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        is_active: true,
        usage_count: 0,
        max_usage: 100,
      };

      const mockConnection = {
        query: jest.fn(),
        execute: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn(),
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockConnection);
      });

      // Mock邀请码验证
      mockDb.query.mockResolvedValueOnce([mockInviteCode]);

      const result = await service.processInviteRegistration(code, userId);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(InviteErrorCode.SELF_INVITE_ATTEMPT);
      expect(result.error).toBe('Cannot use your own invite code');
    });

    it('should reject already registered user', async () => {
      const code = 'ABC12345';
      const newUserId = 'user-456';
      const inviterId = 'user-123';

      const mockInviteCode = {
        id: 'invite-123',
        code,
        inviter_id: inviterId,
        created_at: new Date(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        is_active: true,
        usage_count: 0,
        max_usage: 100,
      };

      const mockConnection = {
        query: jest.fn(),
        execute: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn(),
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockConnection);
      });

      // Mock邀请码验证
      mockDb.query.mockResolvedValueOnce([mockInviteCode]);

      // Mock已存在的注册记录
      mockConnection.query.mockResolvedValueOnce([{ id: 'existing-registration' }]);

      const result = await service.processInviteRegistration(code, newUserId);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(InviteErrorCode.ALREADY_REGISTERED);
      expect(result.error).toBe('User has already been invited');
    });
  });

  describe('getUserInviteStats', () => {
    it('should return existing user stats', async () => {
      const userId = 'user-123';
      const mockStats = {
        id: 'stats-123',
        user_id: userId,
        total_invites: 5,
        successful_registrations: 3,
        active_invitees: 2,
        total_rewards_earned: 50,
        last_updated: new Date(),
      };

      mockDb.query.mockResolvedValueOnce([mockStats]);

      const result = await service.getUserInviteStats(userId);

      expect(result).toMatchObject({
        userId,
        totalInvites: 5,
        successfulRegistrations: 3,
        activeInvitees: 2,
        totalRewardsEarned: 50,
      });
    });

    it('should create default stats for new user', async () => {
      const userId = 'user-123';

      mockDb.query.mockResolvedValueOnce([]); // 没有现有统计
      mockDb.execute.mockResolvedValueOnce({ affectedRows: 1 }); // 创建默认统计

      const result = await service.getUserInviteStats(userId);

      expect(result).toMatchObject({
        userId,
        totalInvites: 0,
        successfulRegistrations: 0,
        activeInvitees: 0,
        totalRewardsEarned: 0,
      });
    });
  });

  describe('getUserInviteCodes', () => {
    it('should return user invite codes', async () => {
      const userId = 'user-123';
      const mockCodes = [
        {
          id: 'invite-1',
          code: 'ABC12345',
          inviter_id: userId,
          created_at: new Date(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          is_active: true,
          usage_count: 2,
          max_usage: 100,
        },
        {
          id: 'invite-2',
          code: 'DEF67890',
          inviter_id: userId,
          created_at: new Date(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          is_active: true,
          usage_count: 0,
          max_usage: 100,
        },
      ];

      mockDb.query.mockResolvedValueOnce(mockCodes);

      const result = await service.getUserInviteCodes(userId);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'invite-1',
        code: 'ABC12345',
        inviterId: userId,
        usageCount: 2,
      });
      expect(result[1]).toMatchObject({
        id: 'invite-2',
        code: 'DEF67890',
        inviterId: userId,
        usageCount: 0,
      });
    });
  });

  describe('deactivateInviteCode', () => {
    it('should deactivate invite code successfully', async () => {
      const codeId = 'invite-123';
      const userId = 'user-123';

      mockDb.execute.mockResolvedValueOnce({ affectedRows: 1 });

      const result = await service.deactivateInviteCode(codeId, userId);

      expect(result).toBe(true);
      expect(mockDb.execute).toHaveBeenCalledWith(
        'UPDATE invite_codes SET is_active = false WHERE id = ? AND inviter_id = ?',
        [codeId, userId],
      );
    });

    it('should return false when code not found or unauthorized', async () => {
      const codeId = 'invite-123';
      const userId = 'user-123';

      mockDb.execute.mockResolvedValueOnce({ affectedRows: 0 });

      const result = await service.deactivateInviteCode(codeId, userId);

      expect(result).toBe(false);
    });
  });
});
