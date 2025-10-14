/**
 * 配额管理API路由
 * 处理配额查询、消费、统计等请求
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/core/auth/auth-service';
import { quotaManager } from '@/core/subscription/quota-manager';
import { logger } from '@/shared/utils/logger';

/**
 * GET /api/subscription/quota
 * 获取用户配额状态
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get('includeStats') === 'true';
    const days = parseInt(searchParams.get('days') || '7', 10);

    // 获取配额状态
    const quotaStatus = await quotaManager.getUserQuotaStatus(session.user.email);

    const response: any = {
      success: true,
      quota: quotaStatus,
    };

    // 如果需要统计数据
    if (includeStats) {
      const statistics = await quotaManager.getQuotaStatistics(session.user.email, days);
      response.statistics = statistics;
    }

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Failed to get quota status', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: '获取配额状态失败',
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/subscription/quota/consume
 * 消费配额
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { quotaType, amount = 1 } = body;

    if (!quotaType) {
      return NextResponse.json(
        { error: '配额类型不能为空' },
        { status: 400 },
      );
    }

    if (!['create', 'reuse', 'export', 'graph_nodes'].includes(quotaType)) {
      return NextResponse.json(
        { error: '无效的配额类型' },
        { status: 400 },
      );
    }

    if (amount <= 0 || amount > 100) {
      return NextResponse.json(
        { error: '配额数量必须在1-100之间' },
        { status: 400 },
      );
    }

    // 消费配额
    const result = await quotaManager.consumeQuota(
      session.user.email,
      quotaType,
      amount,
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          remaining: result.remaining,
        },
        { status: 429 }, // Too Many Requests
      );
    }

    return NextResponse.json({
      success: true,
      newUsage: result.newUsage,
      remaining: result.remaining,
    });
  } catch (error) {
    logger.error('Failed to consume quota', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: '消费配额失败',
      },
      { status: 500 },
    );
  }
}
