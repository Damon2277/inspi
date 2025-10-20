/**
 * 贡献度计算服务
 */

import { ObjectId } from 'mongodb';

import {
  CONTRIBUTION_POINTS,
  CACHE_CONFIG,
  LEADERBOARD_CONFIG,
  ACHIEVEMENTS,
  TRENDING_WORKS_CONFIG,
  TIME_PERIODS,
} from '@/lib/config/contribution';
import ContributionLog, { ContributionLogDocument } from '@/lib/models/ContributionLog';
import User from '@/lib/models/User';
import Work from '@/lib/models/Work';
import redis from '@/lib/redis';
import {
  ContributionType,
  ContributionRecord,
  ContributionStats,
  ContributionHistoryQuery,
  ContributionHistory,
  LeaderboardQuery,
  LeaderboardResponse,
  LeaderboardType,
  LeaderboardEntry,
  TrendingWork,
  TrendingWorksResponse,
  ContributionCalculationRequest,
  Achievement,
} from '@/shared/types/contribution';
import { handleServiceError } from '@/shared/utils/standardErrorHandler';


class ContributionService {
  /**
   * 创建贡献度记录
   */
  async createContribution(request: ContributionCalculationRequest): Promise<ContributionRecord> {
    try {
      const contributionLog = new ContributionLog({
        userId: new ObjectId(request.userId),
        type: request.type,
        points: request.points || this.getPointsForType(request.type),
        workId: request.workId ? new ObjectId(request.workId) : undefined,
        description: request.metadata?.description || `获得${request.type}贡献度`,
        metadata: request.metadata || {},
      });

      const savedLog = await contributionLog.save();

      // 更新用户总贡献度缓存
      await this.invalidateUserCache(request.userId);

      // 检查成就解锁
      await this.checkAchievements(request.userId);

      // 异步更新排行榜缓存
      this.updateLeaderboardCache().catch(console.error);

      return this.formatContributionRecord(savedLog);
    } catch (error) {
      handleServiceError(error, '创建贡献度记录');
      throw error;
    }
  }

  /**
   * 记录作品创作贡献度
   */
  async recordCreationContribution(userId: string, workId: string, workTitle: string): Promise<ContributionRecord> {
    return await this.createContribution({
      userId,
      type: ContributionType.WORK_CREATION,
      workId,
      metadata: {
        description: `发布作品《${workTitle}》`,
        workTitle,
        contributionType: 'creation',
      },
    });
  }

  /**
   * 记录作品复用贡献度
   */
  async recordReuseContribution(
    originalAuthorId: string,
    workId: string,
    workTitle: string,
    reuserUserId: string,
  ): Promise<ContributionRecord> {
    return await this.createContribution({
      userId: originalAuthorId,
      type: ContributionType.WORK_REUSED,
      workId,
      metadata: {
        description: `作品《${workTitle}》被复用`,
        workTitle,
        reuserUserId,
        contributionType: 'reuse',
      },
    });
  }

  /**
   * 获取用户贡献度统计
   */
  async getUserContributionStats(userId: string): Promise<ContributionStats> {
    try {
      const cacheKey = CACHE_CONFIG.KEYS.USER_CONTRIBUTION(userId);
      const cached = await redis.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      // 聚合查询用户贡献度统计
      const stats = await (ContributionLog.aggregate as any)([
        { $match: { userId: new ObjectId(userId) } },
        {
          $group: {
            _id: null,
            totalPoints: { $sum: '$points' },
            creationPoints: {
              $sum: { $cond: [{ $eq: ['$type', ContributionType.WORK_CREATION] }, '$points', 0] },
            },
            reusePoints: {
              $sum: { $cond: [{ $eq: ['$type', ContributionType.WORK_REUSED] }, '$points', 0] },
            },
            bonusPoints: {
              $sum: { $cond: [{ $eq: ['$type', ContributionType.MILESTONE_REACHED] }, '$points', 0] },
            },
            recordCount: { $sum: 1 },
            lastActivity: { $max: '$createdAt' },
          },
        },
      ]);

      const userStats = stats[0] || {
        totalPoints: 0,
        creationPoints: 0,
        reusePoints: 0,
        bonusPoints: 0,
        recordCount: 0,
        lastActivity: new Date(),
      };

      // 获取作品数量统计
      const worksCount = await (Work.countDocuments as any)({ author: new ObjectId(userId), status: 'published' });

      // 获取被复用次数
      const reuseCount = await (ContributionLog.countDocuments as any)({
        userId: new ObjectId(userId),
        type: ContributionType.WORK_REUSED,
      });

      const result: ContributionStats = {
        userId,
        totalPoints: userStats.totalPoints,
        creationPoints: userStats.creationPoints,
        reusePoints: userStats.reusePoints,
        bonusPoints: userStats.bonusPoints,
        worksCount,
        reuseCount,
        lastUpdated: new Date(),
      };

      // 缓存结果
      await redis.set(cacheKey, JSON.stringify(result), CACHE_CONFIG.TTL.USER_STATS);

      return result;
    } catch (error) {
      handleServiceError(error, '获取用户贡献度统计');
      throw error;
    }
  }

