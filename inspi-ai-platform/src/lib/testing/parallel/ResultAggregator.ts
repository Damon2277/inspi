import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';

export interface TestResult {
  suiteId: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  tests: TestCaseResult[];
  coverage?: Coverage;
  error?: TestError;
  workerId?: number;
}

export interface TestCaseResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
}

export interface Coverage {
  statements: number;
  branches: number;
  functions: number;
  lines: number;
}

export interface TestError {
  message: string;
  stack?: string;
  type: 'timeout' | 'assertion' | 'setup' | 'runtime';
}

export interface AggregatedResult {
  summary: TestSummary;
  results: TestResult[];
  coverage: AggregatedCoverage;
  performance: PerformanceMetrics;
  errors: ErrorSummary;
  timeline: ExecutionTimeline[];
}

export interface TestSummary {
  totalSuites: number;
  passedSuites: number;
  failedSuites: number;
  skippedSuites: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  totalDuration: number;
  successRate: number;
}

export interface AggregatedCoverage {
  overall: Coverage;
  byFile: Map<string, Coverage>;
  byModule: Map<string, Coverage>;
  threshold: CoverageThreshold;
  passed: boolean;
}

export interface CoverageThreshold {
  statements: number;
  branches: number;
  functions: number;
  lines: number;
}

export interface PerformanceMetrics {
  totalExecutionTime: number;
  parallelEfficiency: number;
  workerUtilization: WorkerUtilization[];
  bottlenecks: Bottleneck[];
  averageTaskTime: number;
  slowestTests: TestCaseResult[];
}

export interface WorkerUtilization {
  workerId: number;
  totalTime: number;
  activeTime: number;
  utilization: number;
  tasksCompleted: number;
}

export interface Bottleneck {
  type: 'worker' | 'test' | 'setup';
  description: string;
  impact: number;
  suggestions: string[];
}

export interface ErrorSummary {
  totalErrors: number;
  errorsByType: Map<string, number>;
  errorsByWorker: Map<number, number>;
  flakyTests: string[];
  criticalErrors: TestError[];
}

export interface ExecutionTimeline {
  timestamp: number;
  workerId: number;
  event: 'start' | 'complete' | 'error';
  suiteId: string;
  duration?: number;
}

export interface AggregationOptions {
  coverageThreshold: CoverageThreshold;
  performanceThreshold: number;
  errorThreshold: number;
  outputFormats: ('json' | 'html' | 'xml' | 'markdown')[];
  outputDir: string;
}

/**
 * 结果聚合器
 * 收集和合并并行执行的测试结果
 */
export class ResultAggregator extends EventEmitter {
  private results: Map<string, TestResult> = new Map();
  private timeline: ExecutionTimeline[] = [];
  private workerMetrics: Map<number, WorkerMetrics> = new Map();
  private options: AggregationOptions;
  private startTime: number = 0;

  constructor(options: Partial<AggregationOptions> = {}) {
    super();
    this.options = {
      coverageThreshold: {
        statements: 95,
        branches: 90,
        functions: 95,
        lines: 95,
      },
      performanceThreshold: 60000, // 60秒
      errorThreshold: 0.05, // 5%错误率
      outputFormats: ['json', 'html'],
      outputDir: 'test-results',
      ...options,
    };
  }

  /**
   * 开始聚合过程
   */
  startAggregation(): void {
    this.startTime = Date.now();
    this.results.clear();
    this.timeline = [];
    this.workerMetrics.clear();

    this.emit('aggregation:started');
  }

  /**
   * 添加测试结果
   */
  addResult(result: TestResult): void {
    this.results.set(result.suiteId, result);

    // 记录时间线
    this.timeline.push({
      timestamp: Date.now(),
      workerId: result.workerId || -1,
      event: result.status === 'failed' ? 'error' : 'complete',
      suiteId: result.suiteId,
      duration: result.duration,
    });

    // 更新工作节点指标
    this.updateWorkerMetrics(result);

    this.emit('result:added', { suiteId: result.suiteId, status: result.status });
  }

