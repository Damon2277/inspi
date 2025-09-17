/**
 * 奖励配置管理服务
 * 负责管理奖励规则、活动奖励设置、审核机制等
 */

import { 
  RewardConfig, 
  RewardType, 
  RewardRule,
  RewardActivity,
  RewardApproval,
  RewardStatistics,
  InviteEventType
} from '../types'
import { DatabaseFactory } from '../database'
import { generateUUID } from '../utils'
import { logger } from '../../utils/logger'

export interface RewardConfigService {
  // 奖励规则配置
  getRewardRules(): Promise<RewardRule[]>
  createRewardRule(rule: Omit<RewardRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<RewardRule>
  updateRewardRule(id: string, updates: Partial<RewardRule>): Promise<RewardRule>
  deleteRewardRule(id: string): Promise<void>
  
  // 活动奖励设置
  getRewardActivities(): Promise<RewardActivity[]>
  createRewardActivity(activity: Omit<RewardActivity, 'id' | 'createdAt' | 'updatedAt'>): Promise<RewardActivity>
  updateRewardActivity(id: string, updates: Partial<RewardActivity>): Promise<RewardActivity>
  deleteRewardActivity(id: string): Promise<void>
  
  // 奖励审核机制
  getPendingApprovals(): Promise<RewardApproval[]>
  approveReward(approvalId: string, adminId: string, notes?: string): Promise<void>
  rejectReward(approvalId: string, adminId: string, reason: string): Promise<void>
  
  // 奖励统计报表
  getRewardStatistics(startDate: Date, endDate: Date): Promise<RewardStatistics>
  getRewardTrends(days: number): Promise<Array<{ date: string, count: number, amount: number }>>
  getTopRewardUsers(limit: number): Promise<Array<{ userId: string, userName: string, totalRewards: number }>>
}

export class RewardConfigServiceImpl implements RewardConfigService {
  private db = DatabaseFactory.getInstance()

  async getRewardRules(): Promise<RewardRule[]> {
    try {
      const query = `
        SELECT * FROM reward_rules 
        WHERE is_active = true 
        ORDER BY priority DESC, created_at DESC
      `
      const result = await this.db.query(query)
      return result.rows.map(this.mapRowToRewardRule)
    } catch (error) {
      logger.error('Failed to get reward rules:', error)
      throw new Error('Failed to get reward rules')
    }
  }

