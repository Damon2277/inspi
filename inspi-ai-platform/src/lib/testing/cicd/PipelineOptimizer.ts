/**
 * Pipeline Optimizer
 * Analyzes and optimizes CI/CD pipelines for better performance and efficiency
 */

import {
  PipelineConfig,
  PipelineOptimization,
  OptimizationRecommendation,
  ImprovementEstimate,
  ImplementationStep,
  CICDMetrics,
  PipelineAnalysis,
} from './types';

export class PipelineOptimizer {
  private metricsHistory: CICDMetrics[] = [];
  private optimizationCache = new Map<string, PipelineOptimization>();

  /**
   * Analyze pipeline and generate optimization recommendations
   */
  async optimizePipeline(
    config: PipelineConfig,
    metrics?: CICDMetrics[],
  ): Promise<PipelineOptimization> {
    const cacheKey = this.generateCacheKey(config);

    if (this.optimizationCache.has(cacheKey)) {
      return this.optimizationCache.get(cacheKey)!;
    }

    console.log(`🔧 Analyzing pipeline: ${config.name}`);

    // Store metrics for analysis
    if (metrics) {
      this.metricsHistory.push(...metrics);
    }

    const analysis = await this.analyzePipeline(config);
    const recommendations = this.generateRecommendations(config, analysis);
    const estimatedImprovement = this.estimateImprovement(recommendations);
    const implementationPlan = this.createImplementationPlan(recommendations);

    const optimization: PipelineOptimization = {
      recommendations,
      estimatedImprovement,
      implementationPlan,
    };

    this.optimizationCache.set(cacheKey, optimization);
    return optimization;
  }

  /**
   * Analyze pipeline configuration and performance
   */
  private async analyzePipeline(config: PipelineConfig): Promise<PipelineAnalysis> {
    const bottlenecks = this.identifyBottlenecks(config);
    const inefficiencies = this.identifyInefficiencies(config);
    const recommendations = this.generateBasicRecommendations(config);
    const trends = this.analyzeTrends();

    return {
      bottlenecks,
      inefficiencies,
      recommendations,
      trends,
    };
  }

  /**
   * Identify performance bottlenecks
   */
  private identifyBottlenecks(config: PipelineConfig) {
    const bottlenecks = [];

    // Check for sequential stages that could be parallelized
    const sequentialStages = config.stages.filter(stage =>
      stage.dependencies.length === 0 && stage.type !== 'deploy',
    );

    if (sequentialStages.length > 1 && !config.parallelization.enabled) {
      bottlenecks.push({
        stage: 'multiple',
        type: 'dependency' as const,
        impact: 0.8,
        frequency: 1.0,
        suggestions: ['Enable parallelization for independent stages'],
      });
    }

    // Check for long-running stages
    config.stages.forEach(stage => {
      if (stage.timeout > 1800000) { // 30 minutes
        bottlenecks.push({
          stage: stage.name,
          type: 'cpu' as const,
          impact: 0.6,
          frequency: 0.8,
          suggestions: [
            'Consider breaking down into smaller stages',
            'Optimize build/test commands',
            'Use more powerful runners',
          ],
        });
      }
    });

    // Check for missing caching
    if (!config.caching.enabled) {
      bottlenecks.push({
        stage: 'all',
        type: 'io' as const,
        impact: 0.7,
        frequency: 1.0,
        suggestions: ['Enable dependency caching', 'Cache build artifacts'],
      });
    }

    return bottlenecks;
  }

