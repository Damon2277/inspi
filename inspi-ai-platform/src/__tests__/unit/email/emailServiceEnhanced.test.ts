/**
 * 邮件服务增强测试
 * 专注于邮件服务的核心功能测试，避免复杂依赖
 */

import nodemailer from 'nodemailer';

import { EmailService, EmailOptions, EmailResult } from '@/lib/email/service';
import { MockEmailService } from '@/lib/testing/mocks/MockEmailService';

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransporter: jest.fn(),
}));
jest.mock('@/lib/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('Enhanced Email Service Tests', () => {
  let emailService: EmailService;
  let mockEmailService: MockEmailService;
  let mockTransporter: any;

  // Simple test data helpers
  const createTestUser = (overrides = {}) => ({
    _id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    isEmailVerified: false,
    ...overrides,
  });

  const createEmailOptions = (overrides: Partial<EmailOptions> = {}): EmailOptions => ({
    to: 'test@example.com',
    subject: 'Test Email',
    html: '<p>Test content</p>',
    text: 'Test content',
    ...overrides,
  });

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
    it('应该成功发送基本邮件', async () => {
      // Arrange
      const emailOptions = createEmailOptions();
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

      // Act
      const result = await emailService.sendEmail(emailOptions);

      // Assert
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test-message-id');
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: emailOptions.to,
          subject: emailOptions.subject,
          html: emailOptions.html,
        }),
      );
    });

    it('应该处理邮件发送失败', async () => {
      // Arrange
      const emailOptions = createEmailOptions();
      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP Error'));

      // Act
      const result = await emailService.sendEmail(emailOptions);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('SMTP Error');
    });

    it('应该验证邮件地址格式', async () => {
      // Arrange
      const invalidEmailOptions = createEmailOptions({
        to: 'invalid-email',
      });

      // Act
      const result = await emailService.sendEmail(invalidEmailOptions);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid email');
    });

    it('应该处理多个收件人', async () => {
      // Arrange
      const emailOptions = createEmailOptions({
        to: ['user1@example.com', 'user2@example.com'],
      });
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'multi-test' });

      // Act
      const result = await emailService.sendEmail(emailOptions);

      // Assert
      expect(result.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user1@example.com, user2@example.com',
        }),
      );
    });

    it('应该支持邮件附件', async () => {
      // Arrange
      const emailOptions = createEmailOptions({
        attachments: [{
          filename: 'test.txt',
          content: 'Test attachment content',
        }],
      });
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'attachment-test' });

      // Act
      const result = await emailService.sendEmail(emailOptions);

      // Assert
      expect(result.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: expect.arrayContaining([
            expect.objectContaining({
              filename: 'test.txt',
              content: 'Test attachment content',
            }),
          ]),
        }),
      );
    });
  });

  describe('连接管理', () => {
    it('应该验证SMTP连接', async () => {
      // Arrange
      mockTransporter.verify.mockResolvedValue(true);

      // Act
      const result = await emailService.verifyConnection();

      // Assert
      expect(result).toBe(true);
      expect(mockTransporter.verify).toHaveBeenCalled();
    });

    it('应该处理连接验证失败', async () => {
      // Arrange
      mockTransporter.verify.mockRejectedValue(new Error('Connection failed'));

      // Act
      const result = await emailService.verifyConnection();

      // Assert
      expect(result).toBe(false);
    });

    it('应该提供健康检查', async () => {
      // Arrange
      mockTransporter.verify.mockResolvedValue(true);

      // Act
      const result = await emailService.healthCheck();

      // Assert
      expect(result).toBe(true);
    });

    it('应该返回服务状态', () => {
      // Act
      const status = emailService.getStatus();

      // Assert
      expect(status).toHaveProperty('configured');
      expect(status).toHaveProperty('host');
      expect(status).toHaveProperty('port');
      expect(status).toHaveProperty('user');
      expect(status).toHaveProperty('fromEmail');
      expect(status).toHaveProperty('fromName');
    });
  });

  describe('错误处理', () => {
    it('应该处理不同类型的SMTP错误', async () => {
      // Arrange
      const testCases = [
        {
          error: Object.assign(new Error('Authentication failed'), { code: 'EAUTH' }),
          expectedInError: 'Authentication failed',
        },
        {
          error: Object.assign(new Error('Connection timeout'), { code: 'ETIMEDOUT' }),
          expectedInError: 'Connection timeout',
        },
        {
          error: Object.assign(new Error('Invalid recipient'), { responseCode: 550 }),
          expectedInError: 'Invalid recipient',
        },
      ];

      for (const testCase of testCases) {
        // Arrange
        mockTransporter.sendMail.mockRejectedValueOnce(testCase.error);
        const emailOptions = createEmailOptions();

        // Act
        const result = await emailService.sendEmail(emailOptions);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toContain(testCase.expectedInError);
      }
    });

    it('应该处理未配置的邮件服务', async () => {
      // Arrange
      delete process.env.EMAIL_SMTP_HOST;
      const unconfiguredService = new EmailService();
      const emailOptions = createEmailOptions();

      // Act
      const result = await unconfiguredService.sendEmail(emailOptions);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('not configured');
    });
  });

  describe('Mock服务集成', () => {
    it('应该与MockEmailService保持接口一致', async () => {
      // Arrange
      const emailOptions = createEmailOptions();
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'real-test' });

      // Act - 使用真实服务
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
    });

    it('应该支持Mock服务的测试验证功能', async () => {
      // Arrange
      const testEmails = [
        createEmailOptions({ to: 'test1@example.com', subject: 'Test Email 1' }),
        createEmailOptions({ to: 'test2@example.com', subject: 'Test Email 2' }),
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

    it('应该支持Mock服务的失败模拟', async () => {
      // Arrange
      mockEmailService.setFailureRate(1.0); // 100%失败率
      const emailOptions = createEmailOptions();

      // Act
      const result = await mockEmailService.sendEmail(emailOptions);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();

      const stats = mockEmailService.getEmailStats();
      expect(stats.failed).toBe(1);
      expect(stats.successRate).toBe(0);
    });

    it('应该支持Mock服务的延迟模拟', async () => {
      // Arrange
      mockEmailService.setDelay(100); // 100ms延迟
      const emailOptions = createEmailOptions();

      // Act
      const startTime = Date.now();
      const result = await mockEmailService.sendEmail(emailOptions);
      const duration = Date.now() - startTime;

      // Assert
      expect(result.success).toBe(true);
      expect(duration).toBeGreaterThanOrEqual(100);
    });
  });

  describe('性能测试', () => {
    it('应该在合理时间内发送邮件', async () => {
      // Arrange
      const emailOptions = createEmailOptions();
      mockTransporter.sendMail.mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({ messageId: 'perf-test' }), 100),
        ),
      );

      // Act
      const startTime = Date.now();
      const result = await emailService.sendEmail(emailOptions);
      const duration = Date.now() - startTime;

      // Assert
      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(1000); // 应该在1秒内完成
    });

    it('应该处理并发邮件发送', async () => {
      // Arrange
      const emailCount = 10;
      const emails = Array.from({ length: emailCount }, (_, i) =>
        createEmailOptions({
          to: `concurrent${i}@example.com`,
          subject: `Concurrent Email ${i}`,
        }),
      );

      mockTransporter.sendMail.mockImplementation(() =>
        Promise.resolve({ messageId: `concurrent-${Date.now()}` }),
      );

      // Act
      const results = await Promise.all(
        emails.map(email => emailService.sendEmail(email)),
      );

      // Assert
      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBe(emailCount);

      // 验证所有邮件都有唯一的messageId
      const messageIds = results
        .filter(r => r.success)
        .map(r => r.messageId)
        .filter(Boolean);

      const uniqueMessageIds = new Set(messageIds);
      expect(uniqueMessageIds.size).toBe(emailCount);
    });
  });

  describe('配置管理', () => {
    it('应该使用正确的SMTP配置', () => {
      // Act
      const status = emailService.getStatus();

      // Assert
      expect(status.host).toBe('smtp.test.com');
      expect(status.port).toBe(587);
      expect(status.user).toContain('test@example.com');
      expect(status.fromEmail).toBe('noreply@inspi.ai');
      expect(status.fromName).toBe('Inspi.AI');
    });

    it('应该处理安全连接配置', () => {
      // Arrange
      process.env.EMAIL_SMTP_PORT = '465';
      const secureService = new EmailService();

      // Act
      const status = secureService.getStatus();

      // Assert
      expect(status.port).toBe(465);
      expect(nodemailer.createTransporter).toHaveBeenCalledWith(
        expect.objectContaining({
          port: 465,
          secure: true,
        }),
      );
    });
  });

  describe('邮件内容验证', () => {
    it('应该设置正确的发件人信息', async () => {
      // Arrange
      const emailOptions = createEmailOptions();
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'sender-test' });

      // Act
      await emailService.sendEmail(emailOptions);

      // Assert
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'Inspi.AI <noreply@inspi.ai>',
        }),
      );
    });

    it('应该正确处理HTML和文本内容', async () => {
      // Arrange
      const emailOptions = createEmailOptions({
        html: '<h1>HTML Content</h1>',
        text: 'Text Content',
      });
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'content-test' });

      // Act
      await emailService.sendEmail(emailOptions);

      // Assert
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: '<h1>HTML Content</h1>',
          text: 'Text Content',
        }),
      );
    });

    it('应该验证必需的邮件字段', async () => {
      // Arrange
      const testCases = [
        { to: '', subject: 'Test', html: '<p>Test</p>' }, // 空收件人
        { to: 'test@example.com', subject: '', html: '<p>Test</p>' }, // 空主题
        { to: 'test@example.com', subject: 'Test', html: '', text: '' }, // 空内容
      ];

      for (const testCase of testCases) {
        // Act
        const result = await emailService.sendEmail(testCase as EmailOptions);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBeTruthy();
      }
    });
  });

  describe('日志和监控', () => {
    it('应该记录成功的邮件发送', async () => {
      // Arrange
      const emailOptions = createEmailOptions();
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'log-test' });

      // Mock logger
      const mockLogger = require('@/lib/utils/logger');
      mockLogger.logger = {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
      };

      // Act
      await emailService.sendEmail(emailOptions);

      // Assert
      expect(mockLogger.logger.info).toHaveBeenCalledWith(
        'Email sent successfully',
        expect.objectContaining({
          to: emailOptions.to,
          subject: emailOptions.subject,
          messageId: 'log-test',
        }),
      );
    });

    it('应该记录邮件发送失败', async () => {
      // Arrange
      const emailOptions = createEmailOptions();
      const error = new Error('Send failed');
      mockTransporter.sendMail.mockRejectedValue(error);

      // Mock logger
      const mockLogger = require('@/lib/utils/logger');
      mockLogger.logger = {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
      };

      // Act
      await emailService.sendEmail(emailOptions);

      // Assert
      expect(mockLogger.logger.error).toHaveBeenCalledWith(
        'Failed to send email',
        expect.objectContaining({
          to: emailOptions.to,
          subject: emailOptions.subject,
          error: error.message,
        }),
      );
    });
  });
});
