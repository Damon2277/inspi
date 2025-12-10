import mongoose, { Document, Schema, Types } from 'mongoose';

// 教学卡片接口
export interface TeachingCard {
  id: string;
  type: 'visualization' | 'analogy' | 'thinking' | 'interaction';
  title: string;
  content: string;
  editable: boolean;
  explanation?: string;
  metadata?: Record<string, any>;
  visual?: Record<string, any>;
  sop?: Record<string, any>;
  presentation?: Record<string, any>;
}

export interface WorkAuthor {
  _id: Types.ObjectId | string;
  name: string;
  avatar?: string | null;
}

export type WorkAuthorReference = Types.ObjectId | WorkAuthor;

export function isWorkAuthorPopulated(author: WorkAuthorReference): author is WorkAuthor {
  return typeof author === 'object' && author !== null && 'name' in author && '_id' in author;
}

export function getWorkAuthorId(author: WorkAuthorReference | null | undefined): string {
  if (!author) {
    return '';
  }

  const idValue = isWorkAuthorPopulated(author) ? author._id : author;
  return typeof idValue === 'string' ? idValue : idValue.toString();
}

export function getWorkAuthorObjectId(author: WorkAuthorReference): Types.ObjectId {
  if (author instanceof Types.ObjectId) {
    return author;
  }

  const idValue = author._id;
  if (idValue instanceof Types.ObjectId) {
    return idValue;
  }

  return new Types.ObjectId(idValue);
}

export function getWorkAuthorSummary(author: WorkAuthorReference): {
  id: string;
  name: string;
  avatar?: string | null;
} {
  if (isWorkAuthorPopulated(author)) {
    const idValue = typeof author._id === 'string' ? author._id : author._id.toString();
    return {
      id: idValue,
      name: author.name,
      avatar: author.avatar ?? null,
    };
  }

  return {
    id: author.toString(),
    name: '未知作者',
    avatar: null,
  };
}

// 归属信息接口
export interface Attribution {
  originalAuthor: WorkAuthorReference;
  originalWorkId: mongoose.Types.ObjectId;
  originalWorkTitle: string;
  originalAuthorName?: string;
  reuseType?: 'full' | 'partial';
  reuseDate?: Date;
}

// 作品接口
export interface IWork {
  title: string;
  description?: string;
  knowledgePoint: string;
  subject: string;
  gradeLevel: string;
  author: WorkAuthorReference;
  cards: TeachingCard[];
  tags: string[];
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number; // 预计学习时间（分钟）
  coverImageUrl?: string | null;

  // 社交功能
  likes: mongoose.Types.ObjectId[]; // 点赞用户列表
  likesCount: number;
  views: number;
  reuseCount: number;
  commentsCount: number;
  bookmarksCount: number;

  // 复用相关
  originalWork?: mongoose.Types.ObjectId;
  attribution: Attribution[];
  isOriginal: boolean;

  // 状态和权限
  status: 'draft' | 'published' | 'archived' | 'private';
  visibility: 'public' | 'unlisted' | 'private';
  allowReuse: boolean;
  allowComments: boolean;

  // 质量评分
  qualityScore: number; // 0-100
  moderationStatus: 'pending' | 'approved' | 'rejected';
  moderationNotes?: string;

  // 时间戳
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// 作品文档接口
export interface WorkDocument extends IWork, Document {}

// 教学卡片Schema
const TeachingCardSchema = new Schema({
  id: { type: String, required: true },
  type: {
    type: String,
    required: true,
    enum: ['visualization', 'analogy', 'thinking', 'interaction'],
  },
  title: { type: String, required: true },
  content: { type: String, required: true },
  editable: { type: Boolean, default: true },
  explanation: { type: String },
  metadata: { type: Schema.Types.Mixed },
  visual: { type: Schema.Types.Mixed },
  sop: { type: Schema.Types.Mixed },
  presentation: { type: Schema.Types.Mixed },
});

// 归属信息Schema
const AttributionSchema = new Schema({
  originalAuthor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  originalWorkId: { type: Schema.Types.ObjectId, ref: 'Work', required: true },
  originalWorkTitle: { type: String, required: true },
  originalAuthorName: { type: String },
  reuseType: { type: String, enum: ['full', 'partial'] },
  reuseDate: { type: Date },
});

// 作品Schema
const WorkSchema = new Schema<WorkDocument>({
  title: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, trim: true, maxlength: 500 },
  knowledgePoint: { type: String, required: true, trim: true },
  subject: { type: String, required: true, trim: true },
  gradeLevel: { type: String, required: true, trim: true },
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  cards: [TeachingCardSchema],
  tags: [{ type: String, trim: true, maxlength: 20 }],
  category: { type: String, required: true, trim: true },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner',
  },
  estimatedTime: { type: Number, default: 30, min: 5, max: 300 },
  coverImageUrl: { type: String },

  // 社交功能
  likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  likesCount: { type: Number, default: 0 },
  views: { type: Number, default: 0 },
  reuseCount: { type: Number, default: 0 },
  commentsCount: { type: Number, default: 0 },
  bookmarksCount: { type: Number, default: 0 },

  // 复用相关
  originalWork: { type: Schema.Types.ObjectId, ref: 'Work' },
  attribution: [AttributionSchema],
  isOriginal: { type: Boolean, default: true },

  // 状态和权限
  status: {
    type: String,
    enum: ['draft', 'published', 'archived', 'private'],
    default: 'draft',
  },
  visibility: {
    type: String,
    enum: ['public', 'unlisted', 'private'],
    default: 'public',
  },
  allowReuse: { type: Boolean, default: true },
  allowComments: { type: Boolean, default: true },

  // 质量评分
  qualityScore: { type: Number, default: 0, min: 0, max: 100 },
  moderationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  moderationNotes: { type: String, trim: true },

  // 时间戳
  publishedAt: { type: Date },
}, {
  timestamps: true,
});

// 索引
WorkSchema.index({ author: 1, status: 1 });
WorkSchema.index({ subject: 1, gradeLevel: 1 });
WorkSchema.index({ knowledgePoint: 'text', title: 'text' });
WorkSchema.index({ reuseCount: -1 });
WorkSchema.index({ createdAt: -1 });

// 实例方法：增加复用次数
WorkSchema.methods.incrementReuseCount = function () {
  this.reuseCount += 1;
  return this.save();
};

// 实例方法：添加归属信息
WorkSchema.methods.addAttribution = function (attribution: Attribution) {
  this.attribution.push(attribution);
  return this.save();
};

// 静态方法：获取热门作品
WorkSchema.statics.getPopularWorks = function (limit: number = 10) {
  return (this.find as any)({ status: 'published' })
    .sort({ reuseCount: -1 })
    .limit(limit)
    .populate('author', 'name avatar') as any;
};

// 静态方法：按学科获取作品
WorkSchema.statics.getWorksBySubject = function (subject: string, limit: number = 20) {
  return (this.find as any)({ subject, status: 'published' })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('author', 'name avatar') as any;
};

export default mongoose.models.Work || mongoose.model<WorkDocument>('Work', WorkSchema);
