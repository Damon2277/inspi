/**
 * 奖励引擎服务实现
 */

import { logger } from '../../utils/logger';
import { DatabaseFactory } from '../database';
import { RewardConfigModel, RewardRecordModel, ModelConverter } from '../models';
import {
  InviteEvent,
  Reward,
  RewardResult,
  RewardConfig,
  RewardType,
  RewardSourceType,
  InviteEventType,
  RewardRecord,
} from '../types';
import { generateUUID } from '../utils';

export interface RewardEngineContract {
  // 计算邀请奖励
  calculateInviteReward(event: InviteEvent): Promise<Reward[]>

  // 发放奖励
  grantReward(userId: string, reward: Reward): Promise<RewardResult>

  // 获取奖励配置
  getRewardConfig(eventType: string): Promise<RewardConfig>

  // 更新奖励配置
  updateRewardConfig(config: RewardConfig): Promise<void>

  // 获取用户奖励历史
  getUserRewards(userId: string): Promise<Reward[]>

  // 计算用户总积分
  calculateUserCredits(userId: string): Promise<number>

  // 批量发放奖励
  batchGrantRewards(rewards: Array<{ userId: string, reward: Reward }>): Promise<RewardResult[]>

  // 检查用户是否达成里程碑
  checkMilestones(userId: string): Promise<Reward[]>
}

export class RewardEngineImpl implements RewardEngineContract {
  private db = DatabaseFactory.getInstance();

  async calculateInviteReward(event: InviteEvent): Promise<Reward[]> {
    try {
      const rewards: Reward[] = [];

      // 根据事件类型计算奖励
      switch (event.type) {
        case InviteEventType.USER_REGISTERED:
          rewards.push(...await this.calculateRegistrationRewards(event));
          break;

        case InviteEventType.USER_ACTIVATED:
          rewards.push(...await this.calculateActivationRewards(event));
          break;

        default:
          logger.debug('No rewards configured for event type', { eventType: event.type });
      }

      // 检查里程碑奖励
      if (event.inviterId) {
        const milestoneRewards = await this.checkMilestones(event.inviterId);
        rewards.push(...milestoneRewards);
      }

      logger.info('Calculated invite rewards', {
        eventType: event.type,
        inviterId: event.inviterId,
        rewardCount: rewards.length,
      });

      return rewards;

    } catch (error) {
      logger.error('Failed to calculate invite reward', { event, error });
      throw error;
    }
  }

