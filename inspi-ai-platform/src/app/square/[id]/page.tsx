import Link from 'next/link';
import { notFound } from 'next/navigation';

import { SquareCardShowcase } from '@/components/square/SquareCardShowcase';
import { enrichCard, generateFallbackCard, type RawCardType } from '@/app/api/magic/card-engine';

const mockWorks = [
  {
    id: 1,
    title: '二次函数的图像与性质',
    author: '张老师',
    subject: '数学',
    grade: '高中',
    description: '通过动态图像展示二次函数的变化规律，帮助学生理解抛物线的开口方向、对称轴等重要概念。',
    cardCount: 4,
    likes: 89,
    views: 1250,
    reuses: 23,
    rating: 4.8,
    tags: ['函数', '图像', '性质'],
    thumbnail: '📊',
    createdAt: '2024-01-15' },
  {
    id: 2,
    title: '古诗词意境赏析',
    author: '李老师',
    subject: '语文',
    grade: '初中',
    description: '结合古诗词的创作背景，引导学生感受诗人的情感世界，提升文学鉴赏能力。',
    cardCount: 4,
    likes: 156,
    views: 2100,
    reuses: 45,
    rating: 4.9,
    tags: ['古诗词', '意境', '赏析'],
    thumbnail: '📜',
    createdAt: '2024-01-14' },
  {
    id: 3,
    title: '化学反应速率与平衡',
    author: '王老师',
    subject: '化学',
    grade: '高中',
    description: '通过实验现象和理论分析，帮助学生掌握化学反应速率的影响因素和化学平衡的建立过程。',
    cardCount: 4,
    likes: 67,
    views: 890,
    reuses: 18,
    rating: 4.7,
    tags: ['化学反应', '速率', '平衡'],
    thumbnail: '⚗️',
    createdAt: '2024-01-13' },
  {
    id: 4,
    title: '英语时态语法精讲',
    author: '陈老师',
    subject: '英语',
    grade: '初中',
    description: '系统梳理英语各种时态的用法，通过丰富的例句和练习，让学生轻松掌握时态变化规律。',
    cardCount: 4,
    likes: 234,
    views: 3200,
    reuses: 67,
    rating: 4.6,
    tags: ['时态', '语法', '练习'],
    thumbnail: '🔤',
    createdAt: '2024-01-12' },
  {
    id: 5,
    title: '物理力学基础',
    author: '赵老师',
    subject: '物理',
    grade: '高中',
    description: '从生活实例出发，讲解力的概念、牛顿定律等基础知识，培养学生的物理思维。',
    cardCount: 4,
    likes: 123,
    views: 1800,
    reuses: 34,
    rating: 4.8,
    tags: ['力学', '牛顿定律', '基础'],
    thumbnail: '⚡',
    createdAt: '2024-01-11' },
  {
    id: 6,
    title: '生物细胞结构',
    author: '孙老师',
    subject: '生物',
    grade: '初中',
    description: '通过显微镜观察和模型展示，让学生深入了解细胞的基本结构和功能。',
    cardCount: 4,
    likes: 98,
    views: 1400,
    reuses: 28,
    rating: 4.7,
    tags: ['细胞', '结构', '功能'],
    thumbnail: '🔬',
    createdAt: '2024-01-10' },
];

interface SquareDetailPageProps {
  params: Promise<{ id: string }> | { id: string };
}

export default async function SquareDetailPage(props: SquareDetailPageProps) {
  const resolvedParams = props.params instanceof Promise ? await props.params : props.params;
  const workId = Number(resolvedParams.id);

  if (Number.isNaN(workId)) {
    notFound();
  }

  const work = (mockWorks.find as any)((item) => item.id === workId);

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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: '14px',
                      color: 'var(--gray-500)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      已被致敬复用
                      <strong style={{ fontSize: '16px', color: 'var(--gray-900)' }}>{work.reuses}</strong>
                      次
                    </span>
                    <button
                      type="button"
                      className="modern-btn modern-btn-primary"
                      style={{ whiteSpace: 'nowrap', padding: '10px 20px' }}
                    >
                      立即复用
                    </button>
                  </div>
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
  );
}
