'use client';

import Link from 'next/link';
import React, { useCallback, useEffect, useState } from 'react';

import { useLoginPrompt } from '@/components/auth/LoginPrompt';
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

interface FeatureHighlight {
  id: string;
  title: string;
  description: string;
  icon: string;
  href: string;
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
  { label: '创意卡片', value: '10,000+', icon: '🎨' },
  { label: '智慧作品', value: '2,000+', icon: '📚' },
  { label: '致敬复用', value: '5,000+', icon: '🤝' },
];

const featureHighlights: FeatureHighlight[] = [
  {
    id: 'magic',
    title: 'AI教学魔法师',
    description: '用自然语言描述教学目标，即可生成四种教学灵感卡，快速搭建课堂结构。',
    icon: '🪄',
    href: '/create',
  },
  {
    id: 'square',
    title: '智慧广场',
    description: '浏览优质教学作品，复用同行创作，并将灵感沉淀进自己的教学库。',
    icon: '🌟',
    href: '/square',
  },
  {
    id: 'graph',
    title: '知识图谱',
    description: '把课程结构、重难点与拓展案例串联成图谱，帮助学生构建体系化认知。',
    icon: '🧠',
    href: '/profile/knowledge-graph',
  },
  {
    id: 'contribution',
    title: '贡献度系统',
    description: '记录创作、复用与分享的每一次价值，见证教学影响力的持续增长。',
    icon: '🏆',
    href: '/profile',
  },
];

const HERO_CREATE_PROMPT_MESSAGE = '登录后即可开启 AI 创作体验';
const CARD_TYPE_PROMPT_MESSAGE = '登录后即可生成专属教学灵感卡片';

export function DesktopHomePage() {
  const [inputContent, setInputContent] = useState('');
  const [popularCases, setPopularCases] = useState<CaseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showPrompt, LoginPromptComponent } = useLoginPrompt();

  const showCreatePrompt = useCallback(
    (message?: string) => {
      showPrompt('create', message);
    },
    [showPrompt],
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
                只需描述教学目标，AI 即刻为您生成灵感，帮助课堂闪光。
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
                  className="modern-btn modern-btn-primary modern-btn-lg"
                  onClick={() => showCreatePrompt(HERO_CREATE_PROMPT_MESSAGE)}
                >
                  立即开启创作
                </button>
                <Link href="/square" className="modern-btn modern-btn-secondary modern-btn-lg">
                  浏览灵感案例
                </Link>
              </div>
            </div>

            <aside className="desktop-hero__panel">
              <div className="desktop-creation-panel">
                <div className="desktop-creation-panel__header">
                  <span className="desktop-creation-panel__title">描述您要教授的知识点</span>
                  <span className="desktop-creation-panel__counter">{inputContent.length}/500</span>
                </div>
                <textarea
                  className="modern-input modern-textarea desktop-creation-panel__input"
                  placeholder="例如：二次函数的图像与性质，包括开口方向、对称轴、顶点坐标等..."
                  value={inputContent}
                  onChange={handleInputChange}
                  rows={6}
                />
                <p className="desktop-creation-panel__helper">
                  <span className="desktop-creation-panel__helper-icon" aria-hidden="true">💡</span>
                  登录后即可生成专属教学灵感卡片。
                </p>
                <div className="desktop-card-type-grid">
                  {cardTypes.map(type => (
                    <button
                      key={type.id}
                      type="button"
                      className="desktop-card-type"
                      onClick={() => showCreatePrompt(CARD_TYPE_PROMPT_MESSAGE)}
                    >
                      <span className="desktop-card-type__icon">{type.icon}</span>
                      <span className="desktop-card-type__name">{type.name}</span>
                      <span className="desktop-card-type__desc">{type.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className="desktop-section">
          <div className="modern-container">
            <div className="desktop-section__header">
              <h2 className="desktop-section__title">用 AI 与数据，连接教学创意的完整链路</h2>
              <p className="desktop-section__subtitle">
                从灵感产生到课堂呈现，再到复盘沉淀，每一个环节都有工具帮您完成闭环。
              </p>
            </div>

            <div className="desktop-feature-grid">
              {featureHighlights.map(feature => (
                <article key={feature.id} className="desktop-feature-card">
                  <span className="desktop-feature-card__icon" aria-hidden="true">
                    {feature.icon}
                  </span>
                  <h3 className="desktop-feature-card__title">{feature.title}</h3>
                  <p className="desktop-feature-card__desc">{feature.description}</p>
                  <Link href={feature.href} className="desktop-feature-card__link">
                    了解功能详情
                    <span aria-hidden="true">→</span>
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="desktop-section desktop-section--light">
          <div className="modern-container">
            <div className="desktop-section__header">
              <h2 className="desktop-section__title">智慧广场精选</h2>
              <p className="desktop-section__subtitle">
                看同行们正在创造什么。每一份作品，都是一份可以借鉴的灵感。
              </p>
            </div>

            {isLoading ? (
              <div className="modern-grid modern-grid-3 desktop-case-grid">
                {[1, 2, 3].map(item => (
                  <div key={item} className="desktop-case-card desktop-case-card--loading skeleton" />
                ))}
              </div>
            ) : (
              <>
                <div className="modern-grid modern-grid-3 desktop-case-grid">
                  {popularCases.map(caseItem => (
                    <article
                      key={caseItem.id}
                      className="desktop-case-card"
                      onClick={() => handleCaseClick(caseItem)}
                    >
                      <div className="desktop-case-card__header">
                        <span className="desktop-case-card__emoji">{caseItem.thumbnail}</span>
                        <span className="desktop-case-card__tag">{caseItem.subject}</span>
                      </div>
                      <h3 className="desktop-case-card__title">{caseItem.title}</h3>
                      <div className="desktop-case-card__footer">
                        <span>by {caseItem.author}</span>
                        <span>🔄 {caseItem.uses} 次使用</span>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="desktop-section__footer">
                  <Link href="/square" className="modern-btn modern-btn-outline modern-btn-lg">
                    🌟 探索更多智慧作品
                  </Link>
                </div>
              </>
            )}
          </div>
        </section>

        <section className="desktop-section desktop-section--muted">
          <div className="modern-container">
            <div className="desktop-section__header">
              <h2 className="desktop-section__title">智慧贡献榜</h2>
              <p className="desktop-section__subtitle">每一份贡献，都让教育变得更美好。</p>
            </div>

            <div className="modern-grid modern-grid-4 desktop-stats-grid">
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
