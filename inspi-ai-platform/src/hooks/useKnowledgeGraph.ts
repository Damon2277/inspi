/**
 * 知识图谱数据管理Hook
 * 提供图谱数据的获取、更新和状态管理
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { KnowledgeGraph, GraphNode, GraphEdge } from '@/types/knowledgeGraph'
import { GraphVisualizationData } from '@/lib/graph-visualization/types'
import { transformGraphData } from '@/lib/graph-visualization/d3-utils'

interface UseKnowledgeGraphOptions {
  graphId?: string
  autoFetch?: boolean
  refreshInterval?: number
}

interface UseKnowledgeGraphReturn {
  // 数据状态
  graph: KnowledgeGraph | null
  visualizationData: GraphVisualizationData | null
  loading: boolean
  error: string | null
  
  // 操作方法
  fetchGraph: (id: string) => Promise<void>
  refreshGraph: () => Promise<void>
  updateGraph: (updates: Partial<KnowledgeGraph>) => Promise<void>
  
  // 节点操作
  addNode: (nodeData: Omit<GraphNode, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateNode: (nodeId: string, updates: Partial<GraphNode>) => Promise<void>
  deleteNode: (nodeId: string) => Promise<void>
  
  // 边操作
  addEdge: (edgeData: Omit<GraphEdge, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  deleteEdge: (edgeId: string) => Promise<void>
  
  // 工具方法
  clearError: () => void
  resetGraph: () => void
}

export function useKnowledgeGraph(options: UseKnowledgeGraphOptions = {}): UseKnowledgeGraphReturn {
  const { graphId, autoFetch = true, refreshInterval } = options
  
  // 状态管理
  const [graph, setGraph] = useState<KnowledgeGraph | null>(null)
  const [visualizationData, setVisualizationData] = useState<GraphVisualizationData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // 引用
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // 获取图谱数据
  const fetchGraph = useCallback(async (id: string) => {
    if (!id) return
    
    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    abortControllerRef.current = new AbortController()
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/knowledge-graph/${id}`, {
        signal: abortControllerRef.current.signal
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch graph: ${response.statusText}`)
      }
      
      const result = await response.json()
      
      if (result.success) {
        setGraph(result.data)
        
        // 转换为可视化数据
        const vizData = transformGraphData(result.data.nodes, result.data.edges)
        setVisualizationData(vizData)
      } else {
        throw new Error(result.error || 'Failed to fetch graph')
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // 刷新图谱数据
  const refreshGraph = useCallback(async () => {
    if (graph?.id) {
      await fetchGraph(graph.id)
    }
  }, [graph?.id, fetchGraph])

  // 更新图谱
  const updateGraph = useCallback(async (updates: Partial<KnowledgeGraph>) => {
    if (!graph?.id) return
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/knowledge-graph/${graph.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      })
      
      if (!response.ok) {
        throw new Error(`Failed to update graph: ${response.statusText}`)
      }
      
      const result = await response.json()
      
      if (result.success) {
        setGraph(result.data)
        
        // 更新可视化数据
        const vizData = transformGraphData(result.data.nodes, result.data.edges)
        setVisualizationData(vizData)
      } else {
        throw new Error(result.error || 'Failed to update graph')
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }, [graph?.id])

  // 添加节点
  const addNode = useCallback(async (nodeData: Omit<GraphNode, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!graph?.id) return
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/knowledge-graph/${graph.id}/nodes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(nodeData)
      })
      
      if (!response.ok) {
        throw new Error(`Failed to add node: ${response.statusText}`)
      }
      
      const result = await response.json()
      
      if (result.success) {
        // 刷新图谱数据
        await refreshGraph()
      } else {
        throw new Error(result.error || 'Failed to add node')
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }, [graph?.id, refreshGraph])

  // 更新节点
  const updateNode = useCallback(async (nodeId: string, updates: Partial<GraphNode>) => {
    if (!graph?.id) return
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/knowledge-graph/${graph.id}/nodes/${nodeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      })
      
      if (!response.ok) {
        throw new Error(`Failed to update node: ${response.statusText}`)
      }
      
      const result = await response.json()
      
      if (result.success) {
        // 刷新图谱数据
        await refreshGraph()
      } else {
        throw new Error(result.error || 'Failed to update node')
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }, [graph?.id, refreshGraph])

  // 删除节点
  const deleteNode = useCallback(async (nodeId: string) => {
    if (!graph?.id) return
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/knowledge-graph/${graph.id}/nodes/${nodeId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error(`Failed to delete node: ${response.statusText}`)
      }
      
      const result = await response.json()
      
      if (result.success) {
        // 刷新图谱数据
        await refreshGraph()
      } else {
        throw new Error(result.error || 'Failed to delete node')
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }, [graph?.id, refreshGraph])

  // 添加边
  const addEdge = useCallback(async (edgeData: Omit<GraphEdge, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!graph?.id) return
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/knowledge-graph/${graph.id}/edges`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(edgeData)
      })
      
      if (!response.ok) {
        throw new Error(`Failed to add edge: ${response.statusText}`)
      }
      
      const result = await response.json()
      
      if (result.success) {
        // 刷新图谱数据
        await refreshGraph()
      } else {
        throw new Error(result.error || 'Failed to add edge')
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }, [graph?.id, refreshGraph])

  // 删除边
  const deleteEdge = useCallback(async (edgeId: string) => {
    if (!graph?.id) return
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/knowledge-graph/${graph.id}/edges/${edgeId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error(`Failed to delete edge: ${response.statusText}`)
      }
      
      const result = await response.json()
      
      if (result.success) {
        // 刷新图谱数据
        await refreshGraph()
      } else {
        throw new Error(result.error || 'Failed to delete edge')
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }, [graph?.id, refreshGraph])

  // 清除错误
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // 重置图谱
  const resetGraph = useCallback(() => {
    setGraph(null)
    setVisualizationData(null)
    setError(null)
    setLoading(false)
  }, [])

  // 自动获取图谱数据
  useEffect(() => {
    if (autoFetch && graphId) {
      fetchGraph(graphId)
    }
  }, [autoFetch, graphId, fetchGraph])

  // 设置定时刷新
  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      refreshIntervalRef.current = setInterval(() => {
        if (graph?.id) {
          refreshGraph()
        }
      }, refreshInterval)
      
      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current)
        }
      }
    }
  }, [refreshInterval, graph?.id, refreshGraph])

  // 清理
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }
  }, [])

  return {
    // 数据状态
    graph,
    visualizationData,
    loading,
    error,
    
    // 操作方法
    fetchGraph,
    refreshGraph,
    updateGraph,
    
    // 节点操作
    addNode,
    updateNode,
    deleteNode,
    
    // 边操作
    addEdge,
    deleteEdge,
    
    // 工具方法
    clearError,
    resetGraph
  }
}

export default useKnowledgeGraph