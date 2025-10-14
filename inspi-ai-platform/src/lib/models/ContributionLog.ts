import mongoose, { Schema, Document, Model, Types } from 'mongoose';

import { ContributionType } from '@/shared/types/contribution';

interface ContributionTarget {
  type: string;
  id: string;
  title?: string;
}

// 贡献度记录接口
export interface IContributionLog {
  userId?: mongoose.Types.ObjectId;
  user?: mongoose.Types.ObjectId;
  type?: ContributionType;
  action?: string;
  points: number;
  workId?: mongoose.Types.ObjectId;
  relatedUserId?: mongoose.Types.ObjectId; // 复用时的原作者
  description?: string;
  target?: ContributionTarget;
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
export interface ContributionLogDocument extends IContributionLog, Document<Types.ObjectId, any, IContributionLog> {
  _id: Types.ObjectId;
}

export interface ContributionLogModel extends Model<ContributionLogDocument> {
  getUserTotalContribution(userId: string): Promise<number>;
  getUserContributionByPeriod(userId: string, startDate: Date, endDate: Date): Promise<number>;
  getLeaderboard(limit?: number): Promise<any[]>;
}

// 贡献度记录Schema
const ContributionLogSchema = new Schema<ContributionLogDocument, ContributionLogModel>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  type: {
    type: String,
    enum: ['creation', 'reuse', 'bonus', 'penalty'],
    index: true,
  },
  action: {
    type: String,
    trim: true,
    index: true,
  },
  points: {
    type: Number,
    required: true,
    min: -1000,
    max: 1000,
  },
  workId: {
    type: Schema.Types.ObjectId,
    ref: 'Work',
    index: true,
  },
  relatedUserId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  description: {
    type: String,
    maxlength: 500,
  },
  target: {
    type: new Schema<ContributionTarget>({
      type: { type: String, trim: true },
      id: { type: String, trim: true },
      title: { type: String, trim: true },
    }, { _id: false }),
    default: undefined,
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
  collection: 'contribution_logs',
});

// 复合索引优化查询
ContributionLogSchema.index({ userId: 1, createdAt: -1 });
ContributionLogSchema.index({ type: 1, createdAt: -1 });
ContributionLogSchema.index({ workId: 1, type: 1 });

// 静态方法：获取用户总贡献度
ContributionLogSchema.statics.getUserTotalContribution = async function (this: ContributionLogModel, userId: string) {
  const result = await (this.aggregate as any)([
    {
      $match: {
        $or: [
          { userId: new mongoose.Types.ObjectId(userId) },
          { user: new mongoose.Types.ObjectId(userId) },
        ],
      },
    },
    { $group: { _id: null, totalPoints: { $sum: '$points' } } },
  ]);
  return result[0]?.totalPoints || 0;
};

// 静态方法：获取用户时间段内贡献度
ContributionLogSchema.statics.getUserContributionByPeriod = async function (
  this: ContributionLogModel,
  userId: string,
  startDate: Date,
  endDate: Date,
) {
  const result = await (this.aggregate as any)([
    {
      $match: {
        $or: [
          { userId: new mongoose.Types.ObjectId(userId) },
          { user: new mongoose.Types.ObjectId(userId) },
        ],
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    { $group: { _id: null, totalPoints: { $sum: '$points' } } },
  ]);
  return result[0]?.totalPoints || 0;
};

// 静态方法：获取排行榜数据
ContributionLogSchema.statics.getLeaderboard = async function (this: ContributionLogModel, limit = 50) {
  return await (this.aggregate as any)([
    {
      $addFields: {
        resolvedUser: { $ifNull: ['$userId', '$user'] },
      },
    },
    {
      $group: {
        _id: '$resolvedUser',
        totalPoints: { $sum: '$points' },
        creationCount: {
          $sum: { $cond: [{ $eq: ['$type', 'creation'] }, 1, 0] },
        },
        reuseCount: {
          $sum: { $cond: [{ $eq: ['$type', 'reuse'] }, 1, 0] },
        },
        lastActivity: { $max: '$createdAt' },
      },
    },
    { $sort: { totalPoints: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user',
      },
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
        userAvatar: '$user.avatar',
      },
    },
  ]);
};

// 实例方法：格式化显示
ContributionLogSchema.methods.getDisplayText = function (): string {
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

const ContributionLog = (mongoose.models.ContributionLog as ContributionLogModel | undefined) ||
  mongoose.model<ContributionLogDocument, ContributionLogModel>('ContributionLog', ContributionLogSchema);

export default ContributionLog;
