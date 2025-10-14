/**
 * 发送邮件验证码API
 * 支持注册、登录、密码重置等场景
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { emailService } from '@/lib/email/service';
import { getVerificationEmailTemplate } from '@/lib/email/templates';
import { verificationManager } from '@/lib/email/verification';
import { logger } from '@/shared/utils/logger';

// 请求体验证schema
const sendVerificationSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  type: z.enum(['registration', 'login', 'password_reset'], {
    message: '验证类型无效',
  }),
  language: z.string().optional().default('zh-CN'),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    logger.info('Send verification code request started');

    // 1. 解析请求体
    const body = await request.json();
    const validation = sendVerificationSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.issues.map(err => err.message).join(', ');
      return NextResponse.json(
        { error: errors },
        { status: 400 },
      );
    }

    const { email, type, language } = validation.data;

    // 2. 检查邮件服务状态
    const emailHealthy = await emailService.healthCheck();
    if (!emailHealthy) {
      logger.error('Email service health check failed');
      return NextResponse.json(
        { error: '邮件服务暂时不可用，请稍后重试' },
        { status: 503 },
      );
    }

    // 3. 检查发送频率限制
    const rateLimitCheck = await verificationManager.checkRateLimit(email);
    if (!rateLimitCheck.allowed) {
      logger.warn('Rate limit exceeded for verification email', {
        email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
        remainingTime: rateLimitCheck.remainingTime,
      });

      return NextResponse.json(
        {
          error: '发送过于频繁，请稍后重试',
          remainingTime: rateLimitCheck.remainingTime,
        },
        { status: 429 },
      );
    }

    // 4. 生成验证码
    const code = verificationManager.generateCode();

    // 5. 存储验证码
    const stored = await verificationManager.storeCode(email, code, type);
    if (!stored) {
      logger.error('Failed to store verification code', { email });
      return NextResponse.json(
        { error: '验证码生成失败，请重试' },
        { status: 500 },
      );
    }

    // 6. 生成邮件模板
    const emailTemplate = getVerificationEmailTemplate({
      code,
      email,
      type,
      expiryMinutes: 10,
    });

    // 7. 发送邮件
    const emailResult = await emailService.sendEmail({
      to: email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
    });

    if (!emailResult.success) {
      logger.error('Failed to send verification email', {
        email,
        error: emailResult.error,
      });

      // 发送失败时清除已存储的验证码
      await verificationManager.clearCode(email, type);

      return NextResponse.json(
        { error: '邮件发送失败，请检查邮箱地址或稍后重试' },
        { status: 500 },
      );
    }

    // 8. 记录成功日志
    const duration = Date.now() - startTime;
    logger.info('Verification email sent successfully', {
      email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
      type,
      duration,
      messageId: emailResult.messageId,
    });

    // 9. 返回成功响应
    return NextResponse.json({
      success: true,
      message: '验证码已发送到您的邮箱',
      expiryMinutes: 10,
      canResendAfter: 60, // 60秒后可重新发送
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Send verification code failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
    });

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: '请求格式错误' },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: '服务器内部错误，请稍后重试' },
      { status: 500 },
    );
  }
}

// 获取验证码状态（可选的GET接口）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const type = searchParams.get('type') as 'registration' | 'login' | 'password_reset';

    if (!email || !type) {
      return NextResponse.json(
        { error: '缺少必需参数' },
        { status: 400 },
      );
    }

    // 验证邮箱格式
    const emailValidation = z.string().email().safeParse(email);
    if (!emailValidation.success) {
      return NextResponse.json(
        { error: '邮箱格式无效' },
        { status: 400 },
      );
    }

    // 获取验证码状态
    const status = await verificationManager.getCodeStatus(email, type);

    return NextResponse.json({
      exists: status.exists,
      expiresAt: status.expiresAt,
      remainingAttempts: status.remainingAttempts,
    });

  } catch (error) {
    logger.error('Get verification status failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: '获取状态失败' },
      { status: 500 },
    );
  }
}
