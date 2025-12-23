'use client';

import Link from 'next/link';
import React, { useState } from 'react';

import { GeneratedCard } from '@/components/cards/GeneratedCard';

/**
 * 卡片功能演示页面
 */
export default function CardFeaturesDemo() {
  const [selectedDemo, setSelectedDemo] = useState<string>('all');

  // 演示用的卡片数据
  const demoCards = [
    {
      id: 'demo-visualization-1',
      type: 'visualization' as const,
      title: '二次函数的图像特征',
      content: `
        <h3>二次函数 y = ax² + bx + c 的图像特征</h3>
        <p><strong>1. 开口方向：</strong></p>
        <ul>
          <li>当 a > 0 时，开口向上，像一个微笑的脸 😊</li>
          <li>当 a < 0 时，开口向下，像一个倒置的山峰 🏔️</li>
        </ul>
        
        <p><strong>2. 对称轴：</strong></p>
        <p>对称轴方程为 x = -b/(2a)，这是抛物线的"脊梁骨"</p>
        
        <p><strong>3. 顶点坐标：</strong></p>
        <p>顶点是抛物线的"最高点"或"最低点"，坐标为 (-b/(2a), (4ac-b²)/(4a))</p>
      `,
      explanation: '通过生动的比喻和视觉化描述，帮助学生理解二次函数图像的基本特征',
    },
    {
      id: 'demo-analogy-1',
      type: 'analogy' as const,
      title: '电流就像水流',
      content: `
        <h3>电流的本质 - 水流类比法</h3>
        <p>想象电路就像一个水管系统：</p>
        
        <p><strong>🌊 电流 = 水流</strong></p>
        <p>电子在导线中流动，就像水在管道中流动一样</p>
        
        <p><strong>⚡ 电压 = 水压</strong></p>
        <p>电压推动电子流动，就像水压推动水流一样</p>
        
        <p><strong>🚧 电阻 = 管道阻力</strong></p>
        <p>电阻阻碍电流，就像管道的粗细和弯曲影响水流速度</p>
        
        <p><strong>💡 用电器 = 水轮机</strong></p>
        <p>用电器消耗电能做功，就像水轮机利用水流发电</p>
      `,
      explanation: '通过水流类比，让抽象的电学概念变得具体可感，便于学生理解',
    },
    {
      id: 'demo-thinking-1',
      type: 'thinking' as const,
      title: '探索光合作用的奥秘',
      content: `
        <h3>🌱 光合作用思考挑战</h3>
        
        <p><strong>🤔 思考题1：</strong></p>
        <p>为什么植物的叶子大多是绿色的？如果叶子是红色或蓝色，会发生什么？</p>
        
        <p><strong>🔍 思考题2：</strong></p>
        <p>在完全黑暗的环境中，植物能存活多久？为什么？</p>
        
        <p><strong>🌍 思考题3：</strong></p>
        <p>如果地球上没有植物，会发生什么？人类还能生存吗？</p>
        
        <p><strong>🧪 实验思考：</strong></p>
        <p>设计一个实验来证明光合作用需要光照，你会怎么做？</p>
        
        <p><em>💡 提示：从现象到本质，从已知到未知，让思考成为探索的起点</em></p>
      `,
      explanation: '通过层层递进的问题，引导学生深入思考光合作用的原理和意义',
    },
    {
      id: 'demo-interaction-1',
      type: 'interaction' as const,
      title: '古诗词朗诵大会',
      content: `
        <h3>🎭 课堂互动：古诗词朗诵大会</h3>
        
        <p><strong>🎯 活动目标：</strong></p>
        <p>通过朗诵和表演，感受古诗词的韵律美和意境美</p>
        
        <p><strong>📋 活动流程：</strong></p>
        <ol>
          <li><strong>分组准备</strong> (5分钟)：4-5人一组，选择一首古诗</li>
          <li><strong>创意朗诵</strong> (15分钟)：可以加入动作、音乐、道具</li>
          <li><strong>互动点评</strong> (10分钟)：其他组给出评价和建议</li>
          <li><strong>意境分享</strong> (10分钟)：分享诗词背后的故事</li>
        </ol>
        
        <p><strong>🏆 评分标准：</strong></p>
        <ul>
          <li>朗诵流畅度 (30%)</li>
          <li>情感表达 (30%)</li>
          <li>创意表现 (25%)</li>
          <li>团队合作 (15%)</li>
        </ul>
        
        <p><strong>🎁 奖励机制：</strong></p>
        <p>最佳表现组获得"诗词小达人"称号，并可以选择下节课的古诗词内容</p>
      `,
      explanation: '通过互动朗诵活动，让学生在参与中感受古诗词的魅力，提升课堂参与度',
    },
  ];

  const filteredCards = selectedDemo === 'all'
    ? demoCards
    : demoCards.filter(card => card.type === selectedDemo);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      padding: '24px',
    }}>
      {/* 头部 */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto 32px',
        textAlign: 'center',
      }}>
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: '#3b82f6',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: '500',
            marginBottom: '24px',
          }}
        >
          ← 返回首页
        </Link>

        <h1 style={{
          fontSize: '36px',
          fontWeight: '800',
          color: '#374151',
          marginBottom: '12px',
        }}>
          🎨 AI卡片功能演示
        </h1>
        <p style={{
          fontSize: '18px',
          color: '#6b7280',
          maxWidth: '600px',
          margin: '0 auto 32px',
          lineHeight: '1.6',
        }}>
          体验全新的卡片编辑、导出和分享功能。每张卡片都可以自由编辑内容和样式，
          并支持多种格式导出和社交媒体分享。
        </p>

        {/* 功能特性展示 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '32px',
          maxWidth: '800px',
          margin: '0 auto 32px',
        }}>
          <div style={{
            padding: '16px',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>✏️</div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
              富文本编辑
            </h3>
            <p style={{ fontSize: '14px', color: '#6b7280' }}>
              支持格式化文本、列表、标题等
            </p>
          </div>

          <div style={{
            padding: '16px',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🎨</div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
              样式自定义
            </h3>
            <p style={{ fontSize: '14px', color: '#6b7280' }}>
              颜色、字体、大小、边距等
            </p>
          </div>

          <div style={{
            padding: '16px',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>📥</div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
              多格式导出
            </h3>
            <p style={{ fontSize: '14px', color: '#6b7280' }}>
              PNG、JPG、SVG，高清打印
            </p>
          </div>

          <div style={{
            padding: '16px',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>📤</div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
              社交分享
            </h3>
            <p style={{ fontSize: '14px', color: '#6b7280' }}>
              微信、微博、QQ等平台
            </p>
          </div>
        </div>

        {/* 卡片类型筛选 */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
          flexWrap: 'wrap',
          marginBottom: '32px',
        }}>
          <button
            onClick={() => setSelectedDemo('all')}
            style={{
              padding: '8px 16px',
              backgroundColor: selectedDemo === 'all' ? '#3b82f6' : 'white',
              color: selectedDemo === 'all' ? 'white' : '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            全部卡片
          </button>
          <button
            onClick={() => setSelectedDemo('visualization')}
            style={{
              padding: '8px 16px',
              backgroundColor: selectedDemo === 'visualization' ? '#3b82f6' : 'white',
              color: selectedDemo === 'visualization' ? 'white' : '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            👁️ 可视化卡
          </button>
          <button
            onClick={() => setSelectedDemo('analogy')}
            style={{
              padding: '8px 16px',
              backgroundColor: selectedDemo === 'analogy' ? '#10b981' : 'white',
              color: selectedDemo === 'analogy' ? 'white' : '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            🌟 类比延展卡
          </button>
          <button
            onClick={() => setSelectedDemo('thinking')}
            style={{
              padding: '8px 16px',
              backgroundColor: selectedDemo === 'thinking' ? '#8b5cf6' : 'white',
              color: selectedDemo === 'thinking' ? 'white' : '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            💭 启发思考卡
          </button>
          <button
            onClick={() => setSelectedDemo('interaction')}
            style={{
              padding: '8px 16px',
              backgroundColor: selectedDemo === 'interaction' ? '#f59e0b' : 'white',
              color: selectedDemo === 'interaction' ? 'white' : '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            🎭 互动氛围卡
          </button>
        </div>
      </div>

      {/* 卡片展示区域 */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
      }}>
        {filteredCards.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
            gap: '32px',
          }}>
            {filteredCards.map((card) => (
              <GeneratedCard key={card.id} card={card} relatedCards={filteredCards} />
            ))}
          </div>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '48px',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '8px',
            }}>
              没有找到相关卡片
            </h3>
            <p style={{ color: '#6b7280' }}>
              请选择其他卡片类型或查看全部卡片
            </p>
          </div>
        )}
      </div>

      {/* 使用说明 */}
      <div style={{
        maxWidth: '800px',
        margin: '48px auto 0',
        padding: '24px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      }}>
        <h3 style={{
          fontSize: '20px',
          fontWeight: '600',
          color: '#374151',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span>📖</span>
          使用说明
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '16px',
        }}>
          <div>
            <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
              ✏️ 编辑功能
            </h4>
            <ul style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.6', paddingLeft: '16px' }}>
              <li>点击"编辑"按钮进入编辑模式</li>
              <li>支持富文本编辑：粗体、斜体、标题、列表</li>
              <li>实时样式调整：颜色、字体、大小、边距</li>
              <li>点击"预览"查看最终效果</li>
            </ul>
          </div>

          <div>
            <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
              📥 导出功能
            </h4>
            <ul style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.6', paddingLeft: '16px' }}>
              <li>一键下载PNG格式图片</li>
              <li>复制图片到剪贴板</li>
              <li>多种预设格式：社交媒体、高清打印、网页使用</li>
              <li>支持透明背景导出</li>
            </ul>
          </div>

          <div>
            <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
              📤 分享功能
            </h4>
            <ul style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.6', paddingLeft: '16px' }}>
              <li>支持微信、微博、QQ空间等平台</li>
              <li>自动生成分享链接和二维码</li>
              <li>复制链接到剪贴板</li>
              <li>分享统计和追踪</li>
            </ul>
          </div>
        </div>

        <div style={{
          marginTop: '20px',
          padding: '16px',
          backgroundColor: '#f0f9ff',
          borderRadius: '8px',
          border: '1px solid #bae6fd',
        }}>
          <p style={{
            margin: '0',
            fontSize: '14px',
            color: '#0c4a6e',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
          }}>
            <span style={{ fontSize: '16px', marginTop: '1px' }}>💡</span>
            <span>
              <strong>小贴士：</strong>
              编辑后的卡片会自动保存样式设置，导出的图片包含所有自定义样式。
              分享链接永久有效，其他用户可以查看但不能编辑您的卡片。
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
