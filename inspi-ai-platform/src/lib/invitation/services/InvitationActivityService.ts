/**
 * 邀请活动管理服务
 * 处理邀请挑战活动的创建、管理、进度追踪和结果统计
 */

import { v4 as uuidv4 } from 'uuid';

import { logger } from '../../utils/logger';
import { DatabasePool } from '../database';
import {
  InvitationActivity,
  ActivityType,
  ActivityStatus,
  ActivityRules,
  ActivityReward,
  ActivityParticipant,
  ActivityProgress,
  ActivityResult,
  RewardType,
  TimePeriod,
  Pagination,
} from '../types';

export class InvitationActivityService {
  constructor(private db: DatabasePool) {}

  /**
   * 创建邀请挑战活动
   */
  async createActivity(activityData: {
    name: string
    description: string
    type: ActivityType
    startDate: Date
    endDate: Date
    rules: ActivityRules
    rewards: ActivityReward[]
    targetMetrics?: Record<string, number>
  }): Promise<InvitationActivity> {
    const activityId = uuidv4();

    try {
      await this.db.transaction(async (conn) => {
        // 创建活动
        await conn.execute(`
          INSERT INTO invitation_activities (
            id, name, description, type, start_date, end_date, 
            rules, target_metrics, status, is_active
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', TRUE)
        `, [
          activityId,
          activityData.name,
          activityData.description,
          activityData.type,
          activityData.startDate,
          activityData.endDate,
          JSON.stringify(activityData.rules),
          JSON.stringify(activityData.targetMetrics || {}),
        ]);

        // 创建活动奖励
        for (const reward of activityData.rewards) {
          await conn.execute(`
            INSERT INTO activity_rewards (
              id, activity_id, reward_type, reward_amount, 
              description, rank_min, rank_max
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [
            uuidv4(),
            activityId,
            reward.type,
            reward.amount,
            reward.description,
            reward.rankRange?.min || 1,
            reward.rankRange?.max || 1,
          ]);
        }

        // 记录活动创建事件
        await this.logActivityEvent(conn, activityId, null, 'activity_created', {
          name: activityData.name,
          type: activityData.type,
        });
      });

      logger.info('Activity created successfully', { activityId, name: activityData.name });
      return await this.getActivityById(activityId);
    } catch (error) {
      logger.error('Failed to create activity', { error, activityData });
      throw new Error('创建活动失败');
    }
  }

  /**
   * 更新活动配置
   */
  async updateActivity(
    activityId: string,
    updates: Partial<{
      name: string
      description: string
      startDate: Date
      endDate: Date
      rules: ActivityRules
      targetMetrics: Record<string, number>
      status: ActivityStatus
    }>,
  ): Promise<InvitationActivity> {
    try {
      const setParts: string[] = [];
      const params: any[] = [];

      if (updates.name !== undefined) {
        setParts.push('name = ?');
        params.push(updates.name);
      }
      if (updates.description !== undefined) {
        setParts.push('description = ?');
        params.push(updates.description);
      }
      if (updates.startDate !== undefined) {
        setParts.push('start_date = ?');
        params.push(updates.startDate);
      }
      if (updates.endDate !== undefined) {
        setParts.push('end_date = ?');
        params.push(updates.endDate);
      }
      if (updates.rules !== undefined) {
        setParts.push('rules = ?');
        params.push(JSON.stringify(updates.rules));
      }
      if (updates.targetMetrics !== undefined) {
        setParts.push('target_metrics = ?');
        params.push(JSON.stringify(updates.targetMetrics));
      }
      if (updates.status !== undefined) {
        setParts.push('status = ?');
        params.push(updates.status);
      }

      if (setParts.length === 0) {
        throw new Error('没有提供更新字段');
      }

      setParts.push('updated_at = CURRENT_TIMESTAMP');
      params.push(activityId);

      await this.db.execute(`
        UPDATE invitation_activities 
        SET ${setParts.join(', ')} 
        WHERE id = ?
      `, params);

      logger.info('Activity updated successfully', { activityId, updates });
      return await this.getActivityById(activityId);
    } catch (error) {
      logger.error('Failed to update activity', { error, activityId, updates });
      throw new Error('更新活动失败');
    }
  }

  /**
   * 获取活动详情
   */
  async getActivityById(activityId: string): Promise<InvitationActivity> {
    try {
      const [activities] = await this.db.query<any>(`
        SELECT * FROM invitation_activities WHERE id = ?
      `, [activityId]);

      if (!activities) {
        throw new Error('活动不存在');
      }

      const rewards = await this.db.query<any>(`
        SELECT reward_type, reward_amount, description, rank_min, rank_max
        FROM activity_rewards 
        WHERE activity_id = ?
        ORDER BY rank_min ASC
      `, [activityId]);

      return {
        id: activities.id,
        name: activities.name,
        description: activities.description,
        type: activities.type as ActivityType,
        status: activities.status as ActivityStatus,
        startDate: new Date(activities.start_date),
        endDate: new Date(activities.end_date),
        rules: JSON.parse(activities.rules),
        rewards: rewards.map((r: any) => ({
          type: r.reward_type as RewardType,
          amount: r.reward_amount,
          description: r.description,
          rankRange: r.rank_min === r.rank_max ?
            { min: r.rank_min, max: r.rank_max } :
            { min: r.rank_min, max: r.rank_max },
        })),
        targetMetrics: JSON.parse(activities.target_metrics || '{}'),
        isActive: activities.is_active,
        createdAt: new Date(activities.created_at),
        updatedAt: new Date(activities.updated_at),
      };
    } catch (error) {
      logger.error('Failed to get activity', { error, activityId });
      throw new Error('获取活动详情失败');
    }
  }

  /**
   * 获取活动列表
   */
  async getActivities(filters: {
    status?: ActivityStatus
    type?: ActivityType
    isActive?: boolean
    pagination?: Pagination
  } = {}): Promise<{ activities: InvitationActivity[], total: number }> {
    try {
      const conditions: string[] = [];
      const params: any[] = [];

      if (filters.status) {
        conditions.push('status = ?');
        params.push(filters.status);
      }
      if (filters.type) {
        conditions.push('type = ?');
        params.push(filters.type);
      }
      if (filters.isActive !== undefined) {
        conditions.push('is_active = ?');
        params.push(filters.isActive);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // 获取总数
      const [countResult] = await this.db.query<{ count: number }>(`
        SELECT COUNT(*) as count FROM invitation_activities ${whereClause}
      `, params);

      // 获取活动列表
      const pagination = filters.pagination || { page: 1, limit: 10 };
      const offset = (pagination.page - 1) * pagination.limit;

      const activities = await this.db.query<any>(`
        SELECT * FROM invitation_activities 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `, [...params, pagination.limit, offset]);

      const activitiesWithRewards = await Promise.all(
        activities.map(async (activity: any) => {
          const rewards = await this.db.query<any>(`
            SELECT reward_type, reward_amount, description, rank_min, rank_max
            FROM activity_rewards 
            WHERE activity_id = ?
            ORDER BY rank_min ASC
          `, [activity.id]);

          return {
            id: activity.id,
            name: activity.name,
            description: activity.description,
            type: activity.type as ActivityType,
            status: activity.status as ActivityStatus,
            startDate: new Date(activity.start_date),
            endDate: new Date(activity.end_date),
            rules: JSON.parse(activity.rules),
            rewards: rewards.map((r: any) => ({
              type: r.reward_type as RewardType,
              amount: r.reward_amount,
              description: r.description,
              rankRange: { min: r.rank_min, max: r.rank_max },
            })),
            targetMetrics: JSON.parse(activity.target_metrics || '{}'),
            isActive: activity.is_active,
            createdAt: new Date(activity.created_at),
            updatedAt: new Date(activity.updated_at),
          };
        }),
      );

      return {
        activities: activitiesWithRewards,
        total: countResult?.count || 0,
      };
    } catch (error) {
      logger.error('Failed to get activities', { error, filters });
      throw new Error('获取活动列表失败');
    }
  }

  /**
   * 用户加入活动
   */
  async joinActivity(activityId: string, userId: string, userInfo: {
    userName?: string
    userEmail?: string
  }): Promise<ActivityParticipant> {
    try {
      // 检查活动是否存在且可参与
      const activity = await this.getActivityById(activityId);
      if (activity.status !== ActivityStatus.ACTIVE) {
        throw new Error('活动未开放参与');
      }

      const now = new Date();
      if (now < activity.startDate || now > activity.endDate) {
        throw new Error('活动未在参与时间范围内');
      }

      // 检查用户是否已参与
      const [existing] = await this.db.query<any>(`
        SELECT id FROM activity_participants 
        WHERE activity_id = ? AND user_id = ?
      `, [activityId, userId]);

      if (existing) {
        throw new Error('用户已参与该活动');
      }

      const participantId = uuidv4();
      const progressId = uuidv4();

      await this.db.transaction(async (conn) => {
        // 添加参与者
        await conn.execute(`
          INSERT INTO activity_participants (
            id, activity_id, user_id, user_name, user_email, status
          ) VALUES (?, ?, ?, ?, ?, 'active')
        `, [participantId, activityId, userId, userInfo.userName, userInfo.userEmail]);

        // 初始化进度
        await conn.execute(`
          INSERT INTO activity_progress (
            id, activity_id, user_id, invites_sent, 
            registrations_achieved, activations_achieved, current_score
          ) VALUES (?, ?, ?, 0, 0, 0, 0)
        `, [progressId, activityId, userId]);

        // 记录加入事件
        await this.logActivityEvent(conn, activityId, userId, 'user_joined', {
          userName: userInfo.userName,
          userEmail: userInfo.userEmail,
        });
      });

      logger.info('User joined activity successfully', { activityId, userId });

      return {
        id: participantId,
        activityId,
        userId,
        userName: userInfo.userName,
        userEmail: userInfo.userEmail,
        joinedAt: new Date(),
        status: 'active',
      };
    } catch (error) {
      logger.error('Failed to join activity', { error, activityId, userId });
      throw error;
    }
  }

  /**
   * 更新用户活动进度
   */
  async updateUserProgress(
    activityId: string,
    userId: string,
    progressData: {
      invitesSent?: number
      registrationsAchieved?: number
      activationsAchieved?: number
    },
  ): Promise<ActivityProgress> {
    try {
      const activity = await this.getActivityById(activityId);

      // 计算新分数
      const currentProgress = await this.getUserProgress(activityId, userId);
      const newInvites = progressData.invitesSent || currentProgress.invitesSent;
      const newRegistrations = progressData.registrationsAchieved || currentProgress.registrationsAchieved;
      const newActivations = progressData.activationsAchieved || currentProgress.activationsAchieved;

      const newScore = this.calculateScore(activity.rules.scoringRules, {
        invitesSent: newInvites,
        registrationsAchieved: newRegistrations,
        activationsAchieved: newActivations,
      });

      await this.db.transaction(async (conn) => {
        // 更新进度
        await conn.execute(`
          UPDATE activity_progress 
          SET invites_sent = ?, registrations_achieved = ?, 
              activations_achieved = ?, current_score = ?, updated_at = CURRENT_TIMESTAMP
          WHERE activity_id = ? AND user_id = ?
        `, [newInvites, newRegistrations, newActivations, newScore, activityId, userId]);

        // 更新排名
        await this.updateRankings(conn, activityId);

        // 记录进度更新事件
        await this.logActivityEvent(conn, activityId, userId, 'progress_updated', {
          invitesSent: newInvites,
          registrationsAchieved: newRegistrations,
          activationsAchieved: newActivations,
          newScore,
        });
      });

      logger.info('User progress updated', { activityId, userId, newScore });
      return await this.getUserProgress(activityId, userId);
    } catch (error) {
      logger.error('Failed to update user progress', { error, activityId, userId, progressData });
      throw new Error('更新用户进度失败');
    }
  }

  /**
   * 获取用户活动进度
   */
  async getUserProgress(activityId: string, userId: string): Promise<ActivityProgress> {
    try {
      const [progress] = await this.db.query<any>(`
        SELECT * FROM activity_progress 
        WHERE activity_id = ? AND user_id = ?
      `, [activityId, userId]);

      if (!progress) {
        throw new Error('用户未参与该活动');
      }

      return {
        activityId: progress.activity_id,
        userId: progress.user_id,
        invitesSent: progress.invites_sent,
        registrationsAchieved: progress.registrations_achieved,
        activationsAchieved: progress.activations_achieved,
        currentScore: progress.current_score,
        rank: progress.current_rank,
        completedAt: progress.completed_at ? new Date(progress.completed_at) : undefined,
        updatedAt: new Date(progress.updated_at),
      };
    } catch (error) {
      logger.error('Failed to get user progress', { error, activityId, userId });
      throw new Error('获取用户进度失败');
    }
  }

  /**
   * 获取活动排行榜
   */
  async getActivityLeaderboard(
    activityId: string,
    pagination: Pagination = { page: 1, limit: 50 },
  ): Promise<{ leaderboard: ActivityProgress[], total: number }> {
    try {
      const offset = (pagination.page - 1) * pagination.limit;

      const [countResult] = await this.db.query<{ count: number }>(`
        SELECT COUNT(*) as count 
        FROM activity_progress ap
        JOIN activity_participants part ON ap.activity_id = part.activity_id AND ap.user_id = part.user_id
        WHERE ap.activity_id = ? AND part.status = 'active'
      `, [activityId]);

      const leaderboard = await this.db.query<any>(`
        SELECT ap.*, part.user_name, part.user_email
        FROM activity_progress ap
        JOIN activity_participants part ON ap.activity_id = part.activity_id AND ap.user_id = part.user_id
        WHERE ap.activity_id = ? AND part.status = 'active'
        ORDER BY ap.current_score DESC, ap.updated_at ASC
        LIMIT ? OFFSET ?
      `, [activityId, pagination.limit, offset]);

      const formattedLeaderboard = leaderboard.map((item: any, index: number) => ({
        activityId: item.activity_id,
        userId: item.user_id,
        invitesSent: item.invites_sent,
        registrationsAchieved: item.registrations_achieved,
        activationsAchieved: item.activations_achieved,
        currentScore: item.current_score,
        rank: offset + index + 1,
        completedAt: item.completed_at ? new Date(item.completed_at) : undefined,
        updatedAt: new Date(item.updated_at),
      }));

      return {
        leaderboard: formattedLeaderboard,
        total: countResult?.count || 0,
      };
    } catch (error) {
      logger.error('Failed to get activity leaderboard', { error, activityId });
      throw new Error('获取活动排行榜失败');
    }
  }

  /**
   * 完成活动并生成结果
   */
  async completeActivity(activityId: string): Promise<ActivityResult[]> {
    try {
      const activity = await this.getActivityById(activityId);

      if (activity.status === ActivityStatus.COMPLETED) {
        throw new Error('活动已完成');
      }

      const results: ActivityResult[] = [];

      await this.db.transaction(async (conn) => {
        // 获取最终排行榜
        const finalRankings = await conn.query<any>(`
          SELECT ap.*, part.user_name
          FROM activity_progress ap
          JOIN activity_participants part ON ap.activity_id = part.activity_id AND ap.user_id = part.user_id
          WHERE ap.activity_id = ? AND part.status = 'active'
          ORDER BY ap.current_score DESC, ap.updated_at ASC
        `, [activityId]);

        // 确定获奖者并分配奖励
        for (let i = 0; i < finalRankings.length; i++) {
          const participant = finalRankings[i];
          const rank = i + 1;

          // 确定用户获得的奖励
          const userRewards = this.determineUserRewards(activity.rewards, rank);
          const isWinner = userRewards.length > 0;

          // 保存结果
          const resultId = uuidv4();
          await conn.execute(`
            INSERT INTO activity_results (
              id, activity_id, user_id, final_rank, final_score, 
              is_winner, rewards_granted, completed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          `, [
            resultId,
            activityId,
            participant.user_id,
            rank,
            participant.current_score,
            isWinner,
            JSON.stringify(userRewards),
          ]);

          results.push({
            activityId,
            userId: participant.user_id,
            rank,
            score: participant.current_score,
            rewards: userRewards,
            isWinner,
            completedAt: new Date(),
          });
        }

        // 更新活动状态为已完成
        await conn.execute(`
          UPDATE invitation_activities 
          SET status = 'completed', updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [activityId]);

        // 记录活动完成事件
        await this.logActivityEvent(conn, activityId, null, 'activity_completed', {
          totalParticipants: finalRankings.length,
          winnersCount: results.filter(r => r.isWinner).length,
        });
      });

      logger.info('Activity completed successfully', {
        activityId,
        participantsCount: results.length,
        winnersCount: results.filter(r => r.isWinner).length,
      });

      return results;
    } catch (error) {
      logger.error('Failed to complete activity', { error, activityId });
      throw new Error('完成活动失败');
    }
  }

  /**
   * 获取活动统计数据
   */
  async getActivityStatistics(activityId: string): Promise<{
    totalParticipants: number
    activeParticipants: number
    totalInvites: number
    totalRegistrations: number
    totalActivations: number
    averageScore: number
    topScore: number
  }> {
    try {
      const [stats] = await this.db.query<any>(`
        SELECT 
          COUNT(DISTINCT part.user_id) as total_participants,
          COUNT(DISTINCT CASE WHEN part.status = 'active' THEN part.user_id END) as active_participants,
          COALESCE(SUM(prog.invites_sent), 0) as total_invites,
          COALESCE(SUM(prog.registrations_achieved), 0) as total_registrations,
          COALESCE(SUM(prog.activations_achieved), 0) as total_activations,
          COALESCE(AVG(prog.current_score), 0) as average_score,
          COALESCE(MAX(prog.current_score), 0) as top_score
        FROM activity_participants part
        LEFT JOIN activity_progress prog ON part.activity_id = prog.activity_id AND part.user_id = prog.user_id
        WHERE part.activity_id = ?
      `, [activityId]);

      return {
        totalParticipants: stats?.total_participants || 0,
        activeParticipants: stats?.active_participants || 0,
        totalInvites: stats?.total_invites || 0,
        totalRegistrations: stats?.total_registrations || 0,
        totalActivations: stats?.total_activations || 0,
        averageScore: Math.round(stats?.average_score || 0),
        topScore: stats?.top_score || 0,
      };
    } catch (error) {
      logger.error('Failed to get activity statistics', { error, activityId });
      throw new Error('获取活动统计失败');
    }
  }

  /**
   * 计算用户分数
   */
  private calculateScore(
    scoringRules: ActivityRules['scoringRules'],
    progress: {
      invitesSent: number
      registrationsAchieved: number
      activationsAchieved: number
    },
  ): number {
    return (
      progress.invitesSent * scoringRules.invitePoints +
      progress.registrationsAchieved * scoringRules.registrationPoints +
      progress.activationsAchieved * scoringRules.activationPoints
    );
  }

  /**
   * 更新活动排名
   */
  private async updateRankings(conn: any, activityId: string): Promise<void> {
    await conn.execute(`
      UPDATE activity_progress ap1
      SET current_rank = (
        SELECT COUNT(*) + 1
        FROM activity_progress ap2
        WHERE ap2.activity_id = ap1.activity_id
        AND (ap2.current_score > ap1.current_score 
             OR (ap2.current_score = ap1.current_score AND ap2.updated_at < ap1.updated_at))
      )
      WHERE ap1.activity_id = ?
    `, [activityId]);
  }

  /**
   * 确定用户获得的奖励
   */
  private determineUserRewards(rewards: ActivityReward[], rank: number): ActivityReward[] {
    return rewards.filter(reward => {
      if (!reward.rankRange) return rank === 1;
      return rank >= reward.rankRange.min && rank <= reward.rankRange.max;
    });
  }

  /**
   * 记录活动事件
   */
  private async logActivityEvent(
    conn: any,
    activityId: string,
    userId: string | null,
    eventType: string,
    eventData: any,
  ): Promise<void> {
    await conn.execute(`
      INSERT INTO activity_events (
        id, activity_id, user_id, event_type, event_data
      ) VALUES (?, ?, ?, ?, ?)
    `, [uuidv4(), activityId, userId, eventType, JSON.stringify(eventData)]);
  }
}
