/**
 * 性能优化综合测试
 */
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import PerformanceOptimizer, { usePerformanceOptimizer } from '@/components/common/PerformanceOptimizer';
import { useDataLazyLoad, usePaginatedDataLazyLoad, useSearchDataLazyLoad, cacheUtils } from '@/hooks/useDataLazyLoad';
import { useVirtualization } from '@/hooks/useVirtualization';
import { globalMemoryMonitor } from '@/lib/performance/memory';

// Mock dependencies
jest.mock('@/lib/logging/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

jest.mock('@/lib/performance/memory', () => ({
  globalMemoryMonitor: {
    start: jest.fn(),
    stop: jest.fn(),
    getCurrentMemoryInfo: jest.fn(() => ({
      usedJSHeapSize: 50000000,
      totalJSHeapSize: 100000000,
      jsHeapSizeLimit: 200000000,
      usagePercentage: 25,
      isNearLimit: false
    }))
  }
}));

jest.mock('@/lib/performance/code-splitting', () => ({
  globalCodeSplittingManager: {
    preloadCriticalChunks: jest.fn(),
    prefetchRoute: jest.fn(),
    optimizeChunkLoading: jest.fn()
  }
}));

jest.mock('@/lib/performance/first-paint', () => {
  return jest.fn().mockImplementation(() => ({
    optimize: jest.fn(),
    preloadCriticalResources: jest.fn()
  }));
});

jest.mock('@/lib/performance/metrics', () => {
  return jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn()
  }));
});

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    memory: {
      usedJSHeapSize: 50000000,
      totalJSHeapSize: 100000000,
      jsHeapSizeLimit: 200000000
    },
    getEntriesByType: jest.fn(() => [{
      loadEventEnd: 1000,
      loadEventStart: 500,
      domInteractive: 800,
      navigationStart: 0
    }])
  },
  writable: true
});

