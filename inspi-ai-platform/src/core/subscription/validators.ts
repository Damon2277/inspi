/**
 * 订阅系统数据验证和类型守卫函数
 */

import {
  UserTier,
  SubscriptionStatus,
  PaymentMethod,
  PaymentStatus,
  Currency,
  QuotaType,
  Subscription,
  SubscriptionPlan,
  PaymentRecord,
  QuotaLimits,
  CreatePlanRequest,
} from '@/shared/types/subscription';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// 类型守卫函数
export function isUserTier(value: any): value is UserTier {
  return ['free', 'basic', 'pro', 'admin'].includes(value);
}

export function isSubscriptionStatus(value: any): value is SubscriptionStatus {
  return ['active', 'cancelled', 'expired', 'pending', 'suspended'].includes(value);
}

export function isPaymentMethod(value: any): value is PaymentMethod {
  return value === 'wechat_pay';
}

export function isPaymentStatus(value: any): value is PaymentStatus {
  return ['pending', 'completed', 'failed', 'refunded'].includes(value);
}

export function isCurrency(value: any): value is Currency {
  return value === 'CNY';
}

export function isQuotaType(value: any): value is QuotaType {
  return ['create', 'reuse', 'export', 'graph_nodes'].includes(value);
}

// 数据验证函数
export function validateQuotaLimits(quotas: any): quotas is QuotaLimits {
  return (
    typeof quotas === 'object' &&
    quotas !== null &&
    typeof quotas.dailyCreateQuota === 'number' &&
    typeof quotas.dailyReuseQuota === 'number' &&
    typeof quotas.maxExportsPerDay === 'number' &&
    typeof quotas.maxGraphNodes === 'number' &&
    quotas.dailyCreateQuota >= 0 &&
    quotas.dailyReuseQuota >= 0 &&
    quotas.maxExportsPerDay >= 0 &&
    quotas.maxGraphNodes >= -1 // -1 表示无限制
  );
}

export function validateSubscriptionPlan(plan: any): plan is SubscriptionPlan {
  return (
    typeof plan === 'object' &&
    plan !== null &&
    typeof plan.id === 'string' &&
    typeof plan.name === 'string' &&
    typeof plan.displayName === 'string' &&
    typeof plan.description === 'string' &&
    isUserTier(plan.tier) &&
    typeof plan.monthlyPrice === 'number' &&
    plan.monthlyPrice >= 0 &&
    isCurrency(plan.currency) &&
    validateQuotaLimits(plan.quotas) &&
    Array.isArray(plan.features) &&
    Array.isArray(plan.limitations) &&
    typeof plan.active === 'boolean' &&
    typeof plan.sortOrder === 'number'
  );
}

export function validateSubscription(subscription: any): subscription is Subscription {
  return (
    typeof subscription === 'object' &&
    subscription !== null &&
    typeof subscription.id === 'string' &&
    typeof subscription.userId === 'string' &&
    typeof subscription.planId === 'string' &&
    typeof subscription.planName === 'string' &&
    isUserTier(subscription.plan) &&
    isSubscriptionStatus(subscription.status) &&
    typeof subscription.monthlyPrice === 'number' &&
    subscription.monthlyPrice >= 0 &&
    isCurrency(subscription.currency) &&
    subscription.startDate instanceof Date &&
    subscription.endDate instanceof Date &&
    isPaymentMethod(subscription.paymentMethod) &&
    validateQuotaLimits(subscription.quotas) &&
    Array.isArray(subscription.features)
  );
}

export function validatePaymentRecord(payment: any): payment is PaymentRecord {
  return (
    typeof payment === 'object' &&
    payment !== null &&
    typeof payment.id === 'string' &&
    typeof payment.subscriptionId === 'string' &&
    typeof payment.userId === 'string' &&
    typeof payment.amount === 'number' &&
    payment.amount > 0 &&
    isCurrency(payment.currency) &&
    isPaymentMethod(payment.paymentMethod) &&
    typeof payment.paymentId === 'string' &&
    isPaymentStatus(payment.status) &&
    payment.billingPeriodStart instanceof Date &&
    payment.billingPeriodEnd instanceof Date &&
    typeof payment.retryCount === 'number' &&
    payment.retryCount >= 0
  );
}

// 业务逻辑验证函数
export function validatePriceRange(price: number): boolean {
  return price >= 0 && price <= 99999; // 最大价格限制
}

export function validateQuotaValue(quota: number): boolean {
  return quota >= -1 && quota <= 1000000; // -1表示无限制，最大100万
}

export function validateSubscriptionDates(startDate: Date, endDate: Date): boolean {
  return startDate < endDate && endDate > new Date();
}

export function validatePaymentAmount(amount: number): boolean {
  return amount > 0 && amount <= 100000; // 最大支付金额10万元
}

