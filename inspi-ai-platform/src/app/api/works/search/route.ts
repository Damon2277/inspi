import { NextRequest, NextResponse } from 'next/server';
import workService from '@/lib/services/workService';
import { handleAPIError } from '@/lib/utils/errorHandler';

// GET /api/works/search - 搜索作品
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('q');

    if (!keyword) {
      return NextResponse.json(
        { success: false, message: '请提供搜索关键词' },
        { status: 400 }
      );
    }

    const filters = {
      subject: searchParams.get('subject') || undefined,
      gradeLevel: searchParams.get('gradeLevel') || undefined,
      limit: parseInt(searchParams.get('limit') || '20')
    };

    const works = await workService.searchWorks(keyword, filters);

    return NextResponse.json({
      success: true,
      data: works,
      total: works.length
    });
  } catch (error: any) {
    return handleAPIError(error);
  }
}