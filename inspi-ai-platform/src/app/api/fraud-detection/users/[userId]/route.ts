/**
 * 用户风险管理API路由
 * 管理特定用户的风险等级和禁止状态
 */

import { NextRequest, NextResponse } from 'next/server'
import { FraudDetectionServiceImpl } from '@/lib/invitation/services/FraudDetectionService'
import { DatabaseService } from '@/lib/invitation/database'

const db = new DatabaseService()
const fraudDetectionService = new FraudDetectionServiceImpl(db)

/**
 * 获取用户风险信息
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // 获取用户基本信息
    const userQuery = `
      SELECT id, email, created_at, registration_ip, user_agent
      FROM users 
      WHERE id = ?
    `
    const user = await db.queryOne(userQuery, [userId])

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // 获取风险等级
    const riskLevel = await fraudDetectionService.getUserRiskLevel(userId)

    // 检查是否被禁止
    const isBanned = await fraudDetectionService.isUserBanned(userId)

    // 获取风险档案详情
    const riskProfileQuery = `
      SELECT * FROM user_risk_profiles 
      WHERE user_id = ?
    `
    const riskProfile = await db.queryOne(riskProfileQuery, [userId])

    // 获取禁止记录
    const banQuery = `
      SELECT * FROM user_bans 
      WHERE user_id = ? AND is_active = 1
      ORDER BY created_at DESC
      LIMIT 1
    `
    const banRecord = await db.queryOne(banQuery, [userId])

    // 获取可疑活动统计
    const activityStatsQuery = `
      SELECT 
        type,
        severity,
        COUNT(*) as count,
        MAX(created_at) as last_occurrence
      FROM suspicious_activities 
      WHERE user_id = ?
      GROUP BY type, severity
      ORDER BY count DESC
    `
    const activityStats = await db.query(activityStatsQuery, [userId])

    // 获取设备指纹信息
    const deviceQuery = `
      SELECT fingerprint_hash, user_agent, created_at
      FROM device_fingerprints 
      WHERE user_id = ?
      ORDER BY created_at DESC
    `
    const devices = await db.query(deviceQuery, [userId])

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          createdAt: user.created_at,
          registrationIP: user.registration_ip,
          userAgent: user.user_agent
        },
        riskLevel,
        isBanned,
        riskProfile: riskProfile ? {
          reason: riskProfile.reason,
          lastSuspiciousActivity: riskProfile.last_suspicious_activity,
          suspiciousActivityCount: riskProfile.suspicious_activity_count,
          updatedAt: riskProfile.updated_at
        } : null,
        banRecord: banRecord ? {
          reason: banRecord.reason,
          banType: banRecord.ban_type,
          expiresAt: banRecord.expires_at,
          createdAt: banRecord.created_at
        } : null,
        activityStats: activityStats.map((stat: any) => ({
          type: stat.type,
          severity: stat.severity,
          count: parseInt(stat.count),
          lastOccurrence: stat.last_occurrence
        })),
        devices: devices.map((device: any) => ({
          fingerprintHash: device.fingerprint_hash,
          userAgent: device.user_agent,
          createdAt: device.created_at
        }))
      }
    })

  } catch (error) {
    console.error('Failed to get user risk info:', error)
    return NextResponse.json(
      { error: 'Failed to get user risk info' },
      { status: 500 }
    )
  }
}

/**
 * 更新用户风险等级
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params
    const body = await request.json()
    const { riskLevel, reason } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    if (!riskLevel || !['low', 'medium', 'high'].includes(riskLevel)) {
      return NextResponse.json(
        { error: 'Valid risk level is required (low, medium, high)' },
        { status: 400 }
      )
    }

    if (!reason) {
      return NextResponse.json(
        { error: 'Reason is required' },
        { status: 400 }
      )
    }

    await fraudDetectionService.updateUserRiskLevel(userId, riskLevel, reason)

    return NextResponse.json({
      success: true,
      message: 'User risk level updated successfully'
    })

  } catch (error) {
    console.error('Failed to update user risk level:', error)
    return NextResponse.json(
      { error: 'Failed to update user risk level' },
      { status: 500 }
    )
  }
}

/**
 * 禁止或解禁用户
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params
    const body = await request.json()
    const { action, reason, duration } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    if (!action || !['ban', 'unban'].includes(action)) {
      return NextResponse.json(
        { error: 'Valid action is required (ban, unban)' },
        { status: 400 }
      )
    }

    if (action === 'ban') {
      if (!reason) {
        return NextResponse.json(
          { error: 'Reason is required for banning' },
          { status: 400 }
        )
      }

      await fraudDetectionService.banUser(userId, reason, duration)

      return NextResponse.json({
        success: true,
        message: 'User banned successfully'
      })
    } else {
      // 解禁用户
      const unbanQuery = `
        UPDATE user_bans 
        SET is_active = 0, updated_at = NOW()
        WHERE user_id = ? AND is_active = 1
      `
      
      await db.execute(unbanQuery, [userId])

      // 降低风险等级
      await fraudDetectionService.updateUserRiskLevel(userId, 'low', '手动解禁')

      return NextResponse.json({
        success: true,
        message: 'User unbanned successfully'
      })
    }

  } catch (error) {
    console.error('Failed to ban/unban user:', error)
    return NextResponse.json(
      { error: 'Failed to ban/unban user' },
      { status: 500 }
    )
  }
}