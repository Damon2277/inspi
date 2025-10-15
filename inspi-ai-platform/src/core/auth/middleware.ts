import { NextRequest, NextResponse } from 'next/server';

import User from '@/lib/models/User';
import connectDB from '@/lib/mongodb';

import { verifyToken, extractTokenFromHeader, JWTPayload } from './jwt';

export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload & {
    dbUser?: any;
  };
}

/**
 * Authentication middleware for API routes
 */
export async function authenticateToken(request: NextRequest): Promise<{
  success: boolean;
  user?: JWTPayload & { dbUser?: any };
  error?: string;
}> {
  try {
    const authHeader = request.headers.get('authorization');
    let token = extractTokenFromHeader(authHeader || '');

    if (!token) {
      token = request.cookies.get('token')?.value ||
        request.cookies.get('auth-token')?.value || null;
    }

    if (!token) {
      return {
        success: false,
        error: 'No token provided',
      };
    }

    const payload = verifyToken(token);
    if (!payload) {
      return {
        success: false,
        error: 'Invalid or expired token',
      };
    }

    // In development mode with demo login enabled, skip database lookup
    if (
      process.env.NODE_ENV === 'development' &&
      process.env.DEMO_LOGIN_ENABLED === 'true'
    ) {
      // Create mock dbUser for demo mode
      const mockDbUser = {
        _id: payload.userId,
        email: payload.email,
        name: 'Demo User',
        subscription: {
          plan: 'pro',
          status: 'active',
        },
        usage: {
          dailyGenerations: 0,
          dailyReuses: 0,
        },
      };

      return {
        success: true,
        user: {
          ...payload,
          dbUser: mockDbUser,
        },
      };
    }

    // Production mode: fetch user from database
    try {
      await connectDB();
      const dbUser = await (User.findById as any)(payload.userId).select('-password');

      if (!dbUser) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      return {
        success: true,
        user: {
          ...payload,
          dbUser: dbUser.toObject(),
        },
      };
    } catch (dbError) {
      console.error('Database connection error:', dbError);

      // Fallback for dev mode if DB fails
      if (process.env.NODE_ENV === 'development') {
        const fallbackUser = {
          _id: payload.userId,
          email: payload.email,
          name: 'Demo User',
          subscription: {
            plan: 'pro',
            status: 'active',
          },
          usage: {
            dailyGenerations: 0,
            dailyReuses: 0,
          },
        };

        return {
          success: true,
          user: {
            ...payload,
            dbUser: fallbackUser,
          },
        };
      }

      return {
        success: false,
        error: 'Database connection failed',
      };
    }
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return {
      success: false,
      error: 'Authentication failed',
    };
  }
}

/**
 * Require authentication middleware
 */
export function requireAuth(handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    const authResult = await authenticateToken(request);

    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 },
      );
    }

    // Add user to request object
    (request as AuthenticatedRequest).user = authResult.user;

    return handler(request as AuthenticatedRequest);
  };
}

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export function optionalAuth(handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    const authResult = await authenticateToken(request);

    // Add user to request object if authentication succeeded
    if (authResult.success) {
      (request as AuthenticatedRequest).user = authResult.user;
    }

    return handler(request as AuthenticatedRequest);
  };
}

/**
 * Check if user has required subscription level
 */
export function requireSubscription(requiredLevel: 'free' | 'pro' | 'super') {
  return (handler: (req: AuthenticatedRequest) => Promise<NextResponse>) => {
    return requireAuth(async (request: AuthenticatedRequest) => {
      const user = request.user;

      if (!user?.dbUser) {
        return NextResponse.json(
          { error: 'User data not available' },
          { status: 500 },
        );
      }

      const userSubscription = user.dbUser.subscription?.plan || 'free';
      const levels = ['free', 'pro', 'super'];
      const userLevel = levels.indexOf(userSubscription);
      const requiredLevelIndex = levels.indexOf(requiredLevel);

      if (userLevel < requiredLevelIndex) {
        return NextResponse.json(
          {
            error: 'Insufficient subscription level',
            required: requiredLevel,
            current: userSubscription,
          },
          { status: 403 },
        );
      }

      return handler(request);
    });
  };
}

/**
 * Rate limiting middleware (basic implementation)
 */
export function rateLimit(maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (handler: (req: NextRequest) => Promise<NextResponse>) => {
    return async (request: NextRequest) => {
      const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
      const now = Date.now();

      const userRequests = requests.get(ip);

      if (!userRequests || now > userRequests.resetTime) {
        requests.set(ip, { count: 1, resetTime: now + windowMs });
      } else {
        userRequests.count++;

        if (userRequests.count > maxRequests) {
          return NextResponse.json(
            { error: 'Too many requests' },
            { status: 429 },
          );
        }
      }

      return handler(request);
    };
  };
}

export default {
  authenticateToken,
  requireAuth,
  optionalAuth,
  requireSubscription,
  rateLimit,
};
