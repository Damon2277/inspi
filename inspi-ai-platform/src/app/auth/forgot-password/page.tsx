'use client';

import Link from 'next/link';
import React, { useState } from 'react';

import PasswordResetForm from '@/components/auth/PasswordResetForm';

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [email, setEmail] = useState('');

  const handleResetSuccess = (sentToEmail?: string) => {
    if (sentToEmail) {
      setEmail(sentToEmail);
    }
    setEmailSent(true);
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* 头部 */}
          <div className="text-center">
            <Link href="/" className="inline-block">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Inspi.AI
              </h1>
            </Link>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              邮件已发送
            </h2>
          </div>

          {/* 成功提示卡片 */}
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
              <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              重置邮件已发送
            </h3>

            <p className="text-gray-600 mb-6">
              我们已向 <span className="font-medium text-gray-900">{email}</span> 发送了密码重置邮件。
              请检查您的邮箱并点击邮件中的链接来重置密码。
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-800">
                    没有收到邮件？请检查垃圾邮件文件夹，或者5分钟后重新发送。
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setEmailSent(false)}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                重新发送邮件
              </button>

              <Link
                href="/auth/login"
                className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors text-center"
              >
                返回登录
              </Link>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* 头部 */}
        <div className="text-center">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Inspi.AI
            </h1>
          </Link>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            重置密码
          </h2>
          <p className="text-gray-600">
            输入您的邮箱地址，我们将发送重置链接
          </p>
        </div>

        {/* 重置表单卡片 */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <PasswordResetForm
            onSuccess={handleResetSuccess}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />

          {/* 底部链接 */}
          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-gray-600">
              想起密码了？{' '}
              <Link
                href="/auth/login"
                className="font-medium text-purple-600 hover:text-purple-500 transition-colors"
              >
                立即登录
              </Link>
            </p>
            <p className="text-sm">
              <Link
                href="/auth/register"
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                还没有账户？注册
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
