/**
 * Recommendation Engine
 *
 * Generates intelligent, actionable recommendations for improving test quality
 * based on historical data analysis, trend predictions, and best practices.
 * Provides personalized suggestions for different team roles and contexts.
 */

import { EventEmitter } from 'events';

import { HistoricalDataManager } from './HistoricalDataManager';
import { QualityPredictor, QualityPrediction, QualityRecommendation } from './QualityPredictor';
import { TrendAnalyzer, TrendInsight } from './TrendAnalyzer';

export interface Recommendation {
  id: string;
  type: 'improvement' | 'optimization' | 'maintenance' | 'prevention';
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'coverage' | 'performance' | 'stability' | 'maintenance' | 'process';
  title: string;
  description: string;
  rationale: string;

  // Action details
  actionItems: ActionItem[];
  estimatedImpact: number; // 0-100
  estimatedEffort: 'low' | 'medium' | 'high';
  timeframe: string;

  // Context
  targetAudience: ('developer' | 'tester' | 'lead' | 'manager')[];
  prerequisites: string[];
  risks: string[];

  // Evidence
  supportingData: SupportingData[];
  confidence: number; // 0-1

  // Tracking
  status: 'new' | 'acknowledged' | 'in_progress' | 'completed' | 'dismissed';
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface ActionItem {
  id: string;
  description: string;
  type: 'code_change' | 'process_change' | 'tool_setup' | 'documentation' | 'training';
  estimatedHours: number;
  assignee?: string;
  dueDate?: Date;
  status: 'pending' | 'in_progress' | 'completed';
  dependencies: string[];
}

export interface SupportingData {
  type: 'metric' | 'trend' | 'comparison' | 'example';
  title: string;
  description: string;
  value?: number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  source: string;
}

export interface RecommendationContext {
  teamSize: number;
  projectPhase: 'development' | 'testing' | 'maintenance' | 'legacy';
  testingMaturity: 'basic' | 'intermediate' | 'advanced';
  availableResources: 'limited' | 'moderate' | 'abundant';
  timeConstraints: 'tight' | 'moderate' | 'flexible';
  riskTolerance: 'low' | 'medium' | 'high';
}

export interface RecommendationTemplate {
  id: string;
  name: string;
  category: string;
  triggers: RecommendationTrigger[];
  template: Partial<Recommendation>;
  customization: (context: RecommendationContext, data: any) => Partial<Recommendation>;
}

export interface RecommendationTrigger {
  type: 'metric_threshold' | 'trend_change' | 'anomaly' | 'prediction' | 'time_based';
  condition: string;
  threshold?: number;
  timeframe?: number;
}

export interface RecommendationReport {
  summary: {
    totalRecommendations: number;
    criticalCount: number;
    highPriorityCount: number;
    estimatedTotalImpact: number;
    estimatedTotalEffort: number;
  };
  recommendations: Recommendation[];
  insights: string[];
  nextSteps: string[];
  generatedAt: Date;
}

export class RecommendationEngine extends EventEmitter {
  private dataManager: HistoricalDataManager;
  private trendAnalyzer: TrendAnalyzer;
  private qualityPredictor: QualityPredictor;
  private templates: Map<string, RecommendationTemplate> = new Map();
  private recommendations: Map<string, Recommendation> = new Map();
  private context: RecommendationContext;

  constructor(
    dataManager: HistoricalDataManager,
    trendAnalyzer: TrendAnalyzer,
    qualityPredictor: QualityPredictor,
    context?: Partial<RecommendationContext>,
  ) {
    super();
    this.dataManager = dataManager;
    this.trendAnalyzer = trendAnalyzer;
    this.qualityPredictor = qualityPredictor;

    this.context = {
      teamSize: 5,
      projectPhase: 'development',
      testingMaturity: 'intermediate',
      availableResources: 'moderate',
      timeConstraints: 'moderate',
      riskTolerance: 'medium',
      ...context,
    };

    this.initializeRecommendationTemplates();
  }

