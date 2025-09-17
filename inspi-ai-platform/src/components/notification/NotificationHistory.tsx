/**
 * 通知历史记录组件
 * 显示用户的通知历史记录，支持筛选和分页
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Bell, 
  Mail, 
  Smartphone, 
  MessageSquare, 
  Check, 
  Clock, 
  AlertCircle,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Trash2
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { useToast } from '@/hooks/use-toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// 通知消息接口
export interface NotificationMessage {
  id: string
  userId: string
  type: string
  title: string
  content: string
  channel: string
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
  metadata?: Record<string, any>
  scheduledAt?: Date
  sentAt?: Date
  readAt?: Date
  createdAt: Date
}

// 通知状态配置
const STATUS_CONFIG = {
  pending: { label: '待发送', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  sent: { label: '已发送', color: 'bg-blue-100 text-blue-800', icon: Check },
  delivered: { label: '已送达', color: 'bg-green-100 text-green-800', icon: Check },
  read: { label: '已读', color: 'bg-gray-100 text-gray-800', icon: Eye },
  failed: { label: '发送失败', color: 'bg-red-100 text-red-800', icon: AlertCircle }
}

// 通知渠道配置
const CHANNEL_CONFIG = {
  in_app: { label: '应用内', icon: Bell },
  email: { label: '邮件', icon: Mail },
  sms: { label: '短信', icon: MessageSquare },
  push: { label: '推送', icon: Smartphone },
  wechat: { label: '微信', icon: MessageSquare }
}

// 通知类型配置
const TYPE_CONFIG = {
  invite_success: { label: '邀请成功', icon: '🎉' },
  reward_received: { label: '奖励到账', icon: '🎁' },
  invite_progress: { label: '邀请进度', icon: '📈' },
  invite_code_expiring: { label: '邀请码过期', icon: '⏰' },
  milestone_achieved: { label: '里程碑达成', icon: '🏆' },
  weekly_summary: { label: '周度总结', icon: '📊' },
  monthly_report: { label: '月度报告', icon: '📋' }
}

interface NotificationHistoryProps {
  userId: string
  onNotificationRead?: (notificationId: string) => void
}

export default function NotificationHistory({ 
  userId, 
  onNotificationRead 
}: NotificationHistoryProps) {
  const [notifications, setNotifications] = useState<NotificationMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([])
  const [filters, setFilters] = useState({
    status: 'all',
    channel: 'all',
    type: 'all',
    search: ''
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0
  })
  const { toast } = useToast()

  // 加载通知历史
  useEffect(() => {
    loadNotifications()
  }, [userId, filters, pagination.page])

  const loadNotifications = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        userId,
        limit: pagination.limit.toString(),
        offset: ((pagination.page - 1) * pagination.limit).toString()
      })

      if (filters.status !== 'all') {
        params.append('status', filters.status)
      }
      if (filters.channel !== 'all') {
        params.append('channel', filters.channel)
      }
      if (filters.search) {
        params.append('search', filters.search)
      }

      const response = await fetch(`/api/notifications?${params}`)
      const data = await response.json()

      if (data.success) {
        setNotifications(data.data.notifications || [])
        setPagination(prev => ({
          ...prev,
          total: data.data.total || 0
        }))
      } else {
        throw new Error(data.error || 'Failed to load notifications')
      }
    } catch (error) {
      console.error('Failed to load notifications:', error)
      toast({
        title: '加载失败',
        description: '无法加载通知历史，请稍后重试',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationIds: string[]) => {
    try {
      const response = await fetch('/api/notifications/bulk-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notificationIds
        })
      })

      const data = await response.json()

      if (data.success) {
        // 更新本地状态
        setNotifications(prev => prev.map(notification => 
          notificationIds.includes(notification.id)
            ? { ...notification, status: 'read' as const, readAt: new Date() }
            : notification
        ))

        toast({
          title: '操作成功',
          description: `已标记 ${notificationIds.length} 条通知为已读`
        })

        // 清空选择
        setSelectedNotifications([])

        // 触发回调
        notificationIds.forEach(id => onNotificationRead?.(id))
      } else {
        throw new Error(data.error || 'Failed to mark as read')
      }
    } catch (error) {
      console.error('Failed to mark notifications as read:', error)
      toast({
        title: '操作失败',
        description: '无法标记通知为已读，请稍后重试',
        variant: 'destructive'
      })
    }
  }

  const deleteNotifications = async (notificationIds: string[]) => {
    try {
      const response = await fetch('/api/notifications/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notificationIds
        })
      })

      const data = await response.json()

      if (data.success) {
        // 更新本地状态
        setNotifications(prev => prev.filter(notification => 
          !notificationIds.includes(notification.id)
        ))

        toast({
          title: '删除成功',
          description: `已删除 ${notificationIds.length} 条通知`
        })

        // 清空选择
        setSelectedNotifications([])
      } else {
        throw new Error(data.error || 'Failed to delete notifications')
      }
    } catch (error) {
      console.error('Failed to delete notifications:', error)
      toast({
        title: '删除失败',
        description: '无法删除通知，请稍后重试',
        variant: 'destructive'
      })
    }
  }

  const toggleNotificationSelection = (notificationId: string) => {
    setSelectedNotifications(prev => 
      prev.includes(notificationId)
        ? prev.filter(id => id !== notificationId)
        : [...prev, notificationId]
    )
  }

  const toggleSelectAll = () => {
    if (selectedNotifications.length === notifications.length) {
      setSelectedNotifications([])
    } else {
      setSelectedNotifications(notifications.map(n => n.id))
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handleSearch = (search: string) => {
    setFilters(prev => ({ ...prev, search }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const formatNotificationTime = (date: Date) => {
    return formatDistanceToNow(date, { 
      addSuffix: true, 
      locale: zhCN 
    })
  }

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]
    if (!config) return null

    const IconComponent = config.icon
    return (
      <Badge variant="secondary" className={config.color}>
        <IconComponent className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  const getChannelIcon = (channel: string) => {
    const config = CHANNEL_CONFIG[channel as keyof typeof CHANNEL_CONFIG]
    if (!config) return null

    const IconComponent = config.icon
    return <IconComponent className="h-4 w-4" />
  }

  const getTypeIcon = (type: string) => {
    const config = TYPE_CONFIG[type as keyof typeof TYPE_CONFIG]
    return config?.icon || '📢'
  }

  const totalPages = Math.ceil(pagination.total / pagination.limit)

  if (loading && notifications.length === 0) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 筛选和搜索 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            通知历史
            <Badge variant="outline">{pagination.total} 条</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索通知内容..."
              value={filters.search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* 筛选器 */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span className="text-sm font-medium">筛选:</span>
            </div>
            
            <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有状态</SelectItem>
                <SelectItem value="pending">待发送</SelectItem>
                <SelectItem value="sent">已发送</SelectItem>
                <SelectItem value="delivered">已送达</SelectItem>
                <SelectItem value="read">已读</SelectItem>
                <SelectItem value="failed">发送失败</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.channel} onValueChange={(value) => handleFilterChange('channel', value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有渠道</SelectItem>
                <SelectItem value="in_app">应用内</SelectItem>
                <SelectItem value="email">邮件</SelectItem>
                <SelectItem value="sms">短信</SelectItem>
                <SelectItem value="push">推送</SelectItem>
                <SelectItem value="wechat">微信</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.type} onValueChange={(value) => handleFilterChange('type', value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有类型</SelectItem>
                <SelectItem value="invite_success">邀请成功</SelectItem>
                <SelectItem value="reward_received">奖励到账</SelectItem>
                <SelectItem value="invite_progress">邀请进度</SelectItem>
                <SelectItem value="invite_code_expiring">邀请码过期</SelectItem>
                <SelectItem value="milestone_achieved">里程碑达成</SelectItem>
                <SelectItem value="weekly_summary">周度总结</SelectItem>
                <SelectItem value="monthly_report">月度报告</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 批量操作 */}
          {selectedNotifications.length > 0 && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
              <span className="text-sm">
                已选择 {selectedNotifications.length} 条通知
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => markAsRead(selectedNotifications)}
              >
                标记为已读
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => deleteNotifications(selectedNotifications)}
              >
                删除
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedNotifications([])}
              >
                取消选择
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 通知列表 */}
      <Card>
        <CardContent className="p-0">
          {notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">暂无通知记录</p>
            </div>
          ) : (
            <div className="space-y-0">
              {/* 表头 */}
              <div className="flex items-center p-4 border-b bg-muted/50">
                <Checkbox
                  checked={selectedNotifications.length === notifications.length}
                  onCheckedChange={toggleSelectAll}
                  className="mr-4"
                />
                <span className="text-sm font-medium">全选</span>
              </div>

              {/* 通知项 */}
              {notifications.map((notification, index) => (
                <div
                  key={notification.id}
                  className={`flex items-start p-4 border-b hover:bg-muted/50 transition-colors ${
                    notification.status === 'read' ? 'opacity-75' : ''
                  }`}
                >
                  <Checkbox
                    checked={selectedNotifications.includes(notification.id)}
                    onCheckedChange={() => toggleNotificationSelection(notification.id)}
                    className="mr-4 mt-1"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getTypeIcon(notification.type)}</span>
                        <h4 className="font-medium text-sm">{notification.title}</h4>
                        {notification.status !== 'read' && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {getChannelIcon(notification.channel)}
                        {getStatusBadge(notification.status)}
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                      {notification.content}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatNotificationTime(notification.createdAt)}</span>
                      <div className="flex items-center gap-4">
                        {notification.sentAt && (
                          <span>发送: {formatNotificationTime(notification.sentAt)}</span>
                        )}
                        {notification.readAt && (
                          <span>已读: {formatNotificationTime(notification.readAt)}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {notification.status !== 'read' && (
                        <DropdownMenuItem onClick={() => markAsRead([notification.id])}>
                          <Eye className="h-4 w-4 mr-2" />
                          标记为已读
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem 
                        onClick={() => deleteNotifications([notification.id])}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        删除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            显示第 {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} 条，
            共 {pagination.total} 条
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            >
              上一页
            </Button>
            <span className="text-sm">
              第 {pagination.page} / {totalPages} 页
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === totalPages}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            >
              下一页
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}