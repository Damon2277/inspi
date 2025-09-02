/**
 * 数据库索引定义和管理
 */
import { logger } from '@/lib/logging/logger';

/**
 * 索引类型
 */
export enum IndexType {
  SINGLE = 'single',
  COMPOUND = 'compound',
  TEXT = 'text',
  GEOSPATIAL = '2dsphere',
  HASHED = 'hashed',
  PARTIAL = 'partial',
  SPARSE = 'sparse',
  TTL = 'ttl'
}

/**
 * 索引定义接口
 */
export interface IndexDefinition {
  name: string;
  collection: string;
  fields: Record<string, 1 | -1 | 'text' | '2dsphere' | 'hashed'>;
  options?: {
    unique?: boolean;
    sparse?: boolean;
    background?: boolean;
    partialFilterExpression?: Record<string, any>;
    expireAfterSeconds?: number;
    textIndexVersion?: number;
    weights?: Record<string, number>;
    default_language?: string;
    language_override?: string;
  };
  type: IndexType;
  description: string;
  estimatedSize: string;
  usage: 'high' | 'medium' | 'low';
}

/**
 * 索引性能统计
 */
export interface IndexStats {
  name: string;
  collection: string;
  size: number;
  usageCount: number;
  lastUsed: Date;
  efficiency: number; // 0-100
  recommendation: 'keep' | 'optimize' | 'remove';
}

/**
 * 用户集合索引定义
 */
export const USER_INDEXES: IndexDefinition[] = [
  {
    name: 'users_email_unique',
    collection: 'users',
    fields: { email: 1 },
    options: { unique: true, background: true },
    type: IndexType.SINGLE,
    description: '用户邮箱唯一索引，用于登录和查重',
    estimatedSize: '~50KB',
    usage: 'high'
  },
  {
    name: 'users_subscription_status',
    collection: 'users',
    fields: { 'subscription.type': 1, 'subscription.status': 1 },
    options: { background: true },
    type: IndexType.COMPOUND,
    description: '用户订阅状态复合索引，用于订阅查询和统计',
    estimatedSize: '~30KB',
    usage: 'high'
  },
  {
    name: 'users_active_status',
    collection: 'users',
    fields: { 'stats.lastActiveAt': -1, status: 1 },
    options: { 
      background: true,
      partialFilterExpression: { status: 'active' }
    },
    type: IndexType.PARTIAL,
    description: '活跃用户索引，用于活跃度统计和排序',
    estimatedSize: '~40KB',
    usage: 'medium'
  },
  {
    name: 'users_contribution_score',
    collection: 'users',
    fields: { 'stats.contributionScore': -1 },
    options: { 
      background: true,
      partialFilterExpression: { 'stats.contributionScore': { $gt: 0 } }
    },
    type: IndexType.PARTIAL,
    description: '用户贡献度索引，用于排行榜查询',
    estimatedSize: '~35KB',
    usage: 'medium'
  },
  {
    name: 'users_created_at',
    collection: 'users',
    fields: { createdAt: -1 },
    options: { background: true },
    type: IndexType.SINGLE,
    description: '用户创建时间索引，用于注册统计',
    estimatedSize: '~25KB',
    usage: 'low'
  }
];

/**
 * 作品集合索引定义
 */
