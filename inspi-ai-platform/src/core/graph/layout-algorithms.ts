// D3 Force Simulation 类型定义
interface SimulationNode extends d3.SimulationNodeDatum {
  id: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
  [key: string]: any;
}

interface SimulationLink extends d3.SimulationLinkDatum<SimulationNode> {
  source: string | SimulationNode;
  target: string | SimulationNode;
  [key: string]: any;
}

/**
 * 图谱布局算法
 * 提供多种布局算法实现，包括力导向、层次、环形、树形和网格布局
 */
import * as d3 from 'd3';

import { D3Node, D3Edge, LayoutConfig, LayoutAlgorithm } from './types';

/**
 * 力导向布局算法
 */
export class ForceLayoutAlgorithm implements LayoutAlgorithm {
  name = 'force';
  private simulation: d3.Simulation<D3Node, D3Edge> | null = null;

  apply(nodes: D3Node[], links: D3Edge[], config: LayoutConfig): void {
    const { width, height, options } = config;

    // 停止现有仿真
    if (this.simulation) {
      this.simulation.stop();
    }

    // 创建新的仿真
    this.simulation = d3.forceSimulation<D3Node, D3Edge>(nodes as D3Node[])
      .force('link', d3.forceLink(links)
        .id((d: any) => d.id)
        .distance(options.linkDistance || 80)
        .strength(options.linkStrength || 0.5),
      )
      .force('charge', d3.forceManyBody()
        .strength(options.chargeStrength || -300),
      )
      .force('center', d3.forceCenter(width / 2, height / 2)
        .strength(options.centerStrength || 0.1),
      )
      .force('collision', d3.forceCollide()
        .radius((d: D3Node) => d.radius + (options.collisionRadius || 5)),
      )
      .alpha(options.alpha || 0.3)
      .alphaDecay(options.alphaDecay || 0.02)
      .velocityDecay(options.velocityDecay || 0.4);
  }

  stop(): void {
    if (this.simulation) {
      this.simulation.stop();
      this.simulation = null;
    }
  }
}

/**
 * 层次布局算法
 */
export class HierarchicalLayoutAlgorithm implements LayoutAlgorithm {
  name = 'hierarchical';

  apply(nodes: D3Node[], links: D3Edge[], config: LayoutConfig): void {
    const { width, height, options } = config;
    const levelSpacing = options.levelSpacing || 100;
    const nodeSpacing = options.nodeSpacing || 80;

    // 按层级分组节点
    const nodesByLevel = new Map<number, D3Node[]>();
    let maxLevel = 0;

    nodes.forEach(node => {
      const level = node.level;
      maxLevel = Math.max(maxLevel, level);

      if (!nodesByLevel.has(level)) {
        nodesByLevel.set(level, []);
      }
      nodesByLevel.get(level)!.push(node);
    });

    // 计算每层的位置
    const totalHeight = maxLevel * levelSpacing;
    const startY = (height - totalHeight) / 2;

    nodesByLevel.forEach((levelNodes, level) => {
      const y = startY + level * levelSpacing;
      const totalWidth = (levelNodes.length - 1) * nodeSpacing;
      const startX = (width - totalWidth) / 2;

      levelNodes.forEach((node, index) => {
        node.x = startX + index * nodeSpacing;
        node.y = y;
        node.fx = node.x;
        node.fy = node.y;
      });
    });
  }
}

/**
 * 环形布局算法
 */
export class CircularLayoutAlgorithm implements LayoutAlgorithm {
  name = 'circular';

  apply(nodes: D3Node[], links: D3Edge[], config: LayoutConfig): void {
    const { width, height, options } = config;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = options.radius || Math.min(width, height) / 3;
    const startAngle = options.startAngle || 0;
    const endAngle = options.endAngle || 2 * Math.PI;

    const angleStep = (endAngle - startAngle) / nodes.length;

    nodes.forEach((node, index) => {
      const angle = startAngle + index * angleStep;
      node.x = centerX + radius * Math.cos(angle);
      node.y = centerY + radius * Math.sin(angle);
      node.fx = node.x;
      node.fy = node.y;
    });
  }
}

