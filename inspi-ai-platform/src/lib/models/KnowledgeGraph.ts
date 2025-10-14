import mongoose, { Schema, Document, Model, Types } from 'mongoose';

import {
  GraphNode,
  GraphEdge,
  GraphType,
  NodeType,
  EdgeType,
  GraphLayout,
  LayoutConfig,
  ViewConfig,
} from '@/shared/types/knowledgeGraph';

// 知识图谱文档接口
export interface KnowledgeGraphDocument extends Document {
  userId: Types.ObjectId;
  name: string;
  description?: string;
  type: GraphType;
  subject?: string;
  gradeLevel?: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  layout: LayoutConfig;
  view: ViewConfig;
  version: number;
  isPublic: boolean;
  templateId?: Types.ObjectId;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  getNode(nodeId: string): GraphNode | null;
  getEdge(edgeId: string): GraphEdge | null;
  addNode(node: GraphNode): void;
  updateNode(nodeId: string, updates: Partial<GraphNode>): boolean;
  removeNode(nodeId: string): boolean;
  addEdge(edge: GraphEdge): void;
  removeEdge(edgeId: string): boolean;
  wouldCreateCycle(sourceId: string, targetId: string): boolean;
  getChildNodes(nodeId: string): GraphNode[];
  getParentNode(nodeId: string): GraphNode | null;
  getNodePath(nodeId: string): GraphNode[];
  calculateStats(): {
    nodeCount: number;
    edgeCount: number;
    workCount: number;
    averageNodeDegree: number;
    maxDepth: number;
    density: number;
    lastUpdated: Date;
  };
}

// 节点Schema
const NodeSchema = new Schema({
  id: {
    type: String,
    required: true,
  },
  label: {
    type: String,
    required: true,
    maxlength: 50,
  },
  type: {
    type: String,
    enum: Object.values(NodeType),
    required: true,
  },
  level: {
    type: Number,
    required: true,
    min: 0,
    max: 10,
  },
  parentId: {
    type: String,
    default: null,
  },
  position: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    z: { type: Number, default: 0 },
  },
  metadata: {
    description: { type: String, maxlength: 500 },
    workCount: { type: Number, default: 0, min: 0 },
    reuseCount: { type: Number, default: 0, min: 0 },
    color: { type: String, default: '#3b82f6' },
    icon: { type: String, default: '📝' },
    size: { type: Number, default: 30, min: 10, max: 100 },
    importance: { type: Number, default: 0, min: 0, max: 1 },
    tags: [{ type: String }],
    difficulty: { type: Number, min: 1, max: 5 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  isVisible: {
    type: Boolean,
    default: true,
  },
  isLocked: {
    type: Boolean,
    default: false,
  },
}, { _id: false });

// 边Schema
const EdgeSchema = new Schema({
  id: {
    type: String,
    required: true,
  },
  source: {
    type: String,
    required: true,
  },
  target: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: Object.values(EdgeType),
    required: true,
  },
  weight: {
    type: Number,
    required: true,
    min: 0,
    max: 1,
    default: 1,
  },
  metadata: {
    strength: { type: Number, min: 0, max: 1, default: 1 },
    description: { type: String, maxlength: 200 },
    color: { type: String, default: '#6b7280' },
    style: {
      type: String,
      enum: ['solid', 'dashed', 'dotted'],
      default: 'solid',
    },
    animated: { type: Boolean, default: false },
    bidirectional: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  isVisible: {
    type: Boolean,
    default: true,
  },
  isDirected: {
    type: Boolean,
    default: true,
  },
}, { _id: false });

// 布局配置Schema
const LayoutConfigSchema = new Schema({
  type: {
    type: String,
    enum: Object.values(GraphLayout),
    default: GraphLayout.FORCE,
  },
  options: {
    nodeSpacing: { type: Number, default: 100 },
    levelSpacing: { type: Number, default: 150 },
    centerForce: { type: Number, default: 0.1 },
    linkDistance: { type: Number, default: 80 },
    linkStrength: { type: Number, default: 0.5 },
    chargeStrength: { type: Number, default: -300 },
    collisionRadius: { type: Number, default: 30 },
    alpha: { type: Number, default: 0.3 },
    alphaDecay: { type: Number, default: 0.02 },
    velocityDecay: { type: Number, default: 0.4 },
  },
}, { _id: false });

// 视图配置Schema
const ViewConfigSchema = new Schema({
  showLabels: { type: Boolean, default: true },
  showEdgeLabels: { type: Boolean, default: false },
  nodeSize: {
    type: String,
    enum: ['fixed', 'proportional'],
    default: 'proportional',
  },
  edgeWidth: {
    type: String,
    enum: ['fixed', 'proportional'],
    default: 'fixed',
  },
  colorScheme: { type: String, default: 'default' },
  theme: {
    type: String,
    enum: ['light', 'dark'],
    default: 'light',
  },
  animations: { type: Boolean, default: true },
  minimap: { type: Boolean, default: true },
  toolbar: { type: Boolean, default: true },
}, { _id: false });

// 知识图谱Schema
const KnowledgeGraphSchema = new Schema<KnowledgeGraphDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    maxlength: 100,
    trim: true,
  },
  description: {
    type: String,
    maxlength: 500,
    trim: true,
  },
  type: {
    type: String,
    enum: Object.values(GraphType),
    required: true,
    default: GraphType.CUSTOM,
  },
  subject: {
    type: String,
    index: true,
  },
  gradeLevel: {
    type: String,
    index: true,
  },
  nodes: {
    type: [NodeSchema],
    default: [],
  },
  edges: {
    type: [EdgeSchema],
    default: [],
  },
  layout: {
    type: LayoutConfigSchema,
    required: true,
  },
  view: {
    type: ViewConfigSchema,
    required: true,
  },
  version: {
    type: Number,
    default: 1,
    min: 1,
  },
  isPublic: {
    type: Boolean,
    default: false,
    index: true,
  },
  templateId: {
    type: Schema.Types.ObjectId,
    ref: 'GraphTemplate',
    index: true,
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
  collection: 'knowledge_graphs',
});

