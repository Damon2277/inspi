'use client';
import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

// 案例数据接口
interface CaseItem {
  id: number;
  title: string;
  author: string;
  subject: string;
  grade: string;
  description: string;
  thumbnail: string;
  likes: number;
  uses: number;
  rating: number;
  tags: string[];
  content?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 案例详情页面组件
 */
export default function CaseDetailPage() {
  const params = useParams();
  const caseId = params.id as string;

  // 模拟案例详情数据 - 实际应该从API获取
  const getCaseDetail = (id: string): CaseItem | null => {
    const mockCases: CaseItem[] = [
      {
        id: 1,
        title: '二次函数的图像与性质',
        author: '张老师',
        subject: '数学',
        grade: '高中',
        description: '通过动态图像展示二次函数的变化规律，帮助学生理解抛物线的开口方向、对称轴等重要概念。',
        thumbnail: '📊',
        likes: 156,
        uses: 89,
        rating: 4.8,
        tags: ['函数', '图像', '可视化'],
        content: `
# 二次函数的图像与性质

## 教学目标
1. 理解二次函数的概念和基本形式
2. 掌握二次函数图像的特点
3. 能够分析二次函数的性质

## 教学重点
- 二次函数的图像特征
- 开口方向与系数a的关系
- 对称轴和顶点坐标的求法

## 教学内容

### 1. 二次函数的基本形式
二次函数的一般形式为：y = ax² + bx + c (a ≠ 0)

### 2. 图像特征
- 图像是一条抛物线
- 开口方向由系数a决定：a > 0时开口向上，a < 0时开口向下
- 有对称轴和顶点

### 3. 重要性质
- 对称轴：x = -b/(2a)
- 顶点坐标：(-b/(2a), (4ac-b²)/(4a))
- 最值：当a > 0时有最小值，当a < 0时有最大值

## 教学方法
1. 使用图形计算器或数学软件展示函数图像
2. 通过改变参数值观察图像变化
3. 结合实际问题理解函数意义

## 练习题
1. 画出函数 y = x² - 2x + 1 的图像
2. 求函数 y = -2x² + 4x + 1 的对称轴和顶点
3. 分析函数 y = 3x² - 6x + 2 的性质
        `,
        createdAt: '2024-01-15',
        updatedAt: '2024-01-16'
      },
      {
        id: 2,
        title: '古诗词意境赏析',
        author: '李老师',
        subject: '语文',
        grade: '初中',
        description: '结合古诗词的创作背景，引导学生感受诗人的情感世界，提升文学鉴赏能力。',
        thumbnail: '📜',
        likes: 234,
        uses: 156,
        rating: 4.9,
        tags: ['古诗词', '意境', '赏析'],
        content: `
# 古诗词意境赏析

## 教学目标
1. 理解古诗词的意境美
2. 掌握赏析古诗词的方法
3. 提升文学鉴赏能力

## 教学重点
- 意境的概念和特点
- 诗词中情景交融的表现手法
- 诗人情感的表达方式

## 教学内容

### 1. 什么是意境
意境是诗词中情与景、主观与客观相融合而形成的艺术境界。

### 2. 意境的特点
- 情景交融
- 虚实相生
- 韵味无穷

### 3. 赏析方法
1. 抓住关键词语
2. 分析表现手法
3. 体会诗人情感
4. 感受整体意境

## 经典案例分析

### 《静夜思》- 李白
床前明月光，疑是地上霜。
举头望明月，低头思故乡。

**意境分析：**
- 月光如霜，营造清冷氛围
- 举头低头的动作，表现内心波动
- 思乡之情在静夜中格外浓烈

## 教学活动
1. 朗读感悟
2. 画面想象
3. 情感体验
4. 创作实践
        `,
        createdAt: '2024-01-14',
        updatedAt: '2024-01-15'
      },
      {
        id: 3,
        title: '化学反应速率实验',
        author: '王老师',
        subject: '化学',
        grade: '高中',
        description: '通过实验现象和理论分析，帮助学生掌握化学反应速率的影响因素。',
        thumbnail: '⚗️',
        likes: 123,
        uses: 67,
        rating: 4.7,
        tags: ['化学反应', '实验', '速率'],
        content: `
# 化学反应速率实验

## 实验目标
1. 观察化学反应速率的影响因素
2. 理解反应速率的概念
3. 掌握实验操作技能

## 实验原理
化学反应速率受多种因素影响：
- 反应物浓度
- 温度
- 催化剂
- 反应物接触面积

## 实验内容

### 实验一：浓度对反应速率的影响
**实验材料：**
- 不同浓度的盐酸溶液
- 锌粒
- 量筒、秒表

**实验步骤：**
1. 准备不同浓度的盐酸溶液
2. 分别加入等量锌粒
3. 观察并记录反应时间
4. 分析浓度与反应速率的关系

### 实验二：温度对反应速率的影响
**实验设计：**
- 控制其他条件不变
- 改变反应温度
- 观察反应速率变化

### 实验三：催化剂的作用
**对比实验：**
- 有催化剂vs无催化剂
- 观察反应速率差异
- 分析催化剂的作用机理

## 实验结果分析
1. 浓度越大，反应速率越快
2. 温度越高，反应速率越快
3. 催化剂能显著提高反应速率

## 安全注意事项
1. 佩戴防护眼镜
2. 通风良好的环境
3. 正确处理废液
4. 遵守实验室规则
        `,
        createdAt: '2024-01-13',
        updatedAt: '2024-01-14'
      }
    ];

    return mockCases.find(c => c.id === parseInt(id)) || null;
  };

  const caseDetail = getCaseDetail(caseId);

  if (!caseDetail) {
    return (
      <div className="modern-layout">
        <div className="modern-container" style={{ padding: '80px 0', textAlign: 'center' }}>
          <h1 style={{ fontSize: '48px', marginBottom: '16px' }}>😕</h1>
          <h2 style={{ fontSize: '24px', marginBottom: '16px', color: 'var(--gray-900)' }}>
            案例未找到
          </h2>
          <p style={{ color: 'var(--gray-600)', marginBottom: '32px' }}>
            抱歉，您访问的案例不存在或已被删除。
          </p>
          <Link href="/" className="modern-btn modern-btn-primary">
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="modern-layout">
      {/* 导航栏 */}
      <nav className="modern-nav">
        <div className="modern-container">
          <div className="modern-nav-content">
            <div className="modern-logo">Inspi.AI</div>
            <div className="modern-nav-links mobile-hidden">
              <Link href="/" className="modern-nav-link">首页</Link>
              <Link href="/create" className="modern-nav-link">创作</Link>
              <Link href="/square" className="modern-nav-link active">广场</Link>
              <Link href="/profile" className="modern-nav-link">我的</Link>
            </div>
            <div className="flex gap-4">
              <Link href="/create" className="modern-btn modern-btn-primary modern-btn-sm">
                开启魔法
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* 案例详情内容 */}
      <div className="modern-container" style={{ padding: '40px 0 80px' }}>
        {/* 返回按钮 */}
        <div style={{ marginBottom: '32px' }}>
          <Link 
            href="/" 
            className="modern-btn modern-btn-ghost"
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px',
              padding: '8px 16px'
            }}
          >
            ← 返回首页
          </Link>
        </div>

