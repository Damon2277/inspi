import { promises as fs } from 'fs';
import path from 'path';

import { NextRequest, NextResponse } from 'next/server';

import { env } from '@/shared/config/environment';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'share-images');
const SHARE_BASE_URL = (process.env.NEXT_PUBLIC_SHARE_BASE_URL || env.APP_URL || '').replace(/\/$/, '');

function getBaseUrl(): string {
  if (SHARE_BASE_URL && SHARE_BASE_URL.trim().length > 0) {
    return SHARE_BASE_URL;
  }
  const fallback = env.APP_URL || 'http://localhost:3000';
  return fallback.replace(/\/$/, '');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageData, cardId } = body || {};

    if (typeof imageData !== 'string' || !imageData.startsWith('data:image')) {
      return NextResponse.json({ error: '无效的图片数据' }, { status: 400 });
    }

    const [, base64Data] = imageData.split(',');
    if (!base64Data) {
      return NextResponse.json({ error: '图片数据格式错误' }, { status: 400 });
    }

    const buffer = Buffer.from(base64Data, 'base64');
    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    const safeId = cardId?.replace(/[^a-zA-Z0-9-_]/g, '') || 'share';
    const filename = `${safeId}-${Date.now()}.png`;
    const filePath = path.join(UPLOAD_DIR, filename);
    await fs.writeFile(filePath, buffer);

    const publicUrl = `${getBaseUrl()}/share-images/${filename}`;

    return NextResponse.json({
      success: true,
      imageUrl: publicUrl,
      filename,
    });
  } catch (error) {
    console.error('分享图片上传失败:', error);
    return NextResponse.json({ error: '上传失败' }, { status: 500 });
  }
}
