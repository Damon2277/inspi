/**
 * 转化率分析服务
 * 提供详细的邀请转化率分析和优化建议
 */

import { DatabaseService } from '../database'
import { TimePeriod, SharePlatform } from '../types'

export interface ConversionMetrics {
  // 基础转化率
  inviteToClick: number        // 邀请到点击转化率
  clickToRegister: number      // 点击到注册转化率
  registerToActivate: number   // 注册到激活转化率
  overallConversion: number    // 整体转化率
  
  // 数量统计
  totalInvites: number
  totalClicks: number
  totalRegistrations: number
  totalActivations: number
  
  // 时间分析
  averageTimeToRegister: number  // 平均注册时间（小时）
  averageTimeToActivate: number  // 平均激活时间（小时）
}

export interface PlatformConversionAnalysis {
  platform: SharePlatform
  metrics: ConversionMetrics
  trend: 'improving' | 'declining' | 'stable'
  recommendations: string[]
}

export interface ConversionFunnelData {
  step: string
  count: number
  percentage: number
  dropoffRate: number
}

export interface ConversionAnalysisService {
  // 获取整体转化率分析
  getOverallConversionAnalysis(period: TimePeriod): Promise<ConversionMetrics>
  
  // 获取平台转化率分析
  getPlatformConversionAnalysis(period: TimePeriod): Promise<PlatformConversionAnalysis[]>
  
  // 获取用户转化率分析
  getUserConversionAnalysis(userId: string, period: TimePeriod): Promise<ConversionMetrics>
  
  // 获取转化漏斗数据
  getConversionFunnelData(period: TimePeriod): Promise<ConversionFunnelData[]>
  
  // 获取转化率趋势
  getConversionTrend(period: TimePeriod, granularity: 'day' | 'week' | 'month'): Promise<Array<{
    date: string
    metrics: ConversionMetrics
  }>>
  
  // 获取优化建议
  getOptimizationRecommendations(userId?: string): Promise<{
    priority: 'high' | 'medium' | 'low'
    category: string
    recommendation: string
    expectedImprovement: string
  }[]>
  
  // 分析转化率影响因素
  analyzeConversionFactors(period: TimePeriod): Promise<{
    timeOfDay: { [hour: string]: number }
    dayOfWeek: { [day: string]: number }
    deviceType: { [device: string]: number }
    referrerType: { [referrer: string]: number }
  }>
}

export class ConversionAnalysisServiceImpl implements ConversionAnalysisService {
  constructor(private db: DatabaseService) {}

  /**
   * 获取整体转化率分析
   */
  async getOverallConversionAnalysis(period: TimePeriod): Promise<ConversionMetrics> {
    try {
      const query = `
        SELECT 
          COUNT(DISTINCT CASE WHEN ie.type = 'code_generated' THEN ie.invite_code_id END) as total_invites,
          COUNT(DISTINCT CASE WHEN ie.type = 'link_clicked' THEN ie.invite_code_id END) as total_clicks,
          COUNT(DISTINCT CASE WHEN ie.type = 'user_registered' THEN ie.invite_code_id END) as total_registrations,
          COUNT(DISTINCT CASE WHEN ie.type = 'user_activated' THEN ie.invite_code_id END) as total_activations,
          AVG(CASE 
            WHEN ie_reg.timestamp IS NOT NULL AND ie_gen.timestamp IS NOT NULL 
            THEN TIMESTAMPDIFF(HOUR, ie_gen.timestamp, ie_reg.timestamp) 
          END) as avg_time_to_register,
          AVG(CASE 
            WHEN ie_act.timestamp IS NOT NULL AND ie_reg.timestamp IS NOT NULL 
            THEN TIMESTAMPDIFF(HOUR, ie_reg.timestamp, ie_act.timestamp) 
          END) as avg_time_to_activate
        FROM invite_events ie
        LEFT JOIN invite_events ie_gen ON ie.invite_code_id = ie_gen.invite_code_id AND ie_gen.type = 'code_generated'
        LEFT JOIN invite_events ie_reg ON ie.invite_code_id = ie_reg.invite_code_id AND ie_reg.type = 'user_registered'
        LEFT JOIN invite_events ie_act ON ie.invite_code_id = ie_act.invite_code_id AND ie_act.type = 'user_activated'
        WHERE ie.timestamp BETWEEN ? AND ?
      `

      const result = await this.db.queryOne(query, [period.start, period.end])
      
      return this.calculateConversionMetrics(result)
    } catch (error) {
      console.error('Failed to get overall conversion analysis:', error)
      throw new Error('Failed to get overall conversion analysis')
    }
  }

