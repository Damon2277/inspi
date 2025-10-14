/**
 * Flaky Test Detector
 *
 * Advanced detection algorithms for identifying flaky tests using
 * statistical analysis and pattern recognition.
 */

import { TestExecutionRecord, TestStabilityMetrics } from './TestStabilityMonitor';

export interface FlakyTestPattern {
  type: 'intermittent' | 'timing' | 'environmental' | 'race_condition' | 'resource_dependent';
  confidence: number; // 0-1
  description: string;
  evidence: string[];
  recommendations: string[];
}

export interface FlakyTestAnalysis {
  testName: string;
  testFile: string;
  isFlaky: boolean;
  confidence: number;
  patterns: FlakyTestPattern[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  stabilityScore: number;
  recommendations: string[];
}

export class FlakyTestDetector {
  private readonly TIMING_VARIANCE_THRESHOLD = 0.5;
  private readonly INTERMITTENT_THRESHOLD = 0.15;
  private readonly ENVIRONMENTAL_CORRELATION_THRESHOLD = 0.7;
  private readonly RACE_CONDITION_INDICATORS = [
    'timeout',
    'race',
    'concurrent',
    'async',
    'promise',
    'settimeout',
    'setinterval',
  ];

  /**
   * Analyze a test for flaky behavior patterns
   */
  analyzeTest(
    testName: string,
    testFile: string,
    history: TestExecutionRecord[],
    metrics: TestStabilityMetrics,
  ): FlakyTestAnalysis {
    const patterns = this.detectPatterns(history, metrics);
    const confidence = this.calculateOverallConfidence(patterns);
    const isFlaky = confidence > 0.3 || patterns.some(p => p.confidence > 0.7);
    const riskLevel = this.calculateRiskLevel(confidence, patterns);
    const recommendations = this.generateRecommendations(patterns);

    return {
      testName,
      testFile,
      isFlaky,
      confidence,
      patterns,
      riskLevel,
      stabilityScore: 1 - metrics.flakinessScore,
      recommendations,
    };
  }

  /**
   * Batch analyze multiple tests
   */
  analyzeTests(
    testsData: Array<{
      testName: string;
      testFile: string;
      history: TestExecutionRecord[];
      metrics: TestStabilityMetrics;
    }>,
  ): FlakyTestAnalysis[] {
    return testsData.map(data =>
      this.analyzeTest(data.testName, data.testFile, data.history, data.metrics),
    );
  }

  /**
   * Get flaky tests sorted by risk level
   */
  getFlakyTestsByRisk(analyses: FlakyTestAnalysis[]): {
    critical: FlakyTestAnalysis[];
    high: FlakyTestAnalysis[];
    medium: FlakyTestAnalysis[];
    low: FlakyTestAnalysis[];
  } {
    const flaky = analyses.filter(a => a.isFlaky);

    return {
      critical: flaky.filter(a => a.riskLevel === 'critical'),
      high: flaky.filter(a => a.riskLevel === 'high'),
      medium: flaky.filter(a => a.riskLevel === 'medium'),
      low: flaky.filter(a => a.riskLevel === 'low'),
    };
  }

  private detectPatterns(
    history: TestExecutionRecord[],
    metrics: TestStabilityMetrics,
  ): FlakyTestPattern[] {
    const patterns: FlakyTestPattern[] = [];

    // Detect intermittent failures
    const intermittentPattern = this.detectIntermittentPattern(history, metrics);
    if (intermittentPattern) patterns.push(intermittentPattern);

    // Detect timing-related issues
    const timingPattern = this.detectTimingPattern(history, metrics);
    if (timingPattern) patterns.push(timingPattern);

    // Detect environmental dependencies
    const environmentalPattern = this.detectEnvironmentalPattern(history);
    if (environmentalPattern) patterns.push(environmentalPattern);

    // Detect race conditions
    const raceConditionPattern = this.detectRaceConditionPattern(history, metrics);
    if (raceConditionPattern) patterns.push(raceConditionPattern);

    // Detect resource dependencies
    const resourcePattern = this.detectResourceDependentPattern(history);
    if (resourcePattern) patterns.push(resourcePattern);

    return patterns;
  }

