import { EventEmitter } from 'events';

export interface TestError {
  message: string;
  stack?: string;
  type: 'timeout' | 'assertion' | 'setup' | 'runtime' | 'memory' | 'network';
  severity: 'low' | 'medium' | 'high' | 'critical';
  workerId?: number;
  suiteId?: string;
  testName?: string;
  timestamp: number;
  context?: any;
}

export interface ErrorPattern {
  id: string;
  pattern: RegExp;
  type: TestError['type'];
  severity: TestError['severity'];
  description: string;
  recovery?: RecoveryStrategy;
}

export interface RecoveryStrategy {
  type: 'retry' | 'restart' | 'isolate' | 'skip';
  maxAttempts: number;
  backoffMs: number;
  condition?: (error: TestError) => boolean;
}

export interface IsolationPolicy {
  maxErrorsPerWorker: number;
  maxErrorRate: number;
  timeWindowMs: number;
  isolationDurationMs: number;
  autoRestart: boolean;
}

export interface WorkerHealth {
  workerId: number;
  isHealthy: boolean;
  errorCount: number;
  errorRate: number;
  lastError?: TestError;
  isolatedUntil?: number;
  restartCount: number;
}

/**
 * 错误隔离系统
 * 处理并行执行中的错误，提供错误隔离和恢复机制
 */
export class ErrorIsolation extends EventEmitter {
  private errorPatterns: Map<string, ErrorPattern> = new Map();
  private workerHealth: Map<number, WorkerHealth> = new Map();
  private errorHistory: TestError[] = [];
  private policy: IsolationPolicy;
  private recoveryStrategies: Map<string, RecoveryStrategy> = new Map();

  constructor(policy: Partial<IsolationPolicy> = {}) {
    super();
    this.policy = {
      maxErrorsPerWorker: 5,
      maxErrorRate: 0.2, // 20%
      timeWindowMs: 300000, // 5分钟
      isolationDurationMs: 60000, // 1分钟
      autoRestart: true,
      ...policy
    };

    this.initializeDefaultPatterns();
    this.initializeDefaultStrategies();
  }  /**
  
 * 初始化默认错误模式
   */
  private initializeDefaultPatterns(): void {
    const patterns: ErrorPattern[] = [
      {
        id: 'timeout',
        pattern: /timeout|timed out|exceeded.*timeout/i,
        type: 'timeout',
        severity: 'high',
        description: 'Test execution timeout',
        recovery: { type: 'retry', maxAttempts: 2, backoffMs: 1000 }
      },
      {
        id: 'memory',
        pattern: /out of memory|heap.*exceeded|memory.*limit/i,
        type: 'memory',
        severity: 'critical',
        description: 'Memory exhaustion',
        recovery: { type: 'restart', maxAttempts: 1, backoffMs: 5000 }
      },
      {
        id: 'network',
        pattern: /network.*error|connection.*refused|dns.*error/i,
        type: 'network',
        severity: 'medium',
        description: 'Network connectivity issue',
        recovery: { type: 'retry', maxAttempts: 3, backoffMs: 2000 }
      },
      {
        id: 'assertion',
        pattern: /assertion.*failed|expect.*received|test.*failed/i,
        type: 'assertion',
        severity: 'low',
        description: 'Test assertion failure',
        recovery: { type: 'skip', maxAttempts: 1, backoffMs: 0 }
      },
      {
        id: 'setup',
        pattern: /setup.*failed|beforeall.*error|initialization.*error/i,
        type: 'setup',
        severity: 'high',
        description: 'Test setup failure',
        recovery: { type: 'isolate', maxAttempts: 2, backoffMs: 3000 }
      }
    ];

    patterns.forEach(pattern => {
      this.errorPatterns.set(pattern.id, pattern);
    });
  }

  /**
   * 初始化默认恢复策略
   */
  private initializeDefaultStrategies(): void {
    const strategies: Array<[string, RecoveryStrategy]> = [
      ['timeout', { type: 'retry', maxAttempts: 2, backoffMs: 1000 }],
      ['memory', { type: 'restart', maxAttempts: 1, backoffMs: 5000 }],
      ['network', { type: 'retry', maxAttempts: 3, backoffMs: 2000 }],
      ['assertion', { type: 'skip', maxAttempts: 1, backoffMs: 0 }],
      ['setup', { type: 'isolate', maxAttempts: 2, backoffMs: 3000 }],
      ['runtime', { type: 'isolate', maxAttempts: 1, backoffMs: 10000 }]
    ];

    strategies.forEach(([type, strategy]) => {
      this.recoveryStrategies.set(type, strategy);
    });
  }

  /**
   * 注册工作节点
   */
  registerWorker(workerId: number): void {
    this.workerHealth.set(workerId, {
      workerId,
      isHealthy: true,
      errorCount: 0,
      errorRate: 0,
      restartCount: 0
    });

    this.emit('worker:registered', { workerId });
  }