describe('Performance Optimization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cacheUtils.clearAll();
  });

  describe('PerformanceOptimizer Component', () => {
    it('should render children and initialize monitoring', () => {
      render(
        <PerformanceOptimizer
          config={{
            memoryMonitoring: { enabled: true },
            performanceMonitoring: { enabled: true }
          }}
        >
          <div data-testid="child">Test Content</div>
        </PerformanceOptimizer>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(globalMemoryMonitor.start).toHaveBeenCalled();
    });

    it('should show dev tools in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(
        <PerformanceOptimizer
          config={{
            devTools: {
              enabled: true,
              showMemoryInfo: true,
              showPerformanceInfo: true
            }
          }}
        >
          <div>Test Content</div>
        </PerformanceOptimizer>
      );

      expect(screen.getByText('Performance Monitor')).toBeInTheDocument();
      expect(screen.getByText(/Memory:/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Optimize/ })).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle optimization button click', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(
        <PerformanceOptimizer
          config={{
            devTools: { enabled: true }
          }}
        >
          <div>Test Content</div>
        </PerformanceOptimizer>
      );

      const optimizeButton = screen.getByRole('button', { name: /Optimize/ });
      
      await act(async () => {
        fireEvent.click(optimizeButton);
      });

      expect(optimizeButton).toBeDisabled();
      expect(screen.getByText('Optimizing...')).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('usePerformanceOptimizer Hook', () => {
    it('should provide performance stats and optimization function', () => {
      const { result } = renderHook(() => usePerformanceOptimizer());

      expect(result.current.stats).toBeDefined();
      expect(result.current.isOptimizing).toBe(false);
      expect(typeof result.current.optimize).toBe('function');
      expect(typeof result.current.getRecommendations).toBe('function');
    });

    it('should handle optimization process', async () => {
      const { result } = renderHook(() => usePerformanceOptimizer());

      await act(async () => {
        await result.current.optimize();
      });

      expect(result.current.isOptimizing).toBe(false);
    });

    it('should provide recommendations based on stats', () => {
      // Mock high memory usage
      (globalMemoryMonitor.getCurrentMemoryInfo as jest.Mock).mockReturnValue({
        usedJSHeapSize: 180000000,
        totalJSHeapSize: 200000000,
        jsHeapSizeLimit: 200000000,
        usagePercentage: 90,
        isNearLimit: true
      });

      const { result } = renderHook(() => usePerformanceOptimizer());

      act(() => {
        // Trigger stats update
        result.current.optimize();
      });

      const recommendations = result.current.getRecommendations();
      expect(recommendations).toContain('Consider reducing memory usage');
    });
  });

  describe('useDataLazyLoad Hook', () => {
    const mockFetchFn = jest.fn();

    beforeEach(() => {
      mockFetchFn.mockClear();
    });

    it('should handle successful data loading', async () => {
      const testData = { id: 1, name: 'Test' };
      mockFetchFn.mockResolvedValue(testData);

      const { result } = renderHook(() =>
        useDataLazyLoad(mockFetchFn, { autoLoad: true })
      );

      expect(result.current[0].isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current[0].isLoading).toBe(false);
      });

      expect(result.current[0].data).toEqual(testData);
      expect(result.current[0].isLoaded).toBe(true);
      expect(result.current[0].error).toBeNull();
    });

    it('should handle loading errors with retry', async () => {
      const error = new Error('Network error');
      mockFetchFn.mockRejectedValue(error);

      const { result } = renderHook(() =>
        useDataLazyLoad(mockFetchFn, { 
          autoLoad: true,
          retries: 2,
          retryDelay: 100
        })
      );

      await waitFor(() => {
        expect(result.current[0].error).toEqual(error);
      }, { timeout: 2000 });

      expect(mockFetchFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should use cache when available', async () => {
      const testData = { id: 1, name: 'Test' };
      mockFetchFn.mockResolvedValue(testData);

      const cacheKey = 'test-cache-key';

      // First call
      const { result: result1 } = renderHook(() =>
        useDataLazyLoad(mockFetchFn, { 
          cacheKey,
          enableCache: true,
          autoLoad: true
        })
      );

      await waitFor(() => {
        expect(result1.current[0].isLoaded).toBe(true);
      });

      expect(mockFetchFn).toHaveBeenCalledTimes(1);

      // Second call with same cache key
      const { result: result2 } = renderHook(() =>
        useDataLazyLoad(mockFetchFn, { 
          cacheKey,
          enableCache: true,
          autoLoad: true
        })
      );

      await waitFor(() => {
        expect(result2.current[0].isLoaded).toBe(true);
      });

      // Should not call fetch function again due to cache
      expect(mockFetchFn).toHaveBeenCalledTimes(1);
      expect(result2.current[0].data).toEqual(testData);
    });

    it('should handle manual reload', async () => {
      const testData = { id: 1, name: 'Test' };
      mockFetchFn.mockResolvedValue(testData);

      const { result } = renderHook(() =>
        useDataLazyLoad(mockFetchFn, { cacheKey: 'test-reload' })
      );

      // Manual load
      await act(async () => {
        result.current[1](); // load function
      });

      await waitFor(() => {
        expect(result.current[0].isLoaded).toBe(true);
      });

      expect(mockFetchFn).toHaveBeenCalledTimes(1);

      // Manual reload (should clear cache and fetch again)
      await act(async () => {
        result.current[2](); // reload function
      });

      await waitFor(() => {
        expect(result.current[0].isLoaded).toBe(true);
      });

      expect(mockFetchFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('usePaginatedDataLazyLoad Hook', () => {
    const mockPaginatedFetchFn = jest.fn();

    beforeEach(() => {
      mockPaginatedFetchFn.mockClear();
    });

    it('should handle paginated data loading', async () => {
      const mockData = {
        data: [{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }],
        total: 100,
        hasMore: true
      };
      mockPaginatedFetchFn.mockResolvedValue(mockData);

      const { result } = renderHook(() =>
        usePaginatedDataLazyLoad(mockPaginatedFetchFn, 20)
      );

      // Load first page
      await act(async () => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData.data);
      });

      expect(result.current.total).toBe(100);
      expect(result.current.hasMore).toBe(true);
      expect(result.current.page).toBe(2);
    });

    it('should accumulate data across pages', async () => {
      const page1Data = {
        data: [{ id: 1, name: 'Item 1' }],
        total: 100,
        hasMore: true
      };
      const page2Data = {
        data: [{ id: 2, name: 'Item 2' }],
        total: 100,
        hasMore: true
      };

      mockPaginatedFetchFn
        .mockResolvedValueOnce(page1Data)
        .mockResolvedValueOnce(page2Data);

      const { result } = renderHook(() =>
        usePaginatedDataLazyLoad(mockPaginatedFetchFn, 1)
      );

      // Load first page
      await act(async () => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(page1Data.data);
      });

      // Load second page
      await act(async () => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.data).toEqual([...page1Data.data, ...page2Data.data]);
      });
    });

    it('should handle reset functionality', async () => {
      const mockData = {
        data: [{ id: 1, name: 'Item 1' }],
        total: 100,
        hasMore: true
      };
      mockPaginatedFetchFn.mockResolvedValue(mockData);

      const { result } = renderHook(() =>
        usePaginatedDataLazyLoad(mockPaginatedFetchFn, 20)
      );

      // Load data
      await act(async () => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.data.length).toBeGreaterThan(0);
      });

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.data).toEqual([]);
      expect(result.current.page).toBe(1);
      expect(result.current.total).toBe(0);
      expect(result.current.hasMore).toBe(true);
    });
  });

  describe('useSearchDataLazyLoad Hook', () => {
    const mockSearchFn = jest.fn();

    beforeEach(() => {
      mockSearchFn.mockClear();
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should handle debounced search', async () => {
      const searchResults = [{ id: 1, name: 'Search Result' }];
      mockSearchFn.mockResolvedValue(searchResults);

      const { result } = renderHook(() =>
        useSearchDataLazyLoad(mockSearchFn, {
          debounceDelay: 300,
          minQueryLength: 2
        })
      );

      // Start search
      act(() => {
        result.current.search('test');
      });

      expect(result.current.query).toBe('test');
      expect(mockSearchFn).not.toHaveBeenCalled();

      // Fast forward debounce delay
      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(mockSearchFn).toHaveBeenCalledWith('test');
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(searchResults);
      });
    });

    it('should not search for queries below minimum length', async () => {
      const { result } = renderHook(() =>
        useSearchDataLazyLoad(mockSearchFn, {
          minQueryLength: 3
        })
      );

      act(() => {
        result.current.search('te');
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(mockSearchFn).not.toHaveBeenCalled();
    });

    it('should handle search clearing', () => {
      const { result } = renderHook(() =>
        useSearchDataLazyLoad(mockSearchFn)
      );

      act(() => {
        result.current.search('test');
      });

      expect(result.current.query).toBe('test');

      act(() => {
        result.current.clear();
      });

      expect(result.current.query).toBe('');
      expect(result.current.debouncedQuery).toBe('');
    });
  });

  describe('useVirtualization Hook', () => {
    it('should calculate visible items correctly', () => {
      const items = Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `Item ${i}` }));
      
      const { result } = renderHook(() =>
        useVirtualization({
          items,
          itemHeight: 50,
          containerHeight: 400,
          overscan: 5
        })
      );

      expect(result.current.visibleItems.length).toBeGreaterThan(0);
      expect(result.current.visibleItems.length).toBeLessThan(items.length);
      expect(result.current.totalHeight).toBe(50000); // 1000 * 50
    });

    it('should handle scroll position updates', () => {
      const items = Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Item ${i}` }));
      
      const { result } = renderHook(() =>
        useVirtualization({
          items,
          itemHeight: 50,
          containerHeight: 400
        })
      );

      act(() => {
        result.current.handleScroll({ target: { scrollTop: 500 } } as any);
      });

      expect(result.current.scrollTop).toBe(500);
      // Visible items should change based on scroll position
      expect(result.current.visibleItems[0].index).toBeGreaterThan(0);
    });
  });

  describe('Cache Utils', () => {
    it('should clear all cache', () => {
      // Add some cache data
      const { result } = renderHook(() =>
        useDataLazyLoad(() => Promise.resolve('test'), {
          cacheKey: 'test-key',
          autoLoad: true
        })
      );

      cacheUtils.clearAll();

      const stats = cacheUtils.getStats();
      expect(stats.totalItems).toBe(0);
    });

    it('should clear specific cache key', () => {
      cacheUtils.clear('specific-key');
      
      const stats = cacheUtils.getStats();
      expect(stats.totalItems).toBe(0);
    });

    it('should provide cache statistics', () => {
      const stats = cacheUtils.getStats();
      
      expect(stats).toHaveProperty('totalItems');
      expect(stats).toHaveProperty('validItems');
      expect(stats).toHaveProperty('expiredItems');
      expect(stats).toHaveProperty('totalSize');
    });

    it('should cleanup expired cache', () => {
      const cleanedCount = cacheUtils.cleanup();
      expect(typeof cleanedCount).toBe('number');
    });
  });
});