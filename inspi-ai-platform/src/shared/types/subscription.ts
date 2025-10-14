/**
 * 订阅与支付系统核心类型定义
 */

// ------------------------------
// 基础枚举与别名
// ------------------------------

export type UserTier = 'free' | 'basic' | 'pro' | 'admin';
export type SubscriptionStatus = 'active' | 'pending' | 'suspended' | 'expired' | 'cancelled';
export type PlanStatus = 'draft' | 'active' | 'archived' | 'inactive';
export type PaymentMethod = 'wechat_pay';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled';
export type Currency = 'CNY';
export type QuotaType = 'create' | 'reuse' | 'export' | 'graph_nodes';

// ------------------------------
// 配额定义
// ------------------------------

export interface QuotaLimits {
  dailyCreateQuota: number;
  dailyReuseQuota: number;
  maxExportsPerDay: number;
  maxGraphNodes: number;
}

export type PlanQuotas = QuotaLimits;

// ------------------------------
// 套餐配置
// ------------------------------

export interface SubscriptionPlan {
  id: string;
  name: string;
  displayName: string;
  description: string;
  tier: UserTier;
  monthlyPrice: number;
  yearlyPrice?: number;
  currency: Currency;
  quotas: QuotaLimits;
  features: string[];
  limitations: string[];
  popular?: boolean;
  recommended?: boolean;
  badge?: string;
  status?: PlanStatus;
  sortOrder?: number;
  active?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type PlanFeatures = string;
export type PlanFeaturesMap = Record<UserTier, PlanFeatures[]>;

// ------------------------------
// 用户订阅
// ------------------------------

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  plan?: UserTier;
  tier: UserTier;
  status: SubscriptionStatus;
  monthlyPrice: number;
  currency: Currency;
  startDate: Date;
  endDate: Date;
  nextBillingDate?: Date;
  cancelledAt?: Date;
  paymentMethod: PaymentMethod;
  paymentId?: string;
  lastPaymentDate?: Date;
  lastPaymentAmount?: number;
  quotas: QuotaLimits;
  features: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionUsage {
  subscriptionId: string;
  userId: string;
  date: string; // YYYY-MM-DD
  createUsage: number;
  reuseUsage: number;
  exportUsage: number;
  graphNodesCount: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// ------------------------------
// 支付与账单
// ------------------------------

export interface PaymentRecord {
  id: string;
  subscriptionId: string;
  userId: string;
  planId?: string;
  amount: number;
  currency: Currency;
  paymentMethod: PaymentMethod;
  paymentId: string;
  transactionId?: string;
  status: PaymentStatus;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  paidAt?: Date;
  failureReason?: string;
  errorMessage?: string;
  retryCount: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// ------------------------------
// 请求载荷
// ------------------------------

export interface CreatePlanRequest {
  name: string;
  displayName: string;
  description: string;
  tier: UserTier;
  monthlyPrice: number;
  yearlyPrice?: number;
  currency?: Currency;
  quotas: Partial<QuotaLimits>;
  features?: string[];
  limitations?: string[];
  metadata?: Record<string, any>;
}

export interface CreateSubscriptionRequest {
  userId: string;
  planId: string;
  billingCycle: 'monthly' | 'yearly';
  paymentMethod: PaymentMethod;
}

export interface UpdateSubscriptionRequest {
  planId?: string;
  status?: SubscriptionStatus;
  endDate?: Date;
  metadata?: Record<string, any>;
}

export interface PaymentInfo {
  paymentId: string;
  qrCode: string;
  amount: number;
  currency: Currency;
  expiresAt: Date;
}

export interface PaymentResult {
  success: boolean;
  paymentId: string;
  transactionId?: string;
  amount?: number;
  paidAt?: Date;
  error?: string;
}

export interface RefundResult {
  success: boolean;
  refundId: string;
  amount: number;
  refundedAt: Date;
  error?: string;
}

// ------------------------------
// 升级与推荐
// ------------------------------

export interface UpgradeRecommendation {
  currentPlan: string;
  recommendedPlan: string;
  priceIncrease: number;
  quotaIncrease: Partial<Record<Exclude<QuotaType, 'graph_nodes'>, number>> & {
    graph_nodes?: number;
  };
  benefits: string[];
  urgency: 'low' | 'medium' | 'high';
}

export interface QuotaExceededEvent {
  userId: string;
  quotaType: QuotaType;
  currentUsage: number;
  limit: number;
  timestamp: Date;
  userTier: UserTier;
  subscriptionStatus: SubscriptionStatus;
  subscriptionId?: string;
}

export interface UpgradePropensityScore {
  score: number; // 0 - 100
  factors: string[];
  recommendation: 'none' | 'gentle' | 'aggressive';
  confidence?: number; // 0 - 1
}

// ------------------------------
// 错误类型
// ------------------------------

export class SubscriptionError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'SubscriptionError';
  }
}

export class UsageLimitError extends Error {
  constructor(message: string, public quotaType?: QuotaType) {
    super(message);
    this.name = 'UsageLimitError';
  }
}

// ------------------------------
// 兼容别名（旧代码依赖）
// ------------------------------

export interface ISubscription extends Subscription {}
export interface IUsage extends SubscriptionUsage {}
export interface IPayment extends PaymentRecord {}

// ------------------------------
// 预设配置（示例数据）
// ------------------------------

export const PLAN_LIMITS: Record<UserTier, PlanQuotas> = {
  free: {
    dailyCreateQuota: 3,
    dailyReuseQuota: 1,
    maxExportsPerDay: 10,
    maxGraphNodes: 50,
  },
  basic: {
    dailyCreateQuota: 20,
    dailyReuseQuota: 5,
    maxExportsPerDay: 50,
    maxGraphNodes: -1,
  },
  pro: {
    dailyCreateQuota: 100,
    dailyReuseQuota: 50,
    maxExportsPerDay: 200,
    maxGraphNodes: -1,
  },
  admin: {
    dailyCreateQuota: -1,
    dailyReuseQuota: -1,
    maxExportsPerDay: -1,
    maxGraphNodes: -1,
  },
};

export const PLAN_FEATURES: PlanFeaturesMap = {
  free: ['基础功能', '有限配额'],
  basic: ['高清导出', '知识图谱增强', '数据备份'],
  pro: ['全部基础能力', '品牌定制', '优先支持'],
  admin: ['全部功能', '系统管理', '无限制使用'],
};

export const PLAN_CONFIGS: Record<
  UserTier,
  { name: string; price: number; features: string[]; limitations: string[] }
> = {
  free: {
    name: '免费版',
    price: 0,
    features: PLAN_FEATURES.free,
    limitations: ['每日创建限制', '部分功能受限'],
  },
  basic: {
    name: '基础版',
    price: 69,
    features: PLAN_FEATURES.basic,
    limitations: ['配额限制'],
  },
  pro: {
    name: '专业版',
    price: 199,
    features: PLAN_FEATURES.pro,
    limitations: [],
  },
  admin: {
    name: '管理员',
    price: 0,
    features: PLAN_FEATURES.admin,
    limitations: [],
  },
};
