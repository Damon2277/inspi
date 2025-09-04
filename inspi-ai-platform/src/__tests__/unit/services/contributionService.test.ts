/**
 * 贡献度服务测试
 */

import {
  calculateContributionPoints,
  checkLevelUp,
  getAchievements,
  updateUserRank,
  calculateTrendingScore,
  getContributionMultiplier,
  validateContributionData,
  aggregateUserContributions,
} from '@/lib/services/contributionService'
import { createUserFixture, createContributionLogFixture } from '@/fixtures'

// Mock配置
jest.mock('@/lib/config/contribution', () => ({
  CONTRIBUTION_POINTS: {
    creation: 10,
    reuse_made: 5,
    reuse_received: 3,
    like_received: 1,
    comment_received: 2,
    share_received: 1,
    featured: 20,
  },
  LEVEL_THRESHOLDS: [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500, 5500],
  MULTIPLIERS: {
    difficulty: {
      easy: 0.8,
      medium: 1.0,
      hard: 1.5,
      expert: 2.0,
    },
    popularity: {
      low: 1.0,
      medium: 1.2,
      high: 1.5,
      viral: 2.0,
    },
    quality: {
      poor: 0.5,
      fair: 0.8,
      good: 1.0,
      excellent: 1.3,
      outstanding: 1.6,
    },
  },
  ACHIEVEMENTS: {
    'first-work': { name: '首次创作', points: 5, condition: 'first_creation' },
    'prolific-creator': { name: '多产创作者', points: 15, condition: 'creation_count_10' },
    'popular-work': { name: '热门作品', points: 10, condition: 'work_reused_50' },
    'helpful-contributor': { name: '乐于助人', points: 8, condition: 'reuse_made_20' },
    'rising-star': { name: '新星', points: 12, condition: 'level_up_fast' },
  },
}))