  async grantReward(userId: string, reward: Reward): Promise<RewardResult> {
    try {
      const rewardId = generateUUID();
      const grantedAt = new Date();

      // 插入奖励记录
      await this.db.execute(
        `INSERT INTO reward_records 
         (id, user_id, reward_type, amount, badge_id, title_id, description, granted_at, expires_at, source_type, source_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          rewardId,
          userId,
          reward.type,
          reward.amount || null,
          reward.badgeId || null,
          reward.titleId || null,
          reward.description,
          grantedAt,
          reward.expiresAt || null,
          'invite_registration', // 默认来源类型
          generateUUID(), // 临时source_id
        ],
      );

      // 如果是AI积分奖励，更新用户配额
      if (reward.type === RewardType.AI_CREDITS && reward.amount) {
        await this.updateUserCredits(userId, reward.amount);
      }

      logger.info('Reward granted successfully', {
        userId,
        rewardId,
        rewardType: reward.type,
        amount: reward.amount,
      });

      return {
        success: true,
        rewardId,
      };

    } catch (error) {
      logger.error('Failed to grant reward', { userId, reward, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getRewardConfig(eventType: string): Promise<RewardConfig> {
    try {
      const results = await this.db.query<RewardConfigModel>(
        'SELECT * FROM reward_configs WHERE event_type = ? AND is_active = true',
        [eventType],
      );

      if (results.length === 0) {
        // 返回默认配置
        return this.getDefaultRewardConfig(eventType);
      }

      // 将多个配置记录合并为一个RewardConfig
      const config: RewardConfig = {
        eventType,
        rewards: results.map(record => ({
          type: record.reward_type,
          amount: record.amount || undefined,
          badgeId: record.badge_id || undefined,
          titleId: record.title_id || undefined,
          description: record.description,
          expiresAt: undefined,
        })),
        conditions: results[0].conditions ? JSON.parse(results[0].conditions) : undefined,
        isActive: true,
      };

      return config;

    } catch (error) {
      logger.error('Failed to get reward config', { eventType, error });
      throw error;
    }
  }

  async updateRewardConfig(config: RewardConfig): Promise<void> {
    return await this.db.transaction(async (connection) => {
      try {
        // 删除现有配置
        await connection.execute(
          'DELETE FROM reward_configs WHERE event_type = ?',
          [config.eventType],
        );

        // 插入新配置
        for (const reward of config.rewards) {
          await connection.execute(
            `INSERT INTO reward_configs 
             (id, event_type, reward_type, amount, badge_id, title_id, description, conditions, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              generateUUID(),
              config.eventType,
              reward.type,
              reward.amount || null,
              reward.badgeId || null,
              reward.titleId || null,
              reward.description,
              config.conditions ? JSON.stringify(config.conditions) : null,
              config.isActive,
            ],
          );
        }

        logger.info('Reward config updated successfully', { eventType: config.eventType });

      } catch (error) {
        logger.error('Failed to update reward config', { config, error });
        throw error;
      }
    });
  }

  async getUserRewards(userId: string): Promise<Reward[]> {
    try {
      const results = await this.db.query<RewardRecordModel>(
        'SELECT * FROM reward_records WHERE user_id = ? ORDER BY granted_at DESC',
        [userId],
      );

      return results.map(record => ({
        id: record.id,
        type: record.reward_type,
        amount: record.amount || undefined,
        badgeId: record.badge_id || undefined,
        titleId: record.title_id || undefined,
        description: record.description,
        expiresAt: record.expires_at || undefined,
      }));

    } catch (error) {
      logger.error('Failed to get user rewards', { userId, error });
      throw error;
    }
  }

  async calculateUserCredits(userId: string): Promise<number> {
    try {
      const [result] = await this.db.query<{ total: number }>(
        `SELECT COALESCE(SUM(amount), 0) as total 
         FROM reward_records 
         WHERE user_id = ? AND reward_type = ? AND (expires_at IS NULL OR expires_at > NOW())`,
        [userId, RewardType.AI_CREDITS],
      );

      return result.total;

    } catch (error) {
      logger.error('Failed to calculate user credits', { userId, error });
      throw error;
    }
  }

  async batchGrantRewards(rewards: Array<{ userId: string, reward: Reward }>): Promise<RewardResult[]> {
    const results: RewardResult[] = [];

    for (const { userId, reward } of rewards) {
      try {
        const result = await this.grantReward(userId, reward);
        results.push(result);
      } catch (error) {
        logger.error('Failed to grant reward in batch', { userId, reward, error });
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    logger.info('Batch reward granting completed', {
      total: rewards.length,
      successful: results.filter(r => r.success).length,
    });

    return results;
  }

  async checkMilestones(userId: string): Promise<Reward[]> {
    try {
      const rewards: Reward[] = [];

      // 获取用户邀请统计
      const [stats] = await this.db.query<any>(
        'SELECT successful_registrations, active_invitees FROM invite_stats WHERE user_id = ?',
        [userId],
      );

      if (!stats) {
        return rewards;
      }

      const { successful_registrations, active_invitees } = stats;

      // 检查注册里程碑
      const registrationMilestones = [5, 10, 25, 50, 100];
      for (const milestone of registrationMilestones) {
        if (successful_registrations >= milestone) {
          const hasReward = await this.hasMilestoneReward(userId, 'registration', milestone);
          if (!hasReward) {
            rewards.push({
              type: RewardType.AI_CREDITS,
              amount: milestone * 2, // 每个里程碑给予2倍积分
              description: `邀请${milestone}人注册里程碑奖励`,
            });

            // 记录里程碑奖励已发放
            await this.recordMilestoneReward(userId, 'registration', milestone);
          }
        }
      }

      // 检查激活里程碑
      const activationMilestones = [3, 8, 20, 40, 80];
      for (const milestone of activationMilestones) {
        if (active_invitees >= milestone) {
          const hasReward = await this.hasMilestoneReward(userId, 'activation', milestone);
          if (!hasReward) {
            rewards.push({
              type: RewardType.BADGE,
              badgeId: `active_inviter_${milestone}`,
              description: `激活${milestone}人里程碑徽章`,
            });

            await this.recordMilestoneReward(userId, 'activation', milestone);
          }
        }
      }

      // 特殊称号奖励
      if (successful_registrations >= 50 && active_invitees >= 40) {
        const hasTitle = await this.hasMilestoneReward(userId, 'title', 1);
        if (!hasTitle) {
          rewards.push({
            type: RewardType.TITLE,
            titleId: 'super_inviter',
            description: '超级邀请达人称号',
          });

          await this.recordMilestoneReward(userId, 'title', 1);
        }
      }

      return rewards;

    } catch (error) {
      logger.error('Failed to check milestones', { userId, error });
      return [];
    }
  }

  // 私有方法：计算注册奖励
  private async calculateRegistrationRewards(event: InviteEvent): Promise<Reward[]> {
    const config = await this.getRewardConfig('user_registration');
    return config.rewards;
  }

  // 私有方法：计算激活奖励
  private async calculateActivationRewards(event: InviteEvent): Promise<Reward[]> {
    const config = await this.getRewardConfig('user_activation');
    return config.rewards;
  }

  // 私有方法：获取默认奖励配置
  private getDefaultRewardConfig(eventType: string): RewardConfig {
    const defaultConfigs: Record<string, RewardConfig> = {
      'user_registration': {
        eventType: 'user_registration',
        rewards: [
          {
            type: RewardType.AI_CREDITS,
            amount: 10,
            description: '邀请用户注册奖励',
          },
        ],
        isActive: true,
      },
      'user_activation': {
        eventType: 'user_activation',
        rewards: [
          {
            type: RewardType.AI_CREDITS,
            amount: 5,
            description: '邀请用户激活奖励',
          },
        ],
        isActive: true,
      },
    };

    return defaultConfigs[eventType] || {
      eventType,
      rewards: [],
      isActive: false,
    };
  }

  // 私有方法：更新用户积分
  private async updateUserCredits(userId: string, amount: number): Promise<void> {
    try {
      // 这里应该调用配额管理系统来更新用户的AI生成次数
      // 暂时记录日志，实际实现需要与配额系统集成
      logger.info('User credits updated', { userId, amount });

      // TODO: 集成配额管理系统
      // await quotaManager.addCredits(userId, amount)

    } catch (error) {
      logger.error('Failed to update user credits', { userId, amount, error });
      throw error;
    }
  }

  // 私有方法：检查是否已有里程碑奖励
  private async hasMilestoneReward(userId: string, type: string, milestone: number): Promise<boolean> {
    try {
      const results = await this.db.query<any>(
        `SELECT id FROM reward_records 
         WHERE user_id = ? AND source_type = 'milestone' AND description LIKE ?`,
        [userId, `%${type}%${milestone}%`],
      );

      return results.length > 0;

    } catch (error) {
      logger.error('Failed to check milestone reward', { userId, type, milestone, error });
      return false;
    }
  }

  // 私有方法：记录里程碑奖励
  private async recordMilestoneReward(userId: string, type: string, milestone: number): Promise<void> {
    try {
      await this.db.execute(
        `INSERT INTO reward_records 
         (id, user_id, reward_type, description, granted_at, source_type, source_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          generateUUID(),
          userId,
          'milestone_marker', // 特殊标记类型
          `${type}_milestone_${milestone}`,
          new Date(),
          'milestone',
          generateUUID(),
        ],
      );

    } catch (error) {
      logger.error('Failed to record milestone reward', { userId, type, milestone, error });
    }
  }

  // 获取奖励统计
  async getRewardStats(userId: string): Promise<{
    totalCredits: number
    totalBadges: number
    totalTitles: number
    recentRewards: RewardRecord[]
  }> {
    try {
      const [creditsResult] = await this.db.query<{ total: number }>(
        `SELECT COALESCE(SUM(amount), 0) as total 
         FROM reward_records 
         WHERE user_id = ? AND reward_type = ?`,
        [userId, RewardType.AI_CREDITS],
      );

      const [badgesResult] = await this.db.query<{ count: number }>(
        `SELECT COUNT(*) as count 
         FROM reward_records 
         WHERE user_id = ? AND reward_type = ?`,
        [userId, RewardType.BADGE],
      );

      const [titlesResult] = await this.db.query<{ count: number }>(
        `SELECT COUNT(*) as count 
         FROM reward_records 
         WHERE user_id = ? AND reward_type = ?`,
        [userId, RewardType.TITLE],
      );

      const recentRewards = await this.db.query<RewardRecordModel>(
        `SELECT * FROM reward_records 
         WHERE user_id = ? 
         ORDER BY granted_at DESC 
         LIMIT 10`,
        [userId],
      );

      return {
        totalCredits: creditsResult.total,
        totalBadges: badgesResult.count,
        totalTitles: titlesResult.count,
        recentRewards: recentRewards.map(record => ModelConverter.toRewardRecord(record)),
      };

    } catch (error) {
      logger.error('Failed to get reward stats', { userId, error });
      throw error;
    }
  }

  // 初始化默认奖励配置
  async initializeDefaultConfigs(): Promise<void> {
    try {
      const defaultConfigs = [
        {
          eventType: 'user_registration',
          rewards: [
            {
              type: RewardType.AI_CREDITS,
              amount: 10,
              description: '邀请用户注册奖励',
            },
          ],
        },
        {
          eventType: 'user_activation',
          rewards: [
            {
              type: RewardType.AI_CREDITS,
              amount: 5,
              description: '邀请用户激活奖励',
            },
          ],
        },
      ];

      for (const config of defaultConfigs) {
        // 检查是否已存在配置
        const existing = await this.db.query<any>(
          'SELECT id FROM reward_configs WHERE event_type = ?',
          [config.eventType],
        );

        if (existing.length === 0) {
          await this.updateRewardConfig({
            ...config,
            isActive: true,
          });
        }
      }

      logger.info('Default reward configs initialized');

    } catch (error) {
      logger.error('Failed to initialize default configs', { error });
      throw error;
    }
  }
}
