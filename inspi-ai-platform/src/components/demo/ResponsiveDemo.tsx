/**
 * 响应式设计演示组件
 */
import React from 'react';

import { useResponsive, useResponsiveValue } from '@/shared/hooks/useResponsive';

/**
 * 响应式设计演示页面
 */
export default function ResponsiveDemo() {
  const responsive = useResponsive();

  // 使用响应式值
  const gridCols = useResponsiveValue({
    mobile: 1,
    tablet: 2,
    desktop: 3,
    wide: 4,
  });

  // 示例卡片内容
  const cardContent = [
    { id: 1, title: '卡片 1', content: '这是第一张响应式卡片的内容。' },
    { id: 2, title: '卡片 2', content: '这是第二张响应式卡片的内容。' },
    { id: 3, title: '卡片 3', content: '这是第三张响应式卡片的内容。' },
    { id: 4, title: '卡片 4', content: '这是第四张响应式卡片的内容。' },
    { id: 5, title: '卡片 5', content: '这是第五张响应式卡片的内容。' },
    { id: 6, title: '卡片 6', content: '这是第六张响应式卡片的内容。' },
  ];

  const sidebar = (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4">侧边栏</h3>
      <div className="space-y-2">
        <div className="p-2 bg-gray-100 rounded">快捷功能 1</div>
        <div className="p-2 bg-gray-100 rounded">快捷功能 2</div>
        <div className="p-2 bg-gray-100 rounded">最近活动</div>
      </div>
    </div>
  );

  const rightPanel = (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4">右侧面板</h3>
      <div className="space-y-2">
        <div className="p-2 bg-blue-50 rounded">相关信息</div>
        <div className="p-2 bg-blue-50 rounded">推荐内容</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 响应式信息显示 */}
      <div className="bg-white border-b p-4">
        <div className="container mx-auto">
          <div className="text-sm text-gray-600">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>断点: <span className="font-mono font-bold">{responsive.breakpoint}</span></div>
              <div>屏幕: <span className="font-mono">{responsive.screenWidth}×{responsive.screenHeight}</span></div>
              <div>方向: <span className="font-mono">{responsive.orientation}</span></div>
              <div>网格列数: <span className="font-mono">{gridCols}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="flex">
        {responsive.isTablet && (
          <div className="w-64 bg-white border-r">
            {sidebar}
          </div>
        )}
        <div className="flex-1">
          <div className="container mx-auto py-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-4">响应式设计演示</h1>
              <p className="text-gray-600 mb-6">
                这个页面展示了响应式设计的各种特性，包括断点检测、响应式网格、条件渲染等。
              </p>
            </div>

            {/* 响应式网格 */}
            <div className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">响应式网格</h2>
              <div className={`grid gap-4 mb-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-${gridCols}`}>
                {cardContent.map((card) => (
                  <div
                    key={card.id}
                    className="bg-white p-6 rounded-lg shadow-sm border hover-lift"
                  >
                    <h3 className="text-lg font-semibold mb-2">{card.title}</h3>
                    <p className="text-gray-600">{card.content}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 断点可见性测试 */}
            <div className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">断点可见性</h2>
              <div className="space-y-2">
                <div className="mobile-only p-4 bg-red-100 rounded">
                  📱 只在移动端显示 (&lt; 768px)
                </div>
                <div className="tablet-up p-4 bg-yellow-100 rounded">
                  📟 平板端及以上显示 (≥ 768px)
                </div>
                <div className="desktop-up p-4 bg-green-100 rounded">
                  💻 桌面端及以上显示 (≥ 1024px)
                </div>
              </div>
            </div>

            {/* 响应式字体演示 */}
            <div className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">响应式字体</h2>
              <div className="space-y-4">
                <div className="responsive-text">
                  这段文字使用响应式字体大小，会根据屏幕尺寸自动调整。
                </div>
                <div style={{ fontSize: 'var(--text-lg)' }}>
                  这段文字使用CSS变量定义的大号字体。
                </div>
                <div style={{ fontSize: 'var(--text-xl)' }}>
                  这段文字使用CSS变量定义的特大号字体。
                </div>
              </div>
            </div>
          </div>
        </div>
        {responsive.isDesktop && (
          <div className="w-64 bg-white border-l">
            {rightPanel}
          </div>
        )}
      </div>
    </div>
  );
}
