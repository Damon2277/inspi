'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import React, { useEffect, useMemo, useState } from 'react';

import { GeneratedCard } from '@/components/cards/GeneratedCard';
import { AppLayout } from '@/components/layout';
import type { TeachingCard } from '@/shared/types/teaching';

type WorkStatus = 'draft' | 'published' | 'archived' | 'private';

type WorkVisibility = 'public' | 'unlisted' | 'private';

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

const STATUS_LABELS: Record<WorkStatus, string> = {
  draft: '草稿',
  published: '已发布',
  archived: '已归档',
  private: '私有',
};

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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
                <div style={{ flex: 1, minWidth: '0' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: '12px' }}>
                    <h1 style={{ fontSize: '30px', fontWeight: 700, color: '#0f172a', margin: 0 }}>{work?.title}</h1>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <span className="work-chip work-chip--subject">{work?.subject}</span>
                      <span className="work-chip work-chip--grade">{work?.gradeLevel}</span>
                      {work?.tags?.map(tag => (
                        <span key={`${work?._id}-tag-${tag}`} className="work-chip work-chip--tag">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                {work?._id ? (
                  <Link
                    href={`/create?edit=${work._id}`}
                    className="modern-btn modern-btn-secondary"
                    style={{ whiteSpace: 'nowrap', alignSelf: 'flex-end' }}
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
                  {cardList.map(card => (
                    <GeneratedCard key={card.id} card={card} enableEditing={false} />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
