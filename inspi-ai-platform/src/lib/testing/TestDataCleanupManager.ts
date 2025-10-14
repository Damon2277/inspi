import { ObjectId } from 'mongoose';

import { TestDataCollection } from './TestDataRelationshipManager';

/**
 * 测试数据清理管理器
 * 负责测试数据的生命周期管理、清理策略和资源回收
 */

// 清理策略枚举
export enum CleanupStrategy {
  IMMEDIATE = 'immediate',           // 立即清理
  AFTER_TEST = 'after_test',        // 测试后清理
  AFTER_SUITE = 'after_suite',      // 测试套件后清理
  MANUAL = 'manual',                // 手动清理
  TTL = 'ttl',                      // 基于TTL的清理
}

// 清理范围枚举
export enum CleanupScope {
  ALL = 'all',                      // 清理所有数据
  USERS = 'users',                  // 只清理用户数据
  WORKS = 'works',                  // 只清理作品数据
  GRAPHS = 'graphs',                // 只清理图谱数据
  RELATIONSHIPS = 'relationships',   // 只清理关系数据
  ORPHANED = 'orphaned',            // 只清理孤立数据
}

// 清理配置接口
export interface CleanupConfig {
  strategy: CleanupStrategy;
  scope: CleanupScope;
  ttl?: number;                     // TTL时间（毫秒）
  batchSize?: number;               // 批量清理大小
  preservePatterns?: string[];      // 保留模式（正则表达式）
  onCleanup?: (stats: CleanupStats) => void; // 清理回调
}

// 清理统计信息
export interface CleanupStats {
  usersDeleted: number;
  worksDeleted: number;
  graphsDeleted: number;
  relationshipsDeleted: number;
  totalDeleted: number;
  duration: number;
  errors: string[];
}

// 数据项元信息
export interface DataItemMetadata {
  id: string;
  type: 'user' | 'work' | 'graph' | 'relationship';
  createdAt: Date;
  lastAccessedAt: Date;
  tags: string[];
  preserveUntil?: Date;
}

// 清理任务接口
export interface CleanupTask {
  id: string;
  config: CleanupConfig;
  scheduledAt: Date;
  executedAt?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
  stats?: CleanupStats;
  error?: string;
}

// 数据生命周期管理器
class DataLifecycleManager {
  private metadata: Map<string, DataItemMetadata> = new Map();
  private accessLog: Map<string, Date> = new Map();

  // 注册数据项
  registerDataItem(
    id: string,
    type: DataItemMetadata['type'],
    tags: string[] = [],
  ): void {
    const now = new Date();
    this.metadata.set(id, {
      id,
      type,
      createdAt: now,
      lastAccessedAt: now,
      tags,
    });
  }

  // 记录访问
  recordAccess(id: string): void {
    const now = new Date();
    this.accessLog.set(id, now);

    const metadata = this.metadata.get(id);
    if (metadata) {
      metadata.lastAccessedAt = now;
    }
  }

  // 设置保留期限
  setPreserveUntil(id: string, until: Date): void {
    const metadata = this.metadata.get(id);
    if (metadata) {
      metadata.preserveUntil = until;
    }
  }

  // 检查是否过期
  isExpired(id: string, ttl: number): boolean {
    const metadata = this.metadata.get(id);
    if (!metadata) return false;

    // 检查保留期限
    if (metadata.preserveUntil && new Date() < metadata.preserveUntil) {
      return false;
    }

    const now = Date.now();
    const lastAccessed = metadata.lastAccessedAt.getTime();
    return (now - lastAccessed) > ttl;
  }

  // 获取过期项
  getExpiredItems(ttl: number): DataItemMetadata[] {
    return Array.from(this.metadata.values()).filter(item =>
      this.isExpired(item.id, ttl),
    );
  }

  // 获取按类型分组的项
  getItemsByType(type: DataItemMetadata['type']): DataItemMetadata[] {
    return Array.from(this.metadata.values()).filter(item => item.type === type);
  }

  // 获取按标签分组的项
  getItemsByTag(tag: string): DataItemMetadata[] {
    return Array.from(this.metadata.values()).filter(item =>
      item.tags.includes(tag),
    );
  }

  // 删除元数据
  removeMetadata(id: string): void {
    this.metadata.delete(id);
    this.accessLog.delete(id);
  }

  // 清空所有元数据
  clear(): void {
    this.metadata.clear();
    this.accessLog.clear();
  }

