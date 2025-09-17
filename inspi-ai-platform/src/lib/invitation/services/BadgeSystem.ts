/**
 * 徽章系统服务
 * 管理用户徽章、称号和成就
 */

import { DatabaseFactory } from '../database'
import { generateUUID } from '../utils'
import { logger } from '../../utils/logger'

// 徽章定义
export interface Badge {
  id: string
  name: string
  description: string
  iconUrl: string
  category: BadgeCategory
  rarity: BadgeRarity
  requirements: BadgeRequirement[]
  isActive: boolean
  createdAt: Date
}

// 徽章类别
export enum BadgeCategory {
  INVITER = 'inviter',        // 邀请相关
  ACHIEVER = 'achiever',      // 成就相关
  SPECIAL = 'special',        // 特殊徽章
  SEASONAL = 'seasonal'       // 季节性徽章
}

// 徽章稀有度
export enum BadgeRarity {
  COMMON = 'common',          // 普通
  RARE = 'rare',              // 稀有
  EPIC = 'epic',              // 史诗
  LEGENDARY = 'legendary'     // 传说
}

// 徽章要求
export interface BadgeRequirement {
  type: RequirementType
  value: number
  description: string
}

export enum RequirementType {
  INVITE_COUNT = 'invite_count',
  ACTIVE_INVITEES = 'active_invitees',
  CONSECUTIVE_DAYS = 'consecutive_days',
  TOTAL_CREDITS = 'total_credits'
}

// 用户徽章
export interface UserBadge {
  id: string
  userId: string
  badgeId: string
  earnedAt: Date
  isDisplayed: boolean
  badge?: Badge
}

// 称号定义
export interface Title {
  id: string
  name: string
  description: string
  color: string
  requirements: BadgeRequirement[]
  isActive: boolean
  createdAt: Date
}

// 用户称号
export interface UserTitle {
  id: string
  userId: string
  titleId: string
  earnedAt: Date
  isActive: boolean
  title?: Title
}

export interface BadgeSystemService {
  // 徽章管理
  createBadge(badge: Omit<Badge, 'id' | 'createdAt'>): Promise<Badge>
  updateBadge(badgeId: string, updates: Partial<Badge>): Promise<boolean>
  getBadge(badgeId: string): Promise<Badge | null>
  getAllBadges(): Promise<Badge[]>
  
  // 用户徽章
  awardBadge(userId: string, badgeId: string): Promise<UserBadge>
  getUserBadges(userId: string): Promise<UserBadge[]>
  setDisplayedBadges(userId: string, badgeIds: string[]): Promise<boolean>
  
  // 称号管理
  createTitle(title: Omit<Title, 'id' | 'createdAt'>): Promise<Title>
  awardTitle(userId: string, titleId: string): Promise<UserTitle>
  getUserTitles(userId: string): Promise<UserTitle[]>
  setActiveTitle(userId: string, titleId: string): Promise<boolean>
  
  // 检查和自动授予
  checkAndAwardBadges(userId: string): Promise<UserBadge[]>
  checkAndAwardTitles(userId: string): Promise<UserTitle[]>
}

export class BadgeSystemServiceImpl implements BadgeSystemService {
  private db = DatabaseFactory.getInstance()

