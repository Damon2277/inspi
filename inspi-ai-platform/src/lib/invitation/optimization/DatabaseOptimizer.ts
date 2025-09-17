/**
 * 数据库查询优化器
 * 优化邀请系统的数据库查询性能
 */

import { DatabasePool } from '../database'
import { logger } from '@/lib/utils/logger'
import { Pagination } from '../types'

export interface QueryOptimizationConfig {
  enableQueryCache: boolean
  enableIndexHints: boolean
  enableBatchOperations: boolean
  maxBatchSize: number
  slowQueryThreshold: number // 慢查询阈值（毫秒）
}

export interface QueryMetrics {
  queryTime: number
  rowsAffected: number
  rowsExamined?: number
  indexesUsed?: string[]
}

export interface OptimizedQuery {
  sql: string
  params: any[]
  hints?: string[]
  cacheKey?: string
  cacheTTL?: number
}

export class DatabaseOptimizer {
  private db: DatabasePool
  private config: QueryOptimizationConfig
  private queryCache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map()
  private queryMetrics: Map<string, QueryMetrics[]> = new Map()

  constructor(db: DatabasePool, config: QueryOptimizationConfig) {
    this.db = db
    this.config = config
    this.startMetricsCleanup()
  }

  /**
   * 启动指标清理定时器
   */
  private startMetricsCleanup(): void {
    setInterval(() => {
      this.cleanupOldMetrics()
    }, 300000) // 每5分钟清理一次
  }

  /**
   * 清理旧的查询指标
   */
  private cleanupOldMetrics(): void {
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000 // 24小时前
    
    for (const [query, metrics] of this.queryMetrics.entries()) {
      const recentMetrics = metrics.filter(m => m.queryTime > cutoffTime)
      if (recentMetrics.length === 0) {
        this.queryMetrics.delete(query)
      } else {
        this.queryMetrics.set(query, recentMetrics)
      }
    }
  }

  /**
   * 记录查询指标
   */
  private recordQueryMetrics(query: string, metrics: QueryMetrics): void {
    if (!this.queryMetrics.has(query)) {
      this.queryMetrics.set(query, [])
    }
    
    const queryMetrics = this.queryMetrics.get(query)!
    queryMetrics.push(metrics)
    
    // 保持最近100条记录
    if (queryMetrics.length > 100) {
      queryMetrics.splice(0, queryMetrics.length - 100)
    }

    // 记录慢查询
    if (metrics.queryTime > this.config.slowQueryThreshold) {
      logger.warn('Slow query detected', {
        query: query.substring(0, 200),
        queryTime: metrics.queryTime,
        rowsAffected: metrics.rowsAffected
      })
    }
  }

  /**
   * 优化邀请码查询
   */
  optimizeInviteCodeQuery(code: string): OptimizedQuery {
    const baseQuery = `
      SELECT ic.*, COUNT(ir.id) as usage_count
      FROM invite_codes ic
      LEFT JOIN invite_registrations ir ON ic.id = ir.invite_code_id
      WHERE ic.code = ? AND ic.is_active = 1
      GROUP BY ic.id
    `

    const hints = []
    if (this.config.enableIndexHints) {
      hints.push('USE INDEX (idx_code_active)')
    }

    return {
      sql: hints.length > 0 ? `${baseQuery} ${hints.join(' ')}` : baseQuery,
      params: [code],
      hints,
      cacheKey: `invite_code:${code}`,
      cacheTTL: 300 // 5分钟缓存
    }
  }

  /**
   * 优化用户统计查询
   */
  optimizeUserStatsQuery(userId: string): OptimizedQuery {
    const baseQuery = `
      SELECT 
        COUNT(DISTINCT ic.id) as total_invites,
        COUNT(DISTINCT ir.id) as successful_registrations,
        COUNT(DISTINCT CASE WHEN ir.is_activated = 1 THEN ir.id END) as active_invitees,
        COALESCE(SUM(rr.reward_amount), 0) as total_rewards_earned
      FROM invite_codes ic
      LEFT JOIN invite_registrations ir ON ic.id = ir.invite_code_id
      LEFT JOIN reward_records rr ON rr.user_id = ic.inviter_id AND rr.source_type IN ('invite_registration', 'invite_activation')
      WHERE ic.inviter_id = ?
    `

    const hints = []
    if (this.config.enableIndexHints) {
      hints.push('USE INDEX (idx_inviter_id)')
    }

    return {
      sql: hints.length > 0 ? `${baseQuery} ${hints.join(' ')}` : baseQuery,
      params: [userId],
      hints,
      cacheKey: `user_stats:${userId}`,
      cacheTTL: 600 // 10分钟缓存
    }
  }

