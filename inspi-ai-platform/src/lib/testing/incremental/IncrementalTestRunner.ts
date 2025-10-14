import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import { DependencyAnalyzer, ImpactAnalysis } from './DependencyAnalyzer';
import { GitChangeDetector, ChangeAnalysis } from './GitChangeDetector';
import { TestCacheManager, TestResult, CacheStats } from './TestCacheManager';


export interface IncrementalTestOptions {
  projectRoot: string;
  baseBranch: string;
  includeWorkingDirectory: boolean;
  cacheEnabled: boolean;
  cacheOptions?: any;
  testCommand: string;
  testPattern: string;
  dependencyPatterns: string[];
  forceFullRun: boolean;
  parallelExecution: boolean;
  maxWorkers?: number;
}

export interface TestExecutionPlan {
  strategy: 'full' | 'incremental' | 'cached';
  testsToRun: string[];
  testsFromCache: string[];
  estimatedDuration: number;
  cacheHitRate: number;
  affectedFiles: string[];
  reason: string;
}

export interface IncrementalTestResult {
  executionPlan: TestExecutionPlan;
  results: TestResult[];
  cacheStats: CacheStats;
  performance: {
    totalDuration: number;
    testExecutionTime: number;
    cacheTime: number;
    analysisTime: number;
    timeSaved: number;
  };
  changeAnalysis: ChangeAnalysis;
  impactAnalysis: ImpactAnalysis;
}

/**
 * 增量测试运行器
 * 智能识别需要运行的测试并复用缓存结果
 */
export class IncrementalTestRunner {
  private options: IncrementalTestOptions;
  private gitDetector: GitChangeDetector;
  private dependencyAnalyzer: DependencyAnalyzer;
  private cacheManager: TestCacheManager;

  constructor(options: Partial<IncrementalTestOptions> = {}) {
    this.options = {
      projectRoot: process.cwd(),
      baseBranch: 'main',
      includeWorkingDirectory: true,
      cacheEnabled: true,
      testCommand: 'npm test',
      testPattern: '**/*.{test,spec}.{ts,tsx,js,jsx}',
      dependencyPatterns: ['**/*.{ts,tsx,js,jsx}'],
      forceFullRun: false,
      parallelExecution: true,
      ...options,
    };

    this.gitDetector = new GitChangeDetector(this.options.projectRoot);
    this.dependencyAnalyzer = new DependencyAnalyzer(this.options.projectRoot);

    if (this.options.cacheEnabled) {
      this.cacheManager = new TestCacheManager(this.options.cacheOptions);
    }
  }

  /**
   * 运行增量测试
   */
  async run(): Promise<IncrementalTestResult> {
    const startTime = Date.now();

    try {
      // 1. 分析代码变更
      const analysisStartTime = Date.now();
      const changeAnalysis = this.analyzeChanges();
      const impactAnalysis = await this.analyzeImpact(changeAnalysis);
      const analysisTime = Date.now() - analysisStartTime;

      // 2. 生成执行计划
      const executionPlan = await this.createExecutionPlan(impactAnalysis);

      // 3. 执行测试
      const testStartTime = Date.now();
      const results = await this.executeTests(executionPlan);
      const testExecutionTime = Date.now() - testStartTime;

      // 4. 更新缓存
      const cacheStartTime = Date.now();
      if (this.options.cacheEnabled) {
        await this.updateCache(results, impactAnalysis);
      }
      const cacheTime = Date.now() - cacheStartTime;

      const totalDuration = Date.now() - startTime;
      const timeSaved = this.calculateTimeSaved(executionPlan);

      return {
        executionPlan,
        results,
        cacheStats: this.options.cacheEnabled ? this.cacheManager.getStats() : this.getEmptyCacheStats(),
        performance: {
          totalDuration,
          testExecutionTime,
          cacheTime,
          analysisTime,
          timeSaved,
        },
        changeAnalysis,
        impactAnalysis,
      };

    } catch (error) {
      throw new Error(`Incremental test execution failed: ${error.message}`);
    }
  }

  /**
   * 分析代码变更
   */
  private analyzeChanges(): ChangeAnalysis {
    return this.gitDetector.analyzeChanges(
      this.options.baseBranch,
      this.options.includeWorkingDirectory,
    );
  }

  /**
   * 分析变更影响
   */
  private async analyzeImpact(changeAnalysis: ChangeAnalysis): Promise<ImpactAnalysis> {
    // 构建依赖图（如果还没有构建）
    if (this.dependencyAnalyzer['dependencyGraph'].nodes.size === 0) {
      await this.dependencyAnalyzer.buildDependencyGraph(this.options.dependencyPatterns);
    }

    return this.dependencyAnalyzer.analyzeImpact(changeAnalysis.affectedFiles);
  }