  async createBadge(badge: Omit<Badge, 'id' | 'createdAt'>): Promise<Badge> {
    try {
      const badgeId = generateUUID()
      const createdAt = new Date()

      await this.db.execute(
        `INSERT INTO badges 
         (id, name, description, icon_url, category, rarity, requirements, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          badgeId,
          badge.name,
          badge.description,
          badge.iconUrl,
          badge.category,
          badge.rarity,
          JSON.stringify(badge.requirements),
          badge.isActive,
          createdAt
        ]
      )

      const newBadge: Badge = {
        id: badgeId,
        createdAt,
        ...badge
      }

      logger.info('Badge created successfully', { badgeId, name: badge.name })
      return newBadge

    } catch (error) {
      logger.error('Failed to create badge', { badge, error })
      throw error
    }
  }

  async updateBadge(badgeId: string, updates: Partial<Badge>): Promise<boolean> {
    try {
      const setClause = []
      const values = []

      if (updates.name !== undefined) {
        setClause.push('name = ?')
        values.push(updates.name)
      }
      if (updates.description !== undefined) {
        setClause.push('description = ?')
        values.push(updates.description)
      }
      if (updates.iconUrl !== undefined) {
        setClause.push('icon_url = ?')
        values.push(updates.iconUrl)
      }
      if (updates.isActive !== undefined) {
        setClause.push('is_active = ?')
        values.push(updates.isActive)
      }
      if (updates.requirements !== undefined) {
        setClause.push('requirements = ?')
        values.push(JSON.stringify(updates.requirements))
      }

      if (setClause.length === 0) {
        return true // No updates needed
      }

      values.push(badgeId)

      const result = await this.db.execute(
        `UPDATE badges SET ${setClause.join(', ')} WHERE id = ?`,
        values
      )

      const success = result.affectedRows > 0
      if (success) {
        logger.info('Badge updated successfully', { badgeId })
      }

      return success

    } catch (error) {
      logger.error('Failed to update badge', { badgeId, updates, error })
      throw error
    }
  }

  async getBadge(badgeId: string): Promise<Badge | null> {
    try {
      const results = await this.db.query<any>(
        'SELECT * FROM badges WHERE id = ?',
        [badgeId]
      )

      if (results.length === 0) {
        return null
      }

      const row = results[0]
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        iconUrl: row.icon_url,
        category: row.category,
        rarity: row.rarity,
        requirements: JSON.parse(row.requirements || '[]'),
        isActive: row.is_active,
        createdAt: row.created_at
      }

    } catch (error) {
      logger.error('Failed to get badge', { badgeId, error })
      throw error
    }
  }

  async getAllBadges(): Promise<Badge[]> {
    try {
      const results = await this.db.query<any>(
        'SELECT * FROM badges WHERE is_active = true ORDER BY category, rarity, name'
      )

      return results.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        iconUrl: row.icon_url,
        category: row.category,
        rarity: row.rarity,
        requirements: JSON.parse(row.requirements || '[]'),
        isActive: row.is_active,
        createdAt: row.created_at
      }))

    } catch (error) {
      logger.error('Failed to get all badges', { error })
      throw error
    }
  }

  async awardBadge(userId: string, badgeId: string): Promise<UserBadge> {
    try {
      // 检查用户是否已有此徽章
      const existing = await this.db.query<any>(
        'SELECT id FROM user_badges WHERE user_id = ? AND badge_id = ?',
        [userId, badgeId]
      )

      if (existing.length > 0) {
        throw new Error('User already has this badge')
      }

      const userBadgeId = generateUUID()
      const earnedAt = new Date()

      await this.db.execute(
        `INSERT INTO user_badges (id, user_id, badge_id, earned_at, is_displayed)
         VALUES (?, ?, ?, ?, ?)`,
        [userBadgeId, userId, badgeId, earnedAt, true]
      )

      const userBadge: UserBadge = {
        id: userBadgeId,
        userId,
        badgeId,
        earnedAt,
        isDisplayed: true
      }

      logger.info('Badge awarded to user', { userId, badgeId })
      return userBadge

    } catch (error) {
      logger.error('Failed to award badge', { userId, badgeId, error })
      throw error
    }
  }

  async getUserBadges(userId: string): Promise<UserBadge[]> {
    try {
      const results = await this.db.query<any>(
        `SELECT ub.*, b.name, b.description, b.icon_url, b.category, b.rarity
         FROM user_badges ub
         JOIN badges b ON ub.badge_id = b.id
         WHERE ub.user_id = ?
         ORDER BY ub.earned_at DESC`,
        [userId]
      )

      return results.map(row => ({
        id: row.id,
        userId: row.user_id,
        badgeId: row.badge_id,
        earnedAt: row.earned_at,
        isDisplayed: row.is_displayed,
        badge: {
          id: row.badge_id,
          name: row.name,
          description: row.description,
          iconUrl: row.icon_url,
          category: row.category,
          rarity: row.rarity,
          requirements: [],
          isActive: true,
          createdAt: new Date()
        }
      }))

    } catch (error) {
      logger.error('Failed to get user badges', { userId, error })
      throw error
    }
  }

  async setDisplayedBadges(userId: string, badgeIds: string[]): Promise<boolean> {
    return await this.db.transaction(async (connection) => {
      try {
        // 先将所有徽章设为不显示
        await connection.execute(
          'UPDATE user_badges SET is_displayed = false WHERE user_id = ?',
          [userId]
        )

        // 设置指定徽章为显示
        if (badgeIds.length > 0) {
          const placeholders = badgeIds.map(() => '?').join(',')
          await connection.execute(
            `UPDATE user_badges SET is_displayed = true 
             WHERE user_id = ? AND badge_id IN (${placeholders})`,
            [userId, ...badgeIds]
          )
        }

        logger.info('User displayed badges updated', { userId, badgeIds })
        return true

      } catch (error) {
        logger.error('Failed to set displayed badges', { userId, badgeIds, error })
        throw error
      }
    })
  }

  async createTitle(title: Omit<Title, 'id' | 'createdAt'>): Promise<Title> {
    try {
      const titleId = generateUUID()
      const createdAt = new Date()

      await this.db.execute(
        `INSERT INTO titles 
         (id, name, description, color, requirements, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          titleId,
          title.name,
          title.description,
          title.color,
          JSON.stringify(title.requirements),
          title.isActive,
          createdAt
        ]
      )

      const newTitle: Title = {
        id: titleId,
        createdAt,
        ...title
      }

      logger.info('Title created successfully', { titleId, name: title.name })
      return newTitle

    } catch (error) {
      logger.error('Failed to create title', { title, error })
      throw error
    }
  }

