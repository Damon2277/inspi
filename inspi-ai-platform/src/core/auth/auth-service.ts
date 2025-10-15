/**
 * 认证服务核心实现
 * 提供用户注册、登录、登出、密码管理等功能
 */
import crypto from 'crypto';

import bcrypt from 'bcryptjs';

import { sendEmail } from '@/lib/email/email-service';
import ContributionLog from '@/lib/models/ContributionLog';
import User, { UserDocument } from '@/lib/models/User';
import connectDB from '@/lib/mongodb';

import { generateToken, generateRefreshToken, verifyToken, verifyRefreshToken } from './jwt';


export interface AuthResponse {
  success: boolean
  user?: Omit<UserDocument, 'password'>
  token?: string
  refreshToken?: string
  error?: string
  message?: string
}

export interface LoginRequest {
  email: string
  password: string
  rememberMe?: boolean
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
  confirmPassword: string
}

export interface ResetPasswordRequest {
  email: string
}

export interface ConfirmResetPasswordRequest {
  token: string
  newPassword: string
  confirmPassword: string
}

export interface ChangePasswordRequest {
  userId: string
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export interface RefreshTokenRequest {
  refreshToken: string
}

/**
 * 认证服务类
 */
export class AuthService {
  /**
   * 用户注册
   */
  static async register(data: RegisterRequest): Promise<AuthResponse> {
    try {
      // Demo mode support
      const demoLoginDisabled = process.env.DEMO_LOGIN_ENABLED === 'false';
      if (!demoLoginDisabled && process.env.NODE_ENV === 'development') {
        // In demo mode, simulate successful registration
        console.log('Demo mode: Simulating successful registration for', data.email);
        return {
          success: true,
          user: {
            _id: 'demo-user-id',
            email: data.email,
            name: data.name,
            emailVerified: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as any,
          token: 'demo-token',
          refreshToken: 'demo-refresh-token',
          message: '注册成功！您可以使用 demo@example.com / demopass 登录',
        };
      }

      await connectDB();

      // 验证输入
      if (data.password !== data.confirmPassword) {
        return {
          success: false,
          error: '两次输入的密码不一致',
        };
      }

      if (data.password.length < 6) {
        return {
          success: false,
          error: '密码长度至少6位',
        };
      }

      // 检查邮箱是否已存在
      const existingUser = await (User.findOne as any)({ email: data.email.toLowerCase() });
      if (existingUser) {
        return {
          success: false,
          error: '该邮箱已被注册',
        };
      }

      // 创建用户
      const hashedPassword = await bcrypt.hash(data.password, 12);
      const emailVerificationToken = crypto.randomBytes(32).toString('hex');
      const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const user = new User({
        email: data.email.toLowerCase(),
        password: hashedPassword,
        name: data.name,
        emailVerificationToken,
        emailVerificationExpires,
        subscription: {
          plan: 'free',
          status: 'active',
          startDate: new Date(),
          features: {
            aiGenerations: { limit: 10, used: 0 },
            knowledgeGraphs: { limit: 3, used: 0 },
            collaborators: { limit: 1, used: 0 },
          },
        },
      });

      await user.save();

      // 发送验证邮件
      await this.sendVerificationEmail(user.email, user.name ?? '用户', emailVerificationToken);

      // 记录注册贡献
      await (ContributionLog.create as any)({
        user: user._id,
        action: 'register',
        target: {
          type: 'user',
          id: user._id.toString(),
          title: 'User Registration',
        },
        points: 10,
        metadata: {
          description: 'User registered successfully',
          category: 'account',
        },
      });

      return {
        success: true,
        message: '注册成功，请查收验证邮件',
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: '注册失败，请稍后重试',
      };
    }
  }

  /**
   * 用户登录
   */
  static async login(data: LoginRequest): Promise<AuthResponse> {
    const demoEmail = process.env.DEMO_LOGIN_EMAIL || 'demo@example.com';
    const demoPassword = process.env.DEMO_LOGIN_PASSWORD || 'demopass';
    const demoLoginDisabled = process.env.DEMO_LOGIN_ENABLED === 'false';

    if (!demoLoginDisabled) {
      if (data.email === demoEmail && data.password === demoPassword) {
        return {
          success: true,
          user: {
            _id: 'demo-user-id',
            email: demoEmail,
            name: '体验用户',
            emailVerified: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as any,
          token: 'demo-token',
          refreshToken: 'demo-refresh-token',
          message: '登录成功',
        };
      }

      return {
        success: false,
        error: '邮箱或密码错误',
      };
    }

    try {
      await connectDB();

      // 查找用户
      const userQuery = (User as any).findOne({ email: data.email.toLowerCase() }).select('+password');
      const user = (await userQuery) as (UserDocument & {
        password: string
        isBlocked?: boolean
        lastLoginAt?: Date
        toObject: () => any
        save: () => Promise<any>
      }) | null;
      if (!user) {
        return {
          success: false,
          error: '邮箱或密码错误',
        };
      }

      // 验证密码
      const isPasswordValid = await bcrypt.compare(data.password, user.password);
      if (!isPasswordValid) {
        return {
          success: false,
          error: '邮箱或密码错误',
        };
      }

      // 检查账户状态
      if (user.isBlocked) {
        return {
          success: false,
          error: '账户已被封禁',
        };
      }

      // 生成令牌
      const tokenExpiry = data.rememberMe ? '30d' : '7d';
      const token = generateToken(
        {
          userId: user._id.toString(),
          email: user.email,
          name: user.name,
        },
        tokenExpiry,
      );
      const refreshToken = generateRefreshToken({
        userId: user._id.toString(),
        email: user.email,
      });

      // 更新最后登录时间
      user.lastLoginAt = new Date();
      await user.save();

      // 移除密码字段
      const userWithoutPassword = user.toObject() as unknown as Omit<UserDocument, 'password'> & Record<string, any>;
      delete userWithoutPassword.password;

      return {
        success: true,
        user: userWithoutPassword,
        token,
        refreshToken,
        message: '登录成功',
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: '登录失败，请稍后重试',
      };
    }
  }

  /**
   * 根据邮箱查找用户
   */
  static async findUserByEmail(email: string): Promise<UserDocument | null> {
    try {
      await connectDB();
      return (await (User as any).findOne({ email: email.toLowerCase() })) as UserDocument | null;
    } catch (error) {
      console.error('Find user by email error:', error);
      return null;
    }
  }

  /**
   * 创建Google用户
   */
  static async createGoogleUser(data: {
    email: string
    name: string
    avatar?: string
    googleId: string
  }): Promise<UserDocument | null> {
    try {
      await connectDB();

      const user = new User({
        email: data.email.toLowerCase(),
        name: data.name,
        avatar: data.avatar,
        googleId: data.googleId,
        emailVerified: true, // Google账户默认已验证
        emailVerifiedAt: new Date(),
        provider: 'google',
        subscription: {
          plan: 'free',
          status: 'active',
          startDate: new Date(),
          features: {
            aiGenerations: { limit: 10, used: 0 },
            knowledgeGraphs: { limit: 3, used: 0 },
            collaborators: { limit: 1, used: 0 },
          },
        },
      });

      await user.save();

      // 记录注册贡献
      await (ContributionLog.create as any)({
        user: user._id,
        action: 'register',
        target: {
          type: 'user',
          id: user._id.toString(),
          title: 'User Registration',
        },
        points: 10,
        metadata: {
          description: 'User registered via Google',
          category: 'account',
          provider: 'google',
        },
      });

      return user;
    } catch (error) {
      console.error('Create Google user error:', error);
      return null;
    }
  }

  /**
   * 发送验证邮件
   */
  private static async sendVerificationEmail(email: string, name: string, token: string): Promise<void> {
    const baseUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? '';
    const verificationUrl = `${baseUrl}/auth/verify-email?token=${token}`;

    await sendEmail({
      to: email,
      subject: 'Inspi.AI - 邮箱验证',
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <h2>欢迎加入 Inspi.AI！</h2>
          <p>亲爱的 ${name}，</p>
          <p>感谢您注册 Inspi.AI 账户。请点击下面的链接验证您的邮箱地址：</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              验证邮箱
            </a>
          </div>
          <p>如果按钮无法点击，请复制以下链接到浏览器地址栏：</p>
          <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
          <p>此链接将在24小时后过期。</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            如果您没有注册 Inspi.AI 账户，请忽略此邮件。
          </p>
        </div>
      `,
    });
  }

  /**
   * 用户登出
   */
  static async logout(_token: string): Promise<{ success: boolean; message?: string }> {
    try {
      // 在实际应用中，这里可能需要：
      // 1. 将token加入黑名单
      // 2. 清除服务器端会话
      // 3. 记录登出日志

      // 目前只返回成功响应，因为JWT是无状态的
      return {
        success: true,
        message: '登出成功',
      };
    } catch (error) {
      console.error('Logout error:', error);
      return {
        success: false,
        message: '登出失败，请稍后重试',
      };
    }
  }

  /**
   * 刷新访问令牌
   */
  static async refreshToken({ refreshToken }: { refreshToken: string }): Promise<{
    success: boolean;
    accessToken?: string;
    refreshToken?: string;
    expiresIn?: number;
    error?: string;
  }> {
    try {
      const decoded = verifyRefreshToken(refreshToken);
      if (!decoded?.email) {
        return {
          success: false,
          error: '刷新令牌无效',
        };
      }

      // 查找用户
      const user = await this.findUserByEmail(decoded.email);
      if (!user) {
        return {
          success: false,
          error: '用户不存在',
        };
      }

      // 生成新的访问令牌
      const newAccessToken = generateToken(
        {
          userId: (user._id as any)?.toString?.() ?? '',
          email: user.email,
          name: (user as any).name,
        },
        '1h',
      );

      // 生成新的刷新令牌
      const newRefreshToken = generateRefreshToken(
        {
          userId: (user._id as any)?.toString?.() ?? '',
          email: user.email,
        },
        '7d',
      );

      return {
        success: true,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: 3600, // 1小时
      };
    } catch (error) {
      console.error('Refresh token error:', error);
      return {
        success: false,
        error: '刷新令牌失败',
      };
    }
  }

  /**
   * 验证会话
   */
  static async validateSession(token: string): Promise<{
    success: boolean;
    user?: any;
    error?: string;
  }> {
    try {
      const decoded = verifyToken(token);
      if (!decoded?.email) {
        return {
          success: false,
          error: '无效的会话',
        };
      }

      // 查找用户
      const user = await this.findUserByEmail(decoded.email);
      if (!user) {
        return {
          success: false,
          error: '用户不存在',
        };
      }

      return {
        success: true,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          emailVerified: user.emailVerified,
          subscription: user.subscription,
        },
      };
    } catch (error) {
      console.error('Validate session error:', error);
      return {
        success: false,
        error: '会话验证失败',
      };
    }
  }
}

export default AuthService;

// 导出authOptions (从next-auth-config导入)
export { authOptions } from './next-auth-config';
