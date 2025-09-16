'use client';

import React from 'react';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { MobileCard } from '@/components/mobile/MobileCard';
import { MobileButton } from '@/components/mobile/MobileButton';
import { MobilePageHeader } from '@/components/mobile/MobilePageHeader';

/**
 * 移动端首页
 * 专为移动设备优化的界面布局
 */
export default function HomePage() {
  const features = [
    {
      id: 1,
      title: 'AI魔法师',
      description: '智能生成教学卡片，让教学更有趣',
      icon: '✨',
      color: 'bg-gradient-to-br from-purple-500 to-pink-500',
      href: '/create'
    },
    {
      id: 2,
      title: '智慧广场',
      description: '发现优质教学内容，与同行交流',
      icon: '🌟',
      color: 'bg-gradient-to-br from-blue-500 to-cyan-500',
      href: '/square'
    },
    {
      id: 3,
      title: '我的作品',
      description: '管理你的教学创作，追踪影响力',
      icon: '📚',
      color: 'bg-gradient-to-br from-green-500 to-emerald-500',
      href: '/works'
    }
  ];

  return (
    <MobileLayout>
      <MobilePageHeader 
        title="Inspi.AI" 
        subtitle="用AI激发教学创意，让每一次教学都充满魔法"
      />

      {/* 功能卡片区域 */}
      <div className="px-4 py-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          开始你的创作之旅
        </h2>
        
        {features.map((feature) => (
          <MobileCard
            key={feature.id}
            className="p-0 overflow-hidden"
          >
            <div className={`${feature.color} p-4 text-white`}>
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{feature.icon}</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{feature.title}</h3>
                  <p className="text-white/90 text-sm mt-1">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4">
              <MobileButton
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  // 这里可以添加导航逻辑
                  console.log(`Navigate to ${feature.href}`);
                }}
              >
                立即体验
              </MobileButton>
            </div>
          </MobileCard>
        ))}
      </div>

      {/* 快速统计 */}
      <div className="px-4 py-6 bg-gray-50">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-600">1000+</div>
            <div className="text-xs text-gray-600 mt-1">教学卡片</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">500+</div>
            <div className="text-xs text-gray-600 mt-1">活跃教师</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">50+</div>
            <div className="text-xs text-gray-600 mt-1">学科覆盖</div>
          </div>
        </div>
      </div>

      {/* 行动号召 */}
      <div className="px-4 py-6">
        <MobileCard className="text-center p-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
          <h3 className="text-lg font-semibold mb-2">
            开始你的AI教学之旅
          </h3>
          <p className="text-white/90 text-sm mb-4">
            加入我们，用AI技术革新你的教学方式
          </p>
          <MobileButton
            variant="secondary"
            className="bg-white text-indigo-600 hover:bg-gray-100"
          >
            登录 / 注册
          </MobileButton>
        </MobileCard>
      </div>
    </MobileLayout>
  );
}