// 复合索引
KnowledgeGraphSchema.index({ userId: 1, type: 1 });
KnowledgeGraphSchema.index({ subject: 1, gradeLevel: 1 });
KnowledgeGraphSchema.index({ isPublic: 1, subject: 1 });
KnowledgeGraphSchema.index({ templateId: 1, createdAt: -1 });

// 虚拟字段
KnowledgeGraphSchema.virtual('nodeCount').get(function (this: KnowledgeGraphDocument) {
  return this.nodes.length;
});

KnowledgeGraphSchema.virtual('edgeCount').get(function (this: KnowledgeGraphDocument) {
  return this.edges.length;
});

KnowledgeGraphSchema.virtual('totalWorkCount').get(function (this: KnowledgeGraphDocument) {
  return this.nodes.reduce((sum, node) => sum + (node.metadata.workCount || 0), 0);
});

// 实例方法

// 获取节点
KnowledgeGraphSchema.methods.getNode = function (this: KnowledgeGraphDocument, nodeId: string): GraphNode | null {
  return (this.nodes as any).find((node: GraphNode) => node.id === nodeId) || null;
};

// 获取边
KnowledgeGraphSchema.methods.getEdge = function (this: KnowledgeGraphDocument, edgeId: string): GraphEdge | null {
  return (this.edges as any).find((edge: GraphEdge) => edge.id === edgeId) || null;
};

// 添加节点
KnowledgeGraphSchema.methods.addNode = function (this: KnowledgeGraphDocument, node: GraphNode): void {
  // 检查节点ID是否已存在
  if (this.getNode(node.id)) {
    throw new Error(`Node with id ${node.id} already exists`);
  }

  // 检查节点数量限制
  if (this.nodes.length >= 500) {
    throw new Error('Maximum number of nodes exceeded');
  }

  this.nodes.push(node);
  this.version += 1;
};

// 更新节点
KnowledgeGraphSchema.methods.updateNode = function (this: KnowledgeGraphDocument, nodeId: string, updates: Partial<GraphNode>): boolean {
  const nodeIndex = this.nodes.findIndex((node: GraphNode) => node.id === nodeId);
  if (nodeIndex === -1) {
    return false;
  }

  // 不允许更新锁定的节点的某些属性
  if (this.nodes[nodeIndex].isLocked) {
    const { id, type, isLocked, ...allowedUpdates } = updates;
    Object.assign(this.nodes[nodeIndex], allowedUpdates);
  } else {
    Object.assign(this.nodes[nodeIndex], updates);
  }

  this.nodes[nodeIndex].metadata.updatedAt = new Date();
  this.version += 1;
  return true;
};

