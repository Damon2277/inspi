/**
 * 防作弊检测API路由
 * 提供实时的防作弊检测服务
 */

import { NextRequest, NextResponse } from 'next/server'
import { FraudDetectionServiceImpl } from '@/lib/invitation/services/FraudDetectionService'
import { DeviceFingerprintGenerator } from '@/lib/invitation/utils/deviceFingerprint'
import { DatabaseService } from '@/lib/invitation/database'

const db = new DatabaseService()
const fraudDetectionService = new FraudDetectionServiceImpl(db)

/**
 * 检测注册风险
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      email, 
      inviteCode, 
      deviceInfo, 
      checkType = 'registration' 
    } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // 获取请求信息
    const ip = getClientIP(request)
    const userAgent = request.headers.get('user-agent') || ''
    
    // 生成设备指纹
    const deviceFingerprint = deviceInfo 
      ? DeviceFingerprintGenerator.generateFingerprint(deviceInfo)
      : DeviceFingerprintGenerator.generateFromHeaders(Object.fromEntries(request.headers.entries()))

    let result

    if (checkType === 'registration') {
      // 注册风险检测
      const attempt = {
        ip,
        userAgent,
        email,
        inviteCode,
        deviceFingerprint,
        timestamp: new Date()
      }

      // 获取邀请人ID
      let inviterId: string | undefined
      if (inviteCode) {
        inviterId = await getInviterIdByCode(inviteCode)
      }

      result = await fraudDetectionService.assessRegistrationRisk(attempt, inviterId)
    } else if (checkType === 'invitation') {
      // 邀请风险检测
      const { inviterId, inviteeEmail } = body
      
      if (!inviterId || !inviteeEmail) {
        return NextResponse.json(
          { error: 'Inviter ID and invitee email are required for invitation check' },
          { status: 400 }
        )
      }

      result = await fraudDetectionService.checkSelfInvitation(inviterId, inviteeEmail, ip)
    } else {
      return NextResponse.json(
        { error: 'Invalid check type' },
        { status: 400 }
      )
    }

    // 返回检测结果
    return NextResponse.json({
      success: true,
      allowed: result.isValid,
      riskLevel: result.riskLevel,
      reasons: result.reasons,
      actions: result.actions.map(action => ({
        type: action.type,
        description: action.description,
        duration: action.duration
      })),
      requiresReview: result.actions.some(action => action.type === 'review') || result.riskLevel === 'high',
      metadata: {
        ip,
        userAgent,
        deviceFingerprint: deviceFingerprint.hash,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Fraud detection API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        success: false,
        allowed: true, // 出错时默认允许
        riskLevel: 'low',
        reasons: ['检测系统暂时不可用'],
        actions: [],
        requiresReview: false
      },
      { status: 500 }
    )
  }
}

/**
 * 获取防作弊规则配置
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ruleType = searchParams.get('type')

    let query = 'SELECT * FROM fraud_detection_rules WHERE is_enabled = 1'
    const params: any[] = []

    if (ruleType) {
      query += ' AND rule_type = ?'
      params.push(ruleType)
    }

    query += ' ORDER BY rule_type, rule_name'

    const rules = await db.query(query, params)

    return NextResponse.json({
      success: true,
      rules: rules.map((rule: any) => ({
        id: rule.id,
        name: rule.rule_name,
        type: rule.rule_type,
        isEnabled: rule.is_enabled,
        threshold: rule.threshold_value,
        timeWindow: rule.time_window_minutes,
        action: rule.action_type,
        severity: rule.severity,
        description: rule.description
      }))
    })

  } catch (error) {
    console.error('Failed to get fraud detection rules:', error)
    return NextResponse.json(
      { error: 'Failed to get fraud detection rules' },
      { status: 500 }
    )
  }
}

// 辅助函数

/**
 * 获取客户端真实IP
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfIP = request.headers.get('cf-connecting-ip')

  if (cfIP) return cfIP
  if (realIP) return realIP
  if (forwarded) return forwarded.split(',')[0].trim()
  
  return request.ip || '127.0.0.1'
}

/**
 * 根据邀请码获取邀请人ID
 */
async function getInviterIdByCode(inviteCode: string): Promise<string | undefined> {
  try {
    const query = `
      SELECT inviter_id 
      FROM invite_codes 
      WHERE code = ? AND is_active = 1
    `
    
    const result = await db.queryOne(query, [inviteCode])
    return result?.inviter_id
  } catch (error) {
    console.error('Failed to get inviter ID:', error)
    return undefined
  }
}