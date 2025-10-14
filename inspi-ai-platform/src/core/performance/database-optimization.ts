/**
 * 数据库查询优化工具
 * 提供查询优化、连接池管理和性能监控
 */

/**
 * 查询性能指标
 */
interface QueryMetrics {
  query: string;
  executionTime: number;
  rowsAffected: number;
  timestamp: number;
  parameters?: any[];
  error?: string;
}

/**
 * 数据库连接池配置
 */
interface ConnectionPoolConfig {
  min: number;
  max: number;
  acquireTimeoutMillis: number;
  createTimeoutMillis: number;
  destroyTimeoutMillis: number;
  idleTimeoutMillis: number;
  reapIntervalMillis: number;
  createRetryIntervalMillis: number;
}

/**
 * 查询优化器
 */
export class QueryOptimizer {
  private queryCache = new Map<string, any>();
  private metrics: QueryMetrics[] = [];
  private slowQueryThreshold = 1000; // 1秒
  private maxMetricsSize = 1000;

  /**
   * 执行优化的查询
   */
  async executeOptimizedQuery<T>(
    queryFn: () => Promise<T>,
    queryString: string,
    parameters?: any[],
    options: {
      cache?: boolean;
      cacheTTL?: number;
      timeout?: number;
    } = {},
  ): Promise<T> {
    const { cache = false, cacheTTL = 300, timeout = 30000 } = options;

    // 生成缓存键
    const cacheKey = cache ? this.generateCacheKey(queryString, parameters) : null;

    // 尝试从缓存获取
    if (cacheKey && this.queryCache.has(cacheKey)) {
      const cached = this.queryCache.get(cacheKey);
      if (Date.now() - cached.timestamp < cacheTTL * 1000) {
        return cached.result;
      } else {
        this.queryCache.delete(cacheKey);
      }
    }

    const startTime = performance.now();
    let result: T;
    let error: string | undefined;

    try {
      // 设置查询超时
      result = await Promise.race([
        queryFn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Query timeout')), timeout),
        ),
      ]);

      // 缓存结果
      if (cacheKey) {
        this.queryCache.set(cacheKey, {
          result,
          timestamp: Date.now(),
        });
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
      throw err;
    } finally {
      const executionTime = performance.now() - startTime;

      // 记录性能指标
      this.recordMetrics({
        query: queryString,
        executionTime,
        rowsAffected: Array.isArray(result) ? result.length : 1,
        timestamp: Date.now(),
        parameters,
        error,
      });
    }

    return result;
  }

  /**
   * 批量查询优化
   */
  async executeBatchQueries<T>(
    queries: Array<{
      queryFn: () => Promise<T>;
      queryString: string;
      parameters?: any[];
    }>,
    options: {
      concurrency?: number;
      failFast?: boolean;
    } = {},
  ): Promise<T[]> {
    const { concurrency = 5, failFast = false } = options;
    const results: T[] = [];

    // 分批执行查询
    for (let i = 0; i < queries.length; i += concurrency) {
      const batch = queries.slice(i, i + concurrency);

      const batchPromises = batch.map(async ({ queryFn, queryString, parameters }) => {
        return this.executeOptimizedQuery(queryFn, queryString, parameters);
      });

      try {
        if (failFast) {
          const batchResults = await Promise.all(batchPromises);
          results.push(...batchResults);
        } else {
          const batchResults = await Promise.allSettled(batchPromises);
          batchResults.forEach(result => {
            if (result.status === 'fulfilled') {
              results.push(result.value);
            } else {
              console.error('Batch query failed:', result.reason);
            }
          });
        }
      } catch (error) {
        if (failFast) {
          throw error;
        }
      }
    }

    return results;
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(query: string, parameters?: any[]): string {
    const paramStr = parameters ? JSON.stringify(parameters) : '';
    return `query:${Buffer.from(query + paramStr).toString('base64')}`;
  }

  /**
   * 记录性能指标
   */
  private recordMetrics(metrics: QueryMetrics): void {
    this.metrics.push(metrics);

    // 限制指标数组大小
    if (this.metrics.length > this.maxMetricsSize) {
      this.metrics.shift();
    }

    // 记录慢查询
    if (metrics.executionTime > this.slowQueryThreshold) {
      console.warn('Slow query detected:', {
        query: metrics.query.substring(0, 100) + '...',
        executionTime: metrics.executionTime,
        parameters: metrics.parameters,
      });
    }
  }

  /**
   * 获取查询统计
   */
  getQueryStats(): {
    totalQueries: number;
    averageExecutionTime: number;
    slowQueries: number;
    errorRate: number;
    topSlowQueries: QueryMetrics[];
  } {
    const totalQueries = this.metrics.length;
    const totalTime = this.metrics.reduce((sum, m) => sum + m.executionTime, 0);
    const slowQueries = this.metrics.filter(m => m.executionTime > this.slowQueryThreshold).length;
    const errorQueries = this.metrics.filter(m => m.error).length;

    const topSlowQueries = this.metrics
      .filter(m => !m.error)
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, 10);

    return {
      totalQueries,
      averageExecutionTime: totalQueries > 0 ? totalTime / totalQueries : 0,
      slowQueries,
      errorRate: totalQueries > 0 ? errorQueries / totalQueries : 0,
      topSlowQueries,
    };
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.queryCache.clear();
  }

