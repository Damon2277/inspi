/**
 * 高级防作弊检测服务测试
 */

import { FraudDetectionServiceImpl } from '@/lib/invitation/services/FraudDetectionService';
import { NotificationServiceImpl } from '@/lib/invitation/services/NotificationService';

import { AdvancedFraudDetectionServiceImplComplete, BehaviorPattern, AnomalyAlert } from '@/lib/invitation/services/AdvancedFraudDetectionService';

// Mock dependencies
const mockDb = {
  execute: jest.fn(),
  queryOne: jest.fn(),
  queryMany: jest.fn(),
  transaction: jest.fn(),
};

const mockBasicFraudService = {
  getUserRiskLevel: jest.fn(),
  banUser: jest.fn(),
} as any;

const mockNotificationService = {
  sendNotification: jest.fn(),
} as any;

describe('AdvancedFraudDetectionService', () => {
  let service: AdvancedFraudDetectionServiceImplComplete;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdvancedFraudDetectionServiceImplComplete(
      mockDb as any,
      mockBasicFraudService,
      mockNotificationService,
    );
  });

  describe('analyzeBehaviorPattern', () => {
    it('should analyze behavior pattern for new user', async () => {
      mockDb.queryMany.mockResolvedValueOnce([]); // No historical data

      const result = await service.analyzeBehaviorPattern(
        'user1',
        'registration',
        { ip: '192.168.1.1', userAgent: 'Mozilla/5.0' },
      );

      expect(result).toMatchObject({
        userId: 'user1',
        patternType: 'registration',
        riskScore: expect.any(Number),
      });
      expect(result.features).toHaveProperty('hour_of_day');
      expect(result.features).toHaveProperty('day_of_week');
    });

    it('should analyze behavior pattern with historical data', async () => {
      const historicalData = [
        {
          user_id: 'user1',
          pattern_type: 'registration',
          features: '{"hour_of_day": 10, "daily_frequency": 2}',
          timestamp: new Date('2024-01-01'),
          risk_score: 0.3,
        },
      ];
      mockDb.queryMany.mockResolvedValueOnce(historicalData);

      const result = await service.analyzeBehaviorPattern(
        'user1',
        'registration',
        { ip: '192.168.1.1', userAgent: 'Mozilla/5.0' },
      );

      expect(result.riskScore).toBeGreaterThan(0);
      expect(result.riskScore).toBeLessThanOrEqual(1);
    });

    it('should save behavior pattern to database', async () => {
      mockDb.queryMany.mockResolvedValueOnce([]);

      await service.analyzeBehaviorPattern(
        'user1',
        'registration',
        { ip: '192.168.1.1' },
      );

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO behavior_patterns'),
        expect.arrayContaining(['user1', 'registration']),
      );
    });
  });

  describe('detectPatternAnomalies', () => {
    it('should return empty array for insufficient data', async () => {
      mockDb.queryMany.mockResolvedValueOnce([]); // No patterns

      const result = await service.detectPatternAnomalies('user1');

      expect(result).toEqual([]);
    });

    it('should detect velocity anomaly', async () => {
      const patterns = Array.from({ length: 10 }, (_, i) => ({
        user_id: 'user1',
        pattern_type: 'registration',
        features: '{}',
        timestamp: new Date(Date.now() - i * 60000), // 1 minute apart
        risk_score: 0.5,
      }));
      mockDb.queryMany.mockResolvedValueOnce(patterns);

      const result = await service.detectPatternAnomalies('user1');

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].alertType).toBe('velocity_spike');
    });

    it('should detect pattern deviation', async () => {
      const patterns = [
        {
          user_id: 'user1',
          pattern_type: 'registration',
          features: '{}',
          timestamp: new Date(Date.now() - 3600000),
          risk_score: 0.2,
        },
        {
          user_id: 'user1',
          pattern_type: 'registration',
          features: '{}',
          timestamp: new Date(Date.now() - 1800000),
          risk_score: 0.3,
        },
        {
          user_id: 'user1',
          pattern_type: 'registration',
          features: '{}',
          timestamp: new Date(),
          risk_score: 0.9, // High deviation
        },
      ];
      mockDb.queryMany.mockResolvedValueOnce(patterns);

      const result = await service.detectPatternAnomalies('user1');

      expect(result.some(alert => alert.alertType === 'pattern_deviation')).toBe(true);
    });
  });

  describe('createAnomalyAlert', () => {
    it('should create anomaly alert successfully', async () => {
      const alert: Omit<AnomalyAlert, 'id' | 'createdAt'> = {
        userId: 'user1',
        alertType: 'behavior_anomaly',
        severity: 'high',
        description: 'Suspicious behavior detected',
        evidence: { reason: 'test' },
        status: 'pending',
      };

      const alertId = await service.createAnomalyAlert(alert);

      expect(alertId).toMatch(/^alert_/);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO anomaly_alerts'),
        expect.arrayContaining([
          expect.any(String),
          'user1',
          'behavior_anomaly',
          'high',
          'Suspicious behavior detected',
        ]),
      );
      expect(mockNotificationService.sendNotification).toHaveBeenCalled();
    });
  });

  describe('getActiveAlerts', () => {
    it('should get active alerts without filter', async () => {
      const mockAlerts = [
        {
          id: 'alert1',
          user_id: 'user1',
          alert_type: 'behavior_anomaly',
          severity: 'high',
          description: 'Test alert',
          evidence: '{}',
          status: 'pending',
          created_at: new Date(),
        },
      ];
      mockDb.queryMany.mockResolvedValueOnce(mockAlerts);

      const result = await service.getActiveAlerts();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'alert1',
        userId: 'user1',
        alertType: 'behavior_anomaly',
        severity: 'high',
      });
    });

    it('should filter alerts by severity', async () => {
      mockDb.queryMany.mockResolvedValueOnce([]);

      await service.getActiveAlerts('critical', 10);

      expect(mockDb.queryMany).toHaveBeenCalledWith(
        expect.stringContaining('AND severity = ?'),
        expect.arrayContaining(['critical', 10]),
      );
    });
  });

  describe('createReviewCase', () => {
    it('should create review case successfully', async () => {
      const caseData = {
        userId: 'user1',
        caseType: 'suspicious_behavior' as const,
        priority: 'high' as const,
        status: 'pending' as const,
        evidence: [],
      };

      const caseId = await service.createReviewCase(caseData);

      expect(caseId).toMatch(/^case_/);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO review_cases'),
        expect.arrayContaining([
          expect.any(String),
          'user1',
          'suspicious_behavior',
          'high',
          'pending',
        ]),
      );
    });
  });

  describe('getReviewCases', () => {
    it('should get review cases without filter', async () => {
      const mockCases = [
        {
          id: 'case1',
          user_id: 'user1',
          case_type: 'suspicious_behavior',
          priority: 'high',
          status: 'pending',
          assigned_to: null,
          evidence: '[]',
          decision: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];
      mockDb.queryMany.mockResolvedValueOnce(mockCases);

      const result = await service.getReviewCases();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'case1',
        userId: 'user1',
        caseType: 'suspicious_behavior',
        priority: 'high',
      });
    });

    it('should filter cases by status and assignee', async () => {
      mockDb.queryMany.mockResolvedValueOnce([]);

      await service.getReviewCases('pending', 'reviewer1');

      expect(mockDb.queryMany).toHaveBeenCalledWith(
        expect.stringContaining('AND status = ?'),
        expect.arrayContaining(['pending', 'reviewer1']),
      );
    });
  });

  describe('freezeAccount', () => {
    it('should freeze account successfully', async () => {
      await service.freezeAccount('user1', 'Suspicious activity', 'admin1');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO account_freezes'),
        expect.arrayContaining([
          'user1',
          'Suspicious activity',
          expect.any(String), // JSON.stringify(['all'])
          'admin1',
        ]),
      );
      expect(mockNotificationService.sendNotification).toHaveBeenCalled();
    });
  });

  describe('getAccountStatus', () => {
    it('should get account status for normal user', async () => {
      mockDb.queryOne
        .mockResolvedValueOnce(null) // No freeze record
        .mockResolvedValueOnce({ count: 0 }); // No review cases
      mockBasicFraudService.getUserRiskLevel.mockResolvedValueOnce('low');

      const result = await service.getAccountStatus('user1');

      expect(result).toMatchObject({
        userId: 'user1',
        isFrozen: false,
        frozenFeatures: [],
        riskLevel: 'low',
        totalRecoveredRewards: 0,
        activeReviewCases: 0,
      });
    });

    it('should get account status for frozen user', async () => {
      const freezeRecord = {
        reason: 'Suspicious activity',
        frozen_features: '["all"]',
        expires_at: new Date(Date.now() + 86400000),
      };
      mockDb.queryOne
        .mockResolvedValueOnce(freezeRecord)
        .mockResolvedValueOnce({ count: 2 });
      mockBasicFraudService.getUserRiskLevel.mockResolvedValueOnce('high');

      const result = await service.getAccountStatus('user1');

      expect(result).toMatchObject({
        userId: 'user1',
        isFrozen: true,
        frozenFeatures: ['all'],
        freezeReason: 'Suspicious activity',
        riskLevel: 'high',
        activeReviewCases: 2,
      });
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockDb.queryMany.mockRejectedValueOnce(new Error('Database error'));

      const result = await service.detectPatternAnomalies('user1');

      expect(result).toEqual([]);
    });

    it('should handle notification errors gracefully', async () => {
      mockNotificationService.sendNotification.mockRejectedValueOnce(new Error('Notification error'));

      const alert: Omit<AnomalyAlert, 'id' | 'createdAt'> = {
        userId: 'user1',
        alertType: 'behavior_anomaly',
        severity: 'high',
        description: 'Test alert',
        evidence: {},
        status: 'pending',
      };

      // Should not throw error
      await expect(service.createAnomalyAlert(alert)).resolves.toBeDefined();
    });
  });
});
