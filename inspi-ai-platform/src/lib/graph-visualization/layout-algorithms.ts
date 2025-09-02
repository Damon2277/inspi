/**
 * 图谱布局算法
 * 实现多种布局算法用于知识图谱可视化
 */
import * as d3 from 'd3'
import { D3Node, D3Edge, LayoutConfig, LayoutAlgorithm } from './types'

/**
 * 力导向布局算法
 */
export class ForceLayoutAlgorithm implements LayoutAlgorithm {
  name = 'force'
  private simulation: d3.Simulation<D3Node, D3Edge> | null = null

  apply(nodes: D3Node[], links: D3Edge[], config: LayoutConfig): void {
    const { width, height, options } = config

    // 停止之前的仿真
    this.stop()

    // 创建力仿真
    this.simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink<D3Node, D3Edge>(links)
        .id(d => d.id)
        .distance(options.linkDistance || 80)
        .strength(options.linkStrength || 0.5)
      )
      .force('charge', d3.forceManyBody()
        .strength(options.chargeStrength || -300)
      )
      .force('center', d3.forceCenter(width / 2, height / 2)
        .strength(options.centerStrength || 0.1)
      )
      .force('collision', d3.forceCollide()
        .radius(d => d.radius + (options.collisionRadius || 5))
        .strength(0.7)
      )
      .alpha(options.alpha || 0.3)
      .alphaDecay(options.alphaDecay || 0.02)
      .velocityDecay(options.velocityDecay || 0.4)
  }

  stop(): void {
    if (this.simulation) {
      this.simulation.stop()
      this.simulation = null
    }
  }

  getSimulation(): d3.Simulation<D3Node, D3Edge> | null {
    return this.simulation
  }
}

/**
 * 层次布局算法
 */
export class HierarchicalLayoutAlgorithm implements LayoutAlgorithm {
  name = 'hierarchical'

  apply(nodes: D3Node[], links: D3Edge[], config: LayoutConfig): void {
    const { width, height, options } = config
    const levelSpacing = options.levelSpacing || 150
    const nodeSpacing = options.nodeSpacing || 100

    // 按层级分组节点
    const nodesByLevel = new Map<number, D3Node[]>()
    nodes.forEach(node => {
      const level = node.level
      if (!nodesByLevel.has(level)) {
        nodesByLevel.set(level, [])
      }
      nodesByLevel.get(level)!.push(node)
    })

    // 计算每层的位置
    const levels = Array.from(nodesByLevel.keys()).sort((a, b) => a - b)
    const maxLevel = Math.max(...levels)
    
    levels.forEach(level => {
      const levelNodes = nodesByLevel.get(level)!
      const y = (height / (maxLevel + 1)) * (level + 1)
      
      // 在水平方向均匀分布节点
      levelNodes.forEach((node, index) => {
        const totalWidth = (levelNodes.length - 1) * nodeSpacing
        const startX = (width - totalWidth) / 2
        node.x = startX + index * nodeSpacing
        node.y = y
        node.fx = node.x
        node.fy = node.y
      })
    })
  }
}

/**
 * 环形布局算法
 */
export class CircularLayoutAlgorithm implements LayoutAlgorithm {
  name = 'circular'

  apply(nodes: D3Node[], links: D3Edge[], config: LayoutConfig): void {
    const { width, height, options } = config
    const centerX = width / 2
    const centerY = height / 2
    const radius = options.radius || Math.min(width, height) / 3
    const startAngle = options.startAngle || 0
    const endAngle = options.endAngle || 2 * Math.PI

    const angleStep = (endAngle - startAngle) / nodes.length

    nodes.forEach((node, index) => {
      const angle = startAngle + index * angleStep
      node.x = centerX + radius * Math.cos(angle)
      node.y = centerY + radius * Math.sin(angle)
      node.fx = node.x
      node.fy = node.y
    })
  }
}

/**
 * 树形布局算法
 */
export class TreeLayoutAlgorithm implements LayoutAlgorithm {
  name = 'tree'

  apply(nodes: D3Node[], links: D3Edge[], config: LayoutConfig): void {
    const { width, height } = config

    // 构建层次结构
    const hierarchy = this.buildHierarchy(nodes, links)
    
    if (!hierarchy) return

    // 创建树布局
    const treeLayout = d3.tree<D3Node>()
      .size([width - 100, height - 100])

    const root = treeLayout(hierarchy)

    // 应用位置
    root.descendants().forEach(d => {
      if (d.data) {
        d.data.x = d.x + 50
        d.data.y = d.y + 50
        d.data.fx = d.data.x
        d.data.fy = d.data.y
      }
    })
  }

