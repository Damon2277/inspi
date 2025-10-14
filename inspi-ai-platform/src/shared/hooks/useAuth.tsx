/**
 * 认证状态管理Hook
 * 提供全局的用户认证状态和相关操作
 */
'use client';

import { useRouter as useNextRouter } from 'next/navigation';
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

import AuthService, {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
  ConfirmResetPasswordRequest,
  ChangePasswordRequest,
  RefreshTokenRequest,
} from '@/core/auth/auth-service';

export interface AuthUser {
  id?: string
  _id: string
  email: string
  name: string
  username?: string
  avatar?: string
  emailVerified: boolean
  emailVerifiedAt?: Date
  subscription?: {
    plan: 'free' | 'pro' | 'super'
    tier?: 'free' | 'basic' | 'premium' | 'enterprise'
    startDate: Date
    endDate?: Date
    isActive: boolean
  }
  usage?: {
    dailyGenerations: number
    dailyReuses: number
    lastResetDate: Date
  }
  settings?: {
    emailNotifications: boolean
    publicProfile: boolean
  }
  roles?: string[]
  permissions?: string[]
  isBlocked?: boolean
  lastLoginAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface AuthState {
  user: AuthUser | null
  loading: boolean
  isLoading: boolean
  isAuthenticated: boolean
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData extends LoginCredentials {
  name: string
  confirmPassword?: string
}

export interface UseAuthReturn extends AuthContextType {}

export type User = AuthUser;

export interface AuthContextType {
  // 状态
  user: AuthUser | null
  loading: boolean
  isLoading: boolean
  isAuthenticated: boolean

  // 认证操作
  login: (data: LoginRequest) => Promise<AuthResponse>
  register: (data: RegisterRequest) => Promise<AuthResponse>
  logout: () => Promise<void>
  refreshToken: () => Promise<boolean>

  // 密码管理
  requestPasswordReset: (data: ResetPasswordRequest) => Promise<AuthResponse>
  confirmPasswordReset: (data: ConfirmResetPasswordRequest) => Promise<AuthResponse>
  changePassword: (data: ChangePasswordRequest) => Promise<AuthResponse>

  // 邮箱验证
  verifyEmail: (token: string) => Promise<AuthResponse>
  resendVerificationEmail: (email: string) => Promise<AuthResponse>

  // 用户信息更新
  updateUser: (userData: Partial<AuthUser>) => void
  updateProfile: (userData: Partial<AuthUser>) => Promise<void>

  // 会话管理
  checkSession: () => Promise<boolean>
  checkAuth: () => Promise<boolean>
}

const fallbackRouter = {
  push: () => {},
  replace: () => {},
  back: () => {},
  forward: () => {},
  refresh: () => {},
  prefetch: () => Promise.resolve(),
};

function useSafeRouter() {
  try {
    return useNextRouter();
  } catch (error) {
    return fallbackRouter;
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Token管理
const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'user_data';

const getStoredToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
};

const getStoredRefreshToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

const getStoredUser = (): AuthUser | null => {
  if (typeof window === 'undefined') return null;
  const userData = localStorage.getItem(USER_KEY);
  return userData ? JSON.parse(userData) : null;
};

const setTokens = (token: string, refreshToken: string) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
};

const setUser = (user: AuthUser) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

const clearAuth = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

/**
 * 认证Provider组件
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useSafeRouter();

  const isAuthenticated = !!user;

  /**
   * 初始化认证状态
   */
  const initializeAuth = useCallback(async () => {
    try {
      const token = getStoredToken();
      const storedUser = getStoredUser();

      if (token && storedUser) {
        // 验证存储的会话
        const isValid = await checkSession();
        if (isValid) {
          setUserState(storedUser);
        } else {
          clearAuth();
        }
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      clearAuth();
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 检查会话有效性
   */
  const checkSession = useCallback(async (): Promise<boolean> => {
    try {
      const token = getStoredToken();
      if (!token) return false;

      const response = await fetch('/api/auth/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setUserState(data.user);
          setUser(data.user);
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Session check error:', error);
      return false;
    }
  }, []);

  /**
   * 用户登录
   */
  const login = useCallback(async (data: LoginRequest): Promise<AuthResponse> => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success && result.user && result.token && result.refreshToken) {
        setTokens(result.token, result.refreshToken);
        setUser(result.user);
        setUserState(result.user);
      }

      return result;
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: '登录失败，请稍后重试',
      };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 用户注册
   */
  const register = useCallback(async (data: RegisterRequest): Promise<AuthResponse> => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success && result.user && result.token && result.refreshToken) {
        setTokens(result.token, result.refreshToken);
        setUser(result.user);
        setUserState(result.user);
      }

      return result;
    } catch (error) {
      console.error('Register error:', error);
      return {
        success: false,
        error: '注册失败，请稍后重试',
      };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 用户登出
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      const token = getStoredToken();
      if (token) {
        // 调用登出API（可选）
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuth();
      setUserState(null);
      router.push('/auth/login');
    }
  }, [router]);

  /**
   * 刷新令牌
   */
  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const refreshTokenValue = getStoredRefreshToken();
      if (!refreshTokenValue) return false;

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: refreshTokenValue }),
      });

      const result = await response.json();

      if (result.success && result.token && result.refreshToken) {
        setTokens(result.token, result.refreshToken);
        if (result.user) {
          setUser(result.user);
          setUserState(result.user);
        }
        return true;
      }

      return false;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  }, []);

  /**
   * 请求密码重置
   */
  const requestPasswordReset = useCallback(async (data: ResetPasswordRequest): Promise<AuthResponse> => {
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      return await response.json();
    } catch (error) {
      console.error('Password reset request error:', error);
      return {
        success: false,
        error: '密码重置请求失败',
      };
    }
  }, []);

  /**
   * 确认密码重置
   */
  const confirmPasswordReset = useCallback(async (data: ConfirmResetPasswordRequest): Promise<AuthResponse> => {
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      return await response.json();
    } catch (error) {
      console.error('Password reset confirmation error:', error);
      return {
        success: false,
        error: '密码重置失败',
      };
    }
  }, []);

  /**
   * 修改密码
   */
  const changePassword = useCallback(async (data: ChangePasswordRequest): Promise<AuthResponse> => {
    try {
      const token = getStoredToken();
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      return await response.json();
    } catch (error) {
      console.error('Change password error:', error);
      return {
        success: false,
        error: '密码修改失败',
      };
    }
  }, []);

  /**
   * 验证邮箱
   */
  const verifyEmail = useCallback(async (token: string): Promise<AuthResponse> => {
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const result = await response.json();

      if (result.success && user) {
        // 更新用户状态
        const updatedUser = { ...user, emailVerified: true };
        setUser(updatedUser);
        setUserState(updatedUser);
      }

      return result;
    } catch (error) {
      console.error('Email verification error:', error);
      return {
        success: false,
        error: '邮箱验证失败',
      };
    }
  }, [user]);

  /**
   * 重新发送验证邮件
   */
  const resendVerificationEmail = useCallback(async (email: string): Promise<AuthResponse> => {
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      return await response.json();
    } catch (error) {
      console.error('Resend verification email error:', error);
      return {
        success: false,
        error: '发送验证邮件失败',
      };
    }
  }, []);

  /**
   * 更新用户信息
   */
  const updateUser = useCallback((userData: Partial<AuthUser>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      setUserState(updatedUser);
    }
  }, [user]);

  const updateProfile = useCallback(async (userData: Partial<AuthUser>) => {
    updateUser(userData);
  }, [updateUser]);

  const checkAuth = useCallback(async (): Promise<boolean> => {
    return checkSession();
  }, [checkSession]);

  // 初始化认证状态
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // 自动刷新令牌
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(async () => {
      const success = await refreshToken();
      if (!success) {
        // 刷新失败，登出用户
        await logout();
      }
    }, 30 * 60 * 1000); // 每30分钟刷新一次

    return () => clearInterval(interval);
  }, [isAuthenticated, refreshToken, logout]);

  const value: AuthContextType = {
    user,
    loading,
    isLoading: loading,
    isAuthenticated,
    login,
    register,
    logout,
    refreshToken,
    requestPasswordReset,
    confirmPasswordReset,
    changePassword,
    verifyEmail,
    resendVerificationEmail,
    updateUser,
    updateProfile,
    checkSession,
    checkAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * 使用认证状态的Hook
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
