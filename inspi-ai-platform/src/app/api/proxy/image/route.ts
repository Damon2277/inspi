import { NextRequest, NextResponse } from 'next/server';

import { isAllowedImageHost } from '@/lib/export/image-proxy';

const FETCH_TIMEOUT_MS = 15000;

export async function GET(request: NextRequest) {
  const src = request.nextUrl.searchParams.get('src');
  if (!src) {
    return NextResponse.json({ error: 'Missing image source' }, { status: 400 });
  }

  let imageUrl: URL;
  try {
    imageUrl = new URL(src);
  } catch (error) {
    return NextResponse.json({ error: 'Invalid image URL' }, { status: 400 });
  }

  if (!['http:', 'https:'].includes(imageUrl.protocol)) {
    return NextResponse.json({ error: 'Unsupported protocol' }, { status: 400 });
  }

  if (!isAllowedImageHost(imageUrl.hostname)) {
    return NextResponse.json({ error: 'Image host is not allowed' }, { status: 403 });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(imageUrl, {
      method: 'GET',
      headers: { Accept: 'image/*' },
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch remote image' }, { status: response.status });
    }

    const contentType = response.headers.get('content-type') ?? 'application/octet-stream';
    const buffer = await response.arrayBuffer();

    const headers = new Headers({
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    });

    return new NextResponse(buffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      return NextResponse.json({ error: 'Image request timed out' }, { status: 504 });
    }

    console.error('Image proxy error:', error);
    return NextResponse.json({ error: 'Unexpected proxy error' }, { status: 502 });
  } finally {
    clearTimeout(timeoutId);
  }
}