// 删除节点
KnowledgeGraphSchema.methods.removeNode = function (this: KnowledgeGraphDocument, nodeId: string): boolean {
  const nodeIndex = this.nodes.findIndex((node: GraphNode) => node.id === nodeId);
  if (nodeIndex === -1) {
    return false;
  }

  // 不允许删除锁定的节点
  if (this.nodes[nodeIndex].isLocked) {
    throw new Error('Cannot delete locked node');
  }

  // 删除相关的边
  this.edges = this.edges.filter((edge: GraphEdge) =>
    edge.source !== nodeId && edge.target !== nodeId,
  );

  // 删除节点
  this.nodes.splice(nodeIndex, 1);
  this.version += 1;
  return true;
};

// 添加边
KnowledgeGraphSchema.methods.addEdge = function (this: KnowledgeGraphDocument, edge: GraphEdge): void {
  // 检查边ID是否已存在
  if (this.getEdge(edge.id)) {
    throw new Error(`Edge with id ${edge.id} already exists`);
  }

  // 检查源节点和目标节点是否存在
  if (!this.getNode(edge.source) || !this.getNode(edge.target)) {
    throw new Error('Source or target node does not exist');
  }

  // 检查是否会形成循环（对于有向图）
  if (edge.isDirected && this.wouldCreateCycle(edge.source, edge.target)) {
    throw new Error('Adding this edge would create a cycle');
  }

  // 检查边数量限制
  if (this.edges.length >= 1000) {
    throw new Error('Maximum number of edges exceeded');
  }

  this.edges.push(edge);
  this.version += 1;
};

// 删除边
KnowledgeGraphSchema.methods.removeEdge = function (this: KnowledgeGraphDocument, edgeId: string): boolean {
  const edgeIndex = this.edges.findIndex((edge: GraphEdge) => edge.id === edgeId);
  if (edgeIndex === -1) {
    return false;
  }

  this.edges.splice(edgeIndex, 1);
  this.version += 1;
  return true;
};

// 检查是否会形成循环
KnowledgeGraphSchema.methods.wouldCreateCycle = function (this: KnowledgeGraphDocument, sourceId: string, targetId: string): boolean {
  const visited = new Set<string>();
  const stack = [targetId];

  while (stack.length > 0) {
    const currentId = stack.pop()!;
    if (currentId === sourceId) {
      return true;
    }

    if (visited.has(currentId)) {
      continue;
    }
    visited.add(currentId);

    // 找到所有从当前节点出发的边
    const outgoingEdges = this.edges.filter((edge: GraphEdge) =>
      edge.source === currentId && edge.isDirected,
    );

    for (const edge of outgoingEdges) {
      stack.push(edge.target);
    }
  }
    return false;
};

// 获取节点的子节点
KnowledgeGraphSchema.methods.getChildNodes = function (this: KnowledgeGraphDocument, nodeId: string): GraphNode[] {
  const childEdges = this.edges.filter((edge: GraphEdge) =>
    edge.source === nodeId && edge.type === EdgeType.CONTAINS,
  );

  return childEdges
    .map((edge: GraphEdge) => this.getNode(edge.target))
      .filter((node): node is GraphNode => Boolean(node));
};

// 获取节点的父节点
KnowledgeGraphSchema.methods.getParentNode = function (this: KnowledgeGraphDocument, nodeId: string): GraphNode | null {
  const parentEdge = (this.edges as any).find((edge: GraphEdge) =>
    edge.target === nodeId && edge.type === EdgeType.CONTAINS,
  );

  return parentEdge ? this.getNode(parentEdge.source) : null;
};

// 获取节点路径（从根到指定节点）
KnowledgeGraphSchema.methods.getNodePath = function (this: KnowledgeGraphDocument, nodeId: string): GraphNode[] {
  const path: GraphNode[] = [];
  let currentNode = this.getNode(nodeId);

  while (currentNode) {
    path.unshift(currentNode);
    const parent = this.getParentNode(currentNode.id);
    currentNode = parent;
  }
    return path;
};

// 计算图的基本统计信息
KnowledgeGraphSchema.methods.calculateStats = function (this: KnowledgeGraphDocument) {
  const nodeCount = this.nodes.length;
  const edgeCount = this.edges.length;
  const workCount = this.nodes.reduce((sum: number, node: GraphNode) =>
    sum + (node.metadata.workCount || 0), 0,
  );

  // 计算平均度数
  const degrees = new Map<string, number>();
  this.edges.forEach((edge: GraphEdge) => {
    degrees.set(edge.source, (degrees.get(edge.source) || 0) + 1);
    degrees.set(edge.target, (degrees.get(edge.target) || 0) + 1);
  });

  const averageNodeDegree = nodeCount > 0 ?
    Array.from(degrees.values()).reduce((sum, degree) => sum + degree, 0) / nodeCount : 0;

  // 计算最大深度
  const maxDepth = Math.max(...this.nodes.map((node: GraphNode) => node.level), 0);

  // 计算图密度
  const maxPossibleEdges = nodeCount * (nodeCount - 1) / 2;
  const density = maxPossibleEdges > 0 ? edgeCount / maxPossibleEdges : 0;

  return {
    nodeCount,
    edgeCount,
    workCount,
    averageNodeDegree,
    maxDepth,
    density,
    lastUpdated: new Date(),
  };
};

