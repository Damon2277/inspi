/**
 * 高级防作弊检测服务
 * 实现行为模式分析、异常行为告警系统、人工审核工作流、账户冻结和奖励回收
 */

import { DatabaseService } from '../database'
import { FraudDetectionService } from './FraudDetectionService'
import { NotificationServiceImpl } from './NotificationService'

export interface BehaviorPattern {
  userId: string
  patternType: 'registration' | 'invitation' | 'activity' | 'reward_claim'
  features: Record<string, number>
  timestamp: Date
  riskScore: number
}

export interface AnomalyAlert {
  id: string
  userId: string
  alertType: 'behavior_anomaly' | 'pattern_deviation' | 'velocity_spike' | 'network_abuse'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  evidence: Record<string, any>
  status: 'pending' | 'investigating' | 'resolved' | 'false_positive'
  createdAt: Date
  resolvedAt?: Date
  resolvedBy?: string
}

export interface ReviewCase {
  id: string
  userId: string
  caseType: 'suspicious_behavior' | 'fraud_detection' | 'reward_dispute' | 'account_verification'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'escalated'
  assignedTo?: string
  evidence: ReviewEvidence[]
  decision?: ReviewDecision
  createdAt: Date
  updatedAt: Date
}

export interface ReviewEvidence {
  type: 'system_log' | 'user_behavior' | 'device_info' | 'network_data' | 'manual_note'
  data: Record<string, any>
  timestamp: Date
  source: string
}

export interface ReviewDecision {
  action: 'approve' | 'reject' | 'freeze' | 'ban' | 'recover_rewards' | 'require_verification'
  reason: string
  reviewerId: string
  timestamp: Date
  notes?: string
}

export interface AccountStatus {
  userId: string
  isFrozen: boolean
  frozenFeatures: string[]
  freezeReason?: string
  freezeExpiresAt?: Date
  riskLevel: 'low' | 'medium' | 'high'
  totalRecoveredRewards: number
  activeReviewCases: number
}

export interface AdvancedFraudDetectionService {
  // 行为模式分析
  analyzeBehaviorPattern(userId: string, activityType: string, context: Record<string, any>): Promise<BehaviorPattern>
  detectPatternAnomalies(userId: string, timeWindow: number): Promise<AnomalyAlert[]>
  
  // 异常行为告警系统
  createAnomalyAlert(alert: Omit<AnomalyAlert, 'id' | 'createdAt'>): Promise<string>
  getActiveAlerts(severity?: string, limit?: number): Promise<AnomalyAlert[]>
  
  // 人工审核工作流
  createReviewCase(caseData: Omit<ReviewCase, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>
  getReviewCases(status?: string, assignedTo?: string): Promise<ReviewCase[]>
  
  // 账户冻结和奖励回收
  freezeAccount(userId: string, reason: string, createdBy: string): Promise<void>
  getAccountStatus(userId: string): Promise<AccountStatus>
}

export class AdvancedFraudDetectionServiceImpl implements AdvancedFraudDetectionService {
  constructor(
    private db: DatabaseService,
    private basicFraudService: FraudDetectionService,
    private notificationService: NotificationServiceImpl
  ) {}

  async analyzeBehaviorPattern(
    userId: string, 
    activityType: string, 
    context: Record<string, any>
  ): Promise<BehaviorPattern> {
    // Implementation will be added
    return {
      userId,
      patternType: activityType as any,
      features: {},
      timestamp: new Date(),
      riskScore: 0.5
    }
  }

  async detectPatternAnomalies(userId: string, timeWindow: number = 24 * 60 * 60 * 1000): Promise<AnomalyAlert[]> {
    // Implementation will be added
    return []
  }

  async createAnomalyAlert(alert: Omit<AnomalyAlert, 'id' | 'createdAt'>): Promise<string> {
    // Implementation will be added
    return `alert_${Date.now()}`
  }

  async getActiveAlerts(severity?: string, limit: number = 50): Promise<AnomalyAlert[]> {
    // Implementation will be added
    return []
  }

  async createReviewCase(caseData: Omit<ReviewCase, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    // Implementation will be added
    return `case_${Date.now()}`
  }

  async getReviewCases(status?: string, assignedTo?: string): Promise<ReviewCase[]> {
    // Implementation will be added
    return []
  }

  async freezeAccount(userId: string, reason: string, createdBy: string): Promise<void> {
    // Implementation will be added
  }

