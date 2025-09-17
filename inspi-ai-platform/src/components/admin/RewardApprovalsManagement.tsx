/**
 * 奖励审核管理组件
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Gift,
  MessageSquare,
  Calendar,
  AlertCircle
} from 'lucide-react'
import { RewardApproval, RewardType } from '@/lib/invitation/types'

interface RewardApprovalsManagementProps {}

const RewardApprovalsManagement: React.FC<RewardApprovalsManagementProps> = () => {
  const [approvals, setApprovals] = useState<RewardApproval[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [showRejectForm, setShowRejectForm] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [approveNotes, setApproveNotes] = useState('')
  const [showApproveForm, setShowApproveForm] = useState<string | null>(null)

  const { toast } = useToast()

  const rewardTypeLabels: Record<RewardType, string> = {
    'ai_credits': 'AI积分',
    'badge': '徽章',
    'title': '称号',
    'premium_access': '高级权限',
    'template_unlock': '模板解锁'
  }

  useEffect(() => {
    loadPendingApprovals()
  }, [])

  const loadPendingApprovals = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/reward-approvals')
      if (response.ok) {
        const data = await response.json()
        setApprovals(data.data)
      } else {
        throw new Error('Failed to load pending approvals')
      }
    } catch (error) {
      console.error('Failed to load pending approvals:', error)
      toast({
        title: '加载失败',
        description: '无法加载待审核奖励',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (approvalId: string, notes?: string) => {
    try {
      setProcessingId(approvalId)
      const response = await fetch('/api/admin/reward-approvals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          approvalId,
          action: 'approve',
          notes
        })
      })

      if (response.ok) {
        toast({
          title: '审核成功',
          description: '奖励已批准并发放'
        })
        setShowApproveForm(null)
        setApproveNotes('')
        loadPendingApprovals()
      } else {
        throw new Error('Failed to approve reward')
      }
    } catch (error) {
      console.error('Failed to approve reward:', error)
      toast({
        title: '审核失败',
        description: '无法批准奖励',
        variant: 'destructive'
      })
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (approvalId: string, reason: string) => {
    if (!reason.trim()) {
      toast({
        title: '拒绝失败',
        description: '请输入拒绝原因',
        variant: 'destructive'
      })
      return
    }

    try {
      setProcessingId(approvalId)
      const response = await fetch('/api/admin/reward-approvals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          approvalId,
          action: 'reject',
          reason
        })
      })

      if (response.ok) {
        toast({
          title: '审核成功',
          description: '奖励已拒绝'
        })
        setShowRejectForm(null)
        setRejectReason('')
        loadPendingApprovals()
      } else {
        throw new Error('Failed to reject reward')
      }
    } catch (error) {
      console.error('Failed to reject reward:', error)
      toast({
        title: '审核失败',
        description: '无法拒绝奖励',
        variant: 'destructive'
      })
    } finally {
      setProcessingId(null)
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date))
  }

  const getRewardTypeLabel = (type: RewardType) => {
    return rewardTypeLabels[type] || type
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">奖励审核管理</h2>
          <p className="text-gray-600 text-sm mt-1">
            共有 {approvals.length} 个待审核的奖励申请
          </p>
        </div>
        <Button 
          onClick={loadPendingApprovals}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Clock className="h-4 w-4" />
          刷新
        </Button>
      </div>

      {/* 审核列表 */}
      <div className="space-y-4">
        {approvals.map((approval) => (
          <Card key={approval.id} className="border-l-4 border-l-yellow-400">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">{approval.userName}</span>
                      <span className="text-gray-500 text-sm">({approval.userEmail})</span>
                    </div>
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                      <Clock className="h-3 w-3 mr-1" />
                      待审核
                    </Badge>
                  </div>

                  <div className="flex items-center gap-6 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Gift className="h-4 w-4" />
                      {getRewardTypeLabel(approval.rewardType)} × {approval.rewardAmount}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      申请时间: {formatDate(approval.createdAt)}
                    </span>
                  </div>

                  {approval.description && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-700">
                        <MessageSquare className="h-4 w-4 inline mr-1" />
                        {approval.description}
                      </p>
                    </div>
                  )}

                  {/* 审核表单 */}
                  {showApproveForm === approval.id && (
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <Label htmlFor={`approve-notes-${approval.id}`} className="text-green-800">
                        批准备注（可选）
                      </Label>
                      <Input
                        id={`approve-notes-${approval.id}`}
                        value={approveNotes}
                        onChange={(e) => setApproveNotes(e.target.value)}
                        placeholder="输入批准备注..."
                        className="mt-2 mb-3"
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleApprove(approval.id, approveNotes)}
                          disabled={processingId === approval.id}
                          className="bg-green-600 hover:bg-green-700"
                          size="sm"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          确认批准
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowApproveForm(null)
                            setApproveNotes('')
                          }}
                          size="sm"
                        >
                          取消
                        </Button>
                      </div>
                    </div>
                  )}

                  {showRejectForm === approval.id && (
                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                      <Label htmlFor={`reject-reason-${approval.id}`} className="text-red-800">
                        拒绝原因 *
                      </Label>
                      <Input
                        id={`reject-reason-${approval.id}`}
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="请输入拒绝原因..."
                        className="mt-2 mb-3"
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleReject(approval.id, rejectReason)}
                          disabled={processingId === approval.id || !rejectReason.trim()}
                          variant="destructive"
                          size="sm"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          确认拒绝
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowRejectForm(null)
                            setRejectReason('')
                          }}
                          size="sm"
                        >
                          取消
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 操作按钮 */}
                {showApproveForm !== approval.id && showRejectForm !== approval.id && (
                  <div className="flex gap-2 ml-4">
                    <Button
                      onClick={() => setShowApproveForm(approval.id)}
                      disabled={processingId === approval.id}
                      className="bg-green-600 hover:bg-green-700"
                      size="sm"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      批准
                    </Button>
                    <Button
                      onClick={() => setShowRejectForm(approval.id)}
                      disabled={processingId === approval.id}
                      variant="destructive"
                      size="sm"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      拒绝
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {approvals.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无待审核奖励</h3>
              <p className="text-gray-600 mb-4">所有奖励申请都已处理完成</p>
              <Button onClick={loadPendingApprovals} variant="outline">
                刷新列表
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 审核统计 */}
      {approvals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              审核提醒
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <div className="text-2xl font-bold text-yellow-700">{approvals.length}</div>
                <div className="text-sm text-yellow-600">待审核申请</div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="text-2xl font-bold text-blue-700">
                  {approvals.reduce((sum, approval) => sum + approval.rewardAmount, 0)}
                </div>
                <div className="text-sm text-blue-600">待发放奖励总量</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <div className="text-2xl font-bold text-purple-700">
                  {new Set(approvals.map(approval => approval.userId)).size}
                </div>
                <div className="text-sm text-purple-600">涉及用户数</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default RewardApprovalsManagement