/**
 * MockEmailService测试
 * 验证邮件服务Mock的功能和一致性
 */

import { EmailOptions } from '@/lib/email/service';
import { MockEmailService, MockEmailConfig, MockEmailRecord } from '@/lib/testing';

describe('MockEmailService', () => {
  let mockService: MockEmailService;

  beforeEach(() => {
    mockService = new MockEmailService();
  });

  afterEach(() => {
    mockService.reset();
  });

  describe('基本功能', () => {
    it('应该正确初始化', () => {
      // Assert
      expect(mockService.name).toBe('EmailService');
      expect(mockService.version).toBe('1.0.0');
      expect(mockService.isActive).toBe(true);
    });

    it('应该能够发送邮件', async () => {
      // Arrange
      const emailOptions: EmailOptions = {
        to: 'test@example.com',
        subject: 'Test Email',
        text: 'This is a test email',
      };

      // Act
      const result = await mockService.sendEmail(emailOptions);

      // Assert
      expect(result.success).toBe(true);
      expect(result.messageId).toBeTruthy();
      expect(result.messageId).toMatch(/^mock-\d+-\d+@mock\.example\.com$/);
    });

    it('应该能够验证连接', async () => {
      // Act
      const result = await mockService.verifyConnection();

      // Assert
      expect(result).toBe(true);
    });

    it('应该能够执行健康检查', async () => {
      // Act
      const result = await mockService.healthCheck();

      // Assert
      expect(result).toBe(true);
    });

    it('应该能够获取服务状态', () => {
      // Act
      const status = mockService.getServiceStatus();

      // Assert
      expect(status.configured).toBe(true);
      expect(status.host).toBe('mock-smtp.example.com');
      expect(status.port).toBe(587);
      expect(status.mockMode).toBe(true);
      expect(status.sentCount).toBe(0);
    });
  });

  describe('邮件发送记录', () => {
    it('应该记录发送的邮件', async () => {
      // Arrange
      const emailOptions: EmailOptions = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML content</p>',
        text: 'Test text content',
      };

      // Act
      await mockService.sendEmail(emailOptions);

      // Assert
      const sentEmails = mockService.getSentEmails();
      expect(sentEmails).toHaveLength(1);

      const sentEmail = sentEmails[0];
      expect(sentEmail.to).toBe(emailOptions.to);
      expect(sentEmail.subject).toBe(emailOptions.subject);
      expect(sentEmail.html).toBe(emailOptions.html);
      expect(sentEmail.text).toBe(emailOptions.text);
      expect(sentEmail.timestamp).toBeInstanceOf(Date);
      expect(sentEmail.result.success).toBe(true);
    });

    it('应该支持多个收件人', async () => {
      // Arrange
      const emailOptions: EmailOptions = {
        to: ['user1@example.com', 'user2@example.com'],
        subject: 'Multi-recipient Email',
        text: 'Test content',
      };

      // Act
      await mockService.sendEmail(emailOptions);

      // Assert
      const sentEmails = mockService.getSentEmails();
      expect(sentEmails).toHaveLength(1);
      expect(sentEmails[0].to).toEqual(emailOptions.to);
    });

    it('应该记录附件信息', async () => {
      // Arrange
      const emailOptions: EmailOptions = {
        to: 'test@example.com',
        subject: 'Email with Attachment',
        text: 'Test content',
        attachments: [
          {
            filename: 'test.txt',
            content: Buffer.from('test content'),
            contentType: 'text/plain',
          },
        ],
      };

      // Act
      await mockService.sendEmail(emailOptions);

      // Assert
      const sentEmails = mockService.getSentEmails();
      expect(sentEmails[0].attachments).toHaveLength(1);
      expect(sentEmails[0].attachments![0].filename).toBe('test.txt');
    });
  });

  describe('邮件查询功能', () => {
    beforeEach(async () => {
      // 发送一些测试邮件
      await mockService.sendEmail({
        to: 'user1@example.com',
        subject: 'Welcome Email',
        text: 'Welcome to our service',
      });

      await mockService.sendEmail({
        to: 'user2@example.com',
        subject: 'Password Reset',
        text: 'Reset your password',
      });

      await mockService.sendEmail({
        to: ['user1@example.com', 'user3@example.com'],
        subject: 'Newsletter',
        text: 'Monthly newsletter',
      });
    });

    it('应该能够查询发送给特定收件人的邮件', () => {
      // Act
      const user1Emails = mockService.getEmailsTo('user1@example.com');

      // Assert
      expect(user1Emails).toHaveLength(2);
      expect(user1Emails[0].subject).toBe('Welcome Email');
      expect(user1Emails[1].subject).toBe('Newsletter');
    });

    it('应该能够按主题查询邮件', () => {
      // Act
      const passwordEmails = mockService.getEmailsBySubject('password');

      // Assert
      expect(passwordEmails).toHaveLength(1);
      expect(passwordEmails[0].subject).toBe('Password Reset');
    });

    it('应该能够检查是否发送了特定邮件', () => {
      // Act & Assert
      expect(mockService.wasEmailSent('user1@example.com', 'welcome')).toBe(true);
      expect(mockService.wasEmailSent('user2@example.com', 'password')).toBe(true);
      expect(mockService.wasEmailSent('user3@example.com', 'nonexistent')).toBe(false);
    });
  });

  describe('邮件统计', () => {
    it('应该提供准确的发送统计', async () => {
      // Arrange
      await mockService.sendEmail({
        to: 'user1@example.com',
        subject: 'Email 1',
        text: 'Content 1',
      });

      await mockService.sendEmail({
        to: 'user2@example.com',
        subject: 'Email 2',
        text: 'Content 2',
      });

      // Act
      const stats = mockService.getEmailStats();

      // Assert
      expect(stats.total).toBe(2);
      expect(stats.successful).toBe(2);
      expect(stats.failed).toBe(0);
      expect(stats.successRate).toBe(1);
      expect(stats.uniqueRecipients).toBe(2);
      expect(stats.lastSent).toBeInstanceOf(Date);
    });

    it('应该正确统计失败的邮件', async () => {
      // Arrange
      mockService.setFailureRate(0.5);

      // 发送多封邮件以获得一些失败
      const promises = Array.from({ length: 10 }, (_, i) =>
        mockService.sendEmail({
          to: `user${i}@example.com`,
          subject: `Email ${i}`,
          text: 'Content',
        }).catch(() => ({ success: false })),
      );

      await Promise.all(promises);

      // Act
      const stats = mockService.getEmailStats();

      // Assert
      expect(stats.total).toBe(10);
      expect(stats.failed).toBeGreaterThan(0);
      expect(stats.successful + stats.failed).toBe(stats.total);
      expect(stats.successRate).toBeLessThan(1);
    });
  });

  describe('配置管理', () => {
    it('应该能够设置Mock配置', () => {
      // Arrange
      const config: Partial<MockEmailConfig> = {
        shouldFail: true,
        delay: 100,
        messageIdPrefix: 'test-',
      };

      // Act
      mockService.setConfig(config);

      // Assert
      const detailedStats = mockService.getDetailedStats();
      expect(detailedStats.config.shouldFail).toBe(true);
      expect(detailedStats.config.delay).toBe(100);
      expect(detailedStats.config.messageIdPrefix).toBe('test-');
    });

    it('应该能够设置失败率', async () => {
      // Arrange
      mockService.setFailureRate(1); // 100% 失败率

      // Act & Assert
      await expect(mockService.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        text: 'Content',
      })).resolves.toMatchObject({ success: false });
    });

    it('应该能够设置延迟', async () => {
      // Arrange
      const delay = 200;
      mockService.setDelay(delay);

      // Act
      const startTime = Date.now();
      await mockService.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        text: 'Content',
      });
      const endTime = Date.now();

      // Assert
      const actualDelay = endTime - startTime;
      expect(actualDelay).toBeGreaterThanOrEqual(delay);
    });
  });

  describe('邮件验证', () => {
    it('应该验证必需的邮件字段', async () => {
      // Act & Assert
      await expect(mockService.sendEmail({
        to: '',
        subject: 'Test',
        text: 'Content',
      } as EmailOptions)).resolves.toMatchObject({
        success: false,
        error: 'Invalid email options',
      });

      await expect(mockService.sendEmail({
        to: 'test@example.com',
        subject: '',
        text: 'Content',
      })).resolves.toMatchObject({
        success: false,
        error: 'Invalid email options',
      });

      await expect(mockService.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
      } as EmailOptions)).resolves.toMatchObject({
        success: false,
        error: 'Invalid email options',
      });
    });

    it('应该验证邮件地址格式', async () => {
      // Act & Assert
      await expect(mockService.sendEmail({
        to: 'invalid-email',
        subject: 'Test',
        text: 'Content',
      })).resolves.toMatchObject({
        success: false,
        error: 'Invalid email options',
      });

      await expect(mockService.sendEmail({
        to: ['valid@example.com', 'invalid-email'],
        subject: 'Test',
        text: 'Content',
      })).resolves.toMatchObject({
        success: false,
        error: 'Invalid email options',
      });
    });
  });

  describe('清理功能', () => {
    it('应该能够清除发送记录', async () => {
      // Arrange
      await mockService.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        text: 'Content',
      });

      // Act
      mockService.clearSentEmails();

      // Assert
      expect(mockService.getSentEmails()).toHaveLength(0);
      const stats = mockService.getEmailStats();
      expect(stats.total).toBe(0);
    });
  });

  describe('服务验证', () => {
    it('正常状态下验证应该成功', async () => {
      // Act
      const isValid = await mockService.verify();

      // Assert
      expect(isValid).toBe(true);
    });

    it('高失败率时验证应该失败', async () => {
      // Arrange
      mockService.setFailureRate(1);

      // Act
      const isValid = await mockService.verify();

      // Assert
      expect(isValid).toBe(false);
      const status = mockService.getStatus();
      expect(status.errors.length).toBeGreaterThan(0);
    });
  });

  describe('重置功能', () => {
    it('重置应该清除所有数据和配置', async () => {
      // Arrange
      mockService.setFailureRate(0.5);
      mockService.setDelay(200);
      await mockService.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        text: 'Content',
      });

      // Act
      mockService.reset();

      // Assert
      const stats = mockService.getDetailedStats();
      expect(stats.callCount).toBe(0);
      expect(stats.total).toBe(0);
      expect(stats.config.failureRate).toBe(0);
      expect(stats.config.delay).toBe(50);
      expect(stats.errors).toHaveLength(0);
    });
  });

  describe('服务状态管理', () => {
    it('停用服务后应该抛出错误', async () => {
      // Arrange
      mockService.deactivate();

      // Act & Assert
      await expect(mockService.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        text: 'Content',
      })).rejects.toThrow('not active');

      await expect(mockService.verifyConnection()).rejects.toThrow('not active');
    });

    it('重新激活服务后应该正常工作', async () => {
      // Arrange
      mockService.deactivate();
      mockService.activate();

      // Act
      const result = await mockService.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        text: 'Content',
      });

      // Assert
      expect(result.success).toBe(true);
    });
  });

  describe('记录限制', () => {
    it('应该限制发送记录数量', async () => {
      // Arrange - 发送超过1000封邮件
      const promises = Array.from({ length: 1005 }, (_, i) =>
        mockService.sendEmail({
          to: `user${i}@example.com`,
          subject: `Email ${i}`,
          text: 'Content',
        }),
      );

      await Promise.all(promises);

      // Act
      const sentEmails = mockService.getSentEmails();

      // Assert
      expect(sentEmails.length).toBeLessThanOrEqual(1000);
    });
  });
});
