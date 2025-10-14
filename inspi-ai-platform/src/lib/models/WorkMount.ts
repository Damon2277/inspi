import mongoose, { Schema, Document, Model, Types } from 'mongoose';

import { KnowledgeGraphModel } from '@/lib/models/KnowledgeGraph';
import type { KnowledgeGraphDocument } from '@/lib/models/KnowledgeGraph';

export interface WorkMountDocument extends Document {
  userId: Types.ObjectId;
  workId: Types.ObjectId;
  graphId: Types.ObjectId;
  nodeId: string;
  position: number;
  isPrimary: boolean;
  mountType: 'manual' | 'recommendation' | 'system';
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkMountModelType extends Model<WorkMountDocument> {
  findByNode(graphId: string, nodeId: string): Promise<WorkMountDocument[]>;
  findByWork(workId: string): Promise<WorkMountDocument[]>;
  findByUserGraph(userId: string, graphId: string): Promise<WorkMountDocument[]>;
  getNodeStats(graphId: string, nodeId: string): Promise<any>;
  getGraphStats(graphId: string): Promise<any>;
  isWorkMounted(workId: string, graphId: string, nodeId: string): Promise<boolean>;
  getUserMountStats(userId: string): Promise<any>;
}

const WorkMountSchema = new Schema<WorkMountDocument, WorkMountModelType>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  workId: {
    type: Schema.Types.ObjectId,
    ref: 'Work',
    required: true,
    index: true,
  },
  graphId: {
    type: Schema.Types.ObjectId,
    ref: 'KnowledgeGraph',
    required: true,
    index: true,
  },
  nodeId: {
    type: String,
    required: true,
    index: true,
  },
  position: {
    type: Number,
    default: 0,
    min: 0,
  },
  isPrimary: {
    type: Boolean,
    default: false,
  },
  mountType: {
    type: String,
    enum: ['manual', 'recommendation', 'system'],
    default: 'manual',
    index: true,
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
  collection: 'work_mounts',
});

// 复合索引
WorkMountSchema.index({ userId: 1, graphId: 1 });
WorkMountSchema.index({ workId: 1, graphId: 1 });
WorkMountSchema.index({ graphId: 1, nodeId: 1 });
WorkMountSchema.index({ userId: 1, workId: 1 }, { unique: false });

// 唯一约束：同一个作品在同一个图谱的同一个节点上只能挂载一次
WorkMountSchema.index({ workId: 1, graphId: 1, nodeId: 1 }, { unique: true });

// 静态方法

// 获取节点上的所有作品
WorkMountSchema.statics.findByNode = function (this: WorkMountModelType, graphId: string, nodeId: string) {
  return (this.find as any)({
    graphId: new Types.ObjectId(graphId),
    nodeId,
  })
      .populate('workId', 'title knowledgePoint subject gradeLevel author createdAt').populate('userId', 'name avatar')
        .sort({ isPrimary: -1, position: 1, createdAt: -1 });
};

// 获取作品的所有挂载点
WorkMountSchema.statics.findByWork = function (this: WorkMountModelType, workId: string) {
  return (this.find as any)({ workId: new Types.ObjectId(workId) })
      .populate('graphId', 'name subject gradeLevel').populate('userId', 'name avatar')
        .sort({ isPrimary: -1, createdAt: -1 });
};

// 获取用户在指定图谱中的所有挂载
WorkMountSchema.statics.findByUserGraph = function (this: WorkMountModelType, userId: string, graphId: string) {
  return (this.find as any)({
    userId: new Types.ObjectId(userId),
    graphId: new Types.ObjectId(graphId),
  })
      .populate('workId', 'title knowledgePoint subject gradeLevel createdAt')
        .sort({ nodeId: 1, position: 1, createdAt: -1 });
};

// 获取节点的作品统计
WorkMountSchema.statics.getNodeStats = async function (this: WorkMountModelType, graphId: string, nodeId: string) {
  const stats = await (this.aggregate as any)([
    {
      $match: {
        graphId: new Types.ObjectId(graphId),
        nodeId,
      },
    },
    {
      $lookup: {
        from: 'works',
        localField: 'workId',
        foreignField: '_id',
        as: 'work',
      },
    },
    { $unwind: '$work' },
    {
      $group: {
        _id: null,
        workCount: { $sum: 1 },
        totalReuseCount: { $sum: '$work.reuseCount' },
        subjects: { $addToSet: '$work.subject' },
        gradeLevels: { $addToSet: '$work.gradeLevel' },
        authors: { $addToSet: '$work.author' },
        lastActivity: { $max: '$createdAt' },
      },
    },
  ]);

  return stats[0] || {
    workCount: 0,
    totalReuseCount: 0,
    subjects: [],
    gradeLevels: [],
    authors: [],
    lastActivity: null,
  };
};

