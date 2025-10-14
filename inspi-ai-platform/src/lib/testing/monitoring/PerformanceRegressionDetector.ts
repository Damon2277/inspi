import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';

export interface PerformanceBaseline {
  testId: string;
  testName: string;
  averageDuration: number;
  averageMemoryUsage: number;
  standardDeviation: number;
  sampleCount: number;
  lastUpdated: Date;
  confidence: number; // 0-1
}

export interface PerformanceRegression {
  testId: string;
  testName: string;
  type: 'duration' | 'memory' | 'both';
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  currentValue: number;
  baselineValue: number;
  regressionPercent: number;
  confidence: number;
  timestamp: Date;
  details: RegressionDetails;
}

export interface RegressionDetails {
  historicalData: PerformanceDataPoint[];
  trendAnalysis: TrendAnalysis;
  possibleCauses: string[];
  recommendations: string[];
}

export interface PerformanceDataPoint {
  timestamp: Date;
  duration: number;
  memoryUsage: number;
  testId: string;
}

export interface TrendAnalysis {
  trend: 'improving' | 'stable' | 'degrading';
  slope: number;
  correlation: number;
  volatility: number;
}

export interface DetectorOptions {
  baselineFile: string;
  minSampleSize: number;
  regressionThreshold: number; // percentage
  confidenceThreshold: number;
  maxHistorySize: number;
  enableTrendAnalysis: boolean;
  autoUpdateBaseline: boolean;
}

/**
 * 性能回归检测器
 * 自动检测测试性能回归并提供分析
 */
export class PerformanceRegressionDetector extends EventEmitter {
  private options: DetectorOptions;
  private baselines: Map<string, PerformanceBaseline> = new Map();
  private performanceHistory: Map<string, PerformanceDataPoint[]> = new Map();
  private regressions: PerformanceRegression[] = [];

  constructor(options: Partial<DetectorOptions> = {}) {
    super();
    this.options = {
      baselineFile: path.join(process.cwd(), '.test-performance', 'baselines.json'),
      minSampleSize: 10,
      regressionThreshold: 20, // 20% regression threshold
      confidenceThreshold: 0.8,
      maxHistorySize: 1000,
      enableTrendAnalysis: true,
      autoUpdateBaseline: true,
      ...options,
    };

    this.loadBaselines();
  }

  /**
   * 记录测试性能数据
   */
  recordPerformance(testId: string, testName: string, duration: number, memoryUsage: number): void {
    const dataPoint: PerformanceDataPoint = {
      timestamp: new Date(),
      duration,
      memoryUsage,
      testId,
    };

    // 添加到历史记录
    if (!this.performanceHistory.has(testId)) {
      this.performanceHistory.set(testId, []);
    }

    const history = this.performanceHistory.get(testId)!;
    history.push(dataPoint);

    // 保持历史记录在限制内
    if (history.length > this.options.maxHistorySize) {
      history.splice(0, history.length - this.options.maxHistorySize);
    }

    // 检查回归
    this.checkForRegression(testId, testName, dataPoint);

    // 更新基线（如果启用）
    if (this.options.autoUpdateBaseline) {
      this.updateBaseline(testId, testName);
    }

    this.emit('performance:recorded', { testId, testName, dataPoint });
  }

  /**
   * 检查性能回归
   */
  private checkForRegression(testId: string, testName: string, dataPoint: PerformanceDataPoint): void {
    const baseline = this.baselines.get(testId);
    if (!baseline || baseline.confidence < this.options.confidenceThreshold) {
      return;
    }

    const durationRegression = this.calculateRegression(dataPoint.duration, baseline.averageDuration);
    const memoryRegression = this.calculateRegression(dataPoint.memoryUsage, baseline.averageMemoryUsage);

    let regressionType: PerformanceRegression['type'] | null = null;
    let regressionPercent = 0;
    let currentValue = 0;
    let baselineValue = 0;

    // 检查持续时间回归
    if (Math.abs(durationRegression) > this.options.regressionThreshold) {
      if (memoryRegression > this.options.regressionThreshold) {
        regressionType = 'both';
        regressionPercent = Math.max(durationRegression, memoryRegression);
        currentValue = dataPoint.duration;
        baselineValue = baseline.averageDuration;
      } else {
        regressionType = 'duration';
        regressionPercent = durationRegression;
        currentValue = dataPoint.duration;
        baselineValue = baseline.averageDuration;
      }
    } else if (memoryRegression > this.options.regressionThreshold) {
      regressionType = 'memory';
      regressionPercent = memoryRegression;
      currentValue = dataPoint.memoryUsage;
      baselineValue = baseline.averageMemoryUsage;
    }

    if (regressionType) {
      const regression = this.createRegressionReport(
        testId,
        testName,
        regressionType,
        regressionPercent,
        currentValue,
        baselineValue,
        baseline.confidence,
      );

      this.regressions.push(regression);
      this.emit('regression:detected', regression);
    }
  }

  /**
   * 计算回归百分比
   */
  private calculateRegression(currentValue: number, baselineValue: number): number {
    if (baselineValue === 0) return 0;
    return ((currentValue - baselineValue) / baselineValue) * 100;
  }

