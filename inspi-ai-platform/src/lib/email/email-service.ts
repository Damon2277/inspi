/**
 * 邮件服务
 * 提供邮件发送功能
 */
import nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string
  subject: string
  text?: string
  html?: string
  from?: string
}

// 创建邮件传输器
const createTransporter = () => {
  if (process.env.NODE_ENV === 'development') {
    // 开发环境使用 Ethereal Email 测试
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: 'ethereal.user@ethereal.email',
        pass: 'ethereal.pass',
      },
    });
  }

  // 生产环境配置
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // 使用 Gmail SMTP
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
};

/**
 * 发送邮件
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: options.from || process.env.FROM_EMAIL || 'noreply@inspi.ai',
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    };

    const info = await transporter.sendMail(mailOptions);

    if (process.env.NODE_ENV === 'development') {
      console.log('Email sent:', info.messageId);
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    }
  } catch (error) {
    console.error('Email sending failed:', error);
    throw new Error('邮件发送失败');
  }
}

/**
 * 发送验证邮件模板
 */
export async function sendVerificationEmail(
  email: string,
  name: string,
  verificationUrl: string,
): Promise<void> {
  await sendEmail({
    to: email,
    subject: '验证您的邮箱 - Inspi.AI',
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <h2 style="color: #333; text-align: center;">欢迎加入 Inspi.AI！</h2>
        <p>亲爱的 ${name}，</p>
        <p>感谢您注册 Inspi.AI 账户。请点击下面的链接验证您的邮箱地址：</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            验证邮箱
          </a>
        </div>
        <p>如果按钮无法点击，请复制以下链接到浏览器地址栏：</p>
        <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
        <p>此链接将在24小时后过期。</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 14px;">
          如果您没有注册 Inspi.AI 账户，请忽略此邮件。
        </p>
      </div>
    `,
  });
}

/**
 * 发送密码重置邮件模板
 */
export async function sendPasswordResetEmail(
  email: string,
  name: string,
  resetUrl: string,
): Promise<void> {
  await sendEmail({
    to: email,
    subject: '重置您的密码 - Inspi.AI',
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <h2 style="color: #333; text-align: center;">密码重置请求</h2>
        <p>亲爱的 ${name}，</p>
        <p>我们收到了您的密码重置请求。请点击下面的链接重置您的密码：</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            重置密码
          </a>
        </div>
        <p>如果按钮无法点击，请复制以下链接到浏览器地址栏：</p>
        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        <p>此链接将在1小时后过期。</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 14px;">
          如果您没有请求密码重置，请忽略此邮件。您的密码不会被更改。
        </p>
      </div>
    `,
  });
}

export default {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
};
