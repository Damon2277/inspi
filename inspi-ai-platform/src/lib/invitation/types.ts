/**
 * 邀请系统核心类型定义
 */

// 邀请码数据模型
export interface InviteCode {
  id: string
  code: string
  inviterId: string
  createdAt: Date
  expiresAt: Date
  isActive: boolean
  usageCount: number
  maxUsage: number
}

// 邀请注册记录
export interface InviteRegistration {
  id: string
  inviteCodeId: string
  inviterId: string
  inviteeId: string
  registeredAt: Date
  isActivated: boolean
  activatedAt?: Date
  rewardsClaimed: boolean
}

// 邀请验证结果
export interface InviteValidation {
  isValid: boolean
  code?: InviteCode
  error?: string
  errorCode?: InviteErrorCode
}

// 邀请处理结果
export interface InviteResult {
  success: boolean
  registration?: InviteRegistration
  rewards?: Reward[]
  error?: string
  errorCode?: InviteErrorCode
}

// 邀请统计数据
export interface InviteStats {
  userId: string
  totalInvites: number
  successfulRegistrations: number
  activeInvitees: number
  totalRewardsEarned: number
  lastUpdated: Date
}

// 邀请历史记录
export interface InviteHistory {
  id: string
  inviteCode: string
  inviteeEmail?: string
  inviteeName?: string
  registeredAt?: Date
  isActivated: boolean
  activatedAt?: Date
  rewardsClaimed: boolean
}

// 奖励类型枚举
export enum RewardType {
  AI_CREDITS = 'ai_credits',
  BADGE = 'badge',
  TITLE = 'title',
  PREMIUM_ACCESS = 'premium_access',
  TEMPLATE_UNLOCK = 'template_unlock'
}

// 奖励数据模型
export interface Reward {
  id?: string
  type: RewardType
  amount?: number
  badgeId?: string
  titleId?: string
  description: string
  expiresAt?: Date
}

// 奖励记录
export interface RewardRecord {
  id: string
  userId: string
  reward: Reward
  grantedAt: Date
  sourceType: RewardSourceType
  sourceId: string
}

// 奖励来源类型
export enum RewardSourceType {
  INVITE_REGISTRATION = 'invite_registration',
  INVITE_ACTIVATION = 'invite_activation',
  MILESTONE = 'milestone',
  ACTIVITY = 'activity'
}

// 奖励配置
export interface RewardConfig {
  eventType: string
  rewards: Reward[]
  conditions?: Record<string, any>
  isActive: boolean
}

// 奖励发放结果
export interface RewardResult {
  success: boolean
  rewardId?: string
  error?: string
}

// 分享平台枚举
export enum SharePlatform {
  WECHAT = 'wechat',
  QQ = 'qq',
  DINGTALK = 'dingtalk',
  WEWORK = 'wework',
  EMAIL = 'email',
  LINK = 'link'
}

// 分享内容
export interface ShareContent {
  title: string
  description: string
  url: string
  imageUrl?: string
  qrCodeUrl?: string
}

// 分享统计
export interface ShareStats {
  inviteCodeId: string
  platform: SharePlatform
  shareCount: number
  clickCount: number
  conversionCount: number
}

// 邀请事件
export interface InviteEvent {
  type: InviteEventType
  inviterId: string
  inviteeId?: string
  inviteCodeId: string
  timestamp: Date
  metadata?: Record<string, any>
}

// 邀请事件类型
export enum InviteEventType {
  CODE_GENERATED = 'code_generated',
  CODE_SHARED = 'code_shared',
  LINK_CLICKED = 'link_clicked',
  USER_REGISTERED = 'user_registered',
  USER_ACTIVATED = 'user_activated',
  REWARD_GRANTED = 'reward_granted'
}

// 时间周期
export interface TimePeriod {
  start: Date
  end: Date
}

// 邀请报告
export interface InviteReport {
  userId: string
  period: TimePeriod
  stats: InviteStats
  topInvitees: InviteHistory[]
  rewardsSummary: RewardSummary
}

// 奖励汇总
export interface RewardSummary {
  totalCredits: number
  badges: string[]
  titles: string[]
  premiumDays: number
}

// 排行榜条目
export interface LeaderboardEntry {
  userId: string
  userName: string
  inviteCount: number
  rank: number
  rewards: RewardSummary
}