  /**
   * 设置慢查询阈值
   */
  setSlowQueryThreshold(threshold: number): void {
    this.slowQueryThreshold = threshold;
  }
}

/**
 * 连接池管理器
 */
export class ConnectionPoolManager {
  private pools = new Map<string, any>();
  private poolConfigs = new Map<string, ConnectionPoolConfig>();
  private poolStats = new Map<string, {
    activeConnections: number;
    idleConnections: number;
    totalConnections: number;
    acquiredCount: number;
    releasedCount: number;
    createdCount: number;
    destroyedCount: number;
    timeouts: number;
    errors: number;
  }>();

  /**
   * 创建连接池
   */
  createPool(
    name: string,
    connectionFactory: () => Promise<any>,
    config: Partial<ConnectionPoolConfig> = {},
  ): void {
    const poolConfig: ConnectionPoolConfig = {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 200,
      ...config,
    };

    this.poolConfigs.set(name, poolConfig);

    // 初始化统计
    this.poolStats.set(name, {
      activeConnections: 0,
      idleConnections: 0,
      totalConnections: 0,
      acquiredCount: 0,
      releasedCount: 0,
      createdCount: 0,
      destroyedCount: 0,
      timeouts: 0,
      errors: 0,
    });

    // 创建实际的连接池（这里使用简化实现）
    const pool = new SimpleConnectionPool(connectionFactory, poolConfig);
    this.pools.set(name, pool);

    console.log(`Connection pool '${name}' created with config:`, poolConfig);
  }

  /**
   * 获取连接
   */
  async acquireConnection(poolName: string): Promise<any> {
    const pool = this.pools.get(poolName);
    if (!pool) {
      throw new Error(`Connection pool '${poolName}' not found`);
    }

    const stats = this.poolStats.get(poolName)!;

    try {
      const connection = await pool.acquire();
      stats.acquiredCount++;
      stats.activeConnections++;
      return connection;
    } catch (error) {
      stats.errors++;
      throw error;
    }
  }

  /**
   * 释放连接
   */
  async releaseConnection(poolName: string, connection: any): Promise<void> {
    const pool = this.pools.get(poolName);
    if (!pool) {
      throw new Error(`Connection pool '${poolName}' not found`);
    }

    const stats = this.poolStats.get(poolName)!;

    try {
      await pool.release(connection);
      stats.releasedCount++;
      stats.activeConnections--;
      stats.idleConnections++;
    } catch (error) {
      stats.errors++;
      throw error;
    }
  }

  /**
   * 获取池统计
   */
  getPoolStats(poolName: string) {
    return this.poolStats.get(poolName);
  }

  /**
   * 获取所有池的统计
   */
  getAllPoolStats() {
    const stats: Record<string, any> = {};

    for (const [name, poolStats] of this.poolStats.entries()) {
      stats[name] = {
        ...poolStats,
        config: this.poolConfigs.get(name),
      };
    }

    return stats;
  }

