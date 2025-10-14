/**
 * 设备指纹生成工具
 * 用于生成和验证设备指纹，帮助识别重复设备
 */

import crypto from 'crypto';

export interface DeviceFingerprint {
  userAgent: string
  screenResolution: string
  timezone: string
  language: string
  platform: string
  cookieEnabled: boolean
  hash: string
}

export interface ClientDeviceInfo {
  userAgent?: string
  screenWidth?: number
  screenHeight?: number
  timezone?: string
  language?: string
  platform?: string
  cookieEnabled?: boolean
  colorDepth?: number
  pixelRatio?: number
  touchSupport?: boolean
  hardwareConcurrency?: number
  maxTouchPoints?: number
}

export class DeviceFingerprintGenerator {
  /**
   * 从客户端信息生成设备指纹
   */
  static generateFingerprint(clientInfo: ClientDeviceInfo): DeviceFingerprint {
    const fingerprint: DeviceFingerprint = {
      userAgent: clientInfo.userAgent || '',
      screenResolution: `${clientInfo.screenWidth || 0}x${clientInfo.screenHeight || 0}`,
      timezone: clientInfo.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: clientInfo.language || 'en',
      platform: clientInfo.platform || '',
      cookieEnabled: clientInfo.cookieEnabled !== false,
      hash: '',
    };

    // 生成指纹哈希
    fingerprint.hash = this.calculateHash(fingerprint, clientInfo);

    return fingerprint;
  }

  /**
   * 从HTTP请求头生成基础设备指纹
   */
  static generateFromHeaders(headers: Record<string, string | string[] | undefined>): DeviceFingerprint {
    const userAgent = Array.isArray(headers['user-agent'])
      ? headers['user-agent'][0]
      : headers['user-agent'] || '';

    const acceptLanguage = Array.isArray(headers['accept-language'])
      ? headers['accept-language'][0]
      : headers['accept-language'] || 'en';

    const language = acceptLanguage.split(',')[0].split('-')[0];

    const fingerprint: DeviceFingerprint = {
      userAgent,
      screenResolution: '0x0', // 无法从服务端获取
      timezone: 'UTC', // 默认值
      language,
      platform: this.extractPlatformFromUserAgent(userAgent),
      cookieEnabled: true, // 默认值
      hash: '',
    };

    fingerprint.hash = this.calculateHash(fingerprint);

    return fingerprint;
  }

  /**
   * 验证设备指纹的有效性
   */
  static validateFingerprint(fingerprint: DeviceFingerprint): boolean {
    if (!fingerprint.hash) {
      return false;
    }

    // 重新计算哈希验证
    const { hash: _ignored, ...fingerprintWithoutHash } = fingerprint;
    const expectedHash = this.calculateHash(fingerprintWithoutHash);

    return expectedHash === fingerprint.hash;
  }

  /**
   * 比较两个设备指纹的相似度
   */
  static calculateSimilarity(fp1: DeviceFingerprint, fp2: DeviceFingerprint): number {
    let score = 0;
    let totalWeight = 0;

    // 用户代理相似度 (权重: 40%)
    const uaWeight = 0.4;
    const uaSimilarity = this.calculateStringSimilarity(fp1.userAgent, fp2.userAgent);
    score += uaSimilarity * uaWeight;
    totalWeight += uaWeight;

    // 屏幕分辨率 (权重: 20%)
    const screenWeight = 0.2;
    const screenSimilarity = fp1.screenResolution === fp2.screenResolution ? 1 : 0;
    score += screenSimilarity * screenWeight;
    totalWeight += screenWeight;

    // 时区 (权重: 15%)
    const timezoneWeight = 0.15;
    const timezoneSimilarity = fp1.timezone === fp2.timezone ? 1 : 0;
    score += timezoneSimilarity * timezoneWeight;
    totalWeight += timezoneWeight;

    // 语言 (权重: 15%)
    const languageWeight = 0.15;
    const languageSimilarity = fp1.language === fp2.language ? 1 : 0;
    score += languageSimilarity * languageWeight;
    totalWeight += languageWeight;

    // 平台 (权重: 10%)
    const platformWeight = 0.1;
    const platformSimilarity = fp1.platform === fp2.platform ? 1 : 0;
    score += platformSimilarity * platformWeight;
    totalWeight += platformWeight;

    return totalWeight > 0 ? score / totalWeight : 0;
  }

  /**
   * 检查设备指纹是否可疑
   */
  static isSuspiciousFingerprint(fingerprint: DeviceFingerprint): {
    isSuspicious: boolean
    reasons: string[]
  } {
    const reasons: string[] = [];

    // 检查用户代理
    if (!fingerprint.userAgent || fingerprint.userAgent.length < 10) {
      reasons.push('用户代理信息异常或缺失');
    }

    // 检查屏幕分辨率
    if (fingerprint.screenResolution === '0x0' || fingerprint.screenResolution === 'x') {
      reasons.push('屏幕分辨率信息缺失');
    }

    // 检查常见的自动化工具特征
    const suspiciousUAPatterns = [
      /headless/i,
      /phantom/i,
      /selenium/i,
      /webdriver/i,
      /bot/i,
      /crawler/i,
      /spider/i,
    ];

    if (suspiciousUAPatterns.some(pattern => pattern.test(fingerprint.userAgent))) {
      reasons.push('检测到自动化工具特征');
    }

    // 检查异常的屏幕分辨率
    const [width, height] = fingerprint.screenResolution.split('x').map(Number);
    if (width && height && !isNaN(width) && !isNaN(height)) {
      if (width < 100 || height < 100 || width > 10000 || height > 10000) {
        reasons.push('屏幕分辨率异常');
      }
    }

    return {
      isSuspicious: reasons.length > 0,
      reasons,
    };
  }

