/**
 * 数据库查询优化工具
 */
import { logger } from '@/lib/logging/logger';

/**
 * 查询性能指标
 */
export interface QueryPerformance {
  query: string;
  collection: string;
  executionTime: number;
  documentsExamined: number;
  documentsReturned: number;
  indexUsed: boolean;
  indexName?: string;
  efficiency: number; // 0-100
  recommendation: string;
  timestamp: Date;
}

/**
 * 查询优化建议
 */
export interface QueryOptimization {
  type: 'index' | 'query' | 'schema';
  priority: 'high' | 'medium' | 'low';
  description: string;
  impact: string;
  implementation: string;
}

/**
 * 慢查询阈值配置
 */
export interface SlowQueryConfig {
  thresholdMs: number;
  maxDocumentsExamined: number;
  minEfficiency: number;
  enableProfiling: boolean;
  sampleRate: number; // 0-1
}

/**
 * 默认慢查询配置
 */
export const DEFAULT_SLOW_QUERY_CONFIG: SlowQueryConfig = {
  thresholdMs: 100,
  maxDocumentsExamined: 1000,
  minEfficiency: 50,
  enableProfiling: true,
  sampleRate: 0.1,
};

/**
 * 查询优化器
 */
export class QueryOptimizer {
  private db: any;
  private config: SlowQueryConfig;
  private performanceHistory: QueryPerformance[] = [];
  private maxHistorySize = 1000;

  constructor(database: any, config: SlowQueryConfig = DEFAULT_SLOW_QUERY_CONFIG) {
    this.db = database;
    this.config = config;
  }

  /**
   * 分析查询性能
   */
  async analyzeQuery(
    collection: string,
    query: any,
    options: any = {},
  ): Promise<QueryPerformance> {
    const startTime = Date.now();

    try {
      // 使用explain()分析查询计划
      const coll = this.db.collection(collection);
      const explainResult = await (coll.find as any)(query, options).explain('executionStats');

      const executionTime = Date.now() - startTime;
      const stats = explainResult.executionStats;

      const performance: QueryPerformance = {
        query: JSON.stringify(query),
        collection,
        executionTime,
        documentsExamined: stats.totalDocsExamined || 0,
        documentsReturned: stats.totalDocsReturned || 0,
        indexUsed: this.isIndexUsed(explainResult),
        indexName: this.getUsedIndexName(explainResult),
        efficiency: this.calculateQueryEfficiency(stats),
        recommendation: this.generateQueryRecommendation(stats, explainResult),
        timestamp: new Date(),
      };

      // 记录性能数据
      this.recordPerformance(performance);

      // 如果是慢查询，记录警告
      if (this.isSlowQuery(performance)) {
        logger.warn('Slow query detected', {
          collection,
          query: performance.query,
          executionTime,
          documentsExamined: performance.documentsExamined,
          indexUsed: performance.indexUsed,
        });
      }

      return performance;
    } catch (error) {
      logger.error('Failed to analyze query', error instanceof Error ? error : new Error(String(error)), {
        collection,
        query: JSON.stringify(query),
      });
      throw error;
    }
  }

  /**
   * 优化查询构建器
   */
  buildOptimizedQuery(
    collection: string,
    filters: Record<string, any>,
    options: {
      sort?: Record<string, 1 | -1>;
      limit?: number;
      skip?: number;
      projection?: Record<string, 1 | 0>;
    } = {},
  ): {
    query: Record<string, any>;
    mongoOptions: Record<string, any>;
    optimizations: string[];
  } {
    const optimizations: string[] = [];
    let optimizedQuery = { ...filters };
    const mongoOptions: Record<string, any> = {};

    // 优化排序字段
    if (options.sort) {
      mongoOptions.sort = options.sort;

      // 检查排序字段是否有对应索引
      const sortFields = Object.keys(options.sort);
      if (sortFields.length > 0) {
        optimizations.push(`建议为排序字段 [${sortFields.join(', ')}] 创建索引`);
      }
    }

    // 优化投影
    if (options.projection) {
      mongoOptions.projection = options.projection;
      optimizations.push('使用字段投影减少网络传输');
    }

    // 优化分页
    if (options.limit) {
      mongoOptions.limit = options.limit;

      if (options.skip && options.skip > 1000) {
        optimizations.push('大偏移量分页性能较差，建议使用基于游标的分页');
      }

      if (options.skip) {
        mongoOptions.skip = options.skip;
      }
    }

    // 优化查询条件
    optimizedQuery = this.optimizeQueryConditions(optimizedQuery, optimizations);

    return {
      query: optimizedQuery,
      mongoOptions,
      optimizations,
    };
  }

