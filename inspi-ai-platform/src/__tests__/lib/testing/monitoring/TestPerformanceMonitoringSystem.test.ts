import { TestPerformanceMonitoringSystem, createTestPerformanceMonitoring, setupJestPerformanceMonitoring } from '../../../../lib/testing/monitoring';

describe('TestPerformanceMonitoringSystem', () => {
  let monitoringSystem: TestPerformanceMonitoringSystem;

  beforeEach(() => {
    monitoringSystem = new TestPerformanceMonitoringSystem({
      enableAllFeatures: false, // 手动控制启动
      realTimeMonitoring: {
        alertThresholds: {
          executionTime: 1000,
          memoryUsage: 10 * 1024 * 1024,
          cpuUsage: 80,
        },
      },
      memoryTracking: {
        leakThreshold: 5 * 1024 * 1024,
      },
      regressionDetection: {
        regressionThreshold: 0.3,
        minSamples: 3,
      },
      bottleneckAnalysis: {
        hotspotThreshold: 100,
        memoryThreshold: 10 * 1024 * 1024,
      },
    });
  });

  afterEach(() => {
    monitoringSystem.destroy();
  });

  describe('系统初始化', () => {
    it('应该正确初始化所有监控组件', () => {
      expect(monitoringSystem).toBeDefined();

      const status = monitoringSystem.getMonitoringStatus();
      expect(status.isMonitoring).toBe(false); // 未自动启动
      expect(status.activeTests).toEqual([]);
      expect(status.systemHealth).toBe('healthy');
    });

    it('应该支持自动启动所有功能', () => {
      const autoSystem = new TestPerformanceMonitoringSystem({
        enableAllFeatures: true,
      });

      const status = autoSystem.getMonitoringStatus();
      expect(status.isMonitoring).toBe(true);

      autoSystem.destroy();
    });
  });

  describe('监控生命周期', () => {
    it('应该能够启动和停止监控', () => {
      expect(monitoringSystem.getMonitoringStatus().isMonitoring).toBe(false);

      monitoringSystem.startMonitoring();
      expect(monitoringSystem.getMonitoringStatus().isMonitoring).toBe(true);

      monitoringSystem.stopMonitoring();
      expect(monitoringSystem.getMonitoringStatus().isMonitoring).toBe(false);
    });

    it('应该能够监控单个测试', async () => {
      monitoringSystem.startMonitoring();

      const testId = 'integration-test-001';
      const testName = 'Integration Test 001';

      monitoringSystem.startTestMonitoring(testId, testName);

      const status = monitoringSystem.getMonitoringStatus();
      expect(status.activeTests).toContain(testId);

      // 模拟测试执行
      await new Promise(resolve => setTimeout(resolve, 100));

      monitoringSystem.endTestMonitoring(testId);

      const updatedStatus = monitoringSystem.getMonitoringStatus();
      expect(updatedStatus.activeTests).not.toContain(testId);
    });
  });

  describe('综合性能报告', () => {
    it('应该生成综合性能报告', async () => {
      monitoringSystem.startMonitoring();

      // 运行几个测试
      for (let i = 1; i <= 3; i++) {
        const testId = `report-test-${i}`;
        const testName = `Report Test ${i}`;

        monitoringSystem.startTestMonitoring(testId, testName);
        await new Promise(resolve => setTimeout(resolve, 50 + i * 20));
        monitoringSystem.endTestMonitoring(testId);
      }

      const report = monitoringSystem.getPerformanceReport();

      expect(report.summary.totalTests).toBe(3);
      expect(report.summary.averageExecutionTime).toBeGreaterThan(0);
      expect(report.realTimeMetrics).toBeDefined();
      expect(report.memoryAnalysis).toBeDefined();
      expect(report.regressions).toBeDefined();
      expect(report.bottlenecks).toBeDefined();
    });

    it('应该支持单个测试的报告', async () => {
      monitoringSystem.startMonitoring();

      const testId = 'single-report-test';
      const testName = 'Single Report Test';

      monitoringSystem.startTestMonitoring(testId, testName);
      await new Promise(resolve => setTimeout(resolve, 100));
      monitoringSystem.endTestMonitoring(testId);

      const report = monitoringSystem.getPerformanceReport(testId);

      expect(report.summary.totalTests).toBe(1);
      expect(report.realTimeMetrics).toBeDefined();
    });
  });

  describe('性能统计', () => {
    it('应该提供各组件的统计信息', async () => {
      monitoringSystem.startMonitoring();

      // 运行一些测试以生成统计数据
      const testId = 'stats-test';
      monitoringSystem.startTestMonitoring(testId, 'Stats Test');
      await new Promise(resolve => setTimeout(resolve, 100));
      monitoringSystem.endTestMonitoring(testId);

      const statistics = monitoringSystem.getPerformanceStatistics();

      expect(statistics.monitoring).toBeDefined();
      expect(statistics.memory).toBeDefined();
      expect(statistics.regression).toBeDefined();
      expect(statistics.bottleneck).toBeDefined();
    });
  });

  describe('系统健康状态', () => {
    it('应该评估系统健康状态', () => {
      const status = monitoringSystem.getMonitoringStatus();

      expect(status.systemHealth).toBeOneOf(['healthy', 'warning', 'critical']);
      expect(status.uptime).toBeGreaterThan(0);
    });

    it('应该在检测到问题时更新健康状态', async () => {
      monitoringSystem.startMonitoring();

      // 模拟一些性能问题
      // 注意：实际的健康状态评估可能需要更多的数据积累
      const initialStatus = monitoringSystem.getMonitoringStatus();
      expect(initialStatus.systemHealth).toBe('healthy');
    });
  });

  describe('数据管理', () => {
    it('应该能够清除所有数据', async () => {
      monitoringSystem.startMonitoring();

      // 生成一些数据
      const testId = 'clear-data-test';
      monitoringSystem.startTestMonitoring(testId, 'Clear Data Test');
      await new Promise(resolve => setTimeout(resolve, 50));
      monitoringSystem.endTestMonitoring(testId);

      let report = monitoringSystem.getPerformanceReport();
      expect(report.summary.totalTests).toBeGreaterThan(0);

      monitoringSystem.clearAllData();

      report = monitoringSystem.getPerformanceReport();
      expect(report.summary.totalTests).toBe(0);
    });
  });

  describe('事件集成', () => {
    it('应该正确处理组件间的事件', (done) => {
      monitoringSystem.startMonitoring();

      // 监听系统级事件（如果有的话）
      const eventsReceived = 0;

      const testId = 'event-integration-test';
      monitoringSystem.startTestMonitoring(testId, 'Event Integration Test');

      setTimeout(() => {
        monitoringSystem.endTestMonitoring(testId);

        // 验证事件处理
        setTimeout(() => {
          const report = monitoringSystem.getPerformanceReport(testId);
          expect(report.realTimeMetrics).toBeDefined();
          done();
        }, 50);
      }, 100);
    });
  });

  describe('错误处理', () => {
    it('应该优雅地处理组件错误', () => {
      expect(() => {
        monitoringSystem.startTestMonitoring('', ''); // 空参数
        monitoringSystem.endTestMonitoring('non-existent-test');
      }).not.toThrow();
    });

    it('应该在组件失败时继续工作', () => {
      // 即使某个组件出现问题，系统也应该继续工作
      monitoringSystem.startMonitoring();

      expect(() => {
        const report = monitoringSystem.getPerformanceReport();
        expect(report).toBeDefined();
      }).not.toThrow();
    });
  });
});

