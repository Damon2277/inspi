import crypto from 'crypto';

import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

import { WeChatPayUtils } from '@/core/subscription/wechat-pay';
import { PaymentTransaction, PaymentStatus, PaymentType } from '@/models/subscription';

const WECHAT_V3_BASE_URL = process.env.WECHAT_PAY_API_BASE_URL || 'https://api.mch.weixin.qq.com';

export interface WeChatPayConfig {
  appId: string;
  mchId: string;
  apiKey: string;
  notifyUrl: string;
  apiV3Key?: string;
  serialNo?: string;
  privateKey?: string;
  platformCert?: string;
  platformPublicKey?: string;
  platformSerialNo?: string;
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

interface WeChatNativeOrderResponse {
  code_url: string;
  prepay_id: string;
}

interface WeChatNativeTransactionResponse {
  trade_state: string;
  transaction_id?: string;
  out_trade_no: string;
  success_time?: string;
  trade_state_desc?: string;
  amount?: {
    total: number;
    payer_total?: number;
    currency?: string;
  };
}

interface WeChatNotificationResource {
  algorithm: string;
  ciphertext: string;
  nonce: string;
  associated_data?: string;
}

export class WeChatPayService {
  private static config: WeChatPayConfig = {
    appId: process.env.WECHAT_APP_ID || 'mock_app_id',
    mchId: process.env.WECHAT_MCH_ID || 'mock_mch_id',
    apiKey: process.env.WECHAT_API_KEY || 'mock_api_key',
    notifyUrl: process.env.WECHAT_NOTIFY_URL || 'https://api.inspi-ai.com/api/payment/wechat/callback',
    apiV3Key: process.env.WECHAT_API_V3_KEY,
    serialNo: process.env.WECHAT_MCH_SERIAL_NO,
    privateKey: process.env.WECHAT_PRIVATE_KEY,
    platformCert: process.env.WECHAT_PLATFORM_CERT,
    platformPublicKey: process.env.WECHAT_PLATFORM_PUBLIC_KEY,
    platformSerialNo: process.env.WECHAT_PLATFORM_SERIAL_NO,
    mockMode:
      process.env.WECHAT_PAY_MOCK === 'true' ||
      process.env.NODE_ENV !== 'production' ||
      !process.env.WECHAT_APP_ID ||
      !process.env.WECHAT_MCH_ID ||
      !process.env.WECHAT_API_KEY ||
      !process.env.WECHAT_API_V3_KEY ||
      !process.env.WECHAT_MCH_SERIAL_NO ||
      !process.env.WECHAT_PRIVATE_KEY,
  };

  private static merchantPrivateKey?: crypto.KeyObject;
  private static platformPublicKey?: crypto.KeyObject | null;
  private static apiV3KeyBuffer?: Buffer;

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
          const remoteStatus = await this.fetchRemoteTransaction(orderId);

