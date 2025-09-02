/**
 * 移动端卡片滑动组件
 * 支持左右滑动浏览教学卡片
 */

'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { useTouch } from '@/hooks/useTouch';
import type { TeachingCard } from '@/types/teaching';

interface CardSwiperProps {
  cards: TeachingCard[];
  onCardChange?: (index: number) => void;
  onCardEdit?: (card: TeachingCard, index: number) => void;
  onCardRegenerate?: (cardId: string, cardType: string) => void;
  className?: string;
}

export default function CardSwiper({
  cards,
  onCardChange,
  onCardEdit,
  onCardRegenerate,
  className = ''
}: CardSwiperProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // 卡片类型图标映射
  const cardTypeIcons = {
    visualization: '👁️',
    analogy: '🔗',
    thinking: '💭',
    interaction: '🎯'
  };

  // 卡片类型名称映射
  const cardTypeNames = {
    visualization: '可视化卡',
    analogy: '类比延展卡',
    thinking: '启发思考卡',
    interaction: '互动氛围卡'
  };

  // 切换到指定卡片
  const goToCard = (index: number) => {
    if (index >= 0 && index < cards.length) {
      setCurrentIndex(index);
      onCardChange?.(index);
    }
  };

  // 下一张卡片
  const nextCard = () => {
    const nextIndex = (currentIndex + 1) % cards.length;
    goToCard(nextIndex);
  };

  // 上一张卡片
  const prevCard = () => {
    const prevIndex = (currentIndex - 1 + cards.length) % cards.length;
    goToCard(prevIndex);
  };

  // 处理拖拽
  const handleDrag = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setDragOffset(info.offset.x);
  };

  // 处理拖拽结束
  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 100; // 滑动阈值
    const velocity = info.velocity.x;
    
    if (Math.abs(info.offset.x) > threshold || Math.abs(velocity) > 500) {
      if (info.offset.x > 0 || velocity > 0) {
        prevCard();
      } else {
        nextCard();
      }
    }
    
    setDragOffset(0);
  };

  // 触摸手势处理
  useTouch(containerRef, {
    onSwipe: (gesture) => {
      if (gesture.direction === 'left') {
        nextCard();
      } else if (gesture.direction === 'right') {
        prevCard();
      }
    }
  });

  if (cards.length === 0) {
    return null;
  }

  const currentCard = cards[currentIndex];

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* 卡片容器 */}
      <div className="relative overflow-hidden rounded-xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="mobile-card cursor-grab active:cursor-grabbing"
            style={{ x: dragOffset }}
          >
            {/* 卡片头部 */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">
                  {cardTypeIcons[currentCard.type as keyof typeof cardTypeIcons]}
                </span>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {cardTypeNames[currentCard.type as keyof typeof cardTypeNames]}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {currentIndex + 1} / {cards.length}
                  </p>
                </div>
              </div>
              
              {/* 操作按钮 */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onCardEdit?.(currentCard, currentIndex)}
                  className="touch-target p-2 text-gray-400 hover:text-blue-600 transition-colors"
                  aria-label="编辑卡片"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => onCardRegenerate?.(currentCard.id, currentCard.type)}
                  className="touch-target p-2 text-gray-400 hover:text-green-600 transition-colors"
                  aria-label="重新生成卡片"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 卡片内容 */}
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">{currentCard.title}</h4>
                <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                  {currentCard.content}
                </div>
              </div>
              
              {currentCard.examples && currentCard.examples.length > 0 && (
                <div>
                  <h5 className="font-medium text-gray-800 mb-2 text-sm">示例：</h5>
                  <ul className="space-y-1">
                    {currentCard.examples.map((example, idx) => (
                      <li key={idx} className="text-sm text-gray-600 flex items-start">
                        <span className="text-blue-500 mr-2">•</span>
                        {example}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* 滑动提示 */}
            <div className="flex items-center justify-center mt-6 text-xs text-gray-400">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
              </svg>
              <span>左右滑动切换卡片</span>
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 导航指示器 */}
      <div className="flex items-center justify-center mt-4 space-x-2">
        {cards.map((_, index) => (
          <button
            key={index}
            onClick={() => goToCard(index)}
            className={`w-2 h-2 rounded-full transition-colors ${
              index === currentIndex ? 'bg-blue-600' : 'bg-gray-300'
            }`}
            aria-label={`切换到第${index + 1}张卡片`}
          />
        ))}
      </div>

      {/* 导航按钮 */}
      <div className="absolute top-1/2 -translate-y-1/2 left-2">
        <button
          onClick={prevCard}
          className="touch-target w-10 h-10 bg-white bg-opacity-80 rounded-full shadow-md flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors"
          aria-label="上一张卡片"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>
      
      <div className="absolute top-1/2 -translate-y-1/2 right-2">
        <button
          onClick={nextCard}
          className="touch-target w-10 h-10 bg-white bg-opacity-80 rounded-full shadow-md flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors"
          aria-label="下一张卡片"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* 卡片类型快速切换 */}
      <div className="mt-4 flex justify-center">
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {cards.map((card, index) => (
            <button
              key={card.id}
              onClick={() => goToCard(index)}
              className={`px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                index === currentIndex
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="mr-1">
                {cardTypeIcons[card.type as keyof typeof cardTypeIcons]}
              </span>
              {cardTypeNames[card.type as keyof typeof cardTypeNames]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}