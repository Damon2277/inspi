import { IncrementalTestRunner, IncrementalTestResult } from './IncrementalTestRunner';
import { TestResult } from './TestCacheManager';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface VerificationResult {
  isAccurate: boolean;
  missedTests: string[];
  extraTests: string[];
  falsePositives: string[];
  falseNegatives: string[];
  accuracy: number;
  precision: number;
  recall: number;
  details: VerificationDetails;
}

export interface VerificationDetails {
  incrementalTests: string[];
  fullTests: string[];
  incrementalResults: Map<string, TestResult>;
  fullResults: Map<string, TestResult>;
  comparisonReport: ComparisonReport[];
}

export interface ComparisonReport {
  testFile: string;
  incrementalStatus: 'passed' | 'failed' | 'skipped' | 'not_run';
  fullStatus: 'passed' | 'failed' | 'skipped';
  match: boolean;
  reason?: string;
}

export interface AccuracyMetrics {
  totalVerifications: number;
  accurateVerifications: number;
  averageAccuracy: number;
  averagePrecision: number;
  averageRecall: number;
  commonMissedPatterns: string[];
  improvementSuggestions: string[];
}

/**
 * 增量测试准确性验证器
 * 验证增量测试的准确性，确保不遗漏重要测试
 */
export class AccuracyVerifier {
  private projectRoot: string;
  private verificationHistory: VerificationResult[] = [];
  private metricsFile: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.metricsFile = path.join(projectRoot, '.test-cache', 'accuracy-metrics.json');
    this.loadMetricsHistory();
  }

  /**
   * 验证增量测试的准确性
   */
  async verifyAccuracy(
    incrementalRunner: IncrementalTestRunner,
    sampleSize: number = 0.1 // 10%的采样率
  ): Promise<VerificationResult> {
    try {
      // 1. 运行增量测试
      const incrementalResult = await incrementalRunner.run();

      // 2. 运行完整测试套件（采样）
      const fullResult = await this.runFullTestSuite(sampleSize);

      // 3. 比较结果
      const verification = this.compareResults(incrementalResult, fullResult);

      // 4. 记录验证结果
      this.verificationHistory.push(verification);
      this.saveMetricsHistory();

      return verification;

    } catch (error) {
      throw new Error(`Accuracy verification failed: ${error.message}`);
    }
  }

  /**
   * 运行完整测试套件
   */
  private async runFullTestSuite(sampleSize: number): Promise<Map<string, TestResult>> {
    const allTests = await this.findAllTests();
    const sampleTests = this.sampleTests(allTests, sampleSize);
    
    const results = new Map<string, TestResult>();

    for (const testFile of sampleTests) {
      try {
        const result = await this.runSingleTest(testFile);
        results.set(testFile, result);
      } catch (error) {
        // 记录失败的测试
        results.set(testFile, {
          testFile,
          status: 'failed',
          duration: 0,
          timestamp: new Date(),
          errors: [{ message: error.message }]
        });
      }
    }

    return results;
  }

  /**
   * 采样测试文件
   */
  private sampleTests(allTests: string[], sampleSize: number): string[] {
    if (sampleSize >= 1) {
      return allTests;
    }

    const sampleCount = Math.max(1, Math.floor(allTests.length * sampleSize));
    const sampled: string[] = [];
    
    // 使用分层采样确保覆盖不同类型的测试
    const testsByType = this.groupTestsByType(allTests);
    
    for (const [type, tests] of testsByType.entries()) {
      const typeCount = Math.max(1, Math.floor(tests.length * sampleSize));
      const typeSample = this.randomSample(tests, typeCount);
      sampled.push(...typeSample);
    }

    return sampled;
  }

  /**
   * 按类型分组测试
   */
  private groupTestsByType(tests: string[]): Map<string, string[]> {
    const groups = new Map<string, string[]>();

    for (const test of tests) {
      let type = 'other';
      
      if (test.includes('/unit/')) {
        type = 'unit';
      } else if (test.includes('/integration/')) {
        type = 'integration';
      } else if (test.includes('/e2e/')) {
        type = 'e2e';
      } else if (test.includes('/api/')) {
        type = 'api';
      } else if (test.includes('/components/')) {
        type = 'component';
      }

      if (!groups.has(type)) {
        groups.set(type, []);
      }
      groups.get(type)!.push(test);
    }

    return groups;
  }

  /**
   * 随机采样
   */
  private randomSample<T>(array: T[], count: number): T[] {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  /**
   * 比较增量测试和完整测试的结果
   */
  private compareResults(
    incrementalResult: IncrementalTestResult,
    fullResults: Map<string, TestResult>
  ): VerificationResult {
    const incrementalTests = new Set([
      ...incrementalResult.executionPlan.testsToRun,
      ...incrementalResult.executionPlan.testsFromCache
    ]);

    const fullTests = new Set(fullResults.keys());
    const incrementalResultsMap = new Map<string, TestResult>();
    
    // 构建增量测试结果映射
    for (const result of incrementalResult.results) {
      incrementalResultsMap.set(result.testFile, result);
    }

    // 分析差异
    const missedTests = Array.from(fullTests).filter(test => !incrementalTests.has(test));
    const extraTests = Array.from(incrementalTests).filter(test => !fullTests.has(test));
    
    // 分析结果一致性
    const comparisonReport: ComparisonReport[] = [];
    const falsePositives: string[] = [];
    const falseNegatives: string[] = [];

    for (const testFile of fullTests) {
      const incrementalResult = incrementalResultsMap.get(testFile);
      const fullResult = fullResults.get(testFile)!;
      
      const incrementalStatus = incrementalResult?.status || 'not_run';
      const fullStatus = fullResult.status;
      const match = incrementalStatus === fullStatus;

      comparisonReport.push({
        testFile,
        incrementalStatus,
        fullStatus,
        match,
        reason: match ? undefined : `Expected ${fullStatus}, got ${incrementalStatus}`
      });

      // 识别假阳性和假阴性
      if (!match) {
        if (incrementalStatus === 'passed' && fullStatus === 'failed') {
          falsePositives.push(testFile);
        } else if (incrementalStatus === 'failed' && fullStatus === 'passed') {
          falseNegatives.push(testFile);
        }
      }
    }

    // 计算准确性指标
    const totalTests = fullTests.size;
    const correctPredictions = comparisonReport.filter(r => r.match).length;
    const accuracy = totalTests > 0 ? correctPredictions / totalTests : 1;

    // 计算精确率和召回率
    const truePositives = comparisonReport.filter(r => 
      r.incrementalStatus === 'failed' && r.fullStatus === 'failed'
    ).length;
    const predictedPositives = comparisonReport.filter(r => 
      r.incrementalStatus === 'failed'
    ).length;
    const actualPositives = comparisonReport.filter(r => 
      r.fullStatus === 'failed'
    ).length;

    const precision = predictedPositives > 0 ? truePositives / predictedPositives : 1;
    const recall = actualPositives > 0 ? truePositives / actualPositives : 1;

    return {
      isAccurate: accuracy >= 0.95 && missedTests.length === 0,
      missedTests,
      extraTests,
      falsePositives,
      falseNegatives,
      accuracy,
      precision,
      recall,
      details: {
        incrementalTests: Array.from(incrementalTests),
        fullTests: Array.from(fullTests),
        incrementalResults: incrementalResultsMap,
        fullResults,
        comparisonReport
      }
    };
  }

  /**
   * 查找所有测试文件
   */
  private async findAllTests(): Promise<string[]> {
    const glob = require('glob');
    
    return glob.sync('**/*.{test,spec}.{ts,tsx,js,jsx}', {
      cwd: this.projectRoot,
      absolute: true,
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/.next/**'
      ]
    });
  }

  /**
   * 运行单个测试
   */
  private async runSingleTest(testFile: string): Promise<TestResult> {
    const startTime = Date.now();
    const relativePath = path.relative(this.projectRoot, testFile);
    
    try {
      const command = `npx jest "${relativePath}" --json --silent`;
      const output = execSync(command, {
        cwd: this.projectRoot,
        encoding: 'utf8',
        timeout: 30000
      });

      const duration = Date.now() - startTime;
      const result = JSON.parse(output);

      return {
        testFile: relativePath,
        status: result.success ? 'passed' : 'failed',
        duration,
        timestamp: new Date(),
        errors: result.success ? undefined : [{ message: 'Test failed' }]
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        testFile: relativePath,
        status: 'failed',
        duration,
        timestamp: new Date(),
        errors: [{ message: error.message }]
      };
    }
  }

  /**
   * 分析准确性趋势
   */
  analyzeAccuracyTrends(): AccuracyMetrics {
    if (this.verificationHistory.length === 0) {
      return {
        totalVerifications: 0,
        accurateVerifications: 0,
        averageAccuracy: 0,
        averagePrecision: 0,
        averageRecall: 0,
        commonMissedPatterns: [],
        improvementSuggestions: []
      };
    }

    const totalVerifications = this.verificationHistory.length;
    const accurateVerifications = this.verificationHistory.filter(v => v.isAccurate).length;
    
    const averageAccuracy = this.verificationHistory.reduce((sum, v) => sum + v.accuracy, 0) / totalVerifications;
    const averagePrecision = this.verificationHistory.reduce((sum, v) => sum + v.precision, 0) / totalVerifications;
    const averageRecall = this.verificationHistory.reduce((sum, v) => sum + v.recall, 0) / totalVerifications;

    // 分析常见的遗漏模式
    const allMissedTests = this.verificationHistory.flatMap(v => v.missedTests);
    const missedPatterns = this.identifyMissedPatterns(allMissedTests);

    // 生成改进建议
    const suggestions = this.generateImprovementSuggestions(averageAccuracy, averagePrecision, averageRecall, missedPatterns);

    return {
      totalVerifications,
      accurateVerifications,
      averageAccuracy,
      averagePrecision,
      averageRecall,
      commonMissedPatterns: missedPatterns,
      improvementSuggestions: suggestions
    };
  }

  /**
   * 识别遗漏的测试模式
   */
  private identifyMissedPatterns(missedTests: string[]): string[] {
    const patterns = new Map<string, number>();

    for (const test of missedTests) {
      // 分析文件路径模式
      const pathParts = test.split('/');
      for (let i = 0; i < pathParts.length - 1; i++) {
        const pattern = pathParts.slice(0, i + 1).join('/');
        patterns.set(pattern, (patterns.get(pattern) || 0) + 1);
      }

      // 分析文件名模式
      const fileName = path.basename(test);
      const namePattern = fileName.replace(/\.(test|spec)\.(ts|tsx|js|jsx)$/, '.*');
      patterns.set(namePattern, (patterns.get(namePattern) || 0) + 1);
    }

    // 返回出现频率最高的模式
    return Array.from(patterns.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([pattern]) => pattern);
  }

  /**
   * 生成改进建议
   */
  private generateImprovementSuggestions(
    accuracy: number,
    precision: number,
    recall: number,
    missedPatterns: string[]
  ): string[] {
    const suggestions: string[] = [];

    if (accuracy < 0.9) {
      suggestions.push('Overall accuracy is low. Consider improving dependency analysis.');
    }

    if (precision < 0.8) {
      suggestions.push('High false positive rate. Review test selection criteria.');
    }

    if (recall < 0.8) {
      suggestions.push('High false negative rate. Improve change impact analysis.');
    }

    if (missedPatterns.length > 0) {
      suggestions.push(`Common missed patterns: ${missedPatterns.join(', ')}. Consider adding specific rules for these patterns.`);
    }

    if (suggestions.length === 0) {
      suggestions.push('Incremental testing accuracy is good. Continue monitoring.');
    }

    return suggestions;
  }

  /**
   * 生成验证报告
   */
  generateVerificationReport(result: VerificationResult): string {
    const report = [
      '# Incremental Test Accuracy Verification Report',
      '',
      `**Accuracy**: ${(result.accuracy * 100).toFixed(2)}%`,
      `**Precision**: ${(result.precision * 100).toFixed(2)}%`,
      `**Recall**: ${(result.recall * 100).toFixed(2)}%`,
      `**Is Accurate**: ${result.isAccurate ? '✅ Yes' : '❌ No'}`,
      '',
      '## Summary',
      `- Missed Tests: ${result.missedTests.length}`,
      `- Extra Tests: ${result.extraTests.length}`,
      `- False Positives: ${result.falsePositives.length}`,
      `- False Negatives: ${result.falseNegatives.length}`,
      ''
    ];

    if (result.missedTests.length > 0) {
      report.push('## Missed Tests');
      result.missedTests.forEach(test => {
        report.push(`- ${test}`);
      });
      report.push('');
    }

    if (result.falsePositives.length > 0) {
      report.push('## False Positives');
      result.falsePositives.forEach(test => {
        report.push(`- ${test}`);
      });
      report.push('');
    }

    if (result.falseNegatives.length > 0) {
      report.push('## False Negatives');
      result.falseNegatives.forEach(test => {
        report.push(`- ${test}`);
      });
      report.push('');
    }

    // 添加详细比较
    report.push('## Detailed Comparison');
    report.push('| Test File | Incremental | Full | Match |');
    report.push('|-----------|-------------|------|-------|');
    
    result.details.comparisonReport.forEach(item => {
      const match = item.match ? '✅' : '❌';
      report.push(`| ${item.testFile} | ${item.incrementalStatus} | ${item.fullStatus} | ${match} |`);
    });

    return report.join('\n');
  }

  /**
   * 保存验证报告
   */
  async saveVerificationReport(result: VerificationResult, outputPath?: string): Promise<void> {
    const report = this.generateVerificationReport(result);
    const filePath = outputPath || path.join(this.projectRoot, '.test-cache', 'verification-report.md');
    
    // 确保目录存在
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, report, 'utf8');
  }

  /**
   * 加载历史指标
   */
  private loadMetricsHistory(): void {
    try {
      if (fs.existsSync(this.metricsFile)) {
        const data = JSON.parse(fs.readFileSync(this.metricsFile, 'utf8'));
        this.verificationHistory = data.history || [];
      }
    } catch (error) {
      console.warn(`Failed to load metrics history: ${error.message}`);
      this.verificationHistory = [];
    }
  }

  /**
   * 保存历史指标
   */
  private saveMetricsHistory(): void {
    try {
      const dir = path.dirname(this.metricsFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const data = {
        lastUpdated: new Date().toISOString(),
        history: this.verificationHistory.slice(-50) // 保留最近50次验证
      };

      fs.writeFileSync(this.metricsFile, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
      console.warn(`Failed to save metrics history: ${error.message}`);
    }
  }

  /**
   * 清理历史数据
   */
  clearHistory(): void {
    this.verificationHistory = [];
    if (fs.existsSync(this.metricsFile)) {
      fs.unlinkSync(this.metricsFile);
    }
  }
}