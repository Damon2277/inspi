/**
 * 负载测试和压力测试
 */
import { performance } from 'perf_hooks';
import { globalCustomMetricsCollector } from '@/lib/performance/custom-metrics';
import { globalMemoryMonitor } from '@/lib/performance/memory';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';

// Mock fetch for API testing
global.fetch = jest.fn();

/**
 * 负载测试结果
 */
interface LoadTestResult {
  testName: string;
  duration: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  memoryUsage: {
    start: number;
    end: number;
    peak: number;
    leaked: number;
  };
  cpuUsage?: number;
}

/**
 * 负载测试配置
 */
interface LoadTestConfig {
  concurrency: number;
  duration: number; // 毫秒
  rampUpTime?: number; // 毫秒
  maxRequests?: number;
  timeout?: number; // 毫秒
}

/**
 * 负载测试器
 */
class LoadTester {
  private results: LoadTestResult[] = [];

  /**
   * 运行负载测试
   */
  async runLoadTest(
    testName: string,
    testFn: () => Promise<{ success: boolean; responseTime: number }>,
    config: LoadTestConfig
  ): Promise<LoadTestResult> {
    const {
      concurrency,
      duration,
      rampUpTime = 0,
      maxRequests = Infinity,
      timeout = 5000
    } = config;

    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed;
    let peakMemory = startMemory;
    
    const results: Array<{ success: boolean; responseTime: number }> = [];
    const workers: Promise<void>[] = [];
    let totalRequests = 0;
    let shouldStop = false;

    // 创建工作器
    for (let i = 0; i < concurrency; i++) {
      const workerDelay = rampUpTime > 0 ? (rampUpTime / concurrency) * i : 0;
      
      workers.push(
        this.createWorker(
          testFn,
          workerDelay,
          timeout,
          () => shouldStop || totalRequests >= maxRequests,
          (result) => {
            results.push(result);
            totalRequests++;
            
            // 监控内存使用
            const currentMemory = process.memoryUsage().heapUsed;
            if (currentMemory > peakMemory) {
              peakMemory = currentMemory;
            }
          }
        )
      );
    }

    // 设置测试持续时间
    const durationTimer = setTimeout(() => {
      shouldStop = true;
    }, duration);

    // 等待所有工作器完成
    await Promise.all(workers);
    clearTimeout(durationTimer);

    const endTime = performance.now();
    const endMemory = process.memoryUsage().heapUsed;
    const actualDuration = endTime - startTime;

    // 计算统计信息
    const successfulRequests = results.filter(r => r.success).length;
    const failedRequests = results.length - successfulRequests;
    const responseTimes = results.map(r => r.responseTime);
    
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 0;
    
    const minResponseTime = responseTimes.length > 0 ? Math.min(...responseTimes) : 0;
    const maxResponseTime = responseTimes.length > 0 ? Math.max(...responseTimes) : 0;
    const requestsPerSecond = (results.length / actualDuration) * 1000;
    const errorRate = (failedRequests / results.length) * 100;

    const result: LoadTestResult = {
      testName,
      duration: actualDuration,
      totalRequests: results.length,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      minResponseTime,
      maxResponseTime,
      requestsPerSecond,
      errorRate,
      memoryUsage: {
        start: startMemory,
        end: endMemory,
        peak: peakMemory,
        leaked: endMemory - startMemory
      }
    };

    this.results.push(result);
    return result;
  }

