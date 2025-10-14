/**
 * 评论模型
 * 支持作品评论和回复功能
 */
import mongoose, { Document, Schema } from 'mongoose';

export interface IComment {
  work: mongoose.Types.ObjectId
  author: mongoose.Types.ObjectId
  content: string
  parentComment?: mongoose.Types.ObjectId // 父评论ID，用于回复
  likes: mongoose.Types.ObjectId[]
  likesCount: number
  repliesCount: number
  isEdited: boolean
  editedAt?: Date
  status: 'active' | 'hidden' | 'deleted'
  moderationStatus: 'pending' | 'approved' | 'rejected'
  moderationNotes?: string
  createdAt: Date
  updatedAt: Date
}

export interface CommentDocument extends IComment, Document {}

const CommentSchema = new Schema<CommentDocument>({
  work: { type: Schema.Types.ObjectId, ref: 'Work', required: true },
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 1000,
  },
  parentComment: { type: Schema.Types.ObjectId, ref: 'Comment' },
  likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  likesCount: { type: Number, default: 0 },
  repliesCount: { type: Number, default: 0 },
  isEdited: { type: Boolean, default: false },
  editedAt: { type: Date },
  status: {
    type: String,
    enum: ['active', 'hidden', 'deleted'],
    default: 'active',
  },
  moderationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved', // 评论默认通过，可后续调整
  },
  moderationNotes: { type: String, trim: true },
}, {
  timestamps: true,
});

// 索引
CommentSchema.index({ work: 1, status: 1, createdAt: -1 });
CommentSchema.index({ author: 1, createdAt: -1 });
CommentSchema.index({ parentComment: 1, createdAt: 1 });

// 实例方法：点赞评论
CommentSchema.methods.toggleLike = function (userId: mongoose.Types.ObjectId) {
  const userIdStr = userId.toString();
  const likeIndex = this.likes.findIndex((id: mongoose.Types.ObjectId) =>
    id.toString() === userIdStr,
  );

  if (likeIndex > -1) {
    // 取消点赞
    this.likes.splice(likeIndex, 1);
    this.likesCount = Math.max(0, this.likesCount - 1);
  } else {
    // 添加点赞
    this.likes.push(userId);
    this.likesCount += 1;
  }

  return this.save();
};

// 实例方法：编辑评论
CommentSchema.methods.editContent = function (newContent: string) {
  this.content = newContent;
  this.isEdited = true;
  this.editedAt = new Date();
  return this.save();
};

// 静态方法：获取作品的评论
CommentSchema.statics.getWorkComments = function (
  workId: mongoose.Types.ObjectId,
  page: number = 1,
  limit: number = 20,
) {
  const skip = (page - 1) * limit;

  return (this.find as any)({
    work: workId,
    status: 'active',
    parentComment: { $exists: false }, // 只获取顶级评论
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('author', 'name avatar')
    .populate({
      path: 'replies',
      options: { sort: { createdAt: 1 }, limit: 3 },
      populate: { path: 'author', select: 'name avatar' },
    }) as any;
};

// 静态方法：获取评论的回复
CommentSchema.statics.getCommentReplies = function (
  commentId: mongoose.Types.ObjectId,
  page: number = 1,
  limit: number = 10,
) {
  const skip = (page - 1) * limit;

  return (this.find as any)({
    parentComment: commentId,
    status: 'active',
  })
    .sort({ createdAt: 1 })
    .skip(skip)
    .limit(limit)
    .populate('author', 'name avatar') as any;
};

// 虚拟字段：回复
CommentSchema.virtual('replies', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'parentComment',
});

export default mongoose.models.Comment || mongoose.model<CommentDocument>('Comment', CommentSchema);
