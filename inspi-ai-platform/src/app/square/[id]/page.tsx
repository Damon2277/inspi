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
              <div className="work-detail__headline" style={{ gap: 'var(--space-3)' }}>
                <div className="work-detail__title-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <h1 className="work-detail__title" style={{ margin: 0 }}>{work.title}</h1>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '1px', flexShrink: 0, marginLeft: 'auto' }}>
                    <span style={{ color: 'var(--gray-500)', fontSize: '14px', whiteSpace: 'nowrap' }}>
                      已被致敬复用 <strong>{work.reuses}</strong> 次
                    </span>
                    <SquareReuseActions
                      cards={cards}
                      initialReuseCount={work.reuses}
                      themeId={work.id}
                      themeTitle={work.title}
                      hideInlineStat
                    />
                  </div>
                </div>
                <div
                  className="work-detail__meta"
                  style={{
                    gap: '10px',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    marginTop: 0,
                  }}
                >
                  <div className="work-detail__chips" style={{ gap: '8px' }}>
                    <span className="work-chip work-chip--subject">{work.subject}</span>
                    <span className="work-chip work-chip--grade">{work.grade}</span>
                  </div>
                  <span>•</span>
                  <span>by {work.author}</span>
                  <span>•</span>
                  <span>{work.createdAt}</span>
                </div>
              </div>
            </header>

            <section className="work-detail__section">
              <h2 className="desktop-section__title" style={{ fontSize: 'var(--font-size-2xl)', margin: 0 }}>
                作品简介
              </h2>
              <p className="work-detail__description">{work.description}</p>
            </section>

            <section className="work-detail__section">
              <SquareCardShowcase cards={cards} />
            </section>

          </article>
        </div>
      </div>
    </AppLayout>
  );
}
