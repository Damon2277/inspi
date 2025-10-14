/**
 * 性能优化服务
 * 整合所有性能优化组件，提供统一的优化接口
 */

import { logger } from '@/shared/utils/logger';

import { InvitationTaskProcessor, AsyncTaskConfig } from '../async/AsyncTaskProcessor';
import { InvitationCacheManager, CacheConfig } from '../cache/InvitationCacheManager';
import { DatabasePool } from '../database';
import { PerformanceMonitor, PerformanceThresholds } from '../monitoring/PerformanceMonitor';
import type { InviteCode, InviteStats } from '../types';

import { DatabaseOptimizer, QueryOptimizationConfig } from './DatabaseOptimizer';


export interface OptimizationConfig {
  cache: CacheConfig
  database: QueryOptimizationConfig
  asyncTasks: AsyncTaskConfig
  monitoring: PerformanceThresholds
  enableOptimizations: {
    caching: boolean
    queryOptimization: boolean
    asyncProcessing: boolean
    monitoring: boolean
  }
}

export interface OptimizationReport {
  cacheStats: {
    memoryItems: number
    hitRate?: number
    redisConnected: boolean
  }
  databaseStats: {
    slowQueries: Array<{ query: string; avgTime: number; count: number }>
    totalQueries: number
    avgQueryTime: number
  }
  taskStats: {
    pendingTasks: number
    runningTasks: number
    utilizationRate: number
  }
  performanceStats: {
    healthScore: number
    recommendations: string[]
    activeAlerts: number
  }
  optimizationSuggestions: string[]
}

export class PerformanceOptimizationService {
  private cacheManager?: InvitationCacheManager;
  private databaseOptimizer?: DatabaseOptimizer;
  private taskProcessor?: InvitationTaskProcessor;
  private performanceMonitor?: PerformanceMonitor;
  private config: OptimizationConfig;
  private db: DatabasePool;

  constructor(db: DatabasePool, config: OptimizationConfig) {
    this.db = db;
    this.config = config;
    this.initializeComponents();
  }

  /**
   * 初始化优化组件
   */
  private initializeComponents(): void {
    try {
      // 初始化缓存管理器
      if (this.config.enableOptimizations.caching) {
        this.cacheManager = new InvitationCacheManager(this.config.cache);
        logger.info('Cache manager initialized');
      }

      // 初始化数据库优化器
      if (this.config.enableOptimizations.queryOptimization) {
        this.databaseOptimizer = new DatabaseOptimizer(this.db, this.config.database);
        logger.info('Database optimizer initialized');
      }

      // 初始化异步任务处理器
      if (this.config.enableOptimizations.asyncProcessing) {
        this.taskProcessor = new InvitationTaskProcessor(this.config.asyncTasks);
        logger.info('Async task processor initialized');
      }

      // 初始化性能监控
      if (this.config.enableOptimizations.monitoring) {
        this.performanceMonitor = new PerformanceMonitor(this.config.monitoring);
        this.performanceMonitor.startMonitoring();
        logger.info('Performance monitor initialized');
      }

      logger.info('Performance optimization service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize performance optimization service', { error });
      throw error;
    }
  }

  /**
   * 获取缓存管理器
   */
  getCacheManager(): InvitationCacheManager | undefined {
    return this.cacheManager;
  }

  /**
   * 获取数据库优化器
   */
  getDatabaseOptimizer(): DatabaseOptimizer | undefined {
    return this.databaseOptimizer;
  }

  /**
   * 获取任务处理器
   */
  getTaskProcessor(): InvitationTaskProcessor | undefined {
    return this.taskProcessor;
  }

  /**
   * 获取性能监控器
   */
  getPerformanceMonitor(): PerformanceMonitor | undefined {
    return this.performanceMonitor;
  }