  /**
   * 创建执行计划
   */
  private async createExecutionPlan(impactAnalysis: ImpactAnalysis): Promise<TestExecutionPlan> {
    // 如果强制全量运行
    if (this.options.forceFullRun) {
      const allTests = await this.findAllTests();
      return {
        strategy: 'full',
        testsToRun: allTests,
        testsFromCache: [],
        estimatedDuration: this.estimateTestDuration(allTests),
        cacheHitRate: 0,
        affectedFiles: impactAnalysis.changedFiles,
        reason: 'Force full run requested',
      };
    }

    // 如果没有变更，尝试使用缓存
    if (impactAnalysis.changedFiles.length === 0) {
      return {
        strategy: 'cached',
        testsToRun: [],
        testsFromCache: [],
        estimatedDuration: 0,
        cacheHitRate: 1,
        affectedFiles: [],
        reason: 'No changes detected',
      };
    }

    const testsToRun: string[] = [];
    const testsFromCache: string[] = [];
    let cacheHits = 0;
    let totalTests = 0;

    // 分析受影响的测试
    for (const testFile of impactAnalysis.affectedTestFiles) {
      totalTests++;

      if (this.options.cacheEnabled) {
        const coveredFiles = impactAnalysis.testCoverage.get(testFile) || [];
        const dependencies = this.getDependencies(testFile);

        if (this.cacheManager.isCacheValid(testFile, coveredFiles, dependencies)) {
          testsFromCache.push(testFile);
          cacheHits++;
        } else {
          testsToRun.push(testFile);
        }
      } else {
        testsToRun.push(testFile);
      }
    }

    // 添加直接变更的测试文件
    for (const changedFile of impactAnalysis.changedFiles) {
      if (this.isTestFile(changedFile) && !testsToRun.includes(changedFile)) {
        testsToRun.push(changedFile);
        totalTests++;
      }
    }

    const cacheHitRate = totalTests > 0 ? cacheHits / totalTests : 0;
    const strategy = testsToRun.length === 0 ? 'cached' : 'incremental';

    return {
      strategy,
      testsToRun,
      testsFromCache,
      estimatedDuration: this.estimateTestDuration(testsToRun),
      cacheHitRate,
      affectedFiles: impactAnalysis.changedFiles,
      reason: `${impactAnalysis.changedFiles.length} files changed, ${impactAnalysis.affectedTestFiles.length} tests affected`,
    };
  }

  /**
   * 执行测试
   */
  private async executeTests(executionPlan: TestExecutionPlan): Promise<TestResult[]> {
    const results: TestResult[] = [];

    // 从缓存获取结果
    if (this.options.cacheEnabled) {
      for (const testFile of executionPlan.testsFromCache) {
        const cachedResult = this.cacheManager.getCachedResult(testFile, []);
        if (cachedResult) {
          results.push(cachedResult);
        }
      }
    }

    // 执行需要运行的测试
    if (executionPlan.testsToRun.length > 0) {
      const executedResults = await this.runTests(executionPlan.testsToRun);
      results.push(...executedResults);
    }

    return results;
  }