  /**
   * 获取排行榜
   */
  async getLeaderboard(query: LeaderboardQuery = {}): Promise<LeaderboardResponse> {
    try {
      const {
        type = 'total',
        limit = LEADERBOARD_CONFIG.DEFAULT_LIMIT,
        offset = 0,
        includeUserRank = false,
        userId,
      } = query;

      const cacheKey = `${CACHE_CONFIG.KEYS.LEADERBOARD_ALL}:${type}:${limit}:${offset}`;
      const cached = await redis.get(cacheKey);

      if (cached && !includeUserRank) {
        return JSON.parse(cached);
      }

      let startDate: Date | undefined;

      // 根据类型设置时间范围
      if (type === 'weekly') {
        startDate = new Date(Date.now() - TIME_PERIODS.WEEKLY.duration);
      } else if (type === 'monthly') {
        startDate = new Date(Date.now() - TIME_PERIODS.MONTHLY.duration);
      }

      // 获取排行榜数据
      let matchCondition = {};
      if (startDate) {
        matchCondition = { createdAt: { $gte: startDate } };
      }

      const leaderboardData = await (ContributionLog.aggregate as any)([
        { $match: matchCondition },
        {
          $group: {
            _id: '$userId',
            totalPoints: { $sum: '$points' },
            creationPoints: {
              $sum: { $cond: [{ $eq: ['$type', ContributionType.WORK_CREATION] }, '$points', 0] },
            },
            reusePoints: {
              $sum: { $cond: [{ $eq: ['$type', ContributionType.WORK_REUSED] }, '$points', 0] },
            },
            recordCount: { $sum: 1 },
            lastActivity: { $max: '$createdAt' },
          },
        },
        { $sort: { totalPoints: -1 } },
        { $skip: offset },
        { $limit: limit },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: '$user' },
        {
          $lookup: {
            from: 'works',
            let: { userId: '$_id' },
            pipeline: [
              { $match: { $expr: { $eq: ['$author', '$$userId'] }, status: 'published' } },
              { $count: 'count' },
            ],
            as: 'worksCount',
          },
        },
        {
          $project: {
            userId: { $toString: '$_id' },
            userName: '$user.name',
            userAvatar: '$user.avatar',
            totalPoints: 1,
            creationPoints: 1,
            reusePoints: 1,
            creationCount: { $ifNull: [{ $arrayElemAt: ['$worksCount.count', 0] }, 0] },
            reuseCount: { $divide: ['$reusePoints', CONTRIBUTION_POINTS.reuse.points] },
            recordCount: 1,
            lastActivity: 1,
          },
        },
      ]);

      // 格式化排行榜数据
      const entries: LeaderboardEntry[] = leaderboardData.map((entry, index) => ({
        userId: entry.userId,
        userName: entry.userName,
        userAvatar: entry.userAvatar,
        totalPoints: entry.totalPoints,
        rank: offset + index + 1,
        creationCount: entry.creationCount,
        reuseCount: Math.floor(entry.reuseCount),
        lastActivity: entry.lastActivity.toISOString(),
      }));

      let userRank: LeaderboardEntry | undefined;

      // 如果需要包含用户排名信息
      if (includeUserRank && userId) {
        userRank = await this.getUserRankInLeaderboard(userId, type);
      }

      const result: LeaderboardResponse = {
        type: type as LeaderboardType,
        entries,
        total: entries.length,
        userRank,
        lastUpdated: new Date(),
      };

      // 缓存结果（不包含用户特定信息）
      if (!includeUserRank) {
        await redis.set(cacheKey, JSON.stringify(result), CACHE_CONFIG.TTL.LEADERBOARD);
      }

      return result;
    } catch (error) {
      handleServiceError(error, '获取排行榜');
      throw error;
    }
  }

  /**
   * 获取用户在排行榜中的排名信息
   */
  async getUserRankInLeaderboard(userId: string, type: string = 'total'): Promise<LeaderboardEntry | undefined> {
    try {
      let startDate: Date | undefined;

      if (type === 'weekly') {
        startDate = new Date(Date.now() - TIME_PERIODS.WEEKLY.duration);
      } else if (type === 'monthly') {
        startDate = new Date(Date.now() - TIME_PERIODS.MONTHLY.duration);
      }

      let matchCondition = {};
      if (startDate) {
        matchCondition = { createdAt: { $gte: startDate } };
      }

      // 获取用户积分
      const userStats = await (ContributionLog.aggregate as any)([
        { $match: { ...matchCondition, userId: new ObjectId(userId) } },
        {
          $group: {
            _id: null,
            totalPoints: { $sum: '$points' },
            lastActivity: { $max: '$createdAt' },
          },
        },
      ]);

      if (!userStats.length) {
        return undefined;
      }

      const userPoints = userStats[0].totalPoints;

      // 计算排名
      const rankData = await (ContributionLog.aggregate as any)([
        { $match: matchCondition },
        {
          $group: {
            _id: '$userId',
            totalPoints: { $sum: '$points' },
          },
        },
        {
          $match: {
            totalPoints: { $gt: userPoints },
          },
        },
        { $count: 'count' },
      ]);

      const rank = (rankData[0]?.count || 0) + 1;

      // 获取用户信息
      const user = await (User.findById as any)(userId).select('name avatar');
      if (!user) {
        return undefined;
      }

      // 获取创作和复用统计
      const worksCount = await (Work.countDocuments as any)({ author: new ObjectId(userId), status: 'published' });
      const reuseCount = await (ContributionLog.countDocuments as any)({
        userId: new ObjectId(userId),
        type: ContributionType.WORK_REUSED,
      });

      return {
        userId,
        userName: user.name,
        userAvatar: user.avatar,
        totalPoints: userPoints,
        rank,
        creationCount: worksCount,
        reuseCount,
        lastActivity: userStats[0].lastActivity.toISOString(),
      };
    } catch (error) {
      handleServiceError(error, '获取用户排名');
      return undefined;
    }
  }

  /**
   * 获取热门作品推荐
   */
  async getTrendingWorks(period: 'daily' | 'weekly' | 'monthly' = 'weekly', limit: number = TRENDING_WORKS_CONFIG.DEFAULT_LIMIT): Promise<TrendingWorksResponse> {
    try {
      const cacheKey = CACHE_CONFIG.KEYS.TRENDING_WORKS(period);
      const cached = await redis.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      const now = new Date();
      let startDate: Date;

      switch (period) {
        case 'daily':
          startDate = new Date(now.getTime() - TIME_PERIODS.DAILY.duration);
          break;
        case 'weekly':
          startDate = new Date(now.getTime() - TIME_PERIODS.WEEKLY.duration);
          break;
        case 'monthly':
          startDate = new Date(now.getTime() - TIME_PERIODS.MONTHLY.duration);
          break;
        default:
          startDate = new Date(now.getTime() - TIME_PERIODS.WEEKLY.duration);
      }

      // 计算热门作品
      const trendingWorks = await (Work.aggregate as any)([
        {
          $match: {
            status: 'published',
            publishedAt: { $gte: startDate },
          },
        },
        {
          $lookup: {
            from: 'contributionlogs',
            let: { workId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$workId', '$$workId'] },
                  type: ContributionType.WORK_REUSED,
                  createdAt: { $gte: startDate },
                },
              },
            ],
            as: 'recentReuses',
          },
        },
        {
          $lookup: {
            from: 'contributionlogs',
            let: { workId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$workId', '$$workId'] },
                  type: ContributionType.WORK_REUSED,
                },
              },
            ],
            as: 'totalReuses',
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'author',
            foreignField: '_id',
            as: 'authorInfo',
          },
        },
        { $unwind: '$authorInfo' },
        {
          $addFields: {
            recentReuseCount: { $size: '$recentReuses' },
            totalReuseCount: { $size: '$totalReuses' },
            // 时间衰减因子：越新的作品得分越高
            timeDecay: {
              $divide: [
                { $subtract: [now, '$publishedAt'] },
                1000 * 60 * 60 * 24, // 转换为天数
              ],
            },
          },
        },
        {
          $addFields: {
            // 热门度评分算法
            trendingScore: {
              $add: [
                { $multiply: ['$recentReuseCount', TRENDING_WORKS_CONFIG.WEIGHT_FACTORS.RECENT_REUSE] },
                { $multiply: ['$totalReuseCount', TRENDING_WORKS_CONFIG.WEIGHT_FACTORS.TOTAL_REUSE] },
                {
                  $multiply: [
                    { $max: [0, { $subtract: [30, '$timeDecay'] }] }, // 30天内的新作品加分
                    TRENDING_WORKS_CONFIG.WEIGHT_FACTORS.CREATION_TIME,
                  ],
                },
              ],
            },
          },
        },
        {
          $match: {
            totalReuseCount: { $gte: TRENDING_WORKS_CONFIG.MIN_REUSE_COUNT },
          },
        },
        { $sort: { trendingScore: -1 } },
        { $limit: limit },
        {
          $project: {
            workId: { $toString: '$_id' },
            title: 1,
            authorId: { $toString: '$author' },
            authorName: '$authorInfo.name',
            reuseCount: '$totalReuseCount',
            viewCount: { $ifNull: ['$viewCount', 0] },
            trendingScore: { $round: ['$trendingScore', 2] },
            createdAt: '$publishedAt',
            thumbnail: '$thumbnail',
            tags: { $ifNull: ['$tags', []] },
          },
        },
      ]);

      const result: TrendingWorksResponse = {
        works: trendingWorks,
        period,
        lastUpdated: new Date(),
      };

      // 缓存结果
      await redis.set(cacheKey, JSON.stringify(result), TRENDING_WORKS_CONFIG.CACHE_TTL);

      return result;
    } catch (error) {
      handleServiceError(error, '获取热门作品推荐');
      throw error;
    }
  }

  /**
   * 获取用户排名
   */
  async getUserRank(userId: string): Promise<{ rank: number; totalPoints: number } | null> {
    try {
      // 获取用户积分
      const userStats = await (ContributionLog.aggregate as any)([
        { $match: { userId: new ObjectId(userId) } },
        { $group: { _id: null, totalPoints: { $sum: '$points' } } },
      ]);

      if (!userStats.length) {
        return null;
      }

      const userPoints = userStats[0].totalPoints;

      // 计算排名
      const rankData = await (ContributionLog.aggregate as any)([
        {
          $group: {
            _id: '$userId',
            totalPoints: { $sum: '$points' },
          },
        },
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
            higherRanked: {
              $sum: { $cond: [{ $gt: ['$totalPoints', userPoints] }, 1, 0] },
            },
          },
        },
      ]);

      if (!rankData.length) {
        return null;
      }

      const { higherRanked } = rankData[0];
      const rank = higherRanked + 1;

      return {
        rank,
        totalPoints: userPoints,
      };
    } catch (error) {
      handleServiceError(error, '获取用户排名');
      return null;
    }
  }

  /**
   * 获取贡献度历史
   */
  async getContributionHistory(query: ContributionHistoryQuery): Promise<ContributionHistory> {
    try {
      const {
        userId,
        type,
        startDate,
        endDate,
        limit = 20,
        offset = 0,
      } = query;

      // 构建查询条件
      const matchCondition: any = { userId: new ObjectId(userId) };

      if (type) {
        matchCondition.type = type;
      }

      if (startDate || endDate) {
        matchCondition.createdAt = {};
        if (startDate) matchCondition.createdAt.$gte = startDate;
        if (endDate) matchCondition.createdAt.$lte = endDate;
      }

      // 分页查询
      const [records, totalCount] = await Promise.all([
        // 获取记录
        (ContributionLog.find as any)(matchCondition)
          .sort({ createdAt: -1 })
          .skip(offset)
          .limit(limit)
          .populate('workId', 'title')
        .lean(),

        // 获取总数
        (ContributionLog.countDocuments as any)(matchCondition),
      ]);

      const formattedRecords: ContributionRecord[] = records.map(record => this.formatContributionRecord(record));

      // 获取汇总统计
      const userStats = await this.getUserContributionStats(userId);

      // 获取本周和本月的积分
      const now = new Date();
      const weekStart = new Date(now.getTime() - TIME_PERIODS.WEEKLY.duration);
      const monthStart = new Date(now.getTime() - TIME_PERIODS.MONTHLY.duration);

      const weeklyStats = await (ContributionLog.aggregate as any)([
        {
          $match: {
            userId: new ObjectId(userId),
            createdAt: { $gte: weekStart, $lte: now },
          },
        },
        { $group: { _id: null, totalPoints: { $sum: '$points' } } },
      ]);

      const monthlyStats = await (ContributionLog.aggregate as any)([
        {
          $match: {
            userId: new ObjectId(userId),
            createdAt: { $gte: monthStart, $lte: now },
          },
        },
        { $group: { _id: null, totalPoints: { $sum: '$points' } } },
      ]);

      // 按类型统计
      const byType: Record<ContributionType, number> = {} as Record<ContributionType, number>;
      Object.values(ContributionType).forEach(type => {
        byType[type] = 0;
      });

      const typeStats = await (ContributionLog.aggregate as any)([
        { $match: { userId: new ObjectId(userId) } },
        {
          $group: {
            _id: '$type',
            points: { $sum: '$points' },
          },
        },
      ]);

      typeStats.forEach(stat => {
        byType[stat._id as ContributionType] = stat.points;
      });

      return {
        records: formattedRecords,
        total: totalCount,
        hasMore: totalCount > offset + limit,
        summary: {
          totalPoints: userStats.totalPoints,
          thisWeek: weeklyStats[0]?.totalPoints || 0,
          thisMonth: monthlyStats[0]?.totalPoints || 0,
          byType,
        },
      };
    } catch (error) {
      handleServiceError(error, '获取贡献度历史');
      throw error;
    }
  }

  /**
   * 检查用户成就
   */
  async checkAchievements(userId: string): Promise<Achievement[]> {
    try {
      const userStats = await this.getUserContributionStats(userId);
      const unlockedAchievements: Achievement[] = [];

      for (const achievement of ACHIEVEMENTS) {
        // 检查是否已解锁
        const existingAchievement = await this.getUserAchievement(userId, achievement.id);
        if (existingAchievement) continue;

        let isUnlocked = false;

        switch (achievement.requirement.type) {
          case 'points':
            isUnlocked = userStats.totalPoints >= achievement.requirement.value;
            break;
          case 'count':
            if (achievement.type === 'creation') {
              isUnlocked = userStats.worksCount >= achievement.requirement.value;
            } else if (achievement.type === 'reuse') {
              isUnlocked = userStats.reuseCount >= achievement.requirement.value;
            }
            break;
          // TODO: 实现 streak 类型的成就检查
        }

        if (isUnlocked) {
          await this.unlockAchievement(userId, achievement);
          unlockedAchievements.push({
            ...achievement,
            unlockedAt: new Date().toISOString(),
          });
        }
      }

      return unlockedAchievements;
    } catch (error) {
      handleServiceError(error, '检查用户成就');
      return [];
    }
  }

  /**
   * 清除用户相关缓存
   */
  async invalidateUserCache(userId: string): Promise<void> {
    try {
      const keys = [
        CACHE_CONFIG.KEYS.USER_CONTRIBUTION(userId),
        CACHE_CONFIG.KEYS.CONTRIBUTION_STATS(userId),
      ];

      await Promise.all(keys.map(key => redis.del(key)));
    } catch (error) {
      console.error('清除用户缓存失败:', error);
    }
  }

  /**
   * 获取贡献度类型对应的分数
   */
  private getPointsForType(type: ContributionType): number {
    switch (type) {
      case ContributionType.WORK_CREATION:
        return CONTRIBUTION_POINTS.creation.points;
      case ContributionType.WORK_REUSED:
        return CONTRIBUTION_POINTS.reuse.points;
      case ContributionType.WORK_SHARED:
        return 5;
      case ContributionType.PROFILE_COMPLETED:
        return 20;
      case ContributionType.FIRST_WORK:
        return 30;
      case ContributionType.MILESTONE_REACHED:
        return 100;
      default:
        return 0;
    }
  }

  /**
   * 格式化贡献度记录
   */
  private formatContributionRecord(record: any): ContributionRecord {
    return {
      id: record._id.toString(),
      userId: record.userId.toString(),
      workId: record.workId?.toString(),
      type: record.type,
      points: record.points,
      description: record.description,
      displayText: this.getDisplayText(record),
      createdAt: record.createdAt,
      metadata: record.metadata,
    };
  }

  /**
   * 获取贡献度记录的显示文本
   */
  private getDisplayText(record: any): string {
    switch (record.type) {
      case ContributionType.WORK_CREATION:
        return `发布作品《${record.metadata?.workTitle || '未知作品'}》获得 ${record.points} 分`;
      case ContributionType.WORK_REUSED:
        return `作品《${record.metadata?.workTitle || '未知作品'}》被复用获得 ${record.points} 分`;
      case ContributionType.WORK_SHARED:
        return `作品《${record.metadata?.workTitle || '未知作品'}》被分享获得 ${record.points} 分`;
      case ContributionType.PROFILE_COMPLETED:
        return `完善个人资料获得 ${record.points} 分`;
      case ContributionType.FIRST_WORK:
        return `首次发布作品获得 ${record.points} 分`;
      case ContributionType.MILESTONE_REACHED:
        return `达成里程碑获得 ${record.points} 分：${record.description}`;
      default:
        return record.description || `获得 ${record.points} 分`;
    }
  }

  /**
   * 获取用户成就
   */
  private async getUserAchievement(userId: string, achievementId: string): Promise<any> {
    // TODO: 实现成就存储和查询
    return null;
  }

  /**
   * 解锁成就
   */
  private async unlockAchievement(userId: string, achievement: any): Promise<void> {
    try {
      // 添加奖励积分
      if (achievement.reward.points > 0) {
        await this.createContribution({
          userId,
          type: ContributionType.MILESTONE_REACHED,
          points: achievement.reward.points,
          metadata: {
            description: `解锁成就：${achievement.title}`,
            achievementId: achievement.id,
            achievementTitle: achievement.title,
          },
        });
      }

      // TODO: 保存成就解锁记录到专门的成就表
    } catch (error) {
      console.error('解锁成就失败:', error);
    }
  }

  /**
   * 更新排行榜缓存
   */
  async updateLeaderboardCache(): Promise<void> {
    try {
      const periods = ['total', 'weekly', 'monthly'];
      const limit = LEADERBOARD_CONFIG.DEFAULT_LIMIT;

      for (const period of periods) {
        // 清除旧缓存
        const cacheKey = `${CACHE_CONFIG.KEYS.LEADERBOARD_ALL}:${period}:${limit}:0`;
        await redis.del(cacheKey);

        // 预热新缓存
        await this.getLeaderboard({ type: period, limit });
      }

      // 更新热门作品缓存
      await this.updateTrendingWorksCache();
    } catch (error) {
      console.error('更新排行榜缓存失败:', error);
    }
  }

  /**
   * 更新热门作品缓存
   */
  async updateTrendingWorksCache(): Promise<void> {
    try {
      const periods: ('daily' | 'weekly' | 'monthly')[] = ['daily', 'weekly', 'monthly'];

      for (const period of periods) {
        // 清除旧缓存
        const cacheKey = CACHE_CONFIG.KEYS.TRENDING_WORKS(period);
        await redis.del(cacheKey);

        // 预热新缓存
        await this.getTrendingWorks(period);
      }
    } catch (error) {
      console.error('更新热门作品缓存失败:', error);
    }
  }

  /**
   * 获取排行榜统计信息
   */
  async getLeaderboardStats(): Promise<{
    totalUsers: number;
    activeUsersThisWeek: number;
    activeUsersThisMonth: number;
    topContributor: { userId: string; userName: string; totalPoints: number } | null;
  }> {
    try {
      const now = new Date();
      const weekStart = new Date(now.getTime() - TIME_PERIODS.WEEKLY.duration);
      const monthStart = new Date(now.getTime() - TIME_PERIODS.MONTHLY.duration);

      // 总用户数
      const totalUsers = await (User.countDocuments as any)();

      // 本周活跃用户数
      const activeUsersThisWeek = await (ContributionLog.distinct as any)('userId', {
        createdAt: { $gte: weekStart },
      }).then(users => users.length);

      // 本月活跃用户数
      const activeUsersThisMonth = await (ContributionLog.distinct as any)('userId', {
        createdAt: { $gte: monthStart },
      }).then(users => users.length);

      // 总贡献度最高的用户
      const topContributorData = await (ContributionLog.aggregate as any)([
        {
          $group: {
            _id: '$userId',
            totalPoints: { $sum: '$points' },
          },
        },
        { $sort: { totalPoints: -1 } },
        { $limit: 1 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: '$user' },
        {
          $project: {
            userId: { $toString: '$_id' },
            userName: '$user.name',
            totalPoints: 1,
          },
        },
      ]);

      const topContributor = topContributorData.length > 0 ? topContributorData[0] : null;

      return {
        totalUsers,
        activeUsersThisWeek,
        activeUsersThisMonth,
        topContributor,
      };
    } catch (error) {
      handleServiceError(error, '获取排行榜统计信息');
      throw error;
    }
  }
}

export const contributionService = new ContributionService();

export default contributionService;
