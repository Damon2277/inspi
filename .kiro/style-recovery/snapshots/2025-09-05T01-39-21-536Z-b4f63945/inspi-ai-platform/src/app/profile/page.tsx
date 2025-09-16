'use client';

import React, { useState } from 'react';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { MobileCard } from '@/components/mobile/MobileCard';
import { MobileButton } from '@/components/mobile/MobileButton';

/**
 * 移动端个人资料页面
 * 专为移动设备优化的用户中心界面
 */
export default function ProfilePage() {
  const [user] = useState({
    name: '张老师',
    email: 'zhang@example.com',
    avatar: '👩‍🏫',
    level: 'Pro',
    joinDate: '2024-01-01',
    stats: {
      works: 12,
      reuses: 39
    }
  });

  const menuItems = [
    {
      id: 'subscription',
      title: '订阅管理',
      description: '管理你的订阅计划',
      icon: '💎',
      href: '/subscription'
    },
    {
      id: 'settings',
      title: '设置',
      description: '个人偏好和隐私设置',
      icon: '⚙️',
      href: '/settings'
    },
    {
      id: 'help',
      title: '帮助中心',
      description: '常见问题和使用指南',
      icon: '❓',
      href: '/help'
    },
    {
      id: 'feedback',
      title: '意见反馈',
      description: '告诉我们你的想法',
      icon: '💬',
      href: '/feedback'
    },
    {
      id: 'about',
      title: '关于我们',
      description: '了解Inspi.AI',
      icon: 'ℹ️',
      href: '/about'
    }
  ];

  const handleMenuClick = (href: string) => {
    console.log(`Navigate to ${href}`);
    // 这里可以添加实际的导航逻辑
  };

  const handleLogout = () => {
    if (confirm('确定要退出登录吗？')) {
      console.log('Logout');
      // 这里可以添加退出登录逻辑
    }
  };

  return (
    <MobileLayout title="我的">
      {/* 用户信息卡片 */}
      <div className="px-4 py-6">
        <MobileCard className="text-center p-6 bg-gradient-to-br from-indigo-50 to-purple-50">
          <div className="text-4xl mb-3">{user.avatar}</div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">{user.name}</h2>
          <p className="text-gray-600 text-sm mb-2">{user.email}</p>
          <div className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-orange-500 to-pink-500 text-white text-xs font-semibold rounded-full">
            {user.level} 用户
          </div>
          <p className="text-gray-500 text-xs mt-3">
            加入于 {new Date(user.joinDate).toLocaleDateString('zh-CN')}
          </p>
        </MobileCard>
      </div>

      {/* 统计数据 */}
      <div className="px-4 pb-6">
        <MobileCard className="p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">我的数据</h3>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-indigo-600">{user.stats.works}</div>
              <div className="text-xs text-gray-600 mt-1">作品</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">{user.stats.reuses}</div>
              <div className="text-xs text-gray-600 mt-1">复用</div>
            </div>
          </div>
        </MobileCard>
      </div>

      {/* 菜单列表 */}
      <div className="px-4 pb-6">
        <MobileCard className="p-0 overflow-hidden">
          {menuItems.map((item, index) => (
            <button
              key={item.id}
              onClick={() => handleMenuClick(item.href)}
              className={`w-full p-4 flex items-center space-x-4 text-left hover:bg-gray-50 transition-colors ${
                index !== menuItems.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              <div className="text-2xl">{item.icon}</div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 text-sm">{item.title}</h4>
                <p className="text-gray-600 text-xs mt-1">{item.description}</p>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </MobileCard>
      </div>

      {/* 退出登录 */}
      <div className="px-4 pb-6">
        <MobileButton
          variant="outline"
          onClick={handleLogout}
          className="w-full text-red-600 border-red-200 hover:bg-red-50"
        >
          退出登录
        </MobileButton>
      </div>

      {/* 版本信息 */}
      <div className="px-4 pb-8 text-center">
        <p className="text-xs text-gray-400">
          Inspi.AI v1.0.0
        </p>
        <p className="text-xs text-gray-400 mt-1">
          © 2024 Inspi.AI. All rights reserved.
        </p>
      </div>
    </MobileLayout>
  );
}