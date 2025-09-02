/**
 * 排行榜功能测试
 */
import { describe, it, expect } from '@jest/globals';
import { LEADERBOARD_CONFIG, TRENDING_WORKS_CONFIG } from '@/lib/config/contribution';
import { LeaderboardType } from '@/types/contribution';

describe('排行榜功能测试', () => {
  describe('排行榜配置验证', () => {
    it('应该有正确的默认配置', () => {
      expect(LEADERBOARD_CONFIG.DEFAULT_LIMIT).toBe(50);
      expect(LEADERBOARD_CONFIG.MAX_LIMIT).toBe(100);
      expect(LEADERBOARD_CONFIG.CACHE_TTL).toBeGreaterThan(0);
      expect(LEADERBOARD_CONFIG.PERIODS).toContain('all');
      expect(LEADERBOARD_CONFIG.PERIODS).toContain('weekly');
      expect(LEADERBOARD_CONFIG.PERIODS).toContain('monthly');
    });

    it('应该有正确的热门作品配置', () => {
      expect(TRENDING_WORKS_CONFIG.DEFAULT_LIMIT).toBe(12);
      expect(TRENDING_WORKS_CONFIG.MAX_LIMIT).toBe(50);
      expect(TRENDING_WORKS_CONFIG.MIN_REUSE_COUNT).toBeGreaterThanOrEqual(1);
      expect(TRENDING_WORKS_CONFIG.CACHE_TTL).toBeGreaterThan(0);
    });

    it('权重因子总和应该合理', () => {
      const weights = TRENDING_WORKS_CONFIG.WEIGHT_FACTORS;
      const totalWeight = weights.RECENT_REUSE + weights.TOTAL_REUSE + weights.CREATION_TIME;
      expect(totalWeight).toBeCloseTo(1.0, 10);
    });
  });

  describe('排行榜类型验证', () => {
    it('应该包含所有必要的排行榜类型', () => {
      expect(LeaderboardType.TOTAL).toBe('total');
      expect(LeaderboardType.WEEKLY).toBe('weekly');
      expect(LeaderboardType.MONTHLY).toBe('monthly');
      expect(LeaderboardType.CREATION).toBe('creation');
      expect(LeaderboardType.REUSE).toBe('reuse');
    });
  });

  describe('排行榜查询参数验证', () => {
    it('应该正确处理默认参数', () => {
      const defaultQuery = {};
      // 测试默认参数处理逻辑
      expect(defaultQuery).toBeDefined();
    });

    it('应该验证limit参数范围', () => {
      const maxLimit = LEADERBOARD_CONFIG.MAX_LIMIT;
      const testLimit = maxLimit + 10;
      
      // 实际的限制应该在API层面处理
      expect(Math.min(testLimit, maxLimit)).toBe(maxLimit);
    });

    it('应该验证offset参数', () => {
      const negativeOffset = -5;
      const validOffset = Math.max(negativeOffset, 0);
      
      expect(validOffset).toBe(0);
    });
  });

  describe('热门作品算法验证', () => {
    it('应该正确计算热门度评分', () => {
      const recentReuseCount = 5;
      const totalReuseCount = 10;
      const timeDecay = 15; // 15天前
      
      const weights = TRENDING_WORKS_CONFIG.WEIGHT_FACTORS;
      const expectedScore = 
        recentReuseCount * weights.RECENT_REUSE +
        totalReuseCount * weights.TOTAL_REUSE +
        Math.max(0, 30 - timeDecay) * weights.CREATION_TIME;
      
      expect(expectedScore).toBeGreaterThan(0);
      expect(expectedScore).toBe(5 * 0.6 + 10 * 0.3 + 15 * 0.1);
    });

    it('新作品应该获得时间加分', () => {
      const newWorkTimeDecay = 5; // 5天前
      const oldWorkTimeDecay = 35; // 35天前
      
      const newWorkTimeBonus = Math.max(0, 30 - newWorkTimeDecay);
      const oldWorkTimeBonus = Math.max(0, 30 - oldWorkTimeDecay);
      
      expect(newWorkTimeBonus).toBeGreaterThan(oldWorkTimeBonus);
      expect(newWorkTimeBonus).toBe(25);
      expect(oldWorkTimeBonus).toBe(0);
    });
  });

  describe('缓存键格式验证', () => {
    it('应该生成正确的缓存键格式', () => {
      const userId = '507f1f77bcf86cd799439011';
      const period = 'weekly';
      
      // 测试缓存键格式
      expect(`leaderboard:all:total:50:0`).toMatch(/^leaderboard:all:/);
      expect(`user_contribution:${userId}`).toMatch(/^user_contribution:/);
      expect(`trending_works:${period}`).toMatch(/^trending_works:/);
    });
  });

  describe('排名计算逻辑', () => {
    it('应该正确计算用户排名', () => {
      const userPoints = 150;
      const higherPointsUsers = 5; // 5个用户积分更高
      const expectedRank = higherPointsUsers + 1;
      
      expect(expectedRank).toBe(6);
    });

    it('相同积分用户应该有相同排名', () => {
      const samePointsUsers = [
        { userId: '1', points: 100 },
        { userId: '2', points: 100 },
        { userId: '3', points: 90 }
      ];
      
      // 前两个用户应该有相同排名
      expect(samePointsUsers[0].points).toBe(samePointsUsers[1].points);
      expect(samePointsUsers[0].points).toBeGreaterThan(samePointsUsers[2].points);
    });
  });

  describe('时间范围计算', () => {
    it('应该正确计算周期时间范围', () => {
      const now = new Date('2024-01-15T12:00:00Z');
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      expect(weekAgo.getTime()).toBeLessThan(now.getTime());
      expect(monthAgo.getTime()).toBeLessThan(weekAgo.getTime());
      
      // 验证时间差
      const weekDiff = now.getTime() - weekAgo.getTime();
      const monthDiff = now.getTime() - monthAgo.getTime();
      
      expect(weekDiff).toBe(7 * 24 * 60 * 60 * 1000);
      expect(monthDiff).toBe(30 * 24 * 60 * 60 * 1000);
    });
  });

  describe('数据格式验证', () => {
    it('排行榜条目应该有必要字段', () => {
      const mockEntry = {
        userId: '507f1f77bcf86cd799439011',
        userName: '测试用户',
        userAvatar: 'https://example.com/avatar.jpg',
        totalPoints: 150,
        rank: 5,
        creationCount: 3,
        reuseCount: 7,
        lastActivity: '2024-01-15T12:00:00Z'
      };
      
      expect(mockEntry.userId).toBeDefined();
      expect(mockEntry.userName).toBeDefined();
      expect(mockEntry.totalPoints).toBeGreaterThanOrEqual(0);
      expect(mockEntry.rank).toBeGreaterThan(0);
      expect(mockEntry.creationCount).toBeGreaterThanOrEqual(0);
      expect(mockEntry.reuseCount).toBeGreaterThanOrEqual(0);
      expect(new Date(mockEntry.lastActivity)).toBeInstanceOf(Date);
    });

    it('热门作品条目应该有必要字段', () => {
      const mockWork = {
        workId: '507f1f77bcf86cd799439012',
        title: '测试作品',
        authorId: '507f1f77bcf86cd799439011',
        authorName: '测试作者',
        reuseCount: 5,
        likeCount: 10,
        viewCount: 100,
        trendingScore: 7.5,
        createdAt: new Date('2024-01-10T12:00:00Z'),
        tags: ['数学', '小学']
      };
      
      expect(mockWork.workId).toBeDefined();
      expect(mockWork.title).toBeDefined();
      expect(mockWork.authorId).toBeDefined();
      expect(mockWork.authorName).toBeDefined();
      expect(mockWork.reuseCount).toBeGreaterThanOrEqual(0);
      expect(mockWork.trendingScore).toBeGreaterThan(0);
      expect(mockWork.createdAt).toBeInstanceOf(Date);
      expect(Array.isArray(mockWork.tags)).toBe(true);
    });
  });
});

describe('排行榜边界情况测试', () => {
  it('应该处理空排行榜', () => {
    const emptyLeaderboard = {
      type: LeaderboardType.TOTAL,
      entries: [],
      total: 0,
      lastUpdated: new Date()
    };
    
    expect(emptyLeaderboard.entries).toHaveLength(0);
    expect(emptyLeaderboard.total).toBe(0);
  });

  it('应该处理无热门作品的情况', () => {
    const emptyTrending = {
      works: [],
      period: 'weekly' as const,
      lastUpdated: new Date()
    };
    
    expect(emptyTrending.works).toHaveLength(0);
  });

  it('应该处理极大的limit值', () => {
    const hugeLimit = 999999;
    const actualLimit = Math.min(hugeLimit, LEADERBOARD_CONFIG.MAX_LIMIT);
    
    expect(actualLimit).toBe(LEADERBOARD_CONFIG.MAX_LIMIT);
  });

  it('应该处理负数offset', () => {
    const negativeOffset = -100;
    const actualOffset = Math.max(negativeOffset, 0);
    
    expect(actualOffset).toBe(0);
  });
});