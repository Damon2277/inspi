import mongoose, { Document, Schema } from 'mongoose';

import { PaymentMethod, PaymentStatus } from '@/shared/types/subscription';

type PaymentMethodModel = PaymentMethod | 'alipay';

interface PaymentAttributes {
  userId: mongoose.Types.ObjectId;
  subscriptionId?: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethodModel;
  status: PaymentStatus;
  transactionId?: string;
  outTradeNo: string;
  description: string;
  paidAt?: Date | null;
}

export interface PaymentDocument extends PaymentAttributes, Document {
  isPaid(): boolean;
  isPending(): boolean;
  isFailed(): boolean;
  isRefunded(): boolean;
  getAmountInYuan(): number;
  markAsPaid(transactionId: string): Promise<PaymentDocument>;
  markAsFailed(): Promise<PaymentDocument>;
  markAsRefunded(): Promise<PaymentDocument>;
}

/**
 * 支付记录Schema
 */
const PaymentSchema = new Schema<PaymentDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  subscriptionId: {
    type: Schema.Types.ObjectId,
    ref: 'Subscription',
    required: false,
    index: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,  // 金额以分为单位
  },
  currency: {
    type: String,
    required: true,
    default: 'CNY',
    uppercase: true,
  },
  paymentMethod: {
    type: String,
    enum: ['wechat_pay', 'alipay'] as PaymentMethodModel[],
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'] as PaymentStatus[],
    required: true,
    default: 'pending',
  },
  transactionId: {
    type: String,
    required: false,
    index: true,
    sparse: true,  // 允许多个null值
  },
  outTradeNo: {
    type: String,
    required: true,
    unique: true,  // 商户订单号必须唯一
    index: true,
  },
  description: {
    type: String,
    required: true,
    maxlength: 200,
  },
  paidAt: {
    type: Date,
    required: false,
  },
}, {
  timestamps: true,
  collection: 'payments',
});

// 复合索引
PaymentSchema.index({ userId: 1, status: 1 });
PaymentSchema.index({ status: 1, createdAt: -1 });
PaymentSchema.index({ paymentMethod: 1, status: 1 });

/**
 * 实例方法
 */
PaymentSchema.methods.isPaid = function (this: PaymentDocument): boolean {
  return this.status === 'completed';
};

PaymentSchema.methods.isPending = function (this: PaymentDocument): boolean {
  return this.status === 'pending';
};

PaymentSchema.methods.isFailed = function (this: PaymentDocument): boolean {
  return this.status === 'failed';
};

PaymentSchema.methods.isRefunded = function (this: PaymentDocument): boolean {
  return this.status === 'refunded';
};

PaymentSchema.methods.markAsPaid = function (this: PaymentDocument, transactionId: string): Promise<PaymentDocument> {
  this.status = 'completed';
  this.transactionId = transactionId;
  this.paidAt = new Date();
  return this.save();
};

PaymentSchema.methods.markAsFailed = function (this: PaymentDocument): Promise<PaymentDocument> {
  this.status = 'failed';
  return this.save();
};

PaymentSchema.methods.markAsRefunded = function (this: PaymentDocument): Promise<PaymentDocument> {
  this.status = 'refunded';
  return this.save();
};

PaymentSchema.methods.getAmountInYuan = function (this: PaymentDocument): number {
  return this.amount / 100;
};

/**
 * 静态方法
 */
PaymentSchema.statics.generateOutTradeNo = function (): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `INSPI${timestamp}${random}`;
};

PaymentSchema.statics.findByOutTradeNo = function (outTradeNo: string) {
  return (this.findOne as any)({ outTradeNo });
};

PaymentSchema.statics.findByTransactionId = function (transactionId: string) {
  return (this.findOne as any)({ transactionId });
};

PaymentSchema.statics.findPendingPayments = function (olderThanMinutes: number = 30) {
  const cutoffTime = new Date(Date.now() - olderThanMinutes * 60 * 1000);
  return (this.find as any)({
    status: 'pending',
    createdAt: { $lt: cutoffTime },
  });
};

PaymentSchema.statics.getUserPaymentHistory = function (
  userId: string,
  limit: number = 10,
  offset: number = 0,
) {
  return (this.find as any)({ userId: new mongoose.Types.ObjectId(userId) })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(offset)
    .populate('subscriptionId') as any;
};

PaymentSchema.statics.getPaymentStats = function (startDate: Date, endDate: Date) {
  return (this.aggregate as any)([
    {
      $match: {
        status: 'paid',
        paidAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: {
          method: '$paymentMethod',
          date: { $dateToString: { format: '%Y-%m-%d', date: '$paidAt' } },
        },
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { '_id.date': -1 },
    },
  ]);
};

/**
 * 中间件
 */
// 保存前验证
PaymentSchema.pre('save', function (next) {
  // 如果状态变为已支付，确保有支付时间
  if (this.status === 'completed' && !this.paidAt) {
    this.paidAt = new Date();
  }

  // 如果状态不是已支付，清除支付时间
  if (this.status !== 'completed') {
    this.paidAt = undefined;
  }

  next();
});

// 更新前验证
PaymentSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate() as Partial<PaymentAttributes> & { paidAt?: Date | null };

  // 如果更新状态为已支付，确保有支付时间
  if (update.status === 'completed' && !update.paidAt) {
    update.paidAt = new Date();
  }

  // 如果状态不是已支付，清除支付时间
  if (update.status && update.status !== 'completed') {
    update.paidAt = null;
  }

  next();
});

/**
 * 虚拟字段
 */
PaymentSchema.virtual('amountInYuan').get(function (this: PaymentDocument) {
  return this.getAmountInYuan();
});

PaymentSchema.virtual('statusText').get(function (this: PaymentDocument) {
  const statusMap: Record<PaymentStatus, string> = {
    pending: '待支付',
    processing: '处理中',
    completed: '已支付',
    failed: '支付失败',
    refunded: '已退款',
    cancelled: '已取消',
  };
  return statusMap[this.status] || this.status;
});

PaymentSchema.virtual('paymentMethodText').get(function (this: PaymentDocument) {
  const methodMap: Record<PaymentMethodModel, string> = {
    wechat_pay: '微信支付',
    alipay: '支付宝',
  };
  return methodMap[this.paymentMethod] || this.paymentMethod;
});

// 确保虚拟字段包含在JSON输出中
PaymentSchema.set('toJSON', { virtuals: true });
PaymentSchema.set('toObject', { virtuals: true });

/**
 * 导出模型
 */
export const Payment = mongoose.models.Payment ||
  mongoose.model<PaymentDocument>('Payment', PaymentSchema);

export default Payment;