/**
 * 树形布局算法
 */
export class TreeLayoutAlgorithm implements LayoutAlgorithm {
  name = 'tree';

  apply(nodes: D3Node[], links: D3Edge[], config: LayoutConfig): void {
    const { width, height } = config;

    // 构建层次结构
    const hierarchy = this.buildHierarchy(nodes, links);

    if (!hierarchy) {
      // 如果无法构建层次结构，回退到层次布局
      const hierarchical = new HierarchicalLayoutAlgorithm();
      hierarchical.apply(nodes, links, config);
      return;
    }

    // 创建树布局
    const treeLayout = d3.tree<D3Node>()
      .size([width - 100, height - 100]);

    // 应用布局
    const root = treeLayout(hierarchy);

    // 更新节点位置
    root.descendants().forEach(d => {
      const node = d.data;
      node.x = d.x! + 50;
      node.y = d.y! + 50;
      node.fx = node.x;
      node.fy = node.y;
    });
  }

  private buildHierarchy(nodes: D3Node[], links: D3Edge[]): d3.HierarchyNode<D3Node> | null {
    // 找到根节点（没有父节点的节点）
    const nodeMap = new Map(nodes.map(node => [node.id, node]));
    const childrenMap = new Map<string, string[]>();

    // 构建父子关系
    links.forEach(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;

      if (link.type === 'contains') {
        if (!childrenMap.has(sourceId)) {
          childrenMap.set(sourceId, []);
        }
        childrenMap.get(sourceId)!.push(targetId);
      }
    });

    // 找到根节点
    const hasParent = new Set<string>();
    childrenMap.forEach(children => {
      children.forEach(child => hasParent.add(child));
    });

    const rootNodes = nodes.filter(node => !hasParent.has(node.id));
    if (rootNodes.length === 0) return null;

    const root = rootNodes[0]; // 使用第一个根节点

    // 递归构建层次结构
    const buildNode = (nodeId: string): d3.HierarchyNode<D3Node> => {
      const node = nodeMap.get(nodeId)!;
      const children = childrenMap.get(nodeId) || [];

      return d3.hierarchy(node, () =>
        children.map(childId => buildNode(childId).data),
      );
    };

    return buildNode(root.id);
  }
}

/**
 * 网格布局算法
 */
export class GridLayoutAlgorithm implements LayoutAlgorithm {
  name = 'grid';

  apply(nodes: D3Node[], links: D3Edge[], config: LayoutConfig): void {
    const { width, height, options } = config;
    const columns = options.columns || Math.ceil(Math.sqrt(nodes.length));
    const rows = Math.ceil(nodes.length / columns);

    const cellWidth = options.cellWidth || width / columns;
    const cellHeight = options.cellHeight || height / rows;

    nodes.forEach((node, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);

      node.x = (col + 0.5) * cellWidth;
      node.y = (row + 0.5) * cellHeight;
      node.fx = node.x;
      node.fy = node.y;
    });
  }
}

/**
 * 径向布局算法
 */
export class RadialLayoutAlgorithm implements LayoutAlgorithm {
  name = 'radial';

  apply(nodes: D3Node[], links: D3Edge[], config: LayoutConfig): void {
    const { width, height } = config;
    const centerX = width / 2;
    const centerY = height / 2;

    // 按层级分组
    const nodesByLevel = new Map<number, D3Node[]>();
    let maxLevel = 0;

    nodes.forEach(node => {
      const level = node.level;
      maxLevel = Math.max(maxLevel, level);

      if (!nodesByLevel.has(level)) {
        nodesByLevel.set(level, []);
      }
      nodesByLevel.get(level)!.push(node);
    });

    // 计算每层的半径
    const maxRadius = Math.min(width, height) / 2 - 50;
    const radiusStep = maxRadius / (maxLevel + 1);

    nodesByLevel.forEach((levelNodes, level) => {
      const radius = (level + 1) * radiusStep;
      const angleStep = (2 * Math.PI) / levelNodes.length;

      levelNodes.forEach((node, index) => {
        const angle = index * angleStep;
        node.x = centerX + radius * Math.cos(angle);
        node.y = centerY + radius * Math.sin(angle);
        node.fx = node.x;
        node.fy = node.y;
      });
    });
  }
}

