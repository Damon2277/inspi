/**
 * 订阅升级API路由
 * 处理订阅升级和降级请求
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/core/auth/auth-service';
import { subscriptionManager } from '@/core/subscription/subscription-manager';
import { upgradeRecommendationEngine } from '@/core/subscription/upgrade-recommendation';
import { logger } from '@/shared/utils/logger';

/**
 * POST /api/subscription/upgrade
 * 升级订阅
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
    const { subscriptionId, newPlanId, effectiveDate = 'immediate', prorationMode = 'immediate' } = body;

    // 验证请求参数
    if (!subscriptionId) {
      return NextResponse.json(
        { error: '订阅ID不能为空' },
        { status: 400 },
      );
    }

    if (!newPlanId) {
      return NextResponse.json(
        { error: '新套餐ID不能为空' },
        { status: 400 },
      );
    }

    if (!['immediate', 'next_cycle'].includes(effectiveDate)) {
      return NextResponse.json(
        { error: '无效的生效时间' },
        { status: 400 },
      );
    }

    // 升级订阅
    const upgradeRequest = {
      subscriptionId,
      newPlanId,
      effectiveDate,
      prorationMode,
    };

    const result = await subscriptionManager.upgradeSubscription(upgradeRequest);

    logger.info('Subscription upgraded', {
      subscriptionId,
      newPlanId,
      userId: session.user.email,
      prorationAmount: result.prorationAmount,
    });

    return NextResponse.json({
      success: true,
      subscription: result.subscription,
      prorationAmount: result.prorationAmount,
      paymentRequired: result.paymentRequired,
      paymentInfo: result.paymentInfo,
    });
  } catch (error) {
    logger.error('Failed to upgrade subscription', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '升级订阅失败',
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/subscription/upgrade/recommendation
 * 获取升级推荐
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
    const includePrompt = searchParams.get('includePrompt') === 'true';
    const currentAction = searchParams.get('currentAction');
    const blockedByQuota = searchParams.get('blockedByQuota') === 'true';

    // 构建上下文
    const context = {
      sessionContext: currentAction ? {
        currentAction,
        blockedByQuota,
      } : undefined,
    };

    // 生成升级推荐
    const recommendation = await upgradeRecommendationEngine.generateUpgradeRecommendation(
      session.user.email,
      context,
    );

    if (!recommendation) {
      return NextResponse.json({
        success: true,
        recommendation: null,
        message: '暂无升级推荐',
      });
    }

    const response: any = {
      success: true,
      recommendation,
    };

    // 如果需要升级提示
    if (includePrompt) {
      const promptResult = await upgradeRecommendationEngine.shouldShowUpgradePrompt(
        session.user.email,
        context,
      );

      response.shouldShowPrompt = promptResult.shouldShow;
      response.prompt = promptResult.prompt;
      response.promptReason = promptResult.reason;
    }

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Failed to get upgrade recommendation', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: '获取升级推荐失败',
      },
      { status: 500 },
    );
  }
}
