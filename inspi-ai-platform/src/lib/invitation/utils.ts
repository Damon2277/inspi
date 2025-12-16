/**
 * 邀请系统工具函数
 */

import { InviteErrorCode, InviteError } from './types';

// 生成唯一邀请码
export function generateInviteCode(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}

// 生成UUID
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 验证邀请码格式
export function validateInviteCodeFormat(code: string): boolean {
  // 邀请码应该是8位字母数字组合
  const pattern = /^[A-Z0-9]{8}$/;
  return pattern.test(code);
}

// 验证邮箱格式
export function validateEmail(email: string): boolean {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(email);
}

// 计算邀请码过期时间（默认6个月）
export function calculateExpiryDate(months: number = 6): Date {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date;
}

// 检查邀请码是否过期
export function isInviteCodeExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

// 生成邀请链接
export function generateInviteLink(baseUrl: string, inviteCode: string): string {
  return `${baseUrl}/invite/${inviteCode}`;
}

// 解析邀请链接获取邀请码
export function parseInviteLink(url: string): string | null {
  const match = url.match(/\/invite\/([A-Z0-9]{8})/);
  return match ? match[1] : null;
}

// 计算转化率
export function calculateConversionRate(conversions: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((conversions / total) * 100 * 100) / 100; // 保留两位小数
}

// 格式化奖励描述
export function formatRewardDescription(type: string, amount?: number, description?: string): string {
  switch (type) {
    case 'ai_credits':
      return `获得 ${amount} 次AI生成机会`;
    case 'badge':
      return description || '获得特殊徽章';
    case 'title':
      return description || '获得专属称号';
    case 'premium_access':
      return `获得 ${amount} 天高级会员`;
    case 'template_unlock':
      return description || '解锁高级模板';
    default:
      return description || '获得特殊奖励';
  }
}

// 生成分享文案
export function generateShareText(inviterName: string, platform: string): string {
  const templates = {
    wechat: `${inviterName} 邀请你使用 Inspi.AI - 老师的好搭子！🎓 AI助力教学，让备课更轻松，教学更高效！`,
    qq: `${inviterName} 推荐你试试 Inspi.AI！专为教学场景打造的AI助手，快来体验吧！`,
    dingtalk: `${inviterName} 邀请你加入 Inspi.AI 平台，AI赋能教育，提升教学效率！`,
    wework: `${inviterName} 推荐 Inspi.AI - 智能教学助手，让教学工作事半功倍！`,
    email: `${inviterName} 邀请你体验 Inspi.AI 平台，这是一个专为教学设计的AI助手，可以帮助你更高效地备课和教学。`,
    default: `${inviterName} 邀请你使用 Inspi.AI - 老师的AI好搭子！`,
  };

  return templates[platform as keyof typeof templates] || templates.default;
}

// 检测可疑IP模式
export function detectSuspiciousIPPattern(registrations: Array<{ ip: string; timestamp: Date }>): boolean {
  const ipCounts = new Map<string, number>();
  const timeWindow = 24 * 60 * 60 * 1000; // 24小时
  const now = new Date().getTime();

  // 统计24小时内每个IP的注册次数
  registrations.forEach(reg => {
    if (now - reg.timestamp.getTime() <= timeWindow) {
      const count = ipCounts.get(reg.ip) || 0;
      ipCounts.set(reg.ip, count + 1);
    }
  });

  // 检查是否有IP注册次数超过阈值
  for (const count of ipCounts.values()) {
    if (count > 5) { // 同一IP 24小时内注册超过5次
      return true;
    }
  }

  return false;
}

// 计算风险评分
export function calculateRiskScore(factors: {
  sameIPRegistrations: number
  registrationSpeed: number // 注册间隔时间（分钟）
  deviceFingerprint?: string
  userAgent?: string
}): number {
  let score = 0;

  // IP注册次数风险
  if (factors.sameIPRegistrations > 5) {
    score += 0.4;
  } else if (factors.sameIPRegistrations > 3) {
    score += 0.2;
  }

  // 注册速度风险
  if (factors.registrationSpeed < 1) { // 1分钟内连续注册
    score += 0.3;
  } else if (factors.registrationSpeed < 5) {
    score += 0.1;
  }

  // 设备指纹风险（简化检测）
  if (factors.deviceFingerprint && factors.deviceFingerprint.length < 10) {
    score += 0.2;
  }

  // User-Agent风险
  if (factors.userAgent && (
    factors.userAgent.includes('bot') ||
    factors.userAgent.includes('crawler') ||
    factors.userAgent.length < 20
  )) {
    score += 0.1;
  }

  return Math.min(score, 1.0); // 最大风险评分为1.0
}

// 生成设备指纹（简化版）
export function generateDeviceFingerprint(userAgent: string, ip: string): string {
  const data = `${userAgent}|${ip}|${new Date().getTimezoneOffset()}`;
  return btoa(data).substring(0, 32); // 简化的指纹生成
}

// 错误处理工具
export function createInviteError(code: InviteErrorCode, message: string, details?: any): InviteError {
  return new InviteError(code, message, details);
}

// 日期格式化
export function formatDate(date: Date, format: string = 'YYYY-MM-DD HH:mm:ss'): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return format
    .replace('YYYY', year.toString())
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

// 数据脱敏
export function maskEmail(email: string): string {
  const [username, domain] = email.split('@');
  if (username.length <= 2) {
    return `${username[0]}***@${domain}`;
  }
  return `${username.substring(0, 2)}***@${domain}`;
}

export function maskPhone(phone: string): string {
  if (phone.length <= 7) {
    return phone.replace(/\d(?=\d{4})/g, '*');
  }
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}

// 分页工具
export function calculatePagination(page: number, limit: number, total: number) {
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;

  return {
    page,
    limit,
    total,
    totalPages,
    offset,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

// 缓存键生成
export function generateCacheKey(prefix: string, ...parts: string[]): string {
  return `invitation:${prefix}:${parts.join(':')}`;
}

// 延迟执行
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 重试机制
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000,
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxAttempts) {
        throw lastError;
      }

      await delay(delayMs * attempt); // 指数退避
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }

  throw new Error('Retried operation failed');
}
