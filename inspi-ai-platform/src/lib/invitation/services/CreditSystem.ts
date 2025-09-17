/**
 * 积分系统服务
 * 管理用户AI生成积分的获取、使用和过期
 */

import { DatabaseFactory } from '../database'
import { generateUUID } from '../utils'
import { logger } from '../../utils/logger'

// 积分记录
export interface CreditRecord {
  id: string
  userId: string
  amount: number
  type: CreditType
  source: CreditSource
  sourceId: string
  description: string
  expiresAt?: Date
  createdAt: Date
  usedAt?: Date
}

// 积分类型
export enum CreditType {
  EARNED = 'earned',    // 获得积分
  USED = 'used',        // 使用积分
  EXPIRED = 'expired',  // 过期积分
  REFUNDED = 'refunded' // 退还积分
}

// 积分来源
export enum CreditSource {
  INVITE_REWARD = 'invite_reward',      // 邀请奖励
  MILESTONE_REWARD = 'milestone_reward', // 里程碑奖励
  ACTIVITY_REWARD = 'activity_reward',   // 活动奖励
  PURCHASE = 'purchase',                 // 购买
  ADMIN_GRANT = 'admin_grant',          // 管理员发放
  SYSTEM_REFUND = 'system_refund'       // 系统退还
}

// 用户积分余额
export interface UserCreditBalance {
  userId: string
  totalEarned: number
  totalUsed: number
  totalExpired: number
  availableCredits: number
  expiringCredits: number // 30天内过期的积分
  lastUpdated: Date
}

// 积分使用记录
export interface CreditUsage {
  id: string
  userId: string
  amount: number
  purpose: string
  metadata?: Record<string, any>
  createdAt: Date
}

export interface CreditSystemService {
  // 积分管理
  addCredits(userId: string, amount: number, source: CreditSource, sourceId: string, description: string, expiresAt?: Date): Promise<CreditRecord>
  useCredits(userId: string, amount: number, purpose: string, metadata?: Record<string, any>): Promise<boolean>
  
  // 余额查询
  getUserBalance(userId: string): Promise<UserCreditBalance>
  getAvailableCredits(userId: string): Promise<number>
  
  // 记录查询
  getUserCreditHistory(userId: string, limit?: number): Promise<CreditRecord[]>
  getCreditUsageHistory(userId: string, limit?: number): Promise<CreditUsage[]>
  
  // 过期处理
  expireCredits(): Promise<number>
  getExpiringCredits(userId: string, days?: number): Promise<CreditRecord[]>
  
  // 统计
  getCreditStats(userId: string): Promise<{
    totalEarned: number
    totalUsed: number
    totalExpired: number
    averageDaily: number
    topSources: Array<{ source: CreditSource, amount: number }>
  }>
}

export class CreditSystemServiceImpl implements CreditSystemService {
  private db = DatabaseFactory.getInstance()

  async addCredits(
    userId: string, 
    amount: number, 
    source: CreditSource, 
    sourceId: string, 
    description: string, 
    expiresAt?: Date
  ): Promise<CreditRecord> {
    try {
      const creditId = generateUUID()
      const createdAt = new Date()

      // 默认6个月过期
      const defaultExpiresAt = expiresAt || new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000)

      await this.db.execute(
        `INSERT INTO credit_records 
         (id, user_id, amount, type, source, source_id, description, expires_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          creditId,
          userId,
          amount,
          CreditType.EARNED,
          source,
          sourceId,
          description,
          defaultExpiresAt,
          createdAt
        ]
      )

      // 更新用户积分余额缓存
      await this.updateUserBalance(userId)

      const creditRecord: CreditRecord = {
        id: creditId,
        userId,
        amount,
        type: CreditType.EARNED,
        source,
        sourceId,
        description,
        expiresAt: defaultExpiresAt,
        createdAt
      }

      logger.info('Credits added to user', { userId, amount, source, description })
      return creditRecord

    } catch (error) {
      logger.error('Failed to add credits', { userId, amount, source, error })
      throw error
    }
  }

  async useCredits(userId: string, amount: number, purpose: string, metadata?: Record<string, any>): Promise<boolean> {
    return await this.db.transaction(async (connection) => {
      try {
        // 检查可用积分
        const availableCredits = await this.getAvailableCredits(userId)
        if (availableCredits < amount) {
          logger.warn('Insufficient credits', { userId, requested: amount, available: availableCredits })
          return false
        }

        // 按过期时间顺序使用积分（先过期先使用）
        const earnedCredits = await connection.query<any>(
          `SELECT * FROM credit_records 
           WHERE user_id = ? AND type = ? AND used_at IS NULL AND expires_at > NOW()
           ORDER BY expires_at ASC`,
          [userId, CreditType.EARNED]
        )

        let remainingAmount = amount
        const usageId = generateUUID()
        const usedAt = new Date()

        for (const credit of earnedCredits) {
          if (remainingAmount <= 0) break

          const useAmount = Math.min(remainingAmount, credit.amount)
          
          // 记录积分使用
          await connection.execute(
            `INSERT INTO credit_records 
             (id, user_id, amount, type, source, source_id, description, created_at, used_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              generateUUID(),
              userId,
              -useAmount, // 负数表示使用
              CreditType.USED,
              credit.source,
              credit.source_id,
              `使用积分: ${purpose}`,
              usedAt,
              usedAt
            ]
          )

          // 更新原积分记录的使用时间
          if (useAmount === credit.amount) {
            // 完全使用
            await connection.execute(
              'UPDATE credit_records SET used_at = ? WHERE id = ?',
              [usedAt, credit.id]
            )
          } else {
            // 部分使用，需要拆分记录
            await connection.execute(
              'UPDATE credit_records SET amount = ? WHERE id = ?',
              [credit.amount - useAmount, credit.id]
            )
          }

          remainingAmount -= useAmount
        }

