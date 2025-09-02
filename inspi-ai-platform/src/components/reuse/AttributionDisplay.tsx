'use client';

import React from 'react';
import Link from 'next/link';
import { Attribution, AttributionDisplayConfig } from '@/types/reuse';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export interface AttributionDisplayProps {
  attribution: Attribution;
  config?: Partial<AttributionDisplayConfig>;
  className?: string;
  showRemoveWarning?: boolean;
}

const defaultConfig: AttributionDisplayConfig = {
  showAuthor: true,
  showWorkTitle: true,
  showReuseDate: true,
  format: 'full',
  linkToOriginal: true
};

export const AttributionDisplay: React.FC<AttributionDisplayProps> = ({
  attribution,
  config = {},
  className = '',
  showRemoveWarning = false
}) => {
  const finalConfig = { ...defaultConfig, ...config };
  const reuseDate = new Date(attribution.reuseDate);
  const timeAgo = formatDistanceToNow(reuseDate, {
    addSuffix: true,
    locale: zhCN
  });

  // 根据格式类型渲染不同样式
  const renderAttribution = () => {
    switch (finalConfig.format) {
      case 'minimal':
        return renderMinimalFormat();
      case 'compact':
        return renderCompactFormat();
      case 'full':
      default:
        return renderFullFormat();
    }
  };

  // 完整格式
  const renderFullFormat = () => (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start space-x-3">
        {/* 归属图标 */}
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
        </div>

        {/* 归属内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-2">
            <h4 className="text-sm font-medium text-blue-900">
              作品归属信息
            </h4>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {attribution.reuseType === 'full' ? '完整复用' : '部分复用'}
            </span>
          </div>
          
          <div className="text-sm text-blue-800 space-y-1">
            {finalConfig.showAuthor && (
              <p>
                <span className="font-medium">原作者：</span>
                <span className="text-blue-700">{attribution.originalAuthorName}</span>
              </p>
            )}
            
            {finalConfig.showWorkTitle && (
              <p>
                <span className="font-medium">原作品：</span>
                {finalConfig.linkToOriginal ? (
                  <Link 
                    href={`/works/${attribution.originalWorkId}`}
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    {attribution.originalWorkTitle}
                  </Link>
                ) : (
                  <span className="text-blue-700">{attribution.originalWorkTitle}</span>
                )}
              </p>
            )}
            
            {finalConfig.showReuseDate && (
              <p>
                <span className="font-medium">复用时间：</span>
                <span className="text-blue-700">{timeAgo}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 移除警告 */}
      {showRemoveWarning && (
        <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-md">
          <div className="flex items-center">
            <svg className="w-4 h-4 text-amber-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-xs text-amber-700">
              此归属信息不可删除，是对原作者的致敬和版权保护
            </span>
          </div>
        </div>
      )}
    </div>
  );

  // 紧凑格式
  const renderCompactFormat = () => (
    <div className={`bg-gray-50 border border-gray-200 rounded-md p-2 ${className}`}>
      <div className="flex items-center space-x-2 text-xs text-gray-600">
        <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        <span>
          复用自 
          {finalConfig.linkToOriginal ? (
            <Link 
              href={`/works/${attribution.originalWorkId}`}
              className="text-blue-600 hover:text-blue-800 underline mx-1"
            >
              {attribution.originalWorkTitle}
            </Link>
          ) : (
            <span className="text-gray-700 mx-1">{attribution.originalWorkTitle}</span>
          )}
          by {attribution.originalAuthorName}
        </span>
        {finalConfig.showReuseDate && (
          <span className="text-gray-500">• {timeAgo}</span>
        )}
      </div>
    </div>
  );

  // 最小格式
  const renderMinimalFormat = () => (
    <div className={`text-xs text-gray-500 ${className}`}>
      复用自 
      {finalConfig.linkToOriginal ? (
        <Link 
          href={`/works/${attribution.originalWorkId}`}
          className="text-blue-600 hover:text-blue-800 underline mx-1"
        >
          {attribution.originalWorkTitle}
        </Link>
      ) : (
        <span className="text-gray-600 mx-1">{attribution.originalWorkTitle}</span>
      )}
      by {attribution.originalAuthorName}
    </div>
  );

  return renderAttribution();
};

export default AttributionDisplay;