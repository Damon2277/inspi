import { NextResponse } from 'next/server';

export async function GET() {
  // 返回204 No Content，这样浏览器就不会报错
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
