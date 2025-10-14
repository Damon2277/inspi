/**
 * 邮件验证码生成和管理
 * 提供验证码生成、存储、验证功能
 */

import crypto from 'crypto';

import { redis } from '@/lib/cache/redis';
import { logger } from '@/shared/utils/logger';

export interface VerificationCode {
  code: string;
  email: string;
  type: 'registration' | 'login' | 'password_reset';
  expiresAt: Date;
  attempts: number;
}

export interface VerificationResult {
  success: boolean;
  error?: string;
  remainingAttempts?: number;
}

export class VerificationManager {
  private readonly CODE_LENGTH = 6;
  private readonly CODE_EXPIRY = 10 * 60; // 10分钟
  private readonly MAX_ATTEMPTS = 5;
  private readonly RATE_LIMIT_WINDOW = 60; // 1分钟
  private readonly MAX_REQUESTS_PER_WINDOW = 3;

  /**
   * 生成验证码
   */
  generateCode(): string {
    // 生成6位数字验证码
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * 生成安全的验证码（字母数字混合）
   */
  generateSecureCode(length = this.CODE_LENGTH): string {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * 存储验证码
   */
  async storeCode(
    email: string,
    code: string,
    type: 'registration' | 'login' | 'password_reset',
  ): Promise<boolean> {
    try {
      const key = this.getCodeKey(email, type);
      const expiresAt = new Date(Date.now() + this.CODE_EXPIRY * 1000);

      const verificationData: VerificationCode = {
        code,
        email,
        type,
        expiresAt,
        attempts: 0,
      };

      await redis.setJSON(key, verificationData, { ttl: this.CODE_EXPIRY });

      logger.info('Verification code stored', {
        email: this.maskEmail(email),
        type,
        expiresAt,
      });

      return true;
    } catch (error) {
      logger.error('Failed to store verification code', {
        email: this.maskEmail(email),
        type,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * 验证验证码
   */
  async verifyCode(
    email: string,
    code: string,
    type: 'registration' | 'login' | 'password_reset',
  ): Promise<VerificationResult> {
    try {
      const key = this.getCodeKey(email, type);
      const storedData = await redis.getJSON<VerificationCode>(key);

      if (!storedData) {
        logger.warn('Verification code not found or expired', {
          email: this.maskEmail(email),
          type,
        });
        return {
          success: false,
          error: '验证码不存在或已过期',
        };
      }

      // 检查是否过期
      if (new Date() > new Date(storedData.expiresAt)) {
        await redis.del(key);
        logger.warn('Verification code expired', {
          email: this.maskEmail(email),
          type,
        });
        return {
          success: false,
          error: '验证码已过期',
        };
      }

      // 检查尝试次数
      if (storedData.attempts >= this.MAX_ATTEMPTS) {
        await redis.del(key);
        logger.warn('Too many verification attempts', {
          email: this.maskEmail(email),
          type,
          attempts: storedData.attempts,
        });
        return {
          success: false,
          error: '验证失败次数过多，请重新获取验证码',
        };
      }

      // 验证码匹配
      if (storedData.code === code.toUpperCase()) {
        await redis.del(key); // 验证成功后删除验证码
        logger.info('Verification code verified successfully', {
          email: this.maskEmail(email),
          type,
        });
        return {
          success: true,
        };
      }

      // 验证失败，增加尝试次数
      storedData.attempts += 1;
      await redis.setJSON(key, storedData, { ttl: this.CODE_EXPIRY });

      logger.warn('Invalid verification code', {
        email: this.maskEmail(email),
        type,
        attempts: storedData.attempts,
      });

      return {
        success: false,
        error: '验证码错误',
        remainingAttempts: this.MAX_ATTEMPTS - storedData.attempts,
      };

    } catch (error) {
      logger.error('Failed to verify code', {
        email: this.maskEmail(email),
        type,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        error: '验证失败，请重试',
      };
    }
  }

  /**
   * 检查发送频率限制
   */
  async checkRateLimit(email: string): Promise<{ allowed: boolean; remainingTime?: number }> {
    try {
      const rateLimitKey = this.getRateLimitKey(email);
      const count = await redis.increment(rateLimitKey, { ttl: this.RATE_LIMIT_WINDOW });

      if (count > this.MAX_REQUESTS_PER_WINDOW) {
        const ttl = await this.getRemainingTTL(rateLimitKey);
        logger.warn('Rate limit exceeded for email verification', {
          email: this.maskEmail(email),
          count,
          remainingTime: ttl,
        });
        return {
          allowed: false,
          remainingTime: ttl,
        };
      }

      return { allowed: true };
    } catch (error) {
      logger.error('Failed to check rate limit', {
        email: this.maskEmail(email),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // 出错时允许发送，避免阻塞正常用户
      return { allowed: true };
    }
  }

  /**
   * 清除验证码
   */
  async clearCode(email: string, type: 'registration' | 'login' | 'password_reset'): Promise<void> {
    try {
      const key = this.getCodeKey(email, type);
      await redis.del(key);

      logger.info('Verification code cleared', {
        email: this.maskEmail(email),
        type,
      });
    } catch (error) {
      logger.error('Failed to clear verification code', {
        email: this.maskEmail(email),
        type,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 获取验证码状态
   */
  async getCodeStatus(
    email: string,
    type: 'registration' | 'login' | 'password_reset',
  ): Promise<{
    exists: boolean;
    expiresAt?: Date;
    attempts?: number;
    remainingAttempts?: number;
  }> {
    try {
      const key = this.getCodeKey(email, type);
      const storedData = await redis.getJSON<VerificationCode>(key);

      if (!storedData) {
        return { exists: false };
      }

      return {
        exists: true,
        expiresAt: new Date(storedData.expiresAt),
        attempts: storedData.attempts,
        remainingAttempts: this.MAX_ATTEMPTS - storedData.attempts,
      };
    } catch (error) {
      logger.error('Failed to get code status', {
        email: this.maskEmail(email),
        type,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return { exists: false };
    }
  }

  /**
   * 生成验证码存储键
   */
  private getCodeKey(email: string, type: string): string {
    const hash = crypto.createHash('sha256').update(email.toLowerCase()).digest('hex').slice(0, 16);
    return `verification:${type}:${hash}`;
  }

  /**
   * 生成频率限制键
   */
  private getRateLimitKey(email: string): string {
    const hash = crypto.createHash('sha256').update(email.toLowerCase()).digest('hex').slice(0, 16);
    return `rate_limit:verification:${hash}`;
  }

  /**
   * 获取剩余TTL
   */
  private async getRemainingTTL(key: string): Promise<number> {
    try {
      const client = redis['client'] || null;
      if (client && typeof client.ttl === 'function') {
        return await client.ttl(key);
      }
      return 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * 掩码邮箱地址
   */
  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (local.length <= 2) {
      return `${local}***@${domain}`;
    }
    return `${local.slice(0, 2)}***@${domain}`;
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      const testEmail = 'test@example.com';
      const testCode = this.generateCode();

      // 测试存储和验证流程
      await this.storeCode(testEmail, testCode, 'registration');
      const result = await this.verifyCode(testEmail, testCode, 'registration');

      return result.success;
    } catch (error) {
      logger.error('Verification manager health check failed', { error });
      return false;
    }
  }

  /**
   * 获取配置信息
   */
  getConfig() {
    return {
      codeLength: this.CODE_LENGTH,
      codeExpiry: this.CODE_EXPIRY,
      maxAttempts: this.MAX_ATTEMPTS,
      rateLimitWindow: this.RATE_LIMIT_WINDOW,
      maxRequestsPerWindow: this.MAX_REQUESTS_PER_WINDOW,
    };
  }
}

// 单例实例
export const verificationManager = new VerificationManager();
