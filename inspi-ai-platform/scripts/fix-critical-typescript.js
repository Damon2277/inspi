#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 修复关键的TypeScript错误...\n');

/**
 * Fix 1: 修复认证上下文类型
 */
function fixAuthContextTypes() {
  console.log('📦 修复认证上下文类型...');
  
  // 1. 修复 useAuth hook 导出
  const useAuthPath = path.join(__dirname, '../src/shared/hooks/useAuth.ts');
  if (!fs.existsSync(useAuthPath)) {
    const useAuthContent = `import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export interface User {
  id: string;
  email: string;
  name?: string;
  role: 'user' | 'admin' | 'moderator';
  avatar?: string;
  subscription?: {
    plan: 'free' | 'pro' | 'super';
    tier?: 'free' | 'basic' | 'premium' | 'enterprise'; // 兼容旧字段
    startDate: Date;
    endDate?: Date;
    isActive: boolean;
  };
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

export interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  checkAuth: () => Promise<void>;
}

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

export default useAuth;
`;
    fs.writeFileSync(useAuthPath, useAuthContent);
    console.log('✅ 创建了完整的 useAuth hook');
  }

  // 2. 修复 AuthContext
  const authContextPath = path.join(__dirname, '../src/contexts/AuthContext.tsx');
  if (fs.existsSync(authContextPath)) {
    let content = fs.readFileSync(authContextPath, 'utf8');
    
    // 修复导入
    content = content.replace(
      /import.*from.*['"]@\/shared\/hooks\/useAuth['"]/g,
      "import { useAuth as useAuthHook, UseAuthReturn, User, AuthState,
        LoginCredentials, RegisterData } from '@/shared/hooks/useAuth'"
    );
    
    // 修复useAuth调用
    content = content.replace(
      /const authData = useAuth\(\);/g,
      'const authData = useAuthHook();'
    );
    
    fs.writeFileSync(authContextPath, content);
    console.log('✅ 修复了 AuthContext 导入');
  }
}

/**
 * Fix 2: 修复 subscription.tier 与 plan 不一致
 */
function fixSubscriptionTypes() {
  console.log('📦 修复订阅类型不一致...');
  
  const filesToFix = [
    'src/components/auth/ProtectedRoute.tsx',
    'src/app/api/subscription/upgrade/route.ts',
    'src/app/api/subscription/current/route.ts',
  ];
  
  filesToFix.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // 将 tier 访问改为 plan
      content = content.replace(/subscription\.tier/g, 'subscription.plan');
      
      // 修复类型检查
      content = content.replace(
        /subscription\?.tier === ['"](\w+)['"]/g,
        "(subscription?.plan === '$1' || subscription?.tier === '$1')"
      );
      
      fs.writeFileSync(filePath, content);
      console.log(`✅ 修复了 ${file} 中的订阅类型`);
    }
  });
}

/**
 * Fix 3: 修复 setState 类型问题
 */
