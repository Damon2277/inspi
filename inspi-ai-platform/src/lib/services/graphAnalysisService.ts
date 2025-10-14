/**
 * 图谱分析服务
 * 提供知识图谱的分析功能，包括中心性分析、聚类分析、路径查找等
 */

import { ALGORITHM_CONFIG } from '@/lib/config/knowledgeGraph';
import { KnowledgeGraphModel } from '@/lib/models/KnowledgeGraph';
import {
  GraphNode,
  GraphEdge,
  GraphAnalysis,
  TraversalOptions,
  PathFindingOptions,
} from '@/shared/types/knowledgeGraph';

// ============= 图数据结构 =============

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  adjacencyList: Map<string, Array<{ nodeId: string; edge: GraphEdge }>>;
  reverseAdjacencyList: Map<string, Array<{ nodeId: string; edge: GraphEdge }>>;
}

// ============= 图谱分析核心服务 =============

export class GraphAnalysisService {
  /**
   * 构建图数据结构
   */
  private static buildGraphData(nodes: GraphNode[], edges: GraphEdge[]): GraphData {
    const adjacencyList = new Map<string, Array<{ nodeId: string; edge: GraphEdge }>>();
    const reverseAdjacencyList = new Map<string, Array<{ nodeId: string; edge: GraphEdge }>>();

    // 初始化邻接表
    nodes.forEach(node => {
      adjacencyList.set(node.id, []);
      reverseAdjacencyList.set(node.id, []);
    });

    // 构建邻接表
    edges.forEach(edge => {
      const sourceList = adjacencyList.get(edge.source);
      const targetReverseList = reverseAdjacencyList.get(edge.target);

      if (sourceList) {
        sourceList.push({ nodeId: edge.target, edge });
      }

      if (targetReverseList) {
        targetReverseList.push({ nodeId: edge.source, edge });
      }

      // 如果是双向边，添加反向连接
      if (edge.metadata?.bidirectional) {
        const targetList = adjacencyList.get(edge.target);
        const sourceReverseList = reverseAdjacencyList.get(edge.source);

        if (targetList) {
          targetList.push({ nodeId: edge.source, edge });
        }

        if (sourceReverseList) {
          sourceReverseList.push({ nodeId: edge.target, edge });
        }
      }
    });

    return {
      nodes,
      edges,
      adjacencyList,
      reverseAdjacencyList,
    };
  }

  /**
   * 执行完整的图谱分析
   */
  static async analyzeGraph(graphId: string, userId?: string): Promise<GraphAnalysis> {
    try {
      // 获取图谱数据
      const graph = await (KnowledgeGraphModel as any).findOne({
        $or: [
          { _id: graphId, userId },
          { _id: graphId, 'metadata.isPublic': true },
        ],
      });

      if (!graph) {
        throw new Error('图谱不存在或无权限访问');
      }

      const graphData = this.buildGraphData(graph.nodes, graph.edges);

      // 并行执行各种分析
      const [centrality, clusters, learningPaths, recommendations] = await Promise.all([
        this.calculateCentrality(graphData),
        this.detectClusters(graphData),
        this.findLearningPaths(graphData),
        this.generateRecommendations(graphData),
      ]);

      return {
        graphId,
        centrality,
        clusters,
        learningPaths,
        recommendations,
      };
    } catch (error) {
      console.error('图谱分析失败:', error);
      throw error;
    }
  }

  /**
   * 计算节点中心性
   */
  private static async calculateCentrality(
    graphData: GraphData,
  ): Promise<Array<{ nodeId: string; score: number }>> {
    const { nodes, adjacencyList } = graphData;
    const centrality: Array<{ nodeId: string; score: number }> = [];

    // 使用PageRank算法计算中心性
    const pageRankScores = this.calculatePageRank(graphData);

    // 转换为结果格式
    nodes.forEach(node => {
      centrality.push({
        nodeId: node.id,
        score: pageRankScores.get(node.id) || 0,
      });
    });

    // 按分数排序
    centrality.sort((a, b) => b.score - a.score);

    return centrality;
  }

