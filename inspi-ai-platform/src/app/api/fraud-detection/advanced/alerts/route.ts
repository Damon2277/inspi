/**
 * 高级防作弊 - 异常告警管理API
 */

import { NextRequest, NextResponse } from 'next/server'
import { AdvancedFraudDetectionServiceImplComplete } from '@/lib/invitation/services/AdvancedFraudDetectionService'
import { FraudDetectionServiceImpl } from '@/lib/invitation/services/FraudDetectionService'
import { NotificationServiceImpl } from '@/lib/invitation/services/NotificationService'
import { DatabaseService } from '@/lib/invitation/database'

const db = new DatabaseService()
const basicFraudService = new FraudDetectionServiceImpl(db)
const notificationService = new NotificationServiceImpl(db)
const advancedFraudService = new AdvancedFraudDetectionServiceImplComplete(db, basicFraudService, notificationService)

/**
 * 获取异常告警列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const severity = searchParams.get('severity')
    const limit = parseInt(searchParams.get('limit') || '50')

    const alerts = await advancedFraudService.getActiveAlerts(severity || undefined, limit)

    return NextResponse.json({
      success: true,
      data: alerts,
      total: alerts.length
    })

  } catch (error) {
    console.error('Failed to get alerts:', error)
    return NextResponse.json(
      { error: 'Failed to get alerts' },
      { status: 500 }
    )
  }
}

/**
 * 创建异常告警
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, alertType, severity, description, evidence } = body

    if (!userId || !alertType || !severity || !description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const alertId = await advancedFraudService.createAnomalyAlert({
      userId,
      alertType,
      severity,
      description,
      evidence: evidence || {},
      status: 'pending'
    })

    return NextResponse.json({
      success: true,
      data: { alertId }
    })

  } catch (error) {
    console.error('Failed to create alert:', error)
    return NextResponse.json(
      { error: 'Failed to create alert' },
      { status: 500 }
    )
  }
}