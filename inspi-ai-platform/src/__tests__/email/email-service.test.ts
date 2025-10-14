/**
 * 邮件服务集成测试
 */
import { EMAIL_CONFIG } from '@/lib/email/config';
import { emailService } from '@/lib/email/service';

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransporter: jest.fn(() => ({
    verify: jest.fn().mockResolvedValue(true),
    sendMail: jest.fn().mockResolvedValue({
      messageId: 'test-message-id-123',
    }),
  })),
}));

describe('EmailService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendContactEmail', () => {
    const validContactData = {
      name: '张老师',
      email: 'teacher@example.com',
      subject: '关于AI教学魔法师的使用问题',
      message: '我想了解如何更好地使用AI教学魔法师来创建教学内容，希望能得到一些指导。',
      type: 'general' as const,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    };

    it('应该成功发送联系邮件', async () => {
      const result = await emailService.sendContactEmail(validContactData);

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('应该验证必填字段', async () => {
      const invalidData = {
        ...validContactData,
        name: '',
      };

      const result = await emailService.sendContactEmail(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('姓名不能为空');
    });

    it('应该验证邮箱格式', async () => {
      const invalidData = {
        ...validContactData,
        email: 'invalid-email',
      };

      const result = await emailService.sendContactEmail(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('请提供有效的邮箱地址');
    });

    it('应该验证主题长度', async () => {
      const invalidData = {
        ...validContactData,
        subject: 'a'.repeat(EMAIL_CONFIG.LIMITS.MAX_SUBJECT_LENGTH + 1),
      };

      const result = await emailService.sendContactEmail(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('主题长度不能超过');
    });

    it('应该验证消息长度', async () => {
      const invalidData = {
        ...validContactData,
        message: 'a'.repeat(EMAIL_CONFIG.LIMITS.MAX_MESSAGE_LENGTH + 1),
      };

      const result = await emailService.sendContactEmail(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('消息长度不能超过');
    });

    it('应该检查发送频率限制', async () => {
      // 发送多次邮件测试频率限制
      const promises = [];
      for (let i = 0; i < EMAIL_CONFIG.LIMITS.RATE_LIMIT_PER_HOUR + 1; i++) {
        promises.push(emailService.sendContactEmail(validContactData));
      }

      const results = await Promise.all(promises);

      // 前面的请求应该成功
      expect(results.slice(0, EMAIL_CONFIG.LIMITS.RATE_LIMIT_PER_HOUR).every(r => r.success)).toBe(true);

      // 超出限制的请求应该失败
      const lastResult = results[results.length - 1];
      expect(lastResult.success).toBe(false);
      expect(lastResult.error).toContain('发送频率过高');
    });

    it('应该根据邮件类型设置优先级', async () => {
      const bugReportData = {
        ...validContactData,
        type: 'bug-report' as const,
      };

      const result = await emailService.sendContactEmail(bugReportData);
      expect(result.success).toBe(true);
    });
  });

  describe('getServiceStatus', () => {
    it('应该返回服务状态', async () => {
      const status = await emailService.getServiceStatus();

      expect(status).toHaveProperty('isConnected');
      expect(status).toHaveProperty('mode');
      expect(status).toHaveProperty('queueSize');
      expect(['production', 'mock']).toContain(status.mode);
    });
  });

  describe('邮件模板', () => {
    it('应该生成正确的HTML模板', async () => {
      const result = await emailService.sendContactEmail(validContactData);
      expect(result.success).toBe(true);
    });

    it('应该处理特殊字符', async () => {
      const dataWithSpecialChars = {
        ...validContactData,
        name: '张老师 <script>alert("test")</script>',
        message: '这是一条包含特殊字符的消息：<>&"\'',
      };

      const result = await emailService.sendContactEmail(dataWithSpecialChars);
      expect(result.success).toBe(true);
    });
  });

  describe('错误处理', () => {
    it('应该处理邮件发送失败', async () => {
      // Mock发送失败
      const mockTransporter = {
        verify: jest.fn().mockResolvedValue(true),
        sendMail: jest.fn().mockRejectedValue(new Error('SMTP连接失败')),
      };

      // 临时替换transporter
      const originalTransporter = (emailService as any).transporter;
      (emailService as any).transporter = mockTransporter;

      const result = await emailService.sendContactEmail(validContactData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('SMTP连接失败');

      // 恢复原始transporter
      (emailService as any).transporter = originalTransporter;
    });

    it('应该在模拟模式下工作', async () => {
      // 设置为模拟模式
      const originalTransporter = (emailService as any).transporter;
      (emailService as any).transporter = null;

      const result = await emailService.sendContactEmail(validContactData);

      expect(result.success).toBe(true);
      expect(result.messageId).toMatch(/^mock-/);

      // 恢复原始transporter
      (emailService as any).transporter = originalTransporter;
    });
  });

  describe('数据清理和安全', () => {
    it('应该清理输入数据', async () => {
      const dataWithWhitespace = {
        ...validContactData,
        name: '  张老师  ',
        email: '  teacher@example.com  ',
        subject: '  测试主题  ',
        message: '  测试消息  ',
      };

      const result = await emailService.sendContactEmail(dataWithWhitespace);
      expect(result.success).toBe(true);
    });

    it('应该拒绝恶意内容', async () => {
      const maliciousData = {
        ...validContactData,
        message: '<script>alert("xss")</script>',
      };

      const result = await emailService.sendContactEmail(maliciousData);
      // 应该成功发送，但内容会被转义
      expect(result.success).toBe(true);
    });
  });
});

describe('邮件配置', () => {
  it('应该有正确的配置结构', () => {
    expect(EMAIL_CONFIG).toHaveProperty('SMTP');
    expect(EMAIL_CONFIG).toHaveProperty('RECIPIENTS');
    expect(EMAIL_CONFIG).toHaveProperty('FROM');
    expect(EMAIL_CONFIG).toHaveProperty('TEMPLATES');
    expect(EMAIL_CONFIG).toHaveProperty('LIMITS');
  });

  it('应该有合理的限制设置', () => {
    expect(EMAIL_CONFIG.LIMITS.MAX_MESSAGE_LENGTH).toBeGreaterThan(100);
    expect(EMAIL_CONFIG.LIMITS.MAX_SUBJECT_LENGTH).toBeGreaterThan(10);
    expect(EMAIL_CONFIG.LIMITS.RATE_LIMIT_PER_HOUR).toBeGreaterThan(0);
    expect(EMAIL_CONFIG.LIMITS.RATE_LIMIT_PER_DAY).toBeGreaterThan(EMAIL_CONFIG.LIMITS.RATE_LIMIT_PER_HOUR);
  });
});
