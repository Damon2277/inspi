/**
 * 公开图谱搜索 API 路由
 * 处理公开知识图谱的搜索功能
 */
import { NextRequest, NextResponse } from 'next/server';
import { KnowledgeGraphService } from '@/lib/services/knowledgeGraphService';
import { GraphQuery } from '@/types/knowledgeGraph';
import { handleServiceError } from '@/lib/utils/errorHandler';

/**
 * GET /api/knowledge-graph/search
 * 搜索公开知识图谱
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    
    if (!query?.trim()) {
      return NextResponse.json({
        success: false,
        error: '搜索关键词不能为空'
      }, { status: 400 });
    }

    const options: GraphQuery = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      subject: searchParams.get('subject') as any,
      educationLevel: searchParams.get('educationLevel') as any,
      tags: searchParams.get('tags')?.split(',').filter(Boolean)
    };

    const result = await KnowledgeGraphService.searchPublicGraphs(query, options);
    
    return NextResponse.json({
      success: true,
      data: result.graphs,
      meta: {
        total: result.total,
        page: options.page,
        limit: options.limit,
        hasMore: result.total > (options.page! * options.limit!)
      }
    });
  } catch (error) {
    return handleServiceError(error);
  }
}