  /**
   * 销毁连接池
   */
  async destroyPool(poolName: string): Promise<void> {
    const pool = this.pools.get(poolName);
    if (pool) {
      await pool.destroy();
      this.pools.delete(poolName);
      this.poolConfigs.delete(poolName);
      this.poolStats.delete(poolName);
      console.log(`Connection pool '${poolName}' destroyed`);
    }
  }

  /**
   * 销毁所有连接池
   */
  async destroyAllPools(): Promise<void> {
    const destroyPromises = Array.from(this.pools.keys()).map(name =>
      this.destroyPool(name),
    );

    await Promise.all(destroyPromises);
  }
}

/**
 * 简单连接池实现
 */
class SimpleConnectionPool {
  private connections: any[] = [];
  private activeConnections = new Set<any>();
  private waitingQueue: Array<{
    resolve: (connection: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = [];

  constructor(
    private connectionFactory: () => Promise<any>,
    private config: ConnectionPoolConfig,
  ) {
    this.initializePool();
  }

  /**
   * 初始化连接池
   */
  private async initializePool(): Promise<void> {
    // 创建最小连接数
    for (let i = 0; i < this.config.min; i++) {
      try {
        const connection = await this.connectionFactory();
        this.connections.push(connection);
      } catch (error) {
        console.error('Failed to create initial connection:', error);
      }
    }
  }

  /**
   * 获取连接
   */
  async acquire(): Promise<any> {
    // 如果有空闲连接，直接返回
    if (this.connections.length > 0) {
      const connection = this.connections.pop()!;
      this.activeConnections.add(connection);
      return connection;
    }

    // 如果还能创建新连接
    if (this.getTotalConnections() < this.config.max) {
      try {
        const connection = await this.connectionFactory();
        this.activeConnections.add(connection);
        return connection;
      } catch (error) {
        throw new Error(`Failed to create connection: ${error}`);
      }
    }

    // 等待连接释放
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.waitingQueue.findIndex(item => item.resolve === resolve);
        if (index > -1) {
          this.waitingQueue.splice(index, 1);
        }
        reject(new Error('Connection acquire timeout'));
      }, this.config.acquireTimeoutMillis);

      this.waitingQueue.push({ resolve, reject, timeout });
    });
  }

  /**
   * 释放连接
   */
  async release(connection: any): Promise<void> {
    if (!this.activeConnections.has(connection)) {
      throw new Error('Connection not found in active connections');
    }

    this.activeConnections.delete(connection);

    // 如果有等待的请求，直接分配给它们
    if (this.waitingQueue.length > 0) {
      const waiter = this.waitingQueue.shift()!;
      clearTimeout(waiter.timeout);
      this.activeConnections.add(connection);
      waiter.resolve(connection);
      return;
    }

    // 否则放回连接池
    this.connections.push(connection);
  }

  /**
   * 获取总连接数
   */
  private getTotalConnections(): number {
    return this.connections.length + this.activeConnections.size;
  }

  /**
   * 销毁连接池
   */
  async destroy(): Promise<void> {
    // 清理等待队列
    this.waitingQueue.forEach(waiter => {
      clearTimeout(waiter.timeout);
      waiter.reject(new Error('Connection pool destroyed'));
    });
    this.waitingQueue = [];

    // 关闭所有连接
    const allConnections = [...this.connections, ...this.activeConnections];

    await Promise.all(allConnections.map(async (connection) => {
      try {
        if (connection.close) {
          await connection.close();
        } else if (connection.end) {
          await connection.end();
        }
      } catch (error) {
        console.error('Error closing connection:', error);
      }
    }));

    this.connections = [];
    this.activeConnections.clear();
  }
}

/**
 * 数据库索引分析器
 */
export class IndexAnalyzer {
  private indexUsageStats = new Map<string, {
    tableName: string;
    indexName: string;
    usageCount: number;
    lastUsed: number;
    selectivity: number;
  }>();

