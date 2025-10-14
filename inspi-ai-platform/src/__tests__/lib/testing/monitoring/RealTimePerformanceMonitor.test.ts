import { RealTimePerformanceMonitor } from '../../../../lib/testing/monitoring/RealTimePerformanceMonitor';

describe('RealTimePerformanceMonitor', () => {
  let monitor: RealTimePerformanceMonitor;

  beforeEach(() => {
    monitor = new RealTimePerformanceMonitor({
      alertThresholds: {
        executionTime: 1000,
        memoryUsage: 50 * 1024 * 1024,
        cpuUsage: 80,
      },
      samplingInterval: 50,
      maxMetricsHistory: 100,
    });
  });

  afterEach(() => {
    monitor.destroy();
  });

  describe('监控生命周期', () => {
    it('应该能够启动和停止监控', () => {
      expect(monitor.isMonitoring()).toBe(false);

      monitor.startMonitoring();
      expect(monitor.isMonitoring()).toBe(true);

      monitor.stopMonitoring();
      expect(monitor.isMonitoring()).toBe(false);
    });

    it('应该能够开始和结束测试监控', () => {
      monitor.startMonitoring();

      const testId = 'test-001';
      const testName = 'Sample Test';

      monitor.startTest(testId, testName);
      expect(monitor.getActiveTests()).toContain(testId);

      // 模拟测试执行时间
      const startTime = Date.now();
      setTimeout(() => {
        const metrics = monitor.endTest(testId);

        expect(metrics).toBeDefined();
        expect(metrics!.testId).toBe(testId);
        expect(metrics!.testName).toBe(testName);
        expect(metrics!.duration).toBeGreaterThan(0);
        expect(monitor.getActiveTests()).not.toContain(testId);
      }, 100);
    });
  });

  describe('性能指标收集', () => {
    it('应该收集基本的性能指标', async () => {
      monitor.startMonitoring();

      const testId = 'perf-test-001';
      monitor.startTest(testId, 'Performance Test');

      // 等待一些采样
      await new Promise(resolve => setTimeout(resolve, 150));

      const metrics = monitor.endTest(testId);

      expect(metrics).toBeDefined();
      expect(metrics!.memoryUsage).toBeDefined();
      expect(metrics!.memoryUsage.heapUsed).toBeGreaterThan(0);
      expect(metrics!.memoryUsage.heapTotal).toBeGreaterThan(0);
      expect(metrics!.cpuUsage).toBeDefined();
      expect(metrics!.snapshots.length).toBeGreaterThan(0);
    });

    it('应该记录性能快照', async () => {
      monitor.startMonitoring();

      const testId = 'snapshot-test';
      monitor.startTest(testId, 'Snapshot Test');

      await new Promise(resolve => setTimeout(resolve, 200));

      const metrics = monitor.endTest(testId);

      expect(metrics!.snapshots.length).toBeGreaterThan(2);

      const firstSnapshot = metrics!.snapshots[0];
      expect(firstSnapshot.timestamp).toBeDefined();
      expect(firstSnapshot.memoryUsage).toBeDefined();
      expect(firstSnapshot.cpuUsage).toBeDefined();
    });
  });

  describe('性能警报', () => {
    it('应该在执行时间超过阈值时触发警报', (done) => {
      const alertMonitor = new RealTimePerformanceMonitor({
        alertThresholds: {
          executionTime: 50, // 很低的阈值
          memoryUsage: 100 * 1024 * 1024,
          cpuUsage: 90,
        },
      });

      alertMonitor.on('alert:execution-time', (alert) => {
        expect(alert.type).toBe('execution-time');
        expect(alert.testId).toBe('slow-test');
        expect(alert.value).toBeGreaterThan(50);
        alertMonitor.destroy();
        done();
      });

      alertMonitor.startMonitoring();
      alertMonitor.startTest('slow-test', 'Slow Test');

      // 模拟慢测试
      setTimeout(() => {
        alertMonitor.endTest('slow-test');
      }, 100);
    });

    it('应该在内存使用超过阈值时触发警报', (done) => {
      const alertMonitor = new RealTimePerformanceMonitor({
        alertThresholds: {
          executionTime: 5000,
          memoryUsage: 1024, // 很低的阈值
          cpuUsage: 90,
        },
        samplingInterval: 10,
      });

      alertMonitor.on('alert:memory-usage', (alert) => {
        expect(alert.type).toBe('memory-usage');
        expect(alert.testId).toBe('memory-test');
        alertMonitor.destroy();
        done();
      });

      alertMonitor.startMonitoring();
      alertMonitor.startTest('memory-test', 'Memory Test');

      // 等待内存采样
      setTimeout(() => {
        alertMonitor.endTest('memory-test');
      }, 50);
    });
  });

  describe('统计信息', () => {
    it('应该提供准确的统计信息', async () => {
      monitor.startMonitoring();

      // 运行多个测试
      for (let i = 0; i < 3; i++) {
        const testId = `stats-test-${i}`;
        monitor.startTest(testId, `Stats Test ${i}`);
        await new Promise(resolve => setTimeout(resolve, 50));
        monitor.endTest(testId);
      }

      const stats = monitor.getStatistics();

      expect(stats.totalTests).toBe(3);
      expect(stats.averageExecutionTime).toBeGreaterThan(0);
      expect(stats.totalAlerts).toBeGreaterThanOrEqual(0);
      expect(stats.peakMemoryUsage).toBeGreaterThan(0);
    });

    it('应该跟踪活动测试', () => {
      monitor.startMonitoring();

      monitor.startTest('active-1', 'Active Test 1');
      monitor.startTest('active-2', 'Active Test 2');

      const activeTests = monitor.getActiveTests();
      expect(activeTests).toContain('active-1');
      expect(activeTests).toContain('active-2');
      expect(activeTests.length).toBe(2);

      monitor.endTest('active-1');

      const updatedActiveTests = monitor.getActiveTests();
      expect(updatedActiveTests).not.toContain('active-1');
      expect(updatedActiveTests).toContain('active-2');
      expect(updatedActiveTests.length).toBe(1);
    });
  });

  describe('数据管理', () => {
    it('应该能够清除指标数据', async () => {
      monitor.startMonitoring();

      monitor.startTest('clear-test', 'Clear Test');
      await new Promise(resolve => setTimeout(resolve, 50));
      monitor.endTest('clear-test');

      expect(monitor.getAllMetrics().length).toBe(1);

      monitor.clearMetrics();
      expect(monitor.getAllMetrics().length).toBe(0);
    });

    it('应该限制历史记录数量', async () => {
      const limitedMonitor = new RealTimePerformanceMonitor({
        maxMetricsHistory: 2,
      });

      limitedMonitor.startMonitoring();

      // 运行3个测试，但只保留2个
      for (let i = 0; i < 3; i++) {
        const testId = `limit-test-${i}`;
        limitedMonitor.startTest(testId, `Limit Test ${i}`);
        await new Promise(resolve => setTimeout(resolve, 10));
        limitedMonitor.endTest(testId);
      }

      const allMetrics = limitedMonitor.getAllMetrics();
      expect(allMetrics.length).toBe(2);

      limitedMonitor.destroy();
    });
  });

  describe('错误处理', () => {
    it('应该处理不存在的测试ID', () => {
      monitor.startMonitoring();

      const metrics = monitor.endTest('non-existent-test');
      expect(metrics).toBeNull();
    });

    it('应该处理重复的测试ID', () => {
      monitor.startMonitoring();

      monitor.startTest('duplicate-test', 'Test 1');
      monitor.startTest('duplicate-test', 'Test 2'); // 应该覆盖第一个

      const metrics = monitor.endTest('duplicate-test');
      expect(metrics).toBeDefined();
      expect(metrics!.testName).toBe('Test 2');
    });

    it('应该在未启动监控时安全处理操作', () => {
      expect(() => {
        monitor.startTest('test', 'Test');
        monitor.endTest('test');
      }).not.toThrow();
    });
  });

  describe('事件发射', () => {
    it('应该发射测试开始事件', (done) => {
      monitor.on('test:started', (data) => {
        expect(data.testId).toBe('event-test');
        expect(data.testName).toBe('Event Test');
        done();
      });

      monitor.startMonitoring();
      monitor.startTest('event-test', 'Event Test');
    });

    it('应该发射测试完成事件', (done) => {
      monitor.on('test:completed', (metrics) => {
        expect(metrics.testId).toBe('complete-test');
        expect(metrics.duration).toBeGreaterThan(0);
        done();
      });

      monitor.startMonitoring();
      monitor.startTest('complete-test', 'Complete Test');

      setTimeout(() => {
        monitor.endTest('complete-test');
      }, 50);
    });
  });
});
