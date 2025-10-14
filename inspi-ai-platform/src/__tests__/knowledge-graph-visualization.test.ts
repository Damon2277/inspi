/**
 * 知识图谱可视化测试
 * 测试D3.js集成和基础渲染功能
 */
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

import { transformGraphData } from '@/core/graph/d3-utils';
import { layoutManager } from '@/core/graph/layout-algorithms';
import { DEFAULT_VISUAL_CONFIG } from '@/core/graph/types';

import { GraphNodeFactory, GraphEdgeFactory, ScenarioFactory } from './factories';

// Mock D3.js for testing
jest.mock('d3', () => ({
  select: jest.fn(() => ({
    append: jest.fn(() => ({
      attr: jest.fn().mockReturnThis(),
      style: jest.fn().mockReturnThis(),
      selectAll: jest.fn().mockReturnThis(),
      data: jest.fn().mockReturnThis(),
      enter: jest.fn().mockReturnThis(),
      exit: jest.fn(() => ({
        remove: jest.fn(),
      })),
      merge: jest.fn().mockReturnThis(),
      on: jest.fn().mockReturnThis(),
      call: jest.fn().mockReturnThis(),
      transition: jest.fn().mockReturnThis(),
      duration: jest.fn().mockReturnThis(),
      text: jest.fn().mockReturnThis(),
      html: jest.fn().mockReturnThis(),
      remove: jest.fn(),
    })),
    selectAll: jest.fn().mockReturnThis(),
    node: jest.fn(),
  })),
  forceSimulation: jest.fn(() => ({
    force: jest.fn().mockReturnThis(),
    alpha: jest.fn().mockReturnThis(),
    alphaDecay: jest.fn().mockReturnThis(),
    velocityDecay: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    stop: jest.fn(),
    restart: jest.fn().mockReturnThis(),
    alphaTarget: jest.fn().mockReturnThis(),
  })),
  forceLink: jest.fn(() => ({
    id: jest.fn().mockReturnThis(),
    distance: jest.fn().mockReturnThis(),
    strength: jest.fn().mockReturnThis(),
  })),
  forceManyBody: jest.fn(() => ({
    strength: jest.fn().mockReturnThis(),
  })),
  forceCenter: jest.fn(() => ({
    strength: jest.fn().mockReturnThis(),
  })),
  forceCollide: jest.fn(() => ({
    radius: jest.fn().mockReturnThis(),
    strength: jest.fn().mockReturnThis(),
  })),
  zoom: jest.fn(() => ({
    scaleExtent: jest.fn().mockReturnThis(),
    translateExtent: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
  })),
  drag: jest.fn(() => ({
    on: jest.fn().mockReturnThis(),
  })),
  zoomIdentity: {
    translate: jest.fn().mockReturnThis(),
    scale: jest.fn().mockReturnThis(),
  },
  interpolate: jest.fn((a, b) => (t: number) => a),
  tree: jest.fn(() => ({
    size: jest.fn().mockReturnThis(),
  })),
  hierarchy: jest.fn(),
}));