export const WORK_INDEXES: IndexDefinition[] = [
  {
    name: 'works_author_status',
    collection: 'works',
    fields: { authorId: 1, status: 1, updatedAt: -1 },
    options: { background: true },
    type: IndexType.COMPOUND,
    description: '作者作品状态复合索引，用于用户作品列表查询',
    estimatedSize: '~80KB',
    usage: 'high'
  },
  {
    name: 'works_published_public',
    collection: 'works',
    fields: { status: 1, visibility: 1, publishedAt: -1 },
    options: { 
      background: true,
      partialFilterExpression: { 
        status: 'published', 
        visibility: 'public' 
      }
    },
    type: IndexType.PARTIAL,
    description: '已发布公开作品索引，用于作品列表和搜索',
    estimatedSize: '~120KB',
    usage: 'high'
  },
  {
    name: 'works_subject_grade',
    collection: 'works',
    fields: { subject: 1, grade: 1, 'stats.rating': -1 },
    options: { 
      background: true,
      partialFilterExpression: { 
        status: 'published', 
        visibility: 'public' 
      }
    },
    type: IndexType.COMPOUND,
    description: '学科年级复合索引，用于分类浏览',
    estimatedSize: '~90KB',
    usage: 'high'
  },
  {
    name: 'works_tags',
    collection: 'works',
    fields: { tags: 1, 'stats.views': -1 },
    options: { background: true },
    type: IndexType.COMPOUND,
    description: '标签索引，用于标签筛选和推荐',
    estimatedSize: '~70KB',
    usage: 'medium'
  },
  {
    name: 'works_stats_views',
    collection: 'works',
    fields: { 'stats.views': -1, publishedAt: -1 },
    options: { 
      background: true,
      partialFilterExpression: { 
        status: 'published',
        'stats.views': { $gt: 0 }
      }
    },
    type: IndexType.PARTIAL,
    description: '作品浏览量索引，用于热门作品排序',
    estimatedSize: '~60KB',
    usage: 'high'
  },
  {
    name: 'works_stats_reuses',
    collection: 'works',
    fields: { 'stats.reuses': -1, publishedAt: -1 },
    options: { 
      background: true,
      partialFilterExpression: { 
        status: 'published',
        'stats.reuses': { $gt: 0 }
      }
    },
    type: IndexType.PARTIAL,
    description: '作品复用量索引，用于复用排行榜',
    estimatedSize: '~45KB',
    usage: 'medium'
  },
  {
    name: 'works_text_search',
    collection: 'works',
    fields: { 
      title: 'text', 
      description: 'text', 
      tags: 'text' 
    },
    options: { 
      background: true,
      weights: { title: 10, description: 5, tags: 1 },
      default_language: 'chinese'
    },
    type: IndexType.TEXT,
    description: '全文搜索索引，用于作品搜索功能',
    estimatedSize: '~200KB',
    usage: 'high'
  }
];

/**
 * 知识图谱集合索引定义
 */
export const KNOWLEDGE_GRAPH_INDEXES: IndexDefinition[] = [
  {
    name: 'graphs_subject_preset',
    collection: 'knowledgeGraphs',
    fields: { subject: 1, 'metadata.isPreset': 1 },
    options: { background: true },
    type: IndexType.COMPOUND,
    description: '学科预设图谱索引，用于预设图谱查询',
    estimatedSize: '~15KB',
    usage: 'high'
  },
  {
    name: 'graphs_author_visibility',
    collection: 'knowledgeGraphs',
    fields: { 'metadata.authorId': 1, 'metadata.visibility': 1 },
    options: { 
      background: true,
      partialFilterExpression: { 'metadata.authorId': { $exists: true } }
    },
    type: IndexType.PARTIAL,
    description: '用户图谱可见性索引，用于用户图谱查询',
    estimatedSize: '~20KB',
    usage: 'medium'
  },
  {
    name: 'graph_nodes_type_level',
    collection: 'graphNodes',
    fields: { graphId: 1, type: 1, level: 1 },
    options: { background: true },
    type: IndexType.COMPOUND,
    description: '图谱节点类型层级索引，用于节点查询',
    estimatedSize: '~40KB',
    usage: 'high'
  },
  {
    name: 'graph_nodes_works',
    collection: 'graphNodes',
    fields: { graphId: 1, works: 1 },
    options: { 
      background: true,
      partialFilterExpression: { works: { $ne: [] } }
    },
    type: IndexType.PARTIAL,
    description: '节点作品索引，用于作品挂载查询',
    estimatedSize: '~30KB',
    usage: 'medium'
  }
];

/**
 * 贡献度日志集合索引定义
 */
export const CONTRIBUTION_LOG_INDEXES: IndexDefinition[] = [
  {
    name: 'contribution_logs_user_date',
    collection: 'contributionLogs',
    fields: { userId: 1, createdAt: -1 },
    options: { background: true },
    type: IndexType.COMPOUND,
    description: '用户贡献日志索引，用于用户贡献历史查询',
    estimatedSize: '~100KB',
    usage: 'high'
  },
  {
    name: 'contribution_logs_type_date',
    collection: 'contributionLogs',
    fields: { type: 1, createdAt: -1 },
    options: { background: true },
    type: IndexType.COMPOUND,
    description: '贡献类型日期索引，用于贡献统计',
    estimatedSize: '~80KB',
    usage: 'medium'
  },
  {
    name: 'contribution_logs_ttl',
    collection: 'contributionLogs',
    fields: { createdAt: 1 },
    options: { 
      background: true,
      expireAfterSeconds: 31536000 // 1年后自动删除
    },
    type: IndexType.TTL,
    description: '贡献日志TTL索引，自动清理过期数据',
    estimatedSize: '~50KB',
    usage: 'low'
  }
];

/**
 * 会话集合索引定义
 */
