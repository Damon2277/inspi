/**
 * 高级防作弊 - 账户管理API
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
 * 获取账户状态
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params

    const accountStatus = await advancedFraudService.getAccountStatus(userId)

    return NextResponse.json({
      success: true,
      data: accountStatus
    })

  } catch (error) {
    console.error('Failed to get account status:', error)
    return NextResponse.json(
      { error: 'Failed to get account status' },
      { status: 500 }
    )
  }
}

/**
 * 冻结账户
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params
    const body = await request.json()
    const { reason, createdBy } = body

    if (!reason || !createdBy) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    await advancedFraudService.freezeAccount(userId, reason, createdBy)

    return NextResponse.json({
      success: true,
      message: 'Account frozen successfully'
    })

  } catch (error) {
    console.error('Failed to freeze account:', error)
    return NextResponse.json(
      { error: 'Failed to freeze account' },
      { status: 500 }
    )
  }
}