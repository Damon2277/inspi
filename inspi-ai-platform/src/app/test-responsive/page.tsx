/**
 * 响应式设计测试页面
 * 用于验证响应式组件和布局
 */

'use client';

import { useResponsive, useIsMobile, useIsTouchDevice } from '@/hooks/useResponsive';
import { ResponsiveGrid, GridItem, ResponsiveContainer, ResponsiveFlex } from '@/components/common/ResponsiveGrid';

export default function TestResponsivePage() {
  const responsive = useResponsive();
  const isMobile = useIsMobile();
  const isTouchDevice = useIsTouchDevice();

  return (
    <ResponsiveContainer className="py-8">
      <div className="space-y-8">
        {/* 响应式状态信息 */}
        <div className="mobile-card">
          <h1 className="text-2xl font-bold mb-4">响应式设计测试</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">设备信息</h3>
              <ul className="space-y-1 text-sm">
                <li>屏幕宽度: {responsive.screenWidth}px</li>
                <li>屏幕高度: {responsive.screenHeight}px</li>
                <li>当前断点: {responsive.currentBreakpoint}</li>
                <li>是否移动端: {isMobile ? '是' : '否'}</li>
                <li>是否触摸设备: {isTouchDevice ? '是' : '否'}</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">断点状态</h3>
              <ul className="space-y-1 text-sm">
                <li className={responsive.isMobile ? 'text-green-600 font-medium' : 'text-gray-400'}>
                  Mobile (≤767px): {responsive.isMobile ? '✓' : '✗'}
                </li>
                <li className={responsive.isTablet ? 'text-green-600 font-medium' : 'text-gray-400'}>
                  Tablet (768-1023px): {responsive.isTablet ? '✓' : '✗'}
                </li>
                <li className={responsive.isDesktop ? 'text-green-600 font-medium' : 'text-gray-400'}>
                  Desktop (1024-1439px): {responsive.isDesktop ? '✓' : '✗'}
                </li>
                <li className={responsive.isWide ? 'text-green-600 font-medium' : 'text-gray-400'}>
                  Wide (≥1440px): {responsive.isWide ? '✓' : '✗'}
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* 响应式网格测试 */}
        <div className="mobile-card">
          <h2 className="text-xl font-bold mb-4">响应式网格系统</h2>
          <ResponsiveGrid
            columns={{ mobile: 1, tablet: 2, desktop: 3, wide: 4, default: 3 }}
            gap={{ mobile: '1rem', tablet: '1.5rem', desktop: '2rem', default: '1.5rem' }}
          >
            {Array.from({ length: 8 }, (_, i) => (
              <GridItem key={i}>
                <div className="bg-blue-100 p-4 rounded-lg text-center">
                  <h3 className="font-semibold">卡片 {i + 1}</h3>
                  <p className="text-sm text-gray-600 mt-2">
                    这是一个响应式网格项目
                  </p>
                </div>
              </GridItem>
            ))}
          </ResponsiveGrid>
        </div>

        {/* 响应式Flex布局测试 */}
        <div className="mobile-card">
          <h2 className="text-xl font-bold mb-4">响应式Flex布局</h2>
          <ResponsiveFlex
            direction={{ mobile: 'column', tablet: 'row', default: 'row' }}
            justify={{ mobile: 'center', tablet: 'space-between', default: 'space-between' }}
            align={{ mobile: 'stretch', tablet: 'center', default: 'center' }}
            gap={{ mobile: '1rem', tablet: '2rem', default: '2rem' }}
          >
            <div className="bg-green-100 p-4 rounded-lg flex-1">
              <h3 className="font-semibold">Flex项目 1</h3>
              <p className="text-sm text-gray-600 mt-2">
                移动端垂直排列，平板和桌面端水平排列
              </p>
            </div>
            <div className="bg-yellow-100 p-4 rounded-lg flex-1">
              <h3 className="font-semibold">Flex项目 2</h3>
              <p className="text-sm text-gray-600 mt-2">
                自动调整布局方向和对齐方式
              </p>
            </div>
            <div className="bg-purple-100 p-4 rounded-lg flex-1">
              <h3 className="font-semibold">Flex项目 3</h3>
              <p className="text-sm text-gray-600 mt-2">
                响应式间距和对齐
              </p>
            </div>
          </ResponsiveFlex>
        </div>

        {/* 触摸优化测试 */}
        <div className="mobile-card">
          <h2 className="text-xl font-bold mb-4">触摸优化测试</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">按钮尺寸测试</h3>
              <div className="flex flex-wrap gap-4">
                <button className="mobile-button bg-blue-600 text-white">
                  标准按钮
                </button>
                <button className="touch-target bg-green-600 text-white rounded-lg">
                  触摸目标
                </button>
                <button className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                  大按钮
                </button>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">输入框测试</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="标准输入框"
                  className="mobile-input"
                />
                <textarea
                  placeholder="文本区域"
                  rows={3}
                  className="mobile-input resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 字体和间距测试 */}
        <div className="mobile-card">
          <h2 className="text-xl font-bold mb-4">字体和间距测试</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">字体大小</h3>
              <div className="space-y-2">
                <p className="text-xs">超小字体 (text-xs)</p>
                <p className="text-sm">小字体 (text-sm)</p>
                <p className="text-base">基础字体 (text-base)</p>
                <p className="text-lg">大字体 (text-lg)</p>
                <p className="text-xl">超大字体 (text-xl)</p>
                <p className="text-2xl">2倍大字体 (text-2xl)</p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">间距测试</h3>
              <div className="space-y-2">
                <div className="p-2 bg-gray-100 rounded">padding-2</div>
                <div className="p-4 bg-gray-100 rounded">padding-4</div>
                <div className="p-6 bg-gray-100 rounded">padding-6</div>
                <div className="p-8 bg-gray-100 rounded">padding-8</div>
              </div>
            </div>
          </div>
        </div>

        {/* 卡片样式测试 */}
        <div className="mobile-card">
          <h2 className="text-xl font-bold mb-4">卡片样式测试</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="mobile-card bg-gradient-to-br from-blue-50 to-blue-100">
              <h3 className="font-semibold text-blue-800">蓝色卡片</h3>
              <p className="text-blue-600 mt-2">这是一个带渐变背景的卡片</p>
            </div>
            <div className="mobile-card bg-gradient-to-br from-green-50 to-green-100">
              <h3 className="font-semibold text-green-800">绿色卡片</h3>
              <p className="text-green-600 mt-2">支持触摸反馈和动画效果</p>
            </div>
            <div className="mobile-card bg-gradient-to-br from-purple-50 to-purple-100">
              <h3 className="font-semibold text-purple-800">紫色卡片</h3>
              <p className="text-purple-600 mt-2">自动适配不同屏幕尺寸</p>
            </div>
          </div>
        </div>

        {/* 调试信息 */}
        <div className="mobile-card bg-gray-50">
          <h2 className="text-xl font-bold mb-4">调试信息</h2>
          <pre className="text-xs bg-white p-4 rounded border overflow-x-auto">
            {JSON.stringify(responsive, null, 2)}
          </pre>
        </div>
      </div>
    </ResponsiveContainer>
  );
}