import { NextRequest, NextResponse } from 'next/server';

import { getGoogleAuthUrl, verifyGoogleToken } from '@/core/auth/google';

const DEFAULT_RETURN_PATH = '/dashboard';

const isSafeReturnPath = (path: string) => path.startsWith('/') && !path.startsWith('//');

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl;
    const requestedReturnUrl = url.searchParams.get('returnUrl');
    const safeReturnUrl = requestedReturnUrl && isSafeReturnPath(requestedReturnUrl)
      ? requestedReturnUrl
      : DEFAULT_RETURN_PATH;

    const requiredEnv = [
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    ];

    if (requiredEnv.some((value) => !value)) {
      console.error('Google OAuth is not configured. Please set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI.');
      const fallback = new URL(`/auth/login?error=${encodeURIComponent('Google 登录未配置')}`, request.url);
      return NextResponse.redirect(fallback);
    }

    const authUrl = getGoogleAuthUrl(encodeURIComponent(safeReturnUrl));
    return NextResponse.redirect(authUrl, { status: 302 });
  } catch (error) {
    console.error('Google OAuth redirect error:', error);
    const fallback = new URL(`/auth/login?error=${encodeURIComponent('跳转 Google 登录失败')}`, request.url);
    return NextResponse.redirect(fallback);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json(
        { error: 'Google ID token is required' },
        { status: 400 },
      );
    }

    const result = await verifyGoogleToken(idToken);

    if (result.success) {
      return NextResponse.json({
        success: true,
        user: result.user,
        token: result.token,
        refreshToken: result.refreshToken,
      });
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 401 },
      );
    }
  } catch (error) {
    console.error('Google auth API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
