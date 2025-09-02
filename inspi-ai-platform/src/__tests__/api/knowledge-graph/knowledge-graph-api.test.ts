/**
 * 知识图谱API测试
 */

import { GET, POST, PUT, DELETE } from '@/app/api/knowledge-graph/route'
import { 
  ApiTestHelper, 
  setupApiTestEnvironment, 
  mockDatabase, 
  mockServices,
  jwtUtils,
  responseValidators
} from '../setup/api-test-setup'
import { createUserFixture, createKnowledgeGraphFixture, createWorkFixture } from '@/fixtures'

// Mock外部依赖
jest.mock('@/lib/auth/middleware', () => ({
  authenticateUser: jest.fn().mockImplementation((request) => {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Unauthorized')
    }
    
    const token = authHeader.replace('Bearer ', '')
    try {
      const payload = jwtUtils.verifyTestToken(token)
      return Promise.resolve({ userId: payload.userId })
    } catch {
      throw new Error('Invalid token')
    }
  }),
}))

jest.mock('@/lib/db/mongodb', () => ({
  connectDB: jest.fn().mockResolvedValue(true),
  getKnowledgeGraphs: jest.fn().mockImplementation((filters = {}) => {
    const graphs = Array.from(mockDatabase.knowledgeGraphs?.values() || [])
    let filtered = graphs
    
    if (filters.userId) {
      filtered = filtered.filter(g => g.userId === filters.userId)
    }
    if (filters.subject) {
      filtered = filtered.filter(g => g.subject === filters.subject)
    }
    
    return Promise.resolve({
      items: filtered,
      total: filtered.length,
    })
  }),
  getKnowledgeGraphById: jest.fn().mockImplementation((id) => 
    Promise.resolve(mockDatabase.knowledgeGraphs?.get(id))
  ),
  createKnowledgeGraph: jest.fn().mockImplementation((graphData) => {
    const graph = { 
      ...graphData, 
      id: `graph-${Date.now()}`, 
      createdAt: new Date().toISOString(),
      nodes: graphData.nodes || [],
      edges: graphData.edges || [],
    }
    if (!mockDatabase.knowledgeGraphs) {
      mockDatabase.knowledgeGraphs = new Map()
    }
    mockDatabase.knowledgeGraphs.set(graph.id, graph)
    return Promise.resolve(graph)
  }),
  updateKnowledgeGraph: jest.fn().mockImplementation((id, updates) => {
    const graph = mockDatabase.knowledgeGraphs?.get(id)
    if (graph) {
      Object.assign(graph, updates, { updatedAt: new Date().toISOString() })
      return Promise.resolve(graph)
    }
    return Promise.resolve(null)
  }),
  deleteKnowledgeGraph: jest.fn().mockImplementation((id) => {
    const deleted = mockDatabase.knowledgeGraphs?.delete(id) || false
    return Promise.resolve(deleted)
  }),
  getGraphTemplates: jest.fn().mockImplementation(() => 
    Promise.resolve([
      { id: 'math-template', name: '数学知识图谱', subject: 'Mathematics' },
      { id: 'science-template', name: '科学知识图谱', subject: 'Science' },
    ])
  ),
  mountWorkToGraph: jest.fn().mockImplementation((graphId, nodeId, workId) => {
    const graph = mockDatabase.knowledgeGraphs?.get(graphId)
    if (graph) {
      const node = graph.nodes.find((n: any) => n.id === nodeId)
      if (node) {
        if (!node.mountedWorks) node.mountedWorks = []
        node.mountedWorks.push(workId)
        return Promise.resolve(graph)
      }
    }
    return Promise.resolve(null)
  }),
  searchGraphNodes: jest.fn().mockImplementation((graphId, query) => {
    const graph = mockDatabase.knowledgeGraphs?.get(graphId)
    if (graph) {
      const matchingNodes = graph.nodes.filter((node: any) => 
        node.name.toLowerCase().includes(query.toLowerCase()) ||
        node.description?.toLowerCase().includes(query.toLowerCase())
      )
      return Promise.resolve(matchingNodes)
    }
    return Promise.resolve([])
  }),
}))