  /**
   * 处理错误
   */
  async handleError(error: TestError): Promise<ErrorHandlingResult> {
    // 分类错误
    const classifiedError = this.classifyError(error);
    
    // 记录错误历史
    this.recordError(classifiedError);

    // 更新工作节点健康状态
    this.updateWorkerHealth(classifiedError);

    // 决定恢复策略
    const strategy = this.selectRecoveryStrategy(classifiedError);

    // 执行恢复策略
    const result = await this.executeRecoveryStrategy(classifiedError, strategy);

    this.emit('error:handled', { error: classifiedError, strategy, result });

    return result;
  }

  /**
   * 分类错误
   */
  private classifyError(error: TestError): TestError {
    // 如果已经分类，直接返回
    if (error.type !== 'runtime' || error.severity !== 'low') {
      return error;
    }

    // 根据错误模式分类
    for (const pattern of this.errorPatterns.values()) {
      if (pattern.pattern.test(error.message)) {
        return {
          ...error,
          type: pattern.type,
          severity: pattern.severity,
          timestamp: error.timestamp || Date.now()
        };
      }
    }

    // 默认分类
    return {
      ...error,
      type: 'runtime',
      severity: 'medium',
      timestamp: error.timestamp || Date.now()
    };
  }

  /**
   * 记录错误历史
   */
  private recordError(error: TestError): void {
    this.errorHistory.push(error);

    // 保持历史记录在合理范围内
    const maxHistorySize = 1000;
    if (this.errorHistory.length > maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(-maxHistorySize);
    }

    // 清理过期记录
    const cutoffTime = Date.now() - this.policy.timeWindowMs;
    this.errorHistory = this.errorHistory.filter(e => e.timestamp > cutoffTime);
  }

  /**
   * 更新工作节点健康状态
   */
  private updateWorkerHealth(error: TestError): void {
    if (!error.workerId) return;

    const health = this.workerHealth.get(error.workerId);
    if (!health) return;

    health.errorCount++;
    health.lastError = error;

    // 计算错误率
    const recentErrors = this.getRecentErrorsForWorker(error.workerId);
    const totalTasks = this.getTotalTasksForWorker(error.workerId);
    health.errorRate = totalTasks > 0 ? recentErrors.length / totalTasks : 0;

    // 检查是否需要隔离
    if (this.shouldIsolateWorker(health)) {
      this.isolateWorker(error.workerId);
    }
  }

  /**
   * 获取工作节点最近的错误
   */
  private getRecentErrorsForWorker(workerId: number): TestError[] {
    const cutoffTime = Date.now() - this.policy.timeWindowMs;
    return this.errorHistory.filter(e => 
      e.workerId === workerId && e.timestamp > cutoffTime
    );
  }

  /**
   * 获取工作节点总任务数（简化实现）
   */
  private getTotalTasksForWorker(workerId: number): number {
    // 实际实现中应该从任务执行器获取
    return Math.max(10, this.getRecentErrorsForWorker(workerId).length * 5);
  }

  /**
   * 判断是否应该隔离工作节点
   */
  private shouldIsolateWorker(health: WorkerHealth): boolean {
    return (
      health.errorCount >= this.policy.maxErrorsPerWorker ||
      health.errorRate >= this.policy.maxErrorRate
    ) && health.isHealthy;
  }

  /**
   * 隔离工作节点
   */
  private isolateWorker(workerId: number): void {
    const health = this.workerHealth.get(workerId);
    if (!health) return;

    health.isHealthy = false;
    health.isolatedUntil = Date.now() + this.policy.isolationDurationMs;

    this.emit('worker:isolated', { 
      workerId, 
      reason: 'High error rate',
      isolatedUntil: health.isolatedUntil 
    });

    // 设置自动恢复
    setTimeout(() => {
      this.recoverWorker(workerId);
    }, this.policy.isolationDurationMs);
  }

  /**
   * 恢复工作节点
   */
  private recoverWorker(workerId: number): void {
    const health = this.workerHealth.get(workerId);
    if (!health) return;

    if (this.policy.autoRestart) {
      health.isHealthy = true;
      health.errorCount = 0;
      health.errorRate = 0;
      health.isolatedUntil = undefined;
      health.restartCount++;

      this.emit('worker:recovered', { workerId, restartCount: health.restartCount });
    }
  }

  /**
   * 选择恢复策略
   */
  private selectRecoveryStrategy(error: TestError): RecoveryStrategy {
    // 优先使用错误模式中的恢复策略
    const pattern = Array.from(this.errorPatterns.values())
      .find(p => p.pattern.test(error.message));
    
    if (pattern?.recovery) {
      return pattern.recovery;
    }

    // 使用默认策略
    const defaultStrategy = this.recoveryStrategies.get(error.type);
    if (defaultStrategy) {
      return defaultStrategy;
    }

    // 最后的默认策略
    return { type: 'skip', maxAttempts: 1, backoffMs: 0 };
  }