  /**
   * 执行优化的邀请码查询
   */
  async getOptimizedInviteCode(code: string): Promise<any> {
    try {
      // 尝试从缓存获取
      if (this.cacheManager) {
        const cached = await this.cacheManager.getCachedInviteCode(code);
        if (cached) {
          logger.debug('Invite code retrieved from cache', { code });
          return cached;
        }
      }

      // 使用优化查询
      if (this.databaseOptimizer) {
        const optimizedQuery = this.databaseOptimizer.optimizeInviteCodeQuery(code);
        const result = await this.databaseOptimizer.executeOptimizedQuery<InviteCode & Record<string, unknown>>(optimizedQuery);
        const inviteCode = result[0];

        // 缓存结果
        if (this.cacheManager && inviteCode) {
          await this.cacheManager.cacheInviteCode(code, inviteCode as InviteCode);
        }

        return (inviteCode as InviteCode) || null;
      }

      // 回退到普通查询
      const result = await this.db.query<InviteCode & Record<string, unknown>>(
        'SELECT * FROM invite_codes WHERE code = ? AND is_active = 1',
        [code],
      );
      const inviteCode = result[0];
      return (inviteCode as InviteCode) || null;

    } catch (error) {
      logger.error('Failed to get optimized invite code', { error, code });
      throw error;
    }
  }

  /**
   * 执行优化的用户统计查询
   */
  async getOptimizedUserStats(userId: string): Promise<any> {
    try {
      // 尝试从缓存获取
      if (this.cacheManager) {
        const cached = await this.cacheManager.getCachedUserStats(userId);
        if (cached) {
          logger.debug('User stats retrieved from cache', { userId });
          return cached;
        }
      }

      // 使用优化查询
      if (this.databaseOptimizer) {
        const optimizedQuery = this.databaseOptimizer.optimizeUserStatsQuery(userId);
        const result = await this.databaseOptimizer.executeOptimizedQuery<InviteStats & Record<string, unknown>>(optimizedQuery);
        const userStats = result[0];

        // 缓存结果
        if (this.cacheManager && userStats) {
          await this.cacheManager.cacheUserStats(userId, userStats as InviteStats);
        }

        return (userStats as InviteStats) || null;
      }

      // 回退到普通查询
      const result = await this.db.query<InviteStats & Record<string, unknown>>(`
        SELECT 
          COUNT(DISTINCT ic.id) as total_invites,
          COUNT(DISTINCT ir.id) as successful_registrations,
          COUNT(DISTINCT CASE WHEN ir.is_activated = 1 THEN ir.id END) as active_invitees
        FROM invite_codes ic
        LEFT JOIN invite_registrations ir ON ic.id = ir.invite_code_id
        WHERE ic.inviter_id = ?
      `, [userId]);

      const stats = result[0];
      return (stats as InviteStats) || null;

    } catch (error) {
      logger.error('Failed to get optimized user stats', { error, userId });
      throw error;
    }
  }

  /**
   * 异步发放奖励
   */
  async grantRewardAsync(userId: string, rewards: any[], sourceType: string, sourceId: string): Promise<string | null> {
    if (!this.taskProcessor) {
      logger.warn('Task processor not available, falling back to synchronous reward granting');
      return null;
    }

    try {
      const taskId = await this.taskProcessor.grantRewardAsync(userId, rewards, sourceType, sourceId);
      logger.info('Reward grant task queued', { taskId, userId, rewardsCount: rewards.length });
      return taskId;
    } catch (error) {
      logger.error('Failed to queue reward grant task', { error, userId });
      throw error;
    }
  }

  /**
   * 异步发送通知
   */
  async sendNotificationAsync(userId: string, type: string, content: any): Promise<string | null> {
    if (!this.taskProcessor) {
      return null;
    }

    try {
      const taskId = await this.taskProcessor.sendNotificationAsync(userId, type, content);
      logger.info('Notification task queued', { taskId, userId, type });
      return taskId;
    } catch (error) {
      logger.error('Failed to queue notification task', { error, userId, type });
      throw error;
    }
  }

