/**
 * 关注模型
 * 用户关注和粉丝系统
 */
import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IFollow {
  follower: mongoose.Types.ObjectId // 关注者
  following: mongoose.Types.ObjectId // 被关注者
  status: 'active' | 'blocked' // 关注状态
  createdAt: Date
  updatedAt: Date
}

export interface FollowDocument extends IFollow, Document<Types.ObjectId, any, IFollow> {
  _id: Types.ObjectId;
}

export interface FollowModelType extends Model<FollowDocument> {
  getFollowing(userId: mongoose.Types.ObjectId, page?: number, limit?: number): Promise<FollowDocument[]>;
  getFollowers(userId: mongoose.Types.ObjectId, page?: number, limit?: number): Promise<FollowDocument[]>;
  isFollowing(followerId: mongoose.Types.ObjectId, followingId: mongoose.Types.ObjectId): Promise<boolean | { _id: mongoose.Types.ObjectId } | null>;
  getFollowStats(userId: mongoose.Types.ObjectId): Promise<{ followingCount: number; followersCount: number }>;
  getMutualFollows(userId1: mongoose.Types.ObjectId, userId2: mongoose.Types.ObjectId): Promise<any[]>;
}

const FollowSchema = new Schema<FollowDocument, FollowModelType>({
  follower: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  following: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: ['active', 'blocked'],
    default: 'active',
  },
}, {
  timestamps: true,
});

// 复合索引：确保用户不能重复关注同一人
FollowSchema.index({ follower: 1, following: 1 }, { unique: true });
FollowSchema.index({ follower: 1, status: 1, createdAt: -1 });
FollowSchema.index({ following: 1, status: 1, createdAt: -1 });

// 验证：用户不能关注自己
FollowSchema.pre('save', function (next) {
  if (this.follower.equals(this.following)) {
    const error = new Error('用户不能关注自己');
    return next(error);
  }
  next();
});

// 静态方法：获取用户的关注列表
FollowSchema.statics.getFollowing = function (
  this: FollowModelType,
  userId: mongoose.Types.ObjectId,
  page: number = 1,
  limit: number = 20,
): Promise<FollowDocument[]> {
  const skip = (page - 1) * limit;

  return (this.find as any)({ follower: userId, status: 'active' })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('following', 'name avatar bio followersCount followingCount')
        .exec();
};

// 静态方法：获取用户的粉丝列表
FollowSchema.statics.getFollowers = function (
  this: FollowModelType,
  userId: mongoose.Types.ObjectId,
  page: number = 1,
  limit: number = 20,
): Promise<FollowDocument[]> {
  const skip = (page - 1) * limit;

  return (this.find as any)({ following: userId, status: 'active' })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('follower', 'name avatar bio followersCount followingCount')
        .exec();
};

// 静态方法：检查关注关系
FollowSchema.statics.isFollowing = function (
  this: FollowModelType,
  followerId: mongoose.Types.ObjectId,
  followingId: mongoose.Types.ObjectId,
) {
  return this.exists({
    follower: followerId,
    following: followingId,
    status: 'active',
  });
};

// 静态方法：获取关注统计
FollowSchema.statics.getFollowStats = function (this: FollowModelType, userId: mongoose.Types.ObjectId) {
  return Promise.all([
    (this.countDocuments as any)({ follower: userId, status: 'active' }), // 关注数
    (this.countDocuments as any)({ following: userId, status: 'active' }), // 粉丝数
  ]).then(([followingCount, followersCount]) => ({
    followingCount,
    followersCount,
  }));
};

// 静态方法：获取共同关注
FollowSchema.statics.getMutualFollows = function (
  this: FollowModelType,
  userId1: mongoose.Types.ObjectId,
  userId2: mongoose.Types.ObjectId,
): Promise<any[]> {
  return (this.aggregate as any)([
    {
      $match: {
        follower: userId1,
        status: 'active',
      },
    },
    {
      $lookup: {
        from: 'follows',
        let: { following: '$following' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$follower', userId2] },
                  { $eq: ['$following', '$$following'] },
                  { $eq: ['$status', 'active'] },
                ],
              },
            },
          },
        ],
        as: 'mutual',
      },
    },
    {
      $match: {
        'mutual.0': { $exists: true },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'following',
        foreignField: '_id',
        as: 'user',
      },
    },
    {
      $unwind: '$user',
    },
    {
      $project: {
        _id: '$user._id',
        name: '$user.name',
        avatar: '$user.avatar',
      },
    },
  ]).exec();
};

const FollowModel = (mongoose.models.Follow as FollowModelType | undefined) ||
  mongoose.model<FollowDocument, FollowModelType>('Follow', FollowSchema);

export default FollowModel;
