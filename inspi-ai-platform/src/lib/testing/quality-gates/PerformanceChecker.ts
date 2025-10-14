/**
 * Performance Checker
 *
 * Implements performance baseline regression detection with detailed
 * analysis of execution time, memory usage, and test performance metrics.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface PerformanceMetrics {
  executionTime: number;
  memoryUsage: number;
  testCount: number;
  averageTestTime: number;
  slowestTests: Array<{
    name: string;
    duration: number;
    file: string;
  }>;
  memoryLeaks: Array<{
    test: string;
    memoryIncrease: number;
  }>;
}

export interface PerformanceBaseline {
  timestamp: Date;
  metrics: PerformanceMetrics;
  environment: {
    nodeVersion: string;
    platform: string;
    cpuCores: number;
    totalMemory: number;
  };
}

export interface PerformanceCheckResult {
  passed: boolean;
  current: {
    executionTime: number;
    memoryUsage: number;
    testCount: number;
  };
  baseline?: {
    executionTime: number;
    memoryUsage: number;
    testCount: number;
  };
  regressions: {
    executionTime: number;
    memoryUsage: number;
  };
  violations: string[];
  recommendations: string[];
  details: {
    slowestTests: Array<{
      name: string;
      duration: number;
      file: string;
      regression?: number;
    }>;
    memoryHotspots: Array<{
      test: string;
      memoryUsage: number;
      increase?: number;
    }>;
  };
}

export interface PerformanceConfig {
  enabled: boolean;
  baselineFile?: string;
  thresholds: {
    maxRegressionPercent: number;
    maxExecutionTime: number;
    maxMemoryUsage: number;
  };
  failOnRegression: boolean;
  trackSlowTests: boolean;
  slowTestThreshold: number;
}

export class PerformanceChecker {
  private config: PerformanceConfig;
  private baselineFile: string;

  constructor(config: PerformanceConfig) {
    this.config = {
      trackSlowTests: true,
      slowTestThreshold: 1000, // 1 second
      ...config,
    };
    this.baselineFile = config.baselineFile || 'performance-baseline.json';
  }

  /**
   * Check performance against baseline
   */
  async check(testResults?: any): Promise<PerformanceCheckResult> {
    try {
      const currentMetrics = await this.collectCurrentMetrics(testResults);
      const baseline = await this.loadBaseline();

      const current = {
        executionTime: currentMetrics.executionTime,
        memoryUsage: currentMetrics.memoryUsage,
        testCount: currentMetrics.testCount,
      };

      let regressions = { executionTime: 0, memoryUsage: 0 };
      let baselineData;

      if (baseline) {
        baselineData = {
          executionTime: baseline.metrics.executionTime,
          memoryUsage: baseline.metrics.memoryUsage,
          testCount: baseline.metrics.testCount,
        };

        regressions = this.calculateRegressions(currentMetrics, baseline.metrics);
      }

      const violations = this.checkThresholds(current, regressions);
      const recommendations = this.generateRecommendations(currentMetrics, baseline?.metrics);
      const details = this.analyzeDetails(currentMetrics, baseline?.metrics);

      const passed = violations.length === 0;

      // Update baseline if this is a good run
      if (passed && (!baseline || this.shouldUpdateBaseline(currentMetrics, baseline.metrics))) {
        await this.updateBaseline(currentMetrics);
      }

      return {
        passed,
        current,
        baseline: baselineData,
        regressions,
        violations,
        recommendations,
        details,
      };
    } catch (error) {
      return {
        passed: false,
        current: { executionTime: 0, memoryUsage: 0, testCount: 0 },
        regressions: { executionTime: 0, memoryUsage: 0 },
        violations: [`Performance check failed: ${(error as Error).message}`],
        recommendations: ['Ensure test results are available for performance analysis'],
        details: { slowestTests: [], memoryHotspots: [] },
      };
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: PerformanceConfig): void {
    this.config = { ...this.config, ...config };
    this.baselineFile = config.baselineFile || this.baselineFile;
  }

  /**
   * Generate performance report
   */
  generateReport(result: PerformanceCheckResult): string {
    const lines: string[] = [
      '# Performance Report',
      `Generated: ${new Date().toISOString()}`,
      `Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`,
      '',
      '## Current Performance',
      `- Execution Time: ${result.current.executionTime.toFixed(0)}ms`,
      `- Memory Usage: ${(result.current.memoryUsage / 1024 / 1024).toFixed(1)}MB`,
      `- Test Count: ${result.current.testCount}`,
      '',
    ];

    // Baseline comparison
    if (result.baseline) {
      lines.push('## Baseline Comparison');
      lines.push(`- Execution Time: ${result.regressions.executionTime > 0 ? '+' : ''}${result.regressions.executionTime.toFixed(1)}%`);
      lines.push(`- Memory Usage: ${result.regressions.memoryUsage > 0 ? '+' : ''}${result.regressions.memoryUsage.toFixed(1)}%`);
      lines.push('');
    }

    // Violations
    if (result.violations.length > 0) {
      lines.push('## Performance Violations');
      result.violations.forEach(violation => lines.push(`- ❌ ${violation}`));
      lines.push('');
    }

    // Slowest tests
    if (result.details.slowestTests.length > 0) {
      lines.push('## Slowest Tests');
      result.details.slowestTests.slice(0, 10).forEach(test => {
        const regressionText = test.regression ? ` (${test.regression > 0 ? '+' : ''}${test.regression.toFixed(1)}%)` : '';
        lines.push(`- ${test.name}: ${test.duration.toFixed(0)}ms${regressionText}`);
        lines.push(`  File: ${test.file}`);
      });
      lines.push('');
    }

    // Memory hotspots
    if (result.details.memoryHotspots.length > 0) {
      lines.push('## Memory Hotspots');
      result.details.memoryHotspots.slice(0, 10).forEach(hotspot => {
        const increaseText = hotspot.increase ? ` (+${(hotspot.increase / 1024 / 1024).toFixed(1)}MB)` : '';
        lines.push(`- ${hotspot.test}: ${(hotspot.memoryUsage / 1024 / 1024).toFixed(1)}MB${increaseText}`);
      });
      lines.push('');
    }

    // Recommendations
    if (result.recommendations.length > 0) {
      lines.push('## Recommendations');
      result.recommendations.forEach(rec => lines.push(`- ${rec}`));
    }

    return lines.join('\n');
  }

  /**
   * Get performance trends
   */
  async getPerformanceTrends(): Promise<{
    trend: 'improving' | 'degrading' | 'stable';
    history: Array<{
      timestamp: Date;
      executionTime: number;
      memoryUsage: number;
      testCount: number;
    }>;
  }> {
    try {
      const historyFile = this.baselineFile.replace('.json', '-history.json');

      if (!fs.existsSync(historyFile)) {
        return { trend: 'stable', history: [] };
      }

      const historyData = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
      const history = historyData.map((entry: any) => ({
        timestamp: new Date(entry.timestamp),
        executionTime: entry.metrics.executionTime,
        memoryUsage: entry.metrics.memoryUsage,
        testCount: entry.metrics.testCount,
      }));

      // Calculate trend based on recent entries
      if (history.length < 5) {
        return { trend: 'stable', history };
      }

      const recent = history.slice(-5);
      const older = history.slice(-10, -5);

      const recentAvgTime = recent.reduce((sum, h) => sum + h.executionTime, 0) / recent.length;
      const olderAvgTime = older.reduce((sum, h) => sum + h.executionTime, 0) / older.length;

      const timeChange = ((recentAvgTime - olderAvgTime) / olderAvgTime) * 100;

      let trend: 'improving' | 'degrading' | 'stable' = 'stable';
      if (timeChange > 10) trend = 'degrading';
      else if (timeChange < -10) trend = 'improving';

      return { trend, history };
    } catch {
      return { trend: 'stable', history: [] };
    }
  }

  private async collectCurrentMetrics(testResults?: any): Promise<PerformanceMetrics> {
    const startTime = Date.now();
    const startMemory = process.memoryUsage();

    // If test results are provided, extract metrics from them
    if (testResults) {
      return this.extractMetricsFromResults(testResults);
    }

    // Otherwise, collect basic metrics
    const executionTime = Date.now() - startTime;
    const currentMemory = process.memoryUsage();
    const memoryUsage = currentMemory.heapUsed;

    return {
      executionTime,
      memoryUsage,
      testCount: 0,
      averageTestTime: 0,
      slowestTests: [],
      memoryLeaks: [],
    };
  }

  private extractMetricsFromResults(testResults: any): PerformanceMetrics {
    const executionTime = testResults.runTime || 0;
    const memoryUsage = process.memoryUsage().heapUsed;
    const testCount = testResults.numTotalTests || 0;
    const averageTestTime = testCount > 0 ? executionTime / testCount : 0;

    // Extract slowest tests
    const slowestTests = (testResults.testResults || [])
      .flatMap((suite: any) =>
        (suite.assertionResults || []).map((test: any) => ({
          name: test.title,
          duration: test.duration || 0,
          file: suite.testFilePath || 'unknown',
        })),
      )
      .filter((test: any) => test.duration > this.config.slowTestThreshold)
      .sort((a: any, b: any) => b.duration - a.duration)
      .slice(0, 20);

    return {
      executionTime,
      memoryUsage,
      testCount,
      averageTestTime,
      slowestTests,
      memoryLeaks: [], // Would need more sophisticated tracking
    };
  }

  private async loadBaseline(): Promise<PerformanceBaseline | null> {
    try {
      if (!fs.existsSync(this.baselineFile)) {
        return null;
      }

      const baselineData = JSON.parse(fs.readFileSync(this.baselineFile, 'utf8'));
      return {
        ...baselineData,
        timestamp: new Date(baselineData.timestamp),
      };
    } catch {
      return null;
    }
  }

  private async updateBaseline(metrics: PerformanceMetrics): Promise<void> {
    try {
      const baseline: PerformanceBaseline = {
        timestamp: new Date(),
        metrics,
        environment: {
          nodeVersion: process.version,
          platform: process.platform,
          cpuCores: require('os').cpus().length,
          totalMemory: require('os').totalmem(),
        },
      };

      fs.writeFileSync(this.baselineFile, JSON.stringify(baseline, null, 2));

      // Also update history
      await this.updateHistory(baseline);
    } catch (error) {
      console.warn('Failed to update performance baseline:', error);
    }
  }

  private async updateHistory(baseline: PerformanceBaseline): Promise<void> {
    try {
      const historyFile = this.baselineFile.replace('.json', '-history.json');
      let history: PerformanceBaseline[] = [];

      if (fs.existsSync(historyFile)) {
        history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
      }

      history.push(baseline);

      // Keep only last 100 entries
      if (history.length > 100) {
        history = history.slice(-100);
      }

      fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
    } catch (error) {
      console.warn('Failed to update performance history:', error);
    }
  }

  private calculateRegressions(current: PerformanceMetrics, baseline: PerformanceMetrics): {
    executionTime: number;
    memoryUsage: number;
  } {
    const executionTime = baseline.executionTime > 0
      ? ((current.executionTime - baseline.executionTime) / baseline.executionTime) * 100
      : 0;

    const memoryUsage = baseline.memoryUsage > 0
      ? ((current.memoryUsage - baseline.memoryUsage) / baseline.memoryUsage) * 100
      : 0;

    return { executionTime, memoryUsage };
  }

  private checkThresholds(
    current: PerformanceCheckResult['current'],
    regressions: { executionTime: number; memoryUsage: number },
  ): string[] {
    const violations: string[] = [];

    // Check absolute thresholds
    if (current.executionTime > this.config.thresholds.maxExecutionTime) {
      violations.push(
        `Execution time ${current.executionTime}ms exceeds maximum ${this.config.thresholds.maxExecutionTime}ms`,
      );
    }

    if (current.memoryUsage > this.config.thresholds.maxMemoryUsage) {
      violations.push(
        `Memory usage ${(current.memoryUsage / 1024 / 1024).toFixed(1)}MB exceeds maximum ${(this.config.thresholds.maxMemoryUsage / 1024 / 1024).toFixed(1)}MB`,
      );
    }

    // Check regression thresholds
    if (Math.abs(regressions.executionTime) > this.config.thresholds.maxRegressionPercent) {
      const direction = regressions.executionTime > 0 ? 'increased' : 'decreased';
      violations.push(
        `Execution time ${direction} by ${Math.abs(regressions.executionTime).toFixed(1)}%, exceeding threshold ${this.config.thresholds.maxRegressionPercent}%`,
      );
    }

    if (Math.abs(regressions.memoryUsage) > this.config.thresholds.maxRegressionPercent) {
      const direction = regressions.memoryUsage > 0 ? 'increased' : 'decreased';
      violations.push(
        `Memory usage ${direction} by ${Math.abs(regressions.memoryUsage).toFixed(1)}%, exceeding threshold ${this.config.thresholds.maxRegressionPercent}%`,
      );
    }

    return violations;
  }

  private generateRecommendations(current: PerformanceMetrics, baseline?: PerformanceMetrics): string[] {
    const recommendations: string[] = [];

    // Slow tests recommendations
    if (current.slowestTests.length > 0) {
      recommendations.push(`Optimize ${current.slowestTests.length} slow tests (>${this.config.slowTestThreshold}ms)`);

      if (current.slowestTests.length > 10) {
        recommendations.push('Consider parallel test execution to reduce overall runtime');
      }
    }

    // Memory recommendations
    if (current.memoryUsage > 256 * 1024 * 1024) { // 256MB
      recommendations.push('High memory usage detected - check for memory leaks in tests');
    }

    // Baseline comparison recommendations
    if (baseline) {
      const timeRegression = ((current.executionTime - baseline.executionTime) / baseline.executionTime) * 100;

      if (timeRegression > 20) {
        recommendations.push('Significant performance regression detected - review recent changes');
      }

      if (current.testCount > baseline.testCount * 1.5) {
        recommendations.push('Test count has increased significantly - consider test optimization');
      }
    }

    // General recommendations
    if (current.averageTestTime > 100) {
      recommendations.push('Average test time is high - consider test optimization strategies');
    }

    return recommendations;
  }

  private analyzeDetails(current: PerformanceMetrics, baseline?: PerformanceMetrics): PerformanceCheckResult['details'] {
    const slowestTests = current.slowestTests.map(test => {
      let regression;

      if (baseline) {
        const baselineTest = baseline(slowestTests.find as any)(bt => bt.name === test.name);
        if (baselineTest) {
          regression = ((test.duration - baselineTest.duration) / baselineTest.duration) * 100;
        }
      }

      return { ...test, regression };
    });

    const memoryHotspots = current.memoryLeaks.map(leak => ({
      test: leak.test,
      memoryUsage: current.memoryUsage, // Simplified
      increase: leak.memoryIncrease,
    }));

    return { slowestTests, memoryHotspots };
  }

  private shouldUpdateBaseline(current: PerformanceMetrics, baseline: PerformanceMetrics): boolean {
    // Update baseline if current performance is significantly better
    const timeImprovement = ((baseline.executionTime - current.executionTime) / baseline.executionTime) * 100;
    const memoryImprovement = ((baseline.memoryUsage - current.memoryUsage) / baseline.memoryUsage) * 100;

    return timeImprovement > 10 || memoryImprovement > 10;
  }
}
