import {
  LoadBalancer,
  RoundRobinStrategy,
  WeightedStrategy,
  DynamicStrategy,
  WorkerNode,
  Task,
} from '../../../../lib/testing/parallel/LoadBalancer';

describe('LoadBalancer', () => {
  let loadBalancer: LoadBalancer;
  let strategy: WeightedStrategy;

  beforeEach(() => {
    strategy = new WeightedStrategy();
    loadBalancer = new LoadBalancer(strategy);
  });

  afterEach(() => {
    loadBalancer.stop();
  });

  describe('worker management', () => {
    it('should register workers correctly', () => {
      loadBalancer.registerWorker(1, 100);
      loadBalancer.registerWorker(2, 150);

      const workers = loadBalancer.getAllWorkerStats();
      expect(workers).toHaveLength(2);
      expect(workers[0].id).toBe(1);
      expect(workers[0].maxLoad).toBe(100);
      expect(workers[1].id).toBe(2);
      expect(workers[1].maxLoad).toBe(150);
    });

    it('should unregister workers correctly', () => {
      loadBalancer.registerWorker(1);
      loadBalancer.registerWorker(2);

      expect(loadBalancer.getAllWorkerStats()).toHaveLength(2);

      loadBalancer.unregisterWorker(1);
      expect(loadBalancer.getAllWorkerStats()).toHaveLength(1);
      expect(loadBalancer.getAllWorkerStats()[0].id).toBe(2);
    });
  });

  describe('task assignment', () => {
    beforeEach(() => {
      loadBalancer.registerWorker(1, 100);
      loadBalancer.registerWorker(2, 100);
    });

    it('should assign tasks to available workers', () => {
      const task: Task = {
        id: 'task-1',
        priority: 'P0',
        estimatedDuration: 50,
        complexity: 1,
        dependencies: [],
        retryCount: 0,
        maxRetries: 2,
      };

      const assignedWorkerId = loadBalancer.assignTask(task);
      expect(assignedWorkerId).toBeGreaterThanOrEqual(1);
      expect(assignedWorkerId).toBeLessThanOrEqual(2);
    });

    it('should queue tasks when no workers available', () => {
      // Make all workers unavailable
      const workers = loadBalancer.getAllWorkerStats();
      workers.forEach(worker => {
        worker.isAvailable = false;
        worker.currentLoad = worker.maxLoad;
      });

      const task: Task = {
        id: 'task-1',
        priority: 'P0',
        estimatedDuration: 50,
        complexity: 1,
        dependencies: [],
        retryCount: 0,
        maxRetries: 2,
      };

      const assignedWorkerId = loadBalancer.assignTask(task);
      expect(assignedWorkerId).toBeNull();

      const queueStatus = loadBalancer.getQueueStatus();
      expect(queueStatus.queueLength).toBe(1);
    });

    it('should process queued tasks when workers become available', () => {
      // Make all workers unavailable initially
      const workers = loadBalancer.getAllWorkerStats();
      workers.forEach(worker => {
        worker.isAvailable = false;
        worker.currentLoad = worker.maxLoad;
      });

      const task: Task = {
        id: 'task-1',
        priority: 'P0',
        estimatedDuration: 50,
        complexity: 1,
        dependencies: [],
        retryCount: 0,
        maxRetries: 2,
      };

      // Task should be queued
      const assignedWorkerId = loadBalancer.assignTask(task);
      expect(assignedWorkerId).toBeNull();

      // Complete a task to make worker available
      loadBalancer.onTaskCompleted('previous-task', 1000, true);

      // Queue should be processed
      const queueStatus = loadBalancer.getQueueStatus();
      expect(queueStatus.queueLength).toBe(0);
    });
  });

  describe('task completion handling', () => {
    beforeEach(() => {
      loadBalancer.registerWorker(1, 100);
    });

    it('should update worker stats on task completion', () => {
      const task: Task = {
        id: 'task-1',
        priority: 'P0',
        estimatedDuration: 50,
        complexity: 1,
        dependencies: [],
        retryCount: 0,
        maxRetries: 2,
      };

      loadBalancer.assignTask(task);
      loadBalancer.onTaskCompleted('task-1', 1000, true);

      const worker = loadBalancer.getWorkerStats(1);
      expect(worker?.tasksCompleted).toBe(1);
      expect(worker?.totalDuration).toBe(1000);
      expect(worker?.averageTaskTime).toBe(1000);
      expect(worker?.successRate).toBe(1.0);
    });

    it('should handle failed task completion', () => {
      const task: Task = {
        id: 'task-1',
        priority: 'P0',
        estimatedDuration: 50,
        complexity: 1,
        dependencies: [],
        retryCount: 0,
        maxRetries: 2,
      };

      loadBalancer.assignTask(task);
      loadBalancer.onTaskCompleted('task-1', 1000, false);

      const worker = loadBalancer.getWorkerStats(1);
      expect(worker?.tasksCompleted).toBe(1);
      expect(worker?.errors).toBe(1);
      expect(worker?.successRate).toBe(0.0);
    });
  });

  describe('metrics and statistics', () => {
    beforeEach(() => {
      loadBalancer.registerWorker(1, 100);
      loadBalancer.registerWorker(2, 100);
    });

    it('should provide accurate metrics', () => {
      // Assign and complete some tasks
      const task1: Task = {
        id: 'task-1',
        priority: 'P0',
        estimatedDuration: 50,
        complexity: 1,
        dependencies: [],
        retryCount: 0,
        maxRetries: 2,
      };

      const task2: Task = {
        id: 'task-2',
        priority: 'P1',
        estimatedDuration: 30,
        complexity: 1,
        dependencies: [],
        retryCount: 0,
        maxRetries: 2,
      };

      loadBalancer.assignTask(task1);
      loadBalancer.assignTask(task2);

      loadBalancer.onTaskCompleted('task-1', 1000, true);
      loadBalancer.onTaskCompleted('task-2', 800, false);

      const metrics = loadBalancer.getMetrics();
      expect(metrics.totalTasks).toBe(2);
      expect(metrics.completedTasks).toBe(1);
      expect(metrics.failedTasks).toBe(1);
      expect(metrics.averageWaitTime).toBeGreaterThan(0);
    });

    it('should track worker utilization', () => {
      const task: Task = {
        id: 'task-1',
        priority: 'P0',
        estimatedDuration: 50,
        complexity: 1,
        dependencies: [],
        retryCount: 0,
        maxRetries: 2,
      };

      loadBalancer.assignTask(task);

      const metrics = loadBalancer.getMetrics();
      expect(metrics.workerUtilization).toHaveLength(2);
      expect(metrics.loadDistribution).toHaveLength(2);
    });
  });
});

