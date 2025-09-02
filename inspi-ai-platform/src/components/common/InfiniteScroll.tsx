/**
 * 无限滚动组件
 */
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { logger } from '@/lib/logging/logger';

/**
 * 无限滚动配置
 */
export interface InfiniteScrollConfig {
  // 触发加载更多的阈值（距离底部的像素）
  threshold?: number;
  // 是否启用
  enabled?: boolean;
  // 是否有更多数据
  hasMore?: boolean;
  // 加载延迟（防抖）
  loadDelay?: number;
  // 初始加载
  initialLoad?: boolean;
  // 反向滚动（向上加载更多）
  reverse?: boolean;
  // 使用窗口滚动而不是容器滚动
  useWindow?: boolean;
  // 自定义根元素
  root?: Element | null;
  // 根边距
  rootMargin?: string;
}

/**
 * 无限滚动状态
 */
export interface InfiniteScrollState {
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  page: number;
  totalLoaded: number;
}

/**
 * 无限滚动属性
 */
interface InfiniteScrollProps {
  // 子组件
  children: React.ReactNode;
  // 加载更多回调
  onLoadMore: (page: number) => Promise<boolean>;
  // 配置
  config?: InfiniteScrollConfig;
  // 加载中组件
  loadingComponent?: React.ComponentType;
  // 错误组件
  errorComponent?: React.ComponentType<{ error: Error; retry: () => void }>;
  // 没有更多数据组件
  endComponent?: React.ComponentType;
  // 容器样式
  containerStyle?: React.CSSProperties;
  // 容器类名
  containerClassName?: string;
  // 加载更多回调（简化版）
  onLoad?: () => void;
  // 错误回调
  onError?: (error: Error) => void;
  // 状态变化回调
  onStateChange?: (state: InfiniteScrollState) => void;
}

/**
 * 无限滚动组件
 */