  /**
   * 优化查询条件
   */
  private optimizeQueryConditions(
    query: Record<string, any>,
    optimizations: string[],
  ): Record<string, any> {
    const optimized = { ...query };

    // 优化正则表达式查询
    for (const [field, value] of Object.entries(optimized)) {
      if (value instanceof RegExp) {
        // 建议使用文本索引替代正则表达式
        optimizations.push(`字段 ${field} 使用正则表达式，建议创建文本索引提高性能`);

        // 如果是简单的前缀匹配，转换为范围查询
        const regexStr = value.source;
        if (regexStr.startsWith('^') && !regexStr.includes('*') && !regexStr.includes('+')) {
          const prefix = regexStr.substring(1);
          optimized[field] = {
            $gte: prefix,
            $lt: prefix + '\uffff',
          };
          optimizations.push(`将 ${field} 的正则表达式转换为范围查询`);
        }
      }

      // 优化数组查询
      if (Array.isArray(value)) {
        if (value.length > 100) {
          optimizations.push(`字段 ${field} 的 $in 查询包含过多值 (${value.length})，考虑分批查询`);
        }
      }

      // 优化日期范围查询
      if (field.includes('At') || field.includes('Date')) {
        if (typeof value === 'object' && value.$gte && value.$lte) {
          optimizations.push(`日期范围查询已优化，建议为 ${field} 创建索引`);
        }
      }
    }

    return optimized;
  }

  /**
   * 生成聚合管道优化建议
   */
  optimizeAggregationPipeline(
    collection: string,
    pipeline: any[],
  ): {
    optimizedPipeline: any[];
    optimizations: string[];
  } {
    const optimizations: string[] = [];
    const optimizedPipeline = [...pipeline];

    // 将 $match 阶段尽可能前移
    const matchStages = optimizedPipeline.filter(stage => stage.$match);
    const nonMatchStages = optimizedPipeline.filter(stage => !stage.$match);

    if (matchStages.length > 0) {
      optimizedPipeline.splice(0, optimizedPipeline.length, ...matchStages, ...nonMatchStages);
      optimizations.push('将 $match 阶段前移以减少处理的文档数量');
    }

    // 检查 $sort 和 $limit 的组合
    const sortIndex = optimizedPipeline.findIndex(stage => stage.$sort);
    const limitIndex = optimizedPipeline.findIndex(stage => stage.$limit);

    if (sortIndex !== -1 && limitIndex !== -1 && limitIndex > sortIndex) {
      // 将 $limit 移到 $sort 之后
      const limitStage = optimizedPipeline.splice(limitIndex, 1)[0];
      optimizedPipeline.splice(sortIndex + 1, 0, limitStage);
      optimizations.push('将 $limit 移到 $sort 之后以提高性能');
    }

    // 检查不必要的 $project 阶段
    const projectStages = optimizedPipeline.filter(stage => stage.$project);
    if (projectStages.length > 1) {
      optimizations.push('发现多个 $project 阶段，考虑合并以减少处理开销');
    }

    // 检查 $lookup 优化
    const lookupStages = optimizedPipeline.filter(stage => stage.$lookup);
    if (lookupStages.length > 0) {
      optimizations.push('$lookup 操作较重，确保关联字段有索引，考虑使用 $match 预过滤');
    }

    return {
      optimizedPipeline,
      optimizations,
    };
  }

  /**
   * 获取慢查询报告
   */
  getSlowQueryReport(timeRange: { start: Date; end: Date }): {
    totalQueries: number;
    slowQueries: QueryPerformance[];
    topSlowQueries: QueryPerformance[];
    recommendations: QueryOptimization[];
  } {
    const queriesInRange = this.performanceHistory.filter(
      perf => perf.timestamp >= timeRange.start && perf.timestamp <= timeRange.end,
    );

    const slowQueries = queriesInRange.filter(perf => this.isSlowQuery(perf));

    // 按执行时间排序，取前10个最慢的查询
    const topSlowQueries = [...slowQueries]
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, 10);

