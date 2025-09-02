/**
 * 性能优化测试页面
 */
'use client';

import React, { useState, useEffect } from 'react';
import PerformanceOptimizer, { usePerformanceOptimizer } from '@/components/common/PerformanceOptimizer';
import VirtualList from '@/components/common/VirtualList';
import InfiniteScroll from '@/components/common/InfiniteScroll';
import LazyImage from '@/components/common/LazyImage';
import { useDataLazyLoad, usePaginatedDataLazyLoad, useSearchDataLazyLoad } from '@/hooks/useDataLazyLoad';
import { useVirtualization } from '@/hooks/useVirtualization';

// 模拟数据生成
const generateMockData = (count: number) => {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    title: `Item ${index + 1}`,
    description: `This is a description for item ${index + 1}. It contains some sample text to test performance.`,
    image: `https://picsum.photos/200/150?random=${index + 1}`,
    category: ['Technology', 'Science', 'Art', 'Music', 'Sports'][index % 5],
    createdAt: new Date(Date.now() - Math.random() * 10000000000).toISOString()
  }));
};

// 模拟API调用
const mockApiCall = async (delay: number = 1000) => {
  await new Promise(resolve => setTimeout(resolve, delay));
  return generateMockData(50);
};

const mockPaginatedApiCall = async (page: number, pageSize: number) => {
  await new Promise(resolve => setTimeout(resolve, 500));
  const allData = generateMockData(1000);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const data = allData.slice(startIndex, endIndex);
  
  return {
    data,
    total: allData.length,
    hasMore: endIndex < allData.length
  };
};

const mockSearchApiCall = async (query: string) => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const allData = generateMockData(100);
  return allData.filter(item => 
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.description.toLowerCase().includes(query.toLowerCase())
  );
};

/**
 * 虚拟列表测试组件
 */
