/**
 * 虚拟滚动组件
 * 优化大列表渲染性能
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

/**
 * 虚拟滚动配置
 */
interface VirtualScrollConfig {
  itemHeight: number | ((index: number) => number);
  containerHeight: number;
  overscan?: number; // 预渲染的额外项目数
  scrollThreshold?: number; // 滚动阈值
  enableSmoothScrolling?: boolean;
}

/**
 * 虚拟滚动项目接口
 */
interface VirtualScrollItem {
  index: number;
  style: React.CSSProperties;
  data: any;
}

/**
 * 虚拟滚动Props
 */
interface VirtualScrollProps<T> {
  items: T[];
  config: VirtualScrollConfig;
  renderItem: (item: VirtualScrollItem & { data: T }) => React.ReactNode;
  className?: string;
  onScroll?: (scrollTop: number, scrollDirection: 'up' | 'down') => void;
  onEndReached?: () => void;
  endReachedThreshold?: number;
}

/**
 * 虚拟滚动Hook
 */
export function useVirtualScroll<T>(
  items: T[],
  config: VirtualScrollConfig,
) {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(config.containerHeight);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScrollTop = useRef(0);
  const scrollDirection = useRef<'up' | 'down'>('down');

  const { itemHeight, overscan = 5 } = config;

  // 计算项目高度
  const getItemHeight = useCallback((index: number): number => {
    return typeof itemHeight === 'function' ? itemHeight(index) : itemHeight;
  }, [itemHeight]);

  // 计算总高度
  const totalHeight = useMemo(() => {
    if (typeof itemHeight === 'number') {
      return items.length * itemHeight;
    }

    let height = 0;
    for (let i = 0; i < items.length; i++) {
      height += getItemHeight(i);
    }
    return height;
  }, [items.length, getItemHeight]);

  // 计算可见范围
  const visibleRange = useMemo(() => {
    if (typeof itemHeight === 'number') {
      const startIndex = Math.floor(scrollTop / itemHeight);
      const endIndex = Math.min(
        startIndex + Math.ceil(containerHeight / itemHeight),
        items.length - 1,
      );

      return {
        startIndex: Math.max(0, startIndex - overscan),
        endIndex: Math.min(items.length - 1, endIndex + overscan),
        offsetY: startIndex * itemHeight,
      };
    }

    // 动态高度计算
    let accumulatedHeight = 0;
    let startIndex = 0;
    let endIndex = 0;
    let offsetY = 0;

    // 找到开始索引
    for (let i = 0; i < items.length; i++) {
      const height = getItemHeight(i);
      if (accumulatedHeight + height > scrollTop) {
        startIndex = Math.max(0, i - overscan);
        offsetY = accumulatedHeight;
        break;
      }
      accumulatedHeight += height;
    }

    // 找到结束索引
    accumulatedHeight = offsetY;
    for (let i = startIndex; i < items.length; i++) {
      const height = getItemHeight(i);
      if (accumulatedHeight > scrollTop + containerHeight) {
        endIndex = Math.min(items.length - 1, i + overscan);
        break;
      }
      accumulatedHeight += height;
    }

    return { startIndex, endIndex, offsetY };
  }, [scrollTop, containerHeight, items.length, getItemHeight, overscan]);

  // 可见项目
  const visibleItems = useMemo(() => {
    const result: Array<VirtualScrollItem & { data: T }> = [];
    let currentOffset = visibleRange.offsetY;

    for (let i = visibleRange.startIndex; i <= visibleRange.endIndex; i++) {
      if (i >= items.length) break;

      const height = getItemHeight(i);
      result.push({
        index: i,
        data: items[i],
        style: {
          position: 'absolute',
          top: currentOffset,
          left: 0,
          right: 0,
          height: height,
        },
      });

      currentOffset += height;
    }

    return result;
  }, [visibleRange, items, getItemHeight]);

  // 滚动处理
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = event.currentTarget.scrollTop;

    // 确定滚动方向
    scrollDirection.current = newScrollTop > lastScrollTop.current ? 'down' : 'up';
    lastScrollTop.current = newScrollTop;

    setScrollTop(newScrollTop);
  }, []);

  // 滚动到指定索引
  const scrollToIndex = useCallback((index: number, align: 'start' | 'center' | 'end' = 'start') => {
    if (!containerRef.current) return;

    let targetScrollTop = 0;

    if (typeof itemHeight === 'number') {
      targetScrollTop = index * itemHeight;
    } else {
      for (let i = 0; i < index; i++) {
        targetScrollTop += getItemHeight(i);
      }
    }

    // 根据对齐方式调整
    if (align === 'center') {
      targetScrollTop -= containerHeight / 2;
    } else if (align === 'end') {
      targetScrollTop -= containerHeight - getItemHeight(index);
    }

    targetScrollTop = Math.max(0, Math.min(targetScrollTop, totalHeight - containerHeight));

    if (config.enableSmoothScrolling) {
      containerRef.current.scrollTo({
        top: targetScrollTop,
        behavior: 'smooth',
      });
    } else {
      containerRef.current.scrollTop = targetScrollTop;
    }
  }, [containerHeight, totalHeight, getItemHeight, config.enableSmoothScrolling]);

  return {
    containerRef,
    visibleItems,
    totalHeight,
    scrollTop,
    scrollDirection: scrollDirection.current,
    handleScroll,
    scrollToIndex,
    visibleRange,
  };
}

