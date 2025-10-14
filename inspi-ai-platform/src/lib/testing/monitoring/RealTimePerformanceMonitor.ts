import { EventEmitter } from 'events';
import * as os from 'os';
import * as process from 'process';

export interface TestExecutionMetrics {
  testId: string;
  testName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryUsage: MemoryUsage;
  cpuUsage: CPUUsage;
  status: 'running' | 'completed' | 'failed' | 'timeout';
  error?: string;
}

export interface MemoryUsage {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  arrayBuffers: number;
  timestamp: number;
}

export interface CPUUsage {
  user: number;
  system: number;
  timestamp: number;
}

export interface PerformanceSnapshot {
  timestamp: number;
  activeTests: number;
  totalMemoryUsage: MemoryUsage;
  systemLoad: number[];
  freeMemory: number;
  totalMemory: number;
  cpuCount: number;
}

export interface PerformanceAlert {
  type: 'memory' | 'cpu' | 'duration' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  testId?: string;
  metrics: any;
  timestamp: number;
}

export interface MonitoringOptions {
  snapshotInterval: number; // ms
  memoryThreshold: number; // bytes
  cpuThreshold: number; // percentage
  durationThreshold: number; // ms
  maxHistorySize: number;
  alertEnabled: boolean;
}

/**
 * 实时性能监控器
 * 监控测试执行时间、内存使用和系统资源
 */
export class RealTimePerformanceMonitor extends EventEmitter {
  private options: MonitoringOptions;
  private activeTests: Map<string, TestExecutionMetrics> = new Map();
  private completedTests: TestExecutionMetrics[] = [];
  private performanceHistory: PerformanceSnapshot[] = [];
  private monitoringInterval?: NodeJS.Timeout;
  private isMonitoring = false;
  private baselineCPU?: CPUUsage;

  constructor(options: Partial<MonitoringOptions> = {}) {
    super();
    this.options = {
      snapshotInterval: 1000, // 1 second
      memoryThreshold: 500 * 1024 * 1024, // 500MB
      cpuThreshold: 80, // 80%
      durationThreshold: 30000, // 30 seconds
      maxHistorySize: 1000,
      alertEnabled: true,
      ...options,
    };
  }

  /**
   * 开始监控
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.baselineCPU = this.getCurrentCPUUsage();

    this.monitoringInterval = setInterval(() => {
      this.capturePerformanceSnapshot();
    }, this.options.snapshotInterval);

    this.emit('monitoring:started');
  }

  /**
   * 停止监控
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    this.emit('monitoring:stopped');
  }

  /**
   * 开始测试监控
   */
  startTest(testId: string, testName: string): void {
    const metrics: TestExecutionMetrics = {
      testId,
      testName,
      startTime: Date.now(),
      memoryUsage: this.getCurrentMemoryUsage(),
      cpuUsage: this.getCurrentCPUUsage(),
      status: 'running',
    };

    this.activeTests.set(testId, metrics);
    this.emit('test:started', metrics);
  }

  /**
   * 结束测试监控
   */
  endTest(testId: string, status: 'completed' | 'failed' | 'timeout', error?: string): void {
    const metrics = this.activeTests.get(testId);
    if (!metrics) {
      return;
    }

    const endTime = Date.now();
    const duration = endTime - metrics.startTime;

    const completedMetrics: TestExecutionMetrics = {
      ...metrics,
      endTime,
      duration,
      status,
      error,
      memoryUsage: this.getCurrentMemoryUsage(),
      cpuUsage: this.getCurrentCPUUsage(),
    };

    this.activeTests.delete(testId);
    this.completedTests.push(completedMetrics);

    // 保持历史记录在合理范围内
    if (this.completedTests.length > this.options.maxHistorySize) {
      this.completedTests = this.completedTests.slice(-this.options.maxHistorySize);
    }

    // 检查性能警报
    if (this.options.alertEnabled) {
      this.checkPerformanceAlerts(completedMetrics);
    }

    this.emit('test:completed', completedMetrics);
  }