  /**
   * PageRank算法实现
   */
  private static calculatePageRank(graphData: GraphData): Map<string, number> {
    const { nodes, adjacencyList } = graphData;
    const dampingFactor = ALGORITHM_CONFIG.CENTRALITY.DAMPING_FACTOR;
    const maxIterations = ALGORITHM_CONFIG.CENTRALITY.MAX_ITERATIONS;
    const tolerance = ALGORITHM_CONFIG.CENTRALITY.TOLERANCE;

    const nodeCount = nodes.length;
    if (nodeCount === 0) return new Map();

    // 初始化PageRank值
    const pageRank = new Map<string, number>();
    const newPageRank = new Map<string, number>();

    nodes.forEach(node => {
      pageRank.set(node.id, 1.0 / nodeCount);
      newPageRank.set(node.id, 0);
    });

    // 迭代计算
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      let hasConverged = true;

      // 重置新的PageRank值
      nodes.forEach(node => {
        newPageRank.set(node.id, (1 - dampingFactor) / nodeCount);
      });

      // 计算每个节点的新PageRank值
      nodes.forEach(node => {
        const currentPR = pageRank.get(node.id) || 0;
        const outLinks = adjacencyList.get(node.id) || [];

        if (outLinks.length > 0) {
          const contribution = currentPR / outLinks.length;

          outLinks.forEach(({ nodeId: targetId }) => {
            const currentTargetPR = newPageRank.get(targetId) || 0;
            newPageRank.set(targetId, currentTargetPR + dampingFactor * contribution);
          });
        }
      });

      // 检查收敛性
      nodes.forEach(node => {
        const oldValue = pageRank.get(node.id) || 0;
        const newValue = newPageRank.get(node.id) || 0;

        if (Math.abs(newValue - oldValue) > tolerance) {
          hasConverged = false;
        }

        pageRank.set(node.id, newValue);
      });

      if (hasConverged) {
        break;
      }
    }

