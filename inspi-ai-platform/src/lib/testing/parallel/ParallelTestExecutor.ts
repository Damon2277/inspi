import { Worker } from 'worker_threads';
import * as os from 'os';
import * as path from 'path';
import { EventEmitter } from 'events';

export interface TestSuite {
  id: string;
  name: string;
  files: string[];
  config: TestConfig;
  priority: 'P0' | 'P1' | 'P2';
  estimatedDuration?: number;
}

export interface TestConfig {
  timeout: number;
  retries: number;
  parallel: boolean;
  maxWorkers?: number;
}

export interface TestResult {
  suiteId: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  tests: TestCaseResult[];
  coverage?: Coverage;
  error?: TestError;
  workerId?: number;
}

export interface TestCaseResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
}

export interface Coverage {
  statements: number;
  branches: number;
  functions: number;
  lines: number;
}

export interface TestError {
  message: string;
  stack?: string;
  type: 'timeout' | 'assertion' | 'setup' | 'runtime';
}

export interface ParallelExecutionOptions {
  maxWorkers?: number;
  timeout?: number;
  retries?: number;
  loadBalancing?: 'round-robin' | 'weighted' | 'dynamic';
  errorIsolation?: boolean;
}

export interface WorkerTask {
  id: string;
  suite: TestSuite;
  workerId: number;
  startTime?: number;
}

export interface WorkerResult {
  taskId: string;
  workerId: number;
  result: TestResult;
  duration: number;
}

/**
 * 并行测试执行引擎
 * 实现多进程并行测试执行，支持负载均衡和错误隔离
 */
export class ParallelTestExecutor extends EventEmitter {
  private maxWorkers: number;
  private workers: Map<number, Worker> = new Map();
  private taskQueue: WorkerTask[] = [];
  private activeTasks: Map<string, WorkerTask> = new Map();
  private results: Map<string, TestResult> = new Map();
  private workerStats: Map<number, WorkerStats> = new Map();
  private options: ParallelExecutionOptions;

  constructor(options: ParallelExecutionOptions = {}) {
    super();
    this.maxWorkers = options.maxWorkers || Math.max(1, os.cpus().length - 1);
    this.options = {
      timeout: 30000,
      retries: 2,
      loadBalancing: 'weighted',
      errorIsolation: true,
      ...options
    };
  }

  /**
   * 并行执行测试套件
   */
  async runTestsInParallel(testSuites: TestSuite[]): Promise<TestResult[]> {
    this.emit('execution:start', { suites: testSuites.length, workers: this.maxWorkers });

    try {
      // 初始化工作进程
      await this.initializeWorkers();

      // 创建任务队列
      this.createTaskQueue(testSuites);

      // 执行任务
      await this.executeTasks();

      // 聚合结果
      const results = this.aggregateResults();

      this.emit('execution:complete', { results: results.length });
      return results;

    } catch (error) {
      this.emit('execution:error', error);
      throw error;
    } finally {
      // 清理工作进程
      await this.cleanup();
    }
  }

  /**
   * 初始化工作进程
   */
  private async initializeWorkers(): Promise<void> {
    const workerPath = path.join(__dirname, 'TestWorker.js');

    for (let i = 0; i < this.maxWorkers; i++) {
      const worker = new Worker(workerPath, {
        workerData: {
          workerId: i,
          options: this.options
        }
      });

      // 设置工作进程事件监听
      this.setupWorkerListeners(worker, i);

      this.workers.set(i, worker);
      this.workerStats.set(i, {
        id: i,
        tasksCompleted: 0,
        totalDuration: 0,
        errors: 0,
        isAvailable: true,
        currentLoad: 0
      });
    }

    // 等待所有工作进程就绪
    await this.waitForWorkersReady();
  }

  /**
   * 设置工作进程事件监听
   */
  private setupWorkerListeners(worker: Worker, workerId: number): void {
    worker.on('message', (message) => {
      this.handleWorkerMessage(workerId, message);
    });

    worker.on('error', (error) => {
      this.handleWorkerError(workerId, error);
    });

    worker.on('exit', (code) => {
      this.handleWorkerExit(workerId, code);
    });
  }

