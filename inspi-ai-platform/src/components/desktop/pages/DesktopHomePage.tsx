'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

// 简化的案例数据接口
interface CaseItem {
  id: number;
  title: string;
  author: string;
  subject: string;
  thumbnail: string;
  uses: number; // 仅保留使用数
}

/**
 * 现代化桌面端首页组件 - 交互增强版
 */
export function DesktopHomePage() {
  // 状态管理
  const [inputContent, setInputContent] = useState('');
  const [popularCases, setPopularCases] = useState<CaseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 简化的热门案例数据
  const mockPopularCases: CaseItem[] = [
    {
      id: 1,
      title: '二次函数的图像与性质',
      author: '张老师',
      subject: '数学',
      thumbnail: '📊',
      uses: 89
    },
    {
      id: 2,
      title: '古诗词意境赏析',
      author: '李老师',
      subject: '语文',
      thumbnail: '📜',
      uses: 156
    },
    {
      id: 3,
      title: '化学反应速率实验',
      author: '王老师',
      subject: '化学',
      thumbnail: '⚗️',
      uses: 67
    }
  ];

  // 四种卡片类型
  const cardTypes = [
    {
      id: 'visual',
      name: '可视化卡',
      description: '化抽象为"看见"',
      icon: '👁️',
      color: 'from-blue-500 to-blue-600'
    },
    {
      id: 'analogy',
      name: '类比延展卡',
      description: '用生活的温度，点亮知识',
      icon: '🌟',
      color: 'from-green-500 to-green-600'
    },
    {
      id: 'thinking',
      name: '启发思考卡',
      description: '抛出一个好问题',
      icon: '💭',
      color: 'from-purple-500 to-purple-600'
    },
    {
      id: 'interaction',
      name: '互动氛围卡',
      description: '让课堂"破冰"',
      icon: '🎭',
      color: 'from-orange-500 to-orange-600'
    }
  ];

  const stats = [
    { label: '教师用户', value: '1,000+', icon: '👨‍🏫' },
    { label: '创意卡片', value: '10,000+', icon: '🎭' },
    { label: '智慧作品', value: '2,000+', icon: '📚' },
    { label: '致敬复用', value: '5,000+', icon: '🤝' }
  ];

  // 模拟加载热门案例
  useEffect(() => {
    const loadPopularCases = async () => {
      setIsLoading(true);
      // 模拟API调用
      setTimeout(() => {
        setPopularCases(mockPopularCases);
        setIsLoading(false);
      }, 1000);
    };
    loadPopularCases();
  }, []);

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= 500) { // 字数限制
      setInputContent(value);
    }
  };

  // 处理创建卡片
  const handleCreateCard = (cardType: string) => {
    console.log('创建卡片:', cardType, '内容:', inputContent);
    // 这里可以跳转到创建页面或打开创建模态框
    // 暂时跳转到创建页面
    window.location.href = `/create?type=${cardType}&content=${encodeURIComponent(inputContent)}`;
  };

  // 处理案例点击
  const handleCaseClick = (caseItem: CaseItem) => {
    // 跳转到案例详情页面，不需要登录
    window.location.href = `/case/${caseItem.id}`;
  };

  return (
    <div className="modern-layout">
      {/* 导航栏 */}
      <nav className="modern-nav">
        <div className="modern-container">
          <div className="modern-nav-content">
            <Link href="/" className="modern-logo">Inspi.AI</Link>
            <div className="modern-nav-links mobile-hidden">
              <Link href="/" className="modern-nav-link active">首页</Link>
              <Link href="/create" className="modern-nav-link">创作</Link>
              <Link href="/profile" className="modern-nav-link">个人中心</Link>
            </div>
            <div className="flex gap-4">
              <Link href="/create" className="modern-btn modern-btn-primary modern-btn-sm">
                开启魔法
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero区域 + 创建输入 */}
      <section className="modern-hero">
        <div className="modern-container">
          <div className="animate-fade-in">
            <h1 className="modern-hero-title">
              别让备课的深夜，磨灭您教学的热情
            </h1>
            <p className="modern-hero-subtitle">
              <span className="text-gradient">Inspi.AI</span> - 老师的好搭子，更是您教学创意的放大器。
              您的每一次奇思妙想，都值得被精彩呈现。
            </p>
            
            {/* 创建输入区域 */}
            <div className="create-input-section modern-card modern-card-elevated" style={{ 
              maxWidth: '800px', 
              margin: '40px auto 0',
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)'
            }}>
              <div className="modern-card-body">
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ 
                    display: 'block',
                    fontSize: '18px',
                    fontWeight: '600',
                    color: 'var(--gray-900)',
                    marginBottom: '8px'
                  }}>
                    描述您要教授的知识点
                  </label>
                  <textarea
                    className="modern-input modern-textarea"
                    placeholder="例如：二次函数的图像与性质，包括开口方向、对称轴、顶点坐标等..."
                    value={inputContent}
                    onChange={handleInputChange}
                    rows={4}
                    style={{ 
                      fontSize: '16px',
                      resize: 'none',
                      transition: 'all var(--transition-base)',
                      width: '100%'
                    }}
                  />
                  <div style={{ 
                    marginTop: '8px',
                    fontSize: '14px',
                    color: 'var(--gray-500)'
                  }}>
                    <span>输入教学内容开始创作</span>
                  </div>
                </div>

                {/* 直接显示创建选项 */}
                {inputContent.trim().length > 0 && (
                  <div style={{ paddingTop: '24px' }}>
                    <h3 style={{ 
                      fontSize: '18px',
                      fontWeight: '600',
                      color: 'var(--gray-900)',
                      marginBottom: '16px',
                      textAlign: 'center'
                    }}>
                      ✨ 选择您需要的魔法卡片
                    </h3>
                    <div className="modern-grid modern-grid-2" style={{ gap: '16px' }}>
                      {cardTypes.map((type) => (
                        <div
                          key={type.id}
                          onClick={() => handleCreateCard(type.id)}
                          className="unified-card"
                          style={{
                            padding: '20px',
                            cursor: 'pointer',
                            textAlign: 'center'
                          }}
                        >
                          <div style={{
                            fontSize: '32px',
                            marginBottom: '12px'
                          }}>
                            {type.icon}
                          </div>
                          <h4 style={{ 
                            fontSize: '16px', 
                            fontWeight: '600', 
                            color: 'var(--gray-900)', 
                            marginBottom: '4px' 
                          }}>
                            {type.name}
                          </h4>
                          <p style={{ 
                            fontSize: '14px', 
                            color: 'var(--gray-600)' 
                          }}>
                            {type.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 热门案例展示 */}
      <section style={{ padding: '80px 0', background: 'white' }}>
        <div className="modern-container">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              🌟 智慧广场精选
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              看同行们正在创造什么。每一份作品，都是一份可以借鉴的灵感
            </p>
          </div>
          
          {isLoading ? (
            <div className="modern-grid modern-grid-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="modern-card skeleton" style={{ padding: '24px' }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    background: 'var(--gray-200)',
                    borderRadius: 'var(--radius-lg)',
                    marginBottom: '16px'
                  }}></div>
                  <div style={{
                    height: '20px',
                    background: 'var(--gray-200)',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '12px'
                  }}></div>
                  <div style={{
                    height: '60px',
                    background: 'var(--gray-200)',
                    borderRadius: 'var(--radius-sm)'
                  }}></div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="modern-grid modern-grid-3">
                {popularCases.map((caseItem) => (
                  <div 
                    key={caseItem.id} 
                    className="unified-card" 
                    onClick={() => handleCaseClick(caseItem)}
                    style={{
                      cursor: 'pointer'
                    }}>
                    <div className="modern-card-body">
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'flex-start', 
                        justifyContent: 'space-between', 
                        marginBottom: '16px' 
                      }}>
                        <div style={{ fontSize: '48px' }}>{caseItem.thumbnail}</div>
                        <div>
                          <span style={{
                            padding: '4px 8px',
                            background: 'var(--primary-100)',
                            color: 'var(--primary-700)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}>
                            {caseItem.subject}
                          </span>
                        </div>
                      </div>

                      <h3 style={{
                        fontSize: '20px',
                        fontWeight: '600',
                        color: 'var(--gray-900)',
                        marginBottom: '16px',
                        lineHeight: '1.3'
                      }}>
                        {caseItem.title}
                      </h3>

                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        fontSize: '14px', 
                        color: 'var(--gray-500)'
                      }}>
                        <span>by {caseItem.author}</span>
                        <span>🔄 {caseItem.uses} 次使用</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div style={{ textAlign: 'center', marginTop: '40px' }}>
                <Link href="/square" className="modern-btn modern-btn-outline modern-btn-lg">
                  <span>🌟</span>
                  探索更多智慧作品
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      {/* 数据统计 */}
      <section style={{ padding: '80px 0', background: 'linear-gradient(180deg, #f9fafb 0%, #ffffff 100%)' }}>
        <div className="modern-container">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              智慧贡献榜
            </h2>
            <p className="text-xl text-gray-600">
              每一份贡献，都让教育变得更美好
            </p>
          </div>
          
          <div className="modern-grid modern-grid-4">
            {stats.map((stat, index) => (
              <div key={index} className="modern-card text-center">
                <div className="modern-card-body">
                  <div className="text-4xl mb-4">{stat.icon}</div>
                  <div className="text-3xl font-bold text-gray-900 mb-2">
                    {stat.value}
                  </div>
                  <div className="text-gray-600 font-medium">
                    {stat.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA区域 */}
      <section style={{ padding: '80px 0' }}>
        <div className="modern-container">
          <div className="modern-card modern-card-elevated text-center" style={{ 
            background: 'linear-gradient(135deg, #fff7ed 0%, #fdf2f8 100%)',
            border: '2px solid #fed7aa'
          }}>
            <div className="modern-card-body" style={{ padding: '60px 40px' }}>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                让每一次奇思妙想，都被精彩呈现
              </h2>
              <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
                加入教师智慧生态，与全球同行一起激发创意、分享智慧、传承经验。
              </p>
              <div className="flex gap-4 justify-center flex-wrap">
                <Link href="/create" className="modern-btn modern-btn-primary modern-btn-xl">
                  开启教学魔法
                </Link>
                <Link href="/square" className="modern-btn modern-btn-secondary modern-btn-xl">
                  探索智慧广场
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

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