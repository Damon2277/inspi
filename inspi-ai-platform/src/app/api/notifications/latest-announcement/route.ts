import { NextRequest, NextResponse } from 'next/server';

interface AnnouncementRecord {
  version: string;
  highlights: string[];
  publishedAt: string;
  link?: string;
}

const mockAnnouncement: AnnouncementRecord = {
  version: 'v0.6.0-beta',
  highlights: [
    '新增结构化反馈面板，支持选择问题类型与上传截图',
    '邀请一位老师注册即可获得额外 10 次生成机会',
    '优化生成引导路径，首分钟体验更清晰',
  ],
  publishedAt: new Date().toISOString(),
  link: '/docs/release-notes/v0.6.0',
};

export async function GET(_request: NextRequest) {
  return NextResponse.json({
    success: true,
    announcement: mockAnnouncement,
  });
}
