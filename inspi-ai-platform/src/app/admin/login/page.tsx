'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';

function sanitizeReturnUrl(raw?: string | null) {
  if (!raw) return '/admin';
  if (raw.startsWith('http://') || raw.startsWith('https://')) return '/admin';
  return raw.startsWith('/') ? raw : `/${raw}`;
}

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const returnUrl = sanitizeReturnUrl(searchParams?.get('returnUrl'));

  useEffect(() => {
    let cancelled = false;
    const checkSession = async () => {
      try {
        const response = await fetch('/api/admin/session', { cache: 'no-store' });
        const data = await response.json();
        if (cancelled) return;
        if (data.authenticated) {
          router.replace(returnUrl);
        }
      } catch (err) {
        // ignore, user can login manually
      }
    };
    checkSession();
    return () => {
      cancelled = true;
    };
  }, [returnUrl, router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('请输入邮箱和密码');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data?.error || '登录失败，请稍后重试');
        return;
      }

      router.replace(returnUrl);
    } catch (err) {
      setError('登录失败，请检查网络稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white shadow-xl rounded-xl p-8">
          <div className="text-center mb-6">
            <p className="text-sm text-indigo-600 font-semibold">Inspi.AI Admin</p>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">管理员登录</h1>
            <p className="text-sm text-gray-500 mt-2">仅限内部管理员访问，请妥善保管凭证。</p>
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                管理员邮箱
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="admin@inspi.local"
                autoComplete="username"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                管理员密码
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={event => setPassword(event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="请输入密码"
                autoComplete="current-password"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-md bg-indigo-600 px-4 py-2 text-white text-sm font-medium shadow hover:bg-indigo-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? '登录中...' : '登录后台'}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-gray-500">
            <p>遇到问题？请联系内部管理员。</p>
            <p className="mt-2">
              <Link href="/" className="text-indigo-600 hover:underline">
                返回首页
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
