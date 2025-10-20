import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

import { wechatPayService, WeChatPayUtils } from '@/core/subscription/wechat-pay';
import { PaymentTransaction, PaymentStatus, PaymentType } from '@/models/subscription';

export interface WeChatPayConfig {
  appId: string;
  mchId: string;
  apiKey: string;
  notifyUrl: string;
  // 模拟模式，开发环境下使用
  mockMode?: boolean;
}

export interface CreatePaymentResult {
  orderId: string;
  txId: string;
  qrCodeUrl: string;
  qrCodeImage?: string;
  expiresAt: Date;
  amount: number;
  prepayId?: string;
}

export interface PaymentCallbackData {
  orderId: string;
  transactionId: string;
  status: 'success' | 'failed';
  paidAt?: Date;
  failedReason?: string;
}

export interface CreatePaymentOptions {
  userId: string;
  type?: PaymentType;
  clientIp?: string;
}

export class WeChatPayService {
  private static config: WeChatPayConfig = {
    appId: process.env.WECHAT_APP_ID || 'mock_app_id',
    mchId: process.env.WECHAT_MCH_ID || 'mock_mch_id',
    apiKey: process.env.WECHAT_API_KEY || 'mock_api_key',
    notifyUrl: process.env.WECHAT_NOTIFY_URL || 'https://api.inspi-ai.com/api/payment/wechat/callback',
    mockMode:
      process.env.WECHAT_PAY_MOCK === 'true' ||
      process.env.NODE_ENV !== 'production' ||
      !process.env.WECHAT_APP_ID ||
      !process.env.WECHAT_MCH_ID ||
      !process.env.WECHAT_API_KEY,
  };

  /**
   * 创建微信支付订单
   */
  static async createPayment(
    { userId, type = PaymentType.INITIAL, clientIp }: CreatePaymentOptions,
  ): Promise<CreatePaymentResult> {
    try {
      const orderId = this.generateOrderId();
      const txId = uuidv4();
      const amount = 15.00;
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30分钟过期

      // 创建支付记录
      const transaction = await PaymentTransaction.create({
        txId,
        userId,
        amount,
        currency: 'CNY',
        channel: 'wechat',
        status: PaymentStatus.PENDING,
        type,
        orderId,
        qrCodeExpiredAt: expiresAt,
      });

      let qrCodeUrl: string;
      let qrCodeImage: string | undefined;

      if (this.config.mockMode) {
        // 开发模式：生成模拟支付链接
        qrCodeUrl = `https://pay.weixin.qq.com/mock?orderId=${orderId}&amount=${amount}&userId=${userId}`;

        // 生成模拟二维码图片
        qrCodeImage = await this.generateQRCode(qrCodeUrl);

        // 模拟自动支付成功（5秒后）
        if (process.env.AUTO_PAY_SUCCESS === 'true') {
          setTimeout(() => {
            this.mockPaymentCallback({
              orderId,
              transactionId: `mock_wx_${Date.now()}`,
              status: 'success',
              paidAt: new Date(),
            });
          }, 5000);
        }
      } else {
        const wxPayResult = await this.callWeChatPayAPI({
          orderId,
          amount,
          userId,
          description: type === PaymentType.RENEWAL ? 'Inspi AI 教师专业版续费' : 'Inspi AI 教师专业版订阅',
          clientIp,
        });

        qrCodeUrl = wxPayResult.codeUrl;
        qrCodeImage = await this.generateQRCode(qrCodeUrl);
        transaction.prepayId = wxPayResult.prepayId;
      }

      // 更新交易记录
      transaction.qrCodeUrl = qrCodeUrl;
      transaction.qrCodeExpiredAt = expiresAt;
      await transaction.save();

      return {
        orderId,
        txId,
        qrCodeUrl,
        qrCodeImage,
        expiresAt,
        amount,
        prepayId: transaction.prepayId,
      };
    } catch (error) {
      console.error('WeChatPayService.createPayment error:', error);
      throw error;
    }
  }

  /**
   * 处理支付回调
   */
  static async handlePaymentCallback(data: PaymentCallbackData): Promise<boolean> {
    try {
      const transaction = await PaymentTransaction.findOne({ orderId: data.orderId });

      if (!transaction) {
        console.error('Transaction not found:', data.orderId);
        return false;
      }

      // 防止重复处理
      if (transaction.status !== PaymentStatus.PENDING) {
        console.warn('Transaction already processed:', data.orderId);
        return true;
      }

      if (data.status === 'success') {
        transaction.status = PaymentStatus.SUCCESS;
        transaction.wechatTransactionId = data.transactionId;
        transaction.paidAt = data.paidAt || new Date();
      } else {
        transaction.status = PaymentStatus.FAILED;
        transaction.failedReason = data.failedReason || 'Payment failed';
      }

      await transaction.save();

      // 触发订阅创建或续费
      if (data.status === 'success') {
        await this.handlePaymentSuccess(transaction.userId, transaction.type);
      }

      return true;
    } catch (error) {
      console.error('WeChatPayService.handlePaymentCallback error:', error);
      throw error;
    }
  }

