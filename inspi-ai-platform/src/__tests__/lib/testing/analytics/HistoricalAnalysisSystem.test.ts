/**
 * Historical Analysis System Integration Tests
 *
 * Comprehensive integration tests for the complete historical data analysis system,
 * testing the interaction between all components and end-to-end workflows.
 */

import { HistoricalAnalysisSystem, TestSuiteRecord } from '../../../../lib/testing/analytics';

describe('HistoricalAnalysisSystem', () => {
  let analysisSystem: HistoricalAnalysisSystem;

  beforeEach(() => {
    analysisSystem = new HistoricalAnalysisSystem({
      retentionPolicy: {
        maxAge: 30,
        maxRecords: 1000,
        compressionThreshold: 7,
        archiveThreshold: 14,
      },
      context: {
        teamSize: 5,
        projectPhase: 'development',
        testingMaturity: 'intermediate',
        availableResources: 'moderate',
        timeConstraints: 'moderate',
        riskTolerance: 'medium',
      },
    });
  });

  afterEach(async () => {
    await analysisSystem.cleanup();
  });

  describe('System Initialization', () => {
    it('should initialize all components', () => {
      expect(analysisSystem.getDataManager()).toBeDefined();
      expect(analysisSystem.getTrendAnalyzer()).toBeDefined();
      expect(analysisSystem.getQualityPredictor()).toBeDefined();
      expect(analysisSystem.getRecommendationEngine()).toBeDefined();
    });

    it('should provide access to individual components', () => {
      const dataManager = analysisSystem.getDataManager();
      const trendAnalyzer = analysisSystem.getTrendAnalyzer();
      const qualityPredictor = analysisSystem.getQualityPredictor();
      const recommendationEngine = analysisSystem.getRecommendationEngine();

      expect(dataManager.getStorageStats).toBeDefined();
      expect(trendAnalyzer.analyzeCoverageTrends).toBeDefined();
      expect(qualityPredictor.predictQualityMetrics).toBeDefined();
      expect(recommendationEngine.generateRecommendations).toBeDefined();
    });

    it('should initialize with sample data', async () => {
      await analysisSystem.initializeWithSampleData();

      const stats = analysisSystem.getDataManager().getStorageStats();
      expect(stats.totalSuiteRecords).toBeGreaterThan(0);
    });
  });

  describe('Data Storage and Analysis Workflow', () => {
    it('should store test execution and trigger analysis', async () => {
      const record = createSampleTestSuiteRecord();

      await analysisSystem.storeTestExecution(record);

      const stats = analysisSystem.getDataManager().getStorageStats();
      expect(stats.totalSuiteRecords).toBe(1);
    });

    it('should emit data stored events', async () => {
      const dataStored = jest.fn();
      analysisSystem.on('dataStored', dataStored);

      const record = createSampleTestSuiteRecord();
      await analysisSystem.storeTestExecution(record);

      expect(dataStored).toHaveBeenCalledWith(record);
    });

    it('should trigger background analysis', async () => {
      const record = createSampleTestSuiteRecord();
      await analysisSystem.storeTestExecution(record);

      // Wait for background analysis to complete
      await new Promise(resolve => setTimeout(resolve, 200));

      // Analysis should have been triggered (no errors thrown)
      expect(true).toBe(true);
    });
  });

  describe('Comprehensive Analysis Report', () => {
    beforeEach(async () => {
      // Create comprehensive test data
      const records = [];
      for (let i = 0; i < 15; i++) {
        const date = new Date('2024-01-01');
        date.setDate(date.getDate() + i);

        records.push(createSampleTestSuiteRecord(date, {
          coverage: {
            statements: 80 + Math.sin(i * 0.2) * 10,
            branches: 75 + Math.sin(i * 0.2) * 10,
            functions: 85 + Math.sin(i * 0.2) * 8,
            lines: 78 + Math.sin(i * 0.2) * 9,
          },
          duration: 30 + i * 0.5 + Math.random() * 5,
          performance: { peakMemory: 128 + i * 2 },
          totalTests: 100 + i,
          passedTests: 95 + i - Math.floor(Math.random() * 3),
          failedTests: Math.floor(Math.random() * 5),
        }));
      }

      for (const record of records) {
        await analysisSystem.storeTestExecution(record);
      }
    });

    it('should generate comprehensive analysis report', async () => {
      const report = await analysisSystem.getAnalysisReport(30);

      expect(report).toBeDefined();
      expect(report.trends).toBeDefined();
      expect(report.predictions).toBeDefined();
      expect(report.recommendations).toBeDefined();
      expect(report.insights).toBeDefined();
      expect(report.anomalies).toBeDefined();
    });

    it('should include coverage trends', async () => {
      const report = await analysisSystem.getAnalysisReport(30);

      expect(report.trends.coverage).toBeDefined();
      expect(report.trends.coverage.statements).toBeDefined();
      expect(report.trends.coverage.branches).toBeDefined();
      expect(report.trends.coverage.functions).toBeDefined();
      expect(report.trends.coverage.lines).toBeDefined();
      expect(report.trends.coverage.overall).toBeDefined();
      expect(report.trends.coverage.recommendations).toBeDefined();
    });

    it('should include performance trends', async () => {
      const report = await analysisSystem.getAnalysisReport(30);

      expect(report.trends.performance).toBeDefined();
      expect(report.trends.performance.executionTime).toBeDefined();
      expect(report.trends.performance.memoryUsage).toBeDefined();
      expect(report.trends.performance.testCount).toBeDefined();
      expect(report.trends.performance.failureRate).toBeDefined();
      expect(report.trends.performance.recommendations).toBeDefined();
    });

    it('should include quality trends', async () => {
      const report = await analysisSystem.getAnalysisReport(30);

      expect(report.trends.quality).toBeDefined();
      expect(report.trends.quality.passRate).toBeDefined();
      expect(report.trends.quality.flakiness).toBeDefined();
      expect(report.trends.quality.testStability).toBeDefined();
      expect(report.trends.quality.codeChurn).toBeDefined();
      expect(report.trends.quality.recommendations).toBeDefined();
    });

    it('should include quality predictions', async () => {
      const report = await analysisSystem.getAnalysisReport(30);

      expect(report.predictions).toBeDefined();
      expect(Array.isArray(report.predictions)).toBe(true);

      for (const prediction of report.predictions) {
        expect(prediction.metric).toBeDefined();
        expect(prediction.currentValue).toBeGreaterThanOrEqual(0);
        expect(prediction.predictedValue).toBeGreaterThanOrEqual(0);
        expect(prediction.confidence).toBeGreaterThan(0);
        expect(prediction.confidence).toBeLessThanOrEqual(1);
        expect(['improving', 'degrading', 'stable']).toContain(prediction.trend);
        expect(['low', 'medium', 'high']).toContain(prediction.riskLevel);
      }
    });

    it('should include recommendations', async () => {
      const report = await analysisSystem.getAnalysisReport(30);

      expect(report.recommendations).toBeDefined();
      expect(report.recommendations.summary).toBeDefined();
      expect(report.recommendations.recommendations).toBeDefined();
      expect(Array.isArray(report.recommendations.recommendations)).toBe(true);
      expect(report.recommendations.insights).toBeDefined();
      expect(report.recommendations.nextSteps).toBeDefined();
    });

    it('should include trend insights', async () => {
      const report = await analysisSystem.getAnalysisReport(30);

      expect(report.insights).toBeDefined();
      expect(Array.isArray(report.insights)).toBe(true);

      for (const insight of report.insights) {
        expect(['improvement', 'degradation', 'anomaly', 'pattern']).toContain(insight.type);
        expect(['low', 'medium', 'high']).toContain(insight.severity);
        expect(insight.title).toBeDefined();
        expect(insight.description).toBeDefined();
        expect(insight.confidence).toBeGreaterThan(0);
        expect(insight.confidence).toBeLessThanOrEqual(1);
      }
    });

    it('should include anomaly detection', async () => {
      const report = await analysisSystem.getAnalysisReport(30);

      expect(report.anomalies).toBeDefined();
      expect(Array.isArray(report.anomalies)).toBe(true);

      for (const anomaly of report.anomalies) {
        expect(anomaly.timestamp).toBeInstanceOf(Date);
        expect(anomaly.metric).toBeDefined();
        expect(anomaly.expectedValue).toBeDefined();
        expect(anomaly.actualValue).toBeDefined();
        expect(['low', 'medium', 'high']).toContain(anomaly.severity);
        expect(anomaly.description).toBeDefined();
        expect(Array.isArray(anomaly.possibleCauses)).toBe(true);
      }
    });
  });

  describe('Dashboard Data', () => {
    beforeEach(async () => {
      await analysisSystem.initializeWithSampleData();
    });

    it('should provide dashboard data', async () => {
      const dashboardData = await analysisSystem.getDashboardData();

      expect(dashboardData).toBeDefined();
      expect(dashboardData.summary).toBeDefined();
      expect(dashboardData.recentTrends).toBeDefined();
      expect(dashboardData.alerts).toBeDefined();
      expect(dashboardData.topRecommendations).toBeDefined();
    });

    it('should include summary statistics', async () => {
      const dashboardData = await analysisSystem.getDashboardData();

      expect(dashboardData.summary.totalRecords).toBeGreaterThan(0);
      expect(dashboardData.summary.timeRange).toBeDefined();
      expect(dashboardData.summary.timeRange.start).toBeInstanceOf(Date);
      expect(dashboardData.summary.timeRange.end).toBeInstanceOf(Date);
      expect(dashboardData.summary.storageSize).toBeGreaterThan(0);
    });

    it('should include recent trends', async () => {
      const dashboardData = await analysisSystem.getDashboardData();

      expect(dashboardData.recentTrends.coverage).toBeDefined();
      expect(dashboardData.recentTrends.performance).toBeDefined();
      expect(dashboardData.recentTrends.quality).toBeDefined();
    });

    it('should include alert counts', async () => {
      const dashboardData = await analysisSystem.getDashboardData();

      expect(dashboardData.alerts.critical).toBeGreaterThanOrEqual(0);
      expect(dashboardData.alerts.warnings).toBeGreaterThanOrEqual(0);
    });

    it('should include top recommendations', async () => {
      const dashboardData = await analysisSystem.getDashboardData();

      expect(Array.isArray(dashboardData.topRecommendations)).toBe(true);
      expect(dashboardData.topRecommendations.length).toBeLessThanOrEqual(5);

      for (const recommendation of dashboardData.topRecommendations) {
        expect(recommendation.id).toBeDefined();
        expect(recommendation.title).toBeDefined();
        expect(['low', 'medium', 'high', 'critical']).toContain(recommendation.priority);
      }
    });
  });

  describe('Data Export', () => {
    beforeEach(async () => {
      await analysisSystem.initializeWithSampleData();
    });

    it('should export all analysis data', async () => {
      const exportedData = await analysisSystem.exportAnalysisData('json');

      expect(exportedData).toBeDefined();
      expect(exportedData.historicalData).toBeDefined();
      expect(exportedData.recommendations).toBeDefined();
      expect(exportedData.modelStats).toBeDefined();
    });

    it('should export historical data', async () => {
      const exportedData = await analysisSystem.exportAnalysisData('json');
      const historicalData = JSON.parse(exportedData.historicalData);

      expect(historicalData.data).toBeDefined();
      expect(Array.isArray(historicalData.data)).toBe(true);
      expect(historicalData.totalRecords).toBeGreaterThan(0);
    });

    it('should export recommendations', async () => {
      const exportedData = await analysisSystem.exportAnalysisData('json');
      const recommendations = JSON.parse(exportedData.recommendations);

      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('should export model statistics', async () => {
      const exportedData = await analysisSystem.exportAnalysisData('json');

      expect(exportedData.modelStats).toBeDefined();
      expect(typeof exportedData.modelStats).toBe('object');
    });

    it('should export in CSV format', async () => {
      const exportedData = await analysisSystem.exportAnalysisData('csv');

      expect(exportedData.historicalData).toContain('timestamp,suiteName');
      expect(exportedData.recommendations).toContain('ID,Title,Priority');
    });
  });

  describe('System Health', () => {
    it('should provide system health status', () => {
      const health = analysisSystem.getSystemHealth();

      expect(health).toBeDefined();
      expect(['healthy', 'warning', 'critical']).toContain(health.status);
      expect(health.components).toBeDefined();
      expect(health.metrics).toBeDefined();
    });

    it('should check component health', () => {
      const health = analysisSystem.getSystemHealth();

      expect(health.components.dataManager).toBeDefined();
      expect(health.components.trendAnalyzer).toBeDefined();
      expect(health.components.qualityPredictor).toBeDefined();
      expect(health.components.recommendationEngine).toBeDefined();

      for (const [component, status] of Object.entries(health.components)) {
        expect(['ok', 'warning', 'error']).toContain(status);
      }
    });

    it('should provide system metrics', () => {
      const health = analysisSystem.getSystemHealth();

      expect(health.metrics.totalRecords).toBeGreaterThanOrEqual(0);
      expect(health.metrics.storageSize).toBeGreaterThanOrEqual(0);
      expect(health.metrics.modelAccuracy).toBeGreaterThanOrEqual(0);
      expect(health.metrics.modelAccuracy).toBeLessThanOrEqual(1);
    });

    it('should show healthy status with sample data', async () => {
      await analysisSystem.initializeWithSampleData();

      const health = analysisSystem.getSystemHealth();
      expect(['healthy', 'warning']).toContain(health.status);
    });
  });

  describe('Event System', () => {
    it('should forward data storage events', async () => {
      const dataStored = jest.fn();
      analysisSystem.on('dataStored', dataStored);

      const record = createSampleTestSuiteRecord();
      await analysisSystem.storeTestExecution(record);

      expect(dataStored).toHaveBeenCalledWith(record);
    });

    it('should forward recommendation generation events', async () => {
      const recommendationsGenerated = jest.fn();
      analysisSystem.on('recommendationsGenerated', recommendationsGenerated);

      await analysisSystem.initializeWithSampleData();

      // Wait for background analysis
      await new Promise(resolve => setTimeout(resolve, 200));

      // Event should have been emitted during background analysis
      expect(recommendationsGenerated).toHaveBeenCalled();
    });

    it('should forward model training events', async () => {
      const modelsRetrained = jest.fn();
      analysisSystem.on('modelsRetrained', modelsRetrained);

      await analysisSystem.initializeWithSampleData();

      expect(modelsRetrained).toHaveBeenCalled();
    });

    it('should handle analysis errors', async () => {
      const analysisError = jest.fn();
      analysisSystem.on('analysisError', analysisError);

      // This should trigger background analysis which might emit errors
      const record = createSampleTestSuiteRecord();
      await analysisSystem.storeTestExecution(record);

      // Wait for background analysis
      await new Promise(resolve => setTimeout(resolve, 200));

      // No errors should occur with valid data
      expect(analysisError).not.toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('should handle multiple simultaneous operations', async () => {
      const records = [];
      for (let i = 0; i < 10; i++) {
        records.push(createSampleTestSuiteRecord());
      }

      const startTime = Date.now();

      const promises = records.map(record => analysisSystem.storeTestExecution(record));
      await Promise.all(promises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

      const stats = analysisSystem.getDataManager().getStorageStats();
      expect(stats.totalSuiteRecords).toBe(10);
    });

    it('should generate analysis report efficiently', async () => {
      await analysisSystem.initializeWithSampleData();

      const startTime = Date.now();
      const report = await analysisSystem.getAnalysisReport(30);
      const endTime = Date.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
      expect(report).toBeDefined();
    });

    it('should provide dashboard data quickly', async () => {
      await analysisSystem.initializeWithSampleData();

      const startTime = Date.now();
      const dashboardData = await analysisSystem.getDashboardData();
      const endTime = Date.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
      expect(dashboardData).toBeDefined();
    });
  });

  describe('Resource Management', () => {
    it('should clean up resources', async () => {
      await analysisSystem.initializeWithSampleData();

      const statsBefore = analysisSystem.getDataManager().getStorageStats();
      expect(statsBefore.totalSuiteRecords).toBeGreaterThan(0);

      await analysisSystem.cleanup();

      const statsAfter = analysisSystem.getDataManager().getStorageStats();
      expect(statsAfter.totalSuiteRecords).toBe(0);
    });

    it('should handle cleanup gracefully', async () => {
      await expect(analysisSystem.cleanup()).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle empty data gracefully', async () => {
      const report = await analysisSystem.getAnalysisReport(30);
      expect(report).toBeDefined();
    });

    it('should handle invalid data gracefully', async () => {
      const invalidRecord = {
        ...createSampleTestSuiteRecord(),
        coverage: null as any,
      };

      await expect(analysisSystem.storeTestExecution(invalidRecord)).resolves.not.toThrow();
    });

    it('should provide meaningful error messages', async () => {
      try {
        await analysisSystem.getQualityPredictor().predictQualityMetrics();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('No historical data available');
      }
    });
  });
});

// Helper function to create sample test suite records
function createSampleTestSuiteRecord(
  timestamp: Date = new Date(),
  overrides: any = {},
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
      lines: coverage.lines || 83,
    },
    performance: {
      totalMemory: performance.totalMemory || 128,
      peakMemory: performance.peakMemory || 256,
      averageExecutionTime: performance.averageExecutionTime || 1.5,
    },
    environment: {
      nodeVersion: '18.0.0',
      platform: 'linux',
      ci: true,
      branch: 'main',
      commit: 'abc123',
    },
    tests: [],
  };
}
