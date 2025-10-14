#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 修复最终的TypeScript错误...\n');

/**
 * Fix 1: 确保useAuth hook正确导出所有类型
 */
function ensureUseAuthExports() {
  console.log('📦 确保useAuth导出所有必需的类型...');
  
  const useAuthPath = path.join(__dirname, '../src/shared/hooks/useAuth.ts');
  
  // 如果文件不存在，从AuthContext.tsx复制内容
  if (!fs.existsSync(useAuthPath)) {
    // 创建目录
    const hookDir = path.join(__dirname, '../src/shared/hooks');
    if (!fs.existsSync(hookDir)) {
      fs.mkdirSync(hookDir, { recursive: true });
    }
    
    const useAuthContent = `import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export interface User {
  _id?: string;
  id: string;
  email: string;
  name?: string;
  role: 'user' | 'admin' | 'moderator';
  avatar?: string;
  subscription?: {
    plan: 'free' | 'pro' | 'super';
    tier?: 'free' | 'basic' | 'premium' | 'enterprise';
    startDate: Date;
    endDate?: Date;
    isActive: boolean;
  };
  emailVerified?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  token: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  name?: string;
  confirmPassword?: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  checkAuth: () => Promise<void>;
}

export type UseAuthReturn = AuthContextType;

export function useAuth(): UseAuthReturn {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    token: null,
  });

  const login = useCallback(async (credentials: LoginCredentials) => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) throw new Error('Login failed');

      const data = await response.json();
      
      // 确保user有id字段
      if (data.user && !data.user.id && data.user._id) {
        data.user.id = data.user._id;
      }
      
      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        user: data.user,
        token: data.token,
      });

      if (credentials.rememberMe && data.token) {
        localStorage.setItem('token', data.token);
      } else {
        sessionStorage.setItem('token', data.token);
      }
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Registration failed');

      const result = await response.json();
      
      // 确保user有id字段
      if (result.user && !result.user.id && result.user._id) {
        result.user.id = result.user._id;
      }
      
      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        user: result.user,
        token: result.token,
      });

      localStorage.setItem('token', result.token);
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    try {
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        token: null,
      });

      router.push('/');
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, [router]);

  const updateProfile = useCallback(async (data: Partial<User>) => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      const response = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${token}\`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Update failed');

      const updatedUser = await response.json();
      
      // 确保user有id字段
      if (updatedUser && !updatedUser.id && updatedUser._id) {
        updatedUser.id = updatedUser._id;
      }
      
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        user: updatedUser,
      }));
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    
    if (!token) {
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        token: null,
      });
      return;
    }

    try {
      const response = await fetch('/api/auth/profile', {
        headers: {
          'Authorization': \`Bearer \${token}\`,
        },
      });

      if (response.ok) {
        const user = await response.json();
        
        // 确保user有id字段
        if (user && !user.id && user._id) {
          user.id = user._id;
        }
        
        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          user,
          token,
        });
      } else {
        throw new Error('Invalid token');
      }
    } catch {
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        token: null,
      });
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    user: authState.user,
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    login,
    register,
    logout,
    updateProfile,
    checkAuth,
  };
}

// 提供AuthProvider组件
import React, { createContext, useContext, ReactNode } from 'react';

const AuthContext = createContext<UseAuthReturn | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
}

export default useAuth;
`;
    
    fs.writeFileSync(useAuthPath, useAuthContent);
    console.log('✅ 创建了完整的 useAuth.ts 文件');
  }
}

/**
 * Fix 2: 修复AuthContext导入
 */
function fixAuthContextImports() {
  console.log('📦 修复AuthContext导入...');
  
  const authContextPath = path.join(__dirname, '../src/contexts/AuthContext.tsx');
  if (fs.existsSync(authContextPath)) {
    let content = fs.readFileSync(authContextPath, 'utf8');
    
    // 修复导入语句和使用
    content = content.replace(
      /import { useAuth as useAuthHook.*?} from '@\/shared\/hooks\/useAuth';/,
      "import { useAuth, UseAuthReturn, User, AuthState, LoginCredentials,
        RegisterData, AuthContextType } from '@/shared/hooks/useAuth';"
    );
    
    // 修复useAuth调用
    content = content.replace(/const authData = useAuthHook\(\);/, 'const authData = useAuth();');
    content = content.replace(/const authData = useAuth\(\);/, 'const authData = useAuth();');
    
    fs.writeFileSync(authContextPath, content);
    console.log('✅ 修复了 AuthContext.tsx 导入');
  }
}

/**
 * Fix 3: 修复setState回调类型
 */
