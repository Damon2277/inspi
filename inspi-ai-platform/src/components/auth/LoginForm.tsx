'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useMemo, useState } from 'react';

import { useAuth } from '@/shared/hooks/useAuth';

interface LoginFormProps {
  onSuccess?: () => void;
  redirectTo?: string;
  className?: string;
}

type RouterInstance = ReturnType<typeof useRouter>;

const fallbackRouter = {
  push: (href: string) => {
    if (typeof window !== 'undefined') {
      window.location.href = href;
    }
  },
  replace: (href: string) => {
    if (typeof window !== 'undefined') {
      window.location.href = href;
    }
  },
  back: () => {},
  forward: () => {},
  refresh: () => {},
  prefetch: async () => {},
} as RouterInstance;

function useSafeRouter(): RouterInstance {
  try {
    return useRouter();
  } catch (error) {
    return fallbackRouter;
  }
}

type LoginFormData = {
  email: string;
  password: string;
  rememberMe: boolean;
};

type LoginFormErrors = Partial<Record<keyof LoginFormData | 'general', string>>;

export function LoginForm({ onSuccess, redirectTo = '/', className = '' }: LoginFormProps) {
  const router = useSafeRouter();
  const auth = useAuth();
  const { login, loading } = auth;

  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = event.target;
    const fieldName = name as keyof LoginFormData;
    const nextValue = type === 'checkbox' ? checked : value;

    setFormData(prev => ({
      ...prev,
      [fieldName]: nextValue as LoginFormData[typeof fieldName],
    }));

    if (errors[fieldName]) {
      setErrors(prev => ({
        ...prev,
        [fieldName]: undefined,
      }));
    }
  };

  const validateForm = () => {
    const validationErrors: LoginFormErrors = {};

    if (!formData.email) {
      validationErrors.email = '请输入邮箱';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      validationErrors.email = '邮箱格式不正确';
    }

    if (!formData.password) {
      validationErrors.password = '请输入密码';
    }

    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) return;

    try {
      const result = await login(formData);

      if (result.success) {
        // 先调用成功回调
        onSuccess && onSuccess();

        // 稍微延迟以确保状态更新
        setTimeout(() => {
          // 如果是默认路径，刷新页面以确保状态更新
          if (redirectTo === '/') {
            window.location.reload();
          } else {
            router.push(redirectTo);
          }
        }, 100);
      } else {
        setErrors({ general: result.error || '登录失败，请稍后重试' });
      }
    } catch (error) {
      setErrors({ general: '登录失败，请稍后重试' });
    }
  };

  const handleGoogleLogin = () => {
    const returnPath = redirectTo || '/';
    const target = `/api/auth/google?returnUrl=${encodeURIComponent(returnPath)}`;
    if (typeof window !== 'undefined') {
      window.location.href = target;
    }
  };

  const containerClass = useMemo(
    () => ['login-card', className].filter(Boolean).join(' '),
    [className],
  );

  const registerHref = useMemo(() => {
    const base = '/auth/register';
    if (!redirectTo || redirectTo === '/') return base;
    return `${base}?returnUrl=${encodeURIComponent(redirectTo)}`;
  }, [redirectTo]);

  return (
    <div className={containerClass}>
      <header className="login-card__header">
        <h2>登录账户</h2>
        <p>欢迎回到 Inspi.AI</p>
      </header>

      {errors.general && (
        <div className="login-card__alert" role="alert">
          {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit} className="login-card__form">
        <div className="login-card__field">
          <label htmlFor="email">邮箱地址</label>
          <input
            id="email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={`modern-input ${errors.email ? 'modern-input--error' : ''}`}
            placeholder="请输入您的邮箱"
            disabled={loading}
            autoComplete="email"
          />
          {errors.email && <span className="login-card__error">{errors.email}</span>}
        </div>

        <div className="login-card__field">
          <label htmlFor="password">密码</label>
          <div className="login-card__password">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={`modern-input ${errors.password ? 'modern-input--error' : ''}`}
              placeholder="请输入您的密码"
              disabled={loading}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="login-card__toggle"
              disabled={loading}
              aria-label={showPassword ? '隐藏密码' : '显示密码'}
            >
              {showPassword ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18m-5.121-5.121A5 5 0 019 9m10.03 3.743A10.97 10.97 0 0112 17c-4.478 0-8.268-2.943-9.543-7a10.972 10.972 0 012.135-3.568" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
          {errors.password && <span className="login-card__error">{errors.password}</span>}
        </div>

        <div className="login-card__meta">
          <label className="login-card__remember">
            <input
              type="checkbox"
              name="rememberMe"
              checked={formData.rememberMe}
              onChange={handleChange}
              disabled={loading}
            />
            <span>记住我</span>
          </label>
          <Link href="/auth/forgot-password">忘记密码？</Link>
        </div>

        <div className="login-card__actions">
          <button
            type="submit"
            disabled={loading}
            className="modern-btn modern-btn-primary modern-btn-lg modern-btn-block"
          >
            {loading ? '登录中…' : '登录'}
          </button>
        </div>
      </form>

      <div className="login-card__divider" role="presentation">
        <span>或</span>
      </div>

      <div className="login-card__oauth-wrap">
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="login-card__oauth"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#EA4335" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 21c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#4285F4" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          使用 Google 登录
        </button>
      </div>

      <footer className="login-card__footer">
        还没有账户？<Link href={registerHref}>立即注册</Link>
      </footer>
    </div>
  );
}