  async awardTitle(userId: string, titleId: string): Promise<UserTitle> {
    try {
      // 检查用户是否已有此称号
      const existing = await this.db.query<any>(
        'SELECT id FROM user_titles WHERE user_id = ? AND title_id = ?',
        [userId, titleId]
      )

      if (existing.length > 0) {
        throw new Error('User already has this title')
      }

      const userTitleId = generateUUID()
      const earnedAt = new Date()

      await this.db.execute(
        `INSERT INTO user_titles (id, user_id, title_id, earned_at, is_active)
         VALUES (?, ?, ?, ?, ?)`,
        [userTitleId, userId, titleId, earnedAt, false]
      )

      const userTitle: UserTitle = {
        id: userTitleId,
        userId,
        titleId,
        earnedAt,
        isActive: false
      }

      logger.info('Title awarded to user', { userId, titleId })
      return userTitle

    } catch (error) {
      logger.error('Failed to award title', { userId, titleId, error })
      throw error
    }
  }

  async getUserTitles(userId: string): Promise<UserTitle[]> {
    try {
      const results = await this.db.query<any>(
        `SELECT ut.*, t.name, t.description, t.color
         FROM user_titles ut
         JOIN titles t ON ut.title_id = t.id
         WHERE ut.user_id = ?
         ORDER BY ut.earned_at DESC`,
        [userId]
      )

      return results.map(row => ({
        id: row.id,
        userId: row.user_id,
        titleId: row.title_id,
        earnedAt: row.earned_at,
        isActive: row.is_active,
        title: {
          id: row.title_id,
          name: row.name,
          description: row.description,
          color: row.color,
          requirements: [],
          isActive: true,
          createdAt: new Date()
        }
      }))

    } catch (error) {
      logger.error('Failed to get user titles', { userId, error })
      throw error
    }
  }

  async setActiveTitle(userId: string, titleId: string): Promise<boolean> {
    return await this.db.transaction(async (connection) => {
      try {
        // 先将所有称号设为非激活
        await connection.execute(
          'UPDATE user_titles SET is_active = false WHERE user_id = ?',
          [userId]
        )

        // 设置指定称号为激活
        const result = await connection.execute(
          'UPDATE user_titles SET is_active = true WHERE user_id = ? AND title_id = ?',
          [userId, titleId]
        )

        const success = result.affectedRows > 0
        if (success) {
          logger.info('User active title updated', { userId, titleId })
        }

        return success

      } catch (error) {
        logger.error('Failed to set active title', { userId, titleId, error })
        throw error
      }
    })
  }

  async checkAndAwardBadges(userId: string): Promise<UserBadge[]> {
    try {
      const awardedBadges: UserBadge[] = []

      // 获取用户统计数据
      const [userStats] = await this.db.query<any>(
        'SELECT * FROM invite_stats WHERE user_id = ?',
        [userId]
      )

      if (!userStats) {
        return awardedBadges
      }

      // 获取所有激活的徽章
      const badges = await this.getAllBadges()

      // 获取用户已有的徽章
      const userBadges = await this.getUserBadges(userId)
      const ownedBadgeIds = new Set(userBadges.map(ub => ub.badgeId))

      for (const badge of badges) {
        // 跳过已拥有的徽章
        if (ownedBadgeIds.has(badge.id)) {
          continue
        }

        // 检查是否满足要求
        const meetsRequirements = badge.requirements.every(req => {
          switch (req.type) {
            case RequirementType.INVITE_COUNT:
              return userStats.total_invites >= req.value
            case RequirementType.ACTIVE_INVITEES:
              return userStats.active_invitees >= req.value
            case RequirementType.TOTAL_CREDITS:
              return userStats.total_rewards_earned >= req.value
            default:
              return false
          }
        })

        if (meetsRequirements) {
          try {
            const userBadge = await this.awardBadge(userId, badge.id)
            awardedBadges.push(userBadge)
          } catch (error) {
            logger.warn('Failed to award badge to user', { userId, badgeId: badge.id, error })
          }
        }
      }

      logger.info('Badge check completed', { userId, awardedCount: awardedBadges.length })
      return awardedBadges

    } catch (error) {
      logger.error('Failed to check and award badges', { userId, error })
      return []
    }
  }

