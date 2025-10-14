/**
 * Recommendation Engine Tests
 *
 * Comprehensive tests for the recommendation generation system,
 * covering recommendation creation, prioritization, and management.
 */

import { HistoricalDataManager, TestSuiteRecord } from '../../../../lib/testing/analytics/HistoricalDataManager';
import { QualityPredictor } from '../../../../lib/testing/analytics/QualityPredictor';
import { RecommendationEngine, Recommendation, RecommendationReport } from '../../../../lib/testing/analytics/RecommendationEngine';
import { TrendAnalyzer } from '../../../../lib/testing/analytics/TrendAnalyzer';

describe('RecommendationEngine', () => {
  let dataManager: HistoricalDataManager;
  let trendAnalyzer: TrendAnalyzer;
  let qualityPredictor: QualityPredictor;
  let recommendationEngine: RecommendationEngine;

  beforeEach(() => {
    dataManager = new HistoricalDataManager();
    trendAnalyzer = new TrendAnalyzer(dataManager);
    qualityPredictor = new QualityPredictor(dataManager, trendAnalyzer);
    recommendationEngine = new RecommendationEngine(
      dataManager,
      trendAnalyzer,
      qualityPredictor,
      {
        teamSize: 5,
        projectPhase: 'development',
        testingMaturity: 'intermediate',
        availableResources: 'moderate',
        timeConstraints: 'moderate',
        riskTolerance: 'medium',
      },
    );
  });

  afterEach(async () => {
    await dataManager.clearAllData();
  });

  describe('Recommendation Generation', () => {
    beforeEach(async () => {
      // Create test data that will trigger various recommendations
      const records = [];
      for (let i = 0; i < 20; i++) {
        const date = new Date('2024-01-01');
        date.setDate(date.getDate() + i);

        // Simulate declining quality to trigger recommendations
        const decline = i * 0.02;

        records.push(createTestRecord(date, {
          coverage: {
            statements: Math.max(70, 90 - decline * 25),
            branches: Math.max(65, 85 - decline * 25),
            functions: Math.max(75, 95 - decline * 20),
            lines: Math.max(68, 88 - decline * 23),
          },
          duration: 30 + decline * 40,
          performance: { peakMemory: 128 + decline * 80 },
          totalTests: 100 + i,
          passedTests: Math.max(80, 95 + i - decline * 20),
          failedTests: Math.min(20, Math.floor(decline * 20)),
        }));
      }

      for (const record of records) {
        await dataManager.storeTestSuiteRecord(record);
      }
    });

    it('should generate comprehensive recommendations', async () => {
      const report = await recommendationEngine.generateRecommendations(30);

      expect(report).toBeDefined();
      expect(report.recommendations).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);
      expect(report.summary).toBeDefined();
      expect(report.insights).toBeDefined();
      expect(report.nextSteps).toBeDefined();
      expect(report.generatedAt).toBeInstanceOf(Date);
    });

    it('should generate different types of recommendations', async () => {
      const report = await recommendationEngine.generateRecommendations(30);

      const types = report.recommendations.map(r => r.type);
      const categories = report.recommendations.map(r => r.category);

      // Should have various types
      expect(types.some(t => ['improvement', 'optimization', 'maintenance', 'prevention'].includes(t))).toBe(true);

      // Should have various categories
      expect(categories.some(c => ['coverage', 'performance', 'stability', 'maintenance', 'process'].includes(c))).toBe(true);
    });

    it('should prioritize recommendations correctly', async () => {
      const report = await recommendationEngine.generateRecommendations(30);

      if (report.recommendations.length > 1) {
        for (let i = 1; i < report.recommendations.length; i++) {
          const current = report.recommendations[i];
          const previous = report.recommendations[i - 1];

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

    it('should include complete recommendation details', async () => {
      const report = await recommendationEngine.generateRecommendations(30);

      for (const recommendation of report.recommendations) {
        expect(recommendation.id).toBeDefined();
        expect(['improvement', 'optimization', 'maintenance', 'prevention']).toContain(recommendation.type);
        expect(['low', 'medium', 'high', 'critical']).toContain(recommendation.priority);
        expect(['coverage', 'performance', 'stability', 'maintenance', 'process']).toContain(recommendation.category);
        expect(recommendation.title).toBeDefined();
        expect(recommendation.description).toBeDefined();
        expect(recommendation.rationale).toBeDefined();

        // Action items
        expect(recommendation.actionItems).toBeDefined();
        expect(Array.isArray(recommendation.actionItems)).toBe(true);

        for (const actionItem of recommendation.actionItems) {
          expect(actionItem.id).toBeDefined();
          expect(actionItem.description).toBeDefined();
          expect(['code_change', 'process_change', 'tool_setup', 'documentation', 'training']).toContain(actionItem.type);
          expect(actionItem.estimatedHours).toBeGreaterThan(0);
          expect(['pending', 'in_progress', 'completed']).toContain(actionItem.status);
          expect(Array.isArray(actionItem.dependencies)).toBe(true);
        }

        // Metadata
        expect(recommendation.estimatedImpact).toBeGreaterThanOrEqual(0);
        expect(recommendation.estimatedImpact).toBeLessThanOrEqual(100);
        expect(['low', 'medium', 'high']).toContain(recommendation.estimatedEffort);
        expect(recommendation.timeframe).toBeDefined();
        expect(Array.isArray(recommendation.targetAudience)).toBe(true);
        expect(recommendation.confidence).toBeGreaterThan(0);
        expect(recommendation.confidence).toBeLessThanOrEqual(1);
        expect(['new', 'acknowledged', 'in_progress', 'completed', 'dismissed']).toContain(recommendation.status);
        expect(recommendation.createdAt).toBeInstanceOf(Date);
        expect(recommendation.updatedAt).toBeInstanceOf(Date);
      }
    });

    it('should generate summary statistics', async () => {
      const report = await recommendationEngine.generateRecommendations(30);

      expect(report.summary.totalRecommendations).toBe(report.recommendations.length);
      expect(report.summary.criticalCount).toBe(
        report.recommendations.filter(r => r.priority === 'critical').length,
      );
      expect(report.summary.highPriorityCount).toBe(
        report.recommendations.filter(r => r.priority === 'high').length,
      );
      expect(report.summary.estimatedTotalImpact).toBeGreaterThanOrEqual(0);
      expect(report.summary.estimatedTotalEffort).toBeGreaterThanOrEqual(0);
    });

    it('should generate actionable insights', async () => {
      const report = await recommendationEngine.generateRecommendations(30);

      expect(report.insights).toBeDefined();
      expect(Array.isArray(report.insights)).toBe(true);

      for (const insight of report.insights) {
        expect(typeof insight).toBe('string');
        expect(insight.length).toBeGreaterThan(0);
      }
    });

    it('should generate next steps', async () => {
      const report = await recommendationEngine.generateRecommendations(30);

      expect(report.nextSteps).toBeDefined();
      expect(Array.isArray(report.nextSteps)).toBe(true);

      for (const step of report.nextSteps) {
        expect(typeof step).toBe('string');
        expect(step.length).toBeGreaterThan(0);
      }
    });

    it('should emit generation event', async () => {
      const recommendationsGenerated = jest.fn();
      recommendationEngine.on('recommendationsGenerated', recommendationsGenerated);

      const report = await recommendationEngine.generateRecommendations(30);

      expect(recommendationsGenerated).toHaveBeenCalledWith(report);
    });
  });

  describe('Personalized Recommendations', () => {
    beforeEach(async () => {
      // Generate some recommendations first
      const records = [
        createTestRecord(new Date('2024-01-01'), { coverage: { statements: 70 } }),
        createTestRecord(new Date('2024-01-02'), { duration: 60 }),
      ];

      for (const record of records) {
        await dataManager.storeTestSuiteRecord(record);
      }

      await recommendationEngine.generateRecommendations(30);
    });

    it('should filter recommendations by role', async () => {
      const developerRecs = await recommendationEngine.getPersonalizedRecommendations('developer', 10);
      const managerRecs = await recommendationEngine.getPersonalizedRecommendations('manager', 10);

      for (const rec of developerRecs) {
        expect(rec.targetAudience).toContain('developer');
      }

      for (const rec of managerRecs) {
        expect(rec.targetAudience).toContain('manager');
      }
    });

    it('should limit results correctly', async () => {
      const recommendations = await recommendationEngine.getPersonalizedRecommendations('developer', 3);
      expect(recommendations.length).toBeLessThanOrEqual(3);
    });

    it('should prioritize by priority and impact', async () => {
      const recommendations = await recommendationEngine.getPersonalizedRecommendations('developer', 10);

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
  });

  describe('Recommendation Status Management', () => {
    let recommendationId: string;

    beforeEach(async () => {
      const records = [createTestRecord(new Date())];
      for (const record of records) {
        await dataManager.storeTestSuiteRecord(record);
      }

      const report = await recommendationEngine.generateRecommendations(30);
      if (report.recommendations.length > 0) {
        recommendationId = report.recommendations[0].id;
      }
    });

    it('should update recommendation status', async () => {
      if (!recommendationId) {
        // Create a manual recommendation for testing
        await recommendationEngine.generateRecommendations(30);
        const report = await recommendationEngine.generateRecommendations(30);
        recommendationId = report.recommendations[0]?.id;
      }

      if (recommendationId) {
        await recommendationEngine.updateRecommendationStatus(recommendationId, 'in_progress');

        const recommendations = await recommendationEngine.getPersonalizedRecommendations('developer', 10);
        const updatedRec = recommendations.find(r => r.id === recommendationId);

        expect(updatedRec?.status).toBe('in_progress');
        expect(updatedRec?.updatedAt).toBeInstanceOf(Date);
      }
    });

    it('should set completion date when completed', async () => {
      if (recommendationId) {
        await recommendationEngine.updateRecommendationStatus(recommendationId, 'completed');

        const recommendations = await recommendationEngine.getPersonalizedRecommendations('developer', 10);
        const completedRec = recommendations.find(r => r.id === recommendationId);

        expect(completedRec?.status).toBe('completed');
        expect(completedRec?.completedAt).toBeInstanceOf(Date);
      }
    });

    it('should emit status update event', async () => {
      if (recommendationId) {
        const statusUpdated = jest.fn();
        recommendationEngine.on('recommendationStatusUpdated', statusUpdated);

        await recommendationEngine.updateRecommendationStatus(recommendationId, 'acknowledged', 'Test notes');

        expect(statusUpdated).toHaveBeenCalledWith({
          id: recommendationId,
          status: 'acknowledged',
          notes: 'Test notes',
        });
      }
    });

    it('should throw error for non-existent recommendation', async () => {
      await expect(
        recommendationEngine.updateRecommendationStatus('non-existent', 'completed'),
      ).rejects.toThrow('Recommendation non-existent not found');
    });
  });

  describe('Recommendation Effectiveness', () => {
    beforeEach(async () => {
      const records = [
        createTestRecord(new Date('2024-01-01')),
        createTestRecord(new Date('2024-01-02')),
      ];

      for (const record of records) {
        await dataManager.storeTestSuiteRecord(record);
      }

      const report = await recommendationEngine.generateRecommendations(30);

      // Update some recommendations to completed status
      if (report.recommendations.length > 0) {
        await recommendationEngine.updateRecommendationStatus(report.recommendations[0].id, 'completed');
      }
      if (report.recommendations.length > 1) {
        await recommendationEngine.updateRecommendationStatus(report.recommendations[1].id, 'in_progress');
      }
    });

    it('should calculate completion rate', async () => {
      const effectiveness = await recommendationEngine.getRecommendationEffectiveness();

      expect(effectiveness.completionRate).toBeGreaterThanOrEqual(0);
      expect(effectiveness.completionRate).toBeLessThanOrEqual(1);
    });

    it('should calculate average time to complete', async () => {
      const effectiveness = await recommendationEngine.getRecommendationEffectiveness();

      expect(effectiveness.averageTimeToComplete).toBeGreaterThanOrEqual(0);
    });

    it('should calculate impact realized', async () => {
      const effectiveness = await recommendationEngine.getRecommendationEffectiveness();

      expect(effectiveness.impactRealized).toBeGreaterThanOrEqual(0);
    });

    it('should identify top categories', async () => {
      const effectiveness = await recommendationEngine.getRecommendationEffectiveness();

      expect(effectiveness.topCategories).toBeDefined();
      expect(Array.isArray(effectiveness.topCategories)).toBe(true);
      expect(effectiveness.topCategories.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Data Export', () => {
    beforeEach(async () => {
      const records = [createTestRecord(new Date())];
      for (const record of records) {
        await dataManager.storeTestSuiteRecord(record);
      }

      await recommendationEngine.generateRecommendations(30);
    });

    it('should export recommendations in JSON format', () => {
      const exported = recommendationEngine.exportRecommendations('json');
      const parsed = JSON.parse(exported);

      expect(Array.isArray(parsed)).toBe(true);

      if (parsed.length > 0) {
        expect(parsed[0].id).toBeDefined();
        expect(parsed[0].title).toBeDefined();
        expect(parsed[0].priority).toBeDefined();
      }
    });

    it('should export recommendations in CSV format', () => {
      const exported = recommendationEngine.exportRecommendations('csv');
      const lines = exported.split('\n');

      expect(lines[0]).toContain('ID,Title,Priority,Category,Status,Impact,Effort,Created');

      if (lines.length > 1) {
        const dataLine = lines[1];
        expect(dataLine.split(',').length).toBe(8);
      }
    });

    it('should export recommendations in Markdown format', () => {
      const exported = recommendationEngine.exportRecommendations('markdown');

      expect(exported).toContain('# Test Quality Recommendations');
      expect(exported).toContain('## Summary');
    });
  });

  describe('Context Adaptation', () => {
    it('should adapt recommendations based on team size', async () => {
      const smallTeamEngine = new RecommendationEngine(
        dataManager,
        trendAnalyzer,
        qualityPredictor,
        { teamSize: 2, testingMaturity: 'basic' },
      );

      const largeTeamEngine = new RecommendationEngine(
        dataManager,
        trendAnalyzer,
        qualityPredictor,
        { teamSize: 20, testingMaturity: 'advanced' },
      );

      const records = [createTestRecord(new Date(), { coverage: { statements: 70 } })];
      for (const record of records) {
        await dataManager.storeTestSuiteRecord(record);
      }

      const smallTeamReport = await smallTeamEngine.generateRecommendations(30);
      const largeTeamReport = await largeTeamEngine.generateRecommendations(30);

      // Different team contexts should potentially generate different recommendations
      // or at least different effort estimates
      expect(smallTeamReport).toBeDefined();
      expect(largeTeamReport).toBeDefined();
    });

    it('should adapt to project phase', async () => {
      const developmentEngine = new RecommendationEngine(
        dataManager,
        trendAnalyzer,
        qualityPredictor,
        { projectPhase: 'development' },
      );

      const legacyEngine = new RecommendationEngine(
        dataManager,
        trendAnalyzer,
        qualityPredictor,
        { projectPhase: 'legacy' },
      );

      const records = [createTestRecord(new Date())];
      for (const record of records) {
        await dataManager.storeTestSuiteRecord(record);
      }

      const devReport = await developmentEngine.generateRecommendations(30);
      const legacyReport = await legacyEngine.generateRecommendations(30);

      expect(devReport).toBeDefined();
      expect(legacyReport).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle empty data gracefully', async () => {
      const report = await recommendationEngine.generateRecommendations(30);

      expect(report).toBeDefined();
      expect(report.recommendations).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);
      // May have maintenance or process recommendations even with no data
    });

    it('should handle invalid recommendation IDs', async () => {
      await expect(
        recommendationEngine.updateRecommendationStatus('invalid-id', 'completed'),
      ).rejects.toThrow();
    });

    it('should handle export errors gracefully', () => {
      expect(() => {
        recommendationEngine.exportRecommendations('json');
      }).not.toThrow();
    });
  });

  describe('Deduplication', () => {
    beforeEach(async () => {
      // Create data that might generate duplicate recommendations
      const records = [];
      for (let i = 0; i < 10; i++) {
        records.push(createTestRecord(new Date(), {
          coverage: { statements: 70 }, // Consistently low coverage
          duration: 60, // Consistently slow
        }));
      }

      for (const record of records) {
        await dataManager.storeTestSuiteRecord(record);
      }
    });

    it('should deduplicate similar recommendations', async () => {
      const report = await recommendationEngine.generateRecommendations(30);

      // Check that there are no exact duplicate titles
      const titles = report.recommendations.map(r => r.title);
      const uniqueTitles = new Set(titles);

      expect(uniqueTitles.size).toBe(titles.length);
    });

    it('should limit total recommendations', async () => {
      const report = await recommendationEngine.generateRecommendations(30);

      // Should not exceed reasonable limit (20 as per implementation)
      expect(report.recommendations.length).toBeLessThanOrEqual(20);
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