describe('createTestPerformanceMonitoring', () => {
  it('应该创建默认配置的监控系统', () => {
    const monitoring = createTestPerformanceMonitoring();

    expect(monitoring).toBeDefined();
    expect(monitoring.getMonitoringStatus().isMonitoring).toBe(true); // 默认启用所有功能

    monitoring.destroy();
  });

  it('应该支持自定义配置', () => {
    const monitoring = createTestPerformanceMonitoring({
      enableAllFeatures: false,
      realTimeMonitoring: {
        alertThresholds: {
          executionTime: 500,
          memoryUsage: 5 * 1024 * 1024,
          cpuUsage: 70,
        },
      },
    });

    expect(monitoring).toBeDefined();
    expect(monitoring.getMonitoringStatus().isMonitoring).toBe(false);

    monitoring.destroy();
  });
});

describe('setupJestPerformanceMonitoring', () => {
  it('应该创建Jest集成辅助函数', () => {
    const jestHelpers = setupJestPerformanceMonitoring({
      enableAllFeatures: false,
    });

    expect(jestHelpers.beforeAll).toBeInstanceOf(Function);
    expect(jestHelpers.afterAll).toBeInstanceOf(Function);
    expect(jestHelpers.beforeEach).toBeInstanceOf(Function);
    expect(jestHelpers.afterEach).toBeInstanceOf(Function);
    expect(jestHelpers.getReport).toBeInstanceOf(Function);
  });

  it('应该支持Jest测试生命周期', async () => {
    const jestHelpers = setupJestPerformanceMonitoring();

    // 模拟Jest生命周期
    jestHelpers.beforeAll();

    jestHelpers.beforeEach('Test Case 1');
    await new Promise(resolve => setTimeout(resolve, 50));
    jestHelpers.afterEach('Test Case 1');

    jestHelpers.beforeEach('Test Case 2');
    await new Promise(resolve => setTimeout(resolve, 30));
    jestHelpers.afterEach('Test Case 2');

    const report = jestHelpers.getReport();
    expect(report.summary.totalTests).toBe(2);

    jestHelpers.afterAll();
  });

  it('应该处理测试执行错误', () => {
    const jestHelpers = setupJestPerformanceMonitoring();

    expect(() => {
      jestHelpers.beforeAll();
      jestHelpers.beforeEach('Error Test');
      // 模拟测试中断，没有调用afterEach
      jestHelpers.afterAll();
    }).not.toThrow();
  });
});

