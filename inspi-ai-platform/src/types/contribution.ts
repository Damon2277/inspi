/**
 * 贡献度系统类型定义
 */

// 贡献度类型枚举
export enum ContributionType {
  WORK_CREATION = 'work_creation',     // 创作作品
  WORK_REUSED = 'work_reused',         // 作品被复用
  WORK_LIKED = 'work_liked',           // 作品被点赞
  WORK_SHARED = 'work_shared',         // 作品被分享
  PROFILE_COMPLETED = 'profile_completed', // 完善个人资料
  FIRST_WORK = 'first_work',           // 首次发布作品
  MILESTONE_REACHED = 'milestone_reached' // 达成里程碑
}

// 贡献度配置
export interface ContributionConfig {
  creation: {
    points: number;
    description: string;
  };
  reuse: {
    points: number;
    description: string;
  };
  bonus: {
    maxPoints: number;
    description: string;
  };
  penalty: {
    maxPoints: number;
    description: string;
  };
}

// 用户贡献度统计
export interface UserContributionStats {
  userId: string;
  userName: string;
  userAvatar?: string;
  totalPoints: number;
  creationPoints: number;
  reusePoints: number;
  bonusPoints: number;
  penaltyPoints: number;
  creationCount: number;
  reuseCount: number;
  rank?: number;
  lastActivity: string;
  weeklyPoints?: number;
  monthlyPoints?: number;
}

// 贡献度记录
export interface ContributionRecord {
  id: string;
  userId: string;
  type: ContributionType;
  points: number;
  workId?: string;
  workTitle?: string;
  relatedUserId?: string;
  relatedUserName?: string;
  description: string;
  displayText: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

// 排行榜条目
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  userAvatar?: string;
  totalPoints: number;
  creationCount: number;
  reuseCount: number;
  lastActivity: string;
  weeklyPoints?: number;
  monthlyPoints?: number;
  trend?: 'up' | 'down' | 'stable';
}

// 排行榜类型
export enum LeaderboardType {
  TOTAL = 'total',         // 总榜
  WEEKLY = 'weekly',       // 周榜
  MONTHLY = 'monthly',     // 月榜
  CREATION = 'creation',   // 创作榜
  REUSE = 'reuse'         // 复用榜
}

// 排行榜响应
export interface LeaderboardResponse {
  type: LeaderboardType;
  entries: LeaderboardEntry[];
  total: number;
  userRank?: LeaderboardEntry;
  lastUpdated: Date;
}

// 排行榜响应（详细版）
export interface LeaderboardResponseDetailed {
  leaderboard: LeaderboardEntry[];
  userRank?: {
    rank: number;
    totalPoints: number;
    percentile: number;
  };
  metadata: {
    totalUsers: number;
    lastUpdated: string;
    period: 'all' | 'weekly' | 'monthly';
  };
}

// 贡献度历史查询参数
export interface ContributionHistoryQuery {
  userId: string;
  type?: ContributionType;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

// 贡献度统计
export interface ContributionStats {
  userId: string;
  totalPoints: number;
  creationPoints: number;
  reusePoints: number;
  bonusPoints: number;
  worksCount: number;
  reuseCount: number;
  rank?: number;
  lastUpdated: Date;
}

// 贡献度历史
export interface ContributionHistory {
  records: ContributionRecord[];
  total: number;
  hasMore: boolean;
  summary: {
    totalPoints: number;
    thisWeek: number;
    thisMonth: number;
    byType: Record<ContributionType, number>;
  };
}

// 贡献度历史响应
export interface ContributionHistoryResponse {
  records: ContributionRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    totalPoints: number;
    creationPoints: number;
    reusePoints: number;
    bonusPoints: number;
    penaltyPoints: number;
  };
}

// 贡献度趋势数据点
export interface ContributionTrendPoint {
  date: string;
  points: number;
  cumulativePoints: number;
  creationCount: number;
  reuseCount: number;
}

