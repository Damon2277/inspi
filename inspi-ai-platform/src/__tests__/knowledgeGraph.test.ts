/**
 * 知识图谱功能测试
 * 测试图谱的验证和数据结构
 */
import { describe, it, expect } from '@jest/globals';
import { 
  validateGraphStructure, 
  validateNodes, 
  validateEdges,
  validateKnowledgeGraph,
  quickValidateGraph,
  isEmptyGraph,
  getGraphComplexityScore
} from '@/lib/utils/graphValidation';
import {
  GraphType,
  NodeType,
  EdgeType,
  GraphNode,
  GraphEdge,
  KnowledgeGraph,
  GraphLayout
} from '@/types/knowledgeGraph';
import { 
  GraphNodeFactory, 
  GraphEdgeFactory, 
  KnowledgeGraphFactory,
  ScenarioFactory 
} from './factories';
import { generateTestId } from './utils/testHelpers';

describe('知识图谱功能测试', () => {
  describe('图谱验证功能', () => {
    it('应该能够验证有效的图谱结构', () => {
      const nodes: GraphNode[] = [
        {
          id: 'node1',
          label: '数学基础',
          type: NodeType.TOPIC,
          level: 1,
          position: { x: 0, y: 0 },
          metadata: {
            description: '数学基础知识',
            workCount: 0,
            reuseCount: 0,
            tags: ['数学']
          },
          isVisible: true,
          isLocked: false
        },
        {
          id: 'node2',
          label: '代数',
          type: NodeType.CONCEPT,
          level: 2,
          position: { x: 100, y: 0 },
          metadata: {
            description: '代数概念',
            workCount: 0,
            reuseCount: 0,
            tags: ['数学', '代数']
          },
          isVisible: true,
          isLocked: false
        }
      ];

      const edges: GraphEdge[] = [
        {
          id: 'edge1',
          source: 'node1',
          target: 'node2',
          type: EdgeType.PREREQUISITE,
          weight: 1.0,
          metadata: {
            strength: 0.8,
            description: '前置关系'
          },
          isVisible: true,
          isDirected: true
        }
      ];

      const result = validateGraphStructure(nodes, edges);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该能够检测无效的节点数据', () => {
      const invalidNodes: GraphNode[] = [
        {
          id: '', // 无效的空ID
          label: '测试节点',
          type: NodeType.TOPIC,
          level: 1,
          position: { x: 0, y: 0 },
          metadata: { workCount: 0, reuseCount: 0 },
          isVisible: true,
          isLocked: false
        }
      ];

      const result = validateNodes(invalidNodes);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('节点缺少ID');
    });

    it('应该能够检测重复的节点ID', () => {
      const nodesWithDuplicateIds: GraphNode[] = [
        {
          id: 'duplicate-id',
          label: '节点1',
          type: NodeType.TOPIC,
          level: 1,
          position: { x: 0, y: 0 },
          metadata: { workCount: 0, reuseCount: 0 },
          isVisible: true,
          isLocked: false
        },
        {
          id: 'duplicate-id', // 重复的ID
          label: '节点2',
          type: NodeType.TOPIC,
          level: 1,
          position: { x: 100, y: 0 },
          metadata: { workCount: 0, reuseCount: 0 },
          isVisible: true,
          isLocked: false
        }
      ];

      const result = validateNodes(nodesWithDuplicateIds);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('节点ID重复'))).toBe(true);
    });

    it('应该能够验证边的有效性', () => {
      const nodes: GraphNode[] = [
        {
          id: 'node1',
          label: '节点1',
          type: NodeType.TOPIC,
          level: 1,
          position: { x: 0, y: 0 },
          metadata: { workCount: 0, reuseCount: 0 },
          isVisible: true,
          isLocked: false
        },
        {
          id: 'node2',
          label: '节点2',
          type: NodeType.TOPIC,
          level: 2,
          position: { x: 100, y: 0 },
          metadata: { workCount: 0, reuseCount: 0 },
          isVisible: true,
          isLocked: false
        }
      ];

      const validEdges: GraphEdge[] = [
        {
          id: 'edge1',
          source: 'node1',
          target: 'node2',
          type: EdgeType.PREREQUISITE,
          weight: 1.0,
          isVisible: true,
          isDirected: true
        }
      ];

      const result = validateEdges(validEdges, nodes);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该能够检测边引用不存在的节点', () => {
      const nodes: GraphNode[] = [
        {
          id: 'node1',
          label: '节点1',
          type: NodeType.TOPIC,
          level: 1,
          position: { x: 0, y: 0 },
          metadata: { workCount: 0, reuseCount: 0 },
          isVisible: true,
          isLocked: false
        }
      ];

      const invalidEdges: GraphEdge[] = [
        {
          id: 'edge1',
          source: 'node1',
          target: 'nonexistent-node', // 不存在的节点
          type: EdgeType.PREREQUISITE,
          weight: 1.0,
          isVisible: true,
          isDirected: true
        }
      ];

      const result = validateEdges(invalidEdges, nodes);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('目标节点不存在'))).toBe(true);
    });

    it('应该能够检测自环边', () => {
      const nodes: GraphNode[] = [
        {
          id: 'node1',
          label: '节点1',
          type: NodeType.TOPIC,
          level: 1,
          position: { x: 0, y: 0 },
          metadata: { workCount: 0, reuseCount: 0 },
          isVisible: true,
          isLocked: false
        }
      ];

      const selfLoopEdges: GraphEdge[] = [
        {
          id: 'edge1',
          source: 'node1',
          target: 'node1', // 自环
          type: EdgeType.PREREQUISITE,
          weight: 1.0,
          isVisible: true,
          isDirected: true
        }
      ];

      const result = validateEdges(selfLoopEdges, nodes);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('不能连接到自身'))).toBe(true);
    });
  });

  describe('完整图谱验证', () => {
    it('应该能够验证完整的知识图谱', () => {
      const validGraph: KnowledgeGraph = {
        id: 'graph-id',
        userId: 'user-id',
        name: '测试图谱',
        description: '这是一个测试图谱',
        type: GraphType.CUSTOM,
        subject: 'mathematics',
        gradeLevel: 'high',
        nodes: [
          {
            id: 'node1',
            label: '数学基础',
            type: NodeType.TOPIC,
            level: 1,
            position: { x: 0, y: 0 },
            metadata: { workCount: 0, reuseCount: 0 },
            isVisible: true,
            isLocked: false
          }
        ],
        edges: [],
        layout: {
          type: GraphLayout.FORCE,
          options: {}
        },
        view: {
          showLabels: true,
          showEdgeLabels: false,
          nodeSize: 'fixed',
          edgeWidth: 'fixed',
          colorScheme: 'default',
          theme: 'light',
          animations: true,
          minimap: true,
          toolbar: true
        },
        version: 1,
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = validateKnowledgeGraph(validGraph);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该能够检测图谱名称为空', () => {
      const invalidGraph: KnowledgeGraph = {
        id: 'graph-id',
        userId: 'user-id',
        name: '', // 空名称
        type: GraphType.CUSTOM,
        nodes: [],
        edges: [],
        layout: { type: GraphLayout.FORCE, options: {} },
        view: {
          showLabels: true,
          showEdgeLabels: false,
          nodeSize: 'fixed',
          edgeWidth: 'fixed',
          colorScheme: 'default',
          theme: 'light',
          animations: true,
          minimap: true,
          toolbar: true
        },
        version: 1,
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = validateKnowledgeGraph(invalidGraph);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('图谱名称不能为空'))).toBe(true);
    });
  });

  describe('辅助功能', () => {
    it('应该能够检测空图谱', () => {
      const emptyGraph: KnowledgeGraph = {
        id: 'graph-id',
        userId: 'user-id',
        name: '空图谱',
        type: GraphType.CUSTOM,
        nodes: [],
        edges: [],
        layout: { type: GraphLayout.FORCE, options: {} },
        view: {
          showLabels: true,
          showEdgeLabels: false,
          nodeSize: 'fixed',
          edgeWidth: 'fixed',
          colorScheme: 'default',
          theme: 'light',
          animations: true,
          minimap: true,
          toolbar: true
        },
        version: 1,
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(isEmptyGraph(emptyGraph)).toBe(true);
    });

    it('应该能够计算图谱复杂度', () => {
      const simpleGraph: KnowledgeGraph = {
        id: 'graph-id',
        userId: 'user-id',
        name: '简单图谱',
        type: GraphType.CUSTOM,
        nodes: [
          {
            id: 'node1',
            label: '节点1',
            type: NodeType.TOPIC,
            level: 1,
            position: { x: 0, y: 0 },
            metadata: { workCount: 0, reuseCount: 0 },
            isVisible: true,
            isLocked: false
          }
        ],
        edges: [],
        layout: { type: GraphLayout.FORCE, options: {} },
        view: {
          showLabels: true,
          showEdgeLabels: false,
          nodeSize: 'fixed',
          edgeWidth: 'fixed',
          colorScheme: 'default',
          theme: 'light',
          animations: true,
          minimap: true,
          toolbar: true
        },
        version: 1,
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // 添加必要的统计信息
      (simpleGraph as any).metadata = {
        statistics: {
          nodeCount: 1,
          edgeCount: 0,
          maxDepth: 1,
          workCount: 0
        }
      };

      const complexity = getGraphComplexityScore(simpleGraph);
      expect(typeof complexity).toBe('number');
      expect(complexity).toBeGreaterThanOrEqual(0);
      expect(complexity).toBeLessThanOrEqual(1);
    });

    it('应该能够快速验证图谱', () => {
      const nodes: GraphNode[] = [
        {
          id: 'node1',
          label: '节点1',
          type: NodeType.TOPIC,
          level: 1,
          position: { x: 0, y: 0 },
          metadata: { workCount: 0, reuseCount: 0 },
          isVisible: true,
          isLocked: false
        }
      ];

      const edges: GraphEdge[] = [
        {
          id: 'edge1',
          source: 'node1',
          target: 'nonexistent', // 不存在的节点
          type: EdgeType.PREREQUISITE,
          weight: 1.0,
          isVisible: true,
          isDirected: true
        }
      ];

      expect(quickValidateGraph(nodes, edges)).toBe(false);
    });
  });

  describe('数据类型验证', () => {
    it('应该验证节点类型枚举', () => {
      expect(Object.values(NodeType)).toContain(NodeType.TOPIC);
      expect(Object.values(NodeType)).toContain(NodeType.CONCEPT);
      expect(Object.values(NodeType)).toContain(NodeType.SKILL);
      expect(Object.values(NodeType)).toContain(NodeType.SUBJECT);
      expect(Object.values(NodeType)).toContain(NodeType.CHAPTER);
    });

    it('应该验证边类型枚举', () => {
      expect(Object.values(EdgeType)).toContain(EdgeType.PREREQUISITE);
      expect(Object.values(EdgeType)).toContain(EdgeType.RELATED);
      expect(Object.values(EdgeType)).toContain(EdgeType.CONTAINS);
      expect(Object.values(EdgeType)).toContain(EdgeType.EXTENDS);
      expect(Object.values(EdgeType)).toContain(EdgeType.APPLIES);
    });

    it('应该验证图谱类型枚举', () => {
      expect(Object.values(GraphType)).toContain(GraphType.PRESET);
      expect(Object.values(GraphType)).toContain(GraphType.CUSTOM);
      expect(Object.values(GraphType)).toContain(GraphType.HYBRID);
    });

    it('应该验证布局类型枚举', () => {
      expect(Object.values(GraphLayout)).toContain(GraphLayout.FORCE);
      expect(Object.values(GraphLayout)).toContain(GraphLayout.HIERARCHICAL);
      expect(Object.values(GraphLayout)).toContain(GraphLayout.CIRCULAR);
      expect(Object.values(GraphLayout)).toContain(GraphLayout.TREE);
      expect(Object.values(GraphLayout)).toContain(GraphLayout.GRID);
    });
  });
});