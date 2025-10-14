import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';

import User from '@/lib/models/User';
import connectDB from '@/lib/mongodb';

export interface AuthenticatedRequest extends NextRequest {
  user?: any;
}

export async function authenticateToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as any;

    await connectDB();
    const user = await (User.findById as any)(decoded.userId);

    if (!user) {
      return null;
    }

    return user;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

export function requireAuth(handler: Function) {
  return async (request: NextRequest) => {
    const user = await authenticateToken(request);

    if (!user) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: '请先登录' },
        { status: 401 },
      );
    }

    // Add user to request object
    (request as AuthenticatedRequest).user = user;

    return handler(request);
  };
}

export function optionalAuth(handler: Function) {
  return async (request: NextRequest) => {
    const user = await authenticateToken(request);

    // Add user to request object (can be null)
    (request as AuthenticatedRequest).user = user;

    return handler(request);
  };
}
