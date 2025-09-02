/**
 * 关联查询和数据获取优化
 */
import { logger } from '@/lib/logging/logger';
import { CacheManager } from '@/lib/cache/manager';

/**
 * 关联查询配置
 */
export interface RelationConfig {
  from: string;
  localField: string;
  foreignField: string;
  as: string;
  pipeline?: any[];
  preserveNullAndEmptyArrays?: boolean;
  cacheKey?: string;
  cacheTTL?: number;
}

/**
 * 批量加载配置
 */
export interface BatchLoadConfig {
  batchSize: number;
  maxConcurrency: number;
  cacheResults: boolean;
  cacheTTL: number;
}

/**
 * 数据加载结果
 */
export interface LoadResult<T> {
  data: T[];
  fromCache: boolean;
  executionTime: number;
  batchInfo?: {
    batchSize: number;
    batchCount: number;
    totalItems: number;
  };
}

/**
 * 关联查询优化器
 */
export class RelationOptimizer {
  private db: any;
  private cacheManager: CacheManager;
  private defaultBatchConfig: BatchLoadConfig = {
    batchSize: 100,
    maxConcurrency: 5,
    cacheResults: true,
    cacheTTL: 300 // 5分钟
  };

  constructor(database: any, cacheManager: CacheManager) {
    this.db = database;
    this.cacheManager = cacheManager;
  }

  /**
   * 优化的关联查询
   */
  async findWithRelations<T>(
    collection: string,
    query: any,
    relations: RelationConfig[],
    options: any = {}
  ): Promise<LoadResult<T>> {
    const startTime = Date.now();
    
    try {
      // 构建聚合管道
      const pipeline = this.buildRelationPipeline(query, relations, options);
      
      // 检查缓存
      const cacheKey = this.generateCacheKey(collection, pipeline);
      if (relations.some(r => r.cacheKey)) {
        const cached = await this.cacheManager.get<T[]>(cacheKey);
        if (cached) {
          return {
            data: cached,
            fromCache: true,
            executionTime: Date.now() - startTime
          };
        }
      }

      // 执行聚合查询
      const coll = this.db.collection(collection);
      const data = await coll.aggregate(pipeline).toArray();

      // 缓存结果
      if (relations.some(r => r.cacheKey)) {
        const ttl = relations.find(r => r.cacheTTL)?.cacheTTL || 300;
        await this.cacheManager.set(cacheKey, data, { ttl });
      }

      return {
        data,
        fromCache: false,
        executionTime: Date.now() - startTime
      };

    } catch (error) {
      logger.error('Relation query failed', error instanceof Error ? error : new Error(String(error)), {
        collection,
        query: JSON.stringify(query),
        relations: relations.map(r => ({ from: r.from, as: r.as }))
      });
      throw error;
    }
  }

  /**
   * 批量数据加载器（解决N+1查询问题）
   */
  async batchLoad<T, K>(
    collection: string,
    keys: K[],
    keyField: string,
    config?: Partial<BatchLoadConfig>
  ): Promise<LoadResult<T>> {
    const startTime = Date.now();
    const finalConfig = { ...this.defaultBatchConfig, ...config };
    
    try {
      if (keys.length === 0) {
        return {
          data: [],
          fromCache: false,
          executionTime: Date.now() - startTime,
          batchInfo: { batchSize: 0, batchCount: 0, totalItems: 0 }
        };
      }

      // 检查缓存
      const cacheResults = new Map<K, T>();
      const uncachedKeys: K[] = [];

      if (finalConfig.cacheResults) {
        for (const key of keys) {
          const cacheKey = `batch:${collection}:${keyField}:${key}`;
          const cached = await this.cacheManager.get<T>(cacheKey);
          if (cached) {
            cacheResults.set(key, cached);
          } else {
            uncachedKeys.push(key);
          }
        }
      } else {
        uncachedKeys.push(...keys);
      }

      let dbResults: T[] = [];
      let batchCount = 0;

      // 批量查询未缓存的数据
      if (uncachedKeys.length > 0) {
        const batches = this.createBatches(uncachedKeys, finalConfig.batchSize);
        batchCount = batches.length;

        // 并发执行批次
        const batchPromises = batches.map(batch => 
          this.executeBatch<T, K>(collection, batch, keyField)
        );

        const concurrentBatches = this.createBatches(batchPromises, finalConfig.maxConcurrency);
        
        for (const concurrentBatch of concurrentBatches) {
          const batchResults = await Promise.all(concurrentBatch);
          dbResults.push(...batchResults.flat());
        }

        // 缓存新查询的结果
        if (finalConfig.cacheResults) {
          const cachePromises = dbResults.map(async (item: any) => {
            const key = item[keyField];
            const cacheKey = `batch:${collection}:${keyField}:${key}`;
            return this.cacheManager.set(cacheKey, item, { ttl: finalConfig.cacheTTL });
          });
          await Promise.all(cachePromises);
        }
      }

      // 合并缓存和数据库结果
      const allResults: T[] = [...Array.from(cacheResults.values()), ...dbResults];

      return {
        data: allResults,
        fromCache: cacheResults.size > 0,
        executionTime: Date.now() - startTime,
        batchInfo: {
          batchSize: finalConfig.batchSize,
          batchCount,
          totalItems: allResults.length
        }
      };

    } catch (error) {
      logger.error('Batch load failed', error instanceof Error ? error : new Error(String(error)), {
        collection,
        keyField,
        keyCount: keys.length
      });
      throw error;
    }
  }