  /**
   * 优化排行榜查询
   */
  optimizeLeaderboardQuery(limit: number = 50, offset: number = 0): OptimizedQuery {
    const baseQuery = `
      SELECT 
        ic.inviter_id as user_id,
        COUNT(DISTINCT ir.id) as invite_count,
        COUNT(DISTINCT CASE WHEN ir.is_activated = 1 THEN ir.id END) as active_count,
        COALESCE(SUM(rr.reward_amount), 0) as total_rewards,
        ROW_NUMBER() OVER (ORDER BY COUNT(DISTINCT ir.id) DESC, COUNT(DISTINCT CASE WHEN ir.is_activated = 1 THEN ir.id END) DESC) as rank
      FROM invite_codes ic
      LEFT JOIN invite_registrations ir ON ic.id = ir.invite_code_id
      LEFT JOIN reward_records rr ON rr.user_id = ic.inviter_id
      WHERE ic.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY ic.inviter_id
      HAVING invite_count > 0
      ORDER BY invite_count DESC, active_count DESC
      LIMIT ? OFFSET ?
    `

    const hints = []
    if (this.config.enableIndexHints) {
      hints.push('USE INDEX (idx_inviter_created)')
    }

    return {
      sql: hints.length > 0 ? `${baseQuery} ${hints.join(' ')}` : baseQuery,
      params: [limit, offset],
      hints,
      cacheKey: `leaderboard:${limit}:${offset}`,
      cacheTTL: 900 // 15分钟缓存
    }
  }

  /**
   * 优化奖励记录查询
   */
  optimizeRewardRecordsQuery(userId: string, pagination: Pagination): OptimizedQuery {
    const { page, limit } = pagination
    const offset = (page - 1) * limit

    const baseQuery = `
      SELECT rr.*, ic.code as invite_code
      FROM reward_records rr
      LEFT JOIN invite_registrations ir ON rr.source_id = ir.id
      LEFT JOIN invite_codes ic ON ir.invite_code_id = ic.id
      WHERE rr.user_id = ?
      ORDER BY rr.granted_at DESC
      LIMIT ? OFFSET ?
    `

    const hints = []
    if (this.config.enableIndexHints) {
      hints.push('USE INDEX (idx_user_granted)')
    }

    return {
      sql: hints.length > 0 ? `${baseQuery} ${hints.join(' ')}` : baseQuery,
      params: [userId, limit, offset],
      hints,
      cacheKey: `user_rewards:${userId}:${page}:${limit}`,
      cacheTTL: 300 // 5分钟缓存
    }
  }

  /**
   * 执行优化查询
   */
  async executeOptimizedQuery<T>(optimizedQuery: OptimizedQuery): Promise<T[]> {
    const startTime = Date.now()

    try {
      // 检查缓存
      if (this.config.enableQueryCache && optimizedQuery.cacheKey) {
        const cached = this.queryCache.get(optimizedQuery.cacheKey)
        if (cached && Date.now() - cached.timestamp < cached.ttl * 1000) {
          logger.debug('Query cache hit', { cacheKey: optimizedQuery.cacheKey })
          return cached.data
        }
      }

      // 执行查询
      const result = await this.db.query<T>(optimizedQuery.sql, optimizedQuery.params)
      const queryTime = Date.now() - startTime

      // 记录指标
      this.recordQueryMetrics(optimizedQuery.sql, {
        queryTime,
        rowsAffected: result.length
      })

      // 缓存结果
      if (this.config.enableQueryCache && optimizedQuery.cacheKey && optimizedQuery.cacheTTL) {
        this.queryCache.set(optimizedQuery.cacheKey, {
          data: result,
          timestamp: Date.now(),
          ttl: optimizedQuery.cacheTTL
        })
      }

      return result
    } catch (error) {
      const queryTime = Date.now() - startTime
      logger.error('Optimized query failed', {
        sql: optimizedQuery.sql.substring(0, 200),
        queryTime,
        error
      })
      throw error
    }
  }

