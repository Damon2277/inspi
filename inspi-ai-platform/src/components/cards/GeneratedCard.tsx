'use client';

import React, { useState, useRef, useEffect } from 'react';

import { CardEditor, defaultCardStyle, type CardStyle } from './CardEditor';
import { ExportSharePanel } from './ExportSharePanel';

interface GeneratedCardProps {
  card: {
    id: string;
    type: 'visualization' | 'analogy' | 'thinking' | 'interaction';
    title: string;
    content: string;
    explanation: string;
  };
  className?: string;
}

const cardTypeConfig = {
  visualization: {
    name: '可视化卡',
    icon: '👁️',
    color: '#3b82f6',
    description: '化抽象为"看见"',
  },
  analogy: {
    name: '类比延展卡',
    icon: '🌟',
    color: '#10b981',
    description: '用生活的温度，点亮知识',
  },
  thinking: {
    name: '启发思考卡',
    icon: '💭',
    color: '#8b5cf6',
    description: '抛出一个好问题',
  },
  interaction: {
    name: '互动氛围卡',
    icon: '🎭',
    color: '#f59e0b',
    description: '让课堂"破冰"',
  },
};

export function GeneratedCard({ card, className = '' }: GeneratedCardProps) {
  const [cardContent, setCardContent] = useState(card.content);
  const [cardStyle, setCardStyle] = useState<CardStyle>({
    ...defaultCardStyle,
    backgroundColor: '#ffffff',
    borderColor: cardTypeConfig[card.type].color,
    borderWidth: 2,
  });
  const [isEditing, setIsEditing] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const typeConfig = cardTypeConfig[card.type];

  // 处理内容变化
  const handleContentChange = (newContent: string) => {
    setCardContent(newContent);
  };

  // 处理样式变化
  const handleStyleChange = (newStyle: CardStyle) => {
    setCardStyle(newStyle);
  };

  return (
    <div className={`generated-card ${className}`} style={{ marginBottom: '24px' }}>
      {/* 卡片头部 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px',
        padding: '12px 16px',
        backgroundColor: '#f9fafb',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            backgroundColor: typeConfig.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
          }}>
            {typeConfig.icon}
          </div>
          <div>
            <h3 style={{
              margin: '0',
              fontSize: '16px',
              fontWeight: '600',
              color: '#374151',
            }}>
              {typeConfig.name}
            </h3>
            <p style={{
              margin: '2px 0 0 0',
              fontSize: '14px',
              color: '#6b7280',
            }}>
              {typeConfig.description}
            </p>
          </div>
        </div>

        {/* 操作按钮 */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setIsEditing(!isEditing)}
            style={{
              padding: '6px 12px',
              backgroundColor: isEditing ? '#ef4444' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {isEditing ? '👁️ 预览' : '✏️ 编辑'}
          </button>
        </div>
      </div>

      {/* 卡片内容区域 */}
      <div
        ref={cardRef}
        className="card-export-area"
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          marginBottom: '16px',
        }}
      >
        {isEditing ? (
          <CardEditor
            initialContent={cardContent}
            onContentChange={handleContentChange}
            onStyleChange={handleStyleChange}
            style={cardStyle}
          />
        ) : (
          <div
            style={{
              backgroundColor: cardStyle.backgroundColor,
              color: cardStyle.textColor,
              fontSize: `${cardStyle.fontSize}px`,
              fontFamily: cardStyle.fontFamily,
              padding: `${cardStyle.padding}px`,
              borderRadius: `${cardStyle.borderRadius}px`,
              border: `${cardStyle.borderWidth}px solid ${cardStyle.borderColor}`,
              minHeight: '200px',
              position: 'relative',
            }}
          >
            {/* 卡片类型标识 */}
            <div style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              padding: '4px 8px',
              backgroundColor: typeConfig.color,
              color: 'white',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}>
              {typeConfig.icon}
              <span>{typeConfig.name}</span>
            </div>

            {/* 卡片标题 */}
            <h2 style={{
              margin: '0 0 16px 0',
              fontSize: `${cardStyle.fontSize + 4}px`,
              fontWeight: '700',
              color: typeConfig.color,
              paddingRight: '120px', // 为右上角标识留空间
            }}>
              {card.title}
            </h2>

            {/* 卡片内容 */}
            <div
              dangerouslySetInnerHTML={{ __html: cardContent }}
              style={{
                lineHeight: '1.6',
                wordBreak: 'break-word',
              }}
            />

            {/* 底部说明 */}
            <div style={{
              marginTop: '16px',
              paddingTop: '16px',
              borderTop: `1px solid ${cardStyle.borderColor}`,
              fontSize: `${cardStyle.fontSize - 2}px`,
              color: '#6b7280',
              fontStyle: 'italic',
            }}>
              {card.explanation}
            </div>

            {/* AI生成标识 */}
            <div style={{
              position: 'absolute',
              bottom: '12px',
              right: '12px',
              fontSize: '10px',
              color: '#9ca3af',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}>
              <span>✨</span>
              <span>AI生成</span>
            </div>
          </div>
        )}
      </div>

      {/* 导出和分享面板 */}
      <ExportSharePanel
        cardElement={cardRef.current}
        cardData={{
          id: card.id,
          title: card.title,
          content: cardContent,
          type: card.type,
        }}
      />

      {/* 卡片说明 */}
      {!isEditing && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          backgroundColor: '#f0f9ff',
          borderRadius: '8px',
          border: '1px solid #bae6fd',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <span style={{ fontSize: '16px', marginTop: '2px' }}>💡</span>
            <div>
              <p style={{
                margin: '0 0 4px 0',
                fontSize: '14px',
                fontWeight: '500',
                color: '#0c4a6e',
              }}>
                使用建议
              </p>
              <p style={{
                margin: '0',
                fontSize: '13px',
                color: '#075985',
                lineHeight: '1.5',
              }}>
                点击"编辑"按钮可以修改内容和样式，完成后可以下载为图片或分享到社交媒体。
                支持多种导出格式，包括高清打印、社交媒体分享等。
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
