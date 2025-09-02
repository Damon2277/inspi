/**
 * MongoDB聚合查询优化
 */
import { logger } from '@/lib/logging/logger';

/**
 * 聚合管道阶段类型
 */
export type PipelineStage = 
  | { $match: any }
  | { $group: any }
  | { $sort: any }
  | { $limit: number }
  | { $skip: number }
  | { $project: any }
  | { $lookup: any }
  | { $unwind: any }
  | { $addFields: any }
  | { $facet: any }
  | { $sample: any };

/**
 * 聚合查询性能指标
 */
export interface AggregationPerformance {
  pipeline: PipelineStage[];
  collection: string;
  executionTime: number;
  documentsProcessed: number;
  documentsReturned: number;
  stageStats: StageStats[];
  memoryUsage: number;
  indexesUsed: string[];
  optimizations: string[];
  timestamp: Date;
}

/**
 * 管道阶段统计
 */
export interface StageStats {
  stage: string;
  executionTime: number;
  inputDocuments: number;
  outputDocuments: number;
  memoryUsage: number;
  indexUsed?: string;
}

/**
 * 聚合查询构建器
 */
export class AggregationBuilder {
  private pipeline: PipelineStage[] = [];
  private collection: string;

  constructor(collection: string) {
    this.collection = collection;
  }

  /**
   * 添加匹配阶段
   */
  match(conditions: Record<string, any>): AggregationBuilder {
    this.pipeline.push({ $match: conditions });
    return this;
  }

  /**
   * 添加分组阶段
   */
  group(groupSpec: Record<string, any>): AggregationBuilder {
    this.pipeline.push({ $group: groupSpec });
    return this;
  }

  /**
   * 添加排序阶段
   */
  sort(sortSpec: Record<string, 1 | -1>): AggregationBuilder {
    this.pipeline.push({ $sort: sortSpec });
    return this;
  }

  /**
   * 添加限制阶段
   */
  limit(count: number): AggregationBuilder {
    this.pipeline.push({ $limit: count });
    return this;
  }

  /**
   * 添加跳过阶段
   */
  skip(count: number): AggregationBuilder {
    this.pipeline.push({ $skip: count });
    return this;
  }

  /**
   * 添加投影阶段
   */
  project(projection: Record<string, any>): AggregationBuilder {
    this.pipeline.push({ $project: projection });
    return this;
  }

  /**
   * 添加关联查询阶段
   */
  lookup(lookupSpec: {
    from: string;
    localField: string;
    foreignField: string;
    as: string;
    pipeline?: PipelineStage[];
  }): AggregationBuilder {
    this.pipeline.push({ $lookup: lookupSpec });
    return this;
  }

  /**
   * 添加展开阶段
   */
  unwind(path: string, options?: { preserveNullAndEmptyArrays?: boolean }): AggregationBuilder {
    const unwindSpec: any = { path };
    if (options) {
      Object.assign(unwindSpec, options);
    }
    this.pipeline.push({ $unwind: unwindSpec });
    return this;
  }

  /**
   * 添加字段阶段
   */
  addFields(fields: Record<string, any>): AggregationBuilder {
    this.pipeline.push({ $addFields: fields });
    return this;
  }

  /**
   * 添加分面搜索阶段
   */
  facet(facetSpec: Record<string, PipelineStage[]>): AggregationBuilder {
    this.pipeline.push({ $facet: facetSpec });
    return this;
  }

  /**
   * 添加采样阶段
   */
  sample(size: number): AggregationBuilder {
    this.pipeline.push({ $sample: { size } });
    return this;
  }

  /**
   * 获取管道
   */
  getPipeline(): PipelineStage[] {
    return [...this.pipeline];
  }

  /**
   * 优化管道
   */
  optimize(): AggregationBuilder {
    this.pipeline = this.optimizePipeline(this.pipeline);
    return this;
  }

