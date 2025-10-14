import { NextRequest, NextResponse } from 'next/server';

import { getRedisClient } from '@/lib/redis';

import { AuthenticatedRequest } from './auth';

export interface RateLimitOptions {
  type: 'generation' | 'reuse';
  skipForPremium?: boolean;
}

export function checkUsageLimit(options: RateLimitOptions) {
  return async (request: AuthenticatedRequest) => {
    const user = request.user;

    if (!user) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: '请先登录' },
        { status: 401 },
      );
    }

    // Reset daily usage if needed
    user.resetDailyUsage();

    // Check limits based on type
    let canProceed = false;
    let limitType = '';

    if (options.type === 'generation') {
      canProceed = user.canGenerate();
      limitType = '生成';
    } else if (options.type === 'reuse') {
      canProceed = user.canReuse();
      limitType = '复用';
    }

    if (!canProceed) {
      const limits: Record<string, number> = {
        free: options.type === 'generation' ? 5 : 2,
        pro: options.type === 'generation' ? 20 : 10,
        super: options.type === 'generation' ? 100 : 30,
      };

      const userPlan = user.subscription.plan as string;
      return NextResponse.json({
        code: 'RATE_LIMIT_EXCEEDED',
        message: `今日${limitType}次数已用完（${limits[userPlan]}次），请升级订阅或明天再试`,
        currentPlan: user.subscription.plan,
        usageLimit: limits[userPlan],
        resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      }, { status: 429 });
    }

    return null; // Continue to handler
  };
}

export async function incrementUsage(userId: string, type: 'generation' | 'reuse') {
  try {
    const redis = await getRedisClient();
    const today = new Date().toISOString().split('T')[0];
    const key = `usage:${userId}:${type}:${today}`;

    await redis.incr(key);
    await redis.expire(key, 24 * 60 * 60); // Expire after 24 hours
  } catch (error) {
    console.error('Failed to increment usage:', error);
  }
}
