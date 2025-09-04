/**
 * 作品挂载服务
 * 处理作品与知识图谱节点的关联管理
 */

import { 
  WorkMountModel, 
  KnowledgeGraphModel,
  WorkMountDocument 
} from '@/lib/models/KnowledgeGraph';
import { WorkModel } from '@/lib/models/Work';
import {
  WorkMount,
  MountWorkRequest,
  NodeWorkStats
} from '@/types/knowledgeGraph';
import { generateId } from '@/lib/utils/id';

// ============= 作品挂载核心服务 =============

export class WorkMountService {
  /**
   * 挂载作品到节点
   */
  static async mountWork(
    userId: string,
    graphId: string,
    request: MountWorkRequest
  ): Promise<WorkMount> {
    try {
      const { nodeId, workId, mountType = 'manual', notes } = request;

      // 验证图谱和节点存在
      const graph = await KnowledgeGraphModel.findOne({
        _id: graphId,
        userId
      });

      if (!graph) {
        throw new Error('图谱不存在或无权限访问');
      }

      const node = graph.nodes.find(n => n.id === nodeId);
      if (!node) {
        throw new Error('节点不存在');
      }

      // 验证作品存在且用户有权限
      const work = await WorkModel.findOne({
        _id: workId,
        $or: [
          { userId },
          { isPublic: true }
        ]
      });

      if (!work) {
        throw new Error('作品不存在或无权限访问');
      }

      // 检查是否已经挂载
      const existingMount = await WorkMountModel.findOne({
        userId,
        graphId,
        nodeId,
        workId
      });

      if (existingMount) {
        throw new Error('作品已经挂载到该节点');
      }

      // 创建挂载记录
      const mountData: Partial<WorkMount> = {
        userId,
        graphId,
        nodeId,
        workId,
        mountType,
        metadata: {
          notes,
          tags: [],
          reason: mountType === 'manual' ? '手动挂载' : '自动挂载'
        }
      };

      const mount = new WorkMountModel(mountData);
      await mount.save();

      // 更新节点的作品数量
      await this.updateNodeWorkCount(graphId, nodeId);

      return mount.toObject();
    } catch (error) {
      console.error('挂载作品失败:', error);
      throw error;
    }
  }

  /**
   * 取消挂载作品
   */
  static async unmountWork(
    userId: string,
    mountId: string
  ): Promise<boolean> {
    try {
      const mount = await WorkMountModel.findOne({
        _id: mountId,
        userId
      });

      if (!mount) {
        throw new Error('挂载记录不存在或无权限访问');
      }

      const { graphId, nodeId } = mount;

      // 删除挂载记录
      await WorkMountModel.deleteOne({ _id: mountId });

      // 更新节点的作品数量
      await this.updateNodeWorkCount(graphId, nodeId);

      return true;
    } catch (error) {
      console.error('取消挂载失败:', error);
      throw error;
    }
  }

  /**
   * 批量挂载作品
   */
  static async batchMountWorks(
    userId: string,
    graphId: string,
    mounts: Array<{
      nodeId: string;
      workId: string;
      mountType?: 'manual' | 'auto';
      notes?: string;
    }>
  ): Promise<WorkMount[]> {
    try {
      // 验证图谱存在
      const graph = await KnowledgeGraphModel.findOne({
        _id: graphId,
        userId
      });

      if (!graph) {
        throw new Error('图谱不存在或无权限访问');
      }

      const results: WorkMount[] = [];
      const nodeWorkCounts = new Map<string, number>();

      for (const mountData of mounts) {
        try {
          // 验证节点存在
          const node = graph.nodes.find(n => n.id === mountData.nodeId);
          if (!node) {
            console.warn(`节点 ${mountData.nodeId} 不存在，跳过`);
            continue;
          }

          // 验证作品存在
          const work = await WorkModel.findOne({
            _id: mountData.workId,
            $or: [
              { userId },
              { isPublic: true }
            ]
          });

          if (!work) {
            console.warn(`作品 ${mountData.workId} 不存在或无权限，跳过`);
            continue;
          }

          // 检查是否已挂载
          const existingMount = await WorkMountModel.findOne({
            userId,
            graphId,
            nodeId: mountData.nodeId,
            workId: mountData.workId
          });

          if (existingMount) {
            console.warn(`作品 ${mountData.workId} 已挂载到节点 ${mountData.nodeId}，跳过`);
            continue;
          }

          // 创建挂载记录
          const mount = new WorkMountModel({
            userId,
            graphId,
            nodeId: mountData.nodeId,
            workId: mountData.workId,
            mountType: mountData.mountType || 'manual',
            metadata: {
              notes: mountData.notes,
              tags: [],
              reason: mountData.mountType === 'auto' ? '自动挂载' : '手动挂载'
            }
          });

          await mount.save();
          results.push(mount.toObject());

          // 记录需要更新的节点
          nodeWorkCounts.set(mountData.nodeId, 
            (nodeWorkCounts.get(mountData.nodeId) || 0) + 1
          );

        } catch (error) {
          console.error(`挂载作品 ${mountData.workId} 到节点 ${mountData.nodeId} 失败:`, error);
          continue;
        }
      }

      // 批量更新节点作品数量
      for (const [nodeId] of nodeWorkCounts) {
        await this.updateNodeWorkCount(graphId, nodeId);
      }

      return results;
    } catch (error) {
      console.error('批量挂载作品失败:', error);
      throw error;
    }
  }