  // 获取统计信息
  getStats(): {
    totalItems: number;
    byType: Record<string, number>;
    oldestItem: Date | null;
    newestItem: Date | null;
  } {
    const items = Array.from(this.metadata.values());
    const byType: Record<string, number> = {};

    items.forEach(item => {
      byType[item.type] = (byType[item.type] || 0) + 1;
    });

    const dates = items.map(item => item.createdAt);
    const oldestItem = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : null;
    const newestItem = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : null;

    return {
      totalItems: items.length,
      byType,
      oldestItem,
      newestItem,
    };
  }
}

// 清理执行器
class CleanupExecutor {
  private collection: TestDataCollection;
  private lifecycleManager: DataLifecycleManager;

  constructor(collection: TestDataCollection, lifecycleManager: DataLifecycleManager) {
    this.collection = collection;
    this.lifecycleManager = lifecycleManager;
  }

  // 执行清理
  async execute(config: CleanupConfig): Promise<CleanupStats> {
    const startTime = Date.now();
    const stats: CleanupStats = {
      usersDeleted: 0,
      worksDeleted: 0,
      graphsDeleted: 0,
      relationshipsDeleted: 0,
      totalDeleted: 0,
      duration: 0,
      errors: [],
    };

    try {
      switch (config.scope) {
        case CleanupScope.ALL:
          await this.cleanupAll(config, stats);
          break;
        case CleanupScope.USERS:
          await this.cleanupUsers(config, stats);
          break;
        case CleanupScope.WORKS:
          await this.cleanupWorks(config, stats);
          break;
        case CleanupScope.GRAPHS:
          await this.cleanupGraphs(config, stats);
          break;
        case CleanupScope.RELATIONSHIPS:
          await this.cleanupRelationships(config, stats);
          break;
        case CleanupScope.ORPHANED:
          await this.cleanupOrphaned(config, stats);
          break;
      }

      stats.totalDeleted = stats.usersDeleted + stats.worksDeleted +
                          stats.graphsDeleted + stats.relationshipsDeleted;
    } catch (error) {
      stats.errors.push(`Cleanup execution failed: ${error.message}`);
    }

    stats.duration = Date.now() - startTime;
    return stats;
  }

  // 清理所有数据
  private async cleanupAll(config: CleanupConfig, stats: CleanupStats): Promise<void> {
    await this.cleanupUsers(config, stats);
    await this.cleanupWorks(config, stats);
    await this.cleanupGraphs(config, stats);
    await this.cleanupRelationships(config, stats);
  }

  // 清理用户数据
  private async cleanupUsers(config: CleanupConfig, stats: CleanupStats): Promise<void> {
    const users = this.collection.getAllUsers();
    const toDelete = this.filterItemsForCleanup(users, config, 'user');

    for (const user of toDelete) {
      try {
        // 清理相关的作品和图谱
        const userWorks = this.collection.getAllWorks().filter(w =>
          w.author.toString() === user._id.toString(),
        );
        const userGraphs = this.collection.getAllGraphs().filter(g =>
          g.userId.toString() === user._id.toString(),
        );

        // 删除用户数据
        this.lifecycleManager.removeMetadata(user._id.toString());
        stats.usersDeleted++;

        // 级联删除相关数据
        stats.worksDeleted += userWorks.length;
        stats.graphsDeleted += userGraphs.length;

        userWorks.forEach(work => {
          this.lifecycleManager.removeMetadata(work._id.toString());
        });
        userGraphs.forEach(graph => {
          this.lifecycleManager.removeMetadata(graph._id.toString());
        });
      } catch (error) {
        stats.errors.push(`Failed to delete user ${user._id}: ${error.message}`);
      }
    }
  }

  // 清理作品数据
  private async cleanupWorks(config: CleanupConfig, stats: CleanupStats): Promise<void> {
    const works = this.collection.getAllWorks();
    const toDelete = this.filterItemsForCleanup(works, config, 'work');

    for (const work of toDelete) {
      try {
        this.lifecycleManager.removeMetadata(work._id.toString());
        stats.worksDeleted++;
      } catch (error) {
        stats.errors.push(`Failed to delete work ${work._id}: ${error.message}`);
      }
    }
  }

  // 清理图谱数据
  private async cleanupGraphs(config: CleanupConfig, stats: CleanupStats): Promise<void> {
    const graphs = this.collection.getAllGraphs();
    const toDelete = this.filterItemsForCleanup(graphs, config, 'graph');

    for (const graph of toDelete) {
      try {
        this.lifecycleManager.removeMetadata(graph._id.toString());
        stats.graphsDeleted++;
      } catch (error) {
        stats.errors.push(`Failed to delete graph ${graph._id}: ${error.message}`);
      }
    }
  }

