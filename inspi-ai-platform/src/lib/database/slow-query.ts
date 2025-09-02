/**
 * 慢查询检测和告警系统
 */
import { logger } from '@/lib/logging/logger';
import { CacheManager } from '@/lib/cache/manager';

/**
 * 慢查询记录
 */
export interface SlowQueryRecord {
  id: string;
  collection: string;
  operation: 'find' | 'aggregate' | 'update' | 'delete' | 'insert';
  query: any;
  executionTime: number;
  documentsExamined: number;
  documentsReturned: number;
  indexesUsed: string[];
  timestamp: Date;
  stackTrace?: string;
  userContext?: {
    userId?: string;
    sessionId?: string;
    userAgent?: string;
    ip?: string;
  };
  performance: {
    cpuTime?: number;
    memoryUsage?: number;
    diskIO?: number;
  };
}

/**
 * 慢查询统计
 */
export interface SlowQueryStats {
  totalCount: number;
  averageExecutionTime: number;
  maxExecutionTime: number;
  minExecutionTime: number;
  collectionStats: Record<string, {
    count: number;
    averageTime: number;
    maxTime: number;
  }>;
  operationStats: Record<string, {
    count: number;
    averageTime: number;
  }>;
  timeDistribution: {
    '100-500ms': number;
    '500ms-1s': number;
    '1s-5s': number;
    '5s+': number;
  };
  topSlowQueries: SlowQueryRecord[];
}

/**
 * 告警配置
 */
export interface AlertConfig {
  enabled: boolean;
  thresholds: {
    executionTime: number;
    frequency: number; // 单位时间内慢查询次数
    timeWindow: number; // 时间窗口（秒）
  };
  notifications: {
    email?: {
      enabled: boolean;
      recipients: string[];
      template: string;
    };
    webhook?: {
      enabled: boolean;
      url: string;
      headers?: Record<string, string>;
    };
    slack?: {
      enabled: boolean;
      webhookUrl: string;
      channel: string;
    };
  };
  cooldown: number; // 告警冷却时间（秒）
}

/**
 * 查询分析结果
 */
export interface QueryAnalysis {
  queryId: string;
  isSlow: boolean;
  executionTime: number;
  efficiency: number; // 0-100
  recommendations: string[];
  indexSuggestions: Array<{
    collection: string;
    fields: Record<string, 1 | -1>;
    reason: string;
    estimatedImprovement: string;
  }>;
  optimizedQuery?: any;
}

/**
 * 慢查询检测器
 */
export class SlowQueryDetector {
  private cacheManager: CacheManager;
  private slowQueries: SlowQueryRecord[] = [];
  private alertConfig: AlertConfig;
  private lastAlertTime = new Map<string, number>();
  private maxRecords = 10000;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(cacheManager: CacheManager, alertConfig?: Partial<AlertConfig>) {
    this.cacheManager = cacheManager;
    this.alertConfig = {
      enabled: true,
      thresholds: {
        executionTime: 1000, // 1秒
        frequency: 10, // 10次
        timeWindow: 300 // 5分钟
      },
      notifications: {
        email: { enabled: false, recipients: [], template: 'slow-query-alert' }
      },
      cooldown: 300, // 5分钟
      ...alertConfig
    };

    this.startCleanupTask();
  }

  /**
   * 记录慢查询
   */
  async recordSlowQuery(record: Omit<SlowQueryRecord, 'id' | 'timestamp'>): Promise<void> {
    const slowQuery: SlowQueryRecord = {
      ...record,
      id: this.generateQueryId(),
      timestamp: new Date()
    };

    // 添加到内存记录
    this.slowQueries.push(slowQuery);
    
    // 限制内存中的记录数量
    if (this.slowQueries.length > this.maxRecords) {
      this.slowQueries = this.slowQueries.slice(-Math.floor(this.maxRecords * 0.8));
    }

    // 持久化到缓存
    await this.persistSlowQuery(slowQuery);

    // 记录日志
    logger.warn('Slow query detected', {
      queryId: slowQuery.id,
      collection: slowQuery.collection,
      operation: slowQuery.operation,
      executionTime: slowQuery.executionTime,
      documentsExamined: slowQuery.documentsExamined,
      documentsReturned: slowQuery.documentsReturned,
      indexesUsed: slowQuery.indexesUsed
    });

    // 检查是否需要告警
    await this.checkAndTriggerAlert(slowQuery);
  }