  /**
   * 创建回归报告
   */
  private createRegressionReport(
    testId: string,
    testName: string,
    type: PerformanceRegression['type'],
    regressionPercent: number,
    currentValue: number,
    baselineValue: number,
    confidence: number,
  ): PerformanceRegression {
    const severity = this.calculateSeverity(regressionPercent);
    const historicalData = this.performanceHistory.get(testId) || [];
    const trendAnalysis = this.options.enableTrendAnalysis
      ? this.analyzeTrend(historicalData)
      : { trend: 'stable' as const, slope: 0, correlation: 0, volatility: 0 };

    const possibleCauses = this.identifyPossibleCauses(type, regressionPercent, trendAnalysis);
    const recommendations = this.generateRecommendations(type, severity, trendAnalysis);

    return {
      testId,
      testName,
      type,
      severity,
      currentValue,
      baselineValue,
      regressionPercent,
      confidence,
      timestamp: new Date(),
      details: {
        historicalData: historicalData.slice(-50), // 最近50个数据点
        trendAnalysis,
        possibleCauses,
        recommendations,
      },
    };
  }

  /**
   * 计算回归严重程度
   */
  private calculateSeverity(regressionPercent: number): PerformanceRegression['severity'] {
    const absRegression = Math.abs(regressionPercent);

    if (absRegression >= 100) return 'critical';
    if (absRegression >= 50) return 'major';
    if (absRegression >= 30) return 'moderate';
    return 'minor';
  }

  /**
   * 分析性能趋势
   */
  private analyzeTrend(data: PerformanceDataPoint[]): TrendAnalysis {
    if (data.length < 5) {
      return { trend: 'stable', slope: 0, correlation: 0, volatility: 0 };
    }

    // 使用最近的数据点进行趋势分析
    const recentData = data.slice(-20);
    const n = recentData.length;

    // 计算线性回归斜率
    const xValues = recentData.map((_, i) => i);
    const yValues = recentData.map(d => d.duration);

    const slope = this.calculateLinearRegressionSlope(xValues, yValues);
    const correlation = this.calculateCorrelation(xValues, yValues);

    // 计算波动性（标准差）
    const mean = yValues.reduce((sum, val) => sum + val, 0) / n;
    const variance = yValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    const volatility = Math.sqrt(variance) / mean; // 变异系数

    // 确定趋势
    let trend: TrendAnalysis['trend'] = 'stable';
    if (Math.abs(slope) > mean * 0.01) { // 斜率超过均值的1%
      trend = slope > 0 ? 'degrading' : 'improving';
    }

    return { trend, slope, correlation, volatility };
  }

  /**
   * 计算线性回归斜率
   */
  private calculateLinearRegressionSlope(x: number[], y: number[]): number {
    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);

    const denominator = n * sumXX - sumX * sumX;
    if (denominator === 0) return 0;

