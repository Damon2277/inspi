import Link from 'next/link';
import { notFound } from 'next/navigation';

import { enrichCard, generateFallbackCard } from '@/app/api/magic/card-engine';
import { AppLayout } from '@/components/layout';
import { SquareCardShowcase } from '@/components/square/SquareCardShowcase';
import { SquareReuseActions } from '@/components/square/SquareReuseActions';
import { mockSquareWorks } from '@/data/mockSquareWorks';
import type { RawCardType } from '@/shared/types/teaching';


interface SquareDetailPageProps {
  params: Promise<{ id: string }> | { id: string };
}

export default async function SquareDetailPage(props: SquareDetailPageProps) {
  const resolvedParams = props.params instanceof Promise ? await props.params : props.params;
  const workId = Number(resolvedParams.id);

  if (Number.isNaN(workId)) {
    notFound();
  }

  const work = mockSquareWorks.find((item) => item.id === workId);

  if (!work) {
    notFound();
  }

  const cardTypes: RawCardType[] = ['concept', 'example', 'practice', 'extension'];
  const cards = cardTypes.map((type, index) => {
    const baseCard = generateFallbackCard(type, work.title);
    const enriched = enrichCard(
      {
        ...baseCard,
        id: `${work.id}-${type}-${index}`,
      },
      work.title,
      work.subject,
      work.grade,
    );
    return enriched;
  });

  return (
    <AppLayout>
      <div className="modern-layout work-detail-layout">
        <div className="modern-container">
          <Link href="/square" className="work-detail__back">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            返回广场
          </Link>

          <article className="work-detail-card">
            <header className="work-detail__hero">
              <div className="work-detail__emoji">{work.thumbnail}</div>
              <div className="work-detail__headline">
                <div className="work-detail__chips">
                  <span className="work-chip work-chip--subject">{work.subject}</span>
                  <span className="work-chip work-chip--grade">{work.grade}</span>
                </div>
                <h1 className="work-detail__title">{work.title}</h1>
                <div className="work-detail__meta">
                  <span>by {work.author}</span>
                  <span>•</span>
                  <span>{work.createdAt}</span>
                </div>
              </div>
            </header>

            <div className="work-detail__stats">
              <div className="work-detail__stat">
                <small>喜欢</small>
                <strong>{work.likes}</strong>
              </div>
              <div className="work-detail__stat">
                <small>复用</small>
                <strong>{work.reuses}</strong>
              </div>
              <div className="work-detail__stat">
                <small>评分</small>
                <strong>{work.rating}</strong>
              </div>
            </div>

            <div className="work-detail__actions">
              <SquareReuseActions
                cards={cards}
                initialReuseCount={work.reuses}
                themeId={work.id}
                themeTitle={work.title}
              />
            </div>

            <section className="work-detail__section">
              <h2 className="desktop-section__title" style={{ fontSize: 'var(--font-size-2xl)', margin: 0 }}>
                作品简介
              </h2>
              <p className="work-detail__description">{work.description}</p>
            </section>

            <section className="work-detail__section">
              <h2 className="desktop-section__title" style={{ fontSize: 'var(--font-size-2xl)', margin: 0 }}>
                教学卡片
              </h2>
              <p style={{ color: 'var(--gray-500)', fontSize: 'var(--font-size-sm)' }}>
                点击任意卡片可导出、致敬复用或进入演示模式，快速带走这套教学设计。
              </p>
              <SquareCardShowcase cards={cards} />
            </section>

            <section className="work-detail__section">
              <h2 className="desktop-section__title" style={{ fontSize: 'var(--font-size-2xl)', margin: 0 }}>
                相关标签
              </h2>
              <div className="work-detail__tags">
                {work.tags.map((tag, index) => (
                  <span key={`${work.id}-tag-${index}`} className="work-chip work-chip--tag">
                    #{tag}
                  </span>
                ))}
              </div>
            </section>
          </article>
        </div>
      </div>
    </AppLayout>
  );
}
