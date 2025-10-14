'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useState, useEffect } from 'react';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [canResend, setCanResend] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  useEffect(() => {
    if (token) {
      // 如果有token，验证邮箱
      verifyEmail(token);
    } else {
      // 如果没有token，显示等待验证状态
      setVerificationStatus('loading');
      setCanResend(true);
    }
  }, [token]);

  const verifyEmail = async (verificationToken: string) => {
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: verificationToken,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setVerificationStatus('success');
        // 3秒后自动跳转到登录页面
        setTimeout(() => {
          router.push('/auth/login?verified=true');
        }, 3000);
      } else {
        if (result.error === 'Token expired') {
          setVerificationStatus('expired');
        } else {
          setVerificationStatus('error');
          setError(result.error || '验证失败');
        }
      }
    } catch (err) {
      setVerificationStatus('error');
      setError('网络错误，请重试');
    }
  };

  const resendVerificationEmail = async () => {
    if (!email || resendCooldown > 0) return;

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // 设置60秒冷却时间
        let countdown = 60;
        setResendCooldown(countdown);
        const timer = setInterval(() => {
          countdown -= 1;
          if (countdown <= 0) {
            clearInterval(timer);
            setResendCooldown(0);
          } else {
            setResendCooldown(countdown);
          }
        }, 1000);
      } else {
        setError(result.error || '重发邮件失败');
      }
    } catch (err) {
      setError('网络错误，请重试');
    }
  };

  const renderContent = () => {
    switch (verificationStatus) {
      case 'loading':
        if (token) {
          return (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-6">
                <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                正在验证邮箱...
              </h3>
              <p className="text-gray-600">
                请稍候，我们正在验证您的邮箱地址
              </p>
            </div>
          );
        } else {
          return (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-6">
                <svg className="h-8 w-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                请验证您的邮箱
              </h3>
              <p className="text-gray-600 mb-6">
                我们已向您的邮箱发送了验证邮件，请点击邮件中的链接完成验证。
              </p>
              {email && (
                <p className="text-sm text-gray-500 mb-6">
                  验证邮件已发送至：<span className="font-medium">{email}</span>
                </p>
              )}
              <div className="space-y-3">
                <button
                  onClick={resendVerificationEmail}
                  disabled={!canResend || resendCooldown > 0}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                    !canResend || resendCooldown > 0
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {resendCooldown > 0 ? `重新发送 (${resendCooldown}s)` : '重新发送验证邮件'}
                </button>
              </div>
            </div>
          );
        }

      case 'success':
        return (
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
              <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              邮箱验证成功！
            </h3>
            <p className="text-gray-600 mb-6">
              您的邮箱已成功验证，现在可以使用所有功能了。
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-green-800">
                🎉 恭喜！您现在可以开始创建AI卡片，每天享有3次创建和1次复用的免费额度。
              </p>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              3秒后自动跳转到登录页面...
            </p>
            <Link
              href="/auth/login"
              className="inline-block bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              立即登录
            </Link>
          </div>
        );

      case 'expired':
        return (
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-orange-100 mb-6">
              <svg className="h-8 w-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              验证链接已过期
            </h3>
            <p className="text-gray-600 mb-6">
              验证链接已过期，请重新发送验证邮件。
            </p>
            <div className="space-y-3">
              <button
                onClick={resendVerificationEmail}
                disabled={resendCooldown > 0}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                  resendCooldown > 0
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-orange-600 hover:bg-orange-700 text-white'
                }`}
              >
                {resendCooldown > 0 ? `重新发送 (${resendCooldown}s)` : '重新发送验证邮件'}
              </button>
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
              <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              验证失败
            </h3>
            <p className="text-gray-600 mb-6">
              {error || '邮箱验证失败，请重试'}
            </p>
            <div className="space-y-3">
              <button
                onClick={resendVerificationEmail}
                disabled={resendCooldown > 0}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                  resendCooldown > 0
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {resendCooldown > 0 ? `重新发送 (${resendCooldown}s)` : '重新发送验证邮件'}
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* 头部 */}
        <div className="text-center">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Inspi.AI
            </h1>
          </Link>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            邮箱验证
          </h2>
        </div>

        {/* 验证内容卡片 */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {renderContent()}

          {/* 错误提示 */}
          {error && verificationStatus !== 'error' && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* 帮助信息 */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              需要帮助？{' '}
              <Link
                href="/support"
                className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
              >
                联系客服
              </Link>
            </p>
          </div>
        </div>

        {/* 返回首页 */}
        <div className="text-center">
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← 返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}