  /**
   * Identify pipeline inefficiencies
   */
  private identifyInefficiencies(config: PipelineConfig) {
    const inefficiencies = [];

    // Check for redundant stages
    const stageNames = config.stages.map(s => s.name);
    const duplicates = stageNames.filter((name, index) =>
      stageNames.indexOf(name) !== index,
    );

    if (duplicates.length > 0) {
      inefficiencies.push({
        type: 'redundant' as const,
        description: `Duplicate stages found: ${duplicates.join(', ')}`,
        impact: 'Medium - increases pipeline duration',
        solution: 'Consolidate or remove duplicate stages',
      });
    }

    // Check for oversized matrix builds
    if (config.parallelization.matrix) {
      const matrixSize = Object.values(config.parallelization.matrix)
        .reduce((acc, arr) => acc * arr.length, 1);

      if (matrixSize > 20) {
        inefficiencies.push({
          type: 'oversized' as const,
          description: `Large matrix build with ${matrixSize} combinations`,
          impact: 'High - excessive resource usage and cost',
          solution: 'Reduce matrix dimensions or use selective testing',
        });
      }
    }

    // Check for missing stage dependencies
    config.stages.forEach(stage => {
      if (stage.type === 'deploy' && stage.dependencies.length === 0) {
        inefficiencies.push({
          type: 'misconfigured' as const,
          description: `Deploy stage "${stage.name}" has no dependencies`,
          impact: 'High - potential deployment of untested code',
          solution: 'Add test and build stages as dependencies',
        });
      }
    });

    return inefficiencies;
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(
    config: PipelineConfig,
    analysis: PipelineAnalysis,
  ): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    // Caching recommendations
    if (!config.caching.enabled) {
      recommendations.push({
        type: 'caching',
        priority: 'high',
        title: 'Enable Dependency Caching',
        description: 'Cache node_modules and other dependencies to reduce build time',
        impact: '30-50% reduction in build time',
        effort: 'Low - 15 minutes to implement',
        implementation: 'Add caching configuration to pipeline',
      });
    }

    // Parallelization recommendations
    if (!config.parallelization.enabled) {
      const parallelizableStages = config.stages.filter(stage =>
        stage.dependencies.length === 0 && stage.type !== 'deploy',
      );

      if (parallelizableStages.length > 1) {
        recommendations.push({
          type: 'parallelization',
          priority: 'high',
          title: 'Enable Stage Parallelization',
          description: 'Run independent stages in parallel to reduce total pipeline time',
          impact: `${Math.min(parallelizableStages.length * 20, 60)}% reduction in pipeline time`,
          effort: 'Medium - 30 minutes to implement',
          implementation: 'Configure parallel execution for independent stages',
        });
      }
    }

    // Resource optimization
    const longStages = config.stages.filter(stage => stage.timeout > 1800000);
    if (longStages.length > 0) {
      recommendations.push({
        type: 'resource',
        priority: 'medium',
        title: 'Optimize Long-Running Stages',
        description: 'Break down long stages and optimize resource usage',
        impact: '20-30% reduction in stage duration',
        effort: 'High - 2-4 hours to implement',
        implementation: 'Analyze and optimize slow commands, consider stage splitting',
      });
    }

    // Configuration recommendations
    if (config.stages.some(stage => stage.retries === 0)) {
      recommendations.push({
        type: 'configuration',
        priority: 'medium',
        title: 'Add Retry Logic',
        description: 'Add retry logic to handle transient failures',
        impact: 'Improved pipeline reliability',
        effort: 'Low - 10 minutes to implement',
        implementation: 'Configure retry attempts for flaky stages',
      });
    }

    return recommendations;
  }

  /**
   * Generate basic recommendations
   */
  private generateBasicRecommendations(config: PipelineConfig): string[] {
    const recommendations = [];

    if (!config.caching.enabled) {
      recommendations.push('Enable caching to reduce build times');
    }

    if (!config.parallelization.enabled) {
      recommendations.push('Consider parallelizing independent stages');
    }

    if (config.stages.length > 10) {
      recommendations.push('Consider grouping related stages to reduce complexity');
    }

    if (!config.qualityGates.length) {
      recommendations.push('Add quality gates to ensure code quality');
    }

    return recommendations;
  }

  /**
   * Estimate improvement from recommendations
   */
  private estimateImprovement(recommendations: OptimizationRecommendation[]): ImprovementEstimate {
    let timeReduction = 0;
    let costReduction = 0;
    let reliabilityImprovement = 0;

    recommendations.forEach(rec => {
      switch (rec.type) {
        case 'caching':
          timeReduction += 0.35; // 35% average improvement
          costReduction += 0.25;
          break;
        case 'parallelization':
          timeReduction += 0.40; // 40% average improvement
          costReduction += 0.15;
          break;
        case 'resource':
          timeReduction += 0.25;
          costReduction += 0.30;
          break;
        case 'configuration':
          reliabilityImprovement += 0.20;
          break;
      }
    });

    // Cap improvements at realistic levels
    timeReduction = Math.min(timeReduction, 0.70);
    costReduction = Math.min(costReduction, 0.60);
    reliabilityImprovement = Math.min(reliabilityImprovement, 0.50);

    return {
      timeReduction,
      costReduction,
      reliabilityImprovement,
      confidence: 0.85,
    };
  }

  /**
   * Create implementation plan
   */
  private createImplementationPlan(recommendations: OptimizationRecommendation[]): ImplementationStep[] {
    const steps: ImplementationStep[] = [];
    let order = 1;

    // Sort by priority and impact
    const sortedRecs = recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    sortedRecs.forEach(rec => {
      switch (rec.type) {
        case 'caching':
          steps.push({
            order: order++,
            title: 'Implement Dependency Caching',
            description: 'Add caching configuration to reduce build times',
            files: [{
              path: '.github/workflows/ci.yml',
              action: 'update',
              content: this.generateCachingConfig(),
            }],
            validation: 'Verify cache is being used in pipeline logs',
          });
          break;

        case 'parallelization':
          steps.push({
            order: order++,
            title: 'Enable Parallel Execution',
            description: 'Configure stages to run in parallel where possible',
            files: [{
              path: '.github/workflows/ci.yml',
              action: 'update',
              content: this.generateParallelConfig(),
            }],
            validation: 'Check that independent stages run simultaneously',
          });
          break;

        case 'configuration':
          steps.push({
            order: order++,
            title: 'Add Retry Configuration',
            description: 'Configure retry logic for improved reliability',
            files: [{
              path: '.github/workflows/ci.yml',
              action: 'update',
              content: this.generateRetryConfig(),
            }],
            validation: 'Test that failed stages are retried automatically',
          });
          break;
      }
    });

    return steps;
  }

