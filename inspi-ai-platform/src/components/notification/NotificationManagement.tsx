/**
 * 通知管理组件
 * 集成通知偏好设置和通知历史记录
 */

'use client'

import React, { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Bell, Settings, History, BarChart3 } from 'lucide-react'
import NotificationPreferences from './NotificationPreferences'
import NotificationHistory from './NotificationHistory'
import NotificationStats from './NotificationStats'

interface NotificationManagementProps {
  userId: string
}

export default function NotificationManagement({ userId }: NotificationManagementProps) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [activeTab, setActiveTab] = useState('preferences')

  const handleNotificationRead = (notificationId: string) => {
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const handlePreferencesChange = () => {
    // 可以在这里处理偏好设置变更的逻辑
    console.log('Notification preferences updated')
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-6 w-6" />
            通知管理
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount} 条未读
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="preferences" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                通知设置
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                通知历史
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-1 text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="stats" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                统计分析
              </TabsTrigger>
            </TabsList>

            <TabsContent value="preferences" className="mt-6">
              <NotificationPreferences
                userId={userId}
                onPreferencesChange={handlePreferencesChange}
              />
            </TabsContent>

            <TabsContent value="history" className="mt-6">
              <NotificationHistory
                userId={userId}
                onNotificationRead={handleNotificationRead}
              />
            </TabsContent>

            <TabsContent value="stats" className="mt-6">
              <NotificationStats userId={userId} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}