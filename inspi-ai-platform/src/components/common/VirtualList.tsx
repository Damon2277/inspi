/**
 * 虚拟列表组件 - 优化大数据集渲染性能
 */
'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { logger } from '@/lib/logging/logger';

/**
 * 虚拟列表配置
 */
export interface VirtualListConfig {
  // 列表项高度（固定高度）
  itemHeight?: number;
  // 动态高度计算函数
  getItemHeight?: (index: number, item: any) => number;
  // 容器高度
  containerHeight: number;
  // 缓冲区大小（渲染额外的项目数）
  bufferSize?: number;
  // 滚动节流延迟
  scrollThrottle?: number;
  // 是否启用水平滚动
  horizontal?: boolean;
  // 预估项目高度（用于动态高度）
  estimatedItemHeight?: number;
  // 是否启用滚动到底部加载更多
  enableLoadMore?: boolean;
  // 加载更多的阈值
  loadMoreThreshold?: number;
}

/**
 * 虚拟列表项信息
 */
interface VirtualListItem {
  index: number;
  top: number;
  height: number;
  bottom: number;
}

/**
 * 虚拟列表属性
 */
interface VirtualListProps<T> {
  // 数据源
  data: T[];
  // 渲染项目的函数
  renderItem: (item: T, index: number) => React.ReactNode;
  // 配置
  config: VirtualListConfig;
  // 加载更多回调
  onLoadMore?: () => void;
  // 滚动回调
  onScroll?: (scrollTop: number, scrollLeft: number) => void;
  // 可见范围变化回调
  onVisibleRangeChange?: (startIndex: number, endIndex: number) => void;
  // 自定义容器样式
  containerStyle?: React.CSSProperties;
  // 自定义列表样式
  listStyle?: React.CSSProperties;
  // 加载中组件
  loadingComponent?: React.ComponentType;
  // 空状态组件
  emptyComponent?: React.ComponentType;
  // 错误组件
  errorComponent?: React.ComponentType<{ error: Error; retry: () => void }>;
}

/**
 * 虚拟列表组件
 */
