/**
 * NextAuth配置
 * 配置NextAuth的认证选项和提供者
 */
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';

import AuthService from './auth-service';

export const authOptions: NextAuthOptions = {
  providers: [
    // 邮箱密码登录
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const result = await AuthService.login({
            email: credentials.email,
            password: credentials.password,
          });

          if (result.success && result.user) {
            return {
              id: result.user._id.toString(),
              email: result.user.email,
              name: result.user.name,
              image: result.user.avatar,
            };
          }

          return null;
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      },
    }),

    // Google登录
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  callbacks: {
    async jwt({ token, user, account }) {
      // 首次登录时保存用户信息
      if (user) {
        token.id = (user.id || (user as any)._id);
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }

      // Google登录处理
      if (account?.provider === 'google' && user) {
        try {
          // 检查用户是否已存在，不存在则创建
          const existingUser = await AuthService.findUserByEmail(user.email!);

          if (!existingUser) {
            await AuthService.createGoogleUser({
              email: user.email!,
              name: user.name!,
              avatar: user.image ?? undefined,
              googleId: account.providerAccountId,
            });
          }
        } catch (error) {
          console.error('Google auth error:', error);
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        const user = session.user as Record<string, any>;
        if (!user.id && !(user as any)._id) {
          user.id = token.id as string;
        }
        user.email = (token.email ?? user.email ?? undefined) as string | null | undefined;
        user.name = (token.name ?? user.name ?? undefined) as string | null | undefined;
        user.image = (token.picture ?? user.image ?? undefined) as string | null | undefined;
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      // 登录后重定向到首页或指定页面
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },

  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },

  events: {
    async signIn({ user, account, profile }) {
      console.log('User signed in:', { user: user.email, provider: account?.provider });
    },
    async signOut({ session }) {
      console.log('User signed out:', { user: session?.user?.email });
    },
  },

  debug: process.env.NODE_ENV === 'development',
};

export default authOptions;
