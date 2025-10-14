/**
 * 安全防护服务
 * 处理支付签名验证、数据加密和防篡改机制
 */

import crypto from 'crypto';

import { PaymentRecord, Subscription } from '@/shared/types/subscription';

/**
 * 安全配置
 */
export interface SecurityConfig {
  encryptionKey: string;
  signatureSecret: string;
  tokenSecret: string;
  enableEncryption: boolean;
  enableSignatureVerification: boolean;
  enableRateLimiting: boolean;
  maxRequestsPerMinute: number;
}

/**
 * 签名验证结果
 */
export interface SignatureVerificationResult {
  valid: boolean;
  reason?: string;
  timestamp?: Date;
}

/**
 * 加密结果
 */
export interface EncryptionResult {
  encryptedData: string;
  iv: string;
  tag: string;
}

/**
 * 解密结果
 */
export interface DecryptionResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * 访问令牌
 */
export interface AccessToken {
  userId: string;
  permissions: string[];
  tier: string;
  expiresAt: Date;
  signature: string;
}

/**
 * 安全服务类
 */
export class SecurityService {
  private static instance: SecurityService;
  private config: SecurityConfig;
  private rateLimitMap: Map<string, { count: number; resetTime: number }> = new Map();

  private constructor() {
    this.config = {
      encryptionKey: process.env.ENCRYPTION_KEY || this.generateRandomKey(32),
      signatureSecret: process.env.SIGNATURE_SECRET || this.generateRandomKey(64),
      tokenSecret: process.env.TOKEN_SECRET || this.generateRandomKey(32),
      enableEncryption: process.env.NODE_ENV === 'production',
      enableSignatureVerification: true,
      enableRateLimiting: true,
      maxRequestsPerMinute: 100,
    };
  }

  public static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  /**
   * 验证微信支付签名
   */
  verifyWeChatPaySignature(
    data: Record<string, any>,
    signature: string,
    apiKey: string,
  ): SignatureVerificationResult {
    try {
      // 过滤空值和sign字段
      const filteredData = Object.keys(data)
        .filter(key => data[key] !== undefined && data[key] !== '' && key !== 'sign')
        .sort()
        .reduce((obj, key) => {
          obj[key] = data[key];
          return obj;
        }, {} as Record<string, any>);

      // 构建签名字符串
      const stringA = Object.keys(filteredData)
        .map(key => `${key}=${filteredData[key]}`)
        .join('&');

      const stringSignTemp = `${stringA}&key=${apiKey}`;

      // MD5签名并转大写
      const calculatedSignature = crypto
        .createHash('md5')
        .update(stringSignTemp, 'utf8')
        .digest('hex')
        .toUpperCase();

      const valid = calculatedSignature === signature;

      return {
        valid,
        reason: valid ? undefined : '签名验证失败',
        timestamp: new Date(),
      };

    } catch (error) {
      console.error('微信支付签名验证失败:', error);
      return {
        valid: false,
        reason: '签名验证过程出错',
        timestamp: new Date(),
      };
    }
  }

  /**
   * 生成数据签名
   */
  generateDataSignature(data: Record<string, any>): string {
    try {
      // 排序并序列化数据
      const sortedKeys = Object.keys(data).sort();
      const dataString = sortedKeys
        .map(key => `${key}=${data[key]}`)
        .join('&');

      // 生成HMAC签名
      return crypto
        .createHmac('sha256', this.config.signatureSecret)
        .update(dataString)
        .digest('hex');

    } catch (error) {
      console.error('生成数据签名失败:', error);
      throw new Error('签名生成失败');
    }
  }

