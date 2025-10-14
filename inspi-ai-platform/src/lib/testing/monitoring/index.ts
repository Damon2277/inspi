/**
 * 测试性能监控系统
 *
 * 这个模块提供了完整的测试性能监控解决方案，包括：
 * - 实时测试执行时间监控
 * - 内存使用情况跟踪分析
 * - 自动性能回归检测
 * - 智能性能瓶颈识别和报告
 */

export { RealTimePerformanceMonitor } from './RealTimePerformanceMonitor';
export { MemoryUsageTracker } from './MemoryUsageTracker';
export { PerformanceRegressionDetector } from './PerformanceRegressionDetector';
export { PerformanceBottleneckAnalyzer } from './PerformanceBottleneckAnalyzer';

export type {
  TestExecutionMetrics,
  MemoryUsage,
  CPUUsage,
  PerformanceSnapshot,
  PerformanceAlert,
  MonitoringOptions,
} from './RealTimePerformanceMonitor';

export type {
  MemorySnapshot,
  HeapSpaceUsage,
  MemoryLeak,
  MemoryAnalysis,
  GCStats,
  GCEvent,
  TrackerOptions,
} from './MemoryUsageTracker';

export type {
  PerformanceBaseline,
  PerformanceRegression,
  RegressionDetails,
  PerformanceDataPoint,
  TrendAnalysis,
  DetectorOptions,
} from './PerformanceRegressionDetector';

export type {
  BottleneckReport,
  CodeLocation,
  BottleneckMetrics,
  PerformanceProfile,
  ProfilePhase,
  Operation,
  Hotspot,
  ResourceUsage,
  AnalyzerOptions,
} from './PerformanceBottleneckAnalyzer';

import { MemoryUsageTracker, TrackerOptions } from './MemoryUsageTracker';
import { PerformanceBottleneckAnalyzer, AnalyzerOptions } from './PerformanceBottleneckAnalyzer';
import { PerformanceRegressionDetector, DetectorOptions } from './PerformanceRegressionDetector';
import { RealTimePerformanceMonitor, MonitoringOptions } from './RealTimePerformanceMonitor';

export interface TestPerformanceMonitoringOptions {
  realTimeMonitoring?: Partial<MonitoringOptions>;
  memoryTracking?: Partial<TrackerOptions>;
  regressionDetection?: Partial<DetectorOptions>;
  bottleneckAnalysis?: Partial<AnalyzerOptions>;
  enableAllFeatures?: boolean;
}

/**
 * 综合测试性能监控系统
 * 整合所有监控组件提供统一的API
 */
export class TestPerformanceMonitoringSystem {
  private realTimeMonitor: RealTimePerformanceMonitor;
  private memoryTracker: MemoryUsageTracker;
  private regressionDetector: PerformanceRegressionDetector;
  private bottleneckAnalyzer: PerformanceBottleneckAnalyzer;
  private isMonitoring = false;

  constructor(options: TestPerformanceMonitoringOptions = {}) {
    // 初始化各个监控组件
    this.realTimeMonitor = new RealTimePerformanceMonitor(options.realTimeMonitoring);
    this.memoryTracker = new MemoryUsageTracker(options.memoryTracking);
    this.regressionDetector = new PerformanceRegressionDetector(options.regressionDetection);
    this.bottleneckAnalyzer = new PerformanceBottleneckAnalyzer(options.bottleneckAnalysis);

    this.setupEventHandlers();

    // 如果启用所有功能，自动开始监控
    if (options.enableAllFeatures) {
      this.startMonitoring();
    }
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    // 实时监控事件
    this.realTimeMonitor.on('test:completed', (metrics) => {
      // 记录性能数据到回归检测器
      this.regressionDetector.recordPerformance(
        metrics.testId,
        metrics.testName,
        metrics.duration || 0,
        metrics.memoryUsage.heapUsed,
      );
    });

    // 内存跟踪事件
    this.memoryTracker.on('memory:leak', (leak) => {
      // 内存泄漏也是一种性能瓶颈
      console.warn(`Memory leak detected in test ${leak.testId}: ${leak.leakSize} bytes`);
    });

    // 回归检测事件
    this.regressionDetector.on('regression:detected', (regression) => {
      console.warn(`Performance regression detected in ${regression.testName}: ${regression.details.degradationPercentage}% slower`);
    });

    // 瓶颈分析事件
    this.bottleneckAnalyzer.on('analysis:completed', ({ testId, bottlenecks }) => {
      if (bottlenecks.length > 0) {
        console.info(`Performance analysis completed for ${testId}: ${bottlenecks.length} bottlenecks found`);
      }
    });
  }

  /**
   * 开始监控
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.realTimeMonitor.startMonitoring();
    this.memoryTracker.startTracking();
  }

  /**
   * 停止监控
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    this.realTimeMonitor.stopMonitoring();
    this.memoryTracker.stopTracking();
  }

  /**
   * 开始测试监控
   */
  startTestMonitoring(testId: string, testName: string): void {
    this.realTimeMonitor.startTest(testId, testName);
    this.memoryTracker.startTest(testId);
    this.bottleneckAnalyzer.startAnalysis(testId, testName);
  }