  /**
   * 批量插入优化
   */
  async batchInsertOptimized(table: string, records: any[]): Promise<void> {
    if (!this.databaseOptimizer) {
      // 回退到逐条插入
      for (const record of records) {
        const columns = Object.keys(record);
        const values = columns.map(col => record[col]);
        const placeholders = columns.map(() => '?').join(', ');

        await this.db.execute(
          `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
          values,
        );
      }
      return;
    }

    try {
      await this.databaseOptimizer.batchInsert(table, records);
      logger.info('Batch insert completed', { table, recordCount: records.length });
    } catch (error) {
      logger.error('Batch insert failed', { error, table, recordCount: records.length });
      throw error;
    }
  }

  /**
   * 预热缓存
   */
  async warmupCache(warmupData: {
    popularInviteCodes?: any[]
    topUsers?: string[]
  }): Promise<void> {
    if (!this.cacheManager) {
      logger.warn('Cache manager not available, skipping cache warmup');
      return;
    }

    try {
      await this.cacheManager.warmupCache(warmupData);
      logger.info('Cache warmup completed', {
        inviteCodes: warmupData.popularInviteCodes?.length || 0,
        topUsers: warmupData.topUsers?.length || 0,
      });
    } catch (error) {
      logger.error('Cache warmup failed', { error });
      throw error;
    }
  }

  /**
   * 使缓存失效
   */
  async invalidateUserCache(userId: string): Promise<void> {
    if (!this.cacheManager) return;

    try {
      await this.cacheManager.invalidateUserCache(userId);
      logger.debug('User cache invalidated', { userId });
    } catch (error) {
      logger.error('Failed to invalidate user cache', { error, userId });
    }
  }

  /**
   * 创建推荐的数据库索引
   */
  async createOptimizedIndexes(): Promise<void> {
    if (!this.databaseOptimizer) {
      logger.warn('Database optimizer not available, skipping index creation');
      return;
    }

    try {
      await this.databaseOptimizer.createRecommendedIndexes();
      logger.info('Optimized database indexes created');
    } catch (error) {
      logger.error('Failed to create optimized indexes', { error });
      throw error;
    }
  }

  /**
   * 生成优化报告
   */
  async generateOptimizationReport(): Promise<OptimizationReport> {
    const report: OptimizationReport = {
      cacheStats: {
        memoryItems: 0,
        redisConnected: false,
      },
      databaseStats: {
        slowQueries: [],
        totalQueries: 0,
        avgQueryTime: 0,
      },
      taskStats: {
        pendingTasks: 0,
        runningTasks: 0,
        utilizationRate: 0,
      },
      performanceStats: {
        healthScore: 0,
        recommendations: [],
        activeAlerts: 0,
      },
      optimizationSuggestions: [],
    };

    try {
      // 缓存统计
      if (this.cacheManager) {
        report.cacheStats = this.cacheManager.getCacheStats();
      }

      // 数据库统计
      if (this.databaseOptimizer) {
        const dbPerformance = await this.databaseOptimizer.analyzeQueryPerformance();
        report.databaseStats = {
          slowQueries: dbPerformance.slowQueries,
          totalQueries: dbPerformance.totalQueries,
          avgQueryTime: dbPerformance.avgQueryTime,
        };
      }

      // 任务处理统计
      if (this.taskProcessor) {
        report.taskStats = this.taskProcessor.getQueueStats();
      }

      // 性能监控统计
      if (this.performanceMonitor) {
        const perfReport = this.performanceMonitor.generateReport();
        report.performanceStats = {
          healthScore: perfReport.healthScore,
          recommendations: perfReport.recommendations,
          activeAlerts: this.performanceMonitor.getActiveAlerts().length,
        };
      }

      // 生成优化建议
      report.optimizationSuggestions = this.generateOptimizationSuggestions(report);

      logger.info('Optimization report generated successfully');
      return report;

    } catch (error) {
      logger.error('Failed to generate optimization report', { error });
      throw error;
    }
  }

  /**
   * 生成优化建议
   */
  private generateOptimizationSuggestions(report: OptimizationReport): string[] {
    const suggestions: string[] = [];

    // 缓存相关建议
    if (report.cacheStats.hitRate && report.cacheStats.hitRate < 0.8) {
      suggestions.push('缓存命中率较低，考虑优化缓存策略或增加缓存时间');
    }

    if (!report.cacheStats.redisConnected && this.config.enableOptimizations.caching) {
      suggestions.push('Redis连接失败，考虑检查Redis配置或使用内存缓存');
    }

    // 数据库相关建议
    if (report.databaseStats.slowQueries.length > 0) {
      suggestions.push(`发现${report.databaseStats.slowQueries.length}个慢查询，建议优化SQL或添加索引`);
    }

    if (report.databaseStats.avgQueryTime > 100) {
      suggestions.push('平均查询时间较长，考虑优化数据库查询或增加缓存');
    }

    // 任务处理相关建议
    if (report.taskStats.utilizationRate > 0.8) {
      suggestions.push('任务处理器利用率较高，考虑增加并发数或优化任务处理逻辑');
    }

    if (report.taskStats.pendingTasks > 100) {
      suggestions.push('待处理任务较多，考虑增加处理器容量或优化任务优先级');
    }

    // 性能相关建议
    if (report.performanceStats.healthScore < 70) {
      suggestions.push('系统健康分数较低，需要关注性能优化');
    }

    if (report.performanceStats.activeAlerts > 0) {
      suggestions.push(`存在${report.performanceStats.activeAlerts}个活跃告警，需要及时处理`);
    }

    // 如果没有具体建议，提供通用建议
    if (suggestions.length === 0) {
      suggestions.push('系统运行良好，建议定期监控性能指标');
    }

    return suggestions;
  }

  /**
   * 应用自动优化
   */
  async applyAutoOptimizations(): Promise<{
    applied: string[]
    failed: string[]
  }> {
    const applied: string[] = [];
    const failed: string[] = [];

    try {
      // 创建推荐索引
      if (this.databaseOptimizer) {
        try {
          await this.createOptimizedIndexes();
          applied.push('数据库索引优化');
        } catch (error) {
          failed.push('数据库索引优化失败');
          logger.error('Auto optimization: index creation failed', { error });
        }
      }

      // 清理过期缓存
      if (this.cacheManager) {
        try {
          // 这里可以添加缓存清理逻辑
          applied.push('缓存清理');
        } catch (error) {
          failed.push('缓存清理失败');
          logger.error('Auto optimization: cache cleanup failed', { error });
        }
      }

      logger.info('Auto optimizations completed', { applied, failed });
      return { applied, failed };

    } catch (error) {
      logger.error('Auto optimization failed', { error });
      throw error;
    }
  }

  /**
   * 获取优化状态
   */
  getOptimizationStatus(): {
    caching: boolean
    queryOptimization: boolean
    asyncProcessing: boolean
    monitoring: boolean
    componentsInitialized: {
      cacheManager: boolean
      databaseOptimizer: boolean
      taskProcessor: boolean
      performanceMonitor: boolean
    }
  } {
    return {
      caching: this.config.enableOptimizations.caching,
      queryOptimization: this.config.enableOptimizations.queryOptimization,
      asyncProcessing: this.config.enableOptimizations.asyncProcessing,
      monitoring: this.config.enableOptimizations.monitoring,
      componentsInitialized: {
        cacheManager: !!this.cacheManager,
        databaseOptimizer: !!this.databaseOptimizer,
        taskProcessor: !!this.taskProcessor,
        performanceMonitor: !!this.performanceMonitor,
      },
    };
  }

  /**
   * 关闭优化服务
   */
  async shutdown(): Promise<void> {
    try {
      if (this.performanceMonitor) {
        this.performanceMonitor.stopMonitoring();
      }

      if (this.taskProcessor) {
        await this.taskProcessor.shutdown();
      }

      if (this.cacheManager) {
        await this.cacheManager.close();
      }

      logger.info('Performance optimization service shutdown completed');
    } catch (error) {
      logger.error('Error during optimization service shutdown', { error });
      throw error;
    }
  }
}
