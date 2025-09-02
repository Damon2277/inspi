/**
 * 数据预加载机制
 */
import { logger } from '@/lib/logging/logger';
import { CacheManager } from '@/lib/cache/manager';

/**
 * 预加载策略
 */
export enum PreloadStrategy {
  EAGER = 'eager',           // 立即预加载
  LAZY = 'lazy',            // 懒加载
  PREDICTIVE = 'predictive', // 预测性加载
  SCHEDULED = 'scheduled'    // 定时预加载
}

/**
 * 预加载配置
 */
export interface PreloadConfig {
  strategy: PreloadStrategy;
  priority: 'high' | 'medium' | 'low';
  cacheKey: string;
  ttl: number;
  dependencies?: string[];
  condition?: () => boolean | Promise<boolean>;
  batchSize?: number;
  maxRetries?: number;
}

/**
 * 预加载任务
 */
export interface PreloadTask {
  id: string;
  name: string;
  config: PreloadConfig;
  loader: () => Promise<any>;
  status: 'pending' | 'loading' | 'completed' | 'failed';
  lastExecuted?: Date;
  nextExecution?: Date;
  executionCount: number;
  errorCount: number;
  averageExecutionTime: number;
}

/**
 * 预加载结果
 */
export interface PreloadResult {
  taskId: string;
  success: boolean;
  data?: any;
  error?: Error;
  executionTime: number;
  cacheHit: boolean;
  timestamp: Date;
}

/**
 * 数据预加载管理器
 */
export class DataPreloader {
  private db: any;
  private cacheManager: CacheManager;
  private tasks = new Map<string, PreloadTask>();
  private executionQueue: string[] = [];
  private isProcessing = false;
  private maxConcurrentTasks = 3;
  private executionHistory: PreloadResult[] = [];

  constructor(database: any, cacheManager: CacheManager) {
    this.db = database;
    this.cacheManager = cacheManager;
  }

  /**
   * 注册预加载任务
   */
  registerTask(task: Omit<PreloadTask, 'status' | 'executionCount' | 'errorCount' | 'averageExecutionTime'>): void {
    const fullTask: PreloadTask = {
      ...task,
      status: 'pending',
      executionCount: 0,
      errorCount: 0,
      averageExecutionTime: 0
    };

    this.tasks.set(task.id, fullTask);
    logger.info('Preload task registered', { taskId: task.id, name: task.name });

    // 根据策略决定是否立即执行
    if (task.config.strategy === PreloadStrategy.EAGER) {
      this.scheduleTask(task.id);
    }
  }

