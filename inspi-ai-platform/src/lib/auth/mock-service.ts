/**
 * Mock认证服务 - 用于开发环境，不依赖数据库
 * 遵循"先让它工作，再让它完美"原则
 */

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user?: any;
  token?: string;
  refreshToken?: string;
  error?: string;
}

// 内存中的用户存储（仅用于开发）
const mockUsers = new Map<string, any>();

// 预设一些测试用户
mockUsers.set('test@example.com', {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  password: 'test123', // 在真实环境中应该是哈希值
  subscription: {
    plan: 'free',
    startDate: new Date(),
    isActive: true,
  },
  usage: {
    dailyGenerations: 0,
    dailyReuses: 0,
    lastResetDate: new Date(),
  },
  settings: {
    emailNotifications: true,
    publicProfile: false,
  },
});

mockUsers.set('admin@example.com', {
  id: 'user-2',
  email: 'admin@example.com',
  name: 'Admin User',
  password: 'admin123',
  subscription: {
    plan: 'pro',
    startDate: new Date(),
    isActive: true,
  },
  usage: {
    dailyGenerations: 5,
    dailyReuses: 2,
    lastResetDate: new Date(),
  },
  settings: {
    emailNotifications: true,
    publicProfile: true,
  },
});

/**
 * 生成简单的JWT token (mock版本)
 */
function generateMockToken(user: any): string {
  const payload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // 24小时过期
  };
  
  // 在真实环境中应该使用真正的JWT签名
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

/**
 * 验证密码（简化版本）
 */
function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!password) {
    errors.push('Password is required');
  } else if (password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * 验证邮箱格式
 */
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Mock用户注册
 */
export async function registerUser(data: RegisterData): Promise<AuthResponse> {
  try {
    console.log('🔧 Using mock registration service');
    
    // 验证输入
    if (!data.email || !data.password || !data.name) {
      return {
        success: false,
        error: 'Email, password, and name are required',
      };
    }

    // 验证邮箱格式
    if (!validateEmail(data.email)) {
      return {
        success: false,
        error: 'Invalid email format',
      };
    }

    // 验证密码强度
    const passwordValidation = validatePassword(data.password);
    if (!passwordValidation.isValid) {
      return {
        success: false,
        error: passwordValidation.errors.join(', '),
      };
    }

    // 检查用户是否已存在
    if (mockUsers.has(data.email.toLowerCase())) {
      return {
        success: false,
        error: 'User with this email already exists',
      };
    }

    // 创建新用户
    const newUser = {
      id: `user-${Date.now()}`,
      email: data.email.toLowerCase(),
      name: data.name.trim(),
      password: data.password, // 在真实环境中应该哈希
      subscription: {
        plan: 'free',
        startDate: new Date(),
        isActive: true,
      },
      usage: {
        dailyGenerations: 0,
        dailyReuses: 0,
        lastResetDate: new Date(),
      },
      settings: {
        emailNotifications: true,
        publicProfile: false,
      },
      createdAt: new Date(),
    };

    // 保存到内存
    mockUsers.set(data.email.toLowerCase(), newUser);

    // 生成token
    const token = generateMockToken(newUser);
    const refreshToken = generateMockToken(newUser); // 简化版本

    // 返回用户信息（不包含密码）
    const userResponse = { ...newUser };
    delete userResponse.password;

    console.log('✅ Mock user registered successfully:', userResponse.email);

    return {
      success: true,
      user: userResponse,
      token,
      refreshToken,
    };
  } catch (error) {
    console.error('Mock registration error:', error);
    return {
      success: false,
      error: 'Registration failed. Please try again.',
    };
  }
}

/**
 * Mock用户登录
 * 如果用户不存在，则自动注册
 */
export async function loginUser(data: LoginData): Promise<AuthResponse> {
  try {
    console.log('🔧 Using mock login service');
    
    // 验证输入
    if (!data.email || !data.password) {
      return {
        success: false,
        error: 'Email and password are required',
      };
    }

    // 查找用户
    const user = mockUsers.get(data.email.toLowerCase());
    if (!user) {
      // 用户不存在，自动注册
      console.log('👤 User not found, auto-registering:', data.email);
      
      // 创建新用户（使用邮箱作为默认名称）
      const registerData: RegisterData = {
        email: data.email,
        password: data.password,
        name: data.email.split('@')[0] // 使用邮箱前缀作为默认名称
      };
      
      // 调用注册函数
      return registerUser(registerData);
    }

    // 验证密码（简化版本）
    if (user.password !== data.password) {
      return {
        success: false,
        error: 'Invalid email or password',
      };
    }

    // 生成token
    const token = generateMockToken(user);
    const refreshToken = generateMockToken(user);

    // 返回用户信息（不包含密码）
    const userResponse = { ...user };
    delete userResponse.password;

    console.log('✅ Mock user logged in successfully:', userResponse.email);

    return {
      success: true,
      user: userResponse,
      token,
      refreshToken,
    };
  }
  } catch (error) {
    console.error('Mock login error:', error);
    return {
      success: false,
      error: 'Login failed. Please try again.',
    };
  }
}

/**
 * 获取用户资料
 */
export async function getUserProfile(userId: string): Promise<{
  success: boolean;
  user?: any;
  error?: string;
}> {
  try {
    // 在mock版本中，通过ID查找用户
    for (const user of mockUsers.values()) {
      if (user.id === userId) {
        const userResponse = { ...user };
        delete userResponse.password;
        return {
          success: true,
          user: userResponse,
        };
      }
    }

    return {
      success: false,
      error: 'User not found',
    };
  } catch (error) {
    console.error('Mock get profile error:', error);
    return {
      success: false,
      error: 'Failed to get user profile',
    };
  }
}

export default {
  registerUser,
  loginUser,
  getUserProfile,
};