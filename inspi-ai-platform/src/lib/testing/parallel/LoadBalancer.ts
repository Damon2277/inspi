import { EventEmitter } from 'events';

export interface WorkerNode {
  id: number;
  isAvailable: boolean;
  currentLoad: number;
  maxLoad: number;
  tasksCompleted: number;
  totalDuration: number;
  errors: number;
  averageTaskTime: number;
  successRate: number;
  lastTaskTime?: number;
}

export interface Task {
  id: string;
  priority: 'P0' | 'P1' | 'P2';
  estimatedDuration: number;
  complexity: number;
  dependencies: string[];
  retryCount: number;
  maxRetries: number;
}

export interface LoadBalancingStrategy {
  name: string;
  selectWorker(workers: WorkerNode[], task: Task): WorkerNode | null;
  shouldRebalance(workers: WorkerNode[]): boolean;
}

export interface LoadBalancingMetrics {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageWaitTime: number;
  workerUtilization: number[];
  loadDistribution: number[];
  rebalanceCount: number;
}

/**
 * 负载均衡器
 * 实现智能任务分配和负载均衡策略
 */
export class LoadBalancer extends EventEmitter {
  private workers: Map<number, WorkerNode> = new Map();
  private taskQueue: Task[] = [];
  private assignedTasks: Map<string, { workerId: number; assignedAt: number }> = new Map();
  private strategy: LoadBalancingStrategy;
  private metrics: LoadBalancingMetrics;
  private rebalanceThreshold: number;
  private rebalanceInterval: NodeJS.Timeout | null = null;

  constructor(
    strategy: LoadBalancingStrategy,
    options: {
      rebalanceThreshold?: number;
      rebalanceIntervalMs?: number;
    } = {},
  ) {
    super();
    this.strategy = strategy;
    this.rebalanceThreshold = options.rebalanceThreshold || 0.3;

    this.metrics = {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      averageWaitTime: 0,
      workerUtilization: [],
      loadDistribution: [],
      rebalanceCount: 0,
    };

    // 启动定期重平衡
    if (options.rebalanceIntervalMs) {
      this.startRebalancing(options.rebalanceIntervalMs);
    }
  }

  /**
   * 注册工作节点
   */
  registerWorker(workerId: number, maxLoad: number = 100): void {
    const worker: WorkerNode = {
      id: workerId,
      isAvailable: true,
      currentLoad: 0,
      maxLoad,
      tasksCompleted: 0,
      totalDuration: 0,
      errors: 0,
      averageTaskTime: 0,
      successRate: 1.0,
    };

    this.workers.set(workerId, worker);
    this.emit('worker:registered', { workerId, worker });
  }

  /**
   * 注销工作节点
   */
  unregisterWorker(workerId: number): void {
    this.workers.delete(workerId);
    this.emit('worker:unregistered', { workerId });
  }

  /**
   * 分配任务
   */
  assignTask(task: Task): number | null {
    const worker = this.strategy.selectWorker(Array.from(this.workers.values()), task);

    if (!worker) {
      // 没有可用工作节点，加入队列
      this.taskQueue.push(task);
      this.emit('task:queued', { taskId: task.id, queueLength: this.taskQueue.length });
      return null;
    }

    // 分配任务
    this.assignTaskToWorker(task, worker);
    return worker.id;
  }

  /**
   * 将任务分配给特定工作节点
   */
  private assignTaskToWorker(task: Task, worker: WorkerNode): void {
    // 更新工作节点状态
    worker.currentLoad += task.estimatedDuration;
    worker.isAvailable = worker.currentLoad < worker.maxLoad;

    // 记录分配信息
    this.assignedTasks.set(task.id, {
      workerId: worker.id,
      assignedAt: Date.now(),
    });

    // 更新指标
    this.metrics.totalTasks++;

    this.emit('task:assigned', {
      taskId: task.id,
      workerId: worker.id,
      workerLoad: worker.currentLoad,
      queueLength: this.taskQueue.length,
    });
  }

  /**
   * 任务完成回调
   */
  onTaskCompleted(taskId: string, duration: number, success: boolean): void {
    const assignment = this.assignedTasks.get(taskId);
    if (!assignment) return;

    const worker = this.workers.get(assignment.workerId);
    if (!worker) return;

    // 更新工作节点统计
    this.updateWorkerStats(worker, duration, success);

    // 更新全局指标
    this.updateMetrics(assignment.assignedAt, success);

    // 清理分配记录
    this.assignedTasks.delete(taskId);

    // 尝试分配队列中的任务
    this.processTaskQueue();

    this.emit('task:completed', {
      taskId,
      workerId: worker.id,
      duration,
      success,
      workerStats: this.getWorkerStats(worker.id),
    });
  }

  /**
   * 更新工作节点统计
   */
  private updateWorkerStats(worker: WorkerNode, duration: number, success: boolean): void {
    worker.currentLoad = Math.max(0, worker.currentLoad - duration);
    worker.isAvailable = worker.currentLoad < worker.maxLoad;
    worker.tasksCompleted++;
    worker.totalDuration += duration;
    worker.lastTaskTime = Date.now();

    if (!success) {
      worker.errors++;
    }

    // 计算平均任务时间
    worker.averageTaskTime = worker.totalDuration / worker.tasksCompleted;

    // 计算成功率
    worker.successRate = (worker.tasksCompleted - worker.errors) / worker.tasksCompleted;
  }

