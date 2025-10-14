'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

import { CARD_TYPE_CONFIG } from '@/shared/types/teaching';
import type { TeachingCard, CardType } from '@/shared/types/teaching';

interface CardEditorProps {
  cards: TeachingCard[];
  onCardsUpdate: (cards: TeachingCard[]) => void;
  onRegenerateCard: (cardId: string, cardType: CardType) => void;
  knowledgePoint: string;
  subject?: string;
  gradeLevel?: string;
}

export default function CardEditor({
  cards,
  onCardsUpdate,
  onRegenerateCard,
  knowledgePoint,
  subject,
  gradeLevel,
}: CardEditorProps) {
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [regeneratingCard, setRegeneratingCard] = useState<string | null>(null);

  const handleCardEdit = (cardId: string, field: 'title' | 'content', value: string) => {
    const updatedCards = cards.map(card =>
      card.id === cardId ? { ...card, [field]: value } : card,
    );
    onCardsUpdate(updatedCards);
  };

  const handleRegenerate = async (card: TeachingCard) => {
    setRegeneratingCard(card.id);
    try {
      await onRegenerateCard(card.id, card.type);
    } finally {
      setRegeneratingCard(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 头部信息 */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            📝 编辑教学卡片
          </h2>
          <div className="text-sm text-gray-500">
            知识点：{knowledgePoint} | {subject} | {gradeLevel}
          </div>
        </div>
        <p className="text-gray-600">
          您可以编辑卡片内容或要求AI重新生成。编辑后的内容将保存到您的作品中。
        </p>
      </div>

      {/* 卡片编辑区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {cards.map((card, index) => {
          const config = CARD_TYPE_CONFIG[card.type];
          const isEditing = editingCard === card.id;
          const isRegenerating = regeneratingCard === card.id;
          const generatedAtSource = card.metadata?.generatedAt;
          const generatedAtValue = generatedAtSource instanceof Date
            ? generatedAtSource
            : typeof generatedAtSource === 'string'
              ? new Date(generatedAtSource)
              : null;
          const generatedAtText = generatedAtValue && !Number.isNaN(generatedAtValue.getTime())
            ? generatedAtValue.toLocaleString()
            : '未记录';

          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`bg-white rounded-lg shadow-sm border-2 ${config.color} p-6`}
            >
              {/* 卡片头部 */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <span className="text-xl">{config.icon}</span>
                  <div>
                    <h3 className="font-medium text-gray-900">{config.title}</h3>
                    <p className="text-xs text-gray-500">{config.description}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setEditingCard(isEditing ? null : card.id)}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    title={isEditing ? '完成编辑' : '编辑卡片'}
                  >
                    {isEditing ? '✅' : '✏️'}
                  </button>
                  <button
                    onClick={() => handleRegenerate(card)}
                    disabled={isRegenerating}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                    title="重新生成"
                  >
                    {isRegenerating ? '🔄' : '🔄'}
                  </button>
                </div>
              </div>

              {/* 卡片标题 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  标题
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={card.title}
                    onChange={(e) => handleCardEdit(card.id, 'title', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="输入卡片标题"
                  />
                ) : (
                  <h4 className="text-lg font-medium text-gray-900">{card.title}</h4>
                )}
              </div>

              {/* 卡片内容 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  内容
                </label>
                {isEditing ? (
                  <textarea
                    value={card.content}
                    onChange={(e) => handleCardEdit(card.id, 'content', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={6}
                    placeholder="输入卡片内容"
                  />
                ) : (
                  <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {card.content}
                  </div>
                )}
              </div>

              {/* 重新生成状态 */}
              {isRegenerating && (
                <div className="flex items-center justify-center py-4">
                  <div className="flex items-center text-sm text-blue-600">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    AI正在重新生成...
                  </div>
                </div>
              )}

              {/* 卡片元数据 */}
              <div className="text-xs text-gray-500 border-t pt-3">
                生成时间: {generatedAtText}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* 操作按钮 */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            💡 提示：编辑完成后，您可以保存为作品并发布到智慧广场
          </div>
          <div className="flex space-x-3">
            <button className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              保存草稿
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              发布作品
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
