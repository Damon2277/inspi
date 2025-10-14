/**
 * 异步任务处理器
 * 处理邀请系统的后台异步任务，提升响应性能
 */

import { EventEmitter } from 'events';

import { logger } from '@/shared/utils/logger';

export interface AsyncTask {
  id: string
  type: string
  payload: any
  priority: number
  retries: number
  maxRetries: number
  createdAt: Date
  scheduledAt?: Date
  timeout?: number
}

export interface TaskResult {
  success: boolean
  result?: any
  error?: Error
  duration: number
}

export interface TaskProcessor {
  type: string
  handler: (payload: any) => Promise<any>
  concurrency?: number
  timeout?: number
}

export interface AsyncTaskConfig {
  maxConcurrency: number
  defaultTimeout: number
  retryDelay: number
  maxRetries: number
  enablePersistence: boolean
  persistenceInterval: number
}

export class AsyncTaskProcessor extends EventEmitter {
  private config: AsyncTaskConfig;
  private taskQueue: AsyncTask[] = [];
  private runningTasks: Map<string, AsyncTask> = new Map();
  private processors: Map<string, TaskProcessor> = new Map();
  private isProcessing = false;
  private persistenceTimer?: NodeJS.Timeout;

  constructor(config: AsyncTaskConfig) {
    super();
    this.config = config;
    this.setupPersistence();
  }

  /**
   * 设置持久化
   */
  private setupPersistence(): void {
    if (this.config.enablePersistence) {
      this.persistenceTimer = setInterval(() => {
        this.persistTasks();
      }, this.config.persistenceInterval);
    }
  }

  /**
   * 持久化任务到存储
   */
  private async persistTasks(): Promise<void> {
    try {
      // 这里应该将任务持久化到数据库或Redis
      // 为了演示，我们只记录日志
      const pendingTasks = this.taskQueue.length;
      const runningTasks = this.runningTasks.size;

      if (pendingTasks > 0 || runningTasks > 0) {
        logger.debug('Task persistence checkpoint', {
          pendingTasks,
          runningTasks,
          totalProcessors: this.processors.size,
        });
      }
    } catch (error) {
      logger.error('Failed to persist tasks', { error });
    }
  }

  /**
   * 注册任务处理器
   */
  registerProcessor(processor: TaskProcessor): void {
    this.processors.set(processor.type, processor);
    logger.info('Task processor registered', {
      type: processor.type,
      concurrency: processor.concurrency || 1,
      timeout: processor.timeout || this.config.defaultTimeout,
    });
  }

  /**
   * 添加任务到队列
   */
  async addTask(
    type: string,
    payload: any,
    options: {
      priority?: number
      scheduledAt?: Date
      timeout?: number
      maxRetries?: number
    } = {},
  ): Promise<string> {
    const task: AsyncTask = {
      id: this.generateTaskId(),
      type,
      payload,
      priority: options.priority || 0,
      retries: 0,
      maxRetries: options.maxRetries || this.config.maxRetries,
      createdAt: new Date(),
      scheduledAt: options.scheduledAt,
      timeout: options.timeout,
    };

    // 按优先级插入队列
    this.insertTaskByPriority(task);

    logger.debug('Task added to queue', {
      taskId: task.id,
      type: task.type,
      priority: task.priority,
      queueSize: this.taskQueue.length,
    });

    this.emit('taskAdded', task);

    // 启动处理器
    if (!this.isProcessing) {
      this.startProcessing();
    }
    return task.id;
  }

  /**
   * 按优先级插入任务
   */
  private insertTaskByPriority(task: AsyncTask): void {
    let insertIndex = this.taskQueue.length;

    for (let i = 0; i < this.taskQueue.length; i++) {
      if (this.taskQueue[i].priority < task.priority) {
        insertIndex = i;
        break;
      }
    }

    this.taskQueue.splice(insertIndex, 0, task);
  }

