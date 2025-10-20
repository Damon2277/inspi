import { NextRequest, NextResponse } from 'next/server';

import { wechatPayService } from '@/core/subscription/wechat-pay';
import connectDB from '@/lib/mongodb';
import { WeChatPayService } from '@/services/wechat-pay.service';

function parseWeChatTimestamp(timestamp?: string): Date | undefined {
  if (!timestamp) {
    return undefined;
  }

  if (timestamp.length === 14) {
    const year = Number(timestamp.slice(0, 4));
    const month = Number(timestamp.slice(4, 6)) - 1;
    const day = Number(timestamp.slice(6, 8));
    const hour = Number(timestamp.slice(8, 10));
    const minute = Number(timestamp.slice(10, 12));
    const second = Number(timestamp.slice(12, 14));

    return new Date(Date.UTC(year, month, day, hour, minute, second));
  }

  const parsed = new Date(timestamp);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

// 微信支付回调（内网接口）
export async function POST(request: NextRequest) {
  try {
    // 连接数据库
    await connectDB();

    const contentType = request.headers.get('content-type') || '';
    const rawBody = await request.text();

    if (contentType.includes('application/json')) {
      const jsonData = JSON.parse(rawBody);

      const result = await WeChatPayService.handlePaymentCallback({
        orderId: jsonData.out_trade_no,
        transactionId: jsonData.transaction_id,
        status: jsonData.trade_state === 'SUCCESS' ? 'success' : 'failed',
        paidAt: jsonData.success_time ? parseWeChatTimestamp(jsonData.success_time) : undefined,
        failedReason: jsonData.trade_state_desc,
      });

      const responseXml = wechatPayService.generateNotificationResponse(result, result ? 'OK' : 'Process failed');
      return new NextResponse(responseXml, {
        status: result ? 200 : 500,
        headers: {
          'Content-Type': 'application/xml',
        },
      });
    }

    const notification = wechatPayService.verifyPaymentNotification(rawBody);

    if (!notification) {
      const failXml = wechatPayService.generateNotificationResponse(false, 'Invalid signature');
      return new NextResponse(failXml, {
        status: 401,
        headers: { 'Content-Type': 'application/xml' },
      });
    }

    const result = await WeChatPayService.handlePaymentCallback({
      orderId: notification.outTradeNo,
      transactionId: notification.transactionId,
      status: notification.resultCode === 'SUCCESS' ? 'success' : 'failed',
      paidAt: parseWeChatTimestamp(notification.timeEnd),
      failedReason: notification.errCodeDes,
    });

    const responseXml = wechatPayService.generateNotificationResponse(result);

    return new NextResponse(responseXml, {
      status: result ? 200 : 500,
      headers: {
        'Content-Type': 'application/xml',
      },
    });
  } catch (error: any) {
    console.error('POST /api/payment/wechat/callback error:', error);
    const responseXml = wechatPayService.generateNotificationResponse(false, error.message || 'Internal error');
    return new NextResponse(responseXml, {
      status: 500,
      headers: {
        'Content-Type': 'application/xml',
      },
    });
  }
}

// 查询支付状态（前端轮询使用）
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Order ID is required',
        },
        { status: 400 },
      );
    }

    const status = await WeChatPayService.queryPaymentStatus(orderId);

    return NextResponse.json({
      success: true,
      data: {
        orderId,
        status,
      },
    });
  } catch (error: any) {
    console.error('GET /api/payment/wechat/callback error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to query payment status',
      },
      { status: 500 },
    );
  }
}
