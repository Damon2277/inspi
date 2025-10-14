/**
 * CI/CD Reporter
 * Generates comprehensive reports for CI/CD pipeline execution and optimization
 */

import { promises as fs } from 'fs';
import path from 'path';

import { CICDMetrics, PipelineOptimization, QualityGate } from './types';

export class CICDReporter {
  private outputDir: string;

  constructor(outputDir: string = './reports/cicd') {
    this.outputDir = outputDir;
  }

  /**
   * Generate comprehensive CI/CD report
   */
  async generateReport(
    metrics: CICDMetrics,
    optimization?: PipelineOptimization,
    qualityGates?: QualityGate[],
  ): Promise<CICDReport> {
    await this.ensureOutputDirectory();

    const report: CICDReport = {
      summary: this.generateSummary(metrics),
      pipeline: this.analyzePipeline(metrics),
      qualityGates: qualityGates ? this.analyzeQualityGates(qualityGates) : undefined,
      optimization: optimization ? this.summarizeOptimization(optimization) : undefined,
      recommendations: this.generateRecommendations(metrics, optimization),
      generatedAt: new Date().toISOString(),
    };

    // Generate different report formats
    await this.generateHtmlReport(report);
    await this.generateJsonReport(report);
    await this.generateMarkdownReport(report);

    return report;
  }

  /**
   * Generate pipeline summary
   */
  private generateSummary(metrics: CICDMetrics): PipelineSummary {
    return {
      pipelineId: metrics.pipelineId,
      buildNumber: metrics.buildNumber,
      status: metrics.status,
      duration: metrics.duration,
      stages: {
        total: metrics.stages.length,
        successful: metrics.stages.filter(s => s.status === 'success').length,
        failed: metrics.stages.filter(s => s.status === 'failure').length,
        skipped: metrics.stages.filter(s => s.status === 'skipped').length,
      },
      tests: metrics.testResults,
      artifacts: metrics.artifacts,
    };
  }

  /**
   * Analyze pipeline performance
   */
  private analyzePipeline(metrics: CICDMetrics): PipelineAnalysis {
    const totalDuration = metrics.duration;
    const stageAnalysis = metrics.stages.map(stage => ({
      name: stage.name,
      duration: stage.duration,
      percentage: (stage.duration / totalDuration) * 100,
      status: stage.status,
      bottleneck: stage.duration > totalDuration * 0.3, // More than 30% of total time
    }));

    const bottlenecks = stageAnalysis.filter(s => s.bottleneck);
    const longestStage = stageAnalysis.reduce((prev, current) =>
      prev.duration > current.duration ? prev : current,
    );

    return {
      totalDuration,
      stages: stageAnalysis,
      bottlenecks: bottlenecks.map(b => b.name),
      longestStage: longestStage.name,
      parallelizationOpportunities: this.identifyParallelizationOpportunities(metrics.stages),
      resourceUsage: metrics.performance.resourceUsage,
    };
  }

  /**
   * Analyze quality gates
   */
  private analyzeQualityGates(gates: QualityGate[]): QualityGateAnalysis {
    return {
      total: gates.length,
      passed: gates.filter(g => g.status === 'passed').length,
      failed: gates.filter(g => g.status === 'failed').length,
      warnings: gates.filter(g => g.status === 'warning').length,
      blocking: gates.filter(g => g.blocking).length,
      gates: gates.map(gate => ({
        name: gate.name,
        type: gate.type,
        status: gate.status,
        value: gate.value,
        threshold: gate.threshold,
        blocking: gate.blocking,
      })),
    };
  }

  /**
   * Summarize optimization recommendations
   */
  private summarizeOptimization(optimization: PipelineOptimization): OptimizationSummary {
    return {
      recommendations: optimization.recommendations.length,
      estimatedTimeReduction: optimization.estimatedImprovement.timeReduction,
      estimatedCostReduction: optimization.estimatedImprovement.costReduction,
      reliabilityImprovement: optimization.estimatedImprovement.reliabilityImprovement,
      implementationSteps: optimization.implementationPlan.length,
      highPriorityItems: optimization.recommendations.filter(r => r.priority === 'high').length,
    };
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    metrics: CICDMetrics,
    optimization?: PipelineOptimization,
  ): string[] {
    const recommendations: string[] = [];

    // Performance recommendations
    if (metrics.duration > 1800000) { // 30 minutes
      recommendations.push('Consider optimizing pipeline duration - current runtime exceeds 30 minutes');
    }

    // Test recommendations
    if (metrics.testResults.failed > 0) {
      recommendations.push(`Fix ${metrics.testResults.failed} failing tests to improve pipeline reliability`);
    }

    if (metrics.testResults.coverage && metrics.testResults.coverage.statements < 80) {
      recommendations.push('Increase test coverage to at least 80% for better code quality');
    }

    // Stage-specific recommendations
    const longStages = metrics.stages.filter(s => s.duration > 600000); // 10 minutes
    if (longStages.length > 0) {
      recommendations.push(`Optimize long-running stages: ${longStages.map(s => s.name).join(', ')}`);
    }

    // Add optimization recommendations
    if (optimization) {
      optimization.recommendations
        .filter(r => r.priority === 'high')
        .forEach(r => recommendations.push(r.title));
    }

    return recommendations;
  }

