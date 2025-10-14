/**
 * Quality Gate Manager
 * Manages automated quality gates for CI/CD pipelines
 */

import { QualityGate, QualityGateConfig, TestSummary, CoverageInfo } from './types';

export class QualityGateManager {
  private gates: Map<string, QualityGateConfig> = new Map();
  private results: Map<string, QualityGate> = new Map();

  /**
   * Register a quality gate
   */
  registerGate(gate: QualityGateConfig): void {
    this.gates.set(gate.name, gate);
  }

  /**
   * Evaluate all quality gates
   */
  async evaluateGates(
    testSummary: TestSummary,
    coverage?: CoverageInfo,
    customMetrics?: Record<string, number>,
  ): Promise<QualityGate[]> {
    console.log('🚪 Evaluating quality gates...');

    const results: QualityGate[] = [];

    for (const [name, config] of this.gates) {
      const result = await this.evaluateGate(config, testSummary, coverage, customMetrics);
      results.push(result);
      this.results.set(name, result);
    }

    return results;
  }

  /**
   * Evaluate a single quality gate
   */
  private async evaluateGate(
    config: QualityGateConfig,
    testSummary: TestSummary,
    coverage?: CoverageInfo,
    customMetrics?: Record<string, number>,
  ): Promise<QualityGate> {
    let value: number;
    let status: 'passed' | 'failed' | 'warning';

    switch (config.type) {
      case 'coverage':
        value = this.getCoverageValue(coverage, config.name);
        break;
      case 'performance':
        value = testSummary.duration;
        break;
      case 'security':
        value = customMetrics?.securityScore || 0;
        break;
      case 'custom':
        value = customMetrics?.[config.name] || 0;
        break;
      default:
        value = 0;
    }

    // Evaluate against threshold
    const passed = this.evaluateThreshold(value, config.threshold, config.operator);
    status = passed ? 'passed' : (config.blocking ? 'failed' : 'warning');

    return {
      id: `gate-${config.name}`,
      name: config.name,
      type: config.type,
      status,
      value,
      threshold: config.threshold,
      message: config.message || this.generateMessage(config, value, passed),
      blocking: config.blocking,
      details: {
        operator: config.operator,
        evaluatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Get coverage value based on gate name
   */
  private getCoverageValue(coverage: CoverageInfo | undefined, gateName: string): number {
    if (!coverage) return 0;

    switch (gateName.toLowerCase()) {
      case 'statement-coverage':
      case 'statements':
        return coverage.statements;
      case 'branch-coverage':
      case 'branches':
        return coverage.branches;
      case 'function-coverage':
      case 'functions':
        return coverage.functions;
      case 'line-coverage':
      case 'lines':
        return coverage.lines;
      default:
        // Return overall coverage (average)
        return (coverage.statements + coverage.branches + coverage.functions + coverage.lines) / 4;
    }
  }

  /**
   * Evaluate threshold condition
   */
  private evaluateThreshold(value: number, threshold: number, operator: string): boolean {
    switch (operator) {
      case 'gt':
        return value > threshold;
      case 'gte':
        return value >= threshold;
      case 'lt':
        return value < threshold;
      case 'lte':
        return value <= threshold;
      case 'eq':
        return value === threshold;
      default:
        return false;
    }
  }

  /**
   * Generate default message for quality gate
   */
  private generateMessage(config: QualityGateConfig, value: number, passed: boolean): string {
    const status = passed ? 'PASSED' : 'FAILED';
    const operatorText = this.getOperatorText(config.operator);

    return `${config.name} ${status}: ${value} ${operatorText} ${config.threshold}`;
  }

  /**
   * Get human-readable operator text
   */
  private getOperatorText(operator: string): string {
    switch (operator) {
      case 'gt': return '>';
      case 'gte': return '>=';
      case 'lt': return '<';
      case 'lte': return '<=';
      case 'eq': return '==';
      default: return operator;
    }
  }

  /**
   * Check if all blocking gates passed
   */
  canProceed(): boolean {
    for (const result of this.results.values()) {
      if (result.blocking && result.status === 'failed') {
        return false;
      }
    }
    return true;
  }

  /**
   * Get failed gates
   */
  getFailedGates(): QualityGate[] {
    return Array.from(this.results.values()).filter(gate => gate.status === 'failed');
  }

  /**
   * Get blocking failed gates
   */
  getBlockingFailedGates(): QualityGate[] {
    return this.getFailedGates().filter(gate => gate.blocking);
  }

  /**
   * Generate quality gate report
   */
  generateReport(): {
    summary: {
      total: number;
      passed: number;
      failed: number;
      warnings: number;
      blocking: number;
    };
    gates: QualityGate[];
    canProceed: boolean;
  } {
    const gates = Array.from(this.results.values());

    return {
      summary: {
        total: gates.length,
        passed: gates.filter(g => g.status === 'passed').length,
        failed: gates.filter(g => g.status === 'failed').length,
        warnings: gates.filter(g => g.status === 'warning').length,
        blocking: gates.filter(g => g.blocking).length,
      },
      gates,
      canProceed: this.canProceed(),
    };
  }

  /**
   * Create default quality gates
   */
  static createDefaultGates(): QualityGateConfig[] {
    return [
      {
        name: 'test-pass-rate',
        type: 'custom',
        threshold: 95,
        operator: 'gte',
        blocking: true,
        message: 'Test pass rate must be at least 95%',
      },
      {
        name: 'code-coverage',
        type: 'coverage',
        threshold: 80,
        operator: 'gte',
        blocking: true,
        message: 'Code coverage must be at least 80%',
      },
      {
        name: 'build-time',
        type: 'performance',
        threshold: 300000, // 5 minutes
        operator: 'lte',
        blocking: false,
        message: 'Build time should be under 5 minutes',
      },
      {
        name: 'security-score',
        type: 'security',
        threshold: 8,
        operator: 'gte',
        blocking: true,
        message: 'Security score must be at least 8/10',
      },
    ];
  }

  /**
   * Load gates from configuration
   */
  loadGatesFromConfig(config: QualityGateConfig[]): void {
    config.forEach(gate => this.registerGate(gate));
  }

  /**
   * Clear all gates and results
   */
  clear(): void {
    this.gates.clear();
    this.results.clear();
  }

  /**
   * Get gate configuration
   */
  getGateConfig(name: string): QualityGateConfig | undefined {
    return this.gates.get(name);
  }

  /**
   * Get gate result
   */
  getGateResult(name: string): QualityGate | undefined {
    return this.results.get(name);
  }

  /**
   * Update gate threshold
   */
  updateGateThreshold(name: string, threshold: number): boolean {
    const gate = this.gates.get(name);
    if (gate) {
      gate.threshold = threshold;
      return true;
    }
    return false;
  }

  /**
   * Enable/disable gate
   */
  setGateBlocking(name: string, blocking: boolean): boolean {
    const gate = this.gates.get(name);
    if (gate) {
      gate.blocking = blocking;
      return true;
    }
    return false;
  }
}