  // 清理关系数据
  private async cleanupRelationships(config: CleanupConfig, stats: CleanupStats): Promise<void> {
    const relationships = this.collection.getRelationships();
    const toDelete = this.filterItemsForCleanup(relationships, config, 'relationship');

    stats.relationshipsDeleted = toDelete.length;
  }

  // 清理孤立数据
  private async cleanupOrphaned(config: CleanupConfig, stats: CleanupStats): Promise<void> {
    // 查找孤立的作品（作者不存在）
    const orphanedWorks = this.collection.getAllWorks().filter(work => {
      return !this.collection.getUser(work.author);
    });

    // 查找孤立的图谱（用户不存在）
    const orphanedGraphs = this.collection.getAllGraphs().filter(graph => {
      return !this.collection.getUser(graph.userId);
    });

    // 查找孤立的关系（源或目标不存在）
    const orphanedRelationships = this.collection.getRelationships().filter(rel => {
      const sourceExists = this.dataItemExists(rel.source);
      const targetExists = this.dataItemExists(rel.target);
      return !sourceExists || !targetExists;
    });

    // 删除孤立数据
    orphanedWorks.forEach(work => {
      this.lifecycleManager.removeMetadata(work._id.toString());
    });
    orphanedGraphs.forEach(graph => {
      this.lifecycleManager.removeMetadata(graph._id.toString());
    });

    stats.worksDeleted = orphanedWorks.length;
    stats.graphsDeleted = orphanedGraphs.length;
    stats.relationshipsDeleted = orphanedRelationships.length;
  }

  // 检查数据项是否存在
  private dataItemExists(ref: { type: string; id: string | ObjectId }): boolean {
    const id = ref.id.toString();
    switch (ref.type) {
      case 'user':
        return !!this.collection.getUser(id);
      case 'work':
        return !!this.collection.getWork(id);
      case 'graph':
        return !!this.collection.getGraph(id);
      default:
        return false;
    }
  }

  // 过滤需要清理的项目
  private filterItemsForCleanup<T extends { _id?: ObjectId; id?: string }>(
    items: T[],
    config: CleanupConfig,
    type: DataItemMetadata['type'],
  ): T[] {
    return items.filter(item => {
      const id = (item._id || item.id)?.toString();
      if (!id) return false;

      // 检查保留模式
      if (config.preservePatterns) {
        const shouldPreserve = config.preservePatterns.some(pattern => {
          const regex = new RegExp(pattern);
          return regex.test(id) || regex.test(JSON.stringify(item));
        });
        if (shouldPreserve) return false;
      }

      // 检查TTL
      if (config.strategy === CleanupStrategy.TTL && config.ttl) {
        return this.lifecycleManager.isExpired(id, config.ttl);
      }

      return true;
    });
  }
}

// 主清理管理器类
export class TestDataCleanupManager {
  private collection: TestDataCollection;
  private lifecycleManager = new DataLifecycleManager();
  private executor: CleanupExecutor;
  private tasks: Map<string, CleanupTask> = new Map();
  private taskIdCounter = 0;
  private defaultConfig: CleanupConfig = {
    strategy: CleanupStrategy.AFTER_TEST,
    scope: CleanupScope.ALL,
    batchSize: 100,
  };

  constructor(collection: TestDataCollection) {
    this.collection = collection;
    this.executor = new CleanupExecutor(collection, this.lifecycleManager);
  }