// 平台统计
export interface PlatformStats {
  period: TimePeriod
  totalInvites: number
  totalRegistrations: number
  conversionRate: number
  topInviters: LeaderboardEntry[]
  rewardsDistributed: RewardSummary
}

// 分页参数
export interface Pagination {
  page: number
  limit: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// 邀请错误代码
export enum InviteErrorCode {
  INVALID_INVITE_CODE = 'INVALID_INVITE_CODE',
  EXPIRED_INVITE_CODE = 'EXPIRED_INVITE_CODE',
  SELF_INVITE_ATTEMPT = 'SELF_INVITE_ATTEMPT',
  ALREADY_REGISTERED = 'ALREADY_REGISTERED',
  USAGE_LIMIT_EXCEEDED = 'USAGE_LIMIT_EXCEEDED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  REWARD_CALCULATION_ERROR = 'REWARD_CALCULATION_ERROR',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED'
}

// 邀请错误类
export class InviteError extends Error {
  constructor(
    public code: InviteErrorCode,
    public message: string,
    public details?: any
  ) {
    super(message)
    this.name = 'InviteError'
  }
}

// 防作弊检测结果
export interface FraudDetectionResult {
  isSuspicious: boolean
  riskScore: number
  reasons: string[]
  action: FraudAction
}

// 防作弊行动
export enum FraudAction {
  ALLOW = 'allow',
  WARN = 'warn',
  BLOCK = 'block',
  REVIEW = 'review'
}

// 用户行为模式
export interface UserBehaviorPattern {
  userId: string
  ipAddress: string
  deviceFingerprint: string
  registrationTime: Date
  activityPattern: Record<string, any>
  riskIndicators: string[]
}

// 奖励规则
export interface RewardRule {
  id: string
  name: string
  description: string
  eventType: InviteEventType
  rewardType: RewardType
  rewardAmount: number
  conditions: Record<string, any>
  priority: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// 奖励活动
export interface RewardActivity {
  id: string
  name: string
  description: string
  startDate: Date
  endDate: Date
  rewardRules: RewardRule[]
  targetMetrics: Record<string, number>
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// 奖励审核
export interface RewardApproval {
  id: string
  userId: string
  userName: string
  userEmail: string
  rewardType: RewardType
  rewardAmount: number
  description: string
  status: 'pending' | 'approved' | 'rejected'
  adminId?: string
  adminNotes?: string
  createdAt: Date
  approvedAt?: Date
  rejectedAt?: Date
  updatedAt: Date
}

// 奖励统计
export interface RewardStatistics {
  totalRewards: number
  totalAmount: number
  byType: Record<string, {
    count: number
    totalAmount: number
    avgAmount: number
  }>
  period: TimePeriod
}

// 邀请活动
export interface InvitationActivity {
  id: string
  name: string
  description: string
  type: ActivityType
  status: ActivityStatus
  startDate: Date
  endDate: Date
  rules: ActivityRules
  rewards: ActivityReward[]
  targetMetrics: Record<string, number>
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// 活动类型
export enum ActivityType {
  CHALLENGE = 'challenge',
  COMPETITION = 'competition',
  MILESTONE = 'milestone',
  SEASONAL = 'seasonal'
}

// 活动状态
export enum ActivityStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

// 活动规则
export interface ActivityRules {
  winConditions: {
    type: 'top_ranks' | 'score_threshold' | 'completion'
    count?: number
    threshold?: number
  }
  scoringRules: {
    invitePoints: number
    registrationPoints: number
    activationPoints: number
  }
  eligibilityRules?: {
    minAccountAge?: number
    excludeInactiveUsers?: boolean
  }
}

// 活动奖励
export interface ActivityReward {
  type: RewardType
  amount: number
  description: string
  rankRange?: {
    min: number
    max: number
  }
}

// 活动参与者
export interface ActivityParticipant {
  id: string
  activityId: string
  userId: string
  userName?: string
  userEmail?: string
  joinedAt: Date
  status: 'active' | 'inactive' | 'disqualified'
}

// 活动进度
export interface ActivityProgress {
  activityId: string
  userId: string
  invitesSent: number
  registrationsAchieved: number
  activationsAchieved: number
  currentScore: number
  rank?: number
  completedAt?: Date
  updatedAt: Date
}

// 活动结果
export interface ActivityResult {
  activityId: string
  userId: string
  rank: number
  score: number
  rewards: ActivityReward[]
  isWinner: boolean
  completedAt?: Date
}