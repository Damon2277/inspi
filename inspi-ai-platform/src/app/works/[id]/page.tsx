'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CARD_TYPE_CONFIG } from '@/types/teaching';
import type { TeachingCard } from '@/types/teaching';

interface WorkDetail {
  id: string;
  title: string;
  description: string;
  knowledgePoint: string;
  subject: string;
  gradeLevel: string;
  author: {
    id: string;
    name: string;
    avatar: string | null;
  };
  cards: TeachingCard[];
  tags: string[];
  status: string;
  reuseCount: number;
  createdAt: string;
  updatedAt: string;
  cardCount: number;
  cardTypes: string[];
}

export default function WorkDetailPage() {
  const params = useParams();
  const workId = params.id as string;
  
  const [work, setWork] = useState<WorkDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);

  useEffect(() => {
    const fetchWork = async () => {
      try {
        const response = await fetch(`/api/works/${workId}`);
        const data = await response.json();
        
        if (data.success) {
          setWork(data.data);
        } else {
          setError(data.message || '获取作品详情失败');
        }
      } catch (err) {
        console.error('Fetch work error:', err);
        setError('网络错误，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    if (workId) {
      fetchWork();
    }
  }, [workId]);

  const handleReuse = async () => {
    // TODO: 实现复用功能
    console.log('Reuse work:', workId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (error || !work) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">作品不存在</h1>
          <p className="text-gray-600 mb-6">{error || '找不到指定的作品'}</p>
          <button
            onClick={() => window.history.back()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            返回上一页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 作品头部信息 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{work.title}</h1>
              <p className="text-gray-600 mb-4">{work.description}</p>
              
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                  {work.subject}
                </span>
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                  {work.gradeLevel}
                </span>
                {work.tags.map((tag, index) => (
                  <span key={index} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex items-center text-sm text-gray-500">
                <span className="mr-4">作者：{work.author.name}</span>
                <span className="mr-4">复用次数：{work.reuseCount}</span>
                <span>创建时间：{new Date(work.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 ml-6">
              <button
                onClick={handleReuse}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                🔄 复用到我的创作
              </button>
              <button
                onClick={() => window.history.back()}
                className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                返回
              </button>
            </div>
          </div>
        </div>

        {/* 教学卡片展示 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">教学创意卡片</h2>
          
          {/* 卡片导航 */}
          <div className="flex flex-wrap gap-2 mb-6">
            {work.cards.map((card, index) => {
              const config = CARD_TYPE_CONFIG[card.type];
              return (
                <button
                  key={card.id}
                  onClick={() => setCurrentCardIndex(index)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    currentCardIndex === index
                      ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span>{config.icon}</span>
                  <span className="text-sm font-medium">{config.title}</span>
                </button>
              );
            })}
          </div>

          {/* 当前卡片内容 */}
          {work.cards[currentCardIndex] && (
            <motion.div
              key={currentCardIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="border rounded-lg p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  CARD_TYPE_CONFIG[work.cards[currentCardIndex].type].color
                }`}>
                  <span className="text-lg">
                    {CARD_TYPE_CONFIG[work.cards[currentCardIndex].type].icon}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {work.cards[currentCardIndex].title}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {work.cards[currentCardIndex].explanation}
                  </p>
                </div>
              </div>
              
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-gray-700">
                  {work.cards[currentCardIndex].content}
                </div>
              </div>
            </motion.div>
          )}

          {/* 卡片导航按钮 */}
          <div className="flex justify-between mt-6">
            <button
              onClick={() => setCurrentCardIndex(Math.max(0, currentCardIndex - 1))}
              disabled={currentCardIndex === 0}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              上一张
            </button>
            
            <span className="text-sm text-gray-500 flex items-center">
              {currentCardIndex + 1} / {work.cards.length}
            </span>
            
            <button
              onClick={() => setCurrentCardIndex(Math.min(work.cards.length - 1, currentCardIndex + 1))}
              disabled={currentCardIndex === work.cards.length - 1}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一张
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}