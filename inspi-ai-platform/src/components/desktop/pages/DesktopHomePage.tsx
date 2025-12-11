'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useState } from 'react';

import { useLoginPrompt } from '@/components/auth/LoginPrompt';
import { useAuth } from '@/shared/hooks/useAuth';
interface CaseItem {
  id: number;
  title: string;
  author: string;
  subject: string;
  thumbnail: string;
  uses: number;
}

interface CardType {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface FeatureSpotlight {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  href: string;
  mock: {
    label: string;
    pill: string;
    color: string;
    imageUrl?: string;
    lines?: Array<{ title: string; meta: string }>;
    chips?: string[];
  };
}

const highlightCopy = [
  '四种教学魔法卡一键生成，快速搭建高质量课堂体验。',
  '结合案例库与教师偏好，自动匹配最适合的表达方式。',
  '实时追踪复用与反馈，让每次优化都看得见。',
];

const highlightIcons = ['⚡', '🎯', '📈'];

const mockPopularCases: CaseItem[] = [
  {
    id: 1,
    title: '二次函数的图像与性质',
    author: '张老师',
    subject: '数学',
    thumbnail: '📊',
    uses: 89,
  },
  {
    id: 2,
    title: '古诗词意境赏析',
    author: '李老师',
    subject: '语文',
    thumbnail: '📜',
    uses: 156,
  },
  {
    id: 3,
    title: '化学反应速率实验',
    author: '王老师',
    subject: '化学',
    thumbnail: '⚗️',
    uses: 67,
  },
];

const cardTypes: CardType[] = [
  {
    id: 'visual',
    name: '可视化卡',
    description: '把抽象概念变成一眼能懂的图像',
    icon: '👁️',
  },
  {
    id: 'analogy',
    name: '类比延展卡',
    description: '用贴近生活的比喻，激发学生共鸣',
    icon: '🌟',
  },
  {
    id: 'thinking',
    name: '启发思考卡',
    description: '抛出高质量问题，点燃探究兴趣',
    icon: '💭',
  },
  {
    id: 'interaction',
    name: '互动氛围卡',
    description: '打破课堂沉默，营造轻松互动',
    icon: '🎭',
  },
];

const stats = [
  { label: '教师用户', value: '1,000+', icon: '👨‍🏫' },
  { label: '智慧作品', value: '2,000+', icon: '📚' },
  { label: '致敬复用', value: '5,000+', icon: '🤝' },
];

const featureSpotlights: FeatureSpotlight[] = [
  {
    id: 'visualization-card',
    eyebrow: '概念可视化卡',
    title: '复杂知识点，也能一图看懂',
    description: '输入知识点后，Inspi.AI 会自动生成多阶段的可视化分镜和关键词，帮助学生在几十秒内构建直观印象。',
    bullets: ['分镜式结构自动生成', '高清图像可下载分享', '同步保留图像灵感提示，方便二次创作'],
    href: '/create?card=visualization',
    mock: {
      label: '概念可视化 · 光合作用案例',
      pill: '案例截图',
      color: '#6366f1',
      imageUrl: '/demo/concepts/photosynthesis-map.svg',
      chips: ['阶段一：吸收阳光', '阶段二：能量转换', '阶段三：合成葡萄糖'],
    },
  },
  {
    id: 'thinking-card',
    eyebrow: '启发思考卡',
    title: '好问题引导课堂对话',
    description: '依托大模型对课堂节奏的理解，自动生成循序渐进的问题阶梯，并给出课堂提示，让学生在互动中探索答案。',
    bullets: ['可设定学段/学科语气', '提供追问提示，降低上课压力', '支持导出课堂讲义/练习'],
    href: '/create?card=thinking',
    mock: {
      label: '课堂提问 · “时间”概念',
      pill: '启发思考',
      color: '#ea580c',
      lines: [
        { title: '问题 1：如果没有钟表，我们如何感知时间？', meta: '热身' },
        { title: '问题 2：时间能被“保存”吗？', meta: '探究' },
        { title: '问题 3：不同文化如何描述时间？', meta: '延展' },
      ],
      chips: ['课堂提示', '追问建议', '生成讲义'],
    },
  },
  {
    id: 'analogy-card',
    eyebrow: '类比延展卡',
    title: '把抽象概念映射到真实场景',
    description: '自动挖掘贴近日常体验的类比故事，配合教学目标提供“为什么要学”的动机铺垫。',
    bullets: ['一键输出动机故事', '提供“双语/多学科”表述', '支持为不同难度生成多个版本'],
    href: '/create?card=analogy',
    mock: {
      label: '类比 · 电流像水流',
      pill: '类比延展',
      color: '#0ea5e9',
      lines: [
        { title: '水压越大 → 电压越高', meta: '直觉映射' },
        { title: '水管粗细 → 导线电阻', meta: '概念迁移' },
        { title: '阀门调节 → 开关控制', meta: '课堂互动' },
      ],
      chips: ['学生共鸣', '动机引入', '跨学科表达'],
    },
  },
];

const HERO_CREATE_PROMPT_MESSAGE = '登录后即可开启 AI 创作体验';
const CARD_TYPE_PROMPT_MESSAGE = '登录后即可生成专属教学灵感卡片';

export function DesktopHomePage() {
  const [inputContent, setInputContent] = useState('');
  const [popularCases, setPopularCases] = useState<CaseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showPrompt, LoginPromptComponent } = useLoginPrompt();
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  const handleCreateClick = useCallback(
    (message?: string) => {
      if (isAuthenticated) {
        // 已登录，直接跳转到创作页面
        router.push('/create');
      } else {
        // 未登录，显示登录提示
        showPrompt('create', message);
      }
    },
    [isAuthenticated, router, showPrompt],
  );

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setPopularCases(mockPopularCases);
      setIsLoading(false);
    }, 600);

    return () => clearTimeout(timer);
  }, []);

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;
    if (value.length <= 500) {
      setInputContent(value);
    }
  };

  const handleCaseClick = (caseItem: CaseItem) => {
    window.location.href = `/case/${caseItem.id}`;
  };

  return (
    <div className="modern-layout desktop-home">
      <LoginPromptComponent />
      <main>
        <section className="modern-hero desktop-hero">
          <div className="modern-container desktop-hero__grid">
            <div className="desktop-hero__copy">
              <h1 className="modern-hero-title desktop-hero__title">别让备课的深夜，磨灭您教学的热情</h1>
              <p className="modern-hero-subtitle desktop-hero__subtitle">
                <span className="text-gradient">Inspi.AI</span> —— 老师的好搭子，更是您教学创意的放大器。
                描述知识点、选择卡片类型，课堂需要的概念可视化、启发思考、互动任务即可一站式生成。
              </p>
              <ul className="desktop-hero__highlights">
                {highlightCopy.map((highlight, index) => (
                  <li key={highlight} className="desktop-hero__highlight">
                    <span className="desktop-hero__highlight-icon" aria-hidden="true">
                      {highlightIcons[index]}
                    </span>
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
              <div className="desktop-hero__actions">
                <button
                  type="button"
                  className="modern-btn modern-btn-primary modern-btn-xl"
                  onClick={() => handleCreateClick(HERO_CREATE_PROMPT_MESSAGE)}
                >
                  立即开启创作
                </button>
                <Link href="/square" className="modern-btn modern-btn-secondary modern-btn-xl">
                  浏览灵感案例
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="desktop-section desktop-input-section">
          <div className="modern-container">
            <div className="desktop-input-panel">
              <div className="desktop-creation-panel">
                <div className="desktop-creation-panel__header">
                  <span
                    className="desktop-creation-panel__title desktop-section__title"
                    style={{ fontSize: 'clamp(21px, 1.875vw, 30px)', lineHeight: 1.2 }}
                  >
                    描述您要教授的知识点
                  </span>
                  <span className="desktop-creation-panel__counter">{inputContent.length}/500</span>
                </div>
                <textarea
                  className="modern-input modern-textarea desktop-creation-panel__input"
                  placeholder="例如：二次函数的图像与性质，包括开口方向、对称轴、顶点坐标等..."
                  value={inputContent}
                  onChange={handleInputChange}
                  rows={3}
                />
                <div className="desktop-card-type-grid">
                  {cardTypes.map(type => (
                    <button
                      key={type.id}
                      type="button"
                      className="desktop-card-type"
                      onClick={() => handleCreateClick(CARD_TYPE_PROMPT_MESSAGE)}
                    >
                      <span className="desktop-card-type__icon">{type.icon}</span>
                      <span className="desktop-card-type__name">{type.name}</span>
                      <span className="desktop-card-type__desc">{type.description}</span>
                    </button>
                  ))}
                </div>
                <div
                  className="desktop-card-type-actions"
                  style={{
                    marginTop: 'var(--space-3)',
                    marginBottom: 'var(--space-3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 'var(--space-4)',
                    flexWrap: 'wrap',
                    width: '100%',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <button
                      type="button"
                      className="modern-btn modern-btn-primary modern-btn-lg desktop-card-type-actions__cta"
                      onClick={() => handleCreateClick(HERO_CREATE_PROMPT_MESSAGE)}
                    >
                      立即开启创作
                    </button>
                    <p
                      className="desktop-creation-panel__helper"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', margin: 0, justifyContent: 'flex-end', minWidth: '240px' }}
                    >
                      <span className="desktop-creation-panel__helper-icon" aria-hidden="true">💡</span>
                      登录后即可生成专属教学灵感卡片。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="desktop-section desktop-section--muted desktop-stats-section">
          <div className="modern-container" style={{ maxWidth: 'min(80vw, 1100px)', margin: '0 auto' }}>
            <div className="desktop-section__header">
              <h2 className="desktop-section__title">被老师们信赖的 AI 课堂助手</h2>
              <p className="desktop-section__subtitle">
                Inspi.AI 已帮助上千位教师释放创作时间，坚持打磨更有趣的课堂体验。
              </p>
            </div>

            <div className="modern-grid modern-grid-3 desktop-stats-grid">
              {stats.map(stat => (
                <div key={stat.label} className="desktop-stat-card">
                  <span className="desktop-stat-card__icon">{stat.icon}</span>
                  <span className="desktop-stat-card__value">{stat.value}</span>
                  <span className="desktop-stat-card__label">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="desktop-section">
          <div className="modern-container">
            <div className="desktop-section__header">
              <h2 className="desktop-section__title">将创意和课堂流程一次打包</h2>
              <p className="desktop-section__subtitle desktop-section__subtitle--nowrap">
                不止是生成文字，Inspi.AI 会把视觉、问题、故事与课堂提示同步呈现，保持创作与展示一致。
              </p>
            </div>

            <div className="desktop-feature-showcase">
              {featureSpotlights.map((feature, index) => {
                const isReversed = index % 2 === 1;
                return (
                  <article
                    key={feature.id}
                    className={`desktop-feature-showcase__row ${isReversed ? 'desktop-feature-showcase__row--reverse' : ''}`}
                  >
                    <div className="desktop-feature-showcase__content">
                      <span className="desktop-feature-showcase__eyebrow">{feature.eyebrow}</span>
                      <h3 className="desktop-feature-showcase__title">{feature.title}</h3>
                      <p className="desktop-feature-showcase__desc">{feature.description}</p>
                      <ul className="desktop-feature-showcase__list">
                        {feature.bullets.map(bullet => (
                          <li key={`${feature.id}-${bullet}`}>{bullet}</li>
                        ))}
                      </ul>
                      <Link href={feature.href} className="desktop-feature-showcase__link">
                        了解功能详情 →
                      </Link>
                    </div>
                    <div className="desktop-feature-showcase__visual">
                      {feature.mock.imageUrl ? (
                        <div
                          className="desktop-feature-mock desktop-feature-mock--image"
                          style={{ borderColor: feature.mock.color, boxShadow: `0 24px 60px ${feature.mock.color}33` }}
                        >
                          <img src={feature.mock.imageUrl} alt={feature.mock.label} loading="lazy" />
                          <div className="desktop-feature-mock__overlay">
                            <div className="desktop-feature-mock__header">
                              <span>{feature.mock.label}</span>
                              <span className="desktop-feature-mock__pill" style={{ backgroundColor: feature.mock.color }}>
                                {feature.mock.pill}
                              </span>
                            </div>
                            {feature.mock.chips && feature.mock.chips.length > 0 ? (
                              <div className="desktop-feature-mock__chips">
                                {feature.mock.chips.map(chip => (
                                  <span
                                    key={`${feature.id}-${chip}`}
                                    style={{
                                      color: '#f8fafc',
                                      backgroundColor: 'rgba(15,23,42,0.55)',
                                    }}
                                  >
                                    {chip}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <div
                          className="desktop-feature-mock"
                          style={{
                            borderColor: feature.mock.color,
                            boxShadow: `0 24px 60px ${feature.mock.color}33`,
                          }}
                        >
                          <div className="desktop-feature-mock__header">
                            <span>{feature.mock.label}</span>
                            <span className="desktop-feature-mock__pill" style={{ backgroundColor: feature.mock.color }}>
                              {feature.mock.pill}
                            </span>
                          </div>
                          {feature.mock.lines && feature.mock.lines.length > 0 ? (
                            <div className="desktop-feature-mock__body">
                              {feature.mock.lines.map(line => (
                                <div key={`${feature.id}-${line.title}`} className="desktop-feature-mock__line">
                                  <span>{line.title}</span>
                                  <span>{line.meta}</span>
                                </div>
                              ))}
                            </div>
                          ) : null}
                          {feature.mock.chips && feature.mock.chips.length > 0 ? (
                            <div className="desktop-feature-mock__chips">
                              {feature.mock.chips.map(chip => (
                                <span
                                  key={`${feature.id}-${chip}`}
                                  style={{
                                    color: feature.mock.color,
                                    backgroundColor: `${feature.mock.color}1A`,
                                  }}
                                >
                                  {chip}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="desktop-section desktop-section--light">
          <div className="modern-container" style={{ maxWidth: 'min(80vw, 1100px)', margin: '0 auto' }}>
            <div className="desktop-section__header">
              <h2 className="desktop-section__title">智慧广场精选</h2>
              <p className="desktop-section__subtitle">
                看同行们正在创造什么。每一份作品，都是一份可以借鉴的灵感。
              </p>
            </div>

            <div
              className="work-card-grid desktop-case-grid"
              style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', maxWidth: 'min(80vw, 1100px)', margin: '0 auto' }}
            >
              {isLoading ? (
                [1, 2, 3].map(item => (
                  <article key={item} className="work-card desktop-case-card desktop-case-card--loading skeleton" />
                ))
              ) : (
                popularCases.map(caseItem => (
                  <article
                    key={caseItem.id}
                    className="work-card desktop-case-card"
                    onClick={() => handleCaseClick(caseItem)}
                  >
                    <div className="work-card__header">
                      <span className="work-card__emoji">{caseItem.thumbnail}</span>
                      <div className="work-card__chips">
                        <span className="work-chip work-chip--subject">{caseItem.subject}</span>
                        <span className="work-chip work-chip--grade">精选</span>
                      </div>
                    </div>
                    <h3 className="work-card__title">{caseItem.title}</h3>
                    <p className="work-card__description">by {caseItem.author}</p>
                    <div className="work-card__footer">
                      <span>🔄 {caseItem.uses} 次使用</span>
                      <span>立即查看 →</span>
                    </div>
                  </article>
                ))
              )}
            </div>

            {!isLoading && (
              <div className="desktop-section__footer">
                <Link href="/square" className="modern-btn modern-btn-outline modern-btn-lg">
                  🌟 探索更多智慧作品
                </Link>
              </div>
            )}
          </div>
        </section>

        <section className="desktop-section">
          <div className="modern-container" style={{ maxWidth: 'min(80vw, 1100px)', margin: '0 auto' }}>
            <div className="desktop-cta">
              <h2 className="desktop-cta__title">让每一次奇思妙想，都被精彩呈现</h2>
              <p className="desktop-cta__subtitle">
                加入教师智慧生态，与全球同行一起激发创意、分享智慧、传承经验。
              </p>
              <div className="desktop-cta__actions">
                <Link href="/create" className="modern-btn modern-btn-primary modern-btn-xl">
                  开启教学魔法
                </Link>
                <Link href="/square" className="modern-btn modern-btn-secondary modern-btn-xl">
                  探索智慧广场
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="desktop-footer">
        <div className="modern-container">
          <div className="modern-logo desktop-footer__logo">Inspi.AI</div>
          <p className="desktop-footer__caption">© 2024 Inspi.AI. 让AI激发教学创意。</p>
        </div>
      </footer>
    </div>
  );
}