  /**
   * 优化管道逻辑
   */
  private optimizePipeline(pipeline: PipelineStage[]): PipelineStage[] {
    let optimized = [...pipeline];

    // 1. 将 $match 阶段尽可能前移
    optimized = this.moveMatchStagesForward(optimized);

    // 2. 合并相邻的 $match 阶段
    optimized = this.mergeAdjacentMatches(optimized);

    // 3. 将 $limit 移到 $sort 之后
    optimized = this.optimizeSortLimit(optimized);

    // 4. 合并相邻的 $project 阶段
    optimized = this.mergeAdjacentProjects(optimized);

    // 5. 优化 $lookup 阶段
    optimized = this.optimizeLookups(optimized);

    return optimized;
  }

  /**
   * 将 $match 阶段前移
   */
  private moveMatchStagesForward(pipeline: PipelineStage[]): PipelineStage[] {
    const result: PipelineStage[] = [];
    const matchStages: PipelineStage[] = [];
    
    for (const stage of pipeline) {
      if ('$match' in stage) {
        matchStages.push(stage);
      } else {
        // 遇到非 $match 阶段，先添加所有累积的 $match
        result.push(...matchStages);
        matchStages.length = 0;
        result.push(stage);
      }
    }
    
    // 添加剩余的 $match 阶段
    result.push(...matchStages);
    
    return result;
  }

  /**
   * 合并相邻的 $match 阶段
   */
  private mergeAdjacentMatches(pipeline: PipelineStage[]): PipelineStage[] {
    const result: PipelineStage[] = [];
    let currentMatch: any = null;

    for (const stage of pipeline) {
      if ('$match' in stage) {
        if (currentMatch) {
          // 合并到当前 $match
          Object.assign(currentMatch.$match, stage.$match);
        } else {
          currentMatch = { $match: { ...stage.$match } };
        }
      } else {
        // 非 $match 阶段，先添加累积的 $match
        if (currentMatch) {
          result.push(currentMatch);
          currentMatch = null;
        }
        result.push(stage);
      }
    }

    // 添加最后的 $match
    if (currentMatch) {
      result.push(currentMatch);
    }

    return result;
  }

  /**
   * 优化 $sort 和 $limit 的组合
   */
  private optimizeSortLimit(pipeline: PipelineStage[]): PipelineStage[] {
    const result: PipelineStage[] = [];
    
    for (let i = 0; i < pipeline.length; i++) {
      const stage = pipeline[i];
      
      if ('$sort' in stage) {
        result.push(stage);
        
        // 查找后续的 $limit 阶段
        for (let j = i + 1; j < pipeline.length; j++) {
          const nextStage = pipeline[j];
          
          if ('$limit' in nextStage) {
            // 将 $limit 移到 $sort 之后
            result.push(nextStage);
            
            // 跳过已处理的 $limit
            pipeline.splice(j, 1);
            break;
          } else if ('$skip' in nextStage || '$match' in nextStage) {
            // 可以继续查找
            continue;
          } else {
            // 遇到其他阶段，停止查找
            break;
          }
        }
      } else {
        result.push(stage);
      }
    }

    return result;
  }

  /**
   * 合并相邻的 $project 阶段
   */
  private mergeAdjacentProjects(pipeline: PipelineStage[]): PipelineStage[] {
    const result: PipelineStage[] = [];
    let currentProject: any = null;

    for (const stage of pipeline) {
      if ('$project' in stage) {
        if (currentProject) {
          // 合并投影字段
          Object.assign(currentProject.$project, stage.$project);
        } else {
          currentProject = { $project: { ...stage.$project } };
        }
      } else {
        if (currentProject) {
          result.push(currentProject);
          currentProject = null;
        }
        result.push(stage);
      }
    }

    if (currentProject) {
      result.push(currentProject);
    }

    return result;
  }

  /**
   * 优化 $lookup 阶段
   */
  private optimizeLookups(pipeline: PipelineStage[]): PipelineStage[] {
    return pipeline.map(stage => {
      if ('$lookup' in stage) {
        const lookup = stage.$lookup;
        
        // 如果有 pipeline，尝试优化子管道
        if (lookup.pipeline) {
          lookup.pipeline = this.optimizePipeline(lookup.pipeline);
        }
      }
      return stage;
    });
  }
}

