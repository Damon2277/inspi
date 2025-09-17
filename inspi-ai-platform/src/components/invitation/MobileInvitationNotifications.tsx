/**
 * 移动端邀请通知组件
 * 优化移动端通知展示，支持推送通知和应用内通知
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MobileCard } from '@/components/mobile/MobileCard'
import { useResponsive } from '@/hooks/useResponsive'
import { 
  Bell,
  Gift,
  Users,
  Star,
  CheckCircle,
  X,
  Settings,
  Volume2,
  VolumeX,
  Smartphone,
  Mail,
  MessageSquare,
  Calendar,
  Clock,
  TrendingUp
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface InvitationNotification {
  id: string
  type: 'invite_success' | 'reward_earned' | 'milestone_reached' | 'reminder'
  title: string
  message: string
  data?: any
  isRead: boolean
  createdAt: Date
  priority: 'low' | 'medium' | 'high'
  actionUrl?: string
}

interface NotificationSettings {
  pushEnabled: boolean
  emailEnabled: boolean
  smsEnabled: boolean
  inviteSuccess: boolean
  rewardEarned: boolean
  milestoneReached: boolean
  weeklyReport: boolean
  soundEnabled: boolean
  vibrationEnabled: boolean
}

interface MobileInvitationNotificationsProps {
  userId: string
}

const MobileInvitationNotifications: React.FC<MobileInvitationNotificationsProps> = ({ userId }) => {
  const [notifications, setNotifications] = useState<InvitationNotification[]>([])
  const [settings, setSettings] = useState<NotificationSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  
  const { isMobile } = useResponsive()
  const { toast } = useToast()

  useEffect(() => {
    loadNotifications()
    loadSettings()
    
    // 请求通知权限
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [userId])

  const loadNotifications = async () => {
    try {
      const response = await fetch(`/api/notifications?userId=${userId}&type=invitation&limit=20`)
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.data)
        setUnreadCount(data.data.filter((n: InvitationNotification) => !n.isRead).length)
      }
    } catch (error) {
      console.error('Failed to load notifications:', error)
    }
  }

  const loadSettings = async () => {
    try {
      const response = await fetch(`/api/notifications/preferences?userId=${userId}`)
      if (response.ok) {
        const data = await response.json()
        setSettings(data.data)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST'
      })
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/bulk-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId, type: 'invitation' })
      })
      
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      setUnreadCount(0)
      
      toast({
        title: '标记成功',
        description: '所有通知已标记为已读'
      })
    } catch (error) {
      console.error('Failed to mark all as read:', error)
      toast({
        title: '操作失败',
        description: '无法标记通知为已读',
        variant: 'destructive'
      })
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE'
      })
      
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      
      toast({
        title: '删除成功',
        description: '通知已删除'
      })
    } catch (error) {
      console.error('Failed to delete notification:', error)
      toast({
        title: '删除失败',
        description: '无法删除通知',
        variant: 'destructive'
      })
    }
  }

  const updateSettings = async (newSettings: Partial<NotificationSettings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings }
      
      await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId, settings: updatedSettings })
      })
      
      setSettings(updatedSettings as NotificationSettings)
      
      toast({
        title: '设置已保存',
        description: '通知偏好设置已更新'
      })
    } catch (error) {
      console.error('Failed to update settings:', error)
      toast({
        title: '保存失败',
        description: '无法保存设置',
        variant: 'destructive'
      })
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'invite_success':
        return <Users className="h-5 w-5 text-blue-500" />
      case 'reward_earned':
        return <Gift className="h-5 w-5 text-green-500" />
      case 'milestone_reached':
        return <Star className="h-5 w-5 text-yellow-500" />
      case 'reminder':
        return <Clock className="h-5 w-5 text-orange-500" />
      default:
        return <Bell className="h-5 w-5 text-gray-500" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500'
      case 'medium':
        return 'border-l-yellow-500'
      case 'low':
        return 'border-l-blue-500'
      default:
        return 'border-l-gray-300'
    }
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - new Date(date).getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (days > 0) return `${days}天前`
    if (hours > 0) return `${hours}小时前`
    if (minutes > 0) return `${minutes}分钟前`
    return '刚刚'
  }

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-200 rounded-lg"></div>
            <div className="h-16 bg-gray-200 rounded-lg"></div>
            <div className="h-16 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 pb-20">
      {/* 页面标题和操作 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-gray-900">邀请通知</h1>
          {unreadCount > 0 && (
            <Badge className="bg-red-500 text-white text-xs">
              {unreadCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(true)}
            className="h-8 w-8 p-0"
          >
            <Settings className="h-4 w-4" />
          </Button>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs px-2"
            >
              全部已读
            </Button>
          )}
        </div>
      </div>

      {/* 通知列表 */}
      <div className="space-y-3">
        {notifications.length > 0 ? (
          notifications.map((notification) => (
            <MobileCard
              key={notification.id}
              className={`
                border-l-4 ${getPriorityColor(notification.priority)}
                ${!notification.isRead ? 'bg-blue-50 border-blue-200' : 'bg-white'}
              `}
              onClick={() => !notification.isRead && markAsRead(notification.id)}
            >
              <div className="flex items-start gap-3">
                {getNotificationIcon(notification.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 text-sm">
                        {notification.title}
                      </h3>
                      <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-400">
                          {formatTimeAgo(notification.createdAt)}
                        </span>
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteNotification(notification.id)
                      }}
                      className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </MobileCard>
          ))
        ) : (
          <MobileCard className="text-center py-8">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">暂无通知</p>
          </MobileCard>
        )}
      </div>

      {/* 通知设置弹窗 */}
      {showSettings && settings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-2xl w-full max-w-md mx-4 animate-slide-up">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">通知设置</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
              {/* 通知渠道设置 */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">通知渠道</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">推送通知</span>
                    </div>
                    <button
                      onClick={() => updateSettings({ pushEnabled: !settings.pushEnabled })}
                      className={`
                        relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                        ${settings.pushEnabled ? 'bg-blue-600' : 'bg-gray-200'}
                      `}
                    >
                      <span
                        className={`
                          inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                          ${settings.pushEnabled ? 'translate-x-6' : 'translate-x-1'}
                        `}
                      />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">邮件通知</span>
                    </div>
                    <button
                      onClick={() => updateSettings({ emailEnabled: !settings.emailEnabled })}
                      className={`
                        relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                        ${settings.emailEnabled ? 'bg-blue-600' : 'bg-gray-200'}
                      `}
                    >
                      <span
                        className={`
                          inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                          ${settings.emailEnabled ? 'translate-x-6' : 'translate-x-1'}
                        `}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* 通知类型设置 */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">通知类型</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">邀请成功通知</span>
                    <button
                      onClick={() => updateSettings({ inviteSuccess: !settings.inviteSuccess })}
                      className={`
                        relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                        ${settings.inviteSuccess ? 'bg-blue-600' : 'bg-gray-200'}
                      `}
                    >
                      <span
                        className={`
                          inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                          ${settings.inviteSuccess ? 'translate-x-6' : 'translate-x-1'}
                        `}
                      />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">奖励到账通知</span>
                    <button
                      onClick={() => updateSettings({ rewardEarned: !settings.rewardEarned })}
                      className={`
                        relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                        ${settings.rewardEarned ? 'bg-blue-600' : 'bg-gray-200'}
                      `}
                    >
                      <span
                        className={`
                          inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                          ${settings.rewardEarned ? 'translate-x-6' : 'translate-x-1'}
                        `}
                      />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">里程碑达成通知</span>
                    <button
                      onClick={() => updateSettings({ milestoneReached: !settings.milestoneReached })}
                      className={`
                        relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                        ${settings.milestoneReached ? 'bg-blue-600' : 'bg-gray-200'}
                      `}
                    >
                      <span
                        className={`
                          inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                          ${settings.milestoneReached ? 'translate-x-6' : 'translate-x-1'}
                        `}
                      />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">周报通知</span>
                    <button
                      onClick={() => updateSettings({ weeklyReport: !settings.weeklyReport })}
                      className={`
                        relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                        ${settings.weeklyReport ? 'bg-blue-600' : 'bg-gray-200'}
                      `}
                    >
                      <span
                        className={`
                          inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                          ${settings.weeklyReport ? 'translate-x-6' : 'translate-x-1'}
                        `}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* 声音和震动设置 */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">提醒方式</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {settings.soundEnabled ? 
                        <Volume2 className="h-4 w-4 text-gray-500" /> : 
                        <VolumeX className="h-4 w-4 text-gray-500" />
                      }
                      <span className="text-sm">声音提醒</span>
                    </div>
                    <button
                      onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
                      className={`
                        relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                        ${settings.soundEnabled ? 'bg-blue-600' : 'bg-gray-200'}
                      `}
                    >
                      <span
                        className={`
                          inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                          ${settings.soundEnabled ? 'translate-x-6' : 'translate-x-1'}
                        `}
                      />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">震动提醒</span>
                    </div>
                    <button
                      onClick={() => updateSettings({ vibrationEnabled: !settings.vibrationEnabled })}
                      className={`
                        relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                        ${settings.vibrationEnabled ? 'bg-blue-600' : 'bg-gray-200'}
                      `}
                    >
                      <span
                        className={`
                          inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                          ${settings.vibrationEnabled ? 'translate-x-6' : 'translate-x-1'}
                        `}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MobileInvitationNotifications