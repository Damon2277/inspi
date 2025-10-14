/**
 * 图谱可视化简单测试
 * 测试核心功能而不依赖复杂的工厂类
 */
import { describe, it, expect } from '@jest/globals';

import { transformGraphData } from '@/core/graph/d3-utils';
import { DEFAULT_VISUAL_CONFIG } from '@/core/graph/types';
import { GraphNode, GraphEdge } from '@/shared/types/knowledgeGraph';

describe('图谱可视化核心功能', () => {
  describe('数据转换', () => {
    it('应该正确转换基础图谱数据', () => {
      const nodes: GraphNode[] = [
        {
          id: 'node1',
          label: '数学',
          type: 'subject',
          level: 0,
          description: '数学学科',
          isVisible: true,
          position: { x: 0, y: 0 },
          metadata: { workCount: 5 },
        },
        {
          id: 'node2',
          label: '代数',
          type: 'chapter',
          level: 1,
          description: '代数章节',
          isVisible: true,
          position: { x: 100, y: 100 },
          metadata: { workCount: 3 },
        },
      ];

      const edges: GraphEdge[] = [
        {
          id: 'edge1',
          source: 'node1',
          target: 'node2',
          type: 'contains',
          weight: 1,
          isDirected: true,
          isVisible: true,
          metadata: { strength: 0.8 },
        },
      ];

      const visualizationData = transformGraphData(nodes, edges, DEFAULT_VISUAL_CONFIG);

      expect(visualizationData.nodes).toHaveLength(2);
      expect(visualizationData.links).toHaveLength(1);

      // 检查节点属性
      const d3Node1 = visualizationData.nodes.find(n => n.id === 'node1');
      expect(d3Node1).toBeDefined();
      expect(d3Node1?.label).toBe('数学');
      expect(d3Node1?.radius).toBeGreaterThan(0);
      expect(d3Node1?.color).toBeDefined();

      // 检查边属性
      const d3Edge1 = visualizationData.links.find(l => l.id === 'edge1');
      expect(d3Edge1).toBeDefined();
      expect(d3Edge1?.strokeWidth).toBeGreaterThan(0);
      expect(d3Edge1?.color).toBeDefined();
    });

    it('应该处理空数据', () => {
      const visualizationData = transformGraphData([], [], DEFAULT_VISUAL_CONFIG);

      expect(visualizationData.nodes).toHaveLength(0);
      expect(visualizationData.links).toHaveLength(0);
      expect(visualizationData.bounds).toBeDefined();
    });

    it('应该正确计算边界', () => {
      const nodes: GraphNode[] = [
        {
          id: 'node1',
          label: '节点1',
          type: 'concept',
          level: 0,
          description: '',
          isVisible: true,
          position: { x: -50, y: -30 },
          metadata: {},
        },
        {
          id: 'node2',
          label: '节点2',
          type: 'concept',
          level: 0,
          description: '',
          isVisible: true,
          position: { x: 100, y: 80 },
          metadata: {},
        },
      ];

      const visualizationData = transformGraphData(nodes, [], DEFAULT_VISUAL_CONFIG);

      expect(visualizationData.bounds.minX).toBe(-50);
      expect(visualizationData.bounds.maxX).toBe(100);
      expect(visualizationData.bounds.minY).toBe(-30);
      expect(visualizationData.bounds.maxY).toBe(80);
    });
  });

  describe('颜色和样式', () => {
    it('应该为不同类型的节点分配不同颜色', () => {
      const nodes: GraphNode[] = [
        {
          id: 'subject1',
          label: '学科',
          type: 'subject',
          level: 0,
          description: '',
          isVisible: true,
          position: { x: 0, y: 0 },
          metadata: {},
        },
        {
          id: 'chapter1',
          label: '章节',
          type: 'chapter',
          level: 1,
          description: '',
          isVisible: true,
          position: { x: 0, y: 0 },
          metadata: {},
        },
      ];

      const visualizationData = transformGraphData(nodes, [], DEFAULT_VISUAL_CONFIG);

      const subjectNode = visualizationData.nodes.find(n => n.type === 'subject');
      const chapterNode = visualizationData.nodes.find(n => n.type === 'chapter');

      expect(subjectNode?.color).not.toBe(chapterNode?.color);
    });

    it('应该根据工作数量调整节点大小', () => {
      const nodes: GraphNode[] = [
        {
          id: 'node1',
          label: '少量作品',
          type: 'concept',
          level: 0,
          description: '',
          isVisible: true,
          position: { x: 0, y: 0 },
          metadata: { workCount: 1 },
        },
        {
          id: 'node2',
          label: '大量作品',
          type: 'concept',
          level: 0,
          description: '',
          isVisible: true,
          position: { x: 0, y: 0 },
          metadata: { workCount: 20 },
        },
      ];

      const visualizationData = transformGraphData(nodes, [], DEFAULT_VISUAL_CONFIG);

      const smallNode = visualizationData.nodes.find(n => n.id === 'node1');
      const largeNode = visualizationData.nodes.find(n => n.id === 'node2');

      expect(largeNode?.radius).toBeGreaterThan(smallNode?.radius || 0);
    });
  });
});