  /**
   * 记录执行开始
   */
  recordExecutionStart(suiteId: string, workerId: number): void {
    this.timeline.push({
      timestamp: Date.now(),
      workerId,
      event: 'start',
      suiteId,
    });

    // 初始化工作节点指标
    if (!this.workerMetrics.has(workerId)) {
      this.workerMetrics.set(workerId, {
        workerId,
        startTime: Date.now(),
        totalTime: 0,
        activeTime: 0,
        tasksCompleted: 0,
        errors: 0,
        lastActivity: Date.now(),
      });
    }
  }

  /**
   * 更新工作节点指标
   */
  private updateWorkerMetrics(result: TestResult): void {
    const workerId = result.workerId || -1;
    const metrics = this.workerMetrics.get(workerId);

    if (metrics) {
      metrics.tasksCompleted++;
      metrics.activeTime += result.duration;
      metrics.lastActivity = Date.now();

      if (result.status === 'failed') {
        metrics.errors++;
      }
    }
  }

  /**
   * 完成聚合并生成最终结果
   */
  async finalize(): Promise<AggregatedResult> {
    const endTime = Date.now();
    const totalDuration = endTime - this.startTime;

    // 更新工作节点总时间
    this.updateWorkerTotalTime(endTime);

    // 生成聚合结果
    const aggregatedResult: AggregatedResult = {
      summary: this.generateSummary(totalDuration),
      results: Array.from(this.results.values()),
      coverage: this.aggregateCoverage(),
      performance: this.analyzePerformance(totalDuration),
      errors: this.analyzeErrors(),
      timeline: this.timeline,
    };

    // 生成报告
    await this.generateReports(aggregatedResult);

    this.emit('aggregation:completed', aggregatedResult);
    return aggregatedResult;
  }

  /**
   * 更新工作节点总时间
   */
  private updateWorkerTotalTime(endTime: number): void {
    for (const metrics of this.workerMetrics.values()) {
      metrics.totalTime = endTime - metrics.startTime;
    }
  }

  /**
   * 生成测试摘要
   */
  private generateSummary(totalDuration: number): TestSummary {
    const results = Array.from(this.results.values());

    const totalSuites = results.length;
    const passedSuites = results.filter(r => r.status === 'passed').length;
    const failedSuites = results.filter(r => r.status === 'failed').length;
    const skippedSuites = results.filter(r => r.status === 'skipped').length;

    const allTests = results.flatMap(r => r.tests);
    const totalTests = allTests.length;
    const passedTests = allTests.filter(t => t.status === 'passed').length;
    const failedTests = allTests.filter(t => t.status === 'failed').length;
    const skippedTests = allTests.filter(t => t.status === 'skipped').length;

    const successRate = totalTests > 0 ? passedTests / totalTests : 0;

    return {
      totalSuites,
      passedSuites,
      failedSuites,
      skippedSuites,
      totalTests,
      passedTests,
      failedTests,
      skippedTests,
      totalDuration,
      successRate,
    };
  }

  /**
   * 聚合覆盖率数据
   */
  private aggregateCoverage(): AggregatedCoverage {
    const results = Array.from(this.results.values());
    const coverageData = results
      .map(r => r.coverage)
      .filter((c): c is Coverage => c !== undefined);

    if (coverageData.length === 0) {
      return {
        overall: { statements: 0, branches: 0, functions: 0, lines: 0 },
        byFile: new Map(),
        byModule: new Map(),
        threshold: this.options.coverageThreshold,
        passed: false,
      };
    }

    // 计算总体覆盖率（加权平均）
    const overall: Coverage = {
      statements: this.calculateWeightedAverage(coverageData, 'statements'),
      branches: this.calculateWeightedAverage(coverageData, 'branches'),
      functions: this.calculateWeightedAverage(coverageData, 'functions'),
      lines: this.calculateWeightedAverage(coverageData, 'lines'),
    };

    // 检查是否达到阈值
    const threshold = this.options.coverageThreshold;
    const passed =
      overall.statements >= threshold.statements &&
      overall.branches >= threshold.branches &&
      overall.functions >= threshold.functions &&
      overall.lines >= threshold.lines;

    return {
      overall,
      byFile: new Map(), // TODO: 实现文件级覆盖率聚合
      byModule: new Map(), // TODO: 实现模块级覆盖率聚合
      threshold,
      passed,
    };
  }

