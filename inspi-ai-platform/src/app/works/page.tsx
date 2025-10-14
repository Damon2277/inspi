'use client';

import Link from 'next/link';
import React from 'react';

import { AppLayout } from '@/components/layout';

/**
 * 作品页面 - 暂时只显示桌面端版本
 */
export default function WorksPage() {
  return (
    <AppLayout>
      <div className="desktop-container">
        <div className="desktop-section">
          <h1 className="desktop-section-title text-gray-900 mb-4">
            我的作品
          </h1>
          <p className="desktop-section-subtitle mb-8">
            管理和查看您的教学创作
          </p>

          <div className="desktop-card desktop-card-lg text-center">
            <div className="text-6xl mb-6">📚</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              作品管理功能开发中
            </h2>
            <p className="text-gray-600 mb-6">
              我们正在为您打造更好的作品管理体验，敬请期待！
            </p>
            <div className="desktop-button-group">
              <Link href="/" className="desktop-button desktop-button-primary">
                返回首页
              </Link>
              <Link href="/create" className="desktop-button desktop-button-outline">
                去创作
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