  /**
   * 生成任务ID
   */
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 启动任务处理
   */
  private async startProcessing(): Promise<void> {
    if (this.isProcessing) return;

    this.isProcessing = true;
    logger.info('Task processing started');

    while (this.taskQueue.length > 0 || this.runningTasks.size > 0) {
      // 处理可执行的任务
      await this.processAvailableTasks();

      // 等待一段时间再检查
      await this.sleep(100);
    }

    this.isProcessing = false;
    logger.info('Task processing stopped');
  }

  /**
   * 处理可用任务
   */
  private async processAvailableTasks(): Promise<void> {
    const now = new Date();
    const availableSlots = this.config.maxConcurrency - this.runningTasks.size;

    if (availableSlots <= 0) return;

    // 找到可执行的任务
    const executableTasks = this.taskQueue
      .filter(task => !task.scheduledAt || task.scheduledAt <= now)
      .filter(task => this.processors.has(task.type))
      .slice(0, availableSlots);

    // 移除已选择的任务
    executableTasks.forEach(task => {
      const index = this.taskQueue.indexOf(task);
      if (index !== -1) {
        this.taskQueue.splice(index, 1);
      }
    });

    // 执行任务
    const executionPromises = executableTasks.map(task => this.executeTask(task));
    await Promise.all(executionPromises);
  }

