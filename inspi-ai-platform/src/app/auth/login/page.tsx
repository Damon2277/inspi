import type { Metadata } from 'next';
import Link from 'next/link';

import { AuthProviders } from '@/components/auth/AuthProviders';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata: Metadata = {
  title: '登录 Inspi.AI',
  description: '登录 Inspi.AI，继续释放 AI 教学创意，管理您的课堂灵感。',
};

const DEFAULT_REDIRECT = '/';

function resolveRedirect(returnUrl?: string): string {
  if (!returnUrl) return DEFAULT_REDIRECT;
  if (returnUrl.startsWith('/') && !returnUrl.startsWith('//')) {
    return returnUrl;
  }
  return DEFAULT_REDIRECT;
}

interface LoginPageProps {
  searchParams?: Promise<{ returnUrl?: string }> | { returnUrl?: string };
}

export default async function LoginPage(props: LoginPageProps) {
  const resolvedParams = props.searchParams instanceof Promise
    ? await props.searchParams
    : props.searchParams;

  const redirectTo = resolveRedirect(resolvedParams?.returnUrl);

  return (
    <div className="login-page">
      <div className="login-page__overlay" aria-hidden="true" />

      <div className="login-page__modal">
        <Link href="/" className="login-page__home">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          返回首页
        </Link>

        <AuthProviders>
          <LoginForm redirectTo={redirectTo} />
        </AuthProviders>

        <footer className="login-page__footer">
          Inspi.AI © {new Date().getFullYear()} · 让 AI 成为您教学创意的放大器
        </footer>
      </div>
    </div>
  );
}