  /**
   * 获取平台转化率分析
   */
  async getPlatformConversionAnalysis(period: TimePeriod): Promise<PlatformConversionAnalysis[]> {
    try {
      const query = `
        SELECT 
          se.platform,
          COUNT(DISTINCT CASE WHEN se.event_type = 'share' THEN se.invite_code_id END) as total_invites,
          COUNT(DISTINCT CASE WHEN se.event_type = 'click' THEN se.invite_code_id END) as total_clicks,
          COUNT(DISTINCT CASE WHEN se.event_type = 'conversion' THEN se.invite_code_id END) as total_registrations,
          COUNT(DISTINCT CASE WHEN ie.type = 'user_activated' THEN ie.invite_code_id END) as total_activations
        FROM share_events se
        LEFT JOIN invite_events ie ON se.invite_code_id = ie.invite_code_id AND ie.type = 'user_activated'
        WHERE se.timestamp BETWEEN ? AND ?
        GROUP BY se.platform
      `

      const results = await this.db.query(query, [period.start, period.end])
      
      const analyses: PlatformConversionAnalysis[] = []
      
      for (const row of results) {
        const metrics = this.calculateConversionMetrics(row)
        const trend = await this.calculatePlatformTrend(row.platform, period)
        const recommendations = this.generatePlatformRecommendations(row.platform, metrics)
        
        analyses.push({
          platform: row.platform as SharePlatform,
          metrics,
          trend,
          recommendations
        })
      }

      return analyses
    } catch (error) {
      console.error('Failed to get platform conversion analysis:', error)
      throw new Error('Failed to get platform conversion analysis')
    }
  }

  /**
   * 获取用户转化率分析
   */
  async getUserConversionAnalysis(userId: string, period: TimePeriod): Promise<ConversionMetrics> {
    try {
      const query = `
        SELECT 
          COUNT(DISTINCT CASE WHEN ie.type = 'code_generated' THEN ie.invite_code_id END) as total_invites,
          COUNT(DISTINCT CASE WHEN ie.type = 'link_clicked' THEN ie.invite_code_id END) as total_clicks,
          COUNT(DISTINCT CASE WHEN ie.type = 'user_registered' THEN ie.invite_code_id END) as total_registrations,
          COUNT(DISTINCT CASE WHEN ie.type = 'user_activated' THEN ie.invite_code_id END) as total_activations,
          AVG(CASE 
            WHEN ie_reg.timestamp IS NOT NULL AND ie_gen.timestamp IS NOT NULL 
            THEN TIMESTAMPDIFF(HOUR, ie_gen.timestamp, ie_reg.timestamp) 
          END) as avg_time_to_register,
          AVG(CASE 
            WHEN ie_act.timestamp IS NOT NULL AND ie_reg.timestamp IS NOT NULL 
            THEN TIMESTAMPDIFF(HOUR, ie_reg.timestamp, ie_act.timestamp) 
          END) as avg_time_to_activate
        FROM invite_events ie
        LEFT JOIN invite_events ie_gen ON ie.invite_code_id = ie_gen.invite_code_id AND ie_gen.type = 'code_generated'
        LEFT JOIN invite_events ie_reg ON ie.invite_code_id = ie_reg.invite_code_id AND ie_reg.type = 'user_registered'
        LEFT JOIN invite_events ie_act ON ie.invite_code_id = ie_act.invite_code_id AND ie_act.type = 'user_activated'
        WHERE ie.inviter_id = ? AND ie.timestamp BETWEEN ? AND ?
      `

      const result = await this.db.queryOne(query, [userId, period.start, period.end])
      
      return this.calculateConversionMetrics(result)
    } catch (error) {
      console.error('Failed to get user conversion analysis:', error)
      throw new Error('Failed to get user conversion analysis')
    }
  }

