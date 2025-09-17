'use client';
import React, { useState } from 'react';
import Link from 'next/link';

/**
 * 现代化桌面端创作页面组件
 */
export function DesktopCreatePage() {
  const [formData, setFormData] = useState({
    content: '',
    subject: '',
    gradeLevel: '',
    cardTypes: [] as string[]
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const subjects = [
    '数学', '语文', '英语', '物理', '化学', '生物',
    '历史', '地理', '政治', '音乐', '美术', '体育'
  ];

  const gradeLevels = [
    '小学', '初中', '高中', '大学'
  ];

  const cardTypes = [
    {
      id: 'visual',
      name: '可视化卡',
      description: '化抽象为"看见"，让知识在学生眼前"活"起来',
      icon: '👁️'
    },
    {
      id: 'analogy',
      name: '类比延展卡',
      description: '用生活的温度，点亮知识',
      icon: '🌟'
    },
    {
      id: 'thinking',
      name: '启发思考卡',
      description: '抛出一个好问题，胜过一万句灌输',
      icon: '💭'
    },
    {
      id: 'interaction',
      name: '互动氛围卡',
      description: '让课堂"破冰"，让知识"升温"',
      icon: '🎭'
    }
  ];

  const recentProjects = [
    { name: '二次函数教学', time: '2小时前', cards: 4 },
    { name: '古诗词赏析', time: '1天前', cards: 6 },
    { name: '化学反应原理', time: '3天前', cards: 5 }
  ];

  const templates = [
    { name: '数学概念模板', usage: 156, rating: 4.8 },
    { name: '语文阅读模板', usage: 89, rating: 4.6 },
    { name: '科学实验模板', usage: 234, rating: 4.9 }
  ];

  const handleGenerate = async () => {
    setIsGenerating(true);
    // 模拟生成过程
    setTimeout(() => {
      setIsGenerating(false);
    }, 3000);
  };

  const toggleCardType = (typeId: string) => {
    setFormData(prev => ({
      ...prev,
      cardTypes: prev.cardTypes.includes(typeId)
        ? prev.cardTypes.filter(id => id !== typeId)
        : [...prev.cardTypes, typeId]
    }));
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
              <Link href="/create" className="modern-nav-link active">创作</Link>
              <Link href="/profile" className="modern-nav-link">个人中心</Link>
            </div>
          </div>
        </div>
      </nav>

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 80px)' }}>
        {/* 侧边栏 */}
        <aside style={{ 
          width: '320px', 
          background: 'white', 
          borderRight: '1px solid var(--gray-200)',
          padding: '32px 24px',
          overflowY: 'auto'
        }}>
          {/* 最近项目 */}
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              color: 'var(--gray-900)', 
              marginBottom: '16px' 
            }}>
              最近项目
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recentProjects.map((project, index) => (
                <div key={index} className="modern-card" style={{ 
                  padding: '16px', 
                  cursor: 'pointer',
                  transition: 'all var(--transition-base)'
                }}>
                  <div style={{ 
                    fontSize: '14px', 
                    fontWeight: '500', 
                    color: 'var(--gray-900)',
                    marginBottom: '4px'
                  }}>
                    {project.name}
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: 'var(--gray-500)' 
                  }}>
                    {project.time} • {project.cards}张卡片
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 推荐模板 */}
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              color: 'var(--gray-900)', 
              marginBottom: '16px' 
            }}>
              推荐模板
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {templates.map((template, index) => (
                <div key={index} className="modern-card" style={{ 
                  padding: '16px', 
                  cursor: 'pointer',
                  transition: 'all var(--transition-base)'
                }}>
                  <div style={{ 
                    fontSize: '14px', 
                    fontWeight: '500', 
                    color: 'var(--gray-900)',
                    marginBottom: '4px'
                  }}>
                    {template.name}
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: 'var(--gray-500)' 
                  }}>
                    {template.usage}次使用 • ⭐ {template.rating}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 使用小贴士 */}
          <div>
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              color: 'var(--gray-900)', 
              marginBottom: '16px' 
            }}>
              使用小贴士
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ color: 'var(--primary-500)' }}>💡</span>
                <span style={{ fontSize: '14px', color: 'var(--gray-600)' }}>
                  详细描述知识点，AI会生成更精准的内容
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ color: 'var(--info-500)' }}>🎯</span>
                <span style={{ fontSize: '14px', color: 'var(--gray-600)' }}>
                  选择合适的学科和学段，获得针对性内容
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ color: 'var(--success-500)' }}>✨</span>
                <span style={{ fontSize: '14px', color: 'var(--gray-600)' }}>
                  多选卡片类型，构建完整的教学体系
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* 主内容区 */}
        <main style={{ flex: 1, padding: '32px', background: 'var(--gray-50)' }}>
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ 
              fontSize: '36px', 
              fontWeight: '800', 
              color: 'var(--gray-900)', 
              marginBottom: '8px' 
            }}>
              AI教学魔法师
            </h1>
            <p style={{ 
              fontSize: '18px', 
              color: 'var(--gray-600)' 
            }}>
              让抽象知识变得可见，用生活温度点亮学习
            </p>
          </div>

          <div className="modern-grid modern-grid-2" style={{ alignItems: 'start' }}>
            {/* 左侧：输入表单 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="modern-card modern-card-elevated">
                <div className="modern-card-header">
                  <h2 style={{ 
                    fontSize: '20px', 
                    fontWeight: '600', 
                    color: 'var(--gray-900)' 
                  }}>
                    创作设置
                  </h2>
                </div>
                <div className="modern-card-body">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className="modern-form-group">
                      <label className="modern-label">知识点内容</label>
                      <textarea
                        className="modern-input modern-textarea"
                        placeholder="请详细描述你要教授的知识点，例如：二次函数的图像与性质..."
                        value={formData.content}
                        onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                        rows={6}
                        required
                      />
                    </div>

                    <div className="modern-grid modern-grid-2">
                      <div className="modern-form-group">
                        <label className="modern-label">学科</label>
                        <select
                          className="modern-input"
                          value={formData.subject}
                          onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                        >
                          <option value="">选择学科</option>
                          {subjects.map(subject => (
                            <option key={subject} value={subject}>{subject}</option>
                          ))}
                        </select>
                      </div>
                      <div className="modern-form-group">
                        <label className="modern-label">学段</label>
                        <select
                          className="modern-input"
                          value={formData.gradeLevel}
                          onChange={(e) => setFormData(prev => ({ ...prev, gradeLevel: e.target.value }))}
                        >
                          <option value="">选择学段</option>
                          {gradeLevels.map(level => (
                            <option key={level} value={level}>{level}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modern-card modern-card-elevated">
                <div className="modern-card-header">
                  <h2 style={{ 
                    fontSize: '20px', 
                    fontWeight: '600', 
                    color: 'var(--gray-900)' 
                  }}>
                    卡片类型选择
                  </h2>
                </div>
                <div className="modern-card-body">
                  <div className="modern-grid modern-grid-2">
                    {cardTypes.map((type) => (
                      <div
                        key={type.id}
                        onClick={() => toggleCardType(type.id)}
                        className="modern-card"
                        style={{
                          padding: '20px',
                          cursor: 'pointer',
                          border: formData.cardTypes.includes(type.id) 
                            ? '2px solid var(--primary-500)' 
                            : '2px solid var(--gray-200)',
                          background: formData.cardTypes.includes(type.id) 
                            ? 'var(--primary-50)' 
                            : 'white',
                          transition: 'all var(--transition-base)'
                        }}
                      >
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: 'var(--radius-lg)',
                          background: 'var(--gradient-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '20px',
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
              </div>

              <button
                className="modern-btn modern-btn-primary modern-btn-lg"
                style={{ width: '100%' }}
                onClick={handleGenerate}
                disabled={!formData.content || !formData.subject || formData.cardTypes.length === 0 || isGenerating}
              >
                {isGenerating ? (
                  <>
                    <div className="modern-spinner"></div>
                    正在生成中...
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    开启教学魔法
                  </>
                )}
              </button>
            </div>

            {/* 右侧：预览区域 */}
            <div>
              <div className="modern-card modern-card-elevated" style={{ height: '100%', minHeight: '600px' }}>
                <div className="modern-card-header">
                  <h2 style={{ 
                    fontSize: '20px', 
                    fontWeight: '600', 
                    color: 'var(--gray-900)' 
                  }}>
                    预览区域
                  </h2>
                </div>
                <div className="modern-card-body">
                  {isGenerating ? (
                    <div style={{ textAlign: 'center', padding: '48px 0' }}>
                      <div className="modern-spinner" style={{ margin: '0 auto 16px' }}></div>
                      <p style={{ color: 'var(--gray-600)' }}>AI正在为您施展教学魔法...</p>
                    </div>
                  ) : formData.cardTypes.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <p style={{ color: 'var(--gray-600)', marginBottom: '16px' }}>
                        已选择 {formData.cardTypes.length} 种卡片类型：
                      </p>
                      {formData.cardTypes.map((typeId) => {
                        const type = cardTypes.find(t => t.id === typeId);
                        return type ? (
                          <div key={typeId} className="modern-card" style={{ padding: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: 'var(--radius-base)',
                                background: 'var(--gradient-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white'
                              }}>
                                {type.icon}
                              </div>
                              <span style={{ 
                                fontSize: '16px', 
                                fontWeight: '500', 
                                color: 'var(--gray-900)' 
                              }}>
                                {type.name}
                              </span>
                            </div>
                          </div>
                        ) : null;
                      })}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '48px 0' }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
                      <h3 style={{ 
                        fontSize: '20px', 
                        fontWeight: '600', 
                        color: 'var(--gray-900)', 
                        marginBottom: '8px' 
                      }}>
                        选择卡片类型
                      </h3>
                      <p style={{ color: 'var(--gray-600)' }}>
                        请选择你需要的卡片类型，预览将在这里显示
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}