  /**
   * 结束测试监控
   */
  endTestMonitoring(testId: string): void {
    const metrics = this.realTimeMonitor.endTest(testId);
    const memoryAnalysis = this.memoryTracker.endTest(testId);

    if (metrics && memoryAnalysis) {
      this.bottleneckAnalyzer.endAnalysis(testId, metrics.duration || 0, metrics.memoryUsage.heapUsed);
    }
  }

  /**
   * 获取综合性能报告
   */
  getPerformanceReport(testId?: string): {
    realTimeMetrics: any;
    memoryAnalysis: any;
    regressions: any[];
    bottlenecks: any[];
    summary: {
      totalTests: number;
      averageExecutionTime: number;
      memoryLeaks: number;
      regressionCount: number;
      bottleneckCount: number;
    };
  } {
    const realTimeMetrics = testId
      ? this.realTimeMonitor.getTestMetrics(testId)
      : this.realTimeMonitor.getAllMetrics();

    const memoryAnalysis = testId
      ? this.memoryTracker.getTestAnalysis(testId)
      : this.memoryTracker.getAllAnalyses();

    const regressions = this.regressionDetector.getRecentRegressions();
    const bottlenecks = this.bottleneckAnalyzer.getBottleneckReports(testId);

    // 计算汇总统计
    const allMetrics = Array.isArray(realTimeMetrics) ? realTimeMetrics : [realTimeMetrics].filter(Boolean);
    const allMemoryAnalyses = Array.isArray(memoryAnalysis) ? memoryAnalysis : [memoryAnalysis].filter(Boolean);

    const totalTests = allMetrics.length;
    const averageExecutionTime = totalTests > 0
      ? allMetrics.reduce((sum, m) => sum + (m.duration || 0), 0) / totalTests
      : 0;
    const memoryLeaks = allMemoryAnalyses.reduce((sum, a) => sum + (a.leaks?.length || 0), 0);

    return {
      realTimeMetrics,
      memoryAnalysis,
      regressions,
      bottlenecks,
      summary: {
        totalTests,
        averageExecutionTime,
        memoryLeaks,
        regressionCount: regressions.length,
        bottleneckCount: bottlenecks.length,
      },
    };
  }

  /**
   * 获取性能统计
   */
  getPerformanceStatistics(): {
    monitoring: any;
    memory: any;
    regression: any;
    bottleneck: any;
  } {
    return {
      monitoring: this.realTimeMonitor.getStatistics(),
      memory: this.memoryTracker.getStatistics(),
      regression: this.regressionDetector.getStatistics(),
      bottleneck: this.bottleneckAnalyzer.getBottleneckStatistics(),
    };
  }

  /**
   * 清除所有数据
   */
  clearAllData(): void {
    this.realTimeMonitor.clearMetrics();
    this.memoryTracker.clearData();
    this.regressionDetector.clearHistory();
    this.bottleneckAnalyzer.clearReports();
  }

  /**
   * 销毁监控系统
   */
  destroy(): void {
    this.stopMonitoring();
    this.realTimeMonitor.destroy();
    this.memoryTracker.destroy();
    this.regressionDetector.destroy();
    this.bottleneckAnalyzer.destroy();
  }

  /**
   * 获取监控状态
   */
  getMonitoringStatus(): {
    isMonitoring: boolean;
    activeTests: string[];
    systemHealth: 'healthy' | 'warning' | 'critical';
    uptime: number;
  } {
    const activeTests = this.realTimeMonitor.getActiveTests();
    const statistics = this.getPerformanceStatistics();

    // 简单的健康状态评估
    let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';

    if (statistics.regression.totalRegressions > 5) {
      systemHealth = 'warning';
    }
    if (statistics.bottleneck.totalBottlenecks > 10 || statistics.memory.totalLeaks > 3) {
      systemHealth = 'critical';
    }

    return {
      isMonitoring: this.isMonitoring,
      activeTests,
      systemHealth,
      uptime: process.uptime(),
    };
  }
}

/**
 * 创建默认的测试性能监控系统实例
 */
export function createTestPerformanceMonitoring(
  options: TestPerformanceMonitoringOptions = {},
): TestPerformanceMonitoringSystem {
  return new TestPerformanceMonitoringSystem({
    enableAllFeatures: true,
    ...options,
  });
}

/**
 * Jest集成辅助函数
 */
export function setupJestPerformanceMonitoring(
  options: TestPerformanceMonitoringOptions = {},
): {
  beforeAll: () => void;
  afterAll: () => void;
  beforeEach: (testName: string) => void;
  afterEach: (testName: string) => void;
  getReport: () => any;
} {
  const monitoring = createTestPerformanceMonitoring(options);
  let currentTestId: string | null = null;

  return {
    beforeAll: () => {
      monitoring.startMonitoring();
    },
    afterAll: () => {
      monitoring.stopMonitoring();
    },
    beforeEach: (testName: string) => {
      currentTestId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      monitoring.startTestMonitoring(currentTestId, testName);
    },
    afterEach: (testName: string) => {
      if (currentTestId) {
        monitoring.endTestMonitoring(currentTestId);
        currentTestId = null;
      }
    },
    getReport: () => monitoring.getPerformanceReport(),
  };
}