  /**
   * Identify parallelization opportunities
   */
  private identifyParallelizationOpportunities(stages: any[]): string[] {
    const opportunities: string[] = [];

    // Look for sequential stages that could run in parallel
    const independentStages = stages.filter(stage =>
      !stage.dependencies || stage.dependencies.length === 0,
    );

    if (independentStages.length > 1) {
      opportunities.push(`${independentStages.length} independent stages could run in parallel`);
    }

    // Look for test stages that could be parallelized
    const testStages = stages.filter(stage =>
      stage.name.toLowerCase().includes('test'),
    );

    if (testStages.length > 1) {
      opportunities.push('Test stages could be parallelized by test type or module');
    }

    return opportunities;
  }

  /**
   * Generate HTML report
   */
  private async generateHtmlReport(report: CICDReport): Promise<void> {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CI/CD Pipeline Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px; }
        .card { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
        .metric { text-align: center; padding: 20px; }
        .metric-value { font-size: 2em; font-weight: bold; margin-bottom: 10px; }
        .metric-label { color: #666; }
        .status-success { color: #28a745; }
        .status-failure { color: #dc3545; }
        .status-warning { color: #ffc107; }
        .progress-bar { width: 100%; height: 20px; background: #e9ecef; border-radius: 10px; overflow: hidden; }
        .progress-fill { height: 100%; background: #007bff; transition: width 0.3s ease; }
        .stage-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #eee; }
        .recommendations { background: #e7f3ff; border-left: 4px solid #007bff; }
        ul { padding-left: 20px; }
        li { margin-bottom: 8px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>CI/CD Pipeline Report</h1>
            <p>Pipeline: ${report.summary.pipelineId} | Build: #${report.summary.buildNumber}</p>
            <p>Generated: ${new Date(report.generatedAt).toLocaleString()}</p>
        </div>

        <div class="grid">
            <div class="card metric">
                <div class="metric-value status-${report.summary.status}">${report.summary.status.toUpperCase()}</div>
                <div class="metric-label">Pipeline Status</div>
            </div>
            <div class="card metric">
                <div class="metric-value">${Math.round(report.summary.duration / 1000 / 60)}m</div>
                <div class="metric-label">Total Duration</div>
            </div>
            <div class="card metric">
                <div class="metric-value">${report.summary.stages.successful}/${report.summary.stages.total}</div>
                <div class="metric-label">Stages Passed</div>
            </div>
            <div class="card metric">
                <div class="metric-value">${report.summary.tests.passed}/${report.summary.tests.total}</div>
                <div class="metric-label">Tests Passed</div>
            </div>
        </div>

        <div class="card">
            <h2>Pipeline Stages</h2>
            ${report.pipeline.stages.map(stage => `
                <div class="stage-item">
                    <span>${stage.name}</span>
                    <span>
                        <span class="status-${stage.status}">${stage.status}</span>
                        | ${Math.round(stage.duration / 1000)}s (${stage.percentage.toFixed(1)}%)
                        ${stage.bottleneck ? ' ⚠️ Bottleneck' : ''}
                    </span>
                </div>
            `).join('')}
        </div>

        ${report.qualityGates ? `
        <div class="card">
            <h2>Quality Gates</h2>
            <div class="grid">
                <div class="metric">
                    <div class="metric-value status-success">${report.qualityGates.passed}</div>
                    <div class="metric-label">Passed</div>
                </div>
                <div class="metric">
                    <div class="metric-value status-failure">${report.qualityGates.failed}</div>
                    <div class="metric-label">Failed</div>
                </div>
                <div class="metric">
                    <div class="metric-value status-warning">${report.qualityGates.warnings}</div>
                    <div class="metric-label">Warnings</div>
                </div>
            </div>
        </div>
        ` : ''}

        ${report.optimization ? `
        <div class="card">
            <h2>Optimization Opportunities</h2>
            <div class="grid">
                <div class="metric">
                    <div class="metric-value">${Math.round(report.optimization.estimatedTimeReduction * 100)}%</div>
                    <div class="metric-label">Time Reduction</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${Math.round(report.optimization.estimatedCostReduction * 100)}%</div>
                    <div class="metric-label">Cost Reduction</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${report.optimization.highPriorityItems}</div>
                    <div class="metric-label">High Priority Items</div>
                </div>
            </div>
        </div>
        ` : ''}

        <div class="card recommendations">
            <h2>Recommendations</h2>
            <ul>
                ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        </div>
    </div>
</body>
</html>`;

    await fs.writeFile(path.join(this.outputDir, 'cicd-report.html'), html, 'utf8');
  }

  /**
   * Generate JSON report
   */
  private async generateJsonReport(report: CICDReport): Promise<void> {
    const json = JSON.stringify(report, null, 2);
    await fs.writeFile(path.join(this.outputDir, 'cicd-report.json'), json, 'utf8');
  }

  /**
   * Generate Markdown report
   */
  private async generateMarkdownReport(report: CICDReport): Promise<void> {
    const markdown = `# CI/CD Pipeline Report

**Pipeline:** ${report.summary.pipelineId}  
**Build:** #${report.summary.buildNumber}  
**Status:** ${report.summary.status.toUpperCase()}  
**Duration:** ${Math.round(report.summary.duration / 1000 / 60)} minutes  
**Generated:** ${new Date(report.generatedAt).toLocaleString()}

## Summary

| Metric | Value |
|--------|-------|
| Pipeline Status | ${report.summary.status.toUpperCase()} |
| Total Duration | ${Math.round(report.summary.duration / 1000 / 60)}m |
| Stages Passed | ${report.summary.stages.successful}/${report.summary.stages.total} |
| Tests Passed | ${report.summary.tests.passed}/${report.summary.tests.total} |
| Test Coverage | ${report.summary.tests.coverage?.statements || 'N/A'}% |

## Pipeline Stages

| Stage | Status | Duration | % of Total |
|-------|--------|----------|------------|
${report.pipeline.stages.map(stage =>
  `| ${stage.name} | ${stage.status} | ${Math.round(stage.duration / 1000)}s | ${stage.percentage.toFixed(1)}% |`,
).join('\n')}

${report.pipeline.bottlenecks.length > 0 ? `
## Bottlenecks

The following stages are taking more than 30% of the total pipeline time:
${report.pipeline.bottlenecks.map(b => `- ${b}`).join('\n')}
` : ''}

${report.qualityGates ? `
## Quality Gates

| Status | Count |
|--------|-------|
| Passed | ${report.qualityGates.passed} |
| Failed | ${report.qualityGates.failed} |
| Warnings | ${report.qualityGates.warnings} |
| Blocking | ${report.qualityGates.blocking} |
` : ''}

${report.optimization ? `
## Optimization Opportunities

- **Estimated Time Reduction:** ${Math.round(report.optimization.estimatedTimeReduction * 100)}%
- **Estimated Cost Reduction:** ${Math.round(report.optimization.estimatedCostReduction * 100)}%
- **High Priority Items:** ${report.optimization.highPriorityItems}
- **Implementation Steps:** ${report.optimization.implementationSteps}
` : ''}

## Recommendations

${report.recommendations.map(rec => `- ${rec}`).join('\n')}

---
*Report generated on ${new Date(report.generatedAt).toLocaleString()}*`;

    await fs.writeFile(path.join(this.outputDir, 'cicd-report.md'), markdown, 'utf8');
  }

  /**
   * Ensure output directory exists
   */
  private async ensureOutputDirectory(): Promise<void> {
    try {
      await fs.access(this.outputDir);
    } catch {
      await fs.mkdir(this.outputDir, { recursive: true });
    }
  }
}

// Supporting interfaces
interface CICDReport {
  summary: PipelineSummary;
  pipeline: PipelineAnalysis;
  qualityGates?: QualityGateAnalysis;
  optimization?: OptimizationSummary;
  recommendations: string[];
  generatedAt: string;
}

interface PipelineSummary {
  pipelineId: string;
  buildNumber: number;
  status: string;
  duration: number;
  stages: {
    total: number;
    successful: number;
    failed: number;
    skipped: number;
  };
  tests: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
    coverage?: {
      statements: number;
      branches: number;
      functions: number;
      lines: number;
    };
  };
  artifacts: {
    total: number;
    size: number;
    types: Record<string, number>;
  };
}

interface PipelineAnalysis {
  totalDuration: number;
  stages: {
    name: string;
    duration: number;
    percentage: number;
    status: string;
    bottleneck: boolean;
  }[];
  bottlenecks: string[];
  longestStage: string;
  parallelizationOpportunities: string[];
  resourceUsage: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  };
}

interface QualityGateAnalysis {
  total: number;
  passed: number;
  failed: number;
  warnings: number;
  blocking: number;
  gates: {
    name: string;
    type: string;
    status: string;
    value: number;
    threshold: number;
    blocking: boolean;
  }[];
}

interface OptimizationSummary {
  recommendations: number;
  estimatedTimeReduction: number;
  estimatedCostReduction: number;
  reliabilityImprovement: number;
  implementationSteps: number;
  highPriorityItems: number;
}
