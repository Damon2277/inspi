/**
 * 可疑活动管理API路由
 * 用于查询和管理可疑活动记录
 */

import { NextRequest, NextResponse } from 'next/server'
import { FraudDetectionServiceImpl } from '@/lib/invitation/services/FraudDetectionService'
import { DatabaseService } from '@/lib/invitation/database'

const db = new DatabaseService()
const fraudDetectionService = new FraudDetectionServiceImpl(db)

/**
 * 获取可疑活动列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const severity = searchParams.get('severity')
    const type = searchParams.get('type')
    const ip = searchParams.get('ip')
    const userId = searchParams.get('userId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const offset = (page - 1) * limit

    // 构建查询条件
    let whereConditions = []
    let params: any[] = []

    if (severity) {
      whereConditions.push('severity = ?')
      params.push(severity)
    }

    if (type) {
      whereConditions.push('type = ?')
      params.push(type)
    }

    if (ip) {
      whereConditions.push('ip = ?')
      params.push(ip)
    }

    if (userId) {
      whereConditions.push('user_id = ?')
      params.push(userId)
    }

    if (startDate) {
      whereConditions.push('created_at >= ?')
      params.push(startDate)
    }

    if (endDate) {
      whereConditions.push('created_at <= ?')
      params.push(endDate)
    }

    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : ''

    // 获取总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM suspicious_activities
      ${whereClause}
    `
    const countResult = await db.queryOne(countQuery, params)
    const total = parseInt(countResult?.total) || 0

    // 获取活动列表
    const query = `
      SELECT sa.*, u.email as user_email
      FROM suspicious_activities sa
      LEFT JOIN users u ON sa.user_id = u.id
      ${whereClause}
      ORDER BY sa.created_at DESC
      LIMIT ? OFFSET ?
    `
    
    const activities = await db.query(query, [...params, limit, offset])

    return NextResponse.json({
      success: true,
      data: {
        activities: activities.map((activity: any) => ({
          id: activity.id,
          userId: activity.user_id,
          userEmail: activity.user_email,
          ip: activity.ip,
          type: activity.type,
          description: activity.description,
          severity: activity.severity,
          metadata: activity.metadata ? JSON.parse(activity.metadata) : null,
          createdAt: activity.created_at
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    })

  } catch (error) {
    console.error('Failed to get suspicious activities:', error)
    return NextResponse.json(
      { error: 'Failed to get suspicious activities' },
      { status: 500 }
    )
  }
}

/**
 * 记录可疑活动
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, ip, type, description, severity, metadata } = body

    if (!ip || !type || !description) {
      return NextResponse.json(
        { error: 'IP, type, and description are required' },
        { status: 400 }
      )
    }

    await fraudDetectionService.recordSuspiciousActivity({
      userId,
      ip,
      type,
      description,
      severity: severity || 'medium',
      metadata,
      timestamp: new Date()
    })

    return NextResponse.json({
      success: true,
      message: 'Suspicious activity recorded successfully'
    })

  } catch (error) {
    console.error('Failed to record suspicious activity:', error)
    return NextResponse.json(
      { error: 'Failed to record suspicious activity' },
      { status: 500 }
    )
  }
}