  /**
   * 分析查询性能
   */
  async analyzeQuery(
    collection: string,
    operation: string,
    query: any,
    executionStats: any
  ): Promise<QueryAnalysis> {
    const queryId = this.generateQueryId();
    const executionTime = executionStats.executionTimeMillis || 0;
    const documentsExamined = executionStats.totalDocsExamined || 0;
    const documentsReturned = executionStats.totalDocsReturned || 0;

    // 计算查询效率
    const efficiency = documentsExamined > 0 
      ? Math.min(100, (documentsReturned / documentsExamined) * 100)
      : 100;

    // 判断是否为慢查询
    const isSlow = executionTime > this.alertConfig.thresholds.executionTime;

    // 生成优化建议
    const recommendations = this.generateRecommendations(
      collection,
      query,
      executionStats,
      efficiency
    );

    // 生成索引建议
    const indexSuggestions = this.generateIndexSuggestions(
      collection,
      query,
      executionStats
    );

    // 生成优化后的查询
    const optimizedQuery = this.optimizeQuery(query, executionStats);

    return {
      queryId,
      isSlow,
      executionTime,
      efficiency,
      recommendations,
      indexSuggestions,
      optimizedQuery
    };
  }

  /**
   * 获取慢查询统计
   */
  getSlowQueryStats(timeRange?: { start: Date; end: Date }): SlowQueryStats {
    let queries = this.slowQueries;
    
    if (timeRange) {
      queries = queries.filter(q => 
        q.timestamp >= timeRange.start && q.timestamp <= timeRange.end
      );
    }

    if (queries.length === 0) {
      return {
        totalCount: 0,
        averageExecutionTime: 0,
        maxExecutionTime: 0,
        minExecutionTime: 0,
        collectionStats: {},
        operationStats: {},
        timeDistribution: {
          '100-500ms': 0,
          '500ms-1s': 0,
          '1s-5s': 0,
          '5s+': 0
        },
        topSlowQueries: []
      };
    }

    const executionTimes = queries.map(q => q.executionTime);
    const totalCount = queries.length;
    const averageExecutionTime = executionTimes.reduce((a, b) => a + b, 0) / totalCount;
    const maxExecutionTime = Math.max(...executionTimes);
    const minExecutionTime = Math.min(...executionTimes);

    // 按集合统计
    const collectionStats: Record<string, any> = {};
    queries.forEach(q => {
      if (!collectionStats[q.collection]) {
        collectionStats[q.collection] = {
          count: 0,
          totalTime: 0,
          maxTime: 0
        };
      }
      const stats = collectionStats[q.collection];
      stats.count++;
      stats.totalTime += q.executionTime;
      stats.maxTime = Math.max(stats.maxTime, q.executionTime);
    });

    // 计算平均时间
    Object.values(collectionStats).forEach((stats: any) => {
      stats.averageTime = stats.totalTime / stats.count;
      delete stats.totalTime;
    });

    // 按操作类型统计
    const operationStats: Record<string, any> = {};
    queries.forEach(q => {
      if (!operationStats[q.operation]) {
        operationStats[q.operation] = {
          count: 0,
          totalTime: 0
        };
      }
      const stats = operationStats[q.operation];
      stats.count++;
      stats.totalTime += q.executionTime;
    });

    Object.values(operationStats).forEach((stats: any) => {
      stats.averageTime = stats.totalTime / stats.count;
      delete stats.totalTime;
    });

    // 时间分布统计
    const timeDistribution = {
      '100-500ms': 0,
      '500ms-1s': 0,
      '1s-5s': 0,
      '5s+': 0
    };

    queries.forEach(q => {
      const time = q.executionTime;
      if (time < 500) {
        timeDistribution['100-500ms']++;
      } else if (time < 1000) {
        timeDistribution['500ms-1s']++;
      } else if (time < 5000) {
        timeDistribution['1s-5s']++;
      } else {
        timeDistribution['5s+']++;
      }
    });

    // 最慢查询Top 10
    const topSlowQueries = queries
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, 10);