  /**
   * 数据加载器工厂
   */
  createDataLoader<T, K>(
    collection: string,
    keyField: string,
    config?: Partial<BatchLoadConfig>
  ): (keys: K[]) => Promise<T[]> {
    return async (keys: K[]): Promise<T[]> => {
      const result = await this.batchLoad<T, K>(collection, keys, keyField, config);
      return result.data;
    };
  }

  /**
   * 预加载关联数据
   */
  async preloadRelations<T>(
    items: T[],
    relationMappings: Array<{
      itemField: string;
      collection: string;
      foreignField: string;
      targetField: string;
      config?: Partial<BatchLoadConfig>;
    }>
  ): Promise<T[]> {
    const enrichedItems = [...items];

    for (const mapping of relationMappings) {
      try {
        // 提取需要查询的键
        const keys = items
          .map((item: any) => item[mapping.itemField])
          .filter(key => key != null);

        if (keys.length === 0) continue;

        // 批量加载关联数据
        const relationData = await this.batchLoad(
          mapping.collection,
          keys,
          mapping.foreignField,
          mapping.config
        );

        // 创建查找映射
        const dataMap = new Map();
        relationData.data.forEach((item: any) => {
          const key = item[mapping.foreignField];
          if (!dataMap.has(key)) {
            dataMap.set(key, []);
          }
          dataMap.get(key).push(item);
        });

        // 将关联数据附加到原始项目
        enrichedItems.forEach((item: any) => {
          const key = item[mapping.itemField];
          item[mapping.targetField] = dataMap.get(key) || [];
        });

      } catch (error) {
        logger.error('Failed to preload relation', error instanceof Error ? error : new Error(String(error)), {
          collection: mapping.collection,
          field: mapping.itemField
        });
        // 继续处理其他关联，不中断整个流程
      }
    }

    return enrichedItems;
  }

  /**
   * 智能关联查询（自动选择最优策略）
   */
  async smartRelationQuery<T>(
    collection: string,
    query: any,
    relations: RelationConfig[],
    options: any = {}
  ): Promise<LoadResult<T>> {
    // 分析查询复杂度
    const complexity = this.analyzeQueryComplexity(query, relations);
    
    if (complexity.score > 0.7) {
      // 高复杂度：使用批量加载策略
      logger.debug('Using batch loading strategy for complex query', { complexity });
      return await this.executeBatchStrategy(collection, query, relations, options);
    } else {
      // 低复杂度：使用聚合管道
      logger.debug('Using aggregation pipeline for simple query', { complexity });
      return await this.findWithRelations(collection, query, relations, options);
    }
  }

  /**
   * 构建关联查询管道
   */
  private buildRelationPipeline(
    query: any,
    relations: RelationConfig[],
    options: any
  ): any[] {
    const pipeline: any[] = [];

    // 添加匹配阶段
    if (Object.keys(query).length > 0) {
      pipeline.push({ $match: query });
    }

    // 添加关联阶段
    for (const relation of relations) {
      const lookupStage: any = {
        $lookup: {
          from: relation.from,
          localField: relation.localField,
          foreignField: relation.foreignField,
          as: relation.as
        }
      };

      if (relation.pipeline) {
        lookupStage.$lookup.pipeline = relation.pipeline;
      }

      pipeline.push(lookupStage);

      // 处理空数组和null值
      if (!relation.preserveNullAndEmptyArrays) {
        pipeline.push({
          $match: {
            [relation.as]: { $ne: [] }
          }
        });
      }
    }

    // 添加排序
    if (options.sort) {
      pipeline.push({ $sort: options.sort });
    }

    // 添加分页
    if (options.skip) {
      pipeline.push({ $skip: options.skip });
    }
    if (options.limit) {
      pipeline.push({ $limit: options.limit });
    }

    // 添加字段投影
    if (options.projection) {
      pipeline.push({ $project: options.projection });
    }

    return pipeline;
  }

