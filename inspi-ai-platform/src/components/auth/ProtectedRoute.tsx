/**
 * 受保护路由组件
 * 用于需要认证的页面和组件
 */
'use client';

import { useRouter } from 'next/navigation';
import React, { useEffect } from 'react';

import { useAuth } from '@/shared/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAuth?: boolean
  requireEmailVerification?: boolean
  requiredSubscription?: 'free' | 'pro' | 'super'
  requiredRoles?: string[]
  fallback?: React.ReactNode
  redirectTo?: string
  className?: string
}

export function ProtectedRoute({
  children,
  requireAuth = true,
  requireEmailVerification = false,
  requiredSubscription,
  requiredRoles = [],
  fallback,
  redirectTo = '/auth/login',
  className = '',
}: ProtectedRouteProps) {
  const router = useRouter();  // @ts-ignore
  const auth = useAuth();
  const { user, isAuthenticated } = auth;
  const isLoading = (auth as any).isLoading;

  useEffect(() => {
    if (isLoading) return;

    // 检查认证要求
    if (requireAuth && !isAuthenticated) {
      router.push(redirectTo);
      return;
    }

    // 检查邮箱验证要求
    if (requireEmailVerification && user && !user.emailVerified) {
      router.push('/auth/verify-email');
      return;
    }

    // 检查订阅要求
  // @ts-ignore
    if (requiredSubscription && user) {
      const userSubscription = user.subscription?.plan || 'free';
      const subscriptionLevels = ['free', 'pro', 'super'];
      const userLevel = subscriptionLevels.indexOf(userSubscription);
      const requiredLevel = subscriptionLevels.indexOf(requiredSubscription);

      if (userLevel < requiredLevel) {
        router.push('/subscription/upgrade');
        return;
      }
    }

    // 检查角色要求
    if (requiredRoles.length > 0 && user) {
      // TODO: 实现角色系统
      const hasRequiredRole = true; // 暂时允许所有用户

      if (!hasRequiredRole) {
        router.push('/unauthorized');

      }
    }
  }, [
    isLoading,
    isAuthenticated,
    user,
    requireAuth,
    requireEmailVerification,
    requiredSubscription,
    requiredRoles,
    router,
    redirectTo,
  ]);

  // 显示加载状态
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${className}`}>
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">验证用户身份...</p>
        </div>
      </div>
    );
  }

  // 检查认证状态
  if (requireAuth && !isAuthenticated) {
    return fallback || (
      <div className={`flex items-center justify-center min-h-screen ${className}`}>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">需要登录</h2>
          <p className="text-gray-600 mb-6">请登录后访问此页面</p>
          <button
            onClick={() => router.push(redirectTo)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            前往登录
          </button>
        </div>
      </div>
    );
  }

  // 检查邮箱验证状态
  if (requireEmailVerification && user && !user.emailVerified) {
    return fallback || (
      <div className={`flex items-center justify-center min-h-screen ${className}`}>
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">需要验证邮箱</h2>
          <p className="text-gray-600 mb-6">
            请先验证您的邮箱地址才能访问此功能
          </p>
          <button
            onClick={() => router.push('/auth/verify-email')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            前往验证
          </button>
        </div>
      </div>
    );
  }

  // 检查订阅状态
  // @ts-ignore
  if (requiredSubscription && user) {
    const userSubscription = user.subscription?.plan || 'free';
    const subscriptionLevels = ['free', 'pro', 'super'];
    const userLevel = subscriptionLevels.indexOf(userSubscription);
    const requiredLevel = subscriptionLevels.indexOf(requiredSubscription);

    if (userLevel < requiredLevel) {
      return fallback || (
        <div className={`flex items-center justify-center min-h-screen ${className}`}>
          <div className="text-center max-w-md mx-auto p-6">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">需要升级订阅</h2>
            <p className="text-gray-600 mb-6">
              此功能需要 {requiredSubscription.toUpperCase()} 订阅，您当前是 {userSubscription.toUpperCase()} 用户
            </p>
            <button
              onClick={() => router.push('/subscription/upgrade')}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              升级订阅
            </button>
          </div>
        </div>
      );
    }
  }

  // 检查角色权限
  if (requiredRoles.length > 0 && user) {
    // TODO: 实现角色系统
    const hasRequiredRole = true; // 暂时允许所有用户

    if (!hasRequiredRole) {
      return fallback || (
        <div className={`flex items-center justify-center min-h-screen ${className}`}>
          <div className="text-center max-w-md mx-auto p-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">权限不足</h2>
            <p className="text-gray-600 mb-6">
              您没有访问此页面的权限
            </p>
            <button
              onClick={() => router.back()}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              返回上页
            </button>
          </div>
        </div>
      );
    }
  }

  // 所有检查通过，渲染子组件
  return <div className={className}>{children}</div>;
}

/**
 * 权限检查Hook
 */
export function usePermissions() {
  const { user, isAuthenticated } = useAuth();

  const hasPermission = (permission: string): boolean => {
    if (!isAuthenticated || !user) return false;

    // TODO: 实现权限系统
    return true; // 暂时允许所有权限
  };

  const hasRole = (role: string): boolean => {
    if (!isAuthenticated || !user) return false;

    // TODO: 实现角色系统
    return true; // 暂时允许所有角色
  };

  const hasSubscription = (level: 'free' | 'pro' | 'super'): boolean => {
    if (!isAuthenticated || !user) return false;
  // @ts-ignore

    const userSubscription = user.subscription?.plan || 'free';
    const subscriptionLevels = ['free', 'pro', 'super'];
    const userLevel = subscriptionLevels.indexOf(userSubscription);
    const requiredLevel = subscriptionLevels.indexOf(level);

    return userLevel >= requiredLevel;
  };

  const isEmailVerified = (): boolean => {
    if (!isAuthenticated || !user) return false;
    return user.emailVerified || false;
  };

  return {
    hasPermission,
    hasRole,
    hasSubscription,
    isEmailVerified,
    user,
    isAuthenticated,
  };
}

export default ProtectedRoute;