  // 设置默认配置
  setDefaultConfig(config: Partial<CleanupConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...config };
  }

  // 注册数据项
  registerDataItem(
    id: string,
    type: DataItemMetadata['type'],
    tags: string[] = [],
  ): void {
    this.lifecycleManager.registerDataItem(id, type, tags);
  }

  // 记录数据访问
  recordAccess(id: string): void {
    this.lifecycleManager.recordAccess(id);
  }

  // 设置数据保留期限
  preserveUntil(id: string, until: Date): void {
    this.lifecycleManager.setPreserveUntil(id, until);
  }

  // 立即清理
  async cleanupNow(config?: Partial<CleanupConfig>): Promise<CleanupStats> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const stats = await this.executor.execute(finalConfig);

    if (finalConfig.onCleanup) {
      finalConfig.onCleanup(stats);
    }

    return stats;
  }

  // 调度清理任务
  scheduleCleanup(config?: Partial<CleanupConfig>, delay: number = 0): string {
    const taskId = `task_${++this.taskIdCounter}`;
    const finalConfig = { ...this.defaultConfig, ...config };

    const task: CleanupTask = {
      id: taskId,
      config: finalConfig,
      scheduledAt: new Date(Date.now() + delay),
      status: 'pending',
    };

    this.tasks.set(taskId, task);

    // 如果没有延迟，立即执行
    if (delay === 0) {
      this.executeTask(taskId);
    } else {
      setTimeout(() => this.executeTask(taskId), delay);
    }

    return taskId;
  }

  // 执行清理任务
  private async executeTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'pending') return;

    task.status = 'running';
    task.executedAt = new Date();

    try {
      const stats = await this.executor.execute(task.config);
      task.stats = stats;
      task.status = 'completed';

      if (task.config.onCleanup) {
        task.config.onCleanup(stats);
      }
    } catch (error) {
      task.status = 'failed';
      task.error = error.message;
    }
  }

  // 取消清理任务
  cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'pending') return false;

    this.tasks.delete(taskId);
    return true;
  }

  // 获取任务状态
  getTaskStatus(taskId: string): CleanupTask | undefined {
    return this.tasks.get(taskId);
  }

  // 获取所有任务
  getAllTasks(): CleanupTask[] {
    return Array.from(this.tasks.values());
  }

  // 清理过期数据
  async cleanupExpired(ttl: number = 24 * 60 * 60 * 1000): Promise<CleanupStats> {
    return this.cleanupNow({
      strategy: CleanupStrategy.TTL,
      ttl,
    });
  }

  // 清理孤立数据
  async cleanupOrphaned(): Promise<CleanupStats> {
    return this.cleanupNow({
      scope: CleanupScope.ORPHANED,
    });
  }

  // 批量清理
  async batchCleanup(
    configs: Partial<CleanupConfig>[],
    concurrent: boolean = false,
  ): Promise<CleanupStats[]> {
    if (concurrent) {
      const promises = configs.map(config => this.cleanupNow(config));
      return Promise.all(promises);
    } else {
      const results: CleanupStats[] = [];
      for (const config of configs) {
        const stats = await this.cleanupNow(config);
        results.push(stats);
      }
      return results;
    }
  }

  // 获取清理建议
  getCleanupRecommendations(): {
    expiredItems: number;
    orphanedItems: number;
    totalSize: number;
    recommendations: string[];
  } {
    const stats = this.lifecycleManager.getStats();
    const expiredItems = this.lifecycleManager.getExpiredItems(24 * 60 * 60 * 1000);
    const recommendations: string[] = [];

    if (expiredItems.length > 0) {
      recommendations.push(`Found ${expiredItems.length} expired items that can be cleaned up`);
    }

    if (stats.totalItems > 1000) {
      recommendations.push('Large number of test data items detected, consider regular cleanup');
    }

    const oldestDate = stats.oldestItem;
    if (oldestDate && (Date.now() - oldestDate.getTime()) > 7 * 24 * 60 * 60 * 1000) {
      recommendations.push('Some test data is older than 7 days, consider cleanup');
    }

    return {
      expiredItems: expiredItems.length,
      orphanedItems: 0, // TODO: 实现孤立项检测
      totalSize: stats.totalItems,
      recommendations,
    };
  }

  // 获取统计信息
  getStats(): {
    lifecycle: ReturnType<DataLifecycleManager['getStats']>;
    tasks: {
      total: number;
      pending: number;
      running: number;
      completed: number;
      failed: number;
    };
  } {
    const tasks = Array.from(this.tasks.values());
    const taskStats = {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      running: tasks.filter(t => t.status === 'running').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
    };

    return {
      lifecycle: this.lifecycleManager.getStats(),
      tasks: taskStats,
    };
  }

  // 重置管理器
  reset(): void {
    this.lifecycleManager.clear();
    this.tasks.clear();
    this.taskIdCounter = 0;
  }

  // 设置测试钩子
  setupTestHooks(): {
    beforeEach: () => void;
    afterEach: () => Promise<void>;
    afterAll: () => Promise<void>;
  } {
    return {
      beforeEach: () => {
        // 记录测试开始时间，用于TTL计算
      },
      afterEach: async () => {
        if (this.defaultConfig.strategy === CleanupStrategy.AFTER_TEST) {
          await this.cleanupNow();
        }
      },
      afterAll: async () => {
        if (this.defaultConfig.strategy === CleanupStrategy.AFTER_SUITE) {
          await this.cleanupNow();
        }
      },
    };
  }
}

// 默认导出
export const createTestDataCleanupManager = (collection: TestDataCollection) =>
  new TestDataCleanupManager(collection);
