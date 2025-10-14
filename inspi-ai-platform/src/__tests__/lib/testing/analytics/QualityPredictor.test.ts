/**
 * Quality Predictor Tests
 *
 * Comprehensive tests for the quality prediction system,
 * covering metric predictions, risk assessment, and model training.
 */

import { HistoricalDataManager, TestSuiteRecord } from '../../../../lib/testing/analytics/HistoricalDataManager';
import { QualityPredictor, QualityPrediction, RiskAssessment } from '../../../../lib/testing/analytics/QualityPredictor';
import { TrendAnalyzer } from '../../../../lib/testing/analytics/TrendAnalyzer';

describe('QualityPredictor', () => {
  let dataManager: HistoricalDataManager;
  let trendAnalyzer: TrendAnalyzer;
  let qualityPredictor: QualityPredictor;

  beforeEach(() => {
    dataManager = new HistoricalDataManager();
    trendAnalyzer = new TrendAnalyzer(dataManager);
    qualityPredictor = new QualityPredictor(dataManager, trendAnalyzer);
  });

  afterEach(async () => {
    await dataManager.clearAllData();
  });

  describe('Quality Metric Predictions', () => {
    beforeEach(async () => {
      // Create historical data for predictions
      const records = [];
      for (let i = 0; i < 30; i++) {
        const date = new Date('2024-01-01');
        date.setDate(date.getDate() + i);

        records.push(createTestRecord(date, {
          coverage: {
            statements: 85 + Math.sin(i * 0.1) * 5,
            branches: 80 + Math.sin(i * 0.1) * 5,
            functions: 90 + Math.sin(i * 0.1) * 3,
            lines: 83 + Math.sin(i * 0.1) * 4,
          },
          duration: 30 + i * 0.2 + Math.random() * 2,
          performance: { peakMemory: 128 + i * 0.5 },
          totalTests: 100 + i,
          passedTests: 95 + i - Math.floor(Math.random() * 3),
          failedTests: Math.floor(Math.random() * 5),
        }));
      }

      for (const record of records) {
        await dataManager.storeTestSuiteRecord(record);
      }
    });

    it('should predict quality metrics', async () => {
      const predictions = await qualityPredictor.predictQualityMetrics(7);

      expect(predictions).toBeDefined();
      expect(Array.isArray(predictions)).toBe(true);
      expect(predictions.length).toBeGreaterThan(0);

      const coveragePrediction = predictions.find(p => p.metric === 'coverage');
      expect(coveragePrediction).toBeDefined();
      expect(coveragePrediction?.currentValue).toBeGreaterThan(0);
      expect(coveragePrediction?.predictedValue).toBeGreaterThan(0);
      expect(coveragePrediction?.confidence).toBeGreaterThan(0);
      expect(coveragePrediction?.timeframe).toBe(7);
    });

    it('should predict all quality metrics', async () => {
      const predictions = await qualityPredictor.predictQualityMetrics();

      const expectedMetrics = ['coverage', 'passRate', 'executionTime', 'memoryUsage', 'flakiness', 'stability', 'maintainability'];
      const predictedMetrics = predictions.map(p => p.metric);

      for (const metric of expectedMetrics) {
        expect(predictedMetrics).toContain(metric);
      }
    });

    it('should determine trend direction correctly', async () => {
      const predictions = await qualityPredictor.predictQualityMetrics();

      for (const prediction of predictions) {
        expect(['improving', 'degrading', 'stable']).toContain(prediction.trend);

        if (prediction.trend === 'improving') {
          expect(prediction.predictedValue).toBeGreaterThan(prediction.currentValue);
        } else if (prediction.trend === 'degrading') {
          expect(prediction.predictedValue).toBeLessThan(prediction.currentValue);
        }
      }
    });

    it('should assess risk levels appropriately', async () => {
      const predictions = await qualityPredictor.predictQualityMetrics();

      for (const prediction of predictions) {
        expect(['low', 'medium', 'high']).toContain(prediction.riskLevel);

        if (prediction.trend === 'degrading') {
          expect(['medium', 'high']).toContain(prediction.riskLevel);
        }
      }
    });

    it('should provide quality factors', async () => {
      const predictions = await qualityPredictor.predictQualityMetrics();

      for (const prediction of predictions) {
        expect(prediction.factors).toBeDefined();
        expect(Array.isArray(prediction.factors)).toBe(true);

        for (const factor of prediction.factors) {
          expect(factor.name).toBeDefined();
          expect(factor.impact).toBeGreaterThanOrEqual(-1);
          expect(factor.impact).toBeLessThanOrEqual(1);
          expect(factor.confidence).toBeGreaterThan(0);
          expect(factor.confidence).toBeLessThanOrEqual(1);
          expect(['code', 'test', 'environment', 'process']).toContain(factor.category);
        }
      }
    });

    it('should handle insufficient data gracefully', async () => {
      await dataManager.clearAllData();

      // Add minimal data
      const record = createTestRecord(new Date());
      await dataManager.storeTestSuiteRecord(record);

      await expect(qualityPredictor.predictQualityMetrics()).rejects.toThrow('No historical data available');
    });
  });

  describe('Risk Assessment', () => {
    beforeEach(async () => {
      // Create data with some risk indicators
      const records = [];
      for (let i = 0; i < 20; i++) {
        const date = new Date('2024-01-01');
        date.setDate(date.getDate() + i);

        // Simulate degrading quality over time
        const degradationFactor = i * 0.02;

        records.push(createTestRecord(date, {
          coverage: {
            statements: Math.max(70, 90 - degradationFactor * 20),
            branches: Math.max(65, 85 - degradationFactor * 20),
            functions: Math.max(75, 95 - degradationFactor * 15),
            lines: Math.max(68, 88 - degradationFactor * 18),
          },
          duration: 30 + degradationFactor * 20,
          performance: { peakMemory: 128 + degradationFactor * 50 },
          totalTests: 100 + i,
          passedTests: Math.max(80, 95 + i - degradationFactor * 15),
          failedTests: Math.min(20, Math.floor(degradationFactor * 15)),
        }));
      }

      for (const record of records) {
        await dataManager.storeTestSuiteRecord(record);
      }
    });

    it('should assess overall quality risk', async () => {
      const riskAssessment = await qualityPredictor.assessQualityRisk(30);

      expect(riskAssessment).toBeDefined();
      expect(['low', 'medium', 'high']).toContain(riskAssessment.overallRisk);
      expect(riskAssessment.riskScore).toBeGreaterThanOrEqual(0);
      expect(riskAssessment.riskScore).toBeLessThanOrEqual(100);
    });

    it('should identify critical areas', async () => {
      const riskAssessment = await qualityPredictor.assessQualityRisk(30);

      expect(riskAssessment.criticalAreas).toBeDefined();
      expect(Array.isArray(riskAssessment.criticalAreas)).toBe(true);

      if (riskAssessment.overallRisk === 'high') {
        expect(riskAssessment.criticalAreas.length).toBeGreaterThan(0);
      }
    });

    it('should provide predictions in risk assessment', async () => {
      const riskAssessment = await qualityPredictor.assessQualityRisk(30);

      expect(riskAssessment.predictions).toBeDefined();
      expect(Array.isArray(riskAssessment.predictions)).toBe(true);
      expect(riskAssessment.predictions.length).toBeGreaterThan(0);
    });

    it('should generate recommendations', async () => {
      const riskAssessment = await qualityPredictor.assessQualityRisk(30);

      expect(riskAssessment.recommendations).toBeDefined();
      expect(Array.isArray(riskAssessment.recommendations)).toBe(true);

      for (const recommendation of riskAssessment.recommendations) {
        expect(['low', 'medium', 'high', 'critical']).toContain(recommendation.priority);
        expect(['coverage', 'performance', 'stability', 'maintenance']).toContain(recommendation.category);
        expect(recommendation.title).toBeDefined();
        expect(recommendation.description).toBeDefined();
        expect(recommendation.actionItems).toBeDefined();
        expect(Array.isArray(recommendation.actionItems)).toBe(true);
      }
    });

    it('should calculate time to action', async () => {
      const riskAssessment = await qualityPredictor.assessQualityRisk(30);

      expect(riskAssessment.timeToAction).toBeDefined();
      expect(riskAssessment.timeToAction).toBeGreaterThan(0);

      if (riskAssessment.overallRisk === 'high') {
        expect(riskAssessment.timeToAction).toBeLessThan(30);
      }
    });
  });

  describe('Quality Factor Identification', () => {
    beforeEach(async () => {
      const records = [];
      for (let i = 0; i < 15; i++) {
        const date = new Date('2024-01-01');
        date.setDate(date.getDate() + i);

        records.push(createTestRecord(date, {
          coverage: { statements: 85 + Math.random() * 10 },
          duration: 30 + Math.random() * 10,
          totalTests: 100 + i * 2,
          passedTests: 95 + i * 2 - Math.floor(Math.random() * 3),
        }));
      }

      for (const record of records) {
        await dataManager.storeTestSuiteRecord(record);
      }
    });

    it('should identify quality factors for coverage', async () => {
      const factors = await qualityPredictor.identifyQualityFactors('coverage');

      expect(factors).toBeDefined();
      expect(Array.isArray(factors)).toBe(true);

      for (const factor of factors) {
        expect(factor.name).toBeDefined();
        expect(factor.impact).toBeGreaterThanOrEqual(-1);
        expect(factor.impact).toBeLessThanOrEqual(1);
        expect(factor.confidence).toBeGreaterThan(0);
        expect(factor.description).toBeDefined();
        expect(['code', 'test', 'environment', 'process']).toContain(factor.category);
      }
    });

    it('should sort factors by impact', async () => {
      const factors = await qualityPredictor.identifyQualityFactors('passRate');

      if (factors.length > 1) {
        for (let i = 1; i < factors.length; i++) {
          const currentImpact = Math.abs(factors[i].impact);
          const previousImpact = Math.abs(factors[i - 1].impact);
          expect(previousImpact).toBeGreaterThanOrEqual(currentImpact);
        }
      }
    });

    it('should handle unknown metrics gracefully', async () => {
      const factors = await qualityPredictor.identifyQualityFactors('unknownMetric' as any);
      expect(factors).toHaveLength(0);
    });
  });

  describe('Model Training and Validation', () => {
    beforeEach(async () => {
      // Create sufficient training data
      const records = [];
      for (let i = 0; i < 50; i++) {
        const date = new Date('2024-01-01');
        date.setDate(date.getDate() + i);

        records.push(createTestRecord(date, {
          coverage: { statements: 80 + Math.random() * 15 },
          duration: 25 + Math.random() * 15,
          performance: { peakMemory: 120 + Math.random() * 60 },
          totalTests: 95 + Math.floor(Math.random() * 20),
          passedTests: 90 + Math.floor(Math.random() * 15),
        }));
      }

      for (const record of records) {
        await dataManager.storeTestSuiteRecord(record);
      }
    });

    it('should train models with sufficient data', async () => {
      await expect(qualityPredictor.trainModels(90)).resolves.not.toThrow();
    });

    it('should reject training with insufficient data', async () => {
      await dataManager.clearAllData();

      // Add only a few records
      for (let i = 0; i < 5; i++) {
        const record = createTestRecord(new Date());
        await dataManager.storeTestSuiteRecord(record);
      }

      await expect(qualityPredictor.trainModels(90)).rejects.toThrow('Insufficient data for model training');
    });

    it('should emit training completion event', async () => {
      const modelsRetrained = jest.fn();
      qualityPredictor.on('modelsRetrained', modelsRetrained);

      await qualityPredictor.trainModels(90);

      expect(modelsRetrained).toHaveBeenCalledWith({
        recordCount: expect.any(Number),
        timeframe: 90,
        models: expect.any(Array),
      });
    });

    it('should validate model accuracy', async () => {
      await qualityPredictor.trainModels(90);

      const accuracies = await qualityPredictor.validateModels(14);

      expect(accuracies).toBeDefined();
      expect(typeof accuracies).toBe('object');

      for (const [metric, accuracy] of Object.entries(accuracies)) {
        expect(typeof accuracy).toBe('number');
        expect(accuracy).toBeGreaterThan(0);
        expect(accuracy).toBeLessThanOrEqual(1);
      }
    });

    it('should provide model statistics', async () => {
      await qualityPredictor.trainModels(90);

      const stats = qualityPredictor.getModelStats();

      expect(stats).toBeDefined();
      expect(typeof stats).toBe('object');

      for (const [metric, modelStats] of Object.entries(stats)) {
        expect(modelStats.accuracy).toBeDefined();
        expect(modelStats.lastTrained).toBeInstanceOf(Date);
        expect(modelStats.version).toBeDefined();
        expect(modelStats.featureCount).toBeGreaterThan(0);
      }
    });
  });

  describe('Recommendation Generation', () => {
    beforeEach(async () => {
      // Create data that will trigger recommendations
      const records = [];
      for (let i = 0; i < 20; i++) {
        const date = new Date('2024-01-01');
        date.setDate(date.getDate() + i);

        // Simulate declining quality
        const decline = i * 0.01;

        records.push(createTestRecord(date, {
          coverage: { statements: Math.max(70, 90 - decline * 20) },
          duration: 30 + decline * 30,
          performance: { peakMemory: 128 + decline * 100 },
          totalTests: 100,
          passedTests: Math.max(80, 95 - decline * 15),
        }));
      }

      for (const record of records) {
        await dataManager.storeTestSuiteRecord(record);
      }
    });

    it('should generate quality recommendations', async () => {
      const recommendations = await qualityPredictor.generateQualityRecommendations();

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);

      for (const recommendation of recommendations) {
        expect(['low', 'medium', 'high', 'critical']).toContain(recommendation.priority);
        expect(['coverage', 'performance', 'stability', 'maintenance']).toContain(recommendation.category);
        expect(recommendation.title).toBeDefined();
        expect(recommendation.description).toBeDefined();
        expect(recommendation.actionItems).toBeDefined();
        expect(Array.isArray(recommendation.actionItems)).toBe(true);
        expect(recommendation.estimatedImpact).toBeGreaterThanOrEqual(0);
        expect(recommendation.estimatedImpact).toBeLessThanOrEqual(100);
        expect(['low', 'medium', 'high']).toContain(recommendation.estimatedEffort);
      }
    });

    it('should sort recommendations by priority and impact', async () => {
      const recommendations = await qualityPredictor.generateQualityRecommendations();

      if (recommendations.length > 1) {
        for (let i = 1; i < recommendations.length; i++) {
          const current = recommendations[i];
          const previous = recommendations[i - 1];

          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          const currentPriority = priorityOrder[current.priority];
          const previousPriority = priorityOrder[previous.priority];

          if (previousPriority !== currentPriority) {
            expect(previousPriority).toBeGreaterThanOrEqual(currentPriority);
          } else {
            expect(previous.estimatedImpact).toBeGreaterThanOrEqual(current.estimatedImpact);
          }
        }
      }
    });

    it('should generate recommendations from predictions', async () => {
      const predictions = await qualityPredictor.predictQualityMetrics();
      const recommendations = await qualityPredictor.generateQualityRecommendations(predictions);

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);

      // Should have recommendations for high-risk predictions
      const highRiskPredictions = predictions.filter(p => p.riskLevel === 'high');
      if (highRiskPredictions.length > 0) {
        expect(recommendations.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Caching', () => {
    beforeEach(async () => {
      const records = [
        createTestRecord(new Date('2024-01-01')),
        createTestRecord(new Date('2024-01-02')),
      ];

      for (const record of records) {
        await dataManager.storeTestSuiteRecord(record);
      }
    });

    it('should cache prediction results', async () => {
      const start1 = Date.now();
      const result1 = await qualityPredictor.predictQualityMetrics();
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      const result2 = await qualityPredictor.predictQualityMetrics();
      const time2 = Date.now() - start2;

      expect(result1).toEqual(result2);
      expect(time2).toBeLessThan(time1); // Second call should be faster
    });

    it('should cache risk assessment results', async () => {
      const start1 = Date.now();
      const result1 = await qualityPredictor.assessQualityRisk();
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      const result2 = await qualityPredictor.assessQualityRisk();
      const time2 = Date.now() - start2;

      expect(result1).toEqual(result2);
      expect(time2).toBeLessThan(time1);
    });
  });

  describe('Error Handling', () => {
    it('should handle empty data gracefully', async () => {
      await expect(qualityPredictor.predictQualityMetrics()).rejects.toThrow();
    });

    it('should handle invalid metric names', async () => {
      const factors = await qualityPredictor.identifyQualityFactors('invalidMetric' as any);
      expect(factors).toHaveLength(0);
    });

    it('should handle model training errors', async () => {
      // Try to train with no data
      await expect(qualityPredictor.trainModels(90)).rejects.toThrow();
    });
  });
});

// Helper function to create test records
function createTestRecord(
  timestamp: Date,
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
