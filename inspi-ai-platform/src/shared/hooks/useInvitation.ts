/**
 * 邀请管理相关的自定义Hook
 */

import { useState, useEffect } from 'react';

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

export const useInvitation = (userId: string) => {
  const [inviteCode, setInviteCode] = useState<InviteCode | null>(null);
  const [inviteStats, setInviteStats] = useState<InviteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const { toast } = useToast();

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
        return data.data;
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
      return;
    } finally {
      setGenerating(false);
    }
  };

  const recordShareEvent = async (platform: string) => {
    if (!inviteCode) return;

    try {
      await fetch('/api/invite/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inviteCodeId: inviteCode.id,
          platform,
          userId,
        }),
      });
    } catch (error) {
      console.error('Failed to record share event:', error);
    }
  };

  useEffect(() => {
    if (userId) {
      loadInvitationData();
    }
  }, [userId]);

  return {
    inviteCode,
    inviteStats,
    loading,
    generating,
    loadInvitationData,
    generateNewInviteCode,
    recordShareEvent,
  };
};
