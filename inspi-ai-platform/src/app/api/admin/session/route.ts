import { NextRequest, NextResponse } from 'next/server';

import {
  attachAdminSessionCookie,
  clearAdminSessionCookie,
  createAdminSessionToken,
  getAdminDisplayName,
  getAdminFromRequest,
  validateAdminCredentials,
} from '@/lib/admin/auth';

export async function GET(request: NextRequest) {
  const admin = getAdminFromRequest(request);
  return NextResponse.json({
    authenticated: Boolean(admin),
    admin: admin || null,
  });
}

export async function POST(request: NextRequest) {
  let payload: { email?: string; password?: string } | null = null;
  try {
    payload = await request.json();
  } catch (error) {
    // ignore body parse errors; validations below will handle it
  }

  const email = payload?.email?.trim() || '';
  const password = payload?.password || '';

  if (!email || !password) {
    return NextResponse.json({ error: '请输入邮箱和密码' }, { status: 400 });
  }

  if (!validateAdminCredentials(email, password)) {
    return NextResponse.json({ error: '邮箱或密码不正确' }, { status: 401 });
  }

  const token = createAdminSessionToken({ email: email.toLowerCase() });
  const response = NextResponse.json({
    authenticated: true,
    admin: {
      email: email.toLowerCase(),
      name: getAdminDisplayName(),
    },
  });
  attachAdminSessionCookie(response, token);
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  clearAdminSessionCookie(response);
  return response;
}
