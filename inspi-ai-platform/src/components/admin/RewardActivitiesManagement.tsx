/**
 * 奖励活动管理组件
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X,
  Calendar,
  Target,
  Activity,
  Clock,
  Users
} from 'lucide-react'
import { RewardActivity } from '@/lib/invitation/types'

interface RewardActivitiesManagementProps {}

const RewardActivitiesManagement: React.FC<RewardActivitiesManagementProps> = () => {
  const [activities, setActivities] = useState<RewardActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [editingActivity, setEditingActivity] = useState<RewardActivity | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    rewardRules: [],
    targetMetrics: {},
    isActive: true
  })

  const { toast } = useToast()

  useEffect(() => {
    loadRewardActivities()
  }, [])

  const loadRewardActivities = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/reward-config?type=activities')
      if (response.ok) {
        const data = await response.json()
        setActivities(data.data)
      } else {
        throw new Error('Failed to load reward activities')
      }
    } catch (error) {
      console.error('Failed to load reward activities:', error)
      toast({
        title: '加载失败',
        description: '无法加载奖励活动',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateActivity = async () => {
    try {
      const response = await fetch('/api/admin/reward-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'activity',
          ...formData,
          startDate: new Date(formData.startDate),
          endDate: new Date(formData.endDate)
        })
      })

      if (response.ok) {
        toast({
          title: '创建成功',
          description: '奖励活动已创建'
        })
        setShowCreateForm(false)
        resetForm()
        loadRewardActivities()
      } else {
        throw new Error('Failed to create reward activity')
      }
    } catch (error) {
      console.error('Failed to create reward activity:', error)
      toast({
        title: '创建失败',
        description: '无法创建奖励活动',
        variant: 'destructive'
      })
    }
  }

  const handleUpdateActivity = async (activity: RewardActivity) => {
    try {
      const response = await fetch('/api/admin/reward-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'activity',
          id: activity.id,
          ...formData,
          startDate: new Date(formData.startDate),
          endDate: new Date(formData.endDate)
        })
      })

      if (response.ok) {
        toast({
          title: '更新成功',
          description: '奖励活动已更新'
        })
        setEditingActivity(null)
        resetForm()
        loadRewardActivities()
      } else {
        throw new Error('Failed to update reward activity')
      }
    } catch (error) {
      console.error('Failed to update reward activity:', error)
      toast({
        title: '更新失败',
        description: '无法更新奖励活动',
        variant: 'destructive'
      })
    }
  }

  const handleDeleteActivity = async (activityId: string) => {
    if (!confirm('确定要删除这个奖励活动吗？')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/reward-config?type=activity&id=${activityId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast({
          title: '删除成功',
          description: '奖励活动已删除'
        })
        loadRewardActivities()
      } else {
        throw new Error('Failed to delete reward activity')
      }
    } catch (error) {
      console.error('Failed to delete reward activity:', error)
      toast({
        title: '删除失败',
        description: '无法删除奖励活动',
        variant: 'destructive'
      })
    }
  }

  const startEdit = (activity: RewardActivity) => {
    setEditingActivity(activity)
    setFormData({
      name: activity.name,
      description: activity.description,
      startDate: activity.startDate.toISOString().split('T')[0],
      endDate: activity.endDate.toISOString().split('T')[0],
      rewardRules: activity.rewardRules,
      targetMetrics: activity.targetMetrics,
      isActive: activity.isActive
    })
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      startDate: '',
      endDate: '',
      rewardRules: [],
      targetMetrics: {},
      isActive: true
    })
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(date))
  }

  const getActivityStatus = (activity: RewardActivity) => {
    const now = new Date()
    const start = new Date(activity.startDate)
    const end = new Date(activity.endDate)

    if (!activity.isActive) {
      return { status: '已停用', variant: 'secondary' as const }
    }
    if (now < start) {
      return { status: '未开始', variant: 'outline' as const }
    }
    if (now > end) {
      return { status: '已结束', variant: 'destructive' as const }
    }
    return { status: '进行中', variant: 'default' as const }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">奖励活动管理</h2>
        <Button 
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          创建活动
        </Button>
      </div>

      {/* 创建表单 */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              创建奖励活动
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">活动名称</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="输入活动名称"
              />
            </div>

            <div>
              <Label htmlFor="description">活动描述</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="输入活动描述"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">开始日期</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="endDate">结束日期</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="isActive">启用活动</Label>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCreateActivity} className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                创建活动
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowCreateForm(false)
                  resetForm()
                }}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                取消
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 活动列表 */}
      <div className="space-y-4">
        {activities.map((activity) => {
          const statusInfo = getActivityStatus(activity)
          
          return (
            <Card key={activity.id}>
              <CardContent className="p-6">
                {editingActivity?.id === activity.id ? (
                  // 编辑表单
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor={`edit-name-${activity.id}`}>活动名称</Label>
                      <Input
                        id={`edit-name-${activity.id}`}
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor={`edit-description-${activity.id}`}>活动描述</Label>
                      <Input
                        id={`edit-description-${activity.id}`}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`edit-startDate-${activity.id}`}>开始日期</Label>
                        <Input
                          id={`edit-startDate-${activity.id}`}
                          type="date"
                          value={formData.startDate}
                          onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`edit-endDate-${activity.id}`}>结束日期</Label>
                        <Input
                          id={`edit-endDate-${activity.id}`}
                          type="date"
                          value={formData.endDate}
                          onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id={`edit-active-${activity.id}`}
                        checked={formData.isActive}
                        onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                      />
                      <Label htmlFor={`edit-active-${activity.id}`}>启用活动</Label>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={() => handleUpdateActivity(activity)} className="flex items-center gap-2">
                        <Save className="h-4 w-4" />
                        保存
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setEditingActivity(null)
                          resetForm()
                        }}
                        className="flex items-center gap-2"
                      >
                        <X className="h-4 w-4" />
                        取消
                      </Button>
                    </div>
                  </div>
                ) : (
                  // 显示模式
                  <div className="flex items-start justify-between">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold">{activity.name}</h3>
                        <Badge variant={statusInfo.variant}>
                          {statusInfo.status}
                        </Badge>
                      </div>
                      <p className="text-gray-600">{activity.description}</p>
                      <div className="flex items-center gap-6 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(activity.startDate)} - {formatDate(activity.endDate)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Target className="h-4 w-4" />
                          {activity.rewardRules.length} 个奖励规则
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          创建于 {formatDate(activity.createdAt)}
                        </span>
                      </div>
                      
                      {/* 目标指标 */}
                      {Object.keys(activity.targetMetrics).length > 0 && (
                        <div className="mt-3">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">目标指标</h4>
                          <div className="flex gap-4">
                            {Object.entries(activity.targetMetrics).map(([key, value]) => (
                              <div key={key} className="bg-gray-50 px-3 py-1 rounded text-sm">
                                <span className="text-gray-600">{key}:</span>
                                <span className="font-medium ml-1">{value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEdit(activity)}
                        className="flex items-center gap-2"
                      >
                        <Edit className="h-4 w-4" />
                        编辑
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteActivity(activity.id)}
                        className="flex items-center gap-2 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                        删除
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}

        {activities.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无奖励活动</h3>
              <p className="text-gray-600 mb-4">创建第一个奖励活动来开始管理活动奖励</p>
              <Button onClick={() => setShowCreateForm(true)}>
                创建奖励活动
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default RewardActivitiesManagement