  /**
   * 获取当前内存使用情况
   */
  private getCurrentMemoryUsage(): MemoryUsage {
    const memUsage = process.memoryUsage();
    return {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
      arrayBuffers: memUsage.arrayBuffers,
      timestamp: Date.now(),
    };
  }

  /**
   * 获取当前CPU使用情况
   */
  private getCurrentCPUUsage(): CPUUsage {
    const cpuUsage = process.cpuUsage(this.baselineCPU);
    return {
      user: cpuUsage.user,
      system: cpuUsage.system,
      timestamp: Date.now(),
    };
  }

  /**
   * 捕获性能快照
   */
  private capturePerformanceSnapshot(): void {
    const snapshot: PerformanceSnapshot = {
      timestamp: Date.now(),
      activeTests: this.activeTests.size,
      totalMemoryUsage: this.getCurrentMemoryUsage(),
      systemLoad: os.loadavg(),
      freeMemory: os.freemem(),
      totalMemory: os.totalmem(),
      cpuCount: os.cpus().length,
    };

    this.performanceHistory.push(snapshot);

    // 保持历史记录在合理范围内
    if (this.performanceHistory.length > this.options.maxHistorySize) {
      this.performanceHistory = this.performanceHistory.slice(-this.options.maxHistorySize);
    }

    this.emit('snapshot:captured', snapshot);

    // 检查系统级警报
    if (this.options.alertEnabled) {
      this.checkSystemAlerts(snapshot);
    }
  }

  /**
   * 检查性能警报
   */
  private checkPerformanceAlerts(metrics: TestExecutionMetrics): void {
    const alerts: PerformanceAlert[] = [];

    // 检查执行时间警报
    if (metrics.duration && metrics.duration > this.options.durationThreshold) {
      alerts.push({
        type: 'duration',
        severity: metrics.duration > this.options.durationThreshold * 2 ? 'high' : 'medium',
        message: `Test ${metrics.testName} took ${metrics.duration}ms to complete`,
        testId: metrics.testId,
        metrics: { duration: metrics.duration },
        timestamp: Date.now(),
      });
    }

    // 检查内存使用警报
    if (metrics.memoryUsage.heapUsed > this.options.memoryThreshold) {
      alerts.push({
        type: 'memory',
        severity: metrics.memoryUsage.heapUsed > this.options.memoryThreshold * 2 ? 'critical' : 'high',
        message: `Test ${metrics.testName} used ${Math.round(metrics.memoryUsage.heapUsed / 1024 / 1024)}MB of memory`,
        testId: metrics.testId,
        metrics: { memoryUsage: metrics.memoryUsage },
        timestamp: Date.now(),
      });
    }

    // 发送警报
    alerts.forEach(alert => {
      this.emit('alert', alert);
    });
  }

  /**
   * 检查系统级警报
   */
  private checkSystemAlerts(snapshot: PerformanceSnapshot): void {
    const alerts: PerformanceAlert[] = [];

    // 检查系统内存使用
    const memoryUsagePercent = (snapshot.totalMemory - snapshot.freeMemory) / snapshot.totalMemory;
    if (memoryUsagePercent > 0.9) {
      alerts.push({
        type: 'system',
        severity: memoryUsagePercent > 0.95 ? 'critical' : 'high',
        message: `System memory usage is at ${Math.round(memoryUsagePercent * 100)}%`,
        metrics: { memoryUsagePercent, freeMemory: snapshot.freeMemory },
        timestamp: Date.now(),
      });
    }

    // 检查系统负载
    const avgLoad = snapshot.systemLoad[0]; // 1分钟平均负载
    const loadThreshold = snapshot.cpuCount * 0.8;
    if (avgLoad > loadThreshold) {
      alerts.push({
        type: 'system',
        severity: avgLoad > snapshot.cpuCount ? 'critical' : 'high',
        message: `System load is ${avgLoad.toFixed(2)} (threshold: ${loadThreshold.toFixed(2)})`,
        metrics: { systemLoad: snapshot.systemLoad, cpuCount: snapshot.cpuCount },
        timestamp: Date.now(),
      });
    }

    // 发送警报
    alerts.forEach(alert => {
      this.emit('alert', alert);
    });
  }

