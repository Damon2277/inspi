'use client';

import Link from 'next/link';
import React, { useEffect, useState } from 'react';

import { SubscriptionManagement } from '@/components/subscription/SubscriptionManagement';
import { useUser } from '@/contexts/UserContext';
import { useAuth } from '@/shared/hooks/useAuth';

interface AccountSettingsPanelProps {
  variant?: 'standalone' | 'embedded';
  mode?: 'full' | 'profile-only';
}

export function AccountSettingsPanel({ variant = 'standalone', mode = 'full' }: AccountSettingsPanelProps) {
  const { user, updateUser } = useUser();
  const { user: authAccountUser, changePassword: changePasswordApi } = useAuth();
  const isAuthenticated = Boolean(authAccountUser);
  const [loginRedirectUrl, setLoginRedirectUrl] = useState('/auth/login');
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
  const [avatarUploadError, setAvatarUploadError] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const currentPath = window.location.pathname + window.location.search || '/profile?tab=settings';
    setLoginRedirectUrl(`/auth/login?returnUrl=${encodeURIComponent(currentPath)}`);
  }, []);

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

  const isImageAvatar = (value?: string) => Boolean(value && (value.startsWith('data:') || value.startsWith('http')));

  const fileToDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setAvatarUploadError('头像文件不能超过 2MB');
      event.target.value = '';
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      setSettings(prev => ({
        ...prev,
        profile: { ...prev.profile, avatar: dataUrl },
      }));
      setAvatarUploadError(null);
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      setAvatarUploadError('上传头像失败，请重试');
    } finally {
      setIsUploadingAvatar(false);
      event.target.value = '';
    }
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setPasswordForm({ current: '', next: '', confirm: '' });
    setPasswordFeedback(null);
    setIsUpdatingPassword(false);
  };

  const translatePasswordError = (message?: string) => {
    if (!message) return '修改密码失败，请稍后重试';
    const lower = message.toLowerCase();
    if (lower.includes('token')) return '请先登录后再修改密码';
    if (lower.includes('user id not found')) return '用户身份状态异常，请重新登录';
    if (lower.includes('current password and new password are required')) return '请填写当前密码和新密码';
    if (lower.includes('invalid current password')) return '当前密码不正确';
    if (lower.includes('password')) return message.replace(/password/gi, '密码');
    return message;
  };

  const handlePasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!passwordForm.current || !passwordForm.next || !passwordForm.confirm) {
      setPasswordFeedback({ type: 'error', message: '请输入完整的密码信息' });
      return;
    }

    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordFeedback({ type: 'error', message: '两次输入的新密码不一致' });
      return;
    }

    if (passwordForm.next.length < 8) {
      setPasswordFeedback({ type: 'error', message: '新密码至少需要 8 位字符' });
      return;
    }

    setIsUpdatingPassword(true);
    setPasswordFeedback(null);
    try {
      const result = await changePasswordApi({
        currentPassword: passwordForm.current,
        newPassword: passwordForm.next,
      });

      if (!result.success) {
        throw new Error(translatePasswordError(result.error));
      }

      setPasswordFeedback({ type: 'success', message: '密码修改成功' });
      setPasswordForm({ current: '', next: '', confirm: '' });
      setTimeout(() => {
        closePasswordModal();
      }, 1200);
    } catch (error) {
      const message = error instanceof Error ? error.message : '修改密码失败，请稍后重试';
      setPasswordFeedback({ type: 'error', message: translatePasswordError(message) });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

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
            overflow: 'hidden',
          }}>
            {isImageAvatar(user.avatar) ? (
              <img
                src={user.avatar}
                alt={`${user.name} 的头像`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <span>{user.avatar || '😊'}</span>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--gray-900)', marginBottom: '6px' }}>{user.name}</h2>
            <p style={{ fontSize: '18px', color: 'var(--gray-600)' }}>{user.email}</p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '10px', fontSize: '16px', color: 'var(--gray-500)' }}>
              <span>
                等级：<span style={{ color: 'var(--primary-600)', fontWeight: 600 }}>{user.level}</span>
              </span>
              <span>加入：{new Date(user.joinDate).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '12px', fontSize: '18px', color: 'var(--gray-600)', lineHeight: 1.6 }}>
          {user.bio}
        </div>

        <div style={{ marginTop: '24px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--gray-900)', marginBottom: '12px' }}>个人概况</h3>
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
                <p style={{ fontSize: '16px', color: 'var(--gray-500)', marginBottom: '6px' }}>{item.label}</p>
                <p style={{ fontSize: '28px', fontWeight: 600, color: 'var(--gray-900)' }}>{item.value}</p>
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
          <h3 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--gray-900)', marginBottom: '12px' }}>账户安全</h3>
          <p style={{ fontSize: '18px', color: 'var(--gray-600)', marginBottom: '16px' }}>建议定期更新密码，保障账户安全。</p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="modern-btn modern-btn-outline"
              style={{ flex: '1 1 200px', fontSize: '18px', padding: '14px', minHeight: 'calc(var(--hero-btn-height) * 0.7)' }}
              onClick={() => {
                setPasswordFeedback(null);
                setShowPasswordModal(true);
              }}
            >
              修改密码
            </button>
            <button
              className="modern-btn modern-btn-primary"
              style={{ flex: '1 1 200px', fontSize: '18px', padding: '14px', minHeight: 'calc(var(--hero-btn-height) * 0.7)' }}
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

  const loginPromptCard = (
    <div className="modern-card" style={{ padding: '32px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ fontSize: '48px' }}>🔐</div>
      <h3 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--gray-900)' }}>登录后管理账户设置</h3>
      <p style={{ fontSize: '16px', color: 'var(--gray-600)', lineHeight: 1.6 }}>为了保护您的数据，账户详情与安全配置仅限登录用户查看。请先登录后继续。</p>
      <Link
        href={loginRedirectUrl}
        className="modern-btn modern-btn-primary"
        style={{ width: '100%', justifyContent: 'center', minHeight: 'calc(var(--hero-btn-height) * 0.7)' }}
      >
        前往登录
      </Link>
    </div>
  );

  const renderedContent = isAuthenticated ? panelContent : (
    <div style={{ width: '100%', maxWidth: mode === 'profile-only' ? '720px' : '560px', margin: '0 auto' }}>
      {loginPromptCard}
    </div>
  );


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
              fontSize: '18px',
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
              <h1 style={{ fontSize: '42px', fontWeight: '700', color: 'var(--gray-900)' }}>
                账户设置
              </h1>
            </div>
            {renderedContent}
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
          {renderedContent}
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
                  fontSize: '18px',
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
                    fontSize: '18px',
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '18px',
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
                    fontSize: '18px',
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '18px',
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
                    fontSize: '18px',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '18px',
                  fontWeight: '500',
                  color: 'var(--gray-700)',
                }}>
                  头像（支持本地上传）
                </label>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '16px',
                  alignItems: 'center',
                }}>
                  <div style={{
                    width: '96px',
                    height: '96px',
                    borderRadius: '50%',
                    background: 'var(--gray-100)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '40px',
                    overflow: 'hidden',
                  }}>
                    {settings.profile.avatar ? (
                      isImageAvatar(settings.profile.avatar) ? (
                        <img
                          src={settings.profile.avatar}
                          alt="头像预览"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <span>{settings.profile.avatar}</span>
                      )
                    ) : (
                      <span style={{ color: 'var(--gray-400)', fontSize: '14px' }}>暂无头像</span>
                    )}
                  </div>
                  <div style={{ flex: '1 1 240px', minWidth: '200px' }}>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                      onChange={handleAvatarUpload}
                      disabled={isUploadingAvatar}
                      style={{
                        width: '100%',
                        border: '1px dashed var(--gray-300)',
                        borderRadius: 'var(--radius-md)',
                        padding: '10px',
                      }}
                    />
                    <p style={{ fontSize: '14px', color: 'var(--gray-500)', marginTop: '8px' }}>
                      支持 PNG/JPG/WebP/GIF，大小不超过 2MB。
                    </p>
                    {avatarUploadError ? (
                      <p style={{ color: 'var(--danger-600)', fontSize: '14px', marginTop: '8px' }}>{avatarUploadError}</p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  className="modern-btn modern-btn-outline"
                  style={{ fontSize: '18px', minHeight: 'calc(var(--hero-btn-height) * 0.7)' }}
                  onClick={() => setShowProfileEditor(false)}
                  disabled={isSaving}
                >
                  取消
                </button>
                <button
                  type="button"
                  className="modern-btn modern-btn-primary"
                  style={{ fontSize: '18px', minHeight: 'calc(var(--hero-btn-height) * 0.7)' }}
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

      {showPasswordModal ? (
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
              width: 'min(480px, 100%)',
              background: 'white',
              borderRadius: 'var(--radius-xl)',
              boxShadow: 'var(--shadow-xl)',
              padding: '32px',
              position: 'relative',
            }}
          >
            <button
              onClick={closePasswordModal}
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
              aria-label="关闭修改密码"
            >
              ×
            </button>

            <h2 style={{ fontSize: '22px', fontWeight: '600', color: 'var(--gray-900)', marginBottom: '18px' }}>
              修改密码
            </h2>

            <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '16px', fontWeight: 500, color: 'var(--gray-700)' }}>当前密码</label>
                <input
                  type="password"
                  value={passwordForm.current}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, current: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--gray-300)', borderRadius: 'var(--radius-md)', fontSize: '16px' }}
                  placeholder="请输入当前密码"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '16px', fontWeight: 500, color: 'var(--gray-700)' }}>新密码</label>
                <input
                  type="password"
                  value={passwordForm.next}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, next: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--gray-300)', borderRadius: 'var(--radius-md)', fontSize: '16px' }}
                  placeholder="至少 8 位，包含字母与数字"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '16px', fontWeight: 500, color: 'var(--gray-700)' }}>确认新密码</label>
                <input
                  type="password"
                  value={passwordForm.confirm}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--gray-300)', borderRadius: 'var(--radius-md)', fontSize: '16px' }}
                  placeholder="再次输入新密码"
                />
              </div>

              {passwordFeedback?.type === 'error' ? (
                <p style={{ color: 'var(--danger-600)', fontSize: '14px' }}>{passwordFeedback.message}</p>
              ) : null}
              {passwordFeedback?.type === 'success' ? (
                <p style={{ color: 'var(--emerald-600)', fontSize: '14px' }}>{passwordFeedback.message}</p>
              ) : null}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button
                  type="button"
                  className="modern-btn modern-btn-outline"
                  style={{ minHeight: 'calc(var(--hero-btn-height) * 0.7)' }}
                  onClick={closePasswordModal}
                  disabled={isUpdatingPassword}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="modern-btn modern-btn-primary"
                  style={{ minHeight: 'calc(var(--hero-btn-height) * 0.7)' }}
                  disabled={isUpdatingPassword}
                >
                  {isUpdatingPassword ? '保存中...' : '确认修改'}
                </button>
              </div>
            </form>
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
            fontSize: '18px',
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
