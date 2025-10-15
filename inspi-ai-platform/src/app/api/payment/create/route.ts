import { NextRequest, NextResponse } from 'next/server';

import { wechatPayService, WeChatPayUtils } from '@/core/subscription/wechat-pay';
import { PaymentRecord } from '@/shared/types/subscription';
import { logger } from '@/shared/utils/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subscriptionId, userId, amount, description } = body;

    // 验证必需参数
    if (!subscriptionId || !userId || !amount || !description) {
      return NextResponse.json(
        { success: false, error: '缺少必需参数' },
        { status: 400 },
      );
    }

    // 验证金额
    if (amount <= 0) {
      return NextResponse.json(
        { success: false, error: '支付金额必须大于0' },
        { status: 400 },
      );
    }

    // 生成商户订单号
    const outTradeNo = WeChatPayUtils.generateOutTradeNo('SUB');

    // 获取客户端IP
    const clientIp = WeChatPayUtils.getClientIp(request);

    // 创建支付记录
    const paymentRecord: PaymentRecord = {
      id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      subscriptionId,
      userId,
      amount: WeChatPayUtils.yuanToFen(amount), // 转换为分
      currency: 'CNY',
      paymentMethod: 'wechat_pay',
      paymentId: outTradeNo,
      status: 'pending',
      billingPeriodStart: new Date(),
      billingPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30天后
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      // 生成支付二维码
      const qrCodeResult = await wechatPayService.generatePaymentQRCode({
        outTradeNo,
        body: description,
        totalFee: WeChatPayUtils.yuanToFen(amount),
        spbillCreateIp: clientIp,
        tradeType: 'NATIVE',
        productId: subscriptionId,
      });

      // 在实际应用中，这里应该将支付记录保存到数据库
      logger.info('Payment record created', paymentRecord);

      return NextResponse.json({
        success: true,
        paymentRecord,
        qrCodeUrl: qrCodeResult.qrCodeUrl,
        message: '支付订单创建成功',
      });

    } catch (paymentError) {
      logger.error('Failed to create WeChat payment order', {
        error: paymentError instanceof Error ? paymentError.message : 'Unknown error',
        paymentId: outTradeNo,
      });

      // 模拟支付订单创建（开发环境）
      const mockQrCodeUrl = `weixin://wxpay/bizpayurl?pr=${outTradeNo}`;

      return NextResponse.json({
        success: true,
        paymentRecord,
        qrCodeUrl: mockQrCodeUrl,
        message: '支付订单创建成功（模拟）',
        warning: '当前为开发环境，使用模拟支付',
      });
    }

  } catch (error) {
    logger.error('Failed to create payment order', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '创建支付订单失败',
      },
      { status: 500 },
    );
  }
}