describe('知识图谱可视化', () => {
  describe('数据转换', () => {
    it('应该能够转换图谱数据为D3格式', () => {
      const nodes = GraphNodeFactory.createMany(3);
      const edges = GraphEdgeFactory.createMany(2, {
        source: nodes[0].id,
        target: nodes[1].id,
      });

      const visualizationData = transformGraphData(nodes, edges, DEFAULT_VISUAL_CONFIG);

      expect(visualizationData.nodes).toHaveLength(3);
      expect(visualizationData.links).toHaveLength(2);
      expect(visualizationData.bounds).toBeDefined();

      // 验证节点转换
      const d3Node = visualizationData.nodes[0];
      expect(d3Node.id).toBe(nodes[0].id);
      expect(d3Node.label).toBe(nodes[0].label);
      expect(d3Node.radius).toBeGreaterThan(0);
      expect(d3Node.color).toBeDefined();
      expect(d3Node.originalData).toBe(nodes[0]);

      // 验证边转换
      const d3Edge = visualizationData.links[0];
      expect(d3Edge.id).toBeDefined();
      expect(d3Edge.color).toBeDefined();
      expect(d3Edge.strokeWidth).toBeGreaterThan(0);
      expect(d3Edge.originalData).toBeDefined();
    });

    it('应该过滤无效的边', () => {
      const nodes = GraphNodeFactory.createMany(2);
      const edges = [
        GraphEdgeFactory.create({
          source: nodes[0].id,
          target: nodes[1].id,
        }),
        GraphEdgeFactory.create({
          source: 'invalid-source',
          target: nodes[1].id,
        }),
        GraphEdgeFactory.create({
          source: nodes[0].id,
          target: 'invalid-target',
        }),
      ];

      const visualizationData = transformGraphData(nodes, edges, DEFAULT_VISUAL_CONFIG);

      expect(visualizationData.nodes).toHaveLength(2);
      expect(visualizationData.links).toHaveLength(1); // 只有有效的边
    });

    it('应该正确计算节点半径', () => {
      const subjectNode = GraphNodeFactory.create({ type: 'subject' });
      const conceptNode = GraphNodeFactory.create({ type: 'concept' });
      const importantNode = GraphNodeFactory.create({
        type: 'topic',
        metadata: {
          ...GraphNodeFactory.create().metadata,
          importance: 0.9,
          workCount: 10,
        },
      });

      const visualizationData = transformGraphData(
        [subjectNode, conceptNode, importantNode],
        [],
        DEFAULT_VISUAL_CONFIG,
      );

      const d3Subject = visualizationData.nodes.find(n => n.type === 'subject')!;
      const d3Concept = visualizationData.nodes.find(n => n.type === 'concept')!;
      const d3Important = visualizationData.nodes.find(n => n.originalData.metadata.importance === 0.9)!;

      // 学科节点应该比概念节点大
      expect(d3Subject.radius).toBeGreaterThan(d3Concept.radius);

      // 重要节点应该比普通节点大
      expect(d3Important.radius).toBeGreaterThan(d3Concept.radius);
    });
  });

  describe('布局算法', () => {
    let nodes: any[];
    let links: any[];

    beforeEach(() => {
      const scenario = ScenarioFactory.createGraphWithNodes(5, 4);
      const visualizationData = transformGraphData(scenario.nodes, scenario.edges);
      nodes = visualizationData.nodes;
      links = visualizationData.links;
    });

    it('应该能够应用力导向布局', () => {
      const layoutConfig = {
        type: 'force' as const,
        width: 800,
        height: 600,
        options: {
          linkDistance: 80,
          chargeStrength: -300,
        },
      };

      expect(() => {
        layoutManager.applyLayout('force', nodes, links, layoutConfig);
      }).not.toThrow();

      const simulation = layoutManager.getCurrentSimulation();
      expect(simulation).toBeDefined();
    });

    it('应该能够应用层次布局', () => {
      const layoutConfig = {
        type: 'hierarchical' as const,
        width: 800,
        height: 600,
        options: {
          levelSpacing: 150,
          nodeSpacing: 100,
        },
      };

      expect(() => {
        layoutManager.applyLayout('hierarchical', nodes, links, layoutConfig);
      }).not.toThrow();

      // 验证节点位置被设置
      nodes.forEach(node => {
        expect(typeof node.x).toBe('number');
        expect(typeof node.y).toBe('number');
      });
    });

    it('应该能够应用环形布局', () => {
      const layoutConfig = {
        type: 'circular' as const,
        width: 800,
        height: 600,
        options: {
          radius: 200,
        },
      };

      expect(() => {
        layoutManager.applyLayout('circular', nodes, links, layoutConfig);
      }).not.toThrow();

      // 验证节点被放置在圆形上
      const centerX = 400;
      const centerY = 300;
      const radius = 200;

      nodes.forEach(node => {
        const distance = Math.sqrt(
          Math.pow(node.x - centerX, 2) + Math.pow(node.y - centerY, 2),
        );
        expect(Math.abs(distance - radius)).toBeLessThan(1);
      });
    });

    it('应该能够应用网格布局', () => {
      const layoutConfig = {
        type: 'grid' as const,
        width: 800,
        height: 600,
        options: {
          columns: 3,
          rows: 2,
        },
      };

      expect(() => {
        layoutManager.applyLayout('grid', nodes, links, layoutConfig);
      }).not.toThrow();

      // 验证节点位置在网格内
      nodes.forEach(node => {
        expect(node.x).toBeGreaterThan(0);
        expect(node.x).toBeLessThan(800);
        expect(node.y).toBeGreaterThan(0);
        expect(node.y).toBeLessThan(600);
      });
    });

    it('应该能够停止当前布局', () => {
      layoutManager.applyLayout('force', nodes, links, {
        type: 'force',
        width: 800,
        height: 600,
        options: {},
      });

      expect(() => {
        layoutManager.stopCurrentLayout();
      }).not.toThrow();

      expect(layoutManager.getCurrentSimulation()).toBeNull();
    });

    it('应该能够获取可用布局列表', () => {
      const layouts = layoutManager.getAvailableLayouts();

      expect(layouts).toContain('force');
      expect(layouts).toContain('hierarchical');
      expect(layouts).toContain('circular');
      expect(layouts).toContain('tree');
      expect(layouts).toContain('grid');
    });
  });

  describe('工具函数', () => {
    it('应该能够计算两点间距离', () => {
      const { distance } = require('@/core/graph/d3-utils');

      const p1 = { x: 0, y: 0 };
      const p2 = { x: 3, y: 4 };

      expect(distance(p1, p2)).toBe(5);
    });

    it('应该能够将点限制在矩形内', () => {
      const { constrainToRect } = require('@/core/graph/d3-utils');

      const point = { x: -10, y: 150 };
      const rect = { x: 0, y: 0, width: 100, height: 100 };

      const constrained = constrainToRect(point, rect);

      expect(constrained.x).toBe(0);
      expect(constrained.y).toBe(100);
    });

    it('应该能够将点对齐到网格', () => {
      const { snapToGrid } = require('@/core/graph/d3-utils');

      const point = { x: 23, y: 47 };
      const gridSize = 20;

      const snapped = snapToGrid(point, gridSize);

      expect(snapped.x).toBe(20);
      expect(snapped.y).toBe(40);
    });

    it('应该能够生成节点工具提示', () => {
      const { generateNodeTooltip } = require('@/core/graph/d3-utils');

      const node = {
        id: 'test-node',
        label: '测试节点',
        type: 'topic',
        level: 1,
        originalData: {
          metadata: {
            workCount: 5,
            description: '这是一个测试节点',
          },
        },
      };

      const tooltip = generateNodeTooltip(node);

      expect(tooltip).toContain('测试节点');
      expect(tooltip).toContain('topic');
      expect(tooltip).toContain('作品数: 5');
      expect(tooltip).toContain('这是一个测试节点');
    });

    it('应该能够生成边工具提示', () => {
      const { generateEdgeTooltip } = require('@/core/graph/d3-utils');

      const edge = {
        id: 'test-edge',
        source: { label: '源节点' },
        target: { label: '目标节点' },
        type: 'prerequisite',
        weight: 0.8,
        originalData: {
          metadata: {
            description: '前置关系',
          },
        },
      };

      const tooltip = generateEdgeTooltip(edge);

      expect(tooltip).toContain('源节点 → 目标节点');
      expect(tooltip).toContain('prerequisite');
      expect(tooltip).toContain('权重: 0.8');
      expect(tooltip).toContain('前置关系');
    });
  });

  describe('边界情况', () => {
    it('应该处理空数据', () => {
      const visualizationData = transformGraphData([], [], DEFAULT_VISUAL_CONFIG);

      expect(visualizationData.nodes).toHaveLength(0);
      expect(visualizationData.links).toHaveLength(0);
      expect(visualizationData.bounds).toEqual({
        minX: 0, maxX: 0, minY: 0, maxY: 0,
      });
    });

    it('应该处理只有节点没有边的情况', () => {
      const nodes = GraphNodeFactory.createMany(3);
      const visualizationData = transformGraphData(nodes, [], DEFAULT_VISUAL_CONFIG);

      expect(visualizationData.nodes).toHaveLength(3);
      expect(visualizationData.links).toHaveLength(0);
    });

    it('应该处理无效的布局类型', () => {
      const nodes = GraphNodeFactory.createMany(2);
      const links: any[] = [];

      // 应该不抛出错误，而是输出警告
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      layoutManager.applyLayout('invalid-layout', nodes, links, {
        type: 'invalid-layout' as any,
        width: 800,
        height: 600,
        options: {},
      });

      expect(consoleSpy).toHaveBeenCalledWith('Unknown layout algorithm: invalid-layout');

      consoleSpy.mockRestore();
    });
  });
});

describe('图谱渲染器集成', () => {
  // 由于D3GraphRenderer需要真实的DOM环境，这里主要测试配置和初始化
  it('应该能够创建渲染器配置', () => {
    const config = {
      container: document.createElement('div'),
      layout: {
        type: 'force' as const,
        width: 800,
        height: 600,
        options: {},
      },
      visual: DEFAULT_VISUAL_CONFIG,
      interaction: {
        zoom: { enabled: true, scaleExtent: [0.1, 3] as [number, number] },
        drag: { enabled: true, constrainToCanvas: false, snapToGrid: false, gridSize: 20 },
        selection: { enabled: true, multiSelect: true, selectOnClick: true },
        tooltip: { enabled: true, delay: 500, offset: { x: 10, y: -10 } },
      },
      data: {
        nodes: [],
        links: [],
        bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 },
      },
    };

    expect(config.container).toBeInstanceOf(HTMLDivElement);
    expect(config.layout.type).toBe('force');
    expect(config.visual).toBeDefined();
    expect(config.interaction.zoom.enabled).toBe(true);
    expect(config.data.nodes).toHaveLength(0);
  });
});
