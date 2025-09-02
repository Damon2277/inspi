/**
 * 邮件服务配置
 */

export const EMAIL_CONFIG = {
  // SMTP配置
  SMTP: {
    HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
    PORT: parseInt(process.env.SMTP_PORT || '587'),
    SECURE: false, // true for 465, false for other ports
    AUTH: {
      USER: process.env.SMTP_USER || '',
      PASS: process.env.SMTP_PASS || ''
    }
  },
  
  // 收件人配置
  RECIPIENTS: {
    CONTACT: process.env.CONTACT_EMAIL || 'sundp1980@gmail.com',
    SUPPORT: process.env.SUPPORT_EMAIL || 'sundp1980@gmail.com',
    ADMIN: process.env.ADMIN_EMAIL || 'sundp1980@gmail.com'
  },
  
  // 发件人配置
  FROM: {
    NAME: 'Inspi.AI Support',
    EMAIL: process.env.SMTP_USER || 'noreply@inspi.ai'
  },
  
  // 邮件模板配置
  TEMPLATES: {
    CONTACT_INQUIRY: 'contact-inquiry',
    FEEDBACK: 'feedback',
    BUG_REPORT: 'bug-report',
    FEATURE_REQUEST: 'feature-request'
  },
  
  // 限制配置
  LIMITS: {
    MAX_MESSAGE_LENGTH: 5000,
    MAX_SUBJECT_LENGTH: 200,
    RATE_LIMIT_PER_IP: 5, // 每小时最多5封邮件
    RATE_LIMIT_WINDOW: 60 * 60 * 1000 // 1小时
  }
} as const;

// 邮件类型定义
export type EmailType = 'contact' | 'feedback' | 'bug' | 'feature' | 'general';

// 邮件优先级
export type EmailPriority = 'low' | 'normal' | 'high' | 'urgent';

// 联系表单数据接口
export interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
  type: EmailType;
  priority?: EmailPriority;
  userId?: string;
  userAgent?: string;
  ipAddress?: string;
}