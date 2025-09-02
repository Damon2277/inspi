'use client';

import React from 'react';
import { GlassCard, Button, IconContainer } from '@/components/ui';

export default function Home() {
  const handleCreateClick = () => {
    window.location.href = '/create';
  };

  const featureCards = [
    {
      icon: (
        <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      title: 'AI教学魔法师',
      description: '智能生成四种类型的教学创意卡片，激发无限教学灵感'
    },
    {
      icon: (
        <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      title: '智慧广场',
      description: '教师社区平台，分享和复用优秀教学资源'
    },
    {
      icon: (
        <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      title: '知识图谱',
      description: '可视化展示个人教学体系和专业发展路径'
    },
    {
      icon: (
        <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      ),
      title: '贡献度系统',
      description: '激励教师创作和分享优质教学内容'
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="container section-padding text-center">
        <div className="fade-in-up">
          <h1 className="heading-1 gradient-text mb-6">
            AI驱动的教师智慧平台
          </h1>
          <h2 className="heading-2 mb-4">
            点燃您教学的热情
          </h2>
        </div>
        
        <div className="fade-in-up stagger-1">
          <p className="body-text mb-10 max-w-4xl mx-auto">
            用AI激发教学创意，让每一次教学都充满魔法。智能生成教学卡片，构建个人知识图谱，与教师社区共同成长。
          </p>
        </div>

        <div className="fade-in-up stagger-2 flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
          <Button 
            variant="primary" 
            size="large"
            onClick={handleCreateClick}
            aria-label="开始创作教学魔法 - 使用AI生成教学创意卡片"
          >
            ✨ 开始创作教学魔法
          </Button>
          <Button 
            variant="secondary" 
            size="large"
            onClick={() => window.location.href = '/square'}
            aria-label="浏览智慧广场 - 发现优秀教学创意"
          >
            🌟 浏览智慧广场
          </Button>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="container section-padding">
        <div className="grid-auto-fit">
          {featureCards.map((card, index) => (
            <GlassCard key={index} className={`fade-in-up stagger-${index + 1} text-center`}>
              <IconContainer className="mx-auto mb-4">
                {card.icon}
              </IconContainer>
              <h3 className="heading-3 mb-2">{card.title}</h3>
              <p className="body-text">{card.description}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding">
        <GlassCard className="container max-w-4xl mx-auto text-center">
          <h2 className="heading-2 mb-4">
            您的每一次奇思妙想，都值得被精彩呈现
          </h2>
          <p className="body-text mb-8">
            立即开始，让AI成为您教学创意的放大器
          </p>
          <Button 
            variant="primary" 
            size="large"
            onClick={handleCreateClick}
          >
            🚀 免费开始使用
          </Button>
        </GlassCard>
      </section>
    </div>
  );
}