  async createRewardRule(rule: Omit<RewardRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<RewardRule> {
    try {
      const id = generateUUID()
      const now = new Date()
      
      const query = `
        INSERT INTO reward_rules (
          id, name, description, event_type, reward_type, 
          reward_amount, conditions, priority, is_active, 
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `
      
      const values = [
        id, rule.name, rule.description, rule.eventType, rule.rewardType,
        rule.rewardAmount, JSON.stringify(rule.conditions), rule.priority, 
        rule.isActive, now, now
      ]
      
      const result = await this.db.query(query, values)
      return this.mapRowToRewardRule(result.rows[0])
    } catch (error) {
      logger.error('Failed to create reward rule:', error)
      throw new Error('Failed to create reward rule')
    }
  }

  async updateRewardRule(id: string, updates: Partial<RewardRule>): Promise<RewardRule> {
    try {
      const setClause = []
      const values = []
      let paramIndex = 1

      if (updates.name !== undefined) {
        setClause.push(`name = $${paramIndex++}`)
        values.push(updates.name)
      }
      if (updates.description !== undefined) {
        setClause.push(`description = $${paramIndex++}`)
        values.push(updates.description)
      }
      if (updates.eventType !== undefined) {
        setClause.push(`event_type = $${paramIndex++}`)
        values.push(updates.eventType)
      }
      if (updates.rewardType !== undefined) {
        setClause.push(`reward_type = $${paramIndex++}`)
        values.push(updates.rewardType)
      }
      if (updates.rewardAmount !== undefined) {
        setClause.push(`reward_amount = $${paramIndex++}`)
        values.push(updates.rewardAmount)
      }
      if (updates.conditions !== undefined) {
        setClause.push(`conditions = $${paramIndex++}`)
        values.push(JSON.stringify(updates.conditions))
      }
      if (updates.priority !== undefined) {
        setClause.push(`priority = $${paramIndex++}`)
        values.push(updates.priority)
      }
      if (updates.isActive !== undefined) {
        setClause.push(`is_active = $${paramIndex++}`)
        values.push(updates.isActive)
      }

      setClause.push(`updated_at = $${paramIndex++}`)
      values.push(new Date())
      values.push(id)

      const query = `
        UPDATE reward_rules 
        SET ${setClause.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `

      const result = await this.db.query(query, values)
      if (result.rows.length === 0) {
        throw new Error('Reward rule not found')
      }

      return this.mapRowToRewardRule(result.rows[0])
    } catch (error) {
      logger.error('Failed to update reward rule:', error)
      throw new Error('Failed to update reward rule')
    }
  }

  async deleteRewardRule(id: string): Promise<void> {
    try {
      const query = `
        UPDATE reward_rules 
        SET is_active = false, updated_at = $1
        WHERE id = $2
      `
      await this.db.query(query, [new Date(), id])
    } catch (error) {
      logger.error('Failed to delete reward rule:', error)
      throw new Error('Failed to delete reward rule')
    }
  }

  async getRewardActivities(): Promise<RewardActivity[]> {
    try {
      const query = `
        SELECT * FROM reward_activities 
        WHERE is_active = true 
        ORDER BY start_date DESC
      `
      const result = await this.db.query(query)
      return result.rows.map(this.mapRowToRewardActivity)
    } catch (error) {
      logger.error('Failed to get reward activities:', error)
      throw new Error('Failed to get reward activities')
    }
  }

  async createRewardActivity(activity: Omit<RewardActivity, 'id' | 'createdAt' | 'updatedAt'>): Promise<RewardActivity> {
    try {
      const id = generateUUID()
      const now = new Date()
      
      const query = `
        INSERT INTO reward_activities (
          id, name, description, start_date, end_date, 
          reward_rules, target_metrics, is_active, 
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `
      
      const values = [
        id, activity.name, activity.description, activity.startDate, activity.endDate,
        JSON.stringify(activity.rewardRules), JSON.stringify(activity.targetMetrics), 
        activity.isActive, now, now
      ]
      
      const result = await this.db.query(query, values)
      return this.mapRowToRewardActivity(result.rows[0])
    } catch (error) {
      logger.error('Failed to create reward activity:', error)
      throw new Error('Failed to create reward activity')
    }
  }

  async updateRewardActivity(id: string, updates: Partial<RewardActivity>): Promise<RewardActivity> {
    try {
      const setClause = []
      const values = []
      let paramIndex = 1

      if (updates.name !== undefined) {
        setClause.push(`name = $${paramIndex++}`)
        values.push(updates.name)
      }
      if (updates.description !== undefined) {
        setClause.push(`description = $${paramIndex++}`)
        values.push(updates.description)
      }
      if (updates.startDate !== undefined) {
        setClause.push(`start_date = $${paramIndex++}`)
        values.push(updates.startDate)
      }
      if (updates.endDate !== undefined) {
        setClause.push(`end_date = $${paramIndex++}`)
        values.push(updates.endDate)
      }
      if (updates.rewardRules !== undefined) {
        setClause.push(`reward_rules = $${paramIndex++}`)
        values.push(JSON.stringify(updates.rewardRules))
      }
      if (updates.targetMetrics !== undefined) {
        setClause.push(`target_metrics = $${paramIndex++}`)
        values.push(JSON.stringify(updates.targetMetrics))
      }
      if (updates.isActive !== undefined) {
        setClause.push(`is_active = $${paramIndex++}`)
        values.push(updates.isActive)
      }

      setClause.push(`updated_at = $${paramIndex++}`)
      values.push(new Date())
      values.push(id)

      const query = `
        UPDATE reward_activities 
        SET ${setClause.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `

      const result = await this.db.query(query, values)
      if (result.rows.length === 0) {
        throw new Error('Reward activity not found')
      }

      return this.mapRowToRewardActivity(result.rows[0])
    } catch (error) {
      logger.error('Failed to update reward activity:', error)
      throw new Error('Failed to update reward activity')
    }
  }

  async deleteRewardActivity(id: string): Promise<void> {
    try {
      const query = `
        UPDATE reward_activities 
        SET is_active = false, updated_at = $1
        WHERE id = $2
      `
      await this.db.query(query, [new Date(), id])
    } catch (error) {
      logger.error('Failed to delete reward activity:', error)
      throw new Error('Failed to delete reward activity')
    }
  }

  async getPendingApprovals(): Promise<RewardApproval[]> {
    try {
      const query = `
        SELECT ra.*, u.name as user_name, u.email as user_email
        FROM reward_approvals ra
        JOIN users u ON ra.user_id = u.id
        WHERE ra.status = 'pending'
        ORDER BY ra.created_at ASC
      `
      const result = await this.db.query(query)
      return result.rows.map(this.mapRowToRewardApproval)
    } catch (error) {
      logger.error('Failed to get pending approvals:', error)
      throw new Error('Failed to get pending approvals')
    }
  }

  async approveReward(approvalId: string, adminId: string, notes?: string): Promise<void> {
    try {
      await this.db.transaction(async (client) => {
        // 更新审核状态
        const updateQuery = `
          UPDATE reward_approvals 
          SET status = 'approved', admin_id = $1, admin_notes = $2, 
              approved_at = $3, updated_at = $3
          WHERE id = $4
          RETURNING *
        `
        const now = new Date()
        const result = await client.query(updateQuery, [adminId, notes || '', now, approvalId])
        
        if (result.rows.length === 0) {
          throw new Error('Reward approval not found')
        }

        const approval = result.rows[0]
        
        // 发放奖励
        const rewardQuery = `
          INSERT INTO reward_records (
            id, user_id, reward_type, amount, source_type, 
            source_id, description, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `
        
        await client.query(rewardQuery, [
          generateUUID(),
          approval.user_id,
          approval.reward_type,
          approval.reward_amount,
          'admin_approval',
          approvalId,
          approval.description,
          now
        ])
      })
    } catch (error) {
      logger.error('Failed to approve reward:', error)
      throw new Error('Failed to approve reward')
    }
  }

  async rejectReward(approvalId: string, adminId: string, reason: string): Promise<void> {
    try {
      const query = `
        UPDATE reward_approvals 
        SET status = 'rejected', admin_id = $1, admin_notes = $2, 
            rejected_at = $3, updated_at = $3
        WHERE id = $4
      `
      const now = new Date()
      await this.db.query(query, [adminId, reason, now, approvalId])
    } catch (error) {
      logger.error('Failed to reject reward:', error)
      throw new Error('Failed to reject reward')
    }
  }

  async getRewardStatistics(startDate: Date, endDate: Date): Promise<RewardStatistics> {
    try {
      const query = `
        SELECT 
          reward_type,
          COUNT(*) as count,
          SUM(amount) as total_amount,
          AVG(amount) as avg_amount
        FROM reward_records 
        WHERE created_at >= $1 AND created_at <= $2
        GROUP BY reward_type
      `
      
      const result = await this.db.query(query, [startDate, endDate])
      
      const statistics: RewardStatistics = {
        totalRewards: 0,
        totalAmount: 0,
        byType: {},
        period: { start: startDate, end: endDate }
      }
      
      result.rows.forEach(row => {
        statistics.totalRewards += parseInt(row.count)
        statistics.totalAmount += parseFloat(row.total_amount)
        statistics.byType[row.reward_type] = {
          count: parseInt(row.count),
          totalAmount: parseFloat(row.total_amount),
          avgAmount: parseFloat(row.avg_amount)
        }
      })
      
      return statistics
    } catch (error) {
      logger.error('Failed to get reward statistics:', error)
      throw new Error('Failed to get reward statistics')
    }
  }

  async getRewardTrends(days: number): Promise<Array<{ date: string, count: number, amount: number }>> {
    try {
      const query = `
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count,
          SUM(amount) as amount
        FROM reward_records 
        WHERE created_at >= NOW() - INTERVAL '${days} days'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `
      
      const result = await this.db.query(query)
      return result.rows.map(row => ({
        date: row.date,
        count: parseInt(row.count),
        amount: parseFloat(row.amount)
      }))
    } catch (error) {
      logger.error('Failed to get reward trends:', error)
      throw new Error('Failed to get reward trends')
    }
  }

  async getTopRewardUsers(limit: number): Promise<Array<{ userId: string, userName: string, totalRewards: number }>> {
    try {
      const query = `
        SELECT 
          rr.user_id,
          u.name as user_name,
          SUM(rr.amount) as total_rewards
        FROM reward_records rr
        JOIN users u ON rr.user_id = u.id
        GROUP BY rr.user_id, u.name
        ORDER BY total_rewards DESC
        LIMIT $1
      `
      
      const result = await this.db.query(query, [limit])
      return result.rows.map(row => ({
        userId: row.user_id,
        userName: row.user_name,
        totalRewards: parseFloat(row.total_rewards)
      }))
    } catch (error) {
      logger.error('Failed to get top reward users:', error)
      throw new Error('Failed to get top reward users')
    }
  }

  private mapRowToRewardRule(row: any): RewardRule {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      eventType: row.event_type as InviteEventType,
      rewardType: row.reward_type as RewardType,
      rewardAmount: row.reward_amount,
      conditions: JSON.parse(row.conditions || '{}'),
      priority: row.priority,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  private mapRowToRewardActivity(row: any): RewardActivity {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      startDate: row.start_date,
      endDate: row.end_date,
      rewardRules: JSON.parse(row.reward_rules || '[]'),
      targetMetrics: JSON.parse(row.target_metrics || '{}'),
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  private mapRowToRewardApproval(row: any): RewardApproval {
    return {
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      userEmail: row.user_email,
      rewardType: row.reward_type as RewardType,
      rewardAmount: row.reward_amount,
      description: row.description,
      status: row.status,
      adminId: row.admin_id,
      adminNotes: row.admin_notes,
      createdAt: row.created_at,
      approvedAt: row.approved_at,
      rejectedAt: row.rejected_at,
      updatedAt: row.updated_at
    }
  }
}