  /**
   * 创建工作器
   */
  private async createWorker(
    testFn: () => Promise<{ success: boolean; responseTime: number }>,
    delay: number,
    timeout: number,
    shouldStop: () => boolean,
    onResult: (result: { success: boolean; responseTime: number }) => void
  ): Promise<void> {
    // 等待启动延迟
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    while (!shouldStop()) {
      try {
        const startTime = performance.now();
        
        // 设置超时
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), timeout);
        });

        const result = await Promise.race([testFn(), timeoutPromise]);
        const responseTime = performance.now() - startTime;

        onResult({
          success: result.success,
          responseTime
        });

      } catch (error) {
        const responseTime = performance.now() - performance.now();
        onResult({
          success: false,
          responseTime
        });
      }

      // 短暂休息以避免过度占用CPU
      await new Promise(resolve => setTimeout(resolve, 1));
    }
  }

  /**
   * 获取结果
   */
  getResults(): LoadTestResult[] {
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
      return 'No load test results available';
    }

    let report = '\n=== Load Test Report ===\n\n';
    
    this.results.forEach(result => {
      report += `${result.testName}:\n`;
      report += `  Duration: ${result.duration.toFixed(2)}ms\n`;
      report += `  Total Requests: ${result.totalRequests}\n`;
      report += `  Successful: ${result.successfulRequests}\n`;
      report += `  Failed: ${result.failedRequests}\n`;
      report += `  Error Rate: ${result.errorRate.toFixed(2)}%\n`;
      report += `  Requests/sec: ${result.requestsPerSecond.toFixed(2)}\n`;
      report += `  Avg Response Time: ${result.averageResponseTime.toFixed(2)}ms\n`;
      report += `  Min Response Time: ${result.minResponseTime.toFixed(2)}ms\n`;
      report += `  Max Response Time: ${result.maxResponseTime.toFixed(2)}ms\n`;
      report += `  Memory Leaked: ${(result.memoryUsage.leaked / 1024).toFixed(2)}KB\n\n`;
    });

    return report;
  }
}

