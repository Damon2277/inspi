/**
 * 业务指标收集器
 * 收集邀请系统的业务指标用于监控和分析
 */

import { DatabasePool } from '../database'
import { logger } from '@/lib/utils/logger'
import { EventEmitter } from 'events'

export interface BusinessMetric {
  name: string
  value: number
  timestamp: Date
  labels?: Record<string, string>
  description?: string
}

export interface InvitationMetrics {
  // 邀请码相关指标
  totalInviteCodes: number
  activeInviteCodes: number
  expiredInviteCodes: number
  usedInviteCodes: number
  
  // 注册相关指标
  totalRegistrations: number
  todayRegistrations: number
  conversionRate: number
  
  // 奖励相关指标
  totalRewardsDistributed: number
  pendingRewards: number
  rewardValue: number
  
  // 用户活跃度指标
  activeUsers: number
  newUsers: number
  returningUsers: number
  
  // 防作弊指标
  fraudDetections: number
  blockedUsers: number
  suspiciousActivities: number
}

export interface SystemHealthMetrics {
  // 系统性能指标
  responseTime: {
    avg: number
    p50: number
    p95: number
    p99: number
  }
  
  // 错误率指标
  errorRate: number
  successRate: number
  
  // 资源使用指标
  memoryUsage: number
  cpuUsage: number
  diskUsage: number
  
  // 数据库指标
  dbConnections: {
    active: number
    idle: number
    total: number
  }
  
  // 缓存指标
  cacheHitRate: number
  cacheSize: number
}

export class BusinessMetricsCollector extends EventEmitter {
  private db: DatabasePool
  private collectInterval?: NodeJS.Timeout
  private isCollecting = false
  private collectionInterval = 60000 // 1分钟
  
  constructor(db: DatabasePool) {
    super()
    this.db = db
  }
  
  /**
   * 开始收集指标
   */
  start(): void {
    if (this.isCollecting) {
      logger.warn('Business metrics collector is already running')
      return
    }
    
    this.isCollecting = true
    
    // 立即收集一次
    this.collectMetrics()
    
    // 定期收集
    this.collectInterval = setInterval(() => {
      this.collectMetrics()
    }, this.collectionInterval)
    
    logger.info('Business metrics collector started', {
      interval: this.collectionInterval
    })
  }
  
  /**
   * 停止收集指标
   */
  stop(): void {
    if (!this.isCollecting) {
      return
    }
    
    this.isCollecting = false
    
    if (this.collectInterval) {
      clearInterval(this.collectInterval)
    }
    
    logger.info('Business metrics collector stopped')
  }
  
  /**
   * 收集所有业务指标
   */
  private async collectMetrics(): Promise<void> {
    try {
      const startTime = Date.now()
      
      // 并行收集各类指标
      const [
        invitationMetrics,
        systemHealthMetrics,
        customMetrics
      ] = await Promise.all([
        this.collectInvitationMetrics(),
        this.collectSystemHealthMetrics(),
        this.collectCustomMetrics()
      ])
      
      const collectionTime = Date.now() - startTime
      
      // 发出指标收集完成事件
      this.emit('metricsCollected', {
        invitation: invitationMetrics,
        systemHealth: systemHealthMetrics,
        custom: customMetrics,
        collectionTime
      })
      
      logger.debug('Business metrics collected', {
        collectionTime,
        metricsCount: Object.keys(invitationMetrics).length + 
                     Object.keys(systemHealthMetrics).length + 
                     customMetrics.length
      })
      
    } catch (error) {
      logger.error('Failed to collect business metrics', { error })
      this.emit('collectionError', error)
    }
  }
  
  /**
   * 收集邀请系统指标
   */
  private async collectInvitationMetrics(): Promise<InvitationMetrics> {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    // 邀请码统计
    const inviteCodeStats = await this.db.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired,
        SUM(CASE WHEN used_count > 0 THEN 1 ELSE 0 END) as used
      FROM invite_codes
    `)
    
    // 注册统计
    const registrationStats = await this.db.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN DATE(created_at) = DATE(?) THEN 1 ELSE 0 END) as today
      FROM invite_registrations
    `, [today])
    
    // 转化率计算
    const conversionRate = inviteCodeStats[0].total > 0 
      ? (registrationStats[0].total / inviteCodeStats[0].total) * 100 
      : 0
    
    // 奖励统计
    const rewardStats = await this.db.query(`
      SELECT 
        COUNT(*) as total_distributed,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'distributed' THEN amount ELSE 0 END) as total_value
      FROM user_rewards
    `)
    