  /**
   * Generate comprehensive recommendations based on current state
   */
  async generateRecommendations(days: number = 30): Promise<RecommendationReport> {
    const recommendations: Recommendation[] = [];

    // Get trend insights
    const trendInsights = await this.trendAnalyzer.generateTrendInsights(days);
    const trendRecommendations = await this.generateTrendBasedRecommendations(trendInsights);
    recommendations.push(...trendRecommendations);

    // Get quality predictions
    const qualityPredictions = await this.qualityPredictor.predictQualityMetrics();
    const predictionRecommendations = await this.generatePredictionBasedRecommendations(qualityPredictions);
    recommendations.push(...predictionRecommendations);

    // Get anomaly-based recommendations
    const anomalies = await this.trendAnalyzer.detectAnomalies(days);
    const anomalyRecommendations = await this.generateAnomalyBasedRecommendations(anomalies);
    recommendations.push(...anomalyRecommendations);

    // Get maintenance recommendations
    const maintenanceRecommendations = await this.generateMaintenanceRecommendations();
    recommendations.push(...maintenanceRecommendations);

    // Get process improvement recommendations
    const processRecommendations = await this.generateProcessRecommendations();
    recommendations.push(...processRecommendations);

    // Deduplicate and prioritize
    const finalRecommendations = this.deduplicateAndPrioritize(recommendations);

    // Store recommendations
    for (const rec of finalRecommendations) {
      this.recommendations.set(rec.id, rec);
    }

    // Generate summary
    const summary = this.generateSummary(finalRecommendations);
    const insights = this.generateInsights(finalRecommendations);
    const nextSteps = this.generateNextSteps(finalRecommendations);

    const report: RecommendationReport = {
      summary,
      recommendations: finalRecommendations,
      insights,
      nextSteps,
      generatedAt: new Date(),
    };

    this.emit('recommendationsGenerated', report);
    return report;
  }

  /**
   * Get personalized recommendations for specific role
   */
  async getPersonalizedRecommendations(
    role: 'developer' | 'tester' | 'lead' | 'manager',
    limit: number = 10,
  ): Promise<Recommendation[]> {
    const allRecommendations = Array.from(this.recommendations.values());

    return allRecommendations
      .filter(rec => rec.targetAudience.includes(role))
      .sort((a, b) => {
        // Sort by priority and impact
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return b.estimatedImpact - a.estimatedImpact;
      })
      .slice(0, limit);
  }

  /**
   * Update recommendation status
   */
  async updateRecommendationStatus(
    id: string,
    status: Recommendation['status'],
    notes?: string,
  ): Promise<void> {
    const recommendation = this.recommendations.get(id);
    if (!recommendation) {
      throw new Error(`Recommendation ${id} not found`);
    }

    recommendation.status = status;
    recommendation.updatedAt = new Date();

    if (status === 'completed') {
      recommendation.completedAt = new Date();
    }

    this.emit('recommendationStatusUpdated', { id, status, notes });
  }

  /**
   * Get recommendation effectiveness metrics
   */
  async getRecommendationEffectiveness(): Promise<{
    completionRate: number;
    averageTimeToComplete: number;
    impactRealized: number;
    topCategories: string[];
  }> {
    const allRecommendations = Array.from(this.recommendations.values());
    const completedRecommendations = allRecommendations.filter(r => r.status === 'completed');

    const completionRate = allRecommendations.length > 0 ?
      completedRecommendations.length / allRecommendations.length : 0;

    const averageTimeToComplete = completedRecommendations.length > 0 ?
      completedRecommendations.reduce((sum, r) => {
        if (r.completedAt && r.createdAt) {
          return sum + (r.completedAt.getTime() - r.createdAt.getTime());
        }
        return sum;
      }, 0) / completedRecommendations.length / (24 * 60 * 60 * 1000) : 0; // Convert to days

    const impactRealized = completedRecommendations.reduce((sum, r) => sum + r.estimatedImpact, 0);

    const categoryCount = new Map<string, number>();
    for (const rec of completedRecommendations) {
      categoryCount.set(rec.category, (categoryCount.get(rec.category) || 0) + 1);
    }

    const topCategories = Array.from(categoryCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category]) => category);

