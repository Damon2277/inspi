/**
 * 邀请管理服务实现
 */

import { 
  InviteCode, 
  InviteValidation, 
  InviteResult, 
  InviteStats, 
  InviteHistory, 
  Pagination,
  InviteErrorCode,
  InviteError,
  InviteRegistration
} from '../types'
import { 
  InviteCodeModel, 
  InviteRegistrationModel, 
  InviteStatsModel,
  ModelConverter 
} from '../models'
import { DatabaseFactory } from '../database'
import { 
  generateInviteCode as generateCode, 
  generateUUID, 
  validateInviteCodeFormat,
  calculateExpiryDate,
  isInviteCodeExpired,
  createInviteError
} from '../utils'
import { logger } from '../../utils/logger'

export interface InvitationService {
  // 生成邀请码
  generateInviteCode(userId: string): Promise<InviteCode>
  
  // 验证邀请码
  validateInviteCode(code: string): Promise<InviteValidation>
  
  // 处理邀请注册
  processInviteRegistration(code: string, newUserId: string): Promise<InviteResult>
  
  // 获取用户邀请统计
  getUserInviteStats(userId: string): Promise<InviteStats>
  
  // 获取邀请历史
  getInviteHistory(userId: string, pagination: Pagination): Promise<InviteHistory[]>
  
  // 获取用户的邀请码列表
  getUserInviteCodes(userId: string): Promise<InviteCode[]>
  
  // 停用邀请码
  deactivateInviteCode(codeId: string, userId: string): Promise<boolean>
}

export class InvitationServiceImpl implements InvitationService {
  private db = DatabaseFactory.getInstance()

