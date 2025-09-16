/**
 * Trend Analyzer
 * 
 * Provides intelligent analysis of test execution trends, performance patterns,
 * and quality metrics over time. Generates insights and predictions based on
 * historical data.
 */

import { EventEmitter } from 'events';
import { HistoricalDataManager, TestSuiteRecord, TestExecutionRecord } from './HistoricalDataManager';

export interface TrendPoint {
  timestamp: Date;
  value: number;
  metadata?: Record<string, any>;
}

export interface TrendAnalysis {
  trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  slope: number;
  correlation: number;
  confidence: number;
  dataPoints: TrendPoint[];
  prediction?: {
    nextValue: number;
    confidence: number;
    timeframe: number; // days
  };
}

export interface CoverageTrend {
  statements: TrendAnalysis;
  branches: TrendAnalysis;
  functions: TrendAnalysis;
  lines: TrendAnalysis;
  overall: TrendAnalysis;
  recommendations: string[];
}

export interface PerformanceTrend {
  executionTime: TrendAnalysis;
  memoryUsage: TrendAnalysis;
  testCount: TrendAnalysis;
  failureRate: TrendAnalysis;
  recommendations: string[];
}

export interface QualityTrend {
  passRate: TrendAnalysis;
  flakiness: TrendAnalysis;
  testStability: TrendAnalysis;
  codeChurn: TrendAnalysis;
  recommendations: string[];
}

export interface SeasonalPattern {
  pattern: 'daily' | 'weekly' | 'monthly';
  strength: number;
  peaks: number[];
  valleys: number[];
  description: string;
}

export interface Anomaly {
  timestamp: Date;
  metric: string;
  expectedValue: number;
  actualValue: number;
  severity: 'low' | 'medium' | 'high';
  description: string;
  possibleCauses: string[];
}

export interface TrendInsight {
  type: 'improvement' | 'degradation' | 'anomaly' | 'pattern';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  metrics: string[];
  timeframe: string;
  actionItems: string[];
  confidence: number;
}

export class TrendAnalyzer extends EventEmitter {
  private dataManager: HistoricalDataManager;
  private analysisCache: Map<string, any> = new Map();
  private cacheTimeout: number = 5 * 60 * 1000; // 5 minutes

  constructor(dataManager: HistoricalDataManager) {
    super();
    this.dataManager = dataManager;
  }

  /**
   * Analyze coverage trends over time
   */
  async analyzeCoverageTrends(days: number = 30): Promise<CoverageTrend> {
    const cacheKey = `coverage-trends-${days}`;
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached;

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const records = await this.dataManager.queryTestSuiteRecords(undefined, {
      startDate,
      endDate,
      sortBy: 'timestamp',
      sortOrder: 'asc'
    });

    const coverageTrend: CoverageTrend = {
      statements: await this.analyzeCoverageMetric(records, 'statements'),
      branches: await this.analyzeCoverageMetric(records, 'branches'),
      functions: await this.analyzeCoverageMetric(records, 'functions'),
      lines: await this.analyzeCoverageMetric(records, 'lines'),
      overall: await this.analyzeOverallCoverage(records),
      recommendations: []
    };

    // Generate recommendations
    coverageTrend.recommendations = this.generateCoverageRecommendations(coverageTrend);

    this.setCachedResult(cacheKey, coverageTrend);
    return coverageTrend;
  }

  /**
   * Analyze performance trends over time
   */
  async analyzePerformanceTrends(days: number = 30): Promise<PerformanceTrend> {
    const cacheKey = `performance-trends-${days}`;
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached;

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const records = await this.dataManager.queryTestSuiteRecords(undefined, {
      startDate,
      endDate,
      sortBy: 'timestamp',
      sortOrder: 'asc'
    });

    const performanceTrend: PerformanceTrend = {
      executionTime: await this.analyzeExecutionTimeTrend(records),
      memoryUsage: await this.analyzeMemoryUsageTrend(records),
      testCount: await this.analyzeTestCountTrend(records),
      failureRate: await this.analyzeFailureRateTrend(records),
      recommendations: []
    };

    // Generate recommendations
    performanceTrend.recommendations = this.generatePerformanceRecommendations(performanceTrend);

    this.setCachedResult(cacheKey, performanceTrend);
    return performanceTrend;
  }

