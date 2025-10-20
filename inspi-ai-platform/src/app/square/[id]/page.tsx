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
      <div className="modern-layout">
      <div className="modern-container" style={{ paddingTop: '32px', paddingBottom: '64px' }}>
        <Link
          href="/square"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            color: 'var(--primary-600)',
            textDecoration: 'none',
            marginBottom: '16px',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          返回广场
        </Link>

        <div className="modern-card modern-card-elevated" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <header style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
              <div style={{
                width: '72px',
                height: '72px',
                  borderRadius: '24px',
                  background: 'var(--gray-100)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px' }}>
                  {work.thumbnail}
                </div>
                <div style={{ flex: 1 }}>
                  <h1 style={{
                    fontSize: '32px',
                    fontWeight: '700',
                    color: 'var(--gray-900)',
                    marginBottom: '12px' }}>
                    {work.title}
                  </h1>
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '12px',
                    fontSize: '14px',
                    color: 'var(--gray-500)' }}>
                    <span>by {work.author}</span>
                    <span>•</span>
                    <span>{work.subject}</span>
                    <span>•</span>
                    <span>{work.grade}</span>
                    <span>•</span>
                    <span>{work.createdAt}</span>
                  </div>
                </div>
              </header>

              <section>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    marginBottom: '12px',
                    flexWrap: 'wrap',
                  }}
                >
                  <h2 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: 'var(--gray-900)',
                    margin: 0,
                  }}>
                    作品简介
                  </h2>
                  <SquareReuseActions
                    cards={cards}
                    initialReuseCount={work.reuses}
                    themeId={work.id}
                    themeTitle={work.title}
                  />
                </div>
                <p style={{
                  fontSize: '16px',
                  color: 'var(--gray-600)',
                  lineHeight: '1.8' }}>
                  {work.description}
                </p>
              </section>

              <section>
                <h2 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: 'var(--gray-900)',
                  marginBottom: '12px' }}>
                  教学卡片
                </h2>
                <p style={{
                  fontSize: '14px',
                  color: 'var(--gray-500)',
                  marginBottom: '20px',
                }}>
                  点击任意卡片可导出、致敬复用或进入演示模式，快速带走这套教学设计。
                </p>
                <SquareCardShowcase cards={cards} />
              </section>

              <section>
                <h2 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: 'var(--gray-900)',
                  marginBottom: '12px' }}>
                  相关标签
                </h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {work.tags.map((tag, index) => (
                    <span key={index} style={{
                      padding: '6px 12px',
                      background: 'var(--primary-100)',
                      color: 'var(--primary-700)',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '14px' }}>
                      #{tag}
                    </span>
                  ))}
                </div>
              </section>
          </div>
        </div>
      </div>
    </div>
    </AppLayout>
  );
}
