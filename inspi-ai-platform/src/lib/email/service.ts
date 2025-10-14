/**
 * 邮件服务封装
 * 提供统一的邮件发送接口
 */

import nodemailer from 'nodemailer';

import { env } from '@/shared/config/environment';
import { logger } from '@/shared/utils/logger';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured = false;

  constructor() {
    this.setupTransporter();
  }

  private setupTransporter(): void {
    try {
      if (!env.EMAIL.SMTP_HOST || !env.EMAIL.SMTP_USER || !env.EMAIL.SMTP_PASS) {
        logger.warn('Email service not configured - missing SMTP settings');
        return;
      }

      this.transporter = nodemailer.createTransport({
        host: env.EMAIL.SMTP_HOST,
        port: env.EMAIL.SMTP_PORT,
        secure: env.EMAIL.SMTP_PORT === 465, // true for 465, false for other ports
        auth: {
          user: env.EMAIL.SMTP_USER,
          pass: env.EMAIL.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: false, // 允许自签名证书
        },
      });

      this.isConfigured = true;
      logger.info('Email service configured successfully');

    } catch (error) {
      logger.error('Failed to setup email transporter', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 发送邮件
   */
  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    if (!this.isConfigured || !this.transporter) {
      logger.error('Email service not configured');
      return {
        success: false,
        error: 'Email service not configured',
      };
    }

    try {
      const mailOptions = {
        from: `${env.EMAIL.FROM_NAME} <${env.EMAIL.FROM_EMAIL}>`,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments,
      };

      const info = await this.transporter.sendMail(mailOptions);

      logger.info('Email sent successfully', {
        to: options.to,
        subject: options.subject,
        messageId: info.messageId,
      });

      return {
        success: true,
        messageId: info.messageId,
      };

    } catch (error) {
      logger.error('Failed to send email', {
        to: options.to,
        subject: options.subject,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 验证邮件配置
   */
  async verifyConnection(): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      logger.info('Email connection verified successfully');
      return true;
    } catch (error) {
      logger.error('Email connection verification failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    return this.isConfigured && await this.verifyConnection();
  }

  /**
   * 获取服务状态
   */
  getStatus() {
    return {
      configured: this.isConfigured,
      host: env.EMAIL.SMTP_HOST,
      port: env.EMAIL.SMTP_PORT,
      user: env.EMAIL.SMTP_USER ? env.EMAIL.SMTP_USER.replace(/(.{2}).*(@.*)/, '$1***$2') : 'Not configured',
      fromEmail: env.EMAIL.FROM_EMAIL,
      fromName: env.EMAIL.FROM_NAME,
    };
  }
}

// 单例实例
export const emailService = new EmailService();
