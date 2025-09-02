/**
 * 虚拟化Hook
 */
'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { logger } from '@/lib/logging/logger';

/**
 * 虚拟化配置
 */
export interface VirtualizationConfig {
  // 项目高度（固定高度模式）
  itemHeight?: number;
  // 动态高度计算函数
  getItemHeight?: (index: number) => number;
  // 容器高度
  containerHeight: number;
  // 容器宽度（用于水平虚拟化）
  containerWidth?: number;
  // 缓冲区大小
  bufferSize?: number;
  // 是否水平虚拟化
  horizontal?: boolean;
  // 预估项目高度（动态高度模式）
  estimatedItemHeight?: number;
  // 滚动节流延迟
  scrollThrottle?: number;
  // 是否启用平滑滚动
  smoothScrolling?: boolean;
}

/**
 * 虚拟化项目信息
 */
export interface VirtualItem {
  index: number;
  start: number;
  end: number;
  size: number;
}

/**
 * 虚拟化状态
 */
export interface VirtualizationState {
  scrollOffset: number;
  visibleStartIndex: number;
  visibleEndIndex: number;
  totalSize: number;
  visibleItems: VirtualItem[];
}

/**
 * 虚拟化Hook
 */
export function useVirtualization<T>(
  items: T[],
  config: VirtualizationConfig
): {
  state: VirtualizationState;
  containerRef: React.RefObject<HTMLElement>;
  scrollToIndex: (index: number, align?: 'start' | 'center' | 'end') => void;
  scrollToOffset: (offset: number) => void;
  getItemOffset: (index: number) => number;
  getItemSize: (index: number) => number;
  measureItem: (index: number, size: number) => void;
} {
  const {
    itemHeight = 50,
    getItemHeight,
    containerHeight,
    containerWidth,
    bufferSize = 5,
    horizontal = false,
    estimatedItemHeight = 50,
    scrollThrottle = 16,
    smoothScrolling = true
  } = config;

  // 状态
  const [scrollOffset, setScrollOffset] = useState(0);
  const [measuredSizes, setMeasuredSizes] = useState<Map<number, number>>(new Map());

  // 引用
  const containerRef = useRef<HTMLElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isScrollingRef = useRef(false);

  // 获取项目大小
  const getItemSize = useCallback((index: number): number => {
    if (getItemHeight) {
      return getItemHeight(index);
    }
    
    const measured = measuredSizes.get(index);
    if (measured !== undefined) {
      return measured;
    }
    
    return itemHeight || estimatedItemHeight;
  }, [getItemHeight, measuredSizes, itemHeight, estimatedItemHeight]);

  // 计算项目位置
  const itemPositions = useMemo(() => {
    const positions: VirtualItem[] = [];
    let offset = 0;

    for (let i = 0; i < items.length; i++) {
      const size = getItemSize(i);
      positions.push({
        index: i,
        start: offset,
        end: offset + size,
        size
      });
      offset += size;
    }

    return positions;
  }, [items.length, getItemSize]);

  // 计算总大小
  const totalSize = useMemo(() => {
    if (itemPositions.length === 0) return 0;
    return itemPositions[itemPositions.length - 1].end;
  }, [itemPositions]);

  // 计算可见范围
  const visibleRange = useMemo(() => {
    if (itemPositions.length === 0) {
      return {
        startIndex: 0,
        endIndex: 0,
        visibleItems: []
      };
    }

    const containerSize = horizontal ? (containerWidth || 0) : containerHeight;
    const scrollStart = scrollOffset;
    const scrollEnd = scrollStart + containerSize;

    // 二分查找起始索引
    let startIndex = 0;
    let endIndex = itemPositions.length - 1;

    while (startIndex < endIndex) {
      const mid = Math.floor((startIndex + endIndex) / 2);
      if (itemPositions[mid].end <= scrollStart) {
        startIndex = mid + 1;
      } else {
        endIndex = mid;
      }
    }

    // 查找结束索引
    let visibleEndIndex = startIndex;
    while (
      visibleEndIndex < itemPositions.length &&
      itemPositions[visibleEndIndex].start < scrollEnd
    ) {
      visibleEndIndex++;
    }

    // 添加缓冲区
    const bufferedStartIndex = Math.max(0, startIndex - bufferSize);
    const bufferedEndIndex = Math.min(itemPositions.length - 1, visibleEndIndex + bufferSize);

    const visibleItems = itemPositions.slice(bufferedStartIndex, bufferedEndIndex + 1);

    return {
      startIndex: bufferedStartIndex,
      endIndex: bufferedEndIndex,
      visibleItems
    };
  }, [itemPositions, scrollOffset, containerHeight, containerWidth, horizontal, bufferSize]);

  // 虚拟化状态
  const state: VirtualizationState = useMemo(() => ({
    scrollOffset,
    visibleStartIndex: visibleRange.startIndex,
    visibleEndIndex: visibleRange.endIndex,
    totalSize,
    visibleItems: visibleRange.visibleItems
  }), [scrollOffset, visibleRange, totalSize]);

  // 滚动处理
  const handleScroll = useCallback((event: Event) => {
    const target = event.target as HTMLElement;
    const newScrollOffset = horizontal ? target.scrollLeft : target.scrollTop;

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    isScrollingRef.current = true;

    scrollTimeoutRef.current = setTimeout(() => {
      setScrollOffset(newScrollOffset);
      isScrollingRef.current = false;
    }, scrollThrottle);
  }, [horizontal, scrollThrottle]);

  // 设置滚动监听
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  // 滚动到指定索引
  const scrollToIndex = useCallback((
    index: number, 
    align: 'start' | 'center' | 'end' = 'start'
  ) => {
    const container = containerRef.current;
    if (!container || index < 0 || index >= itemPositions.length) {
      return;
    }

    const item = itemPositions[index];
    const containerSize = horizontal ? (containerWidth || container.clientWidth) : containerHeight;
    
    let scrollTo = item.start;

    switch (align) {
      case 'center':
        scrollTo = item.start - (containerSize - item.size) / 2;
        break;
      case 'end':
        scrollTo = item.end - containerSize;
        break;
    }

    scrollTo = Math.max(0, Math.min(scrollTo, totalSize - containerSize));

    if (smoothScrolling) {
      container.scrollTo({
        [horizontal ? 'left' : 'top']: scrollTo,
        behavior: 'smooth'
      });
    } else {
      if (horizontal) {
        container.scrollLeft = scrollTo;
      } else {
        container.scrollTop = scrollTo;
      }
    }

    logger.debug('Scrolled to index', { index, align, scrollTo });
  }, [itemPositions, horizontal, containerWidth, containerHeight, totalSize, smoothScrolling]);

  // 滚动到指定偏移量
  const scrollToOffset = useCallback((offset: number) => {
    const container = containerRef.current;
    if (!container) return;

    const clampedOffset = Math.max(0, Math.min(offset, totalSize - containerHeight));

    if (smoothScrolling) {
      container.scrollTo({
        [horizontal ? 'left' : 'top']: clampedOffset,
        behavior: 'smooth'
      });
    } else {
      if (horizontal) {
        container.scrollLeft = clampedOffset;
      } else {
        container.scrollTop = clampedOffset;
      }
    }

    logger.debug('Scrolled to offset', { offset: clampedOffset });
  }, [horizontal, totalSize, containerHeight, smoothScrolling]);

  // 获取项目偏移量
  const getItemOffset = useCallback((index: number): number => {
    if (index < 0 || index >= itemPositions.length) {
      return 0;
    }
    return itemPositions[index].start;
  }, [itemPositions]);

  // 测量项目大小
  const measureItem = useCallback((index: number, size: number) => {
    setMeasuredSizes(prev => {
      const newSizes = new Map(prev);
      newSizes.set(index, size);
      return newSizes;
    });
  }, []);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return {
    state,
    containerRef,
    scrollToIndex,
    scrollToOffset,
    getItemOffset,
    getItemSize,
    measureItem
  };
}