  /**
   * 执行单个批次
   */
  private async executeBatch<T, K>(
    collection: string,
    keys: K[],
    keyField: string
  ): Promise<T[]> {
    const coll = this.db.collection(collection);
    return await coll.find({ [keyField]: { $in: keys } }).toArray();
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
   * 分析查询复杂度
   */
  private analyzeQueryComplexity(query: any, relations: RelationConfig[]): {
    score: number;
    factors: string[];
  } {
    let score = 0;
    const factors: string[] = [];

    // 关联数量影响
    if (relations.length > 2) {
      score += 0.3;
      factors.push(`多关联查询(${relations.length}个)`);
    }

    // 嵌套管道复杂度
    const hasComplexPipeline = relations.some(r => 
      r.pipeline && r.pipeline.length > 2
    );
    if (hasComplexPipeline) {
      score += 0.2;
      factors.push('复杂管道操作');
    }

    // 查询条件复杂度
    const queryComplexity = this.calculateQueryComplexity(query);
    score += queryComplexity * 0.3;
    if (queryComplexity > 0.5) {
      factors.push('复杂查询条件');
    }

    // 关联字段类型
    const hasArrayFields = relations.some(r => 
      r.localField.includes('.') || r.foreignField.includes('.')
    );
    if (hasArrayFields) {
      score += 0.2;
      factors.push('数组字段关联');
    }

    return { score: Math.min(score, 1), factors };
  }

  /**
   * 计算查询条件复杂度
   */
  private calculateQueryComplexity(query: any): number {
    let complexity = 0;
    
    const traverse = (obj: any, depth: number = 0): void => {
      if (depth > 3) {
        complexity += 0.2;
        return;
      }

      for (const [key, value] of Object.entries(obj)) {
        if (key.startsWith('$')) {
          complexity += 0.1;
        }
        
        if (typeof value === 'object' && value !== null) {
          if (Array.isArray(value)) {
            complexity += 0.05;
          } else {
            traverse(value, depth + 1);
          }
        }
      }
    };

    traverse(query);
    return Math.min(complexity, 1);
  }

  /**
   * 执行批量加载策略
   */
  private async executeBatchStrategy<T>(
    collection: string,
    query: any,
    relations: RelationConfig[],
    options: any
  ): Promise<LoadResult<T>> {
    const startTime = Date.now();

    try {
      // 首先获取主数据
      const coll = this.db.collection(collection);
      let cursor = coll.find(query);

      if (options.sort) cursor = cursor.sort(options.sort);
      if (options.skip) cursor = cursor.skip(options.skip);
      if (options.limit) cursor = cursor.limit(options.limit);
      if (options.projection) cursor = cursor.project(options.projection);

      const mainData = await cursor.toArray();

      // 预加载所有关联数据
      const relationMappings = relations.map(relation => ({
        itemField: relation.localField,
        collection: relation.from,
        foreignField: relation.foreignField,
        targetField: relation.as,
        config: {
          cacheResults: !!relation.cacheKey,
          cacheTTL: relation.cacheTTL || 300
        }
      }));

      const enrichedData = await this.preloadRelations(mainData, relationMappings);

      return {
        data: enrichedData,
        fromCache: false,
        executionTime: Date.now() - startTime
      };

    } catch (error) {
      logger.error('Batch strategy execution failed', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(collection: string, pipeline: any[]): string {
    const pipelineStr = JSON.stringify(pipeline);
    const hash = Buffer.from(pipelineStr).toString('base64').substring(0, 16);
    return `relation:${collection}:${hash}`;
  }
}

/**
 * 关联查询工具函数
 */
export class RelationUtils {
  /**
   * 创建标准关联配置
   */
  static createRelation(
    from: string,
    localField: string,
    foreignField: string = '_id',
    as?: string
  ): RelationConfig {
    return {
      from,
      localField,
      foreignField,
      as: as || `${from}Data`,
      preserveNullAndEmptyArrays: false
    };
  }

  /**
   * 创建用户关联配置
   */
  static createUserRelation(localField: string = 'authorId'): RelationConfig {
    return {
      from: 'users',
      localField,
      foreignField: '_id',
      as: 'author',
      pipeline: [
        {
          $project: {
            _id: 1,
            username: 1,
            avatar: 1,
            'stats.contributionScore': 1
          }
        }
      ],
      cacheKey: 'user-relation',
      cacheTTL: 600 // 10分钟
    };
  }

  /**
   * 创建作品关联配置
   */
  static createWorkRelation(localField: string = 'workId'): RelationConfig {
    return {
      from: 'works',
      localField,
      foreignField: '_id',
      as: 'work',
      pipeline: [
        {
          $project: {
            _id: 1,
            title: 1,
            description: 1,
            subject: 1,
            grade: 1,
            'stats.views': 1,
            'stats.likes': 1,
            createdAt: 1
          }
        }
      ],
      cacheKey: 'work-relation',
      cacheTTL: 300 // 5分钟
    };
  }

  /**
   * 验证关联配置
   */
  static validateRelationConfig(config: RelationConfig): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!config.from) {
      errors.push('关联集合名称不能为空');
    }

    if (!config.localField) {
      errors.push('本地字段不能为空');
    }

    if (!config.foreignField) {
      errors.push('外键字段不能为空');
    }

    if (!config.as) {
      errors.push('结果字段名不能为空');
    }

    if (config.cacheTTL && config.cacheTTL < 0) {
      errors.push('缓存TTL必须大于0');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export default RelationOptimizer;