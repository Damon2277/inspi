import mongoose, { Document, Schema } from 'mongoose';

// 教学卡片接口
export interface TeachingCard {
  id: string;
  type: 'visualization' | 'analogy' | 'thinking' | 'interaction';
  title: string;
  content: string;
  editable: boolean;
}

// 归属信息接口
export interface Attribution {
  originalAuthor: mongoose.Types.ObjectId;
  originalWorkId: mongoose.Types.ObjectId;
  originalWorkTitle: string;
}

// 作品接口
export interface IWork {
  title: string;
  knowledgePoint: string;
  subject: string;
  gradeLevel: string;
  author: mongoose.Types.ObjectId;
  cards: TeachingCard[];
  tags: string[];
  reuseCount: number;
  originalWork?: mongoose.Types.ObjectId;
  attribution: Attribution[];
  status: 'draft' | 'published' | 'archived';
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
    enum: ['visualization', 'analogy', 'thinking', 'interaction']
  },
  title: { type: String, required: true },
  content: { type: String, required: true },
  editable: { type: Boolean, default: true }
});

// 归属信息Schema
const AttributionSchema = new Schema({
  originalAuthor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  originalWorkId: { type: Schema.Types.ObjectId, ref: 'Work', required: true },
  originalWorkTitle: { type: String, required: true }
});

// 作品Schema
const WorkSchema = new Schema<WorkDocument>({
  title: { type: String, required: true, trim: true },
  knowledgePoint: { type: String, required: true, trim: true },
  subject: { type: String, required: true, trim: true },
  gradeLevel: { type: String, required: true, trim: true },
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  cards: [TeachingCardSchema],
  tags: [{ type: String, trim: true }],
  reuseCount: { type: Number, default: 0 },
  originalWork: { type: Schema.Types.ObjectId, ref: 'Work' },
  attribution: [AttributionSchema],
  status: { 
    type: String, 
    enum: ['draft', 'published', 'archived'], 
    default: 'draft' 
  }
}, {
  timestamps: true
});

// 索引
WorkSchema.index({ author: 1, status: 1 });
WorkSchema.index({ subject: 1, gradeLevel: 1 });
WorkSchema.index({ knowledgePoint: 'text', title: 'text' });
WorkSchema.index({ reuseCount: -1 });
WorkSchema.index({ createdAt: -1 });

// 实例方法：增加复用次数
WorkSchema.methods.incrementReuseCount = function() {
  this.reuseCount += 1;
  return this.save();
};

// 实例方法：添加归属信息
WorkSchema.methods.addAttribution = function(attribution: Attribution) {
  this.attribution.push(attribution);
  return this.save();
};

// 静态方法：获取热门作品
WorkSchema.statics.getPopularWorks = function(limit: number = 10) {
  return this.find({ status: 'published' })
    .sort({ reuseCount: -1 })
    .limit(limit)
    .populate('author', 'name avatar');
};

// 静态方法：按学科获取作品
WorkSchema.statics.getWorksBySubject = function(subject: string, limit: number = 20) {
  return this.find({ subject, status: 'published' })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('author', 'name avatar');
};

export default mongoose.models.Work || mongoose.model<WorkDocument>('Work', WorkSchema);