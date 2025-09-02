/**
 * 知识图谱服务层
 * 提供知识图谱的核心业务逻辑和数据操作
 */

import { 
  KnowledgeGraphModel, 
  WorkMountModel, 
  PresetTemplateModel,
  KnowledgeGraphDocument,
  WorkMountDocument,
  PresetTemplateDocument
} from '@/lib/models/KnowledgeGraph';
import {
  KnowledgeGraph,
  GraphNode,
  GraphEdge,
  WorkMount,
  PresetTemplate,
  CreateGraphRequest,
  UpdateGraphRequest,
  MountWorkRequest,
  GraphQuery,
  NodeSearchQuery,
  GraphStatistics,
  GraphAnalysis,
  TraversalOptions,
  PathFindingOptions,
  NodeType,
  EdgeType,
  GraphType,
  SubjectCategory,
  EducationLevel
} from '@/types/knowledgeGraph';
import { DEFAULT_KNOWLEDGE_GRAPH_CONFIG } from '@/lib/config/knowledgeGraph';
import { generateId } from '@/lib/utils/id';
import { validateGraphStructure, validateNodeData, validateEdgeData } from '@/lib/utils/validation';

// ============= 知识图谱核心服务 =============

export class KnowledgeGraphService {
  /**
   * 创建新的知识图谱
   */
  static async createGraph(
    userId: string, 
    data: CreateGraphRequest
  ): Promise<KnowledgeGraph> {
    try {
      // 验证输入数据
      if (!data.name?.trim()) {
        throw new Error('图谱名称不能为空');
      }

      // 准备图谱数据
      const graphData: Partial<KnowledgeGraph> = {
        userId,
        name: data.name.trim(),
        description: data.description?.trim(),
        type: data.type,
        subject: data.subject,
        educationLevel: data.educationLevel,
        nodes: [],
        edges: [],
        layout: DEFAULT_KNOWLEDGE_GRAPH_CONFIG.LAYOUTS.force,
        metadata: {
          version: '1.0.0',
          templateId: data.templateId,
          isPublic: data.isPublic || false,
          tags: [],
          statistics: {
            nodeCount: 0,
            edgeCount: 0,
            maxDepth: 0,
            workCount: 0
          }
        }
      };

      // 如果基于模板创建，加载模板数据
      if (data.templateId) {
        const template = await PresetTemplateModel.findById(data.templateId);
        if (!template) {
          throw new Error('指定的模板不存在');
        }

        // 从模板复制节点和边
        graphData.nodes = template.nodes.map(node => ({
          ...node,
          id: generateId(),
          createdAt: new Date(),
          updatedAt: new Date()
        }));

        graphData.edges = template.edges.map(edge => ({
          ...edge,
          id: generateId(),
          createdAt: new Date(),
          updatedAt: new Date()
        }));

        graphData.layout = template.layout;
        graphData.subject = template.subject;
        graphData.educationLevel = template.educationLevel;

        // 更新模板下载次数
        await PresetTemplateModel.findByIdAndUpdate(
          data.templateId,
          { $inc: { 'metadata.downloadCount': 1 } }
        );
      }

      // 创建图谱
      const graph = new KnowledgeGraphModel(graphData);
      await graph.save();

      return graph.toObject();
    } catch (error) {
      console.error('创建知识图谱失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户的知识图谱列表
   */
  static async getUserGraphs(
    userId: string,
    query: GraphQuery = {}
  ): Promise<{ graphs: KnowledgeGraph[]; total: number }> {
    try {
      const {
        subject,
        educationLevel,
        type,
        isPublic,
        search,
        tags,
        page = 1,
        limit = 20,
        sortBy = 'updatedAt',
        sortOrder = 'desc'
      } = query;

      // 构建查询条件
      const filter: any = { userId };
      
      if (subject) filter.subject = subject;
      if (educationLevel) filter.educationLevel = educationLevel;
      if (type) filter.type = type;
      if (typeof isPublic === 'boolean') filter['metadata.isPublic'] = isPublic;
      if (tags?.length) filter['metadata.tags'] = { $in: tags };
      
      // 文本搜索
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      // 排序
      const sort: any = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // 执行查询
      const [graphs, total] = await Promise.all([
        KnowledgeGraphModel
          .find(filter)
          .sort(sort)
          .skip((page - 1) * limit)
          .limit(limit)
          .populate('metadata.templateId', 'name description')
          .lean(),
        KnowledgeGraphModel.countDocuments(filter)
      ]);

      return { graphs, total };
    } catch (error) {
      console.error('获取用户图谱列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取单个知识图谱
   */
  static async getGraph(graphId: string, userId?: string): Promise<KnowledgeGraph | null> {
    try {
      const filter: any = { _id: graphId };
      
      // 如果指定了用户ID，添加权限检查
      if (userId) {
        filter.$or = [
          { userId },
          { 'metadata.isPublic': true }
        ];
      }

      const graph = await KnowledgeGraphModel
        .findOne(filter)
        .populate('metadata.templateId', 'name description')
        .lean();

      return graph;
    } catch (error) {
      console.error('获取知识图谱失败:', error);
      throw error;
    }
  }

  /**
   * 更新知识图谱
   */
  static async updateGraph(
    graphId: string,
    userId: string,
    data: UpdateGraphRequest
  ): Promise<KnowledgeGraph | null> {
    try {
      const graph = await KnowledgeGraphModel.findOne({
        _id: graphId,
        userId
      });

      if (!graph) {
        throw new Error('图谱不存在或无权限访问');
      }

      // 更新基本信息
      if (data.name) graph.name = data.name.trim();
      if (data.description !== undefined) graph.description = data.description?.trim();
      if (typeof data.isPublic === 'boolean') graph.metadata.isPublic = data.isPublic;

      // 更新节点和边
      if (data.nodes) {
        // 验证节点数据
        for (const node of data.nodes) {
          validateNodeData(node);
        }
        graph.nodes = data.nodes;
      }

      if (data.edges) {
        // 验证边数据
        for (const edge of data.edges) {
          validateEdgeData(edge);
        }
        graph.edges = data.edges;
      }

      // 更新布局
      if (data.layout) {
        graph.layout = data.layout;
      }

      // 验证图结构
      validateGraphStructure(graph.nodes, graph.edges);

      await graph.save();
      return graph.toObject();
    } catch (error) {
      console.error('更新知识图谱失败:', error);
      throw error;
    }
  }

  /**
   * 删除知识图谱
   */
  static async deleteGraph(graphId: string, userId: string): Promise<boolean> {
    try {
      const result = await KnowledgeGraphModel.deleteOne({
        _id: graphId,
        userId
      });

      if (result.deletedCount === 0) {
        throw new Error('图谱不存在或无权限删除');
      }

      // 删除相关的作品挂载记录
      await WorkMountModel.deleteMany({ graphId });

      return true;
    } catch (error) {
      console.error('删除知识图谱失败:', error);
      throw error;
    }
  }

  /**
   * 复制知识图谱
   */
  static async duplicateGraph(
    graphId: string,
    userId: string,
    newName?: string
  ): Promise<KnowledgeGraph> {
    try {
      const originalGraph = await KnowledgeGraphModel.findOne({
        $or: [
          { _id: graphId, userId },
          { _id: graphId, 'metadata.isPublic': true }
        ]
      });

      if (!originalGraph) {
        throw new Error('图谱不存在或无权限访问');
      }

      // 创建副本
      const duplicateData = {
        ...originalGraph.toObject(),
        _id: undefined,
        userId,
        name: newName || `${originalGraph.name} - 副本`,
        metadata: {
          ...originalGraph.metadata,
          isPublic: false,
          statistics: {
            nodeCount: originalGraph.nodes.length,
            edgeCount: originalGraph.edges.length,
            maxDepth: 0,
            workCount: 0
          }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // 重新生成节点和边的ID
      const nodeIdMap = new Map<string, string>();
      duplicateData.nodes = duplicateData.nodes.map(node => {
        const newId = generateId();
        nodeIdMap.set(node.id, newId);
        return {
          ...node,
          id: newId,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      });

      duplicateData.edges = duplicateData.edges.map(edge => ({
        ...edge,
        id: generateId(),
        source: nodeIdMap.get(edge.source) || edge.source,
        target: nodeIdMap.get(edge.target) || edge.target,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      const duplicateGraph = new KnowledgeGraphModel(duplicateData);
      await duplicateGraph.save();

      return duplicateGraph.toObject();
    } catch (error) {
      console.error('复制知识图谱失败:', error);
      throw error;
    }
  }
}

// ============= 节点管理服务 =============

export class NodeService {
  /**
   * 添加节点
   */
  static async addNode(
    graphId: string,
    userId: string,
    nodeData: Omit<GraphNode, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<GraphNode> {
    try {
      const graph = await KnowledgeGraphModel.findOne({
        _id: graphId,
        userId
      });

      if (!graph) {
        throw new Error('图谱不存在或无权限访问');
      }

      // 验证节点数据
      validateNodeData(nodeData);

      // 检查节点数量限制
      if (graph.nodes.length >= DEFAULT_KNOWLEDGE_GRAPH_CONFIG.LIMITS.MAX_NODES) {
        throw new Error(`节点数量不能超过 ${DEFAULT_KNOWLEDGE_GRAPH_CONFIG.LIMITS.MAX_NODES}`);
      }

      // 生成新节点
      const newNode: GraphNode = {
        ...nodeData,
        id: generateId(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // 添加到图谱
      const addedNode = graph.addNode(newNode);
      await graph.save();

      return addedNode;
    } catch (error) {
      console.error('添加节点失败:', error);
      throw error;
    }
  }

  /**
   * 更新节点
   */
  static async updateNode(
    graphId: string,
    userId: string,
    nodeId: string,
    updates: Partial<GraphNode>
  ): Promise<GraphNode | null> {
    try {
      const graph = await KnowledgeGraphModel.findOne({
        _id: graphId,
        userId
      });

      if (!graph) {
        throw new Error('图谱不存在或无权限访问');
      }

      const nodeIndex = graph.nodes.findIndex(n => n.id === nodeId);
      if (nodeIndex === -1) {
        throw new Error('节点不存在');
      }

      // 更新节点数据
      const updatedNode = {
        ...graph.nodes[nodeIndex],
        ...updates,
        id: nodeId, // 保持ID不变
        updatedAt: new Date()
      };

      // 验证更新后的节点数据
      validateNodeData(updatedNode);

      graph.nodes[nodeIndex] = updatedNode;
      graph.markModified('nodes');
      await graph.save();

      return updatedNode;
    } catch (error) {
      console.error('更新节点失败:', error);
      throw error;
    }
  }

  /**
   * 删除节点
   */
  static async deleteNode(
    graphId: string,
    userId: string,
    nodeId: string
  ): Promise<boolean> {
    try {
      const graph = await KnowledgeGraphModel.findOne({
        _id: graphId,
        userId
      });

      if (!graph) {
        throw new Error('图谱不存在或无权限访问');
      }

      const success = graph.removeNode(nodeId);
      if (!success) {
        throw new Error('节点不存在');
      }

      await graph.save();

      // 删除相关的作品挂载
      await WorkMountModel.deleteMany({
        graphId,
        nodeId
      });

      return true;
    } catch (error) {
      console.error('删除节点失败:', error);
      throw error;
    }
  }

  /**
   * 搜索节点
   */
  static async searchNodes(
    graphId: string,
    userId: string,
    query: NodeSearchQuery
  ): Promise<GraphNode[]> {
    try {
      const graph = await KnowledgeGraphModel.findOne({
        $or: [
          { _id: graphId, userId },
          { _id: graphId, 'metadata.isPublic': true }
        ]
      });

      if (!graph) {
        throw new Error('图谱不存在或无权限访问');
      }

      let nodes = graph.nodes;

      // 应用过滤条件
      if (query.search) {
        const searchLower = query.search.toLowerCase();
        nodes = nodes.filter(node => 
          node.label.toLowerCase().includes(searchLower) ||
          node.metadata.description?.toLowerCase().includes(searchLower)
        );
      }

      if (query.type) {
        nodes = nodes.filter(node => node.type === query.type);
      }

      if (typeof query.level === 'number') {
        nodes = nodes.filter(node => node.level === query.level);
      }

      if (typeof query.hasWorks === 'boolean') {
        nodes = nodes.filter(node => 
          query.hasWorks ? node.metadata.workCount > 0 : node.metadata.workCount === 0
        );
      }

      if (query.tags?.length) {
        nodes = nodes.filter(node =>
          query.tags!.some(tag => node.metadata.tags?.includes(tag))
        );
      }

      return nodes;
    } catch (error) {
      console.error('搜索节点失败:', error);
      throw error;
    }
  }
}

// ============= 边管理服务 =============

export class EdgeService {
  /**
   * 添加边
   */
  static async addEdge(
    graphId: string,
    userId: string,
    edgeData: Omit<GraphEdge, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<GraphEdge> {
    try {
      const graph = await KnowledgeGraphModel.findOne({
        _id: graphId,
        userId
      });

      if (!graph) {
        throw new Error('图谱不存在或无权限访问');
      }

      // 验证边数据
      validateEdgeData(edgeData);

      // 检查源节点和目标节点是否存在
      const sourceExists = graph.nodes.some(n => n.id === edgeData.source);
      const targetExists = graph.nodes.some(n => n.id === edgeData.target);

      if (!sourceExists || !targetExists) {
        throw new Error('源节点或目标节点不存在');
      }

      // 检查是否已存在相同的边
      const existingEdge = graph.edges.find(e => 
        e.source === edgeData.source && 
        e.target === edgeData.target && 
        e.type === edgeData.type
      );

      if (existingEdge) {
        throw new Error('相同的边已存在');
      }

      // 检查边数量限制
      if (graph.edges.length >= DEFAULT_KNOWLEDGE_GRAPH_CONFIG.LIMITS.MAX_EDGES) {
        throw new Error(`边数量不能超过 ${DEFAULT_KNOWLEDGE_GRAPH_CONFIG.LIMITS.MAX_EDGES}`);
      }

      // 生成新边
      const newEdge: GraphEdge = {
        ...edgeData,
        id: generateId(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // 添加到图谱
      const addedEdge = graph.addEdge(newEdge);
      await graph.save();

      return addedEdge;
    } catch (error) {
      console.error('添加边失败:', error);
      throw error;
    }
  }

  /**
   * 删除边
   */
  static async deleteEdge(
    graphId: string,
    userId: string,
    edgeId: string
  ): Promise<boolean> {
    try {
      const graph = await KnowledgeGraphModel.findOne({
        _id: graphId,
        userId
      });

      if (!graph) {
        throw new Error('图谱不存在或无权限访问');
      }

      const success = graph.removeEdge(edgeId);
      if (!success) {
        throw new Error('边不存在');
      }

      await graph.save();
      return true;
    } catch (error) {
      console.error('删除边失败:', error);
      throw error;
    }
  }
}

export default {
  KnowledgeGraphService,
  NodeService,
  EdgeService
};