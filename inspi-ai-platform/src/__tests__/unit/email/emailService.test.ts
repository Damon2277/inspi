import { EmailService } from '@/lib/email/service';
import { EmailTemplates } from '@/lib/email/templates';
import nodemailer from 'nodemailer';

// Mock nodemailer
jest.mock('nodemailer');

describe('EmailService', () => {
  let emailService: EmailService;
  let mockTransporter: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock transporter
    mockTransporter = {
      sendMail: jest.fn(),
      verify: jest.fn()
    };
    
    (nodemailer.createTransporter as jest.Mock).mockReturnValue(mockTransporter);
    
    // Set up environment variables
    process.env.EMAIL_SERVER_HOST = 'smtp.test.com';
    process.env.EMAIL_SERVER_PORT = '587';
    process.env.EMAIL_SERVER_USER = 'test@example.com';
    process.env.EMAIL_SERVER_PASSWORD = 'password';
    process.env.EMAIL_FROM = 'noreply@inspi.ai';
    
    emailService = new EmailService();
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.EMAIL_SERVER_HOST;
    delete process.env.EMAIL_SERVER_PORT;
    delete process.env.EMAIL_SERVER_USER;
    delete process.env.EMAIL_SERVER_PASSWORD;
    delete process.env.EMAIL_FROM;
  });

  describe('constructor', () => {
    it('should create transporter with correct configuration', () => {
      // Assert
      expect(nodemailer.createTransporter).toHaveBeenCalledWith({
        host: 'smtp.test.com',
        port: 587,
        secure: false,
        auth: {
          user: 'test@example.com',
          pass: 'password'
        }
      });
    });

    it('should throw error when configuration is missing', () => {
      // Arrange
      delete process.env.EMAIL_SERVER_HOST;

      // Act & Assert
      expect(() => new EmailService()).toThrow('Email configuration is incomplete');
    });

    it('should use secure connection for port 465', () => {
      // Arrange
      process.env.EMAIL_SERVER_PORT = '465';

      // Act
      new EmailService();

      // Assert
      expect(nodemailer.createTransporter).toHaveBeenCalledWith(
        expect.objectContaining({
          port: 465,
          secure: true
        })
      );
    });
  });

  describe('sendVerificationEmail', () => {
    it('should send verification email successfully', async () => {
      // Arrange
      const mockResult = { messageId: 'test-message-id' };
      mockTransporter.sendMail.mockResolvedValue(mockResult);

      const recipient = 'user@example.com';
      const verificationCode = '123456';

      // Act
      const result = await emailService.sendVerificationEmail(recipient, verificationCode);

      // Assert
      expect(result).toEqual({
        success: true,
        messageId: 'test-message-id'
      });
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'noreply@inspi.ai',
        to: recipient,
        subject: '验证您的邮箱地址 - Inspi.AI',
        html: expect.stringContaining(verificationCode),
        text: expect.stringContaining(verificationCode)
      });
    });

    it('should handle email sending errors', async () => {
      // Arrange
      const error = new Error('SMTP Error');
      mockTransporter.sendMail.mockRejectedValue(error);

      const recipient = 'user@example.com';
      const verificationCode = '123456';

      // Act
      const result = await emailService.sendVerificationEmail(recipient, verificationCode);

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'Failed to send verification email'
      });
    });

    it('should validate email address format', async () => {
      // Arrange
      const invalidEmails = ['invalid-email', 'test@', '@example.com', ''];

      // Act & Assert
      for (const email of invalidEmails) {
        const result = await emailService.sendVerificationEmail(email, '123456');
        expect(result).toEqual({
          success: false,
          error: 'Invalid email address'
        });
      }
    });

    it('should validate verification code format', async () => {
      // Arrange
      const invalidCodes = ['', '12345', '1234567', 'abcdef', '12345a'];

      // Act & Assert
      for (const code of invalidCodes) {
        const result = await emailService.sendVerificationEmail('user@example.com', code);
        expect(result).toEqual({
          success: false,
          error: 'Invalid verification code format'
        });
      }
    });

    it('should include correct verification link', async () => {
      // Arrange
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test' });
      const recipient = 'user@example.com';
      const verificationCode = '123456';

      // Act
      await emailService.sendVerificationEmail(recipient, verificationCode);

      // Assert
      const sendMailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(sendMailCall.html).toContain(`/api/auth/verify-email?code=${verificationCode}`);
      expect(sendMailCall.html).toContain(`email=${encodeURIComponent(recipient)}`);
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email successfully', async () => {
      // Arrange
      const mockResult = { messageId: 'reset-message-id' };
      mockTransporter.sendMail.mockResolvedValue(mockResult);

      const recipient = 'user@example.com';
      const resetToken = 'reset-token-123';

      // Act
      const result = await emailService.sendPasswordResetEmail(recipient, resetToken);

      // Assert
      expect(result).toEqual({
        success: true,
        messageId: 'reset-message-id'
      });
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'noreply@inspi.ai',
        to: recipient,
        subject: '重置您的密码 - Inspi.AI',
        html: expect.stringContaining(resetToken),
        text: expect.stringContaining(resetToken)
      });
    });

    it('should include security warning in reset email', async () => {
      // Arrange
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test' });

      // Act
      await emailService.sendPasswordResetEmail('user@example.com', 'token');

      // Assert
      const sendMailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(sendMailCall.html).toContain('如果您没有请求重置密码');
      expect(sendMailCall.html).toContain('请忽略此邮件');
    });

    it('should set token expiration time', async () => {
      // Arrange
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test' });

      // Act
      await emailService.sendPasswordResetEmail('user@example.com', 'token');

      // Assert
      const sendMailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(sendMailCall.html).toContain('24小时内有效');
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email successfully', async () => {
      // Arrange
      const mockResult = { messageId: 'welcome-message-id' };
      mockTransporter.sendMail.mockResolvedValue(mockResult);

      const recipient = 'user@example.com';
      const userName = 'John Doe';

      // Act
      const result = await emailService.sendWelcomeEmail(recipient, userName);

      // Assert
      expect(result).toEqual({
        success: true,
        messageId: 'welcome-message-id'
      });
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'noreply@inspi.ai',
        to: recipient,
        subject: '欢迎加入 Inspi.AI！',
        html: expect.stringContaining(userName),
        text: expect.stringContaining(userName)
      });
    });

    it('should include getting started information', async () => {
      // Arrange
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test' });

      // Act
      await emailService.sendWelcomeEmail('user@example.com', 'John');

      // Assert
      const sendMailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(sendMailCall.html).toContain('开始使用');
      expect(sendMailCall.html).toContain('创建您的第一个');
    });

    it('should handle missing user name gracefully', async () => {
      // Arrange
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test' });

      // Act
      const result = await emailService.sendWelcomeEmail('user@example.com', '');

      // Assert
      expect(result.success).toBe(true);
      const sendMailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(sendMailCall.html).toContain('用户'); // Default greeting
    });
  });

  describe('sendNotificationEmail', () => {
    it('should send custom notification email', async () => {
      // Arrange
      const mockResult = { messageId: 'notification-id' };
      mockTransporter.sendMail.mockResolvedValue(mockResult);

      const options = {
        to: 'user@example.com',
        subject: 'Custom Notification',
        html: '<p>Custom HTML content</p>',
        text: 'Custom text content'
      };

      // Act
      const result = await emailService.sendNotificationEmail(options);

      // Assert
      expect(result).toEqual({
        success: true,
        messageId: 'notification-id'
      });
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'noreply@inspi.ai',
        ...options
      });
    });

    it('should support multiple recipients', async () => {
      // Arrange
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test' });

      const options = {
        to: ['user1@example.com', 'user2@example.com'],
        subject: 'Bulk Notification',
        html: '<p>Bulk content</p>'
      };

      // Act
      await emailService.sendNotificationEmail(options);

      // Assert
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['user1@example.com', 'user2@example.com']
        })
      );
    });

    it('should support CC and BCC', async () => {
      // Arrange
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test' });

      const options = {
        to: 'user@example.com',
        cc: 'cc@example.com',
        bcc: 'bcc@example.com',
        subject: 'Test',
        html: '<p>Test</p>'
      };

      // Act
      await emailService.sendNotificationEmail(options);

      // Assert
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          cc: 'cc@example.com',
          bcc: 'bcc@example.com'
        })
      );
    });
  });

  describe('verifyConnection', () => {
    it('should verify SMTP connection successfully', async () => {
      // Arrange
      mockTransporter.verify.mockResolvedValue(true);

      // Act
      const result = await emailService.verifyConnection();

      // Assert
      expect(result).toEqual({
        success: true,
        message: 'SMTP connection verified'
      });
      expect(mockTransporter.verify).toHaveBeenCalled();
    });

    it('should handle connection verification failure', async () => {
      // Arrange
      const error = new Error('Connection failed');
      mockTransporter.verify.mockRejectedValue(error);

      // Act
      const result = await emailService.verifyConnection();

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'SMTP connection failed'
      });
    });
  });

  describe('rate limiting', () => {
    it('should implement rate limiting for verification emails', async () => {
      // Arrange
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test' });
      const recipient = 'user@example.com';

      // Act - Send multiple emails rapidly
      const promises = Array(5).fill(null).map(() => 
        emailService.sendVerificationEmail(recipient, '123456')
      );

      const results = await Promise.all(promises);

      // Assert - Should allow first few but rate limit others
      const successCount = results.filter(r => r.success).length;
      const rateLimitedCount = results.filter(r => 
        !r.success && r.error?.includes('rate limit')
      ).length;

      expect(successCount).toBeLessThan(5);
      expect(rateLimitedCount).toBeGreaterThan(0);
    });

    it('should reset rate limit after time window', async () => {
      // Arrange
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test' });
      const recipient = 'user@example.com';

      // Act - Send email to trigger rate limit
      await emailService.sendVerificationEmail(recipient, '123456');
      
      // Mock time passage
      jest.advanceTimersByTime(60000); // 1 minute
      
      const result = await emailService.sendVerificationEmail(recipient, '654321');

      // Assert
      expect(result.success).toBe(true);
    });
  });

  describe('email templates', () => {
    it('should use correct template for verification email', async () => {
      // Arrange
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test' });

      // Act
      await emailService.sendVerificationEmail('user@example.com', '123456');

      // Assert
      const sendMailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(sendMailCall.html).toContain('验证码');
      expect(sendMailCall.html).toContain('123456');
      expect(sendMailCall.html).toContain('Inspi.AI');
    });

    it('should include unsubscribe link in notification emails', async () => {
      // Arrange
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test' });

      // Act
      await emailService.sendNotificationEmail({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
        includeUnsubscribe: true
      });

      // Assert
      const sendMailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(sendMailCall.html).toContain('取消订阅');
      expect(sendMailCall.html).toContain('/unsubscribe');
    });

    it('should support custom email templates', async () => {
      // Arrange
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test' });
      const customTemplate = '<div>Custom template with {{code}}</div>';

      // Act
      await emailService.sendVerificationEmail(
        'user@example.com', 
        '123456',
        { template: customTemplate }
      );

      // Assert
      const sendMailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(sendMailCall.html).toContain('Custom template with 123456');
    });
  });

  describe('error handling', () => {
    it('should handle network timeouts', async () => {
      // Arrange
      const timeoutError = new Error('Network timeout');
      timeoutError.code = 'ETIMEDOUT';
      mockTransporter.sendMail.mockRejectedValue(timeoutError);

      // Act
      const result = await emailService.sendVerificationEmail('user@example.com', '123456');

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'Email service temporarily unavailable'
      });
    });

    it('should handle authentication errors', async () => {
      // Arrange
      const authError = new Error('Authentication failed');
      authError.code = 'EAUTH';
      mockTransporter.sendMail.mockRejectedValue(authError);

      // Act
      const result = await emailService.sendVerificationEmail('user@example.com', '123456');

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'Email authentication failed'
      });
    });

    it('should handle recipient errors', async () => {
      // Arrange
      const recipientError = new Error('Recipient rejected');
      recipientError.responseCode = 550;
      mockTransporter.sendMail.mockRejectedValue(recipientError);

      // Act
      const result = await emailService.sendVerificationEmail('invalid@example.com', '123456');

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'Invalid recipient email address'
      });
    });
  });

  describe('logging and monitoring', () => {
    it('should log successful email sends', async () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

      // Act
      await emailService.sendVerificationEmail('user@example.com', '123456');

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Email sent successfully'),
        expect.objectContaining({ messageId: 'test-id' })
      );

      consoleSpy.mockRestore();
    });

    it('should log email failures', async () => {
      // Arrange
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Send failed');
      mockTransporter.sendMail.mockRejectedValue(error);

      // Act
      await emailService.sendVerificationEmail('user@example.com', '123456');

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Email send failed'),
        expect.objectContaining({ error: error.message })
      );

      consoleErrorSpy.mockRestore();
    });

    it('should track email metrics', async () => {
      // Arrange
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test' });

      // Act
      await emailService.sendVerificationEmail('user@example.com', '123456');
      const metrics = emailService.getMetrics();

      // Assert
      expect(metrics).toEqual({
        totalSent: 1,
        totalFailed: 0,
        verificationEmails: 1,
        passwordResetEmails: 0,
        welcomeEmails: 0,
        notificationEmails: 0
      });
    });
  });
});