    return {
      completionRate,
      averageTimeToComplete,
      impactRealized,
      topCategories,
    };
  }

  /**
   * Export recommendations for external tools
   */
  exportRecommendations(format: 'json' | 'csv' | 'markdown' = 'json'): string {
    const recommendations = Array.from(this.recommendations.values());

    switch (format) {
      case 'json':
        return JSON.stringify(recommendations, null, 2);

      case 'csv':
        const headers = ['ID', 'Title', 'Priority', 'Category', 'Status', 'Impact', 'Effort', 'Created'];
        const rows = recommendations.map(r => [
          r.id, r.title, r.priority, r.category, r.status,
          r.estimatedImpact, r.estimatedEffort, r.createdAt.toISOString(),
        ]);
        return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');

      case 'markdown':
        return this.generateMarkdownReport(recommendations);

      default:
        return JSON.stringify(recommendations, null, 2);
    }
  }

  /**
   * Private helper methods
   */
  private initializeRecommendationTemplates(): void {
    // Coverage improvement templates
    this.templates.set('low_coverage', {
      id: 'low_coverage',
      name: 'Low Coverage Alert',
      category: 'coverage',
      triggers: [
        { type: 'metric_threshold', condition: 'coverage < 0.8', threshold: 0.8 },
      ],
      template: {
        type: 'improvement',
        priority: 'high',
        category: 'coverage',
        title: 'Improve Test Coverage',
        targetAudience: ['developer', 'tester', 'lead'],
      },
      customization: (context, data) => ({
        description: `Test coverage is below recommended threshold (${(data.coverage * 100).toFixed(1)}%)`,
        estimatedEffort: context.teamSize > 5 ? 'medium' : 'high',
      }),
    });

    // Performance optimization templates
    this.templates.set('slow_tests', {
      id: 'slow_tests',
      name: 'Slow Test Performance',
      category: 'performance',
      triggers: [
        { type: 'metric_threshold', condition: 'executionTime > 60', threshold: 60 },
      ],
      template: {
        type: 'optimization',
        priority: 'medium',
        category: 'performance',
        title: 'Optimize Test Performance',
        targetAudience: ['developer', 'lead'],
      },
      customization: (context, data) => ({
        description: `Test execution time is ${data.executionTime}s, which exceeds recommended threshold`,
        estimatedEffort: context.testingMaturity === 'advanced' ? 'low' : 'medium',
      }),
    });

    // Stability improvement templates
    this.templates.set('flaky_tests', {
      id: 'flaky_tests',
      name: 'Flaky Test Detection',
      category: 'stability',
      triggers: [
        { type: 'metric_threshold', condition: 'flakiness > 0.1', threshold: 0.1 },
      ],
      template: {
        type: 'improvement',
        priority: 'high',
        category: 'stability',
        title: 'Fix Flaky Tests',
        targetAudience: ['developer', 'tester'],
      },
      customization: (context, data) => ({
        description: `${data.flakyTestCount} flaky tests detected with ${(data.flakiness * 100).toFixed(1)}% failure rate`,
        estimatedEffort: 'high',
      }),
    });

    // Maintenance templates
    this.templates.set('outdated_tests', {
      id: 'outdated_tests',
      name: 'Outdated Test Maintenance',
      category: 'maintenance',
      triggers: [
        { type: 'time_based', condition: 'lastUpdate > 30', timeframe: 30 },
      ],
      template: {
        type: 'maintenance',
        priority: 'medium',
        category: 'maintenance',
        title: 'Update Outdated Tests',
        targetAudience: ['developer', 'tester'],
      },
      customization: (context, data) => ({
        description: `${data.outdatedTestCount} tests haven't been updated in over 30 days`,
        estimatedEffort: context.projectPhase === 'legacy' ? 'high' : 'medium',
      }),
    });
  }

  private async generateTrendBasedRecommendations(insights: TrendInsight[]): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    for (const insight of insights) {
      if (insight.type === 'degradation' && insight.severity === 'high') {
        const recommendation = await this.createRecommendationFromInsight(insight);
        if (recommendation) {
          recommendations.push(recommendation);
        }
      }
    }

    return recommendations;
  }

  private async generatePredictionBasedRecommendations(predictions: QualityPrediction[]): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    for (const prediction of predictions) {
      if (prediction.riskLevel === 'high' || prediction.trend === 'degrading') {
        const recommendation = await this.createRecommendationFromPrediction(prediction);
        if (recommendation) {
          recommendations.push(recommendation);
        }
      }
    }

    return recommendations;
  }

  private async generateAnomalyBasedRecommendations(anomalies: any[]): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    for (const anomaly of anomalies) {
      if (anomaly.severity === 'high') {
        const recommendation = await this.createRecommendationFromAnomaly(anomaly);
        if (recommendation) {
          recommendations.push(recommendation);
        }
      }
    }

    return recommendations;
  }

  private async generateMaintenanceRecommendations(): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Check for outdated tests
    const stats = this.dataManager.getStorageStats();
    if (stats.oldestRecord) {
      const daysSinceOldest = (Date.now() - stats.oldestRecord.getTime()) / (24 * 60 * 60 * 1000);

      if (daysSinceOldest > 90) {
        recommendations.push(this.createMaintenanceRecommendation(
          'cleanup_old_data',
          'Clean Up Old Test Data',
          `Test data older than ${Math.floor(daysSinceOldest)} days should be archived or cleaned up`,
          ['manager', 'lead'],
        ));
      }
    }

    return recommendations;
  }

  private async generateProcessRecommendations(): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Check test execution frequency
    const recentRecords = await this.dataManager.queryTestSuiteRecords(undefined, {
      limit: 10,
      sortBy: 'timestamp',
      sortOrder: 'desc',
    });

    if (recentRecords.length > 1) {
      const avgTimeBetweenRuns = recentRecords.slice(0, -1).reduce((sum, record, index) => {
        const nextRecord = recentRecords[index + 1];
        return sum + (record.timestamp.getTime() - nextRecord.timestamp.getTime());
      }, 0) / (recentRecords.length - 1);

      const daysBetweenRuns = avgTimeBetweenRuns / (24 * 60 * 60 * 1000);

      if (daysBetweenRuns > 1) {
        recommendations.push(this.createProcessRecommendation(
          'increase_test_frequency',
          'Increase Test Execution Frequency',
          `Tests are run every ${daysBetweenRuns.toFixed(1)} days on average. Consider more frequent execution.`,
          ['lead', 'manager'],
        ));
      }
    }

    return recommendations;
  }

  private async createRecommendationFromInsight(insight: TrendInsight): Promise<Recommendation | null> {
    const id = `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      id,
      type: 'improvement',
      priority: insight.severity,
      category: this.mapInsightToCategory(insight.metrics[0]),
      title: insight.title,
      description: insight.description,
      rationale: `Based on trend analysis over ${insight.timeframe}`,
      actionItems: insight.actionItems.map((item, index) => ({
        id: `${id}_action_${index}`,
        description: item,
        type: 'code_change' as const,
        estimatedHours: 4,
        status: 'pending' as const,
        dependencies: [],
      })),
      estimatedImpact: insight.confidence * 100,
      estimatedEffort: 'medium',
      timeframe: insight.timeframe,
      targetAudience: ['developer', 'tester'],
      prerequisites: [],
      risks: [],
      supportingData: [{
        type: 'trend',
        title: 'Trend Analysis',
        description: insight.description,
        trend: 'down',
        source: 'TrendAnalyzer',
      }],
      confidence: insight.confidence,
      status: 'new',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private async createRecommendationFromPrediction(prediction: QualityPrediction): Promise<Recommendation | null> {
    const id = `prediction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      id,
      type: 'prevention',
      priority: prediction.riskLevel === 'high' ? 'critical' : 'high',
      category: this.mapMetricToCategory(prediction.metric),
      title: `Prevent ${prediction.metric} Degradation`,
      description: `${prediction.metric} is predicted to ${prediction.trend} from ${prediction.currentValue.toFixed(2)} to ${prediction.predictedValue.toFixed(2)}`,
      rationale: `Based on predictive analysis with ${(prediction.confidence * 100).toFixed(1)}% confidence`,
      actionItems: prediction.factors.slice(0, 3).map((factor, index) => ({
        id: `${id}_action_${index}`,
        description: `Address ${factor.name}: ${factor.description}`,
        type: 'code_change' as const,
        estimatedHours: Math.abs(factor.impact) * 8,
        status: 'pending' as const,
        dependencies: [],
      })),
      estimatedImpact: prediction.confidence * 80,
      estimatedEffort: prediction.riskLevel === 'high' ? 'high' : 'medium',
      timeframe: `${prediction.timeframe} days`,
      targetAudience: ['developer', 'lead'],
      prerequisites: [],
      risks: [`Risk level: ${prediction.riskLevel}`],
      supportingData: [{
        type: 'metric',
        title: `${prediction.metric} Prediction`,
        description: `Predicted change from ${prediction.currentValue.toFixed(2)} to ${prediction.predictedValue.toFixed(2)}`,
        value: prediction.predictedValue,
        trend: prediction.trend === 'improving' ? 'up' : 'down',
        source: 'QualityPredictor',
      }],
      confidence: prediction.confidence,
      status: 'new',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private async createRecommendationFromAnomaly(anomaly: any): Promise<Recommendation | null> {
    const id = `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      id,
      type: 'improvement',
      priority: anomaly.severity,
      category: this.mapMetricToCategory(anomaly.metric),
      title: `Address ${anomaly.metric} Anomaly`,
      description: anomaly.description,
      rationale: `Anomaly detected in ${anomaly.metric} metrics`,
      actionItems: anomaly.possibleCauses.map((cause: string, index: number) => ({
        id: `${id}_action_${index}`,
        description: `Investigate: ${cause}`,
        type: 'code_change' as const,
        estimatedHours: 2,
        status: 'pending' as const,
        dependencies: [],
      })),
      estimatedImpact: 60,
      estimatedEffort: 'medium',
      timeframe: '3 days',
      targetAudience: ['developer', 'tester'],
      prerequisites: [],
      risks: [],
      supportingData: [{
        type: 'metric',
        title: 'Anomaly Detection',
        description: `${anomaly.metric} anomaly: expected ${anomaly.expectedValue.toFixed(2)}, actual ${anomaly.actualValue.toFixed(2)}`,
        value: anomaly.actualValue,
        source: 'TrendAnalyzer',
      }],
      confidence: 0.8,
      status: 'new',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private createMaintenanceRecommendation(
    id: string,
    title: string,
    description: string,
    audience: ('developer' | 'tester' | 'lead' | 'manager')[],
  ): Recommendation {
    return {
      id: `maintenance_${id}_${Date.now()}`,
      type: 'maintenance',
      priority: 'medium',
      category: 'maintenance',
      title,
      description,
      rationale: 'Regular maintenance to keep test system healthy',
      actionItems: [{
        id: `${id}_action_1`,
        description: 'Review and clean up old test data',
        type: 'process_change',
        estimatedHours: 4,
        status: 'pending',
        dependencies: [],
      }],
      estimatedImpact: 40,
      estimatedEffort: 'low',
      timeframe: '1 week',
      targetAudience: audience,
      prerequisites: [],
      risks: [],
      supportingData: [],
      confidence: 0.9,
      status: 'new',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private createProcessRecommendation(
    id: string,
    title: string,
    description: string,
    audience: ('developer' | 'tester' | 'lead' | 'manager')[],
  ): Recommendation {
    return {
      id: `process_${id}_${Date.now()}`,
      type: 'improvement',
      priority: 'medium',
      category: 'process',
      title,
      description,
      rationale: 'Process improvement to enhance test effectiveness',
      actionItems: [{
        id: `${id}_action_1`,
        description: 'Review and update test execution process',
        type: 'process_change',
        estimatedHours: 8,
        status: 'pending',
        dependencies: [],
      }],
      estimatedImpact: 60,
      estimatedEffort: 'medium',
      timeframe: '2 weeks',
      targetAudience: audience,
      prerequisites: [],
      risks: [],
      supportingData: [],
      confidence: 0.7,
      status: 'new',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private deduplicateAndPrioritize(recommendations: Recommendation[]): Recommendation[] {
    // Simple deduplication based on title similarity
    const unique = new Map<string, Recommendation>();

    for (const rec of recommendations) {
      const key = rec.title.toLowerCase().replace(/\s+/g, '_');
      const existing = unique.get(key);

      if (!existing || rec.priority > existing.priority) {
        unique.set(key, rec);
      }
    }

    return Array.from(unique.values())
      .sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return b.estimatedImpact - a.estimatedImpact;
      })
      .slice(0, 20); // Limit to top 20 recommendations
  }

  private generateSummary(recommendations: Recommendation[]) {
    const criticalCount = recommendations.filter(r => r.priority === 'critical').length;
    const highPriorityCount = recommendations.filter(r => r.priority === 'high').length;
    const estimatedTotalImpact = recommendations.reduce((sum, r) => sum + r.estimatedImpact, 0);

    const effortMap = { low: 1, medium: 3, high: 5 };
    const estimatedTotalEffort = recommendations.reduce((sum, r) => sum + effortMap[r.estimatedEffort], 0);

    return {
      totalRecommendations: recommendations.length,
      criticalCount,
      highPriorityCount,
      estimatedTotalImpact,
      estimatedTotalEffort,
    };
  }

  private generateInsights(recommendations: Recommendation[]): string[] {
    const insights: string[] = [];

    const categoryCount = new Map<string, number>();
    for (const rec of recommendations) {
      categoryCount.set(rec.category, (categoryCount.get(rec.category) || 0) + 1);
    }

    const topCategory = Array.from(categoryCount.entries())
      .sort((a, b) => b[1] - a[1])[0];

    if (topCategory) {
      insights.push(`Most recommendations focus on ${topCategory[0]} (${topCategory[1]} items)`);
    }

    const criticalCount = recommendations.filter(r => r.priority === 'critical').length;
    if (criticalCount > 0) {
      insights.push(`${criticalCount} critical issues require immediate attention`);
    }

    return insights;
  }

  private generateNextSteps(recommendations: Recommendation[]): string[] {
    const nextSteps: string[] = [];

    const criticalRecs = recommendations.filter(r => r.priority === 'critical');
    if (criticalRecs.length > 0) {
      nextSteps.push(`Address ${criticalRecs.length} critical recommendations first`);
    }

    const quickWins = recommendations.filter(r => r.estimatedEffort === 'low' && r.estimatedImpact > 50);
    if (quickWins.length > 0) {
      nextSteps.push(`Consider ${quickWins.length} quick wins for immediate impact`);
    }

    nextSteps.push('Review recommendations with team leads');
    nextSteps.push('Prioritize based on current sprint capacity');

    return nextSteps;
  }

  private mapInsightToCategory(metric: string): Recommendation['category'] {
    const mapping: Record<string, Recommendation['category']> = {
      coverage: 'coverage',
      execution_time: 'performance',
      memory_usage: 'performance',
      pass_rate: 'stability',
      flakiness: 'stability',
    };

    return mapping[metric] || 'maintenance';
  }

  private mapMetricToCategory(metric: string): Recommendation['category'] {
    const mapping: Record<string, Recommendation['category']> = {
      coverage: 'coverage',
      passRate: 'stability',
      executionTime: 'performance',
      memoryUsage: 'performance',
      flakiness: 'stability',
      stability: 'stability',
      maintainability: 'maintenance',
    };

    return mapping[metric] || 'maintenance';
  }

  private generateMarkdownReport(recommendations: Recommendation[]): string {
    let markdown = '# Test Quality Recommendations\n\n';

    // Summary
    const summary = this.generateSummary(recommendations);
    markdown += '## Summary\n\n';
    markdown += `- Total Recommendations: ${summary.totalRecommendations}\n`;
    markdown += `- Critical: ${summary.criticalCount}\n`;
    markdown += `- High Priority: ${summary.highPriorityCount}\n`;
    markdown += `- Estimated Total Impact: ${summary.estimatedTotalImpact}\n\n`;

    // Recommendations by priority
    const priorities = ['critical', 'high', 'medium', 'low'] as const;

    for (const priority of priorities) {
      const priorityRecs = recommendations.filter(r => r.priority === priority);
      if (priorityRecs.length === 0) continue;

      markdown += `## ${priority.charAt(0).toUpperCase() + priority.slice(1)} Priority\n\n`;

      for (const rec of priorityRecs) {
        markdown += `### ${rec.title}\n\n`;
        markdown += `**Category:** ${rec.category}\n\n`;
        markdown += `**Description:** ${rec.description}\n\n`;
        markdown += `**Impact:** ${rec.estimatedImpact}/100\n\n`;
        markdown += `**Effort:** ${rec.estimatedEffort}\n\n`;

        if (rec.actionItems.length > 0) {
          markdown += '**Action Items:**\n';
          for (const action of rec.actionItems) {
            markdown += `- ${action.description}\n`;
          }
          markdown += '\n';
        }

        markdown += '---\n\n';
      }
    }

    return markdown;
  }
}