  async getAccountStatus(userId: string): Promise<AccountStatus> {
    // Implementation will be added
    return {
      userId,
      isFrozen: false,
      frozenFeatures: [],
      riskLevel: 'low',
      totalRecoveredRewards: 0,
      activeReviewCases: 0
    }
  }
}
// Now l
et me implement the core methods
export class AdvancedFraudDetectionServiceImplComplete extends AdvancedFraudDetectionServiceImpl {
  private readonly BEHAVIOR_ANALYSIS_WINDOW = 24 * 60 * 60 * 1000 // 24小时
  private readonly ANOMALY_THRESHOLD = 0.8 // 异常阈值
  private readonly PATTERN_DEVIATION_THRESHOLD = 2.0 // 模式偏差阈值

  /**
   * 分析用户行为模式
   */
  async analyzeBehaviorPattern(
    userId: string, 
    activityType: string, 
    context: Record<string, any>
  ): Promise<BehaviorPattern> {
    try {
      // 获取用户历史行为数据
      const historicalData = await this.getUserHistoricalBehavior(userId, activityType)
      
      // 提取行为特征
      const features = this.extractBehaviorFeatures(context, historicalData)
      
      // 计算风险评分
      const riskScore = this.calculateBehaviorRiskScore(features, historicalData)
      
      const pattern: BehaviorPattern = {
        userId,
        patternType: activityType as any,
        features,
        timestamp: new Date(),
        riskScore
      }

      // 保存行为模式
      await this.saveBehaviorPattern(pattern)
      
      return pattern
    } catch (error) {
      console.error('Failed to analyze behavior pattern:', error)
      throw error
    }
  }

  /**
   * 检测模式异常
   */
  async detectPatternAnomalies(userId: string, timeWindow: number = this.BEHAVIOR_ANALYSIS_WINDOW): Promise<AnomalyAlert[]> {
    try {
      const alerts: AnomalyAlert[] = []
      const endTime = new Date()
      const startTime = new Date(endTime.getTime() - timeWindow)

      // 获取时间窗口内的行为模式
      const patterns = await this.getBehaviorPatterns(userId, startTime, endTime)
      
      if (patterns.length < 2) {
        return alerts // 数据不足，无法检测异常
      }

      // 检测行为速度异常
      const velocityAnomaly = this.detectVelocityAnomaly(patterns)
      if (velocityAnomaly) {
        alerts.push(velocityAnomaly)
      }

      // 检测模式偏差
      const patternDeviation = this.detectPatternDeviation(patterns)
      if (patternDeviation) {
        alerts.push(patternDeviation)
      }

      // 保存检测到的异常
      for (const alert of alerts) {
        await this.createAnomalyAlert(alert)
      }

      return alerts
    } catch (error) {
      console.error('Failed to detect pattern anomalies:', error)
      return []
    }
  }

  /**
   * 创建异常告警
   */
  async createAnomalyAlert(alert: Omit<AnomalyAlert, 'id' | 'createdAt'>): Promise<string> {
    try {
      const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const now = new Date()

      const query = `
        INSERT INTO anomaly_alerts (
          id, user_id, alert_type, severity, description, 
          evidence, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `

      await this.db.execute(query, [
        alertId,
        alert.userId,
        alert.alertType,
        alert.severity,
        alert.description,
        JSON.stringify(alert.evidence),
        alert.status,
        now
      ])

      // 发送告警通知
      await this.sendAlertNotification(alertId, alert)

      return alertId
    } catch (error) {
      console.error('Failed to create anomaly alert:', error)
      throw error
    }
  }

  /**
   * 获取活跃告警
   */
  async getActiveAlerts(severity?: string, limit: number = 50): Promise<AnomalyAlert[]> {
    try {
      let query = `
        SELECT * FROM anomaly_alerts 
        WHERE status IN ('pending', 'investigating')
      `
      const params: any[] = []

      if (severity) {
        query += ' AND severity = ?'
        params.push(severity)
      }

      query += ' ORDER BY created_at DESC LIMIT ?'
      params.push(limit)

      const results = await this.db.queryMany(query, params)
      
      return results.map(row => ({
        id: row.id,
        userId: row.user_id,
        alertType: row.alert_type,
        severity: row.severity,
        description: row.description,
        evidence: JSON.parse(row.evidence || '{}'),
        status: row.status,
        createdAt: new Date(row.created_at),
        resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
        resolvedBy: row.resolved_by
      }))
    } catch (error) {
      console.error('Failed to get active alerts:', error)
      return []
    }
  }

