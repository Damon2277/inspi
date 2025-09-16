'use client';
import React from 'react';
import Link from 'next/link';

/**
 * 现代化桌面端首页组件
 */
export function DesktopHomePage() {
  const features = [
    {
      icon: '🎭',
      title: 'AI教学魔法师',
      description: '四种创意卡片，让抽象知识变得可见，用生活温度点亮学习，在互动中让知识自然流淌。'
    },
    {
      icon: '🌟',
      title: '智慧广场',
      description: '看同行们正在创造什么。每一份作品，都是一份可以借鉴的灵感，一份可以交流的热忱。'
    },
    {
      icon: '📚',
      title: '知识图谱',
      description: '可视化您的教学理念与知识体系，让教学智慧沉淀为独特的教育IP。'
    }
  ];

  const stats = [
    { label: '教师用户', value: '1,000+', icon: '👨‍🏫' },
    { label: '创意卡片', value: '10,000+', icon: '🎭' },
    { label: '智慧作品', value: '2,000+', icon: '📚' },
    { label: '致敬复用', value: '5,000+', icon: '🤝' }
  ];

  return (
    <div className="modern-layout">
      {/* 导航栏 */}
      <nav className="modern-nav">
        <div className="modern-container">
          <div className="modern-nav-content">
            <div className="modern-logo">Inspi.AI</div>
            <div className="modern-nav-links mobile-hidden">
              <Link href="/" className="modern-nav-link active">首页</Link>
              <Link href="/create" className="modern-nav-link">创作</Link>
              <Link href="/square" className="modern-nav-link">广场</Link>
              <Link href="/profile" className="modern-nav-link">我的</Link>
            </div>
            <div className="flex gap-4">
              <Link href="/create" className="modern-btn modern-btn-primary modern-btn-sm">
                开启魔法
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero区域 */}
      <section className="modern-hero">
        <div className="modern-container">
          <div className="animate-fade-in">
            <h1 className="modern-hero-title">
              别让备课的深夜，磨灭您教学的热情
            </h1>
            <p className="modern-hero-subtitle">
              <span className="text-gradient">Inspi.AI</span> - 老师的好搭子，更是您教学创意的放大器。
              您的每一次奇思妙想，都值得被精彩呈现。
            </p>
            <div className="modern-hero-actions">
              <Link href="/create" className="modern-btn modern-btn-primary modern-btn-xl">
                <span>✨</span>
                开启教学魔法
              </Link>
              <Link href="/square" className="modern-btn modern-btn-outline modern-btn-xl">
                <span>🌟</span>
                探索智慧广场
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 特性展示 */}
      <section className="modern-features">
        <div className="modern-container">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              激发、汇聚、传承教学智慧
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              通过自生长生态系统，让每位教师的创意都能被精彩呈现，让教学智慧得以传承
            </p>
          </div>
          
          <div className="modern-grid modern-grid-3">
            {features.map((feature, index) => (
              <div key={index} className="modern-card modern-feature-card animate-fade-in">
                <div className="modern-feature-icon animate-float">
                  {feature.icon}
                </div>
                <h3 className="modern-feature-title">
                  {feature.title}
                </h3>
                <p className="modern-feature-description">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 数据统计 */}
      <section style={{ padding: '80px 0', background: 'linear-gradient(180deg, #f9fafb 0%, #ffffff 100%)' }}>
        <div className="modern-container">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              智慧贡献榜
            </h2>
            <p className="text-xl text-gray-600">
              每一份贡献，都让教育变得更美好
            </p>
          </div>
          
          <div className="modern-grid modern-grid-4">
            {stats.map((stat, index) => (
              <div key={index} className="modern-card text-center">
                <div className="modern-card-body">
                  <div className="text-4xl mb-4">{stat.icon}</div>
                  <div className="text-3xl font-bold text-gray-900 mb-2">
                    {stat.value}
                  </div>
                  <div className="text-gray-600 font-medium">
                    {stat.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA区域 */}
      <section style={{ padding: '80px 0' }}>
        <div className="modern-container">
          <div className="modern-card modern-card-elevated text-center" style={{ 
            background: 'linear-gradient(135deg, #fff7ed 0%, #fdf2f8 100%)',
            border: '2px solid #fed7aa'
          }}>
            <div className="modern-card-body" style={{ padding: '60px 40px' }}>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                让每一次奇思妙想，都被精彩呈现
              </h2>
              <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
                加入教师智慧生态，与全球同行一起激发创意、分享智慧、传承经验。
              </p>
              <div className="flex gap-4 justify-center flex-wrap">
                <Link href="/create" className="modern-btn modern-btn-primary modern-btn-xl">
                  开启教学魔法
                </Link>
                <Link href="/square" className="modern-btn modern-btn-secondary modern-btn-xl">
                  探索智慧广场
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 页脚 */}
      <footer style={{ 
        background: 'var(--gray-900)', 
        color: 'var(--gray-300)', 
        padding: '40px 0',
        textAlign: 'center'
      }}>
        <div className="modern-container">
          <div className="modern-logo" style={{ color: 'white', marginBottom: '16px' }}>
            Inspi.AI
          </div>
          <p>© 2024 Inspi.AI. 让AI激发教学创意.</p>
        </div>
      </footer>
    </div>
  );
}