    return (n * sumXY - sumX * sumY) / denominator;
  }

  /**
   * 计算相关系数
   */
  private calculateCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    const sumYY = y.reduce((sum, val) => sum + val * val, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));

    if (denominator === 0) return 0;
    return numerator / denominator;
  }

  /**
   * 识别可能的原因
   */
  private identifyPossibleCauses(
    type: PerformanceRegression['type'],
    regressionPercent: number,
    trendAnalysis: TrendAnalysis,
  ): string[] {
    const causes: string[] = [];

    // 基于回归类型的原因
    if (type === 'duration' || type === 'both') {
      causes.push('Algorithm complexity increase');
      causes.push('Inefficient database queries');
      causes.push('Network latency issues');
      causes.push('Resource contention');
    }

    if (type === 'memory' || type === 'both') {
      causes.push('Memory leaks');
      causes.push('Inefficient data structures');
      causes.push('Large object allocations');
      causes.push('Garbage collection pressure');
    }

    // 基于趋势的原因
    if (trendAnalysis.trend === 'degrading') {
      causes.push('Gradual performance degradation');
      causes.push('Accumulating technical debt');
    }

    if (trendAnalysis.volatility > 0.3) {
      causes.push('Inconsistent test environment');
      causes.push('External dependencies variability');
    }

    // 基于严重程度的原因
    if (regressionPercent > 50) {
      causes.push('Major code changes');
      causes.push('Configuration changes');
      causes.push('Infrastructure changes');
    }

    return causes;
  }

  /**
   * 生成建议
   */
  private generateRecommendations(
    type: PerformanceRegression['type'],
    severity: PerformanceRegression['severity'],
    trendAnalysis: TrendAnalysis,
  ): string[] {
    const recommendations: string[] = [];

    // 基于严重程度的建议
    if (severity === 'critical') {
      recommendations.push('Immediate investigation required');
      recommendations.push('Consider rolling back recent changes');
    } else if (severity === 'major') {
      recommendations.push('High priority investigation needed');
      recommendations.push('Review recent code changes');
    }

    // 基于回归类型的建议
    if (type === 'duration' || type === 'both') {
      recommendations.push('Profile code execution to identify bottlenecks');
      recommendations.push('Review algorithm complexity');
      recommendations.push('Check for inefficient database queries');
    }

    if (type === 'memory' || type === 'both') {
      recommendations.push('Analyze memory usage patterns');
      recommendations.push('Check for memory leaks');
      recommendations.push('Review object lifecycle management');
    }

    // 基于趋势的建议
    if (trendAnalysis.trend === 'degrading') {
      recommendations.push('Establish performance monitoring alerts');
      recommendations.push('Implement regular performance reviews');
    }

    if (trendAnalysis.volatility > 0.3) {
      recommendations.push('Stabilize test environment');
      recommendations.push('Mock external dependencies');
    }

    return recommendations;
  }

  /**
   * 更新性能基线
   */
  private updateBaseline(testId: string, testName: string): void {
    const history = this.performanceHistory.get(testId);
    if (!history || history.length < this.options.minSampleSize) {
      return;
    }

    const recentData = history.slice(-this.options.minSampleSize);
    const durations = recentData.map(d => d.duration);
    const memoryUsages = recentData.map(d => d.memoryUsage);

    const averageDuration = durations.reduce((sum, val) => sum + val, 0) / durations.length;
    const averageMemoryUsage = memoryUsages.reduce((sum, val) => sum + val, 0) / memoryUsages.length;

    // 计算标准差
    const durationVariance = durations.reduce((sum, val) => sum + Math.pow(val - averageDuration, 2), 0) / durations.length;
    const standardDeviation = Math.sqrt(durationVariance);

    // 计算置信度（基于样本数量和变异系数）
    const coefficientOfVariation = standardDeviation / averageDuration;
    const confidence = Math.min(0.95, Math.max(0.5, 1 - coefficientOfVariation));

    const baseline: PerformanceBaseline = {
      testId,
      testName,
      averageDuration,
      averageMemoryUsage,
      standardDeviation,
      sampleCount: recentData.length,
      lastUpdated: new Date(),
      confidence,
    };

    this.baselines.set(testId, baseline);
    this.emit('baseline:updated', baseline);
  }

  /**
   * 手动设置基线
   */
  setBaseline(testId: string, testName: string, averageDuration: number, averageMemoryUsage: number): void {
    const baseline: PerformanceBaseline = {
      testId,
      testName,
      averageDuration,
      averageMemoryUsage,
      standardDeviation: 0,
      sampleCount: 1,
      lastUpdated: new Date(),
      confidence: 1.0,
    };

    this.baselines.set(testId, baseline);
    this.saveBaselines();
    this.emit('baseline:set', baseline);
  }

  /**
   * 获取基线
   */
  getBaseline(testId: string): PerformanceBaseline | null {
    return this.baselines.get(testId) || null;
  }

  /**
   * 获取所有基线
   */
  getAllBaselines(): PerformanceBaseline[] {
    return Array.from(this.baselines.values());
  }

  /**
   * 获取回归报告
   */
  getRegressions(timeWindow?: number): PerformanceRegression[] {
    if (!timeWindow) {
      return [...this.regressions];
    }

    const cutoffTime = new Date(Date.now() - timeWindow);
    return this.regressions.filter(r => r.timestamp > cutoffTime);
  }

  /**
   * 获取性能历史
   */
  getPerformanceHistory(testId: string): PerformanceDataPoint[] {
    return this.performanceHistory.get(testId) || [];
  }

  /**
   * 加载基线数据
   */
  private loadBaselines(): void {
    try {
      if (fs.existsSync(this.options.baselineFile)) {
        const data = fs.readFileSync(this.options.baselineFile, 'utf8');
        const baselines = JSON.parse(data);

        for (const baseline of baselines) {
          baseline.lastUpdated = new Date(baseline.lastUpdated);
          this.baselines.set(baseline.testId, baseline);
        }
      }
    } catch (error) {
      console.warn('Failed to load performance baselines:', error.message);
    }
  }

  /**
   * 保存基线数据
   */
  private saveBaselines(): void {
    try {
      const dir = path.dirname(this.options.baselineFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const baselines = Array.from(this.baselines.values());
      fs.writeFileSync(this.options.baselineFile, JSON.stringify(baselines, null, 2));
    } catch (error) {
      console.warn('Failed to save performance baselines:', error.message);
    }
  }

  /**
   * 重置检测器
   */
  reset(): void {
    this.baselines.clear();
    this.performanceHistory.clear();
    this.regressions = [];
    this.emit('detector:reset');
  }

  /**
   * 导出数据
   */
  exportData(): {
    baselines: PerformanceBaseline[];
    regressions: PerformanceRegression[];
    historySize: number;
  } {
    return {
      baselines: this.getAllBaselines(),
      regressions: this.getRegressions(),
      historySize: Array.from(this.performanceHistory.values()).reduce((sum, history) => sum + history.length, 0),
    };
  }

  /**
   * 销毁检测器
   */
  destroy(): void {
    this.saveBaselines();
    this.reset();
    this.removeAllListeners();
  }
}