  /**
   * 执行单个任务
   */
  private async executeTask(task: AsyncTask): Promise<void> {
    const processor = this.processors.get(task.type);
    if (!processor) {
      logger.error('No processor found for task type', { taskId: task.id, type: task.type });
      return;
    }

    this.runningTasks.set(task.id, task);
    const startTime = Date.now();

    try {
      logger.debug('Task execution started', { taskId: task.id, type: task.type });

      // 设置超时
      const timeout = task.timeout || processor.timeout || this.config.defaultTimeout;
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Task timeout')), timeout),
      );

      // 执行任务
      const result = await Promise.race([
        processor.handler(task.payload),
        timeoutPromise,
      ]);

      const duration = Date.now() - startTime;
      const taskResult: TaskResult = {
        success: true,
        result,
        duration,
      };

      logger.info('Task completed successfully', {
        taskId: task.id,
        type: task.type,
        duration,
        retries: task.retries,
      });

      this.emit('taskCompleted', task, taskResult);

    } catch (error) {
      const duration = Date.now() - startTime;
      const taskResult: TaskResult = {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        duration,
      };

      logger.error('Task execution failed', {
        taskId: task.id,
        type: task.type,
        duration,
        retries: task.retries,
        error: taskResult.error?.message,
      });

      // 处理重试
      await this.handleTaskFailure(task, taskResult.error!);

      this.emit('taskFailed', task, taskResult);

    } finally {
      this.runningTasks.delete(task.id);
    }
  }

  /**
   * 处理任务失败
   */
  private async handleTaskFailure(task: AsyncTask, error: Error): Promise<void> {
    task.retries++;

    if (task.retries < task.maxRetries) {
      // 重新加入队列，延迟执行
      const delay = this.calculateRetryDelay(task.retries);
      task.scheduledAt = new Date(Date.now() + delay);

      this.insertTaskByPriority(task);

      logger.info('Task scheduled for retry', {
        taskId: task.id,
        retries: task.retries,
        maxRetries: task.maxRetries,
        delay,
      });
    } else {
      logger.error('Task failed permanently', {
        taskId: task.id,
        type: task.type,
        retries: task.retries,
        error: error.message,
      });

      this.emit('taskFailedPermanently', task, error);
    }
  }

  /**
   * 计算重试延迟（指数退避）
   */
  private calculateRetryDelay(retryCount: number): number {
    return this.config.retryDelay * Math.pow(2, retryCount - 1);
  }

  /**
   * 睡眠函数
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取任务状态
   */
  getTaskStatus(taskId: string): {
    status: 'pending' | 'running' | 'completed' | 'failed' | 'not_found'
    task?: AsyncTask
  } {
    // 检查运行中的任务
    const runningTask = this.runningTasks.get(taskId);
    if (runningTask) {
      return { status: 'running', task: runningTask };
    }

    // 检查队列中的任务
    const pendingTask = (this.taskQueue as any).find(task => task.id === taskId);
    if (pendingTask) {
      return { status: 'pending', task: pendingTask };
    }
    return { status: 'not_found' };
  }

  /**
   * 取消任务
   */
  cancelTask(taskId: string): boolean {
    // 从队列中移除
    const queueIndex = this.taskQueue.findIndex(task => task.id === taskId);
    if (queueIndex !== -1) {
      const task = this.taskQueue.splice(queueIndex, 1)[0];
      logger.info('Task cancelled from queue', { taskId });
      this.emit('taskCancelled', task);
      return true;
    }

    // 运行中的任务无法取消（可以考虑添加取消信号）
    if (this.runningTasks.has(taskId)) {
      logger.warn('Cannot cancel running task', { taskId });
      return false;
    }
    return false;
  }

  /**
   * 获取队列统计
   */
  getQueueStats(): {
    pendingTasks: number
    runningTasks: number
    registeredProcessors: number
    totalCapacity: number
    utilizationRate: number
  } {
    const runningTasks = this.runningTasks.size;
    const utilizationRate = runningTasks / this.config.maxConcurrency;

    return {
      pendingTasks: this.taskQueue.length,
      runningTasks,
      registeredProcessors: this.processors.size,
      totalCapacity: this.config.maxConcurrency,
      utilizationRate,
    };
  }

  /**
   * 清空队列
   */
  clearQueue(): void {
    const clearedCount = this.taskQueue.length;
    this.taskQueue = [];

    logger.info('Task queue cleared', { clearedCount });
    this.emit('queueCleared', clearedCount);
  }

  /**
   * 暂停处理
   */
  pause(): void {
    this.isProcessing = false;
    logger.info('Task processing paused');
    this.emit('processingPaused');
  }

  /**
   * 恢复处理
   */
  resume(): void {
    if (!this.isProcessing && (this.taskQueue.length > 0 || this.runningTasks.size > 0)) {
      this.startProcessing();
      logger.info('Task processing resumed');
      this.emit('processingResumed');
    }
  }

  /**
   * 关闭处理器
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down task processor');

    // 停止接受新任务
    this.isProcessing = false;

    // 等待运行中的任务完成
    while (this.runningTasks.size > 0) {
      logger.info('Waiting for running tasks to complete', { runningTasks: this.runningTasks.size });
      await this.sleep(1000);
    }

    // 清理定时器
    if (this.persistenceTimer) {
      clearInterval(this.persistenceTimer);
    }

    // 最后一次持久化
    if (this.config.enablePersistence) {
      await this.persistTasks();
    }

    logger.info('Task processor shutdown completed');
    this.emit('shutdown');
  }
}

/**
 * 邀请系统专用任务处理器
 */
export class InvitationTaskProcessor extends AsyncTaskProcessor {
  constructor(config: AsyncTaskConfig) {
    super(config);
    this.registerInvitationProcessors();
  }

