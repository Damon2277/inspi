/**
 * 系统健康检查API
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth, ADMIN_PERMISSIONS } from '@/lib/invitation/middleware/AdminAuthMiddleware'
import { AdminServiceImpl } from '@/lib/invitation/services/AdminService'
import { DatabaseService } from '@/lib/invitation/database'

const db = new DatabaseService()
const adminService = new AdminServiceImpl(db)

export const GET = withAdminAuth(
  async (request: NextRequest, context) => {
    try {
      const systemHealth = await adminService.getSystemHealth()
      
      return NextResponse.json({
        success: true,
        data: systemHealth
      })
    } catch (error) {
      console.error('System health API error:', error)
      return NextResponse.json(
        { error: 'Failed to get system health' },
        { status: 500 }
      )
    }
  },
  [ADMIN_PERMISSIONS.SYSTEM_LOGS]
)