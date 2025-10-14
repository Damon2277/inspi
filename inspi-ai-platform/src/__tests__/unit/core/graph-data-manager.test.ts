/**
 * 图谱数据管理器单元测试
 * 测试核心数据管理功能
 */
import { describe, it, expect, beforeEach } from '@jest/globals';

import { GraphDataManager } from '@/core/graph/data-manager';
import {
  KnowledgeGraph,
  GraphNode,
  GraphEdge,
  NodeType,
  EdgeType,
  GraphType,
  GraphLayout,
} from '@/shared/types/knowledgeGraph';

describe('GraphDataManager', () => {
  let testGraph: KnowledgeGraph;
  let dataManager: GraphDataManager;

  beforeEach(() => {
    const testNodes: GraphNode[] = [
      {
        id: 'node1',
        label: '数学',
        type: NodeType.SUBJECT,
        level: 0,
        position: { x: 100, y: 100 },
        metadata: { workCount: 5, reuseCount: 2 },
        isVisible: true,
        isLocked: false,
      },
      {
        id: 'node2',
        label: '代数',
        type: NodeType.CHAPTER,
        level: 1,
        parentId: 'node1',
        position: { x: 200, y: 150 },
        metadata: { workCount: 3, reuseCount: 1 },
        isVisible: true,
        isLocked: false,
      },
    ];

    const testEdges: GraphEdge[] = [
      {
        id: 'edge1',
        source: 'node1',
        target: 'node2',
        type: EdgeType.CONTAINS,
        weight: 1,
        isVisible: true,
        isDirected: true,
      },
    ];

    testGraph = {
      id: 'test-graph',
      userId: 'test-user',
      name: '测试图谱',
      description: '用于测试的知识图谱',
      type: GraphType.CUSTOM,
      subject: '数学',
      nodes: testNodes,
      edges: testEdges,
      layout: {
        type: GraphLayout.FORCE,
        options: {
          linkDistance: 80,
          linkStrength: 0.5,
          chargeStrength: -300,
        },
      },
      view: {
        showLabels: true,
        showEdgeLabels: false,
        nodeSize: 'proportional',
        edgeWidth: 'fixed',
        colorScheme: 'default',
        theme: 'light',
        animations: true,
        minimap: false,
        toolbar: true,
      },
      version: 1,
      isPublic: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    dataManager = new GraphDataManager(testGraph);
  });

  describe('节点管理', () => {
    it('应该能够创建新节点', () => {
      const newNode = dataManager.createNode({
        label: '几何',
        type: NodeType.CHAPTER,
        parentId: 'node1',
        position: { x: 150, y: 250 },
      });

      expect(newNode.label).toBe('几何');
      expect(newNode.type).toBe(NodeType.CHAPTER);
      expect(newNode.level).toBe(1); // 应该基于父节点计算层级
      expect(newNode.parentId).toBe('node1');
    });

    it('应该能够获取节点', () => {
      const node = dataManager.getNode('node1');
      expect(node).toBeDefined();
      expect(node!.label).toBe('数学');
      expect(node!.type).toBe(NodeType.SUBJECT);
    });

    it('应该能够更新节点', () => {
      const updatedNode = dataManager.updateNode('node1', {
        label: '高等数学',
        metadata: { workCount: 10, reuseCount: 5 },
      });

      expect(updatedNode.label).toBe('高等数学');
      expect(updatedNode.metadata.workCount).toBe(10);
      expect(updatedNode.metadata.reuseCount).toBe(5);
    });

    it('应该能够删除节点', () => {
      dataManager.deleteNode('node2');
      const deletedNode = dataManager.getNode('node2');
      expect(deletedNode).toBeUndefined();
    });

    it('应该能够获取子节点', () => {
      const childNodes = dataManager.getChildNodes('node1');
      expect(childNodes.length).toBe(1);
      expect(childNodes[0].id).toBe('node2');
    });

    it('应该能够获取节点路径', () => {
      const path = dataManager.getNodePath('node2');
      expect(path.length).toBe(2);
      expect(path[0].id).toBe('node1');
      expect(path[1].id).toBe('node2');
    });
  });

  describe('边管理', () => {
    it('应该能够创建新边', () => {
      const newEdge = dataManager.createEdge({
        source: 'node1',
        target: 'node2',
        type: EdgeType.RELATED,
        weight: 0.8,
      });

      expect(newEdge.source).toBe('node1');
      expect(newEdge.target).toBe('node2');
      expect(newEdge.type).toBe(EdgeType.RELATED);
      expect(newEdge.weight).toBe(0.8);
    });

    it('应该能够获取边', () => {
      const edge = dataManager.getEdge('edge1');
      expect(edge).toBeDefined();
      expect(edge!.source).toBe('node1');
      expect(edge!.target).toBe('node2');
    });

    it('应该能够删除边', () => {
      dataManager.deleteEdge('edge1');
      const deletedEdge = dataManager.getEdge('edge1');
      expect(deletedEdge).toBeUndefined();
    });

    it('应该能够获取节点的所有边', () => {
      const nodeEdges = dataManager.getNodeEdges('node1');
      expect(nodeEdges.length).toBe(1);
      expect(nodeEdges[0].id).toBe('edge1');
    });

    it('应该能够获取两个节点之间的边', () => {
      const edgesBetween = dataManager.getEdgesBetween('node1', 'node2');
      expect(edgesBetween.length).toBe(1);
      expect(edgesBetween[0].id).toBe('edge1');
    });
  });

  describe('搜索和查询', () => {
    it('应该能够搜索节点', () => {
      const results = dataManager.searchNodes('数学');
      expect(results.length).toBe(1);
      expect(results[0].label).toBe('数学');
    });

    it('应该能够按类型过滤搜索', () => {
      const results = dataManager.searchNodes('', {
        types: [NodeType.CHAPTER],
      });
      expect(results.length).toBe(1);
      expect(results[0].type).toBe(NodeType.CHAPTER);
    });

    it('应该能够按作品数量过滤', () => {
      const results = dataManager.searchNodes('', {
        hasWorks: true,
      });
      expect(results.length).toBe(2); // 两个节点都有作品
      expect(results.every(node => node.metadata.workCount > 0)).toBe(true);
    });
  });

  describe('统计信息', () => {
    it('应该提供正确的图谱统计', () => {
      const stats = dataManager.getStatistics();

      expect(stats.nodeCount).toBe(2);
      expect(stats.edgeCount).toBe(1);
      expect(stats.nodesByType[NodeType.SUBJECT]).toBe(1);
      expect(stats.nodesByType[NodeType.CHAPTER]).toBe(1);
      expect(stats.edgesByType[EdgeType.CONTAINS]).toBe(1);
      expect(stats.maxDepth).toBe(1);
      expect(stats.averageDegree).toBeGreaterThan(0);
      expect(stats.density).toBeGreaterThan(0);
    });
  });

  describe('版本控制', () => {
    it('应该记录操作历史', () => {
      const initialHistoryLength = dataManager.getOperationHistory().length;

      dataManager.createNode({
        label: '测试节点',
        type: NodeType.CONCEPT,
      });

      const newHistoryLength = dataManager.getOperationHistory().length;
      expect(newHistoryLength).toBe(initialHistoryLength + 1);
    });

    it('应该支持撤销操作', () => {
      const newNode = dataManager.createNode({
        label: '测试节点',
        type: NodeType.CONCEPT,
      });

      expect(dataManager.getNode(newNode.id)).toBeDefined();

      const undoResult = dataManager.undo();
      expect(undoResult).toBe(true);
      expect(dataManager.getNode(newNode.id)).toBeUndefined();
    });
  });

  describe('导入导出', () => {
    it('应该能够导出为JSON格式', () => {
      const jsonData = dataManager.exportGraph('json');
      expect(jsonData).toBeDefined();

      const parsedData = JSON.parse(jsonData);
      expect(parsedData.id).toBe(testGraph.id);
      expect(parsedData.nodes.length).toBe(2);
      expect(parsedData.edges.length).toBe(1);
    });

    it('应该能够导出为GraphML格式', () => {
      const graphmlData = dataManager.exportGraph('graphml');
      expect(graphmlData).toContain('<?xml version="1.0"');
      expect(graphmlData).toContain('<graphml');
      expect(graphmlData).toContain('<node id="node1"');
      expect(graphmlData).toContain('<edge id="edge1"');
    });

    it('应该能够导出为GEXF格式', () => {
      const gexfData = dataManager.exportGraph('gexf');
      expect(gexfData).toContain('<?xml version="1.0"');
      expect(gexfData).toContain('<gexf');
      expect(gexfData).toContain('<node id="node1"');
      expect(gexfData).toContain('<edge id="edge1"');
    });
  });

  describe('数据验证', () => {
    it('应该验证有效的图谱数据', () => {
      const validation = dataManager.validate();
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('应该检测重复的节点ID', () => {
      // 手动添加重复节点来测试验证
      const graph = dataManager.getGraph();
      graph.nodes.push({
        id: 'node1', // 重复ID
        label: '重复节点',
        type: NodeType.CONCEPT,
        level: 0,
        metadata: { workCount: 0, reuseCount: 0 },
        isVisible: true,
        isLocked: false,
      });

      const invalidDataManager = new GraphDataManager(graph);
      const validation = invalidDataManager.validate();
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(error => error.includes('Duplicate node ID'))).toBe(true);
    });

    it('应该检测无效的边引用', () => {
      const graph = dataManager.getGraph();
      graph.edges.push({
        id: 'invalid-edge',
        source: 'non-existent-node',
        target: 'node1',
        type: EdgeType.RELATED,
        weight: 1,
        isVisible: true,
        isDirected: true,
      });

      const invalidDataManager = new GraphDataManager(graph);
      const validation = invalidDataManager.validate();
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(error => error.includes('non-existent source node'))).toBe(true);
    });
  });

  describe('克隆功能', () => {
    it('应该能够克隆图谱', () => {
      const clonedManager = dataManager.clone();
      const clonedGraph = clonedManager.getGraph();

      expect(clonedGraph.id).not.toBe(testGraph.id);
      expect(clonedGraph.name).toBe(testGraph.name);
      expect(clonedGraph.nodes.length).toBe(testGraph.nodes.length);
      expect(clonedGraph.edges.length).toBe(testGraph.edges.length);
      expect(clonedGraph.version).toBe(1);
    });
  });
});
