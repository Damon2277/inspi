/**
 * 知识图谱 API 路由
 * 处理图谱的创建、查询、更新等操作
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { KnowledgeGraphService } from '@/lib/services/knowledgeGraphService';
import { CreateGraphRequest, GraphQuery } from '@/types/knowledgeGraph';
import { handleServiceError } from '@/lib/utils/errorHandler';

/**
 * GET /api/knowledge-graph
 * 获取用户的知识图谱列表
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    
    // 解析查询参数
    const query: GraphQuery = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      type: searchParams.get('type') as any,
      subject: searchParams.get('subject') as any,
      educationLevel: searchParams.get('educationLevel') as any,
      isPublic: searchParams.get('isPublic') ? searchParams.get('isPublic') === 'true' : undefined,
      search: searchParams.get('search') || undefined,
      tags: searchParams.get('tags')?.split(',').filter(Boolean),
      sortBy: searchParams.get('sortBy') as any || 'updatedAt',
      sortOrder: searchParams.get('sortOrder') as any || 'desc'
    };

    const result = await KnowledgeGraphService.getUserGraphs(user.id, query);
    
    return NextResponse.json({
      success: true,
      data: result.graphs,
      meta: {
        total: result.total,
        page: query.page,
        limit: query.limit,
        hasMore: result.total > (query.page! * query.limit!)
      }
    });
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * POST /api/knowledge-graph
 * 创建新的知识图谱
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body: CreateGraphRequest = await request.json();
    
    // 验证请求数据
    if (!body.name?.trim()) {
      return NextResponse.json({
        success: false,
        error: '图谱名称不能为空'
      }, { status: 400 });
    }

    const graph = await KnowledgeGraphService.createGraph(user.id, body);
    
    return NextResponse.json({
      success: true,
      data: graph
    }, { status: 201 });
  } catch (error) {
    return handleServiceError(error);
  }
}