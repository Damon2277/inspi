/**
 * 数据导出API
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
      if (!context.hasPermission(ADMIN_PERMISSIONS.STATS_EXPORT)) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        )
      }

      const { searchParams } = new URL(request.url)
      const type = searchParams.get('type') // 'invites', 'users', 'rewards'
      const filters = {
        startDate: searchParams.get('startDate'),
        endDate: searchParams.get('endDate'),
        status: searchParams.get('status'),
        userId: searchParams.get('userId')
      }

      let csvData: string
      let filename: string

      switch (type) {
        case 'invites':
          csvData = await adminService.exportInviteData(filters)
          filename = `invites_export_${new Date().toISOString().split('T')[0]}.csv`
          break
        case 'users':
          csvData = await adminService.exportUserData(filters)
          filename = `users_export_${new Date().toISOString().split('T')[0]}.csv`
          break
        case 'rewards':
          csvData = await adminService.exportRewardData(filters)
          filename = `rewards_export_${new Date().toISOString().split('T')[0]}.csv`
          break
        default:
          return NextResponse.json(
            { error: 'Invalid export type. Must be one of: invites, users, rewards' },
            { status: 400 }
          )
      }

      // 设置CSV下载响应头
      const response = new NextResponse(csvData, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-cache'
        }
      })

      return response
    } catch (error) {
      console.error('Export API error:', error)
      return NextResponse.json(
        { error: 'Failed to export data' },
        { status: 500 }
      )
    }
  },
  [ADMIN_PERMISSIONS.STATS_EXPORT]
)