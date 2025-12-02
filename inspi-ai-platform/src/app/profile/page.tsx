'use client';

import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import React, { useEffect, useMemo, useState, Suspense } from 'react';

import { AppLayout } from '@/components/layout';
import { AccountSettingsPanel } from '@/components/profile/AccountSettingsPanel';
import { SquareQuickReuseButton } from '@/components/square/SquareQuickReuseButton';
import { SubscriptionManagement } from '@/components/subscription/SubscriptionManagement';
import { useUser } from '@/contexts/UserContext';
import { mockSquareWorks } from '@/data/mockSquareWorks';
import { useAuth } from '@/shared/hooks/useAuth';
import { useReuseState } from '@/shared/hooks/useReuseState';

type ProfileTeachingCard = {
  id: string;
  type: string;
  title?: string;
  content?: string;
  visual?: {
    imageUrl?: string;
    structured?: {
      stages?: Array<{ imageUrl?: string }>;
    };
  };
};

interface UserWork {
  id: string;
  title: string;
  type: string;
  subject: string;
  grade: string;
  thumbnail: string;
  coverImage?: string | null;
  cards?: ProfileTeachingCard[];
  likes: number;
  uses: number;
  createdAt: string;
  status: 'published' | 'draft' | 'private' | 'reused' | 'archived';
  description?: string;
  tags?: string[];
  reuseSourceId?: number;
}

const SUBJECT_EMOJI_MAP: Record<string, string> = {
  数学: '📐',
  语文: '📖',
  英语: '🗣️',
  物理: '⚙️',
  化学: '⚗️',
  生物: '🧬',
  历史: '🏺',
  地理: '🗺️',
  政治: '🏛️',
  音乐: '🎵',
  美术: '🎨',
  体育: '🏀',
};

const resolveSubjectEmoji = (subject?: string) => SUBJECT_EMOJI_MAP[subject || ''] || '📚';

