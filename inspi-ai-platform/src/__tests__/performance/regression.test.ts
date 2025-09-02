/**
 * 性能回归测试
 */
import { performance } from 'perf_hooks';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import VirtualList from '@/components/common/VirtualList';
import InfiniteScroll from '@/components/common/InfiniteScroll';
import LazyImage from '@/components/common/LazyImage';
import { useDataLazyLoad } from '@/hooks/useDataLazyLoad';
import { useVirtualization } from '@/hooks/useVirtualization';

/**
 * 性能基准
 */
interface PerformanceBaseline {
  name: string;
  maxDuration: number; // 最大执行时间（毫秒）
  maxMemory: number; // 最大内存使用（字节）
  minOpsPerSecond?: number; // 最小操作数/秒
  maxErrorRate?: number; // 最大错误率（百分比）
}

/**
 * 性能测试结果
 */
interface PerformanceTestResult {
  name: string;
  duration: number;
  memoryUsed: number;
  opsPerSecond?: number;
  errorRate?: number;
  passed: boolean;
  violations: string[];
}

/**
 * 性能回归测试器
 */
class PerformanceRegressionTester {
  private baselines: Map<string, PerformanceBaseline> = new Map();
  private results: PerformanceTestResult[] = [];

  constructor() {
    this.setupBaselines();
  }

  /**
   * 设置性能基准
   */
  private setupBaselines(): void {
    const baselines: PerformanceBaseline[] = [
      {
        name: 'VirtualList-10k-items',
        maxDuration: 1000,
        maxMemory: 50 * 1024 * 1024, // 50MB
        minOpsPerSecond: 10
      },
      {
        name: 'InfiniteScroll-render',
        maxDuration: 500,
        maxMemory: 20 * 1024 * 1024, // 20MB
      },
      {
        name: 'LazyImage-load',
        maxDuration: 200,
        maxMemory: 10 * 1024 * 1024, // 10MB
      },
      {
        name: 'useDataLazyLoad-hook',
        maxDuration: 100,
        maxMemory: 5 * 1024 * 1024, // 5MB
        maxErrorRate: 5
      },
      {
        name: 'useVirtualization-hook',
        maxDuration: 50,
        maxMemory: 5 * 1024 * 1024, // 5MB
        minOpsPerSecond: 1000
      },
      {
        name: 'Array-operations-10k',
        maxDuration: 100,
        maxMemory: 20 * 1024 * 1024, // 20MB
        minOpsPerSecond: 100000
      },
      {
        name: 'JSON-operations-1k',
        maxDuration: 50,
        maxMemory: 10 * 1024 * 1024, // 10MB
        minOpsPerSecond: 1000
      },
      {
        name: 'DOM-manipulation-1k',
        maxDuration: 200,
        maxMemory: 15 * 1024 * 1024, // 15MB
        minOpsPerSecond: 500
      }
    ];

    baselines.forEach(baseline => {
      this.baselines.set(baseline.name, baseline);
    });
  }

  /**
   * 运行性能测试
   */
  async runTest(
    name: string,
    testFn: () => Promise<void> | void,
    operations: number = 1
  ): Promise<PerformanceTestResult> {
    const baseline = this.baselines.get(name);
    if (!baseline) {
      throw new Error(`No baseline found for test: ${name}`);
    }

    // 垃圾回收
    if (global.gc) {
      global.gc();
    }

    const startMemory = process.memoryUsage().heapUsed;
    const startTime = performance.now();

    let errorCount = 0;
    try {
      await testFn();
    } catch (error) {
      errorCount = 1;
    }

    const endTime = performance.now();
    const endMemory = process.memoryUsage().heapUsed;

    const duration = endTime - startTime;
    const memoryUsed = endMemory - startMemory;
    const opsPerSecond = operations / (duration / 1000);
    const errorRate = (errorCount / operations) * 100;

    // 检查违规
    const violations: string[] = [];
    
    if (duration > baseline.maxDuration) {
      violations.push(`Duration ${duration.toFixed(2)}ms exceeds limit ${baseline.maxDuration}ms`);
    }
    
    if (memoryUsed > baseline.maxMemory) {
      violations.push(`Memory ${(memoryUsed / 1024 / 1024).toFixed(2)}MB exceeds limit ${(baseline.maxMemory / 1024 / 1024).toFixed(2)}MB`);
    }
    
    if (baseline.minOpsPerSecond && opsPerSecond < baseline.minOpsPerSecond) {
      violations.push(`Ops/sec ${opsPerSecond.toFixed(2)} below minimum ${baseline.minOpsPerSecond}`);
    }
    
    if (baseline.maxErrorRate && errorRate > baseline.maxErrorRate) {
      violations.push(`Error rate ${errorRate.toFixed(2)}% exceeds limit ${baseline.maxErrorRate}%`);
    }

    const result: PerformanceTestResult = {
      name,
      duration,
      memoryUsed,
      opsPerSecond,
      errorRate,
      passed: violations.length === 0,
      violations
    };

    this.results.push(result);
    return result;
  }

