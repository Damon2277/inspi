/**
 * 支付服务系统
 * 集成微信支付和支付宝，处理支付流程和回调
 */
import crypto from 'crypto';

import {
  PaymentInfo,
  PaymentResult,
  RefundResult,
  PaymentRecord,
  PaymentStatus,
  Currency,
} from '@/shared/types/subscription';
import { logger } from '@/shared/utils/logger';

export interface PaymentConfig {
  wechatPay: {
    appId: string
    mchId: string
    apiKey: string
    certPath?: string
    keyPath?: string
    notifyUrl: string
  }
  alipay?: {
    appId: string
    privateKey: string
    publicKey: string
    notifyUrl: string
  }
}

export interface CreatePaymentRequest {
  orderId: string
  amount: number
  currency: Currency
  description: string
  userId: string
  paymentMethod: 'wechat_pay' | 'alipay'
  metadata?: Record<string, any>
}

export interface PaymentNotification {
  paymentId: string
  orderId: string
  amount: number
  status: PaymentStatus
  transactionId: string
  paidAt: Date
  metadata?: Record<string, any>
}

interface WeChatUnifiedOrderParams {
  appid: string
  mch_id: string
  nonce_str: string
  body: string
  out_trade_no: string
  total_fee: number
  spbill_create_ip: string
  notify_url: string
  trade_type: 'NATIVE'
  sign?: string
}

interface WeChatOrderQueryParams {
  appid: string
  mch_id: string
  out_trade_no: string
  nonce_str: string
  sign?: string
}

interface WeChatRefundParams {
  appid: string
  mch_id: string
  nonce_str: string
  out_trade_no: string
  out_refund_no: string
  total_fee: number
  refund_fee: number
  refund_desc: string
  sign?: string
}

/**
 * 支付服务类
 */
export class PaymentService {
  private config: PaymentConfig;

  constructor(config: PaymentConfig) {
    this.config = config;
  }