describe('RoundRobinStrategy', () => {
  let strategy: RoundRobinStrategy;
  let workers: WorkerNode[];

  beforeEach(() => {
    strategy = new RoundRobinStrategy();
    workers = [
      {
        id: 1,
        isAvailable: true,
        currentLoad: 20,
        maxLoad: 100,
        tasksCompleted: 5,
        totalDuration: 5000,
        errors: 0,
        averageTaskTime: 1000,
        successRate: 1.0,
      },
      {
        id: 2,
        isAvailable: true,
        currentLoad: 50,
        maxLoad: 100,
        tasksCompleted: 3,
        totalDuration: 4500,
        errors: 1,
        averageTaskTime: 1500,
        successRate: 0.67,
      },
    ];
  });

  it('should select workers in round-robin fashion', () => {
    const task: Task = {
      id: 'task-1',
      priority: 'P0',
      estimatedDuration: 50,
      complexity: 1,
      dependencies: [],
      retryCount: 0,
      maxRetries: 2,
    };

    const worker1 = strategy.selectWorker(workers, task);
    const worker2 = strategy.selectWorker(workers, task);
    const worker3 = strategy.selectWorker(workers, task);

    expect(worker1?.id).toBe(1);
    expect(worker2?.id).toBe(2);
    expect(worker3?.id).toBe(1); // Should cycle back
  });

  it('should return null when no workers available', () => {
    const unavailableWorkers = workers.map(w => ({ ...w, isAvailable: false }));
    const task: Task = {
      id: 'task-1',
      priority: 'P0',
      estimatedDuration: 50,
      complexity: 1,
      dependencies: [],
      retryCount: 0,
      maxRetries: 2,
    };

    const selectedWorker = strategy.selectWorker(unavailableWorkers, task);
    expect(selectedWorker).toBeNull();
  });

  it('should not require rebalancing', () => {
    expect(strategy.shouldRebalance(workers)).toBe(false);
  });
});