describe('贡献度服务测试', () => {
  describe('calculateContributionPoints', () => {
    test('应该计算基础创作分', () => {
      const points = calculateContributionPoints('creation', {
        workId: 'work-1',
        title: '测试作品',
        subject: 'Mathematics',
      })

      expect(points).toBe(10) // 基础创作分
    })

    test('应该根据难度调整分数', () => {
      const easyPoints = calculateContributionPoints('creation', {
        difficulty: 'easy',
      })
      const hardPoints = calculateContributionPoints('creation', {
        difficulty: 'hard',
      })
      const expertPoints = calculateContributionPoints('creation', {
        difficulty: 'expert',
      })

      expect(easyPoints).toBe(8) // 10 * 0.8
      expect(hardPoints).toBe(15) // 10 * 1.5
      expect(expertPoints).toBe(20) // 10 * 2.0
    })

    test('应该根据质量调整分数', () => {
      const poorPoints = calculateContributionPoints('creation', {
        quality: 'poor',
      })
      const excellentPoints = calculateContributionPoints('creation', {
        quality: 'excellent',
      })
      const outstandingPoints = calculateContributionPoints('creation', {
        quality: 'outstanding',
      })

      expect(poorPoints).toBe(5) // 10 * 0.5
      expect(excellentPoints).toBe(13) // 10 * 1.3
      expect(outstandingPoints).toBe(16) // 10 * 1.6
    })

    test('应该计算复用相关分数', () => {
      const reusePoints = calculateContributionPoints('reuse_made', {
        originalWorkId: 'work-1',
        reuseWorkId: 'reuse-1',
      })
      const receivedPoints = calculateContributionPoints('reuse_received', {
        workId: 'work-1',
        reuseId: 'reuse-1',
      })

      expect(reusePoints).toBe(5)
      expect(receivedPoints).toBe(3)
    })

    // 移除社交互动分数测试

    test('应该处理特殊奖励', () => {
      const firstWorkPoints = calculateContributionPoints('creation', {
        isFirstWork: true,
      })
      const featuredPoints = calculateContributionPoints('featured', {
        workId: 'work-1',
        featuredBy: 'admin',
      })

      expect(firstWorkPoints).toBe(15) // 10 + 5 (首次创作奖励)
      expect(featuredPoints).toBe(20)
    })

    test('应该处理流行度奖励', () => {
      const viralPoints = calculateContributionPoints('creation', {
        popularity: 'viral',
        viewCount: 10000,
        reuseCount: 100,
      })

      expect(viralPoints).toBe(20) // 10 * 2.0 (病毒式传播)
    })

    test('应该组合多个乘数', () => {
      const combinedPoints = calculateContributionPoints('creation', {
        difficulty: 'hard', // 1.5x
        quality: 'excellent', // 1.3x
        popularity: 'high', // 1.5x
      })

      expect(combinedPoints).toBe(29) // 10 * 1.5 * 1.3 * 1.5 = 29.25 -> 29
    })

    test('应该处理无效的贡献类型', () => {
      expect(() => {
        calculateContributionPoints('invalid-type', {})
      }).toThrow('Invalid contribution type: invalid-type')
    })

    test('应该处理边界情况', () => {
      const zeroPoints = calculateContributionPoints('creation', {
        quality: 'poor',
        difficulty: 'easy',
        multiplier: 0,
      })

      expect(zeroPoints).toBe(0)
    })
  })

  describe('checkLevelUp', () => {
    test('应该检测等级提升', () => {
      const result = checkLevelUp('user-1', 95, 15) // 从95分增加15分到110分

      expect(result.levelUp).toBe(true)
      expect(result.oldLevel).toBe(1) // 95分对应1级
      expect(result.newLevel).toBe(2) // 110分对应2级
      expect(result.nextLevelThreshold).toBe(300) // 下一级需要300分
    })

    test('应该处理无等级提升情况', () => {
      const result = checkLevelUp('user-1', 50, 10) // 从50分增加10分到60分

      expect(result.levelUp).toBe(false)
      expect(result.oldLevel).toBe(1)
      expect(result.newLevel).toBe(1)
      expect(result.nextLevelThreshold).toBe(100)
    })

    test('应该处理跨多级提升', () => {
      const result = checkLevelUp('user-1', 50, 300) // 从50分增加300分到350分

      expect(result.levelUp).toBe(true)
      expect(result.oldLevel).toBe(1)
      expect(result.newLevel).toBe(3) // 跨越到3级
      expect(result.nextLevelThreshold).toBe(600)
    })

    test('应该处理最高等级', () => {
      const result = checkLevelUp('user-1', 5000, 1000) // 已经是最高等级

      expect(result.levelUp).toBe(false)
      expect(result.oldLevel).toBe(10) // 最高等级
      expect(result.newLevel).toBe(10)
      expect(result.nextLevelThreshold).toBe(null) // 没有下一级
    })

    test('应该计算等级进度', () => {
      const result = checkLevelUp('user-1', 150, 50) // 2级，150分

      expect(result.currentLevelProgress).toBe(50) // 150 - 100 = 50
      expect(result.currentLevelTotal).toBe(200) // 300 - 100 = 200
      expect(result.progressPercentage).toBe(25) // 50 / 200 = 0.25
    })
  })

  describe('getAchievements', () => {
    test('应该获取用户成就', async () => {
      const mockContributions = [
        createContributionLogFixture({
          userId: 'user-1',
          type: 'creation',
          metadata: { isFirstWork: true },
        }),
      ]

      const achievements = await getAchievements('user-1', mockContributions)

      expect(achievements).toContainEqual(
        expect.objectContaining({
          id: 'first-work',
          name: '首次创作',
          unlockedAt: expect.any(String),
        })
      )
    })

    test('应该检测多产创作者成就', async () => {
      const mockContributions = Array(10).fill(null).map((_, i) =>
        createContributionLogFixture({
          userId: 'user-1',
          type: 'creation',
          metadata: { workId: `work-${i}` },
        })
      )

      const achievements = await getAchievements('user-1', mockContributions)

      expect(achievements).toContainEqual(
        expect.objectContaining({
          id: 'prolific-creator',
          name: '多产创作者',
        })
      )
    })

    test('应该检测热门作品成就', async () => {
      const mockContributions = [
        createContributionLogFixture({
          userId: 'user-1',
          type: 'creation',
          metadata: { workId: 'popular-work' },
        }),
        ...Array(50).fill(null).map(() =>
          createContributionLogFixture({
            userId: 'user-1',
            type: 'reuse_received',
            metadata: { workId: 'popular-work' },
          })
        ),
      ]

      const achievements = await getAchievements('user-1', mockContributions)

      expect(achievements).toContainEqual(
        expect.objectContaining({
          id: 'popular-work',
          name: '热门作品',
        })
      )
    })

    test('应该检测乐于助人成就', async () => {
      const mockContributions = Array(20).fill(null).map((_, i) =>
        createContributionLogFixture({
          userId: 'user-1',
          type: 'reuse_made',
          metadata: { reuseWorkId: `reuse-${i}` },
        })
      )

      const achievements = await getAchievements('user-1', mockContributions)

      expect(achievements).toContainEqual(
        expect.objectContaining({
          id: 'helpful-contributor',
          name: '乐于助人',
        })
      )
    })

    test('应该处理无成就情况', async () => {
      const achievements = await getAchievements('user-1', [])

      expect(achievements).toHaveLength(0)
    })

    test('应该避免重复成就', async () => {
      const mockContributions = Array(20).fill(null).map((_, i) =>
        createContributionLogFixture({
          userId: 'user-1',
          type: 'creation',
          metadata: { workId: `work-${i}` },
        })
      )

      const achievements = await getAchievements('user-1', mockContributions)

      const firstWorkAchievements = achievements.filter(a => a.id === 'first-work')
      expect(firstWorkAchievements).toHaveLength(1) // 只应该有一个
    })
  })

  describe('updateUserRank', () => {
    test('应该更新用户排名', async () => {
      const mockUsers = [
        { userId: 'user-1', totalScore: 500 },
        { userId: 'user-2', totalScore: 300 },
        { userId: 'user-3', totalScore: 800 },
      ]

      const result = await updateUserRank('user-1', mockUsers)

      expect(result.rank).toBe(2) // 第二名（800 > 500 > 300）
      expect(result.totalUsers).toBe(3)
      expect(result.percentile).toBe(67) // 超过67%的用户
    })

    test('应该处理并列排名', () => {
      const mockUsers = [
        { userId: 'user-1', totalScore: 500 },
        { userId: 'user-2', totalScore: 500 },
        { userId: 'user-3', totalScore: 300 },
      ]

      const result1 = updateUserRank('user-1', mockUsers)
      const result2 = updateUserRank('user-2', mockUsers)

      expect(result1.rank).toBe(result2.rank) // 并列排名
      expect(result1.rank).toBe(1) // 都是第一名
    })

    test('应该处理单用户情况', () => {
      const mockUsers = [
        { userId: 'user-1', totalScore: 100 },
      ]

      const result = updateUserRank('user-1', mockUsers)

      expect(result.rank).toBe(1)
      expect(result.totalUsers).toBe(1)
      expect(result.percentile).toBe(100)
    })

    test('应该处理用户不存在情况', () => {
      const mockUsers = [
        { userId: 'user-2', totalScore: 100 },
      ]

      expect(() => {
        updateUserRank('user-1', mockUsers)
      }).toThrow('User not found in ranking data')
    })
  })

  describe('calculateTrendingScore', () => {
    test('应该计算趋势分数', () => {
      const contributionData = {
        recentViews: 1000,
        recentReuses: 50,
        recentLikes: 200,
        timeDecay: 0.8,
        qualityScore: 0.9,
      }

      const trendingScore = calculateTrendingScore(contributionData)

      expect(trendingScore).toBeGreaterThan(0)
      expect(typeof trendingScore).toBe('number')
    })

    test('应该考虑时间衰减', () => {
      const recentData = {
        recentViews: 100,
        timeDecay: 1.0, // 最新
      }
      const oldData = {
        recentViews: 100,
        timeDecay: 0.1, // 较旧
      }

      const recentScore = calculateTrendingScore(recentData)
      const oldScore = calculateTrendingScore(oldData)

      expect(recentScore).toBeGreaterThan(oldScore)
    })

    test('应该考虑质量分数', () => {
      const highQualityData = {
        recentViews: 100,
        qualityScore: 0.9,
      }
      const lowQualityData = {
        recentViews: 100,
        qualityScore: 0.3,
      }

      const highScore = calculateTrendingScore(highQualityData)
      const lowScore = calculateTrendingScore(lowQualityData)

      expect(highScore).toBeGreaterThan(lowScore)
    })

    test('应该处理零值', () => {
      const zeroData = {
        recentViews: 0,
        recentReuses: 0,
        recentLikes: 0,
      }

      const score = calculateTrendingScore(zeroData)

      expect(score).toBe(0)
    })
  })

  describe('getContributionMultiplier', () => {
    test('应该获取难度乘数', () => {
      expect(getContributionMultiplier('difficulty', 'easy')).toBe(0.8)
      expect(getContributionMultiplier('difficulty', 'medium')).toBe(1.0)
      expect(getContributionMultiplier('difficulty', 'hard')).toBe(1.5)
      expect(getContributionMultiplier('difficulty', 'expert')).toBe(2.0)
    })

    test('应该获取质量乘数', () => {
      expect(getContributionMultiplier('quality', 'poor')).toBe(0.5)
      expect(getContributionMultiplier('quality', 'good')).toBe(1.0)
      expect(getContributionMultiplier('quality', 'outstanding')).toBe(1.6)
    })

    test('应该获取流行度乘数', () => {
      expect(getContributionMultiplier('popularity', 'low')).toBe(1.0)
      expect(getContributionMultiplier('popularity', 'viral')).toBe(2.0)
    })

    test('应该处理无效类型', () => {
      expect(getContributionMultiplier('invalid', 'value')).toBe(1.0)
    })

    test('应该处理无效值', () => {
      expect(getContributionMultiplier('difficulty', 'invalid')).toBe(1.0)
    })
  })

  describe('validateContributionData', () => {
    test('应该验证有效的贡献数据', () => {
      const validData = {
        type: 'creation',
        userId: 'user-1',
        metadata: {
          workId: 'work-1',
          title: '测试作品',
        },
      }

      const result = validateContributionData(validData)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('应该检测缺少必需字段', () => {
      const invalidData = {
        userId: 'user-1',
        // 缺少 type
      }

      const result = validateContributionData(invalidData)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Missing required field: type')
    })

    test('应该验证贡献类型', () => {
      const invalidData = {
        type: 'invalid-type',
        userId: 'user-1',
        metadata: {},
      }

      const result = validateContributionData(invalidData)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid contribution type: invalid-type')
    })

    test('应该验证用户ID格式', () => {
      const invalidData = {
        type: 'creation',
        userId: '', // 空用户ID
        metadata: {},
      }

      const result = validateContributionData(invalidData)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid userId format')
    })

    test('应该验证元数据', () => {
      const invalidData = {
        type: 'creation',
        userId: 'user-1',
        metadata: null, // 无效元数据
      }

      const result = validateContributionData(invalidData)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid metadata format')
    })

    test('应该验证特定类型的元数据', () => {
      const invalidCreationData = {
        type: 'creation',
        userId: 'user-1',
        metadata: {
          // 缺少 workId
          title: '测试作品',
        },
      }

      const result = validateContributionData(invalidCreationData)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Missing workId for creation contribution')
    })
  })

  describe('aggregateUserContributions', () => {
    test('应该聚合用户贡献数据', () => {
      const contributions = [
        createContributionLogFixture({
          userId: 'user-1',
          type: 'creation',
          points: 10,
        }),
        createContributionLogFixture({
          userId: 'user-1',
          type: 'reuse_received',
          points: 3,
        }),
        createContributionLogFixture({
          userId: 'user-1',
          type: 'like_received',
          points: 1,
        }),
      ]

      const aggregated = aggregateUserContributions(contributions)

      expect(aggregated.totalScore).toBe(14)
      expect(aggregated.creationScore).toBe(10)
      expect(aggregated.socialScore).toBe(4) // 3 + 1
      expect(aggregated.contributionCount).toBe(3)
    })

    test('应该按类型分组贡献', () => {
      const contributions = [
        createContributionLogFixture({ type: 'creation', points: 10 }),
        createContributionLogFixture({ type: 'creation', points: 15 }),
        createContributionLogFixture({ type: 'reuse_made', points: 5 }),
      ]

      const aggregated = aggregateUserContributions(contributions)

      expect(aggregated.byType.creation.count).toBe(2)
      expect(aggregated.byType.creation.totalPoints).toBe(25)
      expect(aggregated.byType.reuse_made.count).toBe(1)
      expect(aggregated.byType.reuse_made.totalPoints).toBe(5)
    })

    test('应该计算时间趋势', () => {
      const now = new Date()
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      const contributions = [
        createContributionLogFixture({
          points: 10,
          createdAt: now.toISOString(),
        }),
        createContributionLogFixture({
          points: 5,
          createdAt: yesterday.toISOString(),
        }),
        createContributionLogFixture({
          points: 3,
          createdAt: lastWeek.toISOString(),
        }),
      ]

      const aggregated = aggregateUserContributions(contributions)

      expect(aggregated.trends.daily).toBe(10)
      expect(aggregated.trends.weekly).toBe(15) // 10 + 5
      expect(aggregated.trends.monthly).toBe(18) // 10 + 5 + 3
    })

    test('应该处理空贡献列表', () => {
      const aggregated = aggregateUserContributions([])

      expect(aggregated.totalScore).toBe(0)
      expect(aggregated.contributionCount).toBe(0)
      expect(aggregated.byType).toEqual({})
    })

    test('应该计算平均分数', () => {
      const contributions = [
        createContributionLogFixture({ points: 10 }),
        createContributionLogFixture({ points: 20 }),
        createContributionLogFixture({ points: 30 }),
      ]

      const aggregated = aggregateUserContributions(contributions)

      expect(aggregated.averageScore).toBe(20) // (10 + 20 + 30) / 3
    })
  })

  describe('边界情况和错误处理', () => {
    test('应该处理负分数', () => {
      const points = calculateContributionPoints('creation', {
        quality: 'poor',
        multiplier: -1, // 负乘数
      })

      expect(points).toBe(0) // 不应该有负分
    })

    test('应该处理极大分数', () => {
      const points = calculateContributionPoints('creation', {
        difficulty: 'expert',
        quality: 'outstanding',
        popularity: 'viral',
        bonusMultiplier: 10,
      })

      expect(points).toBeLessThan(1000) // 应该有合理上限
    })

    test('应该处理无效日期', () => {
      const contributions = [
        createContributionLogFixture({
          createdAt: 'invalid-date',
        }),
      ]

      expect(() => {
        aggregateUserContributions(contributions)
      }).not.toThrow() // 应该优雅处理
    })

    test('应该处理并发计算', async () => {
      const promises = Array(100).fill(null).map((_, i) =>
        Promise.resolve(calculateContributionPoints('creation', {
          workId: `work-${i}`,
        }))
      )

      const results = await Promise.all(promises)

      expect(results).toHaveLength(100)
      results.forEach(points => {
        expect(points).toBe(10)
      })
    })

    test('应该处理内存限制', () => {
      const largeContributions = Array(10000).fill(null).map((_, i) =>
        createContributionLogFixture({
          id: `contrib-${i}`,
          points: 1,
        })
      )

      const startTime = Date.now()
      const aggregated = aggregateUserContributions(largeContributions)
      const endTime = Date.now()

      expect(aggregated.totalScore).toBe(10000)
      expect(endTime - startTime).toBeLessThan(1000) // 1秒内完成
    })
  })
})