  private detectIntermittentPattern(
    history: TestExecutionRecord[],
    metrics: TestStabilityMetrics,
  ): FlakyTestPattern | null {
    if (metrics.flakinessScore < this.INTERMITTENT_THRESHOLD) return null;

    // Look for alternating pass/fail patterns
    let alternations = 0;
    let consecutiveRuns = 0;
    let maxConsecutive = 0;

    for (let i = 1; i < history.length; i++) {
      if (history[i].status !== history[i - 1].status) {
        alternations++;
        maxConsecutive = Math.max(maxConsecutive, consecutiveRuns);
        consecutiveRuns = 1;
      } else {
        consecutiveRuns++;
      }
    }

    const alternationRate = alternations / (history.length - 1);
    const confidence = Math.min(1, alternationRate * 2);

    if (confidence < 0.3) return null;

    return {
      type: 'intermittent',
      confidence,
      description: 'Test shows intermittent pass/fail pattern',
      evidence: [
        `Alternation rate: ${(alternationRate * 100).toFixed(1)}%`,
        `Failure rate: ${(metrics.flakinessScore * 100).toFixed(1)}%`,
        `Max consecutive runs: ${maxConsecutive}`,
      ],
      recommendations: [
        'Review test setup and teardown for state leakage',
        'Check for shared resources or global state',
        'Add more deterministic assertions',
        'Consider test isolation improvements',
      ],
    };
  }

  private detectTimingPattern(
    history: TestExecutionRecord[],
    metrics: TestStabilityMetrics,
  ): FlakyTestPattern | null {
    if (metrics.durationVariance < this.TIMING_VARIANCE_THRESHOLD) return null;

    // Analyze duration patterns
    const durations = history.filter(h => h.duration > 0).map(h => h.duration);
    if (durations.length < 5) return null;

    const sortedDurations = [...durations].sort((a, b) => a - b);
    const median = sortedDurations[Math.floor(sortedDurations.length / 2)];
    const q1 = sortedDurations[Math.floor(sortedDurations.length * 0.25)];
    const q3 = sortedDurations[Math.floor(sortedDurations.length * 0.75)];
    const iqr = q3 - q1;

    // Check for outliers
    const outliers = durations.filter(d => d < q1 - 1.5 * iqr || d > q3 + 1.5 * iqr);
    const outlierRate = outliers.length / durations.length;

    const confidence = Math.min(1, metrics.durationVariance + outlierRate);

    return {
      type: 'timing',
      confidence,
      description: 'Test shows high duration variance indicating timing issues',
      evidence: [
        `Duration variance: ${(metrics.durationVariance * 100).toFixed(1)}%`,
        `Outlier rate: ${(outlierRate * 100).toFixed(1)}%`,
        `Median duration: ${median.toFixed(0)}ms`,
        `IQR: ${iqr.toFixed(0)}ms`,
      ],
      recommendations: [
        'Review async operations and timeouts',
        'Add proper wait conditions instead of fixed delays',
        'Check for network or I/O dependencies',
        'Consider mocking time-dependent operations',
      ],
    };
  }

  private detectEnvironmentalPattern(history: TestExecutionRecord[]): FlakyTestPattern | null {
    // Group by environment characteristics
    const ciRuns = history.filter(h => h.environment.ci);
    const localRuns = history.filter(h => !h.environment.ci);

    if (ciRuns.length < 3 || localRuns.length < 3) return null;

    const ciFailureRate = ciRuns.filter(h => h.status === 'failed').length / ciRuns.length;
    const localFailureRate = localRuns.filter(h => h.status === 'failed').length / localRuns.length;

    const failureRateDiff = Math.abs(ciFailureRate - localFailureRate);

    if (failureRateDiff < 0.3) return null;

    const confidence = Math.min(1, failureRateDiff * 1.5);
    const worseEnvironment = ciFailureRate > localFailureRate ? 'CI' : 'Local';

    return {
      type: 'environmental',
      confidence,
      description: `Test behaves differently in ${worseEnvironment} environment`,
      evidence: [
        `CI failure rate: ${(ciFailureRate * 100).toFixed(1)}%`,
        `Local failure rate: ${(localFailureRate * 100).toFixed(1)}%`,
        `Difference: ${(failureRateDiff * 100).toFixed(1)}%`,
      ],
      recommendations: [
        'Check environment-specific configurations',
        'Review CI/CD pipeline setup',
        'Ensure consistent test data and dependencies',
        'Add environment detection and conditional logic if needed',
      ],
    };
  }

