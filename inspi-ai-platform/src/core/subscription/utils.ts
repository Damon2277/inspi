/**
 * 订阅系统工具函数
 */

import {
  UserTier,
  SubscriptionStatus,
  QuotaType,
  QuotaLimits,
  Subscription,
  SubscriptionPlan,
} from '@/shared/types/subscription';

import {
  DEFAULT_PLANS,
  QUOTA_TYPE_LABELS,
  QUOTA_TYPE_ICONS,
  SUBSCRIPTION_STATUS_LABELS,
  USER_TIER_LABELS,
  QUOTA_THRESHOLDS,
} from './constants';

/**
 * 获取用户等级的显示名称
 */
export function getUserTierLabel(tier: UserTier): string {
  return USER_TIER_LABELS[tier];
}

/**
 * 获取订阅状态的显示名称
 */
export function getSubscriptionStatusLabel(status: SubscriptionStatus): string {
  return SUBSCRIPTION_STATUS_LABELS[status];
}

/**
 * 获取配额类型的显示名称
 */
export function getQuotaTypeLabel(quotaType: QuotaType): string {
  return QUOTA_TYPE_LABELS[quotaType];
}

/**
 * 获取配额类型的图标
 */
export function getQuotaTypeIcon(quotaType: QuotaType): string {
  return QUOTA_TYPE_ICONS[quotaType];
}

/**
 * 格式化价格显示
 */
export function formatPrice(price: number, currency: string = 'CNY'): string {
  if (price === 0) return '免费';
  return `¥${price}`;
}

/**
 * 格式化配额显示
 */
export function formatQuota(quota: number): string {
  if (quota === -1) return '无限';
  return quota.toString();
}

/**
 * 计算配额使用百分比
 */
export function calculateQuotaUsagePercentage(used: number, limit: number): number {
  if (limit === -1) return 0; // 无限制
  if (limit === 0) return 100; // 无配额
  return Math.min((used / limit) * 100, 100);
}

/**
 * 检查配额是否超限
 */
export function isQuotaExceeded(used: number, limit: number): boolean {
  if (limit === -1) return false; // 无限制
  return used >= limit;
}

/**
 * 检查配额是否接近用完
 */
export function isQuotaNearLimit(used: number, limit: number, threshold: number = QUOTA_THRESHOLDS.WARNING): boolean {
  if (limit === -1) return false; // 无限制
  if (limit === 0) return true; // 无配额
  return (used / limit) >= threshold;
}

/**
 * 获取配额警告级别
 */
export function getQuotaWarningLevel(used: number, limit: number): 'safe' | 'warning' | 'critical' | 'exceeded' {
  if (limit === -1) return 'safe'; // 无限制

  const percentage = used / limit;

  if (percentage >= QUOTA_THRESHOLDS.EXCEEDED) return 'exceeded';
  if (percentage >= QUOTA_THRESHOLDS.CRITICAL) return 'critical';
  if (percentage >= QUOTA_THRESHOLDS.WARNING) return 'warning';
  return 'safe';
}

/**
 * 计算套餐升级后的配额增长
 */
export function calculateQuotaIncrease(fromTier: UserTier, toTier: UserTier): Partial<QuotaLimits> {
  const fromPlan = (DEFAULT_PLANS.find as any)(p => p.tier === fromTier);
  const toPlan = (DEFAULT_PLANS.find as any)(p => p.tier === toTier);

  if (!fromPlan || !toPlan) return {};

  return {
    dailyCreateQuota: toPlan.quotas.dailyCreateQuota === -1
      ? Infinity
      : toPlan.quotas.dailyCreateQuota - fromPlan.quotas.dailyCreateQuota,
    dailyReuseQuota: toPlan.quotas.dailyReuseQuota === -1
      ? Infinity
      : toPlan.quotas.dailyReuseQuota - fromPlan.quotas.dailyReuseQuota,
    maxExportsPerDay: toPlan.quotas.maxExportsPerDay === -1
      ? Infinity
      : toPlan.quotas.maxExportsPerDay - fromPlan.quotas.maxExportsPerDay,
    maxGraphNodes: toPlan.quotas.maxGraphNodes === -1
      ? Infinity
      : toPlan.quotas.maxGraphNodes - fromPlan.quotas.maxGraphNodes,
  };
}

/**
 * 计算套餐价格差异
 */
export function calculatePriceDifference(fromTier: UserTier, toTier: UserTier): number {
  const fromPlan = (DEFAULT_PLANS.find as any)(p => p.tier === fromTier);
  const toPlan = (DEFAULT_PLANS.find as any)(p => p.tier === toTier);

  if (!fromPlan || !toPlan) return 0;

  return toPlan.monthlyPrice - fromPlan.monthlyPrice;
}

/**
 * 检查订阅是否有效
 */
export function isSubscriptionActive(subscription: Subscription): boolean {
  return subscription.status === 'active' && subscription.endDate > new Date();
}

/**
 * 检查订阅是否即将到期
 */
export function isSubscriptionExpiringSoon(subscription: Subscription, days: number = 7): boolean {
  if (!isSubscriptionActive(subscription)) return false;

  const daysUntilExpiry = Math.ceil((subscription.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return daysUntilExpiry <= days;
}

/**
 * 获取订阅剩余天数
 */
export function getSubscriptionRemainingDays(subscription: Subscription): number {
  if (!isSubscriptionActive(subscription)) return 0;

  return Math.max(0, Math.ceil((subscription.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
}

/**
 * 生成订阅ID
 */
export function generateSubscriptionId(): string {
  return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 生成支付ID
 */
export function generatePaymentId(): string {
  return `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 计算下次计费日期
 */
export function calculateNextBillingDate(startDate: Date, billingCycle: 'monthly' | 'yearly' = 'monthly'): Date {
  const nextBilling = new Date(startDate);

  if (billingCycle === 'monthly') {
    nextBilling.setMonth(nextBilling.getMonth() + 1);
  } else {
    nextBilling.setFullYear(nextBilling.getFullYear() + 1);
  }

  return nextBilling;
}

/**
 * 计算订阅结束日期
 */
export function calculateSubscriptionEndDate(startDate: Date, billingCycle: 'monthly' | 'yearly' = 'monthly'): Date {
  return calculateNextBillingDate(startDate, billingCycle);
}

/**
 * 获取推荐的升级套餐
 */
export function getRecommendedUpgrade(currentTier: UserTier): UserTier | null {
  switch (currentTier) {
    case 'free':
      return 'basic';
    case 'basic':
      return 'pro';
    case 'pro':
    case 'admin':
      return null;
    default:
      return null;
  }
}

/**
 * 检查是否可以升级到指定套餐
 */
export function canUpgradeTo(currentTier: UserTier, targetTier: UserTier): boolean {
  const tierOrder: UserTier[] = ['free', 'basic', 'pro', 'admin'];
  const currentIndex = tierOrder.indexOf(currentTier);
  const targetIndex = tierOrder.indexOf(targetTier);

  return targetIndex > currentIndex;
}

/**
 * 检查是否可以降级到指定套餐
 */
export function canDowngradeTo(currentTier: UserTier, targetTier: UserTier): boolean {
  const tierOrder: UserTier[] = ['free', 'basic', 'pro', 'admin'];
  const currentIndex = tierOrder.indexOf(currentTier);
  const targetIndex = tierOrder.indexOf(targetTier);

  return targetIndex < currentIndex && targetTier !== 'admin';
}

/**
 * 格式化日期为本地字符串
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * 格式化日期时间为本地字符串
 */
export function formatDateTime(date: Date): string {
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
