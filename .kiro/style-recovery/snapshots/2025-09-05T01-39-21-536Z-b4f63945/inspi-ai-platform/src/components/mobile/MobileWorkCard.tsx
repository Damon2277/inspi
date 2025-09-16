'use client';

import React from 'react';
import Image from 'next/image';
import { WorkCardData } from '@/types/square';

interface MobileWorkCardProps {
  work: WorkCardData;
  onReuse?: (workId: string) => void;
  onView?: (workId: string) => void;
}

const MobileWorkCard: React.FC<MobileWorkCardProps> = ({ work, onReuse, onView }) => {
  const handleReuseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onReuse?.(work.id);
  };

  const handleCardClick = () => {
    onView?.(work.id);
  };

  // 卡片类型图标映射
  const getCardTypeIcon = (type: string) => {
    const icons = {
      visualization: '👁️',
      analogy: '🔗',
      thinking: '💭',
      interaction: '🎯'
    };
    return icons[type as keyof typeof icons] || '📝';
  };

  // 学科颜色映射
  const getSubjectColor = (subject: string) => {
    const colors = {
      '数学': 'bg-blue-100 text-blue-800',
      '语文': 'bg-green-100 text-green-800',
      '英语': 'bg-purple-100 text-purple-800',
      '科学': 'bg-orange-100 text-orange-800',
      '历史': 'bg-yellow-100 text-yellow-800',
      '地理': 'bg-teal-100 text-teal-800'
    };
    return colors[subject as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div 
      className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden active:bg-gray-50 transition-colors duration-150"
      onClick={handleCardClick}
      style={{ 
        minHeight: '44px', // 确保触摸目标足够大
        touchAction: 'manipulation' // 优化触摸响应
      }}
    >
      {/* 移动端紧凑头部 */}
      <div className="p-3">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-base font-semibold text-gray-900 line-clamp-2 flex-1 pr-2">
            {work.title}
          </h3>
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${getSubjectColor(work.subject)}`}>
            {work.subject}
          </span>
        </div>
        
        {/* 知识点 - 移动端简化显示 */}
        <p className="text-sm text-gray-600 mb-2 line-clamp-1">
          {work.knowledgePoint}
        </p>

        {/* 作者和时间信息 - 移动端一行显示 */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
              {work.author.avatar ? (
                <Image
                  src={work.author.avatar}
                  alt={work.author.name}
                  width={20}
                  height={20}
                  className="rounded-full"
                />
              ) : (
                <span className="text-xs text-gray-600">
                  {work.author.name.charAt(0)}
                </span>
              )}
            </div>
            <span className="text-sm text-gray-600 truncate">{work.author.name}</span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs text-gray-400">{work.gradeLevel}</span>
          </div>
          <span className="text-xs text-gray-400 flex-shrink-0">
            {new Date(work.createdAt).toLocaleDateString('zh-CN', { 
              month: 'short', 
              day: 'numeric' 
            })}
          </span>
        </div>

        {/* 卡片类型 - 移动端紧凑显示 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            {work.cardTypes.slice(0, 3).map((type, index) => (
              <span 
                key={index}
                className="inline-flex items-center justify-center w-5 h-5 bg-gray-100 rounded-full text-xs"
                title={type}
              >
                {getCardTypeIcon(type)}
              </span>
            ))}
            {work.cardCount > 3 && (
              <span className="text-xs text-gray-500">+{work.cardCount - 3}</span>
            )}
          </div>

          {/* 移动端操作区域 */}
          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1 text-xs text-gray-500">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span>{work.reuseCount}</span>
            </span>
            
            <button
              onClick={handleReuseClick}
              className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md text-indigo-600 bg-indigo-50 active:bg-indigo-100 transition-colors duration-150"
              style={{ 
                minHeight: '32px', // 确保按钮足够大
                minWidth: '44px',
                touchAction: 'manipulation'
              }}
            >
              复用
            </button>
          </div>
        </div>

        {/* 标签 - 移动端最多显示2个 */}
        {work.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {work.tags.slice(0, 2).map((tag, index) => (
              <span 
                key={index}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700"
              >
                #{tag}
              </span>
            ))}
            {work.tags.length > 2 && (
              <span className="text-xs text-gray-500">+{work.tags.length - 2}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(MobileWorkCard);