  /**
   * 处理工作进程消息
   */
  private handleWorkerMessage(workerId: number, message: any): void {
    switch (message.type) {
      case 'ready':
        this.emit('worker:ready', { workerId });
        break;

      case 'task:complete':
        this.handleTaskComplete(workerId, message.data);
        break;

      case 'task:progress':
        this.emit('task:progress', { workerId, ...message.data });
        break;

      case 'task:error':
        this.handleTaskError(workerId, message.data);
        break;
    }
  }

  /**
   * 处理任务完成
   */
  private handleTaskComplete(workerId: number, data: WorkerResult): void {
    const task = this.activeTasks.get(data.taskId);
    if (!task) return;

    // 更新工作进程统计
    const stats = this.workerStats.get(workerId);
    if (stats) {
      stats.tasksCompleted++;
      stats.totalDuration += data.duration;
      stats.isAvailable = true;
      stats.currentLoad = 0;
    }

    // 存储结果
    this.results.set(data.taskId, data.result);

    // 清理活动任务
    this.activeTasks.delete(data.taskId);

    this.emit('task:complete', { workerId, taskId: data.taskId, result: data.result });

    // 分配下一个任务
    this.assignNextTask();
  }

  /**
   * 处理任务错误
   */
  private handleTaskError(workerId: number, data: { taskId: string; error: TestError }): void {
    const task = this.activeTasks.get(data.taskId);
    if (!task) return;

    // 更新工作进程统计
    const stats = this.workerStats.get(workerId);
    if (stats) {
      stats.errors++;
      stats.isAvailable = true;
      stats.currentLoad = 0;
    }

    // 错误隔离处理
    if (this.options.errorIsolation) {
      this.isolateWorkerError(workerId, data.error);
    }

    // 重试逻辑
    if (task.suite.config.retries > 0) {
      task.suite.config.retries--;
      this.taskQueue.unshift(task); // 重新加入队列头部
    } else {
      // 创建失败结果
      const failedResult: TestResult = {
        suiteId: task.suite.id,
        status: 'failed',
        duration: 0,
        tests: [],
        error: data.error,
        workerId
      };
      this.results.set(data.taskId, failedResult);
    }

    this.activeTasks.delete(data.taskId);
    this.emit('task:error', { workerId, taskId: data.taskId, error: data.error });

    // 分配下一个任务
    this.assignNextTask();
  }

  /**
   * 处理工作进程错误
   */
  private handleWorkerError(workerId: number, error: Error): void {
    this.emit('worker:error', { workerId, error });

    // 重启工作进程
    if (this.options.errorIsolation) {
      this.restartWorker(workerId);
    }
  }

  /**
   * 处理工作进程退出
   */
  private handleWorkerExit(workerId: number, code: number): void {
    this.emit('worker:exit', { workerId, code });

    if (code !== 0) {
      // 异常退出，重启工作进程
      this.restartWorker(workerId);
    }
  }

  /**
   * 创建任务队列
   */
  private createTaskQueue(testSuites: TestSuite[]): void {
    // 根据负载均衡策略排序
    const sortedSuites = this.sortSuitesByLoadBalancing(testSuites);

    this.taskQueue = sortedSuites.map(suite => ({
      id: `task_${suite.id}_${Date.now()}`,
      suite,
      workerId: -1 // 未分配
    }));
  }

  /**
   * 根据负载均衡策略排序测试套件
   */
  private sortSuitesByLoadBalancing(testSuites: TestSuite[]): TestSuite[] {
    switch (this.options.loadBalancing) {
      case 'weighted':
        // 按优先级和预估时间排序
        return testSuites.sort((a, b) => {
          const priorityWeight = { P0: 3, P1: 2, P2: 1 };
          const aWeight = priorityWeight[a.priority] * (a.estimatedDuration || 1000);
          const bWeight = priorityWeight[b.priority] * (b.estimatedDuration || 1000);
          return bWeight - aWeight;
        });

      case 'dynamic':
        // 动态排序，考虑当前工作进程负载
        return testSuites.sort((a, b) => {
          const aComplexity = a.files.length * (a.estimatedDuration || 1000);
          const bComplexity = b.files.length * (b.estimatedDuration || 1000);
          return bComplexity - aComplexity;
        });

      case 'round-robin':
      default:
        // 简单的轮询排序
        return testSuites;
    }
  }

