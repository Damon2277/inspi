/**
 * 管理后台主页面
 */

'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import AdminDashboard from '@/components/admin/AdminDashboard'
import AdminLayout from '@/components/admin/AdminLayout'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/auth/signin?callbackUrl=/admin')
      return
    }

    // 检查管理员权限
    checkAdminAccess()
  }, [session, status, router])

  const checkAdminAccess = async () => {
    try {
      const response = await fetch('/api/admin/dashboard')
      
      if (response.ok) {
        setIsAuthorized(true)
      } else if (response.status === 401) {
        router.push('/auth/signin?callbackUrl=/admin')
      } else if (response.status === 403) {
        router.push('/unauthorized')
      } else {
        console.error('Failed to check admin access')
        router.push('/')
      }
    } catch (error) {
      console.error('Admin access check error:', error)
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  if (loading || status === 'loading') {
    return (
      <div className=\"min-h-screen flex items-center justify-center\">
        <LoadingSpinner size=\"lg\" />
      </div>
    )
  }

  if (!isAuthorized) {
    return (
      <div className=\"min-h-screen flex items-center justify-center\">
        <div className=\"text-center\">
          <h1 className=\"text-2xl font-bold text-gray-900 mb-4\">访问被拒绝</h1>
          <p className=\"text-gray-600\">您没有访问管理后台的权限</p>
        </div>
      </div>
    )
  }

  return (
    <AdminLayout>
      <AdminDashboard />
    </AdminLayout>
  )
}