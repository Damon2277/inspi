import jwt, { SignOptions } from 'jsonwebtoken';

import { UserDocument } from '@/lib/models/User';

const BASE_SECRET = process.env.JWT_SECRET ?? process.env.NEXTAUTH_SECRET ?? 'your-secret-key';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? BASE_SECRET;
const ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '7d';
const REFRESH_TOKEN_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN ?? '30d';

export interface JWTPayload {
  userId: string;
  email: string;
  name?: string;
  [key: string]: any;
  iat?: number;
  exp?: number;
}

type TokenInput = JWTPayload | Pick<UserDocument, '_id' | 'email' | 'name'> & {
  [key: string]: any;
};

function toPayload(input: TokenInput): JWTPayload {
  if ('userId' in input) {
    return {
      ...input,
      userId: input.userId,
      email: input.email,
      name: input.name,
    };
  }

  return {
    userId: (input._id as any)?.toString?.() ?? '',
    email: input.email,
    name: input.name,
  };
}

function signToken(payload: JWTPayload, secret: string, expiresIn: string | number): string {
  const options: SignOptions = { expiresIn: expiresIn as SignOptions['expiresIn'] };
  return jwt.sign(payload, secret, options);
}

export function generateToken(input: TokenInput, expiresIn: string | number = ACCESS_TOKEN_EXPIRES_IN): string {
  const payload = toPayload(input);
  return signToken(payload, BASE_SECRET, expiresIn);
}

export function generateRefreshToken(input: TokenInput, expiresIn: string | number = REFRESH_TOKEN_EXPIRES_IN): string {
  const payload = toPayload(input);
  return signToken(payload, REFRESH_SECRET, expiresIn);
}

export function verifyToken(token: string, secret: string = BASE_SECRET): JWTPayload | null {
  try {
    return jwt.verify(token, secret) as JWTPayload;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

export function verifyRefreshToken(token: string): JWTPayload | null {
  return verifyToken(token, REFRESH_SECRET);
}

export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  return parts[1];
}

export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch (error) {
    console.error('JWT decode failed:', error);
    return null;
  }
}

const jwtService = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken,
  extractTokenFromHeader,
  decodeToken,
};

export default jwtService;