  /**
   * 执行任务
   */
  private async executeTasks(): Promise<void> {
    // 初始分配任务
    this.assignInitialTasks();

    // 等待所有任务完成
    return new Promise((resolve, reject) => {
      const checkCompletion = () => {
        if (this.taskQueue.length === 0 && this.activeTasks.size === 0) {
          resolve();
        } else if (this.activeTasks.size === 0 && this.taskQueue.length > 0) {
          // 所有工作进程都空闲但还有任务，可能出现死锁
          reject(new Error('Task execution deadlock detected'));
        }
      };

      // 监听任务完成和错误事件
      this.on('task:complete', checkCompletion);
      this.on('task:error', checkCompletion);

      // 设置超时
      const timeout = setTimeout(() => {
        reject(new Error('Task execution timeout'));
      }, this.options.timeout! * this.taskQueue.length);

      // 清理超时
      this.once('execution:complete', () => clearTimeout(timeout));
    });
  }

  /**
   * 初始分配任务
   */
  private assignInitialTasks(): void {
    for (let i = 0; i < this.maxWorkers && this.taskQueue.length > 0; i++) {
      this.assignNextTask();
    }
  }

  /**
   * 分配下一个任务
   */
  private assignNextTask(): void {
    if (this.taskQueue.length === 0) return;

    const availableWorker = this.findAvailableWorker();
    if (!availableWorker) return;

    const task = this.taskQueue.shift()!;
    task.workerId = availableWorker.id;
    task.startTime = Date.now();

    // 更新工作进程状态
    availableWorker.isAvailable = false;
    availableWorker.currentLoad = task.suite.estimatedDuration || 1000;

    // 添加到活动任务
    this.activeTasks.set(task.id, task);

    // 发送任务到工作进程
    const worker = this.workers.get(availableWorker.id);
    if (worker) {
      worker.postMessage({
        type: 'task:execute',
        data: {
          taskId: task.id,
          suite: task.suite
        }
      });
    }

    this.emit('task:assigned', { workerId: availableWorker.id, taskId: task.id });
  }

  /**
   * 查找可用的工作进程
   */
  private findAvailableWorker(): WorkerStats | null {
    const availableWorkers = Array.from(this.workerStats.values())
      .filter(stats => stats.isAvailable);

    if (availableWorkers.length === 0) return null;

    // 根据负载均衡策略选择工作进程
    switch (this.options.loadBalancing) {
      case 'weighted':
        // 选择完成任务最少的工作进程
        return availableWorkers.reduce((min, current) => 
          current.tasksCompleted < min.tasksCompleted ? current : min
        );

      case 'dynamic':
        // 选择平均执行时间最短的工作进程
        return availableWorkers.reduce((fastest, current) => {
          const currentAvg = current.tasksCompleted > 0 ? 
            current.totalDuration / current.tasksCompleted : 0;
          const fastestAvg = fastest.tasksCompleted > 0 ? 
            fastest.totalDuration / fastest.tasksCompleted : 0;
          return currentAvg < fastestAvg ? current : fastest;
        });

      case 'round-robin':
      default:
        // 简单的轮询选择
        return availableWorkers[0];
    }
  }

