/**
 * Test Performance Monitoring Tools
 *
 * This module provides tools for monitoring and measuring performance
 * during test execution, including execution time, memory usage, and
 * performance regression detection.
 */

import { TestError, TestErrorType } from '../errors/TestError';

export interface PerformanceMetrics {
  executionTime: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  cpuUsage?: {
    user: number;
    system: number;
  };
  timestamp: Date;
}

export interface PerformanceBenchmark {
  name: string;
  baseline: PerformanceMetrics;
  threshold: {
    executionTime?: number; // percentage increase allowed
    memoryUsage?: number;   // percentage increase allowed
  };
}

export interface PerformanceReport {
  testName: string;
  metrics: PerformanceMetrics;
  benchmark?: PerformanceBenchmark;
  regression?: {
    type: 'execution_time' | 'memory_usage';
    severity: 'warning' | 'critical';
    message: string;
    actualIncrease: number;
    allowedIncrease: number;
  };
}

/**
 * Performance monitoring and measurement tools for tests
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private benchmarks: Map<string, PerformanceBenchmark> = new Map();
  private measurements: Map<string, PerformanceMetrics[]> = new Map();
  private activeTimers: Map<string, { startTime: number; startMemory: NodeJS.MemoryUsage }> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start measuring performance for a test
   */
  startMeasurement(testName: string): void {
    const startTime = performance.now();
    const startMemory = process.memoryUsage();

    this.activeTimers.set(testName, { startTime, startMemory });
  }

  /**
   * Stop measuring performance and return metrics
   */
  stopMeasurement(testName: string): PerformanceMetrics {
    const timer = this.activeTimers.get(testName);
    if (!timer) {
      throw new TestError(
        TestErrorType.ASSERTION_FAILED,
        `No active measurement found for test: ${testName}`,
      );
    }

    const endTime = performance.now();
    const endMemory = process.memoryUsage();
    const executionTime = endTime - timer.startTime;

    const metrics: PerformanceMetrics = {
      executionTime,
      memoryUsage: {
        heapUsed: endMemory.heapUsed - timer.startMemory.heapUsed,
        heapTotal: endMemory.heapTotal - timer.startMemory.heapTotal,
        external: endMemory.external - timer.startMemory.external,
        rss: endMemory.rss - timer.startMemory.rss,
      },
      timestamp: new Date(),
    };

    // Store measurement
    const testMeasurements = this.measurements.get(testName) || [];
    testMeasurements.push(metrics);
    this.measurements.set(testName, testMeasurements);

    this.activeTimers.delete(testName);
    return metrics;
  }

  /**
   * Measure the performance of a function
   */
  async measureFunction<T>(
    testName: string,
    fn: () => Promise<T> | T,
  ): Promise<{ result: T; metrics: PerformanceMetrics }> {
    this.startMeasurement(testName);

    try {
      const result = await fn();
      const metrics = this.stopMeasurement(testName);
      return { result, metrics };
    } catch (error) {
      // Clean up timer if function throws
      this.activeTimers.delete(testName);
      throw error;
    }
  }

  /**
   * Set a performance benchmark for a test
   */
  setBenchmark(benchmark: PerformanceBenchmark): void {
    this.benchmarks.set(benchmark.name, benchmark);
  }

  /**
   * Get performance benchmark for a test
   */
  getBenchmark(testName: string): PerformanceBenchmark | undefined {
    return this.benchmarks.get(testName);
  }

  /**
   * Validate performance against benchmark
   */
  validatePerformance(testName: string, metrics: PerformanceMetrics): PerformanceReport {
    const benchmark = this.benchmarks.get(testName);
    const report: PerformanceReport = {
      testName,
      metrics,
      benchmark,
    };

    if (benchmark) {
      const regression = this.detectRegression(metrics, benchmark);
      if (regression) {
        report.regression = regression;
      }
    }

    return report;
  }

  /**
   * Assert that performance is within acceptable limits
   */
  assertPerformanceWithinLimits(
    testName: string,
    metrics: PerformanceMetrics,
    limits: {
      maxExecutionTime?: number;
      maxMemoryUsage?: number;
    },
  ): void {
    if (limits.maxExecutionTime && metrics.executionTime > limits.maxExecutionTime) {
      throw new TestError(
        TestErrorType.ASSERTION_FAILED,
        `Test "${testName}" execution time ${metrics.executionTime}ms exceeds limit of ${limits.maxExecutionTime}ms`,
      );
    }

    if (limits.maxMemoryUsage && metrics.memoryUsage.heapUsed > limits.maxMemoryUsage) {
      throw new TestError(
        TestErrorType.ASSERTION_FAILED,
        `Test "${testName}" memory usage ${metrics.memoryUsage.heapUsed} bytes exceeds limit of ${limits.maxMemoryUsage} bytes`,
      );
    }
  }

  /**
   * Get performance statistics for a test
   */
  getPerformanceStats(testName: string): {
    count: number;
    average: PerformanceMetrics;
    min: PerformanceMetrics;
    max: PerformanceMetrics;
    trend: 'improving' | 'degrading' | 'stable';
  } | null {
    const measurements = this.measurements.get(testName);
    if (!measurements || measurements.length === 0) {
      return null;
    }

    const count = measurements.length;
    const executionTimes = measurements.map(m => m.executionTime);
    const memoryUsages = measurements.map(m => m.memoryUsage.heapUsed);

    const average: PerformanceMetrics = {
      executionTime: executionTimes.reduce((a, b) => a + b, 0) / count,
      memoryUsage: {
        heapUsed: memoryUsages.reduce((a, b) => a + b, 0) / count,
        heapTotal: measurements.reduce((a, b) => a + b.memoryUsage.heapTotal, 0) / count,
        external: measurements.reduce((a, b) => a + b.memoryUsage.external, 0) / count,
        rss: measurements.reduce((a, b) => a + b.memoryUsage.rss, 0) / count,
      },
      timestamp: new Date(),
    };

    const minExecTime = Math.min(...executionTimes);
    const maxExecTime = Math.max(...executionTimes);
    const minMemory = Math.min(...memoryUsages);
    const maxMemory = Math.max(...memoryUsages);

    const min: PerformanceMetrics = {
      executionTime: minExecTime,
      memoryUsage: {
        heapUsed: minMemory,
        heapTotal: 0,
        external: 0,
        rss: 0,
      },
      timestamp: new Date(),
    };

    const max: PerformanceMetrics = {
      executionTime: maxExecTime,
      memoryUsage: {
        heapUsed: maxMemory,
        heapTotal: 0,
        external: 0,
        rss: 0,
      },
      timestamp: new Date(),
    };

    const trend = this.calculateTrend(measurements);

    return { count, average, min, max, trend };
  }

  /**
   * Clear all measurements for a test
   */
  clearMeasurements(testName?: string): void {
    if (testName) {
      this.measurements.delete(testName);
    } else {
      this.measurements.clear();
    }
  }

  /**
   * Export performance data
   */
  exportData(): {
    benchmarks: Record<string, PerformanceBenchmark>;
    measurements: Record<string, PerformanceMetrics[]>;
  } {
    return {
      benchmarks: Object.fromEntries(this.benchmarks),
      measurements: Object.fromEntries(this.measurements),
    };
  }

  /**
   * Import performance data
   */
  importData(data: {
    benchmarks?: Record<string, PerformanceBenchmark>;
    measurements?: Record<string, PerformanceMetrics[]>;
  }): void {
    if (data.benchmarks) {
      for (const [name, benchmark] of Object.entries(data.benchmarks)) {
        this.benchmarks.set(name, benchmark);
      }
    }

    if (data.measurements) {
      for (const [name, measurements] of Object.entries(data.measurements)) {
        this.measurements.set(name, measurements);
      }
    }
  }

  // Private helper methods
  private detectRegression(
    metrics: PerformanceMetrics,
    benchmark: PerformanceBenchmark,
  ): PerformanceReport['regression'] | null {
    const { threshold } = benchmark;
    const baseline = benchmark.baseline;

    // Check execution time regression
    if (threshold.executionTime) {
      const increase = ((metrics.executionTime - baseline.executionTime) / baseline.executionTime) * 100;
      if (increase > threshold.executionTime) {
        return {
          type: 'execution_time',
          severity: increase > threshold.executionTime * 2 ? 'critical' : 'warning',
          message: `Execution time increased by ${increase.toFixed(2)}%`,
          actualIncrease: increase,
          allowedIncrease: threshold.executionTime,
        };
      }
    }

    // Check memory usage regression
    if (threshold.memoryUsage) {
      const increase = ((metrics.memoryUsage.heapUsed - baseline.memoryUsage.heapUsed) / baseline.memoryUsage.heapUsed) * 100;
      if (increase > threshold.memoryUsage) {
        return {
          type: 'memory_usage',
          severity: increase > threshold.memoryUsage * 2 ? 'critical' : 'warning',
          message: `Memory usage increased by ${increase.toFixed(2)}%`,
          actualIncrease: increase,
          allowedIncrease: threshold.memoryUsage,
        };
      }
    }

    return null;
  }

  private calculateTrend(measurements: PerformanceMetrics[]): 'improving' | 'degrading' | 'stable' {
    if (measurements.length < 3) return 'stable';

    const recent = measurements.slice(-5); // Last 5 measurements
    const older = measurements.slice(-10, -5); // Previous 5 measurements

    if (older.length === 0) return 'stable';

    const recentAvg = recent.reduce((sum, m) => sum + m.executionTime, 0) / recent.length;
    const olderAvg = older.reduce((sum, m) => sum + m.executionTime, 0) / older.length;

    const change = ((recentAvg - olderAvg) / olderAvg) * 100;

    if (change < -5) return 'improving';
    if (change > 5) return 'degrading';
    return 'stable';
  }
}

/**
 * Decorator for measuring function performance
 */
export function measurePerformance(testName?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const monitor = PerformanceMonitor.getInstance();

    descriptor.value = async function (...args: any[]) {
      const name = testName || `${target.constructor.name}.${propertyName}`;
      const { result } = await monitor.measureFunction(name, () => method.apply(this, args));
      return result;
    };
  };
}

/**
 * Helper function to create performance benchmarks
 */
export function createPerformanceBenchmark(
  name: string,
  baselineMetrics: PerformanceMetrics,
  thresholds: {
    executionTime?: number;
    memoryUsage?: number;
  },
): PerformanceBenchmark {
  return {
    name,
    baseline: baselineMetrics,
    threshold: thresholds,
  };
}
