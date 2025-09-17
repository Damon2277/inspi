/**
 * 邀请管理页面
 */

'use client'

import { useEffect, useState } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import InviteManagement from '@/components/admin/InviteManagement'

export default function AdminInvitesPage() {
  return (
    <AdminLayout>
      <div className=\"space-y-6\">
        <div>
          <h1 className=\"text-2xl font-bold text-gray-900\">邀请管理</h1>
          <p className=\"mt-1 text-sm text-gray-600\">
            管理和监控所有邀请码的使用情况
          </p>
        </div>
        <InviteManagement />
      </div>
    </AdminLayout>
  )
}