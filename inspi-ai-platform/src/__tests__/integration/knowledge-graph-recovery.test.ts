/**
 * 知识图谱可视化恢复集成测试
 * 测试Task3的所有功能实现
 */
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

import {
  D3GraphRenderer,
  GraphDataManager,
  GraphInteractionManager,
  layoutManager,
  transformGraphData,
  DEFAULT_VISUAL_CONFIG,
} from '@/core/graph';
import {
  KnowledgeGraph,
  GraphNode,
  GraphEdge,
  NodeType,
  EdgeType,
  GraphType,
  GraphLayout,
} from '@/shared/types/knowledgeGraph';

// Mock D3.js
const mockD3 = {
  select: jest.fn(() => mockD3),
  selectAll: jest.fn(() => mockD3),
  append: jest.fn(() => mockD3),
  attr: jest.fn(() => mockD3),
  style: jest.fn(() => mockD3),
  data: jest.fn(() => mockD3),
  enter: jest.fn(() => mockD3),
  exit: jest.fn(() => mockD3),
  remove: jest.fn(() => mockD3),
  on: jest.fn(() => mockD3),
  call: jest.fn(() => mockD3),
  transition: jest.fn(() => mockD3),
  duration: jest.fn(() => mockD3),
  ease: jest.fn(() => mockD3),
  node: jest.fn(() => []),
  nodes: jest.fn(() => mockD3),
  links: jest.fn(() => mockD3),
  force: jest.fn(() => mockD3),
  stop: jest.fn(() => mockD3),
  restart: jest.fn(() => mockD3),
  alpha: jest.fn(() => mockD3),
  alphaTarget: jest.fn(() => mockD3),
  zoom: jest.fn(() => mockD3),
  scaleExtent: jest.fn(() => mockD3),
  extent: jest.fn(() => mockD3),
  transform: jest.fn(),
  event: { transform: { x: 0, y: 0, k: 1 } },
  forceSimulation: jest.fn(() => mockD3),
  forceLink: jest.fn(() => mockD3),
  forceManyBody: jest.fn(() => mockD3),
  forceCenter: jest.fn(() => mockD3),
  forceCollide: jest.fn(() => mockD3),
  drag: jest.fn(() => mockD3),
  zoomIdentity: { x: 0, y: 0, k: 1 },
  hierarchy: jest.fn(),
  tree: jest.fn(() => ({ size: jest.fn(() => ({ descendants: jest.fn(() => []) })) })),
  interpolate: jest.fn(() => jest.fn()),
};

jest.mock('d3', () => mockD3);

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock DOM
Object.defineProperty(global, 'localStorage', {
  value: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  },
  writable: true,
});

