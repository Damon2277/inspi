/**
 * 验证邮箱验证码API
 * 验证用户输入的验证码是否正确
 */

import { NextRequest, NextResponse } from 'next/server';
import { verificationManager } from '@/lib/email/verification';
import { logger } from '@/lib/utils/logger';
import { z } from 'zod';

// 请求体验证schema
const verifyEmailSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  code: z.string().min(6, '验证码长度不正确').max(6, '验证码长度不正确'),
  type: z.enum(['registration', 'login', 'password_reset'], {
    errorMap: () => ({ message: '验证类型无效' })
  })
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    logger.info('Email verification request started');

    // 1. 解析请求体
    const body = await request.json();
    const validation = verifyEmailSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map(err => err.message).join(', ');
      return NextResponse.json(
        { error: errors },
        { status: 400 }
      );
    }

    const { email, code, type } = validation.data;

    // 2. 验证验证码
    const verificationResult = await verificationManager.verifyCode(
      email, 
      code.toUpperCase(), 
      type
    );

    const duration = Date.now() - startTime;

    if (verificationResult.success) {
      // 验证成功
      logger.info('Email verification successful', {
        email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
        type,
        duration
      });

      return NextResponse.json({
        success: true,
        message: '邮箱验证成功',
        verified: true
      });

    } else {
      // 验证失败
      logger.warn('Email verification failed', {
        email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
        type,
        error: verificationResult.error,
        remainingAttempts: verificationResult.remainingAttempts,
        duration
      });

      const statusCode = verificationResult.error?.includes('过期') ? 410 : 400;

      return NextResponse.json({
        success: false,
        error: verificationResult.error,
        remainingAttempts: verificationResult.remainingAttempts,
        verified: false
      }, { status: statusCode });
    }

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Email verification request failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration
    });

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: '请求格式错误' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '服务器内部错误，请稍后重试' },
      { status: 500 }
    );
  }
}

// 获取验证状态（可选的GET接口）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const type = searchParams.get('type') as 'registration' | 'login' | 'password_reset';

    if (!email || !type) {
      return NextResponse.json(
        { error: '缺少必需参数' },
        { status: 400 }
      );
    }

    // 验证邮箱格式
    const emailValidation = z.string().email().safeParse(email);
    if (!emailValidation.success) {
      return NextResponse.json(
        { error: '邮箱格式无效' },
        { status: 400 }
      );
    }

    // 获取验证码状态
    const status = await verificationManager.getCodeStatus(email, type);
    
    if (!status.exists) {
      return NextResponse.json({
        exists: false,
        message: '验证码不存在或已过期'
      });
    }

    // 检查是否过期
    const now = new Date();
    const isExpired = status.expiresAt && now > status.expiresAt;

    return NextResponse.json({
      exists: true,
      expired: isExpired,
      expiresAt: status.expiresAt,
      remainingAttempts: status.remainingAttempts,
      attempts: status.attempts
    });

  } catch (error) {
    logger.error('Get verification status failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json(
      { error: '获取验证状态失败' },
      { status: 500 }
    );
  }
}