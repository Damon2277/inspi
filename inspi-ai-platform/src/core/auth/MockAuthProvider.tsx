'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const MockAuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 模拟检查本地存储的认证状态
    const checkAuth = () => {
      const savedUser = localStorage.getItem('mockUser');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      } else {
        // 自动登录演示用户
        const mockUser: User = {
          id: 'user-1',
          name: '张老师',
          email: 'teacher@example.com',
          avatar: undefined,
        };
        setUser(mockUser);
        localStorage.setItem('mockUser', JSON.stringify(mockUser));
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    // 模拟登录逻辑
    setLoading(true);

    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 创建模拟用户
    const mockUser: User = {
      id: 'user-1',
      name: '张老师',
      email: email,
      avatar: undefined,
    };

    setUser(mockUser);
    localStorage.setItem('mockUser', JSON.stringify(mockUser));
    setLoading(false);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('mockUser');
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    login,
    logout,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