  /**
   * 更新全局指标
   */
  private updateMetrics(assignedAt: number, success: boolean): void {
    const waitTime = Date.now() - assignedAt;

    if (success) {
      this.metrics.completedTasks++;
    } else {
      this.metrics.failedTasks++;
    }

    // 更新平均等待时间
    const totalCompleted = this.metrics.completedTasks + this.metrics.failedTasks;
    this.metrics.averageWaitTime =
      (this.metrics.averageWaitTime * (totalCompleted - 1) + waitTime) / totalCompleted;

    // 更新工作节点利用率
    this.updateWorkerUtilization();
  }

  /**
   * 更新工作节点利用率
   */
  private updateWorkerUtilization(): void {
    const workers = Array.from(this.workers.values());

    this.metrics.workerUtilization = workers.map(worker =>
      worker.currentLoad / worker.maxLoad,
    );

    this.metrics.loadDistribution = workers.map(worker =>
      worker.tasksCompleted,
    );
  }

  /**
   * 处理任务队列
   */
  private processTaskQueue(): void {
    while (this.taskQueue.length > 0) {
      const task = this.taskQueue[0];
      const worker = this.strategy.selectWorker(Array.from(this.workers.values()), task);

      if (!worker) break;

      // 移除队列中的任务并分配
      this.taskQueue.shift();
      this.assignTaskToWorker(task, worker);
    }
  }

  /**
   * 启动定期重平衡
   */
  private startRebalancing(intervalMs: number): void {
    this.rebalanceInterval = setInterval(() => {
      this.performRebalancing();
    }, intervalMs);
  }

  /**
   * 执行负载重平衡
   */
  private performRebalancing(): void {
    const workers = Array.from(this.workers.values());

    if (!this.strategy.shouldRebalance(workers)) {
      return;
    }

    // 识别过载和空闲的工作节点
    const overloadedWorkers = workers.filter(w => w.currentLoad > w.maxLoad * 0.8);
    const underloadedWorkers = workers.filter(w => w.currentLoad < w.maxLoad * 0.3);

    if (overloadedWorkers.length === 0 || underloadedWorkers.length === 0) {
      return;
    }

    // 执行任务迁移
    this.migrateTasks(overloadedWorkers, underloadedWorkers);

    this.metrics.rebalanceCount++;
    this.emit('rebalance:completed', {
      overloadedWorkers: overloadedWorkers.length,
      underloadedWorkers: underloadedWorkers.length,
      rebalanceCount: this.metrics.rebalanceCount,
    });
  }

  /**
   * 迁移任务
   */
  private migrateTasks(overloaded: WorkerNode[], underloaded: WorkerNode[]): void {
    for (const overloadedWorker of overloaded) {
      const targetWorker = (underloaded.find as any)(w =>
        w.currentLoad + overloadedWorker.averageTaskTime < w.maxLoad,
      );

      if (targetWorker) {
        // 模拟任务迁移（实际实现需要与任务执行器协调）
        const migrationLoad = Math.min(
          overloadedWorker.currentLoad * 0.2,
          targetWorker.maxLoad - targetWorker.currentLoad,
        );

        overloadedWorker.currentLoad -= migrationLoad;
        targetWorker.currentLoad += migrationLoad;

        this.emit('task:migrated', {
          fromWorkerId: overloadedWorker.id,
          toWorkerId: targetWorker.id,
          load: migrationLoad,
        });
      }
    }
  }

  /**
   * 获取工作节点统计
   */
  getWorkerStats(workerId: number): WorkerNode | null {
    return this.workers.get(workerId) || null;
  }

  /**
   * 获取所有工作节点统计
   */
  getAllWorkerStats(): WorkerNode[] {
    return Array.from(this.workers.values());
  }

  /**
   * 获取负载均衡指标
   */
  getMetrics(): LoadBalancingMetrics {
    this.updateWorkerUtilization();
    return { ...this.metrics };
  }

  /**
   * 获取队列状态
   */
  getQueueStatus(): {
    queueLength: number;
    averageWaitTime: number;
    oldestTaskAge: number;
  } {
    const now = Date.now();
    const waitTimes = Array.from(this.assignedTasks.values())
      .map(assignment => now - assignment.assignedAt);

    return {
      queueLength: this.taskQueue.length,
      averageWaitTime: this.metrics.averageWaitTime,
      oldestTaskAge: waitTimes.length > 0 ? Math.max(...waitTimes) : 0,
    };
  }

  /**
   * 停止负载均衡器
   */
  stop(): void {
    if (this.rebalanceInterval) {
      clearInterval(this.rebalanceInterval);
      this.rebalanceInterval = null;
    }

    this.workers.clear();
    this.taskQueue = [];
    this.assignedTasks.clear();
  }
}

