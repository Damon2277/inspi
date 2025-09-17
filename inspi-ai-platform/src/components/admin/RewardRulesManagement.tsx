/**
 * 奖励规则管理组件
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X,
  Settings,
  Gift,
  Users,
  Calendar,
  Target
} from 'lucide-react'
import { RewardRule, RewardType, InviteEventType } from '@/lib/invitation/types'

interface RewardRulesManagementProps {}

const RewardRulesManagement: React.FC<RewardRulesManagementProps> = () => {
  const [rules, setRules] = useState<RewardRule[]>([])
  const [loading, setLoading] = useState(true)
  const [editingRule, setEditingRule] = useState<RewardRule | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    eventType: '' as InviteEventType,
    rewardType: '' as RewardType,
    rewardAmount: 0,
    priority: 0,
    isActive: true,
    conditions: {}
  })

  const { toast } = useToast()

  const eventTypeOptions = [
    { value: 'user_registered', label: '用户注册' },
    { value: 'user_activated', label: '用户激活' },
    { value: 'code_generated', label: '邀请码生成' },
    { value: 'code_shared', label: '邀请码分享' },
    { value: 'milestone', label: '里程碑达成' }
  ]

  const rewardTypeOptions = [
    { value: 'ai_credits', label: 'AI积分' },
    { value: 'badge', label: '徽章' },
    { value: 'title', label: '称号' },
    { value: 'premium_access', label: '高级权限' },
    { value: 'template_unlock', label: '模板解锁' }
  ]

  useEffect(() => {
    loadRewardRules()
  }, [])

  const loadRewardRules = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/reward-config?type=rules')
      if (response.ok) {
        const data = await response.json()
        setRules(data.data)
      } else {
        throw new Error('Failed to load reward rules')
      }
    } catch (error) {
      console.error('Failed to load reward rules:', error)
      toast({
        title: '加载失败',
        description: '无法加载奖励规则',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRule = async () => {
    try {
      const response = await fetch('/api/admin/reward-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'rule',
          ...formData
        })
      })

      if (response.ok) {
        toast({
          title: '创建成功',
          description: '奖励规则已创建'
        })
        setShowCreateForm(false)
        resetForm()
        loadRewardRules()
      } else {
        throw new Error('Failed to create reward rule')
      }
    } catch (error) {
      console.error('Failed to create reward rule:', error)
      toast({
        title: '创建失败',
        description: '无法创建奖励规则',
        variant: 'destructive'
      })
    }
  }

  const handleUpdateRule = async (rule: RewardRule) => {
    try {
      const response = await fetch('/api/admin/reward-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'rule',
          id: rule.id,
          ...formData
        })
      })

      if (response.ok) {
        toast({
          title: '更新成功',
          description: '奖励规则已更新'
        })
        setEditingRule(null)
        resetForm()
        loadRewardRules()
      } else {
        throw new Error('Failed to update reward rule')
      }
    } catch (error) {
      console.error('Failed to update reward rule:', error)
      toast({
        title: '更新失败',
        description: '无法更新奖励规则',
        variant: 'destructive'
      })
    }
  }

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('确定要删除这个奖励规则吗？')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/reward-config?type=rule&id=${ruleId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast({
          title: '删除成功',
          description: '奖励规则已删除'
        })
        loadRewardRules()
      } else {
        throw new Error('Failed to delete reward rule')
      }
    } catch (error) {
      console.error('Failed to delete reward rule:', error)
      toast({
        title: '删除失败',
        description: '无法删除奖励规则',
        variant: 'destructive'
      })
    }
  }

  const startEdit = (rule: RewardRule) => {
    setEditingRule(rule)
    setFormData({
      name: rule.name,
      description: rule.description,
      eventType: rule.eventType,
      rewardType: rule.rewardType,
      rewardAmount: rule.rewardAmount,
      priority: rule.priority,
      isActive: rule.isActive,
      conditions: rule.conditions
    })
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      eventType: '' as InviteEventType,
      rewardType: '' as RewardType,
      rewardAmount: 0,
      priority: 0,
      isActive: true,
      conditions: {}
    })
  }

  const getEventTypeLabel = (eventType: InviteEventType) => {
    return eventTypeOptions.find(option => option.value === eventType)?.label || eventType
  }

  const getRewardTypeLabel = (rewardType: RewardType) => {
    return rewardTypeOptions.find(option => option.value === rewardType)?.label || rewardType
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">奖励规则管理</h2>
        <Button 
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          创建规则
        </Button>
      </div>

      {/* 创建表单 */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              创建奖励规则
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">规则名称</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="输入规则名称"
                />
              </div>
              <div>
                <Label htmlFor="priority">优先级</Label>
                <Input
                  id="priority"
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                  placeholder="数字越大优先级越高"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">规则描述</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="输入规则描述"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>触发事件</Label>
                <Select 
                  value={formData.eventType} 
                  onValueChange={(value) => setFormData({ ...formData, eventType: value as InviteEventType })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择事件类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypeOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>奖励类型</Label>
                <Select 
                  value={formData.rewardType} 
                  onValueChange={(value) => setFormData({ ...formData, rewardType: value as RewardType })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择奖励类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {rewardTypeOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="rewardAmount">奖励数量</Label>
                <Input
                  id="rewardAmount"
                  type="number"
                  value={formData.rewardAmount}
                  onChange={(e) => setFormData({ ...formData, rewardAmount: parseInt(e.target.value) })}
                  placeholder="奖励数量"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="isActive">启用规则</Label>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCreateRule} className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                创建规则
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

      {/* 规则列表 */}
      <div className="space-y-4">
        {rules.map((rule) => (
          <Card key={rule.id}>
            <CardContent className="p-6">
              {editingRule?.id === rule.id ? (
                // 编辑表单
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`edit-name-${rule.id}`}>规则名称</Label>
                      <Input
                        id={`edit-name-${rule.id}`}
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`edit-priority-${rule.id}`}>优先级</Label>
                      <Input
                        id={`edit-priority-${rule.id}`}
                        type="number"
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor={`edit-description-${rule.id}`}>规则描述</Label>
                    <Input
                      id={`edit-description-${rule.id}`}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>触发事件</Label>
                      <Select 
                        value={formData.eventType} 
                        onValueChange={(value) => setFormData({ ...formData, eventType: value as InviteEventType })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {eventTypeOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>奖励类型</Label>
                      <Select 
                        value={formData.rewardType} 
                        onValueChange={(value) => setFormData({ ...formData, rewardType: value as RewardType })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {rewardTypeOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor={`edit-amount-${rule.id}`}>奖励数量</Label>
                      <Input
                        id={`edit-amount-${rule.id}`}
                        type="number"
                        value={formData.rewardAmount}
                        onChange={(e) => setFormData({ ...formData, rewardAmount: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id={`edit-active-${rule.id}`}
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    />
                    <Label htmlFor={`edit-active-${rule.id}`}>启用规则</Label>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={() => handleUpdateRule(rule)} className="flex items-center gap-2">
                      <Save className="h-4 w-4" />
                      保存
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setEditingRule(null)
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
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">{rule.name}</h3>
                      <Badge variant={rule.isActive ? 'default' : 'secondary'}>
                        {rule.isActive ? '启用' : '禁用'}
                      </Badge>
                      <Badge variant="outline">优先级: {rule.priority}</Badge>
                    </div>
                    <p className="text-gray-600">{rule.description}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {getEventTypeLabel(rule.eventType)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Gift className="h-4 w-4" />
                        {getRewardTypeLabel(rule.rewardType)} × {rule.rewardAmount}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEdit(rule)}
                      className="flex items-center gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      编辑
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteRule(rule.id)}
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
        ))}

        {rules.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无奖励规则</h3>
              <p className="text-gray-600 mb-4">创建第一个奖励规则来开始管理奖励系统</p>
              <Button onClick={() => setShowCreateForm(true)}>
                创建奖励规则
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default RewardRulesManagement