    const recommendations = this.generateOptimizationRecommendations(slowQueries);

    return {
      totalQueries: queriesInRange.length,
      slowQueries,
      topSlowQueries,
      recommendations,
    };
  }

  /**
   * 生成优化建议
   */
  private generateOptimizationRecommendations(slowQueries: QueryPerformance[]): QueryOptimization[] {
    const recommendations: QueryOptimization[] = [];
    const queryPatterns = new Map<string, QueryPerformance[]>();

    // 按查询模式分组
    slowQueries.forEach(query => {
      const pattern = this.extractQueryPattern(query.query);
      if (!queryPatterns.has(pattern)) {
        queryPatterns.set(pattern, []);
      }
      queryPatterns.get(pattern)!.push(query);
    });

    // 为每个模式生成建议
    queryPatterns.forEach((queries, pattern) => {
      const avgExecutionTime = queries.reduce((sum, q) => sum + q.executionTime, 0) / queries.length;
      const avgEfficiency = queries.reduce((sum, q) => sum + q.efficiency, 0) / queries.length;

      if (avgEfficiency < 30) {
        recommendations.push({
          type: 'index',
          priority: 'high',
          description: `查询模式 "${pattern}" 效率过低 (${avgEfficiency.toFixed(1)}%)`,
          impact: `影响 ${queries.length} 个查询，平均执行时间 ${avgExecutionTime.toFixed(1)}ms`,
          implementation: '为查询条件字段创建复合索引',
        });
      }

      if (avgExecutionTime > 1000) {
        recommendations.push({
          type: 'query',
          priority: 'high',
          description: `查询模式 "${pattern}" 执行时间过长`,
          impact: `平均执行时间 ${avgExecutionTime.toFixed(1)}ms`,
          implementation: '优化查询条件，减少扫描的文档数量',
        });
      }

      const noIndexQueries = queries.filter(q => !q.indexUsed);
      if (noIndexQueries.length > 0) {
        recommendations.push({
          type: 'index',
          priority: 'medium',
          description: `查询模式 "${pattern}" 未使用索引`,
          impact: `${noIndexQueries.length} 个查询进行全表扫描`,
          implementation: '为查询字段创建适当的索引',
        });
      }
    });

    return recommendations;
  }

  /**
   * 提取查询模式
   */
  private extractQueryPattern(queryStr: string): string {
    try {
      const query = JSON.parse(queryStr);
      const pattern: Record<string, string> = {};

      for (const [key, value] of Object.entries(query)) {
        if (typeof value === 'object' && value !== null) {
          pattern[key] = 'object';
        } else {
          pattern[key] = typeof value;
        }
      }

      return JSON.stringify(pattern);
    } catch {
      return 'invalid_query';
    }
  }

  /**
   * 检查是否使用了索引
   */
  private isIndexUsed(explainResult: any): boolean {
    const winningPlan = explainResult.queryPlanner?.winningPlan;
    return winningPlan?.stage !== 'COLLSCAN';
  }

  /**
   * 获取使用的索引名称
   */
  private getUsedIndexName(explainResult: any): string | undefined {
    const winningPlan = explainResult.queryPlanner?.winningPlan;

    if (winningPlan?.stage === 'IXSCAN') {
      return winningPlan.indexName;
    }

    if (winningPlan?.inputStage?.stage === 'IXSCAN') {
      return winningPlan.inputStage.indexName;
    }

    return undefined;
  }

  /**
   * 计算查询效率
   */
  private calculateQueryEfficiency(stats: any): number {
    const examined = stats.totalDocsExamined || 0;
    const returned = stats.totalDocsReturned || 0;

    if (examined === 0) return 100;
    if (returned === 0) return 0;

    return Math.round((returned / examined) * 100);
  }

  /**
   * 生成查询建议
   */
  private generateQueryRecommendation(stats: any, explainResult: any): string {
    const efficiency = this.calculateQueryEfficiency(stats);
    const examined = stats.totalDocsExamined || 0;
    const returned = stats.totalDocsReturned || 0;
    const indexUsed = this.isIndexUsed(explainResult);

    if (!indexUsed) {
      return '查询未使用索引，建议为查询字段创建索引';
    }

    if (efficiency < 10) {
      return `查询效率过低 (${efficiency}%)，建议优化查询条件或索引`;
    }

    if (examined > 10000) {
      return `扫描文档过多 (${examined})，建议添加更精确的查询条件`;
    }

    if (efficiency < 50) {
      return `查询效率偏低 (${efficiency}%)，考虑优化索引或查询条件`;
    }

    return '查询性能良好';
  }

  /**
   * 判断是否为慢查询
   */
  private isSlowQuery(performance: QueryPerformance): boolean {
    return performance.executionTime > this.config.thresholdMs ||
           performance.documentsExamined > this.config.maxDocumentsExamined ||
           performance.efficiency < this.config.minEfficiency;
  }

  /**
   * 记录性能数据
   */
  private recordPerformance(performance: QueryPerformance): void {
    this.performanceHistory.push(performance);

    // 限制历史记录大小
    if (this.performanceHistory.length > this.maxHistorySize) {
      this.performanceHistory.shift();
    }
  }

  /**
   * 清理性能历史
   */
  clearPerformanceHistory(): void {
    this.performanceHistory = [];
  }

  /**
   * 获取性能统计
   */
  getPerformanceStats(): {
    totalQueries: number;
    averageExecutionTime: number;
    slowQueryRate: number;
    indexUsageRate: number;
    averageEfficiency: number;
  } {
    if (this.performanceHistory.length === 0) {
      return {
        totalQueries: 0,
        averageExecutionTime: 0,
        slowQueryRate: 0,
        indexUsageRate: 0,
        averageEfficiency: 0,
      };
    }

    const totalQueries = this.performanceHistory.length;
    const totalExecutionTime = this.performanceHistory.reduce((sum, p) => sum + p.executionTime, 0);
    const slowQueries = this.performanceHistory.filter(p => this.isSlowQuery(p)).length;
    const indexedQueries = this.performanceHistory.filter(p => p.indexUsed).length;
    const totalEfficiency = this.performanceHistory.reduce((sum, p) => sum + p.efficiency, 0);

    return {
      totalQueries,
      averageExecutionTime: totalExecutionTime / totalQueries,
      slowQueryRate: (slowQueries / totalQueries) * 100,
      indexUsageRate: (indexedQueries / totalQueries) * 100,
      averageEfficiency: totalEfficiency / totalQueries,
    };
  }
}