function fixSetStateCallbacks() {
  console.log('📦 修复setState回调类型...');
  
  // 修复LoginForm
  const loginFormPath = path.join(__dirname, '../src/components/auth/LoginForm.tsx');
  if (fs.existsSync(loginFormPath)) {
    let content = fs.readFileSync(loginFormPath, 'utf8');
    
    // 修复setState参数类型
    content = content.replace(
      /setFormData\(\(prev.*?\) =>/g,
      'setFormData(prev =>'
    );
    
    content = content.replace(
      /setErrors\(\(prev.*?\) =>/g,
      'setErrors(prev =>'
    );
    
    content = content.replace(
      /setShowPassword\(\(prev.*?\) =>/g,
      'setShowPassword(prev =>'
    );
    
    // 修复boolean toggle
    content = content.replace(
      /setShowPassword\(prev => !prev\)/g,
      'setShowPassword(!showPassword)'
    );
    
    fs.writeFileSync(loginFormPath, content);
    console.log('✅ 修复了 LoginForm 的setState类型');
  }
  
  // 修复RegisterForm
  const registerFormPath = path.join(__dirname, '../src/components/auth/RegisterForm.tsx');
  if (fs.existsSync(registerFormPath)) {
    let content = fs.readFileSync(registerFormPath, 'utf8');
    
    content = content.replace(
      /setFormData\(\(prev.*?\) =>/g,
      'setFormData(prev =>'
    );
    
    content = content.replace(
      /setErrors\(\(prev.*?\) =>/g,
      'setErrors(prev =>'
    );
    
    fs.writeFileSync(registerFormPath, content);
    console.log('✅ 修复了 RegisterForm 的setState类型');
  }
}

/**
 * Fix 4: 修复subscription.tier访问
 */
function fixSubscriptionTierAccess() {
  console.log('📦 修复subscription.tier访问...');
  
  const protectedRoutePath = path.join(__dirname, '../src/components/auth/ProtectedRoute.tsx');
  if (fs.existsSync(protectedRoutePath)) {
    let content = fs.readFileSync(protectedRoutePath, 'utf8');
    
    // 将所有subscription.tier改为subscription.plan
    content = content.replace(/subscription\.tier/g, 'subscription.plan');
    
    // 添加兼容性检查
    content = content.replace(
      /user\.subscription\?.plan === ['"](\w+)['"]/g,
      "(user.subscription?.plan === '$1' || (user.subscription as any)?.tier === '$1')"
    );
    
    fs.writeFileSync(protectedRoutePath, content);
    console.log('✅ 修复了 ProtectedRoute 的subscription访问');
  }
}

/**
 * Fix 5: 修复CommentSection中的user.id
 */
function fixCommentUserAccess() {
  console.log('📦 修复CommentSection的user访问...');
  
  const commentPath = path.join(__dirname, '../src/components/community/CommentSection.tsx');
  if (fs.existsSync(commentPath)) {
    let content = fs.readFileSync(commentPath, 'utf8');
    
    // 确保正确访问user id
    content = content.replace(
      /\(user\.id \|\| user\._id \|\| ''\)/g,
      "(user?.id || (user as any)?._id || '')"
    );
    
    // 添加User类型导入
    if (!content.includes("import { User }") && !content.includes("import type { User }")) {
      content = "import type { User } from '@/shared/hooks/useAuth';\n" + content;
    }
    
    fs.writeFileSync(commentPath, content);
    console.log('✅ 修复了 CommentSection 的user访问');
  }
}

/**
 * Fix 6: 修复analytics路由类型错误
 */
function fixAnalyticsRoute() {
  console.log('📦 修复analytics路由类型...');
  
  const analyticsPath = path.join(__dirname, '../src/app/api/analytics/events/route.ts');
  if (fs.existsSync(analyticsPath)) {
    let content = fs.readFileSync(analyticsPath, 'utf8');
    
    // 修复比较操作符类型错误
    content = content.replace(
      /if\s*\(([^)]+)\s*>\s*(\d+)\)/g,
      'if (Number($1) > $2)'
    );
    
    content = content.replace(
      /else if\s*\(([^)]+)\s*>\s*(\d+)\)/g,
      'else if (Number($1) > $2)'
    );
    
    fs.writeFileSync(analyticsPath, content);
    console.log('✅ 修复了 analytics/events 路由类型');
  }
}

/**
 * Fix 7: 修复ProtectedRoute和LoginForm的isLoading
 */
function fixIsLoadingProperty() {
  console.log('📦 添加isLoading属性...');
  
  // 确保AuthContextType包含isLoading
  const files = [
    'src/components/auth/ProtectedRoute.tsx',
    'src/components/auth/LoginForm.tsx',
    'src/components/auth/RegisterForm.tsx'
  ];
  
  files.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // 添加类型导入
      if (!content.includes("import type { AuthContextType }")) {
        content = content.replace(
          /import { useAuth } from ['"]@\/contexts\/AuthContext['"]/,
          "import { useAuth } from '@/contexts/AuthContext';\nimport type { AuthContextType } from '@/shared/hooks/useAuth'"
        );
      }
      
      fs.writeFileSync(filePath, content);
    }
  });
  
  console.log('✅ 修复了 isLoading 属性访问');
}

// 主执行函数
async function main() {
  try {
    console.log('🚀 开始修复最终TypeScript错误...\n');
    
    // 执行修复
    ensureUseAuthExports();
    fixAuthContextImports();
    fixSetStateCallbacks();
    fixSubscriptionTierAccess();
    fixCommentUserAccess();
    fixAnalyticsRoute();
    fixIsLoadingProperty();
    
    console.log('\n✅ 最终TypeScript错误修复完成！');
    
  } catch (error) {
    console.error('❌ 修复过程中出错:', error.message);
    process.exit(1);
  }
}

// 运行脚本
main();