  /**
   * Analyze quality trends over time
   */
  async analyzeQualityTrends(days: number = 30): Promise<QualityTrend> {
    const cacheKey = `quality-trends-${days}`;
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached;

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const records = await this.dataManager.queryTestSuiteRecords(undefined, {
      startDate,
      endDate,
      sortBy: 'timestamp',
      sortOrder: 'asc'
    });

    const qualityTrend: QualityTrend = {
      passRate: await this.analyzePassRateTrend(records),
      flakiness: await this.analyzeFlakinessOverTime(days),
      testStability: await this.analyzeTestStabilityTrend(records),
      codeChurn: await this.analyzeCodeChurnTrend(records),
      recommendations: []
    };

    // Generate recommendations
    qualityTrend.recommendations = this.generateQualityRecommendations(qualityTrend);

    this.setCachedResult(cacheKey, qualityTrend);
    return qualityTrend;
  }

  /**
   * Detect seasonal patterns in test data
   */
  async detectSeasonalPatterns(days: number = 90): Promise<SeasonalPattern[]> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const records = await this.dataManager.queryTestSuiteRecords(undefined, {
      startDate,
      endDate,
      sortBy: 'timestamp',
      sortOrder: 'asc'
    });

    const patterns: SeasonalPattern[] = [];

    // Analyze daily patterns
    const dailyPattern = this.analyzeDailyPattern(records);
    if (dailyPattern.strength > 0.3) {
      patterns.push(dailyPattern);
    }

    // Analyze weekly patterns
    const weeklyPattern = this.analyzeWeeklyPattern(records);
    if (weeklyPattern.strength > 0.3) {
      patterns.push(weeklyPattern);
    }

