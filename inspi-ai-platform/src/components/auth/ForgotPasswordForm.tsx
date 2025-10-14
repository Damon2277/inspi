/**
 * 忘记密码表单组件
 */
'use client';

import Link from 'next/link';
import React, { useState } from 'react';

import { useAuth } from '@/shared/hooks/useAuth';

interface ForgotPasswordFormProps {
  onSuccess?: () => void
  className?: string
}

export function ForgotPasswordForm({ onSuccess, className = '' }: ForgotPasswordFormProps) {
  const { requestPasswordReset } = useAuth();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setError('请输入邮箱地址');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('邮箱格式不正确');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const result = await requestPasswordReset({ email });

      if (result.success) {
        setSuccess(true);
        onSuccess && onSuccess();
      } else {
        setError(result.error || '请求失败');
      }
    } catch (error) {
      setError('请求失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={`w-full max-w-md mx-auto ${className}`}>
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">邮件已发送</h2>
            <p className="text-gray-600 mb-6">
              我们已向 <strong>{email}</strong> 发送了密码重置邮件。
              请查收邮件并按照说明重置您的密码。
            </p>
            <div className="space-y-4">
              <Link
                href="/auth/login"
                className="block w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-center"
              >
                返回登录
              </Link>
              <button
                onClick={() => {
                  setSuccess(false);
                  setEmail('');
                }}
                className="block w-full py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-center"
              >
                重新发送
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">忘记密码</h2>
          <p className="text-gray-600 mt-2">输入您的邮箱地址，我们将发送重置链接</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              邮箱地址
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="请输入您的邮箱"
              disabled={loading}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                发送中...
              </div>
            ) : (
              '发送重置邮件'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            想起密码了？{' '}
            <Link href="/auth/login" className="text-blue-600 hover:text-blue-500 font-medium">
              返回登录
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordForm;
