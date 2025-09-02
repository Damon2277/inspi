/**
 * 使用限制中间件
 * 检查用户的使用限制并记录使用情况
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '../auth/jwt';
import { SubscriptionService } from '../services/subscriptionService';
import { UsageLimitError } from '../../types/subscription';

/**
 * 使用限制中间件
 */
export async function usageLimitMiddleware(
  request: NextRequest,
  type: 'generation' | 'reuse'
): Promise<NextResponse | null> {
  try {
    // 1. 验证用户身份
    const token = request.cookies.get('token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token) as any;
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const userId = payload.userId;

    // 2. 检查使用限制
    const limitCheck = await SubscriptionService.checkUsageLimit(userId, type);
    
    if (!limitCheck.allowed) {
      return NextResponse.json({
        error: 'Usage limit exceeded',
        message: `您今日的${type === 'generation' ? '生成' : '复用'}次数已用完`,
        current: limitCheck.current,
        limit: limitCheck.limit,
        plan: limitCheck.plan,
        resetTime: getNextResetTime()
      }, { status: 429 });
    }

    return null; // 通过检查
  } catch (error) {
    console.error('Usage limit middleware error:', error);
    
    if (error instanceof UsageLimitError) {
      return NextResponse.json({
        error: 'Usage limit exceeded',
        message: error.message,
        current: error.current,
        limit: error.limit,
        plan: error.plan,
        resetTime: getNextResetTime()
      }, { status: 429 });
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * 记录使用的辅助函数
 */
export async function recordUsage(
  request: NextRequest,
  type: 'generation' | 'reuse',
  count: number = 1
): Promise<void> {
  try {
    const token = request.cookies.get('token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) return;

    const payload = verifyToken(token) as any;
    if (!payload || !payload.userId) return;

    await SubscriptionService.recordUsage(payload.userId, type, count);
  } catch (error) {
    console.error('Record usage error:', error);
    // 不抛出错误，避免影响主要功能
  }
}

/**
 * 获取下次重置时间
 */
function getNextResetTime(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.toISOString();
}

/**
 * 获取用户ID的辅助函数
 */
export function getUserIdFromRequest(request: NextRequest): string | null {
  try {
    const token = request.cookies.get('token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) return null;

    const payload = verifyToken(token) as any;
    return payload?.userId || null;
  } catch {
    return null;
  }
}

export default usageLimitMiddleware;