import { NextRequest, NextResponse } from 'next/server';

import { CreatePlanRequest } from '@/core/subscription/plan-model';
import { planService } from '@/core/subscription/plan-service';
import { PLAN_LIMITS, PlanQuotas, UserTier } from '@/shared/types/subscription';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 验证必需参数
    const { name, tier, monthlyPrice, quotas, features, description } = body;

    if (!name || !tier || monthlyPrice === undefined || !quotas || !features || !description) {
      return NextResponse.json(
        { success: false, error: '缺少必需参数' },
        { status: 400 },
      );
    }

    // 构建创建请求
    const tierValue = (tier as UserTier) || 'free';
    const baseQuotas = PLAN_LIMITS[tierValue] ?? PLAN_LIMITS.free;
    const incomingQuotas = quotas || {};

    const normalizedQuotas = {
      dailyCreateQuota: typeof incomingQuotas.dailyCreateQuota === 'number'
        ? incomingQuotas.dailyCreateQuota
        : baseQuotas.dailyCreateQuota,
      dailyReuseQuota: typeof incomingQuotas.dailyReuseQuota === 'number'
        ? incomingQuotas.dailyReuseQuota
        : baseQuotas.dailyReuseQuota,
      maxExportsPerDay: typeof incomingQuotas.maxExportsPerDay === 'number'
        ? incomingQuotas.maxExportsPerDay
        : baseQuotas.maxExportsPerDay,
      maxGraphNodes: typeof incomingQuotas.maxGraphNodes === 'number'
        ? incomingQuotas.maxGraphNodes
        : baseQuotas.maxGraphNodes,
    } satisfies PlanQuotas;

    const normalizedFeatures = Array.isArray(features)
      ? features.map((feature: unknown) => String(feature))
      : [];

    const createRequest: CreatePlanRequest = {
      name,
      tier,
      monthlyPrice,
      yearlyPrice: body.yearlyPrice,
      quotas: normalizedQuotas,
      features: normalizedFeatures,
      description,
      metadata: body.metadata || {},
    };

    // 创建套餐
    const plan = await planService.createPlan(createRequest);

    return NextResponse.json({
      success: true,
      plan,
      message: '套餐创建成功',
    });

  } catch (error) {
    console.error('创建套餐失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '创建套餐失败',
      },
      { status: 500 },
    );
  }
}
