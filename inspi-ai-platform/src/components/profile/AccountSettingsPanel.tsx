'use client';

import Link from 'next/link';
import React, { useEffect, useState } from 'react';

import { SubscriptionManagement } from '@/components/subscription/SubscriptionManagement';
import { useUser } from '@/contexts/UserContext';

interface AccountSettingsPanelProps {
  variant?: 'standalone' | 'embedded';
  mode?: 'full' | 'profile-only';
}

export function AccountSettingsPanel({ variant = 'standalone', mode = 'full' }: AccountSettingsPanelProps) {
  const { user, updateUser } = useUser();
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [settings, setSettings] = useState({
    profile: {
      name: '',
      email: '',
      bio: '',
      avatar: '',
    },
  });

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

  const handleSave = async () => {
    setIsSaving(true);
    updateUser({
      name: settings.profile.name,
      email: settings.profile.email,
      bio: settings.profile.bio,
      avatar: settings.profile.avatar,
    });

    setTimeout(() => {
      setIsSaving(false);
      setShowProfileEditor(false);
      setShowSaveModal(true);
      setTimeout(() => setShowSaveModal(false), 2000);
    }, 1000);
  };

  const profileCard = (
    <div
      className="modern-card"
      style={{ borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-md)' }}
    >
      <div className="modern-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '32px' }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div style={{
            width: '88px',
            height: '88px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #fef3c7 0%, #fca5a5 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '44px',
          }}>
            {user.avatar || '😊'}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--gray-900)', marginBottom: '6px' }}>{user.name}</h2>
            <p style={{ fontSize: '14px', color: 'var(--gray-600)' }}>{user.email}</p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '10px', fontSize: '12px', color: 'var(--gray-500)' }}>
              <span>
                等级：<span style={{ color: 'var(--primary-600)', fontWeight: 600 }}>{user.level}</span>
              </span>
              <span>加入：{new Date(user.joinDate).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '12px', fontSize: '14px', color: 'var(--gray-600)', lineHeight: 1.7 }}>
          {user.bio}
        </div>

        <div style={{ marginTop: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--gray-900)', marginBottom: '12px' }}>个人概况</h3>
          <div style={{
            display: 'flex',
            justifyContent: 'flex-start',
            gap: '16px',
            flexWrap: 'wrap',
          }}>
            {[
              { label: '已创建卡片', value: user.stats.works },
              { label: '被复用次数', value: user.stats.reuses },
              { label: '收到点赞', value: user.stats.likes },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  border: '1px solid var(--gray-200)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '18px 24px',
                  background: 'white',
                  minWidth: '180px',
                  maxWidth: '200px',
                  textAlign: 'center',
                }}
              >
                <p style={{ fontSize: '12px', color: 'var(--gray-500)', marginBottom: '6px' }}>{item.label}</p>
                <p style={{ fontSize: '22px', fontWeight: 600, color: 'var(--gray-900)' }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          borderTop: '1px solid var(--gray-200)',
          paddingTop: '20px',
          marginTop: '20px',
          background: 'var(--gray-50)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px 24px',
        }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--gray-900)', marginBottom: '12px' }}>账户安全</h3>
          <p style={{ fontSize: '13px', color: 'var(--gray-600)', marginBottom: '16px' }}>建议定期更新密码，保障账户安全。</p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button className="modern-btn modern-btn-outline" style={{ flex: '1 1 200px', fontSize: '14px', padding: '12px' }}>
              修改密码
            </button>
            <button
              className="modern-btn modern-btn-primary"
              style={{ flex: '1 1 200px', fontSize: '14px', padding: '12px' }}
              onClick={() => setShowProfileEditor(true)}
            >
              编辑个人资料
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPanel = () => {
    if (mode === 'profile-only') {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          <div style={{ width: '100%', maxWidth: '960px' }}>{profileCard}</div>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '32px', width: '100%' }}>
        <div
          style={{
            flex: '1 1 360px',
            maxWidth: '420px',
            minWidth: '300px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {profileCard}
        </div>

        <div style={{ flex: '2 1 520px', minWidth: '400px' }}>
          <SubscriptionManagement variant="embedded" />
        </div>
      </div>
    );
  };

  const showHeader = variant === 'standalone';
  const panelContent = renderPanel();

  return (
    <div className={showHeader ? 'modern-layout' : undefined}>
      {showHeader ? (
        <section style={{ padding: '40px 0 80px', background: 'var(--gray-50)' }}>
          <div className="modern-container" style={{ maxWidth: '1100px' }}>
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
              <h1 style={{ fontSize: '32px', fontWeight: '700', color: 'var(--gray-900)' }}>
                账户设置
              </h1>
            </div>
            {panelContent}
          </div>
        </section>
      ) : (
        <div
          style={{
            background: 'white',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--gray-200)',
            padding: '24px',
          }}
        >
          {panelContent}
        </div>
      )}

      {showProfileEditor ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            style={{
              width: 'min(640px, 100%)',
              background: 'white',
              borderRadius: 'var(--radius-xl)',
              boxShadow: 'var(--shadow-xl)',
              padding: '32px',
              position: 'relative',
            }}
          >
            <button
              onClick={() => setShowProfileEditor(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: 'none',
                background: 'var(--gray-100)',
                color: 'var(--gray-500)',
                cursor: 'pointer',
              }}
              aria-label="关闭编辑"
            >
              ×
            </button>

            <h2 style={{ fontSize: '22px', fontWeight: '600', color: 'var(--gray-900)', marginBottom: '24px' }}>
              编辑个人资料
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

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'var(--gray-700)',
                }}>
                  头像（支持 Emoji 或链接）
                </label>
                <input
                  type="text"
                  value={settings.profile.avatar}
                  onChange={(e) => setSettings({
                    ...settings,
                    profile: { ...settings.profile, avatar: e.target.value },
                  })}
                  placeholder="例如：👩‍🏫 或 https://..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--gray-300)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  className="modern-btn modern-btn-outline"
                  style={{ fontSize: '14px' }}
                  onClick={() => setShowProfileEditor(false)}
                  disabled={isSaving}
                >
                  取消
                </button>
                <button
                  type="button"
                  className="modern-btn modern-btn-primary"
                  style={{ fontSize: '14px' }}
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? '保存中...' : '保存修改'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showSaveModal ? (
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
            color: 'var(--emerald-600)',
            border: '1px solid var(--emerald-200)',
            boxShadow: 'var(--shadow-lg)',
            padding: '12px 24px',
            borderRadius: '9999px',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span>✅</span>
            <span>资料已更新</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
