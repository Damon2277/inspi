/**
 * 微信支付核心功能
 * 集成微信支付SDK，处理支付请求、二维码生成和状态查询
 */

import crypto from 'crypto';

import { PaymentRecord, PaymentStatus } from '@/shared/types/subscription';

/**
 * 微信支付配置
 */
export interface WeChatPayConfig {
  appId: string;           // 应用ID
  mchId: string;           // 商户号
  apiKey: string;          // API密钥
  certPath?: string;       // 证书路径
  keyPath?: string;        // 私钥路径
  notifyUrl: string;       // 支付结果通知URL
  sandbox?: boolean;       // 是否沙箱环境
}

/**
 * 统一下单请求参数
 */
export interface UnifiedOrderRequest {
  outTradeNo: string;      // 商户订单号
  body: string;            // 商品描述
  totalFee: number;        // 总金额（分）
  spbillCreateIp: string;  // 终端IP
  tradeType: 'NATIVE' | 'JSAPI' | 'APP' | 'H5'; // 交易类型
  openid?: string;         // 用户openid（JSAPI必填）
  productId?: string;      // 商品ID（NATIVE必填）
  sceneInfo?: string;      // 场景信息（H5必填）
}

/**
 * 统一下单响应
 */
export interface UnifiedOrderResponse {
  returnCode: string;      // 返回状态码
  returnMsg: string;       // 返回信息
  appid?: string;          // 应用ID
  mchId?: string;          // 商户号
  nonceStr?: string;       // 随机字符串
  sign?: string;           // 签名
  resultCode?: string;     // 业务结果
  prepayId?: string;       // 预支付交易会话标识
  tradeType?: string;      // 交易类型
  codeUrl?: string;        // 二维码链接（NATIVE）
  errCode?: string;        // 错误代码
  errCodeDes?: string;     // 错误代码描述
}

/**
 * 订单查询响应
 */
export interface OrderQueryResponse {
  returnCode: string;
  returnMsg: string;
  appid?: string;
  mchId?: string;
  nonceStr?: string;
  sign?: string;
  resultCode?: string;
  outTradeNo?: string;     // 商户订单号
  transactionId?: string;  // 微信支付订单号
  tradeState?: string;     // 交易状态
  tradeStateDesc?: string; // 交易状态描述
  bankType?: string;       // 付款银行
  totalFee?: number;       // 订单金额
  cashFee?: number;        // 现金支付金额
  timeEnd?: string;        // 支付完成时间
  errCode?: string;
  errCodeDes?: string;
}

/**
 * 支付通知数据
 */
export interface PaymentNotification {
  returnCode: string;
  returnMsg: string;
  appid: string;
  mchId: string;
  nonceStr: string;
  sign: string;
  resultCode: string;
  outTradeNo: string;
  transactionId: string;
  tradeType: string;
  bankType: string;
  totalFee: number;
  cashFee: number;
  timeEnd: string;
  errCode?: string;
  errCodeDes?: string;
}

/**
 * 微信支付服务类
 */
export class WeChatPayService {
  private config: WeChatPayConfig;
  private baseUrl: string;

  constructor(config: WeChatPayConfig) {
    this.config = config;
    this.baseUrl = config.sandbox
      ? 'https://api.mch.weixin.qq.com/sandboxnew'
      : 'https://api.mch.weixin.qq.com';
  }

  /**
   * 统一下单
   */
  async unifiedOrder(request: UnifiedOrderRequest): Promise<UnifiedOrderResponse> {
    try {
      const params: Record<string, string | number> = {
        appid: this.config.appId,
        mch_id: this.config.mchId,
        nonce_str: this.generateNonceStr(),
        body: request.body,
        out_trade_no: request.outTradeNo,
        total_fee: request.totalFee,
        spbill_create_ip: request.spbillCreateIp,
        notify_url: this.config.notifyUrl,
        trade_type: request.tradeType,
      };

      if (request.openid) {
        params.openid = request.openid;
      }

      if (request.productId) {
        params.product_id = request.productId;
      }

      if (request.sceneInfo) {
        params.scene_info = request.sceneInfo;
      }

      // 生成签名
      params.sign = this.generateSign(params);

      // 转换为XML
      const xml = this.objectToXml(params);

      // 发送请求
      const response = await this.sendRequest('/pay/unifiedorder', xml);

      // 解析响应
      const result = this.xmlToObject(response) as UnifiedOrderResponse;

      // 验证签名
      if (result.sign && !this.verifySign(result, result.sign)) {
        throw new Error('响应签名验证失败');
      }

      return result;
    } catch (error) {
      console.error('统一下单失败:', error);
      throw error;
    }
  }

