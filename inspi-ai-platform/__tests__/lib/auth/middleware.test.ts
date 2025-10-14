import { NextRequest } from 'next/server';

import { User } from '@/lib/models/User';
import connectDB from '@/lib/mongodb';

import { verifyToken } from '@/lib/auth/jwt';
import { authMiddleware } from '@/lib/auth/middleware';

// Mock dependencies
jest.mock('@/lib/auth/jwt');
jest.mock('@/lib/models/User');
jest.mock('@/lib/mongodb');

const mockVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>;
const mockUser = User as jest.MockedClass<typeof User>;
const mockConnectDB = connectDB as jest.MockedFunction<typeof connectDB>;

describe('Auth Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('authMiddleware', () => {
    const createMockRequest = (url: string, headers: Record<string, string> = {}) => {
      return {
        url,
        headers: new Headers(headers),
        nextUrl: new URL(url),
      } as NextRequest;
    };

    it('should allow access to public routes without authentication', async () => {
      const request = createMockRequest('https://example.com/');

      const response = await authMiddleware(request);

      expect(response).toBeUndefined(); // NextResponse.next() returns undefined in tests
    });

    it('should allow access to API routes without authentication', async () => {
      const request = createMockRequest('https://example.com/api/public');

      const response = await authMiddleware(request);

      expect(response).toBeUndefined();
    });

    it('should redirect to login for protected routes without token', async () => {
      const request = createMockRequest('https://example.com/dashboard');

      const response = await authMiddleware(request);

      expect(response?.status).toBe(307); // Redirect status
      expect(response?.headers.get('location')).toContain('/auth/signin');
    });

    it('should allow access to protected routes with valid token', async () => {
      const request = createMockRequest('https://example.com/dashboard', {
        'authorization': 'Bearer valid-token',
      });

      mockVerifyToken.mockReturnValue({ userId: 'user-id' });
      mockConnectDB.mockResolvedValue(undefined);
      mockUser.findById.mockResolvedValue({
        _id: 'user-id',
        email: 'test@example.com',
      } as any);

      const response = await authMiddleware(request);

      expect(response).toBeUndefined(); // Allowed to proceed
    });

    it('should redirect to login for protected routes with invalid token', async () => {
      const request = createMockRequest('https://example.com/dashboard', {
        'authorization': 'Bearer invalid-token',
      });

      mockVerifyToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const response = await authMiddleware(request);

      expect(response?.status).toBe(307); // Redirect status
      expect(response?.headers.get('location')).toContain('/auth/signin');
    });

    it('should redirect authenticated users away from auth pages', async () => {
      const request = createMockRequest('https://example.com/auth/signin', {
        'authorization': 'Bearer valid-token',
      });

      mockVerifyToken.mockReturnValue({ userId: 'user-id' });
      mockConnectDB.mockResolvedValue(undefined);
      mockUser.findById.mockResolvedValue({
        _id: 'user-id',
        email: 'test@example.com',
      } as any);

      const response = await authMiddleware(request);

      expect(response?.status).toBe(307); // Redirect status
      expect(response?.headers.get('location')).toContain('/dashboard');
    });

    it('should handle cookie-based authentication', async () => {
      const request = createMockRequest('https://example.com/dashboard');
      // Mock cookies
      Object.defineProperty(request, 'cookies', {
        value: {
          get: jest.fn().mockReturnValue({ value: 'valid-token' }),
        },
      });

      mockVerifyToken.mockReturnValue({ userId: 'user-id' });
      mockConnectDB.mockResolvedValue(undefined);
      mockUser.findById.mockResolvedValue({
        _id: 'user-id',
        email: 'test@example.com',
      } as any);

      const response = await authMiddleware(request);

      expect(response).toBeUndefined(); // Allowed to proceed
    });

    it('should handle database connection errors gracefully', async () => {
      const request = createMockRequest('https://example.com/dashboard', {
        'authorization': 'Bearer valid-token',
      });

      mockVerifyToken.mockReturnValue({ userId: 'user-id' });
      mockConnectDB.mockRejectedValue(new Error('Database connection failed'));

      const response = await authMiddleware(request);

      expect(response?.status).toBe(307); // Redirect to login on error
    });

    it('should handle user not found in database', async () => {
      const request = createMockRequest('https://example.com/dashboard', {
        'authorization': 'Bearer valid-token',
      });

      mockVerifyToken.mockReturnValue({ userId: 'user-id' });
      mockConnectDB.mockResolvedValue(undefined);
      mockUser.findById.mockResolvedValue(null);

      const response = await authMiddleware(request);

      expect(response?.status).toBe(307); // Redirect to login if user not found
    });
  });
});
