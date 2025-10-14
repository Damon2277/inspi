/**
 * 邮件服务Mock实现
 * 提供邮件发送的模拟功能，支持发送记录和验证
 */

import { EmailOptions, EmailResult } from '@/lib/email/service';

import { BaseMockService } from './BaseMockService';

export interface MockEmailRecord {
  id: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
  timestamp: Date;
  result: EmailResult;
}

export interface MockEmailConfig {
  shouldFail?: boolean;
  failureRate?: number;
  delay?: number;
  messageIdPrefix?: string;
}

export class MockEmailService extends BaseMockService {
  private sentEmails: MockEmailRecord[] = [];
  private config: MockEmailConfig = {
    shouldFail: false,
    failureRate: 0,
    delay: 50,
    messageIdPrefix: 'mock-',
  };
  private messageIdCounter: number = 1;

  constructor() {
    super('EmailService', '1.0.0');
  }

  /**
   * 发送邮件 (Mock实现)
   */
  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    this.ensureActive();
    this.recordCall('sendEmail', [options]);

    // 验证参数
    if (!this.validateEmailOptions(options)) {
      const result: EmailResult = {
        success: false,
        error: 'Invalid email options',
      };
      this.recordEmail(options, result);
      return result;
    }

    // 模拟延迟
    await this.simulateDelay(this.config.delay, this.config.delay! * 2);

    // 模拟失败
    if (this.shouldSimulateFailure()) {
      const result: EmailResult = {
        success: false,
        error: 'Mock email service failure',
      };
      this.recordEmail(options, result);
      return result;
    }

    // 生成成功结果
    const messageId = this.generateMessageId();
    const result: EmailResult = {
      success: true,
      messageId,
    };

