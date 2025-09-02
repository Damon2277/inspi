/**
 * 订阅系统相关类型定义
 * 基于Task 4技术调研结果
 */

import { ObjectId } from 'mongoose';

// 订阅计划类型
export type SubscriptionPlan = 'free' | 'pro' | 'super';

// 订阅状态类型
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'pending';

// 支付方式类型
export type PaymentMethod = 'wechat' | 'alipay';

// 支付状态类型
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

// 使用类型
export type UsageType = 'generation' | 'reuse';

/**
 * 订阅接口
 */
export interface ISubscription {
  _id?: ObjectId;
  userId: ObjectId;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  startDate: Date;
  endDate: Date;
  autoRenew: boolean;
  paymentMethod: PaymentMethod;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 使用统计接口
 */
export interface IUsage {
  _id?: ObjectId;
  userId: ObjectId;
  date: string;           // YYYY-MM-DD格式
  generations: number;    // 当日生成次数
  reuses: number;        // 当日复用次数
  limits: {
    maxGenerations: number;
    maxReuses: number;
  };
  createdAt: Date;
}

/**
 * 支付记录接口
 */
export interface IPayment {
  _id?: ObjectId;
  userId: ObjectId;
  subscriptionId?: ObjectId;
  amount: number;         // 支付金额(分)
  currency: string;       // 货币类型，默认CNY
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string; // 第三方交易号
  outTradeNo: string;    // 商户订单号
  description: string;    // 支付描述
  paidAt?: Date;
  createdAt: Date;
}

/**
 * 订阅计划配置
 */
export interface PlanConfig {
  name: string;
  price: {
    monthly: number;      // 月付价格(分)
    yearly: number;       // 年付价格(分)
  };
  limits: {
    dailyGenerations: number;
    dailyReuses: number;
  };
  features: string[];
}

/**
 * 计划限制配置
 */
export const PLAN_LIMITS: Record<SubscriptionPlan, PlanConfig['limits']> = {
  free: {
    dailyGenerations: 5,
    dailyReuses: 2
  },
  pro: {
    dailyGenerations: 20,
    dailyReuses: 10
  },
  super: {
    dailyGenerations: 100,
    dailyReuses: 30
  }
} as const;

/**
 * 计划配置
 */
export const PLAN_CONFIGS: Record<SubscriptionPlan, PlanConfig> = {
  free: {
    name: '免费版',
    price: {
      monthly: 0,
      yearly: 0
    },
    limits: PLAN_LIMITS.free,
    features: [
      '每日5次AI生成',
      '每日2次作品复用',
      '基础知识图谱',
      '社区浏览'
    ]
  },
  pro: {
    name: 'Pro版',
    price: {
      monthly: 19900,      // 199元
      yearly: 188800       // 1888元
    },
    limits: PLAN_LIMITS.pro,
    features: [
      '每日20次AI生成',
      '每日10次作品复用',
      '高级知识图谱',
      '优先客服支持',
      '导出功能'
    ]
  },
  super: {
    name: 'Super版',
    price: {
      monthly: 39900,      // 399元
      yearly: 388800       // 3888元
    },
    limits: PLAN_LIMITS.super,
    features: [
      '每日100次AI生成',
      '每日30次作品复用',
      '无限知识图谱',
      '专属客服支持',
      '高级导出功能',
      '数据分析报告',
      '团队协作功能'
    ]
  }
} as const;

// API请求/响应类型

/**
 * 获取订阅状态响应
 */
export interface GetSubscriptionResponse {
  subscription: ISubscription | null;
  usage: IUsage | null;
  plan: PlanConfig;
}

/**
 * 升级订阅请求
 */
export interface UpgradeSubscriptionRequest {
  plan: SubscriptionPlan;
  billingCycle: 'monthly' | 'yearly';
  paymentMethod: PaymentMethod;
}

/**
 * 升级订阅响应
 */
export interface UpgradeSubscriptionResponse {
  paymentId: string;
  paymentUrl?: string;    // 支付链接
  qrCode?: string;        // 支付二维码
}

/**
 * 使用限制检查请求
 */
export interface CheckUsageLimitRequest {
  type: UsageType;
}

/**
 * 使用限制检查响应
 */
export interface CheckUsageLimitResponse {
  allowed: boolean;
  current: number;
  limit: number;
  plan: SubscriptionPlan;
  resetTime: string;      // 下次重置时间
}

/**
 * 记录使用请求
 */
export interface RecordUsageRequest {
  type: UsageType;
  count?: number;         // 使用次数，默认1
}

/**
 * 使用统计响应
 */
export interface UsageStatsResponse {
  today: {
    generations: { current: number; limit: number };
    reuses: { current: number; limit: number };
  };
  thisMonth: {
    totalGenerations: number;
    totalReuses: number;
  };
  resetTime: string;
}

/**
 * 微信支付相关类型
 */
export interface WechatPayOrder {
  out_trade_no: string;
  description: string;
  amount: {
    total: number;
    currency: string;
  };
  notify_url: string;
}

export interface WechatPayCallback {
  transaction_id: string;
  out_trade_no: string;
  trade_state: string;
  amount: {
    total: number;
    payer_total: number;
  };
  success_time?: string;
}

/**
 * 前端组件Props类型
 */
export interface PlanCardProps {
  plan: SubscriptionPlan;
  config: PlanConfig;
  isCurrentPlan: boolean;
  isPopular?: boolean;
  onUpgrade: (plan: SubscriptionPlan) => void;
}

export interface UsageStatsProps {
  usage: UsageStatsResponse['today'];
  resetTime: string;
}

export interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlan: SubscriptionPlan;
  onConfirm: (request: UpgradeSubscriptionRequest) => void;
}

/**
 * 错误类型
 */
export class SubscriptionError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'SubscriptionError';
  }
}

export class UsageLimitError extends SubscriptionError {
  constructor(
    public current: number,
    public limit: number,
    public plan: SubscriptionPlan
  ) {
    super(
      `使用次数已达上限 (${current}/${limit})，请升级订阅计划`,
      'USAGE_LIMIT_EXCEEDED',
      429
    );
  }
}

export class PaymentError extends SubscriptionError {
  constructor(message: string, public transactionId?: string) {
    super(message, 'PAYMENT_ERROR', 402);
  }
}