const InfiniteScroll: React.FC<InfiniteScrollProps> = ({
  children,
  onLoadMore,
  config = {},
  loadingComponent: LoadingComponent = DefaultLoadingComponent,
  errorComponent: ErrorComponent = DefaultErrorComponent,
  endComponent: EndComponent = DefaultEndComponent,
  containerStyle,
  containerClassName,
  onLoad,
  onError,
  onStateChange
}) => {
  const {
    threshold = 100,
    enabled = true,
    hasMore: configHasMore = true,
    loadDelay = 200,
    initialLoad = false,
    reverse = false,
    useWindow = false,
    root = null,
    rootMargin = '0px'
  } = config;

  // 状态
  const [state, setState] = useState<InfiniteScrollState>({
    loading: false,
    error: null,
    hasMore: configHasMore,
    page: 0,
    totalLoaded: 0
  });

  // 引用
  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadingRef = useRef(false);

  // 更新状态并触发回调
  const updateState = useCallback((newState: Partial<InfiniteScrollState>) => {
    setState(prevState => {
      const updatedState = { ...prevState, ...newState };
      onStateChange?.(updatedState);
      return updatedState;
    });
  }, [onStateChange]);

  // 加载更多数据
  const loadMore = useCallback(async () => {
    if (!enabled || state.loading || !state.hasMore || isLoadingRef.current) {
      return;
    }

    isLoadingRef.current = true;
    updateState({ loading: true, error: null });

    try {
      const nextPage = state.page + 1;
      logger.debug('Loading more data', { page: nextPage });

      let hasMoreData = true;
      
      if (onLoadMore) {
        hasMoreData = await onLoadMore(nextPage);
      } else if (onLoad) {
        onLoad();
      }

      updateState({
        loading: false,
        page: nextPage,
        hasMore: hasMoreData,
        totalLoaded: state.totalLoaded + 1
      });

      logger.debug('Data loaded successfully', { 
        page: nextPage, 
        hasMore: hasMoreData 
      });

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      
      updateState({
        loading: false,
        error: err
      });

      onError?.(err);
      
      logger.error('Failed to load more data', err, { page: state.page + 1 });
    } finally {
      isLoadingRef.current = false;
    }
  }, [enabled, state.loading, state.hasMore, state.page, state.totalLoaded, onLoadMore, onLoad, onError, updateState]);

  // 延迟加载（防抖）
  const debouncedLoadMore = useCallback(() => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }

    loadTimeoutRef.current = setTimeout(() => {
      loadMore();
    }, loadDelay);
  }, [loadMore, loadDelay]);

  // 重试加载
  const retry = useCallback(() => {
    updateState({ error: null });
    loadMore();
  }, [loadMore, updateState]);

  // 滚动事件处理（用于非Intersection Observer的情况）
  const handleScroll = useCallback(() => {
    if (!enabled || state.loading || !state.hasMore) {
      return;
    }

    const container = useWindow ? window : containerRef.current;
    if (!container) return;

    let scrollTop: number;
    let scrollHeight: number;
    let clientHeight: number;

    if (useWindow) {
      scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      scrollHeight = document.documentElement.scrollHeight;
      clientHeight = window.innerHeight;
    } else {
      const element = container as HTMLElement;
      scrollTop = element.scrollTop;
      scrollHeight = element.scrollHeight;
      clientHeight = element.clientHeight;
    }

    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const shouldLoad = reverse 
      ? scrollTop <= threshold
      : distanceFromBottom <= threshold;

    if (shouldLoad) {
      debouncedLoadMore();
    }
  }, [enabled, state.loading, state.hasMore, useWindow, threshold, reverse, debouncedLoadMore]);

  // 设置Intersection Observer
  useEffect(() => {
    if (!sentinelRef.current || !enabled) {
      return;
    }

    const sentinel = sentinelRef.current;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && state.hasMore && !state.loading) {
          debouncedLoadMore();
        }
      },
      {
        root: useWindow ? null : (root || containerRef.current),
        rootMargin,
        threshold: 0.1
      }
    );

    observer.observe(sentinel);
    observerRef.current = observer;

    return () => {
      observer.disconnect();
    };
  }, [enabled, state.hasMore, state.loading, useWindow, root, rootMargin, debouncedLoadMore]);

  // 设置滚动监听（备用方案）
  useEffect(() => {
    if (!enabled || observerRef.current) {
      return; // 如果Intersection Observer可用，则不使用滚动监听
    }

    const container = useWindow ? window : containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [enabled, useWindow, handleScroll]);

  // 初始加载
  useEffect(() => {
    if (initialLoad && enabled && state.page === 0 && !state.loading) {
      loadMore();
    }
  }, [initialLoad, enabled, state.page, state.loading, loadMore]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, []);

  // 渲染加载状态
  const renderLoadingState = () => {
    if (!state.loading) return null;
    return <LoadingComponent />;
  };

  // 渲染错误状态
  const renderErrorState = () => {
    if (!state.error) return null;
    return <ErrorComponent error={state.error} retry={retry} />;
  };

  // 渲染结束状态
  const renderEndState = () => {
    if (state.hasMore || state.loading || state.error) return null;
    return <EndComponent />;
  };

  // 渲染哨兵元素
  const renderSentinel = () => {
    if (!enabled || !state.hasMore || state.error) return null;
    
    return (
      <div
        ref={sentinelRef}
        style={{
          height: '1px',
          width: '100%',
          visibility: 'hidden'
        }}
        data-testid="infinite-scroll-sentinel"
      />
    );
  };

  const containerProps = {
    ref: containerRef,
    style: {
      overflow: useWindow ? 'visible' : 'auto',
      ...containerStyle
    },
    className: containerClassName
  };

  return (
    <div {...containerProps}>
      {reverse && renderSentinel()}
      {reverse && renderLoadingState()}
      {reverse && renderErrorState()}
      
      {children}
      
      {!reverse && renderSentinel()}
      {!reverse && renderLoadingState()}
      {!reverse && renderErrorState()}
      {!reverse && renderEndState()}
    </div>
  );
};

/**
 * 无限滚动Hook
 */