  async checkAndAwardTitles(userId: string): Promise<UserTitle[]> {
    try {
      const awardedTitles: UserTitle[] = []

      // 获取用户统计数据
      const [userStats] = await this.db.query<any>(
        'SELECT * FROM invite_stats WHERE user_id = ?',
        [userId]
      )

      if (!userStats) {
        return awardedTitles
      }

      // 获取所有激活的称号
      const titles = await this.db.query<any>(
        'SELECT * FROM titles WHERE is_active = true'
      )

      // 获取用户已有的称号
      const userTitles = await this.getUserTitles(userId)
      const ownedTitleIds = new Set(userTitles.map(ut => ut.titleId))

      for (const titleRow of titles) {
        // 跳过已拥有的称号
        if (ownedTitleIds.has(titleRow.id)) {
          continue
        }

        const requirements = JSON.parse(titleRow.requirements || '[]')

        // 检查是否满足要求
        const meetsRequirements = requirements.every((req: BadgeRequirement) => {
          switch (req.type) {
            case RequirementType.INVITE_COUNT:
              return userStats.total_invites >= req.value
            case RequirementType.ACTIVE_INVITEES:
              return userStats.active_invitees >= req.value
            case RequirementType.TOTAL_CREDITS:
              return userStats.total_rewards_earned >= req.value
            default:
              return false
          }
        })

        if (meetsRequirements) {
          try {
            const userTitle = await this.awardTitle(userId, titleRow.id)
            awardedTitles.push(userTitle)
          } catch (error) {
            logger.warn('Failed to award title to user', { userId, titleId: titleRow.id, error })
          }
        }
      }

      logger.info('Title check completed', { userId, awardedCount: awardedTitles.length })
      return awardedTitles

    } catch (error) {
      logger.error('Failed to check and award titles', { userId, error })
      return []
    }
  }

  // 初始化默认徽章和称号
  async initializeDefaultBadgesAndTitles(): Promise<void> {
    try {
      // 创建默认徽章
      const defaultBadges = [
        {
          name: '新手邀请者',
          description: '成功邀请第一个用户',
          iconUrl: '/badges/first_inviter.png',
          category: BadgeCategory.INVITER,
          rarity: BadgeRarity.COMMON,
          requirements: [
            { type: RequirementType.INVITE_COUNT, value: 1, description: '邀请1个用户' }
          ],
          isActive: true
        },
        {
          name: '邀请达人',
          description: '成功邀请10个用户',
          iconUrl: '/badges/inviter_expert.png',
          category: BadgeCategory.INVITER,
          rarity: BadgeRarity.RARE,
          requirements: [
            { type: RequirementType.INVITE_COUNT, value: 10, description: '邀请10个用户' }
          ],
          isActive: true
        },
        {
          name: '社区建设者',
          description: '拥有5个活跃邀请用户',
          iconUrl: '/badges/community_builder.png',
          category: BadgeCategory.ACHIEVER,
          rarity: BadgeRarity.EPIC,
          requirements: [
            { type: RequirementType.ACTIVE_INVITEES, value: 5, description: '5个活跃邀请用户' }
          ],
          isActive: true
        }
      ]

      for (const badge of defaultBadges) {
        // 检查是否已存在
        const existing = await this.db.query<any>(
          'SELECT id FROM badges WHERE name = ?',
          [badge.name]
        )

        if (existing.length === 0) {
          await this.createBadge(badge)
        }
      }

      // 创建默认称号
      const defaultTitles = [
        {
          name: '邀请新星',
          description: '邀请界的新星',
          color: '#4CAF50',
          requirements: [
            { type: RequirementType.INVITE_COUNT, value: 5, description: '邀请5个用户' }
          ],
          isActive: true
        },
        {
          name: '超级邀请达人',
          description: '邀请界的传奇人物',
          color: '#FF9800',
          requirements: [
            { type: RequirementType.INVITE_COUNT, value: 50, description: '邀请50个用户' },
            { type: RequirementType.ACTIVE_INVITEES, value: 40, description: '40个活跃邀请用户' }
          ],
          isActive: true
        }
      ]

      for (const title of defaultTitles) {
        // 检查是否已存在
        const existing = await this.db.query<any>(
          'SELECT id FROM titles WHERE name = ?',
          [title.name]
        )

        if (existing.length === 0) {
          await this.createTitle(title)
        }
      }

      logger.info('Default badges and titles initialized')

    } catch (error) {
      logger.error('Failed to initialize default badges and titles', { error })
      throw error
    }
  }
}