  /**
   * 获取转化漏斗数据
   */
  async getConversionFunnelData(period: TimePeriod): Promise<ConversionFunnelData[]> {
    try {
      const metrics = await this.getOverallConversionAnalysis(period)
      
      const funnelData: ConversionFunnelData[] = [
        {
          step: '邀请生成',
          count: metrics.totalInvites,
          percentage: 100,
          dropoffRate: 0
        },
        {
          step: '链接点击',
          count: metrics.totalClicks,
          percentage: metrics.totalInvites > 0 ? (metrics.totalClicks / metrics.totalInvites) * 100 : 0,
          dropoffRate: metrics.totalInvites > 0 ? ((metrics.totalInvites - metrics.totalClicks) / metrics.totalInvites) * 100 : 0
        },
        {
          step: '用户注册',
          count: metrics.totalRegistrations,
          percentage: metrics.totalInvites > 0 ? (metrics.totalRegistrations / metrics.totalInvites) * 100 : 0,
          dropoffRate: metrics.totalClicks > 0 ? ((metrics.totalClicks - metrics.totalRegistrations) / metrics.totalClicks) * 100 : 0
        },
        {
          step: '用户激活',
          count: metrics.totalActivations,
          percentage: metrics.totalInvites > 0 ? (metrics.totalActivations / metrics.totalInvites) * 100 : 0,
          dropoffRate: metrics.totalRegistrations > 0 ? ((metrics.totalRegistrations - metrics.totalActivations) / metrics.totalRegistrations) * 100 : 0
        }
      ]

      return funnelData
    } catch (error) {
      console.error('Failed to get conversion funnel data:', error)
      throw new Error('Failed to get conversion funnel data')
    }
  }

  /**
   * 获取转化率趋势
   */
  async getConversionTrend(
    period: TimePeriod, 
    granularity: 'day' | 'week' | 'month' = 'day'
  ): Promise<Array<{
    date: string
    metrics: ConversionMetrics
  }>> {
    try {
      let dateFormat: string
      let groupBy: string

      switch (granularity) {
        case 'week':
          dateFormat = '%Y-%u'
          groupBy = 'YEARWEEK(ie.timestamp)'
          break
        case 'month':
          dateFormat = '%Y-%m'
          groupBy = 'DATE_FORMAT(ie.timestamp, "%Y-%m")'
          break
        default:
          dateFormat = '%Y-%m-%d'
          groupBy = 'DATE(ie.timestamp)'
      }

      const query = `
        SELECT 
          DATE_FORMAT(ie.timestamp, '${dateFormat}') as date,
          COUNT(DISTINCT CASE WHEN ie.type = 'code_generated' THEN ie.invite_code_id END) as total_invites,
          COUNT(DISTINCT CASE WHEN ie.type = 'link_clicked' THEN ie.invite_code_id END) as total_clicks,
          COUNT(DISTINCT CASE WHEN ie.type = 'user_registered' THEN ie.invite_code_id END) as total_registrations,
          COUNT(DISTINCT CASE WHEN ie.type = 'user_activated' THEN ie.invite_code_id END) as total_activations
        FROM invite_events ie
        WHERE ie.timestamp BETWEEN ? AND ?
        GROUP BY ${groupBy}
        ORDER BY date
      `

      const results = await this.db.query(query, [period.start, period.end])
      
      return results.map((row: any) => ({
        date: row.date,
        metrics: this.calculateConversionMetrics(row)
      }))
    } catch (error) {
      console.error('Failed to get conversion trend:', error)
      throw new Error('Failed to get conversion trend')
    }
  }

