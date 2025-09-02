import mongoose, { Document, Schema } from 'mongoose';
import { IUsage } from '../../types/subscription';

/**
 * 使用统计文档接口
 */
export interface UsageDocument extends Omit<IUsage, '_id' | 'userId'>, Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  getRemainingGenerations(): number;
  getRemainingReuses(): number;
  getUsagePercentage(): { generations: number; reuses: number };
}

/**
 * 使用统计Schema
 */
const UsageSchema = new Schema<UsageDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  date: {
    type: String,
    required: true,
    match: /^\d{4}-\d{2}-\d{2}$/,  // YYYY-MM-DD格式验证
    index: true
  },
  generations: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  reuses: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  limits: {
    maxGenerations: {
      type: Number,
      required: true,
      min: 0
    },
    maxReuses: {
      type: Number,
      required: true,
      min: 0
    }
  }
}, {
  timestamps: true,
  collection: 'usages'
});

// 复合索引 - 确保每个用户每天只有一条记录
UsageSchema.index({ userId: 1, date: 1 }, { unique: true });

// 用于查询月度统计
UsageSchema.index({ userId: 1, date: -1 });

/**
 * 实例方法
 */
UsageSchema.methods.canGenerate = function(): boolean {
  return this.generations < this.limits.maxGenerations;
};

UsageSchema.methods.canReuse = function(): boolean {
  return this.reuses < this.limits.maxReuses;
};

UsageSchema.methods.getRemainingGenerations = function(): number {
  return Math.max(0, this.limits.maxGenerations - this.generations);
};

UsageSchema.methods.getRemainingReuses = function(): number {
  return Math.max(0, this.limits.maxReuses - this.reuses);
};

UsageSchema.methods.incrementGeneration = function(): Promise<UsageDocument> {
  if (!this.canGenerate()) {
    throw new Error('Generation limit exceeded');
  }
  this.generations += 1;
  return this.save();
};

UsageSchema.methods.incrementReuse = function(): Promise<UsageDocument> {
  if (!this.canReuse()) {
    throw new Error('Reuse limit exceeded');
  }
  this.reuses += 1;
  return this.save();
};

/**
 * 静态方法
 */
UsageSchema.statics.findOrCreateToday = async function(
  userId: string,
  limits: { maxGenerations: number; maxReuses: number }
): Promise<UsageDocument> {
  const today = new Date().toISOString().split('T')[0];
  
  let usage = await this.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    date: today
  });
  
  if (!usage) {
    usage = new this({
      userId: new mongoose.Types.ObjectId(userId),
      date: today,
      generations: 0,
      reuses: 0,
      limits
    });
    await usage.save();
  } else {
    // 更新限制（可能用户升级了订阅）
    usage.limits = limits;
    await usage.save();
  }
  
  return usage;
};

UsageSchema.statics.getMonthlyStats = function(userId: string, year: number, month: number) {
  const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
  const endDate = `${year}-${(month + 1).toString().padStart(2, '0')}-01`;
  
  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        date: { $gte: startDate, $lt: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalGenerations: { $sum: '$generations' },
        totalReuses: { $sum: '$reuses' },
        totalDays: { $sum: 1 }
      }
    }
  ]);
};

UsageSchema.statics.resetDailyUsage = function(date?: string) {
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  return this.updateMany(
    { date: { $lt: targetDate } },
    { $set: { generations: 0, reuses: 0 } }
  );
};

/**
 * 中间件
 */
// 保存前验证
UsageSchema.pre('save', function(next) {
  // 确保使用次数不超过限制
  if (this.generations > this.limits.maxGenerations) {
    next(new Error('Generations exceed limit'));
    return;
  }
  
  if (this.reuses > this.limits.maxReuses) {
    next(new Error('Reuses exceed limit'));
    return;
  }
  
  next();
});

/**
 * 虚拟字段
 */
UsageSchema.virtual('remainingGenerations').get(function() {
  return this.getRemainingGenerations();
});

UsageSchema.virtual('remainingReuses').get(function() {
  return this.getRemainingReuses();
});

UsageSchema.virtual('generationProgress').get(function() {
  return this.limits.maxGenerations > 0 
    ? (this.generations / this.limits.maxGenerations) * 100 
    : 0;
});

UsageSchema.virtual('reuseProgress').get(function() {
  return this.limits.maxReuses > 0 
    ? (this.reuses / this.limits.maxReuses) * 100 
    : 0;
});

// 确保虚拟字段包含在JSON输出中
UsageSchema.set('toJSON', { virtuals: true });
UsageSchema.set('toObject', { virtuals: true });

/**
 * 导出模型
 */
export const Usage = mongoose.models.Usage || 
  mongoose.model<UsageDocument>('Usage', UsageSchema);

export default Usage;