// 静态方法

// 根据用户ID获取图谱列表
KnowledgeGraphSchema.statics.findByUserId = function (this: Model<KnowledgeGraphDocument>, userId: string, options: any = {}) {
  const query: Record<string, unknown> = { userId: new Types.ObjectId(userId) };

  if (options.type) {
    query.type = options.type;
  }

  if (options.subject) {
    query.subject = options.subject;
  }

  if (options.isPublic !== undefined) {
    query.isPublic = options.isPublic;
  }
    return (this as any).find(query)
      .sort({ updatedAt: -1 })
      .limit(options.limit || 50)
      .skip(options.offset || 0);
};

// 搜索公开图谱
KnowledgeGraphSchema.statics.searchPublicGraphs = function (this: Model<KnowledgeGraphDocument>, searchOptions: any = {}) {
  const query: Record<string, unknown> = { isPublic: true };

  if (searchOptions.subject) {
    query.subject = searchOptions.subject;
  }

  if (searchOptions.gradeLevel) {
    query.gradeLevel = searchOptions.gradeLevel;
  }

  if (searchOptions.search) {
    query.$or = [
      { name: { $regex: searchOptions.search, $options: 'i' } },
      { description: { $regex: searchOptions.search, $options: 'i' } },
    ];
  }
    return (this as any).find(query)
      .populate('userId', 'name avatar')
        .sort({ updatedAt: -1 })
      .limit(searchOptions.limit || 20)
      .skip(searchOptions.offset || 0);
};

// 获取热门图谱
KnowledgeGraphSchema.statics.getPopularGraphs = function (this: Model<KnowledgeGraphDocument>, limit: number = 10) {
  return (this as any).aggregate([
    { $match: { isPublic: true } },
    {
      $addFields: {
        totalWorkCount: {
          $sum: '$nodes.metadata.workCount',
        },
      },
    },
    { $sort: { totalWorkCount: -1, updatedAt: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'author',
      },
    },
    { $unwind: '$author' },
    {
      $project: {
        name: 1,
        description: 1,
        subject: 1,
        gradeLevel: 1,
        nodeCount: { $size: '$nodes' },
        edgeCount: { $size: '$edges' },
        totalWorkCount: 1,
        'author.name': 1,
        'author.avatar': 1,
        createdAt: 1,
        updatedAt: 1,
      },
    },
  ]);
};

// 中间件

// 保存前验证
KnowledgeGraphSchema.pre('save', function (next) {
  // 验证节点ID唯一性
  const nodeIds = this.nodes.map((node: GraphNode) => node.id);
  const uniqueNodeIds = new Set(nodeIds);
  if (nodeIds.length !== uniqueNodeIds.size) {
    return next(new Error('Duplicate node IDs found'));
  }

  // 验证边ID唯一性
  const edgeIds = this.edges.map((edge: GraphEdge) => edge.id);
  const uniqueEdgeIds = new Set(edgeIds);
  if (edgeIds.length !== uniqueEdgeIds.size) {
    return next(new Error('Duplicate edge IDs found'));
  }

  // 验证边的源节点和目标节点存在
  for (const edge of this.edges) {
    if (!this.getNode(edge.source) || !this.getNode(edge.target)) {
      return next(new Error(`Invalid edge: ${edge.id} - source or target node not found`));
    }
  }

  next();
});

// 更新时间戳
KnowledgeGraphSchema.pre('save', function (next) {
  if (this.isModified()) {
    this.updatedAt = new Date();
  }
  next();
});

export type KnowledgeGraphModelType = Model<KnowledgeGraphDocument>;

export const KnowledgeGraphModel: KnowledgeGraphModelType =
  (mongoose.models.KnowledgeGraph as KnowledgeGraphModelType) ||
  mongoose.model<KnowledgeGraphDocument>('KnowledgeGraph', KnowledgeGraphSchema);

export default KnowledgeGraphModel;