  private buildHierarchy(nodes: D3Node[], links: D3Edge[]): d3.HierarchyNode<D3Node> | null {
    // 找到根节点（没有父节点的节点）
    const childrenMap = new Map<string, string[]>()
    const hasParent = new Set<string>()

    links.forEach(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source
      const targetId = typeof link.target === 'object' ? link.target.id : link.target
      
      if (!childrenMap.has(sourceId)) {
        childrenMap.set(sourceId, [])
      }
      childrenMap.get(sourceId)!.push(targetId)
      hasParent.add(targetId)
    })

    // 找到根节点
    const rootNodes = nodes.filter(node => !hasParent.has(node.id))
    if (rootNodes.length === 0) return null

    const root = rootNodes[0]

    // 递归构建层次结构
    const buildNode = (nodeId: string): d3.HierarchyNode<D3Node> => {
      const node = nodes.find(n => n.id === nodeId)!
      const children = childrenMap.get(nodeId) || []
      
      return {
        data: node,
        children: children.map(childId => buildNode(childId)),
        depth: 0,
        height: 0,
        parent: null
      } as d3.HierarchyNode<D3Node>
    }

    return d3.hierarchy(root, (d: D3Node) => {
      const children = childrenMap.get(d.id) || []
      return children.map(childId => nodes.find(n => n.id === childId)!).filter(Boolean)
    })
  }
}

/**
 * 网格布局算法
 */
export class GridLayoutAlgorithm implements LayoutAlgorithm {
  name = 'grid'

  apply(nodes: D3Node[], links: D3Edge[], config: LayoutConfig): void {
    const { width, height, options } = config
    const columns = options.columns || Math.ceil(Math.sqrt(nodes.length))
    const rows = Math.ceil(nodes.length / columns)
    const cellWidth = options.cellWidth || width / columns
    const cellHeight = options.cellHeight || height / rows

    nodes.forEach((node, index) => {
      const col = index % columns
      const row = Math.floor(index / columns)
      
      node.x = (col + 0.5) * cellWidth
      node.y = (row + 0.5) * cellHeight
      node.fx = node.x
      node.fy = node.y
    })
  }
}

/**
 * 布局管理器
 */
export class LayoutManager {
  private algorithms: Map<string, LayoutAlgorithm> = new Map()
  private currentAlgorithm: LayoutAlgorithm | null = null

  constructor() {
    // 注册默认布局算法
    this.registerAlgorithm(new ForceLayoutAlgorithm())
    this.registerAlgorithm(new HierarchicalLayoutAlgorithm())
    this.registerAlgorithm(new CircularLayoutAlgorithm())
    this.registerAlgorithm(new TreeLayoutAlgorithm())
    this.registerAlgorithm(new GridLayoutAlgorithm())
  }

  registerAlgorithm(algorithm: LayoutAlgorithm): void {
    this.algorithms.set(algorithm.name, algorithm)
  }

  getAlgorithm(name: string): LayoutAlgorithm | undefined {
    return this.algorithms.get(name)
  }

  applyLayout(
    layoutType: string,
    nodes: D3Node[],
    links: D3Edge[],
    config: LayoutConfig
  ): void {
    // 停止当前布局
    if (this.currentAlgorithm?.stop) {
      this.currentAlgorithm.stop()
    }

    // 应用新布局
    const algorithm = this.getAlgorithm(layoutType)
    if (algorithm) {
      this.currentAlgorithm = algorithm
      algorithm.apply(nodes, links, config)
    } else {
      console.warn(`Unknown layout algorithm: ${layoutType}`)
    }
  }

  stopCurrentLayout(): void {
    if (this.currentAlgorithm?.stop) {
      this.currentAlgorithm.stop()
      this.currentAlgorithm = null
    }
  }

  getCurrentSimulation(): d3.Simulation<D3Node, D3Edge> | null {
    if (this.currentAlgorithm instanceof ForceLayoutAlgorithm) {
      return this.currentAlgorithm.getSimulation()
    }
    return null
  }

  getAvailableLayouts(): string[] {
    return Array.from(this.algorithms.keys())
  }
}

// 导出单例实例
export const layoutManager = new LayoutManager()

export default {
  ForceLayoutAlgorithm,
  HierarchicalLayoutAlgorithm,
  CircularLayoutAlgorithm,
  TreeLayoutAlgorithm,
  GridLayoutAlgorithm,
  LayoutManager,
  layoutManager
}