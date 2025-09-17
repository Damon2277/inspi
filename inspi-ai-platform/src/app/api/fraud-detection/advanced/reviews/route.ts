/**
 * 高级防作弊 - 人工审核工作流API
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
 * 获取审核案例列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const assignedTo = searchParams.get('assignedTo')

    const cases = await advancedFraudService.getReviewCases(
      status || undefined, 
      assignedTo || undefined
    )

    return NextResponse.json({
      success: true,
      data: cases,
      total: cases.length
    })

  } catch (error) {
    console.error('Failed to get review cases:', error)
    return NextResponse.json(
      { error: 'Failed to get review cases' },
      { status: 500 }
    )
  }
}

/**
 * 创建审核案例
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, caseType, priority, evidence, assignedTo } = body

    if (!userId || !caseType || !priority) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const caseId = await advancedFraudService.createReviewCase({
      userId,
      caseType,
      priority,
      status: 'pending',
      assignedTo,
      evidence: evidence || []
    })

    return NextResponse.json({
      success: true,
      data: { caseId }
    })

  } catch (error) {
    console.error('Failed to create review case:', error)
    return NextResponse.json(
      { error: 'Failed to create review case' },
      { status: 500 }
    )
  }
}