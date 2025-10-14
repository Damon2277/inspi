'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import React, { useState, useEffect } from 'react';

interface SharedCard {
  id: string;
  type: 'visualization' | 'analogy' | 'thinking' | 'interaction';
  title: string;
  content: string;
  explanation: string;
  createdAt?: string;
  author?: string;
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

export default function SharedCardPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [card, setCard] = useState<SharedCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCard = async () => {
      try {
        const cardId = params.id as string;

        // 尝试从URL参数中获取数据
        const dataParam = searchParams.get('data');
        if (dataParam) {
          try {
            const decodedData = JSON.parse(atob(dataParam));
            setCard({
              id: cardId,
              ...decodedData,
              createdAt: new Date().toISOString(),
            });
            setLoading(false);
            return;
          } catch (e) {
            console.warn('无法解析URL中的卡片数据');
          }
        }

        // 如果URL中没有数据，尝试从API获取
        const response = await fetch(`/api/share/card/${cardId}`);
        if (response.ok) {
          const cardData = await response.json();
          setCard(cardData);
        } else {
          // 如果API也没有数据，显示默认内容
          setCard({
            id: cardId,
            type: 'visualization',
            title: '分享的教学卡片',
            content: '这是一张通过Inspi.AI生成的教学卡片。',
            explanation: '使用AI技术生成的个性化教学内容。',
          });
        }
      } catch (err) {
        setError('加载卡片失败');
        console.error('加载分享卡片失败:', err);
      } finally {
        setLoading(false);
      }
    };

    loadCard();
  }, [params.id, searchParams]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px',
          }}></div>
          <p style={{ color: '#6b7280' }}>加载中...</p>
        </div>
      </div>
    );
  }

  if (error || !card) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb',
      }}>
        <div style={{ textAlign: 'center', maxWidth: '400px', padding: '24px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>😕</div>
          <h1 style={{ fontSize: '24px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
            卡片不存在
          </h1>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>
            {error || '找不到您要查看的卡片，可能链接已过期或不存在。'}
          </p>
          <Link
            href="/"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              backgroundColor: '#3b82f6',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '8px',
              fontWeight: '500',
            }}
          >
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  const typeConfig = cardTypeConfig[card.type];

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      padding: '24px',
    }}>
      {/* 头部导航 */}
      <div style={{
        maxWidth: '800px',
        margin: '0 auto 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#3b82f6',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          ← 返回首页
        </Link>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#6b7280',
          fontSize: '14px',
        }}>
          <span>✨</span>
          <span>由 Inspi.AI 生成</span>
        </div>
      </div>

      {/* 卡片内容 */}
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
      }}>
        {/* 卡片类型标识 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '24px',
          padding: '16px 20px',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: typeConfig.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
          }}>
            {typeConfig.icon}
          </div>
          <div>
            <h2 style={{
              margin: '0',
              fontSize: '20px',
              fontWeight: '600',
              color: '#374151',
            }}>
              {typeConfig.name}
            </h2>
            <p style={{
              margin: '4px 0 0 0',
              fontSize: '14px',
              color: '#6b7280',
            }}>
              {typeConfig.description}
            </p>
          </div>
        </div>

        {/* 主卡片 */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          border: `3px solid ${typeConfig.color}`,
          position: 'relative',
          marginBottom: '24px',
        }}>
          {/* 卡片标题 */}
          <h1 style={{
            margin: '0 0 24px 0',
            fontSize: '28px',
            fontWeight: '700',
            color: typeConfig.color,
            lineHeight: '1.3',
          }}>
            {card.title}
          </h1>

          {/* 卡片内容 */}
          <div
            dangerouslySetInnerHTML={{ __html: card.content }}
            style={{
              fontSize: '16px',
              lineHeight: '1.7',
              color: '#374151',
              marginBottom: '24px',
            }}
          />

          {/* 说明文字 */}
          <div style={{
            paddingTop: '24px',
            borderTop: `2px solid ${typeConfig.color}20`,
            fontSize: '14px',
            color: '#6b7280',
            fontStyle: 'italic',
          }}>
            {card.explanation}
          </div>

          {/* AI生成标识 */}
          <div style={{
            position: 'absolute',
            bottom: '16px',
            right: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: '#9ca3af',
            backgroundColor: '#f9fafb',
            padding: '4px 8px',
            borderRadius: '6px',
          }}>
            <span>✨</span>
            <span>AI生成</span>
          </div>
        </div>

        {/* 底部信息 */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          textAlign: 'center',
        }}>
          <h3 style={{
            margin: '0 0 12px 0',
            fontSize: '18px',
            fontWeight: '600',
            color: '#374151',
          }}>
            想要创建自己的教学卡片？
          </h3>
          <p style={{
            margin: '0 0 20px 0',
            fontSize: '14px',
            color: '#6b7280',
            lineHeight: '1.5',
          }}>
            使用 Inspi.AI 的 AI 教学魔法师，几秒钟就能生成个性化的教学内容
          </p>
          <Link
            href="/create"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              backgroundColor: '#3b82f6',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '8px',
              fontWeight: '500',
              fontSize: '14px',
            }}
          >
            立即体验 ✨
          </Link>
        </div>
      </div>

      {/* 添加旋转动画的CSS */}
      {/* eslint-disable-next-line react/no-unknown-property */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