  /**
   * 查询支付状态
   */
  static async queryPaymentStatus(orderId: string): Promise<PaymentStatus> {
    try {
      const transaction = await PaymentTransaction.findOne({ orderId });

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // 检查是否过期
      if (transaction.status === PaymentStatus.PENDING &&
          transaction.qrCodeExpiredAt &&
          new Date() > transaction.qrCodeExpiredAt) {
        transaction.status = PaymentStatus.FAILED;
        transaction.failedReason = 'QR code expired';
        await transaction.save();
      }

      // 非模拟模式下，同步微信端订单状态
      if (!this.config.mockMode && transaction.status === PaymentStatus.PENDING) {
        try {
          const remoteStatus = await wechatPayService.getPaymentStatus(orderId);

          if (remoteStatus.status === 'completed') {
            transaction.status = PaymentStatus.SUCCESS;
            transaction.wechatTransactionId = remoteStatus.transactionId;
            transaction.paidAt = remoteStatus.paidAt || new Date();
            transaction.failedReason = undefined;
            await transaction.save();

            await this.handlePaymentSuccess(transaction.userId, transaction.type);
          } else if (remoteStatus.status === 'failed') {
            transaction.status = PaymentStatus.FAILED;
            transaction.failedReason = 'Payment failed by provider';
            await transaction.save();
          } else if (remoteStatus.status === 'refunded') {
            transaction.status = PaymentStatus.FAILED;
            transaction.failedReason = 'Payment refunded by provider';
            await transaction.save();
          }
        } catch (syncError) {
          console.warn('Failed to sync payment status with WeChat:', syncError);
        }
      }

      return transaction.status;
    } catch (error) {
      console.error('WeChatPayService.queryPaymentStatus error:', error);
      throw error;
    }
  }

  /**
   * 生成订单号
   */
  private static generateOrderId(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `INSPI${timestamp}${random}`;
  }

  /**
   * 生成二维码
   */
  private static async generateQRCode(url: string): Promise<string> {
    try {
      const qrCodeDataURL = await QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      return qrCodeDataURL;
    } catch (error) {
      console.error('Generate QR code error:', error);
      throw error;
    }
  }

  /**
   * 调用微信支付API（生产环境）
   */
  private static async callWeChatPayAPI(params: {
    orderId: string;
    amount: number;
    userId: string;
    description: string;
    clientIp?: string;
  }): Promise<{ codeUrl: string; prepayId?: string }> {
    const totalFee = WeChatPayUtils.yuanToFen(params.amount);

    const qrResult = await wechatPayService.generatePaymentQRCode({
      outTradeNo: params.orderId,
      body: params.description,
      totalFee,
      spbillCreateIp: params.clientIp || '127.0.0.1',
      tradeType: 'NATIVE',
      productId: params.orderId,
    });

    return {
      codeUrl: qrResult.qrCodeUrl,
      prepayId: qrResult.prepayId,
    };
  }

  /**
   * 处理支付成功
   */
  private static async handlePaymentSuccess(userId: string, type: PaymentType) {
    try {
      const { QuotaService } = await import('./quota.service');

      if (type === PaymentType.INITIAL) {
        // 创建新订阅
        await QuotaService.createSubscription(userId);
      } else {
        // 续费订阅
        await QuotaService.renewSubscription(userId);
      }

      // TODO: 发送成功通知（邮件、短信等）
      console.log(`Payment success for user ${userId}, type: ${type}`);
    } catch (error) {
      console.error('Handle payment success error:', error);
      throw error;
    }
  }

  /**
   * 模拟支付回调（开发环境）
   */
  private static async mockPaymentCallback(data: PaymentCallbackData) {
    console.log('Mock payment callback:', data);
    await this.handlePaymentCallback(data);
  }

  /**
   * 验证回调签名
   */
  static verifyCallbackSignature(rawBody: string): boolean {
    if (this.config.mockMode) {
      return true;
    }

    const notification = wechatPayService.verifyPaymentNotification(rawBody);
    return Boolean(notification);
  }

  /**
   * 申请退款（预留）
   */
  static async refund(orderId: string, reason: string): Promise<boolean> {
    // TODO: 实现退款逻辑
    console.log(`Refund request for order ${orderId}: ${reason}`);
    return false;
  }
}
