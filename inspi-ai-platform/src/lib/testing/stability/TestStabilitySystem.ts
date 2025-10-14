/**
 * Test Stability System
 *
 * Main orchestrator for test stability monitoring, flaky test detection,
 * retry management, and environment consistency verification.
 */

import { FlakyTestDetector, FlakyTestAnalysis } from './FlakyTestDetector';
import { TestEnvironmentVerifier, EnvironmentConsistencyReport } from './TestEnvironmentVerifier';
import { TestRetryManager, TestRetryContext, RetryResult } from './TestRetryManager';
import { TestStabilityMonitor, TestExecutionRecord, TestStabilityMetrics } from './TestStabilityMonitor';

export interface StabilitySystemConfig {
  monitoring: {
    enabled: boolean;
    persistHistory: boolean;
    analysisWindowDays: number;
  };
  flakyDetection: {
    enabled: boolean;
    minRunsForAnalysis: number;
    flakinessThreshold: number;
  };
  retryManagement: {
    enabled: boolean;
    maxRetries: number;
    retryOnlyFlaky: boolean;
  };
  environmentVerification: {
    enabled: boolean;
    autoCapture: boolean;
    verifyBeforeTests: boolean;
  };
}

export interface StabilityReport {
  timestamp: Date;
  summary: {
    totalTests: number;
    stableTests: number;
    flakyTests: number;
    overallStabilityScore: number;
  };
  flakyTests: FlakyTestAnalysis[];
  environmentConsistency: EnvironmentConsistencyReport;
  retryStatistics: {
    totalRetries: number;
    successfulRetries: number;
    retrySuccessRate: number;
  };
  recommendations: string[];
}

export class TestStabilitySystem {
  private monitor: TestStabilityMonitor;
  private detector: FlakyTestDetector;
  private retryManager: TestRetryManager;
  private environmentVerifier: TestEnvironmentVerifier;
  private config: StabilitySystemConfig;

  constructor(config: Partial<StabilitySystemConfig> = {}) {
    this.config = {
      monitoring: {
        enabled: true,
        persistHistory: true,
        analysisWindowDays: 30,
        ...config.monitoring,
      },
      flakyDetection: {
        enabled: true,
        minRunsForAnalysis: 10,
        flakinessThreshold: 0.1,
        ...config.flakyDetection,
      },
      retryManagement: {
        enabled: true,
        maxRetries: 3,
        retryOnlyFlaky: true,
        ...config.retryManagement,
      },
      environmentVerification: {
        enabled: true,
        autoCapture: true,
        verifyBeforeTests: false,
        ...config.environmentVerification,
      },
    };

    this.monitor = new TestStabilityMonitor(
      {
        minRunsForAnalysis: this.config.flakyDetection.minRunsForAnalysis,
        flakinessThreshold: this.config.flakyDetection.flakinessThreshold,
        analysisWindowDays: this.config.monitoring.analysisWindowDays,
      },
      this.config.monitoring.persistHistory,
    );

    this.detector = new FlakyTestDetector();

    this.retryManager = new TestRetryManager({
      maxRetries: this.config.retryManagement.maxRetries,
      retryOnlyFlaky: this.config.retryManagement.retryOnlyFlaky,
    });

    this.environmentVerifier = new TestEnvironmentVerifier();

    this.initialize();
  }

  /**
   * Execute a test with full stability monitoring and retry logic
   */
  async executeTest<T>(
    testFunction: () => Promise<T>,
    testName: string,
    testFile: string,
  ): Promise<T> {
    // Verify environment if enabled
    if (this.config.environmentVerification.enabled && this.config.environmentVerification.verifyBeforeTests) {
      await this.verifyEnvironment();
    }

    const startTime = Date.now();
    let result: T;
    let retryInfo: RetryResult | null = null;

    try {
      // Get test stability context
      const metrics = this.monitor.getTestStabilityMetrics(testName, testFile);
      const isFlaky = metrics ? metrics.isFlaky : false;
      const flakinessScore = metrics ? metrics.flakinessScore : 0;

      const retryContext: TestRetryContext = {
        testName,
        testFile,
        isFlaky,
        flakinessScore,
      };

      // Execute with retry if enabled
      if (this.config.retryManagement.enabled) {
        const executeResult = await this.retryManager.executeWithRetry(testFunction, retryContext);
        result = executeResult.result;
        retryInfo = executeResult.retryInfo;
      } else {
        result = await testFunction();
      }

      // Record successful execution
      if (this.config.monitoring.enabled) {
        this.recordTestExecution({
          testName,
          testFile,
          status: 'passed',
          duration: Date.now() - startTime,
          timestamp: new Date(),
          environment: await this.getCurrentEnvironmentInfo(),
        });
      }

      return result;

    } catch (error) {
      // Record failed execution
      if (this.config.monitoring.enabled) {
        this.recordTestExecution({
          testName,
          testFile,
          status: 'failed',
          duration: Date.now() - startTime,
          timestamp: new Date(),
          error: {
            message: (error as Error).message,
            stack: (error as Error).stack,
            type: (error as Error).constructor.name,
          },
          environment: await this.getCurrentEnvironmentInfo(),
        });
      }

      throw error;
    }
  }

  /**
   * Record a test execution manually
   */
  recordTestExecution(record: TestExecutionRecord): void {
    if (this.config.monitoring.enabled) {
      this.monitor.recordTestExecution(record);
    }
  }

  /**
   * Analyze all tests for flaky behavior
   */
  async analyzeTestStability(): Promise<FlakyTestAnalysis[]> {
    if (!this.config.flakyDetection.enabled) {
      return [];
    }

    const summary = this.monitor.getStabilitySummary();
    const analyses: FlakyTestAnalysis[] = [];

    // Get all test data for analysis
    for (const testMetrics of summary.mostFlakyTests) {
      // This is a simplified approach - in a real implementation,
      // you'd need to access the full history for each test
      const analysis = this.detector.analyzeTest(
        testMetrics.testName,
        '', // testFile would need to be tracked separately
        [], // history would need to be retrieved
        testMetrics,
      );
      analyses.push(analysis);
    }

    return analyses;
  }