  /**
   * Analyze performance trends
   */
  private analyzeTrends() {
    if (this.metricsHistory.length < 2) {
      return {
        duration: { current: 0, previous: 0, trend: 'stable' as const, change: 0 },
        successRate: { current: 0, previous: 0, trend: 'stable' as const, change: 0 },
        resourceUsage: { current: 0, previous: 0, trend: 'stable' as const, change: 0 },
        testCoverage: { current: 0, previous: 0, trend: 'stable' as const, change: 0 },
      };
    }

    const recent = this.metricsHistory.slice(-10);
    const older = this.metricsHistory.slice(-20, -10);

    const avgDurationRecent = recent.reduce((sum, m) => sum + m.duration, 0) / recent.length;
    const avgDurationOlder = older.reduce((sum, m) => sum + m.duration, 0) / older.length;

    const successRateRecent = recent.filter(m => m.status === 'success').length / recent.length;
    const successRateOlder = older.filter(m => m.status === 'success').length / older.length;

    return {
      duration: {
        current: avgDurationRecent,
        previous: avgDurationOlder,
        trend: avgDurationRecent < avgDurationOlder ? 'improving' :
               avgDurationRecent > avgDurationOlder ? 'degrading' : 'stable',
        change: ((avgDurationRecent - avgDurationOlder) / avgDurationOlder) * 100,
      },
      successRate: {
        current: successRateRecent,
        previous: successRateOlder,
        trend: successRateRecent > successRateOlder ? 'improving' :
               successRateRecent < successRateOlder ? 'degrading' : 'stable',
        change: ((successRateRecent - successRateOlder) / successRateOlder) * 100,
      },
      resourceUsage: { current: 0, previous: 0, trend: 'stable' as const, change: 0 },
      testCoverage: { current: 0, previous: 0, trend: 'stable' as const, change: 0 },
    };
  }

  /**
   * Generate caching configuration
   */
  private generateCachingConfig(): string {
    return `
      - name: Cache dependencies
        uses: actions/cache@v3
        with:
          path: ~/.npm
          key: \${{ runner.os }}-node-\${{ hashFiles('**/package-lock.json') }}
          restore-keys: |
            \${{ runner.os }}-node-
    `;
  }

  /**
   * Generate parallel configuration
   */
  private generateParallelConfig(): string {
    return `
    strategy:
      matrix:
        node-version: [18.x, 20.x]
        os: [ubuntu-latest, windows-latest, macos-latest]
      fail-fast: false
    `;
  }

  /**
   * Generate retry configuration
   */
  private generateRetryConfig(): string {
    return `
      - name: Run tests with retry
        uses: nick-invision/retry@v2
        with:
          timeout_minutes: 10
          max_attempts: 3
          command: npm test
    `;
  }

  /**
   * Generate cache key for optimization results
   */
  private generateCacheKey(config: PipelineConfig): string {
    const configHash = JSON.stringify({
      stages: config.stages.map(s => ({ name: s.name, type: s.type, timeout: s.timeout })),
      parallelization: config.parallelization,
      caching: config.caching,
    });

    return Buffer.from(configHash).toString('base64').slice(0, 32);
  }

  /**
   * Clear optimization cache
   */
  clearCache(): void {
    this.optimizationCache.clear();
  }

  /**
   * Get optimization statistics
   */
  getOptimizationStats() {
    return {
      cacheSize: this.optimizationCache.size,
      metricsCount: this.metricsHistory.length,
      avgImprovementEstimate: this.calculateAverageImprovement(),
    };
  }

  /**
   * Calculate average improvement from cached optimizations
   */
  private calculateAverageImprovement() {
    const optimizations = Array.from(this.optimizationCache.values());
    if (optimizations.length === 0) return null;

    const avgTimeReduction = optimizations.reduce((sum, opt) =>
      sum + opt.estimatedImprovement.timeReduction, 0) / optimizations.length;

    const avgCostReduction = optimizations.reduce((sum, opt) =>
      sum + opt.estimatedImprovement.costReduction, 0) / optimizations.length;

    return {
      timeReduction: avgTimeReduction,
      costReduction: avgCostReduction,
    };
  }
}
