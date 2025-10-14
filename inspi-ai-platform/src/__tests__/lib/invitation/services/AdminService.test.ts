/**
 * AdminService 测试
 */

import { RewardType } from '@/lib/invitation/types';
import { MockDatabaseService } from '@/lib/testing/mocks/MockDatabaseService';

import { AdminServiceImpl } from '@/lib/invitation/services/AdminService';

describe('AdminService', () => {
  let adminService: AdminServiceImpl;
  let mockDb: MockDatabaseService;

  beforeEach(() => {
    mockDb = new MockDatabaseService();
    adminService = new AdminServiceImpl(mockDb as any);
  });

  afterEach(() => {
    mockDb.reset();
  });

  describe('getDashboardData', () => {
    it('should return dashboard overview data', async () => {
      // Mock database responses
      mockDb.setQueryResult('SELECT', {
        total_users: '100',
        total_invites: '50',
        total_registrations: '30',
        total_rewards: '75',
      });

      mockDb.setQueryResults('SELECT', [
        {
          type: 'invite_created',
          description: '用户 张三 创建了邀请码 ABC123',
          timestamp: new Date('2024-01-01T10:00:00Z'),
          user_id: 'user1',
          user_name: '张三',
        },
      ]);

      const result = await adminService.getDashboardData();

      expect(result).toMatchObject({
        overview: {
          totalUsers: 100,
          totalInvites: 50,
          totalRegistrations: 30,
          totalRewards: 75,
          conversionRate: 60, // 30/50 * 100
        },
        recentActivity: expect.arrayContaining([
          expect.objectContaining({
            type: 'invite_created',
            description: '用户 张三 创建了邀请码 ABC123',
          }),
        ]),
        systemHealth: expect.objectContaining({
          status: expect.any(String),
          issues: expect.any(Array),
          lastCheck: expect.any(Date),
        }),
      });
    });

    it('should handle database errors gracefully', async () => {
      mockDb.setError('Database connection failed');

      await expect(adminService.getDashboardData()).rejects.toThrow('Failed to get dashboard data');
    });
  });

  describe('getInviteManagement', () => {
    it('should return paginated invite data', async () => {
      const mockInvites = [
        {
          id: 'invite1',
          code: 'ABC123',
          inviter_name: '张三',
          inviter_email: 'zhang@example.com',
          created_at: new Date('2024-01-01'),
          usage_count: '2',
          max_usage: '5',
          is_active: 1,
          expires_at: null,
        },
      ];

      mockDb.setQueryResults('SELECT', mockInvites);
      mockDb.setQueryResult('SELECT COUNT', { total: '1' });

      const result = await adminService.getInviteManagement(1, 20);

      expect(result).toMatchObject({
        invites: [
          {
            id: 'invite1',
            code: 'ABC123',
            inviterName: '张三',
            inviterEmail: 'zhang@example.com',
            usageCount: 2,
            maxUsage: 5,
            isActive: true,
          },
        ],
        totalCount: 1,
        pagination: {
          page: 1,
          limit: 20,
          totalPages: 1,
        },
      });
    });

    it('should apply search filters', async () => {
      mockDb.setQueryResults('SELECT', []);
      mockDb.setQueryResult('SELECT COUNT', { total: '0' });

      await adminService.getInviteManagement(1, 20, {
        search: 'test',
        status: 'active',
      });

      const queries = mockDb.getExecutedQueries();
      expect(queries.some(q => q.includes('LIKE') && q.includes('is_active = 1'))).toBe(true);
    });
  });

  describe('deactivateInviteCode', () => {
    it('should deactivate invite code', async () => {
      await adminService.deactivateInviteCode('invite1', 'Admin action');

      const queries = mockDb.getExecutedQueries();
      expect(queries.some(q =>
        q.includes('UPDATE invite_codes') &&
        q.includes('is_active = 0'),
      )).toBe(true);
    });

    it('should handle database errors', async () => {
      mockDb.setError('Update failed');

      await expect(adminService.deactivateInviteCode('invite1', 'reason'))
        .rejects.toThrow('Failed to deactivate invite code');
    });
  });

  describe('getUserManagement', () => {
    it('should return paginated user data with invite statistics', async () => {
      const mockUsers = [
        {
          id: 'user1',
          name: '张三',
          email: 'zhang@example.com',
          registered_at: new Date('2024-01-01'),
          is_active: 1,
          last_login_at: new Date('2024-01-15'),
          invite_count: '3',
          registration_count: '2',
          total_rewards: '100',
          invited_by_user_id: null,
          invited_by_user_name: null,
          invited_by_code_id: null,
        },
      ];

      mockDb.setQueryResults('SELECT', mockUsers);
      mockDb.setQueryResult('SELECT COUNT', { total: '1' });

      const result = await adminService.getUserManagement(1, 20);

      expect(result.users[0]).toMatchObject({
        id: 'user1',
        name: '张三',
        email: 'zhang@example.com',
        inviteCount: 3,
        registrationCount: 2,
        totalRewards: 100,
        isActive: true,
        invitedBy: undefined,
      });
    });
  });

  describe('grantReward', () => {
    it('should grant reward to user', async () => {
      await adminService.grantReward('user1', 'ai_credits', 100, 'Admin grant');

      const queries = mockDb.getExecutedQueries();
      expect(queries.some(q =>
        q.includes('INSERT INTO rewards') &&
        q.includes('ai_credits') &&
        q.includes('100'),
      )).toBe(true);
    });
  });

  describe('getRewardManagement', () => {
    it('should return paginated reward data', async () => {
      const mockRewards = [
        {
          id: 'reward1',
          user_id: 'user1',
          user_name: '张三',
          type: 'ai_credits',
          amount: '100',
          description: 'Invitation reward',
          granted_at: new Date('2024-01-01'),
          granted_by: 'system',
          source_type: 'invitation',
          source_id: 'invite1',
        },
      ];

      mockDb.setQueryResults('SELECT', mockRewards);
      mockDb.setQueryResult('SELECT COUNT', { total: '1' });
      mockDb.setQueryResult('SELECT SUM', {
        total_credits: '500',
        total_badges: '3',
        total_titles: '1',
        total_premium_days: '30',
      });

      const result = await adminService.getRewardManagement(1, 20);

      expect(result).toMatchObject({
        rewards: [
          {
            id: 'reward1',
            userId: 'user1',
            userName: '张三',
            type: 'ai_credits',
            amount: 100,
            description: 'Invitation reward',
          },
        ],
        totalCount: 1,
        summary: {
          totalCredits: 500,
          totalBadges: 3,
          totalTitles: 1,
          totalPremiumDays: 30,
        },
      });
    });
  });

  describe('getSystemHealth', () => {
    it('should return healthy status when no issues', async () => {
      mockDb.setQueryResult('SELECT 1', { '1': 1 });
      mockDb.setQueryResult('SELECT COUNT', { error_count: '0' });
      mockDb.setQueryResult('SELECT COUNT', { recent_invites: '5' });

      const result = await adminService.getSystemHealth();

      expect(result).toMatchObject({
        status: 'healthy',
        issues: [],
        lastCheck: expect.any(Date),
      });
    });

    it('should detect issues and return warning status', async () => {
      mockDb.setQueryResult('SELECT 1', { '1': 1 });
      mockDb.setQueryResult('SELECT COUNT', { error_count: '15' });
      mockDb.setQueryResult('SELECT COUNT', { recent_invites: '0' });

      const result = await adminService.getSystemHealth();

      expect(result.status).toBe('warning');
      expect(result.issues).toContain('最近1小时内有15个错误日志');
      expect(result.issues).toContain('最近1小时内没有新的邀请活动');
    });

    it('should return error status on database failure', async () => {
      mockDb.setError('Database connection failed');

      const result = await adminService.getSystemHealth();

      expect(result).toMatchObject({
        status: 'error',
        issues: ['系统健康检查失败'],
        lastCheck: expect.any(Date),
      });
    });
  });

  describe('exportInviteData', () => {
    it('should export invite data as CSV', async () => {
      const mockData = [
        {
          '邀请码': 'ABC123',
          '邀请人': '张三',
          '邀请人邮箱': 'zhang@example.com',
          '创建时间': '2024-01-01',
          '使用次数': '2',
          '最大使用次数': '5',
          '状态': '激活',
          '过期时间': null,
        },
      ];

      mockDb.setQueryResults('SELECT', mockData);

      const result = await adminService.exportInviteData();

      expect(result).toContain('邀请码,邀请人,邀请人邮箱');
      expect(result).toContain('ABC123,张三,zhang@example.com');
    });

    it('should return empty string for no data', async () => {
      mockDb.setQueryResults('SELECT', []);

      const result = await adminService.exportInviteData();

      expect(result).toBe('');
    });
  });

  describe('getSystemLogs', () => {
    it('should return paginated system logs', async () => {
      const mockLogs = [
        {
          id: 'log1',
          level: 'info',
          message: 'System started',
          timestamp: new Date('2024-01-01T10:00:00Z'),
          metadata: '{}',
        },
      ];

      mockDb.setQueryResults('SELECT', mockLogs);
      mockDb.setQueryResult('SELECT COUNT', { total: '1' });

      const result = await adminService.getSystemLogs(1, 50, 'info');

      expect(result).toMatchObject({
        logs: [
          {
            id: 'log1',
            level: 'info',
            message: 'System started',
            timestamp: expect.any(Date),
            metadata: {},
          },
        ],
        totalCount: 1,
      });
    });

    it('should handle missing system_logs table gracefully', async () => {
      mockDb.setError('Table does not exist');

      const result = await adminService.getSystemLogs();

      expect(result).toMatchObject({
        logs: [],
        totalCount: 0,
      });
    });
  });
});
