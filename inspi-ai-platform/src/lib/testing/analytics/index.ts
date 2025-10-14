/**
 * Historical Data Analysis System
 *
 * Comprehensive system for analyzing test execution history, identifying trends,
 * predicting quality metrics, and generating actionable recommendations for
 * continuous improvement of test quality and effectiveness.
 */

export {
  HistoricalDataManager,
  type TestExecutionRecord,
  type TestSuiteRecord,
  type DataRetentionPolicy,
  type QueryOptions,
  type AggregationOptions,
} from './HistoricalDataManager';

export {
  TrendAnalyzer,
  type TrendPoint,
  type TrendAnalysis,
  type CoverageTrend,
  type PerformanceTrend,
  type QualityTrend,
  type SeasonalPattern,
  type Anomaly,
  type TrendInsight,
} from './TrendAnalyzer';

export {
  QualityPredictor,
  type QualityMetrics,
  type QualityPrediction,
  type QualityFactor,
  type RiskAssessment,
  type QualityRecommendation,
  type ModelFeatures,
  type PredictionModel,
} from './QualityPredictor';

export {
  RecommendationEngine,
  type Recommendation,
  type ActionItem,
  type SupportingData,
  type RecommendationContext,
  type RecommendationTemplate,
  type RecommendationTrigger,
  type RecommendationReport,
} from './RecommendationEngine';

// Import the classes for internal use
import { HistoricalDataManager } from './HistoricalDataManager';
import { QualityPredictor } from './QualityPredictor';
import { RecommendationEngine } from './RecommendationEngine';
import { TrendAnalyzer } from './TrendAnalyzer';

/**
 * Integrated Historical Data Analysis System
 *
 * Provides a unified interface for all historical data analysis capabilities
 * including data management, trend analysis, quality prediction, and
 * recommendation generation.
 */
export class HistoricalAnalysisSystem {
  private dataManager: HistoricalDataManager;
  private trendAnalyzer: TrendAnalyzer;
  private qualityPredictor: QualityPredictor;
  private recommendationEngine: RecommendationEngine;

  constructor(options?: {
    retentionPolicy?: Partial<DataRetentionPolicy>;
    context?: Partial<RecommendationContext>;
  }) {
    // Initialize core components
    this.dataManager = new HistoricalDataManager(options?.retentionPolicy);
    this.trendAnalyzer = new TrendAnalyzer(this.dataManager);
    this.qualityPredictor = new QualityPredictor(this.dataManager, this.trendAnalyzer);
    this.recommendationEngine = new RecommendationEngine(
      this.dataManager,
      this.trendAnalyzer,
      this.qualityPredictor,
      options?.context,
    );

    // Set up event forwarding
    this.setupEventForwarding();
  }

  /**
   * Get the historical data manager
   */
  getDataManager(): HistoricalDataManager {
    return this.dataManager;
  }

  /**
   * Get the trend analyzer
   */
  getTrendAnalyzer(): TrendAnalyzer {
    return this.trendAnalyzer;
  }

  /**
   * Get the quality predictor
   */
  getQualityPredictor(): QualityPredictor {
    return this.qualityPredictor;
  }

  /**
   * Get the recommendation engine
   */
  getRecommendationEngine(): RecommendationEngine {
    return this.recommendationEngine;
  }

  /**
   * Store test execution data and trigger analysis
   */
  async storeTestExecution(record: TestSuiteRecord): Promise<void> {
    await this.dataManager.storeTestSuiteRecord(record);

    // Trigger background analysis
    this.triggerBackgroundAnalysis();
  }

  /**
   * Get comprehensive analysis report
   */
  async getAnalysisReport(days: number = 30): Promise<{
    trends: {
      coverage: CoverageTrend;
      performance: PerformanceTrend;
      quality: QualityTrend;
    };
    predictions: QualityPrediction[];
    recommendations: RecommendationReport;
    insights: TrendInsight[];
    anomalies: Anomaly[];
  }> {
    // Run all analyses in parallel
    const [
      coverageTrends,
      performanceTrends,
      qualityTrends,
      predictions,
      recommendations,
      insights,
      anomalies,
    ] = await Promise.all([
      this.trendAnalyzer.analyzeCoverageTrends(days),
      this.trendAnalyzer.analyzePerformanceTrends(days),
      this.trendAnalyzer.analyzeQualityTrends(days),
      this.qualityPredictor.predictQualityMetrics(),
      this.recommendationEngine.generateRecommendations(days),
      this.trendAnalyzer.generateTrendInsights(days),
      this.trendAnalyzer.detectAnomalies(days),
    ]);

    return {
      trends: {
        coverage: coverageTrends,
        performance: performanceTrends,
        quality: qualityTrends,
      },
      predictions,
      recommendations,
      insights,
      anomalies,
    };
  }

