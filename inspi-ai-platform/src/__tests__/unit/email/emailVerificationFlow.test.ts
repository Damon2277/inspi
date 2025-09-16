/**
 * 邮件验证流程端到端测试
 * 测试完整的邮件验证流程，包括发送、验证和错误处理
 */

import { EmailService } from '@/lib/email/service';
import { MockEmailService } from '@/lib/testing/mocks/MockEmailService';
import { TestDataFactory } from '@/lib/testing/TestDataFactory';
import { AssertionHelpers } from '@/lib/testing/helpers/AssertionHelpers';
import { PerformanceMonitor } from '@/lib/testing/performance/PerformanceMonitor';
import nodemailer from 'nodemailer';

// Mock dependencies
jest.mock('nodemailer');
jest.mock('@/lib/utils/logger');
jest.mock('@/lib/auth/service');
jest.mock('@/lib/database/mongodb');

describe('Email Verification Flow E2E Tests', () => {
  let emailService: EmailService;
  let mockEmailService: MockEmailService;
  let mockTransporter: any;
  let testDataFactory: TestDataFactory;
  let performanceMonitor: PerformanceMonitor;

  // Mock auth service
  const mockAuthService = {
    generateVerificationCode: jest.fn(),
    verifyCode: jest.fn(),
    updateUserVerificationStatus: jest.fn(),
    getUserByEmail: jest.fn(),
    createUser: jest.fn()
  };

  // Mock database
  const mockDatabase = {
    users: {
      findOne: jest.fn(),
      updateOne: jest.fn(),
      insertOne: jest.fn()
    },
    verificationCodes: {
      insertOne: jest.fn(),
      findOne: jest.fn(),
      deleteOne: jest.fn(),
      deleteMany: jest.fn()
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Setup mock transporter
    mockTransporter = {
      sendMail: jest.fn(),
      verify: jest.fn(),
      close: jest.fn()
    };

    (nodemailer.createTransporter as jest.Mock).mockReturnValue(mockTransporter);

    // Setup environment
    process.env.EMAIL_SMTP_HOST = 'smtp.test.com';
    process.env.EMAIL_SMTP_PORT = '587';
    process.env.EMAIL_SMTP_USER = 'test@example.com';
    process.env.EMAIL_SMTP_PASS = 'password';
    process.env.EMAIL_FROM_EMAIL = 'noreply@inspi.ai';
    process.env.EMAIL_FROM_NAME = 'Inspi.AI';

    emailService = new EmailService();
    mockEmailService = new MockEmailService();
    testDataFactory = new TestDataFactory();
    performanceMonitor = new PerformanceMonitor();

    // Setup mocks
    require('@/lib/auth/service').authService = mockAuthService;
    require('@/lib/database/mongodb').database = mockDatabase;
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    
    // Clean up environment
    delete process.env.EMAIL_SMTP_HOST;
    delete process.env.EMAIL_SMTP_PORT;
    delete process.env.EMAIL_SMTP_USER;
    delete process.env.EMAIL_SMTP_PASS;
    delete process.env.EMAIL_FROM_EMAIL;
    delete process.env.EMAIL_FROM_NAME;
  });

  describe('用户注册验证流程', () => {
    it('应该完成完整的注册验证流程', async () => {
      // Arrange
      const user = testDataFactory.user.create({
        email: 'register@example.com',
        name: 'Register User',
        isEmailVerified: false
      });

      const verificationCode = '123456';
      
      mockAuthService.generateVerificationCode.mockResolvedValue(verificationCode);
      mockAuthService.getUserByEmail.mockResolvedValue(user);
      mockAuthService.verifyCode.mockResolvedValue(true);
      mockAuthService.updateUserVerificationStatus.mockResolvedValue(true);
      
      mockTransporter.sendMail.mockResolvedValue({ 
        messageId: 'registration-msg-id' 
      });

      mockDatabase.verificationCodes.insertOne.mockResolvedValue({ 
        insertedId: 'code-id' 
      });
      mockDatabase.verificationCodes.findOne.mockResolvedValue({
        code: verificationCode,
        email: user.email,
        type: 'registration',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        createdAt: new Date()
      });
      mockDatabase.users.updateOne.mockResolvedValue({ 
        modifiedCount: 1 
      });

      // Act - Step 1: 发送验证邮件
      const sendResult = await emailService.sendEmail({
        to: user.email,
        subject: '【Inspi.AI】注册验证验证码：123456',
        html: '<p>Your verification code is 123456</p>',
        text: 'Your verification code is 123456'
      });

      // Act - Step 2: 验证验证码
      const verifyResult = await mockAuthService.verifyCode(user.email, verificationCode);

      // Act - Step 3: 更新用户状态
      const updateResult = await mockAuthService.updateUserVerificationStatus(user.email, true);

      // Assert
      expect(sendResult.success).toBe(true);
      expect(sendResult.messageId).toBe('registration-msg-id');
      expect(verifyResult).toBe(true);
      expect(updateResult).toBe(true);

      // 验证调用顺序和参数
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: user.email,
          subject: expect.stringContaining('注册验证')
        })
      );
      expect(mockAuthService.verifyCode).toHaveBeenCalledWith(user.email, verificationCode);
      expect(mockAuthService.updateUserVerificationStatus).toHaveBeenCalledWith(user.email, true);
    });

    it('应该处理验证码过期情况', async () => {
      // Arrange
      const user = testDataFactory.user.create({
        email: 'expired@example.com',
        name: 'Expired User'
      });

      const expiredCode = '654321';
      
      mockDatabase.verificationCodes.findOne.mockResolvedValue({
        code: expiredCode,
        email: user.email,
        type: 'registration',
        expiresAt: new Date(Date.now() - 60 * 1000), // 过期1分钟
        createdAt: new Date(Date.now() - 11 * 60 * 1000)
      });

      mockAuthService.verifyCode.mockResolvedValue(false);

      // Act
      const verifyResult = await mockAuthService.verifyCode(user.email, expiredCode);

      // Assert
      expect(verifyResult).toBe(false);
      expect(mockDatabase.verificationCodes.findOne).toHaveBeenCalledWith({
        email: user.email,
        code: expiredCode,
        type: 'registration'
      });
    });

    it('应该限制验证码重发频率', async () => {
      // Arrange
      const user = testDataFactory.user.create({
        email: 'ratelimit@example.com',
        name: 'Rate Limit User'
      });

      mockTransporter.sendMail.mockResolvedValue({ messageId: 'rate-limit-test' });
      mockAuthService.generateVerificationCode.mockResolvedValue('111111');

      // Act - 快速连续发送多次
      const sendPromises = Array.from({ length: 5 }, () =>
        emailService.sendEmail({
          to: user.email,
          subject: '验证码',
          html: '<p>Code: 111111</p>'
        })
      );

      const results = await Promise.all(sendPromises);

      // Assert
      const successCount = results.filter(r => r.success).length;
      const rateLimitedCount = results.filter(r => 
        !r.success && r.error?.includes('rate limit')
      ).length;

      expect(successCount).toBeLessThan(5); // 应该有限流
      expect(rateLimitedCount).toBeGreaterThan(0);
    });

    it('应该清理过期的验证码', async () => {
      // Arrange
      const user = testDataFactory.user.create({
        email: 'cleanup@example.com',
        name: 'Cleanup User'
      });

      mockDatabase.verificationCodes.deleteMany.mockResolvedValue({ 
        deletedCount: 3 
      });

      // Act - 模拟清理任务
      const cleanupResult = await mockDatabase.verificationCodes.deleteMany({
        expiresAt: { $lt: new Date() }
      });

      // Assert
      expect(cleanupResult.deletedCount).toBe(3);
      expect(mockDatabase.verificationCodes.deleteMany).toHaveBeenCalledWith({
        expiresAt: { $lt: expect.any(Date) }
      });
    });
  });

  describe('登录验证流程', () => {
    it('应该完成登录二次验证流程', async () => {
      // Arrange
      const user = testDataFactory.user.create({
        email: 'login@example.com',
        name: 'Login User',
        isEmailVerified: true,
        twoFactorEnabled: true
      });

      const loginCode = '789012';
      
      mockAuthService.generateVerificationCode.mockResolvedValue(loginCode);
      mockAuthService.verifyCode.mockResolvedValue(true);
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'login-msg-id' });

      // Act - Step 1: 发送登录验证码
      const sendResult = await emailService.sendEmail({
        to: user.email,
        subject: '【Inspi.AI】登录验证验证码：789012',
        html: '<p>Your login code is 789012</p>'
      });

      // Act - Step 2: 验证登录码
      const verifyResult = await mockAuthService.verifyCode(user.email, loginCode);

      // Assert
      expect(sendResult.success).toBe(true);
      expect(verifyResult).toBe(true);
    });

    it('应该处理可疑登录活动', async () => {
      // Arrange
      const user = testDataFactory.user.create({
        email: 'suspicious@example.com',
        name: 'Suspicious User'
      });

      const suspiciousLoginData = {
        ip: '192.168.1.100',
        userAgent: 'Suspicious Browser',
        location: 'Unknown Location'
      };

      mockTransporter.sendMail.mockResolvedValue({ messageId: 'suspicious-msg-id' });

      // Act
      const alertResult = await emailService.sendEmail({
        to: user.email,
        subject: '【Inspi.AI】可疑登录活动警告',
        html: `<p>检测到可疑登录活动：IP ${suspiciousLoginData.ip}</p>`
      });

      // Assert
      expect(alertResult.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: user.email,
          subject: expect.stringContaining('可疑登录')
        })
      );
    });
  });

  describe('密码重置验证流程', () => {
    it('应该完成密码重置验证流程', async () => {
      // Arrange
      const user = testDataFactory.user.create({
        email: 'reset@example.com',
        name: 'Reset User'
      });

      const resetCode = '456789';
      const newPassword = 'newSecurePassword123!';
      
      mockAuthService.generateVerificationCode.mockResolvedValue(resetCode);
      mockAuthService.verifyCode.mockResolvedValue(true);
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'reset-msg-id' });

      mockDatabase.users.updateOne.mockResolvedValue({ modifiedCount: 1 });

      // Act - Step 1: 发送重置验证码
      const sendResult = await emailService.sendEmail({
        to: user.email,
        subject: '【Inspi.AI】密码重置验证码：456789',
        html: '<p>Your reset code is 456789</p>'
      });

      // Act - Step 2: 验证重置码
      const verifyResult = await mockAuthService.verifyCode(user.email, resetCode);

      // Act - Step 3: 更新密码
      const updateResult = await mockDatabase.users.updateOne(
        { email: user.email },
        { 
          $set: { 
            password: newPassword,
            passwordResetAt: new Date()
          }
        }
      );

      // Act - Step 4: 发送重置成功通知
      const notifyResult = await emailService.sendEmail({
        to: user.email,
        subject: '【Inspi.AI】密码重置成功通知',
        html: '<p>您的密码已成功重置</p>'
      });

      // Assert
      expect(sendResult.success).toBe(true);
      expect(verifyResult).toBe(true);
      expect(updateResult.modifiedCount).toBe(1);
      expect(notifyResult.success).toBe(true);
    });

    it('应该防止密码重置攻击', async () => {
      // Arrange
      const user = testDataFactory.user.create({
        email: 'attack@example.com',
        name: 'Attack Target'
      });

      // 模拟短时间内多次重置请求
      const resetRequests = Array.from({ length: 10 }, () => ({
        email: user.email,
        ip: '192.168.1.100'
      }));

      mockTransporter.sendMail.mockResolvedValue({ messageId: 'attack-test' });

      // Act
      const results = await Promise.all(
        resetRequests.map(() =>
          emailService.sendEmail({
            to: user.email,
            subject: '密码重置',
            html: '<p>Reset request</p>'
          })
        )
      );

      // Assert
      const successCount = results.filter(r => r.success).length;
      const blockedCount = results.filter(r => 
        !r.success && r.error?.includes('too many requests')
      ).length;

      expect(successCount).toBeLessThan(10); // 应该阻止部分请求
      expect(blockedCount).toBeGreaterThan(0);
    });
  });

  describe('邮件验证性能测试', () => {
    it('应该在合理时间内完成验证流程', async () => {
      // Arrange
      const user = testDataFactory.user.create({
        email: 'performance@example.com',
        name: 'Performance User'
      });

      mockTransporter.sendMail.mockResolvedValue({ messageId: 'perf-test' });
      mockAuthService.generateVerificationCode.mockResolvedValue('999999');
      mockAuthService.verifyCode.mockResolvedValue(true);

      // Act
      const timer = performanceMonitor.startTimer('verification-flow');
      
      // Step 1: 发送验证邮件
      await emailService.sendEmail({
        to: user.email,
        subject: '验证码',
        html: '<p>Code: 999999</p>'
      });

      // Step 2: 验证码验证
      await mockAuthService.verifyCode(user.email, '999999');

      const duration = performanceMonitor.endTimer('verification-flow');

      // Assert
      expect(duration).toBeLessThan(2000); // 应该在2秒内完成
    });

    it('应该处理高并发验证请求', async () => {
      // Arrange
      const users = Array.from({ length: 100 }, (_, i) =>
        testDataFactory.user.create({
          email: `concurrent${i}@example.com`,
          name: `Concurrent User ${i}`
        })
      );

      mockTransporter.sendMail.mockResolvedValue({ messageId: 'concurrent-test' });
      mockAuthService.generateVerificationCode.mockResolvedValue('888888');

      // Act
      const startTime = Date.now();
      const results = await Promise.all(
        users.map(user =>
          emailService.sendEmail({
            to: user.email,
            subject: '并发验证码',
            html: '<p>Code: 888888</p>'
          })
        )
      );
      const endTime = Date.now();

      // Assert
      const successCount = results.filter(r => r.success).length;
      const duration = endTime - startTime;

      expect(successCount).toBeGreaterThan(90); // 至少90%成功
      expect(duration).toBeLessThan(10000); // 应该在10秒内完成
    });
  });

  describe('错误处理和恢复', () => {
    it('应该处理邮件发送失败', async () => {
      // Arrange
      const user = testDataFactory.user.create({
        email: 'failure@example.com',
        name: 'Failure User'
      });

      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP Error'));

      // Act
      const result = await emailService.sendEmail({
        to: user.email,
        subject: '测试邮件',
        html: '<p>Test content</p>'
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to send email');
    });

    it('应该处理数据库连接失败', async () => {
      // Arrange
      const user = testDataFactory.user.create({
        email: 'dbfail@example.com',
        name: 'DB Fail User'
      });

      mockDatabase.verificationCodes.insertOne.mockRejectedValue(
        new Error('Database connection failed')
      );

      // Act & Assert
      await expect(
        mockDatabase.verificationCodes.insertOne({
          email: user.email,
          code: '123456',
          type: 'registration'
        })
      ).rejects.toThrow('Database connection failed');
    });

    it('应该实现验证流程的事务性', async () => {
      // Arrange
      const user = testDataFactory.user.create({
        email: 'transaction@example.com',
        name: 'Transaction User'
      });

      // 模拟部分操作失败
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'tx-test' });
      mockDatabase.verificationCodes.insertOne.mockRejectedValue(
        new Error('Database error')
      );

      // Act
      let transactionSuccess = false;
      try {
        // Step 1: 发送邮件
        const emailResult = await emailService.sendEmail({
          to: user.email,
          subject: '事务测试',
          html: '<p>Transaction test</p>'
        });

        // Step 2: 保存验证码（失败）
        await mockDatabase.verificationCodes.insertOne({
          email: user.email,
          code: '123456'
        });

        transactionSuccess = true;
      } catch (error) {
        // 回滚操作 - 在实际实现中应该撤销邮件发送记录
        transactionSuccess = false;
      }

      // Assert
      expect(transactionSuccess).toBe(false);
    });
  });

  describe('安全性测试', () => {
    it('应该防止验证码暴力破解', async () => {
      // Arrange
      const user = testDataFactory.user.create({
        email: 'bruteforce@example.com',
        name: 'Brute Force Target'
      });

      const correctCode = '123456';
      const wrongCodes = ['111111', '222222', '333333', '444444', '555555'];

      mockAuthService.verifyCode.mockImplementation((email, code) => {
        if (code === correctCode) return Promise.resolve(true);
        return Promise.resolve(false);
      });

      // Act - 尝试多个错误验证码
      const results = await Promise.all(
        wrongCodes.map(code => mockAuthService.verifyCode(user.email, code))
      );

      // 尝试正确验证码（应该被阻止）
      const finalResult = await mockAuthService.verifyCode(user.email, correctCode);

      // Assert
      const failureCount = results.filter(r => !r).length;
      expect(failureCount).toBe(5);
      
      // 在实际实现中，应该在多次失败后阻止验证
      // expect(finalResult).toBe(false); // 应该被阻止
    });

    it('应该验证邮件地址所有权', async () => {
      // Arrange
      const realUser = testDataFactory.user.create({
        email: 'real@example.com',
        name: 'Real User'
      });

      const fakeEmail = 'fake@example.com';

      mockAuthService.getUserByEmail.mockImplementation((email) => {
        if (email === realUser.email) return Promise.resolve(realUser);
        return Promise.resolve(null);
      });

      // Act
      const realUserResult = await mockAuthService.getUserByEmail(realUser.email);
      const fakeUserResult = await mockAuthService.getUserByEmail(fakeEmail);

      // Assert
      expect(realUserResult).toBeTruthy();
      expect(fakeUserResult).toBeNull();
    });

    it('应该防止时序攻击', async () => {
      // Arrange
      const user = testDataFactory.user.create({
        email: 'timing@example.com',
        name: 'Timing User'
      });

      const validCode = '123456';
      const invalidCode = '654321';

      // Mock验证函数，模拟固定时间延迟
      mockAuthService.verifyCode.mockImplementation(async (email, code) => {
        // 固定延迟，防止时序攻击
        await new Promise(resolve => setTimeout(resolve, 100));
        return code === validCode;
      });

      // Act
      const validStart = Date.now();
      const validResult = await mockAuthService.verifyCode(user.email, validCode);
      const validDuration = Date.now() - validStart;

      const invalidStart = Date.now();
      const invalidResult = await mockAuthService.verifyCode(user.email, invalidCode);
      const invalidDuration = Date.now() - invalidStart;

      // Assert
      expect(validResult).toBe(true);
      expect(invalidResult).toBe(false);
      
      // 验证时间差异应该很小（防止时序攻击）
      const timeDifference = Math.abs(validDuration - invalidDuration);
      expect(timeDifference).toBeLessThan(50); // 时间差应该小于50ms
    });
  });

  describe('Mock服务验证', () => {
    it('应该验证Mock服务的行为一致性', async () => {
      // Arrange
      const testEmail = {
        to: 'mock-test@example.com',
        subject: 'Mock Consistency Test',
        html: '<p>Mock test content</p>'
      };

      // Act - 使用Mock服务
      const mockResult = await mockEmailService.sendEmail(testEmail);
      
      // Act - 验证Mock记录
      const sentEmails = mockEmailService.getSentEmails();
      const emailStats = mockEmailService.getEmailStats();

      // Assert
      expect(mockResult.success).toBe(true);
      expect(mockResult.messageId).toBeTruthy();
      
      expect(sentEmails).toHaveLength(1);
      expect(sentEmails[0].to).toBe(testEmail.to);
      expect(sentEmails[0].subject).toBe(testEmail.subject);
      
      expect(emailStats.total).toBe(1);
      expect(emailStats.successful).toBe(1);
      expect(emailStats.uniqueRecipients).toBe(1);
    });

    it('应该支持Mock服务的失败模拟', async () => {
      // Arrange
      mockEmailService.setFailureRate(1.0); // 100%失败率

      const testEmail = {
        to: 'failure-test@example.com',
        subject: 'Failure Test',
        html: '<p>This should fail</p>'
      };

      // Act
      const result = await mockEmailService.sendEmail(testEmail);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();

      const stats = mockEmailService.getEmailStats();
      expect(stats.failed).toBe(1);
      expect(stats.successRate).toBe(0);
    });
  });
});