  /**
   * 计算加权平均覆盖率
   */
  private calculateWeightedAverage(coverageData: Coverage[], metric: keyof Coverage): number {
    const total = coverageData.reduce((sum, coverage) => sum + coverage[metric], 0);
    return total / coverageData.length;
  }

  /**
   * 分析性能指标
   */
  private analyzePerformance(totalDuration: number): PerformanceMetrics {
    const results = Array.from(this.results.values());
    const allTests = results.flatMap(r => r.tests);

    // 计算并行效率
    const sequentialTime = results.reduce((sum, r) => sum + r.duration, 0);
    const parallelEfficiency = sequentialTime > 0 ? sequentialTime / totalDuration : 0;

    // 工作节点利用率
    const workerUtilization: WorkerUtilization[] = Array.from(this.workerMetrics.values())
      .map(metrics => ({
        workerId: metrics.workerId,
        totalTime: metrics.totalTime,
        activeTime: metrics.activeTime,
        utilization: metrics.totalTime > 0 ? metrics.activeTime / metrics.totalTime : 0,
        tasksCompleted: metrics.tasksCompleted,
      }));

    // 识别瓶颈
    const bottlenecks = this.identifyBottlenecks(workerUtilization, results);

    // 最慢的测试
    const slowestTests = allTests
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    const averageTaskTime = results.length > 0 ?
      results.reduce((sum, r) => sum + r.duration, 0) / results.length : 0;

    return {
      totalExecutionTime: totalDuration,
      parallelEfficiency,
      workerUtilization,
      bottlenecks,
      averageTaskTime,
      slowestTests,
    };
  }

