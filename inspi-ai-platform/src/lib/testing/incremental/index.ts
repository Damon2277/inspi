/**
 * 增量测试系统
 *
 * 这个模块提供了完整的增量测试解决方案，包括：
 * - Git变更检测和依赖分析
 * - 受影响测试的智能识别
 * - 测试缓存和结果复用机制
 * - 增量测试的准确性验证
 */

export { GitChangeDetector } from './GitChangeDetector';
export { DependencyAnalyzer } from './DependencyAnalyzer';
export { TestCacheManager } from './TestCacheManager';
export { IncrementalTestRunner } from './IncrementalTestRunner';
export { AccuracyVerifier } from './AccuracyVerifier';

// Import the classes for internal use
import { AccuracyVerifier } from './AccuracyVerifier';
import type { VerificationResult, AccuracyMetrics } from './AccuracyVerifier';
import { IncrementalTestRunner } from './IncrementalTestRunner';

export type {
  GitChange,
  GitCommitInfo,
  ChangeAnalysis,
} from './GitChangeDetector';

export type {
  FileDependency,
  DependencyGraph,
  ImpactAnalysis,
} from './DependencyAnalyzer';

export type {
  TestResult,
  Coverage,
  TestError,
  CacheEntry,
  CacheStats,
  CacheOptions,
} from './TestCacheManager';

export type {
  IncrementalTestOptions,
  TestExecutionPlan,
  IncrementalTestResult,
} from './IncrementalTestRunner';

export type {
  VerificationResult,
  VerificationDetails,
  ComparisonReport,
  AccuracyMetrics,
} from './AccuracyVerifier';

/**
 * 增量测试系统的主要入口点
 * 提供简化的API来使用增量测试功能
 */
export class IncrementalTestSystem {
  private runner: IncrementalTestRunner;
  private verifier: AccuracyVerifier;

  constructor(options: Partial<IncrementalTestOptions> = {}) {
    this.runner = new IncrementalTestRunner(options);
    this.verifier = new AccuracyVerifier(options.projectRoot);
  }

  /**
   * 运行增量测试
   */
  async runIncrementalTests(): Promise<IncrementalTestResult> {
    return await this.runner.run();
  }

  /**
   * 验证增量测试准确性
   */
  async verifyAccuracy(sampleSize: number = 0.1): Promise<VerificationResult> {
    return await this.verifier.verifyAccuracy(this.runner, sampleSize);
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): CacheStats {
    return this.runner.getCacheStats();
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.runner.clearCache();
  }

  /**
   * 重建依赖图
   */
  async rebuildDependencyGraph(): Promise<void> {
    await this.runner.rebuildDependencyGraph();
  }

  /**
   * 获取准确性趋势分析
   */
  getAccuracyTrends(): AccuracyMetrics {
    return this.verifier.analyzeAccuracyTrends();
  }

  /**
   * 销毁系统
   */
  destroy(): void {
    this.runner.destroy();
  }
}

// 重新导入类型
import type { IncrementalTestOptions } from './IncrementalTestRunner';
import type { IncrementalTestResult } from './IncrementalTestRunner';
import type { CacheStats } from './TestCacheManager';
