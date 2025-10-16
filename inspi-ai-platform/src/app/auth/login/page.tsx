'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { Suspense, useEffect, useMemo, useState } from 'react';

import { AuthProviders } from '@/components/auth/AuthProviders';
import { LoginForm } from '@/components/auth/LoginForm';

const sanitizeReturnUrl = (raw: string | null): string => {
  if (!raw) return '/';
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return '/';
  }
  return raw.startsWith('/') ? raw : `/${raw}`;
};

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const rawReturnUrl = searchParams.get('returnUrl');
  const returnUrl = useMemo(() => sanitizeReturnUrl(rawReturnUrl), [rawReturnUrl]);

  useEffect(() => {
    // Add login-prompt styles to body
    document.body.classList.add('login-prompt-page');
    return () => {
      document.body.classList.remove('login-prompt-page');
    };
  }, []);

  const handleSuccess = () => {
    setIsLoggedIn(true);
    setTimeout(() => {
      const target = sanitizeReturnUrl(returnUrl);
      if (typeof window !== 'undefined') {
        window.location.href = target;
      } else {
        router.push(target);
      }
    }, 100);
  };

  const handleClose = () => {
    router.push('/');
  };

  return (
    <div className="login-prompt-overlay" role="dialog" aria-modal="true" style={{ position: 'fixed' }}>
      <div className="login-prompt-backdrop" onClick={handleClose} />
      <div className="login-prompt-content" role="document">
        <button
          onClick={handleClose}
          className="login-prompt-close"
          aria-label="关闭登录页面"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="login-prompt-body">
          <section className="login-prompt-info">
            <div className="login-prompt-header">
              <div className="login-prompt-icon" aria-hidden="true">
                ✨
              </div>
              <h3 className="login-prompt-title">创建专属AI卡片</h3>
              <p className="login-prompt-message">登录后即可使用此功能</p>
            </div>

            <div className="login-prompt-benefits">
              <p className="login-prompt-benefits-title">登录后您将获得：</p>
              <ul className="login-prompt-benefits-list">
                <li className="login-prompt-benefit">
                  <span className="login-prompt-benefit-icon" aria-hidden="true">✔</span>
                  <span className="login-prompt-benefit-text">每日3次免费创建额度</span>
                </li>
                <li className="login-prompt-benefit">
                  <span className="login-prompt-benefit-icon" aria-hidden="true">✔</span>
                  <span className="login-prompt-benefit-text">四种专业卡片类型</span>
                </li>
                <li className="login-prompt-benefit">
                  <span className="login-prompt-benefit-icon" aria-hidden="true">✔</span>
                  <span className="login-prompt-benefit-text">智能内容生成</span>
                </li>
                <li className="login-prompt-benefit">
                  <span className="login-prompt-benefit-icon" aria-hidden="true">✔</span>
                  <span className="login-prompt-benefit-text">个人作品管理</span>
                </li>
              </ul>
            </div>
          </section>

          <section className="login-prompt-form">
            {isLoggedIn ? (
              <div className="login-card__alert success" role="alert">
                <div className="flex items-center justify-center mb-2">
                  <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p>登录成功！正在跳转...</p>
              </div>
            ) : (
              <AuthProviders>
                <LoginForm redirectTo={returnUrl} onSuccess={handleSuccess} />
              </AuthProviders>
            )}
          </section>
        </div>

        <div className="login-prompt-footer">
          <p>
            登录即表示您同意我们的{' '}
            <Link href="/terms">用户协议</Link>
            {' '}和{' '}
            <Link href="/privacy">隐私政策</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">加载中...</div>
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  );
}
