import crypto from 'crypto';

import { NextRequest, NextResponse } from 'next/server';

import { JWTPayload, extractTokenFromHeader, generateToken, verifyToken } from '@/core/auth/jwt';
import { env } from '@/shared/config/environment';

export interface AdminIdentity {
  email: string;
  name: string;
}

const ADMIN_SCOPE = 'admin-panel';
export const ADMIN_SESSION_COOKIE = 'inspi_admin_session';

const getConfiguredEmail = () => (process.env.ADMIN_PANEL_EMAIL || env.ADMIN_PANEL.EMAIL || '').trim().toLowerCase();
const getConfiguredPassword = () => process.env.ADMIN_PANEL_PASSWORD || env.ADMIN_PANEL.PASSWORD || '';
const getConfiguredName = () => process.env.ADMIN_PANEL_NAME || env.ADMIN_PANEL.NAME || '系统管理员';
const getSessionMinutes = () => {
  const raw = Number(process.env.ADMIN_PANEL_SESSION_MINUTES || env.ADMIN_PANEL.SESSION_MINUTES || 720);
  return Number.isFinite(raw) && raw > 0 ? raw : 720;
};

const hashValue = (value: string) => crypto.createHash('sha256').update(value ?? '').digest();

function safeCompare(a: string, b: string) {
  const hashA = hashValue(a);
  const hashB = hashValue(b);
  return crypto.timingSafeEqual(hashA, hashB);
}

export function getAdminDisplayName() {
  return getConfiguredName();
}

export function validateAdminCredentials(email: string, password: string): boolean {
  if (!env.ADMIN_PANEL.ENABLED) return false;
  if (!email || !password) return false;
  const normalizedEmail = email.trim().toLowerCase();
  const configuredEmail = getConfiguredEmail();
  const configuredPassword = getConfiguredPassword();

  return safeCompare(normalizedEmail, configuredEmail) && safeCompare(password, configuredPassword);
}

export function createAdminSessionToken(overrides?: Partial<JWTPayload>) {
  const minutes = getSessionMinutes();
  const payload: JWTPayload = {
    userId: overrides?.userId || 'admin',
    email: overrides?.email || getConfiguredEmail(),
    name: overrides?.name || getConfiguredName(),
    role: 'admin',
    scope: ADMIN_SCOPE,
  };

  return generateToken(payload, `${minutes}m`);
}

export function getAdminTokenFromRequest(request: NextRequest): string | null {
  const cookieToken = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (cookieToken) {
    return cookieToken;
  }

  const authHeader = request.headers.get('authorization') || undefined;
  return extractTokenFromHeader(authHeader);
}

export function getAdminFromRequest(request: NextRequest): AdminIdentity | null {
  if (!env.ADMIN_PANEL.ENABLED) return null;
  const token = getAdminTokenFromRequest(request);
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;
  if (payload.role !== 'admin' || payload.scope !== ADMIN_SCOPE) return null;

  return {
    email: payload.email,
    name: payload.name || getConfiguredName(),
  };
}

export function attachAdminSessionCookie(response: NextResponse, token: string) {
  const maxAgeSeconds = Math.max(getSessionMinutes() * 60, 60);
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeSeconds,
  });
}

export function clearAdminSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}