  /**
   * 批量插入优化
   */
  async batchInsert(table: string, records: any[], batchSize?: number): Promise<void> {
    if (!this.config.enableBatchOperations) {
      // 逐条插入
      for (const record of records) {
        await this.insertSingle(table, record)
      }
      return
    }

    const actualBatchSize = batchSize || this.config.maxBatchSize
    const batches = this.chunkArray(records, actualBatchSize)

    for (const batch of batches) {
      await this.insertBatch(table, batch)
    }
  }

  /**
   * 单条插入
   */
  private async insertSingle(table: string, record: any): Promise<void> {
    const columns = Object.keys(record)
    const placeholders = columns.map(() => '?').join(', ')
    const values = columns.map(col => record[col])

    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`
    await this.db.execute(sql, values)
  }

  /**
   * 批量插入
   */
  private async insertBatch(table: string, records: any[]): Promise<void> {
    if (records.length === 0) return

    const columns = Object.keys(records[0])
    const placeholders = records.map(() => `(${columns.map(() => '?').join(', ')})`).join(', ')
    const values = records.flatMap(record => columns.map(col => record[col]))

    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${placeholders}`
    
    const startTime = Date.now()
    await this.db.execute(sql, values)
    const queryTime = Date.now() - startTime

    this.recordQueryMetrics(sql, {
      queryTime,
      rowsAffected: records.length
    })

    logger.debug('Batch insert completed', {
      table,
      recordCount: records.length,
      queryTime
    })
  }

  /**
   * 批量更新优化
   */
  async batchUpdate(table: string, updates: Array<{ where: any; set: any }>, batchSize?: number): Promise<void> {
    if (!this.config.enableBatchOperations) {
      // 逐条更新
      for (const update of updates) {
        await this.updateSingle(table, update.set, update.where)
      }
      return
    }

    const actualBatchSize = batchSize || this.config.maxBatchSize
    const batches = this.chunkArray(updates, actualBatchSize)

    for (const batch of batches) {
      await this.updateBatch(table, batch)
    }
  }

