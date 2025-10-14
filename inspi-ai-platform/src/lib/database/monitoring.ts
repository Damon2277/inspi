/**
 * 数据库性能监控
 */
import { EventEmitter } from 'events';

import { logger } from '@/lib/logging/logger';

/**
 * 数据库性能指标
 */
export interface DatabaseMetrics {
  connections: {
    active: number;
    available: number;
    total: number;
    created: number;
    destroyed: number;
  };
  operations: {
    queries: number;
    inserts: number;
    updates: number;
    deletes: number;
    commands: number;
  };
  performance: {
    avgQueryTime: number;
    slowQueries: number;
    failedQueries: number;
    cacheHitRatio: number;
  };
  resources: {
    memoryUsage: number;
    diskUsage: number;
    cpuUsage: number;
    networkIO: number;
  };
  collections: CollectionMetrics[];
  timestamp: Date;
}

/**
 * 集合性能指标
 */
export interface CollectionMetrics {
  name: string;
  documentCount: number;
  dataSize: number;
  indexSize: number;
  avgDocumentSize: number;
  operations: {
    reads: number;
    writes: number;
    updates: number;
    deletes: number;
  };
  performance: {
    avgReadTime: number;
    avgWriteTime: number;
    slowOperations: number;
  };
}

/**
 * 慢查询记录
 */
export interface SlowQueryRecord {
  id: string;
  collection: string;
  operation: string;
  query: any;
  executionTime: number;
  documentsExamined: number;
  documentsReturned: number;
  indexUsed: boolean;
  timestamp: Date;
  stackTrace?: string;
}

/**
 * 数据库告警配置
 */
export interface AlertConfig {
  slowQueryThreshold: number; // ms
  connectionThreshold: number; // percentage
  memoryThreshold: number; // percentage
  diskThreshold: number; // percentage
  errorRateThreshold: number; // percentage
  enabled: boolean;
}

/**
 * 默认告警配置
 */
export const DEFAULT_ALERT_CONFIG: AlertConfig = {
  slowQueryThreshold: 1000,
  connectionThreshold: 80,
  memoryThreshold: 85,
  diskThreshold: 90,
  errorRateThreshold: 5,
  enabled: true,
};

/**
 * 数据库监控器
 */
export class DatabaseMonitor extends EventEmitter {
  private db: any;
  private config: AlertConfig;
  private metrics: DatabaseMetrics[] = [];
  private slowQueries: SlowQueryRecord[] = [];
  private maxHistorySize = 1000;
  private maxSlowQuerySize = 500;
  private monitoringInterval?: NodeJS.Timeout;
  private isMonitoring = false;

  constructor(database: any, config: AlertConfig = DEFAULT_ALERT_CONFIG) {
    super();
    this.db = database;
    this.config = config;
  }

  /**
   * 开始监控
   */
  startMonitoring(intervalMs: number = 60000): void {
    if (this.isMonitoring) {
      logger.warn('Database monitoring is already running');
      return;
    }

    this.isMonitoring = true;
    logger.info('Starting database monitoring', { intervalMs });

    // 立即收集一次指标
    this.collectMetrics();

    // 设置定期收集
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, intervalMs);