  private detectRaceConditionPattern(
    history: TestExecutionRecord[],
    metrics: TestStabilityMetrics,
  ): FlakyTestPattern | null {
    // Look for race condition indicators in error messages
    const failures = history.filter(h => h.status === 'failed' && h.error);
    if (failures.length === 0) return null;

    let raceIndicators = 0;
    const evidence: string[] = [];

    failures.forEach(failure => {
      if (failure.error) {
        const errorText = (failure.error.message + ' ' + (failure.error.stack || '')).toLowerCase();

        this.RACE_CONDITION_INDICATORS.forEach(indicator => {
          if (errorText.includes(indicator)) {
            raceIndicators++;
            evidence.push(`Found "${indicator}" in error: ${failure.error!.message.substring(0, 100)}`);
          }
        });
      }
    });

    const indicatorRate = raceIndicators / failures.length;
    if (indicatorRate < 0.3) return null;

    const confidence = Math.min(1, indicatorRate + (metrics.flakinessScore * 0.5));

    return {
      type: 'race_condition',
      confidence,
      description: 'Test likely has race condition issues',
      evidence: evidence.slice(0, 3), // Limit evidence
      recommendations: [
        'Review async/await usage and promise handling',
        'Add proper synchronization mechanisms',
        'Use deterministic timing in tests',
        'Consider using test utilities for async operations',
      ],
    };
  }

  private detectResourceDependentPattern(history: TestExecutionRecord[]): FlakyTestPattern | null {
    // Look for patterns related to resource availability
    const failures = history.filter(h => h.status === 'failed' && h.error);
    if (failures.length < 2) return null;

    const resourceErrors = failures.filter(failure => {
      if (!failure.error) return false;

      const errorText = failure.error.message.toLowerCase();
      return errorText.includes('memory') ||
             errorText.includes('disk') ||
             errorText.includes('network') ||
             errorText.includes('connection') ||
             errorText.includes('timeout') ||
             errorText.includes('resource');
    });

    const resourceErrorRate = resourceErrors.length / failures.length;
    if (resourceErrorRate < 0.4) return null;

    const confidence = Math.min(1, resourceErrorRate * 1.2);

    return {
      type: 'resource_dependent',
      confidence,
      description: 'Test appears to be dependent on system resources',
      evidence: [
        `Resource-related errors: ${resourceErrors.length}/${failures.length}`,
        `Resource error rate: ${(resourceErrorRate * 100).toFixed(1)}%`,
        ...resourceErrors.slice(0, 2).map(e => `Error: ${e.error!.message.substring(0, 80)}`),
      ],
      recommendations: [
        'Mock external dependencies and resources',
        'Add resource availability checks',
        'Implement proper cleanup and resource management',
        'Consider using test containers or isolated environments',
      ],
    };
  }

  private calculateOverallConfidence(patterns: FlakyTestPattern[]): number {
    if (patterns.length === 0) return 0;

    // Use weighted average with higher weight for higher confidence patterns
    const weightedSum = patterns.reduce((sum, pattern) => {
      const weight = pattern.confidence;
      return sum + (pattern.confidence * weight);
    }, 0);

    const totalWeight = patterns.reduce((sum, pattern) => sum + pattern.confidence, 0);

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  private calculateRiskLevel(
    confidence: number,
    patterns: FlakyTestPattern[],
  ): 'low' | 'medium' | 'high' | 'critical' {
    const hasHighConfidencePattern = patterns.some(p => p.confidence > 0.8);
    const hasMultiplePatterns = patterns.length > 2;

    if (confidence > 0.8 || hasHighConfidencePattern) return 'critical';
    if (confidence > 0.6 || hasMultiplePatterns) return 'high';
    if (confidence > 0.4) return 'medium';
    return 'low';
  }

  private generateRecommendations(patterns: FlakyTestPattern[]): string[] {
    const allRecommendations = patterns.flatMap(p => p.recommendations);

    // Remove duplicates and prioritize
    const uniqueRecommendations = Array.from(new Set(allRecommendations));

    // Add general recommendations
    const generalRecommendations = [
      'Increase test isolation and independence',
      'Add comprehensive logging for debugging',
      'Consider splitting complex tests into smaller units',
      'Implement proper test data management',
    ];

    return [...uniqueRecommendations, ...generalRecommendations].slice(0, 8);
  }
}