  /**
   * 查询订单
   */
  async queryOrder(outTradeNo: string): Promise<OrderQueryResponse> {
    try {
      const params: Record<string, string | number> = {
        appid: this.config.appId,
        mch_id: this.config.mchId,
        out_trade_no: outTradeNo,
        nonce_str: this.generateNonceStr(),
      };

      // 生成签名
      params.sign = this.generateSign(params);

      // 转换为XML
      const xml = this.objectToXml(params);

      // 发送请求
      const response = await this.sendRequest('/pay/orderquery', xml);

      // 解析响应
      const result = this.xmlToObject(response) as OrderQueryResponse;

      // 验证签名
      if (result.sign && !this.verifySign(result, result.sign)) {
        throw new Error('响应签名验证失败');
      }

      return result;
    } catch (error) {
      console.error('查询订单失败:', error);
      throw error;
    }
  }

  /**
   * 关闭订单
   */
  async closeOrder(outTradeNo: string): Promise<boolean> {
    try {
      const params: Record<string, string | number> = {
        appid: this.config.appId,
        mch_id: this.config.mchId,
        out_trade_no: outTradeNo,
        nonce_str: this.generateNonceStr(),
      };

      // 生成签名
      params.sign = this.generateSign(params);

      // 转换为XML
      const xml = this.objectToXml(params);

      // 发送请求
      const response = await this.sendRequest('/pay/closeorder', xml);

      // 解析响应
      const result = this.xmlToObject(response);

      return result.return_code === 'SUCCESS' && result.result_code === 'SUCCESS';
    } catch (error) {
      console.error('关闭订单失败:', error);
      return false;
    }
  }

  /**
   * 生成支付二维码
   */
  async generatePaymentQRCode(request: UnifiedOrderRequest): Promise<{
    qrCodeUrl: string;
    prepayId: string;
    outTradeNo: string;
  }> {
    try {
      // 确保是NATIVE支付
      request.tradeType = 'NATIVE';

      const orderResult = await this.unifiedOrder(request);

      if (orderResult.returnCode !== 'SUCCESS' || orderResult.resultCode !== 'SUCCESS') {
        throw new Error(`生成支付订单失败: ${orderResult.returnMsg || orderResult.errCodeDes}`);
      }

      if (!orderResult.codeUrl) {
        throw new Error('未获取到支付二维码URL');
      }

      return {
        qrCodeUrl: orderResult.codeUrl,
        prepayId: orderResult.prepayId || '',
        outTradeNo: request.outTradeNo,
      };
    } catch (error) {
      console.error('生成支付二维码失败:', error);
      throw error;
    }
  }

  /**
   * 验证支付通知
   */
  verifyPaymentNotification(xmlData: string): PaymentNotification | null {
    try {
      const data = this.xmlToObject(xmlData) as PaymentNotification;

      // 验证签名
      if (!this.verifySign(data, data.sign)) {
        console.error('支付通知签名验证失败');
        return null;
      }

      // 验证商户号
      if (data.mchId !== this.config.mchId) {
        console.error('支付通知商户号不匹配');
        return null;
      }

      return data;
    } catch (error) {
      console.error('验证支付通知失败:', error);
      return null;
    }
  }

  /**
   * 生成支付通知响应
   */
  generateNotificationResponse(success: boolean, message?: string): string {
    const response = {
      return_code: success ? 'SUCCESS' : 'FAIL',
      return_msg: message || (success ? 'OK' : 'FAIL'),
    };

    return this.objectToXml(response);
  }

  /**
   * 获取支付状态
   */
  async getPaymentStatus(outTradeNo: string): Promise<{
    status: PaymentStatus;
    transactionId?: string;
    paidAt?: Date;
    amount?: number;
  }> {
    try {
      const queryResult = await this.queryOrder(outTradeNo);

      if (queryResult.returnCode !== 'SUCCESS') {
        return { status: 'failed' };
      }

      let status: PaymentStatus = 'pending';

      switch (queryResult.tradeState) {
        case 'SUCCESS':
          status = 'completed';
          break;
        case 'REFUND':
          status = 'refunded';
          break;
        case 'NOTPAY':
          status = 'pending';
          break;
        case 'CLOSED':
        case 'REVOKED':
        case 'PAYERROR':
          status = 'failed';
          break;
        default:
          status = 'pending';
      }

      return {
        status,
        transactionId: queryResult.transactionId,
        paidAt: queryResult.timeEnd ? this.parseWeChatTime(queryResult.timeEnd) : undefined,
        amount: queryResult.totalFee,
      };
    } catch (error) {
      console.error('获取支付状态失败:', error);
      return { status: 'failed' };
    }
  }

  // 私有方法

  /**
   * 生成随机字符串
   */
  private generateNonceStr(): string {
    return Math.random().toString(36).substr(2, 15);
  }

  /**
   * 生成签名
   */
  private generateSign(params: Record<string, any>): string {
    // 过滤空值和sign字段
    const filteredParams = Object.keys(params)
      .filter(key => params[key] !== undefined && params[key] !== '' && key !== 'sign')
      .sort()
      .reduce((obj, key) => {
        obj[key] = params[key];
        return obj;
      }, {} as Record<string, any>);

    // 构建签名字符串
    const stringA = Object.keys(filteredParams)
      .map(key => `${key}=${filteredParams[key]}`)
      .join('&');

    const stringSignTemp = `${stringA}&key=${this.config.apiKey}`;

    // MD5签名并转大写
    return crypto.createHash('md5').update(stringSignTemp, 'utf8').digest('hex').toUpperCase();
  }

