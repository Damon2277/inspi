/**
 * 监控仪表板API
 * 提供监控数据给前端仪表板使用
 */

import { NextRequest, NextResponse } from 'next/server'
import { BusinessMetricsCollector } from '@/lib/invitation/monitoring/BusinessMetricsCollector'
import { AlertManager } from '@/lib/invitation/monitoring/AlertManager'
import { PerformanceMonitor } from '@/lib/invitation/monitoring/PerformanceMonitor'
import { DatabasePool } from '@/lib/invitation/database'
import { logger } from '@/lib/utils/logger'

// 模拟数据库连接
const db = {} as DatabasePool

// 初始化监控组件
const metricsCollector = new BusinessMetricsCollector(db)
const alertManager = new AlertManager(db)
const performanceMonitor = new PerformanceMonitor({
  metricsRetentionDays: 7,
  alertCheckInterval: 30000,
  healthCheckInterval: 15000,
  enableAutoScaling: false,
  enableAlerting: true,
  maxMetricsInMemory: 1000
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'overview'
    const timeRange = searchParams.get('timeRange') || '1h'
    
    switch (type) {
      case 'overview':
        return await getOverviewData(timeRange)
      case 'business':
        return await getBusinessMetrics(timeRange)
      case 'system':
        return await getSystemMetrics(timeRange)
      case 'alerts':
        return await getAlertsData()
      case 'performance':
        return await getPerformanceData(timeRange)
      default:
        return NextResponse.json({ error: 'Invalid dashboard type' }, { status: 400 })
    }
  } catch (error) {
    logger.error('Dashboard API error', { error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * 获取概览数据
 */
async function getOverviewData(timeRange: string) {
  const [businessMetrics, systemHealth, alertStats] = await Promise.all([
    metricsCollector.getRealTimeMetrics(),
    performanceMonitor.getSystemHealth(),
    alertManager.getAlertStats()
  ])
  
  const overview = {
    // 关键业务指标
    keyMetrics: {
      totalUsers: businessMetrics.invitation.activeUsers,
      totalInvitations: businessMetrics.invitation.totalInviteCodes,
      conversionRate: businessMetrics.invitation.conversionRate,
      rewardsDistributed: businessMetrics.invitation.totalRewardsDistributed
    },
    
    // 系统健康状况
    systemHealth: {
      status: systemHealth.status,
      uptime: systemHealth.uptime,
      responseTime: systemHealth.responseTime.avg,
      errorRate: (100 - businessMetrics.systemHealth.successRate).toFixed(2)
    },
    
    // 告警概况
    alerts: {
      total: alertStats.total,
      critical: alertStats.bySeverity.critical || 0,
      active: alertStats.active,
      resolved: alertStats.resolved
    },
    
    // 资源使用情况
    resources: {
      cpu: businessMetrics.systemHealth.cpuUsage,
      memory: businessMetrics.systemHealth.memoryUsage,
      disk: businessMetrics.systemHealth.diskUsage
    },
    
    // 趋势数据
    trends: {
      userGrowth: await calculateGrowthRate('users', timeRange),
      invitationGrowth: await calculateGrowthRate('invitations', timeRange),
      revenueGrowth: await calculateGrowthRate('revenue', timeRange)
    }
  }
  
  return NextResponse.json(overview)
}

/**
 * 获取业务指标数据
 */
async function getBusinessMetrics(timeRange: string) {
  const metrics = await metricsCollector.getRealTimeMetrics()
  
  const businessData = {
    // 邀请系统指标
    invitation: {
      codes: {
        total: metrics.invitation.totalInviteCodes,
        active: metrics.invitation.activeInviteCodes,
        used: metrics.invitation.usedInviteCodes,
        expired: metrics.invitation.expiredInviteCodes
      },
      registrations: {
        total: metrics.invitation.totalRegistrations,
        today: metrics.invitation.todayRegistrations,
        conversionRate: metrics.invitation.conversionRate
      },
      users: {
        active: metrics.invitation.activeUsers,
        new: metrics.invitation.newUsers,
        returning: metrics.invitation.returningUsers
      }
    },
    
    // 奖励系统指标
    rewards: {
      distributed: metrics.invitation.totalRewardsDistributed,
      pending: metrics.invitation.pendingRewards,
      totalValue: metrics.invitation.rewardValue
    },
    
    // 安全指标
    security: {
      fraudDetections: metrics.invitation.fraudDetections,
      blockedUsers: metrics.invitation.blockedUsers,
      suspiciousActivities: metrics.invitation.suspiciousActivities
    },
    
    // 自定义业务指标
    custom: metrics.custom,
    
    // 趋势图数据
    trends: await Promise.all([
      metricsCollector.getMetricsTrend('invitation_codes_generated', parseTimeRange(timeRange)),
      metricsCollector.getMetricsTrend('invitation_registrations', parseTimeRange(timeRange)),
      metricsCollector.getMetricsTrend('rewards_distributed', parseTimeRange(timeRange))
    ])
  }
  
  return NextResponse.json(businessData)
}

/**
 * 获取系统指标数据
 */
async function getSystemMetrics(timeRange: string) {
  const [systemHealth, performanceReport] = await Promise.all([
    performanceMonitor.getSystemHealth(),
    performanceMonitor.generatePerformanceReport()
  ])
  
  const systemData = {
    // 系统健康状况
    health: systemHealth,
    
    // 性能报告
    performance: performanceReport,
    
    // 资源使用趋势
    resourceTrends: await Promise.all([
      performanceMonitor.getMetricStats('nodejs_process_cpu_usage_percent'),
      performanceMonitor.getMetricStats('nodejs_memory_heap_used_bytes'),
      performanceMonitor.getMetricStats('api_response_time')
    ]),
    
    // 数据库指标
    database: {
      connections: systemHealth.databaseConnections,
      queryTime: performanceReport.keyMetrics.databaseQueryTime
    },
    
    // 缓存指标
    cache: {
      hitRate: performanceReport.keyMetrics.cacheHitRate || 0,
      size: 0 // 应该从实际缓存系统获取
    }
  }
  
  return NextResponse.json(systemData)
}

/**
 * 获取告警数据
 */
async function getAlertsData() {
  const [alertStats, activeAlerts, recentAlerts] = await Promise.all([
    alertManager.getAlertStats(),
    alertManager.getAlerts({ status: 'active', limit: 20 }),
    alertManager.getAlerts({ limit: 50 })
  ])
  
  const alertsData = {
    // 告警统计
    stats: alertStats,
    
    // 活跃告警
    active: activeAlerts,
    
    // 最近告警
    recent: recentAlerts,
    
    // 告警趋势
    trends: {
      hourly: generateAlertTrend('hourly'),
      daily: generateAlertTrend('daily')
    },
    
    // 告警分布
    distribution: {
      bySeverity: alertStats.bySeverity,
      byCategory: alertStats.byCategory,
      byStatus: alertStats.byStatus
    }
  }
  
  return NextResponse.json(alertsData)
}

/**
 * 获取性能数据
 */
async function getPerformanceData(timeRange: string) {
  const performanceReport = performanceMonitor.generatePerformanceReport()
  
  const performanceData = {
    // 当前性能指标
    current: performanceReport,
    
    // 性能趋势
    trends: await Promise.all([
      performanceMonitor.getMetricStats('api_response_time'),
      performanceMonitor.getMetricStats('nodejs_process_cpu_usage_percent'),
      performanceMonitor.getMetricStats('nodejs_memory_heap_used_bytes')
    ]),
    
    // 性能建议
    recommendations: performanceReport.recommendations,
    
    // 瓶颈分析
    bottlenecks: await analyzePerformanceBottlenecks()
  }
  
  return NextResponse.json(performanceData)
}

/**
 * 计算增长率
 */
async function calculateGrowthRate(metric: string, timeRange: string): Promise<{
  current: number
  previous: number
  growthRate: number
  trend: 'up' | 'down' | 'stable'
}> {
  // 这里应该从实际数据源计算增长率
  // 为了演示，返回模拟数据
  const current = Math.random() * 1000 + 500
  const previous = Math.random() * 1000 + 400
  const growthRate = ((current - previous) / previous) * 100
  
  let trend: 'up' | 'down' | 'stable' = 'stable'
  if (growthRate > 5) trend = 'up'
  else if (growthRate < -5) trend = 'down'
  
  return { current, previous, growthRate, trend }
}

/**
 * 解析时间范围
 */
function parseTimeRange(timeRange: string): number {
  const ranges: Record<string, number> = {
    '1h': 1,
    '6h': 6,
    '24h': 24,
    '7d': 24 * 7,
    '30d': 24 * 30
  }
  
  return ranges[timeRange] || 24
}

/**
 * 生成告警趋势数据
 */
function generateAlertTrend(period: 'hourly' | 'daily'): Array<{
  timestamp: string
  count: number
  severity: Record<string, number>
}> {
  const points = period === 'hourly' ? 24 : 7
  const trend = []
  
  for (let i = 0; i < points; i++) {
    const timestamp = new Date(Date.now() - (points - i - 1) * (period === 'hourly' ? 3600000 : 86400000))
    trend.push({
      timestamp: timestamp.toISOString(),
      count: Math.floor(Math.random() * 10),
      severity: {
        low: Math.floor(Math.random() * 3),
        medium: Math.floor(Math.random() * 4),
        high: Math.floor(Math.random() * 2),
        critical: Math.floor(Math.random() * 1)
      }
    })
  }
  
  return trend
}

/**
 * 分析性能瓶颈
 */
async function analyzePerformanceBottlenecks(): Promise<Array<{
  component: string
  issue: string
  impact: 'low' | 'medium' | 'high'
  recommendation: string
}>> {
  // 这里应该实现实际的瓶颈分析逻辑
  // 为了演示，返回模拟数据
  return [
    {
      component: 'Database',
      issue: '慢查询检测到多个未优化的查询',
      impact: 'high',
      recommendation: '添加适当的索引并优化查询语句'
    },
    {
      component: 'Cache',
      issue: '缓存命中率低于预期',
      impact: 'medium',
      recommendation: '调整缓存策略和TTL设置'
    },
    {
      component: 'API',
      issue: '某些API端点响应时间较长',
      impact: 'medium',
      recommendation: '实现API响应缓存和优化业务逻辑'
    }
  ]
}