/**
 * 轮询负载均衡策略
 */
export class RoundRobinStrategy implements LoadBalancingStrategy {
  name = 'round-robin';
  private lastSelectedIndex = -1;

  selectWorker(workers: WorkerNode[], task: Task): WorkerNode | null {
    const availableWorkers = workers.filter(w => w.isAvailable);
    if (availableWorkers.length === 0) return null;

    this.lastSelectedIndex = (this.lastSelectedIndex + 1) % availableWorkers.length;
    return availableWorkers[this.lastSelectedIndex];
  }

  shouldRebalance(workers: WorkerNode[]): boolean {
    // 轮询策略通常不需要重平衡
    return false;
  }
}

/**
 * 加权负载均衡策略
 */
export class WeightedStrategy implements LoadBalancingStrategy {
  name = 'weighted';

  selectWorker(workers: WorkerNode[], task: Task): WorkerNode | null {
    const availableWorkers = workers.filter(w => w.isAvailable);
    if (availableWorkers.length === 0) return null;

    // 根据工作节点性能和当前负载计算权重
    const weightedWorkers = availableWorkers.map(worker => ({
      worker,
      weight: this.calculateWeight(worker, task),
    }));

    // 选择权重最高的工作节点
    weightedWorkers.sort((a, b) => b.weight - a.weight);
    return weightedWorkers[0].worker;
  }

  private calculateWeight(worker: WorkerNode, task: Task): number {
    // 基础权重：剩余容量
    const capacityWeight = (worker.maxLoad - worker.currentLoad) / worker.maxLoad;

    // 性能权重：基于历史表现
    const performanceWeight = worker.successRate * (1 / (worker.averageTaskTime || 1));

    // 优先级权重：P0任务优先分配给性能好的工作节点
    const priorityWeight = task.priority === 'P0' ? performanceWeight * 2 : 1;

    return capacityWeight * performanceWeight * priorityWeight;
  }

  shouldRebalance(workers: WorkerNode[]): boolean {
    if (workers.length < 2) return false;

    // 计算负载标准差
    const loads = workers.map(w => w.currentLoad / w.maxLoad);
    const avgLoad = loads.reduce((sum, load) => sum + load, 0) / loads.length;
    const variance = loads.reduce((sum, load) => sum + Math.pow(load - avgLoad, 2), 0) / loads.length;
    const stdDev = Math.sqrt(variance);

    // 如果标准差过大，需要重平衡
    return stdDev > 0.3;
  }
}

/**
 * 动态负载均衡策略
 */
export class DynamicStrategy implements LoadBalancingStrategy {
  name = 'dynamic';
  private loadHistory: Map<number, number[]> = new Map();
  private readonly historySize = 10;

  selectWorker(workers: WorkerNode[], task: Task): WorkerNode | null {
    const availableWorkers = workers.filter(w => w.isAvailable);
    if (availableWorkers.length === 0) return null;

    // 预测每个工作节点完成任务的时间
    const predictions = availableWorkers.map(worker => ({
      worker,
      predictedTime: this.predictCompletionTime(worker, task),
    }));

    // 选择预测完成时间最短的工作节点
    predictions.sort((a, b) => a.predictedTime - b.predictedTime);
    return predictions[0].worker;
  }

  private predictCompletionTime(worker: WorkerNode, task: Task): number {
    // 获取历史负载数据
    const history = this.loadHistory.get(worker.id) || [];

    // 基于历史数据预测
    if (history.length > 0) {
      const avgHistoricalTime = history.reduce((sum, time) => sum + time, 0) / history.length;
      const trend = history.length > 1 ?
        (history[history.length - 1] - history[0]) / (history.length - 1) : 0;

      return avgHistoricalTime + trend + (worker.currentLoad / worker.maxLoad) * task.estimatedDuration;
    }

    // 没有历史数据时使用简单预测
    return worker.averageTaskTime + task.estimatedDuration;
  }

  shouldRebalance(workers: WorkerNode[]): boolean {
    // 动态策略基于实时负载变化决定是否重平衡
    const now = Date.now();
    const recentlyActive = workers.filter(w =>
      w.lastTaskTime && (now - w.lastTaskTime) < 60000, // 1分钟内活跃
    );

    if (recentlyActive.length < 2) return false;

    // 检查负载变化趋势
    const loadVariations = recentlyActive.map(worker => {
      const history = this.loadHistory.get(worker.id) || [];
      if (history.length < 3) return 0;

      const recent = history.slice(-3);
      return Math.max(...recent) - Math.min(...recent);
    });

    const avgVariation = loadVariations.reduce((sum, v) => sum + v, 0) / loadVariations.length;
    return avgVariation > 1000; // 如果负载变化过大，需要重平衡
  }

  /**
   * 更新负载历史
   */
  updateLoadHistory(workerId: number, completionTime: number): void {
    let history = this.loadHistory.get(workerId) || [];
    history.push(completionTime);

    if (history.length > this.historySize) {
      history = history.slice(-this.historySize);
    }

    this.loadHistory.set(workerId, history);
  }
}
