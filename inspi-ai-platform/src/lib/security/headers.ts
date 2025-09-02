/**
 * 安全头配置
 * 提供HTTP安全头设置和HTTPS强制
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * 安全头配置
 */
export const SECURITY_HEADERS = {
  // 强制HTTPS
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  
  // 防止点击劫持
  'X-Frame-Options': 'DENY',
  
  // 防止MIME类型嗅探
  'X-Content-Type-Options': 'nosniff',
  
  // XSS保护
  'X-XSS-Protection': '1; mode=block',
  
  // 引用策略
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // 权限策略
  'Permissions-Policy': [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'payment=()',
    'usb=()',
    'magnetometer=()',
    'gyroscope=()',
    'accelerometer=()'
  ].join(', '),
  
  // 内容安全策略
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.gstatic.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "media-src 'self' data: https:",
    "connect-src 'self' https://api.gemini.com https://accounts.google.com",
    "frame-src 'self' https://accounts.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; ')
};

/**
 * 开发环境安全头（较宽松）
 */
export const DEV_SECURITY_HEADERS = {
  ...SECURITY_HEADERS,
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "img-src 'self' data: https: blob:",
    "media-src 'self' data: https:",
    "connect-src 'self' ws: wss:",
    "frame-src 'self'",
    "object-src 'none'"
  ].join('; ')
};

/**
 * 应用安全头中间件
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  const headers = process.env.NODE_ENV === 'production' 
    ? SECURITY_HEADERS 
    : DEV_SECURITY_HEADERS;
  
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}

/**
 * HTTPS重定向中间件
 */
export function enforceHTTPS(request: NextRequest): NextResponse | null {
  // 在生产环境强制HTTPS
  if (process.env.NODE_ENV === 'production') {
    const proto = request.headers.get('x-forwarded-proto');
    const host = request.headers.get('host');
    
    if (proto !== 'https' && host) {
      const httpsUrl = `https://${host}${request.nextUrl.pathname}${request.nextUrl.search}`;
      return NextResponse.redirect(httpsUrl, 301);
    }
  }
  
  return null;
}

/**
 * 检查请求来源
 */
export function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const host = request.headers.get('host');
  
  // 允许的域名列表
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    `https://${host}`,
    `http://${host}`, // 开发环境HTTP
    `http://localhost:3000`, // 开发环境
    `http://localhost:3003`, // 测试环境
    `http://127.0.0.1:3000`,  // 开发环境
    `http://127.0.0.1:3003`   // 测试环境
  ].filter(Boolean);
  
  // 检查Origin头
  if (origin && !allowedOrigins.includes(origin)) {
    return false;
  }
  
  // 检查Referer头
  if (referer) {
    const refererUrl = new URL(referer);
    const refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`;
    if (!allowedOrigins.includes(refererOrigin)) {
      return false;
    }
  }
  
  return true;
}

/**
 * 生成随机nonce
 */
export function generateNonce(): string {
  const crypto = require('crypto');
  return crypto.randomBytes(16).toString('base64');
}

/**
 * 创建带nonce的CSP头
 */
export function createCSPWithNonce(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self'",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'"
  ].join('; ');
}

/**
 * 安全Cookie配置
 */
export const SECURE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 60 * 60 * 24 * 7, // 7天
  path: '/'
};

/**
 * 会话Cookie配置
 */
export const SESSION_COOKIE_OPTIONS = {
  ...SECURE_COOKIE_OPTIONS,
  maxAge: 60 * 60 * 24 * 30 // 30天
};

/**
 * 临时Cookie配置
 */
export const TEMP_COOKIE_OPTIONS = {
  ...SECURE_COOKIE_OPTIONS,
  maxAge: 60 * 15 // 15分钟
};

/**
 * 清理敏感头信息
 */
export function sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
  const sensitiveHeaders = [
    'authorization',
    'cookie',
    'x-api-key',
    'x-auth-token',
    'x-csrf-token'
  ];
  
  const sanitized = { ...headers };
  
  sensitiveHeaders.forEach(header => {
    if (sanitized[header]) {
      sanitized[header] = '[REDACTED]';
    }
  });
  
  return sanitized;
}

/**
 * 验证Content-Type
 */
export function validateContentType(request: NextRequest, allowedTypes: string[]): boolean {
  const contentType = request.headers.get('content-type');
  
  if (!contentType) {
    return false;
  }
  
  return allowedTypes.some(type => contentType.includes(type));
}

/**
 * 限制请求大小
 */
export function validateRequestSize(request: NextRequest, maxSize: number): boolean {
  const contentLength = request.headers.get('content-length');
  
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    return size <= maxSize;
  }
  
  return true;
}

/**
 * 生成安全的响应头
 */
export function createSecureResponse(data: any, status: number = 200): NextResponse {
  const response = NextResponse.json(data, { status });
  return applySecurityHeaders(response);
}

/**
 * 错误响应（不泄露敏感信息）
 */
export function createErrorResponse(message: string, status: number = 500): NextResponse {
  const sanitizedMessage = process.env.NODE_ENV === 'production' 
    ? 'Internal Server Error' 
    : message;
    
  return createSecureResponse({ error: sanitizedMessage }, status);
}