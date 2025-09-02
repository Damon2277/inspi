import mongoose, { Document, Schema } from 'mongoose';
import { ISubscription, SubscriptionPlan, SubscriptionStatus, PaymentMethod } from '../../types/subscription';

/**
 * 订阅文档接口
 */
export interface SubscriptionDocument extends Omit<ISubscription, '_id' | 'userId'>, Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  isActive(): boolean;
  getDaysRemaining(): number;
}

/**
 * 订阅Schema
 */
const SubscriptionSchema = new Schema<SubscriptionDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  plan: {
    type: String,
    enum: ['free', 'pro', 'super'] as SubscriptionPlan[],
    required: true,
    default: 'free'
  },
  status: {
    type: String,
    enum: ['active', 'cancelled', 'expired', 'pending'] as SubscriptionStatus[],
    required: true,
    default: 'active'
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true,
    default: () => {
      // 免费版永不过期，设置为100年后
      const date = new Date();
      date.setFullYear(date.getFullYear() + 100);
      return date;
    }
  },
  autoRenew: {
    type: Boolean,
    required: true,
    default: false
  },
  paymentMethod: {
    type: String,
    enum: ['wechat', 'alipay'] as PaymentMethod[],
    required: true,
    default: 'wechat'
  }
}, {
  timestamps: true,
  collection: 'subscriptions'
});

// 复合索引
SubscriptionSchema.index({ userId: 1, status: 1 });
SubscriptionSchema.index({ status: 1, endDate: 1 }); // 用于查找过期订阅

/**
 * 实例方法
 */
SubscriptionSchema.methods.isActive = function(): boolean {
  return this.status === 'active' && this.endDate > new Date();
};

SubscriptionSchema.methods.isExpired = function(): boolean {
  return this.endDate <= new Date();
};

SubscriptionSchema.methods.getDaysRemaining = function(): number {
  const now = new Date();
  const diffTime = this.endDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * 静态方法
 */
SubscriptionSchema.statics.findActiveByUserId = function(userId: string) {
  return this.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    status: 'active',
    endDate: { $gt: new Date() }
  });
};

SubscriptionSchema.statics.findExpiredSubscriptions = function() {
  return this.find({
    status: 'active',
    endDate: { $lte: new Date() }
  });
};

/**
 * 中间件
 */
// 保存前验证
SubscriptionSchema.pre('save', function(next) {
  // 确保开始时间不晚于结束时间
  if (this.startDate >= this.endDate) {
    next(new Error('Start date must be before end date'));
    return;
  }
  
  // 免费版不能设置自动续费
  if (this.plan === 'free' && this.autoRenew) {
    this.autoRenew = false;
  }
  
  next();
});

// 更新前验证
SubscriptionSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate() as any;
  
  // 如果更新为免费版，取消自动续费
  if (update.plan === 'free' && update.autoRenew !== false) {
    update.autoRenew = false;
  }
  
  next();
});

/**
 * 虚拟字段
 */
SubscriptionSchema.virtual('isActiveSubscription').get(function() {
  return this.isActive();
});

SubscriptionSchema.virtual('daysRemaining').get(function() {
  return this.getDaysRemaining();
});

// 确保虚拟字段包含在JSON输出中
SubscriptionSchema.set('toJSON', { virtuals: true });
SubscriptionSchema.set('toObject', { virtuals: true });

/**
 * 导出模型
 */
export const Subscription = mongoose.models.Subscription || 
  mongoose.model<SubscriptionDocument>('Subscription', SubscriptionSchema);

export default Subscription;