import { NextRequest, NextResponse } from 'next/server';

import { UpdatePlanRequest } from '@/core/subscription/plan-model';
import { planService } from '@/core/subscription/plan-service';

// 获取单个套餐详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: '套餐ID不能为空' },
        { status: 400 },
      );
    }

    const plan = await planService.getPlanById(id);

    if (!plan) {
      return NextResponse.json(
        { success: false, error: '套餐不存在' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      plan,
    });

  } catch (error) {
    console.error('获取套餐详情失败:', error);
    return NextResponse.json(
      { success: false, error: '获取套餐详情失败' },
      { status: 500 },
    );
  }
}

// 更新套餐
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: '套餐ID不能为空' },
        { status: 400 },
      );
    }

    const updateRequest: UpdatePlanRequest = {
      id: id,
      ...body,
    };

    const updatedPlan = await planService.updatePlan(updateRequest);

    return NextResponse.json({
      success: true,
      plan: updatedPlan,
      message: '套餐更新成功',
    });

  } catch (error) {
    console.error('更新套餐失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '更新套餐失败',
    }, { status: 500 });
  }
}

// 删除套餐
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: '套餐ID不能为空' },
        { status: 400 },
      );
    }

    const success = await planService.deletePlan(id);

    if (success) {
      return NextResponse.json({
        success: true,
        message: '套餐删除成功',
      });
    } else {
      return NextResponse.json(
        { success: false, error: '删除套餐失败' },
        { status: 500 },
      );
    }

  } catch (error) {
    console.error('删除套餐失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '删除套餐失败',
    }, { status: 500 });
  }
}