        <div className="case-detail-grid" style={{ 
          display: 'grid',
          gridTemplateColumns: '1fr 300px', 
          gap: '40px' 
        }}>
          {/* 主要内容区域 */}
          <div className="modern-card">
            <div className="modern-card-body" style={{ padding: '40px' }}>
              {/* 案例头部信息 */}
              <div style={{ marginBottom: '32px' }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '16px', 
                  marginBottom: '16px' 
                }}>
                  <div style={{ fontSize: '64px' }}>{caseDetail.thumbnail}</div>
                  <div>
                    <h1 style={{ 
                      fontSize: '32px', 
                      fontWeight: '700', 
                      color: 'var(--gray-900)', 
                      marginBottom: '8px' 
                    }}>
                      {caseDetail.title}
                    </h1>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <span style={{
                        padding: '4px 12px',
                        background: 'var(--primary-100)',
                        color: 'var(--primary-700)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}>
                        {caseDetail.subject}
                      </span>
                      <span style={{
                        padding: '4px 12px',
                        background: 'var(--gray-100)',
                        color: 'var(--gray-600)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '14px'
                      }}>
                        {caseDetail.grade}
                      </span>
                      <span style={{ color: 'var(--gray-500)', fontSize: '14px' }}>
                        by {caseDetail.author}
                      </span>
                    </div>
                  </div>
                </div>

                <p style={{ 
                  fontSize: '18px', 
                  color: 'var(--gray-600)', 
                  lineHeight: '1.6',
                  marginBottom: '24px'
                }}>
                  {caseDetail.description}
                </p>

                {/* 标签 */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {caseDetail.tags.map((tag, index) => (
                    <span key={index} style={{
                      padding: '4px 12px',
                      background: 'var(--gray-100)',
                      color: 'var(--gray-600)',
                      fontSize: '14px',
                      borderRadius: 'var(--radius-sm)'
                    }}>
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* 案例内容 */}
              <div style={{ 
                borderTop: '1px solid var(--gray-200)', 
                paddingTop: '32px' 
              }}>
                <div className="case-content">
                  {caseDetail.content ? (
                    <div 
                      dangerouslySetInnerHTML={{ 
                        __html: caseDetail.content
                          .replace(/\n/g, '<br>')
                          .replace(/^# (.*$)/gm, '<h1>$1</h1>')
                          .replace(/^## (.*$)/gm, '<h2>$1</h2>')
                          .replace(/^### (.*$)/gm, '<h3>$1</h3>')
                          .replace(/^\*\*(.*?)\*\*/gm, '<strong>$1</strong>')
                          .replace(/^\* (.*$)/gm, '<li>$1</li>')
                          .replace(/^(\d+)\. (.*$)/gm, '<li>$1. $2</li>')
                      }}
                    />
                  ) : (
                    <p style={{ color: 'var(--gray-500)', fontStyle: 'italic' }}>
                      暂无详细内容
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 侧边栏 */}
          <div>
            {/* 案例统计 */}
            <div className="modern-card" style={{ marginBottom: '24px' }}>
              <div className="modern-card-body">
                <h3 style={{ 
                  fontSize: '18px', 
                  fontWeight: '600', 
                  marginBottom: '16px',
                  color: 'var(--gray-900)'
                }}>
                  案例数据
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--gray-600)' }}>❤️ 点赞数</span>
                    <span style={{ fontWeight: '600' }}>{caseDetail.likes}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--gray-600)' }}>🔄 使用数</span>
                    <span style={{ fontWeight: '600' }}>{caseDetail.uses}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--gray-600)' }}>⭐ 评分</span>
                    <span style={{ fontWeight: '600' }}>{caseDetail.rating}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="modern-card">
              <div className="modern-card-body">
                <h3 style={{ 
                  fontSize: '18px', 
                  fontWeight: '600', 
                  marginBottom: '16px',
                  color: 'var(--gray-900)'
                }}>
                  操作
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <button 
                    className="modern-btn modern-btn-primary"
                    style={{ width: '100%' }}
                    onClick={() => {
                      // 这里可以添加点赞功能
                      alert('点赞功能开发中...');
                    }}
                  >
                    ❤️ 点赞
                  </button>
                  <button 
                    className="modern-btn modern-btn-outline"
                    style={{ width: '100%' }}
                    onClick={() => {
                      // 这里可以添加收藏功能
                      alert('收藏功能开发中...');
                    }}
                  >
                    ⭐ 收藏
                  </button>
                  <button 
                    className="modern-btn modern-btn-ghost"
                    style={{ width: '100%' }}
                    onClick={() => {
                      // 这里可以添加分享功能
                      if (navigator.share) {
                        navigator.share({
                          title: caseDetail.title,
                          text: caseDetail.description,
                          url: window.location.href
                        });
                      } else {
                        // 复制链接到剪贴板
                        navigator.clipboard.writeText(window.location.href);
                        alert('链接已复制到剪贴板');
                      }
                    }}
                  >
                    🔗 分享
                  </button>
                </div>
              </div>
            </div>

            {/* 作者信息 */}
            <div className="modern-card" style={{ marginTop: '24px' }}>
              <div className="modern-card-body">
                <h3 style={{ 
                  fontSize: '18px', 
                  fontWeight: '600', 
                  marginBottom: '16px',
                  color: 'var(--gray-900)'
                }}>
                  作者信息
                </h3>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ 
                    width: '60px', 
                    height: '60px', 
                    borderRadius: '50%', 
                    background: 'var(--primary-100)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    margin: '0 auto 12px'
                  }}>
                    👨‍🏫
                  </div>
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                    {caseDetail.author}
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--gray-500)' }}>
                    {caseDetail.subject}教师
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 页脚 */}
      <footer style={{ 
        background: 'var(--gray-900)', 
        color: 'var(--gray-300)', 
        padding: '40px 0',
        textAlign: 'center'
      }}>
        <div className="modern-container">
          <div className="modern-logo" style={{ color: 'white', marginBottom: '16px' }}>
            Inspi.AI
          </div>
          <p>© 2024 Inspi.AI. 让AI激发教学创意.</p>
        </div>
      </footer>
    </div>
  );
}