  /**
   * 获取活动测试
   */
  getActiveTests(): TestExecutionMetrics[] {
    return Array.from(this.activeTests.values());
  }

  /**
   * 获取已完成测试
   */
  getCompletedTests(): TestExecutionMetrics[] {
    return [...this.completedTests];
  }

  /**
   * 获取性能历史
   */
  getPerformanceHistory(): PerformanceSnapshot[] {
    return [...this.performanceHistory];
  }

  /**
   * 获取性能统计
   */
  getPerformanceStats(): {
    totalTests: number;
    averageDuration: number;
    averageMemoryUsage: number;
    slowestTests: TestExecutionMetrics[];
    memoryIntensiveTests: TestExecutionMetrics[];
    currentSystemLoad: number[];
    memoryUsagePercent: number;
  } {
    const completedTests = this.completedTests.filter(t => t.duration !== undefined);
    const totalTests = completedTests.length;

    const averageDuration = totalTests > 0
      ? completedTests.reduce((sum, t) => sum + (t.duration || 0), 0) / totalTests
      : 0;

    const averageMemoryUsage = totalTests > 0
      ? completedTests.reduce((sum, t) => sum + t.memoryUsage.heapUsed, 0) / totalTests
      : 0;

    const slowestTests = completedTests
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .slice(0, 10);

    const memoryIntensiveTests = completedTests
      .sort((a, b) => b.memoryUsage.heapUsed - a.memoryUsage.heapUsed)
      .slice(0, 10);

    const latestSnapshot = this.performanceHistory[this.performanceHistory.length - 1];
    const currentSystemLoad = latestSnapshot ? latestSnapshot.systemLoad : [0, 0, 0];
    const memoryUsagePercent = latestSnapshot
      ? (latestSnapshot.totalMemory - latestSnapshot.freeMemory) / latestSnapshot.totalMemory
      : 0;

    return {
      totalTests,
      averageDuration,
      averageMemoryUsage,
      slowestTests,
      memoryIntensiveTests,
      currentSystemLoad,
      memoryUsagePercent,
    };
  }

  /**
   * 获取测试性能趋势
   */
  getPerformanceTrends(timeWindow: number = 3600000): { // 1 hour default
    durationTrend: number[];
    memoryTrend: number[];
    systemLoadTrend: number[];
    timestamps: number[];
  } {
    const cutoffTime = Date.now() - timeWindow;
    const recentSnapshots = this.performanceHistory.filter(s => s.timestamp > cutoffTime);
    const recentTests = this.completedTests.filter(t => t.startTime > cutoffTime);

    const timestamps = recentSnapshots.map(s => s.timestamp);
    const durationTrend = recentTests.map(t => t.duration || 0);
    const memoryTrend = recentSnapshots.map(s => s.totalMemoryUsage.heapUsed);
    const systemLoadTrend = recentSnapshots.map(s => s.systemLoad[0]);

    return {
      durationTrend,
      memoryTrend,
      systemLoadTrend,
      timestamps,
    };
  }

  /**
   * 重置监控数据
   */
  reset(): void {
    this.activeTests.clear();
    this.completedTests = [];
    this.performanceHistory = [];
    this.emit('monitoring:reset');
  }

  /**
   * 导出监控数据
   */
  exportData(): {
    activeTests: TestExecutionMetrics[];
    completedTests: TestExecutionMetrics[];
    performanceHistory: PerformanceSnapshot[];
    stats: any;
  } {
    return {
      activeTests: this.getActiveTests(),
      completedTests: this.getCompletedTests(),
      performanceHistory: this.getPerformanceHistory(),
      stats: this.getPerformanceStats(),
    };
  }

  /**
   * 销毁监控器
   */
  destroy(): void {
    this.stopMonitoring();
    this.reset();
    this.removeAllListeners();
  }
}
