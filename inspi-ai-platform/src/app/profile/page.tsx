'use client';

import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import React, { useEffect, useMemo, useState, Suspense } from 'react';

import { AppLayout } from '@/components/layout';
import { AccountSettingsPanel } from '@/components/profile/AccountSettingsPanel';
import { SquareQuickReuseButton } from '@/components/square/SquareQuickReuseButton';
import { useUser } from '@/contexts/UserContext';
import { mockSquareWorks } from '@/data/mockSquareWorks';
import { useAuth } from '@/shared/hooks/useAuth';
import { useReuseState } from '@/shared/hooks/useReuseState';

import { SubscriptionManagement } from '@/components/subscription/SubscriptionManagement';

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

const TAB_KEYS: TabKey[] = ['works', 'subscription', 'feedback', 'settings'];

const isTabKey = (value: string | null): value is TabKey => {
  return value !== null && TAB_KEYS.includes(value as TabKey);
};

function ProfileContent() {
  const { user } = useUser();
  const { user: authUser } = useAuth();
  const { reusedThemes } = useReuseState(authUser?._id);

  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const upgradeParam = searchParams.get('upgrade');

  const [activeTab, setActiveTab] = useState<TabKey>(() => (
    isTabKey(tabParam) ? tabParam : 'works'
  ));
  const [hoveredTab, setHoveredTab] = useState<TabKey | null>(null);
  const shouldAutoUpgrade = upgradeParam === '1' || upgradeParam?.toLowerCase() === 'true';
  const [autoOpenModal, setAutoOpenModal] = useState<boolean>(() => (
    shouldAutoUpgrade && (!isTabKey(tabParam) || tabParam === 'subscription')
  ));

  useEffect(() => {
    if (isTabKey(tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam, activeTab]);

  useEffect(() => {
    if (shouldAutoUpgrade && activeTab !== 'subscription') {
      setActiveTab('subscription');
    }
  }, [shouldAutoUpgrade, activeTab]);

  useEffect(() => {
    if (shouldAutoUpgrade) {
      setAutoOpenModal(true);
    } else {
      setAutoOpenModal(false);
    }
  }, [shouldAutoUpgrade]);

  useEffect(() => {
    if (autoOpenModal) {
      const timer = window.setTimeout(() => setAutoOpenModal(false), 0);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [autoOpenModal]);

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
    const isDraft = work.status === 'draft';
    const isPrivate = work.status === 'private';
    const sourceThemeId = work.reuseSourceId ?? parseInt(work.id.replace('reused-', ''), 10);

    return (
      <article
        key={work.id}
        className="work-card"
        onClick={() => handleWorkClick(work)}
      >
        <div className="work-card__header">
          <span className="work-card__emoji">{work.thumbnail}</span>
          <div className="work-card__chips">
            <span className="work-chip work-chip--subject">{work.subject}</span>
            <span className="work-chip work-chip--grade">{work.grade}</span>
            {(isReused || isDraft || isPrivate) && (
              <div className="work-card__status-group">
                {isReused && (
                  <span className="work-chip work-chip--status work-chip--status-reused">复用</span>
                )}
                {isDraft && (
                  <span className="work-chip work-chip--status work-chip--status-draft">草稿</span>
                )}
                {isPrivate && (
                  <span className="work-chip work-chip--status work-chip--status-private">私有</span>
                )}
              </div>
            )}
          </div>
        </div>
        <h3 className="work-card__title">{work.title}</h3>
        {work.description ? (
          <p className="work-card__description text-clamp-3">{work.description}</p>
        ) : null}
        {work.tags && work.tags.length > 0 ? (
          <div className="work-card__tags">
            {work.tags.map((tag, index) => (
              <span key={`${work.id}-tag-${index}`} className="work-chip work-chip--tag">
                #{tag}
              </span>
            ))}
          </div>
        ) : null}
        <div className="work-card__footer">
          <div className="work-card__stats">
            <span className="work-card__stat">
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span>{work.likes}</span>
            </span>
            <span className="work-card__stat">
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>{work.uses}</span>
            </span>
          </div>
          {isReused && !Number.isNaN(sourceThemeId) ? (
            <div className="work-card__actions" onClick={event => event.stopPropagation()}>
              <SquareQuickReuseButton
                themeId={sourceThemeId}
                themeTitle={work.title}
                reusedLabel="来自复用"
              />
            </div>
          ) : null}
        </div>
      </article>
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
        <SubscriptionManagement variant="embedded" autoOpenModal={autoOpenModal} />
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
        <div className="modern-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '0 32px' }}>
          <div
            style={{
              display: 'flex',
              gap: '16px',
              borderBottom: '1px solid var(--gray-200)',
              background: '#fff',
              padding: '0 12px',
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
                  <div className="work-card-grid">
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