    return pageRank;
  }

  /**
   * 检测图谱聚类
   */
  private static async detectClusters(
    graphData: GraphData,
  ): Promise<Array<{ id: string; nodeIds: string[]; label: string }>> {
    const { nodes, adjacencyList } = graphData;

    // 使用简单的连通分量算法进行聚类
    const visited = new Set<string>();
    const clusters: Array<{ id: string; nodeIds: string[]; label: string }> = [];
    let clusterId = 0;

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        const cluster = this.dfsCluster(node.id, adjacencyList, visited);

        if (cluster.length > 1) { // 只保留包含多个节点的聚类
          // 生成聚类标签（使用最常见的节点类型）
          const nodeTypes = cluster.map(nodeId =>
            (nodes as any).find(n => n.id === nodeId)?.type,
          ).filter(Boolean);

          const typeCount = nodeTypes.reduce((acc, type) => {
            acc[type!] = (acc[type!] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

          const dominantType = (Object.entries(typeCount) as Array<[string, number]>)
            .sort(([, a], [, b]) => b - a)[0]?.[0] || 'unknown';

          clusters.push({
            id: `cluster_${clusterId++}`,
            nodeIds: cluster,
            label: `${dominantType}聚类 (${cluster.length}个节点)`,
          });
        }
      }
    }

    return clusters;
  }

  /**
   * 深度优先搜索聚类
   */
  private static dfsCluster(
    startNodeId: string,
    adjacencyList: Map<string, Array<{ nodeId: string; edge: GraphEdge }>>,
    visited: Set<string>,
  ): string[] {
    const cluster: string[] = [];
    const stack: string[] = [startNodeId];

    while (stack.length > 0) {
      const nodeId = stack.pop()!;

      if (!visited.has(nodeId)) {
        visited.add(nodeId);
        cluster.push(nodeId);

        const neighbors = adjacencyList.get(nodeId) || [];
        neighbors.forEach(({ nodeId: neighborId, edge }) => {
          // 只考虑强关联的边（相关、相似、扩展关系）
          if (['related', 'similar', 'extends'].includes(edge.type) &&
              !visited.has(neighborId)) {
            stack.push(neighborId);
          }
        });
      }
    }

    return cluster;
  }

  /**
   * 查找学习路径
   */
  private static async findLearningPaths(
    graphData: GraphData,
  ): Promise<Array<{
    from: string;
    to: string;
    path: string[];
    difficulty: number;
  }>> {
    const { nodes, adjacencyList } = graphData;
    const learningPaths: Array<{
      from: string;
      to: string;
      path: string[];
      difficulty: number;
    }> = [];

    // 找到所有基础节点（没有前置依赖的节点）
    const basicNodes = nodes.filter(node => {
      const incomingEdges = graphData.reverseAdjacencyList.get(node.id) || [];
      return !incomingEdges.some(({ edge }) => edge.type === 'prerequisite');
    });

    // 找到所有高级节点（有前置依赖的节点）
    const advancedNodes = nodes.filter(node => {
      const incomingEdges = graphData.reverseAdjacencyList.get(node.id) || [];
      return incomingEdges.some(({ edge }) => edge.type === 'prerequisite');
    });

    // 为每个基础节点到高级节点找路径
    for (const basicNode of basicNodes.slice(0, 5)) { // 限制数量避免过多计算
      for (const advancedNode of advancedNodes.slice(0, 5)) {
        const path = this.findShortestPath(
          basicNode.id,
          advancedNode.id,
          graphData,
          { preferredEdgeTypes: ['prerequisite', 'contains'] },
        );

        if (path && path.length > 1) {
          // 计算路径难度（基于节点难度的平均值）
          const pathNodes = path.map(nodeId =>
            (nodes as any).find(n => n.id === nodeId),
          ).filter(Boolean);

          const avgDifficulty = pathNodes.reduce((sum, node) =>
            sum + (node!.metadata.difficulty || 3), 0,
          ) / pathNodes.length;

          learningPaths.push({
            from: basicNode.id,
            to: advancedNode.id,
            path,
            difficulty: avgDifficulty,
          });
        }
      }
    }

    // 按难度排序
    learningPaths.sort((a, b) => a.difficulty - b.difficulty);

    return learningPaths.slice(0, 10); // 返回前10条路径
  }

  /**
   * 使用Dijkstra算法查找最短路径
   */
  private static findShortestPath(
    startId: string,
    endId: string,
    graphData: GraphData,
    options: PathFindingOptions = {},
  ): string[] | null {
    const { adjacencyList } = graphData;
    const { preferredEdgeTypes = [], avoidNodes = [] } = options;

    if (startId === endId) return [startId];
    if (avoidNodes.includes(startId) || avoidNodes.includes(endId)) return null;

    const distances = new Map<string, number>();
    const previous = new Map<string, string | null>();
    const unvisited = new Set<string>();

    // 初始化
    graphData.nodes.forEach(node => {
      distances.set(node.id, node.id === startId ? 0 : Infinity);
      previous.set(node.id, null);
      if (!avoidNodes.includes(node.id)) {
        unvisited.add(node.id);
      }
    });

    while (unvisited.size > 0) {
      // 找到距离最小的未访问节点
      let currentNode: string | null = null;
      let minDistance = Infinity;

      for (const nodeId of unvisited) {
        const distance = distances.get(nodeId) || Infinity;
        if (distance < minDistance) {
          minDistance = distance;
          currentNode = nodeId;
        }
      }

      if (!currentNode || minDistance === Infinity) break;

      unvisited.delete(currentNode);

      if (currentNode === endId) {
        // 重构路径
        const path: string[] = [];
        let current: string | null = endId;

        while (current !== null) {
          path.unshift(current);
          current = previous.get(current) || null;
        }

        return path;
      }

      // 更新邻居节点的距离
      const neighbors = adjacencyList.get(currentNode) || [];

      for (const { nodeId: neighborId, edge } of neighbors) {
        if (!unvisited.has(neighborId)) continue;

        // 计算边权重
        let weight = edge.weight;

        // 如果有偏好的边类型，给予权重优惠
        if (preferredEdgeTypes.includes(edge.type)) {
          weight *= 0.5;
        }

        const currentDistance = distances.get(currentNode) || Infinity;
        const newDistance = currentDistance + weight;
        const neighborDistance = distances.get(neighborId) || Infinity;

        if (newDistance < neighborDistance) {
          distances.set(neighborId, newDistance);
          previous.set(neighborId, currentNode);
        }
      }
    }

    return null; // 没有找到路径
  }

  /**
   * 生成改进建议
   */
  private static async generateRecommendations(
    graphData: GraphData,
  ): Promise<Array<{
    type: 'missing_connection' | 'new_node' | 'work_suggestion';
    description: string;
    confidence: number;
    data: any;
  }>> {
    const { nodes, edges, adjacencyList } = graphData;
    const recommendations: Array<{
      type: 'missing_connection' | 'new_node' | 'work_suggestion';
      description: string;
      confidence: number;
      data: any;
    }> = [];

    // 1. 检测缺失的连接
    const missingConnections = this.detectMissingConnections(graphData);
    missingConnections.forEach(connection => {
      recommendations.push({
        type: 'missing_connection',
        description: `建议在"${connection.sourceLabel}"和"${connection.targetLabel}"之间添加${connection.edgeType}关系`,
        confidence: connection.confidence,
        data: connection,
      });
    });

    // 2. 建议新节点
    const newNodeSuggestions = this.suggestNewNodes(graphData);
    newNodeSuggestions.forEach(suggestion => {
      recommendations.push({
        type: 'new_node',
        description: `建议添加"${suggestion.label}"节点来完善知识结构`,
        confidence: suggestion.confidence,
        data: suggestion,
      });
    });

    // 3. 作品挂载建议
    const workSuggestions = this.suggestWorkMounts(graphData);
    workSuggestions.forEach(suggestion => {
      recommendations.push({
        type: 'work_suggestion',
        description: `节点"${suggestion.nodeLabel}"缺少相关作品，建议添加${suggestion.workType}类型的内容`,
        confidence: suggestion.confidence,
        data: suggestion,
      });
    });

    // 按置信度排序并限制数量
    return recommendations
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, ALGORITHM_CONFIG.RECOMMENDATION.MAX_RECOMMENDATIONS);
  }

  /**
   * 检测缺失的连接
   */
  private static detectMissingConnections(graphData: GraphData): Array<{
    sourceId: string;
    targetId: string;
    sourceLabel: string;
    targetLabel: string;
    edgeType: string;
    confidence: number;
  }> {
    const { nodes, edges } = graphData;
    const connections: Array<{
      sourceId: string;
      targetId: string;
      sourceLabel: string;
      targetLabel: string;
      edgeType: string;
      confidence: number;
    }> = [];

    // 检查层级关系中的缺失连接
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const node1 = nodes[i];
        const node2 = nodes[j];

        // 检查是否已存在连接
        const hasConnection = edges.some(edge =>
          (edge.source === node1.id && edge.target === node2.id) ||
          (edge.source === node2.id && edge.target === node1.id),
        );

        if (!hasConnection) {
          let confidence = 0;
          let edgeType = 'related';

          // 基于层级关系判断
          if (Math.abs(node1.level - node2.level) === 1) {
            confidence += 0.3;
            edgeType = 'contains';
          }

          // 基于标签相似性判断
          if (node1.metadata.tags && node2.metadata.tags) {
            const commonTags = node1.metadata.tags.filter(tag =>
              node2.metadata.tags!.includes(tag),
            );
            if (commonTags.length > 0) {
              confidence += commonTags.length * 0.2;
              edgeType = 'related';
            }
          }

          // 基于名称相似性判断
          const similarity = this.calculateStringSimilarity(node1.label, node2.label);
          if (similarity > 0.3) {
            confidence += similarity * 0.3;
            edgeType = 'similar';
          }

          if (confidence > ALGORITHM_CONFIG.RECOMMENDATION.MIN_CONFIDENCE) {
            connections.push({
              sourceId: node1.id,
              targetId: node2.id,
              sourceLabel: node1.label,
              targetLabel: node2.label,
              edgeType,
              confidence: Math.min(confidence, 1.0),
            });
          }
        }
      }
    }

    return connections.slice(0, 5); // 返回前5个建议
  }

  /**
   * 建议新节点
   */
  private static suggestNewNodes(graphData: GraphData): Array<{
    label: string;
    type: string;
    level: number;
    confidence: number;
  }> {
    const { nodes } = graphData;
    const suggestions: Array<{
      label: string;
      type: string;
      level: number;
      confidence: number;
    }> = [];

    // 分析节点类型分布
    const typeCount = nodes.reduce((acc, node) => {
      acc[node.type] = (acc[node.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // 如果缺少某些类型的节点，建议添加
    const expectedTypes = ['subject', 'chapter', 'topic', 'concept', 'skill'];
    expectedTypes.forEach(type => {
      const count = typeCount[type] || 0;
      const totalNodes = nodes.length;

      if (totalNodes > 5 && count / totalNodes < 0.1) {
        suggestions.push({
          label: `新的${type}节点`,
          type,
          level: type === 'subject' ? 0 : type === 'chapter' ? 1 : 2,
          confidence: 0.6,
        });
      }
    });

    return suggestions.slice(0, 3); // 返回前3个建议
  }

  /**
   * 建议作品挂载
   */
  private static suggestWorkMounts(graphData: GraphData): Array<{
    nodeId: string;
    nodeLabel: string;
    workType: string;
    confidence: number;
  }> {
    const { nodes } = graphData;
    const suggestions: Array<{
      nodeId: string;
      nodeLabel: string;
      workType: string;
      confidence: number;
    }> = [];

    // 找到没有作品的节点
    const nodesWithoutWorks = nodes.filter(node =>
      node.metadata.workCount === 0,
    );

    nodesWithoutWorks.forEach(node => {
      let workType = 'article';
      let confidence = 0.5;

      // 根据节点类型推荐作品类型
      switch (node.type) {
        case 'concept':
          workType = 'explanation';
          confidence = 0.8;
          break;
        case 'skill':
          workType = 'exercise';
          confidence = 0.9;
          break;
        case 'topic':
          workType = 'tutorial';
          confidence = 0.7;
          break;
        default:
          workType = 'article';
          confidence = 0.5;
      }

      suggestions.push({
        nodeId: node.id,
        nodeLabel: node.label,
        workType,
        confidence,
      });
    });

    return suggestions.slice(0, 5); // 返回前5个建议
  }

  /**
   * 计算字符串相似性（简单的Jaccard相似性）
   */
  private static calculateStringSimilarity(str1: string, str2: string): number {
    const set1 = new Set(str1.toLowerCase().split(''));
    const set2 = new Set(str2.toLowerCase().split(''));

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  /**
   * 图遍历
   */
  static traverseGraph(
    graphData: GraphData,
    startNodeId: string,
    options: TraversalOptions = {},
  ): string[] {
    const {
      maxDepth = 10,
      direction = 'forward',
      edgeTypes = [],
      nodeTypes = [],
    } = options;

    const visited = new Set<string>();
    const result: string[] = [];
    const queue: Array<{ nodeId: string; depth: number }> = [{ nodeId: startNodeId, depth: 0 }];

    while (queue.length > 0) {
      const { nodeId, depth } = queue.shift()!;

      if (visited.has(nodeId) || depth > maxDepth) continue;

      visited.add(nodeId);

      // 检查节点类型过滤
      const node = (graphData.nodes as any).find(n => n.id === nodeId);
      if (node && nodeTypes.length > 0 && !nodeTypes.includes(node.type)) {
        continue;
      }

      result.push(nodeId);

      // 获取邻居节点
      const neighbors: Array<{ nodeId: string; edge: GraphEdge }> = [];

      if (direction === 'forward' || direction === 'both') {
        neighbors.push(...(graphData.adjacencyList.get(nodeId) || []));
      }

      if (direction === 'backward' || direction === 'both') {
        neighbors.push(...(graphData.reverseAdjacencyList.get(nodeId) || []));
      }

      // 过滤边类型并添加到队列
      neighbors.forEach(({ nodeId: neighborId, edge }) => {
        if (edgeTypes.length === 0 || edgeTypes.includes(edge.type)) {
          if (!visited.has(neighborId)) {
            queue.push({ nodeId: neighborId, depth: depth + 1 });
          }
        }
      });
    }

    return result;
  }
}

export default GraphAnalysisService;
