/**
 * 通知偏好设置组件
 * 用户可以配置各种通知类型的偏好设置
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Bell, Mail, Smartphone, MessageSquare, Clock, Volume2, VolumeX } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

// 通知类型定义
export enum NotificationType {
  INVITE_SUCCESS = 'invite_success',
  REWARD_RECEIVED = 'reward_received',
  INVITE_PROGRESS = 'invite_progress',
  INVITE_CODE_EXPIRING = 'invite_code_expiring',
  MILESTONE_ACHIEVED = 'milestone_achieved',
  WEEKLY_SUMMARY = 'weekly_summary',
  MONTHLY_REPORT = 'monthly_report'
}

// 通知渠道定义
export enum NotificationChannel {
  IN_APP = 'in_app',
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  WECHAT = 'wechat',
  WEBHOOK = 'webhook'
}

// 通知频率定义
export enum NotificationFrequency {
  IMMEDIATE = 'immediate',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly'
}

// 通知偏好接口
export interface NotificationPreference {
  userId: string
  type: NotificationType
  channels: NotificationChannel[]
  frequency: NotificationFrequency
  isEnabled: boolean
  quietHours?: {
    start: string
    end: string
  }
}

// 通知类型显示配置
const NOTIFICATION_TYPE_CONFIG = {
  [NotificationType.INVITE_SUCCESS]: {
    name: '邀请成功通知',
    description: '当有人通过您的邀请成功注册时通知您',
    icon: '🎉',
    defaultChannels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    defaultFrequency: NotificationFrequency.IMMEDIATE
  },
  [NotificationType.REWARD_RECEIVED]: {
    name: '奖励到账通知',
    description: '当您获得邀请奖励时通知您',
    icon: '🎁',
    defaultChannels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
    defaultFrequency: NotificationFrequency.IMMEDIATE
  },
  [NotificationType.INVITE_PROGRESS]: {
    name: '邀请进度提醒',
    description: '定期提醒您的邀请进度和里程碑',
    icon: '📈',
    defaultChannels: [NotificationChannel.IN_APP],
    defaultFrequency: NotificationFrequency.WEEKLY
  },
  [NotificationType.INVITE_CODE_EXPIRING]: {
    name: '邀请码过期提醒',
    description: '当您的邀请码即将过期时提醒您',
    icon: '⏰',
    defaultChannels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    defaultFrequency: NotificationFrequency.IMMEDIATE
  },
  [NotificationType.MILESTONE_ACHIEVED]: {
    name: '里程碑达成通知',
    description: '当您达成邀请里程碑时通知您',
    icon: '🏆',
    defaultChannels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.PUSH],
    defaultFrequency: NotificationFrequency.IMMEDIATE
  },
  [NotificationType.WEEKLY_SUMMARY]: {
    name: '周度邀请总结',
    description: '每周发送您的邀请活动总结',
    icon: '📊',
    defaultChannels: [NotificationChannel.EMAIL],
    defaultFrequency: NotificationFrequency.WEEKLY
  },
  [NotificationType.MONTHLY_REPORT]: {
    name: '月度邀请报告',
    description: '每月发送详细的邀请数据报告',
    icon: '📋',
    defaultChannels: [NotificationChannel.EMAIL],
    defaultFrequency: NotificationFrequency.MONTHLY
  }
}

// 通知渠道显示配置
const CHANNEL_CONFIG = {
  [NotificationChannel.IN_APP]: {
    name: '应用内通知',
    icon: Bell,
    description: '在应用内显示通知消息'
  },
  [NotificationChannel.EMAIL]: {
    name: '邮件通知',
    icon: Mail,
    description: '发送邮件到您的注册邮箱'
  },
  [NotificationChannel.SMS]: {
    name: '短信通知',
    icon: MessageSquare,
    description: '发送短信到您的手机号码'
  },
  [NotificationChannel.PUSH]: {
    name: '推送通知',
    icon: Smartphone,
    description: '发送推送通知到您的设备'
  },
  [NotificationChannel.WECHAT]: {
    name: '微信通知',
    icon: MessageSquare,
    description: '通过微信发送通知消息'
  }
}

// 频率选项配置
const FREQUENCY_OPTIONS = [
  { value: NotificationFrequency.IMMEDIATE, label: '立即通知' },
  { value: NotificationFrequency.DAILY, label: '每日汇总' },
  { value: NotificationFrequency.WEEKLY, label: '每周汇总' },
  { value: NotificationFrequency.MONTHLY, label: '每月汇总' }
]

interface NotificationPreferencesProps {
  userId: string
  onPreferencesChange?: (preferences: NotificationPreference[]) => void
}

export default function NotificationPreferences({ 
  userId, 
  onPreferencesChange 
}: NotificationPreferencesProps) {
  const [preferences, setPreferences] = useState<NotificationPreference[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [globalQuietHours, setGlobalQuietHours] = useState({
    enabled: false,
    start: '22:00',
    end: '08:00'
  })
  const { toast } = useToast()

  // 加载用户通知偏好
  useEffect(() => {
    loadPreferences()
  }, [userId])

  const loadPreferences = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/notifications/preferences?userId=${userId}`)
      const data = await response.json()

      if (data.success) {
        setPreferences(data.data || [])
        
        // 检查是否有全局静默时间设置
        const firstPref = data.data?.[0]
        if (firstPref?.quietHours) {
          setGlobalQuietHours({
            enabled: true,
            start: firstPref.quietHours.start,
            end: firstPref.quietHours.end
          })
        }
      } else {
        throw new Error(data.error || 'Failed to load preferences')
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error)
      toast({
        title: '加载失败',
        description: '无法加载通知偏好设置，请稍后重试',
        variant: 'destructive'
      })
      
      // 使用默认偏好设置
      setPreferences(getDefaultPreferences())
    } finally {
      setLoading(false)
    }
  }

  const getDefaultPreferences = (): NotificationPreference[] => {
    return Object.entries(NOTIFICATION_TYPE_CONFIG).map(([type, config]) => ({
      userId,
      type: type as NotificationType,
      channels: config.defaultChannels,
      frequency: config.defaultFrequency,
      isEnabled: true,
      quietHours: globalQuietHours.enabled ? {
        start: globalQuietHours.start,
        end: globalQuietHours.end
      } : undefined
    }))
  }

  const updatePreference = (type: NotificationType, updates: Partial<NotificationPreference>) => {
    setPreferences(prev => {
      const updated = prev.map(pref => 
        pref.type === type 
          ? { ...pref, ...updates }
          : pref
      )
      
      // 如果没有找到对应的偏好设置，创建一个新的
      if (!updated.find(p => p.type === type)) {
        const config = NOTIFICATION_TYPE_CONFIG[type]
        updated.push({
          userId,
          type,
          channels: config.defaultChannels,
          frequency: config.defaultFrequency,
          isEnabled: true,
          ...updates
        })
      }
      
      return updated
    })
  }

  const toggleNotificationType = (type: NotificationType, enabled: boolean) => {
    updatePreference(type, { isEnabled: enabled })
  }

  const updateChannels = (type: NotificationType, channels: NotificationChannel[]) => {
    updatePreference(type, { channels })
  }

  const updateFrequency = (type: NotificationType, frequency: NotificationFrequency) => {
    updatePreference(type, { frequency })
  }

  const updateGlobalQuietHours = (enabled: boolean, start?: string, end?: string) => {
    const newQuietHours = {
      enabled,
      start: start || globalQuietHours.start,
      end: end || globalQuietHours.end
    }
    
    setGlobalQuietHours(newQuietHours)
    
    // 更新所有偏好设置的静默时间
    setPreferences(prev => prev.map(pref => ({
      ...pref,
      quietHours: enabled ? {
        start: newQuietHours.start,
        end: newQuietHours.end
      } : undefined
    })))
  }

  const savePreferences = async () => {
    try {
      setSaving(true)
      
      const response = await fetch('/api/notifications/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          preferences
        })
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: '保存成功',
          description: '通知偏好设置已更新'
        })
        
        onPreferencesChange?.(preferences)
      } else {
        throw new Error(data.error || 'Failed to save preferences')
      }
    } catch (error) {
      console.error('Failed to save notification preferences:', error)
      toast({
        title: '保存失败',
        description: '无法保存通知偏好设置，请稍后重试',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const getPreference = (type: NotificationType): NotificationPreference | undefined => {
    return preferences.find(p => p.type === type)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 全局设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            全局通知设置
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 静默时间设置 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-medium">静默时间</Label>
                <p className="text-xs text-muted-foreground">
                  在指定时间段内不发送通知（应用内通知除外）
                </p>
              </div>
              <Switch
                checked={globalQuietHours.enabled}
                onCheckedChange={(enabled) => updateGlobalQuietHours(enabled)}
              />
            </div>
            
            {globalQuietHours.enabled && (
              <div className="flex items-center gap-4 pl-4">
                <div className="flex items-center gap-2">
                  <Label className="text-sm">从</Label>
                  <Input
                    type="time"
                    value={globalQuietHours.start}
                    onChange={(e) => updateGlobalQuietHours(true, e.target.value)}
                    className="w-24"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm">到</Label>
                  <Input
                    type="time"
                    value={globalQuietHours.end}
                    onChange={(e) => updateGlobalQuietHours(true, undefined, e.target.value)}
                    className="w-24"
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 通知类型设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            通知类型设置
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(NOTIFICATION_TYPE_CONFIG).map(([type, config]) => {
            const preference = getPreference(type as NotificationType)
            const isEnabled = preference?.isEnabled ?? true
            const channels = preference?.channels ?? config.defaultChannels
            const frequency = preference?.frequency ?? config.defaultFrequency

            return (
              <div key={type} className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{config.icon}</span>
                      <Label className="text-sm font-medium">{config.name}</Label>
                      {!isEnabled && <Badge variant="secondary">已禁用</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {config.description}
                    </p>
                  </div>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={(enabled) => toggleNotificationType(type as NotificationType, enabled)}
                  />
                </div>

                {isEnabled && (
                  <div className="pl-8 space-y-4">
                    {/* 通知渠道选择 */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">通知渠道</Label>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(CHANNEL_CONFIG).map(([channel, channelConfig]) => {
                          const IconComponent = channelConfig.icon
                          const isSelected = channels.includes(channel as NotificationChannel)
                          
                          return (
                            <div key={channel} className="flex items-center space-x-2">
                              <Checkbox
                                id={`${type}-${channel}`}
                                checked={isSelected}
                                onCheckedChange={(checked) => {
                                  const newChannels = checked
                                    ? [...channels, channel as NotificationChannel]
                                    : channels.filter(c => c !== channel)
                                  updateChannels(type as NotificationType, newChannels)
                                }}
                              />
                              <Label
                                htmlFor={`${type}-${channel}`}
                                className="flex items-center gap-1 text-xs cursor-pointer"
                              >
                                <IconComponent className="h-3 w-3" />
                                {channelConfig.name}
                              </Label>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* 通知频率选择 */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">通知频率</Label>
                      <Select
                        value={frequency}
                        onValueChange={(value) => updateFrequency(type as NotificationType, value as NotificationFrequency)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FREQUENCY_OPTIONS.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <Separator />
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* 保存按钮 */}
      <div className="flex justify-end">
        <Button 
          onClick={savePreferences} 
          disabled={saving}
          className="min-w-24"
        >
          {saving ? '保存中...' : '保存设置'}
        </Button>
      </div>
    </div>
  )
}