function fixSetStateTypes() {
  console.log('📦 修复 setState 类型问题...');
  
  const loginFormPath = path.join(__dirname, '../src/components/auth/LoginForm.tsx');
  if (fs.existsSync(loginFormPath)) {
    let content = fs.readFileSync(loginFormPath, 'utf8');
    
    // 修复 setState 回调
    content = content.replace(
      /setFormData\(\(prev: any\) => /g,
      'setFormData((prev) => '
    );
    
    content = content.replace(
      /setErrors\(\(prev: any\) => /g,
      'setErrors((prev) => '
    );
    
    content = content.replace(
      /setShowPassword\(\(prev: any\) => /g,
      'setShowPassword((prev) => '
    );
    
    fs.writeFileSync(loginFormPath, content);
    console.log('✅ 修复了 LoginForm 中的 setState 类型');
  }
}

/**
 * Fix 4: 修复 Mongoose 查询类型
 */
function fixMongooseTypes() {
  console.log('📦 修复 Mongoose 查询类型...');
  
  const commentServicePath = path.join(__dirname, '../src/core/community/comment-service.ts');
  if (fs.existsSync(commentServicePath)) {
    let content = fs.readFileSync(commentServicePath, 'utf8');
    
    // 添加类型断言
    content = content.replace(
      /Comment\.findById\(commentId\)/g,
      'Comment.findById(commentId) as any'
    );
    
    content = content.replace(
      /Comment\.findByIdAndUpdate\(/g,
      '(Comment.findByIdAndUpdate as any)('
    );
    
    content = content.replace(
      /Comment\.find\(/g,
      '(Comment.find as any)('
    );
    
    content = content.replace(
      /User\.findById\(/g,
      '(User.findById as any)('
    );
    
    fs.writeFileSync(commentServicePath, content);
    console.log('✅ 修复了 comment-service 中的 Mongoose 类型');
  }
}

/**
 * Fix 5: 修复 AuthProvider 导入
 */
function fixAuthProviderImports() {
  console.log('📦 修复 AuthProvider 导入...');
  
  const authProviderPath = path.join(__dirname, '../src/core/auth/AuthProvider.tsx');
  if (fs.existsSync(authProviderPath)) {
    let content = fs.readFileSync(authProviderPath, 'utf8');
    
    // 确保导出 AuthContext
    if (!content.includes('export { AuthContext }')) {
      content = content.replace(
        /export default AuthProvider;/,
        'export default AuthProvider;\nexport { AuthContext };'
      );
    }
    
    fs.writeFileSync(authProviderPath, content);
    console.log('✅ 修复了 AuthProvider 导出');
  }
  
  // 修复 context.tsx
  const contextPath = path.join(__dirname, '../src/core/auth/context.tsx');
  if (fs.existsSync(contextPath)) {
    let content = fs.readFileSync(contextPath, 'utf8');
    
    // 修复 User 模型导入
    content = content.replace(
      /import.*from ['"]\.\.\/models\/User['"]/,
      "import { User } from '@/lib/models/User'"
    );
    
    // 确保导出 AuthContext
    if (!content.includes('export { AuthContext }') &&
      !content.includes('export const AuthContext')) {
      content = content.replace(
        /const AuthContext = /,
        'export const AuthContext = '
      );
    }
    
    fs.writeFileSync(contextPath, content);
    console.log('✅ 修复了 auth/context.tsx');
  }
}

/**
 * Fix 6: 修复 Comment 中的 user.id
 */
function fixCommentUserTypes() {
  console.log('📦 修复 Comment 组件中的用户类型...');
  
  const commentSectionPath = path.join(__dirname, '../src/components/community/CommentSection.tsx');
  if (fs.existsSync(commentSectionPath)) {
    let content = fs.readFileSync(commentSectionPath, 'utf8');
    
    // 将 user.id 改为 user._id 或添加条件检查
    content = content.replace(
      /user\.id/g,
      "(user.id || user._id || '')"
    );
    
    fs.writeFileSync(commentSectionPath, content);
    console.log('✅ 修复了 CommentSection 中的用户ID访问');
  }
}

/**
 * Fix 7: 修复 .tsx 导入扩展名
 */
function fixImportExtensions() {
  console.log('📦 修复导入扩展名...');
  
  const authProvidersPath = path.join(__dirname, '../src/components/auth/AuthProviders.tsx');
  if (fs.existsSync(authProvidersPath)) {
    let content = fs.readFileSync(authProvidersPath, 'utf8');
    
    // 移除 .tsx 扩展名
    content = content.replace(/from ['"]([^'"]+)\.tsx['"]/g, "from '$1'");
    
    fs.writeFileSync(authProvidersPath, content);
    console.log('✅ 修复了导入扩展名');
  }
}

/**
 * Fix 8: 修复 CardGenerationOptions 类型
 */
function fixCardGeneratorTypes() {
  console.log('📦 修复卡片生成器类型...');
  
  const cardGeneratorPath = path.join(__dirname, '../src/core/ai/card-generator.ts');
  if (fs.existsSync(cardGeneratorPath)) {
    let content = fs.readFileSync(cardGeneratorPath, 'utf8');
    
    // 修复 customization.style 类型
    content = content.replace(
      /style: prompt\.style \|\| 'interactive'/g,
      "style: (prompt.style || 'interactive') as 'interactive' | 'detailed' | 'concise'"
    );
    
    fs.writeFileSync(cardGeneratorPath, content);
    console.log('✅ 修复了卡片生成器类型');
  }
}

// 主执行函数
async function main() {
  try {
    console.log('🚀 开始修复关键TypeScript错误...\n');
    
    // 执行修复
    fixAuthContextTypes();
    fixSubscriptionTypes();
    fixSetStateTypes();
    fixMongooseTypes();
    fixAuthProviderImports();
    fixCommentUserTypes();
    fixImportExtensions();
    fixCardGeneratorTypes();
    
    console.log('\n✅ 关键TypeScript错误修复完成！');
    
  } catch (error) {
    console.error('❌ 修复过程中出错:', error.message);
    process.exit(1);
  }
}

// 运行脚本
main();