const VirtualListTest: React.FC = () => {
  const [data] = useState(() => generateMockData(10000));
  
  const renderItem = (item: any, index: number) => (
    <div
      key={item.id}
      style={{
        padding: '10px',
        borderBottom: '1px solid #eee',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}
    >
      <LazyImage
        src={item.image}
        alt={item.title}
        width={50}
        height={50}
        style={{ borderRadius: '4px' }}
      />
      <div>
        <h4 style={{ margin: 0, fontSize: '14px' }}>{item.title}</h4>
        <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
          {item.description.substring(0, 100)}...
        </p>
        <span style={{ fontSize: '10px', color: '#999' }}>{item.category}</span>
      </div>
    </div>
  );

  return (
    <div style={{ height: '400px', border: '1px solid #ddd', borderRadius: '4px' }}>
      <h3 style={{ padding: '10px', margin: 0, borderBottom: '1px solid #ddd' }}>
        Virtual List (10,000 items)
      </h3>
      <VirtualList
        items={data}
        itemHeight={80}
        renderItem={renderItem}
        height={350}
      />
    </div>
  );
};

/**
 * 无限滚动测试组件
 */
const InfiniteScrollTest: React.FC = () => {
  const { data, state, loadMore } = usePaginatedDataLazyLoad(
    mockPaginatedApiCall,
    20,
    { cacheKey: 'infinite-scroll-test' }
  );

  return (
    <div style={{ height: '400px', border: '1px solid #ddd', borderRadius: '4px' }}>
      <h3 style={{ padding: '10px', margin: 0, borderBottom: '1px solid #ddd' }}>
        Infinite Scroll ({data.length} items loaded)
      </h3>
      <InfiniteScroll
        onLoadMore={loadMore}
        config={{
          hasMore: state.data?.hasMore ?? true,
          threshold: 100
        }}
        style={{ height: '350px', overflow: 'auto' }}
      >
        {data.map((item, index) => (
          <div
            key={item.id}
            style={{
              padding: '10px',
              borderBottom: '1px solid #eee',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <LazyImage
              src={item.image}
              alt={item.title}
              width={50}
              height={50}
              style={{ borderRadius: '4px' }}
            />
            <div>
              <h4 style={{ margin: 0, fontSize: '14px' }}>{item.title}</h4>
              <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
                {item.description.substring(0, 100)}...
              </p>
              <span style={{ fontSize: '10px', color: '#999' }}>{item.category}</span>
            </div>
          </div>
        ))}
      </InfiniteScroll>
    </div>
  );
};

/**
 * 搜索懒加载测试组件
 */
const SearchLazyLoadTest: React.FC = () => {
  const { query, data, state, search, clear } = useSearchDataLazyLoad(
    mockSearchApiCall,
    {
      cacheKey: 'search-test',
      debounceDelay: 300,
      minQueryLength: 2
    }
  );

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '10px' }}>
      <h3 style={{ margin: '0 0 10px 0' }}>Search Lazy Load</h3>
      <div style={{ marginBottom: '10px', display: 'flex', gap: '10px' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => search(e.target.value)}
          placeholder="Search items..."
          style={{
            flex: 1,
            padding: '8px',
            border: '1px solid #ddd',
            borderRadius: '4px'
          }}
        />
        <button
          onClick={clear}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Clear
        </button>
      </div>
      
      {state.isLoading && <div>Searching...</div>}
      {state.error && <div style={{ color: 'red' }}>Error: {state.error.message}</div>}
      
      <div style={{ maxHeight: '300px', overflow: 'auto' }}>
        {data.map((item) => (
          <div
            key={item.id}
            style={{
              padding: '8px',
              borderBottom: '1px solid #eee',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <LazyImage
              src={item.image}
              alt={item.title}
              width={40}
              height={40}
              style={{ borderRadius: '4px' }}
            />
            <div>
              <h5 style={{ margin: 0, fontSize: '12px' }}>{item.title}</h5>
              <p style={{ margin: 0, fontSize: '10px', color: '#666' }}>
                {item.description.substring(0, 80)}...
              </p>
            </div>
          </div>
        ))}
      </div>
      
      {data.length === 0 && !state.isLoading && query.length >= 2 && (
        <div style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
          No results found
        </div>
      )}
    </div>
  );
};

/**
 * 数据懒加载测试组件
 */
const DataLazyLoadTest: React.FC = () => {
  const [state, load, reload] = useDataLazyLoad(
    () => mockApiCall(2000),
    {
      cacheKey: 'data-lazy-load-test',
      cacheTTL: 30000, // 30秒
      autoLoad: true,
      retries: 3
    }
  );

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '10px' }}>
      <h3 style={{ margin: '0 0 10px 0' }}>Data Lazy Load</h3>
      
      <div style={{ marginBottom: '10px', display: 'flex', gap: '10px' }}>
        <button
          onClick={() => load()}
          disabled={state.isLoading}
          style={{
            padding: '8px 16px',
            backgroundColor: state.isLoading ? '#6c757d' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: state.isLoading ? 'not-allowed' : 'pointer'
          }}
        >
          {state.isLoading ? 'Loading...' : 'Load Data'}
        </button>
        
        <button
          onClick={reload}
          disabled={state.isLoading}
          style={{
            padding: '8px 16px',
            backgroundColor: state.isLoading ? '#6c757d' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: state.isLoading ? 'not-allowed' : 'pointer'
          }}
        >
          Reload
        </button>
      </div>
      
      {state.error && (
        <div style={{ color: 'red', marginBottom: '10px' }}>
          Error: {state.error.message}
          {state.retryCount > 0 && ` (Retry ${state.retryCount})`}
        </div>
      )}
      
      {state.lastUpdated && (
        <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
          Last updated: {state.lastUpdated.toLocaleTimeString()}
        </div>
      )}
      
      <div style={{ maxHeight: '200px', overflow: 'auto' }}>
        {state.data?.map((item) => (
          <div
            key={item.id}
            style={{
              padding: '5px',
              borderBottom: '1px solid #eee',
              fontSize: '12px'
            }}
          >
            {item.title} - {item.category}
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * 性能统计组件
 */
const PerformanceStats: React.FC = () => {
  const { stats, isOptimizing, optimize, getRecommendations } = usePerformanceOptimizer();
  const recommendations = getRecommendations();

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '10px' }}>
      <h3 style={{ margin: '0 0 10px 0' }}>Performance Stats</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
        <div>
          <strong>Memory Usage:</strong><br />
          {stats.memory ? `${Math.round(stats.memory.usagePercentage)}%` : 'N/A'}
        </div>
        <div>
          <strong>Load Time:</strong><br />
          {stats.loadTime}ms
        </div>
        <div>
          <strong>Render Time:</strong><br />
          {stats.renderTime}ms
        </div>
        <div>
          <strong>Interactive Time:</strong><br />
          {stats.interactionTime}ms
        </div>
      </div>
      
      <button
        onClick={optimize}
        disabled={isOptimizing}
        style={{
          padding: '8px 16px',
          backgroundColor: isOptimizing ? '#6c757d' : '#dc3545',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: isOptimizing ? 'not-allowed' : 'pointer',
          marginBottom: '10px'
        }}
      >
        {isOptimizing ? 'Optimizing...' : 'Optimize Performance'}
      </button>
      
      {recommendations.length > 0 && (
        <div>
          <strong>Recommendations:</strong>
          <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
            {recommendations.map((rec, index) => (
              <li key={index} style={{ fontSize: '12px' }}>{rec}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

/**
 * 性能优化测试页面
 */
const PerformanceTestPage: React.FC = () => {
  return (
    <PerformanceOptimizer
      config={{
        memoryMonitoring: {
          enabled: true,
          warningThreshold: 70,
          dangerThreshold: 85,
          interval: 5000
        },
        devTools: {
          enabled: true,
          showMemoryInfo: true,
          showPerformanceInfo: true,
          position: 'bottom-right'
        }
      }}
    >
      <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        <h1>Performance Optimization Test Page</h1>
        <p>This page demonstrates various performance optimization techniques including virtual lists, infinite scroll, lazy loading, and memory monitoring.</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <VirtualListTest />
          <InfiniteScrollTest />
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <SearchLazyLoadTest />
          <DataLazyLoadTest />
        </div>
        
        <PerformanceStats />
        
        <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
          <h4>Test Instructions:</h4>
          <ul>
            <li>Scroll through the virtual list to see how it handles 10,000 items efficiently</li>
            <li>Scroll down in the infinite scroll area to load more items automatically</li>
            <li>Type in the search box to see debounced search with lazy loading</li>
            <li>Use the data lazy load buttons to test caching and retry mechanisms</li>
            <li>Monitor the performance stats and use the optimize button when needed</li>
            <li>Check the development tools panel in the bottom-right corner</li>
          </ul>
        </div>
      </div>
    </PerformanceOptimizer>
  );
};

export default PerformanceTestPage;