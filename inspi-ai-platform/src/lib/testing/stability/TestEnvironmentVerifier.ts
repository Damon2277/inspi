/**
 * Test Environment Verifier
 *
 * Ensures consistency across different test environments and detects
 * environment-specific issues that could cause test instability.
 */

export interface EnvironmentSnapshot {
  nodeVersion: string;
  platform: string;
  architecture: string;
  memory: {
    total: number;
    free: number;
    used: number;
  };
  cpu: {
    cores: number;
    model: string;
  };
  environment: {
    ci: boolean;
    timezone: string;
    locale: string;
    env: Record<string, string>;
  };
  dependencies: Record<string, string>;
  timestamp: Date;
}

export interface EnvironmentDifference {
  category: 'critical' | 'warning' | 'info';
  field: string;
  expected: any;
  actual: any;
  impact: string;
  recommendation: string;
}

export interface EnvironmentConsistencyReport {
  isConsistent: boolean;
  score: number; // 0-1, where 1 is perfectly consistent
  differences: EnvironmentDifference[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
}

export class TestEnvironmentVerifier {
  private baselineSnapshot: EnvironmentSnapshot | null = null;
  private snapshots: EnvironmentSnapshot[] = [];
  private criticalFields = [
    'nodeVersion',
    'platform',
    'architecture',
  ];
  private warningFields = [
    'memory.total',
    'cpu.cores',
    'environment.timezone',
    'environment.locale',
  ];