  /**
   * 生成客户端JavaScript代码用于收集设备信息
   */
  static generateClientScript(): string {
    return `
(function() {
  function collectDeviceInfo() {
    const info = {
      userAgent: navigator.userAgent,
      screenWidth: screen.width,
      screenHeight: screen.height,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      colorDepth: screen.colorDepth,
      pixelRatio: window.devicePixelRatio,
      touchSupport: 'ontouchstart' in window,
      hardwareConcurrency: navigator.hardwareConcurrency,
      maxTouchPoints: navigator.maxTouchPoints || 0
    };
    
    return info;
  }
  
  // 将设备信息添加到表单或发送到服务器
  window.getDeviceFingerprint = collectDeviceInfo;
  
  // 自动收集并存储到隐藏字段（如果存在）
  const deviceInfoField = document.getElementById('deviceInfo');
  if (deviceInfoField) {
    deviceInfoField.value = JSON.stringify(collectDeviceInfo());
  }
})();
    `.trim();
  }

  // 私有方法

  /**
   * 计算设备指纹哈希
   */
  private static calculateHash(fingerprint: Omit<DeviceFingerprint, 'hash'>, clientInfo?: ClientDeviceInfo): string {
    const components = [
      fingerprint.userAgent,
      fingerprint.screenResolution,
      fingerprint.timezone,
      fingerprint.language,
      fingerprint.platform,
      fingerprint.cookieEnabled.toString(),
    ];

    // 添加额外的客户端信息（如果有）
    if (clientInfo) {
      components.push(
        (clientInfo.colorDepth || 0).toString(),
        (clientInfo.pixelRatio || 0).toString(),
        (clientInfo.touchSupport || false).toString(),
        (clientInfo.hardwareConcurrency || 0).toString(),
        (clientInfo.maxTouchPoints || 0).toString(),
      );
    }

    const combined = components.join('|');
    return crypto.createHash('sha256').update(combined).digest('hex');
  }

  /**
   * 从用户代理提取平台信息
   */
  private static extractPlatformFromUserAgent(userAgent: string): string {
    const ua = userAgent.toLowerCase();

    // 优先检查移动平台
    if (ua.includes('android')) return 'Android';
    if (ua.includes('iphone') || ua.includes('ipad')) return 'iOS';

    // 然后检查桌面平台
    if (ua.includes('windows')) return 'Windows';
    if (ua.includes('macintosh') || ua.includes('mac os')) return 'macOS';
    if (ua.includes('linux')) return 'Linux';

    return 'Unknown';
  }

  /**
   * 计算字符串相似度
   */
  private static calculateStringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1;
    if (!str1 || !str2) return 0;

    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1;

    const editDistance = this.calculateEditDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * 计算编辑距离
   */
  private static calculateEditDistance(str1: string, str2: string): number {
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
}

/**
 * 设备指纹管理器
 */
export class DeviceFingerprintManager {
  constructor(private db: any) {}

  /**
   * 保存设备指纹
   */
  async saveDeviceFingerprint(userId: string, fingerprint: DeviceFingerprint): Promise<void> {
    try {
      const query = `
        INSERT INTO device_fingerprints (
          user_id, fingerprint_hash, user_agent, screen_resolution,
          timezone, language, platform, cookie_enabled
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await this.db.execute(query, [
        userId,
        fingerprint.hash,
        fingerprint.userAgent,
        fingerprint.screenResolution,
        fingerprint.timezone,
        fingerprint.language,
        fingerprint.platform,
        fingerprint.cookieEnabled,
      ]);
    } catch (error) {
      console.error('Failed to save device fingerprint:', error);
    }
  }

  /**
   * 获取设备指纹的使用历史
   */
  async getDeviceFingerprintHistory(fingerprintHash: string): Promise<Array<{
    userId: string
    createdAt: Date
  }>> {
    try {
      const query = `
        SELECT user_id, created_at
        FROM device_fingerprints
        WHERE fingerprint_hash = ?
        ORDER BY created_at DESC
      `;

      const results = await this.db.query(query, [fingerprintHash]);
      return results.map((row: any) => ({
        userId: row.user_id,
        createdAt: new Date(row.created_at),
      }));
    } catch (error) {
      console.error('Failed to get device fingerprint history:', error);
      return [];
    }
  }

  /**
   * 检查设备指纹是否已被使用
   */
  async isDeviceFingerprintUsed(fingerprintHash: string, excludeUserId?: string): Promise<boolean> {
    try {
      let query = `
        SELECT COUNT(*) as count
        FROM device_fingerprints
        WHERE fingerprint_hash = ?
      `;
      const params = [fingerprintHash];

      if (excludeUserId) {
        query += ' AND user_id != ?';
        params.push(excludeUserId);
      }

      const result = await this.db.queryOne(query, params);
      return parseInt(result?.count, 10) > 0;
    } catch (error) {
      console.error('Failed to check device fingerprint usage:', error);
      return false;
    }
  }
}
