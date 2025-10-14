/**
 * 知识图谱编辑器
 * 集成了可视化、编辑、交互等完整功能的图谱编辑器组件
 */
'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';

import {
  D3GraphRenderer,
  GraphDataManager,
  GraphInteractionManager,
  layoutManager,
  LayoutConfig,
  VisualConfig,
  InteractionConfig,
  SelectionState,
  FilterState,
  EditingState,
  DEFAULT_LAYOUT_CONFIG,
  DEFAULT_VISUAL_CONFIG,
  DEFAULT_INTERACTION_CONFIG,
} from '@/core/graph';
import { KnowledgeGraph, GraphNode, GraphEdge, NodeType, EdgeType } from '@/shared/types/knowledgeGraph';

interface KnowledgeGraphEditorProps {
  graph: KnowledgeGraph
  width?: number
  height?: number
  readonly?: boolean
  layoutConfig?: Partial<LayoutConfig>
  visualConfig?: Partial<VisualConfig>
  interactionConfig?: Partial<InteractionConfig>
  className?: string
  onGraphChange?: (graph: KnowledgeGraph) => void
  onSelectionChange?: (selection: SelectionState) => void
  onError?: (error: string) => void
}

export function KnowledgeGraphEditor({
  graph,
  width = 1000,
  height = 700,
  readonly = false,
  layoutConfig = {},
  visualConfig = {},
  interactionConfig = {},
  className = '',
  onGraphChange,
  onSelectionChange,
  onError,
}: KnowledgeGraphEditorProps) {
  // DOM引用
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<D3GraphRenderer | null>(null);
  const dataManagerRef = useRef<GraphDataManager | null>(null);
  const interactionManagerRef = useRef<GraphInteractionManager | null>(null);

  // 状态
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentSelection, setCurrentSelection] = useState<SelectionState>({
    nodes: [],
    edges: [],
    lastSelected: null,
  });
  const [filterState, setFilterState] = useState<FilterState>({
    nodeTypes: [],
    edgeTypes: [],
    levels: [],
    hasWorks: null,
    searchQuery: '',
    showHidden: false,
  });
  const [editState, setEditState] = useState<EditingState>({
    mode: readonly ? 'view' : 'view',
    activeNode: null,
    activeEdge: null,
    pendingEdge: null,
  });
  const [showToolbar, setShowToolbar] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);

  // 合并配置
  const mergedLayoutConfig: LayoutConfig = {
    ...DEFAULT_LAYOUT_CONFIG,
    width,
    height,
    ...layoutConfig,
  };

  const mergedVisualConfig: VisualConfig = {
    ...DEFAULT_VISUAL_CONFIG,
    ...visualConfig,
  };

  const mergedInteractionConfig: InteractionConfig = {
    ...DEFAULT_INTERACTION_CONFIG,
    ...interactionConfig,
  };

  // 初始化管理器
  const initializeManagers = useCallback(() => {
    if (!containerRef.current) return;

    try {
      // 创建数据管理器
      dataManagerRef.current = new GraphDataManager(graph);

      // 创建交互管理器
      interactionManagerRef.current = new GraphInteractionManager(dataManagerRef.current);

      // 创建渲染器
      const visualizationData = dataManagerRef.current.getVisualizationData();
      rendererRef.current = new D3GraphRenderer({
        container: containerRef.current,
        layout: mergedLayoutConfig,
        visual: mergedVisualConfig,
        interaction: mergedInteractionConfig,
        data: visualizationData,
      });

      // 绑定事件处理器
      bindEventHandlers();

      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize graph editor:', error);
      onError && onError(error instanceof Error ? error.message : 'Failed to initialize graph editor');
    }
  }, [graph, mergedLayoutConfig, mergedVisualConfig, mergedInteractionConfig, onError]);

  // 绑定事件处理器
  const bindEventHandlers = useCallback(() => {
    if (!rendererRef.current || !interactionManagerRef.current) return;

    const renderer = rendererRef.current;
    const interactionManager = interactionManagerRef.current;

    // 渲染器事件
    renderer.on('node:click', (event) => {
      if (event.target && interactionManager) {
        if (editState.mode === 'create_edge' && editState.pendingEdge) {
          // 完成创建边
          interactionManager.finishCreateEdge(event.target.id);
        } else {
          // 普通点击选择
          interactionManager.toggleNodeSelection(event.target.id);
        }
      }
    });

    renderer.on('node:dblclick', (event) => {
      if (event.target && !readonly) {
        interactionManager.startEditNode(event.target.id);
      }
    });

    renderer.on('edge:click', (event) => {
      if (event.target && interactionManager) {
        interactionManager.toggleEdgeSelection(event.target.id);
      }
    });

    renderer.on('canvas:click', () => {
      if (editState.mode === 'create_node') {
        // 在点击位置创建节点
        const position = { x: 100, y: 100 }; // 这里应该从事件中获取实际位置
        interactionManager.startCreateNode(position);
      } else if (editState.mode === 'create_edge') {
        // 取消创建边
        interactionManager.cancelCreateEdge();
      } else {
        interactionManager.clearSelection();
      }
    });

    // 交互管理器事件
    interactionManager.on('selection:changed', (selection: SelectionState) => {
      setCurrentSelection(selection);
      onSelectionChange && onSelectionChange(selection);
    });

    interactionManager.on('graph:changed', (updatedGraph: KnowledgeGraph) => {
      onGraphChange && onGraphChange(updatedGraph);
      // 更新渲染器
      if (dataManagerRef.current) {
        const visualizationData = dataManagerRef.current.getVisualizationData();
        renderer.update(visualizationData);
      }
    });

    interactionManager.on('edit:mode:changed', (mode: EditingState['mode']) => {
      setEditState({ ...editState, mode });
    });

    interactionManager.on('filter:changed', (filter: FilterState) => {
      setFilterState(filter);
      // 更新渲染器显示过滤后的数据
      const filteredData = interactionManager.getFilteredData();
      renderer.update(filteredData);
    });

  }, [editState, readonly, onSelectionChange, onGraphChange]);

  // 初始化
  useEffect(() => {
    initializeManagers();

    return () => {
      // 清理
      if (rendererRef.current) {
        rendererRef.current.destroy();
      }
      if (interactionManagerRef.current) {
        interactionManagerRef.current.destroy();
      }
    };
  }, [initializeManagers]);

  // 工具栏操作
  const handleCreateNode = useCallback(() => {
    if (interactionManagerRef.current) {
      interactionManagerRef.current.setEditMode('create_node');
    }
  }, []);

  const handleCreateEdge = useCallback(() => {
    if (interactionManagerRef.current && currentSelection.nodes.length === 1) {
      interactionManagerRef.current.startCreateEdge(currentSelection.nodes[0]);
    }
  }, [currentSelection.nodes]);

  const handleDeleteSelected = useCallback(() => {
    if (interactionManagerRef.current) {
      interactionManagerRef.current.deleteSelected();
    }
  }, []);

  const handleCopySelected = useCallback(() => {
    if (interactionManagerRef.current) {
      interactionManagerRef.current.copySelected();
    }
  }, []);

  const handlePaste = useCallback(() => {
    if (interactionManagerRef.current) {
      interactionManagerRef.current.paste();
    }
  }, []);

  const handleSelectAll = useCallback(() => {
    if (interactionManagerRef.current) {
      interactionManagerRef.current.selectAll();
    }
  }, []);

  const handleZoomToFit = useCallback(() => {
    if (rendererRef.current) {
      rendererRef.current.zoomToFit();
    }
  }, []);

  const handleCenterView = useCallback(() => {
    if (rendererRef.current) {
      rendererRef.current.centerView();
    }
  }, []);

  const handleLayoutChange = useCallback((layoutType: string) => {
    if (dataManagerRef.current && rendererRef.current) {
      const nodes = dataManagerRef.current.getVisualizationData().nodes;
      const links = dataManagerRef.current.getVisualizationData().links;

      layoutManager.applyLayout(layoutType, nodes, links, {
        ...mergedLayoutConfig,
        type: layoutType as any,
      });

      rendererRef.current.setLayout({
        ...mergedLayoutConfig,
        type: layoutType as any,
      });
    }
  }, [mergedLayoutConfig]);

  const handleSearch = useCallback((query: string) => {
    if (interactionManagerRef.current) {
      const results = interactionManagerRef.current.searchNodes(query);
      if (results.length > 0) {
        const nodeIds = results.map(node => node.id);
        interactionManagerRef.current.selectNodes(nodeIds);
        if (rendererRef.current) {
          rendererRef.current.zoomToNodes(nodeIds);
        }
      }
    }
  }, []);

  const handleFilterChange = useCallback((filter: Partial<FilterState>) => {
    if (interactionManagerRef.current) {
      interactionManagerRef.current.setFilter(filter);
    }
  }, []);

  // 渲染工具栏
  const renderToolbar = () => {
    if (!showToolbar || readonly) return null;

    return (
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-2 flex items-center space-x-2 z-10">
        {/* 编辑工具 */}
        <div className="flex items-center space-x-1 border-r pr-2">
          <button
            onClick={handleCreateNode}
            className={`p-2 rounded hover:bg-gray-100 ${editState.mode === 'create_node' ? 'bg-blue-100 text-blue-600' : ''}`}
            title="创建节点"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>

          <button
            onClick={handleCreateEdge}
            disabled={currentSelection.nodes.length !== 1}
            className={`p-2 rounded hover:bg-gray-100 disabled:opacity-50 ${editState.mode === 'create_edge' ? 'bg-blue-100 text-blue-600' : ''}`}
            title="创建连线"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </button>

          <button
            onClick={handleDeleteSelected}
            disabled={currentSelection.nodes.length === 0 && currentSelection.edges.length === 0}
            className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 text-red-600"
            title="删除选中"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>

        {/* 选择工具 */}
        <div className="flex items-center space-x-1 border-r pr-2">
          <button
            onClick={handleSelectAll}
            className="p-2 rounded hover:bg-gray-100"
            title="全选"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          <button
            onClick={handleCopySelected}
            disabled={currentSelection.nodes.length === 0}
            className="p-2 rounded hover:bg-gray-100 disabled:opacity-50"
            title="复制"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>

          <button
            onClick={handlePaste}
            className="p-2 rounded hover:bg-gray-100"
            title="粘贴"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </button>
        </div>

        {/* 视图工具 */}
        <div className="flex items-center space-x-1 border-r pr-2">
          <button
            onClick={handleZoomToFit}
            className="p-2 rounded hover:bg-gray-100"
            title="适应窗口"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>

          <button
            onClick={handleCenterView}
            className="p-2 rounded hover:bg-gray-100"
            title="居中显示"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </button>
        </div>

        {/* 布局选择 */}
        <div className="flex items-center space-x-1">
          <select
            onChange={(e) => handleLayoutChange(e.target.value)}
            className="text-sm border rounded px-2 py-1"
            title="选择布局"
          >
            <option value="force">力导向</option>
            <option value="hierarchical">层次布局</option>
            <option value="circular">环形布局</option>
            <option value="tree">树形布局</option>
            <option value="grid">网格布局</option>
            <option value="radial">径向布局</option>
          </select>
        </div>
      </div>
    );
  };

  // 渲染侧边栏
  const renderSidebar = () => {
    if (!showSidebar) return null;

    return (
      <div className="absolute top-4 right-4 w-64 bg-white rounded-lg shadow-lg p-4 z-10">
        {/* 搜索 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">搜索节点</label>
          <input
            type="text"
            placeholder="输入关键词..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        {/* 过滤器 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">节点类型</label>
          <div className="space-y-1">
            {Object.values(NodeType).map(type => (
              <label key={type} className="flex items-center">
                <input
                  type="checkbox"
                  className="mr-2"
                  checked={filterState.nodeTypes.includes(type)}
                  onChange={(e) => {
                    const newTypes = e.target.checked
                      ? [...filterState.nodeTypes, type]
                      : filterState.nodeTypes.filter(t => t !== type);
                    handleFilterChange({ nodeTypes: newTypes });
                  }}
                />
                <span className="text-sm">{type}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 选择信息 */}
        {(currentSelection.nodes.length > 0 || currentSelection.edges.length > 0) && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">当前选择</h4>
            {currentSelection.nodes.length > 0 && (
              <p className="text-sm text-blue-700">节点: {currentSelection.nodes.length}</p>
            )}
            {currentSelection.edges.length > 0 && (
              <p className="text-sm text-blue-700">边: {currentSelection.edges.length}</p>
            )}
          </div>
        )}

        {/* 图谱统计 */}
        {dataManagerRef.current && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-2">图谱统计</h4>
            {(() => {
              const stats = dataManagerRef.current!.getStatistics();
              return (
                <div className="space-y-1 text-sm text-gray-600">
                  <p>节点: {stats.nodeCount}</p>
                  <p>边: {stats.edgeCount}</p>
                  <p>最大深度: {stats.maxDepth}</p>
                  <p>平均度数: {stats.averageDegree.toFixed(2)}</p>
                  <p>密度: {(stats.density * 100).toFixed(1)}%</p>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    );
  };

  // 渲染状态指示器
  const renderStatusBar = () => {
    return (
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg px-3 py-2 z-10">
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <span>模式: {editState.mode === 'view' ? '查看' : editState.mode === 'edit' ? '编辑' : editState.mode === 'create_node' ? '创建节点' : '创建连线'}</span>
          {editState.pendingEdge && (
            <span className="text-blue-600">等待选择目标节点...</span>
          )}
        </div>
      </div>
    );
  };

  if (!isInitialized) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-50 ${className}`}
        style={{ width, height }}
      >
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">初始化图谱编辑器...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      {/* 图谱容器 */}
      <div
        ref={containerRef}
        className="w-full h-full border border-gray-200 rounded-lg overflow-hidden bg-white"
        style={{ width, height }}
      />

      {/* 工具栏 */}
      {renderToolbar()}

      {/* 侧边栏 */}
      {renderSidebar()}

      {/* 状态栏 */}
      {renderStatusBar()}

      {/* 工具栏切换按钮 */}
      <button
        onClick={() => setShowToolbar(!showToolbar)}
        className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white rounded-full p-2 shadow-lg hover:bg-gray-50 z-20"
        title={showToolbar ? '隐藏工具栏' : '显示工具栏'}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* 侧边栏切换按钮 */}
      <button
        onClick={() => setShowSidebar(!showSidebar)}
        className="absolute top-16 right-4 bg-white rounded-full p-2 shadow-lg hover:bg-gray-50 z-20"
        title={showSidebar ? '隐藏侧边栏' : '显示侧边栏'}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}

export default KnowledgeGraphEditor;
