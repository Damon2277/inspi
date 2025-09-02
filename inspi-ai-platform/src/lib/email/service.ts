/**
 * 邮件服务
 */

import { EMAIL_CONFIG, ContactFormData } from './config';
import { generateContactEmailTemplate, generateAutoReplyTemplate } from './templates';

// 简化的邮件发送接口（避免依赖问题）
interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
}

/**
 * 邮件服务类
 */
export class EmailService {
  private static instance: EmailService;
  private rateLimitMap = new Map<string, number[]>();

  private constructor() {}

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  /**
   * 发送邮件（简化版本，实际生产环境需要集成真实的SMTP服务）
   */
  private async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      // 在开发环境中，我们只是记录邮件内容
      if (process.env.NODE_ENV === 'development') {
        console.log('📧 邮件发送模拟:');
        console.log('收件人:', options.to);
        console.log('主题:', options.subject);
        console.log('内容预览:', options.text.substring(0, 200) + '...');
        return true;
      }

      // 生产环境中，这里应该集成真实的邮件服务
      // 例如使用 nodemailer, sendgrid, 或其他邮件服务
      
      // 模拟邮件发送延迟
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return true;
    } catch (error) {
      console.error('邮件发送失败:', error);
      return false;
    }
  }

  /**
   * 检查发送频率限制
   */
  private checkRateLimit(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - EMAIL_CONFIG.LIMITS.RATE_LIMIT_WINDOW;
    
    if (!this.rateLimitMap.has(identifier)) {
      this.rateLimitMap.set(identifier, []);
    }
    
    const timestamps = this.rateLimitMap.get(identifier)!;
    
    // 清理过期的时间戳
    const validTimestamps = timestamps.filter(ts => ts > windowStart);
    
    if (validTimestamps.length >= EMAIL_CONFIG.LIMITS.RATE_LIMIT_PER_IP) {
      return false; // 超出限制
    }
    
    // 添加当前时间戳
    validTimestamps.push(now);
    this.rateLimitMap.set(identifier, validTimestamps);
    
    return true;
  }

  /**
   * 验证邮件数据
   */
  private validateContactData(data: ContactFormData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证必填字段
    if (!data.name || data.name.trim().length < 2) {
      errors.push('姓名至少需要2个字符');
    }

    if (!data.email || !this.isValidEmail(data.email.trim())) {
      errors.push('请提供有效的邮箱地址');
    }

    if (!data.subject || data.subject.trim().length < 5) {
      errors.push('主题至少需要5个字符');
    }

    if (!data.message || data.message.trim().length < 10) {
      errors.push('消息内容至少需要10个字符');
    }

    // 验证长度限制
    if (data.subject && data.subject.length > EMAIL_CONFIG.LIMITS.MAX_SUBJECT_LENGTH) {
      errors.push(`主题长度不能超过${EMAIL_CONFIG.LIMITS.MAX_SUBJECT_LENGTH}个字符`);
    }

    if (data.message && data.message.length > EMAIL_CONFIG.LIMITS.MAX_MESSAGE_LENGTH) {
      errors.push(`消息长度不能超过${EMAIL_CONFIG.LIMITS.MAX_MESSAGE_LENGTH}个字符`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证邮箱格式
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 清理和过滤文本内容
   */
  private sanitizeText(text: string): string {
    return text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // 移除script标签
      .replace(/<[^>]*>/g, '') // 移除HTML标签
      .trim();
  }

  /**
   * 发送联系表单邮件
   */
  async sendContactEmail(data: ContactFormData, ipAddress?: string): Promise<{
    success: boolean;
    message: string;
    errors?: string[];
  }> {
    try {
      // 验证数据
      const validation = this.validateContactData(data);
      if (!validation.isValid) {
        return {
          success: false,
          message: '数据验证失败',
          errors: validation.errors
        };
      }

      // 检查频率限制
      const identifier = ipAddress || data.email;
      if (!this.checkRateLimit(identifier)) {
        return {
          success: false,
          message: '发送频率过高，请稍后再试',
          errors: ['每小时最多发送5封邮件']
        };
      }

      // 清理数据
      const cleanData: ContactFormData = {
        ...data,
        name: this.sanitizeText(data.name.trim()),
        email: data.email.trim(),
        subject: this.sanitizeText(data.subject.trim()),
        message: this.sanitizeText(data.message.trim())
      };

      // 生成邮件模板
      const contactTemplate = generateContactEmailTemplate(cleanData);
      const autoReplyTemplate = generateAutoReplyTemplate(cleanData);

      // 发送给管理员的邮件
      const adminEmailSent = await this.sendEmail({
        to: EMAIL_CONFIG.RECIPIENTS.CONTACT,
        subject: contactTemplate.subject,
        html: contactTemplate.html,
        text: contactTemplate.text,
        from: `${EMAIL_CONFIG.FROM.NAME} <${EMAIL_CONFIG.FROM.EMAIL}>`
      });

      if (!adminEmailSent) {
        return {
          success: false,
          message: '邮件发送失败，请稍后重试'
        };
      }

      // 发送自动回复给用户
      await this.sendEmail({
        to: cleanData.email,
        subject: autoReplyTemplate.subject,
        html: autoReplyTemplate.html,
        text: autoReplyTemplate.text,
        from: `${EMAIL_CONFIG.FROM.NAME} <${EMAIL_CONFIG.FROM.EMAIL}>`
      });

      return {
        success: true,
        message: '邮件发送成功，我们会在24小时内回复您'
      };

    } catch (error) {
      console.error('发送联系邮件时出错:', error);
      return {
        success: false,
        message: '系统错误，请稍后重试'
      };
    }
  }

  /**
   * 获取邮件发送统计
   */
  getEmailStats(): {
    totalSent: number;
    rateLimitedIPs: number;
    activeConnections: number;
  } {
    const now = Date.now();
    const windowStart = now - EMAIL_CONFIG.LIMITS.RATE_LIMIT_WINDOW;
    
    let totalSent = 0;
    let rateLimitedIPs = 0;
    
    for (const [, timestamps] of this.rateLimitMap) {
      const validTimestamps = timestamps.filter(ts => ts > windowStart);
      totalSent += validTimestamps.length;
      
      if (validTimestamps.length >= EMAIL_CONFIG.LIMITS.RATE_LIMIT_PER_IP) {
        rateLimitedIPs++;
      }
    }
    
    return {
      totalSent,
      rateLimitedIPs,
      activeConnections: this.rateLimitMap.size
    };
  }

  /**
   * 清理过期的频率限制记录
   */
  cleanupRateLimitMap(): void {
    const now = Date.now();
    const windowStart = now - EMAIL_CONFIG.LIMITS.RATE_LIMIT_WINDOW;
    
    for (const [identifier, timestamps] of this.rateLimitMap) {
      const validTimestamps = timestamps.filter(ts => ts > windowStart);
      
      if (validTimestamps.length === 0) {
        this.rateLimitMap.delete(identifier);
      } else {
        this.rateLimitMap.set(identifier, validTimestamps);
      }
    }
  }
}

// 导出单例实例
export const emailService = EmailService.getInstance();

// 定期清理频率限制记录
if (typeof window === 'undefined') {
  setInterval(() => {
    emailService.cleanupRateLimitMap();
  }, 5 * 60 * 1000); // 每5分钟清理一次
}