// 获取图谱的作品统计
WorkMountSchema.statics.getGraphStats = async function (this: WorkMountModelType, graphId: string) {
  const stats = await (this.aggregate as any)([
    {
      $match: {
        graphId: new Types.ObjectId(graphId),
      },
    },
    {
      $lookup: {
        from: 'works',
        localField: 'workId',
        foreignField: '_id',
        as: 'work',
      },
    },
    { $unwind: '$work' },
    {
      $group: {
        _id: '$nodeId',
        workCount: { $sum: 1 },
        totalReuseCount: { $sum: '$work.reuseCount' },
        lastActivity: { $max: '$createdAt' },
      },
    },
    {
      $group: {
        _id: null,
        totalWorkCount: { $sum: '$workCount' },
        totalReuseCount: { $sum: '$totalReuseCount' },
        nodeCount: { $sum: 1 },
        avgWorksPerNode: { $avg: '$workCount' },
        lastActivity: { $max: '$lastActivity' },
      },
    },
  ]);

  return stats[0] || {
    totalWorkCount: 0,
    totalReuseCount: 0,
    nodeCount: 0,
    avgWorksPerNode: 0,
    lastActivity: null,
  };
};

// 检查作品是否已挂载到节点
WorkMountSchema.statics.isWorkMounted = async function (this: WorkMountModelType, workId: string, graphId: string, nodeId: string) {
  const mount = await (this.findOne as any)({
    workId: new Types.ObjectId(workId),
    graphId: new Types.ObjectId(graphId),
    nodeId,
  });
  return !!mount;
};

// 获取用户的挂载统计
WorkMountSchema.statics.getUserMountStats = async function (this: WorkMountModelType, userId: string) {
  const stats = await (this.aggregate as any)([
    {
      $match: {
        userId: new Types.ObjectId(userId),
      },
    },
    {
      $group: {
        _id: '$graphId',
        mountCount: { $sum: 1 },
        uniqueNodes: { $addToSet: '$nodeId' },
        lastActivity: { $max: '$createdAt' },
      },
    },
    {
      $group: {
        _id: null,
        totalMounts: { $sum: '$mountCount' },
        graphCount: { $sum: 1 },
        avgMountsPerGraph: { $avg: '$mountCount' },
        lastActivity: { $max: '$lastActivity' },
      },
    },
  ]);

  return stats[0] || {
    totalMounts: 0,
    graphCount: 0,
    avgMountsPerGraph: 0,
    lastActivity: null,
  };
};

// 实例方法

// 更新挂载位置
WorkMountSchema.methods.updatePosition = function (newPosition: number) {
  this.position = newPosition;
  return this.save();
};

// 设置为主要挂载点
WorkMountSchema.methods.setPrimary = async function (this: WorkMountDocument) {
  // 先将同一作品的其他挂载点设为非主要
  const mountModel = this.constructor as WorkMountModelType;
  await (mountModel.updateMany as any)(
    {
      workId: this.workId,
      _id: { $ne: this._id },
    },
    { isPrimary: false },
  );

  // 设置当前挂载点为主要
  this.isPrimary = true;
  return this.save();
};

// 中间件

// 保存前验证
WorkMountSchema.pre('save', async function (this: WorkMountDocument, next) {
  // 验证图谱和节点是否存在
  const graph = await (KnowledgeGraphModel.findById as any)(this.graphId) as KnowledgeGraphDocument | null;

  if (!graph) {
    return next(new Error('Knowledge graph not found'));
  }

  const node = graph.getNode(this.nodeId);
  if (!node) {
    return next(new Error('Node not found in the knowledge graph'));
  }

  // 验证用户权限（只能挂载到自己的图谱）
  const graphUserId = graph.userId as unknown as Types.ObjectId;
  if (!graphUserId.equals(this.userId)) {
    return next(new Error('Permission denied: cannot mount work to another user\'s graph'));
  }

  next();
});

// 保存后更新节点统计
WorkMountSchema.post('save', async function (this: WorkMountDocument) {
  try {
    const graph = await (KnowledgeGraphModel.findById as any)(this.graphId);

    if (graph) {
      const stats = await (this.constructor as WorkMountModelType).getNodeStats(this.graphId.toString(), this.nodeId);
      const nodeIndex = graph.nodes.findIndex((node: any) => node.id === this.nodeId);

      if (nodeIndex !== -1) {
        graph.nodes[nodeIndex].metadata.workCount = stats.workCount;
        graph.nodes[nodeIndex].metadata.reuseCount = stats.totalReuseCount;
        graph.nodes[nodeIndex].metadata.updatedAt = new Date();
        await graph.save();
      }
    }
  } catch (error) {
    console.error('Error updating node stats after mount:', error);
  }
});

// 删除后更新节点统计
WorkMountSchema.post('deleteOne' as any, { document: true } as any, async function (this: WorkMountDocument) {
  try {
    const graph = await (KnowledgeGraphModel.findById as any)(this.graphId);

    if (graph) {
      const stats = await (this.constructor as WorkMountModelType).getNodeStats(this.graphId.toString(), this.nodeId);
      const nodeIndex = graph.nodes.findIndex((node: any) => node.id === this.nodeId);

      if (nodeIndex !== -1) {
        graph.nodes[nodeIndex].metadata.workCount = stats.workCount;
        graph.nodes[nodeIndex].metadata.reuseCount = stats.totalReuseCount;
        graph.nodes[nodeIndex].metadata.updatedAt = new Date();
        await graph.save();
      }
    }
  } catch (error) {
    console.error('Error updating node stats after unmount:', error);
  }
});

export const WorkMountModel: WorkMountModelType =
  (mongoose.models.WorkMount as WorkMountModelType) ||
  mongoose.model<WorkMountDocument, WorkMountModelType>('WorkMount', WorkMountSchema);

export default WorkMountModel;