  /**
   * 识别性能瓶颈
   */
  private identifyBottlenecks(
    workerUtilization: WorkerUtilization[],
    results: TestResult[],
  ): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];

    // 工作节点利用率不均
    const utilizationVariance = this.calculateVariance(
      workerUtilization.map(w => w.utilization),
    );

    if (utilizationVariance > 0.1) {
      bottlenecks.push({
        type: 'worker',
        description: 'Uneven worker utilization detected',
        impact: utilizationVariance,
        suggestions: [
          'Consider adjusting load balancing strategy',
          'Review task distribution algorithm',
          'Check for worker performance differences',
        ],
      });
    }

    // 长时间运行的测试
    const longRunningTests = results.filter(r => r.duration > this.options.performanceThreshold);
    if (longRunningTests.length > 0) {
      bottlenecks.push({
        type: 'test',
        description: `${longRunningTests.length} tests exceeded performance threshold`,
        impact: longRunningTests.length / results.length,
        suggestions: [
          'Optimize slow test cases',
          'Consider breaking down complex tests',
          'Review test setup and teardown procedures',
        ],
      });
    }

    return bottlenecks;
  }

  /**
   * 计算方差
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;

    return variance;
  }

  /**
   * 分析错误
   */
  private analyzeErrors(): ErrorSummary {
    const results = Array.from(this.results.values());
    const allTests = results.flatMap(r => r.tests);

    const failedTests = allTests.filter(t => t.status === 'failed');
    const totalErrors = failedTests.length;

    // 按错误类型分组
    const errorsByType = new Map<string, number>();
    const errorsByWorker = new Map<number, number>();
    const criticalErrors: TestError[] = [];

    results.forEach(result => {
      if (result.error) {
        const errorType = result.error.type;
        errorsByType.set(errorType, (errorsByType.get(errorType) || 0) + 1);

        if (result.workerId !== undefined) {
          errorsByWorker.set(result.workerId, (errorsByWorker.get(result.workerId) || 0) + 1);
        }

        // 识别关键错误
        if (errorType === 'timeout' || errorType === 'setup') {
          criticalErrors.push(result.error);
        }
      }
    });

    // 识别不稳定的测试（简化版本）
    const flakyTests = this.identifyFlakyTests(results);

    return {
      totalErrors,
      errorsByType,
      errorsByWorker,
      flakyTests,
      criticalErrors,
    };
  }

  /**
   * 识别不稳定的测试
   */
  private identifyFlakyTests(results: TestResult[]): string[] {
    // 简化实现：基于错误模式识别
    const testFailures = new Map<string, number>();

    results.forEach(result => {
      result.tests.forEach(test => {
        if (test.status === 'failed' && test.error) {
          const key = test.name;
          testFailures.set(key, (testFailures.get(key) || 0) + 1);
        }
      });
    });

    // 如果测试在不同运行中有不同结果，可能是不稳定的
    return Array.from(testFailures.entries())
      .filter(([_, count]) => count > 1)
      .map(([testName]) => testName);
  }

  /**
   * 生成报告
   */
  private async generateReports(result: AggregatedResult): Promise<void> {
    const outputDir = this.options.outputDir;

    // 确保输出目录存在
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    for (const format of this.options.outputFormats) {
      try {
        await this.generateReport(result, format, outputDir);
      } catch (error) {
        this.emit('report:error', { format, error });
      }
    }
  }

  /**
   * 生成特定格式的报告
   */
  private async generateReport(
    result: AggregatedResult,
    format: string,
    outputDir: string,
  ): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const extension = format === 'markdown' ? 'md' : format;
    const filename = `test-results-${timestamp}.${extension}`;
    const filepath = path.join(outputDir, filename);

    switch (format) {
      case 'json':
        fs.writeFileSync(filepath, JSON.stringify(result, null, 2));
        break;

      case 'html':
        const htmlContent = this.generateHtmlReport(result);
        fs.writeFileSync(filepath, htmlContent);
        break;

      case 'xml':
        const xmlContent = this.generateXmlReport(result);
        fs.writeFileSync(filepath, xmlContent);
        break;

      case 'markdown':
        const markdownContent = this.generateMarkdownReport(result);
        fs.writeFileSync(filepath, markdownContent);
        break;
    }

    this.emit('report:generated', { format, filepath });
  }

  /**
   * 生成HTML报告
   */
  private generateHtmlReport(result: AggregatedResult): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Test Results Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; }
        .passed { color: green; }
        .failed { color: red; }
        .coverage { margin: 20px 0; }
        .progress { width: 100%; height: 20px; background: #ddd; border-radius: 10px; }
        .progress-bar { height: 100%; border-radius: 10px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>Test Results Report</h1>
    
    <div class="summary">
        <h2>Summary</h2>
        <p>Total Suites: ${result.summary.totalSuites}</p>
        <p>Passed: <span class="passed">${result.summary.passedSuites}</span></p>
        <p>Failed: <span class="failed">${result.summary.failedSuites}</span></p>
        <p>Success Rate: ${(result.summary.successRate * 100).toFixed(2)}%</p>
        <p>Total Duration: ${result.summary.totalDuration}ms</p>
    </div>

    <div class="coverage">
        <h2>Coverage</h2>
        <p>Statements: ${result.coverage.overall.statements.toFixed(2)}%</p>
        <div class="progress">
            <div class="progress-bar" style="width: ${result.coverage.overall.statements}%; background: green;"></div>
        </div>
        <p>Branches: ${result.coverage.overall.branches.toFixed(2)}%</p>
        <div class="progress">
            <div class="progress-bar" style="width: ${result.coverage.overall.branches}%; background: blue;"></div>
        </div>
    </div>

    <h2>Performance</h2>
    <p>Parallel Efficiency: ${(result.performance.parallelEfficiency * 100).toFixed(2)}%</p>
    <p>Average Task Time: ${result.performance.averageTaskTime.toFixed(2)}ms</p>

    ${result.performance.bottlenecks.length > 0 ? `
    <h3>Bottlenecks</h3>
    <ul>
        ${result.performance.bottlenecks.map(b => `<li>${b.description}</li>`).join('')}
    </ul>
    ` : ''}

    <h2>Test Results</h2>
    <table>
        <tr>
            <th>Suite</th>
            <th>Status</th>
            <th>Duration</th>
            <th>Tests</th>
            <th>Worker</th>
        </tr>
        ${result.results.map(r => `
        <tr>
            <td>${r.suiteId}</td>
            <td class="${r.status}">${r.status}</td>
            <td>${r.duration}ms</td>
            <td>${r.tests.length}</td>
            <td>${r.workerId || 'N/A'}</td>
        </tr>
        `).join('')}
    </table>
</body>
</html>
    `;
  }

  /**
   * 生成XML报告（JUnit格式）
   */
  private generateXmlReport(result: AggregatedResult): string {
    const testsuites = result.results.map(suite => {
      const tests = suite.tests.map(test => {
        const failure = test.status === 'failed' ?
          `<failure message="${test.error || 'Test failed'}">${test.error || ''}</failure>` : '';

        return `
        <testcase name="${test.name}" time="${test.duration / 1000}" classname="${suite.suiteId}">
            ${failure}
        </testcase>`;
      }).join('');

      return `
      <testsuite name="${suite.suiteId}" tests="${suite.tests.length}" 
                 failures="${suite.tests.filter(t => t.status === 'failed').length}"
                 time="${suite.duration / 1000}">
          ${tests}
      </testsuite>`;
    }).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<testsuites tests="${result.summary.totalTests}" 
            failures="${result.summary.failedTests}"
            time="${result.summary.totalDuration / 1000}">
    ${testsuites}
</testsuites>`;
  }

  /**
   * 生成Markdown报告
   */
  private generateMarkdownReport(result: AggregatedResult): string {
    return `
# Test Results Report

## Summary

- **Total Suites**: ${result.summary.totalSuites}
- **Passed**: ${result.summary.passedSuites}
- **Failed**: ${result.summary.failedSuites}
- **Success Rate**: ${(result.summary.successRate * 100).toFixed(2)}%
- **Total Duration**: ${result.summary.totalDuration}ms

## Coverage

- **Statements**: ${result.coverage.overall.statements.toFixed(2)}%
- **Branches**: ${result.coverage.overall.branches.toFixed(2)}%
- **Functions**: ${result.coverage.overall.functions.toFixed(2)}%
- **Lines**: ${result.coverage.overall.lines.toFixed(2)}%

## Performance

- **Parallel Efficiency**: ${(result.performance.parallelEfficiency * 100).toFixed(2)}%
- **Average Task Time**: ${result.performance.averageTaskTime.toFixed(2)}ms

${result.performance.bottlenecks.length > 0 ? `
### Bottlenecks

${result.performance.bottlenecks.map(b => `- ${b.description}`).join('\n')}
` : ''}

## Test Results

| Suite | Status | Duration | Tests | Worker |
|-------|--------|----------|-------|--------|
${result.results.map(r =>
  `| ${r.suiteId} | ${r.status} | ${r.duration}ms | ${r.tests.length} | ${r.workerId || 'N/A'} |`,
).join('\n')}
    `;
  }
}

interface WorkerMetrics {
  workerId: number;
  startTime: number;
  totalTime: number;
  activeTime: number;
  tasksCompleted: number;
  errors: number;
  lastActivity: number;
}