  /**
   * 聚合结果
   */
  private aggregateResults(): TestResult[] {
    const results = Array.from(this.results.values());
    
    // 计算总体统计
    const totalTests = results.reduce((sum, result) => sum + result.tests.length, 0);
    const passedTests = results.reduce((sum, result) => 
      sum + result.tests.filter(test => test.status === 'passed').length, 0
    );
    const failedTests = results.reduce((sum, result) => 
      sum + result.tests.filter(test => test.status === 'failed').length, 0
    );

    this.emit('results:aggregated', {
      total: results.length,
      passed: results.filter(r => r.status === 'passed').length,
      failed: results.filter(r => r.status === 'failed').length,
      totalTests,
      passedTests,
      failedTests
    });

    return results;
  }

  /**
   * 错误隔离处理
   */
  private isolateWorkerError(workerId: number, error: TestError): void {
    const stats = this.workerStats.get(workerId);
    if (!stats) return;

    // 如果错误率过高，重启工作进程
    const errorRate = stats.errors / (stats.tasksCompleted + stats.errors);
    if (errorRate > 0.5 && stats.tasksCompleted + stats.errors > 5) {
      this.emit('worker:isolated', { workerId, errorRate });
      this.restartWorker(workerId);
    }
  }

  /**
   * 重启工作进程
   */
  private async restartWorker(workerId: number): Promise<void> {
    const oldWorker = this.workers.get(workerId);
    if (oldWorker) {
      await oldWorker.terminate();
    }

    // 创建新的工作进程
    const workerPath = path.join(__dirname, 'TestWorker.js');
    const newWorker = new Worker(workerPath, {
      workerData: {
        workerId,
        options: this.options
      }
    });

    this.setupWorkerListeners(newWorker, workerId);
    this.workers.set(workerId, newWorker);

    // 重置统计
    this.workerStats.set(workerId, {
      id: workerId,
      tasksCompleted: 0,
      totalDuration: 0,
      errors: 0,
      isAvailable: true,
      currentLoad: 0
    });

    this.emit('worker:restarted', { workerId });
  }

  /**
   * 等待所有工作进程就绪
   */
  private async waitForWorkersReady(): Promise<void> {
    return new Promise((resolve) => {
      let readyCount = 0;
      
      const checkReady = () => {
        readyCount++;
        if (readyCount === this.maxWorkers) {
          resolve();
        }
      };

      this.on('worker:ready', checkReady);
    });
  }

  /**
   * 清理资源
   */
  private async cleanup(): Promise<void> {
    const terminationPromises = Array.from(this.workers.values())
      .map(worker => worker.terminate());

    await Promise.all(terminationPromises);

    this.workers.clear();
    this.workerStats.clear();
    this.taskQueue = [];
    this.activeTasks.clear();
    this.results.clear();
  }

  /**
   * 获取执行统计
   */
  getExecutionStats(): ExecutionStats {
    const workerStats = Array.from(this.workerStats.values());
    
    return {
      totalWorkers: this.maxWorkers,
      activeWorkers: workerStats.filter(s => !s.isAvailable).length,
      totalTasksCompleted: workerStats.reduce((sum, s) => sum + s.tasksCompleted, 0),
      totalErrors: workerStats.reduce((sum, s) => sum + s.errors, 0),
      averageTaskDuration: this.calculateAverageTaskDuration(workerStats),
      workerUtilization: this.calculateWorkerUtilization(workerStats)
    };
  }

  private calculateAverageTaskDuration(stats: WorkerStats[]): number {
    const totalTasks = stats.reduce((sum, s) => sum + s.tasksCompleted, 0);
    const totalDuration = stats.reduce((sum, s) => sum + s.totalDuration, 0);
    return totalTasks > 0 ? totalDuration / totalTasks : 0;
  }

  private calculateWorkerUtilization(stats: WorkerStats[]): number {
    const busyWorkers = stats.filter(s => !s.isAvailable).length;
    return busyWorkers / this.maxWorkers;
  }
}

interface WorkerStats {
  id: number;
  tasksCompleted: number;
  totalDuration: number;
  errors: number;
  isAvailable: boolean;
  currentLoad: number;
}

interface ExecutionStats {
  totalWorkers: number;
  activeWorkers: number;
  totalTasksCompleted: number;
  totalErrors: number;
  averageTaskDuration: number;
  workerUtilization: number;
}