/**
 * 预定义的聚合查询模板
 */
export class AggregationTemplates {
  /**
   * 用户统计聚合
   */
  static userStats(): AggregationBuilder {
    return new AggregationBuilder('users')
      .match({ status: 'active' })
      .group({
        _id: '$subscription.type',
        count: { $sum: 1 },
        avgContribution: { $avg: '$stats.contributionScore' },
        totalWorks: { $sum: '$stats.worksCount' }
      })
      .sort({ count: -1 });
  }

  /**
   * 作品热度排行
   */
  static popularWorks(limit: number = 20): AggregationBuilder {
    return new AggregationBuilder('works')
      .match({ 
        status: 'published', 
        visibility: 'public' 
      })
      .addFields({
        popularityScore: {
          $add: [
            { $multiply: ['$stats.views', 1] },
            { $multiply: ['$stats.likes', 5] },
            { $multiply: ['$stats.reuses', 10] }
          ]
        }
      })
      .sort({ popularityScore: -1 })
      .limit(limit)
      .project({
        title: 1,
        authorId: 1,
        subject: 1,
        grade: 1,
        stats: 1,
        popularityScore: 1
      });
  }

  /**
   * 贡献度排行榜
   */
  static contributionRanking(period: 'day' | 'week' | 'month' | 'all' = 'all'): AggregationBuilder {
    const builder = new AggregationBuilder('users');
    
    // 根据时间段添加匹配条件
    if (period !== 'all') {
      const now = new Date();
      let startDate: Date;
      
      switch (period) {
        case 'day':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }
      
      builder.match({ 'stats.lastActiveAt': { $gte: startDate } });
    }

    return builder
      .match({ 'stats.contributionScore': { $gt: 0 } })
      .sort({ 'stats.contributionScore': -1 })
      .limit(100)
      .project({
        name: 1,
        avatar: 1,
        contributionScore: '$stats.contributionScore',
        worksCount: '$stats.worksCount',
        reusedCount: '$stats.reusedCount'
      });
  }

  /**
   * 学科作品分布统计
   */
  static subjectDistribution(): AggregationBuilder {
    return new AggregationBuilder('works')
      .match({ 
        status: 'published', 
        visibility: 'public' 
      })
      .group({
        _id: {
          subject: '$subject',
          grade: '$grade'
        },
        count: { $sum: 1 },
        avgRating: { $avg: '$stats.rating' },
        totalViews: { $sum: '$stats.views' }
      })
      .sort({ count: -1 })
      .project({
        subject: '$_id.subject',
        grade: '$_id.grade',
        count: 1,
        avgRating: { $round: ['$avgRating', 2] },
        totalViews: 1
      });
  }

  /**
   * 用户活跃度分析
   */
  static userActivityAnalysis(): AggregationBuilder {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    return new AggregationBuilder('users')
      .addFields({
        activityLevel: {
          $switch: {
            branches: [
              {
                case: { $gte: ['$stats.lastActiveAt', new Date(Date.now() - 24 * 60 * 60 * 1000)] },
                then: 'daily'
              },
              {
                case: { $gte: ['$stats.lastActiveAt', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] },
                then: 'weekly'
              },
              {
                case: { $gte: ['$stats.lastActiveAt', thirtyDaysAgo] },
                then: 'monthly'
              }
            ],
            default: 'inactive'
          }
        }
      })
      .group({
        _id: '$activityLevel',
        count: { $sum: 1 },
        avgContribution: { $avg: '$stats.contributionScore' }
      })
      .sort({ count: -1 });
  }