    this.recordEmail(options, result);
    return result;
  }

  /**
   * 验证邮件连接 (Mock实现)
   */
  async verifyConnection(): Promise<boolean> {
    this.ensureActive();
    this.recordCall('verifyConnection');

    if (this.shouldSimulateFailure()) {
      return false;
    }

    await this.simulateDelay(20, 100);
    return true;
  }

  /**
   * 健康检查 (Mock实现)
   */
  async healthCheck(): Promise<boolean> {
    this.ensureActive();
    this.recordCall('healthCheck');

    const connectionResult = await this.verifyConnection();
    return connectionResult;
  }

  /**
   * 获取服务状态 (Mock实现)
   */
  getServiceStatus() {
    return {
      configured: true,
      host: 'mock-smtp.example.com',
      port: 587,
      user: 'mock-user@example.com',
      fromEmail: 'noreply@example.com',
      fromName: 'Mock Service',
      mockMode: true,
      sentCount: this.sentEmails.length,
    };
  }

  /**
   * 获取已发送的邮件记录
   */
  getSentEmails(): MockEmailRecord[] {
    return [...this.sentEmails];
  }

  /**
   * 获取发送给特定收件人的邮件
   */
  getEmailsTo(recipient: string): MockEmailRecord[] {
    return this.sentEmails.filter(email => {
      if (Array.isArray(email.to)) {
        return email.to.includes(recipient);
      }
      return email.to === recipient;
    });
  }

  /**
   * 获取特定主题的邮件
   */
  getEmailsBySubject(subject: string): MockEmailRecord[] {
    return this.sentEmails.filter(email =>
      email.subject.toLowerCase().includes(subject.toLowerCase()),
    );
  }

  /**
   * 检查是否发送了特定邮件
   */
  wasEmailSent(to: string, subject: string): boolean {
    return this.sentEmails.some(email => {
      const toMatch = Array.isArray(email.to)
        ? email.to.includes(to)
        : email.to === to;
      const subjectMatch = email.subject.toLowerCase().includes(subject.toLowerCase());
      return toMatch && subjectMatch;
    });
  }

  /**
   * 获取发送统计
   */
  getEmailStats() {
    const total = this.sentEmails.length;
    const successful = this.sentEmails.filter(e => e.result.success).length;
    const failed = total - successful;

    const recipients = new Set<string>();
    this.sentEmails.forEach(email => {
      if (Array.isArray(email.to)) {
        email.to.forEach(r => recipients.add(r));
      } else {
        recipients.add(email.to);
      }
    });

    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? successful / total : 0,
      uniqueRecipients: recipients.size,
      lastSent: this.sentEmails.length > 0
        ? this.sentEmails[this.sentEmails.length - 1].timestamp
        : null,
    };
  }

  /**
   * 设置Mock配置
   */
  setConfig(config: Partial<MockEmailConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 设置失败率
   */
  setFailureRate(rate: number): void {
    this.config.failureRate = Math.max(0, Math.min(1, rate));
  }

  /**
   * 设置延迟
   */
  setDelay(delay: number): void {
    this.config.delay = Math.max(0, delay);
  }

  /**
   * 清除发送记录
   */
  clearSentEmails(): void {
    this.sentEmails = [];
    this.messageIdCounter = 1;
  }

  /**
   * 验证邮件选项
   */
  private validateEmailOptions(options: EmailOptions): boolean {
    if (!options.to || (Array.isArray(options.to) && options.to.length === 0)) {
      this.addError('Email recipient is required');
      return false;
    }

    if (!options.subject || options.subject.trim().length === 0) {
      this.addError('Email subject is required');
      return false;
    }

    if (!options.html && !options.text) {
      this.addError('Email content (html or text) is required');
      return false;
    }

    // 验证邮件地址格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const recipients = Array.isArray(options.to) ? options.to : [options.to];

    for (const recipient of recipients) {
      if (!emailRegex.test(recipient)) {
        this.addError(`Invalid email address: ${recipient}`);
        return false;
      }
    }

    return true;
  }

  /**
   * 记录邮件发送
   */
  private recordEmail(options: EmailOptions, result: EmailResult): void {
    const record: MockEmailRecord = {
      id: this.generateEmailId(),
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments,
      timestamp: new Date(),
      result,
    };

    this.sentEmails.push(record);

    // 限制记录数量
    if (this.sentEmails.length > 1000) {
      this.sentEmails.shift();
    }
  }

  /**
   * 生成消息ID
   */
  private generateMessageId(): string {
    return `${this.config.messageIdPrefix}${this.messageIdCounter++}-${Date.now()}@mock.example.com`;
  }

  /**
   * 生成邮件ID
   */
  private generateEmailId(): string {
    return `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 判断是否应该模拟失败
   */
  private shouldSimulateFailure(): boolean {
    if (this.config.shouldFail) {
      return true;
    }
    return Math.random() < (this.config.failureRate || 0);
  }

  /**
   * 验证Mock服务状态
   */
  protected async onVerify(): Promise<boolean> {
    try {
      // 验证基本配置
      if (!this.config) {
        this.addError('Mock configuration is missing');
        return false;
      }

      // 验证连接功能
      const connectionResult = await this.verifyConnection();
      if (!connectionResult && this.config.failureRate === 0) {
        this.addError('Connection verification failed unexpectedly');
        return false;
      }

      // 验证发送功能
      const testEmail: EmailOptions = {
        to: 'test@example.com',
        subject: 'Test Email',
        text: 'This is a test email',
      };

      const originalFailureRate = this.config.failureRate;
      this.config.failureRate = 0; // 临时禁用失败

      const sendResult = await this.sendEmail(testEmail);

      this.config.failureRate = originalFailureRate; // 恢复失败率

      if (!sendResult.success) {
        this.addError('Test email sending failed');
        return false;
      }

      return true;
    } catch (error) {
      this.addError(`Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * 重置时的自定义逻辑
   */
  protected onReset(): void {
    this.clearSentEmails();
    this.config = {
      shouldFail: false,
      failureRate: 0,
      delay: 50,
      messageIdPrefix: 'mock-',
    };
  }

  /**
   * 获取详细统计信息
   */
  getDetailedStats() {
    return {
      ...this.getStatus(),
      ...this.getEmailStats(),
      config: this.config,
    };
  }
}