describe('Load and Stress Tests', () => {
  let loadTester: LoadTester;
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    loadTester = new LoadTester();
    jest.clearAllMocks();
  });

  afterEach(() => {
    console.log(loadTester.generateReport());
  });

  describe('API Load Tests', () => {
    it('should handle concurrent API requests', async () => {
      // Mock successful API responses
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
        text: async () => 'test'
      } as Response);

      const apiTestFn = async () => {
        const startTime = performance.now();
        try {
          const response = await fetch('/api/test');
          const responseTime = performance.now() - startTime;
          return {
            success: response.ok,
            responseTime
          };
        } catch (error) {
          const responseTime = performance.now() - startTime;
          return {
            success: false,
            responseTime
          };
        }
      };

      const result = await loadTester.runLoadTest(
        'API Concurrent Requests',
        apiTestFn,
        {
          concurrency: 10,
          duration: 5000, // 5秒
          rampUpTime: 1000 // 1秒渐进
        }
      );

      expect(result.errorRate).toBeLessThan(5); // 错误率应该小于5%
      expect(result.requestsPerSecond).toBeGreaterThan(10); // 至少10 RPS
      expect(result.averageResponseTime).toBeLessThan(1000); // 平均响应时间小于1秒
    });

    it('should handle API failures gracefully', async () => {
      // Mock API failures
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ error: 'Internal Server Error' })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: 'test' })
        } as Response);

      const apiTestFn = async () => {
        const startTime = performance.now();
        try {
          const response = await fetch('/api/test');
          const responseTime = performance.now() - startTime;
          return {
            success: response.ok,
            responseTime
          };
        } catch (error) {
          const responseTime = performance.now() - startTime;
          return {
            success: false,
            responseTime
          };
        }
      };

      const result = await loadTester.runLoadTest(
        'API Failure Handling',
        apiTestFn,
        {
          concurrency: 5,
          duration: 2000,
          maxRequests: 20
        }
      );

      expect(result.totalRequests).toBeGreaterThan(0);
      expect(result.failedRequests).toBeGreaterThan(0);
    });

    it('should test API timeout handling', async () => {
      // Mock slow API responses
      mockFetch.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            status: 200,
            json: async () => ({ data: 'test' })
          } as Response), 2000) // 2秒延迟
        )
      );

      const apiTestFn = async () => {
        const startTime = performance.now();
        try {
          const response = await fetch('/api/slow');
          const responseTime = performance.now() - startTime;
          return {
            success: response.ok,
            responseTime
          };
        } catch (error) {
          const responseTime = performance.now() - startTime;
          return {
            success: false,
            responseTime
          };
        }
      };

      const result = await loadTester.runLoadTest(
        'API Timeout Test',
        apiTestFn,
        {
          concurrency: 3,
          duration: 3000,
          timeout: 1500 // 1.5秒超时
        }
      );

      expect(result.errorRate).toBeGreaterThan(50); // 大部分请求应该超时
    });
  });

  describe('Memory Stress Tests', () => {
    it('should test memory allocation under load', async () => {
      const memoryTestFn = async () => {
        const startTime = performance.now();
        try {
          // 分配大量内存
          const largeArray = new Array(10000).fill(0).map((_, i) => ({
            id: i,
            data: new Array(100).fill(Math.random()),
            timestamp: Date.now()
          }));

          // 模拟处理
          const processed = largeArray.map(item => ({
            ...item,
            processed: true,
            hash: item.data.reduce((a, b) => a + b, 0)
          }));

          const responseTime = performance.now() - startTime;
          return {
            success: processed.length === largeArray.length,
            responseTime
          };
        } catch (error) {
          const responseTime = performance.now() - startTime;
          return {
            success: false,
            responseTime
          };
        }
      };

      const result = await loadTester.runLoadTest(
        'Memory Allocation Stress',
        memoryTestFn,
        {
          concurrency: 5,
          duration: 3000,
          maxRequests: 50
        }
      );

      expect(result.errorRate).toBeLessThan(10);
      expect(result.memoryUsage.leaked).toBeLessThan(100 * 1024 * 1024); // 小于100MB泄漏
    });

    it('should test garbage collection under pressure', async () => {
      let objectPool: any[] = [];

      const gcTestFn = async () => {
        const startTime = performance.now();
        try {
          // 创建对象
          for (let i = 0; i < 1000; i++) {
            objectPool.push({
              id: i,
              data: new Array(1000).fill(Math.random()),
              nested: {
                array: new Array(500).fill(i),
                object: { value: i, timestamp: Date.now() }
              }
            });
          }

          // 随机删除一些对象
          if (objectPool.length > 5000) {
            objectPool = objectPool.slice(2500);
          }

          const responseTime = performance.now() - startTime;
          return {
            success: true,
            responseTime
          };
        } catch (error) {
          const responseTime = performance.now() - startTime;
          return {
            success: false,
            responseTime
          };
        }
      };

      const result = await loadTester.runLoadTest(
        'Garbage Collection Pressure',
        gcTestFn,
        {
          concurrency: 3,
          duration: 5000
        }
      );

      expect(result.errorRate).toBeLessThan(5);
      
      // 清理
      objectPool = [];
      if (global.gc) {
        global.gc();
      }
    });
  });

  describe('Component Stress Tests', () => {
    it('should test rapid component mounting/unmounting', async () => {
      const componentTestFn = async () => {
        const startTime = performance.now();
        try {
          // 快速创建和销毁组件
          for (let i = 0; i < 10; i++) {
            const { unmount } = render(
              <div>
                <h1>Test Component {i}</h1>
                <p>Content for component {i}</p>
                <button onClick={() => console.log(`Clicked ${i}`)}>
                  Button {i}
                </button>
              </div>
            );
            unmount();
          }

          const responseTime = performance.now() - startTime;
          return {
            success: true,
            responseTime
          };
        } catch (error) {
          const responseTime = performance.now() - startTime;
          return {
            success: false,
            responseTime
          };
        }
      };

      const result = await loadTester.runLoadTest(
        'Component Mount/Unmount Stress',
        componentTestFn,
        {
          concurrency: 5,
          duration: 3000
        }
      );

      expect(result.errorRate).toBeLessThan(5);
      expect(result.averageResponseTime).toBeLessThan(100);
    });

    it('should test event handler performance under load', async () => {
      const eventTestFn = async () => {
        const startTime = performance.now();
        try {
          const { container } = render(
            <div>
              {Array.from({ length: 100 }, (_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    // 模拟复杂的事件处理
                    const data = Array.from({ length: 100 }, (_, j) => i * j);
                    data.sort((a, b) => b - a);
                  }}
                >
                  Button {i}
                </button>
              ))}
            </div>
          );

          // 触发多个事件
          const buttons = container.querySelectorAll('button');
          for (let i = 0; i < 10; i++) {
            const randomButton = buttons[Math.floor(Math.random() * buttons.length)];
            fireEvent.click(randomButton);
          }

          const responseTime = performance.now() - startTime;
          return {
            success: true,
            responseTime
          };
        } catch (error) {
          const responseTime = performance.now() - startTime;
          return {
            success: false,
            responseTime
          };
        }
      };

      const result = await loadTester.runLoadTest(
        'Event Handler Performance',
        eventTestFn,
        {
          concurrency: 3,
          duration: 2000
        }
      );

      expect(result.errorRate).toBeLessThan(5);
    });
  });

  describe('Concurrent Operations Stress Tests', () => {
    it('should test concurrent data processing', async () => {
      const dataProcessingTestFn = async () => {
        const startTime = performance.now();
        try {
          const data = Array.from({ length: 5000 }, (_, i) => ({
            id: i,
            value: Math.random() * 1000,
            category: `category-${i % 10}`
          }));

          // 并发处理多个操作
          const operations = [
            // 排序
            Promise.resolve([...data].sort((a, b) => a.value - b.value)),
            // 过滤
            Promise.resolve(data.filter(item => item.value > 500)),
            // 分组
            Promise.resolve(data.reduce((groups, item) => {
              const key = item.category;
              if (!groups[key]) groups[key] = [];
              groups[key].push(item);
              return groups;
            }, {} as Record<string, typeof data>)),
            // 聚合
            Promise.resolve(data.reduce((sum, item) => sum + item.value, 0))
          ];

          await Promise.all(operations);

          const responseTime = performance.now() - startTime;
          return {
            success: true,
            responseTime
          };
        } catch (error) {
          const responseTime = performance.now() - startTime;
          return {
            success: false,
            responseTime
          };
        }
      };

      const result = await loadTester.runLoadTest(
        'Concurrent Data Processing',
        dataProcessingTestFn,
        {
          concurrency: 8,
          duration: 4000
        }
      );

      expect(result.errorRate).toBeLessThan(5);
      expect(result.requestsPerSecond).toBeGreaterThan(5);
    });

    it('should test resource contention', async () => {
      const sharedResource = { counter: 0, data: [] as number[] };

      const resourceTestFn = async () => {
        const startTime = performance.now();
        try {
          // 模拟资源竞争
          for (let i = 0; i < 100; i++) {
            sharedResource.counter++;
            sharedResource.data.push(sharedResource.counter);
            
            // 模拟异步操作
            await new Promise(resolve => setTimeout(resolve, 1));
            
            // 读取和修改共享资源
            const currentValue = sharedResource.counter;
            sharedResource.counter = currentValue + Math.floor(Math.random() * 10);
          }

          const responseTime = performance.now() - startTime;
          return {
            success: true,
            responseTime
          };
        } catch (error) {
          const responseTime = performance.now() - startTime;
          return {
            success: false,
            responseTime
          };
        }
      };

      const result = await loadTester.runLoadTest(
        'Resource Contention Test',
        resourceTestFn,
        {
          concurrency: 10,
          duration: 3000
        }
      );

      expect(result.errorRate).toBeLessThan(10);
      expect(sharedResource.counter).toBeGreaterThan(0);
    });
  });

  describe('Performance Degradation Tests', () => {
    it('should detect performance degradation over time', async () => {
      let iterationCount = 0;
      const performanceHistory: number[] = [];

      const degradationTestFn = async () => {
        const startTime = performance.now();
        try {
          iterationCount++;
          
          // 模拟性能随时间降低
          const workload = Math.min(1000 + iterationCount * 10, 10000);
          const data = new Array(workload).fill(0).map((_, i) => ({
            id: i,
            value: Math.random(),
            processed: false
          }));

          // 处理数据
          const processed = data.map(item => ({
            ...item,
            processed: true,
            hash: item.value * iterationCount
          }));

          const responseTime = performance.now() - startTime;
          performanceHistory.push(responseTime);

          return {
            success: processed.length === data.length,
            responseTime
          };
        } catch (error) {
          const responseTime = performance.now() - startTime;
          return {
            success: false,
            responseTime
          };
        }
      };

      const result = await loadTester.runLoadTest(
        'Performance Degradation Test',
        degradationTestFn,
        {
          concurrency: 2,
          duration: 5000
        }
      );

      expect(result.errorRate).toBeLessThan(10);
      
      // 检查性能是否随时间降低
      if (performanceHistory.length > 10) {
        const firstHalf = performanceHistory.slice(0, Math.floor(performanceHistory.length / 2));
        const secondHalf = performanceHistory.slice(Math.floor(performanceHistory.length / 2));
        
        const firstHalfAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondHalfAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
        
        // 性能应该有所降低（响应时间增加）
        expect(secondHalfAvg).toBeGreaterThan(firstHalfAvg);
      }
    });
  });
});