  /**
   * 知识图谱使用统计
   */
  static knowledgeGraphUsage(): AggregationBuilder {
    return new AggregationBuilder('knowledgeGraphs')
      .lookup({
        from: 'graphNodes',
        localField: '_id',
        foreignField: 'graphId',
        as: 'nodes'
      })
      .addFields({
        nodeCount: { $size: '$nodes' },
        workCount: {
          $sum: {
            $map: {
              input: '$nodes',
              as: 'node',
              in: { $size: '$$node.works' }
            }
          }
        }
      })
      .group({
        _id: '$subject',
        graphCount: { $sum: 1 },
        totalNodes: { $sum: '$nodeCount' },
        totalWorks: { $sum: '$workCount' },
        avgNodesPerGraph: { $avg: '$nodeCount' }
      })
      .sort({ totalWorks: -1 })
      .project({
        subject: '$_id',
        graphCount: 1,
        totalNodes: 1,
        totalWorks: 1,
        avgNodesPerGraph: { $round: ['$avgNodesPerGraph', 1] }
      });
  }
}

/**
 * 聚合查询优化器
 */
export class AggregationOptimizer {
  private db: any;

  constructor(database: any) {
    this.db = database;
  }

  /**
   * 执行优化的聚合查询
   */
  async executeOptimized(
    collection: string,
    pipeline: PipelineStage[],
    options: any = {}
  ): Promise<{
    results: any[];
    performance: AggregationPerformance;
  }> {
    const startTime = Date.now();
    
    try {
      // 优化管道
      const builder = new AggregationBuilder(collection);
      builder['pipeline'] = pipeline;
      const optimizedPipeline = builder.optimize().getPipeline();

      // 执行聚合查询
      const coll = this.db.collection(collection);
      const cursor = coll.aggregate(optimizedPipeline, {
        ...options,
        explain: false
      });

      const results = await cursor.toArray();
      const executionTime = Date.now() - startTime;

      // 获取执行统计（如果支持）
      const performance: AggregationPerformance = {
        pipeline: optimizedPipeline,
        collection,
        executionTime,
        documentsProcessed: 0, // 需要从explain结果获取
        documentsReturned: results.length,
        stageStats: [], // 需要从explain结果获取
        memoryUsage: 0, // 需要从explain结果获取
        indexesUsed: [], // 需要从explain结果获取
        optimizations: this.getOptimizationMessages(pipeline, optimizedPipeline),
        timestamp: new Date()
      };

      return { results, performance };
    } catch (error) {
      logger.error('Aggregation execution failed', error instanceof Error ? error : new Error(String(error)), {
        collection,
        pipeline: JSON.stringify(pipeline)
      });
      throw error;
    }
  }

  /**
   * 分析聚合查询性能
   */
  async explainAggregation(
    collection: string,
    pipeline: PipelineStage[]
  ): Promise<any> {
    try {
      const coll = this.db.collection(collection);
      return await coll.aggregate(pipeline, { explain: true }).toArray();
    } catch (error) {
      logger.error('Aggregation explain failed', error instanceof Error ? error : new Error(String(error)), {
        collection,
        pipeline: JSON.stringify(pipeline)
      });
      throw error;
    }
  }

  /**
   * 获取优化消息
   */
  private getOptimizationMessages(
    original: PipelineStage[],
    optimized: PipelineStage[]
  ): string[] {
    const messages: string[] = [];

    if (original.length !== optimized.length) {
      messages.push(`管道阶段数量从 ${original.length} 优化为 ${optimized.length}`);
    }

    // 检查 $match 前移
    const originalFirstMatch = original.findIndex(stage => '$match' in stage);
    const optimizedFirstMatch = optimized.findIndex(stage => '$match' in stage);
    
    if (originalFirstMatch > 0 && optimizedFirstMatch === 0) {
      messages.push('$match 阶段已前移以提高性能');
    }

    // 检查阶段合并
    const originalMatches = original.filter(stage => '$match' in stage).length;
    const optimizedMatches = optimized.filter(stage => '$match' in stage).length;
    
    if (originalMatches > optimizedMatches) {
      messages.push(`${originalMatches - optimizedMatches} 个 $match 阶段已合并`);
    }

    if (messages.length === 0) {
      messages.push('管道已是最优状态');
    }

    return messages;
  }
}

export default AggregationBuilder;