  /**
   * 执行恢复策略
   */
  private async executeRecoveryStrategy(
    error: TestError, 
    strategy: RecoveryStrategy
  ): Promise<ErrorHandlingResult> {
    switch (strategy.type) {
      case 'retry':
        return this.executeRetryStrategy(error, strategy);
      
      case 'restart':
        return this.executeRestartStrategy(error, strategy);
      
      case 'isolate':
        return this.executeIsolateStrategy(error, strategy);
      
      case 'skip':
        return this.executeSkipStrategy(error, strategy);
      
      default:
        return {
          action: 'skip',
          success: true,
          message: 'Unknown recovery strategy - skipping task'
        };
    }
  }

  /**
   * 执行重试策略
   */
  private async executeRetryStrategy(
    error: TestError, 
    strategy: RecoveryStrategy
  ): Promise<ErrorHandlingResult> {
    if (strategy.backoffMs > 0) {
      await this.delay(strategy.backoffMs);
    }

    return {
      action: 'retry',
      success: true,
      message: `Retrying after ${strategy.backoffMs}ms delay`,
      maxAttempts: strategy.maxAttempts
    };
  }

  /**
   * 执行重启策略
   */
  private async executeRestartStrategy(
    error: TestError, 
    strategy: RecoveryStrategy
  ): Promise<ErrorHandlingResult> {
    if (error.workerId !== undefined) {
      this.emit('worker:restart_requested', { 
        workerId: error.workerId, 
        reason: error.message 
      });
    }

    if (strategy.backoffMs > 0) {
      await this.delay(strategy.backoffMs);
    }

    return {
      action: 'restart',
      success: true,
      message: 'Worker restart requested',
      workerId: error.workerId
    };
  }

  /**
   * 执行隔离策略
   */
  private async executeIsolateStrategy(
    error: TestError, 
    strategy: RecoveryStrategy
  ): Promise<ErrorHandlingResult> {
    if (error.workerId !== undefined) {
      this.isolateWorker(error.workerId);
    }

    return {
      action: 'isolate',
      success: true,
      message: 'Worker isolated due to critical error',
      workerId: error.workerId
    };
  }

  /**
   * 执行跳过策略
   */
  private async executeSkipStrategy(
    error: TestError, 
    strategy: RecoveryStrategy
  ): Promise<ErrorHandlingResult> {
    return {
      action: 'skip',
      success: true,
      message: 'Test skipped due to error',
      testName: error.testName
    };
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 检查工作节点健康状态
   */
  isWorkerHealthy(workerId: number): boolean {
    const health = this.workerHealth.get(workerId);
    if (!health) return false;

    // 检查是否仍在隔离期
    if (health.isolatedUntil && Date.now() < health.isolatedUntil) {
      return false;
    }

    return health.isHealthy;
  }

  /**
   * 获取工作节点健康状态
   */
  getWorkerHealth(workerId: number): WorkerHealth | null {
    return this.workerHealth.get(workerId) || null;
  }

  /**
   * 获取所有工作节点健康状态
   */
  getAllWorkerHealth(): WorkerHealth[] {
    return Array.from(this.workerHealth.values());
  }

  /**
   * 获取错误统计
   */
  getErrorStatistics(): ErrorStatistics {
    const recentErrors = this.errorHistory.filter(e => 
      e.timestamp > Date.now() - this.policy.timeWindowMs
    );

    const errorsByType = new Map<string, number>();
    const errorsBySeverity = new Map<string, number>();
    const errorsByWorker = new Map<number, number>();

    recentErrors.forEach(error => {
      errorsByType.set(error.type, (errorsByType.get(error.type) || 0) + 1);
      errorsBySeverity.set(error.severity, (errorsBySeverity.get(error.severity) || 0) + 1);
      
      if (error.workerId !== undefined) {
        errorsByWorker.set(error.workerId, (errorsByWorker.get(error.workerId) || 0) + 1);
      }
    });

    return {
      totalErrors: recentErrors.length,
      errorsByType,
      errorsBySeverity,
      errorsByWorker,
      timeWindow: this.policy.timeWindowMs,
      healthyWorkers: Array.from(this.workerHealth.values()).filter(h => h.isHealthy).length,
      isolatedWorkers: Array.from(this.workerHealth.values()).filter(h => !h.isHealthy).length
    };
  }

  /**
   * 添加自定义错误模式
   */
  addErrorPattern(pattern: ErrorPattern): void {
    this.errorPatterns.set(pattern.id, pattern);
    this.emit('pattern:added', { patternId: pattern.id });
  }

  /**
   * 更新隔离策略
   */
  updatePolicy(policy: Partial<IsolationPolicy>): void {
    this.policy = { ...this.policy, ...policy };
    this.emit('policy:updated', { policy: this.policy });
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.errorHistory = [];
    this.workerHealth.clear();
    this.removeAllListeners();
  }
}

export interface ErrorHandlingResult {
  action: 'retry' | 'restart' | 'isolate' | 'skip';
  success: boolean;
  message: string;
  maxAttempts?: number;
  workerId?: number;
  testName?: string;
}

export interface ErrorStatistics {
  totalErrors: number;
  errorsByType: Map<string, number>;
  errorsBySeverity: Map<string, number>;
  errorsByWorker: Map<number, number>;
  timeWindow: number;
  healthyWorkers: number;
  isolatedWorkers: number;
}