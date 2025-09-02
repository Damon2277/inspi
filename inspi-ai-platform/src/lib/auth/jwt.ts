import jwt, { SignOptions } from 'jsonwebtoken';
import { UserDocument } from '../models/User';

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d' as const;

export interface JWTPayload {
  userId: string;
  email: string;
  name: string;
  iat?: number;
  exp?: number;
}

/**
 * Generate JWT token for user
 */
export function generateToken(user: UserDocument): string {
  const payload: JWTPayload = {
    userId: (user._id as any).toString(),
    email: user.email,
    name: user.name,
  };

  const options: SignOptions = {
    expiresIn: '7d',
  };
  
  return jwt.sign(payload, JWT_SECRET as string, options);
}

/**
 * Verify JWT token and return payload
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET as string) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
}

/**
 * Generate refresh token (longer expiry)
 */
export function generateRefreshToken(user: UserDocument): string {
  const payload: JWTPayload = {
    userId: (user._id as any).toString(),
    email: user.email,
    name: user.name,
  };

  const options: SignOptions = {
    expiresIn: '30d', // Refresh token expires in 30 days
  };
  
  return jwt.sign(payload, JWT_SECRET as string, options);
}

/**
 * Decode token without verification (for expired token info)
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.decode(token) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error('JWT decode failed:', error);
    return null;
  }
}

export default {
  generateToken,
  verifyToken,
  extractTokenFromHeader,
  generateRefreshToken,
  decodeToken,
};