/**
 * 查询构建器辅助类
 */
export class QueryBuilder {
  private query: Record<string, any> = {};
  private options: Record<string, any> = {};

  /**
   * 添加等值条件
   */
  equals(field: string, value: any): QueryBuilder {
    this.query[field] = value;
    return this;
  }

  /**
   * 添加范围条件
   */
  range(field: string, min?: any, max?: any): QueryBuilder {
    const condition: Record<string, any> = {};
    if (min !== undefined) condition.$gte = min;
    if (max !== undefined) condition.$lte = max;
    this.query[field] = condition;
    return this;
  }

  /**
   * 添加包含条件
   */
  in(field: string, values: any[]): QueryBuilder {
    this.query[field] = { $in: values };
    return this;
  }

  /**
   * 添加文本搜索
   */
  text(searchText: string): QueryBuilder {
    this.query.$text = { $search: searchText };
    return this;
  }

  /**
   * 添加排序
   */
  sort(field: string, direction: 1 | -1 = 1): QueryBuilder {
    if (!this.options.sort) this.options.sort = {};
    this.options.sort[field] = direction;
    return this;
  }

  /**
   * 添加限制
   */
  limit(count: number): QueryBuilder {
    this.options.limit = count;
    return this;
  }

  /**
   * 添加跳过
   */
  skip(count: number): QueryBuilder {
    this.options.skip = count;
    return this;
  }

  /**
   * 添加字段投影
   */
  project(fields: Record<string, 1 | 0>): QueryBuilder {
    this.options.projection = fields;
    return this;
  }

  /**
   * 构建查询
   */
  build(): { query: Record<string, any>; options: Record<string, any> } {
    return {
      query: this.query,
      options: this.options,
    };
  }
}

export default QueryOptimizer;