  async generateInviteCode(userId: string): Promise<InviteCode> {
    try {
      // 生成唯一邀请码
      let code: string
      let isUnique = false
      let attempts = 0
      const maxAttempts = 10

      do {
        code = generateCode()
        attempts++
        
        // 检查邀请码是否已存在
        const existing = await this.db.query<InviteCodeModel>(
          'SELECT id FROM invite_codes WHERE code = ?',
          [code]
        )
        
        isUnique = existing.length === 0
        
        if (attempts >= maxAttempts) {
          throw createInviteError(
            InviteErrorCode.REWARD_CALCULATION_ERROR,
            'Failed to generate unique invite code after multiple attempts'
          )
        }
      } while (!isUnique)

      // 创建邀请码记录
      const inviteCodeId = generateUUID()
      const expiresAt = calculateExpiryDate(6) // 6个月过期
      
      await this.db.execute(
        `INSERT INTO invite_codes (id, code, inviter_id, expires_at, is_active, usage_count, max_usage) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [inviteCodeId, code, userId, expiresAt, true, 0, 100]
      )

      // 更新用户统计
      await this.updateUserInviteStats(userId)

      const inviteCode: InviteCode = {
        id: inviteCodeId,
        code,
        inviterId: userId,
        createdAt: new Date(),
        expiresAt,
        isActive: true,
        usageCount: 0,
        maxUsage: 100
      }

      logger.info('Invite code generated successfully', { userId, code })
      return inviteCode

    } catch (error) {
      logger.error('Failed to generate invite code', { userId, error })
      throw error
    }
  }

  async validateInviteCode(code: string): Promise<InviteValidation> {
    try {
      // 验证邀请码格式
      if (!validateInviteCodeFormat(code)) {
        return {
          isValid: false,
          error: 'Invalid invite code format',
          errorCode: InviteErrorCode.INVALID_INVITE_CODE
        }
      }

      // 查询邀请码
      const results = await this.db.query<InviteCodeModel>(
        'SELECT * FROM invite_codes WHERE code = ?',
        [code]
      )

      if (results.length === 0) {
        return {
          isValid: false,
          error: 'Invite code not found',
          errorCode: InviteErrorCode.INVALID_INVITE_CODE
        }
      }

      const inviteCodeModel = results[0]
      const inviteCode = ModelConverter.toInviteCode(inviteCodeModel)

      // 检查邀请码是否过期
      if (isInviteCodeExpired(inviteCode.expiresAt)) {
        return {
          isValid: false,
          code: inviteCode,
          error: 'Invite code has expired',
          errorCode: InviteErrorCode.EXPIRED_INVITE_CODE
        }
      }

      // 检查邀请码是否激活
      if (!inviteCode.isActive) {
        return {
          isValid: false,
          code: inviteCode,
          error: 'Invite code is inactive',
          errorCode: InviteErrorCode.INVALID_INVITE_CODE
        }
      }

      // 检查使用次数限制
      if (inviteCode.usageCount >= inviteCode.maxUsage) {
        return {
          isValid: false,
          code: inviteCode,
          error: 'Invite code usage limit exceeded',
          errorCode: InviteErrorCode.USAGE_LIMIT_EXCEEDED
        }
      }

      return {
        isValid: true,
        code: inviteCode
      }

    } catch (error) {
      logger.error('Failed to validate invite code', { code, error })
      throw error
    }
  }

  async processInviteRegistration(code: string, newUserId: string): Promise<InviteResult> {
    return await this.db.transaction(async (connection) => {
      try {
        // 验证邀请码
        const validation = await this.validateInviteCode(code)
        if (!validation.isValid || !validation.code) {
          return {
            success: false,
            error: validation.error,
            errorCode: validation.errorCode
          }
        }

        const inviteCode = validation.code

        // 检查是否自我邀请
        if (inviteCode.inviterId === newUserId) {
          return {
            success: false,
            error: 'Cannot use your own invite code',
            errorCode: InviteErrorCode.SELF_INVITE_ATTEMPT
          }
        }

        // 检查用户是否已经通过邀请注册过
        const existingRegistration = await connection.query<InviteRegistrationModel>(
          'SELECT id FROM invite_registrations WHERE invitee_id = ?',
          [newUserId]
        )

        if (existingRegistration.length > 0) {
          return {
            success: false,
            error: 'User has already been invited',
            errorCode: InviteErrorCode.ALREADY_REGISTERED
          }
        }

        // 创建邀请注册记录
        const registrationId = generateUUID()
        const registeredAt = new Date()

        await connection.execute(
          `INSERT INTO invite_registrations 
           (id, invite_code_id, inviter_id, invitee_id, registered_at, is_activated, rewards_claimed) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [registrationId, inviteCode.id, inviteCode.inviterId, newUserId, registeredAt, false, false]
        )

        // 更新邀请码使用次数
        await connection.execute(
          'UPDATE invite_codes SET usage_count = usage_count + 1 WHERE id = ?',
          [inviteCode.id]
        )

        // 更新邀请人统计
        await this.updateUserInviteStats(inviteCode.inviterId)

        const registration: InviteRegistration = {
          id: registrationId,
          inviteCodeId: inviteCode.id,
          inviterId: inviteCode.inviterId,
          inviteeId: newUserId,
          registeredAt,
          isActivated: false,
          rewardsClaimed: false
        }

        logger.info('Invite registration processed successfully', {
          inviteCode: code,
          inviterId: inviteCode.inviterId,
          inviteeId: newUserId
        })

        return {
          success: true,
          registration
        }

      } catch (error) {
        logger.error('Failed to process invite registration', { code, newUserId, error })
        throw error
      }
    })
  }

  async getUserInviteStats(userId: string): Promise<InviteStats> {
    try {
      const results = await this.db.query<InviteStatsModel>(
        'SELECT * FROM invite_stats WHERE user_id = ?',
        [userId]
      )

      if (results.length === 0) {
        // 如果没有统计记录，创建一个默认的
        const defaultStats: InviteStats = {
          userId,
          totalInvites: 0,
          successfulRegistrations: 0,
          activeInvitees: 0,
          totalRewardsEarned: 0,
          lastUpdated: new Date()
        }

        await this.createUserInviteStats(userId)
        return defaultStats
      }

      return ModelConverter.toInviteStats(results[0])

    } catch (error) {
      logger.error('Failed to get user invite stats', { userId, error })
      throw error
    }
  }

  async getInviteHistory(userId: string, pagination: Pagination): Promise<InviteHistory[]> {
    try {
      const offset = (pagination.page - 1) * pagination.limit
      const sortBy = pagination.sortBy || 'registered_at'
      const sortOrder = pagination.sortOrder || 'desc'

      const results = await this.db.query<any>(
        `SELECT 
           ir.id,
           ic.code as invite_code,
           u.email as invitee_email,
           u.name as invitee_name,
           ir.registered_at,
           ir.is_activated,
           ir.activated_at,
           ir.rewards_claimed
         FROM invite_registrations ir
         JOIN invite_codes ic ON ir.invite_code_id = ic.id
         LEFT JOIN users u ON ir.invitee_id = u.id
         WHERE ir.inviter_id = ?
         ORDER BY ${sortBy} ${sortOrder}
         LIMIT ? OFFSET ?`,
        [userId, pagination.limit, offset]
      )

      return results.map(row => ({
        id: row.id,
        inviteCode: row.invite_code,
        inviteeEmail: row.invitee_email,
        inviteeName: row.invitee_name,
        registeredAt: row.registered_at,
        isActivated: row.is_activated,
        activatedAt: row.activated_at,
        rewardsClaimed: row.rewards_claimed
      }))

    } catch (error) {
      logger.error('Failed to get invite history', { userId, pagination, error })
      throw error
    }
  }

  async getUserInviteCodes(userId: string): Promise<InviteCode[]> {
    try {
      const results = await this.db.query<InviteCodeModel>(
        'SELECT * FROM invite_codes WHERE inviter_id = ? ORDER BY created_at DESC',
        [userId]
      )

      return results.map(model => ModelConverter.toInviteCode(model))

    } catch (error) {
      logger.error('Failed to get user invite codes', { userId, error })
      throw error
    }
  }

  async deactivateInviteCode(codeId: string, userId: string): Promise<boolean> {
    try {
      const result = await this.db.execute(
        'UPDATE invite_codes SET is_active = false WHERE id = ? AND inviter_id = ?',
        [codeId, userId]
      )

      const success = result.affectedRows > 0
      
      if (success) {
        logger.info('Invite code deactivated', { codeId, userId })
      } else {
        logger.warn('Failed to deactivate invite code - not found or unauthorized', { codeId, userId })
      }

      return success

    } catch (error) {
      logger.error('Failed to deactivate invite code', { codeId, userId, error })
      throw error
    }
  }

  // 私有方法：更新用户邀请统计
  private async updateUserInviteStats(userId: string): Promise<void> {
    try {
      // 计算统计数据
      const [inviteCount] = await this.db.query<{ count: number }>(
        'SELECT COUNT(*) as count FROM invite_codes WHERE inviter_id = ?',
        [userId]
      )

      const [registrationCount] = await this.db.query<{ count: number }>(
        'SELECT COUNT(*) as count FROM invite_registrations WHERE inviter_id = ?',
        [userId]
      )

      const [activeCount] = await this.db.query<{ count: number }>(
        'SELECT COUNT(*) as count FROM invite_registrations WHERE inviter_id = ? AND is_activated = true',
        [userId]
      )

      const [rewardCount] = await this.db.query<{ total: number }>(
        'SELECT COALESCE(SUM(amount), 0) as total FROM reward_records WHERE user_id = ? AND reward_type = "ai_credits"',
        [userId]
      )

      // 更新或插入统计记录
      await this.db.execute(
        `INSERT INTO invite_stats (id, user_id, total_invites, successful_registrations, active_invitees, total_rewards_earned)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         total_invites = VALUES(total_invites),
         successful_registrations = VALUES(successful_registrations),
         active_invitees = VALUES(active_invitees),
         total_rewards_earned = VALUES(total_rewards_earned),
         last_updated = CURRENT_TIMESTAMP`,
        [
          generateUUID(),
          userId,
          inviteCount.count,
          registrationCount.count,
          activeCount.count,
          rewardCount.total
        ]
      )

    } catch (error) {
      logger.error('Failed to update user invite stats', { userId, error })
      // 不抛出错误，避免影响主流程
    }
  }

  // 私有方法：创建用户邀请统计记录
  private async createUserInviteStats(userId: string): Promise<void> {
    try {
      await this.db.execute(
        `INSERT IGNORE INTO invite_stats (id, user_id, total_invites, successful_registrations, active_invitees, total_rewards_earned)
         VALUES (?, ?, 0, 0, 0, 0)`,
        [generateUUID(), userId]
      )
    } catch (error) {
      logger.error('Failed to create user invite stats', { userId, error })
    }
  }
}

// 导出默认实现
export { InvitationServiceImpl as InvitationService }