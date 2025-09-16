/**
 * Trend Analyzer Tests
 * 
 * Comprehensive tests for the trend analysis system,
 * covering trend detection, anomaly identification, and insight generation.
 */

import { TrendAnalyzer, TrendAnalysis, CoverageTrend, PerformanceTrend, QualityTrend } from '../../../../lib/testing/analytics/TrendAnalyzer';
import { HistoricalDataManager, TestSuiteRecord } from '../../../../lib/testing/analytics/HistoricalDataManager';

describe('TrendAnalyzer', () => {
  let dataManager: HistoricalDataManager;
  let trendAnalyzer: TrendAnalyzer;

  beforeEach(() => {
    dataManager = new HistoricalDataManager();
    trendAnalyzer = new TrendAnalyzer(dataManager);
  });

  afterEach(async () => {
    await dataManager.clearAllData();
  });

  describe('Coverage Trend Analysis', () => {
    beforeEach(async () => {
      // Create test data with coverage trends
      const records = [
        createTestRecord(new Date('2024-01-01'), { coverage: { statements: 80, branches: 75, functions: 85, lines: 78 } }),
        createTestRecord(new Date('2024-01-02'), { coverage: { statements: 82, branches: 77, functions: 87, lines: 80 } }),
        createTestRecord(new Date('2024-01-03'), { coverage: { statements: 84, branches: 79, functions: 89, lines: 82 } }),
        createTestRecord(new Date('2024-01-04'), { coverage: { statements: 86, branches: 81, functions: 91, lines: 84 } }),
        createTestRecord(new Date('2024-01-05'), { coverage: { statements: 88, branches: 83, functions: 93, lines: 86 } })
      ];

      for (const record of records) {
        await dataManager.storeTestSuiteRecord(record);
      }
    });

    it('should analyze coverage trends', async () => {
      const coverageTrends = await trendAnalyzer.analyzeCoverageTrends(30);

      expect(coverageTrends.statements.trend).toBe('increasing');
      expect(coverageTrends.branches.trend).toBe('increasing');
      expect(coverageTrends.functions.trend).toBe('increasing');
      expect(coverageTrends.lines.trend).toBe('increasing');
      expect(coverageTrends.overall.trend).toBe('increasing');
    });

    it('should calculate trend slopes correctly', async () => {
      const coverageTrends = await trendAnalyzer.analyzeCoverageTrends(30);

      expect(coverageTrends.statements.slope).toBeGreaterThan(0);
      expect(coverageTrends.statements.correlation).toBeGreaterThan(0.8);
      expect(coverageTrends.statements.confidence).toBeGreaterThan(0.7);
    });

    it('should generate coverage recommendations', async () => {
      const coverageTrends = await trendAnalyzer.analyzeCoverageTrends(30);

      expect(coverageTrends.recommendations).toBeDefined();
      expect(Array.isArray(coverageTrends.recommendations)).toBe(true);
    });

    it('should detect declining coverage', async () => {
      // Add declining coverage data
      const decliningRecords = [
        createTestRecord(new Date('2024-01-06'), { coverage: { statements: 86, branches: 81, functions: 89, lines: 84 } }),
        createTestRecord(new Date('2024-01-07'), { coverage: { statements: 84, branches: 79, functions: 87, lines: 82 } }),
        createTestRecord(new Date('2024-01-08'), { coverage: { statements: 82, branches: 77, functions: 85, lines: 80 } })
      ];

      for (const record of decliningRecords) {
        await dataManager.storeTestSuiteRecord(record);
      }

      const coverageTrends = await trendAnalyzer.analyzeCoverageTrends(30);

      expect(coverageTrends.overall.trend).toBe('decreasing');
      expect(coverageTrends.recommendations).toContain(
        expect.stringContaining('Coverage is declining')
      );
    });

    it('should provide predictions for strong trends', async () => {
      const coverageTrends = await trendAnalyzer.analyzeCoverageTrends(30);

      if (coverageTrends.statements.confidence > 0.5) {
        expect(coverageTrends.statements.prediction).toBeDefined();
        expect(coverageTrends.statements.prediction?.nextValue).toBeGreaterThan(0);
        expect(coverageTrends.statements.prediction?.confidence).toBeGreaterThan(0);
        expect(coverageTrends.statements.prediction?.timeframe).toBe(1);
      }
    });
  });

  describe('Performance Trend Analysis', () => {
    beforeEach(async () => {
      // Create test data with performance trends
      const records = [
        createTestRecord(new Date('2024-01-01'), { duration: 30, performance: { peakMemory: 128 }, totalTests: 100, failedTests: 5 }),
        createTestRecord(new Date('2024-01-02'), { duration: 32, performance: { peakMemory: 132 }, totalTests: 102, failedTests: 4 }),
        createTestRecord(new Date('2024-01-03'), { duration: 34, performance: { peakMemory: 136 }, totalTests: 104, failedTests: 6 }),
        createTestRecord(new Date('2024-01-04'), { duration: 36, performance: { peakMemory: 140 }, totalTests: 106, failedTests: 3 }),
        createTestRecord(new Date('2024-01-05'), { duration: 38, performance: { peakMemory: 144 }, totalTests: 108, failedTests: 7 })
      ];

      for (const record of records) {
        await dataManager.storeTestSuiteRecord(record);
      }
    });

    it('should analyze performance trends', async () => {
      const performanceTrends = await trendAnalyzer.analyzePerformanceTrends(30);

      expect(performanceTrends.executionTime.trend).toBe('increasing');
      expect(performanceTrends.memoryUsage.trend).toBe('increasing');
      expect(performanceTrends.testCount.trend).toBe('increasing');
      expect(performanceTrends.failureRate.trend).toBe('volatile');
    });

    it('should generate performance recommendations', async () => {
      const performanceTrends = await trendAnalyzer.analyzePerformanceTrends(30);

      expect(performanceTrends.recommendations).toBeDefined();
      expect(performanceTrends.recommendations).toContain(
        expect.stringContaining('execution time is increasing')
      );
      expect(performanceTrends.recommendations).toContain(
        expect.stringContaining('Memory usage is growing')
      );
    });

    it('should detect performance improvements', async () => {
      // Add improving performance data
      const improvingRecords = [
        createTestRecord(new Date('2024-01-06'), { duration: 36, performance: { peakMemory: 140 } }),
        createTestRecord(new Date('2024-01-07'), { duration: 34, performance: { peakMemory: 136 } }),
        createTestRecord(new Date('2024-01-08'), { duration: 32, performance: { peakMemory: 132 } })
      ];

      for (const record of improvingRecords) {
        await dataManager.storeTestSuiteRecord(record);
      }

      const performanceTrends = await trendAnalyzer.analyzePerformanceTrends(30);

      // Should detect overall stable or improving trend
      expect(['stable', 'decreasing']).toContain(performanceTrends.executionTime.trend);
    });
  });

  describe('Quality Trend Analysis', () => {
    beforeEach(async () => {
      // Create test data with quality trends
      const records = [
        createTestRecord(new Date('2024-01-01'), { totalTests: 100, passedTests: 95, failedTests: 5 }),
        createTestRecord(new Date('2024-01-02'), { totalTests: 102, passedTests: 96, failedTests: 6 }),
        createTestRecord(new Date('2024-01-03'), { totalTests: 104, passedTests: 98, failedTests: 6 }),
        createTestRecord(new Date('2024-01-04'), { totalTests: 106, passedTests: 100, failedTests: 6 }),
        createTestRecord(new Date('2024-01-05'), { totalTests: 108, passedTests: 102, failedTests: 6 })
      ];

      for (const record of records) {
        await dataManager.storeTestSuiteRecord(record);
      }
    });

    it('should analyze quality trends', async () => {
      const qualityTrends = await trendAnalyzer.analyzeQualityTrends(30);

      expect(qualityTrends.passRate).toBeDefined();
      expect(qualityTrends.flakiness).toBeDefined();
      expect(qualityTrends.testStability).toBeDefined();
      expect(qualityTrends.codeChurn).toBeDefined();
    });

    it('should calculate pass rate trends', async () => {
      const qualityTrends = await trendAnalyzer.analyzeQualityTrends(30);

      expect(qualityTrends.passRate.dataPoints).toHaveLength(5);
      expect(qualityTrends.passRate.dataPoints.every(p => p.value >= 0.9)).toBe(true);
    });

    it('should generate quality recommendations', async () => {
      const qualityTrends = await trendAnalyzer.analyzeQualityTrends(30);

      expect(qualityTrends.recommendations).toBeDefined();
      expect(Array.isArray(qualityTrends.recommendations)).toBe(true);
    });
  });

  describe('Seasonal Pattern Detection', () => {
    beforeEach(async () => {
      // Create test data with daily patterns
      const records = [];
      for (let day = 0; day < 30; day++) {
        for (let hour = 0; hour < 24; hour += 6) {
          const date = new Date('2024-01-01');
          date.setDate(date.getDate() + day);
          date.setHours(hour);
          
          // Simulate higher execution times during business hours
          const duration = hour >= 9 && hour <= 17 ? 40 + Math.random() * 10 : 25 + Math.random() * 5;
          
          records.push(createTestRecord(date, { duration }));
        }
      }

      for (const record of records) {
        await dataManager.storeTestSuiteRecord(record);
      }
    });

    it('should detect daily patterns', async () => {
      const patterns = await trendAnalyzer.detectSeasonalPatterns(90);

      const dailyPattern = patterns.find(p => p.pattern === 'daily');
      expect(dailyPattern).toBeDefined();
      expect(dailyPattern?.strength).toBeGreaterThan(0);
      expect(dailyPattern?.peaks).toBeDefined();
      expect(dailyPattern?.valleys).toBeDefined();
    });

    it('should detect weekly patterns', async () => {
      // Create weekly pattern data
      const records = [];
      for (let week = 0; week < 12; week++) {
        for (let day = 0; day < 7; day++) {
          const date = new Date('2024-01-01');
          date.setDate(date.getDate() + week * 7 + day);
          
          // Simulate lower activity on weekends
          const duration = day === 0 || day === 6 ? 20 + Math.random() * 5 : 35 + Math.random() * 10;
          
          records.push(createTestRecord(date, { duration }));
        }
      }

      await dataManager.clearAllData();
      for (const record of records) {
        await dataManager.storeTestSuiteRecord(record);
      }

      const patterns = await trendAnalyzer.detectSeasonalPatterns(90);

      const weeklyPattern = patterns.find(p => p.pattern === 'weekly');
      expect(weeklyPattern).toBeDefined();
      expect(weeklyPattern?.strength).toBeGreaterThan(0);
    });

    it('should provide pattern descriptions', async () => {
      const patterns = await trendAnalyzer.detectSeasonalPatterns(90);

      for (const pattern of patterns) {
        expect(pattern.description).toBeDefined();
        expect(typeof pattern.description).toBe('string');
        expect(pattern.description.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Anomaly Detection', () => {
    beforeEach(async () => {
      // Create normal data with some anomalies
      const records = [];
      
      // Normal data
      for (let i = 0; i < 20; i++) {
        const date = new Date('2024-01-01');
        date.setDate(date.getDate() + i);
        
        records.push(createTestRecord(date, {
          duration: 30 + Math.random() * 5,
          coverage: { statements: 85 + Math.random() * 5 },
          totalTests: 100,
          failedTests: Math.floor(Math.random() * 3)
        }));
      }
      
      // Add anomalies
      records.push(createTestRecord(new Date('2024-01-21'), {
        duration: 120, // Execution time anomaly
        coverage: { statements: 85 },
        totalTests: 100,
        failedTests: 1
      }));
      
      records.push(createTestRecord(new Date('2024-01-22'), {
        duration: 32,
        coverage: { statements: 45 }, // Coverage anomaly
        totalTests: 100,
        failedTests: 1
      }));
      
      records.push(createTestRecord(new Date('2024-01-23'), {
        duration: 31,
        coverage: { statements: 86 },
        totalTests: 100,
        failedTests: 25 // Failure rate anomaly
      }));

      for (const record of records) {
        await dataManager.storeTestSuiteRecord(record);
      }
    });

    it('should detect execution time anomalies', async () => {
      const anomalies = await trendAnalyzer.detectAnomalies(30, 2);

      const executionTimeAnomalies = anomalies.filter(a => a.metric === 'execution_time');
      expect(executionTimeAnomalies.length).toBeGreaterThan(0);
      
      const highExecutionAnomaly = executionTimeAnomalies.find(a => a.actualValue > 100);
      expect(highExecutionAnomaly).toBeDefined();
      expect(highExecutionAnomaly?.severity).toBe('high');
    });

    it('should detect coverage anomalies', async () => {
      const anomalies = await trendAnalyzer.detectAnomalies(30, 2);

      const coverageAnomalies = anomalies.filter(a => a.metric === 'coverage');
      expect(coverageAnomalies.length).toBeGreaterThan(0);
      
      const lowCoverageAnomaly = coverageAnomalies.find(a => a.actualValue < 50);
      expect(lowCoverageAnomaly).toBeDefined();
    });

    it('should detect failure rate anomalies', async () => {
      const anomalies = await trendAnalyzer.detectAnomalies(30, 2);

      const failureRateAnomalies = anomalies.filter(a => a.metric === 'failure_rate');
      expect(failureRateAnomalies.length).toBeGreaterThan(0);
      
      const highFailureAnomaly = failureRateAnomalies.find(a => a.actualValue > 0.2);
      expect(highFailureAnomaly).toBeDefined();
    });

    it('should provide possible causes for anomalies', async () => {
      const anomalies = await trendAnalyzer.detectAnomalies(30, 2);

      for (const anomaly of anomalies) {
        expect(anomaly.possibleCauses).toBeDefined();
        expect(Array.isArray(anomaly.possibleCauses)).toBe(true);
        expect(anomaly.possibleCauses.length).toBeGreaterThan(0);
      }
    });

    it('should sort anomalies by timestamp', async () => {
      const anomalies = await trendAnalyzer.detectAnomalies(30, 2);

      for (let i = 1; i < anomalies.length; i++) {
        expect(anomalies[i].timestamp.getTime()).toBeLessThanOrEqual(anomalies[i - 1].timestamp.getTime());
      }
    });

    it('should adjust sensitivity', async () => {
      const lowSensitivityAnomalies = await trendAnalyzer.detectAnomalies(30, 3);
      const highSensitivityAnomalies = await trendAnalyzer.detectAnomalies(30, 1.5);

      expect(highSensitivityAnomalies.length).toBeGreaterThanOrEqual(lowSensitivityAnomalies.length);
    });
  });

  describe('Trend Insights Generation', () => {
    beforeEach(async () => {
      // Create data with clear trends for insight generation
      const records = [
        createTestRecord(new Date('2024-01-01'), { 
          coverage: { statements: 90 }, 
          duration: 25, 
          totalTests: 100, 
          passedTests: 98 
        }),
        createTestRecord(new Date('2024-01-02'), { 
          coverage: { statements: 88 }, 
          duration: 27, 
          totalTests: 102, 
          passedTests: 99 
        }),
        createTestRecord(new Date('2024-01-03'), { 
          coverage: { statements: 86 }, 
          duration: 29, 
          totalTests: 104, 
          passedTests: 100 
        }),
        createTestRecord(new Date('2024-01-04'), { 
          coverage: { statements: 84 }, 
          duration: 31, 
          totalTests: 106, 
          passedTests: 101 
        }),
        createTestRecord(new Date('2024-01-05'), { 
          coverage: { statements: 82 }, 
          duration: 33, 
          totalTests: 108, 
          passedTests: 102 
        })
      ];

      for (const record of records) {
        await dataManager.storeTestSuiteRecord(record);
      }
    });

    it('should generate trend insights', async () => {
      const insights = await trendAnalyzer.generateTrendInsights(30);

      expect(insights).toBeDefined();
      expect(Array.isArray(insights)).toBe(true);
      expect(insights.length).toBeGreaterThan(0);
    });

    it('should categorize insights by type', async () => {
      const insights = await trendAnalyzer.generateTrendInsights(30);

      const types = ['improvement', 'degradation', 'anomaly', 'pattern'];
      for (const insight of insights) {
        expect(types).toContain(insight.type);
      }
    });

    it('should prioritize insights by severity and confidence', async () => {
      const insights = await trendAnalyzer.generateTrendInsights(30);

      if (insights.length > 1) {
        for (let i = 1; i < insights.length; i++) {
          const current = insights[i];
          const previous = insights[i - 1];
          
          const severityOrder = { high: 3, medium: 2, low: 1 };
          const currentSeverity = severityOrder[current.severity];
          const previousSeverity = severityOrder[previous.severity];
          
          if (previousSeverity !== currentSeverity) {
            expect(previousSeverity).toBeGreaterThanOrEqual(currentSeverity);
          } else {
            expect(previous.confidence).toBeGreaterThanOrEqual(current.confidence);
          }
        }
      }
    });

    it('should provide actionable recommendations', async () => {
      const insights = await trendAnalyzer.generateTrendInsights(30);

      for (const insight of insights) {
        expect(insight.actionItems).toBeDefined();
        expect(Array.isArray(insight.actionItems)).toBe(true);
        expect(insight.title).toBeDefined();
        expect(insight.description).toBeDefined();
        expect(insight.timeframe).toBeDefined();
      }
    });

    it('should include supporting metrics', async () => {
      const insights = await trendAnalyzer.generateTrendInsights(30);

      for (const insight of insights) {
        expect(insight.metrics).toBeDefined();
        expect(Array.isArray(insight.metrics)).toBe(true);
        expect(insight.confidence).toBeGreaterThan(0);
        expect(insight.confidence).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Trend Predictions', () => {
    beforeEach(async () => {
      // Create predictable trend data
      const records = [];
      for (let i = 0; i < 15; i++) {
        const date = new Date('2024-01-01');
        date.setDate(date.getDate() + i);
        
        records.push(createTestRecord(date, {
          coverage: { statements: 80 + i * 0.5 }, // Steady increase
          duration: 30 + i * 0.3, // Steady increase
          totalTests: 100 + i,
          passedTests: 95 + i
        }));
      }

      for (const record of records) {
        await dataManager.storeTestSuiteRecord(record);
      }
    });

    it('should predict coverage trends', async () => {
      const predictions = await trendAnalyzer.predictTrends('coverage', 30, 7);

      expect(predictions).toBeDefined();
      expect(Array.isArray(predictions)).toBe(true);
      expect(predictions.length).toBe(7);
      
      for (const prediction of predictions) {
        expect(prediction.timestamp).toBeInstanceOf(Date);
        expect(prediction.value).toBeGreaterThan(0);
        expect(prediction.metadata?.predicted).toBe(true);
      }
    });

    it('should predict execution time trends', async () => {
      const predictions = await trendAnalyzer.predictTrends('execution_time', 30, 5);

      expect(predictions).toBeDefined();
      expect(predictions.length).toBe(5);
      
      // Should predict increasing execution time
      expect(predictions[predictions.length - 1].value).toBeGreaterThan(predictions[0].value);
    });

    it('should handle insufficient data gracefully', async () => {
      await dataManager.clearAllData();
      
      // Add only 2 records (insufficient for prediction)
      const records = [
        createTestRecord(new Date('2024-01-01')),
        createTestRecord(new Date('2024-01-02'))
      ];
      
      for (const record of records) {
        await dataManager.storeTestSuiteRecord(record);
      }

      const predictions = await trendAnalyzer.predictTrends('coverage', 30, 7);
      expect(predictions).toHaveLength(0);
    });

    it('should include confidence in predictions', async () => {
      const predictions = await trendAnalyzer.predictTrends('coverage', 30, 7);

      for (const prediction of predictions) {
        expect(prediction.metadata?.confidence).toBeDefined();
        expect(prediction.metadata?.confidence).toBeGreaterThan(0);
        expect(prediction.metadata?.confidence).toBeLessThanOrEqual(1);
      }
    });

    it('should decrease confidence over time', async () => {
      const predictions = await trendAnalyzer.predictTrends('coverage', 30, 7);

      if (predictions.length > 1) {
        for (let i = 1; i < predictions.length; i++) {
          const current = predictions[i].metadata?.confidence || 0;
          const previous = predictions[i - 1].metadata?.confidence || 0;
          expect(current).toBeLessThanOrEqual(previous);
        }
      }
    });
  });

  describe('Caching', () => {
    beforeEach(async () => {
      const records = [
        createTestRecord(new Date('2024-01-01')),
        createTestRecord(new Date('2024-01-02'))
      ];

      for (const record of records) {
        await dataManager.storeTestSuiteRecord(record);
      }
    });

    it('should cache analysis results', async () => {
      const start1 = Date.now();
      const result1 = await trendAnalyzer.analyzeCoverageTrends(30);
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      const result2 = await trendAnalyzer.analyzeCoverageTrends(30);
      const time2 = Date.now() - start2;

      expect(result1).toEqual(result2);
      expect(time2).toBeLessThan(time1); // Second call should be faster due to caching
    });

    it('should invalidate cache after timeout', async () => {
      // Create analyzer with short cache timeout for testing
      const shortCacheAnalyzer = new (TrendAnalyzer as any)(dataManager);
      shortCacheAnalyzer.cacheTimeout = 100; // 100ms

      await shortCacheAnalyzer.analyzeCoverageTrends(30);
      
      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // This should trigger a new analysis
      const result = await shortCacheAnalyzer.analyzeCoverageTrends(30);
      expect(result).toBeDefined();
    });
  });
});

// Helper function to create test records
function createTestRecord(
  timestamp: Date,
  overrides: any = {}
): TestSuiteRecord {
  const coverage = overrides.coverage || {};
  const performance = overrides.performance || {};
  
  return {
    id: `test_${timestamp.getTime()}_${Math.random()}`,
    timestamp,
    suiteName: 'TestSuite',
    totalTests: overrides.totalTests || 100,
    passedTests: overrides.passedTests || 95,
    failedTests: overrides.failedTests || 5,
    skippedTests: 0,
    duration: overrides.duration || 30,
    coverage: {
      statements: coverage.statements || 85,
      branches: coverage.branches || 80,
      functions: coverage.functions || 90,
      lines: coverage.lines || 83
    },
    performance: {
      totalMemory: performance.totalMemory || 128,
      peakMemory: performance.peakMemory || 256,
      averageExecutionTime: performance.averageExecutionTime || 1.5
    },
    environment: {
      nodeVersion: '18.0.0',
      platform: 'linux',
      ci: true,
      branch: 'main',
      commit: 'abc123'
    },
    tests: []
  };
}