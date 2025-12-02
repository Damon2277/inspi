'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import React, { useEffect, useMemo, useState } from 'react';

import { AppLayout } from '@/components/layout';

type CardType = 'visualization' | 'analogy' | 'thinking' | 'interaction';

type WorkStatus = 'draft' | 'published' | 'archived' | 'private';

type WorkVisibility = 'public' | 'unlisted' | 'private';

interface TeachingCard {
  id: string;
  type: CardType;
  title: string;
  content: string;
  explanation?: string;
  metadata?: Record<string, unknown>;
  visual?: Record<string, unknown>;
  sop?: Record<string, unknown>;
  presentation?: Record<string, unknown>;
}

interface WorkAuthorSummary {
  _id?: string;
  name?: string;
  avatar?: string | null;
}

interface WorkDetailData {
  _id: string;
  title: string;
  description?: string;
  knowledgePoint?: string;
  subject: string;
  gradeLevel: string;
  status: WorkStatus;
  visibility?: WorkVisibility;
  tags?: string[];
  cards?: TeachingCard[];
  likes?: string[];
  likesCount?: number;
  reuseCount?: number;
  views?: number;
  commentsCount?: number;
  createdAt?: string;
  updatedAt?: string;
  author?: WorkAuthorSummary;
  coverImageUrl?: string | null;
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

const CARD_TYPE_META: Record<CardType, { label: string; color: string; icon: string }> = {
  visualization: { label: '可视化卡', color: '#7c3aed', icon: '👁️' },
  analogy: { label: '类比延展卡', color: '#059669', icon: '🌟' },
  thinking: { label: '启发思考卡', color: '#ea580c', icon: '💭' },
  interaction: { label: '互动氛围卡', color: '#2563eb', icon: '🎭' },
};

const STATUS_LABELS: Record<WorkStatus, string> = {
  draft: '草稿',
  published: '已发布',
  archived: '已归档',
  private: '私有',
};

const resolveSubjectEmoji = (subject?: string) => SUBJECT_EMOJI_MAP[subject || ''] || '📚';

const formatDate = (value?: string) => {
  if (!value) {
    return '日期未知';
  }

  try {
    return new Date(value).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return value;
  }
};

export default function WorkDetailPage() {
  const params = useParams();
  const rawId = params?.id as string | string[] | undefined;
  const workId = Array.isArray(rawId) ? rawId[0] : rawId;
  const [work, setWork] = useState<WorkDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!workId) {
      setWork(null);
      setError('作品ID无效');
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const cacheKey = `work-detail-cache-${workId}`;
    let cachedWork: WorkDetailData | null = null;

    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem(cacheKey);
        cachedWork = cached ? JSON.parse(cached) : null;
        if (cachedWork) {
          setWork(cachedWork);
          setError(null);
          setLoading(false);
        }
      } catch (storageError) {
        console.warn('读取缓存作品失败', storageError);
      }
    }

    const loadFromProfileWorks = async (
      token?: string,
    ): Promise<WorkDetailData | null> => {
      if (!token) return null;
      const response = await fetch('/api/profile/works?status=all', {
        credentials: 'include',
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success || !Array.isArray(payload?.works)) {
        return null;
      }
      const matched = (payload.works as WorkDetailData[]).find((item: any) => {
        const itemId = (item as any)._id || (item as any).id;
        return itemId === workId;
      });
      return matched ? (matched as WorkDetailData) : null;
    };

    const fetchFromWorksDetail = async (token?: string) => {
      const response = await fetch(`/api/works/${workId}`, {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        signal: controller.signal,
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success || !payload?.work) {
        throw new Error(payload?.error || '加载作品失败');
      }

      return payload.work as WorkDetailData;
    };

    const loadWork = async () => {
      setLoading(!cachedWork);
      setError(null);
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

      try {
        const profileWork = await loadFromProfileWorks(token || undefined);
        if (profileWork) {
          setWork(profileWork);
          if (typeof window !== 'undefined') {
            sessionStorage.setItem(cacheKey, JSON.stringify(profileWork));
          }
          return;
        }

        const remoteWork = await fetchFromWorksDetail(token || undefined);
        setWork(remoteWork);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(cacheKey, JSON.stringify(remoteWork));
        }
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }

        if (!cachedWork) {
          setWork(null);
          setError(err instanceof Error ? err.message : '加载作品失败');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadWork();

    return () => controller.abort();
  }, [workId, reloadToken]);

  const cardList = work?.cards ?? [];
  const emoji = resolveSubjectEmoji(work?.subject);

  const resolveCardImage = (card: TeachingCard): string | null => {
    const directImage = (card.visual as any)?.imageUrl
      || (card.metadata as any)?.coverImageUrl
      || (card.metadata as any)?.imageUrl;
    if (typeof directImage === 'string' && directImage.trim()) {
      return directImage;
    }

    const structuredStages = (card.visual as any)?.structured?.stages;
    if (Array.isArray(structuredStages)) {
      const stageWithImage = structuredStages.find((stage: any) => typeof stage?.imageUrl === 'string' && stage.imageUrl.trim());
      if (stageWithImage?.imageUrl) {
        return stageWithImage.imageUrl;
      }
    }

    if (typeof work?.coverImageUrl === 'string' && work.coverImageUrl.trim()) {
      return work.coverImageUrl;
    }

    return null;
  };

  const renderCardVisual = (card: TeachingCard) => {
    const imageUrl = resolveCardImage(card);
    if (imageUrl) {
      return (
        <div
          style={{
            width: '100%',
            borderRadius: '16px',
            overflow: 'hidden',
            border: '1px solid rgba(15,23,42,0.08)',
            background: '#fafafa',
          }}
        >
          <img
            src={imageUrl}
            alt={`${card.title} 卡片视觉`}
            style={{ display: 'block', width: '100%', height: 'auto' }}
          />
        </div>
      );
    }

    return (
      <div
        style={{
          borderRadius: '16px',
          border: '1px dashed rgba(148,163,184,0.6)',
          padding: '24px',
          background: 'rgba(248,250,252,0.8)',
          color: '#475569',
          fontSize: '14px',
        }}
      >
        {card.content}
      </div>
    );
  };

  return (
    <AppLayout>
      <div style={{ background: 'linear-gradient(180deg,#eef2ff 0%,#f8fafc 40%,#ffffff 100%)', minHeight: '100vh' }}>
        <div style={{ maxWidth: '1040px', margin: '0 auto', padding: '32px 20px 80px' }}>
          <Link
            href="/profile?tab=works"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: '#6366f1',
              textDecoration: 'none',
              fontWeight: 500,
              marginBottom: '20px',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            返回我的作品
          </Link>

          {loading ? (
            <div className="modern-card" style={{ padding: '48px', textAlign: 'center' }}>
              <div className="modern-spinner" style={{ margin: '0 auto 16px' }} />
              <p style={{ color: 'var(--gray-600)' }}>正在加载作品详情...</p>
            </div>
          ) : error || !work ? (
            <div
              className="modern-card"
              style={{
                padding: '48px',
                textAlign: 'center',
                border: '1px solid rgba(248,113,113,0.4)',
                background: 'var(--gray-50)',
              }}
            >
              <div style={{ fontSize: '40px', marginBottom: '8px' }}>😕</div>
              <h2 style={{ marginBottom: '12px', color: 'var(--gray-900)' }}>无法加载作品详情</h2>
              <p style={{ color: 'var(--gray-600)', marginBottom: '24px' }}>{error || '作品不存在或已被删除'}</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                <button
                  type="button"
                  className="modern-btn modern-btn-primary"
                  onClick={() => setReloadToken(prev => prev + 1)}
                >
                  重试
                </button>
                <Link href="/create" className="modern-btn modern-btn-outline">
                  去创作新作品
                </Link>
              </div>
            </div>
          ) : (
            <section>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
                <div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                    <span className="work-chip work-chip--subject">{work?.subject}</span>
                    <span className="work-chip work-chip--grade">{work?.gradeLevel}</span>
                    {work?.knowledgePoint ? (
                      <span className="work-chip" style={{ background: '#e0f2fe', color: '#0369a1' }}>
                        知识点 {work.knowledgePoint}
                      </span>
                    ) : null}
                    {work?.tags?.map(tag => (
                      <span key={`${work?._id}-tag-${tag}`} className="work-chip work-chip--tag">
                        #{tag}
                      </span>
                    ))}
                  </div>
                  <h1 style={{ fontSize: '30px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>{work?.title}</h1>
                </div>
                {work?._id ? (
                  <Link
                    href={`/create?edit=${work._id}`}
                    className="modern-btn modern-btn-secondary"
                    style={{ whiteSpace: 'nowrap', alignSelf: 'flex-start' }}
                  >
                    继续编辑
                  </Link>
                ) : null}
              </div>

              <div style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>教学卡片 · 共 {cardList.length} 张</div>

              {cardList.length === 0 ? (
                <div
                  style={{
                    padding: '48px 24px',
                    borderRadius: '24px',
                    border: '1px dashed rgba(148,163,184,0.7)',
                    textAlign: 'center',
                    color: '#94a3b8',
                  }}
                >
                  该作品还没有生成教学卡片。
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                  {cardList.map(card => {
                    const meta = CARD_TYPE_META[card.type] ?? CARD_TYPE_META.visualization;
                    return (
                      <article
                        key={card.id}
                        style={{
                          borderRadius: '32px',
                          background: '#fff',
                          padding: '32px',
                          boxShadow: '0 22px 60px rgba(15,23,42,0.08)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '20px',
                        }}
                      >
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 14px',
                              borderRadius: '999px',
                              background: `${meta.color}15`,
                              color: meta.color,
                              fontSize: '13px',
                              fontWeight: 500,
                            }}
                          >
                            {meta.icon} {meta.label}
                          </span>
                          {card.metadata?.knowledgePoint ? (
                            <span style={{ color: '#94a3b8', fontSize: '13px' }}>{card.metadata.knowledgePoint}</span>
                          ) : null}
                        </div>

                        {renderCardVisual(card)}

                        <div>
                          <h3 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '12px', color: '#0f172a' }}>{card.title}</h3>
                          <p style={{ color: '#475569', whiteSpace: 'pre-line', lineHeight: 1.8 }}>{card.content}</p>
                          {card.explanation ? (
                            <p style={{ marginTop: '12px', color: '#4f46e5', whiteSpace: 'pre-line' }}>{card.explanation}</p>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