export const SESSION_INDEXES: IndexDefinition[] = [
  {
    name: 'sessions_user_id',
    collection: 'sessions',
    fields: { userId: 1, updatedAt: -1 },
    options: { background: true },
    type: IndexType.COMPOUND,
    description: '用户会话索引，用于会话管理',
    estimatedSize: '~60KB',
    usage: 'high'
  },
  {
    name: 'sessions_ttl',
    collection: 'sessions',
    fields: { expiresAt: 1 },
    options: { 
      background: true,
      expireAfterSeconds: 0 // 根据expiresAt字段自动删除
    },
    type: IndexType.TTL,
    description: '会话TTL索引，自动清理过期会话',
    estimatedSize: '~30KB',
    usage: 'high'
  }
];

/**
 * 所有索引定义
 */
export const ALL_INDEXES: IndexDefinition[] = [
  ...USER_INDEXES,
  ...WORK_INDEXES,
  ...KNOWLEDGE_GRAPH_INDEXES,
  ...CONTRIBUTION_LOG_INDEXES,
  ...SESSION_INDEXES
];

/**
 * 索引管理器
 */
export class IndexManager {
  private db: any; // MongoDB数据库实例

  constructor(database: any) {
    this.db = database;
  }

  /**
   * 创建所有索引
   */
  async createAllIndexes(): Promise<void> {
    logger.info('Starting index creation process');
    
    const results = {
      created: 0,
      skipped: 0,
      failed: 0
    };

    for (const indexDef of ALL_INDEXES) {
      try {
        await this.createIndex(indexDef);
        results.created++;
        logger.info(`Index created: ${indexDef.name}`, {
          collection: indexDef.collection,
          type: indexDef.type
        });
      } catch (error) {
        results.failed++;
        logger.error(`Failed to create index: ${indexDef.name}`, error instanceof Error ? error : new Error(String(error)), {
          collection: indexDef.collection
        });
      }
    }

    logger.info('Index creation completed', results);
  }

  /**
   * 创建单个索引
   */
  async createIndex(indexDef: IndexDefinition): Promise<void> {
    const collection = this.db.collection(indexDef.collection);
    
    // 检查索引是否已存在
    const existingIndexes = await collection.indexes();
    const indexExists = existingIndexes.some((idx: any) => idx.name === indexDef.name);
    
    if (indexExists) {
      logger.debug(`Index already exists: ${indexDef.name}`);
      return;
    }

    // 创建索引
    await collection.createIndex(indexDef.fields, {
      name: indexDef.name,
      ...indexDef.options
    });
  }

  /**
   * 删除索引
   */
  async dropIndex(collection: string, indexName: string): Promise<void> {
    try {
      const coll = this.db.collection(collection);
      await coll.dropIndex(indexName);
      logger.info(`Index dropped: ${indexName}`, { collection });
    } catch (error) {
      logger.error(`Failed to drop index: ${indexName}`, error instanceof Error ? error : new Error(String(error)), { collection });
      throw error;
    }
  }