export function useInfiniteScroll<T>(
  fetchData: (page: number) => Promise<{ data: T[]; hasMore: boolean }>,
  config: InfiniteScrollConfig = {}
) {
  const [data, setData] = useState<T[]>([]);
  const [state, setState] = useState<InfiniteScrollState>({
    loading: false,
    error: null,
    hasMore: true,
    page: 0,
    totalLoaded: 0
  });

  const loadMore = useCallback(async (page: number): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const result = await fetchData(page);
      
      setData(prev => page === 1 ? result.data : [...prev, ...result.data]);
      setState(prev => ({
        ...prev,
        loading: false,
        page,
        hasMore: result.hasMore,
        totalLoaded: prev.totalLoaded + result.data.length
      }));

      return result.hasMore;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      setState(prev => ({ ...prev, loading: false, error: err }));
      throw err;
    }
  }, [fetchData]);

  const reset = useCallback(() => {
    setData([]);
    setState({
      loading: false,
      error: null,
      hasMore: true,
      page: 0,
      totalLoaded: 0
    });
  }, []);

  const retry = useCallback(() => {
    if (state.error) {
      loadMore(state.page || 1);
    }
  }, [state.error, state.page, loadMore]);

  return {
    data,
    state,
    loadMore,
    reset,
    retry
  };
}

/**
 * 默认组件
 */
const DefaultLoadingComponent: React.FC = () => (
  <div style={{ 
    padding: '20px', 
    textAlign: 'center',
    color: '#666'
  }}>
    <div style={{
      display: 'inline-block',
      width: '20px',
      height: '20px',
      border: '2px solid #f3f3f3',
      borderTop: '2px solid #3498db',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }} />
    <div style={{ marginTop: '8px', fontSize: '14px' }}>
      加载中...
    </div>
    <style jsx>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

const DefaultErrorComponent: React.FC<{ error: Error; retry: () => void }> = ({ error, retry }) => (
  <div style={{ 
    padding: '20px', 
    textAlign: 'center',
    color: '#e74c3c'
  }}>
    <div style={{ marginBottom: '12px', fontSize: '14px' }}>
      加载失败: {error.message}
    </div>
    <button
      onClick={retry}
      style={{
        padding: '8px 16px',
        backgroundColor: '#3498db',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px'
      }}
    >
      重试
    </button>
  </div>
);

const DefaultEndComponent: React.FC = () => (
  <div style={{ 
    padding: '20px', 
    textAlign: 'center',
    color: '#95a5a6',
    fontSize: '14px'
  }}>
    没有更多数据了
  </div>
);

/**
 * 无限滚动列表组件
 */
interface InfiniteScrollListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  onLoadMore: (page: number) => Promise<boolean>;
  config?: InfiniteScrollConfig;
  listStyle?: React.CSSProperties;
  itemStyle?: React.CSSProperties;
}

export function InfiniteScrollList<T>({
  items,
  renderItem,
  onLoadMore,
  config,
  listStyle,
  itemStyle
}: InfiniteScrollListProps<T>) {
  return (
    <InfiniteScroll onLoadMore={onLoadMore} config={config}>
      <div style={listStyle}>
        {items.map((item, index) => (
          <div key={index} style={itemStyle}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </InfiniteScroll>
  );
}

/**
 * 无限滚动网格组件
 */
interface InfiniteScrollGridProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  onLoadMore: (page: number) => Promise<boolean>;
  columns?: number;
  gap?: number;
  config?: InfiniteScrollConfig;
}

export function InfiniteScrollGrid<T>({
  items,
  renderItem,
  onLoadMore,
  columns = 3,
  gap = 16,
  config
}: InfiniteScrollGridProps<T>) {
  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    gap: `${gap}px`
  };

  return (
    <InfiniteScroll onLoadMore={onLoadMore} config={config}>
      <div style={gridStyle}>
        {items.map((item, index) => (
          <div key={index}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </InfiniteScroll>
  );
}

export default InfiniteScroll;