  /**
   * 获取优化建议
   */
  async getOptimizationRecommendations(userId?: string): Promise<{
    priority: 'high' | 'medium' | 'low'
    category: string
    recommendation: string
    expectedImprovement: string
  }[]> {
    try {
      const recommendations = []
      
      // 获取转化率数据
      const period: TimePeriod = {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30天前
        end: new Date()
      }

      const metrics = userId 
        ? await this.getUserConversionAnalysis(userId, period)
        : await this.getOverallConversionAnalysis(period)

      // 分析点击转化率
      if (metrics.inviteToClick < 20) {
        recommendations.push({
          priority: 'high' as const,
          category: '分享优化',
          recommendation: '邀请链接点击率较低，建议优化分享文案和分享时机，增加吸引力',
          expectedImprovement: '预计可提升15-25%的点击率'
        })
      }

      // 分析注册转化率
      if (metrics.clickToRegister < 30) {
        recommendations.push({
          priority: 'high' as const,
          category: '注册优化',
          recommendation: '注册转化率偏低，建议简化注册流程，优化落地页设计',
          expectedImprovement: '预计可提升20-30%的注册率'
        })
      }

      // 分析激活转化率
      if (metrics.registerToActivate < 60) {
        recommendations.push({
          priority: 'medium' as const,
          category: '用户激活',
          recommendation: '用户激活率需要提升，建议优化新手引导和首次体验',
          expectedImprovement: '预计可提升10-20%的激活率'
        })
      }

      // 分析平均注册时间
      if (metrics.averageTimeToRegister > 24) {
        recommendations.push({
          priority: 'medium' as const,
          category: '时效性优化',
          recommendation: '用户注册时间较长，建议增加紧迫感提示和限时优惠',
          expectedImprovement: '预计可缩短30-50%的注册时间'
        })
      }

      // 如果没有特定问题，提供通用建议
      if (recommendations.length === 0) {
        recommendations.push({
          priority: 'low' as const,
          category: '持续优化',
          recommendation: '当前转化率表现良好，建议继续A/B测试不同的分享策略',
          expectedImprovement: '预计可获得5-10%的增长'
        })
      }

      return recommendations
    } catch (error) {
      console.error('Failed to get optimization recommendations:', error)
      throw new Error('Failed to get optimization recommendations')
    }
  }

  /**
   * 分析转化率影响因素
   */
  async analyzeConversionFactors(period: TimePeriod): Promise<{
    timeOfDay: { [hour: string]: number }
    dayOfWeek: { [day: string]: number }
    deviceType: { [device: string]: number }
    referrerType: { [referrer: string]: number }
  }> {
    try {
      // 分析时间段影响
      const timeQuery = `
        SELECT 
          HOUR(ie.timestamp) as hour,
          COUNT(CASE WHEN ie.type = 'user_registered' THEN 1 END) / COUNT(CASE WHEN ie.type = 'link_clicked' THEN 1 END) * 100 as conversion_rate
        FROM invite_events ie
        WHERE ie.timestamp BETWEEN ? AND ?
        AND ie.type IN ('link_clicked', 'user_registered')
        GROUP BY HOUR(ie.timestamp)
        HAVING COUNT(CASE WHEN ie.type = 'link_clicked' THEN 1 END) > 0
      `

      // 分析星期影响
      const dayQuery = `
        SELECT 
          DAYNAME(ie.timestamp) as day_name,
          COUNT(CASE WHEN ie.type = 'user_registered' THEN 1 END) / COUNT(CASE WHEN ie.type = 'link_clicked' THEN 1 END) * 100 as conversion_rate
        FROM invite_events ie
        WHERE ie.timestamp BETWEEN ? AND ?
        AND ie.type IN ('link_clicked', 'user_registered')
        GROUP BY DAYNAME(ie.timestamp), DAYOFWEEK(ie.timestamp)
        HAVING COUNT(CASE WHEN ie.type = 'link_clicked' THEN 1 END) > 0
        ORDER BY DAYOFWEEK(ie.timestamp)
      `

      const [timeResults, dayResults] = await Promise.all([
        this.db.query(timeQuery, [period.start, period.end]),
        this.db.query(dayQuery, [period.start, period.end])
      ])

      const timeOfDay: { [hour: string]: number } = {}
      timeResults.forEach((row: any) => {
        timeOfDay[row.hour] = parseFloat(row.conversion_rate) || 0
      })

      const dayOfWeek: { [day: string]: number } = {}
      dayResults.forEach((row: any) => {
        dayOfWeek[row.day_name] = parseFloat(row.conversion_rate) || 0
      })

      return {
        timeOfDay,
        dayOfWeek,
        deviceType: {}, // 需要额外的设备信息收集
        referrerType: {} // 需要额外的来源信息收集
      }
    } catch (error) {
      console.error('Failed to analyze conversion factors:', error)
      throw new Error('Failed to analyze conversion factors')
    }
  }