  /**
   * 创建支付订单
   */
  async createPayment(request: CreatePaymentRequest): Promise<PaymentInfo> {
    try {
      this.validatePaymentRequest(request);

      switch (request.paymentMethod) {
        case 'wechat_pay':
          return await this.createWeChatPayment(request);
        case 'alipay':
          return await this.createAlipayPayment(request);
        default:
          throw new Error(`不支持的支付方式: ${request.paymentMethod}`);
      }
    } catch (error) {
      logger.error('Failed to create payment', {
        request,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * 查询支付状态
   */
  async queryPaymentStatus(paymentId: string): Promise<PaymentResult> {
    try {
      // 从数据库获取支付记录
      const paymentRecord = await this.getPaymentRecord(paymentId);
      if (!paymentRecord) {
        throw new Error('支付记录不存在');
      }

      // 根据支付方式查询状态
      switch (paymentRecord.paymentMethod) {
        case 'wechat_pay':
          return await this.queryWeChatPaymentStatus(paymentRecord);
        default:
          throw new Error(`不支持的支付方式: ${paymentRecord.paymentMethod}`);
      }
    } catch (error) {
      logger.error('Failed to query payment status', {
        paymentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        paymentId,
        error: error instanceof Error ? error.message : '查询支付状态失败',
      };
    }
  }

  /**
   * 处理支付回调
   */
  async handlePaymentNotification(
    paymentMethod: 'wechat_pay' | 'alipay',
    notificationData: any,
  ): Promise<{ success: boolean; message?: string }> {
    try {
      let notification: PaymentNotification;

      switch (paymentMethod) {
        case 'wechat_pay':
          notification = await this.parseWeChatNotification(notificationData);
          break;
        case 'alipay':
          notification = await this.parseAlipayNotification(notificationData);
          break;
        default:
          throw new Error(`不支持的支付方式: ${paymentMethod}`);
      }

      // 验证通知的真实性
      const isValid = await this.verifyNotification(paymentMethod, notificationData);
      if (!isValid) {
        throw new Error('支付通知验证失败');
      }

      // 处理支付结果
      await this.processPaymentResult(notification);

      logger.info('Payment notification processed', {
        paymentId: notification.paymentId,
        status: notification.status,
      });

      return { success: true };
    } catch (error) {
      logger.error('Failed to handle payment notification', {
        paymentMethod,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        message: error instanceof Error ? error.message : '处理支付通知失败',
      };
    }
  }

  /**
   * 申请退款
   */
  async requestRefund(
    paymentId: string,
    amount: number,
    reason: string,
  ): Promise<RefundResult> {
    try {
      const paymentRecord = await this.getPaymentRecord(paymentId);
      if (!paymentRecord) {
        throw new Error('支付记录不存在');
      }

      if (paymentRecord.status !== 'completed') {
        throw new Error('只能对已完成的支付申请退款');
      }

      if (amount > paymentRecord.amount) {
        throw new Error('退款金额不能超过支付金额');
      }

      // 根据支付方式处理退款
      switch (paymentRecord.paymentMethod) {
        case 'wechat_pay':
          return await this.processWeChatRefund(paymentRecord, amount, reason);
        default:
          throw new Error(`不支持的支付方式: ${paymentRecord.paymentMethod}`);
      }
    } catch (error) {
      logger.error('Failed to request refund', {
        paymentId,
        amount,
        reason,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        refundId: '',
        amount: 0,
        refundedAt: new Date(),
        error: error instanceof Error ? error.message : '申请退款失败',
      };
    }
  }

  /**
   * 获取支付记录
   */
  async getPaymentRecord(paymentId: string): Promise<PaymentRecord | null> {
    try {
      // 这里应该从数据库查询支付记录
      // 暂时返回模拟数据
      return null;
    } catch (error) {
      logger.error('Failed to get payment record', { paymentId, error });
      return null;
    }
  }

  /**
   * 获取用户支付历史
   */
  async getUserPaymentHistory(
    userId: string,
    limit: number = 10,
    offset: number = 0,
  ): Promise<{
    payments: PaymentRecord[]
    total: number
    hasMore: boolean
  }> {
    try {
      // 这里应该从数据库查询用户支付历史
      return {
        payments: [],
        total: 0,
        hasMore: false,
      };
    } catch (error) {
      logger.error('Failed to get user payment history', { userId, error });
      return {
        payments: [],
        total: 0,
        hasMore: false,
      };
    }
  }

  /**
   * 创建微信支付订单
   */
  private async createWeChatPayment(request: CreatePaymentRequest): Promise<PaymentInfo> {
    const paymentId = this.generatePaymentId();
    const nonceStr = this.generateNonceStr();
    const timestamp = Math.floor(Date.now() / 1000);

    // 构建支付参数
    const paymentParams: WeChatUnifiedOrderParams = {
      appid: this.config.wechatPay.appId,
      mch_id: this.config.wechatPay.mchId,
      nonce_str: nonceStr,
      body: request.description,
      out_trade_no: paymentId,
      total_fee: Math.round(request.amount * 100), // 转换为分
      spbill_create_ip: '127.0.0.1',
      notify_url: this.config.wechatPay.notifyUrl,
      trade_type: 'NATIVE',
    };

    // 生成签名
    const sign = this.generateWeChatSign(paymentParams);
    paymentParams.sign = sign;

    // 调用微信支付API
    const response = await this.callWeChatPayAPI('pay/unifiedorder', paymentParams);

    if (response.return_code !== 'SUCCESS' || response.result_code !== 'SUCCESS') {
      throw new Error(`微信支付创建失败: ${response.return_msg || response.err_code_des}`);
    }

    // 保存支付记录
    await this.savePaymentRecord({
      id: paymentId,
      subscriptionId: request.orderId,
      userId: request.userId,
      amount: request.amount,
      currency: request.currency,
      paymentMethod: 'wechat_pay',
      paymentId,
      status: 'pending',
      billingPeriodStart: new Date(),
      billingPeriodEnd: new Date(),
      retryCount: 0,
      metadata: request.metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return {
      paymentId,
      qrCode: response.code_url,
      amount: request.amount,
      currency: request.currency,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30分钟后过期
    };
  }

  /**
   * 创建支付宝支付订单
   */
  private async createAlipayPayment(request: CreatePaymentRequest): Promise<PaymentInfo> {
    // 支付宝支付实现
    throw new Error('支付宝支付暂未实现');
  }

  /**
   * 查询微信支付状态
   */
  private async queryWeChatPaymentStatus(paymentRecord: PaymentRecord): Promise<PaymentResult> {
    const nonceStr = this.generateNonceStr();

    const queryParams: WeChatOrderQueryParams = {
      appid: this.config.wechatPay.appId,
      mch_id: this.config.wechatPay.mchId,
      out_trade_no: paymentRecord.paymentId,
      nonce_str: nonceStr,
    };

    const sign = this.generateWeChatSign(queryParams);
    queryParams.sign = sign;

    const response = await this.callWeChatPayAPI('pay/orderquery', queryParams);

    if (response.return_code !== 'SUCCESS') {
      throw new Error(`查询失败: ${response.return_msg}`);
    }

    if (response.result_code !== 'SUCCESS') {
      return {
        success: false,
        paymentId: paymentRecord.paymentId,
        error: response.err_code_des,
      };
    }

    const success = response.trade_state === 'SUCCESS';

    return {
      success,
      paymentId: paymentRecord.paymentId,
      transactionId: response.transaction_id,
      amount: response.total_fee / 100,
      paidAt: success ? new Date(response.time_end) : undefined,
    };
  }

  /**
   * 解析微信支付通知
   */
  private async parseWeChatNotification(data: any): Promise<PaymentNotification> {
    return {
      paymentId: data.out_trade_no,
      orderId: data.out_trade_no,
      amount: data.total_fee / 100,
      status: data.result_code === 'SUCCESS' ? 'completed' : 'failed',
      transactionId: data.transaction_id,
      paidAt: new Date(data.time_end),
      metadata: {
        openid: data.openid,
        bank_type: data.bank_type,
      },
    };
  }

  /**
   * 解析支付宝通知
   */
  private async parseAlipayNotification(data: any): Promise<PaymentNotification> {
    // 支付宝通知解析实现
    throw new Error('支付宝通知解析暂未实现');
  }

  /**
   * 验证支付通知
   */
  private async verifyNotification(
    paymentMethod: 'wechat_pay' | 'alipay',
    data: any,
  ): Promise<boolean> {
    switch (paymentMethod) {
      case 'wechat_pay':
        return this.verifyWeChatNotification(data);
      case 'alipay':
        return this.verifyAlipayNotification(data);
      default:
        return false;
    }
  }

  /**
   * 验证微信支付通知
   */
  private verifyWeChatNotification(data: any): boolean {
    const sign = data.sign;
    delete data.sign;

    const generatedSign = this.generateWeChatSign(data);
    return sign === generatedSign;
  }

  /**
   * 验证支付宝通知
   */
  private verifyAlipayNotification(data: any): boolean {
    // 支付宝通知验证实现
    return true;
  }

  /**
   * 处理支付结果
   */
  private async processPaymentResult(notification: PaymentNotification): Promise<void> {
    try {
      // 更新支付记录状态
      await this.updatePaymentRecord(notification.paymentId, {
        status: notification.status,
        transactionId: notification.transactionId,
        paidAt: notification.paidAt,
        metadata: notification.metadata,
      });

      // 如果支付成功，触发订阅激活
      if (notification.status === 'completed') {
        await this.activateSubscription(notification.orderId);
      }

      logger.info('Payment result processed', {
        paymentId: notification.paymentId,
        status: notification.status,
      });
    } catch (error) {
      logger.error('Failed to process payment result', {
        notification,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * 处理微信退款
   */
  private async processWeChatRefund(
    paymentRecord: PaymentRecord,
    amount: number,
    reason: string,
  ): Promise<RefundResult> {
    const refundId = this.generateRefundId();
    const nonceStr = this.generateNonceStr();

    const refundParams: WeChatRefundParams = {
      appid: this.config.wechatPay.appId,
      mch_id: this.config.wechatPay.mchId,
      nonce_str: nonceStr,
      out_trade_no: paymentRecord.paymentId,
      out_refund_no: refundId,
      total_fee: Math.round(paymentRecord.amount * 100),
      refund_fee: Math.round(amount * 100),
      refund_desc: reason,
    };

    const sign = this.generateWeChatSign(refundParams);
    refundParams.sign = sign;

    try {
      const response = await this.callWeChatPayAPI('secapi/pay/refund', refundParams, true);

      if (response.return_code !== 'SUCCESS' || response.result_code !== 'SUCCESS') {
        throw new Error(`退款失败: ${response.return_msg || response.err_code_des}`);
      }

      // 更新支付记录
      await this.updatePaymentRecord(paymentRecord.id, {
        status: 'refunded',
        metadata: {
          ...paymentRecord.metadata,
          refundId,
          refundAmount: amount,
          refundReason: reason,
        },
      });

      return {
        success: true,
        refundId,
        amount,
        refundedAt: new Date(),
      };
    } catch (error) {
      logger.error('WeChat refund failed', {
        paymentId: paymentRecord.id,
        amount,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        refundId,
        amount: 0,
        refundedAt: new Date(),
        error: error instanceof Error ? error.message : '退款失败',
      };
    }
  }

  /**
   * 生成微信支付签名
   */
  private generateWeChatSign(params: Record<string, any>): string {
    // 排序参数
    const sortedKeys = Object.keys(params).sort();
    const stringA = sortedKeys
      .map(key => `${key}=${params[key]}`)
      .join('&');

    const stringSignTemp = `${stringA}&key=${this.config.wechatPay.apiKey}`;

    return crypto
      .createHash('md5')
      .update(stringSignTemp, 'utf8')
      .digest('hex')
      .toUpperCase();
  }

  /**
   * 调用微信支付API
   */
  private async callWeChatPayAPI(
    endpoint: string,
    params: Record<string, any>,
    requiresCert: boolean = false,
  ): Promise<any> {
    // 这里应该实现实际的微信支付API调用
    // 暂时返回模拟响应
    return {
      return_code: 'SUCCESS',
      result_code: 'SUCCESS',
      code_url: 'weixin://wxpay/bizpayurl?pr=mock_qr_code',
      trade_state: 'SUCCESS',
      transaction_id: 'mock_transaction_id',
      total_fee: params.total_fee || params.refund_fee,
      time_end: new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''),
    };
  }

  /**
   * 验证支付请求
   */
  private validatePaymentRequest(request: CreatePaymentRequest): void {
    if (!request.orderId) {
      throw new Error('订单ID不能为空');
    }

    if (!request.amount || request.amount <= 0) {
      throw new Error('支付金额必须大于0');
    }

    if (!request.description) {
      throw new Error('支付描述不能为空');
    }

    if (!request.userId) {
      throw new Error('用户ID不能为空');
    }
  }

  /**
   * 生成支付ID
   */
  private generatePaymentId(): string {
    return `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成退款ID
   */
  private generateRefundId(): string {
    return `refund_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成随机字符串
   */
  private generateNonceStr(): string {
    return Math.random().toString(36).substr(2, 15);
  }

  /**
   * 保存支付记录
   */
  private async savePaymentRecord(record: PaymentRecord): Promise<void> {
    // 这里应该保存到数据库
    logger.info('Payment record saved', { paymentId: record.id });
  }

  /**
   * 更新支付记录
   */
  private async updatePaymentRecord(
    paymentId: string,
    updates: Partial<PaymentRecord>,
  ): Promise<void> {
    // 这里应该更新数据库记录
    logger.info('Payment record updated', { paymentId, updates });
  }

  /**
   * 激活订阅
   */
  private async activateSubscription(subscriptionId: string): Promise<void> {
    // 这里应该调用订阅服务激活订阅
    logger.info('Subscription activated', { subscriptionId });
  }
}

// 默认配置
const defaultConfig: PaymentConfig = {
  wechatPay: {
    appId: process.env.WECHAT_PAY_APP_ID || '',
    mchId: process.env.WECHAT_PAY_MCH_ID || '',
    apiKey: process.env.WECHAT_PAY_API_KEY || '',
    notifyUrl: process.env.WECHAT_PAY_NOTIFY_URL || '',
  },
};

// 单例实例
export const paymentService = new PaymentService(defaultConfig);
export default paymentService;
