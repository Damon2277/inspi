/**
 * 节点作品 API 路由
 * 获取特定节点挂载的作品列表
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { WorkMountService } from '@/lib/services/knowledgeGraphService';
import { handleServiceError } from '@/lib/utils/errorHandler';

/**
 * GET /api/knowledge-graph/[id]/nodes/[nodeId]/works
 * 获取节点的挂载作品
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; nodeId: string } }
) {
  try {
    await requireAuth(request);
    const { id: graphId, nodeId } = params;
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const result = await WorkMountService.getNodeWorks(graphId, nodeId, page, limit);
    
    return NextResponse.json({
      success: true,
      data: result.mounts,
      meta: {
        total: result.total,
        page,
        limit,
        hasMore: result.total > (page * limit)
      }
    });
  } catch (error) {
    return handleServiceError(error);
  }
}