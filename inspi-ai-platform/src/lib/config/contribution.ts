/**
 * 贡献度系统配置常量
 */

import { ContributionConfig, Achievement } from '@/shared/types/contribution';

// 贡献度积分配置
export const CONTRIBUTION_POINTS: ContributionConfig = {
  creation: {
    points: 10,
    description: '发布原创作品',
  },
  reuse: {
    points: 50,
    description: '作品被他人复用',
  },
  bonus: {
    maxPoints: 500,
    description: '系统奖励积分',
  },
  penalty: {
    maxPoints: -100,
    description: '违规扣除积分',
  },
};

// 排行榜配置
export const LEADERBOARD_CONFIG = {
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 100,
  CACHE_TTL: 3600, // 1小时缓存
  UPDATE_INTERVAL: 1800, // 30分钟更新一次
  PERIODS: ['all', 'weekly', 'monthly'] as const,
};

// 缓存配置
export const CACHE_CONFIG = {
  KEYS: {
    LEADERBOARD_ALL: 'leaderboard:all',
    LEADERBOARD_WEEKLY: 'leaderboard:weekly',
    LEADERBOARD_MONTHLY: 'leaderboard:monthly',
    USER_CONTRIBUTION: (userId: string) => `user_contribution:${userId}`,
    TRENDING_WORKS: (period: string) => `trending_works:${period}`,
    CONTRIBUTION_STATS: (userId: string) => `contribution_stats:${userId}`,
  },
  TTL: {
    LEADERBOARD: 3600, // 1小时
    USER_STATS: 1800, // 30分钟
    TRENDING_WORKS: 7200, // 2小时
    CONTRIBUTION_HISTORY: 600, // 10分钟
  },
};

// 成就系统配置
export const ACHIEVEMENTS: Achievement[] = [
  // 创作成就
  {
    id: 'first_creation',
    title: '初出茅庐',
    description: '发布第一个作品',
    icon: '🌱',
    type: 'creation',
    requirement: {
      type: 'count',
      value: 1,
    },
    reward: {
      points: 5,
      badge: 'creator_bronze',
    },
  },
  {
    id: 'prolific_creator',
    title: '多产创作者',
    description: '发布10个作品',
    icon: '📚',
    type: 'creation',
    requirement: {
      type: 'count',
      value: 10,
    },
    reward: {
      points: 50,
      badge: 'creator_silver',
    },
  },
  {
    id: 'master_creator',
    title: '创作大师',
    description: '发布50个作品',
    icon: '👑',
    type: 'creation',
    requirement: {
      type: 'count',
      value: 50,
    },
    reward: {
      points: 200,
      badge: 'creator_gold',
    },
  },

  // 复用成就
  {
    id: 'first_reuse',
    title: '初次被赞',
    description: '作品首次被复用',
    icon: '⭐',
    type: 'reuse',
    requirement: {
      type: 'count',
      value: 1,
    },
    reward: {
      points: 10,
      badge: 'popular_bronze',
    },
  },
  {
    id: 'popular_creator',
    title: '人气创作者',
    description: '作品被复用10次',
    icon: '🔥',
    type: 'reuse',
    requirement: {
      type: 'count',
      value: 10,
    },
    reward: {
      points: 100,
      badge: 'popular_silver',
    },
  },
  {
    id: 'viral_creator',
    title: '爆款制造者',
    description: '作品被复用100次',
    icon: '💫',
    type: 'reuse',
    requirement: {
      type: 'count',
      value: 100,
    },
    reward: {
      points: 500,
      badge: 'popular_gold',
    },
  },

  // 积分里程碑
  {
    id: 'points_100',
    title: '积分新手',
    description: '获得100积分',
    icon: '🎯',
    type: 'milestone',
    requirement: {
      type: 'points',
      value: 100,
    },
    reward: {
      points: 10,
      badge: 'milestone_bronze',
    },
  },
  {
    id: 'points_1000',
    title: '积分达人',
    description: '获得1000积分',
    icon: '🏆',
    type: 'milestone',
    requirement: {
      type: 'points',
      value: 1000,
    },
    reward: {
      points: 50,
      badge: 'milestone_silver',
    },
  },
  {
    id: 'points_5000',
    title: '积分大师',
    description: '获得5000积分',
    icon: '👑',
    type: 'milestone',
    requirement: {
      type: 'points',
      value: 5000,
    },
    reward: {
      points: 200,
      badge: 'milestone_gold',
    },
  },

  // 特殊成就
  {
    id: 'daily_streak_7',
    title: '坚持不懈',
    description: '连续7天有贡献度增长',
    icon: '🔥',
    type: 'special',
    requirement: {
      type: 'streak',
      value: 7,
      period: 'daily',
    },
    reward: {
      points: 30,
      badge: 'streak_bronze',
    },
  },
  {
    id: 'weekly_top_10',
    title: '周榜精英',
    description: '进入周贡献度排行榜前10',
    icon: '🌟',
    type: 'special',
    requirement: {
      type: 'count',
      value: 1,
      period: 'weekly',
    },
    reward: {
      points: 100,
      badge: 'elite_weekly',
    },
  },
];