  /**
   * 获取索引统计信息
   */
  async getIndexStats(collection: string): Promise<IndexStats[]> {
    try {
      const coll = this.db.collection(collection);
      const stats = await coll.aggregate([
        { $indexStats: {} }
      ]).toArray();

      return stats.map((stat: any) => ({
        name: stat.name,
        collection,
        size: stat.indexSizes?.[stat.name] || 0,
        usageCount: stat.accesses?.ops || 0,
        lastUsed: stat.accesses?.since || new Date(),
        efficiency: this.calculateIndexEfficiency(stat),
        recommendation: this.getIndexRecommendation(stat)
      }));
    } catch (error) {
      logger.error(`Failed to get index stats for collection: ${collection}`, error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }

  /**
   * 分析索引使用情况
   */
  async analyzeIndexUsage(): Promise<{
    totalIndexes: number;
    unusedIndexes: IndexStats[];
    inefficientIndexes: IndexStats[];
    recommendations: string[];
  }> {
    const allStats: IndexStats[] = [];
    const collections = ['users', 'works', 'knowledgeGraphs', 'graphNodes', 'contributionLogs', 'sessions'];

    // 收集所有集合的索引统计
    for (const collection of collections) {
      const stats = await this.getIndexStats(collection);
      allStats.push(...stats);
    }

    // 分析未使用的索引
    const unusedIndexes = allStats.filter(stat => 
      stat.usageCount === 0 && !stat.name.startsWith('_id')
    );

    // 分析低效索引
    const inefficientIndexes = allStats.filter(stat => 
      stat.efficiency < 50 && stat.usageCount > 0
    );

    // 生成建议
    const recommendations = this.generateIndexRecommendations(allStats, unusedIndexes, inefficientIndexes);

    return {
      totalIndexes: allStats.length,
      unusedIndexes,
      inefficientIndexes,
      recommendations
    };
  }

  /**
   * 计算索引效率
   */
  private calculateIndexEfficiency(stat: any): number {
    // 简化的效率计算，实际应该基于更多指标
    const usageCount = stat.accesses?.ops || 0;
    const size = stat.indexSizes?.[stat.name] || 1;
    
    if (usageCount === 0) return 0;
    
    // 使用次数与大小的比率作为效率指标
    return Math.min(100, (usageCount / (size / 1024)) * 10);
  }

  /**
   * 获取索引建议
   */
  private getIndexRecommendation(stat: any): 'keep' | 'optimize' | 'remove' {
    const efficiency = this.calculateIndexEfficiency(stat);
    const usageCount = stat.accesses?.ops || 0;

    if (usageCount === 0) return 'remove';
    if (efficiency < 30) return 'optimize';
    return 'keep';
  }

  /**
   * 生成索引优化建议
   */
  private generateIndexRecommendations(
    allStats: IndexStats[],
    unusedIndexes: IndexStats[],
    inefficientIndexes: IndexStats[]
  ): string[] {
    const recommendations: string[] = [];

    if (unusedIndexes.length > 0) {
      recommendations.push(`发现 ${unusedIndexes.length} 个未使用的索引，建议删除以节省存储空间`);
    }

    if (inefficientIndexes.length > 0) {
      recommendations.push(`发现 ${inefficientIndexes.length} 个低效索引，建议优化查询或重建索引`);
    }

    const totalSize = allStats.reduce((sum, stat) => sum + stat.size, 0);
    if (totalSize > 100 * 1024 * 1024) { // 100MB
      recommendations.push('索引总大小超过100MB，建议定期清理和优化');
    }

    if (recommendations.length === 0) {
      recommendations.push('索引使用情况良好，无需特别优化');
    }

    return recommendations;
  }

  /**
   * 重建索引
   */
  async rebuildIndex(collection: string, indexName: string): Promise<void> {
    try {
      const indexDef = ALL_INDEXES.find(idx => 
        idx.collection === collection && idx.name === indexName
      );

      if (!indexDef) {
        throw new Error(`Index definition not found: ${indexName}`);
      }

      // 删除现有索引
      await this.dropIndex(collection, indexName);
      
      // 重新创建索引
      await this.createIndex(indexDef);
      
      logger.info(`Index rebuilt: ${indexName}`, { collection });
    } catch (error) {
      logger.error(`Failed to rebuild index: ${indexName}`, error instanceof Error ? error : new Error(String(error)), { collection });
      throw error;
    }
  }

  /**
   * 获取索引定义
   */
  getIndexDefinition(collection: string, indexName: string): IndexDefinition | undefined {
    return ALL_INDEXES.find(idx => 
      idx.collection === collection && idx.name === indexName
    );
  }

  /**
   * 验证索引完整性
   */
  async validateIndexes(): Promise<{
    valid: boolean;
    missing: IndexDefinition[];
    extra: string[];
  }> {
    const missing: IndexDefinition[] = [];
    const extra: string[] = [];

    // 按集合分组检查
    const collectionGroups = new Map<string, IndexDefinition[]>();
    ALL_INDEXES.forEach(idx => {
      if (!collectionGroups.has(idx.collection)) {
        collectionGroups.set(idx.collection, []);
      }
      collectionGroups.get(idx.collection)!.push(idx);
    });

    for (const [collection, expectedIndexes] of collectionGroups) {
      try {
        const coll = this.db.collection(collection);
        const existingIndexes = await coll.indexes();
        const existingNames = existingIndexes.map((idx: any) => idx.name);

        // 检查缺失的索引
        for (const expectedIndex of expectedIndexes) {
          if (!existingNames.includes(expectedIndex.name)) {
            missing.push(expectedIndex);
          }
        }

        // 检查多余的索引（排除默认的_id索引）
        for (const existingName of existingNames) {
          if (existingName !== '_id_' && 
              !expectedIndexes.some(idx => idx.name === existingName)) {
            extra.push(`${collection}.${existingName}`);
          }
        }
      } catch (error) {
        logger.error(`Failed to validate indexes for collection: ${collection}`, error instanceof Error ? error : new Error(String(error)));
      }
    }

    return {
      valid: missing.length === 0 && extra.length === 0,
      missing,
      extra
    };
  }
}

export default IndexManager;