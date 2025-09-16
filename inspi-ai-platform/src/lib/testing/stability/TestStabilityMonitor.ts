/**
 * Test Stability Monitor
 * 
 * Monitors test execution history and detects flaky tests automatically.
 * Provides stability metrics and analysis for test reliability.
 */

export interface TestExecutionRecord {
  testName: string;
  testFile: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  timestamp: Date;
  error?: {
    message: string;
    stack?: string;
    type: string;
  };
  environment: {
    nodeVersion: string;
    platform: string;
    ci: boolean;
    worker?: number;
  };
}

export interface TestStabilityMetrics {
  testName: string;
  totalRuns: number;
  passCount: number;
  failCount: number;
  skipCount: number;
  flakinessScore: number; // 0-1, where 1 is most flaky
  averageDuration: number;
  durationVariance: number;
  lastFailure?: Date;
  consecutiveFailures: number;
  isFlaky: boolean;
  stabilityTrend: 'improving' | 'degrading' | 'stable';
}

export interface FlakyTestDetectionConfig {
  minRunsForAnalysis: number;
  flakinessThreshold: number;
  durationVarianceThreshold: number;
  consecutiveFailureThreshold: number;
  analysisWindowDays: number;
}

export class TestStabilityMonitor {
  private executionHistory: Map<string, TestExecutionRecord[]> = new Map();
  private config: FlakyTestDetectionConfig;
  private persistenceEnabled: boolean;

  constructor(config: Partial<FlakyTestDetectionConfig> = {}, persistenceEnabled = true) {
    this.config = {
      minRunsForAnalysis: 10,
      flakinessThreshold: 0.1, // 10% failure rate
      durationVarianceThreshold: 0.5, // 50% variance
      consecutiveFailureThreshold: 3,
      analysisWindowDays: 30,
      ...config
    };
    this.persistenceEnabled = persistenceEnabled;
    
    if (this.persistenceEnabled) {
      this.loadHistoryFromStorage();
    }
  }

  /**
   * Record a test execution result
   */
  recordTestExecution(record: TestExecutionRecord): void {
    const testKey = this.getTestKey(record.testName, record.testFile);
    const history = this.executionHistory.get(testKey) || [];
    
    history.push(record);
    
    // Keep only records within the analysis window
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.analysisWindowDays);
    
    const filteredHistory = history.filter(h => h.timestamp >= cutoffDate);
    
    // Limit to reasonable number of records
    if (filteredHistory.length > 1000) {
      filteredHistory.splice(0, filteredHistory.length - 1000);
    }
    
    this.executionHistory.set(testKey, filteredHistory);
    
