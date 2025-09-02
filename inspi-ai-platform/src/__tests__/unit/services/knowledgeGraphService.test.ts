/**
 * 知识图谱服务测试
 */

import {
  validateGraphStructure,
  calculateGraphMetrics,
  generateGraphLayout,
  applyTemplate,
  findShortestPath,
  detectCycles,
  suggestConnections,
  optimizeLayout,
} from '@/lib/services/knowledgeGraphService'
import { createKnowledgeGraphFixture } from '@/fixtures'

// Mock D3.js
jest.mock('d3', () => ({
  forceSimulation: jest.fn(() => ({
    nodes: jest.fn().mockReturnThis(),
    force: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    stop: jest.fn().mockReturnThis(),
  })),
  forceLink: jest.fn(() => ({
    id: jest.fn().mockReturnThis(),
    distance: jest.fn().mockReturnThis(),
  })),
  forceManyBody: jest.fn(() => ({
    strength: jest.fn().mockReturnThis(),
  })),
  forceCenter: jest.fn(),
  forceCollide: jest.fn(() => ({
    radius: jest.fn().mockReturnThis(),
  })),
}))

describe('知识图谱服务测试', () => {
  describe('validateGraphStructure', () => {
    test('应该验证有效的图结构', () => {
      const validGraph = {
        nodes: [
          { id: 'node1', name: '节点1', x: 0, y: 0 },
          { id: 'node2', name: '节点2', x: 100, y: 100 },
        ],
        edges: [
          { source: 'node1', target: 'node2', type: 'related' },
        ],
      }

      const result = validateGraphStructure(validGraph)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('应该检测缺少必需字段的节点', () => {
      const invalidGraph = {
        nodes: [
          { id: 'node1', name: '节点1' }, // 缺少坐标
          { name: '节点2', x: 0, y: 0 }, // 缺少ID
        ],
        edges: [],
      }

      const result = validateGraphStructure(invalidGraph)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Node at index 0 is missing required coordinates')
      expect(result.errors).toContain('Node at index 1 is missing required id')
    })

    test('应该检测引用不存在节点的边', () => {
      const invalidGraph = {
        nodes: [
          { id: 'node1', name: '节点1', x: 0, y: 0 },
        ],
        edges: [
          { source: 'node1', target: 'nonexistent', type: 'related' },
        ],
      }

      const result = validateGraphStructure(invalidGraph)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Edge references non-existent target node: nonexistent')
    })

    test('应该检测重复的节点ID', () => {
      const invalidGraph = {
        nodes: [
          { id: 'duplicate', name: '节点1', x: 0, y: 0 },
          { id: 'duplicate', name: '节点2', x: 100, y: 100 },
        ],
        edges: [],
      }

      const result = validateGraphStructure(invalidGraph)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Duplicate node id: duplicate')
    })

    test('应该检测自环边', () => {
      const graphWithSelfLoop = {
        nodes: [
          { id: 'node1', name: '节点1', x: 0, y: 0 },
        ],
        edges: [
          { source: 'node1', target: 'node1', type: 'self' },
        ],
      }

      const result = validateGraphStructure(graphWithSelfLoop)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Self-loop detected: node1 -> node1')
    })

    test('应该验证边的类型', () => {
      const invalidGraph = {
        nodes: [
          { id: 'node1', name: '节点1', x: 0, y: 0 },
          { id: 'node2', name: '节点2', x: 100, y: 100 },
        ],
        edges: [
          { source: 'node1', target: 'node2', type: 'invalid-type' },
        ],
      }

      const result = validateGraphStructure(invalidGraph)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid edge type: invalid-type')
    })
  })

  describe('calculateGraphMetrics', () => {
    test('应该计算基本图指标', () => {
      const graph = {
        nodes: [
          { id: 'A', name: '节点A' },
          { id: 'B', name: '节点B' },
          { id: 'C', name: '节点C' },
        ],
        edges: [
          { source: 'A', target: 'B' },
          { source: 'B', target: 'C' },
        ],
      }

      const metrics = calculateGraphMetrics(graph)

      expect(metrics.nodeCount).toBe(3)
      expect(metrics.edgeCount).toBe(2)
      expect(metrics.density).toBeCloseTo(0.33, 2) // 2 / (3 * 2 / 2) = 0.33
      expect(metrics.avgDegree).toBeCloseTo(1.33, 2) // (2 + 2 + 1) / 3 = 1.33
    })

    test('应该计算连通分量', () => {
      const disconnectedGraph = {
        nodes: [
          { id: 'A', name: '节点A' },
          { id: 'B', name: '节点B' },
          { id: 'C', name: '节点C' },
          { id: 'D', name: '节点D' },
        ],
        edges: [
          { source: 'A', target: 'B' },
          { source: 'C', target: 'D' },
        ],
      }

      const metrics = calculateGraphMetrics(disconnectedGraph)

      expect(metrics.connectedComponents).toBe(2)
      expect(metrics.isConnected).toBe(false)
    })

    test('应该计算图的直径', () => {
      const linearGraph = {
        nodes: [
          { id: 'A', name: '节点A' },
          { id: 'B', name: '节点B' },
          { id: 'C', name: '节点C' },
          { id: 'D', name: '节点D' },
        ],
        edges: [
          { source: 'A', target: 'B' },
          { source: 'B', target: 'C' },
          { source: 'C', target: 'D' },
        ],
      }

      const metrics = calculateGraphMetrics(linearGraph)

      expect(metrics.diameter).toBe(3) // A到D的最短路径长度
    })

    test('应该处理空图', () => {
      const emptyGraph = {
        nodes: [],
        edges: [],
      }

      const metrics = calculateGraphMetrics(emptyGraph)

      expect(metrics.nodeCount).toBe(0)
      expect(metrics.edgeCount).toBe(0)
      expect(metrics.density).toBe(0)
      expect(metrics.avgDegree).toBe(0)
    })

    test('应该处理单节点图', () => {
      const singleNodeGraph = {
        nodes: [{ id: 'A', name: '单节点' }],
        edges: [],
      }

      const metrics = calculateGraphMetrics(singleNodeGraph)

      expect(metrics.nodeCount).toBe(1)
      expect(metrics.edgeCount).toBe(0)
      expect(metrics.density).toBe(0)
      expect(metrics.avgDegree).toBe(0)
      expect(metrics.diameter).toBe(0)
    })
  })

  describe('generateGraphLayout', () => {
    test('应该生成力导向布局', () => {
      const graph = {
        nodes: [
          { id: 'A', name: '节点A' },
          { id: 'B', name: '节点B' },
          { id: 'C', name: '节点C' },
        ],
        edges: [
          { source: 'A', target: 'B' },
          { source: 'B', target: 'C' },
        ],
      }

      const layout = generateGraphLayout(graph, { algorithm: 'force' })

      expect(layout.nodes).toHaveLength(3)
      expect(layout.edges).toHaveLength(2)
      
      // 验证节点有坐标
      layout.nodes.forEach(node => {
        expect(node).toHaveProperty('x')
        expect(node).toHaveProperty('y')
        expect(typeof node.x).toBe('number')
        expect(typeof node.y).toBe('number')
      })
    })

    test('应该生成层次布局', () => {
      const hierarchicalGraph = {
        nodes: [
          { id: 'root', name: '根节点', level: 0 },
          { id: 'child1', name: '子节点1', level: 1 },
          { id: 'child2', name: '子节点2', level: 1 },
          { id: 'grandchild', name: '孙节点', level: 2 },
        ],
        edges: [
          { source: 'root', target: 'child1' },
          { source: 'root', target: 'child2' },
          { source: 'child1', target: 'grandchild' },
        ],
      }

      const layout = generateGraphLayout(hierarchicalGraph, { algorithm: 'hierarchical' })

      expect(layout.nodes).toHaveLength(4)
      
      // 验证层次结构
      const rootNode = layout.nodes.find(n => n.id === 'root')
      const childNodes = layout.nodes.filter(n => n.id.startsWith('child'))
      
      expect(rootNode.y).toBeLessThan(childNodes[0].y)
      expect(rootNode.y).toBeLessThan(childNodes[1].y)
    })

    test('应该生成圆形布局', () => {
      const graph = {
        nodes: [
          { id: 'A', name: '节点A' },
          { id: 'B', name: '节点B' },
          { id: 'C', name: '节点C' },
          { id: 'D', name: '节点D' },
        ],
        edges: [],
      }

      const layout = generateGraphLayout(graph, { algorithm: 'circular' })

      expect(layout.nodes).toHaveLength(4)
      
      // 验证节点在圆周上
      const centerX = 0, centerY = 0, radius = 100
      layout.nodes.forEach(node => {
        const distance = Math.sqrt((node.x - centerX) ** 2 + (node.y - centerY) ** 2)
        expect(distance).toBeCloseTo(radius, 1)
      })
    })

    test('应该处理布局参数', () => {
      const graph = {
        nodes: [
          { id: 'A', name: '节点A' },
          { id: 'B', name: '节点B' },
        ],
        edges: [
          { source: 'A', target: 'B' },
        ],
      }

      const layout = generateGraphLayout(graph, {
        algorithm: 'force',
        width: 800,
        height: 600,
        iterations: 100,
      })

      expect(layout.nodes).toHaveLength(2)
      expect(layout.metadata.width).toBe(800)
      expect(layout.metadata.height).toBe(600)
      expect(layout.metadata.iterations).toBe(100)
    })
  })

  describe('applyTemplate', () => {
    test('应该应用数学知识图谱模板', () => {
      const template = applyTemplate('mathematics-basic')

      expect(template.nodes.length).toBeGreaterThan(0)
      expect(template.edges.length).toBeGreaterThan(0)
      
      // 验证数学相关节点
      const nodeNames = template.nodes.map(n => n.name)
      expect(nodeNames).toContain('代数')
      expect(nodeNames).toContain('几何')
      expect(nodeNames).toContain('统计')
    })

    test('应该应用科学知识图谱模板', () => {
      const template = applyTemplate('science-basic')

      expect(template.nodes.length).toBeGreaterThan(0)
      
      const nodeNames = template.nodes.map(n => n.name)
      expect(nodeNames).toContain('物理')
      expect(nodeNames).toContain('化学')
      expect(nodeNames).toContain('生物')
    })

    test('应该处理自定义模板参数', () => {
      const template = applyTemplate('mathematics-basic', {
        grade: 'high-school',
        complexity: 'advanced',
      })

      expect(template.nodes.length).toBeGreaterThan(0)
      expect(template.metadata.grade).toBe('high-school')
      expect(template.metadata.complexity).toBe('advanced')
    })

    test('应该处理不存在的模板', () => {
      expect(() => {
        applyTemplate('nonexistent-template')
      }).toThrow('Template not found: nonexistent-template')
    })

    test('应该生成正确的模板结构', () => {
      const template = applyTemplate('mathematics-basic')

      // 验证节点结构
      template.nodes.forEach(node => {
        expect(node).toHaveProperty('id')
        expect(node).toHaveProperty('name')
        expect(node).toHaveProperty('x')
        expect(node).toHaveProperty('y')
        expect(node).toHaveProperty('type')
      })

      // 验证边结构
      template.edges.forEach(edge => {
        expect(edge).toHaveProperty('source')
        expect(edge).toHaveProperty('target')
        expect(edge).toHaveProperty('type')
      })
    })
  })

  describe('findShortestPath', () => {
    test('应该找到两点间的最短路径', () => {
      const graph = {
        nodes: [
          { id: 'A', name: '节点A' },
          { id: 'B', name: '节点B' },
          { id: 'C', name: '节点C' },
          { id: 'D', name: '节点D' },
        ],
        edges: [
          { source: 'A', target: 'B' },
          { source: 'B', target: 'C' },
          { source: 'C', target: 'D' },
          { source: 'A', target: 'D' }, // 直接路径
        ],
      }

      const path = findShortestPath(graph, 'A', 'D')

      expect(path).toEqual(['A', 'D']) // 直接路径更短
      expect(path.length).toBe(2)
    })

    test('应该处理不连通的节点', () => {
      const graph = {
        nodes: [
          { id: 'A', name: '节点A' },
          { id: 'B', name: '节点B' },
          { id: 'C', name: '节点C' },
        ],
        edges: [
          { source: 'A', target: 'B' },
          // C是孤立节点
        ],
      }

      const path = findShortestPath(graph, 'A', 'C')

      expect(path).toBeNull() // 无路径
    })

    test('应该处理相同的起点和终点', () => {
      const graph = {
        nodes: [{ id: 'A', name: '节点A' }],
        edges: [],
      }

      const path = findShortestPath(graph, 'A', 'A')

      expect(path).toEqual(['A'])
    })

    test('应该处理不存在的节点', () => {
      const graph = {
        nodes: [{ id: 'A', name: '节点A' }],
        edges: [],
      }

      expect(() => {
        findShortestPath(graph, 'A', 'nonexistent')
      }).toThrow('Node not found: nonexistent')
    })
  })

  describe('detectCycles', () => {
    test('应该检测有向图中的环', () => {
      const cyclicGraph = {
        nodes: [
          { id: 'A', name: '节点A' },
          { id: 'B', name: '节点B' },
          { id: 'C', name: '节点C' },
        ],
        edges: [
          { source: 'A', target: 'B', directed: true },
          { source: 'B', target: 'C', directed: true },
          { source: 'C', target: 'A', directed: true }, // 形成环
        ],
      }

      const cycles = detectCycles(cyclicGraph)

      expect(cycles.length).toBeGreaterThan(0)
      expect(cycles[0]).toEqual(['A', 'B', 'C', 'A'])
    })

    test('应该处理无环图', () => {
      const acyclicGraph = {
        nodes: [
          { id: 'A', name: '节点A' },
          { id: 'B', name: '节点B' },
          { id: 'C', name: '节点C' },
        ],
        edges: [
          { source: 'A', target: 'B', directed: true },
          { source: 'B', target: 'C', directed: true },
        ],
      }

      const cycles = detectCycles(acyclicGraph)

      expect(cycles).toHaveLength(0)
    })

    test('应该处理无向图', () => {
      const undirectedGraph = {
        nodes: [
          { id: 'A', name: '节点A' },
          { id: 'B', name: '节点B' },
          { id: 'C', name: '节点C' },
        ],
        edges: [
          { source: 'A', target: 'B' }, // 无向边
          { source: 'B', target: 'C' },
          { source: 'C', target: 'A' },
        ],
      }

      const cycles = detectCycles(undirectedGraph)

      expect(cycles.length).toBeGreaterThan(0)
    })
  })

  describe('suggestConnections', () => {
    test('应该基于节点相似性建议连接', () => {
      const graph = {
        nodes: [
          { id: 'algebra', name: '代数', type: 'math', keywords: ['方程', '函数'] },
          { id: 'geometry', name: '几何', type: 'math', keywords: ['图形', '面积'] },
          { id: 'calculus', name: '微积分', type: 'math', keywords: ['导数', '积分'] },
          { id: 'physics', name: '物理', type: 'science', keywords: ['力', '运动'] },
        ],
        edges: [
          { source: 'algebra', target: 'calculus' },
        ],
      }

      const suggestions = suggestConnections(graph, 'algebra')

      expect(suggestions.length).toBeGreaterThan(0)
      
      // 应该建议连接到相似的数学节点
      const mathSuggestions = suggestions.filter(s => 
        graph.nodes.find(n => n.id === s.targetId)?.type === 'math'
      )
      expect(mathSuggestions.length).toBeGreaterThan(0)
    })

    test('应该基于共同邻居建议连接', () => {
      const graph = {
        nodes: [
          { id: 'A', name: '节点A' },
          { id: 'B', name: '节点B' },
          { id: 'C', name: '节点C' },
          { id: 'D', name: '节点D' },
        ],
        edges: [
          { source: 'A', target: 'B' },
          { source: 'C', target: 'B' },
          { source: 'A', target: 'D' },
          { source: 'C', target: 'D' },
          // A和C有两个共同邻居B和D，应该建议连接
        ],
      }

      const suggestions = suggestConnections(graph, 'A')

      const suggestionToC = suggestions.find(s => s.targetId === 'C')
      expect(suggestionToC).toBeDefined()
      expect(suggestionToC.reason).toContain('common neighbors')
      expect(suggestionToC.confidence).toBeGreaterThan(0.5)
    })

    test('应该排除已存在的连接', () => {
      const graph = {
        nodes: [
          { id: 'A', name: '节点A' },
          { id: 'B', name: '节点B' },
        ],
        edges: [
          { source: 'A', target: 'B' }, // 已存在连接
        ],
      }

      const suggestions = suggestConnections(graph, 'A')

      const suggestionToB = suggestions.find(s => s.targetId === 'B')
      expect(suggestionToB).toBeUndefined()
    })

    test('应该限制建议数量', () => {
      const graph = {
        nodes: Array(20).fill(null).map((_, i) => ({
          id: `node${i}`,
          name: `节点${i}`,
          type: 'similar',
        })),
        edges: [],
      }

      const suggestions = suggestConnections(graph, 'node0', { limit: 5 })

      expect(suggestions.length).toBeLessThanOrEqual(5)
    })
  })

  describe('optimizeLayout', () => {
    test('应该优化节点位置以减少边交叉', () => {
      const graph = {
        nodes: [
          { id: 'A', name: '节点A', x: 0, y: 0 },
          { id: 'B', name: '节点B', x: 100, y: 0 },
          { id: 'C', name: '节点C', x: 0, y: 100 },
          { id: 'D', name: '节点D', x: 100, y: 100 },
        ],
        edges: [
          { source: 'A', target: 'D' },
          { source: 'B', target: 'C' }, // 这两条边会交叉
        ],
      }

      const optimized = optimizeLayout(graph)

      expect(optimized.nodes).toHaveLength(4)
      expect(optimized.edges).toHaveLength(2)
      
      // 验证优化指标
      expect(optimized.metrics.crossings).toBeDefined()
      expect(optimized.metrics.edgeLength).toBeDefined()
      expect(optimized.metrics.nodeOverlap).toBeDefined()
    })

    test('应该保持节点间的最小距离', () => {
      const graph = {
        nodes: [
          { id: 'A', name: '节点A', x: 0, y: 0 },
          { id: 'B', name: '节点B', x: 1, y: 1 }, // 太近
        ],
        edges: [],
      }

      const optimized = optimizeLayout(graph, { minDistance: 50 })

      const nodeA = optimized.nodes.find(n => n.id === 'A')
      const nodeB = optimized.nodes.find(n => n.id === 'B')
      
      const distance = Math.sqrt((nodeA.x - nodeB.x) ** 2 + (nodeA.y - nodeB.y) ** 2)
      expect(distance).toBeGreaterThanOrEqual(50)
    })

    test('应该处理大型图的优化', () => {
      const largeGraph = {
        nodes: Array(100).fill(null).map((_, i) => ({
          id: `node${i}`,
          name: `节点${i}`,
          x: Math.random() * 1000,
          y: Math.random() * 1000,
        })),
        edges: Array(200).fill(null).map((_, i) => ({
          source: `node${i % 100}`,
          target: `node${(i + 1) % 100}`,
        })),
      }

      const startTime = Date.now()
      const optimized = optimizeLayout(largeGraph)
      const endTime = Date.now()

      expect(optimized.nodes).toHaveLength(100)
      expect(endTime - startTime).toBeLessThan(5000) // 5秒内完成
    })

    test('应该支持不同的优化策略', () => {
      const graph = {
        nodes: [
          { id: 'A', name: '节点A', x: 0, y: 0 },
          { id: 'B', name: '节点B', x: 100, y: 100 },
        ],
        edges: [
          { source: 'A', target: 'B' },
        ],
      }

      const strategies = ['force', 'simulated-annealing', 'genetic']

      strategies.forEach(strategy => {
        const optimized = optimizeLayout(graph, { strategy })
        
        expect(optimized.nodes).toHaveLength(2)
        expect(optimized.metadata.strategy).toBe(strategy)
      })
    })
  })

  describe('边界情况和错误处理', () => {
    test('应该处理空图', () => {
      const emptyGraph = { nodes: [], edges: [] }

      expect(() => validateGraphStructure(emptyGraph)).not.toThrow()
      expect(() => calculateGraphMetrics(emptyGraph)).not.toThrow()
      expect(() => generateGraphLayout(emptyGraph)).not.toThrow()
    })

    test('应该处理大型图', () => {
      const largeGraph = {
        nodes: Array(1000).fill(null).map((_, i) => ({
          id: `node${i}`,
          name: `节点${i}`,
          x: i % 100,
          y: Math.floor(i / 100),
        })),
        edges: Array(2000).fill(null).map((_, i) => ({
          source: `node${i % 1000}`,
          target: `node${(i + 1) % 1000}`,
        })),
      }

      const startTime = Date.now()
      const metrics = calculateGraphMetrics(largeGraph)
      const endTime = Date.now()

      expect(metrics.nodeCount).toBe(1000)
      expect(metrics.edgeCount).toBe(2000)
      expect(endTime - startTime).toBeLessThan(2000) // 2秒内完成
    })

    test('应该处理无效输入', () => {
      expect(() => validateGraphStructure(null)).toThrow()
      expect(() => validateGraphStructure(undefined)).toThrow()
      expect(() => validateGraphStructure({})).toThrow()
      expect(() => validateGraphStructure({ nodes: null })).toThrow()
    })

    test('应该处理循环引用', () => {
      const cyclicData = {
        nodes: [
          { id: 'A', name: '节点A', x: 0, y: 0 },
        ],
        edges: [],
      }
      
      // 创建循环引用
      cyclicData.nodes[0].self = cyclicData

      expect(() => validateGraphStructure(cyclicData)).not.toThrow()
    })
  })
})