        // 记录使用详情
        await connection.execute(
          `INSERT INTO credit_usage 
           (id, user_id, amount, purpose, metadata, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            usageId,
            userId,
            amount,
            purpose,
            metadata ? JSON.stringify(metadata) : null,
            usedAt
          ]
        )

        // 更新用户积分余额缓存
        await this.updateUserBalance(userId)

        logger.info('Credits used successfully', { userId, amount, purpose })
        return true

      } catch (error) {
        logger.error('Failed to use credits', { userId, amount, purpose, error })
        throw error
      }
    })
  }

  async getUserBalance(userId: string): Promise<UserCreditBalance> {
    try {
      // 先尝试从缓存获取
      const cached = await this.db.query<any>(
        'SELECT * FROM user_credit_balances WHERE user_id = ?',
        [userId]
      )

      if (cached.length > 0) {
        const balance = cached[0]
        return {
          userId: balance.user_id,
          totalEarned: balance.total_earned,
          totalUsed: balance.total_used,
          totalExpired: balance.total_expired,
          availableCredits: balance.available_credits,
          expiringCredits: balance.expiring_credits,
          lastUpdated: balance.last_updated
        }
      }

      // 缓存不存在，重新计算
      await this.updateUserBalance(userId)
      return await this.getUserBalance(userId)

    } catch (error) {
      logger.error('Failed to get user balance', { userId, error })
      throw error
    }
  }

  async getAvailableCredits(userId: string): Promise<number> {
    try {
      const [result] = await this.db.query<{ available: number }>(
        `SELECT COALESCE(SUM(CASE 
           WHEN type = ? AND used_at IS NULL AND expires_at > NOW() THEN amount
           ELSE 0 
         END), 0) as available
         FROM credit_records 
         WHERE user_id = ?`,
        [CreditType.EARNED, userId]
      )

      return result.available

    } catch (error) {
      logger.error('Failed to get available credits', { userId, error })
      throw error
    }
  }

  async getUserCreditHistory(userId: string, limit: number = 50): Promise<CreditRecord[]> {
    try {
      const results = await this.db.query<any>(
        `SELECT * FROM credit_records 
         WHERE user_id = ? 
         ORDER BY created_at DESC 
         LIMIT ?`,
        [userId, limit]
      )

      return results.map(row => ({
        id: row.id,
        userId: row.user_id,
        amount: row.amount,
        type: row.type,
        source: row.source,
        sourceId: row.source_id,
        description: row.description,
        expiresAt: row.expires_at,
        createdAt: row.created_at,
        usedAt: row.used_at
      }))

    } catch (error) {
      logger.error('Failed to get user credit history', { userId, error })
      throw error
    }
  }

  async getCreditUsageHistory(userId: string, limit: number = 50): Promise<CreditUsage[]> {
    try {
      const results = await this.db.query<any>(
        `SELECT * FROM credit_usage 
         WHERE user_id = ? 
         ORDER BY created_at DESC 
         LIMIT ?`,
        [userId, limit]
      )

      return results.map(row => ({
        id: row.id,
        userId: row.user_id,
        amount: row.amount,
        purpose: row.purpose,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
        createdAt: row.created_at
      }))

    } catch (error) {
      logger.error('Failed to get credit usage history', { userId, error })
      throw error
    }
  }

  async expireCredits(): Promise<number> {
    try {
      // 查找过期的积分
      const expiredCredits = await this.db.query<any>(
        `SELECT * FROM credit_records 
         WHERE type = ? AND used_at IS NULL AND expires_at <= NOW()`,
        [CreditType.EARNED]
      )

      let expiredCount = 0

      for (const credit of expiredCredits) {
        // 创建过期记录
        await this.db.execute(
          `INSERT INTO credit_records 
           (id, user_id, amount, type, source, source_id, description, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            generateUUID(),
            credit.user_id,
            -credit.amount,
            CreditType.EXPIRED,
            credit.source,
            credit.source_id,
            `积分过期: ${credit.description}`,
            new Date()
          ]
        )