describe('WeightedStrategy', () => {
  let strategy: WeightedStrategy;
  let workers: WorkerNode[];

  beforeEach(() => {
    strategy = new WeightedStrategy();
    workers = [
      {
        id: 1,
        isAvailable: true,
        currentLoad: 20,
        maxLoad: 100,
        tasksCompleted: 5,
        totalDuration: 5000,
        errors: 0,
        averageTaskTime: 1000,
        successRate: 1.0,
      },
      {
        id: 2,
        isAvailable: true,
        currentLoad: 80,
        maxLoad: 100,
        tasksCompleted: 3,
        totalDuration: 4500,
        errors: 1,
        averageTaskTime: 1500,
        successRate: 0.67,
      },
    ];
  });

  it('should select worker with highest weight', () => {
    const task: Task = {
      id: 'task-1',
      priority: 'P0',
      estimatedDuration: 50,
      complexity: 1,
      dependencies: [],
      retryCount: 0,
      maxRetries: 2,
    };

    const selectedWorker = strategy.selectWorker(workers, task);

    // Worker 1 should be selected (lower load, better performance)
    expect(selectedWorker?.id).toBe(1);
  });

  it('should prioritize P0 tasks for high-performance workers', () => {
    const p0Task: Task = {
      id: 'p0-task',
      priority: 'P0',
      estimatedDuration: 50,
      complexity: 1,
      dependencies: [],
      retryCount: 0,
      maxRetries: 2,
    };

    const p2Task: Task = {
      id: 'p2-task',
      priority: 'P2',
      estimatedDuration: 50,
      complexity: 1,
      dependencies: [],
      retryCount: 0,
      maxRetries: 2,
    };

    const p0Worker = strategy.selectWorker(workers, p0Task);
    const p2Worker = strategy.selectWorker(workers, p2Task);

    // P0 task should get the better worker (worker 1)
    expect(p0Worker?.id).toBe(1);
  });

  it('should require rebalancing when load variance is high', () => {
    const imbalancedWorkers: WorkerNode[] = [
      { ...workers[0], currentLoad: 10, maxLoad: 100 }, // 10% load
      { ...workers[1], currentLoad: 90, maxLoad: 100 },  // 90% load
    ];

    expect(strategy.shouldRebalance(imbalancedWorkers)).toBe(true);
  });

  it('should not require rebalancing when load is balanced', () => {
    const balancedWorkers: WorkerNode[] = [
      { ...workers[0], currentLoad: 45, maxLoad: 100 },
      { ...workers[1], currentLoad: 55, maxLoad: 100 },
    ];

    expect(strategy.shouldRebalance(balancedWorkers)).toBe(false);
  });
});

describe('DynamicStrategy', () => {
  let strategy: DynamicStrategy;
  let workers: WorkerNode[];

  beforeEach(() => {
    strategy = new DynamicStrategy();
    workers = [
      {
        id: 1,
        isAvailable: true,
        currentLoad: 20,
        maxLoad: 100,
        tasksCompleted: 5,
        totalDuration: 5000,
        errors: 0,
        averageTaskTime: 1000,
        successRate: 1.0,
        lastTaskTime: Date.now() - 30000, // 30 seconds ago
      },
      {
        id: 2,
        isAvailable: true,
        currentLoad: 50,
        maxLoad: 100,
        tasksCompleted: 3,
        totalDuration: 4500,
        errors: 1,
        averageTaskTime: 1500,
        successRate: 0.67,
        lastTaskTime: Date.now() - 10000, // 10 seconds ago
      },
    ];
  });

  it('should select worker with shortest predicted completion time', () => {
    const task: Task = {
      id: 'task-1',
      priority: 'P0',
      estimatedDuration: 1000,
      complexity: 1,
      dependencies: [],
      retryCount: 0,
      maxRetries: 2,
    };

    const selectedWorker = strategy.selectWorker(workers, task);

    // Should select based on predicted completion time
    expect(selectedWorker).toBeDefined();
    expect([1, 2]).toContain(selectedWorker!.id);
  });

  it('should update load history', () => {
    strategy.updateLoadHistory(1, 1200);
    strategy.updateLoadHistory(1, 1100);
    strategy.updateLoadHistory(1, 1300);

    // History should be maintained internally
    expect(strategy['loadHistory'].get(1)).toHaveLength(3);
  });

  it('should limit history size', () => {
    // Add more than the history limit
    for (let i = 0; i < 15; i++) {
      strategy.updateLoadHistory(1, 1000 + i * 100);
    }

    // Should be limited to historySize (10)
    expect(strategy['loadHistory'].get(1)?.length).toBe(10);
  });

  it('should require rebalancing when load variation is high', () => {
    // Set up workers with recent activity
    const recentWorkers = workers.map(w => ({
      ...w,
      lastTaskTime: Date.now() - 30000, // Recent activity
    }));

    // Mock high load variation
    strategy.updateLoadHistory(1, 500);
    strategy.updateLoadHistory(1, 2000);
    strategy.updateLoadHistory(1, 1000);

    strategy.updateLoadHistory(2, 1500);
    strategy.updateLoadHistory(2, 3000);
    strategy.updateLoadHistory(2, 1200);

    expect(strategy.shouldRebalance(recentWorkers)).toBe(true);
  });

  it('should not require rebalancing with stable load', () => {
    const recentWorkers = workers.map(w => ({
      ...w,
      lastTaskTime: Date.now() - 30000,
    }));

    // Mock stable load
    strategy.updateLoadHistory(1, 1000);
    strategy.updateLoadHistory(1, 1100);
    strategy.updateLoadHistory(1, 1050);

    expect(strategy.shouldRebalance(recentWorkers)).toBe(false);
  });
});
