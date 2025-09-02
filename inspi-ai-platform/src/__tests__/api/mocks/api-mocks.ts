/**
 * API Mock服务
 * 用于模拟外部服务和数据库操作
 */

// Mock数据库服务
export const mockDatabaseService = {
  users: new Map(),
  works: new Map(),
  knowledgeGraphs: new Map(),
  
  // 用户操作
  async findUserByEmail(email: string) {
    for (const [id, user] of this.users) {
      if ((user as any).email === email) {
        return { id, ...user }
      }
    }
    return null
  },
  
  async findUserById(id: string) {
    const user = this.users.get(id)
    return user ? { id, ...user } : null
  },
  
  async createUser(userData: any) {
    const id = `user-${Date.now()}-${Math.random().toString(36).substring(2)}`
    const user = {
      ...userData,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    this.users.set(id, user)
    return user
  },
  
  async updateUser(id: string, updates: any) {
    const user = this.users.get(id)
    if (!user) return null
    
    const updatedUser = {
      ...user,
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    this.users.set(id, updatedUser)
    return updatedUser
  },
  
  // 作品操作
  async findWorks(query: any = {}) {
    const works = Array.from(this.works.values())
    let filteredWorks = works
    
    if (query.author) {
      filteredWorks = filteredWorks.filter((work: any) => work.authorId === query.author)
    }
    
    if (query.status) {
      filteredWorks = filteredWorks.filter((work: any) => work.status === query.status)
    }
    
    if (query.subject) {
      filteredWorks = filteredWorks.filter((work: any) => work.subject === query.subject)
    }
    
    if (query.search) {
      filteredWorks = filteredWorks.filter((work: any) => 
        work.title.toLowerCase().includes(query.search.toLowerCase()) ||
        work.knowledgePoint.toLowerCase().includes(query.search.toLowerCase())
      )
    }
    
    // 分页
    const page = query.page || 1
    const limit = query.limit || 12
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    
    return {
      works: filteredWorks.slice(startIndex, endIndex),
      total: filteredWorks.length,
      page,
      limit,
      totalPages: Math.ceil(filteredWorks.length / limit),
    }
  },
  
  async findWorkById(id: string) {
    const work = this.works.get(id)
    return work ? { id, ...work } : null
  },
  
  async createWork(workData: any) {
    const id = `work-${Date.now()}-${Math.random().toString(36).substring(2)}`
    const work = {
      ...workData,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    this.works.set(id, work)
    return work
  },
  
  async updateWork(id: string, updates: any) {
    const work = this.works.get(id)
    if (!work) return null
    
    const updatedWork = {
      ...work,
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    this.works.set(id, updatedWork)
    return updatedWork
  },
  
  async deleteWork(id: string) {
    return this.works.delete(id)
  },
  
  // 清理所有数据
  clear() {
    this.users.clear()
    this.works.clear()
    this.knowledgeGraphs.clear()
  },
}

// Mock认证服务
export const mockAuthService = {
  async hashPassword(password: string) {
    return `hashed_${password}`
  },
  
  async comparePassword(password: string, hashedPassword: string) {
    return hashedPassword === `hashed_${password}`
  },
  
  async generateToken(userId: string) {
    return `token_${userId}_${Date.now()}`
  },
  
  async verifyToken(token: string) {
    const parts = token.split('_')
    if (parts.length !== 3 || parts[0] !== 'token') {
      throw new Error('Invalid token')
    }
    
    return {
      userId: parts[1],
      iat: parseInt(parts[2]),
      exp: parseInt(parts[2]) + 24 * 60 * 60 * 1000, // 24小时后过期
    }
  },
  
  async generateRefreshToken(userId: string) {
    return `refresh_${userId}_${Date.now()}`
  },
}

// Mock邮件服务
export const mockEmailService = {
  sentEmails: [] as any[],
  
  async sendEmail(to: string, subject: string, content: string) {
    const email = {
      to,
      subject,
      content,
      sentAt: new Date().toISOString(),
      id: `email-${Date.now()}-${Math.random().toString(36).substring(2)}`,
    }
    
    this.sentEmails.push(email)
    return { success: true, messageId: email.id }
  },
  
  async sendVerificationEmail(email: string, verificationCode: string) {
    return this.sendEmail(
      email,
      '邮箱验证',
      `您的验证码是: ${verificationCode}`
    )
  },
  
  async sendPasswordResetEmail(email: string, resetToken: string) {
    return this.sendEmail(
      email,
      '密码重置',
      `您的重置令牌是: ${resetToken}`
    )
  },
  
  getLastEmail() {
    return this.sentEmails[this.sentEmails.length - 1]
  },
  
  getEmailsTo(email: string) {
    return this.sentEmails.filter(e => e.to === email)
  },
  
  clear() {
    this.sentEmails = []
  },
}

// Mock AI服务
export const mockAiService = {
  async generateCards(knowledgePoint: string, subject: string, gradeLevel: string) {
    const cards = [
      {
        type: 'concept',
        title: `${knowledgePoint} - 概念解释`,
        content: `这是关于${knowledgePoint}的概念解释卡片`,
        order: 0,
      },
      {
        type: 'example',
        title: `${knowledgePoint} - 例题演示`,
        content: `这是关于${knowledgePoint}的例题演示卡片`,
        order: 1,
      },
      {
        type: 'exercise',
        title: `${knowledgePoint} - 练习题`,
        content: `这是关于${knowledgePoint}的练习题卡片`,
        order: 2,
      },
      {
        type: 'summary',
        title: `${knowledgePoint} - 总结`,
        content: `这是关于${knowledgePoint}的总结卡片`,
        order: 3,
      },
    ]
    
    // 模拟AI生成延迟
    await new Promise(resolve => setTimeout(resolve, 100))
    
    return {
      cards,
      tokensUsed: 150,
      generationId: `gen-${Date.now()}`,
    }
  },
  
  async regenerateCard(cardType: string, knowledgePoint: string) {
    await new Promise(resolve => setTimeout(resolve, 50))
    
    return {
      type: cardType,
      title: `${knowledgePoint} - 重新生成的${cardType}`,
      content: `这是重新生成的关于${knowledgePoint}的${cardType}卡片`,
      order: 0,
    }
  },
}

// Mock缓存服务
export const mockCacheService = {
  cache: new Map(),
  
  async get(key: string) {
    const item = this.cache.get(key)
    if (!item) return null
    
    if (item.expiry && Date.now() > item.expiry) {
      this.cache.delete(key)
      return null
    }
    
    return item.value
  },
  
  async set(key: string, value: any, ttl?: number) {
    const item = {
      value,
      expiry: ttl ? Date.now() + ttl * 1000 : null,
    }
    this.cache.set(key, item)
  },
  
  async del(key: string) {
    return this.cache.delete(key)
  },
  
  async exists(key: string) {
    return this.cache.has(key)
  },
  
  clear() {
    this.cache.clear()
  },
}

// Mock健康检查服务
export const mockHealthService = {
  checks: {
    database: { status: 'healthy', message: 'Database connection OK' },
    redis: { status: 'healthy', message: 'Redis connection OK' },
    ai: { status: 'healthy', message: 'AI service available' },
    email: { status: 'healthy', message: 'Email service available' },
  },
  
  async checkDatabase() {
    return this.checks.database
  },
  
  async checkRedis() {
    return this.checks.redis
  },
  
  async checkAi() {
    return this.checks.ai
  },
  
  async checkEmail() {
    return this.checks.email
  },
  
  async getSystemHealth() {
    const checks = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkAi(),
      this.checkEmail(),
    ])
    
    const healthyCount = checks.filter(c => c.status === 'healthy').length
    const totalCount = checks.length
    
    let overallStatus = 'healthy'
    if (healthyCount === 0) {
      overallStatus = 'unhealthy'
    } else if (healthyCount < totalCount) {
      overallStatus = 'degraded'
    }
    
    return {
      status: overallStatus,
      timestamp: Date.now(),
      uptime: process.uptime(),
      checks: {
        database: this.checks.database,
        redis: this.checks.redis,
        ai: this.checks.ai,
        email: this.checks.email,
      },
      summary: {
        total: totalCount,
        healthy: healthyCount,
        unhealthy: totalCount - healthyCount,
        degraded: 0,
      },
    }
  },
  
  setCheckStatus(checkName: string, status: 'healthy' | 'unhealthy' | 'degraded', message: string) {
    if (this.checks[checkName as keyof typeof this.checks]) {
      this.checks[checkName as keyof typeof this.checks] = { status, message }
    }
  },
}

// 清理所有Mock数据
export const clearAllMocks = () => {
  mockDatabaseService.clear()
  mockEmailService.clear()
  mockCacheService.clear()
}

// 重置所有Mock服务到初始状态
export const resetAllMocks = () => {
  clearAllMocks()
  
  // 重置健康检查状态
  mockHealthService.checks = {
    database: { status: 'healthy', message: 'Database connection OK' },
    redis: { status: 'healthy', message: 'Redis connection OK' },
    ai: { status: 'healthy', message: 'AI service available' },
    email: { status: 'healthy', message: 'Email service available' },
  }
}