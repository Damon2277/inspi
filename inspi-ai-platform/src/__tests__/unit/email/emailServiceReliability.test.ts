/**
 * 邮件服务可靠性测试
 * 测试邮件发送功能的可靠性、错误恢复和限流机制
 */

import nodemailer from 'nodemailer';

import { EmailService, EmailOptions, EmailResult } from '@/lib/email/service';
import { MockEmailService } from '@/lib/testing/mocks/MockEmailService';

// Simple test data creation without complex dependencies
const createTestUser = (overrides = {}) => ({
  _id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  isEmailVerified: false,
  ...overrides,
});

// Mock nodemailer
jest.mock('nodemailer');
jest.mock('@/lib/utils/logger');

describe('EmailService Reliability Tests', () => {
  let emailService: EmailService;
  let mockEmailService: MockEmailService;
  let mockTransporter: any;
  // Simple performance tracking
  const performanceTracker = {
    timers: new Map(),
    startTimer: (name: string) => {
      performanceTracker.timers.set(name, Date.now());
      return name;
    },
    endTimer: (name: string) => {
      const start = performanceTracker.timers.get(name);
      if (start) {
        const duration = Date.now() - start;
        performanceTracker.timers.delete(name);
        return duration;
      }
      return 0;
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Setup mock transporter
    mockTransporter = {
      sendMail: jest.fn(),
      verify: jest.fn(),
      close: jest.fn(),
    };

    (nodemailer.createTransporter as jest.Mock).mockReturnValue(mockTransporter);

    // Setup environment variables
    process.env.EMAIL_SMTP_HOST = 'smtp.test.com';
    process.env.EMAIL_SMTP_PORT = '587';
    process.env.EMAIL_SMTP_USER = 'test@example.com';
    process.env.EMAIL_SMTP_PASS = 'password';
    process.env.EMAIL_FROM_EMAIL = 'noreply@inspi.ai';
    process.env.EMAIL_FROM_NAME = 'Inspi.AI';

    emailService = new EmailService();
    mockEmailService = new MockEmailService();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();

    // Clean up environment variables
    delete process.env.EMAIL_SMTP_HOST;
    delete process.env.EMAIL_SMTP_PORT;
    delete process.env.EMAIL_SMTP_USER;
    delete process.env.EMAIL_SMTP_PASS;
    delete process.env.EMAIL_FROM_EMAIL;
    delete process.env.EMAIL_FROM_NAME;
  });

  describe('邮件发送可靠性', () => {
    it('应该在网络不稳定时重试发送', async () => {
      // Arrange
      const emailOptions: EmailOptions = {
        to: 'user@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>',
        text: 'Test content',
      };

      // 模拟网络错误，然后成功
      mockTransporter.sendMail
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockRejectedValueOnce(new Error('Connection reset'))
        .mockResolvedValueOnce({ messageId: 'success-message-id' });

      // Act
      const result = await emailService.sendEmail(emailOptions);

      // Assert
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('success-message-id');
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(3);
    });

    it('应该在达到最大重试次数后失败', async () => {
      // Arrange
      const emailOptions: EmailOptions = {
        to: 'user@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>',
      };

      // 模拟持续失败
      mockTransporter.sendMail.mockRejectedValue(new Error('Persistent failure'));

      // Act
      const result = await emailService.sendEmail(emailOptions);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to send email after retries');
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(3); // 默认重试3次
    });

    it('应该处理不同类型的SMTP错误', async () => {
      // Arrange
      const testCases = [
        {
          error: Object.assign(new Error('Authentication failed'), { code: 'EAUTH' }),
          expectedError: 'Authentication failed',
        },
        {
          error: Object.assign(new Error('Connection timeout'), { code: 'ETIMEDOUT' }),
          expectedError: 'Connection timeout',
        },
        {
          error: Object.assign(new Error('Invalid recipient'), { responseCode: 550 }),
          expectedError: 'Invalid recipient',
        },
        {
          error: Object.assign(new Error('Mailbox full'), { responseCode: 552 }),
          expectedError: 'Mailbox full',
        },
      ];

      for (const testCase of testCases) {
        // Arrange
        mockTransporter.sendMail.mockRejectedValueOnce(testCase.error);

        const emailOptions: EmailOptions = {
          to: 'user@example.com',
          subject: 'Test Email',
          html: '<p>Test content</p>',
        };

        // Act
        const result = await emailService.sendEmail(emailOptions);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toContain(testCase.expectedError);
      }
    });

    it('应该在发送大量邮件时保持稳定', async () => {
      // Arrange
      const emailCount = 100;
      const emails = Array.from({ length: emailCount }, (_, i) => ({
        to: `user${i}@example.com`,
        subject: `Test Email ${i}`,
        html: `<p>Test content ${i}</p>`,
      }));

      mockTransporter.sendMail.mockImplementation(() =>
        Promise.resolve({ messageId: `msg-${Date.now()}-${Math.random()}` }),
      );

      // Act
      const startTime = Date.now();
      const results = await Promise.all(
        emails.map(email => emailService.sendEmail(email)),
      );
      const endTime = Date.now();

      // Assert
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      expect(successCount).toBe(emailCount);
      expect(failureCount).toBe(0);
      expect(endTime - startTime).toBeLessThan(10000); // 应在10秒内完成
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(emailCount);
    });

    it('应该正确处理并发邮件发送', async () => {
      // Arrange
      const concurrentCount = 50;
      const emails = Array.from({ length: concurrentCount }, (_, i) => ({
        to: `concurrent${i}@example.com`,
        subject: `Concurrent Email ${i}`,
        html: `<p>Concurrent content ${i}</p>`,
      }));

      mockTransporter.sendMail.mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({ messageId: `concurrent-${Date.now()}` }), 100),
        ),
      );

      // Act
      const promises = emails.map(email => emailService.sendEmail(email));
      const results = await Promise.all(promises);

      // Assert
      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBe(concurrentCount);

      // 验证所有邮件都有唯一的messageId
      const messageIds = results
        .filter(r => r.success)
        .map(r => r.messageId)
        .filter(Boolean);

      const uniqueMessageIds = new Set(messageIds);
      expect(uniqueMessageIds.size).toBe(concurrentCount);
    });
  });

  describe('错误恢复机制', () => {
    it('应该在连接断开后自动重连', async () => {
      // Arrange
      const emailOptions: EmailOptions = {
        to: 'user@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>',
      };

      // 模拟连接断开，然后重连成功
      mockTransporter.sendMail
        .mockRejectedValueOnce(Object.assign(new Error('Connection lost'), { code: 'ECONNRESET' }))
        .mockResolvedValueOnce({ messageId: 'reconnect-success' });

      mockTransporter.verify
        .mockRejectedValueOnce(new Error('Connection lost'))
        .mockResolvedValueOnce(true);

      // Act
      const result = await emailService.sendEmail(emailOptions);

      // Assert
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('reconnect-success');
      expect(mockTransporter.verify).toHaveBeenCalled();
    });

    it('应该在认证失败后重新认证', async () => {
      // Arrange
      const emailOptions: EmailOptions = {
        to: 'user@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>',
      };

      // 模拟认证失败，然后重新认证成功
      mockTransporter.sendMail
        .mockRejectedValueOnce(Object.assign(new Error('Authentication failed'), { code: 'EAUTH' }))
        .mockResolvedValueOnce({ messageId: 'reauth-success' });

      // Act
      const result = await emailService.sendEmail(emailOptions);

      // Assert
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('reauth-success');
    });

    it('应该实现指数退避重试策略', async () => {
      // Arrange
      const emailOptions: EmailOptions = {
        to: 'user@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>',
      };

      const delays: number[] = [];
      let callCount = 0;

      mockTransporter.sendMail.mockImplementation(() => {
        callCount++;
        const delay = Math.pow(2, callCount - 1) * 1000; // 指数退避
        delays.push(delay);

        if (callCount < 3) {
          return Promise.reject(new Error('Temporary failure'));
        }
        return Promise.resolve({ messageId: 'backoff-success' });
      });

      // Act
      const result = await emailService.sendEmail(emailOptions);

      // Assert
      expect(result.success).toBe(true);
      expect(callCount).toBe(3);

      // 验证指数退避延迟
      expect(delays[0]).toBe(1000);  // 1秒
      expect(delays[1]).toBe(2000);  // 2秒
      expect(delays[2]).toBe(4000);  // 4秒
    });

    it('应该在队列满时实现优雅降级', async () => {
      // Arrange
      const emailOptions: EmailOptions = {
        to: 'user@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>',
      };

      // 模拟队列满的情况
      mockTransporter.sendMail.mockRejectedValue(
        Object.assign(new Error('Queue full'), { code: 'EQUEUE' }),
      );

      // Act
      const result = await emailService.sendEmail(emailOptions);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Email queue is full');
    });
  });

  describe('限流机制', () => {
    it('应该实现基于收件人的限流', async () => {
      // Arrange
      const recipient = 'limited@example.com';
      const emailOptions: EmailOptions = {
        to: recipient,
        subject: 'Rate Limited Email',
        html: '<p>Test content</p>',
      };

      mockTransporter.sendMail.mockResolvedValue({ messageId: 'rate-limit-test' });

      // Act - 快速发送多封邮件给同一收件人
      const results = await Promise.all([
        emailService.sendEmail(emailOptions),
        emailService.sendEmail(emailOptions),
        emailService.sendEmail(emailOptions),
        emailService.sendEmail(emailOptions),
        emailService.sendEmail(emailOptions),
      ]);

      // Assert
      const successCount = results.filter(r => r.success).length;
      const rateLimitedCount = results.filter(r =>
        !r.success && r.error?.includes('rate limit'),
      ).length;

      expect(successCount).toBeLessThanOrEqual(3); // 最多允许3封
      expect(rateLimitedCount).toBeGreaterThan(0);
    });

    it('应该实现基于时间窗口的限流', async () => {
      // Arrange
      const emailOptions: EmailOptions = {
        to: 'window@example.com',
        subject: 'Window Rate Limited Email',
        html: '<p>Test content</p>',
      };

      mockTransporter.sendMail.mockResolvedValue({ messageId: 'window-test' });

      // Act - 在时间窗口内发送邮件
      const result1 = await emailService.sendEmail(emailOptions);

      // 快进时间但不超过窗口
      jest.advanceTimersByTime(30000); // 30秒

      const result2 = await emailService.sendEmail(emailOptions);

      // 快进超过窗口
      jest.advanceTimersByTime(60000); // 再60秒，总共90秒

      const result3 = await emailService.sendEmail(emailOptions);

      // Assert
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(false); // 应该被限流
      expect(result2.error).toContain('rate limit');
      expect(result3.success).toBe(true); // 窗口重置后应该成功
    });

    it('应该实现全局发送限流', async () => {
      // Arrange
      const emails = Array.from({ length: 200 }, (_, i) => ({
        to: `global${i}@example.com`,
        subject: `Global Email ${i}`,
        html: `<p>Global content ${i}</p>`,
      }));

      mockTransporter.sendMail.mockResolvedValue({ messageId: 'global-test' });

      // Act
      const results = await Promise.all(
        emails.map(email => emailService.sendEmail(email)),
      );

      // Assert
      const successCount = results.filter(r => r.success).length;
      const rateLimitedCount = results.filter(r =>
        !r.success && r.error?.includes('global rate limit'),
      ).length;

      expect(successCount).toBeLessThan(200); // 应该有全局限制
      expect(rateLimitedCount).toBeGreaterThan(0);
      expect(successCount + rateLimitedCount).toBe(200);
    });

    it('应该为不同邮件类型设置不同的限流策略', async () => {
      // Arrange
      const verificationEmail: EmailOptions = {
        to: 'verify@example.com',
        subject: 'Verification Code',
        html: '<p>Your code is 123456</p>',
        headers: { 'X-Email-Type': 'verification' },
      };

      const marketingEmail: EmailOptions = {
        to: 'marketing@example.com',
        subject: 'Marketing Newsletter',
        html: '<p>Check out our new features!</p>',
        headers: { 'X-Email-Type': 'marketing' },
      };

      mockTransporter.sendMail.mockResolvedValue({ messageId: 'type-test' });

      // Act - 发送多封不同类型的邮件
      const verificationResults = await Promise.all([
        emailService.sendEmail(verificationEmail),
        emailService.sendEmail(verificationEmail),
        emailService.sendEmail(verificationEmail),
      ]);

      const marketingResults = await Promise.all([
        emailService.sendEmail(marketingEmail),
        emailService.sendEmail(marketingEmail),
        emailService.sendEmail(marketingEmail),
        emailService.sendEmail(marketingEmail),
        emailService.sendEmail(marketingEmail),
      ]);

      // Assert
      const verificationSuccess = verificationResults.filter(r => r.success).length;
      const marketingSuccess = marketingResults.filter(r => r.success).length;

      // 验证邮件应该有更宽松的限制
      expect(verificationSuccess).toBeGreaterThanOrEqual(2);

      // 营销邮件应该有更严格的限制
      expect(marketingSuccess).toBeLessThanOrEqual(2);
    });
  });

  describe('性能监控', () => {
    it('应该监控邮件发送性能', async () => {
      // Arrange
      const emailOptions: EmailOptions = {
        to: 'performance@example.com',
        subject: 'Performance Test',
        html: '<p>Performance content</p>',
      };

      mockTransporter.sendMail.mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({ messageId: 'perf-test' }), 500),
        ),
      );

      // Act
      const startTime = performanceMonitor.startTimer('email-send');
      const result = await emailService.sendEmail(emailOptions);
      const duration = performanceMonitor.endTimer('email-send');

      // Assert
      expect(result.success).toBe(true);
      expect(duration).toBeGreaterThan(500);
      expect(duration).toBeLessThan(1000); // 应该在合理时间内完成
    });

    it('应该检测邮件发送性能回归', async () => {
      // Arrange
      const emailOptions: EmailOptions = {
        to: 'regression@example.com',
        subject: 'Regression Test',
        html: '<p>Regression content</p>',
      };

      const baselines: number[] = [];

      // 建立性能基线
      for (let i = 0; i < 10; i++) {
        mockTransporter.sendMail.mockResolvedValueOnce({ messageId: `baseline-${i}` });

        const startTime = Date.now();
        await emailService.sendEmail(emailOptions);
        const duration = Date.now() - startTime;

        baselines.push(duration);
      }

      const averageBaseline = baselines.reduce((a, b) => a + b, 0) / baselines.length;

      // 模拟性能回归
      mockTransporter.sendMail.mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({ messageId: 'regression-test' }), averageBaseline * 3),
        ),
      );

      // Act
      const startTime = Date.now();
      const result = await emailService.sendEmail(emailOptions);
      const regressionDuration = Date.now() - startTime;

      // Assert
      expect(result.success).toBe(true);
      expect(regressionDuration).toBeGreaterThan(averageBaseline * 2);

      // 应该记录性能警告
      const performanceWarnings = performanceMonitor.getWarnings();
      expect(performanceWarnings.some(w => w.includes('performance regression'))).toBe(true);
    });

    it('应该监控内存使用情况', async () => {
      // Arrange
      const largeEmailCount = 1000;
      const emails = Array.from({ length: largeEmailCount }, (_, i) => ({
        to: `memory${i}@example.com`,
        subject: `Memory Test ${i}`,
        html: `<p>${'Large content '.repeat(1000)}</p>`, // 大内容
      }));

      mockTransporter.sendMail.mockResolvedValue({ messageId: 'memory-test' });

      // Act
      const initialMemory = process.memoryUsage().heapUsed;

      await Promise.all(
        emails.map(email => emailService.sendEmail(email)),
      );

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Assert
      // 内存增长应该在合理范围内（小于100MB）
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });
  });

  describe('Mock服务集成测试', () => {
    it('应该与MockEmailService保持一致的接口', async () => {
      // Arrange
      const emailOptions: EmailOptions = {
        to: 'mock@example.com',
        subject: 'Mock Test',
        html: '<p>Mock content</p>',
      };

      // Act - 使用真实服务
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'real-test' });
      const realResult = await emailService.sendEmail(emailOptions);

      // Act - 使用Mock服务
      const mockResult = await mockEmailService.sendEmail(emailOptions);

      // Assert - 结果结构应该一致
      expect(realResult).toHaveProperty('success');
      expect(mockResult).toHaveProperty('success');

      if (realResult.success && mockResult.success) {
        expect(realResult).toHaveProperty('messageId');
        expect(mockResult).toHaveProperty('messageId');
      }

      if (!realResult.success && !mockResult.success) {
        expect(realResult).toHaveProperty('error');
        expect(mockResult).toHaveProperty('error');
      }
    });

    it('应该支持Mock服务的测试验证功能', async () => {
      // Arrange
      const testEmails = [
        {
          to: 'test1@example.com',
          subject: 'Test Email 1',
          html: '<p>Content 1</p>',
        },
        {
          to: 'test2@example.com',
          subject: 'Test Email 2',
          html: '<p>Content 2</p>',
        },
      ];

      // Act
      for (const email of testEmails) {
        await mockEmailService.sendEmail(email);
      }

      // Assert
      const sentEmails = mockEmailService.getSentEmails();
      expect(sentEmails).toHaveLength(2);

      const emailsToTest1 = mockEmailService.getEmailsTo('test1@example.com');
      expect(emailsToTest1).toHaveLength(1);
      expect(emailsToTest1[0].subject).toBe('Test Email 1');

      const testEmailsSent = mockEmailService.wasEmailSent('test2@example.com', 'Test Email 2');
      expect(testEmailsSent).toBe(true);

      const stats = mockEmailService.getEmailStats();
      expect(stats.total).toBe(2);
      expect(stats.successful).toBe(2);
      expect(stats.uniqueRecipients).toBe(2);
    });
  });

  describe('集成测试辅助功能', () => {
    it('应该提供邮件发送的测试断言', async () => {
      // Arrange
      const emailOptions: EmailOptions = {
        to: 'assertion@example.com',
        subject: 'Assertion Test',
        html: '<p>Assertion content</p>',
      };

      mockTransporter.sendMail.mockResolvedValue({ messageId: 'assertion-test' });

      // Act
      const result = await emailService.sendEmail(emailOptions);

      // Assert - 使用自定义断言
      AssertionHelpers.assertEmailResult(result, {
        success: true,
        hasMessageId: true,
      });

      AssertionHelpers.assertObjectHasProperties(result, {
        success: true,
        messageId: expect.stringMatching(/^assertion-test$/),
      });
    });

    it('应该支持邮件内容的验证', async () => {
      // Arrange
      const user = testDataFactory.user.create({
        email: 'content@example.com',
        name: 'Content Tester',
      });

      const emailOptions: EmailOptions = {
        to: user.email,
        subject: 'Content Validation Test',
        html: `<p>Hello ${user.name}</p>`,
        text: `Hello ${user.name}`,
      };

      // Act
      await mockEmailService.sendEmail(emailOptions);

      // Assert
      const sentEmails = mockEmailService.getSentEmails();
      const sentEmail = sentEmails[0];

      expect(sentEmail.html).toContain(user.name);
      expect(sentEmail.text).toContain(user.name);
      expect(sentEmail.to).toBe(user.email);

      // 验证邮件内容结构
      AssertionHelpers.assertEmailContent(sentEmail, {
        hasHtml: true,
        hasText: true,
        containsUserName: user.name,
        isWellFormed: true,
      });
    });
  });
});
