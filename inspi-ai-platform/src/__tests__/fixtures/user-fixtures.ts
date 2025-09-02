/**
 * 用户相关测试数据工厂
 */

export interface MockUser {
  id: string
  email: string
  name: string
  avatar?: string | null
  subscription: 'free' | 'pro' | 'super'
  createdAt: string
  updatedAt: string
  emailVerified?: boolean
  lastLoginAt?: string
}

export interface MockUserProfile {
  userId: string
  bio?: string
  website?: string
  location?: string
  skills: string[]
  achievements: string[]
  totalWorks: number
  totalViews: number
  totalLikes: number
}

// 基础用户工厂
export const createUserFixture = (overrides: Partial<MockUser> = {}): MockUser => ({
  id: `user-${Math.random().toString(36).substring(2, 15)}`,
  email: `test-${Math.random().toString(36).substring(2, 8)}@example.com`,
  name: `Test User ${Math.random().toString(36).substring(2, 6)}`,
  avatar: null,
  subscription: 'free',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  emailVerified: true,
  lastLoginAt: new Date().toISOString(),
  ...overrides,
})

// 免费用户
export const createFreeUserFixture = (overrides: Partial<MockUser> = {}): MockUser =>
  createUserFixture({ subscription: 'free', ...overrides })

// Pro用户
export const createProUserFixture = (overrides: Partial<MockUser> = {}): MockUser =>
  createUserFixture({ subscription: 'pro', ...overrides })

// Super用户
export const createSuperUserFixture = (overrides: Partial<MockUser> = {}): MockUser =>
  createUserFixture({ subscription: 'super', ...overrides })

// 新用户（刚注册）
export const createNewUserFixture = (overrides: Partial<MockUser> = {}): MockUser => {
  const now = new Date().toISOString()
  return createUserFixture({
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
    emailVerified: false,
    ...overrides,
  })
}

// 用户资料工厂
export const createUserProfileFixture = (
  userId: string,
  overrides: Partial<MockUserProfile> = {}
): MockUserProfile => ({
  userId,
  bio: 'Test user bio',
  website: 'https://example.com',
  location: 'Test City',
  skills: ['Mathematics', 'Science', 'Teaching'],
  achievements: ['First Work', 'Popular Creator'],
  totalWorks: 5,
  totalViews: 100,
  totalLikes: 25,
  ...overrides,
})

// 批量创建用户
export const createUsersFixture = (count: number, baseOverrides: Partial<MockUser> = {}): MockUser[] => {
  return Array.from({ length: count }, (_, index) =>
    createUserFixture({
      name: `Test User ${index + 1}`,
      email: `test-user-${index + 1}@example.com`,
      ...baseOverrides,
    })
  )
}

// 用户认证数据
export const createAuthUserFixture = (user: MockUser) => ({
  user,
  token: `jwt-token-${user.id}`,
  refreshToken: `refresh-token-${user.id}`,
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
})

// 用户使用统计
export const createUserUsageFixture = (userId: string, subscription: string = 'free') => {
  const limits = {
    free: { aiGenerations: 10, worksCreated: 5, dailyViews: 50 },
    pro: { aiGenerations: 100, worksCreated: 50, dailyViews: 500 },
    super: { aiGenerations: -1, worksCreated: -1, dailyViews: -1 }, // unlimited
  }

  const limit = limits[subscription as keyof typeof limits] || limits.free

  return {
    userId,
    subscription,
    currentUsage: {
      aiGenerations: Math.floor(limit.aiGenerations * 0.3),
      worksCreated: Math.floor(limit.worksCreated * 0.4),
      dailyViews: Math.floor(limit.dailyViews * 0.2),
    },
    limits: limit,
    resetDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }
}

// 用户偏好设置
export const createUserPreferencesFixture = (userId: string) => ({
  userId,
  theme: 'light' as 'light' | 'dark',
  language: 'zh-CN',
  notifications: {
    email: true,
    push: false,
    newFollower: true,
    workLiked: true,
    workReposted: false,
  },
  privacy: {
    profilePublic: true,
    worksPublic: true,
    showEmail: false,
    showStats: true,
  },
  display: {
    worksPerPage: 12,
    defaultView: 'grid' as 'grid' | 'list',
    showTutorials: true,
  },
})

// 用户关注关系
export const createUserFollowFixture = (followerId: string, followingId: string) => ({
  id: `follow-${followerId}-${followingId}`,
  followerId,
  followingId,
  createdAt: new Date().toISOString(),
})

// 用户会话数据
export const createUserSessionFixture = (user: MockUser) => ({
  sessionId: `session-${user.id}-${Date.now()}`,
  userId: user.id,
  userAgent: 'Mozilla/5.0 (Test Browser)',
  ipAddress: '127.0.0.1',
  createdAt: new Date().toISOString(),
  lastActiveAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
})