  /**
   * 验证数据签名
   */
  verifyDataSignature(data: Record<string, any>, signature: string): boolean {
    try {
      const calculatedSignature = this.generateDataSignature(data);
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(calculatedSignature, 'hex'),
      );
    } catch (error) {
      console.error('验证数据签名失败:', error);
      return false;
    }
  }

  /**
   * 加密敏感数据
   */
  encryptSensitiveData(data: any): EncryptionResult {
    try {
      if (!this.config.enableEncryption) {
        return {
          encryptedData: JSON.stringify(data),
          iv: '',
          tag: '',
        };
      }

      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher('aes-256-gcm', this.config.encryptionKey);
      cipher.setAAD(Buffer.from('subscription-data'));

      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const tag = cipher.getAuthTag();

      return {
        encryptedData: encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
      };

    } catch (error) {
      console.error('加密数据失败:', error);
      throw new Error('数据加密失败');
    }
  }

  /**
   * 解密敏感数据
   */
  decryptSensitiveData(encryptionResult: EncryptionResult): DecryptionResult {
    try {
      if (!this.config.enableEncryption) {
        return {
          success: true,
          data: JSON.parse(encryptionResult.encryptedData),
        };
      }

      const decipher = crypto.createDecipher('aes-256-gcm', this.config.encryptionKey);
      decipher.setAAD(Buffer.from('subscription-data'));
      decipher.setAuthTag(Buffer.from(encryptionResult.tag, 'hex'));

      let decrypted = decipher.update(encryptionResult.encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return {
        success: true,
        data: JSON.parse(decrypted),
      };

    } catch (error) {
      console.error('解密数据失败:', error);
      return {
        success: false,
        error: '数据解密失败',
      };
    }
  }

  /**
   * 生成访问令牌
   */
  generateAccessToken(
    userId: string,
    permissions: string[],
    tier: string,
    expiresIn: number = 3600, // 1小时
  ): string {
    try {
      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      const tokenData = {
        userId,
        permissions,
        tier,
        expiresAt: expiresAt.toISOString(),
        timestamp: Date.now(),
      };

      const signature = this.generateDataSignature(tokenData);

      const token = {
        ...tokenData,
        signature,
      };

      return Buffer.from(JSON.stringify(token)).toString('base64');

    } catch (error) {
      console.error('生成访问令牌失败:', error);
      throw new Error('令牌生成失败');
    }
  }

  /**
   * 验证访问令牌
   */
  verifyAccessToken(token: string): {
    valid: boolean;
    tokenData?: AccessToken;
    reason?: string;
  } {
    try {
      const tokenJson = Buffer.from(token, 'base64').toString('utf8');
      const tokenData = JSON.parse(tokenJson) as AccessToken;

      // 验证令牌结构
      if (!tokenData.userId || !tokenData.signature || !tokenData.expiresAt) {
        return {
          valid: false,
          reason: '令牌格式无效',
        };
      }

      // 验证过期时间
      const expiresAt = new Date(tokenData.expiresAt);
      if (expiresAt <= new Date()) {
        return {
          valid: false,
          reason: '令牌已过期',
        };
      }

      // 验证签名
      const { signature, ...dataToVerify } = tokenData;
      const isSignatureValid = this.verifyDataSignature(dataToVerify, signature);

      if (!isSignatureValid) {
        return {
          valid: false,
          reason: '令牌签名无效',
        };
      }

      return {
        valid: true,
        tokenData,
      };

    } catch (error) {
      console.error('验证访问令牌失败:', error);
      return {
        valid: false,
        reason: '令牌验证失败',
      };
    }
  }

  /**
   * 检查访问频率限制
   */
  checkRateLimit(identifier: string): {
    allowed: boolean;
    remainingRequests: number;
    resetTime: number;
  } {
    if (!this.config.enableRateLimiting) {
      return {
        allowed: true,
        remainingRequests: this.config.maxRequestsPerMinute,
        resetTime: Date.now() + 60000,
      };
    }

    const now = Date.now();
    const windowStart = Math.floor(now / 60000) * 60000; // 1分钟窗口
    const resetTime = windowStart + 60000;

    let rateLimitData = this.rateLimitMap.get(identifier);

    // 如果没有记录或窗口已重置
    if (!rateLimitData || rateLimitData.resetTime <= now) {
      rateLimitData = {
        count: 1,
        resetTime,
      };
      this.rateLimitMap.set(identifier, rateLimitData);

      return {
        allowed: true,
        remainingRequests: this.config.maxRequestsPerMinute - 1,
        resetTime,
      };
    }

    // 检查是否超过限制
    if (rateLimitData.count >= this.config.maxRequestsPerMinute) {
      return {
        allowed: false,
        remainingRequests: 0,
        resetTime: rateLimitData.resetTime,
      };
    }

    // 增加计数
    rateLimitData.count++;
    this.rateLimitMap.set(identifier, rateLimitData);

    return {
      allowed: true,
      remainingRequests: this.config.maxRequestsPerMinute - rateLimitData.count,
      resetTime: rateLimitData.resetTime,
    };
  }

  /**
   * 验证支付记录完整性
   */
  verifyPaymentRecordIntegrity(paymentRecord: PaymentRecord): {
    valid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // 检查必需字段
    if (!paymentRecord.id) issues.push('缺少支付记录ID');
    if (!paymentRecord.userId) issues.push('缺少用户ID');
    if (!paymentRecord.subscriptionId) issues.push('缺少订阅ID');
    if (paymentRecord.amount <= 0) issues.push('支付金额无效');

    // 检查状态一致性
    if (paymentRecord.status === 'completed' && !paymentRecord.paidAt) {
      issues.push('已完成支付缺少支付时间');
    }

    if (paymentRecord.status === 'completed' && !paymentRecord.transactionId) {
      issues.push('已完成支付缺少交易ID');
    }

    // 检查时间逻辑
    if (paymentRecord.paidAt && paymentRecord.paidAt < paymentRecord.createdAt) {
      issues.push('支付时间早于创建时间');
    }

    // 检查金额范围
    if (paymentRecord.amount > 100000000) { // 1000万分，即10万元
      issues.push('支付金额异常过大');
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * 验证订阅记录完整性
   */
  verifySubscriptionIntegrity(subscription: Subscription): {
    valid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // 检查必需字段
    if (!subscription.id) issues.push('缺少订阅ID');
    if (!subscription.userId) issues.push('缺少用户ID');
    if (!subscription.planId) issues.push('缺少套餐ID');

    // 检查时间逻辑
    if (subscription.endDate <= subscription.startDate) {
      issues.push('结束时间早于或等于开始时间');
    }

    if (subscription.nextBillingDate < subscription.startDate) {
      issues.push('下次计费时间早于开始时间');
    }

    // 检查状态一致性
    if (subscription.status === 'active' && subscription.endDate <= new Date()) {
      issues.push('活跃订阅已过期');
    }

    // 检查配额合理性
    const quotas = subscription.quotas;
    if (quotas.dailyCreateQuota < -1) issues.push('每日创建配额值无效');
    if (quotas.dailyReuseQuota < -1) issues.push('每日复用配额值无效');
    if (quotas.maxExportsPerDay < -1) issues.push('每日导出配额值无效');
    if (quotas.maxGraphNodes < -1) issues.push('知识图谱节点配额值无效');

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * 清理过期的访问频率记录
   */
  cleanupExpiredRateLimits(): void {
    const now = Date.now();

    for (const [identifier, data] of this.rateLimitMap.entries()) {
      if (data.resetTime <= now) {
        this.rateLimitMap.delete(identifier);
      }
    }
  }

  // 私有方法

  /**
   * 生成随机密钥
   */
  private generateRandomKey(length: number): string {
    return crypto.randomBytes(length).toString('hex');
  }
}

// 导出单例实例
export const securityService = SecurityService.getInstance();

// 导出安全工具函数
export const SecurityUtils = {
  /**
   * 生成安全的随机ID
   */
  generateSecureId(prefix: string = ''): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(8).toString('hex');
    return `${prefix}${timestamp}_${random}`;
  },

  /**
   * 哈希敏感信息
   */
  hashSensitiveInfo(info: string): string {
    return crypto.createHash('sha256').update(info).digest('hex');
  },

  /**
   * 验证输入数据安全性
   */
  validateInputSecurity(input: any): {
    safe: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    if (typeof input === 'string') {
      // 检查SQL注入
      if (/('|(\\')|(;)|(\\;)|(\\x00)|(\\n)|(\\r)|(\\x1a))/i.test(input)) {
        issues.push('可能包含SQL注入攻击');
      }

      // 检查XSS
      if (/<script|javascript:|on\w+\s*=/i.test(input)) {
        issues.push('可能包含XSS攻击');
      }

      // 检查路径遍历
      if (/\.\.[\/\\]/i.test(input)) {
        issues.push('可能包含路径遍历攻击');
      }
    }

    return {
      safe: issues.length === 0,
      issues,
    };
  },

  /**
   * 清理用户输入
   */
  sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '') // 移除尖括号
      .replace(/javascript:/gi, '') // 移除javascript协议
      .replace(/on\w+\s*=/gi, '') // 移除事件处理器
      .trim();
  },
};
