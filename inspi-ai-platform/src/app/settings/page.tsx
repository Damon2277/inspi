'use client';

import Link from 'next/link';
import React, { useState, useEffect } from 'react';

import { AppLayout } from '@/components/layout';
import { useUser } from '@/contexts/UserContext';

// 将设置页面的内容提取到单独的组件中
function SettingsContent() {
  const { user, updateUser } = useUser();
  const [settings, setSettings] = useState({
    profile: {
      name: '',
      email: '',
      bio: '',
      avatar: '',
    },
    preferences: {
      language: 'zh-CN',
      theme: 'light',
      emailNotifications: true,
      autoSave: true,
    },
    privacy: {
      profileVisibility: 'public',
      showEmail: false,
      showStats: true,
    },
  });

  // 初始化设置数据
  useEffect(() => {
    setSettings(prev => ({
      ...prev,
      profile: {
        name: user.name,
        email: user.email,
        bio: user.bio,
        avatar: user.avatar,
      },
    }));
  }, [user]);

  const [activeTab, setActiveTab] = useState<'profile' | 'account'>('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);

    // 更新共享用户状态
    updateUser({
      name: settings.profile.name,
      email: settings.profile.email,
      bio: settings.profile.bio,
    });

    // 模拟保存延迟
    setTimeout(() => {
      setIsSaving(false);
      setShowSaveModal(true);

      // 2秒后自动关闭模态框
      setTimeout(() => {
        setShowSaveModal(false);
      }, 2000);
    }, 1000);
  };

  return (
    <div className="modern-layout">
      <section style={{ padding: '40px 0 80px', background: 'var(--gray-50)' }}>
        <div className="modern-container" style={{ maxWidth: '1000px' }}>
          {/* 页面标题 */}
          <div style={{ marginBottom: '32px' }}>
            <Link
              href="/profile"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                color: 'var(--primary-600)',
                textDecoration: 'none',
                marginBottom: '16px',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              返回个人中心
            </Link>
            <h1 style={{
              fontSize: '32px',
              fontWeight: '700',
              color: 'var(--gray-900)',
            }}>
              账户设置
            </h1>
          </div>

          <div style={{ display: 'flex', gap: '32px' }}>
            {/* 左侧导航 */}
            <div style={{ width: '240px' }}>
              <div className="modern-card">
                <div className="modern-card-body" style={{ padding: '8px' }}>
                  {[
                    { key: 'profile', label: '个人资料', icon: '👤' },
                    { key: 'account', label: '账户管理', icon: '🗂️' },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key as any)}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        fontSize: '14px',
                        fontWeight: activeTab === tab.key ? '600' : '400',
                        color: activeTab === tab.key ? 'var(--primary-600)' : 'var(--gray-700)',
                        background: activeTab === tab.key ? 'var(--primary-50)' : 'transparent',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        transition: 'all var(--transition-base)',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ fontSize: '18px' }}>{tab.icon}</span>
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 右侧内容区 */}
            <div style={{ flex: 1 }}>
              <div className="modern-card">
                <div className="modern-card-body" style={{ padding: '32px' }}>
                  {/* 个人资料 */}
                  {activeTab === 'profile' && (
                    <div>
                      <h2 style={{
                        fontSize: '20px',
                        fontWeight: '600',
                        marginBottom: '24px',
                        color: 'var(--gray-900)',
                      }}>
                        个人资料
                      </h2>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                          <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontSize: '14px',
                            fontWeight: '500',
                            color: 'var(--gray-700)',
                          }}>
                            姓名
                          </label>
                          <input
                            type="text"
                            value={settings.profile.name}
                            onChange={(e) => setSettings({
                              ...settings,
                              profile: { ...settings.profile, name: e.target.value },
                            })}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              border: '1px solid var(--gray-300)',
                              borderRadius: 'var(--radius-md)',
                              fontSize: '14px',
                            }}
                          />
                        </div>
                        <div>
                          <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontSize: '14px',
                            fontWeight: '500',
                            color: 'var(--gray-700)',
                          }}>
                            邮箱
                          </label>
                          <input
                            type="email"
                            value={settings.profile.email}
                            onChange={(e) => setSettings({
                              ...settings,
                              profile: { ...settings.profile, email: e.target.value },
                            })}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              border: '1px solid var(--gray-300)',
                              borderRadius: 'var(--radius-md)',
                              fontSize: '14px',
                            }}
                          />
                        </div>
                        <div>
                          <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontSize: '14px',
                            fontWeight: '500',
                            color: 'var(--gray-700)',
                          }}>
                            个人简介
                          </label>
                          <textarea
                            value={settings.profile.bio}
                            onChange={(e) => setSettings({
                              ...settings,
                              profile: { ...settings.profile, bio: e.target.value },
                            })}
                            rows={4}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              border: '1px solid var(--gray-300)',
                              borderRadius: 'var(--radius-md)',
                              fontSize: '14px',
                              resize: 'vertical',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 账户管理 */}
                  {activeTab === 'account' && (
                    <div>
                      <h2 style={{
                        fontSize: '20px',
                        fontWeight: '600',
                        marginBottom: '24px',
                        color: 'var(--gray-900)',
                      }}>
                        账户管理
                      </h2>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div>
                          <h3 style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            marginBottom: '12px',
                            color: 'var(--gray-800)',
                          }}>
                            修改密码
                          </h3>
                          <button
                            className="modern-btn modern-btn-outline"
                            style={{ fontSize: '14px' }}
                          >
                            修改密码
                          </button>
                        </div>
                        <div>
                          <h3 style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            marginBottom: '8px',
                            color: 'var(--gray-800)',
                          }}>
                            账户订阅
                          </h3>
                          <p style={{
                            fontSize: '14px',
                            color: 'var(--gray-600)',
                            marginBottom: '12px',
                          }}>
                            当前订阅：Pro 用户
                          </p>
                          <button
                            className="modern-btn modern-btn-primary"
                            style={{ fontSize: '14px' }}
                          >
                            管理订阅
                          </button>
                        </div>
                        <div style={{
                          paddingTop: '24px',
                          borderTop: '1px solid var(--gray-200)',
                        }}>
                          <h3 style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            marginBottom: '8px',
                            color: 'var(--danger-600)',
                          }}>
                            危险区域
                          </h3>
                          <p style={{
                            fontSize: '14px',
                            color: 'var(--gray-600)',
                            marginBottom: '12px',
                          }}>
                            删除账户后，您的所有数据将被永久删除且无法恢复。
                          </p>
                          <button
                            className="modern-btn"
                            style={{
                              fontSize: '14px',
                              background: 'var(--danger-600)',
                              color: 'white',
                            }}
                          >
                            删除账户
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 保存按钮 */}
                  <div style={{
                    marginTop: '32px',
                    paddingTop: '24px',
                    borderTop: '1px solid var(--gray-200)',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                  }}>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="modern-btn modern-btn-primary"
                      style={{
                        fontSize: '14px',
                        opacity: isSaving ? 0.6 : 1,
                        cursor: isSaving ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {isSaving ? '保存中...' : '保存更改'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 保存成功 Toast 提示 */}
      {showSaveModal && (
        <div style={{
          position: 'fixed',
          top: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          animation: 'slideDown 0.4s ease, slideUp 0.4s ease 1.6s',
        }}>
          <div style={{
            background: 'white',
            padding: '16px 24px',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            minWidth: '280px',
            border: '1px solid var(--gray-200)',
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--success-100)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--success-600)" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: '15px',
                fontWeight: '600',
                color: 'var(--gray-900)',
                marginBottom: '2px',
              }}>
                设置已保存
              </div>
              <div style={{
                fontSize: '13px',
                color: 'var(--gray-600)',
              }}>
                您的个人资料已成功更新
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from {
            transform: translate(-50%, -100%);
            opacity: 0;
          }
          to {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }
        
        @keyframes slideUp {
          from {
            transform: translate(-50%, 0);
            opacity: 1;
          }
          to {
            transform: translate(-50%, -100%);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

// 主页面组件，提供 AppLayout 和 UserProvider
export default function SettingsPage() {
  return (
    <AppLayout>
      <SettingsContent />
    </AppLayout>
  );
}
