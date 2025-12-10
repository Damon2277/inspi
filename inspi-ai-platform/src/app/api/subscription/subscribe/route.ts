import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { DEMO_USER_ID } from '@/core/auth/constants';
import authOptions from '@/core/auth/next-auth-config';
import { WeChatPayUtils } from '@/core/subscription/wechat-pay';
import connectDB from '@/lib/mongodb';
import { PaymentType } from '@/models/subscription';
import { WeChatPayService } from '@/services/wechat-pay.service';

export async function POST(request: NextRequest) {
  try {
    // 连接数据库
    await connectDB();

    // 获取用户信息
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id || DEMO_USER_ID;

    // 检查是否已有进行中的订单
    // TODO: 添加订单检查逻辑

    // 创建支付订单
    const clientIp = WeChatPayUtils.getClientIp(request);

    const paymentResult = await WeChatPayService.createPayment({
      userId,
      type: PaymentType.INITIAL,
      clientIp,
    });

    return NextResponse.json({
      success: true,
      data: {
        orderId: paymentResult.orderId,
        txId: paymentResult.txId,
        qrCodeUrl: paymentResult.qrCodeUrl,
        qrCodeImage: paymentResult.qrCodeImage,
        expiresAt: paymentResult.expiresAt,
        amount: paymentResult.amount,
        prepayId: paymentResult.prepayId,
      },
    });
  } catch (error: any) {
    console.error('POST /api/subscription/subscribe error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create subscription',
      },
      { status: 500 },
    );
  }
}