/**
 * 固定大小虚拟化Hook
 */
export function useFixedSizeVirtualization<T>(
  items: T[],
  itemSize: number,
  containerSize: number,
  options: {
    bufferSize?: number;
    horizontal?: boolean;
    scrollThrottle?: number;
  } = {}
) {
  return useVirtualization(items, {
    itemHeight: itemSize,
    containerHeight: options.horizontal ? undefined : containerSize,
    containerWidth: options.horizontal ? containerSize : undefined,
    bufferSize: options.bufferSize,
    horizontal: options.horizontal,
    scrollThrottle: options.scrollThrottle
  });
}

/**
 * 动态大小虚拟化Hook
 */
export function useDynamicSizeVirtualization<T>(
  items: T[],
  estimatedItemSize: number,
  containerSize: number,
  getItemSize: (index: number) => number,
  options: {
    bufferSize?: number;
    horizontal?: boolean;
    scrollThrottle?: number;
  } = {}
) {
  return useVirtualization(items, {
    getItemHeight: getItemSize,
    estimatedItemHeight: estimatedItemSize,
    containerHeight: options.horizontal ? undefined : containerSize,
    containerWidth: options.horizontal ? containerSize : undefined,
    bufferSize: options.bufferSize,
    horizontal: options.horizontal,
    scrollThrottle: options.scrollThrottle
  });
}

