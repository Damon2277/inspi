'use client';

import Link from 'next/link';
import React, { useMemo, useState } from 'react';

import { AppLayout } from '@/components/layout';
import { useUser } from '@/contexts/UserContext';
import { mockSquareWorks } from '@/data/mockSquareWorks';
import { useAuth } from '@/shared/hooks/useAuth';
import { useReuseState } from '@/shared/hooks/useReuseState';

// 用户作品接口
interface UserWork {
  id: string;
  title: string;
  type: string;
  subject: string;
  grade: string;
  thumbnail: string;
  likes: number;
  uses: number;
  createdAt: string;
  status: 'published' | 'draft' | 'private' | 'reused';
  reuseSourceId?: number;
}

// 将个人资料页面内容提取到单独的组件中
function ProfileContent() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<'works' | 'drafts' | 'liked'>('works');

  const { user: authUser } = useAuth();
  const { reusedThemes, unmarkThemeReused } = useReuseState(authUser?._id);

  // 模拟用户作品数据
  const baseWorks = useMemo<UserWork[]>(
    () => [
      {
        id: '1',
        title: '二次函数的图像与性质',
        type: '可视化卡',
        subject: '数学',
        grade: '高中',
        thumbnail: '📊',
        likes: 45,
        uses: 23,
        createdAt: '2024-01-15',
        status: 'published',
      },
      {
        id: '2',
        title: '三角函数的应用',
        type: '类比延展卡',
        subject: '数学',
        grade: '高中',
        thumbnail: '📐',
        likes: 32,
        uses: 18,
        createdAt: '2024-01-12',
        status: 'published',
      },
      {
        id: '3',
        title: '立体几何入门',
        type: '互动氛围卡',
        subject: '数学',
        grade: '高中',
        thumbnail: '🔺',
        likes: 28,
        uses: 15,
        createdAt: '2024-01-10',
        status: 'draft',
      },
    ],
    [],
  );

  const reusedWorks = useMemo<UserWork[]>(
    () => reusedThemes
      .map(themeId => mockSquareWorks.find(work => work.id === themeId))
      .filter((work): work is typeof mockSquareWorks[number] => Boolean(work))
      .map((work) => ({
        id: `reused-${work.id}`,
        title: work.title,
        type: '致敬复用卡',
        subject: work.subject,
        grade: work.grade,
        thumbnail: work.thumbnail,
        likes: work.likes,
        uses: work.reuses + 1,
        createdAt: new Date().toISOString(),
        status: 'reused' as const,
        reuseSourceId: work.id,
      })),
    [reusedThemes],
  );

  const combinedWorks = useMemo(() => [...reusedWorks, ...baseWorks], [baseWorks, reusedWorks]);
  const publishedOrReusedWorks = useMemo(
    () => combinedWorks.filter(work => work.status === 'published' || work.status === 'reused'),
    [combinedWorks],
  );
  const draftsWorks = useMemo(
    () => combinedWorks.filter(work => work.status === 'draft'),
    [combinedWorks],
  );

  const handleTabChange = (tab: 'works' | 'drafts' | 'liked') => {
    setActiveTab(tab);
  };

  const handleWorkClick = (work: UserWork) => {
    if (work.status === 'published') {
      window.location.href = `/case/${work.id}`;
      return;
    }

    if (work.status === 'draft') {
      window.location.href = `/create?edit=${work.id}`;
      return;
    }

    if (work.status === 'reused') {
      const targetId = work.reuseSourceId ?? work.id;
      window.location.href = `/square/${targetId}`;
      return;
    }

    window.location.href = `/case/${work.id}`;
  };

  const handleCancelReuse = (event: React.MouseEvent, work: UserWork) => {
    event.stopPropagation();
    if (!work.reuseSourceId) return;
    unmarkThemeReused(work.reuseSourceId);
  };

  const filteredWorks = useMemo(() => {
    if (activeTab === 'works') {
      return publishedOrReusedWorks;
    }

    if (activeTab === 'drafts') {
      return draftsWorks;
    }

    return combinedWorks;
  }, [activeTab, combinedWorks, draftsWorks, publishedOrReusedWorks]);

  const worksTabCount = publishedOrReusedWorks.length;
  const draftsTabCount = draftsWorks.length;
  const likedTabCount = combinedWorks.length;

  return (
    <div className="modern-layout">
      {/* 个人资料页面 */}
      <section style={{ padding: '40px 0 80px', background: 'var(--gray-50)' }}>
        <div className="modern-container">
          <div style={{ display: 'flex', gap: '32px' }}>
            {/* 左侧和中间区域 - 作品展示 */}
            <div style={{ flex: 1 }}>
              {/* 标签页导航 */}
              <div style={{ marginBottom: '32px' }}>
                <div style={{
                  display: 'flex',
                  gap: '32px',
                  borderBottom: '2px solid var(--gray-200)',
                  background: 'white',
                  padding: '0 24px',
                  borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
                }}>
                  {[
                    { key: 'works', label: '我的作品', count: worksTabCount },
                    { key: 'drafts', label: '草稿箱', count: draftsTabCount },
                    { key: 'liked', label: '我的收藏', count: likedTabCount },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => handleTabChange(tab.key as any)}
                      style={{
                        padding: '20px 0',
                        fontSize: '16px',
                        fontWeight: '600',
                        color: activeTab === tab.key ? 'var(--primary-600)' : 'var(--gray-600)',
                        borderBottom: activeTab === tab.key ? '2px solid var(--primary-600)' : '2px solid transparent',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all var(--transition-base)',
                        marginBottom: '-2px',
                      }}
                    >
                      {tab.label} ({tab.count})
                    </button>
                  ))}
                </div>
              </div>

              {/* 作品网格 */}
              <div className="modern-grid modern-grid-3" style={{ gap: '20px' }}>
                {filteredWorks.map((work) => {
                  const statusConfig = (() => {
                    if (work.status === 'published') {
                      return {
                        label: '已发布',
                        background: 'var(--success-100)',
                        color: 'var(--success-700)',
                      };
                    }

                    if (work.status === 'reused') {
                      return {
                        label: '已复用',
                        background: 'var(--primary-100)',
                        color: 'var(--primary-700)',
                      };
                    }

                    return {
                      label: '草稿',
                      background: 'var(--gray-100)',
                      color: 'var(--gray-600)',
                    };
                  })();

                  return (
                    <div
                      key={work.id}
                      className="modern-card modern-card-elevated case-card"
                      onClick={() => handleWorkClick(work)}
                      style={{
                        cursor: 'pointer',
                        transition: 'all var(--transition-base)',
                      }}
                    >
                      <div className="modern-card-body">
                        <div style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          marginBottom: '16px',
                        }}>
                          <div style={{ fontSize: '48px' }}>{work.thumbnail}</div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <span style={{
                              padding: '4px 8px',
                              background: 'var(--primary-100)',
                              color: 'var(--primary-700)',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '12px',
                              fontWeight: '500',
                            }}>
                              {work.subject}
                            </span>
                            <span style={{
                              padding: '4px 8px',
                              background: statusConfig.background,
                              color: statusConfig.color,
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '12px',
                              fontWeight: '500',
                            }}>
                              {statusConfig.label}
                            </span>
                          </div>
                        </div>

                        <h3 style={{
                          fontSize: '18px',
                          fontWeight: '600',
                          color: 'var(--gray-900)',
                          marginBottom: '8px',
                          lineHeight: '1.3',
                        }}>
                          {work.title}
                        </h3>

                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingTop: '16px',
                          borderTop: '1px solid var(--gray-200)',
                        }}>
                          <div style={{
                            fontSize: '14px',
                            color: 'var(--gray-500)',
                          }}>
                            {new Date(work.createdAt).toLocaleDateString('zh-CN')}
                          </div>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            fontSize: '14px',
                            color: 'var(--gray-500)',
                          }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              ❤️ {work.likes}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              🔄 {work.uses}
                            </span>
                            {work.status === 'reused' ? (
                              <button
                                type="button"
                                className="modern-btn modern-btn-ghost modern-btn-sm"
                                onClick={(event) => handleCancelReuse(event, work)}
                              >
                                取消复用
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 空状态 */}
              {filteredWorks.length === 0 && (
                <div style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  color: 'var(--gray-500)',
                  background: 'white',
                  borderRadius: 'var(--radius-lg)',
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
                  <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>
                    {activeTab === 'works' && '还没有发布的作品'}
                    {activeTab === 'drafts' && '草稿箱是空的'}
                    {activeTab === 'liked' && '还没有收藏的作品'}
                  </h3>
                  <p style={{ marginBottom: '24px' }}>
                    {activeTab === 'works' && '开始创作你的第一个教学魔法吧！'}
                    {activeTab === 'drafts' && '创作的灵感都会保存在这里'}
                    {activeTab === 'liked' && '发现喜欢的作品就收藏起来吧'}
                  </p>
                  <Link href="/create" className="modern-btn modern-btn-primary">
                    开始创作
                  </Link>
                </div>
              )}
            </div>

            {/* 右侧区域 - 用户信息 */}
            <div style={{ width: '320px' }}>
              <div className="modern-card modern-card-elevated" style={{ marginBottom: '24px' }}>
                <div className="modern-card-body" style={{ padding: '32px' }}>
                  {/* 头像和基本信息 */}
                  <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <div style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      background: 'var(--gradient-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '36px',
                      margin: '0 auto 16px',
                    }}>
                      {user.avatar}
                    </div>
                    <h1 style={{
                      fontSize: '24px',
                      fontWeight: '700',
                      color: 'var(--gray-900)',
                      marginBottom: '8px',
                    }}>
                      {user.name}
                    </h1>
                    <span style={{
                      padding: '4px 12px',
                      background: 'var(--gradient-primary)',
                      color: 'white',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '12px',
                      fontWeight: '600',
                      display: 'inline-block',
                      marginBottom: '16px',
                    }}>
                      {user.level} 用户
                    </span>
                    <p style={{
                      color: 'var(--gray-700)',
                      lineHeight: '1.6',
                      fontSize: '14px',
                      marginBottom: '16px',
                    }}>
                      {user.bio}
                    </p>
                    <p style={{
                      color: 'var(--gray-500)',
                      fontSize: '12px',
                    }}>
                      {user.email}
                    </p>
                  </div>

                  {/* 数据统计 */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '16px',
                    padding: '20px 0',
                    borderTop: '1px solid var(--gray-200)',
                    borderBottom: '1px solid var(--gray-200)',
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        fontSize: '24px',
                        fontWeight: '700',
                        color: 'var(--primary-600)',
                        marginBottom: '4px',
                      }}>
                        {user.stats.works}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--gray-600)' }}>作品</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        fontSize: '24px',
                        fontWeight: '700',
                        color: 'var(--primary-600)',
                        marginBottom: '4px',
                      }}>
                        {user.stats.reuses}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--gray-600)' }}>复用</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        fontSize: '24px',
                        fontWeight: '700',
                        color: 'var(--primary-600)',
                        marginBottom: '4px',
                      }}>
                        {user.stats.likes}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--gray-600)' }}>点赞</div>
                    </div>
                  </div>

                  {/* 加入时间 */}
                  <div style={{
                    textAlign: 'center',
                    marginTop: '20px',
                    color: 'var(--gray-500)',
                    fontSize: '12px',
                  }}>
                    加入于 {new Date(user.joinDate).toLocaleDateString('zh-CN')}
                  </div>
                </div>
              </div>

              {/* 账户设置按钮 */}
              <Link
                href="/settings"
                className="modern-btn modern-btn-outline"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  padding: '12px',
                  fontSize: '14px',
                }}
              >
                ⚙️ 账户设置
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/**
 * 现代化桌面端个人资料页面
 * 左侧作品展示，右侧用户信息
 */
export default function ProfilePage() {
  return (
    <AppLayout>
      <ProfileContent />
    </AppLayout>
  );
}