    if (this.persistenceEnabled) {
      this.saveHistoryToStorage();
    }
  }

  /**
   * Get stability metrics for a specific test
   */
  getTestStabilityMetrics(testName: string, testFile: string): TestStabilityMetrics | null {
    const testKey = this.getTestKey(testName, testFile);
    const history = this.executionHistory.get(testKey) || [];
    
    if (history.length < this.config.minRunsForAnalysis) {
      return null;
    }

    const passCount = history.filter(h => h.status === 'passed').length;
    const failCount = history.filter(h => h.status === 'failed').length;
    const skipCount = history.filter(h => h.status === 'skipped').length;
    const totalRuns = history.length;

    const flakinessScore = this.calculateFlakinessScore(history);
    const averageDuration = this.calculateAverageDuration(history);
    const durationVariance = this.calculateDurationVariance(history, averageDuration);
    const consecutiveFailures = this.calculateConsecutiveFailures(history);
    const lastFailure = this.getLastFailure(history);
    const stabilityTrend = this.calculateStabilityTrend(history);

    const isFlaky = this.isTestFlaky(flakinessScore, durationVariance, consecutiveFailures);

    return {
      testName,
      totalRuns,
      passCount,
      failCount,
      skipCount,
      flakinessScore,
      averageDuration,
      durationVariance,
      lastFailure,
      consecutiveFailures,
      isFlaky,
      stabilityTrend
    };
  }

  /**
   * Get all flaky tests
   */
  getFlakyTests(): TestStabilityMetrics[] {
    const flakyTests: TestStabilityMetrics[] = [];
    
    for (const [testKey] of this.executionHistory) {
      const [testName, testFile] = this.parseTestKey(testKey);
      const metrics = this.getTestStabilityMetrics(testName, testFile);
      
      if (metrics && metrics.isFlaky) {
        flakyTests.push(metrics);
      }
    }
    
    // Sort by flakiness score (most flaky first)
    return flakyTests.sort((a, b) => b.flakinessScore - a.flakinessScore);
  }

  /**
   * Get stability summary for all tests
   */
  getStabilitySummary(): {
    totalTests: number;
    stableTests: number;
    flakyTests: number;
    overallStabilityScore: number;
    mostFlakyTests: TestStabilityMetrics[];
  } {
    const allMetrics: TestStabilityMetrics[] = [];
    
    for (const [testKey] of this.executionHistory) {
      const [testName, testFile] = this.parseTestKey(testKey);
      const metrics = this.getTestStabilityMetrics(testName, testFile);
      
      if (metrics) {
        allMetrics.push(metrics);
      }
    }

    const totalTests = allMetrics.length;
    const flakyTests = allMetrics.filter(m => m.isFlaky).length;
    const stableTests = totalTests - flakyTests;
    
    const overallStabilityScore = totalTests > 0 
      ? (stableTests / totalTests) 
      : 1;

    const mostFlakyTests = allMetrics
      .filter(m => m.isFlaky)
      .sort((a, b) => b.flakinessScore - a.flakinessScore)
      .slice(0, 10);

    return {
      totalTests,
      stableTests,
      flakyTests,
      overallStabilityScore,
      mostFlakyTests
    };
  }

  /**
   * Clear history for a specific test
   */
  clearTestHistory(testName: string, testFile: string): void {
    const testKey = this.getTestKey(testName, testFile);
    this.executionHistory.delete(testKey);
    
    if (this.persistenceEnabled) {
      this.saveHistoryToStorage();
    }
  }

  /**
   * Clear all history
   */
  clearAllHistory(): void {
    this.executionHistory.clear();
    
    if (this.persistenceEnabled) {
      this.saveHistoryToStorage();
    }
  }

  private calculateFlakinessScore(history: TestExecutionRecord[]): number {
    if (history.length === 0) return 0;
    
    // Calculate failure rate
    const failures = history.filter(h => h.status === 'failed').length;
    const failureRate = failures / history.length;
    
    // Calculate pattern-based flakiness (alternating pass/fail)
    let alternations = 0;
    for (let i = 1; i < history.length; i++) {
      if (history[i].status !== history[i - 1].status) {
        alternations++;
      }
    }
    const alternationRate = alternations / (history.length - 1);
    
    // Combine failure rate and alternation pattern
    return Math.min(1, failureRate + (alternationRate * 0.3));
  }

  private calculateAverageDuration(history: TestExecutionRecord[]): number {
    const validDurations = history
      .filter(h => h.duration > 0)
      .map(h => h.duration);
    
    if (validDurations.length === 0) return 0;
    
    return validDurations.reduce((sum, duration) => sum + duration, 0) / validDurations.length;
  }

  private calculateDurationVariance(history: TestExecutionRecord[], average: number): number {
    const validDurations = history
      .filter(h => h.duration > 0)
      .map(h => h.duration);
    
    if (validDurations.length === 0 || average === 0) return 0;
    
    const variance = validDurations.reduce((sum, duration) => {
      const diff = duration - average;
      return sum + (diff * diff);
    }, 0) / validDurations.length;
    
    const standardDeviation = Math.sqrt(variance);
    return standardDeviation / average; // Coefficient of variation
  }

  private calculateConsecutiveFailures(history: TestExecutionRecord[]): number {
    let maxConsecutive = 0;
    let currentConsecutive = 0;
    
    // Check from most recent backwards
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].status === 'failed') {
        currentConsecutive++;
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
      } else {
        break; // Only count consecutive from the end
      }
    }
    
    return currentConsecutive;
  }

  private getLastFailure(history: TestExecutionRecord[]): Date | undefined {
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].status === 'failed') {
        return history[i].timestamp;
      }
    }
    return undefined;
  }

  private calculateStabilityTrend(history: TestExecutionRecord[]): 'improving' | 'degrading' | 'stable' {
    if (history.length < 20) return 'stable';
    
    const recentHalf = history.slice(Math.floor(history.length / 2));
    const olderHalf = history.slice(0, Math.floor(history.length / 2));
    
    const recentFailureRate = recentHalf.filter(h => h.status === 'failed').length / recentHalf.length;
    const olderFailureRate = olderHalf.filter(h => h.status === 'failed').length / olderHalf.length;
    
    const difference = recentFailureRate - olderFailureRate;
    
    if (difference > 0.1) return 'degrading';
    if (difference < -0.1) return 'improving';
    return 'stable';
  }

  private isTestFlaky(
    flakinessScore: number, 
    durationVariance: number, 
    consecutiveFailures: number
  ): boolean {
    return flakinessScore > this.config.flakinessThreshold ||
           durationVariance > this.config.durationVarianceThreshold ||
           consecutiveFailures >= this.config.consecutiveFailureThreshold;
  }

  private getTestKey(testName: string, testFile: string): string {
    return `${testFile}::${testName}`;
  }

  private parseTestKey(testKey: string): [string, string] {
    const parts = testKey.split('::');
    return [parts[1], parts[0]];
  }

  private loadHistoryFromStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem('test-stability-history');
        if (stored) {
          const data = JSON.parse(stored);
          this.executionHistory = new Map(Object.entries(data).map(([key, records]: [string, any[]]) => [
            key,
            records.map(r => ({
              ...r,
              timestamp: new Date(r.timestamp)
            }))
          ]));
        }
      }
    } catch (error) {
      console.warn('Failed to load test stability history:', error);
    }
  }

  private saveHistoryToStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const data = Object.fromEntries(this.executionHistory.entries());
        localStorage.setItem('test-stability-history', JSON.stringify(data));
      }
    } catch (error) {
      console.warn('Failed to save test stability history:', error);
    }
  }
}