// 排行榜显示配置
export const LEADERBOARD_DISPLAY = {
  ITEMS_PER_PAGE: 20,
  SHOW_RANK_CHANGE: true,
  SHOW_AVATAR: true,
  SHOW_LAST_ACTIVITY: true,
  HIGHLIGHT_TOP_3: true,
  SHOW_USER_RANK: true,
};

// 贡献度趋势图配置
export const TREND_CHART_CONFIG = {
  DEFAULT_PERIOD: 'weekly' as const,
  MAX_DATA_POINTS: 30,
  CHART_COLORS: {
    PRIMARY: '#3B82F6',
    SECONDARY: '#10B981',
    ACCENT: '#F59E0B',
    BACKGROUND: '#F8FAFC',
  },
  ANIMATION_DURATION: 300,
};

// 热门作品配置
export const TRENDING_WORKS_CONFIG = {
  DEFAULT_LIMIT: 12,
  MAX_LIMIT: 50,
  PERIODS: ['daily', 'weekly', 'monthly'] as const,
  MIN_REUSE_COUNT: 2, // 最少复用次数才能上榜
  CACHE_TTL: 7200, // 2小时缓存
  WEIGHT_FACTORS: {
    RECENT_REUSE: 0.6, // 最近复用权重
    TOTAL_REUSE: 0.3, // 总复用权重
    CREATION_TIME: 0.1, // 创建时间权重（新作品加分）
  },
};

// 贡献度统计卡片配置
export const STATS_CARDS_CONFIG = [
  {
    key: 'totalPoints',
    title: '总贡献度',
    icon: '🏆',
    color: 'blue',
    description: '累计获得的贡献度积分',
  },
  {
    key: 'creationCount',
    title: '创作作品',
    icon: '📝',
    color: 'green',
    description: '发布的原创作品数量',
  },
  {
    key: 'reuseCount',
    title: '被复用次数',
    icon: '🔄',
    color: 'purple',
    description: '作品被他人复用的总次数',
  },
  {
    key: 'currentRank',
    title: '当前排名',
    icon: '📊',
    color: 'orange',
    description: '在贡献度排行榜中的位置',
  },
];

// 时间段配置
export const TIME_PERIODS = {
  DAILY: {
    label: '今日',
    value: 'daily',
    duration: 1 * 24 * 60 * 60 * 1000, // 1天
  },
  WEEKLY: {
    label: '本周',
    value: 'weekly',
    duration: 7 * 24 * 60 * 60 * 1000, // 7天
  },
  MONTHLY: {
    label: '本月',
    value: 'monthly',
    duration: 30 * 24 * 60 * 60 * 1000, // 30天
  },
  ALL: {
    label: '全部',
    value: 'all',
    duration: 0, // 无限制
  },
};

// 验证配置
export const VALIDATION_RULES = {
  POINTS: {
    MIN: -1000,
    MAX: 1000,
  },
  DESCRIPTION: {
    MAX_LENGTH: 500,
  },
  LEADERBOARD: {
    MIN_LIMIT: 1,
    MAX_LIMIT: 100,
  },
  HISTORY: {
    MIN_LIMIT: 1,
    MAX_LIMIT: 50,
    MAX_DATE_RANGE: 365 * 24 * 60 * 60 * 1000, // 1年
  },
};

// 错误消息
export const ERROR_MESSAGES = {
  INVALID_USER_ID: '无效的用户ID',
  INVALID_WORK_ID: '无效的作品ID',
  INVALID_POINTS: '积分值超出允许范围',
  INVALID_DESCRIPTION: '描述长度超出限制',
  INVALID_DATE_RANGE: '日期范围无效',
  CONTRIBUTION_NOT_FOUND: '贡献度记录不存在',
  INSUFFICIENT_PERMISSIONS: '权限不足',
  RATE_LIMIT_EXCEEDED: '操作过于频繁，请稍后再试',
};

// 成功消息
export const SUCCESS_MESSAGES = {
  CONTRIBUTION_CREATED: '贡献度记录创建成功',
  CONTRIBUTION_UPDATED: '贡献度记录更新成功',
  LEADERBOARD_UPDATED: '排行榜更新成功',
  ACHIEVEMENT_UNLOCKED: '恭喜解锁新成就！',
};