  /**
   * 运行测试
   */
  private async runTests(testFiles: string[]): Promise<TestResult[]> {
    const results: TestResult[] = [];

    if (this.options.parallelExecution && testFiles.length > 1) {
      // 并行执行
      results.push(...await this.runTestsInParallel(testFiles));
    } else {
      // 串行执行
      for (const testFile of testFiles) {
        const result = await this.runSingleTest(testFile);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * 并行运行测试
   */
  private async runTestsInParallel(testFiles: string[]): Promise<TestResult[]> {
    const maxWorkers = this.options.maxWorkers || Math.min(testFiles.length, 4);
    const chunks = this.chunkArray(testFiles, maxWorkers);
    const promises = chunks.map(chunk => this.runTestChunk(chunk));

    const chunkResults = await Promise.all(promises);
    return chunkResults.flat();
  }

  /**
   * 运行测试块
   */
  private async runTestChunk(testFiles: string[]): Promise<TestResult[]> {
    const results: TestResult[] = [];

    for (const testFile of testFiles) {
      const result = await this.runSingleTest(testFile);
      results.push(result);
    }

    return results;
  }

  /**
   * 运行单个测试
   */
  private async runSingleTest(testFile: string): Promise<TestResult> {
    const startTime = Date.now();

    try {
      // 构建测试命令
      const command = this.buildTestCommand(testFile);

      // 执行测试
      const output = execSync(command, {
        cwd: this.options.projectRoot,
        encoding: 'utf8',
        timeout: 60000, // 60秒超时
      });

      const duration = Date.now() - startTime;

      // 解析测试结果
      return this.parseTestOutput(testFile, output, duration, 'passed');

    } catch (error) {
      const duration = Date.now() - startTime;

      // 解析失败的测试结果
      return this.parseTestOutput(testFile, error.stdout || error.message, duration, 'failed');
    }
  }

  /**
   * 构建测试命令
   */
  private buildTestCommand(testFile: string): string {
    const relativePath = path.relative(this.options.projectRoot, testFile);

    // 根据测试框架构建命令
    if (this.options.testCommand.includes('jest')) {
      return `npx jest "${relativePath}" --json --coverage`;
    } else if (this.options.testCommand.includes('vitest')) {
      return `npx vitest run "${relativePath}" --reporter=json`;
    } else {
      return `${this.options.testCommand} "${relativePath}"`;
    }
  }

  /**
   * 解析测试输出
   */
  private parseTestOutput(
    testFile: string,
    output: string,
    duration: number,
    status: 'passed' | 'failed',
  ): TestResult {
    try {
      // 尝试解析JSON输出
      const jsonOutput = JSON.parse(output);

      return {
        testFile,
        status: jsonOutput.success ? 'passed' : 'failed',
        duration,
        timestamp: new Date(),
        coverage: this.parseCoverage(jsonOutput.coverageMap),
        errors: this.parseErrors(jsonOutput.testResults),
      };
    } catch {
      // 如果不是JSON格式，创建基本结果
      return {
        testFile,
        status,
        duration,
        timestamp: new Date(),
        errors: status === 'failed' ? [{ message: output }] : undefined,
      };
    }
  }

  /**
   * 解析覆盖率信息
   */
  private parseCoverage(coverageMap: any): any {
    if (!coverageMap) return undefined;

    // 简化的覆盖率解析
    return {
      statements: 0,
      branches: 0,
      functions: 0,
      lines: 0,
      files: {},
    };
  }

  /**
   * 解析错误信息
   */
  private parseErrors(testResults: any[]): any[] {
    if (!testResults) return [];

    const errors: any[] = [];

    for (const result of testResults) {
      if (result.assertionResults) {
        for (const assertion of result.assertionResults) {
          if (assertion.status === 'failed') {
            errors.push({
              message: assertion.failureMessages?.join('\n') || 'Test failed',
              location: {
                file: result.name,
                line: 0,
                column: 0,
              },
            });
          }
        }
      }
    }

    return errors;
  }

  /**
   * 更新缓存
   */
  private async updateCache(results: TestResult[], impactAnalysis: ImpactAnalysis): Promise<void> {
    for (const result of results) {
      const coveredFiles = impactAnalysis.testCoverage.get(result.testFile) || [];
      const dependencies = this.getDependencies(result.testFile);

      this.cacheManager.cacheResult(result.testFile, coveredFiles, result, dependencies);
    }

    // 保存缓存到磁盘
    await this.cacheManager.saveCache();
  }

  /**
   * 获取文件依赖
   */
  private getDependencies(testFile: string): string[] {
    const node = this.dependencyAnalyzer['dependencyGraph'].nodes.get(testFile);
    return node ? node.dependencies : [];
  }

  /**
   * 查找所有测试文件
   */
  private async findAllTests(): Promise<string[]> {
    const glob = require('glob');

    return glob.sync(this.options.testPattern, {
      cwd: this.options.projectRoot,
      absolute: true,
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
      ],
    });
  }

  /**
   * 判断是否为测试文件
   */
  private isTestFile(filePath: string): boolean {
    const testPatterns = [
      /\.test\.(ts|tsx|js|jsx)$/,
      /\.spec\.(ts|tsx|js|jsx)$/,
      /\/__tests__\//,
    ];

    return testPatterns.some(pattern => pattern.test(filePath));
  }

  /**
   * 估算测试执行时间
   */
  private estimateTestDuration(testFiles: string[]): number {
    // 简单估算：每个测试文件平均2秒
    return testFiles.length * 2000;
  }

  /**
   * 计算节省的时间
   */
  private calculateTimeSaved(executionPlan: TestExecutionPlan): number {
    const cachedTestDuration = this.estimateTestDuration(executionPlan.testsFromCache);
    return cachedTestDuration;
  }

  /**
   * 将数组分块
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * 获取空的缓存统计
   */
  private getEmptyCacheStats(): CacheStats {
    return {
      totalEntries: 0,
      hitRate: 0,
      totalHits: 0,
      totalMisses: 0,
      cacheSize: 0,
      oldestEntry: null,
      newestEntry: null,
    };
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    if (this.options.cacheEnabled) {
      this.cacheManager.clear();
    }
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): CacheStats {
    return this.options.cacheEnabled ? this.cacheManager.getStats() : this.getEmptyCacheStats();
  }

  /**
   * 强制重建依赖图
   */
  async rebuildDependencyGraph(): Promise<void> {
    await this.dependencyAnalyzer.buildDependencyGraph(this.options.dependencyPatterns);
  }

  /**
   * 获取依赖图统计
   */
  getDependencyGraphStats(): any {
    return this.dependencyAnalyzer.getGraphStats();
  }

  /**
   * 销毁运行器
   */
  destroy(): void {
    if (this.options.cacheEnabled) {
      this.cacheManager.destroy();
    }
  }
}
