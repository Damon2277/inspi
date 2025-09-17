/**
 * 通知统计API路由
 */

import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/invitation/database'

const db = new DatabaseService()

/**
 * 获取用户通知统计数据
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const period = parseInt(searchParams.get('period') || '30')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // 计算时间范围
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - period)

    // 获取统计数据
    const stats = await getNotificationStats(userId, startDate, endDate)

    return NextResponse.json({
      success: true,
      data: stats
    })

  } catch (error) {
    console.error('Failed to get notification stats:', error)
    return NextResponse.json(
      { error: 'Failed to get notification stats' },
      { status: 500 }
    )
  }
}

/**
 * 获取通知统计数据的实现
 */
async function getNotificationStats(userId: string, startDate: Date, endDate: Date) {
  try {
    // 基础统计
    const totalQuery = `
      SELECT COUNT(*) as total
      FROM notifications 
      WHERE user_id = ? AND created_at BETWEEN ? AND ?
    `
    const totalResult = await db.queryOne(totalQuery, [userId, startDate, endDate])
    const totalNotifications = parseInt(totalResult?.total) || 0

    const unreadQuery = `
      SELECT COUNT(*) as unread
      FROM notifications 
      WHERE user_id = ? AND status != 'read' AND created_at BETWEEN ? AND ?
    `
    const unreadResult = await db.queryOne(unreadQuery, [userId, startDate, endDate])
    const unreadCount = parseInt(unreadResult?.unread) || 0

    const readCount = totalNotifications - unreadCount
    const readRate = totalNotifications > 0 ? readCount / totalNotifications : 0

    // 渠道统计
    const channelQuery = `
      SELECT 
        channel,
        COUNT(*) as count,
        SUM(CASE WHEN status = 'read' THEN 1 ELSE 0 END) as read_count
      FROM notifications 
      WHERE user_id = ? AND created_at BETWEEN ? AND ?
      GROUP BY channel
      ORDER BY count DESC
    `
    const channelResults = await db.query(channelQuery, [userId, startDate, endDate])
    const channelStats = channelResults.map((row: any) => ({
      channel: row.channel,
      count: parseInt(row.count),
      readRate: row.count > 0 ? parseInt(row.read_count) / parseInt(row.count) : 0
    }))

    // 类型统计
    const typeQuery = `
      SELECT 
        type,
        COUNT(*) as count,
        SUM(CASE WHEN status = 'read' THEN 1 ELSE 0 END) as read_count
      FROM notifications 
      WHERE user_id = ? AND created_at BETWEEN ? AND ?
      GROUP BY type
      ORDER BY count DESC
    `
    const typeResults = await db.query(typeQuery, [userId, startDate, endDate])
    const typeStats = typeResults.map((row: any) => ({
      type: row.type,
      count: parseInt(row.count),
      readRate: row.count > 0 ? parseInt(row.read_count) / parseInt(row.count) : 0
    }))

    // 每日统计
    const dailyQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as sent,
        SUM(CASE WHEN status = 'read' THEN 1 ELSE 0 END) as read_count
      FROM notifications 
      WHERE user_id = ? AND created_at BETWEEN ? AND ?
      GROUP BY DATE(created_at)
      ORDER BY date
    `
    const dailyResults = await db.query(dailyQuery, [userId, startDate, endDate])
    const dailyStats = dailyResults.map((row: any) => ({
      date: row.date,
      sent: parseInt(row.sent),
      read: parseInt(row.read_count)
    }))

    // 平均阅读时间（分钟）
    const readTimeQuery = `
      SELECT AVG(TIMESTAMPDIFF(MINUTE, created_at, read_at)) as avg_read_time
      FROM notifications 
      WHERE user_id = ? AND status = 'read' AND read_at IS NOT NULL 
        AND created_at BETWEEN ? AND ?
    `
    const readTimeResult = await db.queryOne(readTimeQuery, [userId, startDate, endDate])
    const averageReadTime = parseFloat(readTimeResult?.avg_read_time) || 0

    // 活跃时段分析
    const peakHoursQuery = `
      SELECT 
        HOUR(read_at) as hour,
        COUNT(*) as count
      FROM notifications 
      WHERE user_id = ? AND status = 'read' AND read_at IS NOT NULL
        AND created_at BETWEEN ? AND ?
      GROUP BY HOUR(read_at)
      ORDER BY count DESC
      LIMIT 3
    `
    const peakHoursResults = await db.query(peakHoursQuery, [userId, startDate, endDate])
    const peakHours = peakHoursResults.map((row: any) => parseInt(row.hour))

    return {
      totalNotifications,
      unreadCount,
      readCount,
      readRate,
      channelStats,
      typeStats,
      dailyStats,
      averageReadTime,
      peakHours
    }
  } catch (error) {
    console.error('Failed to calculate notification stats:', error)
    throw new Error('Failed to calculate notification stats')
  }
}