          if (remoteStatus) {
            const mappedStatus = this.mapTradeState(remoteStatus.trade_state);

            if (mappedStatus === PaymentStatus.SUCCESS) {
              transaction.status = PaymentStatus.SUCCESS;
              transaction.wechatTransactionId = remoteStatus.transaction_id;
              transaction.paidAt = remoteStatus.success_time ? new Date(remoteStatus.success_time) : new Date();
              transaction.failedReason = undefined;
              await transaction.save();

              await this.handlePaymentSuccess(transaction.userId, transaction.type);
            } else if (mappedStatus === PaymentStatus.FAILED) {
              transaction.status = PaymentStatus.FAILED;
              transaction.failedReason = remoteStatus.trade_state_desc || 'Payment failed by provider';
              await transaction.save();
            }
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

    const payload = {
      appid: this.config.appId,
      mchid: this.config.mchId,
      description: params.description,
      out_trade_no: params.orderId,
      notify_url: this.config.notifyUrl,
      amount: {
        total: totalFee,
        currency: 'CNY',
      },
      scene_info: {
        payer_client_ip: params.clientIp || '127.0.0.1',
      },
      attach: JSON.stringify({ userId: params.userId }),
    };

    const response = await this.requestWeChatApi<WeChatNativeOrderResponse>(
      'POST',
      '/v3/pay/transactions/native',
      payload,
    );

    if (!response.code_url) {
      throw new Error('Failed to obtain WeChat payment code_url');
    }

    return {
      codeUrl: response.code_url,
      prepayId: response.prepay_id,
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

  private static mapTradeState(state?: string): PaymentStatus {
    switch (state) {
      case 'SUCCESS':
        return PaymentStatus.SUCCESS;
      case 'REFUND':
        return PaymentStatus.FAILED;
      case 'NOTPAY':
      case 'USERPAYING':
      case undefined:
        return PaymentStatus.PENDING;
      default:
        return PaymentStatus.FAILED;
    }
  }

  private static async fetchRemoteTransaction(orderId: string): Promise<WeChatNativeTransactionResponse | null> {
    if (this.config.mockMode) {
      return null;
    }

    const path = `/v3/pay/transactions/out-trade-no/${orderId}?mchid=${this.config.mchId}`;
    return this.requestWeChatApi<WeChatNativeTransactionResponse>('GET', path).catch(error => {
      console.warn('fetchRemoteTransaction error:', error);
      return null;
    });
  }

  /**
   * 验证回调签名
   */
  static verifyCallbackSignature(rawBody: string, headers?: Headers): boolean {
    if (this.config.mockMode) {
      return true;
    }

    return this.verifyV3Signature(rawBody, headers);
  }

  /**
   * 解析微信支付V3回调
   */
  static parseNativeNotification(rawBody: string, headers?: Headers): PaymentCallbackData | null {
    try {
      if (this.config.mockMode) {
        const mock = JSON.parse(rawBody);
        return {
          orderId: mock.orderId || mock.out_trade_no,
          transactionId: mock.transactionId || mock.transaction_id || `mock_${Date.now()}`,
          status: mock.trade_state === 'SUCCESS' || mock.status === 'success' ? 'success' : 'failed',
          paidAt: mock.paidAt ? new Date(mock.paidAt) : undefined,
          failedReason: mock.failedReason,
        };
      }

      if (!this.verifyV3Signature(rawBody, headers)) {
        console.error('WeChat V3 notification signature verification failed');
        return null;
      }

      const payload = JSON.parse(rawBody);

      if (!payload?.resource) {
        console.error('WeChat V3 notification missing resource payload');
        return null;
      }

      const resourceData = this.decryptNotificationResource(payload.resource as WeChatNotificationResource);

      return {
        orderId: resourceData.out_trade_no,
        transactionId: resourceData.transaction_id,
        status: resourceData.trade_state === 'SUCCESS' ? 'success' : 'failed',
        paidAt: resourceData.success_time ? new Date(resourceData.success_time) : undefined,
        failedReason: resourceData.trade_state_desc,
      };
    } catch (error) {
      console.error('parseNativeNotification error:', error);
      return null;
    }
  }

  private static verifyV3Signature(rawBody: string, headers?: Headers): boolean {
    if (!headers) {
      console.warn('Missing headers for WeChat signature verification');
      return false;
    }

    const signature = headers.get('wechatpay-signature');
    const timestamp = headers.get('wechatpay-timestamp');
    const nonce = headers.get('wechatpay-nonce');
    const serial = headers.get('wechatpay-serial') || undefined;

    if (!signature || !timestamp || !nonce) {
      console.warn('Incomplete WeChat signature headers');
      return false;
    }

    const platformKey = this.getPlatformPublicKey(serial);

    if (!platformKey) {
      console.warn('Platform certificate not configured; skipping signature verification');
      return true;
    }

    const verifier = crypto.createVerify('RSA-SHA256');
    const message = `${timestamp}\n${nonce}\n${rawBody}\n`;
    verifier.update(message, 'utf8');
    verifier.end();

    return verifier.verify(platformKey, signature, 'base64');
  }

  private static decryptNotificationResource(resource: WeChatNotificationResource): any {
    if (!resource?.ciphertext || !resource.nonce) {
      throw new Error('Invalid WeChat notification resource');
    }

    const apiV3Key = this.getApiV3Key();
    const encryptedData = Buffer.from(resource.ciphertext, 'base64');
    const authTag = encryptedData.subarray(encryptedData.length - 16);
    const data = encryptedData.subarray(0, encryptedData.length - 16);

    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      apiV3Key,
      Buffer.from(resource.nonce, 'utf8'),
    );

    if (resource.associated_data) {
      decipher.setAAD(Buffer.from(resource.associated_data, 'utf8'));
    }

    decipher.setAuthTag(authTag);

    const decoded = Buffer.concat([decipher.update(data), decipher.final()]);
    return JSON.parse(decoded.toString('utf8'));
  }

  private static getMerchantPrivateKey(): crypto.KeyObject {
    if (this.merchantPrivateKey) {
      return this.merchantPrivateKey;
    }

    const normalized = this.normalizePem(this.config.privateKey, 'KEY');
    if (!normalized) {
      throw new Error('WECHAT_PRIVATE_KEY is not configured');
    }

    this.merchantPrivateKey = crypto.createPrivateKey({ key: normalized });
    return this.merchantPrivateKey;
  }

  private static getPlatformPublicKey(serialFromHeader?: string): crypto.KeyObject | null {
    if (this.platformPublicKey !== undefined) {
      return this.platformPublicKey;
    }

    const certPem = this.normalizePem(this.config.platformCert, 'CERT');
    const keyPem = this.normalizePem(this.config.platformPublicKey, 'KEY');

    const material = certPem || keyPem;

    if (!material) {
      this.platformPublicKey = null;
      return null;
    }

    if (this.config.platformSerialNo && serialFromHeader && this.config.platformSerialNo !== serialFromHeader) {
      console.warn(
        `Configured platform serial ${this.config.platformSerialNo} ` +
        `does not match header serial ${serialFromHeader}. Continuing verification with provided material.`,
      );
    }

    this.platformPublicKey = crypto.createPublicKey({ key: material });
    return this.platformPublicKey;
  }

  private static getApiV3Key(): Buffer {
    if (this.apiV3KeyBuffer) {
      return this.apiV3KeyBuffer;
    }

    if (!this.config.apiV3Key) {
      throw new Error('WECHAT_API_V3_KEY is not configured');
    }

    if (this.config.apiV3Key.length !== 32) {
      console.warn('WeChat API v3 key should be 32 characters long');
    }

    this.apiV3KeyBuffer = Buffer.from(this.config.apiV3Key, 'utf8');
    return this.apiV3KeyBuffer;
  }

  private static normalizePem(input?: string, kind: 'KEY' | 'CERT' = 'KEY'): string | null {
    if (!input) {
      return null;
    }

    const cleaned = input.replace(/\\n/g, '\n').trim();

    if (cleaned.includes('-----BEGIN')) {
      return cleaned;
    }

    const label = kind === 'CERT' ? 'CERTIFICATE' : 'PRIVATE KEY';
    return `-----BEGIN ${label}-----\n${cleaned}\n-----END ${label}-----`;
  }

  private static buildAuthorization(
    method: 'GET' | 'POST',
    path: string,
    body: string,
    timestamp: string,
    nonceStr: string,
  ): string {
    if (!this.config.serialNo) {
      throw new Error('WECHAT_MCH_SERIAL_NO is not configured');
    }

    const message = `${method}\n${path}\n${timestamp}\n${nonceStr}\n${body}\n`;
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(message, 'utf8');
    signer.end();
    const signature = signer.sign(this.getMerchantPrivateKey(), 'base64');

    return `WECHATPAY2-SHA256-RSA2048 mchid="${this.config.mchId}",serial_no="${this.config.serialNo}",nonce_str="${nonceStr}",timestamp="${timestamp}",signature="${signature}"`;
  }

  private static async requestWeChatApi<T>(
    method: 'GET' | 'POST',
    path: string,
    payload?: Record<string, any>,
  ): Promise<T> {
    if (this.config.mockMode) {
      throw new Error('WeChat API unavailable in mock mode');
    }

    if (!path.startsWith('/')) {
      throw new Error('WeChat API path must start with /');
    }

    const body = payload ? JSON.stringify(payload) : '';
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = crypto.randomBytes(16).toString('hex');
    const authorization = this.buildAuthorization(method, path, body, timestamp, nonceStr);

    const response = await fetch(`${WECHAT_V3_BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json; charset=utf-8',
        Accept: 'application/json',
      },
      body: body || undefined,
    });

    if (!response.ok) {
      let errorDetails: any = null;
      try {
        errorDetails = await response.json();
      } catch {
        errorDetails = await response.text();
      }

      const message = typeof errorDetails === 'object' && errorDetails !== null
        ? `${errorDetails.code || response.status}: ${errorDetails.message || response.statusText}`
        : `${response.status}: ${errorDetails || response.statusText}`;

      throw new Error(`WeChat API request failed (${method} ${path}): ${message}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json() as Promise<T>;
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