  /**
   * 创建审核案例
   */
  async createReviewCase(caseData: Omit<ReviewCase, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const caseId = `case_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const now = new Date()

      const query = `
        INSERT INTO review_cases (
          id, user_id, case_type, priority, status, assigned_to,
          evidence, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `

      await this.db.execute(query, [
        caseId,
        caseData.userId,
        caseData.caseType,
        caseData.priority,
        caseData.status,
        caseData.assignedTo || null,
        JSON.stringify(caseData.evidence),
        now,
        now
      ])

      return caseId
    } catch (error) {
      console.error('Failed to create review case:', error)
      throw error
    }
  }

  /**
   * 获取审核案例
   */
  async getReviewCases(status?: string, assignedTo?: string): Promise<ReviewCase[]> {
    try {
      let query = 'SELECT * FROM review_cases WHERE 1=1'
      const params: any[] = []

      if (status) {
        query += ' AND status = ?'
        params.push(status)
      }

      if (assignedTo) {
        query += ' AND assigned_to = ?'
        params.push(assignedTo)
      }

      query += ' ORDER BY created_at DESC'

      const results = await this.db.queryMany(query, params)
      
      return results.map(row => ({
        id: row.id,
        userId: row.user_id,
        caseType: row.case_type,
        priority: row.priority,
        status: row.status,
        assignedTo: row.assigned_to,
        evidence: JSON.parse(row.evidence || '[]'),
        decision: row.decision ? JSON.parse(row.decision) : undefined,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      }))
    } catch (error) {
      console.error('Failed to get review cases:', error)
      return []
    }
  }

  /**
   * 冻结账户
   */
  async freezeAccount(userId: string, reason: string, createdBy: string): Promise<void> {
    try {
      const now = new Date()

      const query = `
        INSERT INTO account_freezes (
          user_id, reason, frozen_features, created_by,
          created_at, is_active
        ) VALUES (?, ?, ?, ?, ?, ?)
      `

      await this.db.execute(query, [
        userId,
        reason,
        JSON.stringify(['all']),
        createdBy,
        now,
        true
      ])

      // 发送冻结通知
      await this.sendAccountFreezeNotification(userId, reason)
    } catch (error) {
      console.error('Failed to freeze account:', error)
      throw error
    }
  }

  /**
   * 获取账户状态
   */
  async getAccountStatus(userId: string): Promise<AccountStatus> {
    try {
      // 获取冻结状态
      const freezeQuery = `
        SELECT * FROM account_freezes 
        WHERE user_id = ? AND is_active = true
        ORDER BY created_at DESC LIMIT 1
      `
      const freezeResult = await this.db.queryOne(freezeQuery, [userId])

      // 获取风险等级
      const riskLevel = await this.basicFraudService.getUserRiskLevel(userId)

      // 获取活跃审核案例数量
      const reviewQuery = `
        SELECT COUNT(*) as count
        FROM review_cases 
        WHERE user_id = ? AND status IN ('pending', 'in_review')
      `
      const reviewResult = await this.db.queryOne(reviewQuery, [userId])

      return {
        userId,
        isFrozen: !!freezeResult,
        frozenFeatures: freezeResult ? JSON.parse(freezeResult.frozen_features || '[]') : [],
        freezeReason: freezeResult?.reason,
        freezeExpiresAt: freezeResult?.expires_at ? new Date(freezeResult.expires_at) : undefined,
        riskLevel,
        totalRecoveredRewards: 0,
        activeReviewCases: reviewResult?.count || 0
      }
    } catch (error) {
      console.error('Failed to get account status:', error)
      throw error
    }
  }

  // 私有辅助方法

  private async getUserHistoricalBehavior(userId: string, activityType: string): Promise<BehaviorPattern[]> {
    const query = `
      SELECT * FROM behavior_patterns 
      WHERE user_id = ? AND pattern_type = ?
      ORDER BY timestamp DESC LIMIT 100
    `
    
    const results = await this.db.queryMany(query, [userId, activityType])
    
    return results.map(row => ({
      userId: row.user_id,
      patternType: row.pattern_type,
      features: JSON.parse(row.features || '{}'),
      timestamp: new Date(row.timestamp),
      riskScore: row.risk_score
    }))
  }

  private extractBehaviorFeatures(context: Record<string, any>, historical: BehaviorPattern[]): Record<string, number> {
    const features: Record<string, number> = {}

    // 时间特征
    const now = new Date()
    features.hour_of_day = now.getHours()
    features.day_of_week = now.getDay()

    // 频率特征
    const recentPatterns = historical.filter(p => 
      now.getTime() - p.timestamp.getTime() < 24 * 60 * 60 * 1000
    )
    features.daily_frequency = recentPatterns.length

    // 上下文特征
    if (context.ip) {
      features.ip_hash = this.hashString(context.ip) % 1000
    }
    if (context.userAgent) {
      features.user_agent_hash = this.hashString(context.userAgent) % 1000
    }

    return features
  }

  private calculateBehaviorRiskScore(features: Record<string, number>, historical: BehaviorPattern[]): number {
    if (historical.length === 0) {
      return 0.5 // 新用户默认中等风险
    }

    // 计算与历史模式的偏差
    const avgHistoricalScore = historical.reduce((sum, p) => sum + p.riskScore, 0) / historical.length
    
    // 基于特征计算当前风险
    let currentRisk = 0.3 // 基础风险

    // 异常时间活动
    if (features.hour_of_day < 6 || features.hour_of_day > 22) {
      currentRisk += 0.2
    }

    // 高频活动
    if (features.daily_frequency > 10) {
      currentRisk += 0.3
    }

    // 与历史平均值的偏差
    const deviation = Math.abs(currentRisk - avgHistoricalScore)
    if (deviation > 0.3) {
      currentRisk += 0.2
    }

    return Math.min(currentRisk, 1.0)
  }

  private async saveBehaviorPattern(pattern: BehaviorPattern): Promise<void> {
    const query = `
      INSERT INTO behavior_patterns (
        user_id, pattern_type, features, timestamp, risk_score
      ) VALUES (?, ?, ?, ?, ?)
    `

    await this.db.execute(query, [
      pattern.userId,
      pattern.patternType,
      JSON.stringify(pattern.features),
      pattern.timestamp,
      pattern.riskScore
    ])
  }

  private async getBehaviorPatterns(userId: string, startTime: Date, endTime: Date): Promise<BehaviorPattern[]> {
    const query = `
      SELECT * FROM behavior_patterns 
      WHERE user_id = ? AND timestamp BETWEEN ? AND ?
      ORDER BY timestamp ASC
    `
    
    const results = await this.db.queryMany(query, [userId, startTime, endTime])
    
    return results.map(row => ({
      userId: row.user_id,
      patternType: row.pattern_type,
      features: JSON.parse(row.features || '{}'),
      timestamp: new Date(row.timestamp),
      riskScore: row.risk_score
    }))
  }

  private detectVelocityAnomaly(patterns: BehaviorPattern[]): AnomalyAlert | null {
    if (patterns.length < 5) return null

    const timeSpan = patterns[patterns.length - 1].timestamp.getTime() - patterns[0].timestamp.getTime()
    const velocity = patterns.length / (timeSpan / (60 * 60 * 1000)) // 每小时活动次数

    if (velocity > 10) { // 每小时超过10次活动
      return {
        id: '',
        userId: patterns[0].userId,
        alertType: 'velocity_spike',
        severity: 'high',
        description: `检测到异常高频活动：${velocity.toFixed(2)}次/小时`,
        evidence: {
          velocity,
          patternCount: patterns.length,
          timeSpan: timeSpan / 1000
        },
        status: 'pending',
        createdAt: new Date()
      }
    }

    return null
  }

  private detectPatternDeviation(patterns: BehaviorPattern[]): AnomalyAlert | null {
    if (patterns.length < 3) return null

    const avgRiskScore = patterns.reduce((sum, p) => sum + p.riskScore, 0) / patterns.length
    const recentScore = patterns[patterns.length - 1].riskScore

    const deviation = Math.abs(recentScore - avgRiskScore)

    if (deviation > this.PATTERN_DEVIATION_THRESHOLD) {
      return {
        id: '',
        userId: patterns[0].userId,
        alertType: 'pattern_deviation',
        severity: deviation > 3.0 ? 'critical' : 'high',
        description: `检测到行为模式显著偏差：偏差值${deviation.toFixed(2)}`,
        evidence: {
          deviation,
          avgRiskScore,
          recentScore,
          patternCount: patterns.length
        },
        status: 'pending',
        createdAt: new Date()
      }
    }

    return null
  }

  private async sendAlertNotification(alertId: string, alert: Omit<AnomalyAlert, 'id' | 'createdAt'>): Promise<void> {
    try {
      // 发送给管理员的告警通知
      await this.notificationService.sendNotification({
        userId: 'admin', // 管理员用户ID
        type: 'security_alert' as any,
        title: '安全告警',
        content: `检测到${alert.severity}级别异常：${alert.description}`,
        channel: 'email' as any,
        status: 'pending' as any,
        metadata: {
          alertId,
          userId: alert.userId,
          alertType: alert.alertType
        }
      })
    } catch (error) {
      console.error('Failed to send alert notification:', error)
    }
  }

  private async sendAccountFreezeNotification(userId: string, reason: string): Promise<void> {
    try {
      await this.notificationService.sendNotification({
        userId,
        type: 'account_security' as any,
        title: '账户已被冻结',
        content: `您的账户因以下原因被冻结：${reason}。如有疑问，请联系客服。`,
        channel: 'email' as any,
        status: 'pending' as any
      })
    } catch (error) {
      console.error('Failed to send freeze notification:', error)
    }
  }

  private hashString(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }
}