/**
 * 报表生成服务
 * 提供各种邀请数据报表的生成和导出功能
 */

import { DatabaseService } from '../database'
import { TimePeriod, LeaderboardEntry, SharePlatform } from '../types'

export interface ReportData {
  title: string
  generatedAt: Date
  period: TimePeriod
  summary: ReportSummary
  sections: ReportSection[]
}

export interface ReportSummary {
  totalInvites: number
  totalRegistrations: number
  totalActivations: number
  conversionRate: number
  topPerformer: {
    userId: string
    userName: string
    inviteCount: number
  }
  growthRate: number
}

export interface ReportSection {
  title: string
  type: 'table' | 'chart' | 'metric' | 'text'
  data: any
  description?: string
}

export interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'area'
  labels: string[]
  datasets: Array<{
    label: string
    data: number[]
    backgroundColor?: string
    borderColor?: string
  }>
}

export interface ReportGenerationService {
  // 生成月度邀请报告
  generateMonthlyReport(year: number, month: number): Promise<ReportData>
  
  // 生成用户个人报告
  generateUserReport(userId: string, period: TimePeriod): Promise<ReportData>
  
  // 生成平台统计报告
  generatePlatformReport(period: TimePeriod): Promise<ReportData>
  
  // 生成转化率分析报告
  generateConversionReport(period: TimePeriod): Promise<ReportData>
  
  // 导出报告为PDF
  exportReportToPDF(reportData: ReportData): Promise<Buffer>
  
  // 导出报告为Excel
  exportReportToExcel(reportData: ReportData): Promise<Buffer>
  
  // 导出数据为CSV
  exportDataToCSV(data: any[], filename: string): Promise<string>
  
  // 获取报告模板
  getReportTemplates(): Promise<Array<{
    id: string
    name: string
    description: string
    type: 'monthly' | 'user' | 'platform' | 'conversion'
  }>>
  
  // 调度自动报告生成
  scheduleAutomaticReports(): Promise<void>
}

export class ReportGenerationServiceImpl implements ReportGenerationService {
  constructor(private db: DatabaseService) {}

  /**
   * 生成月度邀请报告
   */
  async generateMonthlyReport(year: number, month: number): Promise<ReportData> {
    try {
      const startDate = new Date(year, month - 1, 1)
      const endDate = new Date(year, month, 0, 23, 59, 59)
      const period: TimePeriod = { start: startDate, end: endDate }

      // 获取基础统计数据
      const summary = await this.getReportSummary(period)
      
      // 生成各个报告部分
      const sections: ReportSection[] = []

      // 1. 邀请趋势图
      const trendData = await this.getInviteTrendData(period)
      sections.push({
        title: '邀请趋势',
        type: 'chart',
        data: {
          type: 'line',
          labels: trendData.map(d => d.date),
          datasets: [
            {
              label: '邀请数',
              data: trendData.map(d => d.invites),
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)'
            },
            {
              label: '注册数',
              data: trendData.map(d => d.registrations),
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)'
            }
          ]
        } as ChartData,
        description: '显示每日邀请和注册数量变化趋势'
      })

      // 2. 排行榜
      const leaderboard = await this.getTopPerformers(period, 10)
      sections.push({
        title: '邀请排行榜',
        type: 'table',
        data: {
          headers: ['排名', '用户名', '邀请数', '注册数', '奖励积分'],
          rows: leaderboard.map((entry, index) => [
            index + 1,
            entry.userName,
            entry.inviteCount,
            entry.inviteCount, // 简化处理
            entry.rewards.totalCredits
          ])
        },
        description: '本月邀请表现最佳的用户'
      })

      // 3. 平台分析
      const platformData = await this.getPlatformAnalysis(period)
      sections.push({
        title: '分享平台分析',
        type: 'chart',
        data: {
          type: 'pie',
          labels: platformData.map(p => p.platform),
          datasets: [{
            label: '分享次数',
            data: platformData.map(p => p.shareCount),
            backgroundColor: [
              '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'
            ]
          }]
        } as ChartData,
        description: '各分享平台的使用情况分布'
      })