    // 用户活跃度统计
    const userStats = await this.db.query(`
      SELECT 
        COUNT(DISTINCT user_id) as active_users,
        SUM(CASE WHEN DATE(created_at) = DATE(?) THEN 1 ELSE 0 END) as new_users
      FROM invite_registrations
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `, [today])
    
    // 防作弊统计
    const fraudStats = await this.db.query(`
      SELECT 
        COUNT(*) as fraud_detections,
        COUNT(DISTINCT user_id) as blocked_users
      FROM fraud_detection_logs
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        AND action_taken = 'blocked'
    `)
    
    const suspiciousActivities = await this.db.query(`
      SELECT COUNT(*) as count
      FROM fraud_detection_logs
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        AND risk_score > 0.7
    `)
    
    return {
      totalInviteCodes: inviteCodeStats[0].total || 0,
      activeInviteCodes: inviteCodeStats[0].active || 0,
      expiredInviteCodes: inviteCodeStats[0].expired || 0,
      usedInviteCodes: inviteCodeStats[0].used || 0,
      
      totalRegistrations: registrationStats[0].total || 0,
      todayRegistrations: registrationStats[0].today || 0,
      conversionRate,
      
      totalRewardsDistributed: rewardStats[0].total_distributed || 0,
      pendingRewards: rewardStats[0].pending || 0,
      rewardValue: rewardStats[0].total_value || 0,
      
      activeUsers: userStats[0].active_users || 0,
      newUsers: userStats[0].new_users || 0,
      returningUsers: Math.max(0, (userStats[0].active_users || 0) - (userStats[0].new_users || 0)),
      
      fraudDetections: fraudStats[0].fraud_detections || 0,
      blockedUsers: fraudStats[0].blocked_users || 0,
      suspiciousActivities: suspiciousActivities[0].count || 0
    }
  }
  
  /**
   * 收集系统健康指标
   */
  private async collectSystemHealthMetrics(): Promise<SystemHealthMetrics> {
    // 响应时间统计（模拟数据，实际应该从监控系统获取）
    const responseTime = {
      avg: Math.random() * 500 + 100, // 100-600ms
      p50: Math.random() * 300 + 50,  // 50-350ms
      p95: Math.random() * 1000 + 500, // 500-1500ms
      p99: Math.random() * 2000 + 1000 // 1000-3000ms
    }
    
    // 错误率统计
    const errorStats = await this.db.query(`
      SELECT 
        COUNT(*) as total_requests,
        SUM(CASE WHEN response_status >= 400 THEN 1 ELSE 0 END) as error_requests
      FROM api_request_logs
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
    `)
    
    const totalRequests = errorStats[0]?.total_requests || 1
    const errorRequests = errorStats[0]?.error_requests || 0
    const errorRate = (errorRequests / totalRequests) * 100
    const successRate = 100 - errorRate
    
    // 系统资源使用（模拟数据）
    const memoryUsage = Math.random() * 40 + 40 // 40-80%
    const cpuUsage = Math.random() * 30 + 20    // 20-50%
    const diskUsage = Math.random() * 20 + 30   // 30-50%
    
    // 数据库连接统计
    const dbStats = await this.db.query(`
      SHOW STATUS LIKE 'Threads_connected'
    `)
    
    const activeConnections = parseInt(dbStats[0]?.Value || '0')
    
    return {
      responseTime,
      errorRate,
      successRate,
      memoryUsage,
      cpuUsage,
      diskUsage,
      dbConnections: {
        active: activeConnections,
        idle: Math.max(0, 20 - activeConnections), // 假设最大20个连接
        total: 20
      },
      cacheHitRate: Math.random() * 20 + 75, // 75-95%
      cacheSize: Math.random() * 500 + 100   // 100-600MB
    }
  }
  
  /**
   * 收集自定义指标
   */
  private async collectCustomMetrics(): Promise<BusinessMetric[]> {
    const metrics: BusinessMetric[] = []
    const now = new Date()
    
    try {
      // 邀请活动参与度
      const activityStats = await this.db.query(`
        SELECT 
          activity_id,
          COUNT(*) as participants,
          AVG(progress) as avg_progress
        FROM invitation_activity_participants
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY activity_id
      `)
      
      for (const activity of activityStats) {
        metrics.push({
          name: 'invitation_activity_participants',
          value: activity.participants,
          timestamp: now,
          labels: { activity_id: activity.activity_id.toString() },
          description: '邀请活动参与人数'
        })
        
        metrics.push({
          name: 'invitation_activity_progress',
          value: activity.avg_progress,
          timestamp: now,
          labels: { activity_id: activity.activity_id.toString() },
          description: '邀请活动平均进度'
        })
      }
      
      // 分享渠道效果
      const shareStats = await this.db.query(`
        SELECT 
          platform,
          COUNT(*) as share_count,
          COUNT(DISTINCT user_id) as unique_sharers
        FROM share_events
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        GROUP BY platform
      `)
      
      for (const share of shareStats) {
        metrics.push({
          name: 'share_events_count',
          value: share.share_count,
          timestamp: now,
          labels: { platform: share.platform },
          description: '分享事件数量'
        })
        
        metrics.push({
          name: 'unique_sharers_count',
          value: share.unique_sharers,
          timestamp: now,
          labels: { platform: share.platform },
          description: '独立分享用户数'
        })
      }
      
      // 奖励类型分布
      const rewardTypeStats = await this.db.query(`
        SELECT 
          reward_type,
          COUNT(*) as count,
          SUM(amount) as total_amount
        FROM user_rewards
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY reward_type
      `)
      
      for (const reward of rewardTypeStats) {
        metrics.push({
          name: 'rewards_by_type_count',
          value: reward.count,
          timestamp: now,
          labels: { reward_type: reward.reward_type },
          description: '按类型统计的奖励数量'
        })
        
        metrics.push({
          name: 'rewards_by_type_amount',
          value: reward.total_amount,
          timestamp: now,
          labels: { reward_type: reward.reward_type },
          description: '按类型统计的奖励金额'
        })
      }
      
      // 用户地域分布（如果有地域信息）
      const regionStats = await this.db.query(`
        SELECT 
          region,
          COUNT(*) as user_count
        FROM users
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
          AND region IS NOT NULL
        GROUP BY region
        ORDER BY user_count DESC
        LIMIT 10
      `)
      
      for (const region of regionStats) {
        metrics.push({
          name: 'users_by_region',
          value: region.user_count,
          timestamp: now,
          labels: { region: region.region },
          description: '按地域统计的用户数量'
        })
      }
      
    } catch (error) {
      logger.error('Failed to collect custom metrics', { error })
    }
    
    return metrics
  }
  
  /**
   * 获取实时业务指标
   */
  async getRealTimeMetrics(): Promise<{
    invitation: InvitationMetrics
    systemHealth: SystemHealthMetrics
    custom: BusinessMetric[]
  }> {
    const [invitation, systemHealth, custom] = await Promise.all([
      this.collectInvitationMetrics(),
      this.collectSystemHealthMetrics(),
      this.collectCustomMetrics()
    ])
    
    return { invitation, systemHealth, custom }
  }
  
  /**
   * 获取指标趋势数据
   */
  async getMetricsTrend(metricName: string, hours: number = 24): Promise<Array<{
    timestamp: Date
    value: number
  }>> {
    try {
      // 这里应该从时序数据库或缓存中获取历史数据
      // 为了演示，返回模拟数据
      const points: Array<{ timestamp: Date; value: number }> = []
      const now = new Date()
      const interval = (hours * 60 * 60 * 1000) / 100 // 100个数据点
      
      for (let i = 0; i < 100; i++) {
        const timestamp = new Date(now.getTime() - (99 - i) * interval)
        const value = Math.random() * 100 + Math.sin(i / 10) * 20 + 50
        points.push({ timestamp, value })
      }
      
      return points
    } catch (error) {
      logger.error('Failed to get metrics trend', { error, metricName, hours })
      return []
    }
  }
  
  /**
   * 计算指标同比增长率
   */
  async getMetricsGrowthRate(metricName: string): Promise<{
    current: number
    previous: number
    growthRate: number
  }> {
    try {
      // 获取当前值和上一周期值进行比较
      // 这里返回模拟数据
      const current = Math.random() * 1000 + 500
      const previous = Math.random() * 1000 + 400
      const growthRate = ((current - previous) / previous) * 100
      
      return { current, previous, growthRate }
    } catch (error) {
      logger.error('Failed to calculate growth rate', { error, metricName })
      return { current: 0, previous: 0, growthRate: 0 }
    }
  }
  
  /**
   * 设置收集间隔
   */
  setCollectionInterval(interval: number): void {
    this.collectionInterval = interval
    
    if (this.isCollecting) {
      this.stop()
      this.start()
    }
    
    logger.info('Collection interval updated', { interval })
  }
}