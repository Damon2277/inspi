/**
 * 防作弊检测服务
 * 实现基础的防作弊检测机制，包括IP频率限制、设备指纹检测、自我邀请检测等
 */

import { DatabaseService } from '../database';

export interface FraudDetectionResult {
  isValid: boolean
  riskLevel: 'low' | 'medium' | 'high'
  reasons: string[]
  actions: FraudAction[]
}

export interface FraudAction {
  type: 'block' | 'review' | 'warn' | 'monitor'
  description: string
  duration?: number // 持续时间（分钟）
}

export interface DeviceFingerprint {
  userAgent: string
  screenResolution: string
  timezone: string
  language: string
  platform: string
  cookieEnabled: boolean
  hash: string
}

export interface RegistrationAttempt {
  ip: string
  userAgent: string
  email: string
  inviteCode?: string
  deviceFingerprint?: DeviceFingerprint
  timestamp: Date
}

export interface FraudDetectionService {
  // IP频率检测
  checkIPFrequency(ip: string): Promise<FraudDetectionResult>

  // 设备指纹检测
  checkDeviceFingerprint(fingerprint: DeviceFingerprint): Promise<FraudDetectionResult>

  // 自我邀请检测
  checkSelfInvitation(inviterId: string, inviteeEmail: string, ip: string): Promise<FraudDetectionResult>

  // 批量注册检测
  checkBatchRegistration(attempt: RegistrationAttempt): Promise<FraudDetectionResult>

  // 综合风险评估
  assessRegistrationRisk(attempt: RegistrationAttempt, inviterId?: string): Promise<FraudDetectionResult>

  // 记录可疑行为
  recordSuspiciousActivity(activity: SuspiciousActivity): Promise<void>

  // 获取用户风险等级
  getUserRiskLevel(userId: string): Promise<'low' | 'medium' | 'high'>

  // 更新用户风险等级
  updateUserRiskLevel(userId: string, level: 'low' | 'medium' | 'high', reason: string): Promise<void>

  // 检查用户是否被禁止
  isUserBanned(userId: string): Promise<boolean>

  // 禁止用户参与邀请活动
  banUser(userId: string, reason: string, duration?: number): Promise<void>
}

export interface SuspiciousActivity {
  userId?: string
  ip: string
  type: 'ip_frequency' | 'device_reuse' | 'self_invitation' | 'batch_registration' | 'pattern_anomaly'
  description: string
  severity: 'low' | 'medium' | 'high'
  metadata?: Record<string, any>
  timestamp: Date
}

export class FraudDetectionServiceImpl implements FraudDetectionService {
  private readonly IP_FREQUENCY_LIMIT = 5; // 每小时最多5次注册
  private readonly DEVICE_REUSE_LIMIT = 3; // 同一设备最多3次注册
  private readonly BATCH_TIME_WINDOW = 300; // 5分钟内的批量检测窗口
  private readonly BATCH_COUNT_THRESHOLD = 3; // 批量注册阈值

  constructor(private db: DatabaseService) {}

  /**
   * 检查IP频率限制
   */
  async checkIPFrequency(ip: string): Promise<FraudDetectionResult> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      // 查询过去1小时内该IP的注册次数
      const query = `
        SELECT COUNT(*) as count
        FROM users 
        WHERE registration_ip = ? 
        AND created_at > ?
      `;

      const result = await this.db.queryOne<{ count: number | string }>(query, [ip, oneHourAgo]);
      const registrationCount = Number(result?.count) || 0;

      if (registrationCount >= this.IP_FREQUENCY_LIMIT) {
        return {
          isValid: false,
          riskLevel: 'high',
          reasons: [`IP ${ip} 在过去1小时内注册次数过多 (${registrationCount}次)`],
          actions: [{
            type: 'block',
            description: '暂时阻止该IP注册',
            duration: 60, // 1小时
          }],
        };
      } else if (registrationCount >= Math.floor(this.IP_FREQUENCY_LIMIT * 0.7)) {
        return {
          isValid: true,
          riskLevel: 'medium',
          reasons: [`IP ${ip} 注册频率较高 (${registrationCount}次)`],
          actions: [{
            type: 'monitor',
            description: '监控该IP的后续行为',
          }],
        };
      }