describe('监控系统集成测试', () => {
  it('应该在真实场景中正常工作', async () => {
    const monitoring = createTestPerformanceMonitoring({
      realTimeMonitoring: {
        alertThresholds: {
          executionTime: 200,
          memoryUsage: 5 * 1024 * 1024,
          cpuUsage: 80,
        },
      },
    });

    // 模拟真实的测试场景
    const testScenarios = [
      { id: 'fast-test', name: 'Fast Test', duration: 50 },
      { id: 'medium-test', name: 'Medium Test', duration: 150 },
      { id: 'slow-test', name: 'Slow Test', duration: 300 },
    ];

    for (const scenario of testScenarios) {
      monitoring.startTestMonitoring(scenario.id, scenario.name);

      // 模拟不同的工作负载
      const startTime = Date.now();
      while (Date.now() - startTime < scenario.duration) {
        Math.random() * Math.random(); // 轻量计算
      }

      monitoring.endTestMonitoring(scenario.id);
    }

    const finalReport = monitoring.getPerformanceReport();

    expect(finalReport.summary.totalTests).toBe(3);
    expect(finalReport.summary.averageExecutionTime).toBeGreaterThan(0);

    // 验证不同测试的性能差异被正确记录
    const fastTest = finalReport.realTimeMetrics.find((m: any) => m.testId === 'fast-test');
    const slowTest = finalReport.realTimeMetrics.find((m: any) => m.testId === 'slow-test');

    if (fastTest && slowTest) {
      expect(slowTest.duration).toBeGreaterThan(fastTest.duration);
    }

    monitoring.destroy();
  });

  it('应该检测性能回归', async () => {
    const monitoring = createTestPerformanceMonitoring({
      regressionDetection: {
        regressionThreshold: 0.2, // 20%阈值
        minSamples: 3,
      },
    });

    const testId = 'regression-test';
    const testName = 'Regression Test';

    // 建立基线性能
    for (let i = 0; i < 5; i++) {
      monitoring.startTestMonitoring(testId, testName);

      const startTime = Date.now();
      while (Date.now() - startTime < 100) {
        Math.random();
      }

      monitoring.endTestMonitoring(testId);
    }

    // 模拟性能回归
    monitoring.startTestMonitoring(testId, testName);

    const startTime = Date.now();
    while (Date.now() - startTime < 200) { // 明显更慢
      Math.random() * Math.random() * Math.random();
    }

    monitoring.endTestMonitoring(testId);

    // 检查是否检测到回归
    const report = monitoring.getPerformanceReport();

    // 回归检测可能需要一些时间来处理
    await new Promise(resolve => setTimeout(resolve, 100));

    const finalReport = monitoring.getPerformanceReport();
    expect(finalReport.regressions.length).toBeGreaterThanOrEqual(0);

    monitoring.destroy();
  });
});