    return patterns;
  }

  /**
   * Detect anomalies in test metrics
   */
  async detectAnomalies(days: number = 30, sensitivity: number = 2): Promise<Anomaly[]> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const records = await this.dataManager.queryTestSuiteRecords(undefined, {
      startDate,
      endDate,
      sortBy: 'timestamp',
      sortOrder: 'asc'
    });

    const anomalies: Anomaly[] = [];

    // Detect execution time anomalies
    const executionTimeAnomalies = this.detectMetricAnomalies(
      records.map(r => ({ timestamp: r.timestamp, value: r.duration })),
      'execution_time',
      sensitivity
    );
    anomalies.push(...executionTimeAnomalies);

    // Detect coverage anomalies
    const coverageAnomalies = this.detectMetricAnomalies(
      records.map(r => ({ 
        timestamp: r.timestamp, 
        value: (r.coverage.statements + r.coverage.branches + r.coverage.functions + r.coverage.lines) / 4 
      })),
      'coverage',
      sensitivity
    );
    anomalies.push(...coverageAnomalies);

    // Detect failure rate anomalies
    const failureRateAnomalies = this.detectMetricAnomalies(
      records.map(r => ({ 
        timestamp: r.timestamp, 
        value: r.totalTests > 0 ? r.failedTests / r.totalTests : 0 
      })),
      'failure_rate',
      sensitivity
    );
    anomalies.push(...failureRateAnomalies);

    return anomalies.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Generate comprehensive trend insights
   */
  async generateTrendInsights(days: number = 30): Promise<TrendInsight[]> {
    const insights: TrendInsight[] = [];

    // Analyze coverage trends
    const coverageTrends = await this.analyzeCoverageTrends(days);
    insights.push(...this.extractCoverageInsights(coverageTrends, days));

    // Analyze performance trends
    const performanceTrends = await this.analyzePerformanceTrends(days);
    insights.push(...this.extractPerformanceInsights(performanceTrends, days));

    // Analyze quality trends
    const qualityTrends = await this.analyzeQualityTrends(days);
    insights.push(...this.extractQualityInsights(qualityTrends, days));

    // Detect anomalies
    const anomalies = await this.detectAnomalies(days);
    insights.push(...this.convertAnomaliesToInsights(anomalies));

    // Sort by severity and confidence
    return insights.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.confidence - a.confidence;
    });
  }

  /**
   * Predict future trends based on historical data
   */
  async predictTrends(metric: string, days: number = 30, forecastDays: number = 7): Promise<TrendPoint[]> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const records = await this.dataManager.queryTestSuiteRecords(undefined, {
      startDate,
      endDate,
      sortBy: 'timestamp',
      sortOrder: 'asc'
    });

    const dataPoints = this.extractMetricValues(records, metric);
    
    if (dataPoints.length < 5) {
      return []; // Not enough data for prediction
    }

    return this.generatePrediction(dataPoints, forecastDays);
  }

  /**
   * Private helper methods
   */
  private async analyzeCoverageMetric(
    records: TestSuiteRecord[], 
    metric: 'statements' | 'branches' | 'functions' | 'lines'
  ): Promise<TrendAnalysis> {
    const dataPoints: TrendPoint[] = records.map(record => ({
      timestamp: record.timestamp,
      value: record.coverage[metric],
      metadata: { suiteName: record.suiteName }
    }));

    return this.analyzeTrend(dataPoints);
  }

  private async analyzeOverallCoverage(records: TestSuiteRecord[]): Promise<TrendAnalysis> {
    const dataPoints: TrendPoint[] = records.map(record => ({
      timestamp: record.timestamp,
      value: (record.coverage.statements + record.coverage.branches + 
              record.coverage.functions + record.coverage.lines) / 4,
      metadata: { suiteName: record.suiteName }
    }));

    return this.analyzeTrend(dataPoints);
  }

  private async analyzeExecutionTimeTrend(records: TestSuiteRecord[]): Promise<TrendAnalysis> {
    const dataPoints: TrendPoint[] = records.map(record => ({
      timestamp: record.timestamp,
      value: record.duration,
      metadata: { suiteName: record.suiteName, testCount: record.totalTests }
    }));

    return this.analyzeTrend(dataPoints);
  }

  private async analyzeMemoryUsageTrend(records: TestSuiteRecord[]): Promise<TrendAnalysis> {
    const dataPoints: TrendPoint[] = records.map(record => ({
      timestamp: record.timestamp,
      value: record.performance.peakMemory,
      metadata: { suiteName: record.suiteName }
    }));

    return this.analyzeTrend(dataPoints);
  }

  private async analyzeTestCountTrend(records: TestSuiteRecord[]): Promise<TrendAnalysis> {
    const dataPoints: TrendPoint[] = records.map(record => ({
      timestamp: record.timestamp,
      value: record.totalTests,
      metadata: { suiteName: record.suiteName }
    }));

    return this.analyzeTrend(dataPoints);
  }

  private async analyzeFailureRateTrend(records: TestSuiteRecord[]): Promise<TrendAnalysis> {
    const dataPoints: TrendPoint[] = records.map(record => ({
      timestamp: record.timestamp,
      value: record.totalTests > 0 ? record.failedTests / record.totalTests : 0,
      metadata: { suiteName: record.suiteName, failedTests: record.failedTests }
    }));

    return this.analyzeTrend(dataPoints);
  }

  private async analyzePassRateTrend(records: TestSuiteRecord[]): Promise<TrendAnalysis> {
    const dataPoints: TrendPoint[] = records.map(record => ({
      timestamp: record.timestamp,
      value: record.totalTests > 0 ? record.passedTests / record.totalTests : 0,
      metadata: { suiteName: record.suiteName, passedTests: record.passedTests }
    }));

    return this.analyzeTrend(dataPoints);
  }

  private async analyzeFlakinessOverTime(days: number): Promise<TrendAnalysis> {
    const flakyTests = await this.dataManager.getFlakyTests(days);
    
    // Group flaky tests by day to create a trend
    const dailyFlakiness = new Map<string, number>();
    
    for (const test of flakyTests) {
      for (const failure of test.recentFailures) {
        const day = failure.toISOString().split('T')[0];
        dailyFlakiness.set(day, (dailyFlakiness.get(day) || 0) + 1);
      }
    }

    const dataPoints: TrendPoint[] = Array.from(dailyFlakiness.entries()).map(([day, count]) => ({
      timestamp: new Date(day),
      value: count,
      metadata: { day }
    }));

    return this.analyzeTrend(dataPoints);
  }

  private async analyzeTestStabilityTrend(records: TestSuiteRecord[]): Promise<TrendAnalysis> {
    const dataPoints: TrendPoint[] = records.map(record => {
      const stability = record.totalTests > 0 ? 
        (record.passedTests + record.skippedTests) / record.totalTests : 1;
      
      return {
        timestamp: record.timestamp,
        value: stability,
        metadata: { suiteName: record.suiteName }
      };
    });

    return this.analyzeTrend(dataPoints);
  }

  private async analyzeCodeChurnTrend(records: TestSuiteRecord[]): Promise<TrendAnalysis> {
    // Estimate code churn based on test count changes
    const dataPoints: TrendPoint[] = [];
    
    for (let i = 1; i < records.length; i++) {
      const current = records[i];
      const previous = records[i - 1];
      
      const churn = Math.abs(current.totalTests - previous.totalTests) / 
                   Math.max(previous.totalTests, 1);
      
      dataPoints.push({
        timestamp: current.timestamp,
        value: churn,
        metadata: { 
          suiteName: current.suiteName,
          testCountChange: current.totalTests - previous.totalTests
        }
      });
    }

    return this.analyzeTrend(dataPoints);
  }

  private analyzeTrend(dataPoints: TrendPoint[]): TrendAnalysis {
    if (dataPoints.length < 2) {
      return {
        trend: 'stable',
        slope: 0,
        correlation: 0,
        confidence: 0,
        dataPoints
      };
    }

    // Calculate linear regression
    const n = dataPoints.length;
    const xValues = dataPoints.map((_, i) => i);
    const yValues = dataPoints.map(p => p.value);
    
    const xMean = xValues.reduce((sum, x) => sum + x, 0) / n;
    const yMean = yValues.reduce((sum, y) => sum + y, 0) / n;
    
    let numerator = 0;
    let denominatorX = 0;
    let denominatorY = 0;
    
    for (let i = 0; i < n; i++) {
      const xDiff = xValues[i] - xMean;
      const yDiff = yValues[i] - yMean;
      
      numerator += xDiff * yDiff;
      denominatorX += xDiff * xDiff;
      denominatorY += yDiff * yDiff;
    }
    
    const correlation = denominatorX === 0 || denominatorY === 0 ? 0 : 
      numerator / Math.sqrt(denominatorX * denominatorY);
    
    const slope = denominatorX === 0 ? 0 : numerator / denominatorX;
    
    // Determine trend direction
    let trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
    const absCorrelation = Math.abs(correlation);
    
    if (absCorrelation < 0.3) {
      trend = 'stable';
    } else if (absCorrelation < 0.6) {
      trend = 'volatile';
    } else {
      trend = slope > 0 ? 'increasing' : 'decreasing';
    }
    
    // Calculate confidence based on correlation strength and data points
    const confidence = Math.min(absCorrelation * (Math.log(n) / Math.log(10)), 1);
    
    // Generate prediction if trend is strong enough
    let prediction;
    if (confidence > 0.5 && n >= 5) {
      const lastValue = yValues[yValues.length - 1];
      const nextValue = lastValue + slope;
      
      prediction = {
        nextValue,
        confidence: confidence * 0.8, // Reduce confidence for predictions
        timeframe: 1 // 1 day
      };
    }

    return {
      trend,
      slope,
      correlation,
      confidence,
      dataPoints,
      prediction
    };
  }

  private analyzeDailyPattern(records: TestSuiteRecord[]): SeasonalPattern {
    const hourlyData = new Map<number, number[]>();
    
    for (const record of records) {
      const hour = record.timestamp.getHours();
      if (!hourlyData.has(hour)) {
        hourlyData.set(hour, []);
      }
      hourlyData.get(hour)!.push(record.duration);
    }
    
    const hourlyAverages = new Map<number, number>();
    for (const [hour, durations] of hourlyData.entries()) {
      const average = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      hourlyAverages.set(hour, average);
    }
    
    const values = Array.from(hourlyAverages.values());
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const strength = variance > 0 ? Math.sqrt(variance) / mean : 0;
    
    const peaks: number[] = [];
    const valleys: number[] = [];
    
    for (const [hour, average] of hourlyAverages.entries()) {
      if (average > mean + strength * mean) {
        peaks.push(hour);
      } else if (average < mean - strength * mean) {
        valleys.push(hour);
      }
    }
    
    return {
      pattern: 'daily',
      strength: Math.min(strength, 1),
      peaks,
      valleys,
      description: `Daily pattern detected with ${peaks.length} peak hours and ${valleys.length} valley hours`
    };
  }

  private analyzeWeeklyPattern(records: TestSuiteRecord[]): SeasonalPattern {
    const weeklyData = new Map<number, number[]>();
    
    for (const record of records) {
      const dayOfWeek = record.timestamp.getDay();
      if (!weeklyData.has(dayOfWeek)) {
        weeklyData.set(dayOfWeek, []);
      }
      weeklyData.get(dayOfWeek)!.push(record.duration);
    }
    
    const weeklyAverages = new Map<number, number>();
    for (const [day, durations] of weeklyData.entries()) {
      const average = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      weeklyAverages.set(day, average);
    }
    
    const values = Array.from(weeklyAverages.values());
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const strength = variance > 0 ? Math.sqrt(variance) / mean : 0;
    
    const peaks: number[] = [];
    const valleys: number[] = [];
    
    for (const [day, average] of weeklyAverages.entries()) {
      if (average > mean + strength * mean) {
        peaks.push(day);
      } else if (average < mean - strength * mean) {
        valleys.push(day);
      }
    }
    
    return {
      pattern: 'weekly',
      strength: Math.min(strength, 1),
      peaks,
      valleys,
      description: `Weekly pattern detected with peak days: ${peaks.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')}`
    };
  }

  private detectMetricAnomalies(
    dataPoints: { timestamp: Date; value: number }[],
    metricName: string,
    sensitivity: number
  ): Anomaly[] {
    if (dataPoints.length < 10) return [];
    
    const values = dataPoints.map(p => p.value);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    const anomalies: Anomaly[] = [];
    
    for (let i = 0; i < dataPoints.length; i++) {
      const point = dataPoints[i];
      const zScore = stdDev > 0 ? Math.abs(point.value - mean) / stdDev : 0;
      
      if (zScore > sensitivity) {
        const severity: 'low' | 'medium' | 'high' = 
          zScore > sensitivity * 2 ? 'high' : 
          zScore > sensitivity * 1.5 ? 'medium' : 'low';
        
        anomalies.push({
          timestamp: point.timestamp,
          metric: metricName,
          expectedValue: mean,
          actualValue: point.value,
          severity,
          description: `${metricName} anomaly detected: ${point.value.toFixed(2)} (expected ~${mean.toFixed(2)})`,
          possibleCauses: this.generateAnomalyCauses(metricName, point.value > mean)
        });
      }
    }
    
    return anomalies;
  }

  private generateAnomalyCauses(metric: string, isHigh: boolean): string[] {
    const causes: Record<string, { high: string[]; low: string[] }> = {
      execution_time: {
        high: ['Performance regression', 'Increased test complexity', 'Resource contention', 'Network latency'],
        low: ['Performance optimization', 'Reduced test scope', 'Caching improvements', 'Hardware upgrade']
      },
      coverage: {
        high: ['New tests added', 'Code refactoring', 'Better test practices'],
        low: ['Code added without tests', 'Tests removed', 'Coverage calculation error']
      },
      failure_rate: {
        high: ['Code regression', 'Environment issues', 'Flaky tests', 'Dependency changes'],
        low: ['Bug fixes', 'Test improvements', 'Code quality improvements']
      }
    };
    
    return causes[metric]?.[isHigh ? 'high' : 'low'] || ['Unknown cause'];
  }

  private generateCoverageRecommendations(trends: CoverageTrend): string[] {
    const recommendations: string[] = [];
    
    if (trends.overall.trend === 'decreasing') {
      recommendations.push('Coverage is declining. Consider implementing coverage gates in CI/CD.');
    }
    
    if (trends.branches.correlation < trends.statements.correlation) {
      recommendations.push('Branch coverage is less stable than statement coverage. Focus on edge case testing.');
    }
    
    if (trends.functions.trend === 'stable' && trends.functions.dataPoints.length > 0) {
      const avgCoverage = trends.functions.dataPoints.reduce((sum, p) => sum + p.value, 0) / trends.functions.dataPoints.length;
      if (avgCoverage < 90) {
        recommendations.push('Function coverage is below 90%. Consider adding more unit tests.');
      }
    }
    
    return recommendations;
  }

  private generatePerformanceRecommendations(trends: PerformanceTrend): string[] {
    const recommendations: string[] = [];
    
    if (trends.executionTime.trend === 'increasing') {
      recommendations.push('Test execution time is increasing. Consider optimizing slow tests or implementing parallel execution.');
    }
    
    if (trends.memoryUsage.trend === 'increasing') {
      recommendations.push('Memory usage is growing. Check for memory leaks in tests or test data cleanup issues.');
    }
    
    if (trends.failureRate.trend === 'increasing') {
      recommendations.push('Failure rate is increasing. Investigate flaky tests and improve test stability.');
    }
    
    return recommendations;
  }

  private generateQualityRecommendations(trends: QualityTrend): string[] {
    const recommendations: string[] = [];
    
    if (trends.passRate.trend === 'decreasing') {
      recommendations.push('Pass rate is declining. Focus on fixing failing tests and improving code quality.');
    }
    
    if (trends.flakiness.trend === 'increasing') {
      recommendations.push('Test flakiness is increasing. Identify and fix unstable tests.');
    }
    
    if (trends.codeChurn.trend === 'increasing') {
      recommendations.push('Code churn is high. Consider stabilizing the codebase and improving test maintenance.');
    }
    
    return recommendations;
  }

  private extractCoverageInsights(trends: CoverageTrend, days: number): TrendInsight[] {
    const insights: TrendInsight[] = [];
    
    if (trends.overall.trend === 'decreasing' && trends.overall.confidence > 0.6) {
      insights.push({
        type: 'degradation',
        severity: 'high',
        title: 'Coverage Declining',
        description: `Test coverage has been declining over the past ${days} days`,
        metrics: ['coverage'],
        timeframe: `${days} days`,
        actionItems: trends.recommendations,
        confidence: trends.overall.confidence
      });
    }
    
    return insights;
  }

  private extractPerformanceInsights(trends: PerformanceTrend, days: number): TrendInsight[] {
    const insights: TrendInsight[] = [];
    
    if (trends.executionTime.trend === 'increasing' && trends.executionTime.confidence > 0.6) {
      insights.push({
        type: 'degradation',
        severity: 'medium',
        title: 'Test Performance Degrading',
        description: `Test execution time has been increasing over the past ${days} days`,
        metrics: ['execution_time'],
        timeframe: `${days} days`,
        actionItems: trends.recommendations,
        confidence: trends.executionTime.confidence
      });
    }
    
    return insights;
  }

  private extractQualityInsights(trends: QualityTrend, days: number): TrendInsight[] {
    const insights: TrendInsight[] = [];
    
    if (trends.passRate.trend === 'decreasing' && trends.passRate.confidence > 0.6) {
      insights.push({
        type: 'degradation',
        severity: 'high',
        title: 'Test Quality Declining',
        description: `Test pass rate has been declining over the past ${days} days`,
        metrics: ['pass_rate'],
        timeframe: `${days} days`,
        actionItems: trends.recommendations,
        confidence: trends.passRate.confidence
      });
    }
    
    return insights;
  }

  private convertAnomaliesToInsights(anomalies: Anomaly[]): TrendInsight[] {
    return anomalies.map(anomaly => ({
      type: 'anomaly' as const,
      severity: anomaly.severity,
      title: `${anomaly.metric} Anomaly Detected`,
      description: anomaly.description,
      metrics: [anomaly.metric],
      timeframe: 'recent',
      actionItems: anomaly.possibleCauses.map(cause => `Investigate: ${cause}`),
      confidence: 0.8
    }));
  }

  private extractMetricValues(records: TestSuiteRecord[], metric: string): TrendPoint[] {
    return records.map(record => {
      let value: number;
      
      switch (metric) {
        case 'coverage':
          value = (record.coverage.statements + record.coverage.branches + 
                  record.coverage.functions + record.coverage.lines) / 4;
          break;
        case 'execution_time':
          value = record.duration;
          break;
        case 'memory_usage':
          value = record.performance.peakMemory;
          break;
        case 'pass_rate':
          value = record.totalTests > 0 ? record.passedTests / record.totalTests : 0;
          break;
        default:
          value = 0;
      }
      
      return {
        timestamp: record.timestamp,
        value,
        metadata: { suiteName: record.suiteName }
      };
    });
  }

  private generatePrediction(dataPoints: TrendPoint[], forecastDays: number): TrendPoint[] {
    const analysis = this.analyzeTrend(dataPoints);
    
    if (!analysis.prediction || analysis.confidence < 0.5) {
      return [];
    }
    
    const predictions: TrendPoint[] = [];
    const lastPoint = dataPoints[dataPoints.length - 1];
    const dailyChange = analysis.slope;
    
    for (let i = 1; i <= forecastDays; i++) {
      const futureDate = new Date(lastPoint.timestamp.getTime() + i * 24 * 60 * 60 * 1000);
      const predictedValue = lastPoint.value + (dailyChange * i);
      
      predictions.push({
        timestamp: futureDate,
        value: Math.max(0, predictedValue), // Ensure non-negative values
        metadata: { 
          predicted: true, 
          confidence: analysis.confidence * (1 - i * 0.1) // Decrease confidence over time
        }
      });
    }
    
    return predictions;
  }

  private getCachedResult(key: string): any {
    const cached = this.analysisCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  private setCachedResult(key: string, data: any): void {
    this.analysisCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
}