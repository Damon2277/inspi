import { NextRequest, NextResponse } from 'next/server';

import { subscriptionService } from '@/core/subscription/subscription-service';
import { wechatPayService } from '@/core/subscription/wechat-pay';
import { PaymentRecord, PaymentStatus } from '@/shared/types/subscription';

export async function POST(request: NextRequest) {
  try {
    // 获取微信支付通知的XML数据
    const xmlData = await request.text();

    console.log('收到微信支付通知:', xmlData);

    // 验证支付通知
    const notification = wechatPayService.verifyPaymentNotification(xmlData);

    if (!notification) {
      console.error('支付通知验证失败');
      return new NextResponse(
        wechatPayService.generateNotificationResponse(false, '签名验证失败'),
        {
          status: 200,
          headers: { 'Content-Type': 'application/xml' },
        },
      );
    }

    // 检查支付结果
    if (notification.returnCode !== 'SUCCESS' || notification.resultCode !== 'SUCCESS') {
      console.error('支付失败通知:', notification.errCodeDes);

      // 更新支付记录状态为失败
      await updatePaymentStatus(notification.outTradeNo, 'failed', {
        errorCode: notification.errCode,
        errorMessage: notification.errCodeDes,
      });

      return new NextResponse(
        wechatPayService.generateNotificationResponse(true, 'OK'),
        {
          status: 200,
          headers: { 'Content-Type': 'application/xml' },
        },
      );
    }

    // 处理支付成功
    await handlePaymentSuccess(notification);

    // 返回成功响应
    return new NextResponse(
      wechatPayService.generateNotificationResponse(true, 'OK'),
      {
        status: 200,
        headers: { 'Content-Type': 'application/xml' },
      },
    );

  } catch (error) {
    console.error('处理支付通知失败:', error);

    // 返回失败响应，微信会重试
    return new NextResponse(
      wechatPayService.generateNotificationResponse(false, '处理失败'),
      {
        status: 200,
        headers: { 'Content-Type': 'application/xml' },
      },
    );
  }
}

/**
 * 处理支付成功
 */
async function handlePaymentSuccess(notification: any) {
  try {
    const outTradeNo = notification.outTradeNo;
    const transactionId = notification.transactionId;
    const totalFee = notification.totalFee;
    const timeEnd = notification.timeEnd;

    console.log(`支付成功: 订单号=${outTradeNo}, 微信订单号=${transactionId}, 金额=${totalFee}`);

    // 更新支付记录状态
    const paymentRecord = await updatePaymentStatus(outTradeNo, 'completed', {
      transactionId,
      paidAmount: totalFee,
      paidAt: parseWeChatTime(timeEnd),
      bankType: notification.bankType,
    });

    if (!paymentRecord) {
      throw new Error('支付记录不存在');
    }

    // 激活订阅
    await activateSubscription(paymentRecord);

    // 发送支付成功通知
    await sendPaymentSuccessNotification(paymentRecord);

    console.log('支付处理完成:', outTradeNo);

  } catch (error) {
    console.error('处理支付成功失败:', error);
    throw error;
  }
}

/**
 * 更新支付状态
 */
async function updatePaymentStatus(
  outTradeNo: string,
  status: PaymentStatus,
  additionalData?: {
    transactionId?: string;
    paidAmount?: number;
    paidAt?: Date;
    bankType?: string;
    errorCode?: string;
    errorMessage?: string;
  },
): Promise<PaymentRecord | null> {
  try {
    // 在实际应用中，这里应该更新数据库中的支付记录
    // 目前返回模拟数据
    const mockPaymentRecord: PaymentRecord = {
      id: `pay_${outTradeNo}`,
      subscriptionId: 'sub_123',
      userId: 'user_123',
      amount: additionalData?.paidAmount || 6900,
      currency: 'CNY',
      paymentMethod: 'wechat_pay',
      paymentId: outTradeNo,
      status,
      billingPeriodStart: new Date(),
      billingPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...(additionalData?.transactionId && { transactionId: additionalData.transactionId }),
      ...(additionalData?.paidAt && { paidAt: additionalData.paidAt }),
      ...(additionalData?.bankType && { bankType: additionalData.bankType }),
    };

    console.log('支付记录状态更新:', mockPaymentRecord);
    return mockPaymentRecord;

  } catch (error) {
    console.error('更新支付状态失败:', error);
    return null;
  }
}

/**
 * 激活订阅
 */
async function activateSubscription(paymentRecord: PaymentRecord) {
  try {
    // 更新订阅状态为活跃
    await subscriptionService.updateSubscription(
      paymentRecord.subscriptionId,
      { status: 'active' },
    );

    console.log('订阅激活成功:', paymentRecord.subscriptionId);

  } catch (error) {
    console.error('激活订阅失败:', error);
    throw error;
  }
}

/**
 * 发送支付成功通知
 */
async function sendPaymentSuccessNotification(paymentRecord: PaymentRecord) {
  try {
    // 发送邮件通知
    console.log('发送支付成功邮件通知:', paymentRecord.userId);

    // 发送系统内通知
    console.log('发送系统内通知:', paymentRecord.userId);

    // 在实际应用中，这里应该调用邮件服务和通知服务

  } catch (error) {
    console.error('发送支付成功通知失败:', error);
    // 通知发送失败不应该影响支付处理流程
  }
}

/**
 * 解析微信时间格式
 */
function parseWeChatTime(timeStr: string): Date {
  // 微信时间格式：yyyyMMddHHmmss
  const year = parseInt(timeStr.substr(0, 10), 10);
  const month = parseInt(timeStr.substr(4, 10), 10) - 1; // 月份从0开始
  const day = parseInt(timeStr.substr(6, 10), 10);
  const hour = parseInt(timeStr.substr(8, 10), 10);
  const minute = parseInt(timeStr.substr(10, 10), 10);
  const second = parseInt(timeStr.substr(12, 10), 10);

  return new Date(year, month, day, hour, minute, second);
}
