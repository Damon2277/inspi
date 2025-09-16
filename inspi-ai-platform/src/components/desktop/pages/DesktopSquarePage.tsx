'use client';
import React, { useState } from 'react';
import Link from 'next/link';

/**
 * 现代化桌面端广场页面组件
 */
export function DesktopSquarePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [sortBy, setSortBy] = useState('latest');

  const subjects = ['全部', '数学', '语文', '英语', '物理', '化学', '生物', '历史', '地理'];
  const grades = ['全部', '小学', '初中', '高中', '大学'];
  const sortOptions = [
    { value: 'latest', label: '最新发布' },
    { value: 'popular', label: '最受欢迎' },
    { value: 'rating', label: '评分最高' }
  ];

  const works = [
    {
      id: 1,
      title: '二次函数的图像与性质',
      author: '张老师',
      subject: '数学',
      grade: '高中',
      description: '通过动态图像展示二次函数的变化规律，帮助学生理解抛物线的开口方向、对称轴等重要概念。',
      cardCount: 4,
      likes: 89,
      views: 1250,
      reuses: 23,
      rating: 4.8,
      tags: ['函数', '图像', '性质'],
      thumbnail: '📊',
      createdAt: '2024-01-15'
    },
    {
      id: 2,
      title: '古诗词意境赏析',
      author: '李老师',
      subject: '语文',
      grade: '初中',
      description: '结合古诗词的创作背景，引导学生感受诗人的情感世界，提升文学鉴赏能力。',
      cardCount: 6,
      likes: 156,
      views: 2100,
      reuses: 45,
      rating: 4.9,
      tags: ['古诗词', '意境', '赏析'],
      thumbnail: '📜',
      createdAt: '2024-01-14'
    },
    {
      id: 3,
      title: '化学反应速率与平衡',
      author: '王老师',
      subject: '化学',
      grade: '高中',
      description: '通过实验现象和理论分析，帮助学生掌握化学反应速率的影响因素和化学平衡的建立过程。',
      cardCount: 5,
      likes: 67,
      views: 890,
      reuses: 18,
      rating: 4.7,
      tags: ['化学反应', '速率', '平衡'],
      thumbnail: '⚗️',
      createdAt: '2024-01-13'
    },
    {
      id: 4,
      title: '英语时态语法精讲',
      author: '陈老师',
      subject: '英语',
      grade: '初中',
      description: '系统梳理英语各种时态的用法，通过丰富的例句和练习，让学生轻松掌握时态变化规律。',
      cardCount: 8,
      likes: 234,
      views: 3200,
      reuses: 67,
      rating: 4.6,
      tags: ['时态', '语法', '练习'],
      thumbnail: '🔤',
      createdAt: '2024-01-12'
    },
    {
      id: 5,
      title: '物理力学基础',
      author: '赵老师',
      subject: '物理',
      grade: '高中',
      description: '从生活实例出发，讲解力的概念、牛顿定律等基础知识，培养学生的物理思维。',
      cardCount: 7,
      likes: 123,
      views: 1800,
      reuses: 34,
      rating: 4.8,
      tags: ['力学', '牛顿定律', '基础'],
      thumbnail: '⚡',
      createdAt: '2024-01-11'
    },
    {
      id: 6,
      title: '生物细胞结构',
      author: '孙老师',
      subject: '生物',
      grade: '初中',
      description: '通过显微镜观察和模型展示，让学生深入了解细胞的基本结构和功能。',
      cardCount: 5,
      likes: 98,
      views: 1400,
      reuses: 28,
      rating: 4.7,
      tags: ['细胞', '结构', '功能'],
      thumbnail: '🔬',
      createdAt: '2024-01-10'
    }
  ];

  const handleSearch = (query: string) => {
    console.log('搜索:', query);
  };

  const handleLike = (workId: number) => {
    console.log('点赞作品:', workId);
  };

  const handleReuse = (workId: number) => {
    console.log('复用作品:', workId);
  };

  return (
    <div className="modern-layout">
      {/* 导航栏 */}
      <nav className="modern-nav">
        <div className="modern-container">
          <div className="modern-nav-content">
            <Link href="/" className="modern-logo">Inspi.AI</Link>
            <div className="modern-nav-links mobile-hidden">
              <Link href="/" className="modern-nav-link">首页</Link>
              <Link href="/create" className="modern-nav-link">创作</Link>
              <Link href="/square" className="modern-nav-link active">广场</Link>
              <Link href="/profile" className="modern-nav-link">我的</Link>
            </div>
          </div>
        </div>
      </nav>

      <div style={{ padding: '32px 0', minHeight: 'calc(100vh - 80px)' }}>
        {/* 页面标题 */}
        <div className="modern-container" style={{ marginBottom: '32px' }}>
          <h1 style={{ 
            fontSize: '36px', 
            fontWeight: '800', 
            color: 'var(--gray-900)', 
            marginBottom: '8px' 
          }}>
            智慧广场
          </h1>
          <p style={{ 
            fontSize: '18px', 
            color: 'var(--gray-600)' 
          }}>
            看同行们正在创造什么。每一份作品，都是一份可以借鉴的灵感
          </p>
        </div>

        {/* 搜索和筛选区域 */}
        <div className="modern-container" style={{ marginBottom: '32px' }}>
          <div className="modern-card modern-card-elevated">
            <div className="modern-card-body">
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '24px' 
              }}>
                {/* 搜索框 */}
                <div style={{ flex: 1, maxWidth: '400px' }}>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="modern-input"
                      type="search"
                      placeholder="搜索教学内容、作者或标签..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && searchQuery) {
                          handleSearch(searchQuery);
                        }
                      }}
                      style={{ paddingLeft: '48px' }}
                    />
                    <div style={{
                      position: 'absolute',
                      left: '16px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--gray-400)'
                    }}>
                      <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* 筛选器 */}
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  alignItems: 'center', 
                  gap: '24px' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ 
                      fontSize: '14px', 
                      fontWeight: '500', 
                      color: 'var(--gray-700)' 
                    }}>
                      学科:
                    </label>
                    <select
                      className="modern-input"
                      value={selectedSubject}
                      onChange={(e) => setSelectedSubject(e.target.value)}
                      style={{ minWidth: '120px', padding: '8px 12px' }}
                    >
                      {subjects.map(subject => (
                        <option key={subject} value={subject}>{subject}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ 
                      fontSize: '14px', 
                      fontWeight: '500', 
                      color: 'var(--gray-700)' 
                    }}>
                      学段:
                    </label>
                    <select
                      className="modern-input"
                      value={selectedGrade}
                      onChange={(e) => setSelectedGrade(e.target.value)}
                      style={{ minWidth: '120px', padding: '8px 12px' }}
                    >
                      {grades.map(grade => (
                        <option key={grade} value={grade}>{grade}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ 
                      fontSize: '14px', 
                      fontWeight: '500', 
                      color: 'var(--gray-700)' 
                    }}>
                      排序:
                    </label>
                    <select
                      className="modern-input"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      style={{ minWidth: '140px', padding: '8px 12px' }}
                    >
                      {sortOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 作品网格 */}
        <div className="modern-container">
          <div className="modern-grid modern-grid-3">
            {works.map((work) => (
              <div key={work.id} className="modern-card modern-card-elevated group" style={{ cursor: 'pointer' }}>
                <div className="modern-card-body">
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    justifyContent: 'space-between', 
                    marginBottom: '16px' 
                  }}>
                    <div style={{ fontSize: '32px' }}>{work.thumbnail}</div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <span style={{
                        padding: '4px 8px',
                        background: 'var(--gray-100)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '12px',
                        color: 'var(--gray-600)'
                      }}>
                        {work.subject}
                      </span>
                      <span style={{
                        padding: '4px 8px',
                        background: 'var(--gray-100)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '12px',
                        color: 'var(--gray-600)'
                      }}>
                        {work.grade}
                      </span>
                    </div>
                  </div>

                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: 'var(--gray-900)',
                    marginBottom: '8px',
                    transition: 'color var(--transition-base)'
                  }}>
                    {work.title}
                  </h3>

                  <p style={{
                    color: 'var(--gray-600)',
                    fontSize: '14px',
                    marginBottom: '16px',
                    lineHeight: '1.5',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {work.description}
                  </p>

                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '4px', 
                    marginBottom: '16px' 
                  }}>
                    {work.tags.map((tag, index) => (
                      <span key={index} style={{
                        padding: '2px 8px',
                        background: 'var(--primary-100)',
                        color: 'var(--primary-700)',
                        fontSize: '12px',
                        borderRadius: 'var(--radius-sm)'
                      }}>
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    fontSize: '14px', 
                    color: 'var(--gray-500)', 
                    marginBottom: '16px' 
                  }}>
                    <span>by {work.author}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>⭐ {work.rating}</span>
                      <span>•</span>
                      <span>{work.cardCount}张卡片</span>
                    </div>
                  </div>

                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    paddingTop: '16px', 
                    borderTop: '1px solid var(--gray-200)' 
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '16px', 
                      fontSize: '14px', 
                      color: 'var(--gray-500)' 
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        {work.views}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        {work.likes}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        {work.reuses}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        className="modern-btn modern-btn-ghost modern-btn-sm"
                        onClick={() => handleLike(work.id)}
                      >
                        ❤️
                      </button>
                      <button
                        className="modern-btn modern-btn-outline modern-btn-sm"
                        onClick={() => handleReuse(work.id)}
                      >
                        致敬复用
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 加载更多 */}
          <div style={{ textAlign: 'center', marginTop: '48px' }}>
            <button className="modern-btn modern-btn-outline modern-btn-lg">
              发现更多智慧
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}