  /**
   * 计算转化率指标
   */
  private calculateConversionMetrics(data: any): ConversionMetrics {
    const totalInvites = parseInt(data.total_invites) || 0
    const totalClicks = parseInt(data.total_clicks) || 0
    const totalRegistrations = parseInt(data.total_registrations) || 0
    const totalActivations = parseInt(data.total_activations) || 0

    return {
      inviteToClick: totalInvites > 0 ? (totalClicks / totalInvites) * 100 : 0,
      clickToRegister: totalClicks > 0 ? (totalRegistrations / totalClicks) * 100 : 0,
      registerToActivate: totalRegistrations > 0 ? (totalActivations / totalRegistrations) * 100 : 0,
      overallConversion: totalInvites > 0 ? (totalActivations / totalInvites) * 100 : 0,
      totalInvites,
      totalClicks,
      totalRegistrations,
      totalActivations,
      averageTimeToRegister: parseFloat(data.avg_time_to_register) || 0,
      averageTimeToActivate: parseFloat(data.avg_time_to_activate) || 0
    }
  }

  /**
   * 计算平台趋势
   */
  private async calculatePlatformTrend(platform: SharePlatform, period: TimePeriod): Promise<'improving' | 'declining' | 'stable'> {
    try {
      const midPoint = new Date((period.start.getTime() + period.end.getTime()) / 2)
      
      const firstHalfQuery = `
        SELECT 
          COUNT(CASE WHEN event_type = 'conversion' THEN 1 END) / COUNT(CASE WHEN event_type = 'click' THEN 1 END) * 100 as conversion_rate
        FROM share_events 
        WHERE platform = ? AND timestamp BETWEEN ? AND ?
        HAVING COUNT(CASE WHEN event_type = 'click' THEN 1 END) > 0
      `
      
      const secondHalfQuery = `
        SELECT 
          COUNT(CASE WHEN event_type = 'conversion' THEN 1 END) / COUNT(CASE WHEN event_type = 'click' THEN 1 END) * 100 as conversion_rate
        FROM share_events 
        WHERE platform = ? AND timestamp BETWEEN ? AND ?
        HAVING COUNT(CASE WHEN event_type = 'click' THEN 1 END) > 0
      `

      const [firstHalf, secondHalf] = await Promise.all([
        this.db.queryOne(firstHalfQuery, [platform, period.start, midPoint]),
        this.db.queryOne(secondHalfQuery, [platform, midPoint, period.end])
      ])

      const firstRate = parseFloat(firstHalf?.conversion_rate) || 0
      const secondRate = parseFloat(secondHalf?.conversion_rate) || 0

      if (secondRate > firstRate * 1.1) return 'improving'
      if (secondRate < firstRate * 0.9) return 'declining'
      return 'stable'
    } catch (error) {
      console.error('Failed to calculate platform trend:', error)
      return 'stable'
    }
  }

  /**
   * 生成平台优化建议
   */
  private generatePlatformRecommendations(platform: SharePlatform, metrics: ConversionMetrics): string[] {
    const recommendations: string[] = []

    switch (platform) {
      case SharePlatform.WECHAT:
        if (metrics.clickToRegister < 25) {
          recommendations.push('优化微信分享卡片的标题和描述，增加吸引力')
          recommendations.push('考虑在微信群中分享时添加个人推荐语')
        }
        break

      case SharePlatform.QQ:
        if (metrics.inviteToClick < 15) {
          recommendations.push('QQ分享的点击率较低，建议优化分享时机和目标群体')
        }
        break

      case SharePlatform.EMAIL:
        if (metrics.averageTimeToRegister > 48) {
          recommendations.push('邮件邀请的响应时间较长，建议添加紧迫感元素')
          recommendations.push('优化邮件标题，提高打开率')
        }
        break

      default:
        if (metrics.overallConversion < 10) {
          recommendations.push('该平台整体转化率较低，建议重新评估分享策略')
        }
    }

    if (recommendations.length === 0) {
      recommendations.push('该平台表现良好，继续保持当前策略')
    }

    return recommendations
  }
}