const readCachedWork = (workId: string): any | null => {
  if (typeof window === 'undefined') return null;
  try {
    const cached = sessionStorage.getItem(`work-detail-cache-${workId}`);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
};

const extractCoverImage = (work: any): string | null => {
  const cardsSource = Array.isArray(work.cards) ? work.cards : readCachedWork(work._id || work.id)?.cards;
  const cards: any[] = Array.isArray(cardsSource) ? cardsSource : [];
  for (const card of cards) {
    if (card?.visual?.imageUrl) return card.visual.imageUrl;
    const stages = card?.visual?.structured?.stages;
    if (Array.isArray(stages)) {
      const stageWithImage = stages.find((stage: any) => stage?.imageUrl);
      if (stageWithImage?.imageUrl) return stageWithImage.imageUrl;
    }
  }
  return null;
};

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
  const [serverWorks, setServerWorks] = useState<UserWork[]>([]);
  const [worksLoading, setWorksLoading] = useState(false);
  const [worksError, setWorksError] = useState<string | null>(null);
  const [worksReloadToken, setWorksReloadToken] = useState(0);
  const [hoveredWorkId, setHoveredWorkId] = useState<string | null>(null);
  const [coverImages, setCoverImages] = useState<Record<string, string>>({});

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

  useEffect(() => {
    if (!authUser?._id) {
      setServerWorks([]);
      return;
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!token) {
      setServerWorks([]);
      setWorksError('登录状态已失效，请重新登录后重试');
      return;
    }

    const controller = new AbortController();
    setWorksLoading(true);
    setWorksError(null);

    fetch('/api/profile/works?status=all', {
      method: 'GET',
      credentials: 'include',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json();
        if (response.status === 401) {
          throw new Error('登录状态已过期，请重新登录');
        }
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error || '加载作品失败');
        }
        const mapped: UserWork[] = (payload.works || []).map((work: any) => ({
          id: work._id || work.id,
          title: work.title || '未命名作品',
          type: '教学作品',
          subject: work.subject || '通用学科',
          grade: work.gradeLevel || '通用年级',
          thumbnail: resolveSubjectEmoji(work.subject),
          coverImage: work.coverImageUrl || extractCoverImage(work),
          cards: work.cards,
          likes: work.likesCount || 0,
          uses: work.reuseCount || 0,
          createdAt: work.createdAt || new Date().toISOString(),
          status: (work.status || 'draft') as UserWork['status'],
          description: work.description,
          tags: work.tags || [],
        }));
        setServerWorks(mapped);
        setCoverImages(prev => {
          const next = { ...prev };
          mapped.forEach(work => {
            if (work.coverImage) {
              next[work.id] = work.coverImage;
            }
          });
          return next;
        });
        if (typeof window !== 'undefined') {
          try {
            (payload.works || []).forEach((work: any) => {
              const workId = work._id || work.id;
              if (!workId) return;
              sessionStorage.setItem(`work-detail-cache-${workId}`, JSON.stringify(work));
            });
          } catch (storageError) {
            console.warn('缓存作品详情失败', storageError);
          }
        }
        setWorksLoading(false);
      })
      .catch(error => {
        if (controller.signal.aborted) return;
        setWorksError(error instanceof Error ? error.message : '加载作品失败');
        setWorksLoading(false);
      });

    return () => controller.abort();
  }, [authUser?._id, worksReloadToken]);

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
    () => [...reusedThemeWorks, ...serverWorks],
    [reusedThemeWorks, serverWorks],
  );

  const displayWorks = useMemo(
    () => combinedWorks.filter(work => work.status !== 'archived'),
    [combinedWorks],
  );

  useEffect(() => {
    const missing = displayWorks.filter(work => !coverImages[work.id]);
    if (missing.length === 0) return;

    let cancelled = false;
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

    missing.forEach((work) => {
      fetch(`/api/works/${work.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: 'include',
      })
        .then(response => response.json())
        .then(payload => {
          if (cancelled) return;
          if (!payload?.success || !payload?.work?.cards) return;
          const image = extractCoverImage(payload.work);
          if (image) {
            setCoverImages(prev => ({ ...prev, [work.id]: image }));
          }
        })
        .catch(() => {});
    });

    return () => {
      cancelled = true;
    };
  }, [displayWorks, coverImages]);

  const handleDeleteWork = async (event: React.MouseEvent, workId: string) => {
    event.stopPropagation();
    if (!window.confirm('确定要删除这条作品吗？此操作不可恢复。')) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/works/${workId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: 'include',
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || '删除失败，请稍后再试');
      }

      setServerWorks(prev => prev.filter(work => work.id !== workId));
    } catch (error) {
      alert(error instanceof Error ? error.message : '删除失败，请稍后再试');
    }
  };

  const handleWorkClick = (work: UserWork) => {
    window.location.href = `/works/${work.id}`;
  };

  const renderDeleteButton = (workId: string) => (
    <button
      type="button"
      onClick={event => handleDeleteWork(event, workId)}
      aria-label="删除作品"
      style={{
        border: '1px solid rgba(148,163,184,0.4)',
        background: '#fff',
        borderRadius: '999px',
        padding: '4px',
        cursor: 'pointer',
        color: '#94a3b8',
        opacity: hoveredWorkId === workId ? 1 : 0,
        transition: 'opacity 0.2s ease',
      }}
      className="work-card__delete"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 7h12" />
        <path d="M9 7v9" />
        <path d="M15 7v9" />
        <path d="M4 7h16" />
        <path d="M10 3h4" />
        <path d="M5 7l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12" />
      </svg>
    </button>
  );

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
        style={{ position: 'relative' }}
        onMouseEnter={() => setHoveredWorkId(work.id)}
        onMouseLeave={() => setHoveredWorkId(prev => (prev === work.id ? null : prev))}
      >
        <div className="work-card__header" style={{ alignItems: 'flex-start', gap: '12px' }}>
          {coverImages[work.id] ? (
            <span className="work-card__emoji" style={{ width: '56px', height: '56px', borderRadius: '12px', overflow: 'hidden', padding: 0 }}>
              <img src={coverImages[work.id]} alt={work.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </span>
          ) : work.coverImage ? (
            <span className="work-card__emoji" style={{ width: '56px', height: '56px', borderRadius: '12px', overflow: 'hidden', padding: 0 }}>
              <img src={work.coverImage} alt={work.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </span>
          ) : (
            <span className="work-card__emoji">{work.thumbnail}</span>
          )}
          <div className="work-card__chips" style={{ flex: 1 }}>
            <span className="work-chip work-chip--subject">{work.subject}</span>
            <span className="work-chip work-chip--grade">{work.grade}</span>
            {(isReused || isPrivate) && (
              <div className="work-card__status-group">
                {isReused && (
                  <span className="work-chip work-chip--status work-chip--status-reused">复用</span>
                )}
                {isPrivate && (
                  <span className="work-chip work-chip--status work-chip--status-private">私有</span>
                )}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {renderDeleteButton(work.id)}
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
                  {worksLoading ? (
                    <div className="modern-card" style={{ padding: '40px', textAlign: 'center' }}>
                      <div className="modern-spinner" style={{ margin: '0 auto 12px' }} />
                      <p style={{ color: 'var(--gray-600)' }}>正在加载作品...</p>
                    </div>
                  ) : worksError ? (
                    <div className="modern-card" style={{ padding: '32px', textAlign: 'center', border: '1px solid rgba(248,113,113,0.4)' }}>
                      <p style={{ color: '#b91c1c', marginBottom: '12px' }}>{worksError}</p>
                      <button
                        type="button"
                        className="modern-btn modern-btn-primary"
                        onClick={() => {
                          setWorksReloadToken(prev => prev + 1);
                        }}
                      >
                        重试
                      </button>
                    </div>
                  ) : displayWorks.length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      padding: '80px 20px',
                      color: 'var(--gray-500)',
                      background: '#fff',
                      borderRadius: 'var(--radius-lg)',
                      border: '1px dashed var(--gray-200)',
                    }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
                      <h3 style={{ fontSize: '18px', marginBottom: '8px', color: 'var(--gray-800)' }}>还没有作品</h3>
                      <p style={{ marginBottom: '24px' }}>生成教学卡片后，可一键保存到这里。</p>
                      <a href="/create" className="modern-btn modern-btn-primary">
                        立即创作
                      </a>
                    </div>
                  ) : (
                    <div className="work-card-grid">
                      {displayWorks.map(renderWorkCard)}
                    </div>
                  )}
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
