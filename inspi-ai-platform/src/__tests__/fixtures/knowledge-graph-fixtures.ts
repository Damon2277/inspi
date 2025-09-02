/**
 * 知识图谱相关测试数据工厂
 */

export interface MockGraphNode {
  id: string
  label: string
  x: number
  y: number
  works: string[]
  type?: 'concept' | 'skill' | 'topic'
  level?: number
  color?: string
}

export interface MockGraphEdge {
  source: string
  target: string
  type: 'prerequisite' | 'related' | 'contains'
  weight?: number
}

export interface MockKnowledgeGraph {
  id: string
  userId: string
  subject: string
  nodes: MockGraphNode[]
  edges: MockGraphEdge[]
  createdAt: string
  updatedAt: string
  isTemplate?: boolean
}

// 节点工厂
export const createGraphNodeFixture = (overrides: Partial<MockGraphNode> = {}): MockGraphNode => ({
  id: `node-${Math.random().toString(36).substring(2, 15)}`,
  label: 'Test Node',
  x: Math.random() * 800,
  y: Math.random() * 600,
  works: [],
  type: 'concept',
  level: 1,
  color: '#3B82F6',
  ...overrides,
})

// 边工厂
export const createGraphEdgeFixture = (
  source: string,
  target: string,
  overrides: Partial<MockGraphEdge> = {}
): MockGraphEdge => ({
  source,
  target,
  type: 'prerequisite',
  weight: 1,
  ...overrides,
})

// 数学知识图谱节点
export const createMathNodesFixture = (): MockGraphNode[] => [
  createGraphNodeFixture({
    id: 'math-addition',
    label: 'Addition',
    x: 100,
    y: 100,
    type: 'concept',
    level: 1,
  }),
  createGraphNodeFixture({
    id: 'math-subtraction',
    label: 'Subtraction',
    x: 300,
    y: 100,
    type: 'concept',
    level: 1,
  }),
  createGraphNodeFixture({
    id: 'math-multiplication',
    label: 'Multiplication',
    x: 200,
    y: 250,
    type: 'concept',
    level: 2,
  }),
  createGraphNodeFixture({
    id: 'math-division',
    label: 'Division',
    x: 400,
    y: 250,
    type: 'concept',
    level: 2,
  }),
  createGraphNodeFixture({
    id: 'math-fractions',
    label: 'Fractions',
    x: 300,
    y: 400,
    type: 'concept',
    level: 3,
  }),
]

// 数学知识图谱边
export const createMathEdgesFixture = (): MockGraphEdge[] => [
  createGraphEdgeFixture('math-addition', 'math-multiplication', { type: 'prerequisite' }),
  createGraphEdgeFixture('math-subtraction', 'math-division', { type: 'prerequisite' }),
  createGraphEdgeFixture('math-multiplication', 'math-fractions', { type: 'prerequisite' }),
  createGraphEdgeFixture('math-division', 'math-fractions', { type: 'prerequisite' }),
  createGraphEdgeFixture('math-addition', 'math-subtraction', { type: 'related' }),
]

// 科学知识图谱节点
export const createScienceNodesFixture = (): MockGraphNode[] => [
  createGraphNodeFixture({
    id: 'science-plants',
    label: 'Plants',
    x: 150,
    y: 100,
    type: 'topic',
    level: 1,
  }),
  createGraphNodeFixture({
    id: 'science-photosynthesis',
    label: 'Photosynthesis',
    x: 150,
    y: 250,
    type: 'concept',
    level: 2,
  }),
  createGraphNodeFixture({
    id: 'science-respiration',
    label: 'Cellular Respiration',
    x: 350,
    y: 250,
    type: 'concept',
    level: 2,
  }),
  createGraphNodeFixture({
    id: 'science-ecosystem',
    label: 'Ecosystem',
    x: 250,
    y: 400,
    type: 'topic',
    level: 3,
  }),
]

// 知识图谱工厂
export const createKnowledgeGraphFixture = (overrides: Partial<MockKnowledgeGraph> = {}): MockKnowledgeGraph => ({
  id: `graph-${Math.random().toString(36).substring(2, 15)}`,
  userId: `user-${Math.random().toString(36).substring(2, 15)}`,
  subject: 'Mathematics',
  nodes: createMathNodesFixture(),
  edges: createMathEdgesFixture(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isTemplate: false,
  ...overrides,
})

// 数学知识图谱
export const createMathGraphFixture = (userId: string, overrides: Partial<MockKnowledgeGraph> = {}): MockKnowledgeGraph =>
  createKnowledgeGraphFixture({
    userId,
    subject: 'Mathematics',
    nodes: createMathNodesFixture(),
    edges: createMathEdgesFixture(),
    ...overrides,
  })

// 科学知识图谱
export const createScienceGraphFixture = (userId: string, overrides: Partial<MockKnowledgeGraph> = {}): MockKnowledgeGraph =>
  createKnowledgeGraphFixture({
    userId,
    subject: 'Science',
    nodes: createScienceNodesFixture(),
    edges: [
      createGraphEdgeFixture('science-plants', 'science-photosynthesis', { type: 'contains' }),
      createGraphEdgeFixture('science-plants', 'science-respiration', { type: 'contains' }),
      createGraphEdgeFixture('science-photosynthesis', 'science-ecosystem', { type: 'prerequisite' }),
      createGraphEdgeFixture('science-respiration', 'science-ecosystem', { type: 'prerequisite' }),
    ],
    ...overrides,
  })

// 空知识图谱
export const createEmptyGraphFixture = (userId: string, subject: string): MockKnowledgeGraph =>
  createKnowledgeGraphFixture({
    userId,
    subject,
    nodes: [],
    edges: [],
  })

// 模板知识图谱
export const createTemplateGraphFixture = (subject: string): MockKnowledgeGraph =>
  createKnowledgeGraphFixture({
    userId: 'system',
    subject,
    isTemplate: true,
    nodes: subject === 'Mathematics' ? createMathNodesFixture() : createScienceNodesFixture(),
    edges: subject === 'Mathematics' ? createMathEdgesFixture() : [
      createGraphEdgeFixture('science-plants', 'science-photosynthesis', { type: 'contains' }),
      createGraphEdgeFixture('science-plants', 'science-respiration', { type: 'contains' }),
    ],
  })

// 图谱统计数据
export const createGraphStatsFixture = (graphId: string) => ({
  graphId,
  totalNodes: Math.floor(Math.random() * 50) + 10,
  totalEdges: Math.floor(Math.random() * 80) + 15,
  totalWorks: Math.floor(Math.random() * 100) + 20,
  completionRate: Math.random() * 0.8 + 0.2, // 20% - 100%
  lastUpdated: new Date().toISOString(),
})

// 节点进度数据
export const createNodeProgressFixture = (nodeId: string, userId: string) => ({
  nodeId,
  userId,
  isCompleted: Math.random() > 0.5,
  completedWorks: Math.floor(Math.random() * 5),
  totalWorks: Math.floor(Math.random() * 10) + 5,
  lastAccessedAt: new Date().toISOString(),
  timeSpent: Math.floor(Math.random() * 3600), // seconds
})

// 图谱布局数据
export const createGraphLayoutFixture = (graphId: string) => ({
  graphId,
  layoutType: 'force' as 'force' | 'hierarchical' | 'circular',
  settings: {
    nodeSize: 20,
    linkDistance: 100,
    charge: -300,
    gravity: 0.1,
  },
  viewport: {
    x: 0,
    y: 0,
    scale: 1,
  },
  savedAt: new Date().toISOString(),
})