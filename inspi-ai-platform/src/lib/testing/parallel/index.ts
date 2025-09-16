/**
 * 并行测试执行引擎
 * 
 * 这个模块提供了完整的并行测试执行解决方案，包括：
 * - 多进程并行测试执行器
 * - 智能负载均衡和任务分配
 * - 结果聚合和报告生成
 * - 错误隔离和恢复机制
 */

export { ParallelTestExecutor } from './ParallelTestExecutor';
export { LoadBalancer, RoundRobinStrategy, WeightedStrategy, DynamicStrategy } from './LoadBalancer';
export { ResultAggregator } from './ResultAggregator';
export { ErrorIsolation } from './ErrorIsolation';

export type {
  TestSuite,
  TestConfig,
  TestResult,
  TestCaseResult,
  Coverage,
  TestError,
  ParallelExecutionOptions,
  WorkerTask,
  WorkerResult
} from './ParallelTestExecutor';

export type {
  WorkerNode,
  Task,
  LoadBalancingStrategy,
  LoadBalancingMetrics
} from './LoadBalancer';

export type {
  AggregatedResult,
  TestSummary,
  AggregatedCoverage,
  PerformanceMetrics,
  ErrorSummary,
  ExecutionTimeline,
  AggregationOptions
} from './ResultAggregator';

export type {
  ErrorPattern,
  RecoveryStrategy,
  IsolationPolicy,
  WorkerHealth,
  ErrorHandlingResult,
  ErrorStatistics
} from './ErrorIsolation';

/**
 * 并行测试执行引擎的主要入口点
 * 整合所有组件提供统一的API
 */
export class ParallelTestEngine {
  private executor: ParallelTestExecutor;
  private loadBalancer: LoadBalancer;
  private resultAggregator: ResultAggregator;
  private errorIsolation: ErrorIsolation;

  constructor(options: ParallelTestEngineOptions = {}) {
    // 初始化错误隔离系统
    this.errorIsolation = new ErrorIsolation(options.isolationPolicy);

    // 初始化负载均衡器
    const strategy = options.loadBalancingStrategy || new WeightedStrategy();
    this.loadBalancer = new LoadBalancer(strategy, options.loadBalancingOptions);

    // 初始化结果聚合器
    this.resultAggregator = new ResultAggregator(options.aggregationOptions);

    // 初始化并行执行器
    this.executor = new ParallelTestExecutor({
      ...options.executionOptions,
      loadBalancing: strategy.name as any
    });

    this.setupEventHandlers();
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    // 执行器事件
    this.executor.on('task:error', (data) => {
      this.errorIsolation.handleError({
        message: data.error.message,
        type: data.error.type,
        severity: 'medium',
        workerId: data.workerId,
        timestamp: Date.now(),
        stack: data.error.stack
      });
    });

    this.executor.on('task:complete', (data) => {
      this.loadBalancer.onTaskCompleted(data.taskId, data.result.duration, data.result.status === 'passed');
      this.resultAggregator.addResult(data.result);
    });

    // 错误隔离事件
    this.errorIsolation.on('worker:isolated', (data) => {
      this.loadBalancer.unregisterWorker(data.workerId);
    });

    this.errorIsolation.on('worker:recovered', (data) => {
      this.loadBalancer.registerWorker(data.workerId);
    });
  }

  /**
   * 运行并行测试
   */
  async runTests(testSuites: TestSuite[]): Promise<AggregatedResult> {
    // 开始聚合
    this.resultAggregator.startAggregation();

    // 注册工作节点
    const maxWorkers = this.executor['maxWorkers'];
    for (let i = 0; i < maxWorkers; i++) {
      this.loadBalancer.registerWorker(i);
      this.errorIsolation.registerWorker(i);
    }

    try {
      // 执行测试
      const results = await this.executor.runTestsInParallel(testSuites);

      // 完成聚合并返回结果
      return await this.resultAggregator.finalize();

    } catch (error) {
      throw new Error(`Parallel test execution failed: ${error.message}`);
    }
  }

  /**
   * 获取执行统计
   */
  getExecutionStats() {
    return {
      executor: this.executor.getExecutionStats(),
      loadBalancer: this.loadBalancer.getMetrics(),
      errorIsolation: this.errorIsolation.getErrorStatistics()
    };
  }

  /**
   * 停止执行引擎
   */
  async stop(): Promise<void> {
    this.loadBalancer.stop();
    this.errorIsolation.cleanup();
    // executor 会在执行完成后自动清理
  }
}

export interface ParallelTestEngineOptions {
  executionOptions?: Partial<ParallelExecutionOptions>;
  loadBalancingStrategy?: LoadBalancingStrategy;
  loadBalancingOptions?: {
    rebalanceThreshold?: number;
    rebalanceIntervalMs?: number;
  };
  aggregationOptions?: Partial<AggregationOptions>;
  isolationPolicy?: Partial<IsolationPolicy>;
}

// 重新导出类型
import type { ParallelExecutionOptions } from './ParallelTestExecutor';
import type { LoadBalancingStrategy } from './LoadBalancer';
import type { AggregationOptions } from './ResultAggregator';
import type { IsolationPolicy } from './ErrorIsolation';
import type { TestSuite, AggregatedResult } from './ParallelTestExecutor';
import { WeightedStrategy } from './LoadBalancer';
import { ErrorIsolation } from './ErrorIsolation';
import { LoadBalancer } from './LoadBalancer';
import { ResultAggregator } from './ResultAggregator';
import { ParallelTestExecutor } from './ParallelTestExecutor';