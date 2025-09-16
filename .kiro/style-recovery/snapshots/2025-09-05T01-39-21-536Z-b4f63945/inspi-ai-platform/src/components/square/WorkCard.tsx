'use client';

import React from 'react';
import Image from 'next/image';
import { WorkCardData } from '@/types/square';

interface WorkCardProps {
  work: WorkCardData;
  onReuse?: (workId: string) => void;
  onView?: (workId: string) => void;
}

const WorkCard: React.FC<WorkCardProps> = ({ work, onReuse, onView }) => {
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
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer overflow-hidden"
      onClick={handleCardClick}
    >
      {/* 卡片头部 */}
      <div className="p-4 pb-2">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 flex-1">
            {work.title}
          </h3>
          <div className="ml-2 flex-shrink-0">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSubjectColor(work.subject)}`}>
              {work.subject}
            </span>
          </div>
        </div>
        
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          知识点：{work.knowledgePoint}
        </p>
      </div>

      {/* 卡片类型展示 */}
      <div className="px-4 pb-3">
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500">包含卡片：</span>
          <div className="flex space-x-1">
            {work.cardTypes.slice(0, 4).map((type, index) => (
              <span 
                key={index}
                className="inline-flex items-center justify-center w-6 h-6 bg-gray-100 rounded-full text-xs"
                title={type}
              >
                {getCardTypeIcon(type)}
              </span>
            ))}
            {work.cardCount > 4 && (
              <span className="text-xs text-gray-500">+{work.cardCount - 4}</span>
            )}
          </div>
        </div>
      </div>

      {/* 作者信息 */}
      <div className="px-4 pb-3">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
            {work.author.avatar ? (
              <Image
                src={work.author.avatar}
                alt={work.author.name}
                width={24}
                height={24}
                className="rounded-full"
              />
            ) : (
              <span className="text-xs text-gray-600">
                {work.author.name.charAt(0)}
              </span>
            )}
          </div>
          <span className="text-sm text-gray-600">{work.author.name}</span>
          <span className="text-xs text-gray-400">•</span>
          <span className="text-xs text-gray-400">{work.gradeLevel}</span>
        </div>
      </div>

      {/* 标签 */}
      {work.tags.length > 0 && (
        <div className="px-4 pb-3">
          <div className="flex flex-wrap gap-1">
            {work.tags.slice(0, 3).map((tag, index) => (
              <span 
                key={index}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700"
              >
                #{tag}
              </span>
            ))}
            {work.tags.length > 3 && (
              <span className="text-xs text-gray-500">+{work.tags.length - 3}</span>
            )}
          </div>
        </div>
      )}

      {/* 卡片底部 */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span className="flex items-center space-x-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span>{work.reuseCount}</span>
            </span>
            <span className="text-xs">
              {new Date(work.createdAt).toLocaleDateString()}
            </span>
          </div>
          
          <button
            onClick={handleReuseClick}
            className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
          >
            复用
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(WorkCard);