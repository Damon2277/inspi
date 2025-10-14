import mongoose, { Schema, Document, Model, Types } from 'mongoose';

import {
  GraphNode,
  GraphEdge,
  LayoutConfig,
  ViewConfig,
} from '@/shared/types/knowledgeGraph';

type TemplateNode = Omit<GraphNode, 'metadata'> & {
  position?: { x: number; y: number; z?: number };
  isVisible?: boolean;
  isLocked?: boolean;
};

type TemplateEdge = GraphEdge;

export interface GraphTemplateDocument extends Document {
  name: string;
  description: string;
  subject: string;
  gradeLevel?: string;
  category: string;
  nodes: TemplateNode[];
  edges: TemplateEdge[];
  layout: LayoutConfig;
  view: ViewConfig;
  isOfficial: boolean;
  usageCount: number;
  rating: number;
  tags: string[];
  authorId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface GraphTemplateModelType extends Model<GraphTemplateDocument> {
  getOfficialTemplates(subject?: string): Promise<GraphTemplateDocument[]>;
  getPopularTemplates(limit?: number): Promise<GraphTemplateDocument[]>;
  searchTemplates(searchOptions?: Record<string, any>): Promise<GraphTemplateDocument[]>;
}

// 图谱模板Schema
const GraphTemplateSchema = new Schema<GraphTemplateDocument, GraphTemplateModelType>({
  name: {
    type: String,
    required: true,
    maxlength: 100,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    maxlength: 500,
    trim: true,
  },
  subject: {
    type: String,
    required: true,
    index: true,
  },
  gradeLevel: {
    type: String,
    index: true,
  },
  category: {
    type: String,
    required: true,
    index: true,
  },
  nodes: {
    type: [{
      id: { type: String, required: true },
      label: { type: String, required: true },
      type: { type: String, required: true },
      level: { type: Number, required: true },
      parentId: { type: String },
      position: {
        x: { type: Number, default: 0 },
        y: { type: Number, default: 0 },
      },
      isVisible: { type: Boolean, default: true },
      isLocked: { type: Boolean, default: true },
    }],
    default: [],
  },
  edges: {
    type: [{
      id: { type: String, required: true },
      source: { type: String, required: true },
      target: { type: String, required: true },
      type: { type: String, required: true },
      weight: { type: Number, default: 1 },
      metadata: {
        type: Schema.Types.Mixed,
        default: {},
      },
      isVisible: { type: Boolean, default: true },
      isDirected: { type: Boolean, default: true },
    }],
    default: [],
  },
  layout: {
    type: Schema.Types.Mixed,
    default: {
      type: 'force',
      options: {
        nodeSpacing: 100,
        levelSpacing: 150,
        centerForce: 0.1,
        linkDistance: 80,
        linkStrength: 0.5,
        chargeStrength: -300,
        collisionRadius: 30,
        alpha: 0.3,
        alphaDecay: 0.02,
        velocityDecay: 0.4,
      },
    },
  },
  view: {
    type: Schema.Types.Mixed,
    default: {
      showLabels: true,
      showEdgeLabels: false,
      nodeSize: 'proportional',
      edgeWidth: 'fixed',
      colorScheme: 'default',
      theme: 'light',
      animations: true,
      minimap: true,
      toolbar: true,
    },
  },
  isOfficial: {
    type: Boolean,
    default: false,
    index: true,
  },
  usageCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  tags: [{
    type: String,
    trim: true,
  }],
  authorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
}, {
  timestamps: true,
  collection: 'graph_templates',
});

// 复合索引
GraphTemplateSchema.index({ subject: 1, gradeLevel: 1 });
GraphTemplateSchema.index({ category: 1, isOfficial: 1 });
GraphTemplateSchema.index({ usageCount: -1, rating: -1 });
GraphTemplateSchema.index({ tags: 1 });

// 虚拟字段
GraphTemplateSchema.virtual('nodeCount').get(function (this: GraphTemplateDocument) {
  return this.nodes.length;
});

GraphTemplateSchema.virtual('edgeCount').get(function (this: GraphTemplateDocument) {
  return this.edges.length;
});

// 静态方法

// 获取官方模板
GraphTemplateSchema.statics.getOfficialTemplates = function (this: GraphTemplateModelType, subject?: string) {
  const query: Record<string, unknown> = { isOfficial: true };
  if (subject) {
    query.subject = subject;
  }

  return (this.find as any)(query)
    .sort({ subject: 1, usageCount: -1 })
    .populate('authorId', 'name avatar') as any;
};

// 获取热门模板
GraphTemplateSchema.statics.getPopularTemplates = function (this: GraphTemplateModelType, limit: number = 10) {
  return (this.find as any)({ isOfficial: false })
    .sort({ usageCount: -1, rating: -1, createdAt: -1 })
    .limit(limit)
    .populate('authorId', 'name avatar') as any;
};

// 搜索模板
GraphTemplateSchema.statics.searchTemplates = function (this: GraphTemplateModelType, searchOptions: Record<string, any> = {}) {
  const query: Record<string, unknown> = {};

  if (searchOptions.subject) {
    query.subject = searchOptions.subject;
  }

  if (searchOptions.gradeLevel) {
    query.gradeLevel = searchOptions.gradeLevel;
  }

  if (searchOptions.category) {
    query.category = searchOptions.category;
  }

  if (searchOptions.isOfficial !== undefined) {
    query.isOfficial = searchOptions.isOfficial;
  }

  if (searchOptions.tags && searchOptions.tags.length > 0) {
    query.tags = { $in: searchOptions.tags };
  }

  if (searchOptions.search) {
    query.$or = [
      { name: { $regex: searchOptions.search, $options: 'i' } },
      { description: { $regex: searchOptions.search, $options: 'i' } },
      { tags: { $regex: searchOptions.search, $options: 'i' } },
    ];
  }

  const sortOptions: any = {};
  if (searchOptions.sortBy === 'usage') {
    sortOptions.usageCount = -1;
  } else if (searchOptions.sortBy === 'rating') {
    sortOptions.rating = -1;
  } else if (searchOptions.sortBy === 'name') {
    sortOptions.name = 1;
  } else {
    sortOptions.createdAt = -1;
  }

  return (this.find as any)(query)
    .sort(sortOptions)
    .limit(searchOptions.limit || 20)
    .skip(searchOptions.offset || 0)
    .populate('authorId', 'name avatar') as any;
};

// 获取模板分类统计
GraphTemplateSchema.statics.getCategoryStats = async function () {
  return (this.aggregate as any)([
    {
      $group: {
        _id: {
          category: '$category',
          subject: '$subject',
        },
        count: { $sum: 1 },
        avgRating: { $avg: '$rating' },
        totalUsage: { $sum: '$usageCount' },
      },
    },
    {
      $group: {
        _id: '$_id.category',
        subjects: {
          $push: {
            subject: '$_id.subject',
            count: '$count',
            avgRating: '$avgRating',
            totalUsage: '$totalUsage',
          },
        },
        totalCount: { $sum: '$count' },
        avgRating: { $avg: '$avgRating' },
        totalUsage: { $sum: '$totalUsage' },
      },
    },
    { $sort: { totalCount: -1 } },
  ]);
};

// 获取用户创建的模板
GraphTemplateSchema.statics.getUserTemplates = function (userId: string) {
  return (this.find as any)({
    authorId: new mongoose.Types.ObjectId(userId),
    isOfficial: false,
  })
  .sort({ updatedAt: -1 });
};

// 实例方法

// 增加使用次数
GraphTemplateSchema.methods.incrementUsage = function () {
  this.usageCount += 1;
  return this.save();
};

// 更新评分
GraphTemplateSchema.methods.updateRating = async function (newRating: number) {
  // 这里简化处理，实际应该基于多个用户评分计算平均值
  this.rating = Math.max(0, Math.min(5, newRating));
  return this.save();
};

// 克隆模板为用户图谱
GraphTemplateSchema.methods.cloneForUser = function (userId: string, customName?: string) {
  const KnowledgeGraph = mongoose.model('KnowledgeGraph');

  // 为节点添加默认元数据
  const nodesWithMetadata = this.nodes.map((node: any) => ({
    ...node.toObject(),
    metadata: {
      description: '',
      workCount: 0,
      reuseCount: 0,
      color: '#3b82f6',
      icon: '📝',
      importance: 0,
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  }));

  return new KnowledgeGraph({
    userId: new mongoose.Types.ObjectId(userId),
    name: customName || this.name,
    description: this.description,
    type: 'hybrid',
    subject: this.subject,
    gradeLevel: this.gradeLevel,
    nodes: nodesWithMetadata,
    edges: this.edges,
    layout: this.layout,
    view: this.view,
    templateId: this._id,
    isPublic: false,
  });
};

// 验证模板结构
GraphTemplateSchema.methods.validateStructure = function () {
  const errors: string[] = [];

  // 检查节点ID唯一性
  const nodeIds = this.nodes.map((node: any) => node.id);
  const uniqueNodeIds = new Set(nodeIds);
  if (nodeIds.length !== uniqueNodeIds.size) {
    errors.push('Duplicate node IDs found');
  }

  // 检查边ID唯一性
  const edgeIds = this.edges.map((edge: any) => edge.id);
  const uniqueEdgeIds = new Set(edgeIds);
  if (edgeIds.length !== uniqueEdgeIds.size) {
    errors.push('Duplicate edge IDs found');
  }

  // 检查边的源节点和目标节点是否存在
  const nodeIdSet = new Set(nodeIds);
  for (const edge of this.edges) {
    if (!nodeIdSet.has(edge.source)) {
      errors.push(`Edge ${edge.id}: source node ${edge.source} not found`);
    }
    if (!nodeIdSet.has(edge.target)) {
      errors.push(`Edge ${edge.id}: target node ${edge.target} not found`);
    }
  }

  // 检查是否有根节点
  const hasRootNode = this.nodes.some((node: any) => node.level === 0);
  if (!hasRootNode) {
    errors.push('No root node found (level 0)');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// 中间件

// 保存前验证
GraphTemplateSchema.pre('save', function (next) {
  try {
    // 基本验证：检查节点和边的数量
    if (this.nodes.length === 0) {
      return next(new Error('Template must have at least one node'));
    }

    // 检查节点ID唯一性
    const nodeIds = new Set();
    for (const node of this.nodes) {
      if (nodeIds.has(node.id)) {
        return next(new Error(`Duplicate node ID: ${node.id}`));
      }
      nodeIds.add(node.id);
    }

    // 检查边的源节点和目标节点是否存在
    for (const edge of this.edges) {
      if (!nodeIds.has(edge.source)) {
        return next(new Error(`Edge source node not found: ${edge.source}`));
      }
      if (!nodeIds.has(edge.target)) {
        return next(new Error(`Edge target node not found: ${edge.target}`));
      }
    }

    next();
  } catch (error) {
    next(error as Error);
  }
});

// 删除前检查是否被使用
GraphTemplateSchema.pre('deleteOne', { document: true }, async function (next) {
  const KnowledgeGraph = mongoose.model('KnowledgeGraph');
  const usageCount = await (KnowledgeGraph.countDocuments as any)({ templateId: this._id });

  if (usageCount > 0) {
    return next(new Error('Cannot delete template: it is being used by existing knowledge graphs'));
  }

  next();
});

// 创建模型
export const GraphTemplateModel: GraphTemplateModelType =
  (mongoose.models.GraphTemplate as GraphTemplateModelType) ||
  mongoose.model<GraphTemplateDocument, GraphTemplateModelType>('GraphTemplate', GraphTemplateSchema);

export default GraphTemplateModel;
