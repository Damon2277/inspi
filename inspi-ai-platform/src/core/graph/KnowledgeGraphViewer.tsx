/**
 * 知识图谱查看器组件
 * 主要的图谱可视化组件，集成D3.js渲染器
 */
'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';

import { transformGraphData } from '@/core/graph/d3-utils';
import { D3GraphRenderer } from '@/core/graph/graph-renderer';
import {
  GraphVisualizationData,
  LayoutConfig,
  VisualConfig,
  InteractionConfig,
  GraphEvent,
  DEFAULT_LAYOUT_CONFIG,
  DEFAULT_VISUAL_CONFIG,
  DEFAULT_INTERACTION_CONFIG,
} from '@/core/graph/types';
import useKnowledgeGraph from '@/shared/hooks/useKnowledgeGraph';
import { KnowledgeGraph } from '@/shared/types/knowledgeGraph';

interface KnowledgeGraphViewerProps {
  graphId?: string
  graph?: KnowledgeGraph
  width?: number
  height?: number
  layoutConfig?: Partial<LayoutConfig>
  visualConfig?: Partial<VisualConfig>
  interactionConfig?: Partial<InteractionConfig>
  className?: string
  onNodeClick?: (nodeId: string, event: GraphEvent) => void
  onNodeDoubleClick?: (nodeId: string, event: GraphEvent) => void
  onEdgeClick?: (edgeId: string, event: GraphEvent) => void
  onSelectionChange?: (selection: { nodes: string[]; edges: string[] }) => void
  onError?: (error: string) => void
}