/**
 * 布局管理器
 */
export class LayoutManager {
  private algorithms: Map<string, LayoutAlgorithm> = new Map();
  private currentAlgorithm: LayoutAlgorithm | null = null;

  constructor() {
    // 注册内置算法
    this.registerAlgorithm(new ForceLayoutAlgorithm());
    this.registerAlgorithm(new HierarchicalLayoutAlgorithm());
    this.registerAlgorithm(new CircularLayoutAlgorithm());
    this.registerAlgorithm(new TreeLayoutAlgorithm());
    this.registerAlgorithm(new GridLayoutAlgorithm());
    this.registerAlgorithm(new RadialLayoutAlgorithm());
  }

  /**
   * 注册布局算法
   */
  registerAlgorithm(algorithm: LayoutAlgorithm): void {
    this.algorithms.set(algorithm.name, algorithm);
  }

  /**
   * 获取布局算法
   */
  getAlgorithm(name: string): LayoutAlgorithm | undefined {
    return this.algorithms.get(name);
  }

  /**
   * 获取所有算法名称
   */
  getAlgorithmNames(): string[] {
    return Array.from(this.algorithms.keys());
  }

  /**
   * 应用布局
   */
  applyLayout(
    algorithmName: string,
    nodes: D3Node[],
    links: D3Edge[],
    config: LayoutConfig,
  ): void {
    const algorithm = this.algorithms.get(algorithmName);
    if (!algorithm) {
      throw new Error(`Unknown layout algorithm: ${algorithmName}`);
    }

    // 停止当前算法
    if (this.currentAlgorithm && this.currentAlgorithm.stop) {
      this.currentAlgorithm.stop();
    }

    // 应用新算法
    this.currentAlgorithm = algorithm;
    algorithm.apply(nodes, links, config);
  }

  /**
   * 停止当前布局
   */
  stopCurrentLayout(): void {
    if (this.currentAlgorithm && this.currentAlgorithm.stop) {
      this.currentAlgorithm.stop();
      this.currentAlgorithm = null;
    }
  }

  /**
   * 获取推荐的布局算法
   */
  getRecommendedLayout(nodeCount: number, edgeCount: number, hasHierarchy: boolean): string {
    if (nodeCount <= 10) {
      return 'circular';
    } else if (hasHierarchy && nodeCount <= 50) {
      return 'hierarchical';
    } else if (nodeCount <= 100) {
      return 'force';
    } else {
      return 'grid';
    }
  }

  /**
   * 预计算布局性能
   */
  estimatePerformance(algorithmName: string, nodeCount: number, edgeCount: number): {
    complexity: 'low' | 'medium' | 'high'
    estimatedTime: number // 毫秒
    memoryUsage: 'low' | 'medium' | 'high'
  } {
    switch (algorithmName) {
      case 'force':
        return {
          complexity: nodeCount > 500 ? 'high' : nodeCount > 100 ? 'medium' : 'low',
          estimatedTime: nodeCount * edgeCount * 0.1,
          memoryUsage: nodeCount > 1000 ? 'high' : 'medium',
        };
      case 'hierarchical':
      case 'tree':
        return {
          complexity: 'low',
          estimatedTime: nodeCount * 2,
          memoryUsage: 'low',
        };
      case 'circular':
      case 'grid':
      case 'radial':
        return {
          complexity: 'low',
          estimatedTime: nodeCount,
          memoryUsage: 'low',
        };
      default:
        return {
          complexity: 'medium',
          estimatedTime: nodeCount * 10,
          memoryUsage: 'medium',
        };
    }
  }
}

// 导出单例实例
export const layoutManager = new LayoutManager();

// 导出所有算法类


export default layoutManager;