/**
 * 虚拟滚动组件
 */
export function VirtualScroll<T>({
  items,
  config,
  renderItem,
  className = '',
  onScroll,
  onEndReached,
  endReachedThreshold = 0.8,
}: VirtualScrollProps<T>) {
  const {
    containerRef,
    visibleItems,
    totalHeight,
    scrollTop,
    scrollDirection,
    handleScroll,
    scrollToIndex,
    visibleRange,
  } = useVirtualScroll(items, config);

  // 滚动事件处理
  const handleScrollWithCallback = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    handleScroll(event);
    onScroll && onScroll(scrollTop, scrollDirection);

    // 检查是否到达底部
    if (onEndReached) {
      const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
      const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

      if (scrollPercentage >= endReachedThreshold) {
        onEndReached();
      }
    }
  }, [handleScroll, onScroll, scrollTop, scrollDirection, onEndReached, endReachedThreshold]);

  return (
    <div
      ref={containerRef}
      className={`virtual-scroll-container ${className}`}
      style={{
        height: config.containerHeight,
        overflow: 'auto',
        position: 'relative',
      }}
      onScroll={handleScrollWithCallback}
    >
      <div
        className="virtual-scroll-content"
        style={{
          height: totalHeight,
          position: 'relative',
        }}
      >
        {visibleItems.map((item) => (
          <div key={item.index} style={item.style}>
            {renderItem(item)}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 虚拟网格组件
 */
interface VirtualGridProps<T> {
  items: T[];
  itemWidth: number;
  itemHeight: number;
  containerWidth: number;
  containerHeight: number;
  gap?: number;
  renderItem: (item: { index: number; data: T; style: React.CSSProperties }) => React.ReactNode;
  className?: string;
}

export function VirtualGrid<T>({
  items,
  itemWidth,
  itemHeight,
  containerWidth,
  containerHeight,
  gap = 0,
  renderItem,
  className = '',
}: VirtualGridProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // 计算列数
  const columnsCount = Math.floor((containerWidth + gap) / (itemWidth + gap));

  // 计算行数
  const rowsCount = Math.ceil(items.length / columnsCount);

  // 计算总高度
  const totalHeight = rowsCount * (itemHeight + gap) - gap;

  // 计算可见范围
  const visibleRange = useMemo(() => {
    const startRow = Math.floor(scrollTop / (itemHeight + gap));
    const endRow = Math.min(
      startRow + Math.ceil(containerHeight / (itemHeight + gap)) + 1,
      rowsCount - 1,
    );

    return {
      startRow: Math.max(0, startRow),
      endRow: Math.max(0, endRow),
    };
  }, [scrollTop, containerHeight, itemHeight, gap, rowsCount]);

  // 可见项目
  const visibleItems = useMemo(() => {
    const result: Array<{ index: number; data: T; style: React.CSSProperties }> = [];

    for (let row = visibleRange.startRow; row <= visibleRange.endRow; row++) {
      for (let col = 0; col < columnsCount; col++) {
        const index = row * columnsCount + col;
        if (index >= items.length) break;

        result.push({
          index,
          data: items[index],
          style: {
            position: 'absolute',
            left: col * (itemWidth + gap),
            top: row * (itemHeight + gap),
            width: itemWidth,
            height: itemHeight,
          },
        });
      }
    }

    return result;
  }, [visibleRange, items, columnsCount, itemWidth, itemHeight, gap]);

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`virtual-grid-container ${className}`}
      style={{
        width: containerWidth,
        height: containerHeight,
        overflow: 'auto',
        position: 'relative',
      }}
      onScroll={handleScroll}
    >
      <div
        className="virtual-grid-content"
        style={{
          height: totalHeight,
          position: 'relative',
        }}
      >
        {visibleItems.map((item) => (
          <div key={item.index} style={item.style}>
            {renderItem(item)}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 无限滚动Hook
 */
export function useInfiniteScroll<T>(
  initialItems: T[],
  loadMore: (page: number) => Promise<T[]>,
  options: {
    threshold?: number;
    pageSize?: number;
    enabled?: boolean;
  } = {},
) {
  const { threshold = 0.8, pageSize = 20, enabled = true } = options;

  const [items, setItems] = useState<T[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<Error | null>(null);

  const loadMoreItems = useCallback(async () => {
    if (loading || !hasMore || !enabled) return;

    setLoading(true);
    setError(null);

    try {
      const newItems = await loadMore(page);

      if (newItems.length === 0 || newItems.length < pageSize) {
        setHasMore(false);
      }

      setItems([...items, ...newItems]);
      setPage(page + 1);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('加载失败'));
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, enabled, page, loadMore, pageSize]);

  const reset = useCallback(() => {
    setItems(initialItems);
    setPage(1);
    setHasMore(true);
    setLoading(false);
    setError(null);
  }, [initialItems]);

  return {
    items,
    loading,
    hasMore,
    error,
    loadMore: loadMoreItems,
    reset,
  };
}
