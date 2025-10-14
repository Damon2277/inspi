'use client';

import Link from 'next/link';
import React, { useState } from 'react';

import { AppLayout } from '@/components/layout';

// 用户作品接口
interface UserWork {
  id: number;
  title: string;
  type: string;
  subject: string;
  grade: string;
  thumbnail: string;
  likes: number;
  uses: number;
  createdAt: string;
  status: 'published' | 'draft' | 'private';
}

/**
 * 现代化桌面端个人资料页面
 * 与首页设计保持一致的用户中心界面
 */
export default function ProfilePage() {
  const [user] = useState({
    name: '张老师',
    email: 'zhang@example.com',
    avatar: '👩‍🏫',
    level: 'Pro',
    joinDate: '2024-01-01',
    bio: '高中数学教师，专注于函数与几何教学，致力于用创新方法让数学变得有趣。',
    stats: {
      works: 12,
      reuses: 39,
      likes: 156,
      followers: 28,
    },
  });

  const [activeTab, setActiveTab] = useState<'works' | 'drafts' | 'liked'>('works');

  // 模拟用户作品数据
  const userWorks: UserWork[] = [
    {
      id: 1,
      title: '二次函数的图像与性质',
      type: '可视化卡',
      subject: '数学',
      grade: '高中',
      thumbnail: '📊',
      likes: 45,
      uses: 23,
      createdAt: '2024-01-15',
      status: 'published',
    },
    {
      id: 2,
      title: '三角函数的应用',
      type: '类比延展卡',
      subject: '数学',
      grade: '高中',
      thumbnail: '📐',
      likes: 32,
      uses: 18,
      createdAt: '2024-01-12',
      status: 'published',
    },
    {
      id: 3,
      title: '立体几何入门',
      type: '互动氛围卡',
      subject: '数学',
      grade: '高中',
      thumbnail: '🔺',
      likes: 28,
      uses: 15,
      createdAt: '2024-01-10',
      status: 'draft',
    },
  ];

  const quickActions = [
    {
      id: 'create',
      title: '创建新作品',
      description: '开始创作你的教学魔法',
      icon: '✨',
      href: '/create',
      color: 'from-orange-500 to-pink-500',
    },
    {
      id: 'explore',
      title: '探索广场',
      description: '发现更多优秀作品',
      icon: '🌟',
      href: '/square',
      color: 'from-blue-500 to-purple-500',
    },
    {
      id: 'settings',
      title: '账户设置',
      description: '管理个人信息和偏好',
      icon: '⚙️',
      href: '/settings',
      color: 'from-green-500 to-teal-500',
    },
  ];

  const handleTabChange = (tab: 'works' | 'drafts' | 'liked') => {
    setActiveTab(tab);
  };

  const handleWorkClick = (work: UserWork) => {
    if (work.status === 'published') {
      window.location.href = `/case/${work.id}`;
    } else {
      window.location.href = `/create?edit=${work.id}`;
    }
  };

  return (
    <AppLayout>
      <div className="modern-layout">
      {/* 个人资料头部 */}
      <section style={{ padding: '60px 0 40px', background: 'var(--gradient-hero)' }}>
        <div className="modern-container">
          <div className="profile-info-grid modern-grid" style={{ gridTemplateColumns: '1fr 300px', gap: '40px' }}>
            {/* 用户信息 */}
            <div className="modern-card modern-card-elevated">
              <div className="modern-card-body" style={{ padding: '40px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '24px' }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: 'var(--gradient-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '36px',
                  }}>
                    {user.avatar}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <h1 style={{
                        fontSize: '28px',
                        fontWeight: '700',
                        color: 'var(--gray-900)',
                      }}>
                        {user.name}
                      </h1>
                      <span style={{
                        padding: '4px 12px',
                        background: 'var(--gradient-primary)',
                        color: 'white',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '12px',
                        fontWeight: '600',
                      }}>
                        {user.level} 用户
                      </span>
                    </div>
                    <p style={{
                      color: 'var(--gray-600)',
                      marginBottom: '12px',
                      fontSize: '16px',
                    }}>
                      {user.email}
                    </p>
                    <p style={{
                      color: 'var(--gray-700)',
                      lineHeight: '1.6',
                      marginBottom: '16px',
                    }}>
                      {user.bio}
                    </p>
                    <p style={{
                      color: 'var(--gray-500)',
                      fontSize: '14px',
                    }}>
                      加入于 {new Date(user.joinDate).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 统计数据 */}
            <div>
              <div className="modern-card" style={{ marginBottom: '24px' }}>
                <div className="modern-card-body">
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    marginBottom: '20px',
                    color: 'var(--gray-900)',
                  }}>
                    我的数据
                  </h3>
                  <div className="modern-grid modern-grid-2" style={{ gap: '16px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        fontSize: '24px',
                        fontWeight: '700',
                        color: 'var(--primary-600)',
                        marginBottom: '4px',
                      }}>
                        {user.stats.works}
                      </div>
                      <div style={{ fontSize: '14px', color: 'var(--gray-600)' }}>作品</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        fontSize: '24px',
                        fontWeight: '700',
                        color: 'var(--primary-600)',
                        marginBottom: '4px',
                      }}>
                        {user.stats.reuses}
                      </div>
                      <div style={{ fontSize: '14px', color: 'var(--gray-600)' }}>复用</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        fontSize: '24px',
                        fontWeight: '700',
                        color: 'var(--primary-600)',
                        marginBottom: '4px',
                      }}>
                        {user.stats.likes}
                      </div>
                      <div style={{ fontSize: '14px', color: 'var(--gray-600)' }}>点赞</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        fontSize: '24px',
                        fontWeight: '700',
                        color: 'var(--primary-600)',
                        marginBottom: '4px',
                      }}>
                        {user.stats.followers}
                      </div>
                      <div style={{ fontSize: '14px', color: 'var(--gray-600)' }}>关注</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 快捷操作 */}
              <div className="modern-card">
                <div className="modern-card-body">
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    marginBottom: '16px',
                    color: 'var(--gray-900)',
                  }}>
                    快捷操作
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {quickActions.map((action) => (
                      <Link
                        key={action.id}
                        href={action.href}
                        className="modern-btn modern-btn-ghost"
                        style={{
                          justifyContent: 'flex-start',
                          padding: '12px 16px',
                          textAlign: 'left',
                        }}
                      >
                        <span style={{ fontSize: '20px', marginRight: '12px' }}>
                          {action.icon}
                        </span>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '14px' }}>
                            {action.title}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                            {action.description}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 作品展示区域 */}
      <section style={{ padding: '40px 0 80px', background: 'white' }}>
        <div className="modern-container">
          {/* 标签页导航 */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{
              display: 'flex',
              gap: '32px',
              borderBottom: '2px solid var(--gray-200)',
            }}>
              {[
                { key: 'works', label: '我的作品', count: user.stats.works },
                { key: 'drafts', label: '草稿箱', count: 3 },
                { key: 'liked', label: '我的收藏', count: 8 },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab.key as any)}
                  style={{
                    padding: '16px 0',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: activeTab === tab.key ? 'var(--primary-600)' : 'var(--gray-600)',
                    borderBottom: activeTab === tab.key ? '2px solid var(--primary-600)' : '2px solid transparent',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all var(--transition-base)',
                  }}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>
          </div>

          {/* 作品网格 */}
          <div className="modern-grid modern-grid-3">
            {userWorks
              .filter(work => {
                if (activeTab === 'works') return work.status === 'published';
                if (activeTab === 'drafts') return work.status === 'draft';
                return true; // liked 暂时显示所有
              })
              .map((work) => (
                <div
                  key={work.id}
                  className="modern-card modern-card-elevated case-card"
                  onClick={() => handleWorkClick(work)}
                  style={{
                    cursor: 'pointer',
                    transition: 'all var(--transition-base)',
                  }}
                >
                  <div className="modern-card-body">
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      marginBottom: '16px',
                    }}>
                      <div style={{ fontSize: '48px' }}>{work.thumbnail}</div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <span style={{
                          padding: '4px 8px',
                          background: 'var(--primary-100)',
                          color: 'var(--primary-700)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '12px',
                          fontWeight: '500',
                        }}>
                          {work.subject}
                        </span>
                        <span style={{
                          padding: '4px 8px',
                          background: work.status === 'published' ? 'var(--success-100)' : 'var(--gray-100)',
                          color: work.status === 'published' ? 'var(--success-700)' : 'var(--gray-600)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '12px',
                        }}>
                          {work.status === 'published' ? '已发布' : '草稿'}
                        </span>
                      </div>
                    </div>

                    <h3 style={{
                      fontSize: '18px',
                      fontWeight: '600',
                      color: 'var(--gray-900)',
                      marginBottom: '8px',
                      lineHeight: '1.3',
                    }}>
                      {work.title}
                    </h3>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: '16px',
                      borderTop: '1px solid var(--gray-200)',
                    }}>
                      <div style={{
                        fontSize: '14px',
                        color: 'var(--gray-500)',
                      }}>
                        {new Date(work.createdAt).toLocaleDateString('zh-CN')}
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        fontSize: '14px',
                        color: 'var(--gray-500)',
                      }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          ❤️ {work.likes}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          🔄 {work.uses}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>

          {/* 空状态 */}
          {userWorks.filter(work => {
            if (activeTab === 'works') return work.status === 'published';
            if (activeTab === 'drafts') return work.status === 'draft';
            return true;
          }).length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: 'var(--gray-500)',
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
              <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>
                {activeTab === 'works' && '还没有发布的作品'}
                {activeTab === 'drafts' && '草稿箱是空的'}
                {activeTab === 'liked' && '还没有收藏的作品'}
              </h3>
              <p style={{ marginBottom: '24px' }}>
                {activeTab === 'works' && '开始创作你的第一个教学魔法吧！'}
                {activeTab === 'drafts' && '创作的灵感都会保存在这里'}
                {activeTab === 'liked' && '发现喜欢的作品就收藏起来吧'}
              </p>
              <Link href="/create" className="modern-btn modern-btn-primary">
                开始创作
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* 页脚 */}
      <footer style={{
        background: 'var(--gray-900)',
        color: 'var(--gray-300)',
        padding: '40px 0',
        textAlign: 'center',
      }}>
        <div className="modern-container">
          <div className="modern-logo" style={{ color: 'white', marginBottom: '16px' }}>
            Inspi.AI
          </div>
          <p>© 2024 Inspi.AI. 让AI激发教学创意.</p>
        </div>
      </footer>
      </div>
    </AppLayout>
  );
}