    return {
      totalCount,
      averageExecutionTime: Math.round(averageExecutionTime * 100) / 100,
      maxExecutionTime,
      minExecutionTime,
      collectionStats,
      operationStats,
      timeDistribution,
      topSlowQueries
    };
  }

  /**
   * 获取查询优化建议
   */
  getOptimizationSuggestions(): Array<{
    type: 'index' | 'query' | 'schema' | 'hardware';
    priority: 'high' | 'medium' | 'low';
    description: string;
    impact: string;
    implementation: string;
    affectedQueries: number;
  }> {
    const suggestions: any[] = [];
    const stats = this.getSlowQueryStats();

    // 基于集合统计的建议
    Object.entries(stats.collectionStats).forEach(([collection, collStats]: [string, any]) => {
      if (collStats.averageTime > 2000) {
        suggestions.push({
          type: 'index',
          priority: 'high',
          description: `${collection}集合查询性能严重不佳`,
          impact: `影响${collStats.count}个查询，平均执行时间${Math.round(collStats.averageTime)}ms`,
          implementation: `分析${collection}集合的查询模式，创建复合索引`,
          affectedQueries: collStats.count
        });
      }
    });

    // 基于操作类型的建议
    if (stats.operationStats.find && stats.operationStats.find.averageTime > 1000) {
      suggestions.push({
        type: 'index',
        priority: 'high',
        description: '查找操作性能不佳，可能缺少索引',
        impact: `影响${stats.operationStats.find.count}个查询`,
        implementation: '分析查询条件，创建相应索引',
        affectedQueries: stats.operationStats.find.count
      });
    }

    if (stats.operationStats.aggregate && stats.operationStats.aggregate.averageTime > 2000) {
      suggestions.push({
        type: 'query',
        priority: 'medium',
        description: '聚合查询性能不佳',
        impact: `影响${stats.operationStats.aggregate.count}个聚合查询`,
        implementation: '优化聚合管道，将$match阶段前移',
        affectedQueries: stats.operationStats.aggregate.count
      });
    }

    // 基于时间分布的建议
    const slowQueryRatio = (stats.timeDistribution['1s-5s'] + stats.timeDistribution['5s+']) / stats.totalCount;
    if (slowQueryRatio > 0.2) {
      suggestions.push({
        type: 'hardware',
        priority: 'medium',
        description: '大量查询执行时间过长，可能需要硬件升级',
        impact: `${Math.round(slowQueryRatio * 100)}%的查询执行时间超过1秒`,
        implementation: '考虑增加内存、使用SSD存储或数据库分片',
        affectedQueries: stats.timeDistribution['1s-5s'] + stats.timeDistribution['5s+']
      });
    }

    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * 清理过期记录
   */
  async cleanup(): Promise<void> {
    const cutoffTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7天前
    
    // 清理内存记录
    const beforeCount = this.slowQueries.length;
    this.slowQueries = this.slowQueries.filter(q => q.timestamp > cutoffTime);
    const afterCount = this.slowQueries.length;

    // 清理缓存记录
    await this.cleanupCachedRecords(cutoffTime);

    logger.info('Slow query records cleaned up', {
      removedCount: beforeCount - afterCount,
      remainingCount: afterCount
    });
  }

  /**
   * 生成优化建议
   */
  private generateRecommendations(
    collection: string,
    query: any,
    executionStats: any,
    efficiency: number
  ): string[] {
    const recommendations: string[] = [];

    // 效率建议
    if (efficiency < 10) {
      recommendations.push('查询效率极低，扫描了大量不必要的文档，建议优化查询条件或添加索引');
    } else if (efficiency < 50) {
      recommendations.push('查询效率较低，建议检查索引使用情况');
    }

    // 索引建议
    if (!executionStats.indexesUsed || executionStats.indexesUsed.length === 0) {
      recommendations.push('查询未使用任何索引，建议为查询字段创建索引');
    }

    // 扫描文档数量建议
    if (executionStats.totalDocsExamined > 10000) {
      recommendations.push('查询扫描了大量文档，考虑添加更精确的查询条件');
    }

    // 返回文档数量建议
    if (executionStats.totalDocsReturned > 1000) {
      recommendations.push('查询返回了大量文档，建议使用分页或限制返回数量');
    }

    // 查询模式建议
    if (this.hasRegexQuery(query)) {
      recommendations.push('查询包含正则表达式，考虑使用文本索引或优化正则表达式模式');
    }

    if (this.hasComplexQuery(query)) {
      recommendations.push('查询条件复杂，考虑简化查询逻辑或分解为多个简单查询');
    }

    return recommendations;
  }

  /**
   * 生成索引建议
   */
  private generateIndexSuggestions(
    collection: string,
    query: any,
    executionStats: any
  ): Array<{
    collection: string;
    fields: Record<string, 1 | -1>;
    reason: string;
    estimatedImprovement: string;
  }> {
    const suggestions: any[] = [];

    // 分析查询字段
    const queryFields = this.extractQueryFields(query);
    
    if (queryFields.length > 0) {
      // 单字段索引建议
      queryFields.forEach(field => {
        if (!this.hasIndexForField(executionStats, field)) {
          suggestions.push({
            collection,
            fields: { [field]: 1 },
            reason: `查询字段${field}缺少索引`,
            estimatedImprovement: '50-80%性能提升'
          });
        }
      });

      // 复合索引建议
      if (queryFields.length > 1) {
        const compoundIndex: Record<string, 1 | -1> = {};
        queryFields.forEach(field => {
          compoundIndex[field] = 1;
        });

        suggestions.push({
          collection,
          fields: compoundIndex,
          reason: '多字段查询建议使用复合索引',
          estimatedImprovement: '60-90%性能提升'
        });
      }
    }

    return suggestions;
  }

  /**
   * 优化查询
   */
  private optimizeQuery(query: any, executionStats: any): any {
    const optimized = { ...query };

    // 优化正则表达式查询
    Object.keys(optimized).forEach(key => {
      const value = optimized[key];
      if (value && typeof value === 'object' && value.$regex) {
        if (typeof value.$regex === 'string' && !value.$regex.startsWith('^')) {
          // 建议使用前缀匹配
          logger.debug('Consider using prefix regex for better performance', { field: key });
        }
      }
    });

    // 优化范围查询
    Object.keys(optimized).forEach(key => {
      const value = optimized[key];
      if (value && typeof value === 'object') {
        const hasRange = '$gt' in value || '$gte' in value || '$lt' in value || '$lte' in value;
        if (hasRange) {
          logger.debug('Range query detected, ensure index exists', { field: key });
        }
      }
    });

    return optimized;
  }

  /**
   * 检查并触发告警
   */
  private async checkAndTriggerAlert(slowQuery: SlowQueryRecord): Promise<void> {
    if (!this.alertConfig.enabled) {
      return;
    }

    const now = Date.now();
    const alertKey = `${slowQuery.collection}-${slowQuery.operation}`;

    // 检查冷却时间
    const lastAlert = this.lastAlertTime.get(alertKey);
    if (lastAlert && (now - lastAlert) < this.alertConfig.cooldown * 1000) {
      return;
    }

    // 检查频率阈值
    const recentQueries = this.getRecentSlowQueries(
      slowQuery.collection,
      slowQuery.operation,
      this.alertConfig.thresholds.timeWindow
    );

    if (recentQueries.length >= this.alertConfig.thresholds.frequency) {
      await this.triggerAlert(slowQuery, recentQueries);
      this.lastAlertTime.set(alertKey, now);
    }
  }

  /**
   * 触发告警
   */
  private async triggerAlert(
    slowQuery: SlowQueryRecord,
    recentQueries: SlowQueryRecord[]
  ): Promise<void> {
    const alertData = {
      type: 'slow-query-alert',
      severity: 'warning',
      timestamp: new Date(),
      details: {
        collection: slowQuery.collection,
        operation: slowQuery.operation,
        executionTime: slowQuery.executionTime,
        recentCount: recentQueries.length,
        averageTime: recentQueries.reduce((sum, q) => sum + q.executionTime, 0) / recentQueries.length
      }
    };

    logger.warn('Slow query alert triggered', alertData);

    // 发送通知
    const notifications = this.alertConfig.notifications;

    if (notifications.webhook?.enabled) {
      await this.sendWebhookAlert(notifications.webhook, alertData);
    }

    if (notifications.slack?.enabled) {
      await this.sendSlackAlert(notifications.slack, alertData);
    }

    if (notifications.email?.enabled) {
      await this.sendEmailAlert(notifications.email, alertData);
    }
  }

  /**
   * 发送Webhook告警
   */
  private async sendWebhookAlert(config: any, alertData: any): Promise<void> {
    try {
      const response = await fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...config.headers
        },
        body: JSON.stringify(alertData)
      });

      if (!response.ok) {
        throw new Error(`Webhook alert failed: ${response.status}`);
      }

      logger.info('Webhook alert sent successfully');
    } catch (error) {
      logger.error('Failed to send webhook alert', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 发送Slack告警
   */
  private async sendSlackAlert(config: any, alertData: any): Promise<void> {
    try {
      const message = {
        channel: config.channel,
        text: `🐌 慢查询告警`,
        attachments: [{
          color: 'warning',
          fields: [
            { title: '集合', value: alertData.details.collection, short: true },
            { title: '操作', value: alertData.details.operation, short: true },
            { title: '执行时间', value: `${alertData.details.executionTime}ms`, short: true },
            { title: '最近频次', value: `${alertData.details.recentCount}次`, short: true }
          ]
        }]
      };

      const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });

      if (!response.ok) {
        throw new Error(`Slack alert failed: ${response.status}`);
      }

      logger.info('Slack alert sent successfully');
    } catch (error) {
      logger.error('Failed to send Slack alert', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 发送邮件告警
   */
  private async sendEmailAlert(config: any, alertData: any): Promise<void> {
    // 这里应该集成邮件服务
    logger.info('Email alert would be sent', { recipients: config.recipients, alertData });
  }

  /**
   * 获取最近的慢查询
   */
  private getRecentSlowQueries(
    collection: string,
    operation: string,
    timeWindowSeconds: number
  ): SlowQueryRecord[] {
    const cutoffTime = new Date(Date.now() - timeWindowSeconds * 1000);
    
    return this.slowQueries.filter(q => 
      q.collection === collection &&
      q.operation === operation &&
      q.timestamp > cutoffTime
    );
  }

  /**
   * 持久化慢查询记录
   */
  private async persistSlowQuery(record: SlowQueryRecord): Promise<void> {
    try {
      const key = `slow-query:${record.id}`;
      await this.cacheManager.set(key, record, { ttl: 7 * 24 * 60 * 60 }); // 7天
    } catch (error) {
      logger.error('Failed to persist slow query record', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 清理缓存记录
   */
  private async cleanupCachedRecords(cutoffTime: Date): Promise<void> {
    // 这里应该实现缓存清理逻辑
    // 由于Redis没有直接的批量删除过期键的方法，这里只是记录日志
    logger.debug('Cached slow query records cleanup requested', { cutoffTime });
  }

  /**
   * 启动清理任务
   */
  private startCleanupTask(): void {
    // 每天清理一次过期记录
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * 停止检测器
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    logger.info('Slow query detector stopped');
  }

  /**
   * 工具方法
   */
  private generateQueryId(): string {
    return `sq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private hasRegexQuery(query: any): boolean {
    const checkObject = (obj: any): boolean => {
      for (const value of Object.values(obj)) {
        if (value && typeof value === 'object') {
          if ('$regex' in value) return true;
          if (checkObject(value)) return true;
        }
      }
      return false;
    };
    return checkObject(query);
  }

  private hasComplexQuery(query: any): boolean {
    const complexity = this.calculateQueryComplexity(query);
    return complexity > 0.5;
  }

  private calculateQueryComplexity(query: any): number {
    let complexity = 0;
    const traverse = (obj: any, depth: number = 0): void => {
      if (depth > 3) {
        complexity += 0.2;
        return;
      }
      for (const [key, value] of Object.entries(obj)) {
        if (key.startsWith('$')) complexity += 0.1;
        if (typeof value === 'object' && value !== null) {
          traverse(value, depth + 1);
        }
      }
    };
    traverse(query);
    return Math.min(complexity, 1);
  }

  private extractQueryFields(query: any): string[] {
    const fields: string[] = [];
    const traverse = (obj: any, prefix: string = ''): void => {
      for (const [key, value] of Object.entries(obj)) {
        if (!key.startsWith('$')) {
          const fieldName = prefix ? `${prefix}.${key}` : key;
          fields.push(fieldName);
        }
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          traverse(value, prefix);
        }
      }
    };
    traverse(query);
    return [...new Set(fields)];
  }

  private hasIndexForField(executionStats: any, field: string): boolean {
    const indexesUsed = executionStats.indexesUsed || [];
    return indexesUsed.some((index: string) => 
      index.includes(field) || index === `${field}_1` || index === `${field}_-1`
    );
  }
}

export default SlowQueryDetector;