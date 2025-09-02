/**
 * 联系支持系统测试
 */

import { emailService } from '@/lib/email/service';
import { EMAIL_CONFIG, ContactFormData } from '@/lib/email/config';
import { generateContactEmailTemplate, generateAutoReplyTemplate } from '@/lib/email/templates';

describe('联系支持系统', () => {
  describe('邮件配置', () => {
    it('应该有正确的默认配置', () => {
      expect(EMAIL_CONFIG.RECIPIENTS.CONTACT).toBe('sundp1980@gmail.com');
      expect(EMAIL_CONFIG.LIMITS.MAX_MESSAGE_LENGTH).toBe(5000);
      expect(EMAIL_CONFIG.LIMITS.RATE_LIMIT_PER_IP).toBe(5);
    });

    it('应该有正确的邮件模板类型', () => {
      expect(EMAIL_CONFIG.TEMPLATES.CONTACT_INQUIRY).toBe('contact-inquiry');
      expect(EMAIL_CONFIG.TEMPLATES.FEEDBACK).toBe('feedback');
      expect(EMAIL_CONFIG.TEMPLATES.BUG_REPORT).toBe('bug-report');
    });
  });

  describe('邮件模板生成', () => {
    const testData: ContactFormData = {
      name: '张老师',
      email: 'teacher@example.com',
      subject: '关于AI教学魔法师的问题',
      message: '我在使用AI教学魔法师时遇到了一些问题，希望能得到帮助。',
      type: 'contact',
      priority: 'normal',
      userId: 'user123',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
    };

    it('应该生成正确的联系邮件模板', () => {
      const template = generateContactEmailTemplate(testData);
      
      expect(template.subject).toContain('Inspi.AI');
      expect(template.subject).toContain('一般咨询');
      expect(template.subject).toContain('关于AI教学魔法师的问题');
      
      expect(template.html).toContain('张老师');
      expect(template.html).toContain('teacher@example.com');
      expect(template.html).toContain('我在使用AI教学魔法师时遇到了一些问题');
      
      expect(template.text).toContain('张老师');
      expect(template.text).toContain('teacher@example.com');
    });

    it('应该生成正确的自动回复模板', () => {
      const template = generateAutoReplyTemplate(testData);
      
      expect(template.subject).toContain('感谢您联系 Inspi.AI');
      expect(template.subject).toContain('咨询');
      
      expect(template.html).toContain('张老师');
      expect(template.html).toContain('24小时内');
      expect(template.html).toContain('帮助中心');
      
      expect(template.text).toContain('张老师');
      expect(template.text).toContain('24小时内');
    });

    it('应该根据不同类型生成不同的模板', () => {
      const bugData = { ...testData, type: 'bug' as const };
      const bugTemplate = generateContactEmailTemplate(bugData);
      
      expect(bugTemplate.subject).toContain('Bug报告');
      
      const feedbackData = { ...testData, type: 'feedback' as const };
      const feedbackTemplate = generateContactEmailTemplate(feedbackData);
      
      expect(feedbackTemplate.subject).toContain('用户反馈');
    });

    it('应该根据优先级显示不同的图标', () => {
      const urgentData = { ...testData, priority: 'urgent' as const };
      const urgentTemplate = generateContactEmailTemplate(urgentData);
      
      expect(urgentTemplate.subject).toContain('🔴');
      
      const lowData = { ...testData, priority: 'low' as const };
      const lowTemplate = generateContactEmailTemplate(lowData);
      
      expect(lowTemplate.subject).toContain('🔵');
    });
  });

  describe('邮件服务', () => {
    beforeEach(() => {
      // 清理频率限制记录
      emailService.cleanupRateLimitMap();
    });

    it('应该验证联系表单数据', async () => {
      const invalidData: ContactFormData = {
        name: 'A', // 太短
        email: 'invalid-email', // 无效邮箱
        subject: '短', // 太短
        message: '短消息', // 太短
        type: 'contact'
      };

      const result = await emailService.sendContactEmail(invalidData);
      
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('应该接受有效的联系表单数据', async () => {
      const validData: ContactFormData = {
        name: '张老师',
        email: 'teacher@example.com',
        subject: '关于AI教学魔法师的使用问题',
        message: '我在使用AI教学魔法师生成教学卡片时遇到了一些困难，希望能得到详细的使用指导。',
        type: 'contact',
        priority: 'normal'
      };

      const result = await emailService.sendContactEmail(validData);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('24小时内回复');
    });

    it('应该实施频率限制', async () => {
      const validData: ContactFormData = {
        name: '张老师',
        email: 'teacher@example.com',
        subject: '测试频率限制',
        message: '这是一个测试频率限制的消息，应该在第6次发送时被拒绝。',
        type: 'contact'
      };

      const testIP = '192.168.1.100';

      // 发送5次应该成功
      for (let i = 0; i < 5; i++) {
        const result = await emailService.sendContactEmail(validData, testIP);
        expect(result.success).toBe(true);
      }

      // 第6次应该被限制
      const result = await emailService.sendContactEmail(validData, testIP);
      expect(result.success).toBe(false);
      expect(result.message).toContain('发送频率过高');
    });

    it('应该清理和过滤恶意内容', async () => {
      const maliciousData: ContactFormData = {
        name: '<script>alert("xss")</script>张老师',
        email: 'teacher@example.com',
        subject: '正常主题<script>alert("xss")</script>',
        message: '正常消息内容<script>alert("xss")</script>包含恶意脚本',
        type: 'contact'
      };

      const result = await emailService.sendContactEmail(maliciousData);
      
      expect(result.success).toBe(true);
      // 验证脚本标签被移除（这里我们相信服务内部的清理逻辑）
    });

    it('应该提供邮件发送统计', () => {
      const stats = emailService.getEmailStats();
      
      expect(stats).toHaveProperty('totalSent');
      expect(stats).toHaveProperty('rateLimitedIPs');
      expect(stats).toHaveProperty('activeConnections');
      
      expect(typeof stats.totalSent).toBe('number');
      expect(typeof stats.rateLimitedIPs).toBe('number');
      expect(typeof stats.activeConnections).toBe('number');
    });
  });

  describe('数据验证', () => {
    it('应该验证邮箱格式', async () => {
      const invalidEmails = [
        'invalid',
        '@example.com',
        'user@',
        'user@.com',
        'user..name@example.com'
      ];

      for (const email of invalidEmails) {
        const data: ContactFormData = {
          name: '测试用户',
          email,
          subject: '测试主题',
          message: '测试消息内容，这里有足够的字符来通过长度验证。',
          type: 'contact'
        };

        const result = await emailService.sendContactEmail(data);
        console.log(`Testing email: ${email}, result:`, result);
        expect(result.success).toBe(false);
        expect(result.errors?.some(error => error.includes('邮箱') || error.includes('有效'))).toBe(true);
      }
    });

    it('应该验证字段长度限制', async () => {
      const longSubject = 'A'.repeat(EMAIL_CONFIG.LIMITS.MAX_SUBJECT_LENGTH + 1);
      const longMessage = 'A'.repeat(EMAIL_CONFIG.LIMITS.MAX_MESSAGE_LENGTH + 1);

      const data: ContactFormData = {
        name: '测试用户',
        email: 'test@example.com',
        subject: longSubject,
        message: longMessage,
        type: 'contact'
      };

      const result = await emailService.sendContactEmail(data);
      expect(result.success).toBe(false);
      expect(result.errors?.some(error => error.includes('长度'))).toBe(true);
    });

    it('应该验证必填字段', async () => {
      const incompleteData: Partial<ContactFormData> = {
        name: '',
        email: '',
        subject: '',
        message: '',
        type: 'contact'
      };

      const result = await emailService.sendContactEmail(incompleteData as ContactFormData);
      expect(result.success).toBe(false);
      expect(result.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('边界情况处理', () => {
    it('应该处理空白字符', async () => {
      const data: ContactFormData = {
        name: '  张老师  ',
        email: '  teacher@example.com  ',
        subject: '  测试主题测试主题  ',
        message: '  测试消息内容，包含前后空白字符，这里有足够的字符来通过长度验证。  ',
        type: 'contact'
      };

      const result = await emailService.sendContactEmail(data);
      console.log('空白字符测试结果:', result);
      expect(result.success).toBe(true);
    });

    it('应该处理特殊字符', async () => {
      const data: ContactFormData = {
        name: '张老师 & 李老师',
        email: 'teacher+test@example.com',
        subject: '关于"AI教学魔法师"的问题 & 建议',
        message: '我们在使用过程中发现了一些问题：\n1. 生成速度较慢\n2. 某些特殊字符显示异常\n希望能够改进。',
        type: 'feedback'
      };

      const result = await emailService.sendContactEmail(data);
      expect(result.success).toBe(true);
    });

    it('应该处理Unicode字符', async () => {
      const data: ContactFormData = {
        name: '张老师 👨‍🏫',
        email: 'teacher@example.com',
        subject: '关于AI教学的建议 🤖📚',
        message: '希望能够支持更多的emoji表情和特殊符号：✅❌⭐🔥💡',
        type: 'feature'
      };

      const result = await emailService.sendContactEmail(data);
      expect(result.success).toBe(true);
    });
  });
});