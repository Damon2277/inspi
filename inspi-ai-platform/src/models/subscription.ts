import mongoose, { Schema, Document, Model } from 'mongoose';

// 订阅状态枚举
export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  GRACE_PERIOD = 'grace_period',
  EXPIRED = 'expired'
}

// 订阅记录接口
export interface IUserSubscription extends Document {
  userId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  nextBillingAt: Date;
  monthlyQuotaTotal: number;
  monthlyQuotaUsed: number;
  monthlyQuotaRemaining: number;
  autoRenew: boolean;
  gracePeriodEnd?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// 订阅记录Schema
const UserSubscriptionSchema = new Schema<IUserSubscription>({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  status: {
    type: String,
    enum: Object.values(SubscriptionStatus),
    default: SubscriptionStatus.ACTIVE,
    required: true,
  },
  currentPeriodStart: {
    type: Date,
    required: true,
  },
  currentPeriodEnd: {
    type: Date,
    required: true,
  },
  nextBillingAt: {
    type: Date,
    required: true,
  },
  monthlyQuotaTotal: {
    type: Number,
    default: 300,
    required: true,
  },
  monthlyQuotaUsed: {
    type: Number,
    default: 0,
    required: true,
  },
  monthlyQuotaRemaining: {
    type: Number,
    default: 300,
    required: true,
  },
  autoRenew: {
    type: Boolean,
    default: true,
    required: true,
  },
  gracePeriodEnd: {
    type: Date,
  },
}, {
  timestamps: true,
});

// 使用统计接口
export interface IUsageStats extends Document {
  userId: string;
  date: Date;
  dailyUsage: number;
  monthlyUsage: number;
  lastResetDate: Date;
  monthlyPeriodId?: string;
}

// 使用统计Schema
const UsageStatsSchema = new Schema<IUsageStats>({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  dailyUsage: {
    type: Number,
    default: 0,
    min: 0,
    max: 3,
    required: true,
  },
  monthlyUsage: {
    type: Number,
    default: 0,
    min: 0,
    max: 300,
    required: true,
  },
  lastResetDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  monthlyPeriodId: {
    type: String,
  },
}, {
  timestamps: true,
});

// 复合索引
UsageStatsSchema.index({ userId: 1, date: -1 });

// 支付事务类型枚举
export enum PaymentType {
  INITIAL = 'initial',
  RENEWAL = 'renewal'
}

// 支付状态枚举
export enum PaymentStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed'
}

// 支付流水接口
export interface IPaymentTransaction extends Document {
  txId: string;
  userId: string;
  amount: number;
  currency: string;
  channel: string;
  status: PaymentStatus;
  type: PaymentType;
  orderId: string;
  prepayId?: string;
  wechatTransactionId?: string;
  qrCodeUrl?: string;
  qrCodeExpiredAt?: Date;
  paidAt?: Date;
  failedReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 支付流水Schema
const PaymentTransactionSchema = new Schema<IPaymentTransaction>({
  txId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  userId: {
    type: String,
    required: true,
    index: true,
  },
  amount: {
    type: Number,
    required: true,
    default: 15.00,
  },
  currency: {
    type: String,
    required: true,
    default: 'CNY',
  },
  channel: {
    type: String,
    required: true,
    default: 'wechat',
  },
  status: {
    type: String,
    enum: Object.values(PaymentStatus),
    default: PaymentStatus.PENDING,
    required: true,
  },
  type: {
    type: String,
    enum: Object.values(PaymentType),
    required: true,
  },
  orderId: {
    type: String,
    required: true,
    unique: true,
  },
  prepayId: {
    type: String,
  },
  wechatTransactionId: {
    type: String,
  },
  qrCodeUrl: {
    type: String,
  },
  qrCodeExpiredAt: {
    type: Date,
  },
  paidAt: {
    type: Date,
  },
  failedReason: {
    type: String,
  },
}, {
  timestamps: true,
});

// 订阅日志接口（用于追溯状态变更）
export interface ISubscriptionLog extends Document {
  userId: string;
  subscriptionId: string;
  action: string;
  previousStatus?: SubscriptionStatus;
  newStatus?: SubscriptionStatus;
  details: any;
  createdAt: Date;
}

// 订阅日志Schema
const SubscriptionLogSchema = new Schema<ISubscriptionLog>({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  subscriptionId: {
    type: String,
    required: true,
  },
  action: {
    type: String,
    required: true,
  },
  previousStatus: {
    type: String,
    enum: Object.values(SubscriptionStatus),
  },
  newStatus: {
    type: String,
    enum: Object.values(SubscriptionStatus),
  },
  details: {
    type: Schema.Types.Mixed,
  },
}, {
  timestamps: { createdAt: true, updatedAt: false },
});

// 导出模型
export const UserSubscription: Model<IUserSubscription> =
  (mongoose.models.UserSubscription as Model<IUserSubscription> | undefined) ||
  mongoose.model<IUserSubscription>('UserSubscription', UserSubscriptionSchema);

export const UsageStats: Model<IUsageStats> =
  (mongoose.models.UsageStats as Model<IUsageStats> | undefined) ||
  mongoose.model<IUsageStats>('UsageStats', UsageStatsSchema);

export const PaymentTransaction: Model<IPaymentTransaction> =
  (mongoose.models.PaymentTransaction as Model<IPaymentTransaction> | undefined) ||
  mongoose.model<IPaymentTransaction>('PaymentTransaction', PaymentTransactionSchema);

export const SubscriptionLog: Model<ISubscriptionLog> =
  (mongoose.models.SubscriptionLog as Model<ISubscriptionLog> | undefined) ||
  mongoose.model<ISubscriptionLog>('SubscriptionLog', SubscriptionLogSchema);