  /**
   * Get dashboard data for real-time monitoring
   */
  async getDashboardData(): Promise<{
    summary: {
      totalRecords: number;
      timeRange: { start: Date | null; end: Date | null };
      storageSize: number;
    };
    recentTrends: {
      coverage: number;
      performance: number;
      quality: number;
    };
    alerts: {
      critical: number;
      warnings: number;
    };
    topRecommendations: Recommendation[];
  }> {
    const stats = this.dataManager.getStorageStats();
    const recentRecommendations = await this.recommendationEngine.generateRecommendations(7);

    // Get recent trends (simplified)
    const recentRecords = await this.dataManager.queryTestSuiteRecords(undefined, {
      limit: 10,
      sortBy: 'timestamp',
      sortOrder: 'desc',
    });

    const recentTrends = { coverage: 0, performance: 0, quality: 0 };
    if (recentRecords.length >= 2) {
      const latest = recentRecords[0];
      const previous = recentRecords[1];

      const latestCoverage = (latest.coverage.statements + latest.coverage.branches +
                             latest.coverage.functions + latest.coverage.lines) / 4;
      const previousCoverage = (previous.coverage.statements + previous.coverage.branches +
                               previous.coverage.functions + previous.coverage.lines) / 4;

      recentTrends.coverage = latestCoverage - previousCoverage;
      recentTrends.performance = (previous.duration - latest.duration) / previous.duration;
      recentTrends.quality = (latest.passedTests / latest.totalTests) -
                            (previous.passedTests / previous.totalTests);
    }

    const criticalCount = recentRecommendations.recommendations.filter(r => r.priority === 'critical').length;
    const warningCount = recentRecommendations.recommendations.filter(r => r.priority === 'high').length;

    return {
      summary: {
        totalRecords: stats.totalSuiteRecords,
        timeRange: {
          start: stats.oldestRecord,
          end: stats.newestRecord,
        },
        storageSize: stats.storageSize,
      },
      recentTrends,
      alerts: {
        critical: criticalCount,
        warnings: warningCount,
      },
      topRecommendations: recentRecommendations.recommendations.slice(0, 5),
    };
  }

  /**
   * Initialize the system with sample data for testing
   */
  async initializeWithSampleData(): Promise<void> {
    const sampleRecords = this.generateSampleData();

    for (const record of sampleRecords) {
      await this.dataManager.storeTestSuiteRecord(record);
    }

    // Train models with sample data
    await this.qualityPredictor.trainModels(30);
  }

  /**
   * Export all analysis data
   */
  async exportAnalysisData(format: 'json' | 'csv' = 'json'): Promise<{
    historicalData: string;
    recommendations: string;
    modelStats: Record<string, any>;
  }> {
    const historicalData = await this.dataManager.exportData(format);
    const recommendations = this.recommendationEngine.exportRecommendations(format);
    const modelStats = this.qualityPredictor.getModelStats();

    return {
      historicalData,
      recommendations,
      modelStats,
    };
  }

  /**
   * Get system health status
   */
  getSystemHealth(): {
    status: 'healthy' | 'warning' | 'critical';
    components: Record<string, 'ok' | 'warning' | 'error'>;
    metrics: Record<string, number>;
    lastAnalysis: Date | null;
  } {
    const stats = this.dataManager.getStorageStats();
    const modelStats = this.qualityPredictor.getModelStats();

    // Check component health
    const components = {
      dataManager: stats.totalSuiteRecords > 0 ? 'ok' : 'warning',
      trendAnalyzer: 'ok',
      qualityPredictor: Object.keys(modelStats).length > 0 ? 'ok' : 'warning',
      recommendationEngine: 'ok',
    } as Record<string, 'ok' | 'warning' | 'error'>;

    // Determine overall status
    const hasErrors = Object.values(components).includes('error');
    const hasWarnings = Object.values(components).includes('warning');

    const status = hasErrors ? 'critical' : hasWarnings ? 'warning' : 'healthy';

    return {
      status,
      components,
      metrics: {
        totalRecords: stats.totalSuiteRecords,
        storageSize: stats.storageSize,
        modelAccuracy: Object.values(modelStats).reduce((sum: number, model: any) =>
          sum + (model.accuracy || 0), 0) / Object.keys(modelStats).length || 0,
      },
      lastAnalysis: stats.newestRecord,
    };
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    // Clear caches and stop any running processes
    await this.dataManager.clearAllData();
  }

  /**
   * Private helper methods
   */
  private setupEventForwarding(): void {
    // Forward important events from components
    this.dataManager.on('suiteRecordStored', (record) => {
      this.emit('dataStored', record);
    });

    this.recommendationEngine.on('recommendationsGenerated', (report) => {
      this.emit('recommendationsGenerated', report);
    });

    this.qualityPredictor.on('modelsRetrained', (info) => {
      this.emit('modelsRetrained', info);
    });
  }

  private triggerBackgroundAnalysis(): void {
    // Trigger analysis in the background (non-blocking)
    setTimeout(async () => {
      try {
        await this.trendAnalyzer.generateTrendInsights(7);
        await this.qualityPredictor.predictQualityMetrics();
        await this.recommendationEngine.generateRecommendations(7);
      } catch (error) {
        this.emit('analysisError', error);
      }
    }, 100);
  }

  private generateSampleData(): TestSuiteRecord[] {
    const records: TestSuiteRecord[] = [];
    const now = new Date();

    for (let i = 0; i < 30; i++) {
      const timestamp = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const totalTests = 100 + Math.floor(Math.random() * 50);
      const passedTests = Math.floor(totalTests * (0.85 + Math.random() * 0.1));
      const failedTests = totalTests - passedTests;

      records.push({
        id: `sample_${i}`,
        timestamp,
        suiteName: 'Sample Test Suite',
        totalTests,
        passedTests,
        failedTests,
        skippedTests: 0,
        duration: 30 + Math.random() * 60,
        coverage: {
          statements: 80 + Math.random() * 15,
          branches: 75 + Math.random() * 15,
          functions: 85 + Math.random() * 10,
          lines: 82 + Math.random() * 12,
        },
        performance: {
          totalMemory: 128 + Math.random() * 64,
          peakMemory: 256 + Math.random() * 128,
          averageExecutionTime: 0.5 + Math.random() * 2,
        },
        environment: {
          nodeVersion: '18.0.0',
          platform: 'linux',
          ci: true,
          branch: 'main',
          commit: `commit_${i}`,
        },
        tests: [],
      });
    }

    return records;
  }

  // Event emitter methods
  private listeners: Map<string, Function[]> = new Map();

  on(event: string, listener: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  emit(event: string, ...args: any[]): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      for (const listener of eventListeners) {
        try {
          listener(...args);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      }
    }
  }
}