describe('Task3: 知识图谱可视化恢复', () => {
  let testGraph: KnowledgeGraph;
  let testNodes: GraphNode[];
  let testEdges: GraphEdge[];
  let mockContainer: HTMLDivElement;

  beforeEach(() => {
    // 创建测试数据
    testNodes = [
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
      {
        id: 'node3',
        label: '线性方程',
        type: NodeType.CONCEPT,
        level: 2,
        parentId: 'node2',
        position: { x: 300, y: 200 },
        metadata: { workCount: 8, reuseCount: 4 },
        isVisible: true,
        isLocked: false,
      },
    ];

    testEdges = [
      {
        id: 'edge1',
        source: 'node1',
        target: 'node2',
        type: EdgeType.CONTAINS,
        weight: 1,
        isVisible: true,
        isDirected: true,
      },
      {
        id: 'edge2',
        source: 'node2',
        target: 'node3',
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

    // 创建模拟DOM容器
    mockContainer = document.createElement('div');
    mockContainer.style.width = '800px';
    mockContainer.style.height = '600px';
    document.body.appendChild(mockContainer);

    // 重置所有mock
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (mockContainer && mockContainer.parentNode) {
      mockContainer.parentNode.removeChild(mockContainer);
    }
  });

  describe('3.1 D3.js图谱渲染引擎', () => {
    it('应该能够创建D3GraphRenderer实例', () => {
      const visualizationData = transformGraphData(testNodes, testEdges, DEFAULT_VISUAL_CONFIG);

      expect(() => {
        new D3GraphRenderer({
          container: mockContainer,
          layout: {
            type: 'force',
            width: 800,
            height: 600,
            options: {},
          },
          visual: DEFAULT_VISUAL_CONFIG,
          interaction: {
            zoom: { enabled: true, scaleExtent: [0.1, 3] },
            drag: { enabled: true, constrainToCanvas: false, snapToGrid: false, gridSize: 20 },
            selection: { enabled: true, multiSelect: true, selectOnClick: true },
            tooltip: { enabled: true, delay: 500, offset: { x: 10, y: -10 } },
          },
          data: visualizationData,
        });
      }).not.toThrow();
    });

    it('应该能够渲染节点和边', () => {
      const visualizationData = transformGraphData(testNodes, testEdges, DEFAULT_VISUAL_CONFIG);
      const renderer = new D3GraphRenderer({
        container: mockContainer,
        layout: {
          type: 'force',
          width: 800,
          height: 600,
          options: {},
        },
        visual: DEFAULT_VISUAL_CONFIG,
        interaction: {
          zoom: { enabled: true, scaleExtent: [0.1, 3] },
          drag: { enabled: true, constrainToCanvas: false, snapToGrid: false, gridSize: 20 },
          selection: { enabled: true, multiSelect: true, selectOnClick: true },
          tooltip: { enabled: true, delay: 500, offset: { x: 10, y: -10 } },
        },
        data: visualizationData,
      });

      // 验证D3方法被调用
      expect(mockD3.select).toHaveBeenCalled();
      expect(mockD3.append).toHaveBeenCalledWith('svg');
      expect(mockD3.selectAll).toHaveBeenCalled();

      renderer.destroy();
    });

    it('应该支持缩放和平移功能', () => {
      const visualizationData = transformGraphData(testNodes, testEdges, DEFAULT_VISUAL_CONFIG);
      const renderer = new D3GraphRenderer({
        container: mockContainer,
        layout: {
          type: 'force',
          width: 800,
          height: 600,
          options: {},
        },
        visual: DEFAULT_VISUAL_CONFIG,
        interaction: {
          zoom: { enabled: true, scaleExtent: [0.1, 3] },
          drag: { enabled: true, constrainToCanvas: false, snapToGrid: false, gridSize: 20 },
          selection: { enabled: true, multiSelect: true, selectOnClick: true },
          tooltip: { enabled: true, delay: 500, offset: { x: 10, y: -10 } },
        },
        data: visualizationData,
      });

      // 测试缩放功能
      renderer.zoomToFit();
      renderer.centerView();
      renderer.zoomToNodes(['node1', 'node2']);

      // 验证缩放相关方法被调用
      expect(mockD3.zoom).toHaveBeenCalled();
      expect(mockD3.scaleExtent).toHaveBeenCalledWith([0.1, 3]);

      renderer.destroy();
    });

    it('应该支持节点和边的选择', () => {
      const visualizationData = transformGraphData(testNodes, testEdges, DEFAULT_VISUAL_CONFIG);
      const renderer = new D3GraphRenderer({
        container: mockContainer,
        layout: {
          type: 'force',
          width: 800,
          height: 600,
          options: {},
        },
        visual: DEFAULT_VISUAL_CONFIG,
        interaction: {
          zoom: { enabled: true, scaleExtent: [0.1, 3] },
          drag: { enabled: true, constrainToCanvas: false, snapToGrid: false, gridSize: 20 },
          selection: { enabled: true, multiSelect: true, selectOnClick: true },
          tooltip: { enabled: true, delay: 500, offset: { x: 10, y: -10 } },
        },
        data: visualizationData,
      });

      // 测试选择功能
      renderer.selectNodes(['node1']);
      renderer.selectEdges(['edge1']);

      let selection = renderer.getSelection();
      expect(selection.nodes).toContain('node1');
      expect(selection.edges).toContain('edge1');

      renderer.clearSelection();
      selection = renderer.getSelection();
      expect(selection.nodes).toHaveLength(0);
      expect(selection.edges).toHaveLength(0);

      renderer.destroy();
    });
  });

  describe('3.2 图谱数据管理系统', () => {
    let dataManager: GraphDataManager;

    beforeEach(() => {
      dataManager = new GraphDataManager(testGraph);
    });

    it('应该能够创建和管理节点', () => {
      // 创建新节点
      const newNode = dataManager.createNode({
        label: '几何',
        type: NodeType.CHAPTER,
        parentId: 'node1',
        position: { x: 150, y: 250 },
      });

      expect(newNode.label).toBe('几何');
      expect(newNode.type).toBe(NodeType.CHAPTER);
      expect(newNode.level).toBe(1); // 应该基于父节点计算层级

      // 获取节点
      const retrievedNode = dataManager.getNode(newNode.id);
      expect(retrievedNode).toBeDefined();
      expect(retrievedNode!.label).toBe('几何');

      // 更新节点
      const updatedNode = dataManager.updateNode(newNode.id, {
        label: '平面几何',
        metadata: { workCount: 2, reuseCount: 0 },
      });
      expect(updatedNode.label).toBe('平面几何');
      expect(updatedNode.metadata.workCount).toBe(2);

      // 删除节点
      dataManager.deleteNode(newNode.id);
      expect(dataManager.getNode(newNode.id)).toBeUndefined();
    });

    it('应该能够创建和管理边', () => {
      // 创建新边
      const newEdge = dataManager.createEdge({
        source: 'node1',
        target: 'node3',
        type: EdgeType.RELATED,
        weight: 0.8,
      });

      expect(newEdge.source).toBe('node1');
      expect(newEdge.target).toBe('node3');
      expect(newEdge.type).toBe(EdgeType.RELATED);
      expect(newEdge.weight).toBe(0.8);

      // 获取边
      const retrievedEdge = dataManager.getEdge(newEdge.id);
      expect(retrievedEdge).toBeDefined();

      // 获取节点的所有边
      const nodeEdges = dataManager.getNodeEdges('node1');
      expect(nodeEdges.length).toBeGreaterThan(0);

      // 删除边
      dataManager.deleteEdge(newEdge.id);
      expect(dataManager.getEdge(newEdge.id)).toBeUndefined();
    });

    it('应该支持搜索和查询功能', () => {
      // 搜索节点
      const searchResults = dataManager.searchNodes('数学');
      expect(searchResults.length).toBeGreaterThan(0);
      expect(searchResults[0].label).toContain('数学');

      // 带过滤器的搜索
      const filteredResults = dataManager.searchNodes('', {
        types: [NodeType.CONCEPT],
        hasWorks: true,
      });
      expect(filteredResults.every(node => node.type === NodeType.CONCEPT)).toBe(true);
      expect(filteredResults.every(node => node.metadata.workCount > 0)).toBe(true);
    });

    it('应该提供图谱统计信息', () => {
      const stats = dataManager.getStatistics();

      expect(stats.nodeCount).toBe(testNodes.length);
      expect(stats.edgeCount).toBe(testEdges.length);
      expect(stats.nodesByType).toBeDefined();
      expect(stats.edgesByType).toBeDefined();
      expect(stats.maxDepth).toBeGreaterThanOrEqual(0);
      expect(stats.averageDegree).toBeGreaterThanOrEqual(0);
      expect(stats.density).toBeGreaterThanOrEqual(0);
    });

    it('应该支持版本控制和撤销操作', () => {
      const initialVersion = dataManager.getGraph().version;

      // 执行操作
      const newNode = dataManager.createNode({
        label: '测试节点',
        type: NodeType.CONCEPT,
      });

      expect(dataManager.getGraph().version).toBe(initialVersion + 1);

      // 获取操作历史
      const history = dataManager.getOperationHistory();
      expect(history.length).toBeGreaterThan(0);

      // 撤销操作
      const undoResult = dataManager.undo();
      expect(undoResult).toBe(true);
      expect(dataManager.getNode(newNode.id)).toBeUndefined();
    });

    it('应该支持导入导出功能', () => {
      // 导出为JSON
      const jsonData = dataManager.exportGraph('json');
      expect(jsonData).toBeDefined();
      expect(() => JSON.parse(jsonData)).not.toThrow();

      // 导出为GraphML
      const graphmlData = dataManager.exportGraph('graphml');
      expect(graphmlData).toContain('<?xml version="1.0"');
      expect(graphmlData).toContain('<graphml');

      // 导出为GEXF
      const gexfData = dataManager.exportGraph('gexf');
      expect(gexfData).toContain('<?xml version="1.0"');
      expect(gexfData).toContain('<gexf');
    });

    it('应该验证图谱完整性', () => {
      const validation = dataManager.validate();
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);

      // 创建无效数据测试
      const invalidGraph = { ...testGraph };
      invalidGraph.edges.push({
        id: 'invalid-edge',
        source: 'non-existent-node',
        target: 'node1',
        type: EdgeType.RELATED,
        weight: 1,
        isVisible: true,
        isDirected: true,
      });

      const invalidDataManager = new GraphDataManager(invalidGraph);
      const invalidValidation = invalidDataManager.validate();
      expect(invalidValidation.isValid).toBe(false);
      expect(invalidValidation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('3.3 图谱布局算法', () => {
    it('应该支持多种布局算法', () => {
      const algorithms = layoutManager.getAlgorithmNames();

      expect(algorithms).toContain('force');
      expect(algorithms).toContain('hierarchical');
      expect(algorithms).toContain('circular');
      expect(algorithms).toContain('tree');
      expect(algorithms).toContain('grid');
      expect(algorithms).toContain('radial');
    });

    it('应该能够应用力导向布局', () => {
      const visualizationData = transformGraphData(testNodes, testEdges, DEFAULT_VISUAL_CONFIG);

      expect(() => {
        layoutManager.applyLayout('force', visualizationData.nodes, visualizationData.links, {
          type: 'force',
          width: 800,
          height: 600,
          options: {
            linkDistance: 80,
            linkStrength: 0.5,
            chargeStrength: -300,
          },
        });
      }).not.toThrow();

      // 验证力导向仿真被创建
      expect(mockD3.forceSimulation).toHaveBeenCalled();
      expect(mockD3.forceLink).toHaveBeenCalled();
      expect(mockD3.forceManyBody).toHaveBeenCalled();
      expect(mockD3.forceCenter).toHaveBeenCalled();
    });

    it('应该能够应用层次布局', () => {
      const visualizationData = transformGraphData(testNodes, testEdges, DEFAULT_VISUAL_CONFIG);

      expect(() => {
        layoutManager.applyLayout('hierarchical', visualizationData.nodes, visualizationData.links, {
          type: 'hierarchical',
          width: 800,
          height: 600,
          options: {
            levelSpacing: 100,
            nodeSpacing: 80,
          },
        });
      }).not.toThrow();

      // 验证节点位置被设置
      visualizationData.nodes.forEach(node => {
        expect(node.fx).toBeDefined();
        expect(node.fy).toBeDefined();
      });
    });

    it('应该能够应用环形布局', () => {
      const visualizationData = transformGraphData(testNodes, testEdges, DEFAULT_VISUAL_CONFIG);

      expect(() => {
        layoutManager.applyLayout('circular', visualizationData.nodes, visualizationData.links, {
          type: 'circular',
          width: 800,
          height: 600,
          options: {
            radius: 200,
          },
        });
      }).not.toThrow();

      // 验证节点被排列成圆形
      visualizationData.nodes.forEach(node => {
        expect(node.fx).toBeDefined();
        expect(node.fy).toBeDefined();
        // 验证节点在圆形范围内
        const centerX = 400;
        const centerY = 300;
        const distance = Math.sqrt(Math.pow(node.fx! - centerX, 2) + Math.pow(node.fy! - centerY, 2));
        expect(distance).toBeLessThanOrEqual(220); // 半径 + 一些容差
      });
    });

    it('应该提供布局性能估算', () => {
      const performance = layoutManager.estimatePerformance('force', 100, 150);

      expect(performance.complexity).toBeDefined();
      expect(performance.estimatedTime).toBeGreaterThan(0);
      expect(performance.memoryUsage).toBeDefined();
      expect(['low', 'medium', 'high']).toContain(performance.complexity);
      expect(['low', 'medium', 'high']).toContain(performance.memoryUsage);
    });

    it('应该提供布局推荐', () => {
      const recommendation1 = layoutManager.getRecommendedLayout(5, 4, false);
      expect(recommendation1).toBe('circular');

      const recommendation2 = layoutManager.getRecommendedLayout(30, 25, true);
      expect(recommendation2).toBe('hierarchical');

      const recommendation3 = layoutManager.getRecommendedLayout(80, 120, false);
      expect(recommendation3).toBe('force');

      const recommendation4 = layoutManager.getRecommendedLayout(200, 300, false);
      expect(recommendation4).toBe('grid');
    });
  });

  describe('3.4 图谱交互功能', () => {
    let dataManager: GraphDataManager;
    let interactionManager: GraphInteractionManager;

    beforeEach(() => {
      dataManager = new GraphDataManager(testGraph);
      interactionManager = new GraphInteractionManager(dataManager);
    });

    afterEach(() => {
      interactionManager.destroy();
    });

    it('应该支持节点和边的选择', () => {
      // 选择节点
      interactionManager.selectNodes(['node1', 'node2']);
      let selection = interactionManager.getSelection();
      expect(selection.nodes).toEqual(['node1', 'node2']);
      expect(selection.lastSelected).toBe('node');

      // 选择边
      interactionManager.selectEdges(['edge1']);
      selection = interactionManager.getSelection();
      expect(selection.edges).toEqual(['edge1']);
      expect(selection.lastSelected).toBe('edge');

      // 切换选择
      interactionManager.toggleNodeSelection('node3');
      selection = interactionManager.getSelection();
      expect(selection.nodes).toContain('node3');

      // 清除选择
      interactionManager.clearSelection();
      selection = interactionManager.getSelection();
      expect(selection.nodes).toHaveLength(0);
      expect(selection.edges).toHaveLength(0);
    });

    it('应该支持搜索和过滤', () => {
      // 搜索节点
      const searchResults = interactionManager.searchNodes('数学');
      expect(searchResults.length).toBeGreaterThan(0);

      // 设置过滤器
      interactionManager.setFilter({
        nodeTypes: [NodeType.CONCEPT],
        hasWorks: true,
      });

      const filter = interactionManager.getFilter();
      expect(filter.nodeTypes).toContain(NodeType.CONCEPT);
      expect(filter.hasWorks).toBe(true);

      // 获取过滤后的数据
      const filteredData = interactionManager.getFilteredData();
      expect(filteredData.nodes.length).toBeLessThanOrEqual(testNodes.length);
    });

    it('应该支持编辑模式', () => {
      // 设置编辑模式
      interactionManager.setEditMode('create_node');
      let editState = interactionManager.getEditState();
      expect(editState.mode).toBe('create_node');

      // 创建节点
      const newNode = interactionManager.finishCreateNode({
        label: '新节点',
        type: NodeType.CONCEPT,
        position: { x: 400, y: 300 },
      });
      expect(newNode.label).toBe('新节点');

      // 开始创建边
      interactionManager.startCreateEdge('node1');
      editState = interactionManager.getEditState();
      expect(editState.mode).toBe('create_edge');
      expect(editState.pendingEdge?.source).toBe('node1');

      // 完成创建边
      const newEdge = interactionManager.finishCreateEdge('node2', EdgeType.RELATED);
      expect(newEdge?.source).toBe('node1');
      expect(newEdge?.target).toBe('node2');
    });

    it('应该支持复制粘贴操作', () => {
      // 选择节点
      interactionManager.selectNodes(['node1']);

      // 复制
      interactionManager.copySelected();

      // 验证剪贴板数据
      const clipboardData = localStorage.getItem('graph-clipboard');
      expect(clipboardData).toBeDefined();

      // 粘贴
      interactionManager.paste({ x: 50, y: 50 });

      // 验证新节点被创建（通过图谱变化事件）
      const updatedGraph = dataManager.getGraph();
      expect(updatedGraph.nodes.length).toBeGreaterThan(testNodes.length);
    });

    it('应该支持图谱分析功能', () => {
      // 查找最短路径
      const path = interactionManager.findShortestPath('node1', 'node3');
      expect(path).toBeDefined();
      expect(path).toContain('node1');
      expect(path).toContain('node3');

      // 获取节点度数
      const degree = interactionManager.getNodeDegree('node1');
      expect(degree.totalDegree).toBeGreaterThanOrEqual(0);
      expect(degree.inDegree).toBeGreaterThanOrEqual(0);
      expect(degree.outDegree).toBeGreaterThanOrEqual(0);

      // 获取连通分量
      const components = interactionManager.getConnectedComponents();
      expect(components).toBeDefined();
      expect(components.length).toBeGreaterThan(0);
    });

    it('应该支持快捷操作', () => {
      // 全选
      interactionManager.selectAll();
      let selection = interactionManager.getSelection();
      expect(selection.nodes.length).toBe(testNodes.length);
      expect(selection.edges.length).toBe(testEdges.length);

      // 反选
      interactionManager.selectNodes(['node1']); // 先选择一个节点
      interactionManager.invertSelection();
      selection = interactionManager.getSelection();
      expect(selection.nodes).not.toContain('node1');
      expect(selection.nodes.length).toBe(testNodes.length - 1);

      // 选择相邻节点
      interactionManager.clearSelection();
      interactionManager.selectNeighbors('node1');
      selection = interactionManager.getSelection();
      expect(selection.nodes.length).toBeGreaterThan(0);
    });
  });

  describe('集成测试', () => {
    it('应该能够完整地创建和操作知识图谱', () => {
      // 创建数据管理器
      const dataManager = new GraphDataManager(testGraph);

      // 创建交互管理器
      const interactionManager = new GraphInteractionManager(dataManager);

      // 创建渲染器
      const visualizationData = dataManager.getVisualizationData();
      const renderer = new D3GraphRenderer({
        container: mockContainer,
        layout: {
          type: 'force',
          width: 800,
          height: 600,
          options: {},
        },
        visual: DEFAULT_VISUAL_CONFIG,
        interaction: {
          zoom: { enabled: true, scaleExtent: [0.1, 3] },
          drag: { enabled: true, constrainToCanvas: false, snapToGrid: false, gridSize: 20 },
          selection: { enabled: true, multiSelect: true, selectOnClick: true },
          tooltip: { enabled: true, delay: 500, offset: { x: 10, y: -10 } },
        },
        data: visualizationData,
      });

      // 执行一系列操作
      const newNode = dataManager.createNode({
        label: '统计学',
        type: NodeType.CHAPTER,
        parentId: 'node1',
      });

      const newEdge = dataManager.createEdge({
        source: 'node1',
        target: newNode.id,
        type: EdgeType.CONTAINS,
      });

      // 更新渲染器
      const updatedData = dataManager.getVisualizationData();
      renderer.update(updatedData);

      // 测试交互
      interactionManager.selectNodes([newNode.id]);
      interactionManager.searchNodes('统计');

      // 应用不同布局
      layoutManager.applyLayout('hierarchical', updatedData.nodes, updatedData.links, {
        type: 'hierarchical',
        width: 800,
        height: 600,
        options: {},
      });

      // 验证所有组件正常工作
      expect(dataManager.getGraph().nodes.length).toBe(testNodes.length + 1);
      expect(dataManager.getGraph().edges.length).toBe(testEdges.length + 1);
      expect(interactionManager.getSelection().nodes).toContain(newNode.id);

      // 清理
      renderer.destroy();
      interactionManager.destroy();
    });

    it('应该能够处理大规模图谱数据', () => {
      // 创建大规模测试数据
      const largeNodes: GraphNode[] = [];
      const largeEdges: GraphEdge[] = [];

      for (let i = 0; i < 100; i++) {
        largeNodes.push({
          id: `node${i}`,
          label: `节点${i}`,
          type: NodeType.CONCEPT,
          level: Math.floor(i / 20),
          position: { x: Math.random() * 800, y: Math.random() * 600 },
          metadata: { workCount: Math.floor(Math.random() * 10), reuseCount: 0 },
          isVisible: true,
          isLocked: false,
        });

        if (i > 0) {
          largeEdges.push({
            id: `edge${i}`,
            source: `node${Math.floor(Math.random() * i)}`,
            target: `node${i}`,
            type: EdgeType.RELATED,
            weight: Math.random(),
            isVisible: true,
            isDirected: true,
          });
        }
      }

      const largeGraph = {
        ...testGraph,
        nodes: largeNodes,
        edges: largeEdges,
      };

      // 测试性能
      const startTime = Date.now();

      const dataManager = new GraphDataManager(largeGraph);
      const visualizationData = dataManager.getVisualizationData();

      expect(visualizationData.nodes.length).toBe(100);
      expect(visualizationData.links.length).toBe(99);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // 验证处理时间合理（应该在1秒内完成）
      expect(processingTime).toBeLessThan(1000);

      // 测试搜索性能
      const searchStartTime = Date.now();
      const searchResults = dataManager.searchNodes('节点1');
      const searchEndTime = Date.now();

      expect(searchResults.length).toBeGreaterThan(0);
      expect(searchEndTime - searchStartTime).toBeLessThan(100);
    });
  });
});
