/**
 * 支付回调API路由
 * 处理微信支付和支付宝的支付通知
 */
import { NextRequest, NextResponse } from 'next/server';

import { paymentService } from '@/core/subscription/payment-service';
import { logger } from '@/shared/utils/logger';

/**
 * POST /api/subscription/payment/webhook
 * 处理支付回调通知
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentMethod = searchParams.get('method') as 'wechat_pay' | 'alipay';

    if (!paymentMethod || !['wechat_pay', 'alipay'].includes(paymentMethod)) {
      return NextResponse.json(
        { error: '无效的支付方式' },
        { status: 400 },
      );
    }

    // 获取通知数据
    let notificationData: any;

    if (paymentMethod === 'wechat_pay') {
      // 微信支付通知是XML格式
      const xmlData = await request.text();
      notificationData = await parseWeChatXML(xmlData);
    } else {
      // 支付宝通知是表单格式
      notificationData = await request.json();
    }

    // 处理支付通知
    const result = await paymentService.handlePaymentNotification(
      paymentMethod,
      notificationData,
    );

    if (result.success) {
      logger.info('Payment notification processed successfully', {
        paymentMethod,
        paymentId: notificationData.out_trade_no || notificationData.out_trade_no,
      });

      // 返回成功响应
      if (paymentMethod === 'wechat_pay') {
        return new NextResponse(
          '<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>',
          {
            status: 200,
            headers: { 'Content-Type': 'application/xml' },
          },
        );
      } else {
        return NextResponse.json({ success: true });
      }
    } else {
      logger.error('Payment notification processing failed', {
        paymentMethod,
        error: result.message,
      });

      // 返回失败响应
      if (paymentMethod === 'wechat_pay') {
        return new NextResponse(
          '<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[处理失败]]></return_msg></xml>',
          {
            status: 200,
            headers: { 'Content-Type': 'application/xml' },
          },
        );
      } else {
        return NextResponse.json({ success: false, error: result.message });
      }
    }
  } catch (error) {
    logger.error('Payment webhook error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: '处理支付通知失败' },
      { status: 500 },
    );
  }
}

/**
 * 解析微信支付XML通知
 */
async function parseWeChatXML(xmlData: string): Promise<any> {
  // 简单的XML解析实现
  const result: any = {};

  const regex = /<(\w+)><!\[CDATA\[(.*?)\]\]><\/\w+>/g;
  let match;

  while ((match = regex.exec(xmlData)) !== null) {
    const [, key, value] = match;
    result[key] = value;
  }

  // 处理没有CDATA的标签
  const simpleRegex = /<(\w+)>([^<]+)<\/\w+>/g;
  while ((match = simpleRegex.exec(xmlData)) !== null) {
    const [, key, value] = match;
    if (!result[key]) {
      result[key] = value;
    }
  }

  return result;
}
