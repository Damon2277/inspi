import { NextRequest, NextResponse } from 'next/server';

import { planService } from '@/core/subscription/plan-service';
import { UserTier } from '@/shared/types/subscription';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // 获取当前用户层级
    const currentTier = searchParams.get('currentTier') as UserTier;

    // 推荐配置
    const config = {
      basedOnUsage: searchParams.get('basedOnUsage') === 'true',
      considerBudget: searchParams.get('considerBudget') === 'true',
      includePopular: searchParams.get('includePopular') !== 'false', // 默认包含热门
      maxRecommendations: parseInt(searchParams.get('maxRecommendations') || '3', 10),
    };

    // 获取推荐套餐
    const result = await planService.getRecommendedPlans(currentTier, config);

    return NextResponse.json({
      success: true,
      ...result,
    });

  } catch (error) {
    console.error('获取推荐套餐失败:', error);
    return NextResponse.json(
      { success: false, error: '获取推荐套餐失败' },
      { status: 500 },
    );
  }
}
