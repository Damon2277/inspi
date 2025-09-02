/**
 * 性能基准测试套件
 */
import { performance } from 'perf_hooks';
import { globalCustomMetricsCollector } from '@/lib/performance/custom-metrics';
import { globalMemoryMonitor } from '@/lib/performance/memory';
import VirtualList from '@/components/common/VirtualList';
import InfiniteScroll from '@/components/common/InfiniteScroll';
import { useDataLazyLoad } from '@/hooks/useDataLazyLoad';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';

// Mock dependencies
jest.mock('@/lib/logging/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

/**
 * 基准测试结果
 */
interface BenchmarkResult {
  name: string;
  duration: number;
  operations: number;
  opsPerSecond: number;
  memoryUsed: number;
  metadata?: Record<string, any>;
}

/**
 * 基准测试套件
 */
class BenchmarkSuite {
  private results: BenchmarkResult[] = [];

  /**
   * 运行基准测试
   */
  async runBenchmark(
    name: string,
    testFn: () => Promise<void> | void,
    operations: number = 1,
    warmupRuns: number = 3
  ): Promise<BenchmarkResult> {
    // 预热
    for (let i = 0; i < warmupRuns; i++) {
      await testFn();
    }

    // 垃圾回收
    if (global.gc) {
      global.gc();
    }

    const startMemory = process.memoryUsage().heapUsed;
    const startTime = performance.now();

    // 执行测试
    await testFn();

    const endTime = performance.now();
    const endMemory = process.memoryUsage().heapUsed;

    const duration = endTime - startTime;
    const memoryUsed = endMemory - startMemory;
    const opsPerSecond = operations / (duration / 1000);

    const result: BenchmarkResult = {
      name,
      duration,
      operations,
      opsPerSecond,
      memoryUsed
    };

    this.results.push(result);
    return result;
  }

  /**
   * 获取结果
   */
  getResults(): BenchmarkResult[] {
    return [...this.results];
  }

  /**
   * 清除结果
   */
  clearResults(): void {
    this.results = [];
  }

  /**
   * 生成报告
   */
  generateReport(): string {
    if (this.results.length === 0) {
      return 'No benchmark results available';
    }

    let report = '\n=== Performance Benchmark Report ===\n\n';
    
    this.results.forEach(result => {
      report += `${result.name}:\n`;
      report += `  Duration: ${result.duration.toFixed(2)}ms\n`;
      report += `  Operations: ${result.operations}\n`;
      report += `  Ops/sec: ${result.opsPerSecond.toFixed(2)}\n`;
      report += `  Memory: ${(result.memoryUsed / 1024).toFixed(2)}KB\n\n`;
    });

    return report;
  }
}

describe('Performance Benchmarks', () => {
  let benchmarkSuite: BenchmarkSuite;

  beforeEach(() => {
    benchmarkSuite = new BenchmarkSuite();
    jest.clearAllMocks();
  });

  afterEach(() => {
    console.log(benchmarkSuite.generateReport());
  });

  describe('Data Processing Benchmarks', () => {
    it('should benchmark array operations', async () => {
      const testData = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        value: Math.random() * 1000
      }));

      // Array.map benchmark
      await benchmarkSuite.runBenchmark(
        'Array.map (10k items)',
        () => {
          testData.map(item => ({ ...item, processed: true }));
        },
        10000
      );

      // Array.filter benchmark
      await benchmarkSuite.runBenchmark(
        'Array.filter (10k items)',
        () => {
          testData.filter(item => item.value > 500);
        },
        10000
      );

      // Array.reduce benchmark
      await benchmarkSuite.runBenchmark(
        'Array.reduce (10k items)',
        () => {
          testData.reduce((sum, item) => sum + item.value, 0);
        },
        10000
      );

      // Array.sort benchmark
      await benchmarkSuite.runBenchmark(
        'Array.sort (10k items)',
        () => {
          [...testData].sort((a, b) => a.value - b.value);
        },
        10000
      );

      const results = benchmarkSuite.getResults();
      expect(results).toHaveLength(4);
      
      // 验证性能基准
      const mapResult = results.find(r => r.name.includes('Array.map'));
      expect(mapResult?.opsPerSecond).toBeGreaterThan(1000); // 至少1000 ops/sec
    });

    it('should benchmark JSON operations', async () => {
      const testData = {
        users: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `User ${i}`,
          email: `user${i}@example.com`,
          profile: {
            age: 20 + (i % 50),
            city: `City ${i % 10}`,
            preferences: {
              theme: i % 2 === 0 ? 'dark' : 'light',
              notifications: true
            }
          }
        }))
      };

      // JSON.stringify benchmark
      await benchmarkSuite.runBenchmark(
        'JSON.stringify (1k objects)',
        () => {
          JSON.stringify(testData);
        },
        1000
      );

      const jsonString = JSON.stringify(testData);

      // JSON.parse benchmark
      await benchmarkSuite.runBenchmark(
        'JSON.parse (1k objects)',
        () => {
          JSON.parse(jsonString);
        },
        1000
      );

      const results = benchmarkSuite.getResults();
      expect(results).toHaveLength(2);
    });

    it('should benchmark object operations', async () => {
      const testObjects = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        data: { value: i, nested: { deep: i * 2 } }
      }));

      // Object.assign benchmark
      await benchmarkSuite.runBenchmark(
        'Object.assign (1k objects)',
        () => {
          testObjects.forEach(obj => 
            Object.assign({}, obj, { processed: true })
          );
        },
        1000
      );

      // Spread operator benchmark
      await benchmarkSuite.runBenchmark(
        'Spread operator (1k objects)',
        () => {
          testObjects.forEach(obj => ({ ...obj, processed: true }));
        },
        1000
      );

      // Object.keys benchmark
      await benchmarkSuite.runBenchmark(
        'Object.keys (1k objects)',
        () => {
          testObjects.forEach(obj => Object.keys(obj));
        },
        1000
      );

      const results = benchmarkSuite.getResults();
      expect(results).toHaveLength(3);
    });
  });

  describe('Component Rendering Benchmarks', () => {
    it('should benchmark VirtualList rendering', async () => {
      const testData = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        description: `Description for item ${i}`
      }));

      const renderItem = (item: any) => (
        <div key={item.id}>
          <h3>{item.name}</h3>
          <p>{item.description}</p>
        </div>
      );

      await benchmarkSuite.runBenchmark(
        'VirtualList render (10k items)',
        () => {
          render(
            <VirtualList
              items={testData}
              itemHeight={60}
              renderItem={renderItem}
              height={400}
            />
          );
        },
        1
      );

      const results = benchmarkSuite.getResults();
      const renderResult = results.find(r => r.name.includes('VirtualList'));
      expect(renderResult?.duration).toBeLessThan(1000); // 应该在1秒内完成
    });

    it('should benchmark InfiniteScroll performance', async () => {
      const mockLoadMore = jest.fn().mockResolvedValue(undefined);
      const testItems = Array.from({ length: 100 }, (_, i) => (
        <div key={i}>Item {i}</div>
      ));

      await benchmarkSuite.runBenchmark(
        'InfiniteScroll render',
        () => {
          render(
            <InfiniteScroll
              onLoadMore={mockLoadMore}
              config={{ hasMore: true, threshold: 100 }}
            >
              {testItems}
            </InfiniteScroll>
          );
        },
        1
      );

      const results = benchmarkSuite.getResults();
      const scrollResult = results.find(r => r.name.includes('InfiniteScroll'));
      expect(scrollResult?.duration).toBeLessThan(500); // 应该在500ms内完成
    });

    it('should benchmark DOM manipulation', async () => {
      // 创建测试容器
      const container = document.createElement('div');
      document.body.appendChild(container);

      await benchmarkSuite.runBenchmark(
        'DOM element creation (1k elements)',
        () => {
          for (let i = 0; i < 1000; i++) {
            const element = document.createElement('div');
            element.textContent = `Element ${i}`;
            element.className = 'test-element';
            container.appendChild(element);
          }
        },
        1000
      );

      await benchmarkSuite.runBenchmark(
        'DOM element removal (1k elements)',
        () => {
          while (container.firstChild) {
            container.removeChild(container.firstChild);
          }
        },
        1000
      );

      document.body.removeChild(container);

      const results = benchmarkSuite.getResults();
      expect(results).toHaveLength(2);
    });
  });

  describe('Hook Performance Benchmarks', () => {
    it('should benchmark useDataLazyLoad hook', async () => {
      const mockFetchFn = jest.fn().mockResolvedValue({ data: 'test' });

      await benchmarkSuite.runBenchmark(
        'useDataLazyLoad hook execution',
        async () => {
          const { result } = renderHook(() =>
            useDataLazyLoad(mockFetchFn, { autoLoad: true })
          );

          await waitFor(() => {
            expect(result.current[0].isLoaded).toBe(true);
          });
        },
        1
      );

      const results = benchmarkSuite.getResults();
      const hookResult = results.find(r => r.name.includes('useDataLazyLoad'));
      expect(hookResult?.duration).toBeLessThan(100); // 应该在100ms内完成
    });

    it('should benchmark multiple hook instances', async () => {
      const mockFetchFn = jest.fn().mockResolvedValue({ data: 'test' });

      await benchmarkSuite.runBenchmark(
        'Multiple useDataLazyLoad instances (10)',
        async () => {
          const hooks = Array.from({ length: 10 }, () =>
            renderHook(() =>
              useDataLazyLoad(mockFetchFn, { autoLoad: true })
            )
          );

          await Promise.all(
            hooks.map(({ result }) =>
              waitFor(() => {
                expect(result.current[0].isLoaded).toBe(true);
              })
            )
          );
        },
        10
      );

      const results = benchmarkSuite.getResults();
      expect(results).toHaveLength(1);
    });
  });

  describe('Memory Usage Benchmarks', () => {
    it('should benchmark memory allocation patterns', async () => {
      await benchmarkSuite.runBenchmark(
        'Large array allocation',
        () => {
          const largeArray = new Array(100000).fill(0).map((_, i) => ({
            id: i,
            data: `Item ${i}`,
            timestamp: Date.now()
          }));
          
          // 使用数组以防止优化
          expect(largeArray.length).toBe(100000);
        },
        1
      );

      await benchmarkSuite.runBenchmark(
        'Object creation and destruction',
        () => {
          const objects = [];
          for (let i = 0; i < 10000; i++) {
            objects.push({
              id: i,
              data: new Array(100).fill(i),
              nested: { value: i, array: new Array(50).fill(i) }
            });
          }
          objects.length = 0; // 清空数组
        },
        10000
      );

      const results = benchmarkSuite.getResults();
      expect(results).toHaveLength(2);
      
      // 验证内存使用
      results.forEach(result => {
        expect(result.memoryUsed).toBeGreaterThan(0);
      });
    });

    it('should benchmark garbage collection impact', async () => {
      // 创建大量对象
      let objects: any[] = [];
      
      await benchmarkSuite.runBenchmark(
        'Memory allocation before GC',
        () => {
          for (let i = 0; i < 50000; i++) {
            objects.push({
              id: i,
              data: new Array(100).fill(Math.random()),
              timestamp: Date.now()
            });
          }
        },
        50000
      );

      // 强制垃圾回收
      if (global.gc) {
        global.gc();
      }

      // 清空引用
      objects = [];

      await benchmarkSuite.runBenchmark(
        'Memory allocation after GC',
        () => {
          const newObjects = [];
          for (let i = 0; i < 50000; i++) {
            newObjects.push({
              id: i,
              data: new Array(100).fill(Math.random()),
              timestamp: Date.now()
            });
          }
          expect(newObjects.length).toBe(50000);
        },
        50000
      );

      const results = benchmarkSuite.getResults();
      expect(results).toHaveLength(2);
    });
  });

  describe('Async Operations Benchmarks', () => {
    it('should benchmark Promise operations', async () => {
      await benchmarkSuite.runBenchmark(
        'Promise.all (100 promises)',
        async () => {
          const promises = Array.from({ length: 100 }, (_, i) =>
            Promise.resolve(i * 2)
          );
          await Promise.all(promises);
        },
        100
      );

      await benchmarkSuite.runBenchmark(
        'Sequential Promise execution (100 promises)',
        async () => {
          for (let i = 0; i < 100; i++) {
            await Promise.resolve(i * 2);
          }
        },
        100
      );

      await benchmarkSuite.runBenchmark(
        'Promise.allSettled (100 promises)',
        async () => {
          const promises = Array.from({ length: 100 }, (_, i) =>
            i % 10 === 0 ? Promise.reject(new Error(`Error ${i}`)) : Promise.resolve(i * 2)
          );
          await Promise.allSettled(promises);
        },
        100
      );

      const results = benchmarkSuite.getResults();
      expect(results).toHaveLength(3);
      
      // Promise.all 应该比顺序执行快
      const parallelResult = results.find(r => r.name.includes('Promise.all'));
      const sequentialResult = results.find(r => r.name.includes('Sequential'));
      
      if (parallelResult && sequentialResult) {
        expect(parallelResult.duration).toBeLessThan(sequentialResult.duration);
      }
    });

    it('should benchmark setTimeout vs setImmediate', async () => {
      await benchmarkSuite.runBenchmark(
        'setTimeout (100 calls)',
        async () => {
          const promises = Array.from({ length: 100 }, () =>
            new Promise(resolve => setTimeout(resolve, 0))
          );
          await Promise.all(promises);
        },
        100
      );

      await benchmarkSuite.runBenchmark(
        'setImmediate (100 calls)',
        async () => {
          const promises = Array.from({ length: 100 }, () =>
            new Promise(resolve => setImmediate(resolve))
          );
          await Promise.all(promises);
        },
        100
      );

      const results = benchmarkSuite.getResults();
      expect(results).toHaveLength(2);
    });
  });

  describe('Algorithm Performance Benchmarks', () => {
    it('should benchmark sorting algorithms', async () => {
      const generateRandomArray = (size: number) =>
        Array.from({ length: size }, () => Math.floor(Math.random() * 1000));

      const testData = generateRandomArray(10000);

      // Native sort
      await benchmarkSuite.runBenchmark(
        'Array.sort (10k numbers)',
        () => {
          [...testData].sort((a, b) => a - b);
        },
        10000
      );

      // Quick sort implementation
      const quickSort = (arr: number[]): number[] => {
        if (arr.length <= 1) return arr;
        const pivot = arr[Math.floor(arr.length / 2)];
        const left = arr.filter(x => x < pivot);
        const middle = arr.filter(x => x === pivot);
        const right = arr.filter(x => x > pivot);
        return [...quickSort(left), ...middle, ...quickSort(right)];
      };

      await benchmarkSuite.runBenchmark(
        'QuickSort (10k numbers)',
        () => {
          quickSort([...testData]);
        },
        10000
      );

      const results = benchmarkSuite.getResults();
      expect(results).toHaveLength(2);
    });

    it('should benchmark search algorithms', async () => {
      const sortedData = Array.from({ length: 100000 }, (_, i) => i);
      const searchTarget = 75000;

      // Linear search
      await benchmarkSuite.runBenchmark(
        'Linear search (100k items)',
        () => {
          sortedData.find(item => item === searchTarget);
        },
        1
      );

      // Binary search
      const binarySearch = (arr: number[], target: number): number => {
        let left = 0;
        let right = arr.length - 1;
        
        while (left <= right) {
          const mid = Math.floor((left + right) / 2);
          if (arr[mid] === target) return mid;
          if (arr[mid] < target) left = mid + 1;
          else right = mid - 1;
        }
        return -1;
      };

      await benchmarkSuite.runBenchmark(
        'Binary search (100k items)',
        () => {
          binarySearch(sortedData, searchTarget);
        },
        1
      );

      const results = benchmarkSuite.getResults();
      expect(results).toHaveLength(2);
      
      // Binary search should be faster
      const linearResult = results.find(r => r.name.includes('Linear'));
      const binaryResult = results.find(r => r.name.includes('Binary'));
      
      if (linearResult && binaryResult) {
        expect(binaryResult.duration).toBeLessThan(linearResult.duration);
      }
    });
  });

  describe('Performance Regression Tests', () => {
    it('should detect performance regressions', async () => {
      // 基准性能标准
      const performanceBaselines = {
        'Array.map (10k items)': { maxDuration: 50, minOpsPerSecond: 200000 },
        'VirtualList render': { maxDuration: 1000, minOpsPerSecond: 1 },
        'JSON.stringify (1k objects)': { maxDuration: 100, minOpsPerSecond: 10 }
      };

      // 运行基准测试
      const testData = Array.from({ length: 10000 }, (_, i) => ({ id: i, value: i }));
      
      await benchmarkSuite.runBenchmark(
        'Array.map (10k items)',
        () => {
          testData.map(item => ({ ...item, processed: true }));
        },
        10000
      );

      const results = benchmarkSuite.getResults();
      
      // 检查性能回归
      results.forEach(result => {
        const baseline = performanceBaselines[result.name as keyof typeof performanceBaselines];
        if (baseline) {
          expect(result.duration).toBeLessThan(baseline.maxDuration);
          expect(result.opsPerSecond).toBeGreaterThan(baseline.minOpsPerSecond);
        }
      });
    });
  });
});