'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import React from 'react';

import { AppLayout } from '@/components/layout';
import { useToast } from '@/shared/hooks';

interface CaseItem {
  id: number;
  title: string;
  author: string;
  subject: string;
  grade: string;
  description: string;
  thumbnail: string;
  likes: number;
  uses: number;
  rating: number;
  tags: string[];
  content?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function CaseDetailPage() {
  const params = useParams();
  const caseId = params.id as string;
  const { toast } = useToast();

  const getCaseDetail = (id: string): CaseItem | null => {
    const mockCases: CaseItem[] = [
      {
        id: 1,
        title: '二次函数的图像与性质',
        author: '张老师',
        subject: '数学',
        grade: '高中',
        description: '通过动态图像展示二次函数的变化规律，帮助学生掌握抛物线的重要特征。',
        thumbnail: '📊',
        likes: 156,
        uses: 89,
        rating: 4.8,
        tags: ['函数', '图像', '可视化'],
        content: '# 二次函数的图像与性质\n\n## 教学目标\n1. 理解二次函数的概念和基本形式\n2. 掌握二次函数图像的特点\n3. 能够分析二次函数的性质',
        createdAt: '2024-01-15',
        updatedAt: '2024-01-16',
      },
      {
        id: 2,
        title: '古诗词意境赏析',
        author: '李老师',
        subject: '语文',
        grade: '初中',
        description: '结合古诗词的创作背景，引导学生感受诗人的情感世界，提升鉴赏能力。',
        thumbnail: '📜',
        likes: 234,
        uses: 156,
        rating: 4.9,
        tags: ['古诗词', '意境', '赏析'],
        content: '# 古诗词意境赏析\n\n## 教学目标\n1. 理解古诗词的意境美\n2. 掌握赏析古诗词的方法\n3. 提升文学鉴赏能力',
        createdAt: '2024-01-14',
        updatedAt: '2024-01-15',
      },
      {
        id: 3,
        title: '化学反应速率实验',
        author: '王老师',
        subject: '化学',
        grade: '高中',
        description: '通过实验现象和理论分析，帮助学生掌握化学反应速率的影响因素。',
        thumbnail: '⚗️',
        likes: 123,
        uses: 67,
        rating: 4.7,
        tags: ['化学反应', '实验', '速率'],
        content: '# 化学反应速率实验\n\n## 实验目标\n1. 观察化学反应速率的影响因素\n2. 理解反应速率的概念\n3. 掌握实验操作技能',
        createdAt: '2024-01-13',
        updatedAt: '2024-01-14',
      },
    ];

    return mockCases.find(item => item.id === parseInt(id, 10)) || null;
  };

  const caseDetail = getCaseDetail(caseId);

  const handleLike = () => {
    toast({
      title: '功能开发中',
      description: '点赞功能即将上线，敬请期待。',
    });
  };

  const handleFavorite = () => {
    toast({
      title: '功能开发中',
      description: '收藏功能正在筹备中。',
    });
  };

  const handleShare = async () => {
    const shareData = {
      title: caseDetail?.title ?? '教学案例',
      text: caseDetail?.description ?? '来自 Inspi 的教学案例分享',
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    };

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: shareData.title, text: shareData.text, url: shareData.url });
        toast({ title: '分享成功', description: '感谢分享，让更多老师看到这个案例。' });
      } catch (error) {
        if ((error as DOMException)?.name !== 'AbortError') {
          toast({ title: '分享失败', description: '请稍后重试或复制链接分享。', variant: 'destructive' });
        }
      }
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard && shareData.url) {
      try {
        await navigator.clipboard.writeText(shareData.url);
        toast({ title: '链接已复制', description: '现在可以粘贴链接分享给同事了。' });
      } catch {
        toast({ title: '复制失败', description: '请手动复制浏览器地址栏中的链接。', variant: 'destructive' });
      }
    }
  };

  if (!caseDetail) {
    return (
      <AppLayout>
        <div className="modern-layout">
          <div className="modern-container" style={{ padding: '80px 0', textAlign: 'center' }}>
            <h1 style={{ fontSize: '48px', marginBottom: '16px' }}>😕</h1>
            <h2 style={{ fontSize: '24px', marginBottom: '16px', color: 'var(--gray-900)' }}>案例未找到</h2>
            <p style={{ color: 'var(--gray-600)', marginBottom: '32px' }}>抱歉，您访问的案例不存在或已被删除。</p>
            <Link href="/" className="modern-btn modern-btn-primary">
              返回首页
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  const formattedContent = caseDetail.content
    ?.replace(/\n/g, '<br>')
    ?.replace(/^# (.*$)/gm, '<h1>$1</h1>')
    ?.replace(/^## (.*$)/gm, '<h2>$1</h2>')
    ?.replace(/^### (.*$)/gm, '<h3>$1</h3>')
    ?.replace(/\*\*(.*?)\*\*/gm, '<strong>$1</strong>')
    ?.replace(/^\* (.*$)/gm, '<li>$1</li>')
    ?.replace(/^(\d+)\. (.*$)/gm, '<li>$1. $2</li>');

  return (
    <AppLayout>
      <div className="modern-layout work-detail-layout">
        <div className="modern-container">
          <Link href="/profile" className="work-detail__back">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            返回个人中心
          </Link>

          <article className="work-detail-card">
            <header className="work-detail__hero">
              <div className="work-detail__emoji">{caseDetail.thumbnail}</div>
              <div className="work-detail__headline">
                <div className="work-detail__chips">
                  <span className="work-chip work-chip--subject">{caseDetail.subject}</span>
                  <span className="work-chip work-chip--grade">{caseDetail.grade}</span>
                </div>
                <h1 className="work-detail__title">{caseDetail.title}</h1>
                <div className="work-detail__meta">
                  <span>作者：{caseDetail.author}</span>
                  <span>·</span>
                  <span>创建于 {caseDetail.createdAt}</span>
                  {caseDetail.updatedAt ? (
                    <>
                      <span>·</span>
                      <span>更新于 {caseDetail.updatedAt}</span>
                    </>
                  ) : null}
                </div>
              </div>
            </header>

            <div className="work-detail__stats">
              <div className="work-detail__stat">
                <small>点赞</small>
                <strong>{caseDetail.likes}</strong>
              </div>
              <div className="work-detail__stat">
                <small>使用</small>
                <strong>{caseDetail.uses}</strong>
              </div>
              <div className="work-detail__stat">
                <small>评分</small>
                <strong>{caseDetail.rating}</strong>
              </div>
            </div>

            <div className="work-detail__actions">
              <button className="modern-btn modern-btn-primary" onClick={handleLike}>
                ❤️ 点赞
              </button>
              <button className="modern-btn modern-btn-outline" onClick={handleFavorite}>
                ⭐ 收藏
              </button>
              <button className="modern-btn modern-btn-ghost" onClick={handleShare}>
                🔗 分享
              </button>
            </div>

            <section className="work-detail__section">
              <h2 className="desktop-section__title" style={{ fontSize: 'var(--font-size-2xl)', margin: 0 }}>
                案例简介
              </h2>
              <p className="work-detail__description">{caseDetail.description}</p>
            </section>

            <section className="work-detail__section">
              <h2 className="desktop-section__title" style={{ fontSize: 'var(--font-size-2xl)', margin: 0 }}>
                关键标签
              </h2>
              <div className="work-detail__tags">
                {caseDetail.tags.map(tag => (
                  <span key={`${caseDetail.id}-${tag}`} className="work-chip work-chip--tag">
                    #{tag}
                  </span>
                ))}
              </div>
            </section>

            <section className="work-detail__section">
              <h2 className="desktop-section__title" style={{ fontSize: 'var(--font-size-2xl)', margin: 0 }}>
                案例内容
              </h2>
              <div className="work-detail__content">
                {formattedContent ? (
                  <div dangerouslySetInnerHTML={{ __html: formattedContent }} />
                ) : (
                  <p style={{ color: 'var(--gray-500)', fontStyle: 'italic' }}>暂无详细内容</p>
                )}
              </div>
            </section>
          </article>
        </div>
      </div>
    </AppLayout>
  );
}