  /**
   * 注册邀请系统相关的任务处理器
   */
  private registerInvitationProcessors(): void {
    // 奖励发放任务
    this.registerProcessor({
      type: 'grant_reward',
      handler: async (payload: { userId: string; rewards: any[]; sourceType: string; sourceId: string }) => {
        // 这里应该调用实际的奖励发放服务
        logger.info('Processing reward grant task', { userId: payload.userId, rewardsCount: payload.rewards.length });

        // 模拟异步奖励发放
        await this.sleep(Math.random() * 1000 + 500); // 0.5-1.5秒

        return { success: true, grantedRewards: payload.rewards.length };
      },
      concurrency: 5,
      timeout: 10000,
    });

    // 通知发送任务
    this.registerProcessor({
      type: 'send_notification',
      handler: async (payload: { userId: string; type: string; content: any }) => {
        logger.info('Processing notification task', { userId: payload.userId, type: payload.type });

        // 模拟异步通知发送
        await this.sleep(Math.random() * 500 + 200); // 0.2-0.7秒

        return { success: true, notificationId: `notif_${Date.now()}` };
      },
      concurrency: 10,
      timeout: 5000,
    });

    // 统计数据更新任务
    this.registerProcessor({
      type: 'update_statistics',
      handler: async (payload: { userId: string; eventType: string; data: any }) => {
        logger.info('Processing statistics update task', { userId: payload.userId, eventType: payload.eventType });

        // 模拟异步统计更新
        await this.sleep(Math.random() * 800 + 300); // 0.3-1.1秒

        return { success: true, updatedFields: Object.keys(payload.data) };
      },
      concurrency: 3,
      timeout: 15000,
    });

    // 防作弊分析任务
    this.registerProcessor({
      type: 'fraud_analysis',
      handler: async (payload: { userId: string; activityData: any }) => {
        logger.info('Processing fraud analysis task', { userId: payload.userId });

        // 模拟异步防作弊分析
        await this.sleep(Math.random() * 2000 + 1000); // 1-3秒

        return {
          success: true,
          riskScore: Math.random() * 100,
          flags: Math.random() > 0.8 ? ['suspicious_pattern'] : [],
        };
      },
      concurrency: 2,
      timeout: 30000,
    });

    // 邮件发送任务
    this.registerProcessor({
      type: 'send_email',
      handler: async (payload: { to: string; subject: string; content: string; template?: string }) => {
        logger.info('Processing email task', { to: payload.to, subject: payload.subject });

        // 模拟异步邮件发送
        await this.sleep(Math.random() * 1500 + 500); // 0.5-2秒

        return { success: true, messageId: `email_${Date.now()}` };
      },
      concurrency: 8,
      timeout: 10000,
    });

    // 数据导出任务
    this.registerProcessor({
      type: 'export_data',
      handler: async (payload: { userId: string; exportType: string; filters: any }) => {
        logger.info('Processing data export task', { userId: payload.userId, exportType: payload.exportType });

        // 模拟异步数据导出
        await this.sleep(Math.random() * 5000 + 2000); // 2-7秒

        return {
          success: true,
          exportUrl: `https://example.com/exports/export_${Date.now()}.csv`,
          recordCount: Math.floor(Math.random() * 1000) + 100,
        };
      },
      concurrency: 1,
      timeout: 60000,
    });

    logger.info('Invitation task processors registered');
  }

  /**
   * 异步发放奖励
   */
  async grantRewardAsync(userId: string, rewards: any[], sourceType: string, sourceId: string): Promise<string> {
    return await this.addTask('grant_reward', {
      userId,
      rewards,
      sourceType,
      sourceId,
    }, { priority: 8 }); // 高优先级
  }

  /**
   * 异步发送通知
   */
  async sendNotificationAsync(userId: string, type: string, content: any): Promise<string> {
    return await this.addTask('send_notification', {
      userId,
      type,
      content,
    }, { priority: 6 });
  }

  /**
   * 异步更新统计
   */
  async updateStatisticsAsync(userId: string, eventType: string, data: any): Promise<string> {
    return await this.addTask('update_statistics', {
      userId,
      eventType,
      data,
    }, { priority: 4 });
  }

  /**
   * 异步防作弊分析
   */
  async analyzeFraudAsync(userId: string, activityData: any): Promise<string> {
    return await this.addTask('fraud_analysis', {
      userId,
      activityData,
    }, { priority: 7 });
  }

  /**
   * 异步发送邮件
   */
  async sendEmailAsync(to: string, subject: string, content: string, template?: string): Promise<string> {
    return await this.addTask('send_email', {
      to,
      subject,
      content,
      template,
    }, { priority: 5 });
  }

  /**
   * 异步数据导出
   */
  async exportDataAsync(userId: string, exportType: string, filters: any): Promise<string> {
    return await this.addTask('export_data', {
      userId,
      exportType,
      filters,
    }, { priority: 2 });
  }
}