    this.emit('monitoringStarted');
  }

  /**
   * 停止监控
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    logger.info('Database monitoring stopped');
    this.emit('monitoringStopped');
  }

  /**
   * 收集数据库指标
   */
  private async collectMetrics(): Promise<void> {
    try {
      const metrics = await this.gatherDatabaseMetrics();
      this.recordMetrics(metrics);
      this.checkAlerts(metrics);
      this.emit('metricsCollected', metrics);
    } catch (error) {
      logger.error('Failed to collect database metrics', error instanceof Error ? error : new Error(String(error)));
      this.emit('metricsError', error);
    }
  }

  /**
   * 收集数据库指标数据
   */
  private async gatherDatabaseMetrics(): Promise<DatabaseMetrics> {
    // 获取服务器状态
    const serverStatus = await this.db.admin().serverStatus();

    // 获取数据库统计
    const dbStats = await this.db.stats();

    // 获取集合指标
    const collections = await this.gatherCollectionMetrics();

    const metrics: DatabaseMetrics = {
      connections: {
        active: serverStatus.connections?.current || 0,
        available: serverStatus.connections?.available || 0,
        total: serverStatus.connections?.totalCreated || 0,
        created: serverStatus.connections?.totalCreated || 0,
        destroyed: 0, // 需要计算
      },
      operations: {
        queries: serverStatus.opcounters?.query || 0,
        inserts: serverStatus.opcounters?.insert || 0,
        updates: serverStatus.opcounters?.update || 0,
        deletes: serverStatus.opcounters?.delete || 0,
        commands: serverStatus.opcounters?.command || 0,
      },
      performance: {
        avgQueryTime: 0, // 需要从慢查询日志计算
        slowQueries: this.slowQueries.length,
        failedQueries: 0, // 需要从错误日志获取
        cacheHitRatio: this.calculateCacheHitRatio(serverStatus),
      },
      resources: {
        memoryUsage: serverStatus.mem?.resident || 0,
        diskUsage: dbStats.dataSize || 0,
        cpuUsage: 0, // 需要从系统指标获取
        networkIO: serverStatus.network?.bytesIn + serverStatus.network?.bytesOut || 0,
      },
      collections,
      timestamp: new Date(),
    };

    return metrics;
  }

  /**
   * 收集集合指标
   */
  private async gatherCollectionMetrics(): Promise<CollectionMetrics[]> {
    const collections: CollectionMetrics[] = [];

    try {
      const collectionNames = await this.db.listCollections().toArray();

      for (const collInfo of collectionNames) {
        const collName = collInfo.name;

        try {
          const collection = this.db.collection(collName);
          const stats = await collection.stats();

          const metrics: CollectionMetrics = {
            name: collName,
            documentCount: stats.count || 0,
            dataSize: stats.size || 0,
            indexSize: stats.totalIndexSize || 0,
            avgDocumentSize: stats.avgObjSize || 0,
            operations: {
              reads: 0, // 需要从操作日志获取
              writes: 0,
              updates: 0,
              deletes: 0,
            },
            performance: {
              avgReadTime: 0, // 需要从性能日志计算
              avgWriteTime: 0,
              slowOperations: 0,
            },
          };

          collections.push(metrics);
        } catch (error) {
          logger.warn(`Failed to get stats for collection: ${collName}`, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    } catch (error) {
      logger.error('Failed to gather collection metrics', error instanceof Error ? error : new Error(String(error)));
    }

    return collections;
  }

  /**
   * 计算缓存命中率
   */
  private calculateCacheHitRatio(serverStatus: any): number {
    const wiredTiger = serverStatus.wiredTiger;
    if (!wiredTiger || !wiredTiger.cache) {
      return 0;
    }

    const cache = wiredTiger.cache;
    const hits = cache['pages read into cache'] || 0;
    const misses = cache['pages requested from the cache'] || 0;
    const total = hits + misses;

    return total > 0 ? (hits / total) * 100 : 0;
  }

  /**
   * 记录指标
   */
  private recordMetrics(metrics: DatabaseMetrics): void {
    this.metrics.push(metrics);

    // 限制历史记录大小
    if (this.metrics.length > this.maxHistorySize) {
      this.metrics.shift();
    }
  }

  /**
   * 检查告警
   */
  private checkAlerts(metrics: DatabaseMetrics): void {
    if (!this.config.enabled) {
      return;
    }

    const alerts: string[] = [];

    // 检查连接数
    const connectionUsage = (metrics.connections.active / metrics.connections.available) * 100;
    if (connectionUsage > this.config.connectionThreshold) {
      alerts.push(`数据库连接使用率过高: ${connectionUsage.toFixed(1)}%`);
    }

    // 检查内存使用
    if (metrics.resources.memoryUsage > this.config.memoryThreshold) {
      alerts.push(`数据库内存使用率过高: ${metrics.resources.memoryUsage}MB`);
    }

    // 检查慢查询
    if (metrics.performance.slowQueries > 10) {
      alerts.push(`慢查询数量过多: ${metrics.performance.slowQueries}`);
    }

    // 发送告警
    if (alerts.length > 0) {
      this.emit('alert', {
        type: 'performance',
        alerts,
        metrics,
        timestamp: new Date(),
      });

      logger.warn('Database performance alerts', { alerts });
    }
  }

  /**
   * 记录慢查询
   */
  recordSlowQuery(record: SlowQueryRecord): void {
    this.slowQueries.push(record);

    // 限制慢查询记录大小
    if (this.slowQueries.length > this.maxSlowQuerySize) {
      this.slowQueries.shift();
    }

    // 发送慢查询告警
    if (record.executionTime > this.config.slowQueryThreshold) {
      this.emit('slowQuery', record);

      logger.warn('Slow query detected', {
        collection: record.collection,
        operation: record.operation,
        executionTime: record.executionTime,
        query: JSON.stringify(record.query),
      });
    }
  }

  /**
   * 获取当前指标
   */
  getCurrentMetrics(): DatabaseMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  /**
   * 获取历史指标
   */
  getHistoricalMetrics(limit?: number): DatabaseMetrics[] {
    if (limit) {
      return this.metrics.slice(-limit);
    }
    return [...this.metrics];
  }

  /**
   * 获取慢查询记录
   */
  getSlowQueries(limit?: number): SlowQueryRecord[] {
    if (limit) {
      return this.slowQueries.slice(-limit);
    }
    return [...this.slowQueries];
  }

  /**
   * 获取性能统计
   */
  getPerformanceStats(timeRange?: { start: Date; end: Date }): {
    avgQueryTime: number;
    totalQueries: number;
    slowQueryRate: number;
    errorRate: number;
    connectionUtilization: number;
    memoryUtilization: number;
  } {
    let relevantMetrics = this.metrics;

    if (timeRange) {
      relevantMetrics = this.metrics.filter(
        m => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end,
      );
    }

    if (relevantMetrics.length === 0) {
      return {
        avgQueryTime: 0,
        totalQueries: 0,
        slowQueryRate: 0,
        errorRate: 0,
        connectionUtilization: 0,
        memoryUtilization: 0,
      };
    }

    const latest = relevantMetrics[relevantMetrics.length - 1];
    const earliest = relevantMetrics[0];

    const totalQueries = latest.operations.queries - earliest.operations.queries;
    const slowQueries = this.slowQueries.filter(
      q => !timeRange || (q.timestamp >= timeRange.start && q.timestamp <= timeRange.end),
    ).length;

    return {
      avgQueryTime: relevantMetrics.reduce((sum, m) => sum + m.performance.avgQueryTime, 0) / relevantMetrics.length,
      totalQueries,
      slowQueryRate: totalQueries > 0 ? (slowQueries / totalQueries) * 100 : 0,
      errorRate: latest.performance.failedQueries,
      connectionUtilization: (latest.connections.active / latest.connections.available) * 100,
      memoryUtilization: latest.resources.memoryUsage,
    };
  }

  /**
   * 生成性能报告
   */
  generatePerformanceReport(timeRange?: { start: Date; end: Date }): {
    summary: any;
    slowQueries: SlowQueryRecord[];
    recommendations: string[];
    charts: any[];
  } {
    const stats = this.getPerformanceStats(timeRange);
    const slowQueries = this.getSlowQueries(50);
    const recommendations = this.generateRecommendations(stats, slowQueries);

    return {
      summary: {
        ...stats,
        reportPeriod: timeRange || { start: this.metrics[0]?.timestamp, end: new Date() },
        totalCollections: this.getCurrentMetrics()?.collections.length || 0,
      },
      slowQueries,
      recommendations,
      charts: this.generateChartData(timeRange),
    };
  }

  /**
   * 生成优化建议
   */
  private generateRecommendations(
    stats: any,
    slowQueries: SlowQueryRecord[],
  ): string[] {
    const recommendations: string[] = [];

    if (stats.slowQueryRate > 5) {
      recommendations.push('慢查询率过高，建议优化查询或添加索引');
    }

    if (stats.connectionUtilization > 80) {
      recommendations.push('连接池使用率过高，建议增加连接池大小或优化连接使用');
    }

    if (stats.memoryUtilization > 1000) {
      recommendations.push('内存使用量较高，建议优化查询或增加服务器内存');
    }

    const noIndexQueries = slowQueries.filter(q => !q.indexUsed);
    if (noIndexQueries.length > 0) {
      recommendations.push(`发现 ${noIndexQueries.length} 个未使用索引的慢查询，建议添加相应索引`);
    }

    if (recommendations.length === 0) {
      recommendations.push('数据库性能良好，无需特别优化');
    }

    return recommendations;
  }

  /**
   * 生成图表数据
   */
  private generateChartData(timeRange?: { start: Date; end: Date }): any[] {
    let relevantMetrics = this.metrics;

    if (timeRange) {
      relevantMetrics = this.metrics.filter(
        m => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end,
      );
    }

    return [
      {
        type: 'line',
        title: '查询性能趋势',
        data: relevantMetrics.map(m => ({
          timestamp: m.timestamp,
          avgQueryTime: m.performance.avgQueryTime,
          slowQueries: m.performance.slowQueries,
        })),
      },
      {
        type: 'line',
        title: '连接使用趋势',
        data: relevantMetrics.map(m => ({
          timestamp: m.timestamp,
          active: m.connections.active,
          available: m.connections.available,
        })),
      },
      {
        type: 'line',
        title: '资源使用趋势',
        data: relevantMetrics.map(m => ({
          timestamp: m.timestamp,
          memory: m.resources.memoryUsage,
          disk: m.resources.diskUsage,
        })),
      },
    ];
  }

  /**
   * 清理历史数据
   */
  clearHistory(): void {
    this.metrics = [];
    this.slowQueries = [];
    logger.info('Database monitoring history cleared');
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<AlertConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Database monitoring config updated', { config: this.config });
  }

  /**
   * 获取监控状态
   */
  getMonitoringStatus(): {
    isMonitoring: boolean;
    metricsCount: number;
    slowQueriesCount: number;
    lastCollection?: Date;
    config: AlertConfig;
  } {
    return {
      isMonitoring: this.isMonitoring,
      metricsCount: this.metrics.length,
      slowQueriesCount: this.slowQueries.length,
      lastCollection: this.metrics[this.metrics.length - 1]?.timestamp,
      config: this.config,
    };
  }
}

/**
 * 数据库监控工具函数
 */
export class DatabaseMonitorUtils {
  /**
   * 创建慢查询记录
   */
  static createSlowQueryRecord(
    collection: string,
    operation: string,
    query: any,
    executionTime: number,
    documentsExamined: number = 0,
    documentsReturned: number = 0,
    indexUsed: boolean = false,
  ): SlowQueryRecord {
    return {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      collection,
      operation,
      query,
      executionTime,
      documentsExamined,
      documentsReturned,
      indexUsed,
      timestamp: new Date(),
      stackTrace: new Error().stack,
    };
  }

  /**
   * 格式化性能指标
   */
  static formatMetrics(metrics: DatabaseMetrics): string {
    return `
数据库性能指标 (${metrics.timestamp.toISOString()}):
连接: ${metrics.connections.active}/${metrics.connections.available}
操作: 查询=${metrics.operations.queries}, 插入=${metrics.operations.inserts}
性能: 平均查询时间=${metrics.performance.avgQueryTime}ms, 慢查询=${metrics.performance.slowQueries}
资源: 内存=${metrics.resources.memoryUsage}MB, 磁盘=${metrics.resources.diskUsage}MB
集合数: ${metrics.collections.length}
    `.trim();
  }

  /**
   * 检查指标健康状态
   */
  static checkHealthStatus(metrics: DatabaseMetrics, config: AlertConfig): {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
  } {
    const issues: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    // 检查连接使用率
    const connectionUsage = (metrics.connections.active / metrics.connections.available) * 100;
    if (connectionUsage > config.connectionThreshold) {
      issues.push(`连接使用率过高: ${connectionUsage.toFixed(1)}%`);
      status = 'warning';
    }

    // 检查慢查询
    if (metrics.performance.slowQueries > 20) {
      issues.push(`慢查询过多: ${metrics.performance.slowQueries}`);
      status = 'warning';
    }

    // 检查内存使用
    if (metrics.resources.memoryUsage > 2000) {
      issues.push(`内存使用过高: ${metrics.resources.memoryUsage}MB`);
      status = 'critical';
    }

    return { status, issues };
  }
}

export default DatabaseMonitor;