/**
 * 网格虚拟化Hook
 */
export function useGridVirtualization<T>(
  items: T[],
  itemWidth: number,
  itemHeight: number,
  containerWidth: number,
  containerHeight: number,
  options: {
    gap?: number;
    bufferSize?: number;
    scrollThrottle?: number;
  } = {}
) {
  const { gap = 0, bufferSize = 5, scrollThrottle = 16 } = options;
  
  const columnsCount = Math.floor((containerWidth + gap) / (itemWidth + gap));
  const rowsCount = Math.ceil(items.length / columnsCount);

  // 将一维数据转换为二维网格数据
  const gridData = useMemo(() => {
    const rows: T[][] = [];
    for (let i = 0; i < rowsCount; i++) {
      const startIndex = i * columnsCount;
      const endIndex = Math.min(startIndex + columnsCount, items.length);
      rows.push(items.slice(startIndex, endIndex));
    }
    return rows;
  }, [items, rowsCount, columnsCount]);

  const virtualization = useVirtualization(gridData, {
    itemHeight: itemHeight + gap,
    containerHeight,
    bufferSize,
    scrollThrottle
  });

  return {
    ...virtualization,
    columnsCount,
    rowsCount,
    gridData
  };
}

/**
 * 虚拟化性能监控Hook
 */
export function useVirtualizationPerformance() {
  const [metrics, setMetrics] = useState({
    renderCount: 0,
    averageRenderTime: 0,
    lastRenderTime: 0,
    totalRenderTime: 0
  });

  const startRender = useCallback(() => {
    return performance.now();
  }, []);

  const endRender = useCallback((startTime: number) => {
    const renderTime = performance.now() - startTime;
    
    setMetrics(prev => {
      const newRenderCount = prev.renderCount + 1;
      const newTotalRenderTime = prev.totalRenderTime + renderTime;
      
      return {
        renderCount: newRenderCount,
        averageRenderTime: newTotalRenderTime / newRenderCount,
        lastRenderTime: renderTime,
        totalRenderTime: newTotalRenderTime
      };
    });

    if (renderTime > 16) { // 超过一帧的时间
      logger.warn('Slow virtualization render detected', {
        renderTime,
        threshold: 16
      });
    }
  }, []);

  const resetMetrics = useCallback(() => {
    setMetrics({
      renderCount: 0,
      averageRenderTime: 0,
      lastRenderTime: 0,
      totalRenderTime: 0
    });
  }, []);

  return {
    metrics,
    startRender,
    endRender,
    resetMetrics
  };
}

/**
 * 虚拟化工具函数
 */
export class VirtualizationUtils {
  /**
   * 计算可见项目数量
   */
  static calculateVisibleItemCount(
    containerSize: number,
    itemSize: number,
    bufferSize: number = 0
  ): number {
    return Math.ceil(containerSize / itemSize) + bufferSize * 2;
  }

  /**
   * 估算内存使用量
   */
  static estimateMemoryUsage(
    totalItems: number,
    visibleItems: number,
    itemSizeBytes: number
  ): {
    totalMemory: number;
    virtualizedMemory: number;
    memorySaved: number;
    savingPercentage: number;
  } {
    const totalMemory = totalItems * itemSizeBytes;
    const virtualizedMemory = visibleItems * itemSizeBytes;
    const memorySaved = totalMemory - virtualizedMemory;
    const savingPercentage = (memorySaved / totalMemory) * 100;

    return {
      totalMemory,
      virtualizedMemory,
      memorySaved,
      savingPercentage
    };
  }

  /**
   * 检查是否需要虚拟化
   */
  static shouldVirtualize(
    itemCount: number,
    threshold: number = 100
  ): boolean {
    return itemCount > threshold;
  }

  /**
   * 优化滚动性能
   */
  static optimizeScrollPerformance(
    container: HTMLElement,
    options: {
      enableGPUAcceleration?: boolean;
      enableMomentumScrolling?: boolean;
    } = {}
  ): void {
    const { enableGPUAcceleration = true, enableMomentumScrolling = true } = options;

    if (enableGPUAcceleration) {
      container.style.transform = 'translateZ(0)';
      container.style.willChange = 'scroll-position';
    }

    if (enableMomentumScrolling) {
      container.style.webkitOverflowScrolling = 'touch';
    }

    // 优化滚动条样式
    container.style.scrollbarWidth = 'thin';
  }
}

export default useVirtualization;