/**
 * 书签模型
 * 用户收藏作品功能
 */
import mongoose, { Document, Model, Query, Schema, Types } from 'mongoose';

export interface IBookmark {
  user: mongoose.Types.ObjectId
  work: mongoose.Types.ObjectId
  folder?: string // 收藏夹名称
  notes?: string // 用户备注
  tags: string[] // 用户自定义标签
  createdAt: Date
  updatedAt: Date
}

export interface BookmarkDocument extends IBookmark, Document<Types.ObjectId, any, IBookmark> {
  _id: Types.ObjectId;
}

export interface BookmarkModelType extends Model<BookmarkDocument> {
  getUserFolders(userId: Types.ObjectId): Promise<any[]>;
  getUserBookmarks(
    userId: Types.ObjectId,
    folder?: string,
    page?: number,
    limit?: number
  ): Query<BookmarkDocument[], BookmarkDocument>;
  isBookmarked(userId: Types.ObjectId, workId: Types.ObjectId): Promise<boolean | { _id: Types.ObjectId } | null>;
}

const BookmarkSchema = new Schema<BookmarkDocument, BookmarkModelType>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  work: { type: Schema.Types.ObjectId, ref: 'Work', required: true },
  folder: { type: String, trim: true, maxlength: 50, default: '默认收藏夹' },
  notes: { type: String, trim: true, maxlength: 500 },
  tags: [{ type: String, trim: true, maxlength: 20 }],
}, {
  timestamps: true,
});

// 复合索引：确保用户不能重复收藏同一作品
BookmarkSchema.index({ user: 1, work: 1 }, { unique: true });
BookmarkSchema.index({ user: 1, folder: 1, createdAt: -1 });
BookmarkSchema.index({ user: 1, tags: 1 });

// 静态方法：获取用户的收藏夹列表
BookmarkSchema.statics.getUserFolders = function (this: BookmarkModelType, userId: mongoose.Types.ObjectId) {
  return (this.aggregate as any)([
    { $match: { user: userId } },
    {
      $group: {
        _id: '$folder',
        count: { $sum: 1 },
        lastUpdated: { $max: '$updatedAt' },
      },
    },
    { $sort: { lastUpdated: -1 } },
  ]);
};

// 静态方法：获取用户收藏的作品
BookmarkSchema.statics.getUserBookmarks = function (
  this: BookmarkModelType,
  userId: mongoose.Types.ObjectId,
  folder?: string,
  page: number = 1,
  limit: number = 20,
): Promise<BookmarkDocument[]> {
  const skip = (page - 1) * limit;
  const query: any = { user: userId };

  if (folder) {
    query.folder = folder;
  }

  return (this.find as any)(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate({
      path: 'work',
      populate: { path: 'author', select: 'name avatar' },
    }) as any;
};

// 静态方法：检查用户是否收藏了作品
BookmarkSchema.statics.isBookmarked = function (
  this: BookmarkModelType,
  userId: mongoose.Types.ObjectId,
  workId: mongoose.Types.ObjectId,
) {
  return this.exists({ user: userId, work: workId });
};

const BookmarkModel = (mongoose.models.Bookmark as BookmarkModelType | undefined) ||
  mongoose.model<BookmarkDocument, BookmarkModelType>('Bookmark', BookmarkSchema);

export default BookmarkModel;
