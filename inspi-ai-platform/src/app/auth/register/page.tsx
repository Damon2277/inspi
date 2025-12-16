'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { Suspense, useEffect, useState } from 'react';

import { AuthProviders } from '@/components/auth/AuthProviders';
import { RegisterForm } from '@/components/auth/RegisterForm';

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isRegistered, setIsRegistered] = useState(false);

  const returnUrl = searchParams.get('returnUrl') || '/';

  useEffect(() => {
    // Add login-prompt styles to body
    document.body.classList.add('login-prompt-page');
    return () => {
      document.body.classList.remove('login-prompt-page');
    };
  }, []);

  const handleSuccess = () => {
    setIsRegistered(true);
    setTimeout(() => {
      router.push('/auth/login?returnUrl=' + encodeURIComponent(returnUrl));
    }, 2000);
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
          aria-label="关闭注册页面"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="login-prompt-body">
          <section className="login-prompt-info">
            <div className="login-prompt-header">
              <div className="login-prompt-icon" aria-hidden="true">
                🚀
              </div>
              <h3 className="login-prompt-title">加入 Inspi.AI</h3>
              <p className="login-prompt-message">注册账号，开启AI教学之旅</p>
            </div>

            <div className="login-prompt-benefits">
              <p className="login-prompt-benefits-title">注册后您将获得：</p>
              <ul className="login-prompt-benefits-list">
                <li className="login-prompt-benefit">
                  <span className="login-prompt-benefit-icon" aria-hidden="true">✔</span>
                  <span className="login-prompt-benefit-text">免费使用AI教学助手</span>
                </li>
                <li className="login-prompt-benefit">
                  <span className="login-prompt-benefit-icon" aria-hidden="true">✔</span>
                  <span className="login-prompt-benefit-text">保存和管理教学作品</span>
                </li>
                <li className="login-prompt-benefit">
                  <span className="login-prompt-benefit-icon" aria-hidden="true">✔</span>
                  <span className="login-prompt-benefit-text">加入教学社区</span>
                </li>
                <li className="login-prompt-benefit">
                  <span className="login-prompt-benefit-icon" aria-hidden="true">✔</span>
                  <span className="login-prompt-benefit-text">获取更多教学资源</span>
                </li>
              </ul>
            </div>
          </section>

          <section className="login-prompt-form">
            {isRegistered ? (
              <div className="login-card__alert success" role="alert">
                <div className="flex items-center justify-center mb-2">
                  <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p>注册成功！正在跳转到登录页...</p>
              </div>
            ) : (
              <AuthProviders>
                <RegisterForm onSuccess={handleSuccess} />
              </AuthProviders>
            )}
          </section>
        </div>

        <div className="login-prompt-footer">
          <p>
            已有账号？{' '}
            <Link href="/auth/login">立即登录</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">加载中...</div>
      </div>
    }>
      <RegisterPageContent />
    </Suspense>
  );
}
