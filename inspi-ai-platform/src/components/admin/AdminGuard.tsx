'use client';

import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

type GuardState = 'checking' | 'allowed' | 'denied';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<GuardState>('checking');

  useEffect(() => {
    let cancelled = false;

    const verifySession = async () => {
      try {
        const response = await fetch('/api/admin/session', { cache: 'no-store' });
        const data = await response.json();
        if (cancelled) return;

        if (data.authenticated) {
          setState('allowed');
        } else {
          setState('denied');
          const redirectTarget = `/admin/login?returnUrl=${encodeURIComponent(pathname || '/admin')}`;
          router.replace(redirectTarget);
        }
      } catch (error) {
        if (cancelled) return;
        setState('denied');
        const redirectTarget = `/admin/login?returnUrl=${encodeURIComponent(pathname || '/admin')}`;
        router.replace(redirectTarget);
      }
    };

    verifySession();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (state === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600 text-sm">正在验证管理员身份...</div>
      </div>
    );
  }

  if (state === 'denied') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600 text-sm">正在跳转到登录页面...</div>
      </div>
    );
  }

  return <>{children}</>;
}
