/**
 * 防作弊系统集成测试
 * 测试防作弊检测、风险评估、异常处理等完整流程
 */

import { DatabaseFactory } from '@/lib/invitation/database';
import { FraudDetectionService } from '@/lib/invitation/services/FraudDetectionService';
import { InvitationService } from '@/lib/invitation/services/InvitationService';
import { InviteRegistrationHandler } from '@/lib/invitation/services/InviteRegistrationHandler';
import { FraudAction } from '@/lib/invitation/types';
import { logger } from '@/shared/utils/logger';

import { AdvancedFraudDetectionService } from '@/lib/invitation/services/AdvancedFraudDetectionService';

describe('防作弊系统集成测试', () => {
  let fraudDetection: FraudDetectionService;
  let advancedFraudDetection: AdvancedFraudDetectionService;
  let invitationService: InvitationService;
  let registrationHandler: InviteRegistrationHandler;
  let db: any;

  beforeAll(async () => {
    db = await DatabaseFactory.createPool({
      host: 'localhost',
      port: 3306,
      database: 'test_invitation_system',
      username: 'test',
      password: 'test',
    });

    fraudDetection = new FraudDetectionService(db);
    advancedFraudDetection = new AdvancedFraudDetectionService(db);
    invitationService = new InvitationService(db);
    registrationHandler = new InviteRegistrationHandler(db, null as any);
  });

  afterAll(async () => {
    await DatabaseFactory.closePool();
  });

  beforeEach(async () => {
    // 清理测试数据
    await db.execute('DELETE FROM fraud_detection_logs');
    await db.execute('DELETE FROM user_behavior_patterns');
    await db.execute('DELETE FROM suspicious_activities');
    await db.execute('DELETE FROM fraud_alerts');
    await db.execute('DELETE FROM account_reviews');
    await db.execute('DELETE FROM invite_registrations');
    await db.execute('DELETE FROM invite_codes');
  });

  describe('基础防作弊检测测试', () => {
    it('应该检测IP频率限制', async () => {
      const inviterId = 'user-fraud-001';
      const inviteCode = await invitationService.generateInviteCode(inviterId);
      const suspiciousIP = '192.168.100.1';

      const registrationData = {
        inviteCodeId: inviteCode.id,
        inviterId,
        inviteeId: 'user-invitee-001',
        ipAddress: suspiciousIP,
        userAgent: 'Mozilla/5.0 Test Browser',
        registrationTime: new Date(),
      };

      // 第一次检测应该通过
      const firstCheck = await fraudDetection.checkInviteRegistration(registrationData);
      expect(firstCheck.action).toBe(FraudAction.ALLOW);
      expect(firstCheck.isSuspicious).toBe(false);

      // 短时间内多次注册
      const rapidRegistrations = [];
      for (let i = 0; i < 5; i++) {
        const check = await fraudDetection.checkInviteRegistration({
          ...registrationData,
          inviteeId: `user-invitee-rapid-${i}`,
          registrationTime: new Date(),
        });
        rapidRegistrations.push(check);
      }

      // 应该有部分被标记为可疑或阻止
      const suspiciousChecks = rapidRegistrations.filter(c => c.isSuspicious || c.action !== FraudAction.ALLOW);
      expect(suspiciousChecks.length).toBeGreaterThan(0);

      logger.info('IP频率限制检测测试通过', {
        suspiciousIP,
        totalChecks: rapidRegistrations.length,
        suspiciousCount: suspiciousChecks.length,
      });
    });

    it('应该检测设备指纹异常', async () => {
      const inviterId = 'user-fraud-002';
      const inviteCode = await invitationService.generateInviteCode(inviterId);

      const normalUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
      const suspiciousUserAgent = 'SuspiciousBot/1.0 (Automated)';

      // 正常设备指纹
      const normalCheck = await fraudDetection.checkInviteRegistration({
        inviteCodeId: inviteCode.id,
        inviterId,
        inviteeId: 'user-normal-device',
        ipAddress: '192.168.100.10',
        userAgent: normalUserAgent,
        registrationTime: new Date(),
      });

      expect(normalCheck.action).toBe(FraudAction.ALLOW);

      // 可疑设备指纹
      const suspiciousCheck = await fraudDetection.checkInviteRegistration({
        inviteCodeId: inviteCode.id,
        inviterId,
        inviteeId: 'user-suspicious-device',
        ipAddress: '192.168.100.11',
        userAgent: suspiciousUserAgent,
        registrationTime: new Date(),
      });

      expect(suspiciousCheck.isSuspicious).toBe(true);
      expect(suspiciousCheck.reasons).toContain('可疑的用户代理');

      logger.info('设备指纹异常检测测试通过', {
        normalUserAgent: normalUserAgent.substring(0, 50),
        suspiciousUserAgent,
        suspiciousCheck: suspiciousCheck.isSuspicious,
      });
    });

    it('应该检测自我邀请', async () => {
      const userId = 'user-self-invite';
      const inviteCode = await invitationService.generateInviteCode(userId);

      const selfInviteCheck = await fraudDetection.checkInviteRegistration({
        inviteCodeId: inviteCode.id,
        inviterId: userId,
        inviteeId: userId, // 自我邀请
        ipAddress: '192.168.100.20',
        userAgent: 'Mozilla/5.0 Test Browser',
        registrationTime: new Date(),
      });

      expect(selfInviteCheck.action).toBe(FraudAction.BLOCK);
      expect(selfInviteCheck.reasons).toContain('自我邀请');

      logger.info('自我邀请检测测试通过', { userId });
    });

    it('应该检测批量注册模式', async () => {
      const inviterId = 'user-fraud-003';
      const inviteCode = await invitationService.generateInviteCode(inviterId, { maxUsage: 20 });

      // 模拟批量注册：相似的用户ID模式
      const batchRegistrations = [];
      for (let i = 0; i < 10; i++) {
        const check = await fraudDetection.checkInviteRegistration({
          inviteCodeId: inviteCode.id,
          inviterId,
          inviteeId: `batch_user_${String(i).padStart(3, '0')}`, // 相似的ID模式
          ipAddress: `192.168.100.${30 + i}`,
          userAgent: 'Mozilla/5.0 Test Browser',
          registrationTime: new Date(Date.now() + i * 1000), // 短时间间隔
        });
        batchRegistrations.push(check);
      }

      // 应该检测到批量注册模式
      const suspiciousBatch = batchRegistrations.filter(c => c.isSuspicious);
      expect(suspiciousBatch.length).toBeGreaterThan(0);

      logger.info('批量注册模式检测测试通过', {
        totalRegistrations: batchRegistrations.length,
        suspiciousCount: suspiciousBatch.length,
      });
    });
  });

  describe('高级防作弊检测测试', () => {
    it('应该进行行为模式分析', async () => {
      const userId = 'user-behavior-001';

      // 创建用户行为模式
      await advancedFraudDetection.createUserBehaviorPattern({
        userId,
        ipAddress: '192.168.200.1',
        deviceFingerprint: 'normal-device-001',
        registrationTime: new Date(),
        activityPattern: {
          loginFrequency: 'daily',
          inviteFrequency: 'weekly',
          deviceConsistency: true,
        },
        riskIndicators: [],
      });

      // 分析行为模式
      const analysis = await advancedFraudDetection.analyzeUserBehavior(userId);
      expect(analysis).toBeDefined();
      expect(analysis.riskScore).toBeGreaterThanOrEqual(0);
      expect(analysis.riskScore).toBeLessThanOrEqual(100);

      // 添加异常行为
      await advancedFraudDetection.updateUserBehaviorPattern(userId, {
        activityPattern: {
          loginFrequency: 'never', // 异常：从不登录但频繁邀请
          inviteFrequency: 'hourly',
          deviceConsistency: false,
        },
        riskIndicators: ['unusual_activity_pattern', 'device_inconsistency'],
      });

      // 重新分析应该显示更高的风险分数
      const updatedAnalysis = await advancedFraudDetection.analyzeUserBehavior(userId);
      expect(updatedAnalysis.riskScore).toBeGreaterThan(analysis.riskScore);

      logger.info('行为模式分析测试通过', {
        userId,
        initialRiskScore: analysis.riskScore,
        updatedRiskScore: updatedAnalysis.riskScore,
      });
    });

    it('应该生成异常行为告警', async () => {
      const userId = 'user-alert-001';

      // 创建高风险行为模式
      await advancedFraudDetection.createUserBehaviorPattern({
        userId,
        ipAddress: '192.168.200.10',
        deviceFingerprint: 'suspicious-device-001',
        registrationTime: new Date(),
        activityPattern: {
          inviteFrequency: 'continuous', // 持续邀请
          successRate: 0.95, // 异常高的成功率
          timePattern: 'automated', // 自动化时间模式
        },
        riskIndicators: ['high_success_rate', 'automated_pattern', 'suspicious_timing'],
      });

      // 触发异常检测
      const alerts = await advancedFraudDetection.detectAnomalies({
        userId,
        timeWindow: 24 * 60 * 60 * 1000, // 24小时
        thresholds: {
          riskScore: 70,
          inviteFrequency: 10,
          successRate: 0.8,
        },
      });

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].userId).toBe(userId);
      expect(alerts[0].severity).toBeDefined();
      expect(alerts[0].reasons.length).toBeGreaterThan(0);

      logger.info('异常行为告警测试通过', {
        userId,
        alertsCount: alerts.length,
        severity: alerts[0].severity,
      });
    });

    it('应该触发人工审核工作流', async () => {
      const userId = 'user-review-001';

      // 创建需要审核的账户
      const reviewRequest = await advancedFraudDetection.createAccountReview({
        userId,
        reason: 'high_risk_behavior',
        description: '检测到高风险邀请行为，需要人工审核',
        riskScore: 85,
        evidence: {
          suspiciousActivities: ['rapid_invites', 'unusual_success_rate'],
          behaviorPatterns: ['automated_timing', 'device_switching'],
          statisticalAnomalies: ['outlier_performance'],
        },
        priority: 'high',
      });

      expect(reviewRequest).toBeDefined();
      expect(reviewRequest.status).toBe('pending');
      expect(reviewRequest.priority).toBe('high');

      // 获取待审核账户列表
      const pendingReviews = await advancedFraudDetection.getPendingAccountReviews({
        status: 'pending',
        priority: 'high',
        pagination: { page: 1, limit: 10 },
      });

      expect(pendingReviews.reviews.length).toBeGreaterThan(0);
      expect(pendingReviews.reviews[0].userId).toBe(userId);

      // 完成人工审核
      const reviewResult = await advancedFraudDetection.completeAccountReview(reviewRequest.id, {
        reviewerId: 'admin-001',
        decision: 'suspend',
        notes: '确认存在作弊行为，暂停账户',
        actions: ['suspend_account', 'revoke_rewards', 'block_invites'],
      });

      expect(reviewResult.success).toBe(true);

      // 验证审核结果
      const completedReview = await advancedFraudDetection.getAccountReview(reviewRequest.id);
      expect(completedReview.status).toBe('completed');
      expect(completedReview.decision).toBe('suspend');

      logger.info('人工审核工作流测试通过', {
        userId,
        reviewId: reviewRequest.id,
        decision: completedReview.decision,
      });
    });

    it('应该实现账户冻结和奖励回收', async () => {
      const userId = 'user-freeze-001';

      // 先发放一些奖励
      await db.execute(`
        INSERT INTO reward_records (id, user_id, reward_type, reward_amount, source_type, source_id, granted_at)
        VALUES (?, ?, 'ai_credits', 100, 'invite_registration', 'test-001', CURRENT_TIMESTAMP)
      `, ['reward-001', userId]);

      // 冻结账户
      const freezeResult = await advancedFraudDetection.freezeAccount(userId, {
        reason: 'fraud_detected',
        description: '检测到作弊行为，冻结账户',
        duration: 30 * 24 * 60 * 60 * 1000, // 30天
        actions: ['freeze_invites', 'revoke_rewards', 'block_withdrawals'],
      });

      expect(freezeResult.success).toBe(true);

      // 验证账户状态
      const accountStatus = await advancedFraudDetection.getAccountStatus(userId);
      expect(accountStatus.isFrozen).toBe(true);
      expect(accountStatus.freezeReason).toBe('fraud_detected');

      // 验证奖励回收
      const revokedRewards = await db.query(
        'SELECT * FROM reward_records WHERE user_id = ? AND status = ?',
        [userId, 'revoked'],
      );

      expect(revokedRewards.length).toBeGreaterThan(0);

      // 解冻账户
      const unfreezeResult = await advancedFraudDetection.unfreezeAccount(userId, {
        reason: 'manual_review_completed',
        reviewerId: 'admin-002',
        notes: '经审核确认为误判，解冻账户',
      });

      expect(unfreezeResult.success).toBe(true);

      // 验证解冻后状态
      const unfrozenStatus = await advancedFraudDetection.getAccountStatus(userId);
      expect(unfrozenStatus.isFrozen).toBe(false);

      logger.info('账户冻结和奖励回收测试通过', {
        userId,
        revokedRewardsCount: revokedRewards.length,
      });
    });
  });

  describe('防作弊系统集成流程测试', () => {
    it('应该在完整邀请流程中集成防作弊检测', async () => {
      const inviterId = 'user-integrated-001';
      const inviteCode = await invitationService.generateInviteCode(inviterId);

      // 正常邀请应该通过
      const normalRegistration = await registrationHandler.handleInviteRegistration({
        inviteCode: inviteCode.code,
        inviteeId: 'user-normal-001',
        inviteeEmail: 'normal@example.com',
        ipAddress: '192.168.300.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      });

      expect(normalRegistration.success).toBe(true);

      // 可疑邀请应该被阻止或标记
      const suspiciousRegistration = await registrationHandler.handleInviteRegistration({
        inviteCode: inviteCode.code,
        inviteeId: 'user-suspicious-001',
        inviteeEmail: 'suspicious@example.com',
        ipAddress: '192.168.300.1', // 相同IP
        userAgent: 'SuspiciousBot/1.0', // 可疑用户代理
      });

      // 根据防作弊规则，可能被阻止或需要审核
      if (!suspiciousRegistration.success) {
        expect(suspiciousRegistration.errorCode).toBe('SUSPICIOUS_ACTIVITY');
      }

      // 验证防作弊日志记录
      const fraudLogs = await db.query(
        'SELECT * FROM fraud_detection_logs WHERE inviter_id = ?',
        [inviterId],
      );

      expect(fraudLogs.length).toBeGreaterThan(0);

      logger.info('防作弊系统集成流程测试通过', {
        inviterId,
        normalSuccess: normalRegistration.success,
        suspiciousSuccess: suspiciousRegistration.success,
        fraudLogsCount: fraudLogs.length,
      });
    });

    it('应该处理大规模并发防作弊检测', async () => {
      const inviterId = 'user-concurrent-fraud';
      const inviteCode = await invitationService.generateInviteCode(inviterId, { maxUsage: 50 });

      // 创建大量并发请求
      const concurrentRequests = Array.from({ length: 20 }, (_, i) =>
        fraudDetection.checkInviteRegistration({
          inviteCodeId: inviteCode.id,
          inviterId,
          inviteeId: `user-concurrent-${i}`,
          ipAddress: `192.168.400.${100 + (i % 10)}`, // 部分重复IP
          userAgent: i % 5 === 0 ? 'SuspiciousBot/1.0' : 'Mozilla/5.0 Test Browser',
          registrationTime: new Date(Date.now() + i * 100), // 短时间间隔
        }),
      );

      const results = await Promise.all(concurrentRequests);

      // 验证并发处理结果
      const allowedRequests = results.filter(r => r.action === FraudAction.ALLOW);
      const blockedRequests = results.filter(r => r.action === FraudAction.BLOCK);
      const suspiciousRequests = results.filter(r => r.isSuspicious);

      expect(results.length).toBe(20);
      expect(blockedRequests.length + suspiciousRequests.length).toBeGreaterThan(0);

      logger.info('大规模并发防作弊检测测试通过', {
        totalRequests: results.length,
        allowedRequests: allowedRequests.length,
        blockedRequests: blockedRequests.length,
        suspiciousRequests: suspiciousRequests.length,
      });
    });

    it('应该生成防作弊统计报告', async () => {
      const timeRange = {
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endDate: new Date(),
      };

      // 生成防作弊统计报告
      const fraudStats = await advancedFraudDetection.generateFraudStatistics(timeRange);

      expect(fraudStats).toBeDefined();
      expect(fraudStats.totalChecks).toBeGreaterThanOrEqual(0);
      expect(fraudStats.suspiciousActivities).toBeGreaterThanOrEqual(0);
      expect(fraudStats.blockedAttempts).toBeGreaterThanOrEqual(0);
      expect(fraudStats.riskDistribution).toBeDefined();

      // 验证风险分布统计
      expect(fraudStats.riskDistribution.low).toBeGreaterThanOrEqual(0);
      expect(fraudStats.riskDistribution.medium).toBeGreaterThanOrEqual(0);
      expect(fraudStats.riskDistribution.high).toBeGreaterThanOrEqual(0);

      logger.info('防作弊统计报告生成测试通过', {
        totalChecks: fraudStats.totalChecks,
        suspiciousActivities: fraudStats.suspiciousActivities,
        blockedAttempts: fraudStats.blockedAttempts,
      });
    });
  });
});