// 贡献度趋势响应
export interface ContributionTrendResponse {
  userId: string;
  period: 'daily' | 'weekly' | 'monthly';
  data: ContributionTrendPoint[];
  summary: {
    totalGrowth: number;
    averageDaily: number;
    peakDay: string;
    peakPoints: number;
  };
}

// 热门作品条目
export interface TrendingWork {
  workId: string;
  title: string;
  authorId: string;
  authorName: string;
  reuseCount: number;
  likeCount: number;
  viewCount: number;
  trendingScore: number;
  createdAt: Date;
  thumbnail?: string;
  tags: string[];
}

// 热门作品条目（详细版）
export interface TrendingWorkEntry {
  workId: string;
  title: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  knowledgePoint: string;
  subject: string;
  gradeLevel: string;
  reuseCount: number;
  totalContribution: number;
  recentReuseCount: number; // 最近7天复用次数
  createdAt: string;
  thumbnail?: string;
  tags: string[];
}

// 热门作品响应
export interface TrendingWorksResponse {
  works: TrendingWork[];
  period: 'daily' | 'weekly' | 'monthly';
  lastUpdated: Date;
}

// 贡献度计算请求
export interface ContributionCalculationRequest {
  userId: string;
  type: ContributionType;
  workId?: string;
  points?: number;
  metadata?: Record<string, any>;
}

// 贡献度创建请求
export interface CreateContributionRequest {
  userId: string;
  type: ContributionType;
  points: number;
  workId?: string;
  relatedUserId?: string;
  description: string;
  metadata?: Record<string, any>;
}

// 贡献度更新请求
export interface UpdateContributionRequest {
  points?: number;
  description?: string;
  metadata?: Record<string, any>;
}

// 排行榜查询参数
export interface LeaderboardQuery {
  type?: string;
  limit?: number;
  offset?: number;
  includeUserRank?: boolean;
  userId?: string;
}

// 排行榜查询参数（详细版）
export interface LeaderboardQueryDetailed {
  period?: 'all' | 'weekly' | 'monthly';
  subject?: string;
  limit?: number;
  offset?: number;
  includeUserRank?: boolean;
  userId?: string;
}

// 贡献度统计卡片数据
export interface ContributionStatsCard {
  title: string;
  value: number;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'stable';
  icon: string;
  color: string;
  description?: string;
}

// 贡献度仪表板数据
export interface ContributionDashboard {
  userStats: UserContributionStats;
  recentActivities: ContributionRecord[];
  rankingInfo: {
    currentRank: number;
    totalUsers: number;
    percentile: number;
    nextRankPoints: number;
  };
  trendData: ContributionTrendPoint[];
  achievements: Achievement[];
}

// 成就系统
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: 'creation' | 'reuse' | 'milestone' | 'special';
  requirement: {
    type: 'points' | 'count' | 'streak';
    value: number;
    period?: 'daily' | 'weekly' | 'monthly' | 'all';
  };
  reward: {
    points: number;
    badge?: string;
  };
  unlockedAt?: string;
  progress?: {
    current: number;
    target: number;
    percentage: number;
  };
}

// API响应基础类型
export interface ContributionApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// 缓存键类型
export type ContributionCacheKey = 
  | `leaderboard:${string}` // leaderboard:all, leaderboard:weekly
  | `user_contribution:${string}` // user_contribution:userId
  | `trending_works:${string}` // trending_works:weekly
  | `contribution_stats:${string}`; // contribution_stats:userId

// 贡献度事件类型
export type ContributionEventType = 
  | 'contribution_created'
  | 'contribution_updated'
  | 'leaderboard_updated'
  | 'achievement_unlocked'
  | 'rank_changed';

// 贡献度事件数据
export interface ContributionEvent {
  type: ContributionEventType;
  userId: string;
  data: Record<string, any>;
  timestamp: string;
}

// 导出所有类型的联合类型，便于类型检查
export type ContributionSystemTypes = 
  | UserContributionStats
  | ContributionRecord
  | LeaderboardEntry
  | TrendingWorkEntry
  | Achievement
  | ContributionEvent;