// Mock图谱服务
jest.mock('@/lib/services/knowledgeGraphService', () => ({
  validateGraphStructure: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
  calculateGraphMetrics: jest.fn().mockReturnValue({
    nodeCount: 10,
    edgeCount: 15,
    density: 0.3,
    avgDegree: 3.0,
  }),
  generateGraphLayout: jest.fn().mockReturnValue({
    nodes: [{ id: 'node1', x: 100, y: 100 }],
    edges: [{ source: 'node1', target: 'node2' }],
  }),
  applyTemplate: jest.fn().mockImplementation((templateId) => ({
    nodes: [
      { id: 'root', name: '根节点', x: 0, y: 0 },
      { id: 'child1', name: '子节点1', x: 100, y: 100 },
    ],
    edges: [{ source: 'root', target: 'child1' }],
  })),
}))

describe('/api/knowledge-graph API测试', () => {
  setupApiTestEnvironment()
  
  const testUser = createUserFixture({ id: 'user-1' })
  const authToken = jwtUtils.createTestToken({ userId: testUser.id })
  const authHeaders = ApiTestHelper.createAuthHeaders(authToken)

  beforeEach(() => {
    mockDatabase.users.set(testUser.id, testUser)
    
    // 初始化知识图谱数据
    if (!mockDatabase.knowledgeGraphs) {
      mockDatabase.knowledgeGraphs = new Map()
    }
    
    // 添加测试知识图谱
    const testGraph = createKnowledgeGraphFixture({
      id: 'graph-1',
      userId: testUser.id,
      name: '数学知识图谱',
      subject: 'Mathematics',
      nodes: [
        { id: 'node1', name: '代数', x: 0, y: 0, type: 'concept' },
        { id: 'node2', name: '几何', x: 100, y: 100, type: 'concept' },
      ],
      edges: [
        { source: 'node1', target: 'node2', type: 'related' },
      ],
    })
    mockDatabase.knowledgeGraphs.set(testGraph.id, testGraph)
  })

  describe('GET /api/knowledge-graph - 获取知识图谱列表', () => {
    test('应该返回用户的知识图谱列表', async () => {
      const result = await ApiTestHelper.callApi(
        GET,
        '/api/knowledge-graph',
        {
          headers: authHeaders,
        }
      )

      expect(result.status).toBe(200)
      const response = await result.json()
      
      responseValidators.validatePaginatedResponse(response)
      expect(response.success).toBe(true)
      expect(response.data.items).toHaveLength(1)
      expect(response.data.items[0].userId).toBe(testUser.id)
      expect(response.data.items[0].nodes).toBeDefined()
      expect(response.data.items[0].edges).toBeDefined()
    })

    test('应该支持按学科筛选', async () => {
      const result = await ApiTestHelper.callApi(
        GET,
        '/api/knowledge-graph',
        {
          searchParams: { subject: 'Mathematics' },
          headers: authHeaders,
        }
      )

      expect(result.status).toBe(200)
      const response = await result.json()
      
      expect(response.data.items).toHaveLength(1)
      expect(response.data.items[0].subject).toBe('Mathematics')
    })

    test('应该支持搜索功能', async () => {
      const result = await ApiTestHelper.callApi(
        GET,
        '/api/knowledge-graph',
        {
          searchParams: { q: '数学' },
          headers: authHeaders,
        }
      )

      expect(result.status).toBe(200)
      const response = await result.json()
      
      expect(response.data.items).toHaveLength(1)
      expect(response.data.items[0].name).toContain('数学')
    })

    test('应该要求用户认证', async () => {
      const result = await ApiTestHelper.callApi(
        GET,
        '/api/knowledge-graph'
      )

      ApiTestHelper.expectUnauthorizedError(result)
    })
  })

  describe('POST /api/knowledge-graph - 创建知识图谱', () => {
    test('应该成功创建新的知识图谱', async () => {
      const newGraphData = {
        name: '新的知识图谱',
        subject: 'Science',
        description: '科学知识图谱',
        nodes: [
          { id: 'physics', name: '物理学', x: 0, y: 0, type: 'subject' },
          { id: 'chemistry', name: '化学', x: 100, y: 0, type: 'subject' },
        ],
        edges: [
          { source: 'physics', target: 'chemistry', type: 'related' },
        ],
      }

      const result = await ApiTestHelper.callApi(
        POST,
        '/api/knowledge-graph',
        {
          body: newGraphData,
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        }
      )

      expect(result.status).toBe(201)
      const response = await result.json()
      
      responseValidators.validateApiResponse(response)
      expect(response.success).toBe(true)
      expect(response.data.name).toBe(newGraphData.name)
      expect(response.data.userId).toBe(testUser.id)
      expect(response.data.nodes).toHaveLength(2)
      expect(response.data.edges).toHaveLength(1)
    })

    test('应该验证必需字段', async () => {
      const invalidData = {
        description: '缺少名称的图谱',
      }

      const result = await ApiTestHelper.callApi(
        POST,
        '/api/knowledge-graph',
        {
          body: invalidData,
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        }
      )

      ApiTestHelper.expectValidationError(result, ['name'])
    })

    test('应该验证图谱结构', async () => {
      const invalidGraphData = {
        name: '无效图谱',
        subject: 'Mathematics',
        nodes: [
          { id: 'node1', name: '节点1' }, // 缺少坐标
        ],
        edges: [
          { source: 'node1', target: 'nonexistent' }, // 目标节点不存在
        ],
      }

      // Mock验证失败
      const { validateGraphStructure } = require('@/lib/services/knowledgeGraphService')
      validateGraphStructure.mockReturnValueOnce({
        isValid: false,
        errors: ['Target node "nonexistent" does not exist'],
      })

      const result = await ApiTestHelper.callApi(
        POST,
        '/api/knowledge-graph',
        {
          body: invalidGraphData,
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        }
      )

      expect(result.status).toBe(400)
      const response = await result.json()
      expect(response.success).toBe(false)
      expect(response.error).toContain('Invalid graph structure')
    })

    test('应该支持从模板创建', async () => {
      const templateData = {
        name: '从模板创建的图谱',
        subject: 'Mathematics',
        templateId: 'math-template',
      }

      const result = await ApiTestHelper.callApi(
        POST,
        '/api/knowledge-graph',
        {
          body: templateData,
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        }
      )

      expect(result.status).toBe(201)
      const response = await result.json()
      
      expect(response.data.nodes).toBeDefined()
      expect(response.data.edges).toBeDefined()
      
      // 验证模板应用
      const { applyTemplate } = require('@/lib/services/knowledgeGraphService')
      expect(applyTemplate).toHaveBeenCalledWith('math-template')
    })
  })

  describe('PUT /api/knowledge-graph/[id] - 更新知识图谱', () => {
    test('应该成功更新自己的知识图谱', async () => {
      const updateData = {
        name: '更新后的图谱名称',
        description: '更新后的描述',
        nodes: [
          { id: 'node1', name: '更新的节点', x: 50, y: 50, type: 'concept' },
        ],
      }

      const result = await ApiTestHelper.callApi(
        PUT,
        '/api/knowledge-graph/graph-1',
        {
          body: updateData,
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        }
      )

      expect(result.status).toBe(200)
      const response = await result.json()
      
      expect(response.success).toBe(true)
      expect(response.data.name).toBe(updateData.name)
      expect(response.data.description).toBe(updateData.description)
    })

    test('应该拒绝更新他人的知识图谱', async () => {
      // 创建其他用户的图谱
      const otherUserGraph = createKnowledgeGraphFixture({
        id: 'other-graph',
        userId: 'other-user',
      })
      mockDatabase.knowledgeGraphs.set(otherUserGraph.id, otherUserGraph)

      const updateData = {
        name: '尝试修改他人图谱',
      }

      const result = await ApiTestHelper.callApi(
        PUT,
        '/api/knowledge-graph/other-graph',
        {
          body: updateData,
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        }
      )

      ApiTestHelper.expectForbiddenError(result)
    })

    test('应该处理不存在的图谱', async () => {
      const updateData = {
        name: '更新不存在的图谱',
      }

      const result = await ApiTestHelper.callApi(
        PUT,
        '/api/knowledge-graph/nonexistent',
        {
          body: updateData,
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        }
      )

      ApiTestHelper.expectNotFoundError(result)
    })
  })

  describe('DELETE /api/knowledge-graph/[id] - 删除知识图谱', () => {
    test('应该成功删除自己的知识图谱', async () => {
      const result = await ApiTestHelper.callApi(
        DELETE,
        '/api/knowledge-graph/graph-1',
        {
          headers: authHeaders,
        }
      )

      expect(result.status).toBe(200)
      const response = await result.json()
      
      expect(response.success).toBe(true)
      expect(response.message).toContain('deleted')
    })

    test('应该拒绝删除他人的知识图谱', async () => {
      const otherUserGraph = createKnowledgeGraphFixture({
        id: 'other-graph',
        userId: 'other-user',
      })
      mockDatabase.knowledgeGraphs.set(otherUserGraph.id, otherUserGraph)

      const result = await ApiTestHelper.callApi(
        DELETE,
        '/api/knowledge-graph/other-graph',
        {
          headers: authHeaders,
        }
      )

      ApiTestHelper.expectForbiddenError(result)
    })
  })

  describe('GET /api/knowledge-graph/templates - 获取图谱模板', () => {
    test('应该返回可用的图谱模板', async () => {
      const result = await ApiTestHelper.callApi(
        GET,
        '/api/knowledge-graph/templates',
        {
          headers: authHeaders,
        }
      )

      expect(result.status).toBe(200)
      const response = await result.json()
      
      expect(response.success).toBe(true)
      expect(response.data.templates).toHaveLength(2)
      expect(response.data.templates[0]).toHaveProperty('id')
      expect(response.data.templates[0]).toHaveProperty('name')
      expect(response.data.templates[0]).toHaveProperty('subject')
    })
  })

  describe('POST /api/knowledge-graph/[id]/mount - 挂载作品到图谱节点', () => {
    test('应该成功挂载作品到图谱节点', async () => {
      const testWork = createWorkFixture({
        id: 'work-1',
        authorId: testUser.id,
        title: '测试作品',
      })
      mockDatabase.works.set(testWork.id, testWork)

      const mountData = {
        nodeId: 'node1',
        workId: 'work-1',
      }

      const result = await ApiTestHelper.callApi(
        POST,
        '/api/knowledge-graph/graph-1/mount',
        {
          body: mountData,
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        }
      )

      expect(result.status).toBe(200)
      const response = await result.json()
      
      expect(response.success).toBe(true)
      expect(response.message).toContain('mounted')
      
      // 验证挂载操作
      const { mountWorkToGraph } = require('@/lib/db/mongodb')
      expect(mountWorkToGraph).toHaveBeenCalledWith('graph-1', 'node1', 'work-1')
    })

    test('应该验证节点存在性', async () => {
      const mountData = {
        nodeId: 'nonexistent-node',
        workId: 'work-1',
      }

      const result = await ApiTestHelper.callApi(
        POST,
        '/api/knowledge-graph/graph-1/mount',
        {
          body: mountData,
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        }
      )

      expect(result.status).toBe(400)
      const response = await result.json()
      expect(response.error).toContain('Node not found')
    })
  })

  describe('GET /api/knowledge-graph/[id]/search - 搜索图谱节点', () => {
    test('应该成功搜索图谱节点', async () => {
      const result = await ApiTestHelper.callApi(
        GET,
        '/api/knowledge-graph/graph-1/search',
        {
          searchParams: { q: '代数' },
          headers: authHeaders,
        }
      )

      expect(result.status).toBe(200)
      const response = await result.json()
      
      expect(response.success).toBe(true)
      expect(response.data.nodes).toBeDefined()
      expect(response.data.nodes.length).toBeGreaterThan(0)
    })

    test('应该处理空搜索结果', async () => {
      const result = await ApiTestHelper.callApi(
        GET,
        '/api/knowledge-graph/graph-1/search',
        {
          searchParams: { q: '不存在的内容' },
          headers: authHeaders,
        }
      )

      expect(result.status).toBe(200)
      const response = await result.json()
      
      expect(response.success).toBe(true)
      expect(response.data.nodes).toHaveLength(0)
    })
  })

  describe('GET /api/knowledge-graph/[id]/statistics - 获取图谱统计', () => {
    test('应该返回图谱统计信息', async () => {
      const result = await ApiTestHelper.callApi(
        GET,
        '/api/knowledge-graph/graph-1/statistics',
        {
          headers: authHeaders,
        }
      )

      expect(result.status).toBe(200)
      const response = await result.json()
      
      expect(response.success).toBe(true)
      expect(response.data.metrics).toBeDefined()
      expect(response.data.metrics.nodeCount).toBeDefined()
      expect(response.data.metrics.edgeCount).toBeDefined()
      expect(response.data.metrics.density).toBeDefined()
      
      // 验证统计计算
      const { calculateGraphMetrics } = require('@/lib/services/knowledgeGraphService')
      expect(calculateGraphMetrics).toHaveBeenCalled()
    })
  })

  describe('错误处理和边界情况', () => {
    test('应该处理数据库错误', async () => {
      const { getKnowledgeGraphs } = require('@/lib/db/mongodb')
      getKnowledgeGraphs.mockRejectedValueOnce(new Error('Database error'))

      const result = await ApiTestHelper.callApi(
        GET,
        '/api/knowledge-graph',
        {
          headers: authHeaders,
        }
      )

      expect(result.status).toBe(500)
      const response = await result.json()
      expect(response.success).toBe(false)
    })

    test('应该处理大型图谱数据', async () => {
      const largeGraphData = {
        name: '大型图谱',
        subject: 'Mathematics',
        nodes: Array(1000).fill(null).map((_, i) => ({
          id: `node-${i}`,
          name: `节点${i}`,
          x: Math.random() * 1000,
          y: Math.random() * 1000,
        })),
        edges: Array(2000).fill(null).map((_, i) => ({
          source: `node-${i % 1000}`,
          target: `node-${(i + 1) % 1000}`,
        })),
      }

      const result = await ApiTestHelper.callApi(
        POST,
        '/api/knowledge-graph',
        {
          body: largeGraphData,
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        }
      )

      // 应该处理大数据量或返回适当错误
      expect([201, 413]).toContain(result.status)
    })

    test('应该处理循环引用', async () => {
      const cyclicGraphData = {
        name: '循环图谱',
        subject: 'Mathematics',
        nodes: [
          { id: 'a', name: '节点A', x: 0, y: 0 },
          { id: 'b', name: '节点B', x: 100, y: 0 },
          { id: 'c', name: '节点C', x: 50, y: 100 },
        ],
        edges: [
          { source: 'a', target: 'b' },
          { source: 'b', target: 'c' },
          { source: 'c', target: 'a' }, // 形成循环
        ],
      }

      const result = await ApiTestHelper.callApi(
        POST,
        '/api/knowledge-graph',
        {
          body: cyclicGraphData,
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        }
      )

      // 应该能处理循环引用（这在知识图谱中是合理的）
      expect(result.status).toBe(201)
    })
  })

  describe('性能测试', () => {
    test('应该在合理时间内响应', async () => {
      const startTime = Date.now()
      
      const result = await ApiTestHelper.callApi(
        GET,
        '/api/knowledge-graph',
        {
          headers: authHeaders,
        }
      )
      
      const responseTime = Date.now() - startTime
      expect(responseTime).toBeLessThan(2000) // 2秒内响应
      expect(result.status).toBe(200)
    })

    test('应该处理并发请求', async () => {
      const concurrentRequests = Array(5).fill(null).map(() =>
        ApiTestHelper.callApi(
          GET,
          '/api/knowledge-graph',
          {
            headers: authHeaders,
          }
        )
      )

      const results = await Promise.all(concurrentRequests)
      
      results.forEach(result => {
        expect(result.status).toBe(200)
      })
    })
  })
})