      // 4. 转化率分析
      const conversionData = await this.getConversionAnalysis(period)
      sections.push({
        title: '转化率分析',
        type: 'metric',
        data: {
          metrics: [
            { label: '邀请到点击', value: `${conversionData.inviteToClick.toFixed(1)}%` },
            { label: '点击到注册', value: `${conversionData.clickToRegister.toFixed(1)}%` },
            { label: '注册到激活', value: `${conversionData.registerToActivate.toFixed(1)}%` },
            { label: '整体转化率', value: `${conversionData.overallConversion.toFixed(1)}%` }
          ]
        },
        description: '邀请流程各环节的转化率表现'
      })

      return {
        title: `${year}年${month}月邀请系统月度报告`,
        generatedAt: new Date(),
        period,
        summary,
        sections
      }
    } catch (error) {
      console.error('Failed to generate monthly report:', error)
      throw new Error('Failed to generate monthly report')
    }
  }

  /**
   * 生成用户个人报告
   */
  async generateUserReport(userId: string, period: TimePeriod): Promise<ReportData> {
    try {
      // 获取用户基本信息
      const userInfo = await this.getUserInfo(userId)
      
      // 获取用户统计数据
      const userStats = await this.getUserStats(userId, period)
      
      // 生成报告部分
      const sections: ReportSection[] = []

      // 1. 个人成就概览
      sections.push({
        title: '个人成就',
        type: 'metric',
        data: {
          metrics: [
            { label: '总邀请数', value: userStats.totalInvites.toString() },
            { label: '成功注册', value: userStats.successfulRegistrations.toString() },
            { label: '活跃用户', value: userStats.activeInvitees.toString() },
            { label: '获得奖励', value: `${userStats.totalRewardsEarned} 积分` }
          ]
        }
      })

      // 2. 邀请历史
      const inviteHistory = await this.getUserInviteHistory(userId, period)
      sections.push({
        title: '邀请历史',
        type: 'table',
        data: {
          headers: ['邀请码', '被邀请人', '注册时间', '状态'],
          rows: inviteHistory.map(h => [
            h.inviteCode,
            h.inviteeName || h.inviteeEmail || '未知',
            h.registeredAt?.toLocaleDateString() || '-',
            h.isActivated ? '已激活' : '未激活'
          ])
        }
      })

      // 3. 个人趋势
      const personalTrend = await this.getUserTrendData(userId, period)
      sections.push({
        title: '邀请趋势',
        type: 'chart',
        data: {
          type: 'area',
          labels: personalTrend.map(d => d.date),
          datasets: [{
            label: '累计邀请',
            data: personalTrend.map(d => d.cumulativeInvites),
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            borderColor: '#3b82f6'
          }]
        } as ChartData
      })

      const summary: ReportSummary = {
        totalInvites: userStats.totalInvites,
        totalRegistrations: userStats.successfulRegistrations,
        totalActivations: userStats.activeInvitees,
        conversionRate: userStats.totalInvites > 0 ? (userStats.successfulRegistrations / userStats.totalInvites) * 100 : 0,
        topPerformer: {
          userId: userInfo.id,
          userName: userInfo.name,
          inviteCount: userStats.totalInvites
        },
        growthRate: 0 // 需要计算
      }

      return {
        title: `${userInfo.name} 的邀请报告`,
        generatedAt: new Date(),
        period,
        summary,
        sections
      }
    } catch (error) {
      console.error('Failed to generate user report:', error)
      throw new Error('Failed to generate user report')
    }
  }

  /**
   * 生成平台统计报告
   */
  async generatePlatformReport(period: TimePeriod): Promise<ReportData> {
    try {
      const summary = await this.getReportSummary(period)
      const sections: ReportSection[] = []

      // 1. 平台概览
      const platformOverview = await this.getPlatformOverview(period)
      sections.push({
        title: '平台概览',
        type: 'metric',
        data: {
          metrics: [
            { label: '总用户数', value: platformOverview.totalUsers.toString() },
            { label: '活跃邀请者', value: platformOverview.activeInviters.toString() },
            { label: '平均邀请数', value: platformOverview.averageInvites.toFixed(1) },
            { label: '参与率', value: `${platformOverview.participationRate.toFixed(1)}%` }
          ]
        }
      })

      // 2. 增长趋势
      const growthTrend = await this.getGrowthTrendData(period)
      sections.push({
        title: '增长趋势',
        type: 'chart',
        data: {
          type: 'line',
          labels: growthTrend.map(d => d.date),
          datasets: [
            {
              label: '新增邀请者',
              data: growthTrend.map(d => d.newInviters),
              borderColor: '#10b981'
            },
            {
              label: '新增注册',
              data: growthTrend.map(d => d.newRegistrations),
              borderColor: '#3b82f6'
            }
          ]
        } as ChartData
      })

      // 3. 地区分布（如果有地区数据）
      const regionData = await this.getRegionDistribution(period)
      if (regionData.length > 0) {
        sections.push({
          title: '地区分布',
          type: 'chart',
          data: {
            type: 'bar',
            labels: regionData.map(r => r.region),
            datasets: [{
              label: '邀请数',
              data: regionData.map(r => r.inviteCount),
              backgroundColor: '#3b82f6'
            }]
          } as ChartData
        })
      }

      return {
        title: '平台邀请统计报告',
        generatedAt: new Date(),
        period,
        summary,
        sections
      }
    } catch (error) {
      console.error('Failed to generate platform report:', error)
      throw new Error('Failed to generate platform report')
    }
  }

  /**
   * 生成转化率分析报告
   */
  async generateConversionReport(period: TimePeriod): Promise<ReportData> {
    try {
      const summary = await this.getReportSummary(period)
      const sections: ReportSection[] = []

      // 1. 转化漏斗
      const funnelData = await this.getConversionFunnelData(period)
      sections.push({
        title: '转化漏斗',
        type: 'chart',
        data: {
          type: 'bar',
          labels: funnelData.map(f => f.step),
          datasets: [{
            label: '用户数',
            data: funnelData.map(f => f.count),
            backgroundColor: '#3b82f6'
          }]
        } as ChartData,
        description: '展示用户从邀请到激活的完整转化路径'
      })

      // 2. 平台转化率对比
      const platformConversion = await this.getPlatformConversionData(period)
      sections.push({
        title: '平台转化率对比',
        type: 'chart',
        data: {
          type: 'bar',
          labels: platformConversion.map(p => p.platform),
          datasets: [{
            label: '转化率 (%)',
            data: platformConversion.map(p => p.conversionRate),
            backgroundColor: '#10b981'
          }]
        } as ChartData
      })

      // 3. 时间段转化率
      const timeConversion = await this.getTimeBasedConversion(period)
      sections.push({
        title: '时间段转化率分析',
        type: 'table',
        data: {
          headers: ['时间段', '邀请数', '注册数', '转化率'],
          rows: timeConversion.map(t => [
            t.timeRange,
            t.invites,
            t.registrations,
            `${t.conversionRate.toFixed(1)}%`
          ])
        }
      })

      return {
        title: '邀请转化率分析报告',
        generatedAt: new Date(),
        period,
        summary,
        sections
      }
    } catch (error) {
      console.error('Failed to generate conversion report:', error)
      throw new Error('Failed to generate conversion report')
    }
  }

  /**
   * 导出报告为PDF
   */
  async exportReportToPDF(reportData: ReportData): Promise<Buffer> {
    try {
      // 这里应该使用PDF生成库（如puppeteer或jsPDF）
      // 暂时返回空Buffer
      console.log('Exporting report to PDF:', reportData.title)
      return Buffer.from('PDF content placeholder')
    } catch (error) {
      console.error('Failed to export report to PDF:', error)
      throw new Error('Failed to export report to PDF')
    }
  }

  /**
   * 导出报告为Excel
   */
  async exportReportToExcel(reportData: ReportData): Promise<Buffer> {
    try {
      // 这里应该使用Excel生成库（如exceljs）
      // 暂时返回空Buffer
      console.log('Exporting report to Excel:', reportData.title)
      return Buffer.from('Excel content placeholder')
    } catch (error) {
      console.error('Failed to export report to Excel:', error)
      throw new Error('Failed to export report to Excel')
    }
  }

  /**
   * 导出数据为CSV
   */
  async exportDataToCSV(data: any[], filename: string): Promise<string> {
    try {
      if (data.length === 0) {
        return ''
      }

      const headers = Object.keys(data[0])
      const csvContent = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header]
            // 处理包含逗号的值
            return typeof value === 'string' && value.includes(',') 
              ? `"${value}"` 
              : value
          }).join(',')
        )
      ].join('\n')

      console.log(`CSV exported: ${filename}, ${data.length} rows`)
      return csvContent
    } catch (error) {
      console.error('Failed to export data to CSV:', error)
      throw new Error('Failed to export data to CSV')
    }
  }

  /**
   * 获取报告模板
   */
  async getReportTemplates(): Promise<Array<{
    id: string
    name: string
    description: string
    type: 'monthly' | 'user' | 'platform' | 'conversion'
  }>> {
    return [
      {
        id: 'monthly',
        name: '月度邀请报告',
        description: '包含月度邀请统计、排行榜和趋势分析',
        type: 'monthly'
      },
      {
        id: 'user',
        name: '用户个人报告',
        description: '个人邀请成就和历史记录',
        type: 'user'
      },
      {
        id: 'platform',
        name: '平台统计报告',
        description: '整体平台邀请数据和增长分析',
        type: 'platform'
      },
      {
        id: 'conversion',
        name: '转化率分析报告',
        description: '详细的转化漏斗和优化建议',
        type: 'conversion'
      }
    ]
  }

  /**
   * 调度自动报告生成
   */
  async scheduleAutomaticReports(): Promise<void> {
    try {
      // 这里应该实现定时任务调度
      // 例如每月1号生成上月报告
      console.log('Automatic report generation scheduled')
    } catch (error) {
      console.error('Failed to schedule automatic reports:', error)
      throw new Error('Failed to schedule automatic reports')
    }
  }

  // 私有辅助方法

  private async getReportSummary(period: TimePeriod): Promise<ReportSummary> {
    const query = `
      SELECT 
        COUNT(DISTINCT ic.id) as total_invites,
        COUNT(DISTINCT ir.id) as total_registrations,
        COUNT(DISTINCT CASE WHEN ir.is_activated = 1 THEN ir.id END) as total_activations
      FROM invite_codes ic
      LEFT JOIN invite_registrations ir ON ic.id = ir.invite_code_id
      WHERE ic.created_at BETWEEN ? AND ?
    `

    const result = await this.db.queryOne(query, [period.start, period.end])
    
    const totalInvites = parseInt(result?.total_invites) || 0
    const totalRegistrations = parseInt(result?.total_registrations) || 0
    const totalActivations = parseInt(result?.total_activations) || 0
    const conversionRate = totalInvites > 0 ? (totalRegistrations / totalInvites) * 100 : 0

    // 获取最佳表现者
    const topPerformerQuery = `
      SELECT u.id, u.name, COUNT(DISTINCT ir.id) as invite_count
      FROM users u
      JOIN invite_codes ic ON u.id = ic.inviter_id
      LEFT JOIN invite_registrations ir ON ic.id = ir.invite_code_id
      WHERE ic.created_at BETWEEN ? AND ?
      GROUP BY u.id, u.name
      ORDER BY invite_count DESC
      LIMIT 1
    `

    const topPerformer = await this.db.queryOne(topPerformerQuery, [period.start, period.end])

    return {
      totalInvites,
      totalRegistrations,
      totalActivations,
      conversionRate,
      topPerformer: {
        userId: topPerformer?.id || '',
        userName: topPerformer?.name || '无',
        inviteCount: parseInt(topPerformer?.invite_count) || 0
      },
      growthRate: 0 // 需要与上期对比计算
    }
  }

  private async getInviteTrendData(period: TimePeriod): Promise<Array<{
    date: string
    invites: number
    registrations: number
  }>> {
    const query = `
      SELECT 
        DATE(ic.created_at) as date,
        COUNT(DISTINCT ic.id) as invites,
        COUNT(DISTINCT ir.id) as registrations
      FROM invite_codes ic
      LEFT JOIN invite_registrations ir ON ic.id = ir.invite_code_id AND DATE(ir.registered_at) = DATE(ic.created_at)
      WHERE ic.created_at BETWEEN ? AND ?
      GROUP BY DATE(ic.created_at)
      ORDER BY date
    `

    const results = await this.db.query(query, [period.start, period.end])
    
    return results.map((row: any) => ({
      date: row.date,
      invites: parseInt(row.invites) || 0,
      registrations: parseInt(row.registrations) || 0
    }))
  }

  private async getTopPerformers(period: TimePeriod, limit: number): Promise<LeaderboardEntry[]> {
    const query = `
      SELECT 
        u.id as user_id,
        u.name as user_name,
        COUNT(DISTINCT ir.id) as invite_count,
        SUM(CASE WHEN r.type = 'ai_credits' THEN r.amount ELSE 0 END) as total_credits
      FROM users u
      JOIN invite_codes ic ON u.id = ic.inviter_id
      LEFT JOIN invite_registrations ir ON ic.id = ir.invite_code_id
      LEFT JOIN rewards r ON u.id = r.user_id
      WHERE ic.created_at BETWEEN ? AND ?
      GROUP BY u.id, u.name
      ORDER BY invite_count DESC
      LIMIT ?
    `

    const results = await this.db.query(query, [period.start, period.end, limit])
    
    return results.map((row: any, index: number) => ({
      userId: row.user_id,
      userName: row.user_name,
      inviteCount: parseInt(row.invite_count) || 0,
      rank: index + 1,
      rewards: {
        totalCredits: parseInt(row.total_credits) || 0,
        badges: [],
        titles: [],
        premiumDays: 0
      }
    }))
  }

  // 其他私有方法的占位实现
  private async getPlatformAnalysis(period: TimePeriod): Promise<Array<{ platform: string; shareCount: number }>> {
    return [
      { platform: '微信', shareCount: 45 },
      { platform: 'QQ', shareCount: 23 },
      { platform: '邮件', shareCount: 18 },
      { platform: '链接', shareCount: 14 }
    ]
  }

  private async getConversionAnalysis(period: TimePeriod): Promise<{
    inviteToClick: number
    clickToRegister: number
    registerToActivate: number
    overallConversion: number
  }> {
    return {
      inviteToClick: 25.5,
      clickToRegister: 35.2,
      registerToActivate: 68.7,
      overallConversion: 15.8
    }
  }

  private async getUserInfo(userId: string): Promise<{ id: string; name: string; email: string }> {
    const query = 'SELECT id, name, email FROM users WHERE id = ?'
    const result = await this.db.queryOne(query, [userId])
    return result || { id: userId, name: '未知用户', email: '' }
  }

  private async getUserStats(userId: string, period: TimePeriod): Promise<{
    totalInvites: number
    successfulRegistrations: number
    activeInvitees: number
    totalRewardsEarned: number
  }> {
    const query = `
      SELECT 
        COUNT(DISTINCT ic.id) as total_invites,
        COUNT(DISTINCT ir.id) as successful_registrations,
        COUNT(DISTINCT CASE WHEN ir.is_activated = 1 THEN ir.id END) as active_invitees,
        COALESCE(SUM(CASE WHEN r.type = 'ai_credits' THEN r.amount ELSE 0 END), 0) as total_rewards_earned
      FROM invite_codes ic
      LEFT JOIN invite_registrations ir ON ic.id = ir.invite_code_id
      LEFT JOIN rewards r ON ? = r.user_id
      WHERE ic.inviter_id = ? AND ic.created_at BETWEEN ? AND ?
    `

    const result = await this.db.queryOne(query, [userId, userId, period.start, period.end])
    
    return {
      totalInvites: parseInt(result?.total_invites) || 0,
      successfulRegistrations: parseInt(result?.successful_registrations) || 0,
      activeInvitees: parseInt(result?.active_invitees) || 0,
      totalRewardsEarned: parseInt(result?.total_rewards_earned) || 0
    }
  }

  // 其他辅助方法的简化实现
  private async getUserInviteHistory(userId: string, period: TimePeriod): Promise<any[]> { return [] }
  private async getUserTrendData(userId: string, period: TimePeriod): Promise<any[]> { return [] }
  private async getPlatformOverview(period: TimePeriod): Promise<any> { return {} }
  private async getGrowthTrendData(period: TimePeriod): Promise<any[]> { return [] }
  private async getRegionDistribution(period: TimePeriod): Promise<any[]> { return [] }
  private async getConversionFunnelData(period: TimePeriod): Promise<any[]> { return [] }
  private async getPlatformConversionData(period: TimePeriod): Promise<any[]> { return [] }
  private async getTimeBasedConversion(period: TimePeriod): Promise<any[]> { return [] }
}