  /**
   * Capture current environment snapshot
   */
  async captureSnapshot(): Promise<EnvironmentSnapshot> {
    const snapshot: EnvironmentSnapshot = {
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
      memory: this.getMemoryInfo(),
      cpu: await this.getCpuInfo(),
      environment: {
        ci: this.isCIEnvironment(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        locale: Intl.DateTimeFormat().resolvedOptions().locale,
        env: this.getRelevantEnvVars(),
      },
      dependencies: this.getDependencyVersions(),
      timestamp: new Date(),
    };

    this.snapshots.push(snapshot);

    // Keep only recent snapshots
    if (this.snapshots.length > 100) {
      this.snapshots.splice(0, this.snapshots.length - 100);
    }

    return snapshot;
  }

  /**
   * Set baseline environment for comparison
   */
  setBaseline(snapshot?: EnvironmentSnapshot): void {
    this.baselineSnapshot = snapshot || this.snapshots[this.snapshots.length - 1];
  }

  /**
   * Verify current environment against baseline
   */
  async verifyEnvironment(): Promise<EnvironmentConsistencyReport> {
    const currentSnapshot = await this.captureSnapshot();

    if (!this.baselineSnapshot) {
      this.setBaseline(currentSnapshot);
      return {
        isConsistent: true,
        score: 1,
        differences: [],
        riskLevel: 'low',
        recommendations: ['Baseline environment established'],
      };
    }

    return this.compareSnapshots(this.baselineSnapshot, currentSnapshot);
  }

  /**
   * Compare two environment snapshots
   */
  compareSnapshots(
    baseline: EnvironmentSnapshot,
    current: EnvironmentSnapshot,
  ): EnvironmentConsistencyReport {
    const differences: EnvironmentDifference[] = [];

    // Check critical fields
    this.criticalFields.forEach(field => {
      const baselineValue = this.getNestedValue(baseline, field);
      const currentValue = this.getNestedValue(current, field);

      if (baselineValue !== currentValue) {
        differences.push({
          category: 'critical',
          field,
          expected: baselineValue,
          actual: currentValue,
          impact: 'May cause test failures or inconsistent behavior',
          recommendation: `Ensure ${field} matches baseline environment`,
        });
      }
    });

    // Check warning fields
    this.warningFields.forEach(field => {
      const baselineValue = this.getNestedValue(baseline, field);
      const currentValue = this.getNestedValue(current, field);

      if (baselineValue !== currentValue) {
        differences.push({
          category: 'warning',
          field,
          expected: baselineValue,
          actual: currentValue,
          impact: 'May affect test performance or timing',
          recommendation: `Consider standardizing ${field} across environments`,
        });
      }
    });

    // Check dependencies
    const depDifferences = this.compareDependencies(
      baseline.dependencies,
      current.dependencies,
    );
    differences.push(...depDifferences);

    // Check environment variables
    const envDifferences = this.compareEnvironmentVars(
      baseline.environment.env,
      current.environment.env,
    );
    differences.push(...envDifferences);

    const score = this.calculateConsistencyScore(differences);
    const riskLevel = this.calculateRiskLevel(differences);
    const isConsistent = differences.filter(d => d.category === 'critical').length === 0;
    const recommendations = this.generateRecommendations(differences);

    return {
      isConsistent,
      score,
      differences,
      riskLevel,
      recommendations,
    };
  }

  /**
   * Get environment consistency history
   */
  getConsistencyHistory(): {
    snapshots: EnvironmentSnapshot[];
    consistencyTrend: 'improving' | 'degrading' | 'stable';
    averageScore: number;
  } {
    if (this.snapshots.length < 2) {
      return {
        snapshots: this.snapshots,
        consistencyTrend: 'stable',
        averageScore: 1,
      };
    }

    const scores: number[] = [];

    for (let i = 1; i < this.snapshots.length; i++) {
      const report = this.compareSnapshots(this.snapshots[i - 1], this.snapshots[i]);
      scores.push(report.score);
    }

    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

    // Calculate trend
    const recentScores = scores.slice(-5);
    const olderScores = scores.slice(0, -5);

    let trend: 'improving' | 'degrading' | 'stable' = 'stable';

    if (recentScores.length > 0 && olderScores.length > 0) {
      const recentAvg = recentScores.reduce((sum, s) => sum + s, 0) / recentScores.length;
      const olderAvg = olderScores.reduce((sum, s) => sum + s, 0) / olderScores.length;

      if (recentAvg > olderAvg + 0.1) trend = 'improving';
      else if (recentAvg < olderAvg - 0.1) trend = 'degrading';
    }

    return {
      snapshots: this.snapshots,
      consistencyTrend: trend,
      averageScore,
    };
  }

  /**
   * Generate environment setup script
   */
  generateSetupScript(targetSnapshot: EnvironmentSnapshot): string {
    const lines: string[] = [
      '#!/bin/bash',
      '# Test Environment Setup Script',
      '# Generated automatically to ensure environment consistency',
      '',
      'echo "Setting up test environment..."',
      '',
    ];

    // Node version
    lines.push(`# Node.js version: ${targetSnapshot.nodeVersion}`);
    lines.push(`if ! node --version | grep -q "${targetSnapshot.nodeVersion}"; then`);
    lines.push(`  echo "Warning: Node.js version mismatch. Expected ${targetSnapshot.nodeVersion}"`);
    lines.push('fi');
    lines.push('');

    // Environment variables
    lines.push('# Environment variables');
    Object.entries(targetSnapshot.environment.env).forEach(([key, value]) => {
      if (this.isImportantEnvVar(key)) {
        lines.push(`export ${key}="${value}"`);
      }
    });
    lines.push('');

    // Timezone
    lines.push(`# Timezone: ${targetSnapshot.environment.timezone}`);
    lines.push(`export TZ="${targetSnapshot.environment.timezone}"`);
    lines.push('');

    // Dependencies check
    lines.push('# Dependency versions check');
    lines.push('echo "Checking dependency versions..."');
    Object.entries(targetSnapshot.dependencies).forEach(([pkg, version]) => {
      lines.push(`npm list ${pkg}@${version} --depth=0 || echo "Warning: ${pkg}@${version} not found"`);
    });

    lines.push('');
    lines.push('echo "Environment setup complete"');

    return lines.join('\n');
  }

  private getMemoryInfo(): { total: number; free: number; used: number } {
    try {
      if (typeof process !== 'undefined' && process.memoryUsage) {
        const usage = process.memoryUsage();
        return {
          total: usage.heapTotal,
          free: usage.heapTotal - usage.heapUsed,
          used: usage.heapUsed,
        };
      }
    } catch (error) {
      // Handle cases where memory info is not available
    }

    return { total: 0, free: 0, used: 0 };
  }

  private async getCpuInfo(): Promise<{ cores: number; model: string }> {
    try {
      // Try to get CPU info if available
      if (typeof navigator !== 'undefined' && 'hardwareConcurrency' in navigator) {
        return {
          cores: navigator.hardwareConcurrency,
          model: 'Unknown',
        };
      }

      // Node.js environment
      if (typeof require !== 'undefined') {
        try {
          const os = require('os');
          const cpus = os.cpus();
          return {
            cores: cpus.length,
            model: cpus[0]?.model || 'Unknown',
          };
        } catch {
          // Fallback
        }
      }
    } catch {
      // Fallback for any errors
    }

    return { cores: 1, model: 'Unknown' };
  }

  private isCIEnvironment(): boolean {
    const ciEnvVars = ['CI', 'CONTINUOUS_INTEGRATION', 'GITHUB_ACTIONS', 'TRAVIS', 'CIRCLECI'];
    return ciEnvVars.some(envVar => process.env[envVar] === 'true' || process.env[envVar] === '1');
  }

  private getRelevantEnvVars(): Record<string, string> {
    const relevantVars = [
      'NODE_ENV',
      'CI',
      'GITHUB_ACTIONS',
      'TRAVIS',
      'CIRCLECI',
      'TZ',
      'LANG',
      'LC_ALL',
    ];

    const result: Record<string, string> = {};
    relevantVars.forEach(varName => {
      if (process.env[varName]) {
        result[varName] = process.env[varName]!;
      }
    });

    return result;
  }

  private getDependencyVersions(): Record<string, string> {
    try {
      // Try to read package.json if available
      if (typeof require !== 'undefined') {
        try {
          const packageJson = require('../../../package.json');
          return {
            ...packageJson.dependencies,
            ...packageJson.devDependencies,
          };
        } catch {
          // Fallback
        }
      }
    } catch {
      // Fallback for any errors
    }

    return {};
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private compareDependencies(
    baseline: Record<string, string>,
    current: Record<string, string>,
  ): EnvironmentDifference[] {
    const differences: EnvironmentDifference[] = [];
    const criticalDeps = ['jest', 'vitest', '@testing-library/jest-dom', 'typescript'];

    // Check for version differences in critical dependencies
    criticalDeps.forEach(dep => {
      if (baseline[dep] && current[dep] && baseline[dep] !== current[dep]) {
        differences.push({
          category: 'critical',
          field: `dependencies.${dep}`,
          expected: baseline[dep],
          actual: current[dep],
          impact: 'May cause test framework incompatibilities',
          recommendation: `Update ${dep} to version ${baseline[dep]}`,
        });
      }
    });

    // Check for missing dependencies
    Object.keys(baseline).forEach(dep => {
      if (!current[dep]) {
        differences.push({
          category: 'warning',
          field: `dependencies.${dep}`,
          expected: baseline[dep],
          actual: 'missing',
          impact: 'Dependency not found in current environment',
          recommendation: `Install ${dep}@${baseline[dep]}`,
        });
      }
    });

    return differences;
  }

  private compareEnvironmentVars(
    baseline: Record<string, string>,
    current: Record<string, string>,
  ): EnvironmentDifference[] {
    const differences: EnvironmentDifference[] = [];
    const criticalVars = ['NODE_ENV'];

    criticalVars.forEach(varName => {
      if (baseline[varName] !== current[varName]) {
        differences.push({
          category: 'critical',
          field: `environment.${varName}`,
          expected: baseline[varName] || 'undefined',
          actual: current[varName] || 'undefined',
          impact: 'May affect test behavior and results',
          recommendation: `Set ${varName}=${baseline[varName] || 'undefined'}`,
        });
      }
    });

    return differences;
  }

  private calculateConsistencyScore(differences: EnvironmentDifference[]): number {
    if (differences.length === 0) return 1;

    let penalty = 0;
    differences.forEach(diff => {
      switch (diff.category) {
        case 'critical':
          penalty += 0.3;
          break;
        case 'warning':
          penalty += 0.1;
          break;
        case 'info':
          penalty += 0.05;
          break;
      }
    });

    return Math.max(0, 1 - penalty);
  }

  private calculateRiskLevel(differences: EnvironmentDifference[]): 'low' | 'medium' | 'high' | 'critical' {
    const criticalCount = differences.filter(d => d.category === 'critical').length;
    const warningCount = differences.filter(d => d.category === 'warning').length;

    if (criticalCount > 2) return 'critical';
    if (criticalCount > 0 || warningCount > 5) return 'high';
    if (warningCount > 2) return 'medium';
    return 'low';
  }

  private generateRecommendations(differences: EnvironmentDifference[]): string[] {
    const recommendations = new Set<string>();

    differences.forEach(diff => {
      recommendations.add(diff.recommendation);
    });

    // Add general recommendations
    if (differences.some(d => d.category === 'critical')) {
      recommendations.add('Consider using containerized test environments for consistency');
      recommendations.add('Document environment requirements in README');
    }

    if (differences.some(d => d.field.includes('dependencies'))) {
      recommendations.add('Use exact version pinning in package.json');
      recommendations.add('Consider using package-lock.json or yarn.lock');
    }

    return Array.from(recommendations);
  }

  private isImportantEnvVar(key: string): boolean {
    const importantVars = [
      'NODE_ENV',
      'CI',
      'TZ',
      'LANG',
      'LC_ALL',
    ];
    return importantVars.includes(key);
  }
}
