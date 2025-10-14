import type { Viewport } from 'next';
import Link from 'next/link';

import { BackButton } from '@/components/common/BackButton';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#FF8C00',
};

/**
 * 404 页面未找到
 */
export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-lg sm:px-10">
          {/* 404 图标 */}
          <div className="flex items-center justify-center w-20 h-20 mx-auto bg-blue-100 rounded-full mb-6">
            <svg
              className="w-10 h-10 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 20c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8a7.962 7.962 0 01-2 5.291z"
              />
            </svg>
          </div>

          {/* 404 标题 */}
          <div className="text-center mb-6">
            <h1 className="text-6xl font-bold text-gray-900 mb-2">404</h1>
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">页面未找到</h2>
            <p className="text-gray-600">
              抱歉，您访问的页面不存在或已被移动。
            </p>
          </div>

          {/* 建议操作 */}
          <div className="space-y-4 mb-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-800 mb-2">您可以尝试：</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 检查网址是否输入正确</li>
                <li>• 返回上一页重新导航</li>
                <li>• 访问我们的首页开始探索</li>
                <li>• 使用搜索功能查找内容</li>
              </ul>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="space-y-3">
            <Link
              href="/"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              返回首页
            </Link>
            <BackButton
              className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              label="返回上一页"
            />
          </div>

          {/* 快速导航 */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-4 text-center">
              热门功能
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/create"
                className="flex flex-col items-center p-3 text-center border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <svg className="w-6 h-6 text-blue-600 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span className="text-xs font-medium text-gray-700">开始创作</span>
              </Link>

              <Link
                href="/square"
                className="flex flex-col items-center p-3 text-center border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <svg className="w-6 h-6 text-blue-600 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span className="text-xs font-medium text-gray-700">智慧广场</span>
              </Link>

              <Link
                href="/help"
                className="flex flex-col items-center p-3 text-center border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <svg className="w-6 h-6 text-blue-600 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs font-medium text-gray-700">帮助中心</span>
              </Link>

              <Link
                href="/contact"
                className="flex flex-col items-center p-3 text-center border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <svg className="w-6 h-6 text-blue-600 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-xs font-medium text-gray-700">联系我们</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 页脚 */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500">
          Inspi.AI - 让AI成为您教学创意的放大器
        </p>
      </div>
    </div>
  );
}
