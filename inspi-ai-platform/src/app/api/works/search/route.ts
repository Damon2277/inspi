/**
 * 作品搜索API路由
 */
import { NextRequest, NextResponse } from 'next/server';

import WorkService from '@/core/community/work-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const query = {
      query: searchParams.get('query') || undefined,
      subject: searchParams.get('subject') || undefined,
      gradeLevel: searchParams.get('gradeLevel') || undefined,
      category: searchParams.get('category') || undefined,
      difficulty: searchParams.get('difficulty') || undefined,
      tags: searchParams.getAll('tags'),
      author: searchParams.get('author') || undefined,
      sortBy: (searchParams.get('sortBy') as any) || 'latest',
      page: parseInt(searchParams.get('page') || '1', 10),
      limit: parseInt(searchParams.get('limit') || '20', 10),
    };

    const result = await WorkService.searchWorks(query);

    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    console.error('Search works API error:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 },
    );
  }
}