  /**
   * 验证签名
   */
  private verifySign(params: Record<string, any>, sign: string): boolean {
    const calculatedSign = this.generateSign(params);
    return calculatedSign === sign;
  }

  /**
   * 对象转XML
   */
  private objectToXml(obj: Record<string, any>): string {
    let xml = '<xml>';

    Object.keys(obj).forEach(key => {
      const value = obj[key];
      if (typeof value === 'number') {
        xml += `<${key}>${value}</${key}>`;
      } else {
        xml += `<${key}><![CDATA[${value}]]></${key}>`;
      }
    });

    xml += '</xml>';
    return xml;
  }

  /**
   * XML转对象
   */
  private xmlToObject(xml: string): Record<string, any> {
    const obj: Record<string, any> = {};

    // 简单的XML解析（生产环境建议使用专业的XML解析库）
    const regex = /<(\w+)>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/\1>/g;
    let match;

    while ((match = regex.exec(xml)) !== null) {
      const key = match[1];
      const value = match[2];

      // 尝试转换为数字
      if (/^\d+$/.test(value)) {
        obj[key] = parseInt(value, 10);
      } else {
        obj[key] = value;
      }
    }

    return obj;
  }

  /**
   * 发送HTTP请求
   */
  private async sendRequest(path: string, data: string): Promise<string> {
    const url = `${this.baseUrl}${path}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'User-Agent': 'WeChatPay-Node-SDK',
        },
        body: data,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.text();
    } catch (error) {
      console.error('发送请求失败:', error);
      throw error;
    }
  }

  /**
   * 解析微信时间格式
   */
  private parseWeChatTime(timeStr: string): Date {
    // 微信时间格式：yyyyMMddHHmmss
    const year = parseInt(timeStr.substr(0, 10), 10);
    const month = parseInt(timeStr.substr(4, 10), 10) - 1; // 月份从0开始
    const day = parseInt(timeStr.substr(6, 10), 10);
    const hour = parseInt(timeStr.substr(8, 10), 10);
    const minute = parseInt(timeStr.substr(10, 10), 10);
    const second = parseInt(timeStr.substr(12, 10), 10);

    return new Date(year, month, day, hour, minute, second);
  }
}

/**
 * 微信支付工具函数
 */
export interface CreateWeChatPayOrderOptions {
  amount: number;
  description: string;
  userId: string;
  clientIp?: string;
}

export interface CreateWeChatPayOrderResult {
  qrCodeUrl: string;
  prepayId: string;
  outTradeNo: string;
}

export const WeChatPayUtils = {
  /**
   * 生成商户订单号
   */
  generateOutTradeNo(prefix: string = 'PAY'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  },

  /**
   * 分转元
   */
  fenToYuan(fen: number): number {
    return Math.round(fen / 100 * 100) / 100;
  },

  /**
   * 元转分
   */
  yuanToFen(yuan: number): number {
    return Math.round(yuan * 100);
  },

  /**
   * 格式化金额显示
   */
  formatAmount(fen: number): string {
    const yuan = this.fenToYuan(fen);
    return `¥${yuan.toFixed(2)}`;
  },

  /**
   * 验证商户订单号格式
   */
  validateOutTradeNo(outTradeNo: string): boolean {
    // 商户订单号规则：1-32位字母数字
    return /^[a-zA-Z0-9]{1,32}$/.test(outTradeNo);
  },

  /**
   * 获取客户端IP
   */
  getClientIp(request: Request): string {
    // 从请求头获取真实IP
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const remoteAddr = request.headers.get('remote-addr');

    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }

    return realIp || remoteAddr || '127.0.0.1';
  },

  /**
   * 创建微信支付订单（前端预留桩实现）
   */
  async createWeChatPayOrder({ amount, description, userId, clientIp }: CreateWeChatPayOrderOptions): Promise<CreateWeChatPayOrderResult> {
    const outTradeNo = this.generateOutTradeNo('PAY');

    return {
      qrCodeUrl: `/api/wechat-pay/qrcode?order=${outTradeNo}&user=${encodeURIComponent(userId)}`,
      prepayId: `mock_prepay_${outTradeNo}`,
      outTradeNo,
    };
  },
};

// 默认配置（开发环境）
export const DEFAULT_WECHAT_PAY_CONFIG: WeChatPayConfig = {
  appId: process.env.WECHAT_APP_ID || 'wx_test_app_id',
  mchId: process.env.WECHAT_MCH_ID || '1234567890',
  apiKey: process.env.WECHAT_API_KEY || 'test_api_key_32_characters_long',
  notifyUrl: process.env.WECHAT_NOTIFY_URL || 'https://your-domain.com/api/payment/wechat/notify',
  sandbox: process.env.NODE_ENV !== 'production',
};

// 导出单例实例
export const wechatPayService = new WeChatPayService(DEFAULT_WECHAT_PAY_CONFIG);