export function KnowledgeGraphViewer({
  graphId,
  graph: externalGraph,
  width = 800,
  height = 600,
  layoutConfig = {},
  visualConfig = {},
  interactionConfig = {},
  className = '',
  onNodeClick,
  onNodeDoubleClick,
  onEdgeClick,
  onSelectionChange,
  onError,
}: KnowledgeGraphViewerProps) {
  // DOM引用
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<D3GraphRenderer | null>(null);

  // 状态
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentSelection, setCurrentSelection] = useState<{ nodes: string[]; edges: string[] }>({
    nodes: [],
    edges: [],
  });

  // 使用Hook获取图谱数据（仅当没有外部图谱时）
  const {
    graph: hookGraph,
    visualizationData: hookVisualizationData,
    loading,
    error,
  } = useKnowledgeGraph({
    graphId: externalGraph ? undefined : graphId,
    autoFetch: !externalGraph && !!graphId,
  });

  // 确定使用的图谱数据
  const currentGraph = externalGraph || hookGraph;
  const currentVisualizationData = externalGraph
    ? transformGraphData(externalGraph.nodes, externalGraph.edges, {
        ...DEFAULT_VISUAL_CONFIG,
        ...visualConfig,
      })
    : hookVisualizationData;

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

  // 初始化渲染器
  const initializeRenderer = useCallback(() => {
    if (!containerRef.current || !currentVisualizationData) return;

    // 清理现有渲染器
    if (rendererRef.current) {
      rendererRef.current.destroy();
    }

    // 创建新渲染器
    rendererRef.current = new D3GraphRenderer({
      container: containerRef.current,
      layout: mergedLayoutConfig,
      visual: mergedVisualConfig,
      interaction: mergedInteractionConfig,
      data: currentVisualizationData,
    });

    // 绑定事件处理器
    bindEventHandlers();

    setIsInitialized(true);
  }, [currentVisualizationData, mergedLayoutConfig, mergedVisualConfig, mergedInteractionConfig]);

  // 绑定事件处理器
  const bindEventHandlers = useCallback(() => {
    if (!rendererRef.current) return;

    const renderer = rendererRef.current;

    // 节点点击事件
    renderer.on('node:click', (event) => {
      if (event.target && onNodeClick) {
        onNodeClick(event.target.id, event);
      }
    });

    // 节点双击事件
    renderer.on('node:dblclick', (event) => {
      if (event.target && onNodeDoubleClick) {
        onNodeDoubleClick(event.target.id, event);
      }
    });

    // 边点击事件
    renderer.on('edge:click', (event) => {
      if (event.target && onEdgeClick) {
        onEdgeClick(event.target.id, event);
      }
    });

    // 选择变化事件
    renderer.on('selection:change', (event) => {
      const selection = event.data as { nodes: string[]; edges: string[] };
      setCurrentSelection(selection);
      if (onSelectionChange) {
        onSelectionChange(selection);
      }
    });

    // 画布点击事件（清除选择）
    renderer.on('canvas:click', () => {
      setCurrentSelection({ nodes: [], edges: [] });
      if (onSelectionChange) {
        onSelectionChange({ nodes: [], edges: [] });
      }
    });
  }, [onNodeClick, onNodeDoubleClick, onEdgeClick, onSelectionChange]);

  // 更新渲染器数据
  const updateRenderer = useCallback(() => {
    if (!rendererRef.current || !currentVisualizationData) return;

    rendererRef.current.update(currentVisualizationData);
  }, [currentVisualizationData]);

  // 处理错误
  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  // 初始化和数据变化时重新渲染
  useEffect(() => {
    if (currentVisualizationData) {
      if (isInitialized) {
        updateRenderer();
      } else {
        initializeRenderer();
      }
    }
  }, [currentVisualizationData, isInitialized, initializeRenderer, updateRenderer]);

  // 配置变化时更新渲染器
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setLayout(mergedLayoutConfig);
      rendererRef.current.setVisualConfig(mergedVisualConfig);
      rendererRef.current.enableInteraction(mergedInteractionConfig);
    }
  }, [mergedLayoutConfig, mergedVisualConfig, mergedInteractionConfig]);

  // 清理
  useEffect(() => {
    return () => {
      if (rendererRef.current) {
        rendererRef.current.destroy();
      }
    };
  }, []);

  // 公开的方法
  const zoomToFit = useCallback((padding?: number) => {
    if (rendererRef.current) {
      rendererRef.current.zoomToFit(padding);
    }
  }, []);

  const zoomToNodes = useCallback((nodeIds: string[], padding?: number) => {
    if (rendererRef.current) {
      rendererRef.current.zoomToNodes(nodeIds, padding);
    }
  }, []);

  const centerView = useCallback(() => {
    if (rendererRef.current) {
      rendererRef.current.centerView();
    }
  }, []);

  const selectNodes = useCallback((nodeIds: string[]) => {
    if (rendererRef.current) {
      rendererRef.current.selectNodes(nodeIds);
    }
  }, []);

  const selectEdges = useCallback((edgeIds: string[]) => {
    if (rendererRef.current) {
      rendererRef.current.selectEdges(edgeIds);
    }
  }, []);

  const clearSelection = useCallback(() => {
    if (rendererRef.current) {
      rendererRef.current.clearSelection();
    }
  }, []);

  const getSelection = useCallback(() => {
    return rendererRef.current ? rendererRef.current.getSelection() : { nodes: [], edges: [] };
  }, []);

  // 暴露方法给父组件（通过ref）
  // 注意：这里需要配合forwardRef使用，暂时注释掉
  // React.useImperativeHandle(ref, () => ({
  //   zoomToFit,
  //   zoomToNodes,
  //   centerView,
  //   selectNodes,
  //   selectEdges,
  //   clearSelection,
  //   getSelection,
  //   getRenderer: () => rendererRef.current
  // }))

  // 渲染加载状态
  if (loading) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-50 ${className}`}
        style={{ width, height }}
      >
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">加载知识图谱中...</p>
        </div>
      </div>
    );
  }

  // 渲染错误状态
  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-red-50 border border-red-200 rounded-lg ${className}`}
        style={{ width, height }}
      >
        <div className="text-center">
          <div className="text-red-600 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-red-800 font-medium">加载图谱失败</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  // 渲染空状态
  if (!currentGraph || !currentVisualizationData) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg ${className}`}
        style={{ width, height }}
      >
        <div className="text-center">
          <div className="text-gray-400 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-600 font-medium">暂无图谱数据</p>
          <p className="text-gray-500 text-sm mt-1">请选择一个知识图谱进行查看</p>
        </div>
      </div>
    );
  }

  // 主要渲染
  return (
    <div className={`relative ${className}`}>
      {/* 图谱容器 */}
      <div
        ref={containerRef}
        className="w-full h-full border border-gray-200 rounded-lg overflow-hidden bg-white"
        style={{ width, height }}
      />

      {/* 图谱信息覆盖层 */}
      <div className="absolute top-4 left-4 bg-white bg-opacity-90 rounded-lg px-3 py-2 shadow-sm">
        <h3 className="font-medium text-gray-900 text-sm">{currentGraph.name}</h3>
        <div className="flex items-center space-x-4 text-xs text-gray-600 mt-1">
          <span>{currentGraph.nodes.length} 节点</span>
          <span>{currentGraph.edges.length} 边</span>
          {currentSelection.nodes.length > 0 && (
            <span className="text-blue-600">
              已选择 {currentSelection.nodes.length} 节点
            </span>
          )}
        </div>
      </div>

      {/* 控制按钮 */}
      <div className="absolute top-4 right-4 flex flex-col space-y-2">
        <button
          onClick={() => zoomToFit()}
          className="p-2 bg-white bg-opacity-90 rounded-lg shadow-sm hover:bg-opacity-100 transition-all"
          title="适应窗口"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>

        <button
          onClick={() => centerView()}
          className="p-2 bg-white bg-opacity-90 rounded-lg shadow-sm hover:bg-opacity-100 transition-all"
          title="居中显示"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
        </button>

        {currentSelection.nodes.length > 0 && (
          <button
            onClick={() => zoomToNodes(currentSelection.nodes)}
            className="p-2 bg-blue-600 bg-opacity-90 rounded-lg shadow-sm hover:bg-opacity-100 transition-all text-white"
            title="缩放到选中节点"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

export default KnowledgeGraphViewer;
