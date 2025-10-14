/**
 * 邀请注册处理器测试
 */

import { DatabaseFactory } from '../../../../lib/invitation/database';
import { InviteRegistrationHandlerImpl } from '../../../../lib/invitation/services/InviteRegistrationHandler';
import { InviteEventType } from '../../../../lib/invitation/types';

// Mock数据库
jest.mock('../../../../lib/invitation/database');
jest.mock('../../../../lib/utils/logger');

describe('InviteRegistrationHandler', () => {
  let handler: InviteRegistrationHandlerImpl;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
      execute: jest.fn(),
      transaction: jest.fn(),
    }

    ;(DatabaseFactory.getInstance as jest.Mock).mockReturnValue(mockDb);
    handler = new InviteRegistrationHandlerImpl();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('activateUser', () => {
    it('should activate user successfully', async () => {
      const userId = 'user-456';
      const inviterId = 'user-123';
      const registrationId = 'reg-123';
      const inviteCodeId = 'invite-123';

      const mockRegistration = {
        id: registrationId,
        invite_code_id: inviteCodeId,
        inviter_id: inviterId,
        invitee_id: userId,
        registered_at: new Date(),
        is_activated: false,
        rewards_claimed: false,
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

      // Mock查找待激活的注册记录
      mockConnection.query.mockResolvedValueOnce([mockRegistration]);

      // Mock更新激活状态
      mockConnection.execute.mockResolvedValueOnce({ affectedRows: 1 });

      // Mock记录事件
      mockDb.execute.mockResolvedValueOnce({ affectedRows: 1 });

      // Mock更新统计
      mockDb.query.mockResolvedValueOnce([{ count: 1 }]);
      mockDb.execute.mockResolvedValueOnce({ affectedRows: 1 });

      const result = await handler.activateUser(userId);

      expect(result).toBe(true);
      expect(mockConnection.execute).toHaveBeenCalledWith(
        'UPDATE invite_registrations SET is_activated = true, activated_at = ? WHERE id = ?',
        expect.arrayContaining([expect.any(Date), registrationId]),
      );
    });

    it('should return false when no pending registration found', async () => {
      const userId = 'user-456';

      const mockConnection = {
        query: jest.fn(),
        execute: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn(),
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockConnection);
      });

      // Mock没有找到待激活的注册记录
      mockConnection.query.mockResolvedValueOnce([]);

      const result = await handler.activateUser(userId);

      expect(result).toBe(false);
    });
  });

  describe('isInvitedUser', () => {
    it('should return true for invited user', async () => {
      const userId = 'user-456';
      mockDb.query.mockResolvedValueOnce([{ id: 'reg-123' }]);

      const result = await handler.isInvitedUser(userId);

      expect(result).toBe(true);
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT id FROM invite_registrations WHERE invitee_id = ?',
        [userId],
      );
    });

    it('should return false for non-invited user', async () => {
      const userId = 'user-456';
      mockDb.query.mockResolvedValueOnce([]);

      const result = await handler.isInvitedUser(userId);

      expect(result).toBe(false);
    });
  });

  describe('getUserInviteRegistration', () => {
    it('should return user invite registration', async () => {
      const userId = 'user-456';
      const mockRegistration = {
        id: 'reg-123',
        invite_code_id: 'invite-123',
        inviter_id: 'user-123',
        invitee_id: userId,
        registered_at: new Date(),
        is_activated: true,
        activated_at: new Date(),
        rewards_claimed: false,
        invite_code: 'ABC12345',
      };

      mockDb.query.mockResolvedValueOnce([mockRegistration]);

      const result = await handler.getUserInviteRegistration(userId);

      expect(result).toMatchObject({
        id: 'reg-123',
        inviteCodeId: 'invite-123',
        inviterId: 'user-123',
        inviteeId: userId,
        isActivated: true,
        rewardsClaimed: false,
      });
    });

    it('should return null when no registration found', async () => {
      const userId = 'user-456';
      mockDb.query.mockResolvedValueOnce([]);

      const result = await handler.getUserInviteRegistration(userId);

      expect(result).toBeNull();
    });
  });

  describe('logInviteEvent', () => {
    it('should log invite event successfully', async () => {
      const event = {
        type: InviteEventType.USER_ACTIVATED,
        inviterId: 'user-123',
        inviteeId: 'user-456',
        inviteCodeId: 'invite-123',
        timestamp: new Date(),
        metadata: {
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        },
      };

      mockDb.execute.mockResolvedValueOnce({ affectedRows: 1 });

      await handler.logInviteEvent(event);

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO invite_event_logs'),
        expect.arrayContaining([
          expect.any(String), // eventId
          event.type,
          event.inviterId,
          event.inviteeId,
          event.inviteCodeId,
          event.timestamp,
          '192.168.1.1',
          'Mozilla/5.0',
          expect.any(String), // JSON metadata
        ]),
      );
    });

    it('should handle event logging errors gracefully', async () => {
      const event = {
        type: InviteEventType.LINK_CLICKED,
        inviterId: 'user-123',
        inviteCodeId: 'invite-123',
        timestamp: new Date(),
      };

      mockDb.execute.mockRejectedValueOnce(new Error('Database error'));

      // Should not throw error
      await expect(handler.logInviteEvent(event)).resolves.toBeUndefined();
    });
  });

  describe('handleInviteLinkClick', () => {
    it('should handle invite link click successfully', async () => {
      const inviteCode = 'ABC12345';
      const ipAddress = '192.168.1.1';
      const userAgent = 'Mozilla/5.0';

      const mockInviteCodeData = {
        id: 'invite-123',
        code: inviteCode,
        inviter_id: 'user-123',
      };

      mockDb.query.mockResolvedValueOnce([mockInviteCodeData]);
      mockDb.execute
        .mockResolvedValueOnce({ affectedRows: 1 }) // log event
        .mockResolvedValueOnce({ affectedRows: 1 }); // update share stats

      await handler.handleInviteLinkClick(inviteCode, ipAddress, userAgent);

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM invite_codes WHERE code = ?',
        [inviteCode],
      );
    });

    it('should handle invalid invite code gracefully', async () => {
      const inviteCode = 'INVALID';
      const ipAddress = '192.168.1.1';

      mockDb.query.mockResolvedValueOnce([]); // No invite code found

      // Should not throw error
      await expect(handler.handleInviteLinkClick(inviteCode, ipAddress)).resolves.toBeUndefined();
    });
  });

  describe('batchActivateUsers', () => {
    it('should batch activate users successfully', async () => {
      const userIds = ['user-1', 'user-2', 'user-3'];

      // Mock successful activation for all users
      const mockConnection = {
        query: jest.fn(),
        execute: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn(),
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockConnection);
      });

      // Mock registration records for all users
      mockConnection.query.mockResolvedValue([{
        id: 'reg-123',
        invite_code_id: 'invite-123',
        inviter_id: 'user-123',
      }]);

      mockConnection.execute.mockResolvedValue({ affectedRows: 1 });
      mockDb.execute.mockResolvedValue({ affectedRows: 1 });
      mockDb.query.mockResolvedValue([{ count: 1 }]);

      const result = await handler.batchActivateUsers(userIds);

      expect(result.success).toHaveLength(3);
      expect(result.failed).toHaveLength(0);
      expect(result.success).toEqual(userIds);
    });

    it('should handle partial failures in batch activation', async () => {
      const userIds = ['user-1', 'user-2', 'user-3'];

      const mockConnection = {
        query: jest.fn(),
        execute: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn(),
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockConnection);
      });

      // Mock first user has registration, others don't
      mockConnection.query
        .mockResolvedValueOnce([{ id: 'reg-123' }]) // user-1 has registration
        .mockResolvedValueOnce([]) // user-2 no registration
        .mockResolvedValueOnce([]); // user-3 no registration

      mockConnection.execute.mockResolvedValue({ affectedRows: 1 });
      mockDb.execute.mockResolvedValue({ affectedRows: 1 });
      mockDb.query.mockResolvedValue([{ count: 1 }]);

      const result = await handler.batchActivateUsers(userIds);

      expect(result.success).toHaveLength(1);
      expect(result.failed).toHaveLength(2);
      expect(result.success).toEqual(['user-1']);
      expect(result.failed).toEqual(['user-2', 'user-3']);
    });
  });

  describe('getInviteRegistrationStats', () => {
    it('should return invite registration stats', async () => {
      const inviterId = 'user-123';
      const days = 30;

      mockDb.query
        .mockResolvedValueOnce([{ count: 10 }]) // total registrations
        .mockResolvedValueOnce([{ count: 8 }])  // activated registrations
        .mockResolvedValueOnce([{ count: 3 }]);  // recent registrations

      const result = await handler.getInviteRegistrationStats(inviterId, days);

      expect(result).toEqual({
        totalRegistrations: 10,
        activatedRegistrations: 8,
        recentRegistrations: 3,
        activationRate: 80,
      });
    });

    it('should handle zero registrations', async () => {
      const inviterId = 'user-123';

      mockDb.query
        .mockResolvedValueOnce([{ count: 0 }]) // total registrations
        .mockResolvedValueOnce([{ count: 0 }]) // activated registrations
        .mockResolvedValueOnce([{ count: 0 }]); // recent registrations

      const result = await handler.getInviteRegistrationStats(inviterId);

      expect(result).toEqual({
        totalRegistrations: 0,
        activatedRegistrations: 0,
        recentRegistrations: 0,
        activationRate: 0,
      });
    });
  });

  describe('getInviteCodeUsageDetails', () => {
    it('should return invite code usage details', async () => {
      const inviteCodeId = 'invite-123';

      mockDb.query
        .mockResolvedValueOnce([{ code: 'ABC12345' }]) // code info
        .mockResolvedValueOnce([{ clicks: 50 }])       // click stats
        .mockResolvedValueOnce([{ count: 10 }])        // registration stats
        .mockResolvedValueOnce([{ count: 8 }])         // activated stats
        .mockResolvedValueOnce([                       // recent activity
          {
            event_type: 'link_clicked',
            timestamp: new Date(),
            ip_address: '192.168.1.1',
          },
        ]);

      const result = await handler.getInviteCodeUsageDetails(inviteCodeId);

      expect(result).toEqual({
        code: 'ABC12345',
        totalClicks: 50,
        totalRegistrations: 10,
        activatedUsers: 8,
        conversionRate: 20, // 10/50 * 100
        recentActivity: [{
          eventType: 'link_clicked',
          timestamp: expect.any(Date),
          ipAddress: '192.168.1.1',
        }],
      });
    });

    it('should throw error for invalid invite code', async () => {
      const inviteCodeId = 'invalid-id';

      mockDb.query.mockResolvedValueOnce([]); // No code found

      await expect(handler.getInviteCodeUsageDetails(inviteCodeId))
        .rejects.toThrow('Invite code not found');
    });
  });
});