  /**
   * 分析查询的索引使用情况
   */
  analyzeQuery(
    query: string,
    executionPlan: any,
    tableName: string,
  ): {
    usedIndexes: string[];
    missingIndexes: string[];
    recommendations: string[];
  } {
    const usedIndexes: string[] = [];
    const missingIndexes: string[] = [];
    const recommendations: string[] = [];

    // 解析执行计划（简化实现）
    if (executionPlan) {
      // 检查是否使用了索引
      if (executionPlan.includes('INDEX SCAN')) {
        const indexMatch = executionPlan.match(/INDEX SCAN.*?(\w+)/);
        if (indexMatch) {
          usedIndexes.push(indexMatch[1]);
          this.recordIndexUsage(tableName, indexMatch[1]);
        }
      } else if (executionPlan.includes('TABLE SCAN')) {
        recommendations.push(`Consider adding index for table ${tableName}`);
      }

      // 检查排序操作
      if (executionPlan.includes('SORT')) {
        recommendations.push('Consider adding index for ORDER BY clause');
      }

      // 检查连接操作
      if (executionPlan.includes('NESTED LOOP')) {
        recommendations.push('Consider adding index for JOIN conditions');
      }
    }

    // 分析查询语句
    const whereClause = this.extractWhereClause(query);
    if (whereClause) {
      const columns = this.extractColumns(whereClause);
      columns.forEach(column => {
        if (!this.hasIndexForColumn(tableName, column)) {
          missingIndexes.push(column);
          recommendations.push(`Consider adding index on ${tableName}.${column}`);
        }
      });
    }

    return { usedIndexes, missingIndexes, recommendations };
  }

  /**
   * 记录索引使用情况
   */
  private recordIndexUsage(tableName: string, indexName: string): void {
    const key = `${tableName}.${indexName}`;
    const existing = this.indexUsageStats.get(key);

    if (existing) {
      existing.usageCount++;
      existing.lastUsed = Date.now();
    } else {
      this.indexUsageStats.set(key, {
        tableName,
        indexName,
        usageCount: 1,
        lastUsed: Date.now(),
        selectivity: 0, // 需要从数据库统计信息获取
      });
    }
  }

  /**
   * 提取WHERE子句
   */
  private extractWhereClause(query: string): string | null {
    const whereMatch = query.match(/WHERE\s+(.+?)(?:\s+ORDER\s+BY|\s+GROUP\s+BY|\s+LIMIT|$)/i);
    return whereMatch ? whereMatch[1] : null;
  }

  /**
   * 提取列名
   */
  private extractColumns(whereClause: string): string[] {
    const columns: string[] = [];
    const columnPattern = /(\w+)\s*[=<>!]/g;
    let match;

    while ((match = columnPattern.exec(whereClause)) !== null) {
      columns.push(match[1]);
    }

    return [...new Set(columns)]; // 去重
  }

  /**
   * 检查列是否有索引
   */
  private hasIndexForColumn(tableName: string, column: string): boolean {
    // 这里应该查询数据库的索引信息
    // 简化实现，假设常见的id列有索引
    return column.toLowerCase().includes('id');
  }

  /**
   * 获取索引使用统计
   */
  getIndexUsageStats() {
    return Array.from(this.indexUsageStats.values())
      .sort((a, b) => b.usageCount - a.usageCount);
  }

  /**
   * 获取未使用的索引
   */
  getUnusedIndexes(thresholdDays = 30): string[] {
    const threshold = Date.now() - (thresholdDays * 24 * 60 * 60 * 1000);

    return Array.from(this.indexUsageStats.values())
      .filter(stat => stat.lastUsed < threshold)
      .map(stat => `${stat.tableName}.${stat.indexName}`);
  }
}

/**
 * 数据库性能监控装饰器
 */
export function monitorDatabasePerformance(
  optimizer: QueryOptimizer,
  options: {
    logSlowQueries?: boolean;
    slowQueryThreshold?: number;
  } = {},
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const queryString = `${target.constructor.name}.${propertyName}`;

      return optimizer.executeOptimizedQuery(
        () => method.apply(this, args),
        queryString,
        args,
        { cache: true },
      );
    };

    return descriptor;
  };
}
