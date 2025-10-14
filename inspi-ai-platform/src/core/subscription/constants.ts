/**
 * 订阅系统常量定义
 */

import { SubscriptionPlan, QuotaLimits } from '@/shared/types/subscription';

const DEFAULT_TIMESTAMP = new Date('2024-01-01T00:00:00.000Z');

// 默认套餐配置
export const DEFAULT_PLANS: SubscriptionPlan[] = [
  {
    id: 'plan-free',
    name: 'free',
    displayName: '免费版',
    description: '适合个人用户体验基础功能',
    tier: 'free',
    monthlyPrice: 0,
    currency: 'CNY',
    quotas: {
      dailyCreateQuota: 3,
      dailyReuseQuota: 1,
      maxExportsPerDay: 10,
      maxGraphNodes: 50,
    },
    features: [
      '每日创建3张卡片',
      '每日复用1张模板',
      '每日导出10张图片',
      '最多50个知识图谱节点',
      '基础卡片样式',
      '标准分辨率导出',
    ],
    limitations: [
      '功能使用有配额限制',
      '无法使用高级样式',
      '不支持批量操作',
      '无优先客服支持',
    ],
    popular: false,
    recommended: false,
    active: true,
    sortOrder: 1,
    status: 'active',
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
  },
  {
    id: 'plan-basic',
    name: 'basic',
    displayName: '基础版',
    description: '适合专业教师和内容创作者',
    tier: 'basic',
    monthlyPrice: 69,
    yearlyPrice: 690,
    currency: 'CNY',
    quotas: {
      dailyCreateQuota: 20,
      dailyReuseQuota: 5,
      maxExportsPerDay: 50,
      maxGraphNodes: 200,
    },
    features: [
      '每日创建20张卡片',
      '每日复用5张模板',
      '每日导出50张图片',
      '最多200个知识图谱节点',
      '高级卡片样式',
      '高清分辨率导出',
      '批量导出功能',
      '邮件客服支持',
    ],
    limitations: [
      '不支持品牌定制',
      '不支持数据导出',
      '无API访问权限',
    ],
    popular: true,
    recommended: false,
    badge: '推荐',
    active: true,
    sortOrder: 2,
    status: 'active',
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
  },
  {
    id: 'plan-pro',
    name: 'pro',
    displayName: '专业版',
    description: '适合企业用户和专业团队',
    tier: 'pro',
    monthlyPrice: 199,
    yearlyPrice: 1990,
    currency: 'CNY',
    quotas: {
      dailyCreateQuota: 100,
      dailyReuseQuota: 50,
      maxExportsPerDay: 200,
      maxGraphNodes: -1, // 无限制
    },
    features: [
      '每日创建100张卡片',
      '每日复用50张模板',
      '每日导出200张图片',
      '无限知识图谱节点',
      '全部高级功能',
      '品牌定制支持',
      '数据导出功能',
      'API访问权限',
      '优先客服支持',
      '专属客户经理',
    ],
    limitations: [],
    popular: false,
    recommended: true,
    badge: '最受欢迎',
    active: true,
    sortOrder: 3,
    status: 'active',
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
  },
];

// 配额类型映射
export const QUOTA_TYPE_LABELS = {
  create: '创建卡片',
  reuse: '复用模板',
  export: '导出图片',
  graph_nodes: '知识图谱节点',
} as const;

export const QUOTA_TYPE_ICONS = {
  create: '✨',
  reuse: '🔄',
  export: '📥',
  graph_nodes: '🧠',
} as const;

// 订阅状态映射
export const SUBSCRIPTION_STATUS_LABELS = {
  active: '活跃',
  cancelled: '已取消',
  expired: '已过期',
  pending: '待激活',
  suspended: '已暂停',
} as const;

export const SUBSCRIPTION_STATUS_COLORS = {
  active: 'green',
  cancelled: 'gray',
  expired: 'red',
  pending: 'yellow',
  suspended: 'orange',
} as const;

// 支付状态映射
export const PAYMENT_STATUS_LABELS = {
  pending: '待支付',
  completed: '已完成',
  failed: '支付失败',
  refunded: '已退款',
} as const;

export const PAYMENT_STATUS_COLORS = {
  pending: 'yellow',
  completed: 'green',
  failed: 'red',
  refunded: 'gray',
} as const;

// 用户等级映射
export const USER_TIER_LABELS = {
  free: '免费用户',
  basic: '基础用户',
  pro: '专业用户',
  admin: '管理员',
} as const;

export const USER_TIER_COLORS = {
  free: 'gray',
  basic: 'blue',
  pro: 'purple',
  admin: 'gold',
} as const;

// 升级推荐配置
export const UPGRADE_URGENCY_CONFIG = {
  low: {
    color: 'blue',
    label: '建议升级',
    priority: 1,
  },
  medium: {
    color: 'orange',
    label: '推荐升级',
    priority: 2,
  },
  high: {
    color: 'red',
    label: '强烈建议升级',
    priority: 3,
  },
} as const;

// 配额阈值配置
export const QUOTA_THRESHOLDS = {
  WARNING: 0.8, // 80%时显示警告
  CRITICAL: 0.95, // 95%时显示紧急提示
  EXCEEDED: 1.0, // 100%时阻止操作
} as const;

// 支付配置
export const PAYMENT_CONFIG = {
  TIMEOUT_MINUTES: 30, // 支付超时时间（分钟）
  MAX_RETRY_COUNT: 3, // 最大重试次数
  MIN_AMOUNT: 1, // 最小支付金额（元）
  MAX_AMOUNT: 100000, // 最大支付金额（元）
} as const;

// 订阅配置
export const SUBSCRIPTION_CONFIG = {
  GRACE_PERIOD_DAYS: 3, // 宽限期天数
  RENEWAL_REMINDER_DAYS: 7, // 续费提醒提前天数
  AUTO_RETRY_DAYS: 7, // 自动重试天数
  MAX_FAILED_PAYMENTS: 3, // 最大失败支付次数
} as const;

// 错误消息
export const ERROR_MESSAGES = {
  QUOTA_EXCEEDED: '配额已用完，请升级套餐以继续使用',
  PAYMENT_FAILED: '支付失败，请重试或联系客服',
  SUBSCRIPTION_EXPIRED: '订阅已过期，请续费以继续使用',
  INVALID_PLAN: '无效的套餐选择',
  INSUFFICIENT_PERMISSIONS: '权限不足，无法执行此操作',
} as const;

// 成功消息
export const SUCCESS_MESSAGES = {
  SUBSCRIPTION_CREATED: '订阅创建成功！',
  PAYMENT_COMPLETED: '支付完成，订阅已激活！',
  SUBSCRIPTION_CANCELLED: '订阅已取消',
  SUBSCRIPTION_UPGRADED: '套餐升级成功！',
} as const;
