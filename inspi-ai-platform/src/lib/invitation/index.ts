/**
 * 邀请系统主入口文件
 */

// 导出所有类型定义
export * from './types'

// 导出数据库模型
export * from './models'

// 导出数据库连接
export * from './database'

// 导出服务接口（将在后续任务中实现）
export type { InvitationService } from './services/InvitationService'
export type { RewardEngine } from './services/RewardEngine'
export type { ShareService } from './services/ShareService'
export type { AnalyticsService } from './services/AnalyticsService'
export type { FraudDetectionService } from './services/FraudDetectionService'

// 导出服务实现
export { InvitationServiceImpl } from './services/InvitationService'
export { RewardEngineImpl } from './services/RewardEngine'
export { ShareServiceImpl } from './services/ShareService'
export { AnalyticsServiceImpl } from './services/AnalyticsService'
export { FraudDetectionServiceImpl } from './services/FraudDetectionService'

// 导出工具函数
export * from './utils'

// 邀请系统配置
export interface InvitationSystemConfig {
  database: {
    host: string
    port: number
    database: string
    username: string
    password: string
  }
  redis?: {
    host: string
    port: number
    password?: string
  }
  rewards: {
    registrationCredits: number
    activationCredits: number
    milestoneThresholds: number[]
  }
  security: {
    maxInvitesPerDay: number
    maxRegistrationsPerIP: number
    fraudDetectionEnabled: boolean
  }
  sharing: {
    baseUrl: string
    qrCodeSize: number
    enabledPlatforms: string[]
  }
}

// 默认配置
export const DEFAULT_CONFIG: InvitationSystemConfig = {
  database: {
    host: 'localhost',
    port: 3306,
    database: 'inspi_ai',
    username: 'root',
    password: ''
  },
  rewards: {
    registrationCredits: 10,
    activationCredits: 5,
    milestoneThresholds: [5, 10, 25, 50, 100]
  },
  security: {
    maxInvitesPerDay: 50,
    maxRegistrationsPerIP: 5,
    fraudDetectionEnabled: true
  },
  sharing: {
    baseUrl: 'https://inspi.ai',
    qrCodeSize: 200,
    enabledPlatforms: ['wechat', 'qq', 'dingtalk', 'wework', 'email', 'link']
  }
}

// 邀请系统主类
export class InvitationSystem {
  private config: InvitationSystemConfig
  private isInitialized = false

  constructor(config: Partial<InvitationSystemConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // 初始化数据库
      await this.initializeDatabase()
      
      // 初始化Redis缓存（如果配置了）
      if (this.config.redis) {
        await this.initializeRedis()
      }
      
      // 初始化默认奖励配置
      await this.initializeRewardConfigs()
      
      this.isInitialized = true
    } catch (error) {
      throw new Error(`Failed to initialize invitation system: ${error}`)
    }
  }

  private async initializeDatabase(): Promise<void> {
    const { initializeDatabase } = await import('./database')
    await initializeDatabase()
  }

  private async initializeRedis(): Promise<void> {
    // Redis初始化逻辑将在缓存任务中实现
  }

  private async initializeRewardConfigs(): Promise<void> {
    // 奖励配置初始化逻辑将在奖励引擎任务中实现
  }

  getConfig(): InvitationSystemConfig {
    return this.config
  }

  isReady(): boolean {
    return this.isInitialized
  }
}

// 全局邀请系统实例
let globalInvitationSystem: InvitationSystem | null = null

// 获取全局邀请系统实例
export function getInvitationSystem(): InvitationSystem {
  if (!globalInvitationSystem) {
    globalInvitationSystem = new InvitationSystem()
  }
  return globalInvitationSystem
}

// 初始化全局邀请系统
export async function initializeInvitationSystem(config?: Partial<InvitationSystemConfig>): Promise<InvitationSystem> {
  if (!globalInvitationSystem) {
    globalInvitationSystem = new InvitationSystem(config)
  }
  
  if (!globalInvitationSystem.isReady()) {
    await globalInvitationSystem.initialize()
  }
  
  return globalInvitationSystem
}