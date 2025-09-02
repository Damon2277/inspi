import mongoose, { Document, Schema } from 'mongoose';
import { IPayment, PaymentMethod, PaymentStatus } from '../../types/subscription';

/**
 * 支付记录文档接口
 */
export interface PaymentDocument extends Omit<IPayment, '_id' | 'userId'>, Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  getAmountInYuan(): number;
  isExpired(): boolean;
}

/**
 * 支付记录Schema
 */
const PaymentSchema = new Schema<PaymentDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  subscriptionId: {
    type: Schema.Types.ObjectId,
    ref: 'Subscription',
    required: false,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0  // 金额以分为单位
  },
  currency: {
    type: String,
    required: true,
    default: 'CNY',
    uppercase: true
  },
  paymentMethod: {
    type: String,
    enum: ['wechat', 'alipay'] as PaymentMethod[],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'] as PaymentStatus[],
    required: true,
    default: 'pending'
  },
  transactionId: {
    type: String,
    required: false,
    index: true,
    sparse: true  // 允许多个null值
  },
  outTradeNo: {
    type: String,
    required: true,
    unique: true,  // 商户订单号必须唯一
    index: true
  },
  description: {
    type: String,
    required: true,
    maxlength: 200
  },
  paidAt: {
    type: Date,
    required: false
  }
}, {
  timestamps: true,
  collection: 'payments'
});

// 复合索引
PaymentSchema.index({ userId: 1, status: 1 });
PaymentSchema.index({ status: 1, createdAt: -1 });
PaymentSchema.index({ paymentMethod: 1, status: 1 });

/**
 * 实例方法
 */
PaymentSchema.methods.isPaid = function(): boolean {
  return this.status === 'paid';
};

PaymentSchema.methods.isPending = function(): boolean {
  return this.status === 'pending';
};

PaymentSchema.methods.isFailed = function(): boolean {
  return this.status === 'failed';
};

PaymentSchema.methods.isRefunded = function(): boolean {
  return this.status === 'refunded';
};

PaymentSchema.methods.markAsPaid = function(transactionId: string): Promise<PaymentDocument> {
  this.status = 'paid';
  this.transactionId = transactionId;
  this.paidAt = new Date();
  return this.save();
};

PaymentSchema.methods.markAsFailed = function(): Promise<PaymentDocument> {
  this.status = 'failed';
  return this.save();
};

PaymentSchema.methods.markAsRefunded = function(): Promise<PaymentDocument> {
  this.status = 'refunded';
  return this.save();
};

PaymentSchema.methods.getAmountInYuan = function(): number {
  return this.amount / 100;
};

/**
 * 静态方法
 */
PaymentSchema.statics.generateOutTradeNo = function(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `INSPI${timestamp}${random}`;
};

PaymentSchema.statics.findByOutTradeNo = function(outTradeNo: string) {
  return this.findOne({ outTradeNo });
};

PaymentSchema.statics.findByTransactionId = function(transactionId: string) {
  return this.findOne({ transactionId });
};

PaymentSchema.statics.findPendingPayments = function(olderThanMinutes: number = 30) {
  const cutoffTime = new Date(Date.now() - olderThanMinutes * 60 * 1000);
  return this.find({
    status: 'pending',
    createdAt: { $lt: cutoffTime }
  });
};

PaymentSchema.statics.getUserPaymentHistory = function(
  userId: string,
  limit: number = 10,
  offset: number = 0
) {
  return this.find({ userId: new mongoose.Types.ObjectId(userId) })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(offset)
    .populate('subscriptionId');
};

PaymentSchema.statics.getPaymentStats = function(startDate: Date, endDate: Date) {
  return this.aggregate([
    {
      $match: {
        status: 'paid',
        paidAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          method: '$paymentMethod',
          date: { $dateToString: { format: '%Y-%m-%d', date: '$paidAt' } }
        },
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.date': -1 }
    }
  ]);
};

/**
 * 中间件
 */
// 保存前验证
PaymentSchema.pre('save', function(next) {
  // 如果状态变为已支付，确保有支付时间
  if (this.status === 'paid' && !this.paidAt) {
    this.paidAt = new Date();
  }
  
  // 如果状态不是已支付，清除支付时间
  if (this.status !== 'paid') {
    this.paidAt = undefined;
  }
  
  next();
});

// 更新前验证
PaymentSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate() as any;
  
  // 如果更新状态为已支付，确保有支付时间
  if (update.status === 'paid' && !update.paidAt) {
    update.paidAt = new Date();
  }
  
  // 如果状态不是已支付，清除支付时间
  if (update.status && update.status !== 'paid') {
    update.paidAt = null;
  }
  
  next();
});

/**
 * 虚拟字段
 */
PaymentSchema.virtual('amountInYuan').get(function() {
  return this.getAmountInYuan();
});

PaymentSchema.virtual('statusText').get(function() {
  const statusMap = {
    pending: '待支付',
    paid: '已支付',
    failed: '支付失败',
    refunded: '已退款'
  };
  return statusMap[this.status] || this.status;
});

PaymentSchema.virtual('paymentMethodText').get(function() {
  const methodMap = {
    wechat: '微信支付',
    alipay: '支付宝'
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