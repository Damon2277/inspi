'use client';

import React from 'react';
import { DesktopLayout } from '@/components/desktop';

/**
 * 作品页面 - 暂时只显示桌面端版本
 */
export default function WorksPage() {
  // 直接显示桌面端版本，不做响应式检测
  return (
    <DesktopLayout>
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
              <button className="desktop-button desktop-button-primary">
                返回首页
              </button>
              <button className="desktop-button desktop-button-outline">
                去创作
              </button>
            </div>
          </div>
        </div>
      </div>
    </DesktopLayout>
  );
}

/* 
// 移动端代码已注释，等桌面端调试完成后再启用
export default function WorksPage() {
  const [activeTab, setActiveTab] = useState('published');
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(false);

  // 大量移动端代码...
  
  return (
    <MobileLayout title="我的作品">
      // 移动端界面...
    </MobileLayout>
  );
}
*/