  /**
   * Generate comprehensive stability report
   */
  async generateStabilityReport(): Promise<StabilityReport> {
    const summary = this.monitor.getStabilitySummary();
    const flakyTests = await this.analyzeTestStability();
    const environmentConsistency = await this.environmentVerifier.verifyEnvironment();

    // Calculate retry statistics
    const totalRetries = 0;
    const successfulRetries = 0;

    // This would need to be implemented based on retry manager's internal tracking
    const retrySuccessRate = totalRetries > 0 ? successfulRetries / totalRetries : 1;

    const recommendations = this.generateSystemRecommendations(
      summary,
      flakyTests,
      environmentConsistency,
    );

    return {
      timestamp: new Date(),
      summary,
      flakyTests,
      environmentConsistency,
      retryStatistics: {
        totalRetries,
        successfulRetries,
        retrySuccessRate,
      },
      recommendations,
    };
  }

  /**
   * Get flaky tests with detailed analysis
   */
  async getFlakyTestsWithAnalysis(): Promise<FlakyTestAnalysis[]> {
    return this.analyzeTestStability();
  }

  /**
   * Verify current test environment
   */
  async verifyEnvironment(): Promise<EnvironmentConsistencyReport> {
    if (!this.config.environmentVerification.enabled) {
      return {
        isConsistent: true,
        score: 1,
        differences: [],
        riskLevel: 'low',
        recommendations: ['Environment verification disabled'],
      };
    }

    return this.environmentVerifier.verifyEnvironment();
  }

  /**
   * Set environment baseline
   */
  async setEnvironmentBaseline(): Promise<void> {
    if (this.config.environmentVerification.enabled) {
      const snapshot = await this.environmentVerifier.captureSnapshot();
      this.environmentVerifier.setBaseline(snapshot);
    }
  }

  /**
   * Clear all stability data
   */
  clearStabilityData(): void {
    this.monitor.clearAllHistory();
    this.retryManager.clearRetryHistory();
  }

  /**
   * Update system configuration
   */
  updateConfig(newConfig: Partial<StabilitySystemConfig>): void {
    this.config = {
      monitoring: { ...this.config.monitoring, ...newConfig.monitoring },
      flakyDetection: { ...this.config.flakyDetection, ...newConfig.flakyDetection },
      retryManagement: { ...this.config.retryManagement, ...newConfig.retryManagement },
      environmentVerification: { ...this.config.environmentVerification, ...newConfig.environmentVerification },
    };
  }

  /**
   * Get system health status
   */
  getSystemHealth(): {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    metrics: {
      stabilityScore: number;
      environmentScore: number;
      retrySuccessRate: number;
    };
  } {
    const summary = this.monitor.getStabilitySummary();
    const stabilityScore = summary.overallStabilityScore;

    const issues: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    if (stabilityScore < 0.7) {
      issues.push(`Low overall stability score: ${(stabilityScore * 100).toFixed(1)}%`);
      status = 'critical';
    } else if (stabilityScore < 0.9) {
      issues.push(`Moderate stability concerns: ${(stabilityScore * 100).toFixed(1)}%`);
      status = 'warning';
    }

    if (summary.flakyTests > summary.totalTests * 0.1) {
      issues.push(`High number of flaky tests: ${summary.flakyTests}/${summary.totalTests}`);
      if (status !== 'critical') status = 'warning';
    }

    return {
      status,
      issues,
      metrics: {
        stabilityScore,
        environmentScore: 1, // Would be calculated from environment verifier
        retrySuccessRate: 1, // Would be calculated from retry manager
      },
    };
  }

  private async initialize(): Promise<void> {
    if (this.config.environmentVerification.enabled && this.config.environmentVerification.autoCapture) {
      try {
        await this.environmentVerifier.captureSnapshot();
      } catch (error) {
        console.warn('Failed to capture initial environment snapshot:', error);
      }
    }
  }

  private async getCurrentEnvironmentInfo(): Promise<TestExecutionRecord['environment']> {
    return {
      nodeVersion: process.version,
      platform: process.platform,
      ci: process.env.CI === 'true' || process.env.CI === '1',
      worker: undefined, // Would be set if running in parallel
    };
  }

  private generateSystemRecommendations(
    summary: any,
    flakyTests: FlakyTestAnalysis[],
    environmentConsistency: EnvironmentConsistencyReport,
  ): string[] {
    const recommendations: string[] = [];

    // Stability recommendations
    if (summary.overallStabilityScore < 0.8) {
      recommendations.push('Focus on improving test stability - consider test isolation and deterministic assertions');
    }

    if (summary.flakyTests > 0) {
      recommendations.push(`Address ${summary.flakyTests} flaky tests to improve overall reliability`);
    }

    // Flaky test recommendations
    const criticalFlakyTests = flakyTests.filter(t => t.riskLevel === 'critical');
    if (criticalFlakyTests.length > 0) {
      recommendations.push(`Immediately address ${criticalFlakyTests.length} critical flaky tests`);
    }

    // Environment recommendations
    if (!environmentConsistency.isConsistent) {
      recommendations.push('Standardize test environments to reduce environment-related failures');
    }

    if (environmentConsistency.riskLevel === 'high' || environmentConsistency.riskLevel === 'critical') {
      recommendations.push('Critical environment inconsistencies detected - review environment setup');
    }

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('Test stability system is healthy - continue monitoring');
    }

    return recommendations;
  }
}
