/**
 * 移动端邀请管理组件
 * 优化移动端邀请分享体验、二维码扫描、通知展示、统计数据展示
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MobileCard } from '@/components/mobile/MobileCard'
import { useResponsive } from '@/hooks/useResponsive'
import { 
  Copy, 
  Share2, 
  QrCode, 
  RefreshCw, 
  Users, 
  Gift,
  TrendingUp,
  Check,
  X,
  Download,
  Camera,
  Smartphone,
  MessageCircle,
  Mail,
  ExternalLink
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import QRCode from 'qrcode'

interface InviteCode {
  id: string
  code: string
  inviterId: string
  createdAt: Date
  expiresAt: Date
  isActive: boolean
  usageCount: number
  maxUsage: number
  inviteLink: string
}

interface InviteStats {
  totalInvites: number
  successfulRegistrations: number
  activeInvitees: number
  totalRewardsEarned: number
  conversionRate: number
}

interface SharePlatform {
  id: string
  name: string
  icon: React.ReactNode
  color: string
  available: boolean
  description: string
}

interface MobileInvitationManagementProps {
  userId: string
}

const MobileInvitationManagement: React.FC<MobileInvitationManagementProps> = ({ userId }) => {
  const [inviteCode, setInviteCode] = useState<InviteCode | null>(null)
  const [inviteStats, setInviteStats] = useState<InviteStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [showQRCode, setShowQRCode] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('')
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({})
  const [showFullStats, setShowFullStats] = useState(false)
  
  const { isMobile, isTablet } = useResponsive()
  const { toast } = useToast()

  const sharePlatforms: SharePlatform[] = [
    { 
      id: 'wechat', 
      name: '微信', 
      icon: <MessageCircle className="h-6 w-6" />, 
      color: 'bg-green-500', 
      available: true,
      description: '分享到微信好友或朋友圈'
    },
    { 
      id: 'qq', 
      name: 'QQ', 
      icon: <MessageCircle className="h-6 w-6" />, 
      color: 'bg-blue-500', 
      available: true,
      description: '分享到QQ好友或空间'
    },
    { 
      id: 'dingtalk', 
      name: '钉钉', 
      icon: <Smartphone className="h-6 w-6" />, 
      color: 'bg-blue-600', 
      available: true,
      description: '分享到钉钉工作群'
    },
    { 
      id: 'wework', 
      name: '企业微信', 
      icon: <MessageCircle className="h-6 w-6" />, 
      color: 'bg-green-600', 
      available: true,
      description: '分享到企业微信'
    },
    { 
      id: 'email', 
      name: '邮件', 
      icon: <Mail className="h-6 w-6" />, 
      color: 'bg-red-500', 
      available: true,
      description: '通过邮件发送邀请'
    },
    { 
      id: 'link', 
      name: '复制链接', 
      icon: <Copy className="h-6 w-6" />, 
      color: 'bg-gray-500', 
      available: true,
      description: '复制邀请链接到剪贴板'
    }
  ]

  useEffect(() => {
    loadInvitationData()
  }, [userId])

  const loadInvitationData = async () => {
    try {
      setLoading(true)
      
      // 获取邀请码信息
      const inviteResponse = await fetch(`/api/invite/user/${userId}`)
      if (inviteResponse.ok) {
        const inviteData = await inviteResponse.json()
        setInviteCode(inviteData.data)
      }

      // 获取邀请统计
      const statsResponse = await fetch(`/api/invite/stats/${userId}`)
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setInviteStats(statsData.data)
      }
    } catch (error) {
      console.error('Failed to load invitation data:', error)
      toast({
        title: '加载失败',
        description: '无法加载邀请数据，请稍后重试',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const generateNewInviteCode = async () => {
    try {
      setGenerating(true)
      
      const response = await fetch('/api/invite/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      })

      if (response.ok) {
        const data = await response.json()
        setInviteCode(data.data)
        toast({
          title: '生成成功',
          description: '新的邀请码已生成'
        })
      } else {
        throw new Error('Failed to generate invite code')
      }
    } catch (error) {
      console.error('Failed to generate invite code:', error)
      toast({
        title: '生成失败',
        description: '无法生成邀请码，请稍后重试',
        variant: 'destructive'
      })
    } finally {
      setGenerating(false)
    }
  }

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedStates(prev => ({ ...prev, [type]: true }))
      
      toast({
        title: '复制成功',
        description: `${type}已复制到剪贴板`
      })

      // 重置复制状态
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [type]: false }))
      }, 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      toast({
        title: '复制失败',
        description: '无法复制到剪贴板',
        variant: 'destructive'
      })
    }
  }

  const generateQRCode = async () => {
    if (!inviteCode) return

    try {
      const qrCodeDataUrl = await QRCode.toDataURL(inviteCode.inviteLink, {
        width: isMobile ? 280 : 320,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      
      setQrCodeDataUrl(qrCodeDataUrl)
      setShowQRCode(true)
    } catch (error) {
      console.error('Failed to generate QR code:', error)
      toast({
        title: '生成失败',
        description: '无法生成二维码',
        variant: 'destructive'
      })
    }
  }

  const handleShare = async (platform: SharePlatform) => {
    if (!inviteCode) return

    try {
      const shareData = {
        title: '邀请您使用 Inspi.AI',
        text: `我在使用 Inspi.AI 创作，邀请您一起体验！使用我的邀请码 ${inviteCode.code} 注册，我们都能获得额外的AI生成次数！`,
        url: inviteCode.inviteLink
      }

      // 移动端优先使用原生分享API
      if (isMobile && navigator.share && platform.id === 'native') {
        await navigator.share(shareData)
      } else {
        switch (platform.id) {
          case 'wechat':
            // 微信分享逻辑
            if (typeof window !== 'undefined' && (window as any).wx) {
              (window as any).wx.ready(() => {
                (window as any).wx.onMenuShareAppMessage({
                  title: shareData.title,
                  desc: shareData.text,
                  link: shareData.url
                })
              })
            } else {
              await copyToClipboard(inviteCode.inviteLink, '邀请链接')
            }
            break

          case 'qq':
            const qqUrl = `https://connect.qq.com/widget/shareqq/index.html?url=${encodeURIComponent(shareData.url)}&title=${encodeURIComponent(shareData.title)}&desc=${encodeURIComponent(shareData.text)}`
            window.open(qqUrl, '_blank')
            break

          case 'email':
            const emailUrl = `mailto:?subject=${encodeURIComponent(shareData.title)}&body=${encodeURIComponent(shareData.text + '\n\n' + shareData.url)}`
            window.location.href = emailUrl
            break

          case 'link':
            await copyToClipboard(inviteCode.inviteLink, '邀请链接')
            break

          default:
            await copyToClipboard(inviteCode.inviteLink, '邀请链接')
            break
        }
      }

      setShowShareModal(false)
      
      // 记录分享事件
      await fetch('/api/invite/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inviteCodeId: inviteCode.id,
          platform: platform.id,
          userId
        })
      })

    } catch (error) {
      console.error('Failed to share:', error)
      toast({
        title: '分享失败',
        description: '无法分享邀请链接',
        variant: 'destructive'
      })
    }
  }

  const downloadQRCode = () => {
    if (!qrCodeDataUrl || !inviteCode) return

    const link = document.createElement('a')
    link.download = `invite-qr-${inviteCode.code}.png`
    link.href = qrCodeDataUrl
    link.click()

    toast({
      title: '下载成功',
      description: '二维码已保存到相册'
    })
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date))
  }

  const getStatusBadge = (isActive: boolean, expiresAt: Date) => {
    const now = new Date()
    const expired = new Date(expiresAt) < now

    if (!isActive) {
      return <Badge variant="secondary" className="text-xs">已停用</Badge>
    }
    if (expired) {
      return <Badge variant="destructive" className="text-xs">已过期</Badge>
    }
    return <Badge className="bg-green-500 text-xs">有效</Badge>
  }

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-32 bg-gray-200 rounded-lg"></div>
            <div className="h-24 bg-gray-200 rounded-lg"></div>
            <div className="h-20 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 pb-20">
      {/* 页面标题 */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">邀请好友</h1>
        <p className="text-gray-600 text-sm">分享邀请码，一起获得奖励</p>
      </div>

      {/* 邀请码卡片 */}
      <MobileCard className="text-center">
        {inviteCode ? (
          <div className="space-y-4">
            {/* 邀请码显示 */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
              <div className="text-3xl font-mono font-bold text-blue-600 mb-2">
                {inviteCode.code}
              </div>
              <div className="flex items-center justify-center gap-2 mb-2">
                {getStatusBadge(inviteCode.isActive, inviteCode.expiresAt)}
                <span className="text-xs text-gray-500">
                  {inviteCode.usageCount}/{inviteCode.maxUsage} 已使用
                </span>
              </div>
              <div className="text-xs text-gray-500">
                过期时间: {formatDate(inviteCode.expiresAt)}
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => copyToClipboard(inviteCode.code, '邀请码')}
                variant="outline"
                className="flex items-center gap-2 h-12"
              >
                {copiedStates['邀请码'] ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                <span className="text-sm">复制邀请码</span>
              </Button>
              
              <Button
                onClick={() => setShowShareModal(true)}
                className="flex items-center gap-2 h-12"
              >
                <Share2 className="h-4 w-4" />
                <span className="text-sm">分享邀请</span>
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={generateQRCode}
                variant="outline"
                className="flex items-center gap-2 h-12"
              >
                <QrCode className="h-4 w-4" />
                <span className="text-sm">生成二维码</span>
              </Button>
              
              <Button
                onClick={() => copyToClipboard(inviteCode.inviteLink, '邀请链接')}
                variant="outline"
                className="flex items-center gap-2 h-12"
              >
                {copiedStates['邀请链接'] ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
                <span className="text-sm">复制链接</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-8">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">您还没有邀请码</p>
            <Button 
              onClick={generateNewInviteCode} 
              disabled={generating}
              className="w-full h-12"
            >
              {generating ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Gift className="h-4 w-4 mr-2" />
              )}
              {generating ? '生成中...' : '生成邀请码'}
            </Button>
          </div>
        )}
      </MobileCard>

      {/* 邀请统计 */}
      {inviteStats && (
        <MobileCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              邀请统计
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFullStats(!showFullStats)}
              className="text-xs"
            >
              {showFullStats ? '收起' : '展开'}
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-xl font-bold text-blue-600">
                {inviteStats.totalInvites}
              </div>
              <div className="text-xs text-gray-600">总邀请数</div>
            </div>
            
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-xl font-bold text-green-600">
                {inviteStats.successfulRegistrations}
              </div>
              <div className="text-xs text-gray-600">成功注册</div>
            </div>
            
            {showFullStats && (
              <>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-xl font-bold text-purple-600">
                    {inviteStats.activeInvitees}
                  </div>
                  <div className="text-xs text-gray-600">活跃用户</div>
                </div>
                
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <div className="text-xl font-bold text-orange-600">
                    {inviteStats.totalRewardsEarned}
                  </div>
                  <div className="text-xs text-gray-600">获得奖励</div>
                </div>
              </>
            )}
          </div>
          
          {showFullStats && (
            <div className="mt-4 text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-lg font-bold text-gray-700">
                {(inviteStats.conversionRate * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-gray-600">转化率</div>
            </div>
          )}
        </MobileCard>
      )}

      {/* 刷新按钮 */}
      <div className="text-center">
        <Button
          onClick={generateNewInviteCode}
          disabled={generating}
          variant="outline"
          className="w-full h-12"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
          {generating ? '生成中...' : '生成新邀请码'}
        </Button>
      </div>

      {/* 分享弹窗 */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-2xl w-full max-w-md mx-4 animate-slide-up">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">分享邀请</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowShareModal(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
              {sharePlatforms.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => handleShare(platform)}
                  disabled={!platform.available}
                  className={`
                    w-full flex items-center gap-4 p-4 rounded-lg border-2 border-transparent
                    hover:border-blue-200 hover:bg-blue-50 transition-colors text-left
                    ${!platform.available ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  <div className={`w-12 h-12 rounded-full ${platform.color} flex items-center justify-center text-white`}>
                    {platform.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{platform.name}</div>
                    <div className="text-sm text-gray-500">{platform.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 二维码弹窗 */}
      {showQRCode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm animate-scale-in">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">邀请二维码</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowQRCode(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-6 text-center">
              {qrCodeDataUrl && (
                <div className="mb-4">
                  <img
                    src={qrCodeDataUrl}
                    alt="邀请二维码"
                    className="mx-auto border rounded-lg shadow-sm"
                  />
                </div>
              )}
              <p className="text-sm text-gray-600 mb-4">
                扫描二维码或保存分享给朋友
              </p>
              <div className="space-y-3">
                <Button
                  onClick={downloadQRCode}
                  className="w-full h-12 flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  保存到相册
                </Button>
                <Button
                  onClick={() => copyToClipboard(inviteCode?.inviteLink || '', '邀请链接')}
                  variant="outline"
                  className="w-full h-12 flex items-center gap-2"
                >
                  <Copy className="h-4 w-4" />
                  复制链接
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MobileInvitationManagement