import { NextRequest, NextResponse } from 'next/server';

import { planService, PlanSearchOptions } from '@/core/subscription/plan-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // 解析搜索参数
    const options: PlanSearchOptions = {
      keyword: searchParams.get('keyword') || undefined,
      status: searchParams.get('status') as any,
      tier: searchParams.get('tier') as any,
      includeInactive: searchParams.get('includeInactive') === 'true',
      sortBy: searchParams.get('sortBy') as any,
      sortOrder: searchParams.get('sortOrder') as any,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : undefined,
    };

    // 价格范围
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    if (minPrice && maxPrice) {
      options.priceRange = {
        min: parseInt(minPrice, 10),
        max: parseInt(maxPrice, 10),
      };
    }

    // 功能过滤
    const features = searchParams.get('features');
    if (features) {
      options.features = features.split(',');
    }

    // 权限过滤
    const permissions = searchParams.get('permissions');
    if (permissions) {
      options.permissions = permissions.split(',');
    }

    // 执行搜索
    const result = await planService.searchPlans(options);

    return NextResponse.json({
      success: true,
      ...result,
    });

  } catch (error) {
    console.error('搜索套餐失败:', error);
    return NextResponse.json(
      { success: false, error: '搜索套餐失败' },
      { status: 500 },
    );
  }
}
