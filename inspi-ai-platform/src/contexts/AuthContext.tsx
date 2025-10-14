'use client';

import React, { createContext, useContext, ReactNode } from 'react';

import { useAuth, UseAuthReturn, User, AuthState, LoginCredentials, RegisterData, AuthContextType } from '@/shared/hooks/useAuth';

const AuthContext = createContext<UseAuthReturn | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const auth = useAuth();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): UseAuthReturn {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

// 导出类型供其他组件使用
export type { User, AuthState, LoginCredentials, RegisterData } from '@/shared/hooks/useAuth';
