import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, verifyGoogleToken } from '@/lib/auth/google';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        new URL(`/auth/signin?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/auth/signin?error=No authorization code received', request.url)
      );
    }

    // Exchange code for tokens
    const tokenResult = await exchangeCodeForTokens(code);
    if (!tokenResult.success || !tokenResult.idToken) {
      return NextResponse.redirect(
        new URL(`/auth/signin?error=${encodeURIComponent(tokenResult.error || 'Token exchange failed')}`, request.url)
      );
    }

    // Verify token and authenticate user
    const authResult = await verifyGoogleToken(tokenResult.idToken);
    if (!authResult.success) {
      return NextResponse.redirect(
        new URL(`/auth/signin?error=${encodeURIComponent(authResult.error || 'Authentication failed')}`, request.url)
      );
    }

    // Create response with redirect to dashboard
    const response = NextResponse.redirect(new URL('/dashboard', request.url));

    // Set auth cookies (httpOnly for security)
    response.cookies.set('auth_token', authResult.token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    response.cookies.set('refresh_token', authResult.refreshToken!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (error) {
    console.error('Google callback error:', error);
    return NextResponse.redirect(
      new URL('/auth/signin?error=Authentication failed', request.url)
    );
  }
}