// 数据清理函数
export function sanitizeSubscriptionPlan(plan: any): Partial<SubscriptionPlan> {
  return {
    name: typeof plan.name === 'string' ? plan.name.trim() : '',
    displayName: typeof plan.displayName === 'string' ? plan.displayName.trim() : '',
    description: typeof plan.description === 'string' ? plan.description.trim() : '',
    tier: isUserTier(plan.tier) ? plan.tier : 'free',
    monthlyPrice: typeof plan.monthlyPrice === 'number' ? Math.max(0, plan.monthlyPrice) : 0,
    yearlyPrice: typeof plan.yearlyPrice === 'number' ? Math.max(0, plan.yearlyPrice) : undefined,
    currency: isCurrency(plan.currency) ? plan.currency : 'CNY',
    features: Array.isArray(plan.features)
      ? plan.features.filter((feature: unknown): feature is string => typeof feature === 'string')
      : [],
    limitations: Array.isArray(plan.limitations)
      ? plan.limitations.filter((limitation: unknown): limitation is string => typeof limitation === 'string')
      : [],
    popular: typeof plan.popular === 'boolean' ? plan.popular : false,
    recommended: typeof plan.recommended === 'boolean' ? plan.recommended : false,
    badge: typeof plan.badge === 'string' ? plan.badge.trim() : undefined,
    active: typeof plan.active === 'boolean' ? plan.active : true,
    sortOrder: typeof plan.sortOrder === 'number' ? plan.sortOrder : 0,
  };
}

export function sanitizeQuotaLimits(quotas: any): QuotaLimits {
  return {
    dailyCreateQuota: typeof quotas?.dailyCreateQuota === 'number' ? Math.max(-1, quotas.dailyCreateQuota) : 0,
    dailyReuseQuota: typeof quotas?.dailyReuseQuota === 'number' ? Math.max(-1, quotas.dailyReuseQuota) : 0,
    maxExportsPerDay: typeof quotas?.maxExportsPerDay === 'number' ? Math.max(-1, quotas.maxExportsPerDay) : 0,
    maxGraphNodes: typeof quotas?.maxGraphNodes === 'number' ? Math.max(-1, quotas.maxGraphNodes) : 0,
  };
}

export function validateSubscriptionData(subscription: Subscription): ValidationResult {
  const errors: string[] = [];

  if (!subscription.id) errors.push('订阅ID不能为空');
  if (!subscription.userId) errors.push('用户ID不能为空');
  if (!subscription.planId) errors.push('套餐ID不能为空');
  if (!subscription.planName) errors.push('套餐名称不能为空');
  const planTier = subscription.plan ?? subscription.tier;
  if (!isUserTier(planTier)) errors.push('无效的用户等级');
  if (!isSubscriptionStatus(subscription.status)) errors.push('无效的订阅状态');
  if (typeof subscription.monthlyPrice !== 'number' || subscription.monthlyPrice < 0) {
    errors.push('月费必须是非负数字');
  }
  if (!isCurrency(subscription.currency)) errors.push('无效的货币类型');
  if (!(subscription.startDate instanceof Date)) errors.push('开始日期无效');
  if (!(subscription.endDate instanceof Date)) errors.push('结束日期无效');
  if (!isPaymentMethod(subscription.paymentMethod)) errors.push('无效的支付方式');
  if (!validateQuotaLimits(subscription.quotas)) errors.push('配额配置无效');
  if (!Array.isArray(subscription.features)) errors.push('套餐功能必须是数组');

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validatePlanData(plan: CreatePlanRequest): ValidationResult {
  const errors: string[] = [];

  if (!plan.name || plan.name.trim().length === 0) errors.push('套餐名称不能为空');
  if (!plan.displayName || plan.displayName.trim().length === 0) {
    errors.push('套餐展示名称不能为空');
  }
  if (!plan.description || plan.description.trim().length === 0) {
    errors.push('套餐描述不能为空');
  }
  if (!isUserTier(plan.tier)) errors.push('无效的套餐等级');
  if (typeof plan.monthlyPrice !== 'number' || plan.monthlyPrice < 0) {
    errors.push('月费必须是非负数字');
  }
  if (plan.yearlyPrice !== undefined && plan.yearlyPrice < 0) {
    errors.push('年费不能为负数');
  }
  const currency = plan.currency ?? 'CNY';
  if (!isCurrency(currency)) {
    errors.push('无效的货币类型');
  }

  const quotaKeys: Array<keyof QuotaLimits> = [
    'dailyCreateQuota',
    'dailyReuseQuota',
    'maxExportsPerDay',
    'maxGraphNodes',
  ];
  const quotas = plan.quotas ?? {};
  const invalidQuota = quotaKeys.some((key) => {
    if (!(key in quotas)) {
      return false;
    }
    const value = quotas[key as keyof typeof quotas];
    return typeof value !== 'number' || value < -1;
  });
  if (invalidQuota) {
    errors.push('配额配置无效');
  }

  if (plan.features && !Array.isArray(plan.features)) {
    errors.push('套餐功能必须是数组');
  }
  if (plan.limitations && !Array.isArray(plan.limitations)) {
    errors.push('限制说明必须是数组');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
