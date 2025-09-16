/**
 * Pipeline Analyzer
 * Analyzes CI/CD pipeline performance and provides insights
 */

import { CICDMetrics, PipelineAnalysis, Bottleneck, Inefficiency, TrendAnalysis } from './types';

export class PipelineAnalyzer {
  private metricsHistory: CICDMetrics[] = [];
  private analysisCache = new Map<string, PipelineAnalysis>();

  /**
   * Analyze pipeline performance
   */
  async analyzePipeline(metrics: CICDMetrics): Promise<PipelineAnalysis> {
    console.log(`📊 Analyzing pipeline: ${metrics.pipelineId}`);

    // Store metrics for trend analysis
    this.metricsHistory.push(metrics);
    
    // Keep only last 50 builds for analysis
    if (this.metricsHistory.length > 50) {
      this.metricsHistory = this.metricsHistory.slice(-50);
    }

    const bottlenecks = this.identifyBottlenecks(metrics);
    const inefficiencies = this.identifyInefficiencies(metrics);
    const recommendations = this.generateRecommendations(metrics, bottlenecks, inefficiencies);
    const trends = this.analyzeTrends();

    return {
      bottlenecks,
      inefficiencies,
      recommendations,
      trends
    };
  }

  /**
   * Identify performance bottlenecks
   */
  private identifyBottlenecks(metrics: CICDMetrics): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];
    const totalDuration = metrics.duration;

    // Analyze stage durations
    metrics.stages.forEach(stage => {
      const stagePercentage = (stage.duration / totalDuration) * 100;
      
      if (stagePercentage > 30) { // Stage takes more than 30% of total time
        bottlenecks.push({
          stage: stage.name,
          type: this.categorizeBottleneck(stage),
          impact: stagePercentage / 100,
          frequency: this.calculateStageFrequency(stage.name),
          suggestions: this.generateBottleneckSuggestions(stage)
        });
      }
    });

    // Analyze resource usage bottlenecks
    if (metrics.performance.resourceUsage.cpu > 80) {
      bottlenecks.push({
        stage: 'overall',
        type: 'cpu',
        impact: 0.7,
        frequency: 1.0,
        suggestions: [
          'Consider using more powerful runners',
          'Optimize CPU-intensive operations',
          'Implement parallel processing where possible'
        ]
      });
    }

    if (metrics.performance.resourceUsage.memory > 80) {
      bottlenecks.push({
        stage: 'overall',
        type: 'memory',
        impact: 0.6,
        frequency: 1.0,
        suggestions: [
          'Increase memory allocation for runners',
          'Optimize memory usage in applications',
          'Clear unused objects and caches'
        ]
      });
    }

    // Analyze queue time bottleneck
    if (metrics.performance.queueTime > 300000) { // 5 minutes
      bottlenecks.push({
        stage: 'queue',
        type: 'dependency',
        impact: 0.5,
        frequency: this.calculateQueueFrequency(),
        suggestions: [
          'Add more runners to reduce queue time',
          'Optimize runner allocation',
          'Consider using spot instances for cost-effective scaling'
        ]
      });
    }

    return bottlenecks.sort((a, b) => b.impact - a.impact);
  }

  /**
   * Categorize bottleneck type based on stage characteristics
   */
  private categorizeBottleneck(stage: any): 'cpu' | 'memory' | 'io' | 'network' | 'dependency' {
    const stageName = stage.name.toLowerCase();
    
    if (stageName.includes('build') || stageName.includes('compile')) {
      return 'cpu';
    } else if (stageName.includes('test')) {
      return 'memory';
    } else if (stageName.includes('deploy') || stageName.includes('upload')) {
      return 'network';
    } else if (stageName.includes('install') || stageName.includes('download')) {
      return 'io';
    } else {
      return 'dependency';
    }
  }

  /**
   * Generate bottleneck-specific suggestions
   */
  private generateBottleneckSuggestions(stage: any): string[] {
    const suggestions: string[] = [];
    const stageName = stage.name.toLowerCase();

    if (stageName.includes('build')) {
      suggestions.push(
        'Enable build caching to avoid rebuilding unchanged code',
        'Use incremental builds where possible',
        'Optimize build tools configuration'
      );
    } else if (stageName.includes('test')) {
      suggestions.push(
        'Run tests in parallel',
        'Use test result caching',
        'Optimize slow test cases'
      );
    } else if (stageName.includes('deploy')) {
      suggestions.push(
        'Use deployment artifacts caching',
        'Optimize deployment scripts',
        'Consider blue-green deployment for faster rollbacks'
      );
    } else {
      suggestions.push(
        'Analyze stage logs for performance issues',
        'Consider breaking down into smaller stages',
        'Optimize stage dependencies'
      );
    }

    return suggestions;
  }

  /**
   * Identify pipeline inefficiencies
   */
  private identifyInefficiencies(metrics: CICDMetrics): Inefficiency[] {
    const inefficiencies: Inefficiency[] = [];

    // Check for redundant stages
    const stageNames = metrics.stages.map(s => s.name);
    const duplicates = stageNames.filter((name, index) => 
      stageNames.indexOf(name) !== index
    );

    if (duplicates.length > 0) {
      inefficiencies.push({
        type: 'redundant',
        description: `Duplicate stages detected: ${duplicates.join(', ')}`,
        impact: 'Medium - increases pipeline duration unnecessarily',
        solution: 'Consolidate or remove duplicate stages'
      });
    }

    // Check for sequential stages that could be parallel
    const independentStages = metrics.stages.filter(stage => 
      !stage.logs?.includes('depends on') && 
      stage.name !== 'deploy' // Deploy usually needs to be sequential
    );

    if (independentStages.length > 2) {
      inefficiencies.push({
        type: 'sequential',
        description: `${independentStages.length} independent stages running sequentially`,
        impact: 'High - significant time savings possible with parallelization',
        solution: 'Configure parallel execution for independent stages'
      });
    }

    // Check for oversized artifacts
    if (metrics.artifacts.size > 1000000000) { // 1GB
      inefficiencies.push({
        type: 'oversized',
        description: `Large artifacts (${Math.round(metrics.artifacts.size / 1000000)}MB) slow down pipeline`,
        impact: 'Medium - affects upload/download times',
        solution: 'Optimize artifact size or use artifact compression'
      });
    }

    // Check for misconfigured timeouts
    const longTimeouts = metrics.stages.filter(stage => 
      stage.duration < 60000 && // Stage completes in under 1 minute
      stage.logs?.includes('timeout: 30m') // But has 30 minute timeout
    );

    if (longTimeouts.length > 0) {
      inefficiencies.push({
        type: 'misconfigured',
        description: 'Stages with unnecessarily long timeouts detected',
        impact: 'Low - may delay failure detection',
        solution: 'Adjust timeouts to match actual stage duration needs'
      });
    }

    return inefficiencies;
  }

  /**
   * Generate analysis-based recommendations
   */
  private generateRecommendations(
    metrics: CICDMetrics,
    bottlenecks: Bottleneck[],
    inefficiencies: Inefficiency[]
  ): string[] {
    const recommendations: string[] = [];

    // Bottleneck recommendations
    if (bottlenecks.length > 0) {
      const topBottleneck = bottlenecks[0];
      recommendations.push(
        `Address primary bottleneck in ${topBottleneck.stage} stage (${Math.round(topBottleneck.impact * 100)}% impact)`
      );
      
      if (topBottleneck.suggestions.length > 0) {
        recommendations.push(topBottleneck.suggestions[0]);
      }
    }

    // Inefficiency recommendations
    inefficiencies.forEach(inefficiency => {
      if (inefficiency.type === 'sequential' || inefficiency.type === 'redundant') {
        recommendations.push(inefficiency.solution);
      }
    });

    // Performance recommendations
    if (metrics.duration > 1800000) { // 30 minutes
      recommendations.push('Pipeline duration exceeds 30 minutes - consider optimization');
    }

    if (metrics.testResults.failed > 0) {
      recommendations.push(`Fix ${metrics.testResults.failed} failing tests to improve reliability`);
    }

    // Resource optimization
    if (metrics.performance.resourceUsage.cpu > 70) {
      recommendations.push('High CPU usage detected - consider optimizing compute-intensive tasks');
    }

    if (metrics.performance.resourceUsage.memory > 70) {
      recommendations.push('High memory usage detected - optimize memory allocation');
    }

    return recommendations.slice(0, 10); // Limit to top 10 recommendations
  }

  /**
   * Analyze performance trends
   */
  private analyzeTrends(): TrendAnalysis {
    if (this.metricsHistory.length < 5) {
      return this.getEmptyTrends();
    }

    const recent = this.metricsHistory.slice(-5);
    const previous = this.metricsHistory.slice(-10, -5);

    return {
      duration: this.analyzeTrendData(
        recent.map(m => m.duration),
        previous.map(m => m.duration)
      ),
      successRate: this.analyzeTrendData(
        recent.map(m => m.status === 'success' ? 1 : 0),
        previous.map(m => m.status === 'success' ? 1 : 0)
      ),
      resourceUsage: this.analyzeTrendData(
        recent.map(m => m.performance.resourceUsage.cpu),
        previous.map(m => m.performance.resourceUsage.cpu)
      ),
      testCoverage: this.analyzeTrendData(
        recent.map(m => m.testResults.coverage?.statements || 0),
        previous.map(m => m.testResults.coverage?.statements || 0)
      )
    };
  }

  /**
   * Analyze trend for specific data points
   */
  private analyzeTrendData(recent: number[], previous: number[]): {
    current: number;
    previous: number;
    trend: 'improving' | 'degrading' | 'stable';
    change: number;
  } {
    const currentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const previousAvg = previous.reduce((sum, val) => sum + val, 0) / previous.length;
    
    const change = previousAvg !== 0 ? ((currentAvg - previousAvg) / previousAvg) * 100 : 0;
    const threshold = 5; // 5% change threshold

    let trend: 'improving' | 'degrading' | 'stable';
    if (Math.abs(change) < threshold) {
      trend = 'stable';
    } else if (change > 0) {
      // For duration and resource usage, increase is degrading
      // For success rate and coverage, increase is improving
      trend = recent[0] < 1 ? 'degrading' : 'improving';
    } else {
      trend = recent[0] < 1 ? 'improving' : 'degrading';
    }

    return {
      current: currentAvg,
      previous: previousAvg,
      trend,
      change: Math.abs(change)
    };
  }

  /**
   * Calculate stage frequency in recent builds
   */
  private calculateStageFrequency(stageName: string): number {
    if (this.metricsHistory.length === 0) return 1.0;

    const occurrences = this.metricsHistory.filter(metrics =>
      metrics.stages.some(stage => stage.name === stageName)
    ).length;

    return occurrences / this.metricsHistory.length;
  }

  /**
   * Calculate queue time frequency
   */
  private calculateQueueFrequency(): number {
    if (this.metricsHistory.length === 0) return 1.0;

    const highQueueBuilds = this.metricsHistory.filter(metrics =>
      metrics.performance.queueTime > 300000
    ).length;

    return highQueueBuilds / this.metricsHistory.length;
  }

  /**
   * Get empty trends for insufficient data
   */
  private getEmptyTrends(): TrendAnalysis {
    const emptyTrend = {
      current: 0,
      previous: 0,
      trend: 'stable' as const,
      change: 0
    };

    return {
      duration: emptyTrend,
      successRate: emptyTrend,
      resourceUsage: emptyTrend,
      testCoverage: emptyTrend
    };
  }

  /**
   * Get pipeline health score
   */
  getPipelineHealthScore(metrics: CICDMetrics): {
    score: number;
    factors: HealthFactor[];
  } {
    const factors: HealthFactor[] = [];
    let totalScore = 0;
    let maxScore = 0;

    // Success rate factor (30% weight)
    const successRate = metrics.status === 'success' ? 100 : 0;
    factors.push({
      name: 'Success Rate',
      score: successRate,
      weight: 30,
      impact: successRate * 0.3
    });
    totalScore += successRate * 0.3;
    maxScore += 100 * 0.3;

    // Duration factor (25% weight)
    const durationScore = Math.max(0, 100 - (metrics.duration / 1800000) * 100); // 30 min baseline
    factors.push({
      name: 'Duration',
      score: durationScore,
      weight: 25,
      impact: durationScore * 0.25
    });
    totalScore += durationScore * 0.25;
    maxScore += 100 * 0.25;

    // Test coverage factor (20% weight)
    const coverageScore = metrics.testResults.coverage?.statements || 0;
    factors.push({
      name: 'Test Coverage',
      score: coverageScore,
      weight: 20,
      impact: coverageScore * 0.2
    });
    totalScore += coverageScore * 0.2;
    maxScore += 100 * 0.2;

    // Resource efficiency factor (15% weight)
    const resourceScore = Math.max(0, 100 - Math.max(
      metrics.performance.resourceUsage.cpu,
      metrics.performance.resourceUsage.memory
    ));
    factors.push({
      name: 'Resource Efficiency',
      score: resourceScore,
      weight: 15,
      impact: resourceScore * 0.15
    });
    totalScore += resourceScore * 0.15;
    maxScore += 100 * 0.15;

    // Quality gates factor (10% weight)
    const qualityScore = metrics.qualityGates ? 
      (metrics.qualityGates.passed / metrics.qualityGates.total) * 100 : 100;
    factors.push({
      name: 'Quality Gates',
      score: qualityScore,
      weight: 10,
      impact: qualityScore * 0.1
    });
    totalScore += qualityScore * 0.1;
    maxScore += 100 * 0.1;

    return {
      score: Math.round((totalScore / maxScore) * 100),
      factors
    };
  }

  /**
   * Clear analysis cache and history
   */
  clearCache(): void {
    this.analysisCache.clear();
    this.metricsHistory = [];
  }

  /**
   * Get analysis statistics
   */
  getAnalysisStats() {
    return {
      cacheSize: this.analysisCache.size,
      historySize: this.metricsHistory.length,
      avgDuration: this.metricsHistory.length > 0 
        ? this.metricsHistory.reduce((sum, m) => sum + m.duration, 0) / this.metricsHistory.length
        : 0,
      successRate: this.metricsHistory.length > 0
        ? this.metricsHistory.filter(m => m.status === 'success').length / this.metricsHistory.length
        : 0
    };
  }
}

// Supporting interfaces
interface HealthFactor {
  name: string;
  score: number;
  weight: number;
  impact: number;
}