  /**
   * 获取结果
   */
  getResults(): PerformanceTestResult[] {
    return [...this.results];
  }

  /**
   * 生成报告
   */
  generateReport(): string {
    const passedTests = this.results.filter(r => r.passed);
    const failedTests = this.results.filter(r => !r.passed);

    let report = '\n=== Performance Regression Test Report ===\n\n';
    report += `Total Tests: ${this.results.length}\n`;
    report += `Passed: ${passedTests.length}\n`;
    report += `Failed: ${failedTests.length}\n\n`;

    if (failedTests.length > 0) {
      report += '=== FAILED TESTS ===\n';
      failedTests.forEach(test => {
        report += `\n${test.name}:\n`;
        report += `  Duration: ${test.duration.toFixed(2)}ms\n`;
        report += `  Memory: ${(test.memoryUsed / 1024 / 1024).toFixed(2)}MB\n`;
        if (test.opsPerSecond) {
          report += `  Ops/sec: ${test.opsPerSecond.toFixed(2)}\n`;
        }
        if (test.errorRate) {
          report += `  Error Rate: ${test.errorRate.toFixed(2)}%\n`;
        }
        report += `  Violations:\n`;
        test.violations.forEach(violation => {
          report += `    - ${violation}\n`;
        });
      });
    }

    if (passedTests.length > 0) {
      report += '\n=== PASSED TESTS ===\n';
      passedTests.forEach(test => {
        report += `\n${test.name}: ✓\n`;
        report += `  Duration: ${test.duration.toFixed(2)}ms\n`;
        report += `  Memory: ${(test.memoryUsed / 1024 / 1024).toFixed(2)}MB\n`;
        if (test.opsPerSecond) {
          report += `  Ops/sec: ${test.opsPerSecond.toFixed(2)}\n`;
        }
      });
    }

    return report;
  }
}

