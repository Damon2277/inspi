import mongoose, { Schema, Document, Model } from 'mongoose';
import { ContributionType } from '@/types/contribution';

// 贡献度记录接口
export interface IContributionLog {
  userId: mongoose.Types.ObjectId;
  type: ContributionType;
  points: number;
  workId?: mongoose.Types.ObjectId;
  relatedUserId?: mongoose.Types.ObjectId; // 复用时的原作者
  description: string;
  metadata?: {
    workTitle?: string;
    originalAuthor?: string;
    reuseCount?: number;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

// 贡献度记录文档接口
export interface ContributionLogDocument extends IContributionLog, Document {}

// 贡献度记录Schema
const ContributionLogSchema = new Schema<ContributionLogDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['creation', 'reuse', 'bonus', 'penalty'],
    required: true,
    index: true
  },
  points: {
    type: Number,
    required: true,
    min: -1000,
    max: 1000
  },
  workId: {
    type: Schema.Types.ObjectId,
    ref: 'Work',
    index: true
  },
  relatedUserId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  description: {
    type: String,
    required: true,
    maxlength: 500
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  collection: 'contribution_logs'
});

// 复合索引优化查询
ContributionLogSchema.index({ userId: 1, createdAt: -1 });
ContributionLogSchema.index({ type: 1, createdAt: -1 });
ContributionLogSchema.index({ workId: 1, type: 1 });

// 静态方法：获取用户总贡献度
ContributionLogSchema.statics.getUserTotalContribution = async function(userId: string) {
  const result = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    { $group: { _id: null, totalPoints: { $sum: '$points' } } }
  ]);
  return result[0]?.totalPoints || 0;
};

// 静态方法：获取用户时间段内贡献度
ContributionLogSchema.statics.getUserContributionByPeriod = async function(
  userId: string, 
  startDate: Date, 
  endDate: Date
) {
  const result = await this.aggregate([
    { 
      $match: { 
        userId: new mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate, $lte: endDate }
      } 
    },
    { $group: { _id: null, totalPoints: { $sum: '$points' } } }
  ]);
  return result[0]?.totalPoints || 0;
};

// 静态方法：获取排行榜数据
ContributionLogSchema.statics.getLeaderboard = async function(limit = 50) {
  return await this.aggregate([
    {
      $group: {
        _id: '$userId',
        totalPoints: { $sum: '$points' },
        creationCount: {
          $sum: { $cond: [{ $eq: ['$type', 'creation'] }, 1, 0] }
        },
        reuseCount: {
          $sum: { $cond: [{ $eq: ['$type', 'reuse'] }, 1, 0] }
        },
        lastActivity: { $max: '$createdAt' }
      }
    },
    { $sort: { totalPoints: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: '$user' },
    {
      $project: {
        userId: '$_id',
        totalPoints: 1,
        creationCount: 1,
        reuseCount: 1,
        lastActivity: 1,
        userName: '$user.name',
        userAvatar: '$user.avatar'
      }
    }
  ]);
};

// 实例方法：格式化显示
ContributionLogSchema.methods.getDisplayText = function(): string {
  switch (this.type) {
    case 'creation':
      return `发布作品《${this.metadata?.workTitle || '未知作品'}》获得 ${this.points} 分`;
    case 'reuse':
      return `作品《${this.metadata?.workTitle || '未知作品'}》被复用获得 ${this.points} 分`;
    case 'bonus':
      return `获得奖励积分 ${this.points} 分：${this.description}`;
    case 'penalty':
      return `扣除积分 ${Math.abs(this.points)} 分：${this.description}`;
    default:
      return this.description;
  }
};

// 创建模型
const ContributionLog = mongoose.model<ContributionLogDocument>('ContributionLog', ContributionLogSchema);

export default ContributionLog;