  /**
   * 执行预加载任务
   */
  async executeTask(taskId: string): Promise<PreloadResult> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Preload task not found: ${taskId}`);
    }

    const startTime = Date.now();
    let result: PreloadResult;

    try {
      // 检查缓存
      const cached = await this.cacheManager.get(task.config.cacheKey);
      if (cached) {
        result = {
          taskId,
          success: true,
          data: cached,
          executionTime: Date.now() - startTime,
          cacheHit: true,
          timestamp: new Date()
        };
        
        logger.debug('Preload task cache hit', { taskId, cacheKey: task.config.cacheKey });
        return result;
      }

      // 检查执行条件
      if (task.config.condition) {
        const shouldExecute = await task.config.condition();
        if (!shouldExecute) {
          result = {
            taskId,
            success: false,
            error: new Error('Execution condition not met'),
            executionTime: Date.now() - startTime,
            cacheHit: false,
            timestamp: new Date()
          };
          return result;
        }
      }

      // 更新任务状态
      task.status = 'loading';
      task.lastExecuted = new Date();

      // 执行加载器
      const data = await task.loader();

      // 缓存结果
      await this.cacheManager.set(
        task.config.cacheKey,
        data,
        { ttl: task.config.ttl }
      );

      // 更新任务统计
      const executionTime = Date.now() - startTime;
      task.status = 'completed';
      task.executionCount++;
      task.averageExecutionTime = (
        (task.averageExecutionTime * (task.executionCount - 1) + executionTime) / 
        task.executionCount
      );

      result = {
        taskId,
        success: true,
        data,
        executionTime,
        cacheHit: false,
        timestamp: new Date()
      };

      logger.info('Preload task completed', {
        taskId,
        executionTime,
        dataSize: JSON.stringify(data).length
      });

    } catch (error) {
      const executionTime = Date.now() - startTime;
      task.status = 'failed';
      task.errorCount++;

      result = {
        taskId,
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        executionTime,
        cacheHit: false,
        timestamp: new Date()
      };

      logger.error('Preload task failed', error instanceof Error ? error : new Error(String(error)), {
        taskId,
        executionTime,
        errorCount: task.errorCount
      });
    }

    // 记录执行历史
    this.executionHistory.push(result);
    if (this.executionHistory.length > 1000) {
      this.executionHistory = this.executionHistory.slice(-500);
    }

    return result;
  }

  /**
   * 批量执行预加载任务
   */
  async executeBatch(taskIds: string[]): Promise<PreloadResult[]> {
    const results: PreloadResult[] = [];
    const batches = this.createBatches(taskIds, this.maxConcurrentTasks);

    for (const batch of batches) {
      const batchPromises = batch.map(taskId => this.executeTask(taskId));
      const batchResults = await Promise.allSettled(batchPromises);
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          logger.error('Batch execution failed', result.reason);
        }
      }
    }

    return results;
  }

  /**
   * 调度任务执行
   */
  scheduleTask(taskId: string, delay: number = 0): void {
    setTimeout(() => {
      if (!this.executionQueue.includes(taskId)) {
        this.executionQueue.push(taskId);
        this.processQueue();
      }
    }, delay);
  }

  /**
   * 处理执行队列
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.executionQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.executionQueue.length > 0) {
        const batch = this.executionQueue.splice(0, this.maxConcurrentTasks);
        await this.executeBatch(batch);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 预测性预加载
   */
  async predictivePreload(context: {
    userId?: string;
    currentPage?: string;
    userBehavior?: any;
    timeOfDay?: number;
  }): Promise<void> {
    const predictions = await this.generatePreloadPredictions(context);
    
    for (const prediction of predictions) {
      const task = this.tasks.get(prediction.taskId);
      if (task && task.config.strategy === PreloadStrategy.PREDICTIVE) {
        this.scheduleTask(prediction.taskId, prediction.delay);
      }
    }
  }

  /**
   * 生成预加载预测
   */
  private async generatePreloadPredictions(context: any): Promise<Array<{
    taskId: string;
    probability: number;
    delay: number;
  }>> {
    const predictions: Array<{ taskId: string; probability: number; delay: number }> = [];

    // 基于用户行为的预测逻辑
    if (context.currentPage === '/works') {
      // 在作品页面，预测用户可能查看作品详情
      predictions.push({
        taskId: 'popular-works',
        probability: 0.8,
        delay: 1000
      });
    }

    if (context.currentPage === '/profile') {
      // 在个人页面，预测用户可能查看贡献度排行
      predictions.push({
        taskId: 'user-contributions',
        probability: 0.7,
        delay: 2000
      });
    }

    // 基于时间的预测
    const hour = new Date().getHours();
    if (hour >= 9 && hour <= 17) {
      // 工作时间，预加载教育相关内容
      predictions.push({
        taskId: 'education-content',
        probability: 0.6,
        delay: 5000
      });
    }

    return predictions.filter(p => p.probability > 0.5);
  }

  /**
   * 定时预加载
   */
  startScheduledPreloading(): void {
    // 每小时执行一次定时预加载
    setInterval(async () => {
      const scheduledTasks = Array.from(this.tasks.values())
        .filter(task => task.config.strategy === PreloadStrategy.SCHEDULED)
        .map(task => task.id);

      if (scheduledTasks.length > 0) {
        logger.info('Starting scheduled preload', { taskCount: scheduledTasks.length });
        await this.executeBatch(scheduledTasks);
      }
    }, 60 * 60 * 1000); // 1小时
  }

  /**
   * 获取任务统计
   */
  getTaskStats(): Record<string, {
    executionCount: number;
    errorCount: number;
    successRate: number;
    averageExecutionTime: number;
    lastExecuted?: Date;
    status: string;
  }> {
    const stats: Record<string, any> = {};

    for (const [taskId, task] of this.tasks) {
      stats[taskId] = {
        executionCount: task.executionCount,
        errorCount: task.errorCount,
        successRate: task.executionCount > 0 
          ? ((task.executionCount - task.errorCount) / task.executionCount) * 100 
          : 0,
        averageExecutionTime: task.averageExecutionTime,
        lastExecuted: task.lastExecuted,
        status: task.status
      };
    }

    return stats;
  }

  /**
   * 清理过期缓存
   */
  async cleanupExpiredCache(): Promise<void> {
    const expiredKeys: string[] = [];

    for (const task of this.tasks.values()) {
      const cacheInfo = await this.cacheManager.getInfo(task.config.cacheKey);
      if (cacheInfo && cacheInfo.expired) {
        expiredKeys.push(task.config.cacheKey);
      }
    }

    if (expiredKeys.length > 0) {
      await Promise.all(expiredKeys.map(key => this.cacheManager.delete(key)));
      logger.info('Cleaned up expired cache', { count: expiredKeys.length });
    }
  }

  /**
   * 创建批次
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * 停止预加载器
   */
  stop(): void {
    this.executionQueue.length = 0;
    this.isProcessing = false;
    logger.info('Data preloader stopped');
  }
}

/**
 * 预定义的预加载任务
 */
export class PreloadTasks {
  private db: any;
  private preloader: DataPreloader;

  constructor(database: any, preloader: DataPreloader) {
    this.db = database;
    this.preloader = preloader;
    this.registerCommonTasks();
  }

  /**
   * 注册常用预加载任务
   */
  private registerCommonTasks(): void {
    // 热门作品预加载
    this.preloader.registerTask({
      id: 'popular-works',
      name: '热门作品预加载',
      config: {
        strategy: PreloadStrategy.SCHEDULED,
        priority: 'high',
        cacheKey: 'preload:popular-works',
        ttl: 30 * 60, // 30分钟
        batchSize: 20
      },
      loader: async () => {
        const works = await this.db.collection('works')
          .find({ 
            status: 'published', 
            visibility: 'public' 
          })
          .sort({ 'stats.views': -1, 'stats.likes': -1 })
          .limit(20)
          .toArray();
        return works;
      }
    });

    // 用户贡献度排行预加载
    this.preloader.registerTask({
      id: 'user-contributions',
      name: '用户贡献度排行预加载',
      config: {
        strategy: PreloadStrategy.SCHEDULED,
        priority: 'medium',
        cacheKey: 'preload:user-contributions',
        ttl: 60 * 60, // 1小时
        batchSize: 50
      },
      loader: async () => {
        const rankings = await this.db.collection('users')
          .find({ status: 'active' })
          .sort({ 'stats.contributionScore': -1 })
          .limit(50)
          .project({
            _id: 1,
            username: 1,
            avatar: 1,
            'stats.contributionScore': 1,
            'stats.worksCount': 1,
            'stats.reusedCount': 1
          })
          .toArray();
        return rankings;
      }
    });

    // 知识图谱模板预加载
    this.preloader.registerTask({
      id: 'knowledge-graph-templates',
      name: '知识图谱模板预加载',
      config: {
        strategy: PreloadStrategy.EAGER,
        priority: 'high',
        cacheKey: 'preload:kg-templates',
        ttl: 24 * 60 * 60, // 24小时
      },
      loader: async () => {
        const templates = await this.db.collection('knowledge_graphs')
          .find({ 'metadata.isPreset': true })
          .toArray();
        return templates;
      }
    });

    // 最新作品预加载
    this.preloader.registerTask({
      id: 'recent-works',
      name: '最新作品预加载',
      config: {
        strategy: PreloadStrategy.PREDICTIVE,
        priority: 'medium',
        cacheKey: 'preload:recent-works',
        ttl: 15 * 60, // 15分钟
        condition: async () => {
          const hour = new Date().getHours();
          return hour >= 8 && hour <= 22; // 只在活跃时间预加载
        }
      },
      loader: async () => {
        const works = await this.db.collection('works')
          .find({ 
            status: 'published', 
            visibility: 'public' 
          })
          .sort({ createdAt: -1 })
          .limit(15)
          .toArray();
        return works;
      }
    });

    // 学科分类统计预加载
    this.preloader.registerTask({
      id: 'subject-stats',
      name: '学科分类统计预加载',
      config: {
        strategy: PreloadStrategy.SCHEDULED,
        priority: 'low',
        cacheKey: 'preload:subject-stats',
        ttl: 2 * 60 * 60, // 2小时
      },
      loader: async () => {
        const stats = await this.db.collection('works').aggregate([
          { $match: { status: 'published', visibility: 'public' } },
          { $group: { 
            _id: '$subject', 
            count: { $sum: 1 },
            totalViews: { $sum: '$stats.views' },
            totalLikes: { $sum: '$stats.likes' }
          }},
          { $sort: { count: -1 } }
        ]).toArray();
        return stats;
      }
    });
  }

  /**
   * 启动所有预加载任务
   */
  startAll(): void {
    this.preloader.startScheduledPreloading();
    logger.info('All preload tasks started');
  }
}

export default DataPreloader;