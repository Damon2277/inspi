'use client';

import Image from 'next/image';
import React, { useMemo, useState, lazy, Suspense } from 'react';

import { AppLayout } from '@/components/layout';
import { AccountSettingsPanel } from '@/components/profile/AccountSettingsPanel';
import { SquareQuickReuseButton } from '@/components/square/SquareQuickReuseButton';
import { useUser } from '@/contexts/UserContext';
import { mockSquareWorks } from '@/data/mockSquareWorks';
import { useAuth } from '@/shared/hooks/useAuth';
import { useReuseState } from '@/shared/hooks/useReuseState';

// Lazy load the subscription component for better performance
const SubscriptionManagement = lazy(() =>
  import('@/components/subscription/SubscriptionManagementOptimized').then((module) => ({
    default: module.SubscriptionManagementOptimized,
  })),
);

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
  description?: string;
  tags?: string[];
  reuseSourceId?: number;
}

type TabKey = 'works' | 'subscription' | 'feedback' | 'settings';

function ProfileContent() {
  const { user } = useUser();
  const { user: authUser } = useAuth();
  const { reusedThemes } = useReuseState(authUser?._id);

  const [activeTab, setActiveTab] = useState<TabKey>('works');
  const [hoveredTab, setHoveredTab] = useState<TabKey | null>(null);

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
        description: '通过动态图像展示二次函数的变化规律，帮助学生掌握抛物线的重要特征。',
        tags: ['函数', '图像', '性质'],
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
        description: '结合实际案例梳理三角函数的核心公式与求解思路，强化解题直觉。',
        tags: ['三角函数', '应用', '建模'],
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
        description: '以模型拆解和小组讨论带学生走进立体几何世界，掌握空间想象技巧。',
        tags: ['立体几何', '空间思维'],
      },
    ],
    [],
  );

  const reusedThemeWorks = useMemo<UserWork[]>(
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
        description: work.description,
        tags: work.tags,
      })),
    [reusedThemes],
  );

  const combinedWorks = useMemo(
    () => [...reusedThemeWorks, ...baseWorks],
    [baseWorks, reusedThemeWorks],
  );

  const displayWorks = useMemo(
    () => combinedWorks.filter(work => work.status === 'published' || work.status === 'reused'),
    [combinedWorks],
  );

  const handleWorkClick = (work: UserWork) => {
    if (work.status === 'reused') {
      const targetId = work.reuseSourceId ?? work.id;
      window.location.href = `/square/${targetId}`;
      return;
    }

    if (work.status === 'draft') {
      window.location.href = `/create?edit=${work.id}`;
      return;
    }

    window.location.href = `/case/${work.id}`;
  };

  const renderWorkCard = (work: UserWork) => {
    const isReused = work.status === 'reused';
    const sourceThemeId = work.reuseSourceId ?? parseInt(work.id.replace('reused-', ''), 10);

    return (
      <div
        key={work.id}
        className="modern-card modern-card-elevated group"
        style={{
          cursor: 'pointer',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.3s ease',
          border: '1px solid transparent',
        }}
        onMouseEnter={(event) => {
          event.currentTarget.style.transform = 'translateY(-4px)';
          event.currentTarget.style.boxShadow = '0 12px 24px rgba(15, 23, 42, 0.12)';
          event.currentTarget.style.borderColor = 'var(--primary-200)';
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.transform = 'translateY(0)';
          event.currentTarget.style.boxShadow = '';
          event.currentTarget.style.borderColor = 'transparent';
        }}
        onClick={() => handleWorkClick(work)}
      >
        <div className="modern-card-body" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              marginBottom: '16px',
              gap: '12px',
            }}
          >
            <div style={{ fontSize: 'var(--font-size-3xl)', lineHeight: 1 }}>{work.thumbnail}</div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flex: 1, justifyContent: 'flex-end' }}>
              <span style={{
                padding: '5px 10px',
                background: '#fef3c7',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                color: '#92400e',
                fontWeight: 500,
              }}>
                {work.subject}
              </span>
              <span style={{
                padding: '5px 10px',
                background: '#e0f2fe',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                color: '#075985',
                fontWeight: 500,
              }}>
                {work.grade}
              </span>
              {isReused ? (
                <span
                  title="复用自其他教师"
                  style={{
                    padding: '5px 10px',
                    background: 'var(--primary-100)',
                    color: 'var(--primary-700)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12px',
                    fontWeight: 500,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  ↺ 复用
                </span>
              ) : null}
            </div>
          </div>

          <h3 style={{
            fontSize: '18px',
            fontWeight: 600,
            color: 'var(--gray-900)',
            marginBottom: '8px',
            lineHeight: 1.3,
          }}>
            {work.title}
          </h3>

          {work.description ? (
            <p
              style={{
                color: 'var(--gray-600)',
                fontSize: '14px',
                marginBottom: '16px',
                lineHeight: 1.6,
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {work.description}
            </p>
          ) : null}

          {work.tags && work.tags.length > 0 ? (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px',
              marginBottom: '16px',
            }}>
              {work.tags.map((tag, index) => (
                <span
                  key={index}
                  style={{
                    padding: '4px 10px',
                    background: 'transparent',
                    color: 'var(--primary-600)',
                    fontSize: '12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--primary-300)',
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}

          <div style={{ marginTop: 'auto' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              paddingTop: '16px',
              borderTop: '1px solid var(--gray-200)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '18px', color: 'var(--gray-500)', fontSize: '14px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ strokeWidth: 1.5 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <span style={{ fontWeight: 500 }}>{work.likes}</span>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ strokeWidth: 1.5 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span style={{ fontWeight: 500 }}>{work.uses}</span>
                </span>
              </div>

              {isReused && !Number.isNaN(sourceThemeId) ? (
                <SquareQuickReuseButton
                  themeId={sourceThemeId}
                  themeTitle={work.title}
                  reusedLabel="来自复用"
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const worksTabCount = displayWorks.length;

  const renderSubscriptionTab = () => (
    <div className="modern-card" style={{ padding: '32px', minHeight: '400px' }}>
      <Suspense
        fallback={(
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '320px',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  border: '4px solid rgba(37, 99, 235, 0.2)',
                  borderTop: '4px solid rgb(37, 99, 235)',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 16px',
                }}
              />
              <p style={{ color: 'var(--gray-600)', fontSize: '14px' }}>加载订阅信息...</p>
            </div>
          </div>
        )}
      >
        <SubscriptionManagement variant="embedded" />
      </Suspense>
    </div>
  );

  const renderFeedbackTab = () => (
    <div className="modern-grid modern-grid-2" style={{ gap: '24px' }}>
      <div className="modern-card" style={{ padding: '28px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--gray-900)', marginBottom: '12px' }}>产品反馈</h3>
        <p style={{ fontSize: '14px', color: 'var(--gray-600)', lineHeight: 1.7, marginBottom: '20px' }}>
          在下方留言板填写您的建议、问题或教学灵感，我们会在双周迭代中优先处理高频需求。
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <textarea
            placeholder="请输入您想反馈的内容（支持 Markdown 简写）"
            rows={6}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--gray-200)',
              fontSize: '14px',
              lineHeight: 1.6,
              resize: 'vertical',
            }}
          />
          <button className="modern-btn modern-btn-primary" style={{ alignSelf: 'flex-end', fontSize: '14px' }}>
            提交留言
          </button>
        </div>
      </div>

      <div className="modern-card" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--gray-900)', marginBottom: '12px' }}>社群共创</h3>
          <p style={{ fontSize: '14px', color: 'var(--gray-600)', lineHeight: 1.7 }}>
            扫码加入官方共创社群，提前体验新能力、共建课堂案例，与产品团队持续交流。
          </p>
        </div>
        <div style={{
          borderRadius: 'var(--radius-xl)',
          border: '1px dashed var(--gray-300)',
          padding: '20px',
          background: 'var(--gray-50)',
          display: 'flex',
          justifyContent: 'center',
        }}>
          <Image
            src="/feedback/wechat-community-qrcode.png"
            alt="加入 Inspi 共创社群"
            width={180}
            height={180}
            style={{ borderRadius: 'var(--radius-lg)' }}
            priority
          />
        </div>
        <p style={{ fontSize: '12px', color: 'var(--gray-500)', textAlign: 'center' }}>
          长按或扫描上方二维码，添加小助手并备注“共创”
        </p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
      <section style={{ padding: '40px 0 80px', background: 'var(--gray-50)' }}>
        <div className="modern-container" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div
            style={{
              display: 'flex',
              gap: '32px',
              borderBottom: '2px solid var(--gray-200)',
              background: '#fff',
              padding: '0 24px',
              borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
            }}
          >
            {([
              { key: 'works', label: '作品', count: worksTabCount },
              { key: 'subscription', label: '订阅', count: 0 },
              { key: 'feedback', label: '反馈', count: 0 },
              { key: 'settings', label: '设置', count: 0 },
            ] as Array<{ key: TabKey; label: string; count: number }>).map((tab) => {
              const isActive = activeTab === tab.key;
              const isHovered = hoveredTab === tab.key;

              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  onMouseEnter={() => setHoveredTab(tab.key)}
                  onMouseLeave={() => setHoveredTab(null)}
                  style={{
                    padding: '16px 20px',
                    fontSize: '15px',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? 'var(--primary-600)' : isHovered ? 'var(--gray-900)' : 'var(--gray-600)',
                    borderTop: 'none',
                    borderLeft: 'none',
                    borderRight: 'none',
                    borderBottom: isActive ? '3px solid var(--primary-600)' : '3px solid transparent',
                    background: 'transparent',
                    borderRadius: '0',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    marginBottom: '-2px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    position: 'relative',
                  }}
                >
                  <span>{tab.label}</span>
                  {tab.count > 0 ? (
                    <span style={{
                      fontSize: '12px',
                      padding: '2px 6px',
                      background: isActive ? 'var(--primary-100)' : 'var(--gray-100)',
                      color: isActive ? 'var(--primary-700)' : 'var(--gray-600)',
                      borderRadius: '10px',
                      fontWeight: '500',
                      marginLeft: '2px',
                    }}>{tab.count}</span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {(() => {
            if (activeTab === 'works') {
              return (
                <>
                  <div className="modern-grid modern-grid-3" style={{ gap: '20px' }}>
                    {displayWorks.map(renderWorkCard)}
                  </div>
                  {displayWorks.length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      padding: '80px 20px',
                      color: 'var(--gray-500)',
                      background: '#fff',
                      borderRadius: 'var(--radius-lg)',
                      border: '1px dashed var(--gray-200)',
                    }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
                      <h3 style={{ fontSize: '18px', marginBottom: '8px', color: 'var(--gray-800)' }}>还没有发布的作品</h3>
                      <p style={{ marginBottom: '24px' }}>开始创作你的第一个教学魔法吧！</p>
                      <a href="/create" className="modern-btn modern-btn-primary">
                        开始创作
                      </a>
                    </div>
                  ) : null}
                </>
              );
            }

            if (activeTab === 'subscription') {
              return renderSubscriptionTab();
            }

            if (activeTab === 'feedback') {
              return renderFeedbackTab();
            }

            return <AccountSettingsPanel variant="embedded" mode="profile-only" />;
          })()}
        </div>
      </section>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <AppLayout>
      <ProfileContent />
    </AppLayout>
  );
}