      return {
        isValid: true,
        riskLevel: 'low',
        reasons: [],
        actions: [],
      };
    } catch (error) {
      console.error('Failed to check IP frequency:', error);
      return {
        isValid: true,
        riskLevel: 'low',
        reasons: ['检测失败，默认通过'],
        actions: [],
      };
    }
  }

  /**
   * 检查设备指纹
   */
  async checkDeviceFingerprint(fingerprint: DeviceFingerprint): Promise<FraudDetectionResult> {
    try {
      // 查询该设备指纹的使用次数
      const query = `
        SELECT COUNT(DISTINCT user_id) as user_count
        FROM device_fingerprints 
        WHERE fingerprint_hash = ?
      `;

      const result = await this.db.queryOne<{ user_count: number | string }>(query, [fingerprint.hash]);
      const userCount = Number(result?.user_count) || 0;

      if (userCount >= this.DEVICE_REUSE_LIMIT) {
        return {
          isValid: false,
          riskLevel: 'high',
          reasons: [`设备指纹已被${userCount}个用户使用，超过限制`],
          actions: [{
            type: 'block',
            description: '阻止该设备注册新账户',
          }],
        };
      } else if (userCount >= Math.floor(this.DEVICE_REUSE_LIMIT * 0.7)) {
        return {
          isValid: true,
          riskLevel: 'medium',
          reasons: [`设备指纹已被${userCount}个用户使用`],
          actions: [{
            type: 'review',
            description: '需要人工审核',
          }],
        };
      }

      return {
        isValid: true,
        riskLevel: 'low',
        reasons: [],
        actions: [],
      };
    } catch (error) {
      console.error('Failed to check device fingerprint:', error);
      return {
        isValid: true,
        riskLevel: 'low',
        reasons: ['检测失败，默认通过'],
        actions: [],
      };
    }
  }

  /**
   * 检查自我邀请
   */
  async checkSelfInvitation(inviterId: string, inviteeEmail: string, ip: string): Promise<FraudDetectionResult> {
    try {
      // 检查邀请人的邮箱
      const inviterQuery = `
        SELECT email, registration_ip 
        FROM users 
        WHERE id = ?
      `;

      const inviter = await this.db.queryOne<{ email: string; registration_ip: string | null }>(inviterQuery, [inviterId]);

      if (!inviter) {
        return {
          isValid: false,
          riskLevel: 'high',
          reasons: ['邀请人不存在'],
          actions: [{
            type: 'block',
            description: '阻止无效邀请',
          }],
        };
      }

      // 检查是否为自我邀请（相同邮箱）
      if (inviter.email === inviteeEmail) {
        return {
          isValid: false,
          riskLevel: 'high',
          reasons: ['检测到自我邀请行为'],
          actions: [{
            type: 'block',
            description: '阻止自我邀请并记录违规行为',
          }],
        };
      }

      // 检查是否来自相同IP
      if (inviter.registration_ip === ip) {
        return {
          isValid: false,
          riskLevel: 'high',
          reasons: ['邀请人和被邀请人来自相同IP'],
          actions: [{
            type: 'block',
            description: '阻止相同IP邀请',
          }],
        };
      }

      // 检查邮箱域名相似性（可能的变体邮箱）
      const inviterDomain = inviter.email.split('@')[1];
      const inviteeDomain = inviteeEmail.split('@')[1];

      if (inviterDomain === inviteeDomain) {
        const inviterLocal = inviter.email.split('@')[0];
        const inviteeLocal = inviteeEmail.split('@')[0];

        // 检查是否为相似的邮箱前缀（如添加数字、点等）
        if (this.isSimilarEmailPrefix(inviterLocal, inviteeLocal)) {
          return {
            isValid: false,
            riskLevel: 'medium',
            reasons: ['检测到相似邮箱模式'],
            actions: [{
              type: 'review',
              description: '需要人工审核相似邮箱',
            }],
          };
        }
      }

      return {
        isValid: true,
        riskLevel: 'low',
        reasons: [],
        actions: [],
      };
    } catch (error) {
      console.error('Failed to check self invitation:', error);
      return {
        isValid: true,
        riskLevel: 'low',
        reasons: ['检测失败，默认通过'],
        actions: [],
      };
    }
  }

  /**
   * 检查批量注册
   */
  async checkBatchRegistration(attempt: RegistrationAttempt): Promise<FraudDetectionResult> {
    try {
      const timeWindow = new Date(attempt.timestamp.getTime() - this.BATCH_TIME_WINDOW * 1000);

      // 检查时间窗口内的注册模式
      const patterns = await Promise.all([
        this.checkIPBatchPattern(attempt.ip, timeWindow),
        this.checkUserAgentBatchPattern(attempt.userAgent, timeWindow),
        this.checkEmailBatchPattern(attempt.email, timeWindow),
      ]);

      const suspiciousPatterns = patterns.filter(p => p.isSuspicious);

      if (suspiciousPatterns.length >= 2) {
        return {
          isValid: false,
          riskLevel: 'high',
          reasons: suspiciousPatterns.map(p => p.reason),
          actions: [{
            type: 'block',
            description: '检测到批量注册模式，暂时阻止',
          }],
        };
      } else if (suspiciousPatterns.length === 1) {
        return {
          isValid: true,
          riskLevel: 'medium',
          reasons: suspiciousPatterns.map(p => p.reason),
          actions: [{
            type: 'monitor',
            description: '监控可能的批量注册行为',
          }],
        };
      }

      return {
        isValid: true,
        riskLevel: 'low',
        reasons: [],
        actions: [],
      };
    } catch (error) {
      console.error('Failed to check batch registration:', error);
      return {
        isValid: true,
        riskLevel: 'low',
        reasons: ['检测失败，默认通过'],
        actions: [],
      };
    }
  }

  /**
   * 综合风险评估
   */
  async assessRegistrationRisk(attempt: RegistrationAttempt, inviterId?: string): Promise<FraudDetectionResult> {
    try {
      const checks = await Promise.all([
        this.checkIPFrequency(attempt.ip),
        attempt.deviceFingerprint ? this.checkDeviceFingerprint(attempt.deviceFingerprint) : null,
        inviterId ? this.checkSelfInvitation(inviterId, attempt.email, attempt.ip) : null,
        this.checkBatchRegistration(attempt),
      ]);

      const validChecks = checks.filter(check => check !== null) as FraudDetectionResult[];

      // 计算综合风险等级
      const highRiskChecks = validChecks.filter(check => check.riskLevel === 'high');
      const mediumRiskChecks = validChecks.filter(check => check.riskLevel === 'medium');
      const invalidChecks = validChecks.filter(check => !check.isValid);

      let finalRiskLevel: 'low' | 'medium' | 'high' = 'low';
      let isValid = true;
      const allReasons: string[] = [];
      const allActions: FraudAction[] = [];

      // 收集所有原因和行动
      validChecks.forEach(check => {
        allReasons.push(...check.reasons);
        allActions.push(...check.actions);
      });

      // 确定最终风险等级和有效性
      if (invalidChecks.length > 0 || highRiskChecks.length > 0) {
        isValid = false;
        finalRiskLevel = 'high';
      } else if (mediumRiskChecks.length >= 2) {
        isValid = false;
        finalRiskLevel = 'high';
      } else if (mediumRiskChecks.length === 1) {
        finalRiskLevel = 'medium';
      }

      // 记录可疑活动
      if (finalRiskLevel !== 'low') {
        await this.recordSuspiciousActivity({
          ip: attempt.ip,
          type: 'pattern_anomaly',
          description: `综合风险评估: ${finalRiskLevel}`,
          severity: finalRiskLevel,
          metadata: {
            attempt,
            inviterId,
            checks: validChecks,
          },
          timestamp: new Date(),
        });
      }

      return {
        isValid,
        riskLevel: finalRiskLevel,
        reasons: allReasons,
        actions: allActions,
      };
    } catch (error) {
      console.error('Failed to assess registration risk:', error);
      return {
        isValid: true,
        riskLevel: 'low',
        reasons: ['风险评估失败，默认通过'],
        actions: [],
      };
    }
  }

  /**
   * 记录可疑行为
   */
  async recordSuspiciousActivity(activity: SuspiciousActivity): Promise<void> {
    try {
      const query = `
        INSERT INTO suspicious_activities (
          user_id, ip, type, description, severity, metadata, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      await this.db.execute(query, [
        activity.userId || null,
        activity.ip,
        activity.type,
        activity.description,
        activity.severity,
        JSON.stringify(activity.metadata || {}),
        activity.timestamp,
      ]);
    } catch (error) {
      console.error('Failed to record suspicious activity:', error);
    }
  }

  /**
   * 获取用户风险等级
   */
  async getUserRiskLevel(userId: string): Promise<'low' | 'medium' | 'high'> {
    try {
      const query = `
        SELECT risk_level 
        FROM user_risk_profiles 
        WHERE user_id = ?
      `;

      const result = await this.db.queryOne<{ risk_level: 'low' | 'medium' | 'high' }>(query, [userId]);
      return result?.risk_level || 'low';
    } catch (error) {
      console.error('Failed to get user risk level:', error);
      return 'low';
    }
  }

  /**
   * 更新用户风险等级
   */
  async updateUserRiskLevel(userId: string, level: 'low' | 'medium' | 'high', reason: string): Promise<void> {
    try {
      const query = `
        INSERT INTO user_risk_profiles (user_id, risk_level, reason, updated_at)
        VALUES (?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          risk_level = VALUES(risk_level),
          reason = VALUES(reason),
          updated_at = VALUES(updated_at)
      `;

      await this.db.execute(query, [userId, level, reason]);
    } catch (error) {
      console.error('Failed to update user risk level:', error);
    }
  }

  /**
   * 检查用户是否被禁止
   */
  async isUserBanned(userId: string): Promise<boolean> {
    try {
      const query = `
        SELECT id 
        FROM user_bans 
        WHERE user_id = ? 
        AND (expires_at IS NULL OR expires_at > NOW())
        AND is_active = 1
      `;

      const result = await this.db.queryOne(query, [userId]);
      return !!result;
    } catch (error) {
      console.error('Failed to check user ban status:', error);
      return false;
    }
  }

  /**
   * 禁止用户参与邀请活动
   */
  async banUser(userId: string, reason: string, duration?: number): Promise<void> {
    try {
      const expiresAt = duration ? new Date(Date.now() + duration * 60 * 1000) : null;

      const query = `
        INSERT INTO user_bans (user_id, reason, expires_at, created_at, is_active)
        VALUES (?, ?, ?, NOW(), 1)
      `;

      await this.db.execute(query, [userId, reason, expiresAt]);

      // 同时更新用户风险等级
      await this.updateUserRiskLevel(userId, 'high', `被禁止: ${reason}`);
    } catch (error) {
      console.error('Failed to ban user:', error);
    }
  }

  // 私有辅助方法

  /**
   * 检查邮箱前缀相似性
   */
  private isSimilarEmailPrefix(prefix1: string, prefix2: string): boolean {
    // 移除数字和特殊字符后比较
    const clean1 = prefix1.replace(/[0-9._-]/g, '').toLowerCase();
    const clean2 = prefix2.replace(/[0-9._-]/g, '').toLowerCase();

    if (clean1 === clean2 && clean1.length > 0) {
      return true;
    }

    // 检查编辑距离
    return this.calculateEditDistance(prefix1, prefix2) <= 2;
  }

  /**
   * 计算编辑距离
   */
  private calculateEditDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator,
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * 检查IP批量模式
   */
  private async checkIPBatchPattern(ip: string, timeWindow: Date): Promise<{isSuspicious: boolean, reason: string}> {
    const query = `
      SELECT COUNT(*) as count
      FROM users 
      WHERE registration_ip = ? 
      AND created_at > ?
    `;

    const result = await this.db.queryOne<{ count: number | string }>(query, [ip, timeWindow]);
    const count = Number(result?.count) || 0;

    if (count >= this.BATCH_COUNT_THRESHOLD) {
      return {
        isSuspicious: true,
        reason: `IP ${ip} 在短时间内注册${count}个账户`,
      };
    }

    return { isSuspicious: false, reason: '' };
  }

  /**
   * 检查User-Agent批量模式
   */
  private async checkUserAgentBatchPattern(userAgent: string, timeWindow: Date): Promise<{isSuspicious: boolean, reason: string}> {
    const query = `
      SELECT COUNT(*) as count
      FROM users 
      WHERE user_agent = ? 
      AND created_at > ?
    `;

    const result = await this.db.queryOne<{ count: number | string }>(query, [userAgent, timeWindow]);
    const count = Number(result?.count) || 0;

    if (count >= this.BATCH_COUNT_THRESHOLD) {
      return {
        isSuspicious: true,
        reason: `相同User-Agent在短时间内注册${count}个账户`,
      };
    }

    return { isSuspicious: false, reason: '' };
  }

  /**
   * 检查邮箱批量模式
   */
  private async checkEmailBatchPattern(email: string, timeWindow: Date): Promise<{isSuspicious: boolean, reason: string}> {
    const domain = email.split('@')[1];

    const query = `
      SELECT COUNT(*) as count
      FROM users 
      WHERE email LIKE ? 
      AND created_at > ?
    `;

    const result = await this.db.queryOne<{ count: number | string }>(query, [`%@${domain}`, timeWindow]);
    const count = Number(result?.count) || 0;

    if (count >= this.BATCH_COUNT_THRESHOLD * 2) {
      return {
        isSuspicious: true,
        reason: `域名 ${domain} 在短时间内注册${count}个账户`,
      };
    }

    return { isSuspicious: false, reason: '' };
  }
}
