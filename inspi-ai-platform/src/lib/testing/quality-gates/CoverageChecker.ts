/**
 * Coverage Checker
 * 
 * Implements automatic coverage threshold checking with detailed analysis
 * and reporting of coverage violations.
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

export interface CoverageData {
  statements: {
    total: number;
    covered: number;
    skipped: number;
    pct: number;
  };
  branches: {
    total: number;
    covered: number;
    skipped: number;
    pct: number;
  };
  functions: {
    total: number;
    covered: number;
    skipped: number;
    pct: number;
  };
  lines: {
    total: number;
    covered: number;
    skipped: number;
    pct: number;
  };
}

export interface FileCoverageData extends CoverageData {
  path: string;
  uncoveredLines: number[];
  uncoveredBranches: Array<{
    line: number;
    type: string;
  }>;
}

export interface CoverageCheckResult {
  passed: boolean;
  current: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
  thresholds: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
  violations: string[];
  uncoveredFiles: string[];
  fileDetails: FileCoverageData[];
  summary: {
    totalFiles: number;
    coveredFiles: number;
    partiallyUncoveredFiles: number;
    uncoveredFiles: number;
  };
}

export interface CoverageConfig {
  enabled: boolean;
  thresholds: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
  excludePatterns: string[];
  failOnThreshold: boolean;
  coverageDirectory?: string;
  reportFormats?: string[];
}

export class CoverageChecker {
  private config: CoverageConfig;
  private coverageDirectory: string;

  constructor(config: CoverageConfig) {
    this.config = config;
    this.coverageDirectory = config.coverageDirectory || 'coverage';
  }

  /**
   * Check coverage against thresholds
   */
  async check(): Promise<CoverageCheckResult> {
    try {
      const coverageData = await this.loadCoverageData();
      const fileDetails = await this.loadFileCoverageDetails();
      
      const current = {
        statements: coverageData.statements.pct,
        branches: coverageData.branches.pct,
        functions: coverageData.functions.pct,
        lines: coverageData.lines.pct
      };

      const violations = this.checkThresholds(current);
      const uncoveredFiles = this.identifyUncoveredFiles(fileDetails);
      const summary = this.generateSummary(fileDetails);

      const passed = violations.length === 0;

      return {
        passed,
        current,
        thresholds: this.config.thresholds,
        violations,
        uncoveredFiles,
        fileDetails,
        summary
      };
    } catch (error) {
      // If coverage data is not available, return a failing result
      return {
        passed: false,
        current: { statements: 0, branches: 0, functions: 0, lines: 0 },
        thresholds: this.config.thresholds,
        violations: [`Coverage data not available: ${(error as Error).message}`],
        uncoveredFiles: [],
        fileDetails: [],
        summary: {
          totalFiles: 0,
          coveredFiles: 0,
          partiallyUncoveredFiles: 0,
          uncoveredFiles: 0
        }
      };
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: CoverageConfig): void {
    this.config = config;
    this.coverageDirectory = config.coverageDirectory || 'coverage';
  }

  /**
   * Generate coverage report
   */
  async generateReport(result: CoverageCheckResult): Promise<string> {
    const lines: string[] = [
      '# Coverage Report',
      `Generated: ${new Date().toISOString()}`,
      `Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`,
      '',
      '## Overall Coverage',
      `- Statements: ${result.current.statements.toFixed(2)}% (threshold: ${result.thresholds.statements}%)`,
      `- Branches: ${result.current.branches.toFixed(2)}% (threshold: ${result.thresholds.branches}%)`,
      `- Functions: ${result.current.functions.toFixed(2)}% (threshold: ${result.thresholds.functions}%)`,
      `- Lines: ${result.current.lines.toFixed(2)}% (threshold: ${result.thresholds.lines}%)`,
      ''
    ];

    // Summary
    lines.push('## Summary');
    lines.push(`- Total Files: ${result.summary.totalFiles}`);
    lines.push(`- Fully Covered: ${result.summary.coveredFiles}`);
    lines.push(`- Partially Covered: ${result.summary.partiallyUncoveredFiles}`);
    lines.push(`- Uncovered: ${result.summary.uncoveredFiles}`);
    lines.push('');

    // Violations
    if (result.violations.length > 0) {
      lines.push('## Threshold Violations');
      result.violations.forEach(violation => lines.push(`- ${violation}`));
      lines.push('');
    }

    // Uncovered files
    if (result.uncoveredFiles.length > 0) {
      lines.push('## Uncovered Files');
      result.uncoveredFiles.slice(0, 20).forEach(file => lines.push(`- ${file}`));
      if (result.uncoveredFiles.length > 20) {
        lines.push(`... and ${result.uncoveredFiles.length - 20} more files`);
      }
      lines.push('');
    }

    // File details (top 10 worst coverage)
    const worstFiles = result.fileDetails
      .filter(file => file.lines.pct < 100)
      .sort((a, b) => a.lines.pct - b.lines.pct)
      .slice(0, 10);

    if (worstFiles.length > 0) {
      lines.push('## Files Needing Attention');
      worstFiles.forEach(file => {
        lines.push(`### ${file.path}`);
        lines.push(`- Lines: ${file.lines.pct.toFixed(1)}% (${file.lines.covered}/${file.lines.total})`);
        lines.push(`- Statements: ${file.statements.pct.toFixed(1)}%`);
        lines.push(`- Branches: ${file.branches.pct.toFixed(1)}%`);
        lines.push(`- Functions: ${file.functions.pct.toFixed(1)}%`);
        
        if (file.uncoveredLines.length > 0) {
          const lineRanges = this.compressLineNumbers(file.uncoveredLines);
          lines.push(`- Uncovered Lines: ${lineRanges.slice(0, 5).join(', ')}`);
          if (lineRanges.length > 5) {
            lines.push(`  ... and ${lineRanges.length - 5} more ranges`);
          }
        }
        lines.push('');
      });
    }

    return lines.join('\n');
  }

  /**
   * Get coverage trends (if historical data is available)
   */
  async getCoverageTrends(): Promise<{
    trend: 'improving' | 'degrading' | 'stable';
    changes: {
      statements: number;
      branches: number;
      functions: number;
      lines: number;
    };
  }> {
    try {
      const currentData = await this.loadCoverageData();
      const historicalData = await this.loadHistoricalCoverageData();

      if (!historicalData) {
        return {
          trend: 'stable',
          changes: { statements: 0, branches: 0, functions: 0, lines: 0 }
        };
      }

      const changes = {
        statements: currentData.statements.pct - historicalData.statements.pct,
        branches: currentData.branches.pct - historicalData.branches.pct,
        functions: currentData.functions.pct - historicalData.functions.pct,
        lines: currentData.lines.pct - historicalData.lines.pct
      };

      const avgChange = (changes.statements + changes.branches + changes.functions + changes.lines) / 4;
      
      let trend: 'improving' | 'degrading' | 'stable' = 'stable';
      if (avgChange > 1) trend = 'improving';
      else if (avgChange < -1) trend = 'degrading';

      return { trend, changes };
    } catch {
      return {
        trend: 'stable',
        changes: { statements: 0, branches: 0, functions: 0, lines: 0 }
      };
    }
  }

  private async loadCoverageData(): Promise<CoverageData> {
    const coverageSummaryPath = path.join(this.coverageDirectory, 'coverage-summary.json');
    
    if (!fs.existsSync(coverageSummaryPath)) {
      throw new Error(`Coverage summary not found at ${coverageSummaryPath}`);
    }

    const summaryData = JSON.parse(fs.readFileSync(coverageSummaryPath, 'utf8'));
    
    if (!summaryData.total) {
      throw new Error('Invalid coverage summary format');
    }

    return summaryData.total;
  }

  private async loadFileCoverageDetails(): Promise<FileCoverageData[]> {
    const coverageSummaryPath = path.join(this.coverageDirectory, 'coverage-summary.json');
    
    if (!fs.existsSync(coverageSummaryPath)) {
      return [];
    }

    try {
      const summaryData = JSON.parse(fs.readFileSync(coverageSummaryPath, 'utf8'));
      const fileDetails: FileCoverageData[] = [];

      for (const [filePath, data] of Object.entries(summaryData)) {
        if (filePath === 'total') continue;
        
        const fileData = data as CoverageData;
        const uncoveredLines = await this.getUncoveredLines(filePath);
        const uncoveredBranches = await this.getUncoveredBranches(filePath);

        fileDetails.push({
          path: filePath,
          ...fileData,
          uncoveredLines,
          uncoveredBranches
        });
      }

      return fileDetails;
    } catch {
      return [];
    }
  }

  private async getUncoveredLines(filePath: string): Promise<number[]> {
    try {
      const lcovInfoPath = path.join(this.coverageDirectory, 'lcov.info');
      if (!fs.existsSync(lcovInfoPath)) {
        return [];
      }

      const lcovContent = fs.readFileSync(lcovInfoPath, 'utf8');
      const uncoveredLines: number[] = [];
      
      // Parse LCOV format to extract uncovered lines
      const lines = lcovContent.split('\n');
      let inTargetFile = false;
      
      for (const line of lines) {
        if (line.startsWith('SF:') && line.includes(filePath)) {
          inTargetFile = true;
        } else if (line.startsWith('SF:')) {
          inTargetFile = false;
        } else if (inTargetFile && line.startsWith('DA:')) {
          const [, lineInfo] = line.split(':');
          const [lineNum, hitCount] = lineInfo.split(',');
          if (parseInt(hitCount) === 0) {
            uncoveredLines.push(parseInt(lineNum));
          }
        }
      }

      return uncoveredLines.sort((a, b) => a - b);
    } catch {
      return [];
    }
  }

  private async getUncoveredBranches(filePath: string): Promise<Array<{ line: number; type: string }>> {
    try {
      const lcovInfoPath = path.join(this.coverageDirectory, 'lcov.info');
      if (!fs.existsSync(lcovInfoPath)) {
        return [];
      }

      const lcovContent = fs.readFileSync(lcovInfoPath, 'utf8');
      const uncoveredBranches: Array<{ line: number; type: string }> = [];
      
      // Parse LCOV format to extract uncovered branches
      const lines = lcovContent.split('\n');
      let inTargetFile = false;
      
      for (const line of lines) {
        if (line.startsWith('SF:') && line.includes(filePath)) {
          inTargetFile = true;
        } else if (line.startsWith('SF:')) {
          inTargetFile = false;
        } else if (inTargetFile && line.startsWith('BRDA:')) {
          const [, branchInfo] = line.split(':');
          const [lineNum, , , taken] = branchInfo.split(',');
          if (taken === '0') {
            uncoveredBranches.push({
              line: parseInt(lineNum),
              type: 'branch'
            });
          }
        }
      }

      return uncoveredBranches;
    } catch {
      return [];
    }
  }

  private async loadHistoricalCoverageData(): Promise<CoverageData | null> {
    try {
      const historicalPath = path.join(this.coverageDirectory, 'coverage-history.json');
      if (!fs.existsSync(historicalPath)) {
        return null;
      }

      const historyData = JSON.parse(fs.readFileSync(historicalPath, 'utf8'));
      const entries = Object.entries(historyData).sort(([a], [b]) => b.localeCompare(a));
      
      if (entries.length < 2) {
        return null;
      }

      // Return the second most recent entry (previous run)
      return entries[1][1] as CoverageData;
    } catch {
      return null;
    }
  }

  private checkThresholds(current: CoverageCheckResult['current']): string[] {
    const violations: string[] = [];

    if (current.statements < this.config.thresholds.statements) {
      violations.push(
        `Statement coverage ${current.statements.toFixed(2)}% is below threshold ${this.config.thresholds.statements}%`
      );
    }

    if (current.branches < this.config.thresholds.branches) {
      violations.push(
        `Branch coverage ${current.branches.toFixed(2)}% is below threshold ${this.config.thresholds.branches}%`
      );
    }

    if (current.functions < this.config.thresholds.functions) {
      violations.push(
        `Function coverage ${current.functions.toFixed(2)}% is below threshold ${this.config.thresholds.functions}%`
      );
    }

    if (current.lines < this.config.thresholds.lines) {
      violations.push(
        `Line coverage ${current.lines.toFixed(2)}% is below threshold ${this.config.thresholds.lines}%`
      );
    }

    return violations;
  }

  private identifyUncoveredFiles(fileDetails: FileCoverageData[]): string[] {
    return fileDetails
      .filter(file => {
        // Consider a file uncovered if it has very low coverage
        return file.lines.pct < 50 || file.statements.pct < 50;
      })
      .map(file => file.path)
      .filter(filePath => {
        // Apply exclude patterns
        return !this.config.excludePatterns.some(pattern => {
          return filePath.includes(pattern.replace('**/', '').replace('*', ''));
        });
      });
  }

  private generateSummary(fileDetails: FileCoverageData[]): CoverageCheckResult['summary'] {
    const totalFiles = fileDetails.length;
    let coveredFiles = 0;
    let partiallyUncoveredFiles = 0;
    let uncoveredFiles = 0;

    fileDetails.forEach(file => {
      if (file.lines.pct === 100) {
        coveredFiles++;
      } else if (file.lines.pct > 50) {
        partiallyUncoveredFiles++;
      } else {
        uncoveredFiles++;
      }
    });

    return {
      totalFiles,
      coveredFiles,
      partiallyUncoveredFiles,
      uncoveredFiles
    };
  }

  private compressLineNumbers(lines: number[]): string[] {
    if (lines.length === 0) return [];

    const ranges: string[] = [];
    let start = lines[0];
    let end = lines[0];

    for (let i = 1; i < lines.length; i++) {
      if (lines[i] === end + 1) {
        end = lines[i];
      } else {
        if (start === end) {
          ranges.push(start.toString());
        } else {
          ranges.push(`${start}-${end}`);
        }
        start = end = lines[i];
      }
    }

    // Add the last range
    if (start === end) {
      ranges.push(start.toString());
    } else {
      ranges.push(`${start}-${end}`);
    }

    return ranges;
  }
}