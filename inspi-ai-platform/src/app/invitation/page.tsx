/**
 * 邀请管理页面
 * 提供邀请码生成、分享、统计等功能
 * 自动适配桌面端和移动端
 */

'use client'

import React, { useState } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useResponsive } from '@/hooks/useResponsive'
import InvitationManagement from '@/components/invitation/InvitationManagement'
import InvitationStats from '@/components/invitation/InvitationStats'
import MobileInvitationManagement from '@/components/invitation/MobileInvitationManagement'
import MobileInvitationStats from '@/components/invitation/MobileInvitationStats'
import { Users, BarChart3 } from 'lucide-react'

export default function InvitationPage() {
  const { data: session, status } = useSession()
  const [activeTab, setActiveTab] = useState('management')
  const { isMobile, isTablet } = useResponsive()

  if (status === 'loading') {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    redirect('/auth/signin')
  }

  const userId = (session?.user as any)?.id || ''

  // 移动端使用专门的移动端组件
  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          {/* 移动端标签导航 */}
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 pt-4">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="management" className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4" />
                邀请管理
              </TabsTrigger>
              <TabsTrigger value="statistics" className="flex items-center gap-2 text-sm">
                <BarChart3 className="h-4 w-4" />
                统计分析
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="management" className="mt-0">
            <MobileInvitationManagement userId={userId} />
          </TabsContent>

          <TabsContent value="statistics" className="mt-0">
            <MobileInvitationStats userId={userId} />
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  // 桌面端和平板端使用原有组件
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">邀请系统</h1>
        <p className="text-gray-600">管理您的邀请码，查看邀请统计，获得更多奖励</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="management" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            邀请管理
          </TabsTrigger>
          <TabsTrigger value="statistics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            统计分析
          </TabsTrigger>
        </TabsList>

        <TabsContent value="management">
          <InvitationManagement userId={userId} />
        </TabsContent>

        <TabsContent value="statistics">
          <InvitationStats userId={userId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}