  /**
   * 单条更新
   */
  private async updateSingle(table: string, set: any, where: any): Promise<void> {
    const setClause = Object.keys(set).map(col => `${col} = ?`).join(', ')
    const whereClause = Object.keys(where).map(col => `${col} = ?`).join(' AND ')
    const values = [...Object.values(set), ...Object.values(where)]

    const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`
    await this.db.execute(sql, values)
  }

  /**
   * 批量更新（使用CASE WHEN）
   */
  private async updateBatch(table: string, updates: Array<{ where: any; set: any }>): Promise<void> {
    if (updates.length === 0) return

    // 构建批量更新SQL（使用CASE WHEN语句）
    const setColumns = Object.keys(updates[0].set)
    const whereColumns = Object.keys(updates[0].where)
    
    const setClauses = setColumns.map(col => {
      const cases = updates.map((update, index) => {
        const condition = whereColumns.map(whereCol => `${whereCol} = ?`).join(' AND ')
        return `WHEN ${condition} THEN ?`
      }).join(' ')
      
      return `${col} = CASE ${cases} ELSE ${col} END`
    })

    const whereConditions = updates.map(update => {
      return `(${whereColumns.map(col => `${col} = ?`).join(' AND ')})`
    }).join(' OR ')

    // 构建参数数组
    const params: any[] = []
    
    // 为每个SET列添加参数
    setColumns.forEach(col => {
      updates.forEach(update => {
        whereColumns.forEach(whereCol => params.push(update.where[whereCol]))
        params.push(update.set[col])
      })
    })
    
    // 添加WHERE条件参数
    updates.forEach(update => {
      whereColumns.forEach(col => params.push(update.where[col]))
    })

    const sql = `UPDATE ${table} SET ${setClauses.join(', ')} WHERE ${whereConditions}`
    
    const startTime = Date.now()
    await this.db.execute(sql, params)
    const queryTime = Date.now() - startTime

    this.recordQueryMetrics(sql, {
      queryTime,
      rowsAffected: updates.length
    })

    logger.debug('Batch update completed', {
      table,
      updateCount: updates.length,
      queryTime
    })
  }

  /**
   * 数组分块
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize))
    }
    return chunks
  }

  /**
   * 创建推荐的数据库索引
   */
  async createRecommendedIndexes(): Promise<void> {
    const indexes = [
      // 邀请码表索引
      'CREATE INDEX IF NOT EXISTS idx_invite_codes_code_active ON invite_codes (code, is_active)',
      'CREATE INDEX IF NOT EXISTS idx_invite_codes_inviter_created ON invite_codes (inviter_id, created_at)',
      'CREATE INDEX IF NOT EXISTS idx_invite_codes_expires_at ON invite_codes (expires_at)',
      
      // 邀请注册表索引
      'CREATE INDEX IF NOT EXISTS idx_invite_registrations_code_id ON invite_registrations (invite_code_id)',
      'CREATE INDEX IF NOT EXISTS idx_invite_registrations_inviter_id ON invite_registrations (inviter_id)',
      'CREATE INDEX IF NOT EXISTS idx_invite_registrations_invitee_id ON invite_registrations (invitee_id)',
      'CREATE INDEX IF NOT EXISTS idx_invite_registrations_registered_at ON invite_registrations (registered_at)',
      'CREATE INDEX IF NOT EXISTS idx_invite_registrations_activated ON invite_registrations (is_activated, activated_at)',
      
      // 奖励记录表索引
      'CREATE INDEX IF NOT EXISTS idx_reward_records_user_granted ON reward_records (user_id, granted_at)',
      'CREATE INDEX IF NOT EXISTS idx_reward_records_source ON reward_records (source_type, source_id)',
      'CREATE INDEX IF NOT EXISTS idx_reward_records_type_amount ON reward_records (reward_type, reward_amount)',
      
      // 防作弊表索引
      'CREATE INDEX IF NOT EXISTS idx_fraud_detection_logs_ip_time ON fraud_detection_logs (ip_address, created_at)',
      'CREATE INDEX IF NOT EXISTS idx_fraud_detection_logs_user_time ON fraud_detection_logs (user_id, created_at)',
      
      // 通知表索引
      'CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications (user_id, created_at)',
      'CREATE INDEX IF NOT EXISTS idx_notifications_type_status ON notifications (type, status)',
      
      // 邀请统计表索引
      'CREATE INDEX IF NOT EXISTS idx_invite_stats_user_updated ON invite_stats (user_id, last_updated)'
    ]

    for (const indexSql of indexes) {
      try {
        await this.db.execute(indexSql)
        logger.info('Index created successfully', { sql: indexSql.substring(0, 100) })
      } catch (error) {
        logger.error('Failed to create index', { sql: indexSql.substring(0, 100), error })
      }
    }
  }

  /**
   * 分析查询性能
   */
  async analyzeQueryPerformance(): Promise<{
    slowQueries: Array<{ query: string; avgTime: number; count: number }>
    totalQueries: number
    avgQueryTime: number
    cacheHitRate: number
  }> {
    const slowQueries: Array<{ query: string; avgTime: number; count: number }> = []
    let totalQueries = 0
    let totalTime = 0

    for (const [query, metrics] of this.queryMetrics.entries()) {
      const avgTime = metrics.reduce((sum, m) => sum + m.queryTime, 0) / metrics.length
      totalQueries += metrics.length
      totalTime += metrics.reduce((sum, m) => sum + m.queryTime, 0)

      if (avgTime > this.config.slowQueryThreshold) {
        slowQueries.push({
          query: query.substring(0, 200),
          avgTime,
          count: metrics.length
        })
      }
    }

    const avgQueryTime = totalQueries > 0 ? totalTime / totalQueries : 0
    const cacheHitRate = 0 // 这里需要实际的缓存命中率统计

    return {
      slowQueries: slowQueries.sort((a, b) => b.avgTime - a.avgTime),
      totalQueries,
      avgQueryTime,
      cacheHitRate
    }
  }

  /**
   * 清理查询缓存
   */
  clearQueryCache(): void {
    this.queryCache.clear()
    logger.info('Query cache cleared')
  }

  /**
   * 获取优化器统计信息
   */
  getOptimizerStats(): {
    cacheSize: number
    metricsCount: number
    config: QueryOptimizationConfig
  } {
    return {
      cacheSize: this.queryCache.size,
      metricsCount: Array.from(this.queryMetrics.values()).reduce((sum, metrics) => sum + metrics.length, 0),
      config: this.config
    }
  }
}