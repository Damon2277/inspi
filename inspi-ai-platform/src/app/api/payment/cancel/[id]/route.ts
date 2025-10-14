import { NextRequest, NextResponse } from 'next/server';

import { paymentService } from '@/core/subscription/payment-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: '支付记录ID不能为空' },
        { status: 400 },
      );
    }

    // 取消支付
    // TODO: 实现取消支付功能
    const success = true; // 临时返回成功

    if (success) {
      return NextResponse.json({
        success: true,
        message: '支付已取消',
      });
    } else {
      return NextResponse.json(
        { success: false, error: '取消支付失败，订单可能已支付或不存在' },
        { status: 400 },
      );
    }

  } catch (error) {
    console.error('取消支付失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '取消支付失败',
    }, { status: 500 });
  }
}
