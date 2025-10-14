import Link from 'next/link';
import { notFound } from 'next/navigation';

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
    cardCount: 6,
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
    cardCount: 5,
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
    cardCount: 8,
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
    cardCount: 7,
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
    cardCount: 5,
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

  return (
    <div className="modern-layout">
      <div style={{ padding: '32px 0', minHeight: 'calc(100vh - 80px)' }}>
          <Link href="/square" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            color: 'var(--primary-600)',
            textDecoration: 'none' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            返回广场
          </Link>
        </div>

        <div className="modern-container">
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
                <h2 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: 'var(--gray-900)',
                  marginBottom: '12px' }}>
                  作品简介
                </h2>
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
                  marginBottom: '16px' }}>
                  作品数据
                </h2>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: '16px' }}>
                  <div className="modern-card" style={{ padding: '16px' }}>
                    <p style={{ fontSize: '12px', color: 'var(--gray-500)' }}>浏览</p>
                    <p style={{ fontSize: '20px', fontWeight: '600', color: 'var(--gray-900)' }}>{work.views}</p>
                  </div>
                  <div className="modern-card" style={{ padding: '16px' }}>
                    <p style={{ fontSize: '12px', color: 'var(--gray-500)' }}>点赞</p>
                    <p style={{ fontSize: '20px', fontWeight: '600', color: 'var(--gray-900)' }}>{work.likes}</p>
                  </div>
                  <div className="modern-card" style={{ padding: '16px' }}>
                    <p style={{ fontSize: '12px', color: 'var(--gray-500)' }}>致敬复用</p>
                    <p style={{ fontSize: '20px', fontWeight: '600', color: 'var(--gray-900)' }}>{work.reuses}</p>
                  </div>
                  <div className="modern-card" style={{ padding: '16px' }}>
                    <p style={{ fontSize: '12px', color: 'var(--gray-500)' }}>卡片数量</p>
                    <p style={{ fontSize: '20px', fontWeight: '600', color: 'var(--gray-900)' }}>{work.cardCount}</p>
                  </div>
                  <div className="modern-card" style={{ padding: '16px' }}>
                    <p style={{ fontSize: '12px', color: 'var(--gray-500)' }}>评分</p>
                    <p style={{ fontSize: '20px', fontWeight: '600', color: 'var(--gray-900)' }}>⭐ {work.rating}</p>
                  </div>
                </div>
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
