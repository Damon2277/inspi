/**
 * 邀请管理页面
 * 实现邀请码展示和生成界面、分享按钮和分享弹窗、二维码显示功能、邀请链接复制功能
 */

'use client';

import {
  Copy,
  Share2,
  QrCode,
  RefreshCw,
  Users,
  Gift,
  TrendingUp,
  Calendar,
  ExternalLink,
  Check,
  X,
} from 'lucide-react';
import QRCode from 'qrcode';
import React, { useState, useEffect } from 'react';

import { Badge } from '@/shared/components/badge';
import { Button } from '@/shared/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/card';
import { Input } from '@/shared/components/input';
import { Separator } from '@/shared/components/separator';
import { useToast } from '@/shared/hooks/use-toast';


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
  icon: string
  color: string
  available: boolean
}

interface InvitationManagementProps {
  userId: string
}

const InvitationManagement: React.FC<InvitationManagementProps> = ({ userId }) => {
  const [inviteCode, setInviteCode] = useState<InviteCode | null>(null);
  const [inviteStats, setInviteStats] = useState<InviteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});

  const { toast } = useToast();

  const sharePlatforms: SharePlatform[] = [
    { id: 'wechat', name: '微信', icon: '💬', color: 'bg-green-500', available: true },
    { id: 'qq', name: 'QQ', icon: '🐧', color: 'bg-blue-500', available: true },
    { id: 'dingtalk', name: '钉钉', icon: '📱', color: 'bg-blue-600', available: true },
    { id: 'wework', name: '企业微信', icon: '💼', color: 'bg-green-600', available: true },
    { id: 'email', name: '邮件', icon: '📧', color: 'bg-red-500', available: true },
    { id: 'link', name: '复制链接', icon: '🔗', color: 'bg-gray-500', available: true },
  ];

  useEffect(() => {
    loadInvitationData();
  }, [userId]);

  const loadInvitationData = async () => {
    try {
      setLoading(true);

      // 获取邀请码信息
      const inviteResponse = await fetch(`/api/invite/user/${userId}`);
      if (inviteResponse.ok) {
        const inviteData = await inviteResponse.json();
        setInviteCode(inviteData.data);
      }

      // 获取邀请统计
      const statsResponse = await fetch(`/api/invite/stats/${userId}`);
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setInviteStats(statsData.data);
      }
    } catch (error) {
      console.error('Failed to load invitation data:', error);
      toast({
        title: '加载失败',
        description: '无法加载邀请数据，请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const generateNewInviteCode = async () => {
    try {
      setGenerating(true);

      const response = await fetch('/api/invite/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        const data = await response.json();
        setInviteCode(data.data);
        toast({
          title: '生成成功',
          description: '新的邀请码已生成',
        });
      } else {
        throw new Error('Failed to generate invite code');
      }
    } catch (error) {
      console.error('Failed to generate invite code:', error);
      toast({
        title: '生成失败',
        description: '无法生成邀请码，请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates({ ...copiedStates, [type]: true });

      toast({
        title: '复制成功',
        description: `${type}已复制到剪贴板`,
      });

      // 重置复制状态
      setTimeout(() => {
        setCopiedStates({ ...copiedStates, [type]: false });
      }, 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast({
        title: '复制失败',
        description: '无法复制到剪贴板',
        variant: 'destructive',
      });
    }
  };

  const generateQRCode = async () => {
    if (!inviteCode) return;

    try {
      const qrCodeDataUrl = await QRCode.toDataURL(inviteCode.inviteLink, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      setQrCodeDataUrl(qrCodeDataUrl);
      setShowQRCode(true);
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      toast({
        title: '生成失败',
        description: '无法生成二维码',
        variant: 'destructive',
      });
    }
  };

  const handleShare = async (platform: SharePlatform) => {
    if (!inviteCode) return;

    try {
      const shareData = {
        title: '邀请您使用 Inspi.AI',
        text: `我在使用 Inspi.AI 创作，邀请您一起体验！使用我的邀请码 ${inviteCode.code} 注册，我们都能获得额外的AI生成次数！`,
        url: inviteCode.inviteLink,
      };

      switch (platform.id) {
        case 'wechat':
          // 微信分享逻辑
          if (typeof window !== 'undefined' && (window as any).wx) {
            (window as any).wx.ready(() => {
              (window as any).wx.onMenuShareAppMessage({
                title: shareData.title,
                desc: shareData.text,
                link: shareData.url,
              });
            });
          } else {
            // 降级到复制链接
            await copyToClipboard(inviteCode.inviteLink, '邀请链接');
          }
          break;

        case 'qq':
          // QQ分享逻辑
          const qqUrl = `https://connect.qq.com/widget/shareqq/index.html?url=${encodeURIComponent(shareData.url)}&title=${encodeURIComponent(shareData.title)}&desc=${encodeURIComponent(shareData.text)}`;
          window.open(qqUrl, '_blank');
          break;

        case 'email':
          // 邮件分享
          const emailUrl = `mailto:?subject=${encodeURIComponent(shareData.title)}&body=${encodeURIComponent(shareData.text + '\n\n' + shareData.url)}`;
          window.location.href = emailUrl;
          break;

        case 'link':
          // 复制链接
          await copyToClipboard(inviteCode.inviteLink, '邀请链接');
          break;

        default:
          // 其他平台暂时复制链接
          await copyToClipboard(inviteCode.inviteLink, '邀请链接');
          break;
      }

      setShowShareModal(false);

      // 记录分享事件
      await fetch('/api/invite/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inviteCodeId: inviteCode.id,
          platform: platform.id,
          userId,
        }),
      });

    } catch (error) {
      console.error('Failed to share:', error);
      toast({
        title: '分享失败',
        description: '无法分享邀请链接',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const getStatusBadge = (isActive: boolean, expiresAt: Date) => {
    const now = new Date();
    const expired = new Date(expiresAt) < now;

    if (!isActive) {
      return <Badge variant="secondary">已停用</Badge>;
    }
    if (expired) {
      return <Badge variant="destructive">已过期</Badge>;
    }
    return <Badge variant="default" className="bg-green-500">有效</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">邀请管理</h1>
        <Button
          onClick={generateNewInviteCode}
          disabled={generating}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
          {generating ? '生成中...' : '生成新邀请码'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 邀请码信息卡片 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              我的邀请码
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {inviteCode ? (
              <>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="text-2xl font-mono font-bold text-blue-600">
                      {inviteCode.code}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {getStatusBadge(inviteCode.isActive, inviteCode.expiresAt)}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(inviteCode.code, '邀请码')}
                    className="flex items-center gap-2"
                  >
                    {copiedStates['邀请码'] ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    复制
                  </Button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">使用次数</span>
                    <span className="font-medium">
                      {inviteCode.usageCount} / {inviteCode.maxUsage}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">创建时间</span>
                    <span className="font-medium">
                      {formatDate(inviteCode.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">过期时间</span>
                    <span className="font-medium">
                      {formatDate(inviteCode.expiresAt)}
                    </span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">邀请链接</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(inviteCode.inviteLink, '邀请链接')}
                      className="flex items-center gap-2"
                    >
                      {copiedStates['邀请链接'] ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      复制链接
                    </Button>
                  </div>

                  <Input
                    value={inviteCode.inviteLink}
                    readOnly
                    className="text-xs bg-gray-50"
                  />

                  <div className="flex gap-2">
                    <Button
                      onClick={() => setShowShareModal(true)}
                      className="flex-1 flex items-center gap-2"
                    >
                      <Share2 className="h-4 w-4" />
                      分享邀请
                    </Button>
                    <Button
                      variant="outline"
                      onClick={generateQRCode}
                      className="flex items-center gap-2"
                    >
                      <QrCode className="h-4 w-4" />
                      二维码
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">您还没有邀请码</p>
                <Button onClick={generateNewInviteCode} disabled={generating}>
                  {generating ? '生成中...' : '生成邀请码'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 邀请统计卡片 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              邀请统计
            </CardTitle>
          </CardHeader>
          <CardContent>
            {inviteStats ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {inviteStats.totalInvites}
                  </div>
                  <div className="text-sm text-gray-600">总邀请数</div>
                </div>

                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {inviteStats.successfulRegistrations}
                  </div>
                  <div className="text-sm text-gray-600">成功注册</div>
                </div>

                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {inviteStats.activeInvitees}
                  </div>
                  <div className="text-sm text-gray-600">活跃用户</div>
                </div>

                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {inviteStats.totalRewardsEarned}
                  </div>
                  <div className="text-sm text-gray-600">获得奖励</div>
                </div>

                <div className="col-span-2 text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-xl font-bold text-gray-700">
                    {(inviteStats.conversionRate * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">转化率</div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">暂无统计数据</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 分享弹窗 */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">分享邀请</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowShareModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {sharePlatforms.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => handleShare(platform)}
                  disabled={!platform.available}
                  className={`
                    flex flex-col items-center p-4 rounded-lg border-2 border-transparent
                    hover:border-blue-200 hover:bg-blue-50 transition-colors
                    ${!platform.available ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  <div className={`w-12 h-12 rounded-full ${platform.color} flex items-center justify-center text-white text-xl mb-2`}>
                    {platform.icon}
                  </div>
                  <span className="text-sm font-medium">{platform.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 二维码弹窗 */}
      {showQRCode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">邀请二维码</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowQRCode(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="text-center">
              {qrCodeDataUrl && (
                <img
                  src={qrCodeDataUrl}
                  alt="邀请二维码"
                  className="mx-auto mb-4 border rounded-lg"
                />
              )}
              <p className="text-sm text-gray-600 mb-4">
                扫描二维码或分享给朋友
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.download = `invite-qr-${inviteCode?.code}.png`;
                    link.href = qrCodeDataUrl;
                    link.click();
                  }}
                  className="flex-1"
                >
                  下载二维码
                </Button>
                <Button
                  onClick={() => copyToClipboard(inviteCode?.inviteLink || '', '邀请链接')}
                  className="flex-1"
                >
                  复制链接
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvitationManagement;
