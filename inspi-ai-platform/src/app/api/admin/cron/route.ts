/**
 * 管理员定时任务触发API
 * 用于手动执行定时任务和系统维护
 */

import { NextRequest, NextResponse } from 'next/server';
import { SubscriptionCronTasks } from '@/lib/cron/subscriptionTasks';
import connectDB from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    // 简单的API密钥验证（生产环境应该使用更安全的方式）
    const apiKey = request.headers.get('x-api-key');
    const expectedApiKey = process.env.ADMIN_API_KEY || 'dev-admin-key';
    
    if (apiKey !== expectedApiKey) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await request.json();
    const { task } = body;

    let result;

    switch (task) {
      case 'daily-reset':
        await SubscriptionCronTasks.dailyUsageReset();
        result = { message: 'Daily usage reset completed' };
        break;

      case 'expired-check':
        const count = await SubscriptionCronTasks.checkExpiredSubscriptions();
        result = { message: `Processed ${count} expired subscriptions` };
        break;

      case 'cache-cleanup':
        await SubscriptionCronTasks.cleanupExpiredCache();
        result = { message: 'Cache cleanup completed' };
        break;

      case 'all':
        const results = await SubscriptionCronTasks.runMaintenanceTasks();
        result = {
          message: 'All maintenance tasks completed',
          results
        };
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid task. Available tasks: daily-reset, expired-check, cache-cleanup, all' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      task,
      timestamp: new Date().toISOString(),
      ...result
    });

  } catch (error) {
    console.error('Cron task execution error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// 健康检查
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'cron-tasks',
    timestamp: new Date().toISOString()
  });
}