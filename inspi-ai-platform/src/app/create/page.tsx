'use client';

import React from 'react';
import { GlassCard, Button, IconContainer } from '@/components/ui';

export default function CreatePage() {
  return (
    <div className="min-h-screen">
      <section className="container section-padding">
        <div className="max-w-4xl mx-auto text-center">
          <div className="fade-in-up">
            <h1 className="heading-1 gradient-text mb-4">
              AI教学魔法师
            </h1>
            <p className="body-text mb-8">
              智能生成教学创意卡片，激发无限教学灵感
            </p>
          </div>

          <GlassCard className="fade-in-up stagger-1 max-w-2xl mx-auto">
            <div className="text-center py-12">
              <IconContainer size="large" className="mx-auto mb-6">
                <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </IconContainer>
              
              <h2 className="heading-2 mb-4">
                功能开发中
              </h2>
              
              <p className="body-text mb-8">
                AI教学魔法师功能正在精心开发中，即将为您带来前所未有的教学创意体验！
              </p>
              
              <div className="decorative-divider mb-8"></div>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  variant="primary"
                  onClick={() => window.location.href = '/'}
                >
                  返回首页
                </Button>
                <Button 
                  variant="secondary"
                  onClick={() => window.location.href = '/square'}
                >
                  浏览广场
                </Button>
              </div>
            </div>
          </GlassCard>
        </div>
      </section>
    </div>
  );
}