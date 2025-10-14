import { NextRequest, NextResponse } from 'next/server';

import { wechatPayService } from '@/core/subscription/wechat-pay';

export async function GET(
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

    // 模拟查询支付状态
    // 在实际应用中，这里应该从数据库查询支付记录，然后调用微信支付API查询状态
    const mockPaymentStatus = await simulatePaymentStatusQuery(id);

    return NextResponse.json({
      success: true,
      paymentId: id,
      status: mockPaymentStatus.status,
      transactionId: mockPaymentStatus.transactionId,
      paidAt: mockPaymentStatus.paidAt,
      amount: mockPaymentStatus.amount,
    });

  } catch (error) {
    console.error('查询支付状态失败:', error);
    return NextResponse.json(
      { success: false, error: '查询支付状态失败' },
      { status: 500 },
    );
  }
}

// 模拟支付状态查询
async function simulatePaymentStatusQuery(paymentId: string) {
  // 模拟不同的支付状态
  const random = Math.random();

  if (random < 0.1) {
    // 10% 概率支付成功
    return {
      status: 'completed',
      transactionId: `wx_${Date.now()}`,
      paidAt: new Date(),
      amount: 6900, // 69元
    };
  } else if (random < 0.15) {
    // 5% 概率支付失败
    return {
      status: 'failed',
      transactionId: null,
      paidAt: null,
      amount: 6900,
    };
  } else {
    // 85% 概率待支付
    return {
      status: 'pending',
      transactionId: null,
      paidAt: null,
      amount: 6900,
    };
  }
}