describe('Performance Regression Tests', () => {
  let tester: PerformanceRegressionTester;

  beforeEach(() => {
    tester = new PerformanceRegressionTester();
  });

  afterEach(() => {
    console.log(tester.generateReport());
  });

  describe('Component Performance Regression', () => {
    it('should not regress VirtualList performance with 10k items', async () => {
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

      const result = await tester.runTest(
        'VirtualList-10k-items',
        () => {
          const { unmount } = render(
            <VirtualList
              items={testData}
              itemHeight={60}
              renderItem={renderItem}
              height={400}
            />
          );
          unmount();
        }
      );

      expect(result.passed).toBe(true);
      if (!result.passed) {
        console.error('VirtualList performance regression:', result.violations);
      }
    });

    it('should not regress InfiniteScroll rendering performance', async () => {
      const mockLoadMore = jest.fn().mockResolvedValue(undefined);
      const testItems = Array.from({ length: 100 }, (_, i) => (
        <div key={i}>Item {i}</div>
      ));

      const result = await tester.runTest(
        'InfiniteScroll-render',
        () => {
          const { unmount } = render(
            <InfiniteScroll
              onLoadMore={mockLoadMore}
              config={{ hasMore: true, threshold: 100 }}
            >
              {testItems}
            </InfiniteScroll>
          );
          unmount();
        }
      );

      expect(result.passed).toBe(true);
      if (!result.passed) {
        console.error('InfiniteScroll performance regression:', result.violations);
      }
    });

    it('should not regress LazyImage loading performance', async () => {
      const result = await tester.runTest(
        'LazyImage-load',
        () => {
          const { unmount } = render(
            <LazyImage
              src="https://example.com/image.jpg"
              alt="Test image"
              width={200}
              height={150}
            />
          );
          unmount();
        }
      );

      expect(result.passed).toBe(true);
      if (!result.passed) {
        console.error('LazyImage performance regression:', result.violations);
      }
    });
  });

  describe('Hook Performance Regression', () => {
    it('should not regress useDataLazyLoad hook performance', async () => {
      const mockFetchFn = jest.fn().mockResolvedValue({ data: 'test' });

      const result = await tester.runTest(
        'useDataLazyLoad-hook',
        async () => {
          const { result: hookResult, unmount } = renderHook(() =>
            useDataLazyLoad(mockFetchFn, { autoLoad: true })
          );

          await waitFor(() => {
            expect(hookResult.current[0].isLoaded).toBe(true);
          });

          unmount();
        }
      );

      expect(result.passed).toBe(true);
      if (!result.passed) {
        console.error('useDataLazyLoad performance regression:', result.violations);
      }
    });

    it('should not regress useVirtualization hook performance', async () => {
      const testItems = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`
      }));

      const result = await tester.runTest(
        'useVirtualization-hook',
        () => {
          const { result: hookResult, unmount } = renderHook(() =>
            useVirtualization({
              items: testItems,
              itemHeight: 50,
              containerHeight: 400,
              overscan: 5
            })
          );

          // 模拟滚动
          act(() => {
            hookResult.current.handleScroll({ target: { scrollTop: 500 } } as any);
          });

          unmount();
        },
        1000
      );

      expect(result.passed).toBe(true);
      if (!result.passed) {
        console.error('useVirtualization performance regression:', result.violations);
      }
    });
  });

  describe('Data Processing Performance Regression', () => {
    it('should not regress array operations performance', async () => {
      const testData = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        value: Math.random() * 1000,
        category: `category-${i % 10}`
      }));

      const result = await tester.runTest(
        'Array-operations-10k',
        () => {
          // Map operation
          const mapped = testData.map(item => ({ ...item, processed: true }));
          
          // Filter operation
          const filtered = testData.filter(item => item.value > 500);
          
          // Reduce operation
          const sum = testData.reduce((acc, item) => acc + item.value, 0);
          
          // Sort operation
          const sorted = [...testData].sort((a, b) => a.value - b.value);

          // 使用结果以防止优化
          expect(mapped.length).toBe(testData.length);
          expect(filtered.length).toBeGreaterThan(0);
          expect(sum).toBeGreaterThan(0);
          expect(sorted.length).toBe(testData.length);
        },
        10000
      );

      expect(result.passed).toBe(true);
      if (!result.passed) {
        console.error('Array operations performance regression:', result.violations);
      }
    });

    it('should not regress JSON operations performance', async () => {
      const testData = {
        users: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `User ${i}`,
          email: `user${i}@example.com`,
          profile: {
            age: 20 + (i % 50),
            preferences: { theme: 'dark', notifications: true }
          }
        }))
      };

      const result = await tester.runTest(
        'JSON-operations-1k',
        () => {
          // Stringify operation
          const jsonString = JSON.stringify(testData);
          
          // Parse operation
          const parsed = JSON.parse(jsonString);
          
          // 使用结果以防止优化
          expect(parsed.users.length).toBe(1000);
          expect(jsonString.length).toBeGreaterThan(0);
        },
        1000
      );

      expect(result.passed).toBe(true);
      if (!result.passed) {
        console.error('JSON operations performance regression:', result.violations);
      }
    });

    it('should not regress DOM manipulation performance', async () => {
      const result = await tester.runTest(
        'DOM-manipulation-1k',
        () => {
          const container = document.createElement('div');
          document.body.appendChild(container);

          // 创建元素
          for (let i = 0; i < 1000; i++) {
            const element = document.createElement('div');
            element.textContent = `Element ${i}`;
            element.className = 'test-element';
            container.appendChild(element);
          }

          // 修改元素
          const elements = container.querySelectorAll('.test-element');
          elements.forEach((element, index) => {
            element.setAttribute('data-index', index.toString());
            element.classList.add('modified');
          });

          // 删除元素
          while (container.firstChild) {
            container.removeChild(container.firstChild);
          }

          document.body.removeChild(container);
        },
        1000
      );

      expect(result.passed).toBe(true);
      if (!result.passed) {
        console.error('DOM manipulation performance regression:', result.violations);
      }
    });
  });

  describe('Memory Leak Detection', () => {
    it('should detect memory leaks in component lifecycle', async () => {
      let components: any[] = [];

      const result = await tester.runTest(
        'Component-memory-leak',
        () => {
          // 创建多个组件实例
          for (let i = 0; i < 100; i++) {
            const component = render(
              <div>
                <h1>Component {i}</h1>
                <button onClick={() => console.log(`Clicked ${i}`)}>
                  Button {i}
                </button>
              </div>
            );
            components.push(component);
          }

          // 卸载组件
          components.forEach(component => {
            component.unmount();
          });
          
          components = [];
        }
      );

      // 内存泄漏检测应该通过
      expect(result.memoryUsed).toBeLessThan(50 * 1024 * 1024); // 50MB
    });

    it('should detect memory leaks in event handlers', async () => {
      const result = await tester.runTest(
        'EventHandler-memory-leak',
        () => {
          const container = document.createElement('div');
          document.body.appendChild(container);

          const handlers: (() => void)[] = [];

          // 添加大量事件监听器
          for (let i = 0; i < 1000; i++) {
            const button = document.createElement('button');
            button.textContent = `Button ${i}`;
            
            const handler = () => {
              // 创建闭包引用
              const data = new Array(1000).fill(i);
              console.log(`Button ${i} clicked, data length: ${data.length}`);
            };
            
            button.addEventListener('click', handler);
            handlers.push(handler);
            container.appendChild(button);
          }

          // 移除事件监听器和元素
          const buttons = container.querySelectorAll('button');
          buttons.forEach((button, index) => {
            button.removeEventListener('click', handlers[index]);
            container.removeChild(button);
          });

          document.body.removeChild(container);
        }
      );

      // 应该没有显著的内存泄漏
      expect(result.memoryUsed).toBeLessThan(20 * 1024 * 1024); // 20MB
    });
  });

  describe('Performance Trend Analysis', () => {
    it('should track performance trends over multiple runs', async () => {
      const results: PerformanceTestResult[] = [];
      
      // 运行多次相同的测试
      for (let run = 0; run < 5; run++) {
        const testData = Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          value: Math.random()
        }));

        const result = await tester.runTest(
          `Performance-trend-run-${run}`,
          () => {
            const processed = testData
              .map(item => ({ ...item, processed: true }))
              .filter(item => item.value > 0.5)
              .sort((a, b) => a.value - b.value);
            
            expect(processed.length).toBeGreaterThan(0);
          },
          1000
        );

        results.push(result);
      }

      // 分析趋势
      const durations = results.map(r => r.duration);
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const maxDuration = Math.max(...durations);
      const minDuration = Math.min(...durations);
      
      // 性能应该相对稳定
      const variance = maxDuration - minDuration;
      expect(variance).toBeLessThan(avgDuration * 0.5); // 变化不应超过平均值的50%
      
      console.log(`Performance trend analysis:
        Average: ${avgDuration.toFixed(2)}ms
        Min: ${minDuration.toFixed(2)}ms
        Max: ${maxDuration.toFixed(2)}ms
        Variance: ${variance.toFixed(2)}ms`);
    });
  });

  describe('Cross-Browser Performance', () => {
    it('should maintain performance across different environments', async () => {
      // 模拟不同的环境条件
      const environments = [
        { name: 'fast-cpu', multiplier: 1 },
        { name: 'slow-cpu', multiplier: 2 },
        { name: 'limited-memory', multiplier: 1.5 }
      ];

      const results: { env: string; result: PerformanceTestResult }[] = [];

      for (const env of environments) {
        const testData = Array.from({ length: 5000 }, (_, i) => ({
          id: i,
          data: new Array(Math.floor(100 * env.multiplier)).fill(i)
        }));

        const result = await tester.runTest(
          `Cross-env-${env.name}`,
          () => {
            const processed = testData.map(item => ({
              ...item,
              hash: item.data.reduce((a, b) => a + b, 0)
            }));
            
            expect(processed.length).toBe(testData.length);
          },
          5000
        );

        results.push({ env: env.name, result });
      }

      // 所有环境都应该通过基本性能要求
      results.forEach(({ env, result }) => {
        expect(result.duration).toBeLessThan(2000); // 2秒内完成
        console.log(`${env}: ${result.duration.toFixed(2)}ms`);
      });
    });
  });
});