        // 标记原记录为已使用（过期）
        await this.db.execute(
          'UPDATE credit_records SET used_at = NOW() WHERE id = ?',
          [credit.id]
        )

        expiredCount++

        // 更新用户余额
        await this.updateUserBalance(credit.user_id)
      }

      logger.info('Credits expired', { expiredCount })
      return expiredCount

    } catch (error) {
      logger.error('Failed to expire credits', { error })
      throw error
    }
  }

  async getExpiringCredits(userId: string, days: number = 30): Promise<CreditRecord[]> {
    try {
      const expiryDate = new Date()
      expiryDate.setDate(expiryDate.getDate() + days)

      const results = await this.db.query<any>(
        `SELECT * FROM credit_records 
         WHERE user_id = ? AND type = ? AND used_at IS NULL 
         AND expires_at BETWEEN NOW() AND ?
         ORDER BY expires_at ASC`,
        [userId, CreditType.EARNED, expiryDate]
      )

      return results.map(row => ({
        id: row.id,
        userId: row.user_id,
        amount: row.amount,
        type: row.type,
        source: row.source,
        sourceId: row.source_id,
        description: row.description,
        expiresAt: row.expires_at,
        createdAt: row.created_at,
        usedAt: row.used_at
      }))

    } catch (error) {
      logger.error('Failed to get expiring credits', { userId, days, error })
      throw error
    }
  }

  async getCreditStats(userId: string): Promise<{
    totalEarned: number
    totalUsed: number
    totalExpired: number
    averageDaily: number
    topSources: Array<{ source: CreditSource, amount: number }>
  }> {
    try {
      // 总获得积分
      const [earnedResult] = await this.db.query<{ total: number }>(
        `SELECT COALESCE(SUM(amount), 0) as total 
         FROM credit_records 
         WHERE user_id = ? AND type = ?`,
        [userId, CreditType.EARNED]
      )

      // 总使用积分
      const [usedResult] = await this.db.query<{ total: number }>(
        `SELECT COALESCE(SUM(ABS(amount)), 0) as total 
         FROM credit_records 
         WHERE user_id = ? AND type = ?`,
        [userId, CreditType.USED]
      )

      // 总过期积分
      const [expiredResult] = await this.db.query<{ total: number }>(
        `SELECT COALESCE(SUM(ABS(amount)), 0) as total 
         FROM credit_records 
         WHERE user_id = ? AND type = ?`,
        [userId, CreditType.EXPIRED]
      )

      // 计算日均获得积分
      const [firstRecord] = await this.db.query<{ first_date: Date }>(
        `SELECT MIN(created_at) as first_date 
         FROM credit_records 
         WHERE user_id = ? AND type = ?`,
        [userId, CreditType.EARNED]
      )

      let averageDaily = 0
      if (firstRecord.first_date) {
        const daysSinceFirst = Math.max(1, Math.floor((Date.now() - firstRecord.first_date.getTime()) / (24 * 60 * 60 * 1000)))
        averageDaily = earnedResult.total / daysSinceFirst
      }

      // 按来源统计
      const sourceStats = await this.db.query<{ source: CreditSource, amount: number }>(
        `SELECT source, SUM(amount) as amount 
         FROM credit_records 
         WHERE user_id = ? AND type = ? 
         GROUP BY source 
         ORDER BY amount DESC 
         LIMIT 5`,
        [userId, CreditType.EARNED]
      )

      return {
        totalEarned: earnedResult.total,
        totalUsed: usedResult.total,
        totalExpired: expiredResult.total,
        averageDaily: Math.round(averageDaily * 100) / 100,
        topSources: sourceStats
      }

    } catch (error) {
      logger.error('Failed to get credit stats', { userId, error })
      throw error
    }
  }

  // 私有方法：更新用户积分余额缓存
  private async updateUserBalance(userId: string): Promise<void> {
    try {
      const balance = await this.getUserBalance(userId)
      const availableCredits = await this.getAvailableCredits(userId)
      const expiringCredits = await this.getExpiringCredits(userId, 30)
      const expiringAmount = expiringCredits.reduce((sum, credit) => sum + credit.amount, 0)

      await this.db.execute(
        `INSERT INTO user_credit_balances 
         (user_id, total_earned, total_used, total_expired, available_credits, expiring_credits, last_updated)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         total_earned = VALUES(total_earned),
         total_used = VALUES(total_used),
         total_expired = VALUES(total_expired),
         available_credits = VALUES(available_credits),
         expiring_credits = VALUES(expiring_credits),
         last_updated = VALUES(last_updated)`,
        [
          userId,
          balance.totalEarned || 0,
          balance.totalUsed || 0,
          balance.totalExpired || 0,
          availableCredits,
          expiringAmount,
          new Date()
        ]
      )

    } catch (error) {
      logger.error('Failed to update user balance cache', { userId, error })
      // 不抛出错误，避免影响主流程
    }
  }
}