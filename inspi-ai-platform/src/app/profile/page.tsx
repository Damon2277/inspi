'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/MockAuthProvider';
import { GlassCard, Button } from '@/components/ui';
import Link from 'next/link';

interface UserStats {
  worksCount: number;
  publishedCount: number;
  draftCount: number;
  totalViews: number;
  totalLikes: number;
  joinDate: string;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedDate?: string;
}

export default function ProfilePage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'stats' | 'achievements'>('overview');

  useEffect(() => {
    if (!authLoading) {
      loadProfileData();
    }
  }, [authLoading]);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      
      // 模拟API调用延迟
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 模拟用户统计数据
      const mockStats: UserStats = {
        worksCount: 12,
        publishedCount: 8,
        draftCount: 4,
        totalViews: 1250,
        totalLikes: 89,
        joinDate: '2024-01-15'
      };

      // 模拟成就数据
      const mockAchievements: Achievement[] = [
        {
          id: '1',
          title: '初出茅庐',
          description: '创建第一个教学作品',
          icon: '🌱',
          earned: true,
          earnedDate: '2024-01-20'
        },
        {
          id: '2',
          title: '勤奋创作者',
          description: '创建10个教学作品',
          icon: '✍️',
          earned: true,
          earnedDate: '2024-08-15'
        },
        {
          id: '3',
          title: '受欢迎的老师',
          description: '作品获得100次点赞',
          icon: '❤️',
          earned: false
        },
        {
          id: '4',
          title: '知识分享者',
          description: '作品被复用50次',
          icon: '🔄',
          earned: false
        }
      ];

      setStats(mockStats);
      setAchievements(mockAchievements);
    } catch (error) {
      console.error('加载个人资料失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <GlassCard className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="heading-2 mb-2">加载中...</h2>
          <p className="body-text">正在加载个人资料</p>
        </GlassCard>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <GlassCard className="text-center py-12 max-w-md mx-auto">
          <h2 className="heading-2 mb-4">需要登录</h2>
          <p className="body-text mb-6">请登录后访问个人中心</p>
          <Link href="/">
            <Button variant="primary">返回首页</Button>
          </Link>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <section className="container section-padding">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8 fade-in-up">
            <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl text-white font-bold">
                {user?.name?.charAt(0) || '👤'}
              </span>
            </div>
            <h1 className="heading-1 gradient-text mb-2">{user?.name || '用户'}</h1>
            <p className="body-text">{user?.email}</p>
            <p className="text-sm text-gray-500 mt-2">
              加入时间: {stats ? new Date(stats.joinDate).toLocaleDateString() : '2024年1月'}
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex justify-center mb-8 fade-in-up stagger-1">
            <div className="flex space-x-1 bg-white/50 backdrop-blur-sm rounded-lg p-1">
              {[
                { key: 'overview', label: '概览', icon: '📊' },
                { key: 'stats', label: '统计', icon: '📈' },
                { key: 'achievements', label: '成就', icon: '🏆' }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <GlassCard className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="body-text">加载数据中...</p>
            </GlassCard>
          ) : (
            <div className="fade-in-up stagger-2">
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* 作品统计 */}
                  <GlassCard>
                    <div className="text-center">
                      <div className="text-3xl mb-2">📚</div>
                      <h3 className="heading-3 mb-2">我的作品</h3>
                      <div className="text-2xl font-bold text-blue-600 mb-2">
                        {stats?.worksCount || 0}
                      </div>
                      <p className="text-sm text-gray-600">
                        已发布 {stats?.publishedCount || 0} • 草稿 {stats?.draftCount || 0}
                      </p>
                      <Link href="/works" className="mt-4 inline-block">
                        <Button variant="secondary" size="small">查看作品</Button>
                      </Link>
                    </div>
                  </GlassCard>

                  {/* 互动统计 */}
                  <GlassCard>
                    <div className="text-center">
                      <div className="text-3xl mb-2">👀</div>
                      <h3 className="heading-3 mb-2">作品浏览</h3>
                      <div className="text-2xl font-bold text-green-600 mb-2">
                        {stats?.totalViews || 0}
                      </div>
                      <p className="text-sm text-gray-600">
                        获得 {stats?.totalLikes || 0} 个点赞
                      </p>
                    </div>
                  </GlassCard>

                  {/* 快速操作 */}
                  <GlassCard>
                    <div className="text-center">
                      <div className="text-3xl mb-2">✨</div>
                      <h3 className="heading-3 mb-2">快速操作</h3>
                      <div className="space-y-2">
                        <Link href="/create">
                          <Button variant="primary" size="small" className="w-full">
                            创建新作品
                          </Button>
                        </Link>
                        <Link href="/square">
                          <Button variant="secondary" size="small" className="w-full">
                            浏览广场
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </GlassCard>
                </div>
              )}

              {activeTab === 'stats' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <GlassCard>
                    <h3 className="heading-3 mb-4">📈 创作统计</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">总作品数</span>
                        <span className="font-semibold">{stats?.worksCount || 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">已发布</span>
                        <span className="font-semibold text-green-600">{stats?.publishedCount || 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">草稿</span>
                        <span className="font-semibold text-yellow-600">{stats?.draftCount || 0}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ 
                            width: `${stats ? (stats.publishedCount / stats.worksCount) * 100 : 0}%` 
                          }}
                        ></div>
                      </div>
                      <p className="text-sm text-gray-500">
                        发布率: {stats ? Math.round((stats.publishedCount / stats.worksCount) * 100) : 0}%
                      </p>
                    </div>
                  </GlassCard>

                  <GlassCard>
                    <h3 className="heading-3 mb-4">💫 影响力统计</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">总浏览量</span>
                        <span className="font-semibold">{stats?.totalViews || 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">获得点赞</span>
                        <span className="font-semibold text-red-500">{stats?.totalLikes || 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">平均点赞率</span>
                        <span className="font-semibold">
                          {stats && stats.totalViews > 0 
                            ? Math.round((stats.totalLikes / stats.totalViews) * 100) 
                            : 0}%
                        </span>
                      </div>
                    </div>
                  </GlassCard>
                </div>
              )}

              {activeTab === 'achievements' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {achievements.map((achievement, index) => (
                    <GlassCard key={achievement.id} className={`fade-in-up stagger-${index + 1}`}>
                      <div className="flex items-start space-x-4">
                        <div className={`text-3xl ${achievement.earned ? '' : 'grayscale opacity-50'}`}>
                          {achievement.icon}
                        </div>
                        <div className="flex-1">
                          <h3 className={`heading-3 mb-2 ${achievement.earned ? 'text-gray-900' : 'text-gray-500'}`}>
                            {achievement.title}
                          </h3>
                          <p className={`text-sm mb-2 ${achievement.earned ? 'text-gray-600' : 'text-gray-400'}`}>
                            {achievement.description}
                          </p>
                          {achievement.earned ? (
                            <div className="flex items-center space-x-2">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                ✓ 已获得
                              </span>
                              {achievement.earnedDate && (
                                <span className="text-xs text-gray-500">
                                  {new Date(achievement.earnedDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              🔒 未解锁
                            </span>
                          )}
                        </div>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}