  /**
   * 获取节点的挂载作品列表
   */
  static async getNodeWorks(
    graphId: string,
    nodeId: string,
    userId?: string,
    options: {
      page?: number;
      limit?: number;
      sortBy?: 'createdAt' | 'updatedAt';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{
    mounts: (WorkMount & { work: any })[];
    total: number;
  }> {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      // 构建查询条件
      const filter: any = { graphId, nodeId };
      
      // 如果指定了用户ID，只返回该用户的挂载或公开作品的挂载
      if (userId) {
        // 这里需要通过聚合查询来关联作品表进行权限过滤
        const pipeline = [
          { $match: filter },
          {
            $lookup: {
              from: 'works',
              localField: 'workId',
              foreignField: '_id',
              as: 'work'
            }
          },
          { $unwind: '$work' },
          {
            $match: {
              $or: [
                { userId },
                { 'work.isPublic': true }
              ]
            }
          },
          { $sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 } },
          { $skip: (page - 1) * limit },
          { $limit: limit }
        ];

        const [mounts, totalResult] = await Promise.all([
          WorkMountModel.aggregate(pipeline),
          WorkMountModel.aggregate([
            { $match: filter },
            {
              $lookup: {
                from: 'works',
                localField: 'workId',
                foreignField: '_id',
                as: 'work'
              }
            },
            { $unwind: '$work' },
            {
              $match: {
                $or: [
                  { userId },
                  { 'work.isPublic': true }
                ]
              }
            },
            { $count: 'total' }
          ])
        ]);

        const total = totalResult[0]?.total || 0;
        return { mounts, total };
      } else {
        // 公开查询，只返回公开作品的挂载
        const pipeline = [
          { $match: filter },
          {
            $lookup: {
              from: 'works',
              localField: 'workId',
              foreignField: '_id',
              as: 'work'
            }
          },
          { $unwind: '$work' },
          { $match: { 'work.isPublic': true } },
          { $sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 } },
          { $skip: (page - 1) * limit },
          { $limit: limit }
        ];

        const [mounts, totalResult] = await Promise.all([
          WorkMountModel.aggregate(pipeline),
          WorkMountModel.aggregate([
            { $match: filter },
            {
              $lookup: {
                from: 'works',
                localField: 'workId',
                foreignField: '_id',
                as: 'work'
              }
            },
            { $unwind: '$work' },
            { $match: { 'work.isPublic': true } },
            { $count: 'total' }
          ])
        ]);

        const total = totalResult[0]?.total || 0;
        return { mounts, total };
      }
    } catch (error) {
      console.error('获取节点作品列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户的挂载记录
   */
  static async getUserMounts(
    userId: string,
    options: {
      graphId?: string;
      workId?: string;
      page?: number;
      limit?: number;
      sortBy?: 'createdAt' | 'updatedAt';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{
    mounts: (WorkMount & { work: any; graph: any })[];
    total: number;
  }> {
    try {
      const {
        graphId,
        workId,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      // 构建查询条件
      const filter: any = { userId };
      if (graphId) filter.graphId = graphId;
      if (workId) filter.workId = workId;

      // 聚合查询，关联作品和图谱信息
      const pipeline = [
        { $match: filter },
        {
          $lookup: {
            from: 'works',
            localField: 'workId',
            foreignField: '_id',
            as: 'work'
          }
        },
        { $unwind: '$work' },
        {
          $lookup: {
            from: 'knowledge_graphs',
            localField: 'graphId',
            foreignField: '_id',
            as: 'graph'
          }
        },
        { $unwind: '$graph' },
        { $sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit }
      ];

      const [mounts, total] = await Promise.all([
        WorkMountModel.aggregate(pipeline),
        WorkMountModel.countDocuments(filter)
      ]);

      return { mounts, total };
    } catch (error) {
      console.error('获取用户挂载记录失败:', error);
      throw error;
    }
  }

  /**
   * 获取节点作品统计
   */
  static async getNodeWorkStats(
    graphId: string,
    nodeId: string
  ): Promise<NodeWorkStats> {
    try {
      // 聚合查询获取统计信息
      const pipeline = [
        {
          $match: { graphId, nodeId }
        },
        {
          $lookup: {
            from: 'works',
            localField: 'workId',
            foreignField: '_id',
            as: 'work'
          }
        },
        { $unwind: '$work' },
        {
          $group: {
            _id: '$nodeId',
            workCount: { $sum: 1 },
            workTypes: {
              $push: '$work.type'
            },
            recentWorks: {
              $push: {
                workId: '$workId',
                title: '$work.title',
                createdAt: '$createdAt'
              }
            },
            totalViews: { $sum: '$work.views' },
            totalReuses: { $sum: '$work.reuses' }
          }
        }
      ];

      const result = await WorkMountModel.aggregate(pipeline);
      
      if (!result.length) {
        return {
          nodeId,
          workCount: 0,
          workTypes: {},
          recentWorks: [],
          totalViews: 0,
          totalReuses: 0
        };
      }

      const stats = result[0];
      
      // 统计作品类型分布
      const workTypeStats: Record<string, number> = {};
      stats.workTypes.forEach((type: string) => {
        workTypeStats[type] = (workTypeStats[type] || 0) + 1;
      });

      // 获取最近的作品（最多5个）
      const recentWorks = stats.recentWorks
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

      return {
        nodeId,
        workCount: stats.workCount,
        workTypes: workTypeStats,
        recentWorks,
        totalViews: stats.totalViews || 0,
        totalReuses: stats.totalReuses || 0
      };
    } catch (error) {
      console.error('获取节点作品统计失败:', error);
      throw error;
    }
  }

  /**
   * 更新节点作品数量
   */
  static async updateNodeWorkCount(
    graphId: string,
    nodeId: string
  ): Promise<void> {
    try {
      // 统计该节点的作品数量
      const count = await WorkMountModel.countDocuments({
        graphId,
        nodeId
      });

      // 更新图谱中节点的作品数量
      await KnowledgeGraphModel.updateOne(
        { 
          _id: graphId,
          'nodes.id': nodeId
        },
        {
          $set: {
            'nodes.$.metadata.workCount': count,
            'nodes.$.updatedAt': new Date()
          }
        }
      );

      // 更新图谱的总作品数量统计
      const totalWorkCount = await WorkMountModel.countDocuments({ graphId });
      await KnowledgeGraphModel.updateOne(
        { _id: graphId },
        {
          $set: {
            'metadata.statistics.workCount': totalWorkCount
          }
        }
      );
    } catch (error) {
      console.error('更新节点作品数量失败:', error);
      throw error;
    }
  }

  /**
   * 智能推荐挂载
   */
  static async recommendMounts(
    userId: string,
    graphId: string,
    workId: string,
    limit: number = 5
  ): Promise<Array<{
    nodeId: string;
    confidence: number;
    reason: string;
  }>> {
    try {
      // 获取图谱和作品信息
      const [graph, work] = await Promise.all([
        KnowledgeGraphModel.findOne({
          _id: graphId,
          userId
        }),
        WorkModel.findOne({
          _id: workId,
          $or: [
            { userId },
            { isPublic: true }
          ]
        })
      ]);

      if (!graph || !work) {
        throw new Error('图谱或作品不存在');
      }

      const recommendations: Array<{
        nodeId: string;
        confidence: number;
        reason: string;
      }> = [];

      // 基于作品标签和节点标签的匹配
      for (const node of graph.nodes) {
        let confidence = 0;
        const reasons: string[] = [];

        // 标签匹配
        if (work.tags && node.metadata.tags) {
          const commonTags = work.tags.filter(tag => 
            node.metadata.tags!.includes(tag)
          );
          if (commonTags.length > 0) {
            confidence += commonTags.length * 0.3;
            reasons.push(`标签匹配: ${commonTags.join(', ')}`);
          }
        }

        // 标题关键词匹配
        const workTitleWords = work.title.toLowerCase().split(/\s+/);
        const nodeLabelWords = node.label.toLowerCase().split(/\s+/);
        const commonWords = workTitleWords.filter(word => 
          nodeLabelWords.includes(word) && word.length > 2
        );
        if (commonWords.length > 0) {
          confidence += commonWords.length * 0.2;
          reasons.push(`关键词匹配: ${commonWords.join(', ')}`);
        }

        // 描述相似性（简单的关键词匹配）
        if (work.description && node.metadata.description) {
          const workDesc = work.description.toLowerCase();
          const nodeDesc = node.metadata.description.toLowerCase();
          const workWords = workDesc.split(/\s+/).filter(w => w.length > 3);
          const nodeWords = nodeDesc.split(/\s+/).filter(w => w.length > 3);
          const commonDescWords = workWords.filter(word => nodeWords.includes(word));
          if (commonDescWords.length > 0) {
            confidence += commonDescWords.length * 0.1;
            reasons.push('描述相似');
          }
        }

        // 节点类型权重
        if (node.type === 'concept' || node.type === 'skill') {
          confidence += 0.1;
        }

        // 如果置信度足够高，添加到推荐列表
        if (confidence > 0.2) {
          recommendations.push({
            nodeId: node.id,
            confidence: Math.min(confidence, 1.0),
            reason: reasons.join('; ')
          });
        }
      }

      // 按置信度排序并返回前N个
      return recommendations
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, limit);
    } catch (error) {
      console.error('推荐挂载失败:', error);
      throw error;
    }
  }
}

export default WorkMountService;