function VirtualList<T>({
  data,
  renderItem,
  config,
  onLoadMore,
  onScroll,
  onVisibleRangeChange,
  containerStyle,
  listStyle,
  loadingComponent: LoadingComponent,
  emptyComponent: EmptyComponent,
  errorComponent: ErrorComponent
}: VirtualListProps<T>) {
  const {
    itemHeight = 50,
    getItemHeight,
    containerHeight,
    bufferSize = 5,
    scrollThrottle = 16,
    horizontal = false,
    estimatedItemHeight = 50,
    enableLoadMore = false,
    loadMoreThreshold = 100
  } = config;

  // 状态
  const [scrollOffset, setScrollOffset] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // 引用
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const itemHeightsRef = useRef<Map<number, number>>(new Map());
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 计算项目位置信息
  const itemPositions = useMemo(() => {
    const positions: VirtualListItem[] = [];
    let offset = 0;

    for (let i = 0; i < data.length; i++) {
      const height = getItemHeight 
        ? getItemHeight(i, data[i])
        : itemHeightsRef.current.get(i) || itemHeight || estimatedItemHeight;

      positions.push({
        index: i,
        top: offset,
        height,
        bottom: offset + height
      });

      offset += height;
    }

    return positions;
  }, [data, getItemHeight, itemHeight, estimatedItemHeight]);

  // 计算总高度
  const totalSize = useMemo(() => {
    if (itemPositions.length === 0) return 0;
    return itemPositions[itemPositions.length - 1].bottom;
  }, [itemPositions]);

  // 计算可见范围
  const visibleRange = useMemo(() => {
    if (itemPositions.length === 0) {
      return { startIndex: 0, endIndex: 0, visibleItems: [] };
    }

    const containerSize = horizontal ? containerRef.current?.clientWidth || 0 : containerHeight;
    const scrollStart = scrollOffset;
    const scrollEnd = scrollStart + containerSize;

    // 二分查找起始索引
    let startIndex = 0;
    let endIndex = itemPositions.length - 1;

    while (startIndex < endIndex) {
      const mid = Math.floor((startIndex + endIndex) / 2);
      if (itemPositions[mid].bottom <= scrollStart) {
        startIndex = mid + 1;
      } else {
        endIndex = mid;
      }
    }

    // 查找结束索引
    let visibleEndIndex = startIndex;
    while (
      visibleEndIndex < itemPositions.length &&
      itemPositions[visibleEndIndex].top < scrollEnd
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
  }, [itemPositions, scrollOffset, containerHeight, horizontal, bufferSize]);

  // 节流滚动处理
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const newScrollOffset = horizontal ? target.scrollLeft : target.scrollTop;

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      setScrollOffset(newScrollOffset);
      
      // 调用滚动回调
      if (onScroll) {
        onScroll(target.scrollTop, target.scrollLeft);
      }

      // 检查是否需要加载更多
      if (enableLoadMore && onLoadMore && !isLoadingMore) {
        const scrollBottom = target.scrollTop + target.clientHeight;
        const shouldLoadMore = totalSize - scrollBottom < loadMoreThreshold;
        
        if (shouldLoadMore) {
          setIsLoadingMore(true);
          onLoadMore();
        }
      }
    }, scrollThrottle);
  }, [horizontal, onScroll, enableLoadMore, onLoadMore, isLoadingMore, totalSize, loadMoreThreshold, scrollThrottle]);

  // 可见范围变化回调
  useEffect(() => {
    if (onVisibleRangeChange) {
      onVisibleRangeChange(visibleRange.startIndex, visibleRange.endIndex);
    }
  }, [visibleRange.startIndex, visibleRange.endIndex, onVisibleRangeChange]);

  // 重置加载更多状态
  useEffect(() => {
    if (isLoadingMore) {
      const timer = setTimeout(() => {
        setIsLoadingMore(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isLoadingMore]);

  // 滚动到指定索引
  const scrollToIndex = useCallback((index: number, align: 'start' | 'center' | 'end' = 'start') => {
    if (!scrollElementRef.current || index < 0 || index >= itemPositions.length) {
      return;
    }

    const item = itemPositions[index];
    const containerSize = horizontal ? containerRef.current?.clientWidth || 0 : containerHeight;
    
    let scrollTo = item.top;

    switch (align) {
      case 'center':
        scrollTo = item.top - (containerSize - item.height) / 2;
        break;
      case 'end':
        scrollTo = item.bottom - containerSize;
        break;
    }

    scrollTo = Math.max(0, Math.min(scrollTo, totalSize - containerSize));

    if (horizontal) {
      scrollElementRef.current.scrollLeft = scrollTo;
    } else {
      scrollElementRef.current.scrollTop = scrollTo;
    }
  }, [itemPositions, horizontal, containerHeight, totalSize]);

  // 获取项目元素引用回调
  const getItemRef = useCallback((index: number) => (element: HTMLDivElement | null) => {
    if (element && getItemHeight) {
      const height = horizontal ? element.offsetWidth : element.offsetHeight;
      if (height !== itemHeightsRef.current.get(index)) {
        itemHeightsRef.current.set(index, height);
        // 触发重新计算（通过强制更新）
        setScrollOffset(prev => prev);
      }
    }
  }, [getItemHeight, horizontal]);

  // 重试函数
  const retry = useCallback(() => {
    setError(null);
    setIsLoadingMore(false);
  }, []);

  // 错误处理
  if (error && ErrorComponent) {
    return <ErrorComponent error={error} retry={retry} />;
  }

  // 空状态
  if (data.length === 0 && EmptyComponent) {
    return <EmptyComponent />;
  }

  const containerProps = {
    ref: containerRef,
    style: {
      height: containerHeight,
      overflow: 'auto',
      ...containerStyle
    },
    onScroll: handleScroll
  };

  const listProps = {
    ref: scrollElementRef,
    style: {
      position: 'relative' as const,
      [horizontal ? 'width' : 'height']: totalSize,
      [horizontal ? 'height' : 'width']: '100%',
      ...listStyle
    }
  };

  return (
    <div {...containerProps}>
      <div {...listProps}>
        {visibleRange.visibleItems.map((item) => {
          const itemData = data[item.index];
          const itemStyle: React.CSSProperties = {
            position: 'absolute',
            [horizontal ? 'left' : 'top']: item.top,
            [horizontal ? 'width' : 'height']: item.height,
            [horizontal ? 'height' : 'width']: '100%'
          };

          return (
            <div
              key={item.index}
              ref={getItemRef(item.index)}
              style={itemStyle}
              data-index={item.index}
            >
              {renderItem(itemData, item.index)}
            </div>
          );
        })}
        
        {/* 加载更多指示器 */}
        {isLoadingMore && LoadingComponent && (
          <div
            style={{
              position: 'absolute',
              [horizontal ? 'left' : 'top']: totalSize,
              [horizontal ? 'width' : 'height']: 50,
              [horizontal ? 'height' : 'width']: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <LoadingComponent />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 虚拟网格组件
 */
interface VirtualGridProps<T> {
  data: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemWidth: number;
  itemHeight: number;
  containerWidth: number;
  containerHeight: number;
  gap?: number;
  onLoadMore?: () => void;
  onScroll?: (scrollTop: number, scrollLeft: number) => void;
}

export function VirtualGrid<T>({
  data,
  renderItem,
  itemWidth,
  itemHeight,
  containerWidth,
  containerHeight,
  gap = 0,
  onLoadMore,
  onScroll
}: VirtualGridProps<T>) {
  const columnsCount = Math.floor((containerWidth + gap) / (itemWidth + gap));
  const rowsCount = Math.ceil(data.length / columnsCount);

  const gridData = useMemo(() => {
    const rows: T[][] = [];
    for (let i = 0; i < rowsCount; i++) {
      const startIndex = i * columnsCount;
      const endIndex = Math.min(startIndex + columnsCount, data.length);
      rows.push(data.slice(startIndex, endIndex));
    }
    return rows;
  }, [data, rowsCount, columnsCount]);

  const renderRow = useCallback((row: T[], rowIndex: number) => {
    return (
      <div
        key={rowIndex}
        style={{
          display: 'flex',
          gap,
          width: '100%',
          height: itemHeight
        }}
      >
        {row.map((item, colIndex) => {
          const itemIndex = rowIndex * columnsCount + colIndex;
          return (
            <div
              key={itemIndex}
              style={{
                width: itemWidth,
                height: itemHeight,
                flexShrink: 0
              }}
            >
              {renderItem(item, itemIndex)}
            </div>
          );
        })}
      </div>
    );
  }, [renderItem, itemWidth, itemHeight, gap, columnsCount]);

  return (
    <VirtualList
      data={gridData}
      renderItem={renderRow}
      config={{
        itemHeight: itemHeight + gap,
        containerHeight,
        bufferSize: 2
      }}
      onLoadMore={onLoadMore}
      onScroll={onScroll}
    />
  );
}

/**
 * 虚拟列表Hook
 */
export function useVirtualList<T>(
  data: T[],
  config: VirtualListConfig
) {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 });
  const [scrollOffset, setScrollOffset] = useState(0);

  const handleVisibleRangeChange = useCallback((startIndex: number, endIndex: number) => {
    setVisibleRange({ start: startIndex, end: endIndex });
  }, []);

  const handleScroll = useCallback((scrollTop: number, scrollLeft: number) => {
    setScrollOffset(config.horizontal ? scrollLeft : scrollTop);
  }, [config.horizontal]);

  return {
    visibleRange,
    scrollOffset,
    onVisibleRangeChange: handleVisibleRangeChange,
    onScroll: handleScroll
  };
}

/**
 * 默认组件
 */
const DefaultLoadingComponent: React.FC = () => (
  <div style={{ padding: '20px', textAlign: 'center' }}>
    加载中...
  </div>
);

const DefaultEmptyComponent: React.FC = () => (
  <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
    暂无数据
  </div>
);

const DefaultErrorComponent: React.FC<{ error: Error; retry: () => void }> = ({ error, retry }) => (
  <div style={{ padding: '40px', textAlign: 'center' }}>
    <div style={{ color: '#f56565', marginBottom: '16px' }}>
      加载失败: {error.message}
    </div>
    <button
      onClick={retry}
      style={{
        padding: '8px 16px',
        backgroundColor: '#3182ce',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
      }}
    >
      重试
    </button>
  </div>
);

// 设置默认组件
VirtualList.defaultProps = {
  loadingComponent: DefaultLoadingComponent,
  emptyComponent: DefaultEmptyComponent,
  errorComponent: DefaultErrorComponent
};

export default VirtualList;